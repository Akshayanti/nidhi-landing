/**
 * The lesson each launch item on "What's changed" waits for, by the item's
 * key in `LAUNCH_ITEMS` (src/i18n/strings/changes.ts). A launch item is dated
 * with its lesson's publication day (src/utils/liveChanges.ts).
 *
 * Kept free of `astro:content`, so astro.config.mjs can read it too: the
 * sitemap dates /changes/ by its newest day, and a launch can be that day
 * (#708).
 */
export const LAUNCH_HOST_SLUGS = {
  investOrPayOff: 'invest-or-pay-off-debt',
} as const;
