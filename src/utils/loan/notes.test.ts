/**
 * The engine's notes on a result, in the reader's language (notes.ts): what
 * the card shows under a result, and what the spreadsheet and the printed
 * report carry beside it.
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
import { RATE_NEVER_CHANGES, computeLoan, lumpPartUsedNote, lumpsUnusedNote, type LoanInputs } from './math.ts';
import { engineNote, resultNotes } from './notes.ts';

const en = loanComparisonEn.island.engine.warnings;
const ALL = {
  en,
  hi: loanComparisonHi.island.engine.warnings,
  es: loanComparisonEs.island.engine.warnings,
  cs: loanComparisonCs.island.engine.warnings,
  mr: loanComparisonMr.island.engine.warnings,
};

/** 1,200.00 at 0% over 12 months: 100.00 a month. */
const flat = (more: Partial<LoanInputs> = {}) => computeLoan({ principalMinor: 120_000, annualRate: 0, ...more }, { kind: 'term', months: 12 });

describe('a note the engine writes is shown in the reader\'s language', () => {
  it('a rate that never changes within the term (issue 914)', () => {
    assert.equal(engineNote(RATE_NEVER_CHANGES, en), 'The rate does not change within this term, so the subsequent rate is not used.');
    assert.equal(engineNote(RATE_NEVER_CHANGES.toUpperCase(), en), en.rateNeverChanges);
    for (const [lang, notes] of Object.entries(ALL)) {
      assert.equal(engineNote(RATE_NEVER_CHANGES, notes), notes.rateNeverChanges, lang);
      if (lang !== 'en') assert.notEqual(notes.rateNeverChanges, RATE_NEVER_CHANGES, lang);
    }
  });

  it('one lump sum after the payoff, with its month and the payoff month put back (issue 915)', () => {
    const raw = lumpsUnusedNote({ fromMonth: 130, count: 1 }, 120);
    assert.equal(engineNote(raw, en), 'This loan is paid off in month 120, before the lump sum in month 130 would be paid, so it is not used.');
    for (const [lang, notes] of Object.entries(ALL)) {
      const shown = engineNote(raw, notes);
      assert.equal(shown, notes.lumpUnused.replace('{month}', '130').replace('{payoffMonth}', '120'), lang);
      assert.ok(shown.includes('130') && shown.includes('120') && !shown.includes('{'), `${lang}: ${shown}`);
      assert.ok(shown.indexOf('120') < shown.indexOf('130'), `${lang}: the payoff month is read first`);
    }
  });

  it('a lump sum larger than what is owed, with its month put back and no amount (issue 925)', () => {
    const raw = lumpPartUsedNote(118);
    assert.equal(engineNote(raw, en), 'The lump sum in month 118 is more than is owed then, so only part of it is used.');
    for (const [lang, notes] of Object.entries(ALL)) {
      const shown = engineNote(raw, notes);
      assert.equal(shown, notes.lumpPartUsed.replace('{month}', '118'), lang);
      assert.ok(shown.includes('118') && !shown.includes('{'), `${lang}: ${shown}`);
      assert.deepEqual(shown.match(/\d+/g), ['118'], `${lang}: the month is the one number in it`);
      if (lang !== 'en') assert.notEqual(shown, raw, lang);
      assert.notEqual(notes.lumpPartUsed, notes.lumpUnused, lang);
    }
    // One that only looks like it comes through as written.
    assert.equal(engineNote('The lump sum in month x is more than is owed then.', ALL.es), 'The lump sum in month x is more than is owed then.');
    assert.equal(engineNote('The lump sum in month 12 is more than you planned.', ALL.es), 'The lump sum in month 12 is more than you planned.');
  });

  it('several lump sums after the payoff, named by the first of them', () => {
    const raw = lumpsUnusedNote({ fromMonth: 15, count: 2 }, 12);
    assert.equal(engineNote(raw, en), 'This loan is paid off in month 12, before the lump sums from month 15 on would be paid, so they are not used.');
    for (const [lang, notes] of Object.entries(ALL)) {
      const shown = engineNote(raw, notes);
      assert.equal(shown, notes.lumpsUnused.replace('{month}', '15').replace('{payoffMonth}', '12'), lang);
      assert.notEqual(notes.lumpsUnused, notes.lumpUnused, lang);
      assert.ok(!shown.includes('{'), `${lang}: ${shown}`);
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

  it('a sentence it does not know comes through as written, and so does one that only looks like a lump-sum note', () => {
    assert.equal(engineNote('Something else to know.', ALL.es), 'Something else to know.');
    assert.equal(engineNote('', ALL.es), '');
    assert.equal(engineNote('The lump sum in month x comes after this loan is paid off in month 12.', ALL.es), 'The lump sum in month x comes after this loan is paid off in month 12.');
    assert.equal(engineNote('month 13 comes after this loan is paid off in month y', ALL.es), 'month 13 comes after this loan is paid off in month y');
  });
});

describe('the notes of a result, as the card lists them', () => {
  it('none for a loan with nothing to note', () => {
    assert.deepEqual(resultNotes(flat(), en), []);
  });

  it('each of a real loan\'s notes, in the engine\'s order', () => {
    const r = flat({
      rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 12, subsequentAnnualRate: 0.12 },
      lumpSums: [{ month: 13, amountMinor: 5000 }, { month: 20, amountMinor: 5000 }],
    });
    assert.deepEqual(resultNotes(r, en), [
      'The rate does not change within this term, so the subsequent rate is not used.',
      'This loan is paid off in month 12, before the lump sums from month 13 on would be paid, so they are not used.',
    ]);
    assert.deepEqual(resultNotes(r, ALL.cs), [ALL.cs.rateNeverChanges, ALL.cs.lumpsUnused.replace('{month}', '13').replace('{payoffMonth}', '12')]);
  });

  it('a lump sum used in part first, then the ones after it that are not used', () => {
    const r = flat({ lumpSums: [{ month: 20, amountMinor: 5000 }, { month: 11, amountMinor: 50000 }] });
    assert.deepEqual(resultNotes(r, en), [
      'The lump sum in month 11 is more than is owed then, so only part of it is used.',
      'This loan is paid off in month 11, before the lump sum in month 20 would be paid, so it is not used.',
    ]);
    assert.deepEqual(resultNotes(r, ALL.mr), [ALL.mr.lumpPartUsed.replace('{month}', '11'), ALL.mr.lumpUnused.replace('{month}', '20').replace('{payoffMonth}', '11')]);
  });

  it('none for an offer that was not worked out, whatever it still carries', () => {
    assert.deepEqual(resultNotes({ ...flat({ lumpSums: [{ month: 13, amountMinor: 5000 }] }), error: 'Enter a loan amount greater than zero.' }, en), []);
  });
});
