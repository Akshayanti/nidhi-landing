import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nidhi.today',
  integrations: [react(), sitemap({
    filter: (page) => {
      // index2 is the in-progress landing-page redesign. It carries
      // robots="noindex,nofollow" while it lives next to the current home,
      // and is excluded from the sitemap so search engines do not see two
      // near-duplicate root pages during the parallel period. When the
      // redesign ships into index.astro this exclusion can be removed.
      const transactional = ['confirm', 'subscription-confirmed', 'subscription-invalid', 'unsubscribe', 'unsubscribed', 'index2'];
      return !transactional.some(p => page.includes(p));
    },
  })],
  // Permanent redirects for renamed/retired pages.
  // Static output emits an HTML file with <meta http-equiv="refresh">
  // and a canonical link, which is the strongest signal available
  // without server-side 301s.
  redirects: {
    '/free/currency-risk/': '/free/multi-currency-net-worth/',
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