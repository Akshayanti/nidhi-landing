/**
 * How a chart writes amounts, which is not how a sentence writes them.
 *
 * A sentence gives an amount in full (`formatAmount`). A chart has an axis of
 * four or five gridlines and a few labels standing by themselves, and little
 * room for either, so it writes them two ways:
 *
 * - **The axis** names its currency and its scale once, in a heading above the
 *   chart ("Amounts in thousands of €"), and puts bare numbers on the
 *   gridlines ("250", "500"). One scale for the whole axis, chosen from its
 *   largest value, so no gridline is read against the wrong word.
 * - **A label that stands alone** (the end of a line, a bar) carries its own
 *   unit in the page's own short words: "₹18.7 लाख", "547 mil €",
 *   "1,5 mil. Kč", "€2.16M". The words come from the catalog (`chart.short`).
 *
 * The scale follows the number style the page already uses for that amount
 * (`amountStyle`), so it never contradicts the figures beside it: a page with
 * its own amount style (Spanish, Czech) counts every currency in thousands,
 * millions and thousand millions; the others count rupees in thousands, lakhs
 * and crores. Every other currency is counted the western way in English, and
 * in lakhs and crores too on a page whose own numbers are grouped the Indian
 * way (Hindi and Marathi, `PROSE_NUMBER_LOCALE`; the owner's choice, #678):
 * "€18.7 लाख", never "€1.87M".
 */
import { amountFormat, amountNumberLocale, amountStyle, sharedSigns, shownNumber } from './money.ts';

export type AmountScale = 'none' | 'thousand' | 'lakh' | 'crore' | 'million' | 'billion';

export const SCALE_DIVISOR: Record<AmountScale, number> = {
  none: 1,
  thousand: 1e3,
  lakh: 1e5,
  crore: 1e7,
  million: 1e6,
  billion: 1e9,
};

/** The words a chart needs, from the tools' shared catalog (`export.ts`, `chart`). */
export interface ChartWords {
  amountsIn: string;
  amountsInScale: string;
  scales: Record<Exclude<AmountScale, 'none'>, string>;
  /** What follows the number on a label that carries its own unit, as `{n}…`. */
  short: Record<Exclude<AmountScale, 'none'>, string>;
}

/**
 * Whether a chart counts this currency in lakhs and crores on this page: the
 * amount is grouped the Indian way, or the page's own numbers are
 * (`numberLocale`, the page's `PROSE_NUMBER_LOCALE`) and it has no amount
 * style of its own.
 */
function countsInLakhs(code: string, amountLocale?: string | null, numberLocale?: string | null): boolean {
  return amountStyle(code, amountLocale).locale === 'en-IN' || (!amountLocale && numberLocale === 'en-IN');
}

/**
 * The scale for an amount of this size: the largest whose unit it reaches.
 * `numberLocale` is the page's own number style, which says how it counts.
 */
export function amountScale(value: number, code: string, amountLocale?: string | null, numberLocale?: string | null): AmountScale {
  const abs = Math.abs(value);
  if (!Number.isFinite(abs) || abs < 1e3) return 'none';
  if (countsInLakhs(code, amountLocale, numberLocale)) return abs >= 1e7 ? 'crore' : abs >= 1e5 ? 'lakh' : 'thousand';
  return abs >= 1e9 ? 'billion' : abs >= 1e6 ? 'million' : 'thousand';
}

/** The currency as the page writes it beside a figure: "€", "Kč", "₹", "US$". */
export function currencyMark(code: string, amountLocale?: string | null): string {
  const { locale, display } = amountStyle(code, amountLocale);
  const parts = sharedSigns(new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: display }).formatToParts(1));
  return parts.find((p) => p.type === 'currency')?.value ?? code;
}

/** The heading over a chart whose axis is on `scale`: "Amounts in thousands of €". */
export function axisHeading(words: ChartWords, scale: AmountScale, code: string, amountLocale?: string | null): string {
  const currency = currencyMark(code, amountLocale);
  if (scale === 'none') return words.amountsIn.replace('{currency}', currency);
  return words.amountsInScale.replace('{scale}', words.scales[scale]).replace('{currency}', currency);
}

/** A gridline's figure on an axis whose heading names `scale`: a bare number. */
export function axisTick(value: number, scale: AmountScale, code: string, amountLocale?: string | null): string {
  const locale = amountNumberLocale(code, amountLocale);
  const v = value / SCALE_DIVISOR[scale];
  // Up to two decimals, so neighbouring gridlines never round to one figure
  // ("0.25", "0.5", "0.75"), and none that are not needed. Rounded first, so
  // a figure that rounds to nothing is "0" and never "-0" (#888).
  return sharedSigns(new Intl.NumberFormat(locale).formatToParts(shownNumber(v, 2))).map((p) => p.value).join('');
}

/**
 * Whether an amount that is not zero would be written as zero by `write`
 * ("0" for 4 Kč on a chart counted in thousands). A chart leaves such a label
 * off rather than say nothing was paid: the table beside it has the figure.
 */
export function readsAsZero(value: number, write: (v: number) => string): boolean {
  return value !== 0 && write(value) === write(0);
}

/**
 * An amount on a label that carries its own unit, to three significant
 * digits: "€547K", "₹18.7 लाख", "547 mil €", "1,5 mil. Kč". The number and
 * the currency keep the page's own order and separators; only the word after
 * the number comes from the catalog.
 */
export function chartLabel(value: number, code: string, words: ChartWords, amountLocale?: string | null, numberLocale?: string | null): string {
  const { locale, display } = amountStyle(code, amountLocale);
  // Rounded to the three digits it is written with before its unit is chosen,
  // so 999,600 reads "1M" and never "1,000K".
  // Less than half a unit below zero is "€0", never "-€0" (#888).
  const v = Math.abs(value) >= 999.5 ? Number(value.toPrecision(3)) : Math.round(value) + 0;
  let scale = amountScale(v, code, amountLocale, numberLocale);
  const currency = { style: 'currency', currency: code, currencyDisplay: display } as const;
  if (scale === 'none') return amountFormat(code, amountLocale, { ...currency, maximumFractionDigits: 0 }).format(v);
  let digits: Intl.NumberFormatOptions = { maximumSignificantDigits: 3 };
  // A Spanish reader takes "B" for billón, a million millions, so a thousand
  // million is written in millions: "2.500 M €".
  if (scale === 'billion' && amountLocale?.startsWith('es')) {
    scale = 'million';
    // Grouped even at four digits, which Spanish otherwise leaves bare ("2160").
    digits = { maximumFractionDigits: 0, useGrouping: 'always' };
  }
  const suffix = words.short[scale].replace('{n}', '');
  const parts = amountFormat(code, amountLocale, { ...currency, ...digits }).formatToParts(v / SCALE_DIVISOR[scale]);
  // Stryker disable next-line UnaryOperator: an amount with a scale is a finite number of a thousand or more, so it has digits and this starting value is always replaced
  let lastNumeric = -1;
  parts.forEach((p, i) => {
    // The figure ends in digits: a grouping or decimal mark always has some after it.
    if (p.type === 'integer' || p.type === 'fraction') lastNumeric = i;
  });
  return parts.map((p, i) => p.value + (i === lastNumeric ? suffix : '')).join('');
}
