/**
 * What a screen reader hears about a refinance scenario (`announcedRefinance`
 * in LoanCompare.tsx) and how it says a count of months (`spokenMonths`),
 * tested without a browser: the saving or the extra cost, the time to break
 * even in whole words, the early repayment penalty, and the silence while
 * there is no comparison.
 *
 * The scenarios are small enough to work out by hand (test/loanParts.refinance.ts
 * and the comment on each test), and the sentences are written out in full:
 * they are what is spoken.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { dict } from '../i18n/index.ts';
import { formatMoney } from '../utils/loan/math.ts';
import { dear, long, plain, refinanced, withPenalty } from '../../test/loanParts.refinance.ts';
import { announcedRefinance, spokenMonths } from './LoanCompare.tsx';

const s = dict('en').tools.loanComparison.island;
const g = globalThis as unknown as { document?: unknown };

/** The page's language, as the browser gives it: the only thing `spokenMonths` reads from the page. */
function pageIn(lang: string) {
  g.document = { documentElement: { lang } };
}

afterEach(() => { delete g.document; });

/** The sentence for a comparison, in euros. */
const said = (cmp: Parameters<typeof announcedRefinance>[0], currency = 'EUR') =>
  announcedRefinance(cmp, currency, s, formatMoney);

describe('a count of months in words', () => {
  it('says months alone under a year, with the singular for one', () => {
    pageIn('en');
    assert.equal(spokenMonths(1), '1 month');
    assert.equal(spokenMonths(2), '2 months');
    assert.equal(spokenMonths(11), '11 months');
  });

  it('says whole years without months', () => {
    pageIn('en');
    assert.equal(spokenMonths(12), '1 year');
    assert.equal(spokenMonths(24), '2 years');
  });

  it('says years and the months left over', () => {
    pageIn('en');
    // 54 months is 4 x 12 and 6 over.
    assert.equal(spokenMonths(54), '4 years, 6 months');
    assert.equal(spokenMonths(13), '1 year, 1 month');
    assert.equal(spokenMonths(23), '1 year, 11 months');
  });

  it('says no months as months, not as nothing', () => {
    pageIn('en');
    assert.equal(spokenMonths(0), '0 months');
  });

  it('speaks the language of the page', () => {
    pageIn('es');
    assert.equal(spokenMonths(54), '4 años y 6 meses');
    assert.equal(spokenMonths(1), '1 mes');
  });

  it('keeps Western digits where the language has its own', () => {
    pageIn('mr');
    assert.equal(spokenMonths(54), '4 वर्षे, 6 महिने');
    assert.equal(spokenMonths(12), '1 वर्ष');
  });

  it('speaks English on a page that names no language', () => {
    pageIn('');
    assert.equal(spokenMonths(54), '4 years, 6 months');
  });
});

describe('what is announced while there is no comparison', () => {
  it('says nothing before the boxes are filled in', () => {
    assert.equal(said(null), '');
  });

  it('says nothing for a scenario the engine refuses: its error is an alert of its own', () => {
    // Month 12 of a 12-month loan: nothing is left to refinance.
    const refused = refinanced(plain(), 12, 0, 12);
    assert.deepEqual(refused, { error: 'Refinance month must be before the original loan ends.' });
    assert.equal(said(refused), '');
  });
});

describe('what is announced for a refinance', () => {
  it('says the extra cost and the months until the lower payments have covered it', () => {
    pageIn('en');
    // 600.00 is left at month 6; over 12 months at 0% that is 50.00 a month
    // where 100.00 was due, so closing costs of 100.00 are covered in 2 months
    // and are the whole extra cost.
    assert.equal(
      said(refinanced(plain(), 6, 0, 12, 10_000)),
      'Refinancing costs €100.00 more in total. Time to break even: 2 months.',
    );
  });

  it('says the saving, and a saving of nothing as a saving', () => {
    pageIn('en');
    // `dear` at month 1: 803.97 left, over 3 months at 0% is 267.99 a month.
    // Keeping costs 1,224.08; refinancing 408.03 + 803.97 + the closing costs,
    // so 5.00 of costs leaves a saving of 7.08 and 12.08 leaves none. The
    // first month saves 408.03 - 267.99 = 140.04, more than either.
    assert.equal(
      said(refinanced(dear(), 1, 0, 3, 500)),
      'Refinancing saves €7.08 in total. Time to break even: 1 month.',
    );
    assert.equal(
      said(refinanced(dear(), 1, 0, 3, 1_208)),
      'Refinancing saves €0.00 in total. Time to break even: 1 month.',
    );
  });

  it('says the amounts in the currency chosen', () => {
    pageIn('en');
    assert.equal(
      said(refinanced(plain(), 6, 0, 12, 10_000), 'USD'),
      'Refinancing costs $100.00 USD more in total. Time to break even: 2 months.',
    );
  });

  it('says the break-even in years and months when it is that long', () => {
    pageIn('en');
    // 12,000.00 over 120 months is 100.00 a month. At month 60, 6,000.00 is
    // left; over 80 months that is 75.00, saving 25.00 a month, and closing
    // costs of 350.00 are covered in 14 months.
    assert.equal(
      said(refinanced(long(), 60, 0, 80, 35_000)),
      'Refinancing costs €350.00 more in total. Time to break even: 1 year, 2 months.',
    );
  });

  it('says the break-even as the row on screen writes it where there is no page to ask for the language', () => {
    assert.equal(
      said(refinanced(plain(), 6, 0, 12, 10_000)),
      'Refinancing costs €100.00 more in total. Time to break even: 2 mo.',
    );
  });

  it('says there is nothing to recoup when nothing is paid to refinance', () => {
    pageIn('en');
    // 600.00 over 12 months is 50.00 a month, lower than 100.00 from the start.
    assert.equal(
      said(refinanced(plain(), 6, 0, 12)),
      'Refinancing saves €0.00 in total. Time to break even: From the first month.',
    );
    // Over 6 months it is 100.00 a month, as before.
    assert.equal(
      said(refinanced(plain(), 6, 0, 6)),
      'Refinancing saves €0.00 in total. Time to break even: No costs to recoup.',
    );
  });

  it('says never when the lower payments cannot cover the costs', () => {
    pageIn('en');
    // `dear` at month 1 saves 140.04 and 140.03 in the two months it had
    // left: 280.07, short of closing costs of 300.00. The new loan's third
    // payment then takes 267.99 back. 12.08 saved in all, 287.92 short.
    assert.equal(
      said(refinanced(dear(), 1, 0, 3, 30_000)),
      'Refinancing costs €287.92 more in total. Time to break even: never.',
    );
  });

  it('says never when closing costs put into the new loan are never outweighed', () => {
    pageIn('en');
    // 60.00 of costs added to the 600.00 left, both loans at 0%: the new loan
    // is 60.00 behind from first month to last.
    assert.equal(
      said(refinanced(plain(), 6, 0, 12, 6_000, true)),
      'Refinancing costs €60.00 more in total. Time to break even: never.',
    );
  });

  it('adds the early repayment penalty when one is charged', () => {
    pageIn('en');
    // 2% of the 600.00 left is 12.00, paid back by the first month's 50.00.
    assert.equal(
      said(refinanced(withPenalty(12), 6, 0, 12)),
      'Refinancing costs €12.00 more in total. Time to break even: 1 month. The early repayment penalty of €12.00 is included.',
    );
  });

  it('leaves the penalty out once its last month has passed', () => {
    pageIn('en');
    assert.equal(
      said(refinanced(withPenalty(5), 6, 0, 12)),
      'Refinancing saves €0.00 in total. Time to break even: From the first month.',
    );
  });
});
