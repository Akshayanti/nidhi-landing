/**
 * The inflation calculator's parts, mounted by themselves for their tests
 * (src/components/InflationParts.*.dom.test.tsx): the settings the calculator
 * wraps them in, the ways a test reads what is drawn, and stand-ins for what
 * jsdom does not lay out (the reader's text size, the width a drawing is
 * shown at, the width of drawn text). Not a test file.
 *
 * Importing it clears the page and puts every stand-in back after each test.
 */
import './dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach } from 'node:test';
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { inflationEn } from '../src/i18n/strings/tools/inflation.ts';
import { exportEn } from '../src/i18n/strings/tools/export.ts';
import { AmountLocaleContext } from '../src/components/useMoney.ts';
import { ChartWordsContext } from '../src/components/ChartAmounts.tsx';
import { NumberLocaleContext } from '../src/components/LocaleNumberInput.tsx';
import { ErrorLeadContext, UnreadableContext } from '../src/components/toolShared.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { inflation: inflationEn, export: exportEn },
};

export const t = TOOL_STRINGS.en;
export const island = t.inflation.island;
export type Strings = typeof island;

/** Fills a catalog pattern's `{placeholders}` by hand, so a test does not lean on the page's own formatter. */
export const fill = (pattern: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), pattern);

// ---------------------------------------------------------------------------
// Stand-ins, put back after every test
// ---------------------------------------------------------------------------

const proto = window.SVGElement.prototype as unknown as Record<string, unknown>;
const real = { rect: proto.getBoundingClientRect, getBBox: proto.getBBox };

afterEach(() => {
  cleanup();
  proto.getBoundingClientRect = real.rect;
  proto.getBBox = real.getBBox;
  document.documentElement.style.fontSize = '';
});
// The window going takes any timer left along, so the run ends when the tests do.
after(() => window.close());

/**
 * The reader's text size (the root font size), with each drawing shown
 * `shown` times its own width, until the test ends. A drawing shown at its
 * own width draws one rem as `px` units.
 */
export function atTextSize(px: number, { shown = 1 } = {}) {
  document.documentElement.style.fontSize = `${px}px`;
  proto.getBoundingClientRect = function (this: SVGElement) {
    const width = Number((this.getAttribute('viewBox') ?? '0 0 0').split(' ')[2]) * shown;
    return { left: 0, top: 0, width, height: 300, right: width, bottom: 300, x: 0, y: 0, toJSON() {} } as DOMRect;
  };
}

/**
 * The width the browser draws each piece of chart text at, by the class it
 * is drawn with and its words, until the test ends. jsdom measures nothing,
 * so without this every width is the estimate from the text's length.
 */
export function textDrawnAs(width: (cls: string, words: string) => number) {
  proto.getBBox = function (this: SVGElement) {
    return { x: 0, y: 0, height: 10, width: width(this.getAttribute('class') ?? '', this.textContent ?? '') };
  };
}

/** What React complains of while `work` runs (two children it cannot tell apart, say): nothing, for a part that is drawn well. */
export function complaintsWhile(work: () => void): string[] {
  const complaints: string[] = [];
  const realError = console.error;
  console.error = (...said: unknown[]) => { complaints.push(String(said[0])); };
  try {
    work();
  } finally {
    console.error = realError;
  }
  return complaints;
}

// ---------------------------------------------------------------------------
// Mounting a part
// ---------------------------------------------------------------------------

export type Page = Partial<{ amountLocale: string | null; numberLocale: string; chartWords: typeof t.export.chart | null }>;

/** A part inside the settings the calculator wraps its parts in. */
export function inTool(node: ReactNode, page: Page = {}) {
  return (
    <AmountLocaleContext.Provider value={page.amountLocale ?? null}>
      <NumberLocaleContext.Provider value={page.numberLocale ?? 'en'}>
        <ChartWordsContext.Provider value={page.chartWords === undefined ? t.export.chart : page.chartWords}>
          <ErrorLeadContext.Provider value={t.export.fieldError}>
            <UnreadableContext.Provider value={t.export.fieldUnreadable}>
              {node}
            </UnreadableContext.Provider>
          </ErrorLeadContext.Provider>
        </ChartWordsContext.Provider>
      </NumberLocaleContext.Provider>
    </AmountLocaleContext.Provider>
  );
}

/** Draws a part as the calculator would. */
export const draw = (node: ReactNode, page: Page = {}) => render(inTool(node, page));

/** Takes the part off the page, so a test can draw another. */
export const clear = () => cleanup();

// ---------------------------------------------------------------------------
// Reading what is drawn
// ---------------------------------------------------------------------------

export const all = (selector: string) => [...document.querySelectorAll(selector)];
export const text = (selector: string) => all(selector).map((el) => el.textContent ?? '');
export const one = (selector: string) => {
  const el = document.querySelector(selector);
  assert.ok(el, `no ${selector}`);
  return el as HTMLElement;
};
export const none = (selector: string) => assert.equal(document.querySelectorAll(selector).length, 0, `${selector} is there`);
export const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
export const near = (a: number, b: number, tol = 0.051, what = '') => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} is not ${b}`);
/** To a tenth of a drawing unit, as a chart places its text. */
export const tenth = (n: number) => Math.round(n * 10) / 10;
/** A drawing's width and height, in its own units. */
export function drawing(selector: string) {
  const [, , W, H] = (one(selector).getAttribute('viewBox') ?? '').split(' ').map(Number);
  return { W, H };
}
/** The points of a drawn line, in order. */
export const pointsOf = (selector: string): Array<[number, number]> =>
  [...(one(selector).getAttribute('d') ?? '').matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
