/**
 * Unit tests for src/i18n/format.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { format } from './format.ts';

describe('filling a catalog string', () => {
  it('replaces a named placeholder', () => {
    assert.equal(format('© {year} nidhi.', { year: 2026 }), '© 2026 nidhi.');
  });

  it('replaces the same name everywhere it appears', () => {
    assert.equal(format('{n} of {n}', { n: 3 }), '3 of 3');
  });

  it('leaves a placeholder with no value in place', () => {
    // Visible in the page, which is the point: an unnoticed "undefined" is
    // worse than an obvious "{count}".
    assert.equal(format('{count} lessons', {}), '{count} lessons');
  });

  it('accepts a value that is not a string', () => {
    assert.equal(format('level {level}', { level: 2 }), 'level 2');
  });

  it('leaves braces that are not placeholders alone', () => {
    assert.equal(format('{not a name} and {ok}', { ok: 'yes' }), `{not a name} and ${'yes'}`);
  });

  it('returns the template untouched when there is nothing to fill', () => {
    assert.equal(format('No placeholders here.', { year: 2026 }), 'No placeholders here.');
  });
});
