import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META } from './src/i18n/config.ts';
import { lastChanged } from './src/utils/lessonDates.ts';
import { CHANGE_DAYS } from './src/i18n/strings/changes.ts';
import { cleanPath, isSocialShortLink, readHead, refreshTarget, shortLinkStub } from './scripts/lib/short-link-stub.mjs';

/**
 * Read frontmatter dates and tags from every markdown file under a locale's
 * content directory. We can't use `getCollection('blog')` from astro:content
 * here: this file is loaded before the content layer is available. So we do a
 * small purpose-built parse — enough to pull `slug:`, `pubDate:`,
 * `updatedDate:` and `tags:` for sitemap lastmod.
 *
 * The parser is intentionally minimal (line-based, single-quoted scalar
 * tolerant) to avoid pulling in a YAML dep just for the sitemap. It only
 * needs to handle the subset of YAML that the blog frontmatter actually
 * uses; if frontmatter shape diverges materially this parser should be
 * replaced with a real YAML library.
 */
function readFrontmatter(path) {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const block = match[1];
  const data = {};
  // Scalar lines: "key: value". Strip surrounding single/double quotes.
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  // Inline-array tags: `tags: [a, b, c]`. Block-style tags would need
  // multi-line handling; the current corpus uses inline only.
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

function walkBlogDir(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      out.push(...walkBlogDir(full));
    } else if (/\.(md|mdx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The directory holding the lessons: one, in English. There is one lesson
 * library and it is not translated, so every language's pages date themselves
 * from the same files (see `lessonPath` in src/i18n/config.ts).
 */
const CONTENT_DIR = join('src/content', 'blog');

/**
 * The lookup maps, built once per build:
 *  - blogLastmod: slug → ISO date (the later of updatedDate and pubDate)
 *  - tagLastmod : tag  → ISO date (newest among posts carrying the tag)
 * and inclusiveLastmod, the newest live Inclusive Finances guide (null while
 * none is live), which decides whether the hub is in the sitemap at all,
 * and levelLastmod: level → ISO date (newest live lesson in that level), which
 * does the same for the level pages (/blog/<level>/), and glossaryLastmod, the
 * newest live lesson that defines glossary terms (the glossary page lists them).
 *
 * Tag lastmod intentionally tracks newest content under the tag, not the
 * git mtime of [tag].astro: a reader visiting /blog/tag/saving/ cares
 * "did anything new appear under saving?", not "did the template change?".
 */
function readContentMaps() {
  const blog = new Map();
  const tag = new Map();
  const level = new Map();
  let inclusive = null;
  let glossary = null;
  // Filter by pubDate <= now so future-dated posts (drafts scheduled for
  // a later publish window) don't poison tag-page lastmod values. The
  // sitemap should reflect what's actually visible to a crawler today,
  // not what's queued.
  const now = new Date();
  try {
    for (const f of walkBlogDir(CONTENT_DIR)) {
      const fm = readFrontmatter(f);
      if (!fm || !fm.slug || !fm.pubDate) continue;
      const pub = new Date(fm.pubDate);
      if (Number.isNaN(pub.getTime())) continue;
      if (pub > now) continue;
      // The last edit, but never earlier than the day the page first
      // existed (src/utils/lessonDates.ts).
      const edited = fm.updatedDate ? new Date(fm.updatedDate) : null;
      const d = lastChanged(pub, edited && !Number.isNaN(edited.getTime()) ? edited : null);
      const iso = d.toISOString();
      blog.set(fm.slug, iso);
      if (fm.level === 'inclusive-finances' && (!inclusive || iso > inclusive)) inclusive = iso;
      if (fm.hasGlossary && (!glossary || iso > glossary)) glossary = iso;
      if (fm.level && fm.level !== 'inclusive-finances' && (!level.has(fm.level) || iso > level.get(fm.level))) level.set(fm.level, iso);
      if (Array.isArray(fm.tags)) {
        for (const t of fm.tags) {
          const prev = tag.get(t);
          if (!prev || iso > prev) tag.set(t, iso);
        }
      }
    }
  } catch {
    // Empty content directory, missing directory, or any IO error: leave the
    // maps empty. The sitemap will omit <lastmod> for blog/tag URLs and keep
    // the level pages out until the level has a lesson.
  }
  return { blog, tag, level, inclusive, glossary };
}

const contentMaps = readContentMaps();

/**
 * How-to guides (src/content/guides/): slug → ISO date (lastChecked ?? pubDate),
 * live ones only, and the newest of them, which dates the hub and decides
 * whether it is in the sitemap at all (it is noindex while no guide is live).
 */
function readGuideMaps() {
  const guide = new Map();
  let newest = null;
  const now = new Date();
  try {
    for (const entry of readdirSync('src/content/guides')) {
      if (!entry.endsWith('.md')) continue;
      const fm = readFrontmatter(join('src/content/guides', entry));
      if (!fm || !fm.slug || !fm.pubDate) continue;
      const pub = new Date(fm.pubDate);
      if (Number.isNaN(pub.getTime()) || pub > now) continue;
      const d = new Date(fm.lastChecked ?? fm.pubDate);
      if (Number.isNaN(d.getTime())) continue;
      const iso = d.toISOString();
      guide.set(fm.slug, iso);
      if (!newest || iso > newest) newest = iso;
    }
  } catch {
    // No guides directory: nothing to date.
  }
  return { guide, newest };
}

const guideMaps = readGuideMaps();

/**
 * The newest day on the "What's changed" page, as an ISO date: the page gains
 * an item with every visible change, so its newest day is when it last
 * changed. A day dated after today is not on the page yet and is passed over.
 * A launch item (src/utils/liveChanges.ts) is dated by its lesson, which this
 * file cannot read as a collection; the days around it are in the list.
 */
function newestChangeDay() {
  const today = new Date().toISOString().slice(0, 10);
  const newest = CHANGE_DAYS.map((d) => d.date).filter((d) => d <= today).sort().pop();
  return newest ? new Date(`${newest}T00:00:00Z`).toISOString() : null;
}

/** The later of two ISO dates, either of which may be missing. */
function laterOf(a, b) {
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
function splitLocalePath(pathname) {
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
 * Ask git for the author-date of the last commit that touched any of the given
 * paths. Author date (`%aI`) reflects when the change was actually made, not
 * when it was rebased or cherry-picked. Returns null on any error (git not on
 * PATH, file not in repo, shallow checkout that does not see the commit).
 */
function gitLastmod(repoPaths) {
  try {
    const args = repoPaths.map((p) => `"${p}"`).join(' ');
    const iso = execSync(`git log -1 --format=%aI -- ${args}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return iso || null;
  } catch {
    return null;
  }
}

/**
 * URL-pathname (without the locale prefix) → repo source files. Used for
 * static pages that lack a frontmatter date. Keys match the pathname between
 * `nidhi.today/` and the trailing slash.
 *
 * Values are the files that carry the page's own copy, so the date moves when
 * the page does: the component that renders it, and any island or catalog
 * module its words also live in. The wrapper in `src/pages/` is deliberately
 * left out: it is a few lines that render the component and rarely change, so
 * dating by the wrapper would freeze lastmod while the page's copy is edited.
 */
const STATIC_PAGE_SOURCE = {
  '': ['src/components/pages/HomePage.astro'],
  'about': ['src/components/pages/AboutPage.astro'],
  'accessibility': ['src/components/pages/AccessibilityPage.astro'],
  'beliefs': ['src/components/pages/BeliefsPage.astro'],
  'beta': ['src/components/pages/BetaPage.astro'],
  'changes': ['src/components/pages/ChangesPage.astro'],
  'volunteers': ['src/components/pages/VolunteersPage.astro'],
  'editorial-policy': ['src/components/pages/EditorialPolicyPage.astro'],
  'privacy': ['src/components/pages/PrivacyPage.astro'],
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
  // :(literal) stops git reading the brackets in the filename as a pattern.
  'free/monte-carlo-simulator': [
    ':(literal)src/pages/free/monte-carlo-simulator/[...path].astro',
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
  ],
  'free/invest-or-pay-off': [
    ':(literal)src/pages/free/invest-or-pay-off/[...path].astro',
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
 * learning path's pages also read `learn.ts` (which holds both languages), and
 * any other language reads its own file. That is coarse on purpose: one file
 * holds every page's words, so any copy edit moves every page's date in that
 * language. A date that moves too often is a smaller wrong than a date that
 * freezes while the page's text changes, and the coarseness goes away when the
 * catalogs are split per page.
 */
function staticPageSources(locale, path) {
  const components = STATIC_PAGE_SOURCE[path];
  if (!components) return null;
  const catalogs = [`src/i18n/strings/${locale}.ts`];
  if (path === 'blog' || path.startsWith('blog/')) catalogs.push('src/i18n/strings/learn.ts');
  return [...components, ...catalogs];
}

/**
 * Permanent redirects for renamed and retired pages, and the short links.
 * Static output emits an HTML file with <meta http-equiv="refresh"> and a
 * canonical link, which is the strongest signal available without server-side
 * 301s. The social short links are then given a fuller page by
 * `socialShortLinks` below; this map stays the one list of where each leads,
 * and scripts/lib/short-link-stub.test.mjs pins it.
 */
const REDIRECTS = {
  '/free/currency-risk/': '/free/multi-currency-net-worth/',
  // Short links for social bios (nidhi.today/ig and so on). The redirect
  // page loads no analytics; the pageview on the destination carries the
  // campaign parameters, which the privacy notice already covers. One
  // campaign name across platforms, so utm_source tells them apart.
  '/ig/': '/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/tg/': '/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/wa/': '/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/dsc/': '/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  // The same, landing on the learning path; utm_content tells the two apart.
  '/blog/ig/': '/blog/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=blog_link',
  '/blog/tg/': '/blog/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=blog_link',
  '/blog/wa/': '/blog/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=blog_link',
  '/blog/dsc/': '/blog/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=blog_link',
  // The same, landing on the How-to guides; utm_content howto_link tells them apart.
  '/how-to/ig/': '/how-to/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=howto_link',
  // The same, landing on the planner beta page, in each language; utm_content
  // beta_link tells them from the home and blog links.
  '/beta/ig/': '/beta/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/beta/tg/': '/beta/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/beta/wa/': '/beta/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/beta/dsc/': '/beta/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/hi/beta/ig/': '/hi/beta/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/hi/beta/tg/': '/hi/beta/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/hi/beta/wa/': '/hi/beta/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/hi/beta/dsc/': '/hi/beta/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/es/beta/ig/': '/es/beta/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/es/beta/tg/': '/es/beta/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/es/beta/wa/': '/es/beta/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/es/beta/dsc/': '/es/beta/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/cs/beta/ig/': '/cs/beta/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/cs/beta/tg/': '/cs/beta/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/cs/beta/wa/': '/cs/beta/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/cs/beta/dsc/': '/cs/beta/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/mr/beta/ig/': '/mr/beta/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/mr/beta/tg/': '/mr/beta/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/mr/beta/wa/': '/mr/beta/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  '/mr/beta/dsc/': '/mr/beta/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=beta_link',
  // The Hindi edition's own short links, for a biography written in Hindi.
  // They land on the Hindi home page, so the address a visitor ends up at
  // (and the pageview it sends) says which language and which platform.
  '/hi/ig/': '/hi/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/hi/tg/': '/hi/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/hi/wa/': '/hi/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/hi/dsc/': '/hi/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  // The Spanish edition's, likewise.
  '/es/ig/': '/es/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/es/tg/': '/es/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/es/wa/': '/es/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/es/dsc/': '/es/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  // The Czech edition's, likewise.
  '/cs/ig/': '/cs/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/cs/tg/': '/cs/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/cs/wa/': '/cs/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/cs/dsc/': '/cs/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  // The Marathi edition's, likewise.
  '/mr/ig/': '/mr/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/mr/tg/': '/mr/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/mr/wa/': '/mr/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  '/mr/dsc/': '/mr/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  // Short codes printed on posters, for people who type the
  // address instead of scanning. Each leads to its poster's page (the QR
  // codes carry the full tagged address and need no redirect), with the
  // improv typed code going to the home page top and its QR code to #signup,
  // and utm_content=typed against the QR codes' utm_content=qr. The codes and
  // campaign names stay neutral: no venue or shop is named in an address.
  '/improv/': '/?utm_source=poster&utm_medium=print&utm_campaign=improv_shows&utm_content=typed',
  '/cs/plakat/': '/cs/free/?utm_source=poster&utm_medium=print&utm_campaign=plakat&utm_content=typed',
  '/hi/parivar/': '/hi/free/?utm_source=poster&utm_medium=print&utm_campaign=family&utm_content=typed',
  '/yoga/': '/free/?utm_source=poster&utm_medium=print&utm_campaign=yoga&utm_content=typed',
};

/**
 * Rewrites the page behind each social short link once the build has written
 * everything, so a link pasted into a chat previews as the site's card and not
 * as "Redirecting to: /?utm_source=..." (scripts/lib/short-link-stub.mjs).
 *
 * It reads the destination page this build wrote and keeps the refresh as it
 * is in REDIRECTS. Then it reads back every redirect page, social or not, and
 * fails the build if one is missing or leads anywhere but where REDIRECTS
 * says: these addresses are printed in bios and on posters.
 */
function socialShortLinks() {
  let site;
  return {
    name: 'social-short-links',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
      },
      'astro:build:done': ({ dir, logger }) => {
        const fileFor = (path) => new URL(`.${path}index.html`, dir);
        let rewritten = 0;
        for (const [from, destination] of Object.entries(REDIRECTS)) {
          if (!isSocialShortLink(destination)) continue;
          if (!existsSync(fileFor(from))) throw new Error(`Short link ${from}: the build wrote no page for it.`);
          const head = readHead(readFileSync(fileFor(cleanPath(destination)), 'utf8'));
          writeFileSync(fileFor(from), shortLinkStub({ destination, head, site }));
          rewritten += 1;
        }
        for (const [from, destination] of Object.entries(REDIRECTS)) {
          const found = existsSync(fileFor(from)) ? refreshTarget(readFileSync(fileFor(from), 'utf8')) : null;
          if (found !== destination) {
            throw new Error(`Short link ${from} leads to ${found ?? 'nothing'}, not to ${destination}.`);
          }
        }
        logger.info(`${rewritten} social short links carry their destination's card; ${Object.keys(REDIRECTS).length} redirects checked.`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://nidhi.today',
  integrations: [react(), sitemap({
    filter: (page) => {
      const { locale, path } = splitLocalePath(new URL(page).pathname);
      // Transactional and confirmation pages have no place in search, in any
      // language. Matched on the first path segment rather than anywhere in the
      // URL, so a lesson slug that happens to contain one of these words is
      // still listed.
      const transactional = ['confirm', 'subscription-confirmed', 'subscription-invalid', 'unsubscribe', 'unsubscribed'];
      if (transactional.includes(path.split('/')[0])) return false;
      // The owner's tools under /studio/ (the QR maker) are unlisted: noindex,
      // linked from nowhere and kept out of the sitemap. Not named in robots.txt,
      // which would advertise them.
      if (path.split('/')[0] === 'studio') return false;
      // Per-tag listings (/blog/tag/<tag>/) carry `noindex,follow` in
      // src/pages/blog/tag/[tag].astro. Listing a noindexed URL in the
      // sitemap sends crawlers two opposite signals, so keep them out.
      // The hub at /blog/tag/ is indexable and stays in. If the tag
      // pages are ever made indexable, drop this line and restore a
      // per-tag lastmod from `tagLastmod` in serialize() below.
      if (/^blog\/tag\/[^/]+$/.test(path)) return false;
      // The Inclusive Finances hub is noindex while it has no live posts
      // (src/pages/blog/inclusive-finances.astro), so it stays out of the
      // sitemap until then. It joins on its own once the first guide's
      // pubDate passes, the same build that drops its noindex and shows
      // the homepage and learning-path cards that link to it. Both languages'
      // hubs carry the same lessons, so whether it is live is the same
      // question in either.
      if (path === 'blog/inclusive-finances' && !contentMaps.inclusive) return false;
      // The How-to hub is noindex while no guide is live, in every language.
      if (path === 'how-to' && !guideMaps.newest) return false;
      // A level page with no live lessons is noindex (src/layouts/LevelPage.astro),
      // in every language, for the same reason.
      const levelPath = /^blog\/(discovery|building|psychology|optimizing|mastery)$/.exec(path);
      if (levelPath && !contentMaps.level.has(levelPath[1])) return false;
      return true;
    },
    // Pairs each page with its counterparts in the other languages and fills
    // `item.links`, which the sitemap writes as
    // `<xhtml:link rel="alternate" hreflang="...">`. The tags come from
    // LOCALE_META so the sitemap and the `<link rel="alternate">` tags BaseHead
    // writes in the page head cannot disagree. A page with no counterpart gets
    // no links at all, which is why a wrapper has to opt in with
    // `alternates={LOCALES}`: the sitemap can only pair pages that exist.
    //
    // Keys are URL segments and must include `defaultLocale`; the integration
    // validates them against `[a-zA-Z-]+`, so a future locale whose htmlLang
    // carries an underscore (zh_Hant) or a script suffix zod rejects would fail
    // the build here rather than quietly dropping the pairing.
    i18n: {
      defaultLocale: DEFAULT_LOCALE,
      locales: Object.fromEntries(LOCALES.map((locale) => [locale, LOCALE_META[locale].htmlLang])),
    },
    serialize(item) {
      // Per-URL lastmod resolution. Blog posts use frontmatter dates;
      // the tag hub uses the newest pubDate across all tags; "What's
      // changed" uses its newest day; other
      // static pages use the git author-date of their source files. URLs
      // without a resolvable lastmod simply omit the field, which is
      // valid sitemap protocol and lets the integration's defaults
      // handle them gracefully.
      const { locale, path } = splitLocalePath(new URL(item.url).pathname);
      let lastmod;
      if (path === 'blog/tag') {
        // Tag-hub page itself: lastmod = the newest content under any
        // tag the corpus uses. Falls back to the source file's git
        // author-date if the tag map is empty.
        const newestAcrossTags = [...contentMaps.tag.values()].sort().pop();
        lastmod = newestAcrossTags ?? gitLastmod(staticPageSources(locale, 'blog/tag')) ?? undefined;
      } else if (path === 'changes') {
        // The page's own newest day, which is also its JSON-LD `dateModified`.
        lastmod = newestChangeDay() ?? gitLastmod(staticPageSources(locale, 'changes')) ?? undefined;
      } else if (path === 'blog/glossary') {
        // The terms come from the lessons and the words around them from the
        // page and its catalog: whichever changed last.
        lastmod = laterOf(gitLastmod(staticPageSources(locale, 'blog/glossary')), contentMaps.glossary);
      } else if (path === 'how-to') {
        // The hub changes when a guide is added or checked again.
        lastmod = guideMaps.newest ?? undefined;
      } else if (path.startsWith('how-to/')) {
        lastmod = guideMaps.guide.get(path.slice('how-to/'.length));
      } else if (path === 'blog/inclusive-finances') {
        // The hub changes when a guide is added or revised: date it by the
        // most recently published or updated guide.
        lastmod = contentMaps.inclusive ?? undefined;
      } else if (path.startsWith('blog/') && contentMaps.level.has(path.slice('blog/'.length))) {
        // A level page changes when a lesson in it is added or revised.
        lastmod = contentMaps.level.get(path.slice('blog/'.length));
      } else if (path.startsWith('blog/') && path !== 'blog') {
        lastmod = contentMaps.blog.get(path.slice('blog/'.length));
      } else {
        const sources = staticPageSources(locale, path);
        if (sources) lastmod = gitLastmod(sources) ?? undefined;
      }
      if (lastmod) item.lastmod = lastmod;
      if (item.links?.length) {
        // x-default is the address to fall back to, which is the English one.
        // BaseHead writes the same tag in the page head, so the two agree on
        // what the pair is and where a reader with no matching language goes.
        const english = item.links.find((link) => link.lang === LOCALE_META[DEFAULT_LOCALE].htmlLang);
        if (english) item.links = [...item.links, { lang: 'x-default', url: english.url }];
      }
      return item;
    },
  }), socialShortLinks()],
  redirects: REDIRECTS,
  output: 'static',
  // GitHub Pages serves directory URLs with a trailing slash and
  // 301-redirects no-slash variants. Match that here so canonicals,
  // og:url, sitemap entries and internal links agree with the URLs
  // actually served — avoids "Alternate page with proper canonical
  // tag" reports in Google Search Console and saves crawl budget.
  trailingSlash: 'always',
  vite: {
    optimizeDeps: {
      exclude: ['puppeteer'],
    },
  },
});
