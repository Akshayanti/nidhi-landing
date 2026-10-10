import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META } from './src/i18n/config.ts';

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
 * Four lookup maps, built once per build:
 *  - blogLastmod: slug → ISO date (updatedDate ?? pubDate)
 *  - tagLastmod : tag  → ISO date (newest among posts carrying the tag)
 * and inclusiveLastmod, the newest live Inclusive Finances guide (null while
 * none is live), which decides whether the hub is in the sitemap at all,
 * and levelLastmod: level → ISO date (newest live lesson in that level), which
 * does the same for the level pages (/blog/<level>/).
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
      const dateStr = fm.updatedDate ?? fm.pubDate;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) continue;
      const iso = d.toISOString();
      blog.set(fm.slug, iso);
      if (fm.level === 'inclusive-finances' && (!inclusive || iso > inclusive)) inclusive = iso;
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
  return { blog, tag, level, inclusive };
}

const contentMaps = readContentMaps();

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
  'beliefs': ['src/components/pages/BeliefsPage.astro'],
  'editorial-policy': ['src/components/pages/EditorialPolicyPage.astro'],
  'privacy': ['src/components/pages/PrivacyPage.astro'],
  'blog': ['src/layouts/BlogIndex.astro'],
  'blog/tag': ['src/pages/blog/tag/index.astro'],
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
};

/**
 * The repo files a locale's version of a static page is built from: the same
 * components as the English page, plus that language's catalog, because a
 * change to `src/i18n/strings/hi.ts` is a change to every Hindi page. That is
 * coarse on purpose: one file holds every page's words, so any Hindi copy edit
 * moves every Hindi page's date. A date that moves too often is a smaller
 * wrong than a date that freezes while the page's text changes, and the
 * coarseness goes away when the catalogs are split per page.
 */
function staticPageSources(locale, path) {
  const english = STATIC_PAGE_SOURCE[path];
  if (!english) return null;
  return locale === DEFAULT_LOCALE ? english : [...english, `src/i18n/strings/${locale}.ts`];
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
      // the tag hub uses the newest pubDate across all tags; other
      // static pages use the git author-date of their source files. URLs
      // without a resolvable lastmod simply omit the field, which is
      // valid sitemap protocol and lets the integration's defaults
      // handle them gracefully.
      const { locale, path } = splitLocalePath(new URL(item.url).pathname);
      const maps = contentMaps;
      let lastmod;
      if (path === 'blog/tag') {
        // Tag-hub page itself: lastmod = the newest content under any
        // tag the corpus uses. Falls back to the source file's git
        // author-date if the tag map is empty.
        const newestAcrossTags = [...maps.tag.values()].sort().pop();
        lastmod = newestAcrossTags ?? gitLastmod(STATIC_PAGE_SOURCE['blog/tag']) ?? undefined;
      } else if (path === 'blog/inclusive-finances') {
        // The hub changes when a guide is added or revised: date it by the
        // most recently published or updated guide.
        lastmod = maps.inclusive ?? undefined;
      } else if (path.startsWith('blog/') && maps.level.has(path.slice('blog/'.length))) {
        // A level page changes when a lesson in it is added or revised.
        lastmod = maps.level.get(path.slice('blog/'.length));
      } else if (path.startsWith('blog/') && path !== 'blog') {
        lastmod = maps.blog.get(path.slice('blog/'.length));
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
  })],
  // Permanent redirects for renamed/retired pages.
  // Static output emits an HTML file with <meta http-equiv="refresh">
  // and a canonical link, which is the strongest signal available
  // without server-side 301s.
  redirects: {
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
    // The Hindi edition's own short links, for a biography written in Hindi.
    // They land on the Hindi home page, so the address a visitor ends up at
    // (and the pageview it sends) says which language and which platform.
    '/hi/ig/': '/hi/?utm_source=instagram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
    '/hi/tg/': '/hi/?utm_source=telegram&utm_medium=social&utm_campaign=bio&utm_content=home_link',
    '/hi/wa/': '/hi/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=home_link',
    '/hi/dsc/': '/hi/?utm_source=discord&utm_medium=social&utm_campaign=bio&utm_content=home_link',
  },
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
