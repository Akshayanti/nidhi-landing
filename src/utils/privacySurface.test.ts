/**
 * The privacy surface, pinned.
 *
 * CLAUDE.md, "Privacy Policy is the Source of Truth", rule 2: a new or renamed
 * click label, analytics event or event property, a new browser storage key,
 * and a new third-party request each need a `material: true` entry in the
 * privacy changelog (`writtenChangelog` in src/components/pages/PrivacyPage.astro),
 * in the same change. Nothing used to check that. These snapshots make every
 * such change an explicit edit to this file, the way dependencies.test.ts does
 * for packages: when one fails, add the changelog entry (or confirm none is
 * needed: removing a label needs none), then update the snapshot here.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { scanLabels } from './analyticsLabels.ts';
import { codeFiles, eventProperties, scanEvents, scanHosts, scanRequests, scanStorage } from './privacySurface.ts';

const SRC = resolve(import.meta.dirname, '..');
const FILES = codeFiles(SRC);
const NOTICE = readFileSync(join(SRC, 'components/pages/PrivacyPage.astro'), 'utf8');
const ANALYTICS = readFileSync(join(SRC, 'components/Analytics.astro'), 'utf8');

const RULE =
  '\n\nThe privacy surface changed. CLAUDE.md, "Privacy Policy is the Source of Truth", rule 2: ' +
  'a new or changed label, event, event property, storage key or third-party request needs a material: true entry in the privacy changelog ' +
  '(writtenChangelog in src/components/pages/PrivacyPage.astro), and the notice text if it no longer describes what happens. ' +
  'Removing a label needs no entry. Then update the snapshot in src/utils/privacySurface.test.ts.\n';

/** What was added and what was removed, for the failure message. */
function diff(what: string, actual: string[], expected: string[]): string {
  const added = actual.filter((x) => !expected.includes(x));
  const removed = expected.filter((x) => !actual.includes(x));
  return `${RULE}\n${what} added: ${added.join(', ') || 'none'}\n${what} removed: ${removed.join(', ') || 'none'}\n`;
}

// -----------------------------------------------------------------------------
// Click labels: every data-attr the site can render (see analyticsLabels.ts).
// -----------------------------------------------------------------------------

const EXPECTED_LABEL_PREFIXES = [
  'blog-card-', 'blog-level-', 'free-inflation-tab-', 'home-cta-', 'home-sit-', 'home-start-', 'lang-switch-',
  'lc-tab-', 'level-page-covered-', 'lp-mark-level-read-', 'lp-mark-level-unread-', 'nav-', 'nav-menu-', 'post-tool-',
  'related-', 'subscribe-', 'tag-hub-', 'topic-level-',
];

const EXPECTED_LABELS: string[] = [
  'about', 'about-cta-email', 'about-cta-instagram', 'beliefs', 'beliefs-cta-email', 'beliefs-cta-instagram', 'blog',
  'blog-glossary', 'blog-index-any-country', 'blog-index-browse-topics', 'blog-index-glossary',
  'blog-index-inclusive-hub', 'blog-level-helper', 'blog-search-result', 'blog-search-show-all',
  'blog-start-continue', 'blog-start-first-lesson', 'blog-start-inclusive', 'blog-topics', 'changes-rss', 'contact',
  'cookie-accept', 'cookie-decline', 'cookie-privacy-link', 'editorial-policy', 'email', 'footer-about',
  'footer-all-tools', 'footer-beliefs', 'footer-beta', 'footer-blog', 'footer-blog-glossary', 'footer-blog-topics',
  'footer-changes', 'footer-cookie-settings', 'footer-editorial-policy', 'footer-email',
  'footer-inflation-calculator', 'footer-instagram', 'footer-invest-or-pay-off', 'footer-loan-comparison',
  'footer-monte-carlo-simulator', 'footer-multi-currency-net-worth', 'footer-privacy', 'footer-volunteers',
  'free-cta-inflation-calculator', 'free-cta-invest-or-pay-off', 'free-cta-loan-comparison',
  'free-cta-monte-carlo-simulator', 'free-cta-multi-currency-net-worth', 'free-inflation-export-pdf',
  'free-inflation-export-xlsx', 'free-inflation-lesson-link', 'free-inflation-reset', 'free-inflation-share',
  'free-inflation-use-average', 'free-invest-or-pay-off-chart', 'free-invest-or-pay-off-export-pdf',
  'free-invest-or-pay-off-export-xlsx', 'free-invest-or-pay-off-lesson-link', 'free-invest-or-pay-off-share',
  'free-monte-carlo-export-pdf', 'free-monte-carlo-export-xlsx', 'free-monte-carlo-net-worth-link',
  'free-monte-carlo-reset', 'free-monte-carlo-share', 'home-cta-about', 'home-cta-beliefs', 'home-cta-blog',
  'home-editorial-policy', 'home-help-volunteer', 'home-hero-find', 'home-hero-planner', 'home-inclusive-finances',
  'home-lessons-head', 'home-level-helper', 'home-planner-head', 'home-privacy', 'home-tools-head',
  'home-tools-privacy', 'home-volunteers', 'instagram', 'lc-export-pdf', 'lc-export-xlsx', 'lc-reset',
  'lc-share-copy', 'lc-vendor-add', 'lc-vendor-remove', 'learn-editorial', 'lesson-copy-link', 'lesson-save-pdf',
  'lesson-share-email', 'lesson-share-native', 'lesson-share-whatsapp', 'level-page-all', 'level-page-any-country',
  'level-page-crumb', 'level-page-inclusive', 'level-page-next', 'level-page-prev', 'mcnw-asset-add',
  'mcnw-asset-remove', 'mcnw-csv-download', 'mcnw-csv-overwrite-cancel', 'mcnw-csv-overwrite-confirm',
  'mcnw-csv-upload', 'mcnw-export-pdf', 'mcnw-export-xlsx', 'mcnw-rates-retry', 'mcnw-reset', 'mcnw-share-cancel',
  'mcnw-share-copy', 'mcnw-share-open', 'nav-beta', 'nav-free-tools', 'nav-learn', 'nav-logo', 'nav-menu',
  'nav-menu-beta', 'post-inline-tool-invest-or-pay-off', 'post-inline-tool-loan-comparison',
  'post-inline-tool-multi-currency-net-worth', 'post-nav-next', 'post-nav-prev', 'post-series-bottom',
  'post-series-top', 'related-all', 'related-appreciation', 'related-debt', 'related-diversification',
  'related-emergency', 'related-financial-projections', 'related-fire-intro', 'related-goals',
  'related-how-to-calculate-net-worth', 'related-how-to-get-out-of-debt', 'related-income-replacement-ratio',
  'related-invest-or-pay-off-debt', 'related-liabilities', 'related-loan-terms', 'related-multi-currency',
  'related-net-worth', 'related-purchasing-power', 'related-purchasing-power-cross-country',
  'related-saving-vs-investing', 'related-tag-currency', 'related-tag-debt', 'related-understanding-risk',
  'related-what-if-scenarios', 'related-why-your-euro-buys-more', 'tag-browse-all', 'tag-search-all', 'theme-dark',
  'theme-light', 'theme-system', 'tool-all', 'tool-inflation-calculator', 'tool-invest-or-pay-off',
  'tool-loan-comparison', 'tool-monte-carlo-simulator', 'tool-multi-currency-net-worth', 'volunteers-form',
  'volunteers-privacy', 'waitlist-confirm-change', 'waitlist-confirm-yes',
];

// -----------------------------------------------------------------------------
// Analytics events the site's own code sends, with their property names.
// PostHog's own events ($pageview, $pageleave, $autocapture, $rageclick,
// $dead_click, $$heatmap) are governed by the settings pinned in
// src/utils/shared/cleanUrls.test.ts.
// -----------------------------------------------------------------------------

const EXPECTED_EVENTS: Record<string, string[]> = {
  '$ai_referrer': ['ai_referrer_domain', 'ai_referrer_full'],
  blog_subscribe_confirm_clicked: [],
  blog_subscribe_dismiss_undo: ['variant'],
  blog_subscribe_dismissed: ['action', 'variant'],
  blog_subscribe_retry_clicked: ['variant'],
  blog_subscribe_sent: ['variant'],
  blog_subscribe_submit: ['email_domain', 'source', 'variant'],
  blog_unsubscribe_clicked: [],
  free_inflation_average_used: [],
  free_inflation_country_changed: ['country'],
  free_inflation_currency_changed: ['currency'],
  free_inflation_exported: ['format'],
  free_inflation_mode_changed: ['mode'],
  free_inflation_reset: [],
  free_inflation_share_copied: [],
  free_inflation_shared_view_opened: ['utm_source'],
  free_invest_or_pay_off_calculated: [],
  free_invest_or_pay_off_exported: ['format'],
  free_invest_or_pay_off_reset: [],
  free_invest_or_pay_off_share_copied: [],
  free_invest_or_pay_off_shared_view_opened: ['utm_source'],
  free_loan_comparison_currency_changed: ['currency'],
  free_loan_comparison_details_toggled: ['vendor'],
  free_loan_comparison_exported: ['format'],
  free_loan_comparison_horizon_changed: ['months'],
  free_loan_comparison_mode_changed: ['mode', 'vendor'],
  free_loan_comparison_rate_kind_changed: ['rateKind', 'vendor'],
  free_loan_comparison_refi_changed: ['field'],
  free_loan_comparison_reset: [],
  free_loan_comparison_share_copied: [],
  free_loan_comparison_share_modal_opened: [],
  free_loan_comparison_shared_view_opened: ['utm_source', 'vendors'],
  free_loan_comparison_split_vendor_changed: ['vendor'],
  free_loan_comparison_tab_changed: ['tab', 'via'],
  free_loan_comparison_validation_error: ['count', 'firstReason', 'firstVendor'],
  free_loan_comparison_vendor_added: ['count'],
  free_loan_comparison_vendor_removed: ['count', 'vendor'],
  free_monte_carlo_currency_changed: ['currency'],
  free_monte_carlo_exported: ['format'],
  free_monte_carlo_reset: [],
  free_monte_carlo_returns_changed: ['setting'],
  free_monte_carlo_runs_changed: ['runs'],
  free_monte_carlo_share_copied: [],
  free_monte_carlo_shared_view_opened: ['utm_source'],
  free_monte_carlo_table_opened: [],
  free_monte_carlo_withdrawal_toggled: ['on'],
  free_multi_currency_net_worth_asset_added: ['count'],
  free_multi_currency_net_worth_asset_removed: ['count'],
  free_multi_currency_net_worth_csv_downloaded: ['count'],
  free_multi_currency_net_worth_csv_overwrite_cancelled: [],
  free_multi_currency_net_worth_csv_overwrite_confirmed: ['count'],
  free_multi_currency_net_worth_csv_parse_errors: ['errorCount', 'firstReason', 'validRowCount'],
  free_multi_currency_net_worth_csv_uploaded: ['count'],
  free_multi_currency_net_worth_exported: ['format'],
  free_multi_currency_net_worth_func_currency_changed: ['currency'],
  free_multi_currency_net_worth_rates_error: ['functionalCurrency', 'reason'],
  free_multi_currency_net_worth_rates_retry: [],
  free_multi_currency_net_worth_reset: [],
  free_multi_currency_net_worth_share_copied: ['mode'],
  free_multi_currency_net_worth_share_modal_opened: [],
  free_multi_currency_net_worth_shared_view_opened: ['mode', 'positions', 'utm_source'],
  waitlist_sent: [],
  waitlist_submit: ['email_domain', 'source'],
};

// -----------------------------------------------------------------------------
// Browser storage: localStorage, sessionStorage and the one cookie.
// -----------------------------------------------------------------------------

const EXPECTED_STORAGE_KEYS = [
  'nidhi-cookie-consent',
  'nidhi-internal',
  'nidhi-newsletter-dismissed',
  'nidhi-newsletter-subscription',
  'nidhi-reading-progress',
  'nidhi-theme-mode',
  'nidhi-waitlist-signedup',
];

// -----------------------------------------------------------------------------
// Outside hosts named anywhere in code, and what each one is. A link sends
// nothing until a reader follows it; a request is made by the page itself.
// The two newsletter and waitlist endpoints are not here: their addresses come
// from the build's environment (PUBLIC_NEWSLETTER_ENDPOINT,
// PUBLIC_WAITLIST_ENDPOINT) and are pinned by EXPECTED_REQUESTS below.
// -----------------------------------------------------------------------------

const EXPECTED_HOSTS: Record<string, 'request' | 'link'> = {
  'api.frankfurter.dev': 'request', // exchange rates, net worth calculator
  'eu.i.posthog.com': 'request', // analytics
  'data.worldbank.org': 'link',
  'docs.google.com': 'link', // the volunteer form
  'posthog.com': 'link',
  'rpc.cfainstitute.org': 'link',
  'wa.me': 'link', // share a lesson on WhatsApp
  'www.frankfurter.app': 'link',
  'www.instagram.com': 'link',
};

// Every call that asks a server for something, as `file: call(first argument)`.
const EXPECTED_REQUESTS = [
  // Same-origin data files (/data/inflation/...), fetched on demand.
  'components/InflationCalculator.tsx: fetch(url)',
  'components/InvestOrPayOff.tsx: fetch(url)',
  'components/MultiCurrencyNetWorth.tsx: fetch(`${FRANKFURTER_RATES}?base=${functionalCurrency}`)',
  // The newsletter and waitlist Apps Script endpoints.
  'components/SubscribeSection.astro: fetch(endpoint)',
  'components/WaitlistSection.astro: fetch(endpoint)',
  'pages/confirm.astro: fetch(endpoint)',
  'pages/unsubscribe.astro: fetch(endpoint)',
  // Build time only: the list sizes shown on the site.
  'utils/listCount.ts: fetch(endpoint)',
];

describe('privacy surface: click labels', () => {
  const scan = scanLabels(SRC);

  it('the set of labels is the pinned set', () => {
    assert.deepEqual(scan.exact.slice().sort(), EXPECTED_LABELS.slice().sort(), diff('Labels', scan.exact, EXPECTED_LABELS));
  });

  it('the set of label prefixes is the pinned set', () => {
    assert.deepEqual(scan.prefixes.slice().sort(), EXPECTED_LABEL_PREFIXES.slice().sort(), diff('Label prefixes', scan.prefixes, EXPECTED_LABEL_PREFIXES));
  });
});

describe('privacy surface: analytics events', () => {
  const { calls, unresolved } = scanEvents(FILES);
  const actual = eventProperties(calls);

  it('every event call can be read', () => {
    assert.deepEqual(unresolved, [], 'write the event name as a string and its properties as an object literal, so this test can pin them');
  });

  it('the events are the pinned events', () => {
    assert.deepEqual(Object.keys(actual), Object.keys(EXPECTED_EVENTS).sort(), diff('Events', Object.keys(actual), Object.keys(EXPECTED_EVENTS)));
  });

  it('each event sends the pinned properties', () => {
    for (const [event, props] of Object.entries(actual)) {
      const expected = EXPECTED_EVENTS[event] ?? [];
      assert.deepEqual(props, expected.slice().sort(), diff(`Properties of ${event}`, props, expected));
    }
  });
});

describe('privacy surface: browser storage', () => {
  const scan = scanStorage(FILES);

  it('every storage call names a key this test can read', () => {
    assert.deepEqual(scan.unresolved, [], 'write the key as a string, or as a constant assigned a string in the same file');
  });

  it('the storage keys are the pinned keys', () => {
    assert.deepEqual(scan.keys, EXPECTED_STORAGE_KEYS, diff('Storage keys', scan.keys, EXPECTED_STORAGE_KEYS));
  });

  it('the privacy notice names every key', () => {
    for (const key of scan.keys) assert.ok(NOTICE.includes(key), `${key} is stored but the privacy notice does not name it`);
  });

  it('nothing but the consent runtime sets a cookie', () => {
    const setters = FILES.filter((f) => /document\.cookie\s*=/.test(f.text)).map((f) => f.path);
    assert.deepEqual(setters, ['utils/shared/consentRuntime.js'], RULE);
  });

  it('nothing uses a browser database or the cache', () => {
    for (const f of FILES) assert.doesNotMatch(f.text, /\bindexedDB\b|\bcaches\.open\(|\bopenDatabase\(/, `${f.path}${RULE}`);
  });
});

describe('privacy surface: outside hosts and requests', () => {
  it('the outside hosts named in code are the pinned hosts', () => {
    const actual = Object.keys(scanHosts(FILES));
    assert.deepEqual(actual, Object.keys(EXPECTED_HOSTS).sort(), diff('Hosts', actual, Object.keys(EXPECTED_HOSTS)));
  });

  it('the requests the code makes are the pinned requests', () => {
    const actual = scanRequests(FILES);
    assert.deepEqual(actual, EXPECTED_REQUESTS.slice().sort(), diff('Requests', actual, EXPECTED_REQUESTS));
  });

  it('PostHog is started on the pinned host and nowhere else', () => {
    assert.equal([...ANALYTICS.matchAll(/api_host:\s*'([^']+)'/g)].map((m) => m[1]).join(), 'https://eu.i.posthog.com');
  });

  it('no page loads a script, style sheet, font, frame or image from another site', () => {
    for (const f of FILES) {
      for (const m of f.text.matchAll(/<(script|iframe|img|video|audio|source|embed|object)\b[^>]*\bsrc=["']?(https?:)?\/\/[^"'\s>]+/g)) {
        assert.fail(`${f.path}: ${m[0]}${RULE}`);
      }
      for (const m of f.text.matchAll(/<link\b[^>]*\brel=["'](?:stylesheet|preload|modulepreload)["'][^>]*\bhref=["']?(https?:)?\/\/[^"'\s>]+/g)) {
        assert.fail(`${f.path}: ${m[0]}${RULE}`);
      }
      for (const m of f.text.matchAll(/@import\s+(?:url\()?["']?(https?:)?\/\/[^"')\s]+|url\(["']?(https?:)?\/\/[^"')\s]+/g)) {
        assert.fail(`${f.path}: ${m[0]}${RULE}`);
      }
    }
  });
});

describe('privacy surface: what click capture is told to ignore', () => {
  const list = /var IGNORED_ATTRIBUTES = \[([^\]]+)\];/.exec(ANALYTICS);
  const ignored = list ? [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

  it('still lists every attribute that can hold what a reader typed or a tool worked out', () => {
    // CLAUDE.md, "Free tools keep inputs out of URLs", rule 4: accessibility
    // labels, titles, values, styles, links, ids, chart geometry.
    const REQUIRED = [
      'aria-label', 'aria-valuetext', 'aria-valuenow', 'aria-description', 'aria-describedby', 'aria-labelledby',
      'title', 'alt', 'placeholder', 'value', 'style', 'href', 'id', 'name', 'for', 'datetime', 'download', 'src', 'action',
      'd', 'points', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'width', 'height', 'transform', 'viewBox',
    ];
    for (const attr of REQUIRED) assert.ok(ignored.includes(attr), `IGNORED_ATTRIBUTES in Analytics.astro no longer has "${attr}"`);
  });

  it('is what autocapture and dead-click capture are given', () => {
    assert.match(ANALYTICS, /window\.nidhiClickCapture = \{ element_attribute_ignorelist: IGNORED_ATTRIBUTES \};/);
  });
});
