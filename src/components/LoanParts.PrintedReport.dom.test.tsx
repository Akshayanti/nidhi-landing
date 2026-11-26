/**
 * What the loan comparison prints (`PrintedReport` in LoanCompare.tsx),
 * mounted on its own with what the page gives it: the offers as typed, their
 * results from the engine and the tool's words.
 *
 * What is pinned is the report's answer, which is the summary's sentence about
 * the range of totals (the lowest, the highest and the spread between them,
 * or why there is no range), the names the offers are printed under, and the
 * number style of the page. Every loan here is at 0%, so its total is the
 * amount borrowed and can be read off the test.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';
import { exportEn } from '../i18n/strings/tools/export.ts';
import { computeFromInput } from '../utils/loan/inputs.ts';
import type { LoanResult } from '../utils/loan/math.ts';
import { makeAddedVendor, type VendorInput } from '../utils/loan/url.ts';
import { PrintedReport } from './LoanCompare.tsx';
import { AmountLocaleContext } from './useMoney.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
};

const t = TOOL_STRINGS.en;
const s = t.loanComparison.island;

/** An offer at 0% over 12 months: its total is the amount borrowed. */
function loan(index: number, principal: string, patch: Partial<VendorInput> = {}): VendorInput {
  return { ...makeAddedVendor(index), principal, annualRatePct: '0', termMonths: '12', ...patch };
}

/**
 * Never paid off: 1,200.00 at 0% for one month is 100.00 a month; then 120% a
 * year on the 1,100.00 left is 110.00 of interest, more than the payment kept.
 */
const never = (index: number): VendorInput =>
  loan(index, '1200', { rateKind: 'hybrid', initialFixedMonths: '1', subsequentRatePct: '120', rateChangeKeeps: 'payment' });

/** An offer with no amount: it cannot be worked out. */
const broken = (index: number): VendorInput => loan(index, '');

interface Options {
  locale?: string | null;
  currency?: string;
  results?: LoanResult[];
}

function print(vendors: VendorInput[], options: Options = {}) {
  const currency = options.currency ?? 'EUR';
  const view = render(
    <AmountLocaleContext.Provider value={options.locale ?? null}>
      <PrintedReport
        strings={s}
        exportStrings={t.export}
        currency={currency}
        vendors={vendors}
        results={options.results ?? vendors.map((v) => computeFromInput(v, currency))}
      />
    </AmountLocaleContext.Provider>,
  );
  const article = view.container.querySelector('article') as HTMLElement;
  const text = (selector: string) => [...article.querySelectorAll(selector)].map((el) => (el.textContent ?? '').replace(/\s/g, ' '));
  return {
    article,
    /** The report's answer: every paragraph under "Your answer". */
    answer: text('.tool-reportLead'),
    answerParagraphs: article.querySelectorAll('.tool-reportBlock')[0].querySelectorAll('p').length,
    /** The column headings of "What you entered": one per offer, after the row heading. */
    names: text('.tool-reportTable--names thead th').slice(1),
    text,
  };
}

afterEach(cleanup);

describe('the printed loan report: its answer', () => {
  it('gives the lowest total, the highest and the spread, whatever order the offers are in', () => {
    // 1,200.00, 1,500.00 and 999.00: the lowest is last, and has the fewest digits.
    const page = print([loan(0, '1200'), loan(1, '1500'), loan(2, '999')]);
    assert.deepEqual(page.answer, ['Total cost ranges from €999.00 to €1,500.00 across the offers below: a spread of €501.00.']);
    assert.equal(page.answerParagraphs, 1);
  });

  it('gives a range for two offers', () => {
    assert.deepEqual(print([loan(0, '1200'), loan(1, '999')]).answer, [
      'Total cost ranges from €999.00 to €1,200.00 across the offers below: a spread of €201.00.',
    ]);
  });

  it('says so when every offer comes out at the same total', () => {
    assert.deepEqual(print([loan(0, '1200'), loan(1, '1200'), loan(2, '1200')]).answer, ['All offers come out at the same total cost of €1,200.00.']);
  });

  it('leaves an offer that is never paid off out of the range', () => {
    assert.deepEqual(print([loan(0, '1500'), never(1), loan(2, '999')]).answer, [
      'Total cost ranges from €999.00 to €1,500.00 across the offers below: a spread of €501.00.',
    ]);
  });

  it('says there is no range when fewer than two of the offers are paid off', () => {
    assert.deepEqual(print([loan(0, '1200'), never(1)]).answer, [s.delta.noRange]);
    assert.deepEqual(print([never(0), never(1)]).answer, [s.delta.noRange]);
    assert.equal(s.delta.noRange, 'Fewer than two of these offers are paid off, so there is no range of totals to compare.');
  });

  it('asks for two valid offers when fewer than two can be worked out', () => {
    assert.deepEqual(print([loan(0, '1200'), broken(1)]).answer, [s.delta.empty]);
    assert.deepEqual(print([broken(0), broken(1)]).answer, [s.delta.empty]);
    assert.deepEqual(print([never(0), broken(1)]).answer, [s.delta.empty]);
    assert.equal(s.delta.empty, 'Enter valid inputs for at least two offers to see how they compare.');
  });

  it('leaves an offer that cannot be worked out, out of the range of the others', () => {
    assert.deepEqual(print([loan(0, '1200'), broken(1), loan(2, '999')]).answer, [
      'Total cost ranges from €999.00 to €1,200.00 across the offers below: a spread of €201.00.',
    ]);
  });

  it('counts neither an offer marked in error nor one with no schedule, whatever else they carry', () => {
    const offers = [loan(0, '1200'), loan(1, '999'), loan(2, '500')];
    const [a, b, c] = offers.map((v) => computeFromInput(v, 'EUR'));
    // The third offer would be the lowest total if it counted.
    assert.deepEqual(print(offers, { results: [a, b, { ...c, error: 'Enter a loan amount greater than zero.' }] }).answer, [
      'Total cost ranges from €999.00 to €1,200.00 across the offers below: a spread of €201.00.',
    ]);
    assert.deepEqual(print(offers, { results: [a, b, { ...c, schedule: [] }] }).answer, [
      'Total cost ranges from €999.00 to €1,200.00 across the offers below: a spread of €201.00.',
    ]);
    // With one offer left there is nothing to compare.
    assert.deepEqual(print(offers.slice(1), { results: [b, { ...c, error: 'Enter a loan amount greater than zero.' }] }).answer, [s.delta.empty]);
    assert.deepEqual(print(offers.slice(1), { results: [b, { ...c, schedule: [] }] }).answer, [s.delta.empty]);
  });
});

describe('the printed loan report: names and number style', () => {
  it('prints an untouched name in the page\'s words, a typed one as typed and an empty one by its place', () => {
    const page = print([loan(0, '1200', { name: 'Vendor C' }), loan(1, '999', { name: 'Česká banka' }), loan(2, '1500', { name: '' })]);
    assert.deepEqual(page.names, ['Offer C', 'Česká banka', 'Offer C']);
  });

  it('writes amounts the currency\'s own way on a page with no style of its own', () => {
    const page = print([loan(0, '1200000'), loan(1, '999')], { currency: 'INR' });
    assert.deepEqual(page.answer, ['Total cost ranges from ₹999.00 to ₹12,00,000.00 across the offers below: a spread of ₹11,99,001.00.']);
    // The tables' numbers are grouped in threes, the English way.
    assert.ok(page.text('.tool-reportTable td').some((cell) => cell.includes('1,200,000.00')), 'the amount borrowed, in a table');
  });

  it('writes the answer and the tables the Spanish way on a Spanish page', () => {
    const page = print([loan(0, '1200000'), loan(1, '999')], { locale: 'es' });
    assert.deepEqual(page.answer, ['Total cost ranges from 999,00 € to 1.200.000,00 € across the offers below: a spread of 1.199.001,00 €.']);
    assert.ok(page.text('.tool-reportTable td').some((cell) => cell.includes('1.200.000,00')), 'the amount borrowed, in a table');
    assert.ok(!page.text('.tool-reportTable td').some((cell) => cell.includes('1,200,000.00')));
  });

  it('holds what the page shows: the tool, the currency, the offers\' balance chart and the comparison', () => {
    const page = print([loan(0, '1200'), loan(1, '999')]);
    assert.deepEqual(page.text('.tool-reportTitle'), [s.export.tool]);
    assert.ok(page.text('.tool-reportMeta')[0].endsWith(`${t.export.about.currency}: EUR`));
    assert.deepEqual(page.text('.tool-reportKey li'), ['Offer A', 'Offer B']);
    assert.deepEqual(page.text('caption'), [s.delta.heading]);
  });
});
