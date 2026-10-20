/**
 * Unit tests for src/i18n/config.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DATE_LOCALE,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  blogTagPath,
  isLocale,
  lessonPath,
  localePrefix,
  localizedPath,
  PROSE_NUMBER_LOCALE,
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

  it('gives the Marathi catalog its Devanagari name, mr_IN, and dates with Latin digits', () => {
    assert.equal(LOCALE_META.mr.label, 'मराठी');
    assert.equal(LOCALE_META.mr.htmlLang, 'mr');
    assert.equal(LOCALE_META.mr.ogLocale, 'mr_IN');
    // Plain 'mr' writes Devanagari digits; the edition writes Latin ones.
    const date = new Intl.DateTimeFormat(DATE_LOCALE.mr, { dateStyle: 'long' }).format(new Date('2026-10-20T12:00:00Z'));
    assert.match(date, /ऑक्टोबर/);
    assert.match(date, /20/);
    assert.doesNotMatch(date, /[०-९]/);
    // Prose numbers group in lakhs and crores, as on the Hindi edition.
    assert.equal(new Intl.NumberFormat(PROSE_NUMBER_LOCALE.mr).format(1234567), '12,34,567');
  });

  it('recognises locales and rejects everything else', () => {
    assert.equal(isLocale('hi'), true);
    assert.equal(isLocale('en'), true);
    assert.equal(isLocale('es'), true);
    assert.equal(isLocale('cs'), true);
    assert.equal(isLocale('mr'), true);
    assert.equal(isLocale('de'), false);
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
    // A lesson has one address, whatever language the page linking to it is
    // in: lessons are English and are not translated. Everything else on the
    // path is chrome and takes a locale.
    assert.equal(lessonPath('what-is-net-worth'), '/blog/what-is-net-worth/');
    assert.equal(blogTagPath('en', 'saving'), '/blog/tag/saving/');
    assert.equal(blogTagPath('hi', 'saving'), '/hi/blog/tag/saving/');
  });
});

describe('short links for social profiles', () => {
  // Each edition has /ig, /tg, /wa and /dsc, leading to its own home page with
  // the campaign parameters the English short links carry (astro.config.mjs).
  const config = readFileSync(new URL('../../astro.config.mjs', import.meta.url), 'utf8');
  const sources = { ig: 'instagram', tg: 'telegram', wa: 'whatsapp', dsc: 'discord' };

  it('gives every edition its four short links', () => {
    for (const locale of LOCALES) {
      const prefix = localePrefix(locale);
      for (const [path, source] of Object.entries(sources)) {
        const line = `'${prefix}/${path}/': '${prefix}/?utm_source=${source}&utm_medium=social&utm_campaign=bio&utm_content=home_link'`;
        assert.ok(config.includes(line), `missing ${prefix}/${path}/`);
      }
    }
  });
});
