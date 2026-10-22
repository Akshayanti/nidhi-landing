/**
 * The "What's changed" lines hold to the rules the catalogs do.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LOCALES } from '../config.ts';
import { CHANGES, CHANGE_DAYS } from './changes.ts';

const lines = (locale: (typeof LOCALES)[number]) => CHANGES.map((c, i) => ({ i, value: c.text[locale] }));

describe("what's changed", () => {
  it('dates every day as a real YYYY-MM-DD day', () => {
    // Round-tripped through Date, so a day that does not exist (2026-02-30) fails.
    const real = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso)) && new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
    const bad = CHANGE_DAYS.filter((d) => !real(d.date));
    assert.deepEqual(bad, []);
  });

  it('has one day per date, newest first, and no empty day', () => {
    // Strictly newer to older also rules out a second day with the same date.
    const outOfOrder = CHANGE_DAYS.filter((d, i) => i > 0 && d.date >= CHANGE_DAYS[i - 1].date).map((d) => d.date);
    assert.deepEqual(outOfOrder, []);
    assert.deepEqual(CHANGE_DAYS.filter((d) => d.items.length === 0).map((d) => d.date), []);
  });

  it('names every item once, with a short permanent id, and never reuses a merged one', () => {
    // An id is the item's anchor and its address in the feeds; an alias is
    // the id of an item merged into it, still an anchor on the page. All of
    // them must be present, unique together and safe in a URL fragment.
    const names = CHANGES.flatMap((c) => [c.id, ...(c.aliases ?? [])]);
    assert.deepEqual(names.filter((n) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n ?? '')), []);
    const seen = new Set<string>();
    assert.deepEqual(names.filter((n) => (seen.has(n) ? true : (seen.add(n), false))), []);
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
