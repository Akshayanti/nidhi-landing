#!/usr/bin/env node

/**
 * Unified Instagram renderer.
 * Generates both carousel slides (1080x1080) and story frames (1080x1920)
 * for every post (or a single post if a path arg is given).
 *
 * Shares one puppeteer browser instance across both render passes.
 *
 * Usage:
 *   npm run render-ig                                     # all posts
 *   npm run render-ig "1. discovery/07-liquidity.md"      # one post
 */

import puppeteer from 'puppeteer';
import { loadAllPosts, loadPost } from './lib/parse-markdown.js';
import { renderSlides } from './render-slides.js';
import { renderStoriesForPost } from './render-stories.js';

async function main() {
  const targetFile = process.argv[2];

  console.log('Rendering Instagram carousels + stories...\n');

  const browser = await puppeteer.launch({ headless: true });

  let carouselCount = 0;
  let storiesCount = 0;
  let storiesSkipped = 0;
  let failures = 0;

  try {
    const posts = targetFile
      ? [await loadPost(targetFile)]
      : await loadAllPosts();

    for (const post of posts) {
      console.log(`→ ${post.title}`);

      // Carousel (always)
      try {
        const files = await renderSlides(post, browser);
        console.log(`  carousel · ${files.length} slides`);
        carouselCount++;
      } catch (err) {
        console.error(`  carousel FAILED · ${err.message}`);
        failures++;
      }

      // Stories (skipped automatically if no story_* fields)
      try {
        const result = await renderStoriesForPost(post, browser);
        if (result.skipped) {
          console.log(`  stories  · skipped (no story fields)`);
          storiesSkipped++;
        } else {
          console.log(`  stories  · ${result.rendered.length} frames`);
          storiesCount++;
        }
      } catch (err) {
        console.error(`  stories FAILED · ${err.message}`);
        failures++;
      }

      console.log('');
    }

    console.log(
      `Done. Carousels: ${carouselCount} · Stories: ${storiesCount} ` +
      `(${storiesSkipped} skipped)` +
      (failures ? ` · ${failures} failure(s)` : '')
    );
  } finally {
    await browser.close();
  }

  if (failures > 0) process.exit(1);
}

main().catch(err => {
  console.error('Render failed:', err);
  process.exit(1);
});
