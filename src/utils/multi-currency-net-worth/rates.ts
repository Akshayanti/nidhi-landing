/**
 * The exchange-rate request the net worth calculator makes, and what it
 * reports when the request fails.
 *
 * The privacy notice says the request names the spending currency and
 * nothing else, and that events carry choices, never values. Both are kept
 * here, where they can be tested without the component: the address is
 * built only for a currency the tools know, and a failure is reported as
 * one of a fixed list of reasons, never as the browser's own message
 * (which can hold an address or whatever a proxy wrote).
 */
import { CURRENCIES } from '../loan/math.ts';

export const FRANKFURTER_RATES = 'https://api.frankfurter.dev/v2/rates';

const KNOWN_CURRENCIES: ReadonlySet<string> = new Set(CURRENCIES.map((c) => c.code));

/** The address to ask for rates in `base`, or null when `base` is not one of the tools' currencies. */
export function ratesRequestUrl(base: string): string | null {
  if (!KNOWN_CURRENCIES.has(base)) return null;
  return `${FRANKFURTER_RATES}?${new URLSearchParams({ base }).toString()}`;
}

export const RATES_ERROR_REASONS = ['network', 'http_4xx', 'http_5xx', 'http_other', 'parse', 'unknown_currency', 'other'] as const;
export type RatesErrorReason = (typeof RATES_ERROR_REASONS)[number];

/** A failure of the rates request, of a known kind. */
export class RatesError extends Error {
  readonly reason: RatesErrorReason;
  constructor(reason: RatesErrorReason) {
    super(reason);
    this.reason = reason;
  }
}

/** The kind of failure an HTTP status is. */
export function httpErrorReason(status: number): RatesErrorReason {
  if (status >= 400 && status < 500) return 'http_4xx';
  if (status >= 500 && status < 600) return 'http_5xx';
  return 'http_other';
}

/**
 * Which of the fixed reasons a failure is. A failure this code raised says
 * so itself; the browser raises a TypeError when the request could not be
 * made, and a body that is not JSON raises a SyntaxError. Nothing of the
 * error's own text is used.
 */
export function ratesErrorReason(err: unknown): RatesErrorReason {
  if (err instanceof RatesError) return err.reason;
  if (err instanceof SyntaxError) return 'parse';
  if (err instanceof TypeError) return 'network';
  // The request was given up on after its time limit: no answer came.
  if (typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError') return 'network';
  return 'other';
}
