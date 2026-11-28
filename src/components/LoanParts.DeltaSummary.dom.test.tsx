/**
 * The side-by-side comparison of loan offers (`DeltaSummary` and `DeltaRow`
 * in LoanCompare.tsx), mounted on its own with results from the engine.
 *
 * It tells a reader what each offer costs and how far apart the offers are,
 * so every amount, month count, percentage and sentence is pinned against a
 * figure worked out by hand (test/loanParts.comparedOffers.ts): the range of
 * totals and its spread, each row of the table, the difference from the
 * lowest total, what stands in for a total when a loan is never paid off,
 * and what is shown when fewer than two offers can be compared.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import {
  allFee, aprOfLevelLoan, beyondLimit, dear, invalid, keptEarlier, keptLater, keptOnTerm, large, neverEqual, neverLess,
  paidBeforeChange, plain, stepped, steppedEarly, steppedLast, withFee,
} from '../../test/loanParts.comparedOffers.ts';
import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';
import { CHART_SERIES } from '../styles/palette.ts';
import type { LoanResult } from '../utils/loan/math.ts';
import { amountLength } from '../utils/shared/amountUnits.ts';
import { makeDefaultVendor } from '../utils/loan/url.ts';
import { Amount } from './Amounts.tsx';
import { DeltaRow, DeltaSummary } from './LoanCompare.tsx';
import { AmountLocaleContext } from './useMoney.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn },
};

const s = TOOL_STRINGS.en.loanComparison.island;
const d = s.delta;
const KEPT = 'The payment stays the same after the rate change.';
const NO_RANGE = 'Fewer than two of these offers are paid off, so there is no range of totals to compare.';

afterEach(cleanup);

interface Options {
  withheld?: boolean;
  currency?: string;
  amountLocale?: string;
  /** The lender names as typed, by slot; a slot left out keeps its untouched default. */
  names?: (string | undefined)[];
}

/** Mounts the comparison for these results, one per offer slot, as the page does. */
function show(results: LoanResult[], options: Options = {}) {
  const vendors = results.map((_, i) => {
    const vendor = makeDefaultVendor(i);
    return { ...vendor, name: options.names?.[i] ?? vendor.name };
  });
  const { container } = render(
    <AmountLocaleContext.Provider value={options.amountLocale ?? null}>
      <DeltaSummary
        withheld={options.withheld ?? false}
        reasonId="why-no-result"
        results={results}
        vendors={vendors}
        currency={options.currency ?? 'EUR'}
        strings={s}
      />
    </AmountLocaleContext.Provider>,
  );
  return container.querySelector('section') as HTMLElement;
}

/** The length an amount is sized by, as its element carries it. */
const sizedAs = (amount: Element) => Number((amount as HTMLElement).style.getPropertyValue('--amt-len'));

/** The colour an element is given for its offer. */
const colourOf = (el: Element) => (el as HTMLElement).style.getPropertyValue('--lc-color');

/** A cell as read: one line, or the lines of a cell that stacks them. */
function lines(cell: Element): string[] {
  const stack = cell.querySelector('.lc-deltaLines, .lc-steps');
  return stack ? [...stack.children].map((line) => line.textContent ?? '') : [cell.textContent ?? ''];
}

/** The sentence above the table. */
const hero = (section: HTMLElement) => section.querySelector('p.lc-deltaHero')?.textContent;

/** The offers named in the table's header, in order. */
const columns = (section: HTMLElement) => [...section.querySelectorAll('thead th')].slice(1).map((th) => th.textContent);

/** One row of the table by its label: its cells as read, and how the row is marked. */
function row(section: HTMLElement, label: string) {
  const found = [...section.querySelectorAll('tbody tr')].filter((tr) => tr.querySelector('th')?.textContent === label);
  assert.equal(found.length, 1, `one row labelled ${label}`);
  const cells = [...found[0].querySelectorAll('td')];
  return {
    cells,
    read: cells.map((cell) => lines(cell)),
    /** The same, for a row whose cells are all one line. */
    values: cells.map((cell) => cell.textContent),
    marks: [...found[0].classList],
    heading: found[0].querySelector('th') as HTMLElement,
  };
}

/** The last row: how much more each offer costs in all than the lowest. */
const differences = (section: HTMLElement) => row(section, 'Difference vs. lowest total cost');

describe('two offers side by side', () => {
  it('is a section named by its heading, which the phone layout can move focus to', () => {
    const section = show([plain(), dear()]);
    const heading = section.querySelector('h2') as HTMLElement;
    assert.equal(heading.textContent, 'Side-by-side');
    assert.equal(heading.id, 'lc-delta-h');
    assert.equal(section.getAttribute('aria-labelledby'), 'lc-delta-h');
    assert.equal(heading.getAttribute('tabindex'), '-1');
  });

  it('says the lowest total, the highest and the spread, without naming an offer', () => {
    const section = show([plain(), dear()]);
    // 1,218.03 less 1,200.00.
    assert.equal(hero(section), 'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.');
    assert.deepEqual([...section.querySelectorAll('.lc-deltaHero strong > .amt')].map((a) => a.textContent), ['€1,200.00', '€1,218.03', '€18.03']);
  });

  it('gives each offer a column and each measure a row, with the figures of both loans', () => {
    const section = show([plain(), dear()]);
    assert.deepEqual(columns(section), ['Offer A', 'Offer B']);
    assert.deepEqual(row(section, 'Monthly payment').values, ['€100.00', '€609.01']);
    assert.deepEqual(row(section, 'Months to payoff').values, ['1 yr', '2 mo']);
    // No fee on either, so the APR is the rate itself.
    assert.deepEqual(row(section, 'APR (incl. fees)').values, ['0.00%', '12.00%']);
    assert.deepEqual(row(section, 'Total interest').values, ['€0.00', '€18.03']);
    assert.deepEqual(row(section, 'Total paid').values, ['€1,200.00', '€1,218.03']);
    assert.deepEqual(differences(section).values, ['baseline', '+€18.03']);
    assert.equal(section.querySelectorAll('tbody tr').length, 6);
    assert.equal(section.querySelector('p.lc-deltaNote')?.textContent, 'The APR in this table is on the same basis as your rate.');
  });

  it('labels the table for a screen reader: a named first column, and a row header on every row', () => {
    const section = show([plain(), dear()]);
    const corner = section.querySelector('thead th') as HTMLElement;
    assert.equal(corner.getAttribute('scope'), 'col');
    assert.equal(corner.getAttribute('aria-label'), 'Metric');
    assert.equal(corner.querySelector('.lc-srOnly')?.textContent, 'Metric');
    for (const label of [d.monthlyPayment, d.monthsToPayoff, d.aprInclFees, d.totalInterest, d.totalPaid, d.diffRow]) {
      assert.equal(row(section, label).heading.getAttribute('scope'), 'row');
    }
  });

  it('marks the total paid as the row that matters most, and no row as stacked when every cell is one figure', () => {
    const section = show([plain(), dear()]);
    assert.deepEqual(row(section, 'Total paid').marks, ['lc-deltaRowEmphasized']);
    for (const label of [d.monthlyPayment, d.monthsToPayoff, d.aprInclFees, d.totalInterest]) {
      assert.deepEqual(row(section, label).marks, []);
    }
    assert.deepEqual(differences(section).marks, ['lc-deltaSavingsRow']);
  });

  it('measures the difference from the lowest total wherever that offer stands', () => {
    const section = show([dear(), plain()]);
    assert.equal(hero(section), 'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.');
    assert.deepEqual(differences(section).values, ['+€18.03', 'baseline']);
    const baseline = differences(section).cells[1].querySelector('.lc-deltaBaseline') as HTMLElement;
    assert.equal(baseline.getAttribute('aria-label'), 'baseline (lowest total cost)');
    assert.ok(differences(section).cells[0].querySelector('.lc-deltaCost > .amt') !== null);
  });

  it('shows the results and no reason when nothing is withheld', () => {
    const section = show([plain(), dear()]);
    const body = section.querySelector('.tool-resultBody') as HTMLElement;
    assert.deepEqual([...body.classList], ['tool-resultBody']);
    assert.equal(body.hasAttribute('inert'), false);
    assert.ok(section.querySelector('.tool-resultReason') === null);
  });
});

describe('three and more offers', () => {
  it('takes the range from the lowest and the highest total and gives every other offer its own difference', () => {
    // 1,200.00, 1,218.03 and 12,180.30: the spread is 10,980.30.
    const expected = 'Total cost ranges from €1,200.00 to €12,180.30 across the offers below: a spread of €10,980.30.';
    const first = show([dear(), large(), plain()]);
    assert.equal(hero(first), expected);
    assert.deepEqual(differences(first).values, ['+€18.03', '+€10,980.30', 'baseline']);
    cleanup();
    const second = show([large(), plain(), dear()]);
    assert.equal(hero(second), expected);
    assert.deepEqual(differences(second).values, ['+€10,980.30', 'baseline', '+€18.03']);
    assert.deepEqual(row(second, 'Total paid').values, ['€12,180.30', '€1,200.00', '€1,218.03']);
    assert.deepEqual(row(second, 'Total interest').values, ['€180.30', '€0.00', '€18.03']);
    assert.deepEqual(row(second, 'Monthly payment').values, ['€6,090.15', '€100.00', '€609.01']);
    cleanup();
    const third = show([plain(), dear(), large()]);
    assert.equal(hero(third), expected);
    assert.deepEqual(differences(third).values, ['baseline', '+€18.03', '+€10,980.30']);
  });

  it('draws amounts that are compared at one size: the two ends of the range, each row, and the differences', () => {
    const section = show([plain(), dear(), large()]);
    const [low, high, spread] = [...section.querySelectorAll('.lc-deltaHero .amt')];
    // The longer end has seven digits, a symbol, a comma and a point.
    assert.equal(amountLength('€12,180.30'), 9.1);
    assert.equal(sizedAs(low), 9.1);
    assert.equal(sizedAs(high), 9.1);
    // The spread is not one of the two and keeps its own size.
    assert.equal(sizedAs(spread), amountLength('€10,980.30'));
    assert.deepEqual([...row(section, 'Total paid').cells].map((cell) => sizedAs(cell.querySelector('.amt') as Element)), [9.1, 9.1, 9.1]);
    assert.equal(amountLength('€6,090.15'), 8.1);
    assert.deepEqual([...row(section, 'Monthly payment').cells].map((cell) => sizedAs(cell.querySelector('.amt') as Element)), [8.1, 8.1, 8.1]);
    // The differences are sized by the largest of them, sign included.
    assert.equal(amountLength('+€10,980.30'), 10.2);
    assert.deepEqual(differences(section).cells.slice(1).map((cell) => sizedAs(cell.querySelector('.amt') as Element)), [10.2, 10.2]);
  });

  it('says so when every offer costs the same, and calls each of them the baseline', () => {
    const section = show([plain(), plain(), plain()]);
    assert.equal(hero(section), 'All offers come out at the same total cost of €1,200.00.');
    assert.deepEqual([...section.querySelectorAll('.lc-deltaHero strong > .amt')].map((a) => a.textContent), ['€1,200.00']);
    assert.deepEqual(differences(section).values, ['baseline', 'baseline', 'baseline']);
  });

  it('writes amounts and percentages the way the page and the currency write them', () => {
    const dollars = show([plain(), dear()], { currency: 'USD' });
    assert.equal(hero(dollars), 'Total cost ranges from $1,200.00\u00a0USD to $1,218.03\u00a0USD across the offers below: a spread of $18.03\u00a0USD.');
    assert.deepEqual(row(dollars, 'Monthly payment').values, ['$100.00\u00a0USD', '$609.01\u00a0USD']);
    assert.deepEqual(differences(dollars).values, ['baseline', '+$18.03\u00a0USD']);
    cleanup();
    const spanish = show([plain(), dear()], { amountLocale: 'es' });
    const euros = (value: number) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(value);
    const percent = (value: number) => new Intl.NumberFormat('es', { style: 'percent', minimumFractionDigits: 2 }).format(value);
    assert.match(euros(1218.03), /^1218,03\s€$/);
    assert.match(percent(0.12), /^12,00\s%$/);
    assert.deepEqual(row(spanish, 'Total paid').values, [euros(1200), euros(1218.03)]);
    assert.deepEqual(row(spanish, 'APR (incl. fees)').values, [percent(0), percent(0.12)]);
    assert.deepEqual(differences(spanish).values, ['baseline', `+${euros(18.03)}`]);
  });
});

describe('the APR row', () => {
  it('counts a fee into the APR, and says there is none when the fee swallows the loan', () => {
    const section = show([plain(), dear(), withFee(), allFee()]);
    // 1,140.00 received for twelve payments of 100.00.
    const withFeeApr = aprOfLevelLoan(1140, 100, 12);
    assert.equal(`${(withFeeApr * 100).toFixed(2)}%`, '9.58%');
    assert.deepEqual(row(section, 'APR (incl. fees)').values, ['0.00%', '12.00%', '9.58%', 'n/a']);
    // The fee is part of what is paid: 1,260.00, and 2,400.00 with a fee of 1,200.00.
    assert.deepEqual(row(section, 'Total paid').values, ['€1,200.00', '€1,218.03', '€1,260.00', '€2,400.00']);
    assert.deepEqual(differences(section).values, ['baseline', '+€18.03', '+€60.00', '+€1,200.00']);
  });
});

describe('who the offers are', () => {
  it('shows a typed lender name as typed and an untouched one as "Offer" and its letter', () => {
    const section = show([plain(), dear(), large()], { names: ['Bank Ltd', undefined, ''] });
    assert.deepEqual(columns(section), ['Bank Ltd', 'Offer B', 'Offer C']);
    const key = section.querySelector('ul.lc-deltaKey') as HTMLElement;
    assert.equal(key.getAttribute('aria-label'), 'Offers');
    const entries = [...key.querySelectorAll('li')];
    assert.deepEqual(entries.map((li) => li.querySelector('.lc-deltaKeyName')?.textContent), ['Bank Ltd', 'Offer B', 'Offer C']);
    // A typed name does not say which letter marks its figures on a phone, so the key adds it.
    assert.deepEqual(entries.map((li) => li.querySelector('.lc-deltaKeyLetter')?.textContent), ['A', undefined, undefined]);
    assert.deepEqual(entries.map((li) => li.textContent), ['ABank Ltd', 'Offer B', 'Offer C']);
    assert.deepEqual(entries.map((li) => li.querySelectorAll('svg.chart-marker').length), [1, 1, 1]);
  });

  it('keeps each offer its own letter and colour when an offer between them is left out', () => {
    const section = show([plain(), invalid(), dear(), invalid(), large()], { names: [undefined, undefined, 'Credit Union', undefined, undefined] });
    assert.deepEqual(columns(section), ['Offer A', 'Credit Union', 'Offer E']);
    const entries = [...section.querySelectorAll('ul.lc-deltaKey li')];
    assert.deepEqual(entries.map((li) => li.textContent), ['Offer A', 'CCredit Union', 'Offer E']);
    const colours = [CHART_SERIES[0], CHART_SERIES[2], CHART_SERIES[4]];
    assert.deepEqual(entries.map(colourOf), colours);
    for (const label of [d.monthlyPayment, d.monthsToPayoff, d.aprInclFees, d.totalInterest, d.totalPaid, d.diffRow]) {
      const { cells } = row(section, label);
      assert.deepEqual(cells.map((cell) => cell.getAttribute('data-slot')), ['A', 'C', 'E'], label);
      assert.deepEqual(cells.map(colourOf), colours, label);
    }
    assert.deepEqual(row(section, 'Total paid').values, ['€1,200.00', '€1,218.03', '€12,180.30']);
  });
});

describe('fewer than two offers to compare', () => {
  /** What the section shows in place of the table. */
  const emptied = (section: HTMLElement) => ({
    heading: section.querySelector('h2#lc-delta-h')?.textContent,
    named: section.getAttribute('aria-labelledby'),
    focusable: section.querySelector('h2')?.getAttribute('tabindex'),
    message: section.querySelector('p.lc-deltaEmpty')?.textContent,
    tables: section.querySelectorAll('table').length,
    heroes: section.querySelectorAll('.lc-deltaHero').length,
  });
  const EMPTY = {
    heading: 'Side-by-side',
    // The same landmark, named by its heading, as when it compares offers.
    named: 'lc-delta-h',
    focusable: '-1',
    message: 'Enter valid inputs for at least two offers to see how they compare.',
    tables: 0,
    heroes: 0,
  };

  it('asks for a second valid offer when there is one, or none', () => {
    assert.deepEqual(emptied(show([plain()])), EMPTY);
    cleanup();
    assert.deepEqual(emptied(show([])), EMPTY);
    cleanup();
    assert.deepEqual(emptied(show([plain(), invalid()])), EMPTY);
    cleanup();
    assert.deepEqual(emptied(show([invalid(), invalid(), dear()])), EMPTY);
  });

  it('does not count an offer with an error, even one that still carries a schedule', () => {
    const stale: LoanResult = { ...dear(), error: 'Enter a loan amount greater than zero.' };
    assert.deepEqual(emptied(show([plain(), stale])), EMPTY);
    cleanup();
    // Two good offers beside it are compared without it.
    const section = show([plain(), stale, dear()]);
    assert.deepEqual(columns(section), ['Offer A', 'Offer C']);
  });

  it('does not count an offer with no schedule, even one without an error', () => {
    const blank: LoanResult = { ...dear(), schedule: [] };
    assert.deepEqual(emptied(show([plain(), blank])), EMPTY);
    cleanup();
    const section = show([blank, plain(), dear()]);
    assert.deepEqual(columns(section), ['Offer B', 'Offer C']);
  });

  it('compares exactly two valid offers', () => {
    assert.equal(show([invalid(), plain(), dear()]).querySelectorAll('table').length, 1);
  });
});

describe('a comparison that is withheld while a box is wrong', () => {
  it('gives the reason under the heading, where the cards point to it, and takes the table out of reach', () => {
    const section = show([plain(), dear()], { withheld: true });
    const reason = section.querySelector('p.tool-resultReason') as HTMLElement;
    assert.equal(reason.textContent, 'Fix the highlighted fields to compare the offers.');
    assert.equal(reason.id, 'why-no-result');
    const body = section.querySelector('.tool-resultBody') as HTMLElement;
    assert.ok(body.classList.contains('tool-withheld'));
    assert.equal(body.hasAttribute('inert'), true);
    // The heading stays outside what is withheld: the phone's jump to the comparison lands on it.
    assert.equal(section.querySelector('h2')?.textContent, 'Side-by-side');
    assert.ok(body.querySelector('h2') === null);
    assert.ok(body.querySelector('table') !== null);
  });

  it('gives the same reason when fewer than two offers are left', () => {
    const section = show([plain(), invalid()], { withheld: true });
    const reason = section.querySelector('p.tool-resultReason') as HTMLElement;
    assert.equal(reason.textContent, 'Fix the highlighted fields to compare the offers.');
    assert.equal(reason.id, 'why-no-result');
    const body = section.querySelector('.tool-resultBody') as HTMLElement;
    assert.ok(body.classList.contains('tool-withheld'));
    assert.equal(body.hasAttribute('inert'), true);
    assert.equal(body.querySelector('p.lc-deltaEmpty')?.textContent, 'Enter valid inputs for at least two offers to see how they compare.');
  });

  it('gives no reason for a lone offer that is simply not enough to compare', () => {
    const section = show([plain()]);
    assert.ok(section.querySelector('.tool-resultReason') === null);
    assert.deepEqual([...(section.querySelector('.tool-resultBody') as HTMLElement).classList], ['tool-resultBody']);
  });
});

describe('an offer that is never paid off', () => {
  it('has no total, so one paid-off offer beside it leaves no range and no difference', () => {
    const section = show([plain(), neverLess()]);
    assert.equal(hero(section), NO_RANGE);
    assert.deepEqual(row(section, 'Monthly payment').read, [['€100.00'], ['€100.00', KEPT]]);
    assert.deepEqual(row(section, 'Months to payoff').read, [['1 yr'], ['Not paid off']]);
    assert.deepEqual(row(section, 'APR (incl. fees)').values, ['0.00%', 'Not available']);
    assert.deepEqual(row(section, 'Total interest').values, ['€0.00', 'No finite total']);
    assert.deepEqual(row(section, 'Total paid').values, ['€1,200.00', 'No finite total']);
    assert.deepEqual(differences(section).values, ['Not comparable', 'Not comparable']);
    assert.ok(differences(section).cells[0].querySelector('.lc-deltaBaseline') === null);
  });

  it('gives the same answer whichever of the two comes first', () => {
    const section = show([neverEqual(), plain()]);
    assert.equal(hero(section), NO_RANGE);
    assert.deepEqual(row(section, 'Monthly payment').read, [['€1,000.00', KEPT], ['€100.00']]);
    assert.deepEqual(row(section, 'Total paid').values, ['No finite total', '€1,200.00']);
    assert.deepEqual(differences(section).values, ['Not comparable', 'Not comparable']);
  });

  it('marks every row it changes as stacked, so a phone gives each offer a line', () => {
    const section = show([plain(), neverLess()]);
    for (const label of [d.monthlyPayment, d.monthsToPayoff, d.aprInclFees, d.totalInterest]) {
      assert.deepEqual(row(section, label).marks, ['lc-deltaRowStacked'], label);
    }
    assert.equal(row(section, 'Total paid').heading.parentElement?.getAttribute('class'), 'lc-deltaRowEmphasized lc-deltaRowStacked');
  });

  it('is left out of the range and of the differences when two other offers are paid off', () => {
    for (const never of [neverLess(), neverEqual()]) {
      for (const order of [[0, 1, 2], [2, 0, 1], [1, 2, 0]]) {
        const offers = [plain(), dear(), never];
        const section = show(order.map((i) => offers[i]));
        assert.equal(hero(section), 'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.');
        const expected = ['baseline', '+€18.03', 'Not comparable'];
        assert.deepEqual(differences(section).values, order.map((i) => expected[i]));
        cleanup();
      }
    }
  });

  it('is never the lowest because of the flag on it, not because its total happens to be blank', () => {
    // A total the engine does not give such a loan: lower than every other, and still not compared.
    const withTotal: LoanResult = { ...neverLess(), totalPaidMinor: 50_000 };
    const section = show([plain(), withTotal, dear()]);
    assert.equal(hero(section), 'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.');
    assert.deepEqual(row(section, 'Total paid').values, ['€1,200.00', 'No finite total', '€1,218.03']);
    assert.deepEqual(differences(section).values, ['baseline', 'Not comparable', '+€18.03']);
  });

  it('leaves nothing to compare when no offer is paid off', () => {
    const section = show([neverLess(), neverEqual()]);
    assert.equal(hero(section), NO_RANGE);
    assert.deepEqual(row(section, 'Months to payoff').read, [['Not paid off'], ['Not paid off']]);
    assert.deepEqual(differences(section).values, ['Not comparable', 'Not comparable']);
  });

  it('says the calculation stopped, with no figure made up, when the balance is still falling at the limit', () => {
    const section = show([plain(), dear(), beyondLimit()]);
    assert.equal(hero(section), 'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.');
    assert.deepEqual(row(section, 'Monthly payment').read[2], ['€7,653.73', KEPT]);
    assert.deepEqual(row(section, 'Months to payoff').read[2], ['Beyond the calculation limit']);
    assert.equal(row(section, 'APR (incl. fees)').values[2], 'Not available');
    assert.equal(row(section, 'Total interest').values[2], 'Not available');
    assert.equal(row(section, 'Total paid').values[2], 'Not available');
    assert.deepEqual(differences(section).values, ['baseline', '+€18.03', 'Not comparable']);
  });
});

describe('an offer whose payment changes with the rate', () => {
  it('shows both payments under the months each is paid in', () => {
    const section = show([stepped(), steppedEarly(), steppedLast(), paidBeforeChange(), plain()]);
    const monthly = row(section, 'Monthly payment');
    assert.deepEqual(monthly.read, [
      ['Months 1 to 6 €100.00', 'From month 7 €103.53'],
      ['Month 1 €100.00', 'From month 2 €106.10'],
      ['Months 1 to 11 €100.00', 'Month 12, last payment €101.00'],
      ['€300.00', 'Paid off in month 4, before the rate changes'],
      ['€100.00'],
    ]);
    assert.deepEqual(monthly.marks, ['lc-deltaRowStacked']);
    assert.deepEqual(monthly.cells.map((cell) => cell.querySelectorAll('.lc-steps').length), [1, 1, 1, 0, 0]);
    // The payoff is a plain figure for each of them.
    const payoff = row(section, 'Months to payoff');
    assert.deepEqual(payoff.values, ['1 yr', '1 yr', '1 yr', '4 mo', '1 yr']);
    assert.deepEqual(payoff.marks, []);
  });

  it('adds up what the changed payment costs', () => {
    const section = show([stepped(), steppedLast(), plain()]);
    // Six of 100.00 and five of 103.53, then a last payment that closes the loan: 21.16 of interest.
    assert.deepEqual(row(section, 'Total interest').values, ['€21.16', '€1.00', '€0.00']);
    assert.deepEqual(row(section, 'Total paid').values, ['€1,221.16', '€1,201.00', '€1,200.00']);
    assert.equal(hero(section), 'Total cost ranges from €1,200.00 to €1,221.16 across the offers below: a spread of €21.16.');
    assert.deepEqual(differences(section).values, ['+€21.16', '+€1.00', 'baseline']);
  });

  it('says the payment stays the same when it is kept, and how the payoff compares with the term entered', () => {
    const section = show([keptOnTerm(), keptLater(), keptEarlier()]);
    assert.deepEqual(row(section, 'Monthly payment').read, [['€100.00', KEPT], ['€100.00', KEPT], ['€176.12', KEPT]]);
    assert.deepEqual(row(section, 'Months to payoff').read, [
      ['1 yr', 'Matches the entered term of 1 yr.'],
      ['1 yr 2 mo', '2 mo later than the entered term of 1 yr.'],
      ['8 mo', '4 mo earlier than the entered term of 1 yr.'],
    ]);
    assert.deepEqual(row(section, 'Months to payoff').marks, ['lc-deltaRowStacked']);
    assert.deepEqual(row(section, 'Total interest').values, ['€21.71', '€131.57', '€120.00']);
    assert.deepEqual(row(section, 'Total paid').values, ['€1,221.71', '€1,331.57', '€1,320.00']);
    // 1,331.57 less 1,221.71 is 109.86; 1,320.00 less 1,221.71 is 98.29.
    assert.equal(hero(section), 'Total cost ranges from €1,221.71 to €1,331.57 across the offers below: a spread of €109.86.');
    assert.deepEqual(differences(section).values, ['baseline', '+€109.86', '+€98.29']);
  });

  it('sizes the payment in a cell of several lines with the other payments of its row', () => {
    const section = show([keptOnTerm(), large(), paidBeforeChange()]);
    const amounts = row(section, 'Monthly payment').cells.map((cell) => cell.querySelector('.amt') as Element);
    assert.deepEqual(amounts.map((a) => a.textContent), ['€100.00', '€6,090.15', '€300.00']);
    assert.deepEqual(amounts.map(sizedAs), [8.1, 8.1, 8.1]);
  });
});

describe('one row of the comparison on its own', () => {
  const offers = [
    { r: plain(), i: 0, name: 'Offer A' },
    { r: dear(), i: 3, name: 'Offer D' },
  ];
  type RowProps = Omit<Parameters<typeof DeltaRow>[0], 'label' | 'valid'>;
  const mount = (props: RowProps) => {
    const { container } = render(<table><tbody><DeltaRow label={d.totalPaid} valid={offers} {...props} /></tbody></table>);
    const tr = container.querySelector('tr') as HTMLElement;
    return { tr, cells: [...tr.querySelectorAll('td')] };
  };
  const cents = (n: number) => `€${(n / 100).toFixed(2)}`;

  it('prints each offer\'s figure the way the row formats it, under a row header', () => {
    const { tr, cells } = mount({ get: (r) => r.totalPaidMinor, format: cents });
    assert.equal(tr.querySelector('th')?.textContent, 'Total paid');
    assert.equal(tr.querySelector('th')?.getAttribute('scope'), 'row');
    assert.deepEqual(cells.map((cell) => cell.textContent), ['€1200.00', '€1218.03']);
    assert.deepEqual(cells.map((cell) => cell.querySelectorAll('span > .amt').length), [1, 1]);
    assert.equal(tr.getAttribute('class'), '');
  });

  it('marks each cell with its offer\'s letter and colour, by the offer\'s slot', () => {
    const { cells } = mount({ get: (r) => r.months, format: String });
    assert.deepEqual(cells.map((cell) => cell.getAttribute('data-slot')), ['A', 'D']);
    assert.deepEqual(cells.map(colourOf), [CHART_SERIES[0], CHART_SERIES[3]]);
  });

  it('sizes every amount of the row by the longest one', () => {
    const { cells } = mount({ get: (r) => r.totalInterestMinor, format: cents });
    assert.deepEqual(cells.map((cell) => cell.textContent), ['€0.00', '€18.03']);
    assert.equal(amountLength('€18.03'), 5.6);
    assert.deepEqual(cells.map((cell) => sizedAs(cell.querySelector('.amt') as Element)), [5.6, 5.6]);
  });

  it('can be the emphasised row without being stacked', () => {
    assert.equal(mount({ get: (r) => r.months, format: String, emphasized: true }).tr.getAttribute('class'), 'lc-deltaRowEmphasized');
    cleanup();
    assert.equal(mount({ get: (r) => r.months, format: String, emphasized: false, cell: () => null }).tr.getAttribute('class'), '');
  });

  it('lets one offer\'s cell hold several lines while the other keeps its figure, and stacks the row', () => {
    const { tr, cells } = mount({
      get: (r) => r.months,
      format: (n) => `${n} mo`,
      cell: (r) => (r.months === 2 ? <span className="lc-deltaLines"><span>two</span><span>lines</span></span> : null),
    });
    assert.deepEqual(cells.map(lines), [['12 mo'], ['two', 'lines']]);
    assert.equal(tr.getAttribute('class'), 'lc-deltaRowStacked');
  });

  it('stacks the row when every cell holds several lines, and joins both marks with a space', () => {
    const { tr, cells } = mount({
      get: (r) => r.effectiveMonthlyMinor,
      format: cents,
      cell: (r) => <span className="lc-deltaLines"><span><Amount>{cents(r.months)}</Amount></span><span>kept</span></span>,
      emphasized: true,
    });
    assert.deepEqual(cells.map(lines), [['€0.12', 'kept'], ['€0.02', 'kept']]);
    assert.equal(tr.getAttribute('class'), 'lc-deltaRowEmphasized lc-deltaRowStacked');
    // The amounts drawn inside such a cell still share the size of the row's own figures (609.01 is the longer).
    assert.equal(amountLength('€609.01'), 6.6);
    assert.deepEqual(cells.map((cell) => sizedAs(cell.querySelector('.amt') as Element)), [6.6, 6.6]);
  });
});
