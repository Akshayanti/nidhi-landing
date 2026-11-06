/**
 * The one declaration of `window.posthog`, as the islands see it.
 *
 * The snippet in `src/components/Analytics.astro` sets it up. The islands use
 * only a few of its members, all optional because analytics may be off (no
 * key, before the start date, an internal browser) and the stub then has none.
 * Declared once here: several files each declaring their own shape is a type
 * error, because global interface members must agree.
 */
export {};

declare global {
  interface Window {
    posthog?: {
      /** Sends an event. Callers pass interaction metadata only, never typed values. */
      capture?: (event: string, properties?: Record<string, unknown>) => void;
      /** True once the real library has loaded over the stub. */
      __loaded?: boolean;
      set_config?: (config: Record<string, unknown>) => void;
    };
    /** The cookie-banner answer, from consentRuntime.js (inlined by the page). */
    nidhiConsent?: {
      read: () => 'accepted' | 'declined' | null;
      save: (choice: 'accepted' | 'declined') => void;
      apply: () => boolean;
      accepted: () => boolean;
      forgetStoredAnalyticsId: () => void;
    };
  }
}
