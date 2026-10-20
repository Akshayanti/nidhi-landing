/**
 * Unit tests for src/utils/shared/langRuns.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { langRuns } from './langRuns.ts';

describe('langRuns', () => {
  it('marks a bracketed English run in Marathi, with its trailing punctuation', () => {
    assert.deepEqual(langRuns('महागाई कॅल्क्युलेटर (Inflation\u00A0Calculator): काळानुसार', 'mr'), [
      { text: 'महागाई कॅल्क्युलेटर ' },
      { text: '(Inflation\u00A0Calculator):', lang: 'en' },
      { text: ' काळानुसार' },
    ]);
  });

  it('marks several runs and a run at either end', () => {
    assert.deepEqual(langRuns('(FIRE) और (ARM)', 'hi'), [
      { text: '(FIRE)', lang: 'en' },
      { text: ' और ' },
      { text: '(ARM)', lang: 'en' },
    ]);
  });

  it('leaves brackets holding non-Latin text, or nothing, alone', () => {
    for (const s of ['कर्ज (हप्ता) तपशील', 'खाली () कंस', 'अर्धा (Inflation']) {
      assert.deepEqual(langRuns(s, 'mr'), [{ text: s }]);
    }
  });

  it('returns Latin-script locales unchanged', () => {
    for (const locale of ['en', 'es', 'cs']) {
      assert.deepEqual(langRuns('Hybrid (ARM) loans', locale), [{ text: 'Hybrid (ARM) loans' }]);
    }
  });
});
