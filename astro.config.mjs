import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read frontmatter dates and tags from every markdown file under
 * src/content/blog/. We can't use `getCollection('blog')` from
 * astro:content here: this file is loaded before the content layer is
 * available. So we do a small purpose-built parse — enough to pull
 * `slug:`, `pubDate:`, `updatedDate:` and `tags:` for sitemap lastmod.
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
 * Two lookup maps built once per build:
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
const { blogLastmod, tagLastmod, inclusiveLastmod, levelLastmod } = (() => {
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
    const files = walkBlogDir('src/content/blog');
    for (const f of files) {
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
    // Bare checkout, missing dir, or any IO error: leave maps empty.
    // Sitemap will simply omit <lastmod> for blog/tag URLs.
  }
  return { blogLastmod: blog, tagLastmod: tag, inclusiveLastmod: inclusive, levelLastmod: level };
})();

/**
 * Ask git for the author-date of the last commit that touched a given
 * path. Author date (`%aI`) reflects when the change was actually made,
 * not when it was rebased or cherry-picked. Returns null on any error
 * (git not on PATH, file not in repo, shallow checkout that does not
 * see the commit).
 */
function gitLastmod(repoPath) {
  try {
    const iso = execSync(`git log -1 --format=%aI -- "${repoPath}"`, {
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
 * URL-pathname → repo source file. Used for static pages that lack a
 * frontmatter date. Keys match the pathname between `nidhi.today/` and
 * the trailing slash.
 */
const STATIC_PAGE_SOURCE = {
  '': 'src/pages/index.astro',
  // Pages whose markup moved into src/components/pages/ date by that file: the
  // wrapper in src/pages/ is a few lines that render it and rarely changes, so
  // dating by the wrapper would freeze lastmod while the page's copy is edited.
  'about': 'src/components/pages/AboutPage.astro',
  'beliefs': 'src/components/pages/BeliefsPage.astro',
  'editorial-policy': 'src/pages/editorial-policy.astro',
  'privacy': 'src/pages/privacy.astro',
  'blog': 'src/layouts/BlogIndex.astro',
  'blog/tag': 'src/pages/blog/tag/index.astro',
  'free': 'src/pages/free/index.astro',
  'free/multi-currency-net-worth': 'src/pages/free/multi-currency-net-worth.astro',
  'free/loan-comparison': 'src/pages/free/loan-comparison.astro',
  // :(literal) stops git reading the brackets in the filename as a pattern.
  'free/monte-carlo-simulator': ':(literal)src/pages/free/monte-carlo-simulator/[...path].astro',
};

export default defineConfig({
  site: 'https://nidhi.today',
  integrations: [react(), sitemap({
    filter: (page) => {
      // Transactional and confirmation pages have no place in search.
      const transactional = ['confirm', 'subscription-confirmed', 'subscription-invalid', 'unsubscribe', 'unsubscribed'];
      if (transactional.some(p => page.includes(p))) return false;
      // Per-tag listings (/blog/tag/<tag>/) carry `noindex,follow` in
      // src/pages/blog/tag/[tag].astro. Listing a noindexed URL in the
      // sitemap sends crawlers two opposite signals, so keep them out.
      // The hub at /blog/tag/ is indexable and stays in. If the tag
      // pages are ever made indexable, drop this line and restore a
      // per-tag lastmod from `tagLastmod` in serialize() below.
      if (/\/blog\/tag\/[^/]+\/?$/.test(new URL(page).pathname)) return false;
      // The Inclusive Finances hub is noindex while it has no live posts
      // (src/pages/blog/inclusive-finances.astro), so it stays out of the
      // sitemap until then. It joins on its own once the first guide's
      // pubDate passes, the same build that drops its noindex and shows
      // the homepage and learning-path cards that link to it.
      if (new URL(page).pathname === '/blog/inclusive-finances/' && !inclusiveLastmod) return false;
      // A level page with no live lessons is noindex (src/layouts/LevelPage.astro).
      const levelPath = /^\/blog\/(discovery|building|psychology|optimizing|mastery)\/$/.exec(new URL(page).pathname);
      if (levelPath && !levelLastmod.has(levelPath[1])) return false;
      return true;
    },
    serialize(item) {
      // Per-URL lastmod resolution. Blog posts use frontmatter dates;
      // the tag hub uses the newest pubDate across all tags; other
      // static pages use the git author-date of their source file. URLs
      // without a resolvable lastmod simply omit the field, which is
      // valid sitemap protocol and lets the integration's defaults
      // handle them gracefully.
      const u = new URL(item.url);
      const path = u.pathname.replace(/^\/+|\/+$/g, '');
      let lastmod;
      if (path === 'blog/tag') {
        // Tag-hub page itself: lastmod = the newest content under any
        // tag the corpus uses. Falls back to the source file's git
        // author-date if the tag map is empty.
        const newestAcrossTags = [...tagLastmod.values()].sort().pop();
        lastmod = newestAcrossTags ?? gitLastmod(STATIC_PAGE_SOURCE['blog/tag']) ?? undefined;
      } else if (path === 'blog/inclusive-finances') {
        // The hub changes when a guide is added or revised: date it by the
        // most recently published or updated guide.
        lastmod = inclusiveLastmod ?? undefined;
      } else if (levelLastmod.has(path.slice('blog/'.length)) && path.startsWith('blog/')) {
        // A level page changes when a lesson in it is added or revised.
        lastmod = levelLastmod.get(path.slice('blog/'.length));
      } else if (path.startsWith('blog/') && path !== 'blog') {
        lastmod = blogLastmod.get(path.slice('blog/'.length));
      } else {
        const source = STATIC_PAGE_SOURCE[path];
        if (source) lastmod = gitLastmod(source) ?? undefined;
      }
      if (lastmod) item.lastmod = lastmod;
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