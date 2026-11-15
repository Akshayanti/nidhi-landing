import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../../data/inflation/worldbank.json' with { type: 'json' };
import { LOCALES, LOCALE_META } from '../../i18n/config.ts';
import { countryNamer, tidyCountryName } from './countryNames.ts';

test('a qualifier after a spaced dash goes in brackets', () => {
  assert.equal(tidyCountryName('Kongo – Kinshasa'), 'Kongo (Kinshasa)');
  assert.equal(tidyCountryName('Hongkong – ZAO Číny'), 'Hongkong (ZAO Číny)');
  assert.equal(tidyCountryName('कांगो — ब्राज़ाविल'), 'कांगो (ब्राज़ाविल)');
  assert.equal(tidyCountryName('Congo - Brazzaville'), 'Congo (Brazzaville)');
});

test('names without a spaced dash are left alone', () => {
  for (const name of ['Guinea-Bissau', 'Timor-Leste', 'Côte d’Ivoire', 'India', 'Česko', 'भारत']) {
    assert.equal(tidyCountryName(name), name);
  }
});

test('no country in the tools is named with a dash used as a dash, in any language', () => {
  const codes = Object.values((data as { countries: Record<string, { iso2: string }> }).countries).map((c) => c.iso2);
  assert.ok(codes.length > 100);
  for (const locale of LOCALES) {
    const nameOf = countryNamer(LOCALE_META[locale].htmlLang);
    let named = 0;
    for (const iso2 of codes) {
      const name = nameOf(iso2);
      if (!name) continue;
      named += 1;
      assert.doesNotMatch(name, /[‒-―]|\s-\s|--/, `${locale} ${iso2}: ${name}`);
    }
    assert.ok(named > 100, `${locale}: only ${named} countries named`);
  }
});
