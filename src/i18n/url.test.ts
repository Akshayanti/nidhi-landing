/**
 * Unit tests for src/i18n/url.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { stripLocale, swapLocale } from './url.ts';

describe('splitting a pathname into locale and path', () => {
  it('reads an unprefixed path as the default locale', () => {
    assert.deepEqual(stripLocale('/'), { locale: 'en', path: '/' });
    assert.deepEqual(stripLocale('/about/'), { locale: 'en', path: '/about/' });
  });

  it('strips a known locale prefix', () => {
    assert.deepEqual(stripLocale('/hi/'), { locale: 'hi', path: '/' });
    assert.deepEqual(stripLocale('/hi/about/'), { locale: 'hi', path: '/about/' });
    assert.deepEqual(stripLocale('/hi/free/net-worth/'), { locale: 'hi', path: '/free/net-worth/' });
  });

  it('treats a prefix without its trailing slash as the locale root', () => {
    // Someone typing nidhi.today/hi by hand must not end up with a path of
    // '/hi' inside the Hindi site.
    assert.deepEqual(stripLocale('/hi'), { locale: 'hi', path: '/' });
  });

  it('does not mistake a two-letter page path for a locale', () => {
    // The guard that matters: only known prefixes are stripped, so a page
    // whose path starts with the letters of a locale keeps its own identity.
    assert.deepEqual(stripLocale('/history-of-money/'), { locale: 'en', path: '/history-of-money/' });
    assert.deepEqual(stripLocale('/hilarious/'), { locale: 'en', path: '/hilarious/' });
  });

  it('tolerates a pathname with no leading slash', () => {
    assert.deepEqual(stripLocale('hi/about/'), { locale: 'hi', path: '/about/' });
  });
});

describe('swapping the locale of a pathname', () => {
  it('goes both ways and back', () => {
    const hi = swapLocale('/free/net-worth/', 'hi');
    assert.equal(hi, '/hi/free/net-worth/');
    assert.equal(swapLocale(hi, 'en'), '/free/net-worth/');
  });

  it('maps the two home pages onto each other', () => {
    assert.equal(swapLocale('/', 'hi'), '/hi/');
    assert.equal(swapLocale('/hi/', 'en'), '/');
  });

  it('is a no-op when the locale is already the one asked for', () => {
    assert.equal(swapLocale('/hi/about/', 'hi'), '/hi/about/');
    assert.equal(swapLocale('/about/', 'en'), '/about/');
  });

  it('is path arithmetic only, so it maps any path, page or not', () => {
    assert.equal(swapLocale('/rss.xml', 'hi'), '/hi/rss.xml');
    assert.equal(swapLocale('/hi/rss.xml', 'en'), '/rss.xml');
  });
});
