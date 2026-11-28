/**
 * What a screen reader hears when the loan comparison's results change
 * (`announcedResult` in LoanCompare.tsx), tested without a browser: one
 * offer's payment and total, the range of totals across several offers, and
 * what is said when an offer has no total because it is never paid off.
 *
 * The loans are small enough to work out by hand (test/loanParts.comparedOffers.ts),
 * and the sentences are written out in full: they are what is spoken.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';
import { formatMoney } from '../utils/loan/math.ts';
import { dear, large, neverLess, plain } from '../../test/loanParts.comparedOffers.ts';
import { announcedResult } from './LoanCompare.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn },
};

const s = TOOL_STRINGS.en.loanComparison.island;

/** The sentence for these paid-off offers out of `validCount` valid ones, in euros. */
const said = (paidOff: ReturnType<typeof plain>[], validCount: number, currency = 'EUR') =>
  announcedResult(paidOff, validCount, currency, s, formatMoney);

describe('what is announced for one offer', () => {
  it('says its monthly payment and its total', () => {
    assert.equal(said([dear()], 1), 'Monthly payment €609.01. Total paid €1,218.03.');
    assert.equal(said([plain()], 1), 'Monthly payment €100.00. Total paid €1,200.00.');
  });

  it('says the amounts in the currency chosen', () => {
    assert.equal(said([dear()], 1, 'USD'), 'Monthly payment $609.01\u00a0USD. Total paid $1,218.03\u00a0USD.');
  });

  it('says the payment a reader makes each month, extra included', () => {
    // 100.00 scheduled and 200.00 extra: the loan is gone in four payments of 300.00.
    const withExtra = { ...plain(), effectiveMonthlyMinor: 30_000 };
    assert.equal(said([withExtra], 1), 'Monthly payment €300.00. Total paid €1,200.00.');
  });

  it('says nothing when the one offer is never paid off, so no total is invented', () => {
    assert.ok(Number.isNaN(neverLess().totalPaidMinor));
    assert.equal(said([], 1), '');
  });
});

describe('what is announced when no offer is valid', () => {
  it('says nothing, whatever results are left over', () => {
    assert.equal(said([], 0), '');
    assert.equal(said([plain(), dear()], 0), '');
  });
});

describe('what is announced for several offers', () => {
  it('says the lowest total, the highest, and the gap between them', () => {
    assert.equal(
      said([plain(), dear()], 2),
      'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.',
    );
  });

  it('finds the lowest and the highest wherever they stand among the offers', () => {
    // 12,180.30 less 1,200.00 is 10,980.30; the offer in between is not named.
    assert.equal(
      said([dear(), large(), plain()], 3),
      'Total cost ranges from €1,200.00 to €12,180.30 across the offers below: a spread of €10,980.30.',
    );
    assert.equal(
      said([large(), plain(), dear()], 3),
      'Total cost ranges from €1,200.00 to €12,180.30 across the offers below: a spread of €10,980.30.',
    );
  });

  it('says so when every offer costs the same in all', () => {
    assert.equal(said([plain(), plain()], 2), 'All offers come out at the same total cost of €1,200.00.');
    assert.equal(said([dear(), dear(), dear()], 3), 'All offers come out at the same total cost of €1,218.03.');
  });

  it('gives the range of the offers that are paid off when another never is', () => {
    assert.equal(
      said([dear(), plain()], 3),
      'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.',
    );
  });

  it('says there is no range when fewer than two of the offers are paid off', () => {
    const noRange = 'Fewer than two of these offers are paid off, so there is no range of totals to compare.';
    assert.equal(said([plain()], 2), noRange);
    assert.equal(said([], 2), noRange);
    assert.equal(said([dear()], 5), noRange);
  });

  it('says the range in the currency chosen', () => {
    assert.equal(
      said([plain(), dear()], 2, 'USD'),
      'Total cost ranges from $1,200.00\u00a0USD to $1,218.03\u00a0USD across the offers below: a spread of $18.03\u00a0USD.',
    );
  });
});
