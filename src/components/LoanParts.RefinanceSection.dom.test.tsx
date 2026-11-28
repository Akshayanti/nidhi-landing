/**
 * The loan comparison's refinance scenario (`RefinanceSection` in
 * LoanCompare.tsx), mounted on its own with results from the engine.
 *
 * A reader picks one offer and asks what refinancing it at some month into a
 * new loan would do: the two totals, any early repayment penalty, the saving
 * or the extra cost, and how long the refinance takes to break even, with the
 * words that go with each kind of break-even. Pinned here: the offer the
 * section settles on, the boxes (labels, what they call back with, how they
 * are marked when they cannot be read), the result rows against figures
 * worked out by hand (test/loanParts.refinance.ts), the sentence handed to
 * the tool's announcement, and the one event sent once typing has settled.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import {
  dear, invalid, long, neverPaid, plain, resultsOf, scenario, stretched, withExtra, withPenalty,
} from '../../test/loanParts.refinance.ts';
import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';
import { exportEn } from '../i18n/strings/tools/export.ts';
import type { LoanResult } from '../utils/loan/math.ts';
import type { GlobalState, VendorInput } from '../utils/loan/url.ts';
import { RefinanceSection } from './LoanCompare.tsx';
import { ErrorLeadContext, UnreadableContext } from './toolShared.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
};

const s = TOOL_STRINGS.en.loanComparison.island;
const common = TOOL_STRINGS.en.export;
const r = s.refi;
const UNREADABLE = 'One of the optional boxes cannot be read. Use digits only, or clear the box.';

const win = window as unknown as { posthog?: unknown };
let sent: unknown[][] = [];

beforeEach(() => {
  sent = [];
  win.posthog = { capture: (...event: unknown[]) => { sent.push(event); } };
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  cleanup();
  mock.timers.reset();
  delete win.posthog;
});

interface Options {
  /** The results to show, where they are not simply the offers' own. */
  results?: LoanResult[];
  currency?: string;
}

/** What the section called back with, in order. */
interface Calls {
  patches: Partial<GlobalState>[];
  said: (string | undefined)[];
}

/** The section over these offers, holding the scenario's boxes as the page does. */
function Held({ vendors, start, options, calls }: { vendors: VendorInput[]; start: GlobalState; options: Options; calls: Calls }) {
  const [state, setState] = useState(start);
  const currency = options.currency ?? 'EUR';
  return (
    <ErrorLeadContext.Provider value={common.fieldError}>
      <UnreadableContext.Provider value={common.fieldUnreadable}>
        <RefinanceSection
          vendors={vendors}
          results={options.results ?? resultsOf(vendors, currency)}
          currency={currency}
          state={state}
          onChange={(patch) => {
            calls.patches.push(patch);
            setState((was) => ({ ...was, ...patch }));
          }}
          onSaid={(text) => { calls.said.push(text); }}
          strings={s}
        />
      </UnreadableContext.Provider>
    </ErrorLeadContext.Provider>
  );
}

/** Mounts the section with these boxes, and hands back what a test reads. */
function show(vendors: VendorInput[], boxes: Partial<GlobalState> = {}, options: Options = {}) {
  const calls: Calls = { patches: [], said: [] };
  const start = scenario({ currency: options.currency ?? 'EUR', ...boxes });
  const view = render(<Held vendors={vendors} start={start} options={options} calls={calls} />);
  const section = view.container.querySelector('section.lc-advancedSection.lc-refiSection') as HTMLElement;
  assert.ok(section !== null, 'the section is on the page');
  return { section, calls, unmount: view.unmount };
}

/** The box or control a label names, found through the label as a reader's tools find it. */
function field(section: HTMLElement, text: string): HTMLInputElement & HTMLSelectElement {
  const label = [...section.querySelectorAll('label')].find((l) => l.textContent === text);
  assert.ok(label, `a label reads "${text}"`);
  const control = section.querySelector(`[id="${label.htmlFor}"]`);
  assert.ok(control, `the label "${text}" belongs to a control`);
  return control as HTMLInputElement & HTMLSelectElement;
}

const which = (section: HTMLElement) => field(section, r.whichLoan);
const atMonth = (section: HTMLElement) => field(section, r.atMonth);
const rate = (section: HTMLElement) => field(section, r.newRate);
const term = (section: HTMLElement) => field(section, r.newTerm);
const fee = (section: HTMLElement) => field(section, `${r.newFee} (EUR)`);
const roll = (section: HTMLElement) => field(section, r.rollFee);

/** The result rows as read: each label with its value, then any lines under it. */
function rows(section: HTMLElement): string[][] {
  return [...section.querySelectorAll('.lc-refiResults > dl.lc-resultList > .lc-resultRow')].map((row) => [
    row.querySelector('dt')?.textContent ?? '',
    [...(row.querySelector('dd')?.childNodes ?? [])]
      .filter((node) => !(node instanceof HTMLElement && node.classList.contains('lc-resultHint')))
      .map((node) => node.textContent ?? '')
      .join(''),
    ...[...row.querySelectorAll('dd > .lc-resultHint')].map((hint) => hint.textContent ?? ''),
  ]);
}

/** The row with this label, or undefined. */
const row = (section: HTMLElement, label: string) => rows(section).find(([l]) => l === label);

const typeInto = (input: HTMLInputElement, text: string) => fireEvent.change(input, { target: { value: text } });

describe('the refinance scenario', () => {
  it('is a section named by its heading, with a line saying what it does', () => {
    const { section } = show([plain()]);
    const heading = section.querySelector('header > h3.lc-sectionTitle') as HTMLElement;
    assert.equal(heading.textContent, 'Refinance scenario');
    assert.equal(heading.id, 'lc-refi-h');
    assert.equal(section.getAttribute('aria-labelledby'), 'lc-refi-h');
    assert.equal(section.querySelector('header > p.lc-sectionLead')?.textContent, r.lead);
  });

  it('labels every box, and asks for digits in the month and term and a decimal in the rate and costs', () => {
    const { section } = show([plain()]);
    assert.equal(atMonth(section).getAttribute('inputmode'), 'numeric');
    assert.equal(term(section).getAttribute('inputmode'), 'numeric');
    assert.equal(rate(section).getAttribute('inputmode'), 'decimal');
    assert.equal(fee(section).getAttribute('inputmode'), 'decimal');
    assert.equal(roll(section).type, 'checkbox');
  });

  it('names the currency of the closing costs', () => {
    const { section } = show([plain()], {}, { currency: 'USD' });
    assert.ok(field(section, `${r.newFee} (USD)`));
  });

  it('holds what is in the boxes', () => {
    const { section } = show([plain()], { refiAtMonth: '7', refiNewRatePct: '4.5', refiNewTermMonths: '24', refiNewFeeMajor: '30', refiRollFee: true });
    assert.equal(atMonth(section).value, '7');
    assert.equal(rate(section).value, '4.5');
    assert.equal(term(section).value, '24');
    assert.equal(fee(section).value, '30');
    assert.equal(roll(section).checked, true);
  });
});

describe('the offer to refinance', () => {
  it('lists every offer by its name or letter, numbered from 1', () => {
    const { section } = show([{ ...plain(), name: 'Bank of Tests' }, dear(1)]);
    const options = [...which(section).querySelectorAll('option')];
    assert.deepEqual(options.map((o) => [o.value, o.textContent]), [['1', 'Bank of Tests'], ['2', 'Offer B']]);
    assert.equal(which(section).value, '1');
  });

  it('marks an offer that cannot be computed as incomplete, and does not let it be picked', () => {
    const { section } = show([plain(), invalid(1)]);
    const [first, second] = [...which(section).querySelectorAll('option')];
    assert.equal(first.textContent, 'Offer A');
    assert.equal(first.disabled, false);
    assert.equal(second.textContent, `Offer B${s.charts.incomplete}`);
    assert.equal(second.disabled, true);
  });

  it('refinances the offer picked', () => {
    // `dear` at month 1, into 0% over 3 months with 5.00 of costs: 1,224.08 kept, 1,217.00 refinanced.
    const { section } = show([plain(), dear(1)], { refiVendorIndex: '2', refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '5' });
    assert.deepEqual(row(section, r.keepTotal)?.slice(0, 2), [r.keepTotal, '€1,224.08']);
  });

  it('calls back with the offer chosen, as its number', () => {
    const { section, calls } = show([plain(), dear(1)]);
    fireEvent.change(which(section), { target: { value: '2' } });
    assert.deepEqual(calls.patches, [{ refiVendorIndex: '2' }]);
    assert.equal(which(section).value, '2');
  });

  it('falls back to the first offer that can be refinanced when the one asked for cannot', () => {
    // Offer A has no loan; offer B is `plain`, kept at 1,200.00.
    const { section } = show([invalid(), plain(1)], { refiVendorIndex: '1' });
    assert.deepEqual(row(section, r.keepTotal)?.slice(0, 2), [r.keepTotal, '€1,200.00']);
  });

  it('falls back the same way when the number asked for is not an offer at all', () => {
    const { section } = show([invalid(), plain(1)], { refiVendorIndex: '7' });
    assert.deepEqual(row(section, r.keepTotal)?.slice(0, 2), [r.keepTotal, '€1,200.00']);
  });

  it('takes the first offer when it is the first that can be refinanced', () => {
    const { section } = show([plain(), dear(1)], { refiVendorIndex: '' });
    assert.deepEqual(row(section, r.keepTotal)?.slice(0, 2), [r.keepTotal, '€1,200.00']);
  });

  it('passes over a loan that is never paid off: it has no remaining cost to set a new loan against', () => {
    const { section } = show([neverPaid(), dear(1)], { refiVendorIndex: '1', refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '5' });
    assert.deepEqual(row(section, r.keepTotal)?.slice(0, 2), [r.keepTotal, '€1,224.08']);
  });

  it('passes over a result that carries an error even if it has a schedule', () => {
    const [result, other] = resultsOf([plain(), dear(1)]);
    const { section } = show([plain(), dear(1)], { refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '5' }, { results: [{ ...result, error: 'Not a loan.' }, other] });
    assert.deepEqual(row(section, r.keepTotal)?.slice(0, 2), [r.keepTotal, '€1,224.08']);
  });

  it('passes over a result with no schedule even if it carries no error', () => {
    const [result, other] = resultsOf([plain(), dear(1)]);
    const { section } = show([plain(), dear(1)], { refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '5' }, { results: [{ ...result, schedule: [] }, other] });
    assert.deepEqual(row(section, r.keepTotal)?.slice(0, 2), [r.keepTotal, '€1,224.08']);
  });

  it('says to pick a valid offer when none can be refinanced', () => {
    const { section } = show([invalid(), invalid(1)], { refiVendorIndex: '2' });
    assert.equal(section.querySelector('p.lc-deltaEmpty')?.textContent, r.empty);
    assert.equal(section.querySelectorAll('.lc-refiResults, p.lc-error').length, 0);
  });
});

describe('what refinancing comes to', () => {
  it('compares the two totals and says what refinancing costs more, at a size they share', () => {
    // 600.00 left at month 6, over 12 months at 0%, with 100.00 of closing costs.
    const { section } = show([plain()], { refiNewFeeMajor: '100' });
    assert.deepEqual(rows(section).map((cells) => cells.slice(0, 2)), [
      [r.keepTotal, '€1,200.00'],
      [r.refiTotal, '€1,300.00'],
      [r.costsMore, '€100.00'],
      [r.breakEven, '2 mo'],
    ]);
    assert.equal(section.querySelectorAll('.lc-resultRowEmphasized').length, 1);
    assert.equal(section.querySelector('.lc-resultRowEmphasized dt')?.textContent, r.costsMore);
  });

  it('says what refinancing saves, and a saving of nothing as a saving', () => {
    // `dear` at month 1 into 0% over 3 months: 5.00 of costs leaves 7.08 saved.
    const saved = show([dear()], { refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '5' }).section;
    assert.deepEqual(row(saved, r.saves)?.slice(0, 2), [r.saves, '€7.08']);
    cleanup();
    const even = show([plain()]).section;
    assert.deepEqual(row(even, r.saves)?.slice(0, 2), [r.saves, '€0.00']);
    assert.equal(row(even, r.costsMore), undefined);
  });

  it('reads the new rate as a percentage', () => {
    // 600.00 over 12 months at 1% a year costs 3.26 of interest.
    const { section } = show([plain()], { refiNewRatePct: '1' });
    assert.deepEqual(row(section, r.refiTotal)?.slice(0, 2), [r.refiTotal, '€1,203.26']);
  });

  it('counts no closing costs while the box is empty', () => {
    const { section } = show([plain()], { refiNewFeeMajor: '' });
    assert.deepEqual(row(section, r.refiTotal)?.slice(0, 2), [r.refiTotal, '€1,200.00']);
  });

  it('writes the amounts in the currency chosen', () => {
    const { section } = show([plain()], { refiNewFeeMajor: '100' }, { currency: 'USD' });
    assert.deepEqual(row(section, r.costsMore)?.slice(0, 2), [r.costsMore, '$100.00 USD']);
  });

  it('shows the early repayment penalty as a row of its own, with what it means', () => {
    // 2% of the 600.00 left is 12.00.
    const { section } = show([withPenalty(12)]);
    assert.deepEqual(row(section, r.penalty), [r.penalty, '€12.00', r.penaltyHint]);
    assert.deepEqual(rows(section).map(([label]) => label), [r.keepTotal, r.refiTotal, r.penalty, r.costsMore, r.breakEven]);
  });

  it('has no penalty row once the penalty no longer applies', () => {
    const { section } = show([withPenalty(5)]);
    assert.equal(row(section, r.penalty), undefined);
  });

  it('says the extra payments continue on the new loan, under the refinance total', () => {
    const carried = show([withExtra()], { refiAtMonth: '1' }).section;
    assert.deepEqual(row(carried, r.refiTotal), [r.refiTotal, '€1,200.00', r.extrasCarried]);
    cleanup();
    const none = show([plain()]).section;
    assert.deepEqual(row(none, r.refiTotal), [r.refiTotal, '€1,200.00']);
  });
});

describe('the time to break even', () => {
  it('counts the months until the lower payments have covered costs paid in cash', () => {
    const { section } = show([long()], { refiAtMonth: '60', refiNewTermMonths: '80', refiNewFeeMajor: '350' });
    assert.deepEqual(row(section, r.breakEven)?.slice(0, 3), [r.breakEven, '1 yr 2 mo', r.breakEvenHint]);
  });

  it('says never when the lower payments never cover the costs paid in cash', () => {
    const { section } = show([dear()], { refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '300' });
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, s.results.never, r.breakEvenNever]);
  });

  it('counts the larger balance when the closing costs went into the new loan', () => {
    // `dear` at month 1 into 0% over 3 months, with 5.00 put into the loan: it still saves 7.08.
    const { section } = show([dear()], { refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '5', refiRollFee: true });
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, '1 mo', r.breakEvenBalanceHint]);
  });

  it('says never when the extra owed on the new loan is never outweighed', () => {
    const { section } = show([plain()], { refiNewFeeMajor: '60', refiRollFee: true });
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, s.results.never, r.breakEvenBalanceNever]);
  });

  it('is the first month when nothing is paid to refinance and the payment is lower', () => {
    const { section } = show([plain()]);
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, r.fromFirstMonth, r.fromFirstMonthHint]);
  });

  it('is nothing to recoup when nothing is paid to refinance and the payment is not lower', () => {
    const { section } = show([plain()], { refiNewTermMonths: '6' });
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, r.nothingToRecoup, r.nothingToRecoupHint]);
  });
});

describe('the note that a refinance can break even and still cost more', () => {
  it('is said for costs in cash on a loan that ends later', () => {
    // Over 12 months the new loan ends at month 18, after the current one's 12.
    const { section } = show([plain()], { refiNewFeeMajor: '100' });
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, '2 mo', r.breakEvenHint, r.breakEvenLongerTerm]);
  });

  it('is said in its own words for costs put into a loan that ends later', () => {
    // 12,000.00 at 12% over 5 years, refinanced at month 1 into 9% over 10 years.
    const { section } = show([stretched()], { refiAtMonth: '1', refiNewRatePct: '9', refiNewTermMonths: '120', refiNewFeeMajor: '10', refiRollFee: true });
    assert.equal(row(section, r.costsMore)?.[0], r.costsMore);
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, '1 mo', r.breakEvenBalanceHint, r.breakEvenBalanceLongerTerm]);
  });

  it('is not said when the refinance saves', () => {
    const { section } = show([dear()], { refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '5' });
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, '1 mo', r.breakEvenHint]);
  });

  it('is not said when the refinance comes out even', () => {
    // `dear` at month 1 into 0% over 3 months: 12.08 of costs is exactly the interest saved.
    const { section } = show([dear()], { refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '12.08' });
    assert.deepEqual(row(section, r.saves)?.slice(0, 2), [r.saves, '€0.00']);
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, '1 mo', r.breakEvenHint]);
  });

  it('is not said when the new loan does not end later', () => {
    // The 250.00 extra each month continues on the new loan, which ends with the current one.
    const { section } = show([withExtra()], { refiAtMonth: '1', refiNewFeeMajor: '10' });
    assert.deepEqual(row(section, r.costsMore)?.slice(0, 2), [r.costsMore, '€10.00']);
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, '1 mo', r.breakEvenHint]);
  });

  it('is not said when it never breaks even', () => {
    const { section } = show([dear()], { refiAtMonth: '1', refiNewTermMonths: '3', refiNewFeeMajor: '300' });
    assert.equal(row(section, r.breakEven)?.length, 3);
  });

  it('is not said when there is nothing to break even on', () => {
    // At 1% the refinance costs 3.26 more and the new loan ends later, but nothing was paid to refinance.
    const { section } = show([plain()], { refiNewRatePct: '1' });
    assert.deepEqual(row(section, r.breakEven), [r.breakEven, r.fromFirstMonth, r.fromFirstMonthHint]);
  });
});

describe('a refinance the engine refuses', () => {
  it('says why in an alert, in place of the results', () => {
    // Month 12 of a 12-month loan: nothing is left to refinance.
    const { section } = show([plain()], { refiAtMonth: '12' });
    const alert = section.querySelector('p.lc-error') as HTMLElement;
    assert.equal(alert.getAttribute('role'), 'alert');
    assert.equal(alert.textContent, 'Error: Refinance month must be before the original loan ends.');
    assert.equal(section.querySelectorAll('.lc-refiResults, p.lc-deltaEmpty').length, 0);
  });
});

describe('a box that cannot be read', () => {
  const boxes: [keyof GlobalState, (section: HTMLElement) => HTMLInputElement][] = [
    ['refiAtMonth', atMonth],
    ['refiNewRatePct', rate],
    ['refiNewTermMonths', term],
    ['refiNewFeeMajor', fee],
  ];

  for (const [key, box] of boxes) {
    it(`shows an error in place of the results, and marks only that box as the cause (${key})`, () => {
      const { section } = show([plain()], { [key]: 'abc' });
      const alert = section.querySelector('p.lc-error') as HTMLElement;
      assert.equal(alert.getAttribute('role'), 'alert');
      assert.ok(alert.id !== '');
      assert.equal(box(section).getAttribute('aria-invalid'), 'true');
      assert.equal(box(section).getAttribute('aria-describedby'), alert.id);
      for (const [, other] of boxes.filter(([k]) => k !== key)) {
        assert.ok(!other(section).hasAttribute('aria-invalid'));
        assert.ok(!other(section).hasAttribute('aria-describedby'));
      }
      assert.equal(section.querySelectorAll('.lc-refiResults, p.lc-deltaEmpty').length, 0);
    });
  }

  const alone = { refiAtMonth: s.refi.requiredMonth, refiNewRatePct: s.refi.requiredRate, refiNewTermMonths: s.refi.requiredTerm } as Record<string, string>;
  for (const [key, box] of boxes.slice(0, 3)) {
    it(`flags a required box left empty, names it, and holds the scenario back (#823) (${key})`, () => {
      const { section } = show([plain()], { [key]: '' });
      const alert = section.querySelector('p.lc-error') as HTMLElement;
      assert.equal(alert.getAttribute('role'), 'alert');
      assert.equal(alert.textContent, `Error: ${alone[key]}`);
      assert.equal(box(section).getAttribute('aria-invalid'), 'true');
      assert.equal(box(section).getAttribute('aria-describedby'), alert.id);
      for (const [, other] of boxes.filter(([k]) => k !== key)) assert.ok(!other(section).hasAttribute('aria-invalid'));
      assert.equal(section.querySelectorAll('.lc-refiResults, p.lc-deltaEmpty').length, 0);
    });
  }

  it('names two or more empty boxes together', () => {
    const { section } = show([plain()], { refiAtMonth: '', refiNewTermMonths: '' });
    assert.equal(section.querySelector('p.lc-error')?.textContent, `Error: ${s.refi.required}`);
  });

  it('says a box that cannot be read before an empty one', () => {
    const { section } = show([plain()], { refiAtMonth: '', refiNewRatePct: 'abc' });
    assert.notEqual(section.querySelector('p.lc-error')?.textContent, `Error: ${s.refi.required}`);
  });

  it('marks no box while every box can be read', () => {
    const { section } = show([plain()]);
    for (const [, box] of boxes) {
      assert.ok(!box(section).hasAttribute('aria-invalid'));
      assert.ok(!box(section).hasAttribute('aria-describedby'));
    }
  });

  it('says a value that arrived with the page could not be read', () => {
    const { section } = show([plain()], { refiAtMonth: 'abc' });
    assert.equal(section.querySelector('p.lc-error')?.textContent, 'Error: This value could not be read. Enter it again.');
  });

  it('says what to do about a value the reader has just typed', () => {
    const { section, calls } = show([plain()]);
    typeInto(rate(section), 'four');
    assert.deepEqual(calls.patches, [{ refiNewRatePct: 'NaN' }]);
    assert.equal(section.querySelector('p.lc-error')?.textContent, `Error: ${UNREADABLE}`);
  });

  it('shows the results again once the box holds a number', () => {
    const { section } = show([plain()], { refiNewFeeMajor: 'abc' });
    typeInto(fee(section), '100');
    assert.equal(section.querySelectorAll('p.lc-error').length, 0);
    assert.ok(!fee(section).hasAttribute('aria-invalid'));
    assert.deepEqual(row(section, r.costsMore)?.slice(0, 2), [r.costsMore, '€100.00']);
  });
});

describe('what the boxes call back with', () => {
  it('calls back with each box under its own name, and the results follow', () => {
    const { section, calls } = show([plain()]);
    typeInto(atMonth(section), '3');
    typeInto(rate(section), '1');
    typeInto(term(section), '9');
    typeInto(fee(section), '20');
    fireEvent.click(roll(section));
    assert.deepEqual(calls.patches, [
      { refiAtMonth: '3' },
      { refiNewRatePct: '1' },
      { refiNewTermMonths: '9' },
      { refiNewFeeMajor: '20' },
      { refiRollFee: true },
    ]);
    assert.equal(roll(section).checked, true);
    assert.equal(rows(section).length, 4);
  });
});

describe('the sentence handed to the announcement', () => {
  it('is the outcome of the scenario, and is taken back when the section closes', () => {
    const { calls, unmount } = show([plain()], { refiNewFeeMajor: '100' });
    assert.equal(calls.said.at(-1), 'Refinancing costs €100.00 more in total. Time to break even: 2 months.');
    unmount();
    assert.equal(calls.said.at(-1), undefined);
  });

  it('follows the boxes as they change', () => {
    const { section, calls } = show([plain()], { refiNewFeeMajor: '100' });
    typeInto(fee(section), '');
    assert.equal(calls.said.at(-1), 'Refinancing saves €0.00 in total. Time to break even: From the first month.');
  });

  it('is taken back from a receiver the page has replaced, and handed to the new one', () => {
    const vendors = [plain()];
    const results = resultsOf(vendors);
    const first: (string | undefined)[] = [];
    const second: (string | undefined)[] = [];
    const mount = (onSaid: (text: string | undefined) => void) => (
      <RefinanceSection vendors={vendors} results={results} currency="EUR" state={scenario({ refiNewFeeMajor: '100' })} onChange={() => {}} onSaid={onSaid} strings={s} />
    );
    const view = render(mount((text) => { first.push(text); }));
    view.rerender(mount((text) => { second.push(text); }));
    const sentence = 'Refinancing costs €100.00 more in total. Time to break even: 2 months.';
    assert.deepEqual(first, [sentence, undefined]);
    assert.deepEqual(second, [sentence]);
  });

  it('is empty while there is nothing to compare', () => {
    const { calls } = show([invalid()]);
    assert.deepEqual(calls.said, ['']);
  });
});

describe('the event sent when the scenario changes', () => {
  const changed = (field: string) => ['free_loan_comparison_refi_changed', { field }];

  it('is sent once the change has stood for 600 ms, and names only the box that changed', () => {
    const { section } = show([plain()]);
    typeInto(atMonth(section), '3');
    mock.timers.tick(599);
    assert.deepEqual(sent, []);
    mock.timers.tick(1);
    assert.deepEqual(sent, [changed('refiAtMonth')]);
  });

  it('names each box, the offer picked and the closing costs choice', () => {
    const { section } = show([plain(), dear(1)]);
    const steps: [() => void, string][] = [
      [() => fireEvent.change(which(section), { target: { value: '2' } }), 'refiVendorIndex'],
      [() => typeInto(atMonth(section), '2'), 'refiAtMonth'],
      [() => typeInto(rate(section), '1'), 'refiNewRatePct'],
      [() => typeInto(term(section), '9'), 'refiNewTermMonths'],
      [() => typeInto(fee(section), '20'), 'refiNewFeeMajor'],
      [() => fireEvent.click(roll(section)), 'refiRollFee'],
    ];
    for (const [step] of steps) {
      step();
      mock.timers.tick(600);
    }
    assert.deepEqual(sent, steps.map(([, name]) => changed(name)));
  });

  it('is sent once for a run of changes, 600 ms after the last, naming the last box', () => {
    const { section } = show([plain()]);
    typeInto(atMonth(section), '3');
    mock.timers.tick(400);
    typeInto(term(section), '9');
    mock.timers.tick(400);
    assert.deepEqual(sent, []);
    mock.timers.tick(200);
    assert.deepEqual(sent, [changed('refiNewTermMonths')]);
    mock.timers.tick(5_000);
    assert.equal(sent.length, 1);
  });

  it('is not sent once the section has closed', () => {
    const { section, unmount } = show([plain()]);
    typeInto(atMonth(section), '3');
    unmount();
    mock.timers.tick(600);
    assert.deepEqual(sent, []);
  });

  it('is not sent for nothing typed', () => {
    show([plain()]);
    mock.timers.tick(5_000);
    assert.deepEqual(sent, []);
  });
});
