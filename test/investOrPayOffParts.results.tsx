/**
 * The invest or pay off calculator's small parts (the results, the range
 * chart, a field), for their own tests
 * (src/components/InvestOrPayOffParts.*.dom.test.tsx): the strings and the
 * page-wide settings the calculator gives them, and results small enough to
 * read on paper. Not a test file.
 *
 * Importing it clears the page after every test and records analytics in
 * `events`.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { dict } from '../src/i18n/index.ts';
import type { Result } from '../src/utils/invest-or-pay-off/math.ts';
import { AmountLocaleContext } from '../src/components/useMoney.ts';
import { ErrorLeadContext, UnreadableContext } from '../src/components/toolShared.tsx';

export const t = dict('en').tools;
export const island = t.investOrPayOff.island;

/** Analytics as the page would send them, recorded. */
export const events: Array<[string, Record<string, unknown> | undefined]> = [];
const w = window as unknown as Record<string, unknown>;

beforeEach(() => {
  events.length = 0;
  w.posthog = { capture: (event: string, properties?: Record<string, unknown>) => events.push([event, properties]) };
});
afterEach(() => {
  cleanup();
  delete w.posthog;
});
// The window going takes any timer left along, so the run ends when the tests do.
after(() => window.close());

/** A part inside the settings the calculator wraps its parts in. */
export function framed(part: ReactNode) {
  return (
    <AmountLocaleContext.Provider value={null}>
      <ErrorLeadContext.Provider value={t.export.fieldError}>
        <UnreadableContext.Provider value={t.export.fieldUnreadable}>
          {part}
        </UnreadableContext.Provider>
      </ErrorLeadContext.Provider>
    </AmountLocaleContext.Provider>
  );
}

/** Draws a part inside those settings. */
export const draw = (part: ReactNode) => render(framed(part));

/** Amounts written plainly, so a test can read them back: "€1200", "€-400". */
export const money = (v: number) => `€${v}`;

/**
 * A result whose figures wordedResult keeps as they are with 10,000 paths:
 * investing pays the debt later and still owes 7000 on the date.
 */
export const result = (over: Partial<Result> = {}): Result => ({
  payoffMonthA: 33,
  payoffMonthB: 52,
  months: 33,
  a: { p10: 100, p50: 200, p90: 300 },
  b: { p10: 50, p50: 250, p90: 900 },
  diff: { p10: -400, p50: 100, p90: 700 },
  bAhead: 0.5416,
  interestA: 1500,
  interestB: 2700,
  interestAvoided: 1200,
  interestAvoidedToday: 1150,
  interestAvoidedTodayAtEnd: 1100,
  remainingB: 7000,
  paths: 10_000,
  ...over,
});

export const text = (selector: string, within: ParentNode = document) => [...within.querySelectorAll(selector)].map((el) => el.textContent ?? '');
export const one = (selector: string, within: ParentNode = document) => {
  const el = within.querySelector(selector);
  if (!el) throw new Error(`no ${selector}`);
  return el as HTMLElement;
};
/** Nothing on the page matches. A count, so a failure does not describe the whole page. */
export const none = (selector: string, why?: string) => assert.equal(document.querySelectorAll(selector).length, 0, why ?? `there is a ${selector}`);

/** No recorded event carries any of these typed figures, in any property. */
export function sentNone(...figures: Array<string | number>) {
  const sent = JSON.stringify(events);
  for (const f of figures) assert.ok(!sent.includes(String(f)), `an event carries ${f}`);
}
