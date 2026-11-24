/**
 * The net worth calculator's share dialog, donut chart and CSV dialog, for
 * their own tests (src/components/NetWorthParts.{ShareModal,DonutCentre,
 * ConcentrationChart,CSVConfirmDialog}.dom.test.tsx): the strings and the
 * page-wide settings the calculator gives them, holdings small enough to add
 * up on paper, and stand-ins for what jsdom does not lay out (the drawing's
 * width on screen, the reader's text size, the width of drawn text, which
 * elements are laid out, the page's fonts arriving). Not a test file.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 *
 * Importing it clears the page and puts every stand-in back after each test.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach } from 'node:test';
import { act, cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { dict } from '../src/i18n/index.ts';
import { aggregate, type AggregationResult, type AssetRow, type AssetType } from '../src/utils/multi-currency-net-worth/math.ts';
import { AmountLocaleContext } from '../src/components/useMoney.ts';
import { NumberLocaleContext } from '../src/components/LocaleNumberInput.tsx';
import { ErrorLeadContext, UnreadableContext } from '../src/components/toolShared.tsx';

export const t = dict('en').tools;
export const island = t.multiCurrencyNetWorth.island;
export const czech = dict('cs').tools.multiCurrencyNetWorth.island;
export type Strings = typeof island;

/** Units of each currency that one euro buys. */
export const RATES: Record<string, number> = { EUR: 1, USD: 2, JPY: 200, CZK: 25 };

/** Something owned, as a row holds it. */
export const own = (value: string, currency = 'EUR', name = ''): AssetRow => ({ name, value, currency, type: 'asset' as AssetType });
/** Something owed. */
export const owe = (value: string, currency = 'EUR', name = ''): AssetRow => ({ name, value, currency, type: 'liability' as AssetType });
/** The rows worked out for real, in euros unless said, at the round rates unless said. */
export const worked = (rows: AssetRow[], currency = 'EUR', rates: Record<string, number> | null = RATES): AggregationResult => aggregate(rows, currency, rates);

/** A part inside the settings the calculator wraps its parts in. */
export function framed(part: ReactNode, numberLocale = 'en') {
  return (
    <NumberLocaleContext.Provider value={numberLocale}>
      <AmountLocaleContext.Provider value={null}>
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
export const draw = (part: ReactNode, numberLocale = 'en') => render(framed(part, numberLocale));

/**
 * Draws a part and lets the page's fonts arrive, as a browser does just
 * after the first drawing: a chart measures its text then (jsdom has no
 * `document.fonts`, so one that is ready at once stands in until the test
 * ends).
 */
export async function drawSettled(part: ReactNode, numberLocale = 'en') {
  (document as unknown as Record<string, unknown>).fonts = { ready: Promise.resolve() };
  const view = render(framed(part, numberLocale));
  await act(async () => {});
  return view;
}

// ---------------------------------------------------------------------------
// Stand-ins, put back after every test
// ---------------------------------------------------------------------------

const proto = window.SVGElement.prototype as unknown as Record<string, unknown>;
const htmlProto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
const real = {
  rect: proto.getBoundingClientRect,
  getBBox: proto.getBBox,
  clientRects: htmlProto.getClientRects,
};

afterEach(() => {
  cleanup();
  proto.getBoundingClientRect = real.rect;
  proto.getBBox = real.getBBox;
  htmlProto.getClientRects = real.clientRects;
  document.documentElement.style.fontSize = '';
  delete (document as unknown as Record<string, unknown>).fonts;
});
// The window going takes any timer left along, so the run ends when the tests do.
after(() => window.close());

/**
 * The reader's text size (the root font size), with the drawing shown
 * `shown` px wide, until the test ends.
 */
export function atTextSize(px: number, shown: number) {
  document.documentElement.style.fontSize = `${px}px`;
  proto.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: shown, height: shown, right: shown, bottom: shown, x: 0, y: 0, toJSON() {} } as DOMRect;
  };
}

/** The width the browser draws each piece of chart text at, by its words and size, until the test ends. */
export function textDrawnAs(width: (words: string, size: number) => number) {
  proto.getBBox = function (this: SVGElement) {
    const size = parseFloat((this as unknown as HTMLElement).style.fontSize) || 16;
    return { x: 0, y: 0, height: size, width: width(this.textContent ?? '', size) };
  };
}

/**
 * Every element counts as laid out, as in a browser, until the test ends,
 * apart from those `hidden` picks out (as a style that hides them would).
 */
export function laidOut(hidden: (el: HTMLElement) => boolean = () => false) {
  htmlProto.getClientRects = function (this: HTMLElement) {
    return (hidden(this) ? [] : [{ width: 1, height: 1 }]) as unknown as DOMRectList;
  };
}

// ---------------------------------------------------------------------------
// Reading the page
// ---------------------------------------------------------------------------

export const all = (selector: string) => [...document.querySelectorAll(selector)];
export const text = (selector: string) => all(selector).map((el) => el.textContent ?? '');
export const one = (selector: string) => {
  const el = document.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
