/**
 * Unit tests for src/i18n/url.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { localizedHref, stripLocale, swapLocale, utmSearch } from './url.ts';

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

  it('keeps a file URL a file URL', () => {
    assert.equal(swapLocale('/rss.xml', 'hi'), '/hi/rss.xml');
    assert.equal(swapLocale('/hi/rss.xml', 'en'), '/rss.xml');
  });
});

describe('campaign parameters', () => {
  it('keeps every utm_ parameter and drops the rest', () => {
    assert.equal(
      utmSearch('?utm_source=whatsapp&internal=1&utm_medium=social'),
      '?utm_source=whatsapp&utm_medium=social',
    );
  });

  it('drops a search term, which is not ours to carry', () => {
    assert.equal(utmSearch('?q=net+worth'), '');
  });

  it('returns an empty string when there is nothing to keep', () => {
    assert.equal(utmSearch(''), '');
    assert.equal(utmSearch('?'), '');
  });

  it('accepts a search string with or without its leading question mark', () => {
    assert.equal(utmSearch('utm_source=wa'), '?utm_source=wa');
  });
});

describe('the href a language switcher points at', () => {
  it('keeps campaign parameters and the fragment', () => {
    assert.equal(
      localizedHref('hi', '/free/net-worth/', '?utm_source=share', '#m=EUR&a1=12000'),
      '/hi/free/net-worth/?utm_source=share#m=EUR&a1=12000',
    );
  });

  it('works with a fragment given without its hash', () => {
    assert.equal(localizedHref('en', '/hi/blog/tag/saving/', '', 'saving'), '/blog/tag/saving/#saving');
  });

  it('drops a stray parameter but still carries the tool state', () => {
    assert.equal(
      localizedHref('en', '/hi/free/loan-comparison/', '?q=leaked', '#c=EUR&n=2'),
      '/free/loan-comparison/#c=EUR&n=2',
    );
  });

  it('leaves a page with no search and no fragment plain', () => {
    assert.equal(localizedHref('hi', '/about/'), '/hi/about/');
  });
});

describe('the fragment stays out of the query', () => {
  it('never turns a fragment into a parameter', () => {
    // A share link's state must stay after the '#', the one part of an
    // address a browser never sends to a server.
    const href = localizedHref('hi', '/free/monte-carlo-simulator/', '', '#c=INR&k=5000');
    assert.equal(href.includes('?'), false);
    assert.equal(href.endsWith('#c=INR&k=5000'), true);
  });
});
