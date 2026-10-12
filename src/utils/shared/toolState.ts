/**
 * A free tool's live state, kept where the language switch can find it.
 *
 * Each tool reads a shared link's state from a window property on mount (see
 * `ToolStateGuard`). Publishing the tool's current state back into that same
 * property, every time it changes, is what lets the header's language switch
 * carry what is on screen rather than what the link said: the switch appends
 * the property after the `#` at click time, a part of the address browsers
 * never send to a server, and the tool on the other side reads it as it would
 * a share link. Nothing here touches the address, storage or analytics.
 *
 * Browser-safe and tiny on purpose: the islands import it.
 */
import type { Locale } from '../../i18n/config.ts';
import { stripLocale } from '../../i18n/url.ts';

/**
 * The currency a free tool opens in when it has no shared state, by page
 * language. This is the page's starting point only: the share-link codecs keep
 * `DEFAULT_CURRENCY` (EUR) as their baseline whatever the page, so a link with
 * no currency in it means EUR on every page and old links keep working. The
 * page component reads it and hands it to the island as a prop.
 */
export const TOOL_DEFAULT_CURRENCY: Record<Locale, string> = {
  en: 'EUR',
  hi: 'INR',
  es: 'EUR',
};

/**
 * Store the tool's current encoded state ('' for "nothing to carry").
 *
 * A tool still in its untouched starting state publishes '' (see each tool's
 * `publishableState`), so a language switch carries nothing and the page on
 * the other side opens with its own starting currency. The header's switch
 * adds no '#' at all for an empty value.
 */
export function publishToolState(globalName: string, encoded: string): void {
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>)[globalName] = encoded;
}

/**
 * Whether this visit is a language switch from the same page: the previous
 * page was this page under another locale prefix. A tool uses it to leave out
 * its "shared view opened" event, which the original share already sent, so a
 * reader flipping language is not counted as a second share.
 */
export function arrivedByLanguageSwitch(): boolean {
  if (typeof document === 'undefined' || !document.referrer) return false;
  let from: URL;
  try {
    from = new URL(document.referrer);
  } catch {
    return false;
  }
  if (from.origin !== window.location.origin) return false;
  const before = stripLocale(from.pathname);
  const now = stripLocale(window.location.pathname);
  return before.path === now.path && before.locale !== now.locale;
}
