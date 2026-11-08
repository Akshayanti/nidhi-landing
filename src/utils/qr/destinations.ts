/**
 * What the QR maker at /studio/qr/ can point at, and how it builds the link.
 *
 * Browser-safe on purpose (no catalog, no content collections): the page's
 * script imports it. Every path here exists in every language under its locale
 * prefix; `destinations.test.ts` checks each one against the page files, so
 * the list cannot offer an address that does not exist. Two tools launch with
 * a lesson and are offered only once released (`gate`), decided at build time
 * by the page.
 */

export const SITE_ORIGIN = 'https://nidhi.today';

export interface Destination {
  /** Site-absolute path without a locale prefix, with its trailing slash. */
  path: string;
  label: string;
  gate?: 'monteCarlo' | 'investOrPayOff';
}

export const DESTINATIONS: readonly Destination[] = [
  { path: '/', label: 'Home' },
  { path: '/free/', label: 'Free tools' },
  { path: '/free/loan-comparison/', label: 'Loan comparison' },
  { path: '/free/multi-currency-net-worth/', label: 'Net worth calculator' },
  { path: '/free/monte-carlo-simulator/', label: 'Monte Carlo simulator', gate: 'monteCarlo' },
  { path: '/free/inflation-calculator/', label: 'Inflation calculator' },
  { path: '/free/invest-or-pay-off/', label: 'Invest or pay off', gate: 'investOrPayOff' },
  { path: '/blog/', label: 'Learning path' },
  { path: '/about/', label: 'About' },
  { path: '/volunteers/', label: 'Volunteers' },
  { path: '/beta/', label: 'Planner beta' },
  { path: '/changes/', label: "What's changed" },
];

/**
 * A UTM value as it goes into the link: lowercase, spaces and dots to hyphens,
 * only a to z, 0 to 9, hyphen and underscore, no hyphens at the ends, at most
 * 60 characters. The field keeps what was typed; this is shown beside it.
 */
export function normaliseUtm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s.]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 60)
    .replace(/[-_]+$/g, '');
}

export interface LinkInput {
  /** '' for English, otherwise the locale prefix without slashes ('hi'). */
  prefix: string;
  path: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
}

/**
 * The campaign field starts as this, a reminder rather than a value: no code
 * is made until it is replaced with the event's own name (owner, Nov 8, 2026).
 */
export const PLACEHOLDER_CAMPAIGN = 'tba';

/** Defaults for the other fields (owner, Nov 8, 2026). */
export const DEFAULT_SOURCE = 'event';
export const DEFAULT_MEDIUM = 'social_in_person';
export const DEFAULT_CONTENT = 'qr';

/**
 * The tagged link, or null while the campaign is empty after normalising or
 * still the placeholder.
 * Empty source, medium or content are left out rather than sent blank.
 */
export function buildLink(input: LinkInput): string | null {
  const campaign = normaliseUtm(input.campaign);
  if (!campaign || campaign === PLACEHOLDER_CAMPAIGN) return null;
  const params: [string, string][] = [
    ['utm_source', normaliseUtm(input.source)],
    ['utm_medium', normaliseUtm(input.medium)],
    ['utm_campaign', campaign],
    ['utm_content', normaliseUtm(input.content)],
  ];
  const query = params
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const prefix = input.prefix ? `/${input.prefix}` : '';
  return `${SITE_ORIGIN}${prefix}${input.path}?${query}`;
}

/** A file name from normalised values only: nidhi-qr-<campaign>-<locale>.<ext>. */
export function fileName(campaign: string, locale: string, ext: 'svg' | 'png'): string {
  return `nidhi-qr-${normaliseUtm(campaign)}-${normaliseUtm(locale)}.${ext}`;
}
