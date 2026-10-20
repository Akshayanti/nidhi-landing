/**
 * Unit tests for src/i18n/plural.ts, and a guard that every counted string on
 * the site goes through it.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { plural, pluralForm } from './plural.ts';

describe('choosing a counted string', () => {
  it('gives Czech its three forms for whole numbers', () => {
    const forms = (n: number) => plural('cs', n, 'lekce (1)', 'lekce (2 až 4)', 'lekcí');
    assert.equal(forms(0), 'lekcí');
    assert.equal(forms(1), 'lekce (1)');
    assert.equal(forms(2), 'lekce (2 až 4)');
    assert.equal(forms(4), 'lekce (2 až 4)');
    assert.equal(forms(5), 'lekcí');
    assert.equal(forms(11), 'lekcí');
    assert.equal(forms(21), 'lekcí');
    assert.equal(forms(22), 'lekcí', 'Czech 22 is not few, unlike Polish or Russian');
  });

  it('gives a decimal the other form, since no counted string carries one', () => {
    assert.equal(pluralForm('cs', 1.5), 'other');
    assert.equal(pluralForm('cs', 2.5), 'other');
    assert.equal(pluralForm('cs', 0), 'other');
  });

  it('keeps English and Spanish on one and other, with 0 plural', () => {
    for (const tag of ['en', 'en-IN', 'es']) {
      assert.equal(pluralForm(tag, 1), 'one', tag);
      for (const n of [0, 2, 3, 4, 5, 21]) assert.equal(pluralForm(tag, n), 'other', `${tag} ${n}`);
    }
  });

  it('gives Hindi 0 and 1 the one form, as its plural rule does', () => {
    assert.equal(plural('hi', 0, 'पाठ (1)', 'पाठ (few)', 'पाठ (other)'), 'पाठ (1)');
    assert.equal(pluralForm('hi', 1), 'one');
    for (const n of [2, 3, 5, 21]) assert.equal(pluralForm('hi', n), 'other', `hi ${n}`);
  });
});

/**
 * A count compared with 1 to choose between two strings is the bug this helper
 * exists to prevent: it gives a Czech reader "3 lekcí". The choices listed here
 * pick between forms whose Czech needs no third one, each for a reason.
 */
const DIRECT_ONE_OK = new Set<string>([
  // Loan payoff time is abbreviated in Czech ("3 r. 2 měs."), and an
  // abbreviation does not change with the count.
  's.one',
  // Monte Carlo's "after 1 year" headings: "po 1 roce" and "po {years}
  // letech" need no third form, since after "po" the 2-to-4 and 5-plus forms
  // are the same word.
  'strings.quick.medianOne',
  'strings.results.headingOne',
]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('every counted string picks its form with plural()', () => {
  it('compares no count with 1 to choose a string', () => {
    const offenders = ['src/components', 'src/layouts', 'src/pages']
      .flatMap(walk)
      .filter((path) => /\.(tsx|astro)$/.test(path))
      .flatMap((path) =>
        [...readFileSync(path, 'utf8').matchAll(/===\s*1\s*\?\s*([\w.]+)/g)]
          .map((m) => m[1])
          .filter((key) => /(One|\.one)$/.test(key) && !DIRECT_ONE_OK.has(key))
          .map((key) => `${path}: ${key}`),
      );
    assert.deepEqual(offenders, [], 'use plural(tag, n, one, few, many) from src/i18n/plural.ts');
  });
});
