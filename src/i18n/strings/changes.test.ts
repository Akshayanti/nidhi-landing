/**
 * The "What's changed" lines hold to the rules the catalogs do.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LOCALES } from '../config.ts';
import { CHANGES } from './changes.ts';

const lines = (locale: (typeof LOCALES)[number]) => CHANGES.map((c, i) => ({ i, value: c.text[locale] }));

describe("what's changed", () => {
  it('dates every entry as a real YYYY-MM-DD day', () => {
    const bad = CHANGES.filter((c) => !/^\d{4}-\d{2}-\d{2}$/.test(c.date) || Number.isNaN(Date.parse(c.date)));
    assert.deepEqual(bad, []);
  });

  it('lists the newest first', () => {
    const outOfOrder = CHANGES.filter((c, i) => i > 0 && c.date > CHANGES[i - 1].date).map((c) => c.date);
    assert.deepEqual(outOfOrder, []);
  });

  it('says every line in every language, translated', () => {
    const missing = CHANGES.flatMap((c, i) => LOCALES.filter((l) => !c.text[l]?.trim()).map((l) => `${i}:${l}`));
    assert.deepEqual(missing, []);
    const copied = CHANGES.flatMap((c, i) => LOCALES.filter((l) => l !== 'en' && c.text[l] === c.text.en).map((l) => `${i}:${l}`));
    assert.deepEqual(copied, []);
  });

  it('uses no em dash and no double dash', () => {
    const dashed = CHANGES.flatMap((c, i) => LOCALES.filter((l) => /—|&mdash;|--/.test(c.text[l])).map((l) => `${i}:${l}`));
    assert.deepEqual(dashed, []);
  });

  it('keeps Czech one-letter words on the line of the word after them', () => {
    // docs/i18n/cs-glossary.md rule 14, as catalog.test.ts checks it.
    assert.deepEqual(lines('cs').filter(({ value }) => /(^|[^\p{L}])[vkszouai] (?=\S)/iu.test(value)).map((l) => l.i), []);
  });

  it('quotes Czech with „…“, Spanish with «…» and Marathi with typographic marks', () => {
    for (const l of ['cs', 'es', 'mr'] as const) {
      assert.deepEqual(lines(l).filter(({ value }) => /"/.test(value)).map((x) => x.i), [], l);
    }
  });

  it('keeps a Marathi case word on the line of the Latin word before it', () => {
    // docs/i18n/mr-glossary.md rule 15, the same list catalog.test.ts uses.
    const words = ['चा', 'ची', 'चे', 'च्या', 'ला', 'ना', 'ने', 'मध्ये', 'मधील', 'मधून', 'पासून', 'पर्यंत', 'कडून', 'कडे', 'वर', 'वरील', 'वरून', 'साठी', 'विषयी', 'बद्दल', 'प्रमाणे', 'शी', 'तून', 'नंतर', 'पेक्षा', 'पैकी', 'सारखे', 'आधीच्या', 'आधी', 'उलटल्यावर', 'इतकी', 'इतका', 'इतके'];
    const breakable = new RegExp(`(?:(?<=[A-Za-z0-9}%)\\]])|^) (?=(?:${words.join('|')})(?=[\\s.,:;!?)“”‘’]|$))`, 'u');
    assert.deepEqual(lines('mr').filter(({ value }) => breakable.test(value)).map((l) => l.i), []);
  });
});
