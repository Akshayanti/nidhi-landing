/**
 * Unit tests for src/i18n/config.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  blogPath,
  blogPostPath,
  blogTagPath,
  isLocale,
  localePrefix,
  localizedPath,
} from './config.ts';

describe('locale registry', () => {
  it('keeps the default locale in the list, so every locale is enumerable', () => {
    assert.ok((LOCALES as readonly string[]).includes(DEFAULT_LOCALE));
  });

  it('has metadata for every locale', () => {
    for (const locale of LOCALES) {
      const meta = LOCALE_META[locale];
      assert.ok(meta.label.length > 0, `${locale} has no label`);
      assert.ok(meta.htmlLang.length > 0, `${locale} has no htmlLang`);
      assert.match(meta.ogLocale, /^[a-z]{2}_[A-Z]{2}$/, `${locale} ogLocale looks wrong`);
    }
  });

  it('gives the Hindi catalog its Devanagari name and hi_IN, not en_US', () => {
    assert.equal(LOCALE_META.hi.htmlLang, 'hi');
    assert.equal(LOCALE_META.hi.ogLocale, 'hi_IN');
    assert.notEqual(LOCALE_META.hi.ogLocale, LOCALE_META.en.ogLocale);
  });

  it('recognises locales and rejects everything else', () => {
    assert.equal(isLocale('hi'), true);
    assert.equal(isLocale('en'), true);
    assert.equal(isLocale('es'), false);
    assert.equal(isLocale(''), false);
    assert.equal(isLocale(undefined), false);
    // A locale has to be an exact match: no fallback guessing.
    assert.equal(isLocale('hi-IN'), false);
  });
});

describe('locale prefixes', () => {
  it('leaves the default locale unprefixed', () => {
    assert.equal(localePrefix('en'), '');
    assert.equal(localizedPath('en', '/about/'), '/about/');
    assert.equal(localizedPath('en', '/'), '/');
  });

  it('prefixes every other locale', () => {
    assert.equal(localePrefix('hi'), '/hi');
    assert.equal(localizedPath('hi', '/about/'), '/hi/about/');
    assert.equal(localizedPath('hi', '/'), '/hi/');
  });

  it('tolerates a path given without its leading slash', () => {
    assert.equal(localizedPath('hi', 'about'), '/hi/about');
  });

  it('does not add a trailing slash of its own', () => {
    // trailingSlash: 'always' makes it the caller's job, so that a file URL
    // like /rss.xml does not come out as /rss.xml/.
    assert.equal(localizedPath('hi', '/rss.xml'), '/hi/rss.xml');
  });

  it('builds the learning-path URLs', () => {
    assert.equal(blogPath('en'), '/blog/');
    assert.equal(blogPath('hi'), '/hi/blog/');
    assert.equal(blogPostPath('hi', 'what-is-net-worth'), '/hi/blog/what-is-net-worth/');
    assert.equal(blogTagPath('en', 'saving'), '/blog/tag/saving/');
    assert.equal(blogTagPath('hi', 'saving'), '/hi/blog/tag/saving/');
  });
});
