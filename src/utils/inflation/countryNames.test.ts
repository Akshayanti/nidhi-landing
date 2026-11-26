import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../../data/inflation/worldbank.json' with { type: 'json' };
import { LOCALES, LOCALE_META } from '../../i18n/config.ts';
import { countryNamer, tidyCountryName } from './countryNames.ts';

test('a qualifier after a spaced dash goes in brackets', () => {
  assert.equal(tidyCountryName('Kongo – Kinshasa'), 'Kongo (Kinshasa)');
  assert.equal(tidyCountryName('Hongkong – ZAO Číny'), 'Hongkong (ZAO Číny)');
  assert.equal(tidyCountryName('कांगो \u2014 ब्राज़ाविल'), 'कांगो (ब्राज़ाविल)');
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

test('however much space surrounds the dash, the name is left with one space before the bracket', () => {
  assert.equal(tidyCountryName('Kongo  –  Kinshasa'), 'Kongo (Kinshasa)');
  assert.equal(tidyCountryName('Kongo\u00a0 –\u00a0 Kinshasa'), 'Kongo (Kinshasa)');
  assert.equal(tidyCountryName('Kongo \u2012 Kinshasa'), 'Kongo (Kinshasa)');
  assert.equal(tidyCountryName('Kongo \u2015 Kinshasa'), 'Kongo (Kinshasa)');
});

test('only the first spaced dash opens the bracket', () => {
  assert.equal(tidyCountryName('A – B – C'), 'A (B – C)');
});

test('a country is named in the language asked for', () => {
  assert.equal(countryNamer('es')('DE'), 'Alemania');
  assert.equal(countryNamer('cs')('DE'), 'Německo');
  assert.equal(countryNamer('hi')('IN'), 'भारत');
  assert.equal(countryNamer('cs')('CD'), 'Kongo (Kinshasa)');
});

test('a code the language has no name for is not passed off as a name', () => {
  assert.equal(countryNamer('en')('XX'), undefined);
  assert.equal(countryNamer('cs')('QQ'), undefined);
});
