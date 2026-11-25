/**
 * What the sitemap lists and how it dates each address (#361).
 *
 * astro.config.mjs hands `sitemapFilter` and `sitemapSerialize` to the
 * sitemap integration. They lived in the config until Nov 2026, where no test
 * could reach them; here every rule is a plain function of its inputs, and
 * src/utils/sitemap.test.ts checks them. The config builds the inputs once per
 * build (`readContentMaps`, `readGuideMaps`), reading the lesson and guide
 * files and asking git for the date of a page's sources.
 *
 * This module is loaded by astro.config.mjs before the content layer exists,
 * so it reads frontmatter itself and imports nothing from `astro:content`.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, inSearch, type Locale } from '../i18n/config.ts';
import { lastChanged } from './lessonDates.ts';

export interface Frontmatter {
  [key: string]: string | string[] | boolean | undefined;
  tags?: string[];
  hasGlossary: boolean;
}

/**
 * Read frontmatter dates and tags from a markdown file's text: enough to pull
 * `slug:`, `pubDate:`, `updatedDate:`, `level:`, `lastChecked:` and `tags:`.
 *
 * The parser is intentionally minimal (line-based, single- and double-quoted
 * scalar tolerant) to avoid pulling in a YAML dependency just for the sitemap.
 * It only needs the subset of YAML the frontmatter actually uses; if that
 * shape diverges materially it should be replaced with a real YAML library.
 */
export function parseFrontmatter(text: string): Frontmatter | null {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const block = match[1];
  const data: Frontmatter = { hasGlossary: false };
  // Scalar lines: "key: value". Strip surrounding single/double quotes.
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.+?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    data[m[1]] = val;
  }
  // Inline-array tags: `tags: [a, b, c]`. Block-style tags would need
  // multi-line handling; the corpus uses inline only.
  const tagsMatch = block.match(/^tags:\s*\[(.*)\]/m);
  if (tagsMatch) {
    data.tags = tagsMatch[1]
      .split(',')
      .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  // A block list of terms the lesson defines; the glossary page is built from
  // them, so it is enough to know the lesson has some.
  data.hasGlossary = /^glossary:/m.test(block);
  return data;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkMarkdown(full));
    else if (/\.(md|mdx)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * The lesson lookups, built once per build:
 *  - blog: slug → ISO date (the later of updatedDate and pubDate)
 *  - published: slug → ISO publication date
 *  - tag: tag → ISO date (newest among lessons carrying the tag)
 *  - level: level → ISO date (newest live lesson in that level), which also
 *    decides whether the level page (/blog/<level>/) is in the sitemap
 *  - inclusive: the newest live Inclusive Finances guide (null while none is
 *    live), which decides whether the hub is in the sitemap at all
 *  - glossary: the newest live lesson that defines glossary terms
 *
 * Tag dates follow the newest content under the tag, not the template's git
 * date: a reader visiting /blog/tag/saving/ cares whether anything new
 * appeared under saving, not whether the template changed.
 */
export interface ContentMaps {
  blog: Map<string, string>;
  published: Map<string, string>;
  tag: Map<string, string>;
  level: Map<string, string>;
  inclusive: string | null;
  glossary: string | null;
}

/** Build `ContentMaps` from lesson texts. Lessons dated after `now` are not live and are left out. */
export function contentMapsFrom(texts: Iterable<string>, now: Date): ContentMaps {
  const maps: ContentMaps = { blog: new Map(), published: new Map(), tag: new Map(), level: new Map(), inclusive: null, glossary: null };
  for (const text of texts) {
    const fm = parseFrontmatter(text);
    const slug = str(fm?.slug);
    const pubDate = str(fm?.pubDate);
    if (!fm || !slug || !pubDate) continue;
    const pub = new Date(pubDate);
    if (Number.isNaN(pub.getTime())) continue;
    if (pub > now) continue;
    // The last edit, but never earlier than the day the page first existed
    // (src/utils/lessonDates.ts).
    const updated = str(fm.updatedDate);
    const edited = updated ? new Date(updated) : null;
    const iso = lastChanged(pub, edited && !Number.isNaN(edited.getTime()) ? edited : null).toISOString();
    maps.blog.set(slug, iso);
    maps.published.set(slug, pub.toISOString());
    const level = str(fm.level);
    if (level === 'inclusive-finances' && (!maps.inclusive || iso > maps.inclusive)) maps.inclusive = iso;
    if (fm.hasGlossary && (!maps.glossary || iso > maps.glossary)) maps.glossary = iso;
    if (level && level !== 'inclusive-finances' && (!maps.level.has(level) || iso > maps.level.get(level)!)) maps.level.set(level, iso);
    for (const t of fm.tags ?? []) {
      const prev = maps.tag.get(t);
      if (!prev || iso > prev) maps.tag.set(t, iso);
    }
  }
  return maps;
}

/**
 * `ContentMaps` for the lessons under `dir`. An empty or missing directory, or
 * any read error, leaves the maps empty: the sitemap then omits <lastmod> for
 * lesson and tag addresses and keeps the level pages out until a level has a
 * lesson.
 */
export function readContentMaps(dir: string, now = new Date()): ContentMaps {
  try {
    return contentMapsFrom(walkMarkdown(dir).map((f) => readFileSync(f, 'utf8')), now);
  } catch {
    return contentMapsFrom([], now);
  }
}

/**
 * How-to guides: slug → ISO date (lastChecked, else pubDate), live ones only,
 * and the newest of them, which dates the hub and decides whether it is in the
 * sitemap at all (it is noindex while no guide is live).
 */
export interface GuideMaps {
  guide: Map<string, string>;
  newest: string | null;
}

export function guideMapsFrom(texts: Iterable<string>, now: Date): GuideMaps {
  const maps: GuideMaps = { guide: new Map(), newest: null };
  for (const text of texts) {
    const fm = parseFrontmatter(text);
    const slug = str(fm?.slug);
    const pubDate = str(fm?.pubDate);
    if (!fm || !slug || !pubDate) continue;
    const pub = new Date(pubDate);
    if (Number.isNaN(pub.getTime()) || pub > now) continue;
    const d = new Date(str(fm.lastChecked) ?? pubDate);
    if (Number.isNaN(d.getTime())) continue;
    const iso = d.toISOString();
    maps.guide.set(slug, iso);
    if (!maps.newest || iso > maps.newest) maps.newest = iso;
  }
  return maps;
}

export function readGuideMaps(dir: string, now = new Date()): GuideMaps {
  try {
    const files = readdirSync(dir).filter((entry) => entry.endsWith('.md'));
    return guideMapsFrom(files.map((entry) => readFileSync(join(dir, entry), 'utf8')), now);
  } catch {
    // No guides directory: nothing to date.
    return guideMapsFrom([], now);
  }
}

/**
 * The newest day on the "What's changed" page, as an ISO date: the page gains
 * an item with every visible change, so its newest day is when it last
 * changed. A day dated after today is not on the page yet and is passed over.
 */
export function newestChangeDay(
  changeDays: readonly string[],
  today = new Date().toISOString().slice(0, 10),
): string | null {
  const newest = [...changeDays].filter((d) => d <= today).sort().pop();
  return newest ? new Date(`${newest}T00:00:00Z`).toISOString() : null;
}

/** The later of two ISO dates, either of which may be missing. */
export function laterOf(a: string | null | undefined, b: string | null | undefined): string | undefined {
  if (!a) return b ?? undefined;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

/**
 * Split an absolute pathname into its locale and the path inside that locale.
 * The locale list is explicit (`LOCALES`), never a `/[a-z]{2}/` pattern: a
 * future page whose first segment happens to be two letters must not be read
 * as a language.
 */
export function splitLocalePath(pathname: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const prefix = `/${locale}`;
    if (pathname === `${prefix}/` || pathname.startsWith(`${prefix}/`)) {
      return { locale, path: pathname.slice(prefix.length).replace(/^\/+|\/+$/g, '') };
    }
  }
  return { locale: DEFAULT_LOCALE, path: pathname.replace(/^\/+|\/+$/g, '') };
}

/**
 * Ask git for the author date of the last commit that touched any of the given
 * paths. Author date (`%aI`) reflects when the change was actually made, not
 * when it was rebased or cherry-picked. Returns null on any error (git not on
 * PATH, file not in repo, shallow checkout that does not see the commit).
 */
export function gitLastmod(repoPaths: readonly string[]): string | null {
  try {
    const args = repoPaths.map((p) => `"${p}"`).join(' ');
    const iso = execSync(`git log -1 --format=%aI -- ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return iso || null;
  } catch {
    return null;
  }
}

/**
 * URL path (without the locale prefix) → repo source files, for static pages
 * that have no frontmatter date. Keys are the path between `nidhi.today/` and
 * the trailing slash.
 *
 * Values are the files that carry the page's own copy, so the date moves when
 * the page does: the component that renders it, and any island or catalog
 * module its words also live in. The wrapper in `src/pages/` is deliberately
 * left out: it is a few lines that render the component and rarely change, so
 * dating by the wrapper would freeze lastmod while the page's copy is edited.
 */
export const STATIC_PAGE_SOURCE: Readonly<Record<string, readonly string[]>> = {
  '': ['src/components/pages/HomePage.astro'],
  'about': ['src/components/pages/AboutPage.astro'],
  'accessibility': ['src/components/pages/AccessibilityPage.astro'],
  'beliefs': ['src/components/pages/BeliefsPage.astro'],
  'beta': ['src/components/pages/BetaPage.astro'],
  'changes': ['src/components/pages/ChangesPage.astro'],
  'volunteers': ['src/components/pages/VolunteersPage.astro'],
  'editorial-policy': ['src/components/pages/EditorialPolicyPage.astro'],
  // The notice shows the latest changelog entries, which live in their own module.
  'privacy': ['src/components/pages/PrivacyPage.astro', 'src/utils/privacyChangelogEntries.ts'],
  // The changelog's index and its year pages (#722), dated by the entries.
  'privacy/changelog': ['src/components/pages/PrivacyChangelogPage.astro', 'src/utils/privacyChangelogEntries.ts'],
  'blog': ['src/layouts/BlogIndex.astro'],
  'blog/tag': ['src/components/pages/TagHubPage.astro'],
  'blog/glossary': ['src/components/pages/GlossaryPage.astro'],
  'free': ['src/components/pages/FreeHubPage.astro'],
  'free/multi-currency-net-worth': [
    'src/components/pages/MultiCurrencyNetWorthPage.astro',
    'src/components/MultiCurrencyNetWorth.tsx',
    'src/i18n/strings/tools/multiCurrencyNetWorth.ts',
  ],
  'free/loan-comparison': [
    'src/components/pages/LoanComparisonPage.astro',
    'src/components/LoanCompare.tsx',
    'src/i18n/strings/tools/loanComparison.ts',
  ],
  'free/monte-carlo-simulator': [
    'src/components/pages/MonteCarloPage.astro',
    'src/components/MonteCarloSimulator.tsx',
    'src/i18n/strings/tools/monteCarlo.ts',
  ],
  'free/inflation-calculator': [
    'src/components/pages/InflationCalculatorPage.astro',
    'src/components/InflationCalculator.tsx',
    'src/i18n/strings/tools/inflation.ts',
    // The page quotes the World Bank's update date, so new data is a new page.
    'src/data/inflation/worldbank.json',
    // And the day the BIS's months were fetched, and how many countries end at a month.
    'src/data/inflation/bis-monthly.json',
  ],
  'free/invest-or-pay-off': [
    'src/components/pages/InvestOrPayOffPage.astro',
    'src/components/InvestOrPayOff.tsx',
    'src/i18n/strings/tools/investOrPayOff.ts',
    'src/data/inflation/worldbank.json',
  ],
};

/**
 * The repo files a locale's version of a static page is built from: the same
 * components, plus the catalog that holds that language's words for it. A
 * page's copy lives in the catalog, not the component, so leaving the catalog
 * out would freeze lastmod while the text changes: English reads `en.ts`, the
 * learning path's pages also read `learn.ts` (which holds every language), and
 * any other language reads its own file. That is coarse on purpose: one file
 * holds every page's words, so any copy edit moves every page's date in that
 * language. A date that moves too often is a smaller wrong than a date that
 * freezes while the page's text changes.
 */
export function staticPageSources(locale: Locale, path: string): string[] | null {
  const components = STATIC_PAGE_SOURCE[path];
  if (!components) return null;
  const catalogs = [`src/i18n/strings/${locale}.ts`];
  if (path === 'blog' || path.startsWith('blog/')) catalogs.push('src/i18n/strings/learn.ts');
  return [...components, ...catalogs];
}

/** The first path segments of the newsletter's transactional pages. */
export const TRANSACTIONAL = ['confirm', 'subscription-confirmed', 'subscription-invalid', 'unsubscribe', 'unsubscribed'];

const LEVEL_PATH = /^blog\/(discovery|building|psychology|optimizing|mastery)$/;

/** Whether an address belongs in the sitemap. */
export function sitemapFilter(page: string, content: ContentMaps, guides: GuideMaps): boolean {
  const { locale, path } = splitLocalePath(new URL(page).pathname);
  const first = path.split('/')[0];
  // Transactional and confirmation pages have no place in search, in any
  // language. Matched on the first path segment rather than anywhere in the
  // URL, so a lesson slug that happens to contain one of these words is still
  // listed.
  if (TRANSACTIONAL.includes(first)) return false;
  // The owner's tools under /studio/ (the QR maker) are unlisted: noindex,
  // linked from nowhere and kept out of the sitemap. Not named in robots.txt,
  // which would advertise them.
  if (first === 'studio') return false;
  // Per-tag listings (/blog/tag/<tag>/) carry `noindex,follow`. Listing a
  // noindexed URL in the sitemap sends crawlers two opposite signals, so keep
  // them out. The hub at /blog/tag/ is indexable and stays in.
  if (/^blog\/tag\/[^/]+$/.test(path)) return false;
  // A page search engines are given in English only (the glossary, whose body
  // is English in every edition) is noindex in its other editions
  // (`ENGLISH_ONLY_IN_SEARCH` in src/i18n/config.ts, #449), so those stay out,
  // and with them out the English page is listed with no language pairs, as
  // its head says.
  if (!inSearch(locale, path)) return false;
  // The Inclusive Finances hub is noindex while it has no live lessons, so it
  // stays out until then, in every language.
  if (path === 'blog/inclusive-finances' && !content.inclusive) return false;
  // The How-to hub is noindex while no guide is live, in every language.
  if (path === 'how-to' && !guides.newest) return false;
  // A level page with no live lessons is noindex (src/layouts/LevelPage.astro),
  // in every language, for the same reason.
  const levelPath = LEVEL_PATH.exec(path);
  if (levelPath && !content.level.has(levelPath[1])) return false;
  return true;
}

export interface SitemapItem {
  url: string;
  lastmod?: string;
  links?: { url: string; lang: string }[];
  [key: string]: unknown;
}

export interface SerializeInputs {
  content: ContentMaps;
  guides: GuideMaps;
  /** The newest day on "What's changed", or null. */
  changesDay: string | null;
  /** The git date of a set of sources; `gitLastmod` in a build. */
  lastmodOf: (sources: readonly string[]) => string | null;
}

/**
 * The date of one address. Lessons use their frontmatter dates; the tag hub
 * the newest lesson under any tag; "What's changed" its newest day; the
 * guides theirs; other static pages the git date of their sources. An address
 * with no date omits the field, which the sitemap protocol allows.
 */
export function lastmodFor(pathname: string, { content, guides, changesDay, lastmodOf }: SerializeInputs): string | undefined {
  const { locale, path } = splitLocalePath(pathname);
  const fromGit = (p: string) => {
    const sources = staticPageSources(locale, p);
    return sources ? lastmodOf(sources) ?? undefined : undefined;
  };
  if (path === 'blog/tag') {
    // Falls back to the source files' git date when the tag map is empty.
    return [...content.tag.values()].sort().pop() ?? fromGit('blog/tag');
  }
  if (path === 'changes') return changesDay ?? fromGit('changes');
  // A year of the privacy changelog is built from the same sources as its index.
  if (path.startsWith('privacy/changelog/')) return fromGit('privacy/changelog');
  // The terms come from the lessons and the words around them from the page
  // and its catalog: whichever changed last.
  if (path === 'blog/glossary') return laterOf(fromGit('blog/glossary'), content.glossary);
  // The hub changes when a guide is added or checked again.
  if (path === 'how-to') return guides.newest ?? undefined;
  if (path.startsWith('how-to/')) return guides.guide.get(path.slice('how-to/'.length));
  // The hub changes when a lesson in it is added or revised.
  if (path === 'blog/inclusive-finances') return content.inclusive ?? undefined;
  const rest = path.slice('blog/'.length);
  // A level page changes when a lesson in it is added or revised.
  if (path.startsWith('blog/') && content.level.has(rest)) return content.level.get(rest);
  if (path.startsWith('blog/') && path !== 'blog') return content.blog.get(rest);
  return fromGit(path);
}

/**
 * The sitemap integration's `serialize`: the date, and x-default beside the
 * language pairs the integration fills from `sitemapI18n` (one link per
 * edition that exists). x-default is the English address, as BaseHead writes
 * it in the page head, so the two agree on what the pair is and where a
 * reader with no matching language goes.
 */
export function sitemapSerialize<T extends SitemapItem>(item: T, inputs: SerializeInputs): T {
  const lastmod = lastmodFor(new URL(item.url).pathname, inputs);
  if (lastmod) item.lastmod = lastmod;
  if (item.links?.length) {
    const english = item.links.find((link) => link.lang === LOCALE_META[DEFAULT_LOCALE].htmlLang);
    if (english) item.links = [...item.links, { lang: 'x-default', url: english.url }];
  }
  return item;
}

/**
 * The integration's `i18n` option. Keys are URL segments and must include the
 * default locale; the integration validates them against `[a-zA-Z-]+`, so a
 * future locale whose tag it rejects fails the build rather than quietly
 * dropping the pairing. The tags come from LOCALE_META, so the sitemap and the
 * `<link rel="alternate">` tags BaseHead writes cannot disagree.
 */
export function sitemapI18n(): { defaultLocale: Locale; locales: Record<string, string> } {
  return {
    defaultLocale: DEFAULT_LOCALE,
    locales: Object.fromEntries(LOCALES.map((locale) => [locale, LOCALE_META[locale].htmlLang])),
  };
}
