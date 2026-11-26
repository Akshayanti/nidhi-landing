/**
 * The Monte Carlo simulator's parts that put a result into words (the number
 * box, the quick answer, the results panel, the printed report), for their
 * own tests (src/components/MonteCarloParts.*.dom.test.tsx): the strings and
 * the page-wide settings the simulator gives them, and plans worked out for
 * real over a few paths. Not a test file.
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
import { DEFAULTS, type ToolState } from '../src/utils/monte-carlo/url.ts';
import { roundedResult, simulate } from '../src/utils/monte-carlo/math.ts';
import { formatAmount as formatAmountIn } from '../src/utils/shared/formatAmount.ts';
import { AmountLocaleContext } from '../src/components/useMoney.ts';
import { ChartWordsContext } from '../src/components/ChartAmounts.tsx';
import { NumberLocaleContext } from '../src/components/LocaleNumberInput.tsx';
import { ErrorLeadContext, UnreadableContext } from '../src/components/toolShared.tsx';

export const t = dict('en').tools;
export const island = t.monteCarlo.island;

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

/** What a page in another language or style sets for every part. */
export type Style = Partial<{ amountLocale: string | null; numberLocale: string }>;

/** Draws a part inside the settings the simulator wraps its parts in. */
export function draw(part: ReactNode, style: Style = {}) {
  return render(
    <AmountLocaleContext.Provider value={style.amountLocale ?? null}>
      <ChartWordsContext.Provider value={t.export.chart}>
        <NumberLocaleContext.Provider value={style.numberLocale ?? 'en'}>
          <ErrorLeadContext.Provider value={t.export.fieldError}>
            <UnreadableContext.Provider value={t.export.fieldUnreadable}>
              {part}
            </UnreadableContext.Provider>
          </ErrorLeadContext.Provider>
        </NumberLocaleContext.Provider>
      </ChartWordsContext.Provider>
    </AmountLocaleContext.Provider>,
  );
}

/** A plan worked out for real, over 100 paths unless said: the plan, its result and the result as the page words it. */
export function worked(change: Partial<ToolState> = {}) {
  const state: ToolState = { ...DEFAULTS, paths: 100, ...change };
  const exact = simulate(state);
  return { state, exact, worded: roundedResult(exact) };
}

/** A plan of withdrawals only, from half a million over 30 years. */
export const drawdown = (withdrawal: number, change: Partial<ToolState> = {}) => worked({ saveYears: 0, monthly: 0, start: 500_000, withdrawal, withdrawYears: 30, ...change });

export const money = (v: number, code = 'EUR', locale: string | null = null) => formatAmountIn(v, code, false, locale);
export const text = (selector: string) => [...document.querySelectorAll(selector)].map((el) => el.textContent ?? '');
export const one = (selector: string) => {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`no ${selector}`);
  return el as HTMLElement;
};
/**
 * Nothing on the page matches. A count, not the element compared with null:
 * a failed comparison would describe the whole element, which takes minutes.
 */
export const none = (selector: string, why?: string) => assert.equal(document.querySelectorAll(selector).length, 0, why ?? `there is a ${selector}`);
