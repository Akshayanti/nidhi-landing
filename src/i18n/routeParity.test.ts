/**
 * Every English page has its mirror under src/pages/[locale]/ (part of #361).
 *
 * A page added in English only is a page four languages do not have, and
 * nothing said so: src/i18n/routes.test.ts tests the helpers a mirrored route
 * uses, not that the route is there. This compares the two folders file by
 * file. A route that is meant to exist on one side only is listed below with
 * its reason, and a listed route that gains its mirror fails too, so the list
 * cannot go stale.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const PAGES = join(import.meta.dirname, '..', 'pages');
const MIRROR = join(PAGES, '[locale]');

/** English routes with no translated edition, and why. */
const ENGLISH_ONLY: Record<string, string> = {
  '404.astro': 'one not-found page for the whole site; GitHub Pages serves only /404.html',
  'blog/[slug].astro': 'lessons are written once, in English (CLAUDE.md, "Lessons are content, not copy")',
  'how-to/[slug].astro': 'guides are English; this route also serves the English group pages',
  'how-to/situation/[slug].astro': 'situation pages list English guides',
  'rss.xml.ts': 'the lessons feed: lessons are English',
  'how-to/rss.xml.ts': 'the guides feed: guides are English',
  'llms.txt.ts': 'the one summary for AI assistants, at the site root; it names every edition itself',
  'data/inflation-history.json.ts': 'data, with no words in it',
  'brand/social/lessons/[slug].png.ts': 'the share cards of published lessons, which are English (#743)',
  'studio/qr.astro': 'an internal tool, not a page for readers',
  'confirm.astro': 'the newsletter flow: the lessons it sends, and its emails, are English',
  'subscription-confirmed.astro': 'the newsletter flow: the lessons it sends, and its emails, are English',
  'subscription-invalid.astro': 'the newsletter flow: the lessons it sends, and its emails, are English',
  'unsubscribe.astro': 'the newsletter flow: the lessons it sends, and its emails, are English',
  'unsubscribed.astro': 'the newsletter flow: the lessons it sends, and its emails, are English',
};

/** Routes that exist only under [locale]/, and why. */
const MIRROR_ONLY: Record<string, string> = {
  'how-to/[group].astro': 'the English group pages share how-to/[slug].astro with the guides',
  'site.webmanifest.ts': 'the English manifest is the file public/brand/site.webmanifest; each other language builds its own from it',
};

function routes(dir: string, skip?: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (path === skip) return [];
    return entry.isDirectory() ? routes(path, skip) : [path];
  });
}

const english = routes(PAGES, MIRROR).map((path) => relative(PAGES, path).split(sep).join('/')).sort();
const mirrored = routes(MIRROR).map((path) => relative(MIRROR, path).split(sep).join('/')).sort();

describe('route parity between English and the other languages', () => {
  it('reads both folders', () => {
    assert.ok(english.includes('index.astro') && mirrored.includes('index.astro'));
  });

  it('every English route has a mirror, or is listed as English only', () => {
    const missing = english.filter((route) => !mirrored.includes(route) && !(route in ENGLISH_ONLY));
    assert.deepEqual(missing, [], 'Add the route under src/pages/[locale]/ (a thin route that renders the same page component), or list it in ENGLISH_ONLY with its reason.');
  });

  it('every mirrored route has an English route, or is listed as mirror only', () => {
    const extra = mirrored.filter((route) => !english.includes(route) && !(route in MIRROR_ONLY));
    assert.deepEqual(extra, [], 'Add the English route, or list it in MIRROR_ONLY with its reason.');
  });

  it('the two lists name only routes that are still one-sided', () => {
    for (const route of Object.keys(ENGLISH_ONLY)) {
      assert.ok(english.includes(route), `ENGLISH_ONLY lists ${route}, which is no longer a route`);
      assert.ok(!mirrored.includes(route), `ENGLISH_ONLY lists ${route}, which now has a mirror: remove it from the list`);
    }
    for (const route of Object.keys(MIRROR_ONLY)) {
      assert.ok(mirrored.includes(route), `MIRROR_ONLY lists ${route}, which is no longer a route`);
      assert.ok(!english.includes(route), `MIRROR_ONLY lists ${route}, which now has an English route: remove it from the list`);
    }
  });
});
