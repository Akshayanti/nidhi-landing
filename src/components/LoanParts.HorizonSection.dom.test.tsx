/**
 * The loan comparison's horizon section (`HorizonSection` in LoanCompare.tsx),
 * mounted on its own with results from the engine.
 *
 * It tells a reader where each offer stands after a number of months: how
 * much of the loan is repaid, how much interest has gone, what is still owed
 * and what has been paid out in all. Every amount is pinned against a figure
 * worked out by hand (test/loanParts.refinance.ts), along with the horizon
 * the section settles on for what was typed, the slider and the number box
 * (labels, limits, what they call back with), the error when the box cannot
 * be read, and the one event sent once a change has settled.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { dear, invalid, long, neverPaid, plain, resultsOf, withFee } from '../../test/loanParts.refinance.ts';
import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';
import { exportEn } from '../i18n/strings/tools/export.ts';
import type { LoanResult } from '../utils/loan/math.ts';
import type { VendorInput } from '../utils/loan/url.ts';
import { HorizonSection } from './LoanCompare.tsx';
import { ErrorLeadContext, UnreadableContext } from './toolShared.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
};

const s = TOOL_STRINGS.en.loanComparison.island;
const common = TOOL_STRINGS.en.export;
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
  /** Told each value the section calls back with. */
  onHorizon?: (next: string) => void;
}

/** The section over these offers, holding the horizon as the page does. */
function Held({ vendors, start, options }: { vendors: VendorInput[]; start: string; options: Options }) {
  const [horizon, setHorizon] = useState(start);
  return (
    <ErrorLeadContext.Provider value={common.fieldError}>
      <UnreadableContext.Provider value={common.fieldUnreadable}>
        <HorizonSection
          vendors={vendors}
          results={options.results ?? resultsOf(vendors)}
          currency={options.currency ?? 'EUR'}
          horizonMonths={horizon}
          onHorizonChange={(next) => {
            options.onHorizon?.(next);
            setHorizon(next);
          }}
          strings={s}
        />
      </UnreadableContext.Provider>
    </ErrorLeadContext.Provider>
  );
}

/** Mounts the section with `horizon` in its box, and hands back what a test reads. */
function show(vendors: VendorInput[], horizon: string, options: Options = {}) {
  const calls: string[] = [];
  const told = { ...options, onHorizon: options.onHorizon ?? ((next: string) => { calls.push(next); }) };
  const view = render(<Held vendors={vendors} start={horizon} options={told} />);
  const section = view.container.querySelector('section.lc-advancedSection.lc-horizonSection') as HTMLElement;
  assert.ok(section !== null, 'the section is on the page');
  return { section, calls, unmount: view.unmount };
}

const label = (section: HTMLElement) => section.querySelector('.lc-horizonControls > label.lc-fieldLabel') as HTMLLabelElement;
const slider = (section: HTMLElement) => section.querySelector('.lc-horizonControls > input.lc-horizonSlider') as HTMLInputElement;
const box = (section: HTMLElement) => section.querySelector('.lc-horizonControls > input.lc-input.lc-horizonInput') as HTMLInputElement;

/** The horizon the section settled on, as it writes it beside the label. */
const chosen = (section: HTMLElement) => label(section).querySelector('strong')?.textContent;

/** The offers named in the table's header, in order. */
const columns = (section: HTMLElement) => [...section.querySelectorAll('table.lc-deltaTable thead th')].slice(1).map((th) => th.textContent);

/** The table as read: each row's label and its amounts, one per offer. */
function table(section: HTMLElement): Record<string, string[]> {
  const rows: Record<string, string[]> = {};
  for (const tr of section.querySelectorAll('.lc-deltaTableWrap > table.lc-deltaTable tbody tr')) {
    rows[tr.querySelector('th')?.textContent ?? ''] = [...tr.querySelectorAll('td > span.amt')].map((amount) => amount.textContent ?? '');
  }
  return rows;
}

const typeInto = (input: HTMLInputElement, text: string) => fireEvent.change(input, { target: { value: text } });

describe('where each offer stands at the horizon', () => {
  it('is a section named by its heading, with a line saying what it shows', () => {
    const { section } = show([plain(), dear(1)], '2');
    const heading = section.querySelector('header > h3.lc-sectionTitle') as HTMLElement;
    assert.equal(heading.textContent, 'If I sell or refinance at...');
    assert.equal(heading.id, 'lc-horizon-h');
    assert.equal(section.getAttribute('aria-labelledby'), 'lc-horizon-h');
    assert.equal(
      section.querySelector('header > p.lc-sectionLead')?.textContent,
      'Loans look very different at month 36 vs. month 360. Each row shows where the borrower actually stands on that date.',
    );
  });

  it('shows what is repaid, the interest so far, what is left and the cash paid out, for each offer', () => {
    const { section } = show([plain(), dear(1)], '2');
    assert.deepEqual(columns(section), ['Offer A', 'Offer B']);
    assert.deepEqual(table(section), {
      // Two payments of 100.00 at 0%; 396.03 + 399.99 off the dearer loan
      // for 12.00 + 8.04 of interest, two payments of 408.03.
      'Principal repaid': ['€200.00', '€796.02'],
      'Interest paid': ['€0.00', '€20.04'],
      'Balance remaining': ['€1,000.00', '€403.98'],
      'Total cash out': ['€200.00', '€816.06'],
    });
  });

  it('follows the horizon month by month', () => {
    assert.deepEqual(table(show([plain(), dear(1)], '1').section), {
      'Principal repaid': ['€100.00', '€396.03'],
      'Interest paid': ['€0.00', '€12.00'],
      'Balance remaining': ['€1,100.00', '€803.97'],
      'Total cash out': ['€100.00', '€408.03'],
    });
  });

  it('shows a loan already paid off at the horizon as it ended', () => {
    // Month 5 of the 12-month loan; the 3-month loan ended at 1,224.08.
    assert.deepEqual(table(show([plain(), dear(1)], '5').section), {
      'Principal repaid': ['€500.00', '€1,200.00'],
      'Interest paid': ['€0.00', '€24.08'],
      'Balance remaining': ['€700.00', '€0.00'],
      'Total cash out': ['€500.00', '€1,224.08'],
    });
  });

  it('counts the fee paid at the start in the cash paid out, and nowhere else', () => {
    assert.deepEqual(table(show([withFee(), plain(1)], '5').section), {
      'Principal repaid': ['€500.00', '€500.00'],
      'Interest paid': ['€0.00', '€0.00'],
      'Balance remaining': ['€700.00', '€700.00'],
      // 500.00 of payments and the fee of 60.00.
      'Total cash out': ['€560.00', '€500.00'],
    });
  });

  it('writes the amounts in the currency chosen', () => {
    const { section } = show([plain()], '5', { results: resultsOf([plain()], 'USD'), currency: 'USD' });
    assert.deepEqual(table(section)['Balance remaining'], ['$700.00\u00a0USD']);
  });

  it('names an offer as its card does, by its typed name or its letter', () => {
    const { section } = show([{ ...plain(), name: 'My bank' }, plain(1), { ...plain(2), name: '' }], '5');
    assert.deepEqual(columns(section), ['My bank', 'Offer B', 'Offer C']);
  });

  it('labels the table for a screen reader: a named first column, a row header on every row', () => {
    const { section } = show([plain(), dear(1)], '2');
    const corner = section.querySelector('thead th') as HTMLElement;
    assert.equal(corner.getAttribute('scope'), 'col');
    assert.equal(corner.querySelector('span.lc-srOnly')?.textContent, 'Metric');
    const headers = [...section.querySelectorAll('tbody tr > th')];
    assert.deepEqual(headers.map((th) => th.textContent), ['Principal repaid', 'Interest paid', 'Balance remaining', 'Total cash out']);
    assert.deepEqual(headers.map((th) => th.getAttribute('scope')), ['row', 'row', 'row', 'row']);
  });

  it('marks the cash paid out as the row that matters most, and only that one', () => {
    const { section } = show([plain(), dear(1)], '2');
    assert.deepEqual(
      [...section.querySelectorAll('tbody tr')].map((tr) => tr.className),
      ['', '', '', 'lc-deltaRowEmphasized'],
    );
  });
});

describe('which offers have a column', () => {
  it('leaves out an offer that is not valid, and keeps the others under their own names', () => {
    const { section } = show([invalid(), plain(1)], '5');
    assert.deepEqual(columns(section), ['Offer B']);
    assert.deepEqual(table(section)['Principal repaid'], ['€500.00']);
  });

  it('says to enter valid inputs when no offer is valid', () => {
    const { section } = show([invalid(), invalid(1)], '5');
    assert.equal(section.querySelector('p.lc-deltaEmpty')?.textContent, 'Enter valid inputs to see horizon snapshots.');
    assert.equal(section.querySelectorAll('table').length, 0);
    assert.equal(section.querySelectorAll('[role="alert"]').length, 0);
  });

  it('shows the table, and no such sentence, when an offer is valid', () => {
    const { section } = show([plain(), invalid(1)], '5');
    assert.equal(section.querySelectorAll('p.lc-deltaEmpty').length, 0);
    assert.equal(section.querySelectorAll('table').length, 1);
  });

  it('leaves out a result that carries an error even if it has a schedule', () => {
    const [result] = resultsOf([plain()]);
    const { section } = show([plain(), plain(1)], '5', { results: [{ ...result, error: 'Not a loan.' }, result] });
    assert.deepEqual(columns(section), ['Offer B']);
  });

  it('leaves out a result with no schedule even if it carries no error', () => {
    const [result] = resultsOf([plain()]);
    const { section } = show([plain(), plain(1)], '5', { results: [result, { ...result, schedule: [] }] });
    assert.deepEqual(columns(section), ['Offer A']);
    assert.deepEqual(table(section)['Balance remaining'], ['€700.00']);
  });
});

describe('the horizon the section settles on', () => {
  it('writes it beside the label, as the tool writes any count of months', () => {
    const { section } = show([plain(), dear(1)], '5');
    assert.equal(label(section).textContent, 'Horizon: 5 mo');
    assert.equal(chosen(section), '5 mo');
    assert.equal(chosen(show([long()], '18').section), '1 yr 6 mo');
  });

  it('stops at the end of the longest loan', () => {
    const { section } = show([plain(), dear(1)], '60');
    assert.equal(chosen(section), '1 yr');
    assert.equal(slider(section).value, '12');
    assert.deepEqual(table(section)['Principal repaid'], ['€1,200.00', '€1,200.00']);
    // The box keeps what was typed.
    assert.equal(box(section).value, '60');
  });

  it('starts at the first month', () => {
    const { section } = show([plain(), dear(1)], '0');
    assert.equal(chosen(section), '1 mo');
    assert.equal(slider(section).value, '1');
    assert.deepEqual(table(section)['Principal repaid'], ['€100.00', '€396.03']);
  });

  it('takes a part of a month as the nearest whole month', () => {
    assert.equal(chosen(show([plain()], '2.6').section), '3 mo');
    assert.equal(chosen(show([plain()], '2.4').section), '2 mo');
  });

  it('is flagged and holds the panel back while the box is empty (#823)', () => {
    const { section } = show([long()], '');
    assert.equal(section.querySelectorAll('.lc-deltaTable').length, 0);
    const error = section.querySelector('.lc-error');
    assert.ok(error !== null);
    assert.equal(error.textContent, `Error: ${s.horizon.required}`);
    assert.equal(box(section).getAttribute('aria-invalid'), 'true');
    assert.equal(box(section).getAttribute('aria-describedby'), error.id);
    assert.equal(slider(section).getAttribute('aria-valuetext'), s.horizon.required);
  });
});

describe('the slider', () => {
  it('belongs to the label and runs from month 1 to the end of the longest valid loan, a month at a time', () => {
    const { section } = show([plain(), dear(1)], '5');
    const range = slider(section);
    assert.equal(range.type, 'range');
    assert.ok(range.id !== '' && label(section).htmlFor === range.id, 'the label is the slider\'s');
    assert.equal(range.min, '1');
    assert.equal(range.max, '12');
    assert.equal(range.step, '1');
    assert.equal(range.value, '5');
    assert.equal(slider(show([long(), plain(1)], '5').section).max, '120');
  });

  it('reads its value to a screen reader as a count of months', () => {
    assert.equal(slider(show([plain()], '5').section).getAttribute('aria-valuetext'), '5 mo');
    assert.equal(slider(show([long()], '30').section).getAttribute('aria-valuetext'), '2 yr 6 mo');
  });

  it('has one month to offer when no offer is valid', () => {
    const { section } = show([invalid(), invalid(1)], '5');
    assert.equal(slider(section).max, '1');
    assert.equal(chosen(section), '1 mo');
  });

  it('does not count the length of a result that carries an error', () => {
    const [result] = resultsOf([plain()]);
    const { section } = show([plain()], '5', { results: [{ ...result, error: 'Not a loan.' }] });
    assert.equal(slider(section).max, '1');
  });

  it('gives a loan that is never paid off the range of the other offers, not its endless schedule', () => {
    const { section } = show([neverPaid(), plain(1)], '5');
    assert.equal(slider(section).max, '12');
  });

  it('calls back with the month dragged to', () => {
    const { section, calls } = show([plain()], '5');
    fireEvent.change(slider(section), { target: { value: '7' } });
    assert.deepEqual(calls, ['7']);
    assert.equal(chosen(section), '7 mo');
    assert.deepEqual(table(section)['Balance remaining'], ['€500.00']);
  });
});

describe('the number box', () => {
  it('is named for a screen reader, holds the horizon and asks for digits', () => {
    const { section } = show([plain()], '5');
    const input = box(section);
    assert.equal(input.getAttribute('aria-label'), 'Horizon in months (text)');
    assert.equal(input.value, '5');
    assert.equal(input.type, 'text');
    assert.equal(input.getAttribute('inputmode'), 'numeric');
  });

  it('is not marked invalid, and points at no error, while it can be read', () => {
    for (const horizon of ['5', '60']) {
      const { section } = show([plain()], horizon);
      assert.ok(!box(section).hasAttribute('aria-invalid'));
      assert.ok(!box(section).hasAttribute('aria-describedby'));
      assert.equal(section.querySelectorAll('.lc-error').length, 0);
      cleanup();
    }
  });

  it('calls back with the number typed, in its plain spelling', () => {
    const { section, calls } = show([long()], '5');
    typeInto(box(section), '18');
    typeInto(box(section), '1,000');
    typeInto(box(section), '');
    assert.deepEqual(calls, ['18', '1000', '']);
  });

  it('moves the horizon as it is typed', () => {
    const { section } = show([long()], '5');
    typeInto(box(section), '18');
    assert.equal(chosen(section), '1 yr 6 mo');
    assert.equal(slider(section).value, '18');
    assert.deepEqual(table(section)['Principal repaid'], ['€1,800.00']);
  });

  it('calls back to the page as it is now, not as it was when the section was first shown', () => {
    const first: string[] = [];
    const second: string[] = [];
    const [result] = resultsOf([plain()]);
    const at = (onHorizonChange: (next: string) => void) => (
      <HorizonSection vendors={[plain()]} results={[result]} currency="EUR" horizonMonths="5" onHorizonChange={onHorizonChange} strings={s} />
    );
    const view = render(at((next) => { first.push(next); }));
    view.rerender(at((next) => { second.push(next); }));
    typeInto(view.container.querySelector('input.lc-horizonInput') as HTMLInputElement, '8');
    assert.deepEqual([first, second], [[], ['8']]);
  });
});

describe('a horizon that cannot be read', () => {
  it('shows an error in place of the table, and marks the box as the cause', () => {
    const { section } = show([plain(), dear(1)], 'abc');
    const alert = section.querySelector('p.lc-error') as HTMLElement;
    assert.equal(alert.getAttribute('role'), 'alert');
    assert.ok(alert.id !== '');
    assert.equal(box(section).getAttribute('aria-invalid'), 'true');
    assert.equal(box(section).getAttribute('aria-describedby'), alert.id);
    assert.equal(section.querySelectorAll('table').length, 0);
    assert.equal(section.querySelectorAll('p.lc-deltaEmpty').length, 0);
  });

  it('says a value that arrived with the page could not be read', () => {
    const { section } = show([plain()], 'abc');
    assert.equal(section.querySelector('p.lc-error')?.textContent, 'Error: This value could not be read. Enter it again.');
  });

  it('says what to do about a value the reader has just typed', () => {
    const { section, calls } = show([plain()], '5');
    typeInto(box(section), 'five');
    assert.deepEqual(calls, ['NaN']);
    assert.equal(section.querySelector('p.lc-error')?.textContent, `Error: ${UNREADABLE}`);
    assert.equal(box(section).getAttribute('aria-invalid'), 'true');
  });

  it('writes no horizon beside the label, and the slider says why', () => {
    const { section } = show([plain()], 'abc');
    assert.equal(label(section).textContent, 'Horizon: ');
    assert.ok(label(section).querySelector('strong') === null);
    assert.equal(slider(section).getAttribute('aria-valuetext'), UNREADABLE);
  });

  it('is as unreadable below zero', () => {
    const { section } = show([plain()], '-3');
    assert.equal(section.querySelectorAll('p.lc-error').length, 1);
    assert.equal(section.querySelectorAll('table').length, 0);
  });

  it('shows the table again once the box holds a number', () => {
    const { section } = show([plain()], 'abc');
    typeInto(box(section), '5');
    assert.equal(section.querySelectorAll('p.lc-error').length, 0);
    assert.ok(!box(section).hasAttribute('aria-invalid'));
    assert.ok(!box(section).hasAttribute('aria-describedby'));
    assert.equal(chosen(section), '5 mo');
    assert.deepEqual(table(section)['Balance remaining'], ['€700.00']);
  });
});

describe('the event sent when the horizon changes', () => {
  const CHANGED = ['free_loan_comparison_horizon_changed', undefined];

  it('is sent once the change has stood for 600 ms, and says only that the horizon changed', () => {
    const { section } = show([long()], '5');
    typeInto(box(section), '18');
    mock.timers.tick(599);
    assert.deepEqual(sent, []);
    mock.timers.tick(1);
    assert.deepEqual(sent, [CHANGED]);
  });

  it('is sent for a drag of the slider too', () => {
    const { section } = show([plain()], '5');
    fireEvent.change(slider(section), { target: { value: '7' } });
    mock.timers.tick(600);
    assert.deepEqual(sent, [CHANGED]);
  });

  it('is sent once for a run of changes, 600 ms after the last', () => {
    const { section } = show([long()], '5');
    typeInto(box(section), '1');
    mock.timers.tick(400);
    typeInto(box(section), '18');
    mock.timers.tick(400);
    assert.deepEqual(sent, []);
    mock.timers.tick(200);
    assert.deepEqual(sent, [CHANGED]);
    mock.timers.tick(5_000);
    assert.deepEqual(sent, [CHANGED]);
  });

  it('is sent again for a later change', () => {
    const { section } = show([long()], '5');
    typeInto(box(section), '18');
    mock.timers.tick(600);
    typeInto(box(section), '19');
    mock.timers.tick(600);
    assert.deepEqual(sent, [CHANGED, CHANGED]);
  });

  it('is not sent for a box left without a horizon: unreadable, empty, zero, or rounding to zero', () => {
    const { section } = show([long()], '5');
    for (const text of ['five', '', '0', '0.4']) {
      typeInto(box(section), text);
      mock.timers.tick(600);
    }
    assert.deepEqual(sent, []);
    typeInto(box(section), '0.6');
    mock.timers.tick(600);
    assert.deepEqual(sent, [CHANGED]);
  });

  it('is not sent after the section has gone', () => {
    const { section, unmount } = show([long()], '5');
    typeInto(box(section), '18');
    unmount();
    mock.timers.tick(5_000);
    assert.deepEqual(sent, []);
  });
});
