/**
 * Unit tests for src/i18n/routes.ts.
 *
 * The interesting property is not that `localizedStaticPaths` returns the
 * non-default locales today, but that it can never return the default one:
 * that is what keeps English off the mirror and stops a duplicated English
 * page ending up at a prefixed URL.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_LOCALE, LOCALES } from './config.ts';
import { MIRRORED_LOCALES, localizedStaticPaths, routeLocale } from './routes.ts';

describe('the localized route mirror', () => {
  it('mirrors every locale except the default one', () => {
    const expected = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
    assert.deepEqual([...MIRRORED_LOCALES], expected);
    assert.deepEqual(
      localizedStaticPaths().map((entry) => entry.params.locale),
      expected,
    );
  });

  it('never generates the default locale, whatever the registry holds', () => {
    assert.ok(!MIRRORED_LOCALES.includes(DEFAULT_LOCALE));
    assert.ok(!localizedStaticPaths().some((entry) => entry.params.locale === DEFAULT_LOCALE));
  });

  it('gives each locale exactly one path entry', () => {
    const entries = localizedStaticPaths();
    assert.equal(new Set(entries.map((entry) => entry.params.locale)).size, entries.length);
  });
});

describe('reading the locale off a mirrored route', () => {
  it('returns a mirrored locale', () => {
    for (const locale of MIRRORED_LOCALES) {
      assert.equal(routeLocale({ locale }), locale);
    }
  });

  it('refuses the default locale, so English cannot be served twice', () => {
    assert.throws(() => routeLocale({ locale: DEFAULT_LOCALE }), /\[locale\] route/);
  });

  it('refuses a missing or unknown locale', () => {
    for (const value of [undefined, '', 'de', 'hi-IN', 'HI', '../hi', 'hi/']) {
      assert.throws(() => routeLocale({ locale: value }), /\[locale\] route/, `${value} was accepted`);
    }
  });

  it('refuses an empty params object', () => {
    assert.throws(() => routeLocale({}), /\[locale\] route/);
  });
});
