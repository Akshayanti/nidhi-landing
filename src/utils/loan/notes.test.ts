/**
 * The engine's notes on a result, in the reader's language (notes.ts): what
 * the card shows under a result.
 *
 * The sentences read are the ones the real engine writes for loans small
 * enough to work by hand; the words shown are the real catalog's.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  loanComparisonCs,
  loanComparisonEn,
  loanComparisonEs,
  loanComparisonHi,
  loanComparisonMr,
} from '../../i18n/strings/tools/loanComparison.ts';
import { RATE_NEVER_CHANGES } from './math.ts';
import { engineNote } from './notes.ts';

const en = loanComparisonEn.island.engine.warnings;
const ALL = {
  en,
  hi: loanComparisonHi.island.engine.warnings,
  es: loanComparisonEs.island.engine.warnings,
  cs: loanComparisonCs.island.engine.warnings,
  mr: loanComparisonMr.island.engine.warnings,
};

describe('a note the engine writes is shown in the reader\'s language', () => {
  it('a rate that never changes within the term (issue 914)', () => {
    assert.equal(engineNote(RATE_NEVER_CHANGES, en), 'The rate does not change within this term, so the subsequent rate is not used.');
    assert.equal(engineNote(RATE_NEVER_CHANGES.toUpperCase(), en), en.rateNeverChanges);
    for (const [lang, notes] of Object.entries(ALL)) {
      assert.equal(engineNote(RATE_NEVER_CHANGES, notes), notes.rateNeverChanges, lang);
      if (lang !== 'en') assert.notEqual(notes.rateNeverChanges, RATE_NEVER_CHANGES, lang);
    }
  });

  it('the two it already wrote: the sums of the precision check, and a later rate that swallows the payment', () => {
    assert.equal(
      engineNote('Internal precision check: principal sum 119999 ≠ 120000. Please report this.', en),
      'Internal precision check: principal sum 119999 ≠ 120000.. Please report this.',
    );
    assert.equal(engineNote('PRECISION CHECK failed', en), 'Internal precision check: principal sum  ≠ . Please report this.');
    assert.equal(
      engineNote('After the initial fixed period, the subsequent rate is so high that the recast payment barely covers interest.', ALL.es),
      ALL.es.subsequentRate,
    );
    assert.equal(engineNote('THE RECAST PAYMENT BARELY COVERS', ALL.es), ALL.es.subsequentRate);
  });

  it('a sentence it does not know comes through as written', () => {
    assert.equal(engineNote('Something else to know.', ALL.es), 'Something else to know.');
    assert.equal(engineNote('', ALL.es), '');
  });
});
