import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nidhi.today',
  integrations: [react(), sitemap({
    filter: (page) => {
      const transactional = ['confirm', 'subscription-confirmed', 'subscription-invalid', 'unsubscribe', 'unsubscribed'];
      return !transactional.some(p => page.includes(p));
    },
  })],
  output: 'static',
  trailingSlash: 'never',
  vite: {
    optimizeDeps: {
      exclude: ['puppeteer'],
    },
  },
});