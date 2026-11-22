import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  gitLastmod,
  newestChangeDay,
  readContentMaps,
  readGuideMaps,
  sitemapFilter,
  sitemapI18n,
  sitemapSerialize,
} from './src/utils/sitemap.ts';
import { CHANGE_DAYS } from './src/i18n/strings/changes.ts';
import { LAUNCH_HOST_SLUGS } from './src/utils/launchHosts.ts';
import { minifySync } from 'vite';
import { fileURLToPath } from 'node:url';
import { cleanPath, isSocialShortLink, readHead, refreshTarget, shortLinkStub } from './scripts/lib/short-link-stub.mjs';
import { minifyInlineScripts } from './scripts/lib/minify-inline-scripts.mjs';

/**
 * What the sitemap lists and how it dates each address live in
 * src/utils/sitemap.ts, where they are tested (#361). The inputs are read once
 * per build: the lessons' and guides' frontmatter (this file is loaded before
 * the content layer, so it cannot use `getCollection`), and the newest day on
 * "What's changed". Lessons and guides dated after today are not live yet and
 * are left out, so a scheduled lesson does not move a tag's or a level's date.
 */
const contentMaps = readContentMaps(join('src/content', 'blog'));
const guideMaps = readGuideMaps(join('src/content', 'guides'));
const sitemapInputs = {
  content: contentMaps,
  guides: guideMaps,
  changesDay: newestChangeDay(CHANGE_DAYS.map((d) => d.date), Object.values(LAUNCH_HOST_SLUGS), contentMaps.published),
  lastmodOf: gitLastmod,
};

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
  // A topic page that was live for one lesson's tag outside the closed list
  // (#499); the lesson is under psychology now.
  '/blog/tag/spending/': '/blog/tag/psychology/',
  '/hi/blog/tag/spending/': '/hi/blog/tag/psychology/',
  '/es/blog/tag/spending/': '/es/blog/tag/psychology/',
  '/cs/blog/tag/spending/': '/cs/blog/tag/psychology/',
  '/mr/blog/tag/spending/': '/mr/blog/tag/psychology/',
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

/**
 * Minifies the inline scripts in every page the build wrote (#450,
 * scripts/lib/minify-inline-scripts.mjs). It runs last, so the short-link
 * pages rewritten above are covered too. The minifier is the one Vite uses for
 * the bundled scripts; a script it cannot read fails the build.
 */
function minifiedInlineScripts() {
  return {
    name: 'minified-inline-scripts',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const minify = (code) => {
          const { code: small, errors } = minifySync('inline.js', code, { module: false });
          if (errors.length > 0) throw new Error(`An inline script does not parse: ${errors[0].message}`);
          return small;
        };
        const cache = new Map();
        let before = 0;
        let after = 0;
        const walk = (folder) => {
          for (const entry of readdirSync(folder)) {
            const full = join(folder, entry);
            if (statSync(full).isDirectory()) walk(full);
            else if (entry.endsWith('.html')) {
              const html = readFileSync(full, 'utf8');
              const small = minifyInlineScripts(html, minify, cache);
              before += Buffer.byteLength(html);
              after += Buffer.byteLength(small);
              if (small !== html) writeFileSync(full, small);
            }
          }
        };
        walk(fileURLToPath(dir));
        logger.info(`Inline scripts minified: ${before} bytes of HTML became ${after}.`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://nidhi.today',
  integrations: [react(), sitemap({
    filter: (page) => sitemapFilter(page, contentMaps, guideMaps),
    // Pairs each page with its counterparts in the other languages and fills
    // `item.links`, which the sitemap writes as
    // `<xhtml:link rel="alternate" hreflang="...">`. A page with no
    // counterpart gets no links at all, which is why a wrapper has to opt in
    // with `alternates={LOCALES}`: the sitemap can only pair pages that exist.
    i18n: sitemapI18n(),
    serialize: (item) => sitemapSerialize(item, sitemapInputs),
  }), socialShortLinks(), minifiedInlineScripts()],
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
