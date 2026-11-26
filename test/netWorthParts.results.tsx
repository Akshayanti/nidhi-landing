/**
 * The net worth calculator's rows and results (the row a reader types in, the
 * results panel and its announcement, the sentence under each currency, the
 * printed report), for their own tests
 * (src/components/NetWorthParts.*.dom.test.tsx): the strings and the
 * page-wide settings the calculator gives them, and holdings small enough to
 * add up on paper. Not a test file.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 *
 * Importing it clears the page after every test and records analytics in
 * `events`.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { multiCurrencyNetWorthEn } from '../src/i18n/strings/tools/multiCurrencyNetWorth.ts';
import { exportEn } from '../src/i18n/strings/tools/export.ts';
import { aggregate, type AggregationResult, type AssetRow, type AssetType } from '../src/utils/multi-currency-net-worth/math.ts';
import { AmountLocaleContext } from '../src/components/useMoney.ts';
import { NumberLocaleContext } from '../src/components/LocaleNumberInput.tsx';
import { ErrorLeadContext, UnreadableContext } from '../src/components/toolShared.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { multiCurrencyNetWorth: multiCurrencyNetWorthEn, export: exportEn },
};

export const t = TOOL_STRINGS.en;
export const island = t.multiCurrencyNetWorth.island;

/** Units of each currency that one euro buys. */
export const RATES: Record<string, number> = { EUR: 1, USD: 2, JPY: 200, CZK: 25 };

/** The sign the results write before a negative amount or share. */
export const MINUS = String.fromCodePoint(0x2212);

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

/** A part inside the settings the calculator wraps its parts in. */
export function framed(part: ReactNode, style: Style = {}) {
  return (
    <NumberLocaleContext.Provider value={style.numberLocale ?? 'en'}>
      <AmountLocaleContext.Provider value={style.amountLocale ?? null}>
        <ErrorLeadContext.Provider value={t.export.fieldError}>
          <UnreadableContext.Provider value={t.export.fieldUnreadable}>
            {part}
          </UnreadableContext.Provider>
        </ErrorLeadContext.Provider>
      </AmountLocaleContext.Provider>
    </NumberLocaleContext.Provider>
  );
}

/** Draws a part inside those settings. */
export const draw = (part: ReactNode, style: Style = {}) => render(framed(part, style));

/** Something owned, as a row holds it. */
export const own = (value: string, currency = 'EUR', name = ''): AssetRow => ({ name, value, currency, type: 'asset' as AssetType });
/** Something owed. */
export const owe = (value: string, currency = 'EUR', name = ''): AssetRow => ({ name, value, currency, type: 'liability' as AssetType });

/** The rows worked out for real, in euros unless said, at the round rates unless said. */
export const worked = (rows: AssetRow[], currency = 'EUR', rates: Record<string, number> | null = RATES): AggregationResult => aggregate(rows, currency, rates);

/**
 * A result as a link without amounts gives it: every amount gone, the shares
 * and bands kept, and no rates to speak of.
 */
export const withoutAmounts = (result: AggregationResult): AggregationResult => ({
  ...result,
  positions: result.positions.map((p) => ({ ...p, netAmountOriginal: 0, netAmountFunctional: 0 })),
  totalNetWorthFunctional: 0,
  hasRates: 'none',
});

/** The position in `code`, or a failure that says which are there. */
export function position(result: AggregationResult, code: string) {
  const found = result.positions.find((p) => p.code === code);
  if (!found) throw new Error(`no ${code} among ${result.positions.map((p) => p.code).join(', ')}`);
  return found;
}

export const text = (selector: string, within: ParentNode = document) => [...within.querySelectorAll(selector)].map((el) => el.textContent ?? '');
export const one = (selector: string, within: ParentNode = document) => {
  const el = within.querySelector(selector);
  if (!el) throw new Error(`no ${selector}`);
  return el as HTMLElement;
};
/**
 * Nothing on the page matches. A count, not the element compared with null:
 * a failed comparison would describe the whole element, which takes minutes.
 */
export const none = (selector: string, why?: string) => assert.equal(document.querySelectorAll(selector).length, 0, why ?? `there is a ${selector}`);
