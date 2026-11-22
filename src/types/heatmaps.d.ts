/**
 * The flag a page sets while heatmaps must stay off: the level helper on
 * /blog/ (src/components/LearnHome.astro) and the invest-or-pay-off tool.
 * Analytics.astro and consentRuntime.js read it when they turn heatmaps on.
 */
export {};

declare global {
  interface Window {
    nidhiHeatmapsPaused?: boolean;
  }
}
