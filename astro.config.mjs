import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nidhi.today',
  integrations: [react(), sitemap()],
  output: 'static',
  trailingSlash: 'never',
  vite: {
    optimizeDeps: {
      exclude: ['puppeteer'],
    },
  },
});