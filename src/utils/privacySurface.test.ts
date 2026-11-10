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
import {
  codeFiles, eventProperties, scanEvents, scanHosts, scanPosthogCalls, scanPublicEnv, scanRequests, scanStorage, withoutComments,
  type SourceFile,
} from './privacySurface.ts';

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
// A renamed file or variable changes a line here without changing what is
// sent: update the line, no changelog entry.
const EXPECTED_REQUESTS = [
  // Same-origin data files (/data/inflation/...), fetched on demand.
  'components/InflationCalculator.tsx: fetch(url)',
  'components/InvestOrPayOff.tsx: fetch(url)',
  // The simulation runs in a worker built from the site's own code.
  'components/MonteCarloSimulator.tsx: new Worker',
  'components/MultiCurrencyNetWorth.tsx: fetch(`${FRANKFURTER_RATES}?base=${functionalCurrency}`)',
  // The newsletter and waitlist Apps Script endpoints.
  'components/SubscribeSection.astro: fetch(endpoint)',
  'components/WaitlistSection.astro: fetch(endpoint)',
  'pages/confirm.astro: fetch(endpoint)',
  // The internal QR studio draws its own SVG (a blob: address) onto a canvas.
  'pages/studio/qr.astro: new Image',
  'pages/unsubscribe.astro: fetch(endpoint)',
  // Build time only: the list sizes shown on the site.
  'utils/listCount.ts: fetch(endpoint)',
];

// PostHog methods the code calls, other than `capture` (see EXPECTED_EVENTS).
const EXPECTED_POSTHOG_CALLS = [
  'components/Analytics.astro: init',
  // Heatmaps are paused while a page shows what a click position could give away.
  'components/InvestOrPayOff.tsx: set_config',
  'components/LearnHome.tsx: set_config',
  // The subscriber's distinct id: a hash of the address, as the notice describes.
  'components/SubscribeSection.astro: identify',
  // The cookie banner's answer, applied to a running PostHog.
  'utils/shared/consentRuntime.js: reset',
  'utils/shared/consentRuntime.js: set_config',
];

// Build-time settings the code reads. Their values are the deploy's, not the
// source's: the two endpoints are the newsletter and waitlist Apps Scripts.
const EXPECTED_PUBLIC_ENV = ['PUBLIC_ANALYTICS_TEST', 'PUBLIC_NEWSLETTER_ENDPOINT', 'PUBLIC_POSTHOG_KEY', 'PUBLIC_WAITLIST_ENDPOINT'];

// Storage calls whose key is not a fixed string, each with its reason.
const EXPECTED_DYNAMIC_STORAGE = [
  // Removes PostHog's own keys (ph_..., __ph...) when consent is not given.
  'utils/shared/consentRuntime.js: removeItem(k)',
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
    assert.deepEqual(scan.unresolved, EXPECTED_DYNAMIC_STORAGE,
      `write the key as a string, or as a constant assigned a string in the same file${RULE}`);
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

  it('a host pinned as a link is never named in a file that makes requests', () => {
    const hosts = scanHosts(FILES);
    const requesting = new Set(scanRequests(FILES).filter((r) => !/: new (Image|Worker)$/.test(r)).map((r) => r.split(': ')[0]));
    for (const [host, kind] of Object.entries(EXPECTED_HOSTS)) {
      if (kind !== 'link') continue;
      for (const file of hosts[host] ?? []) {
        assert.ok(!requesting.has(file), `${host} is pinned as a link, but ${file} also makes requests: check it is not one of them${RULE}`);
      }
    }
  });

  it('the build-time settings the code reads are the pinned ones', () => {
    const actual = scanPublicEnv(FILES);
    assert.deepEqual(actual, EXPECTED_PUBLIC_ENV, diff('Settings', actual, EXPECTED_PUBLIC_ENV));
  });

  it('the PostHog methods the code calls are the pinned ones', () => {
    const actual = scanPosthogCalls(FILES);
    assert.deepEqual(actual, EXPECTED_POSTHOG_CALLS, diff('PostHog calls', actual, EXPECTED_POSTHOG_CALLS));
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

// -----------------------------------------------------------------------------
// The reader itself. It reads source as text, so it is a tripwire, not a
// proof: what it cannot follow it must report, never skip. What is actually
// sent is checked in a browser by scripts/verify-tool-privacy.mjs.
// -----------------------------------------------------------------------------

const file = (text: string, path = 'components/X.tsx'): SourceFile[] => [{ path, text: withoutComments(text) }];

describe('privacy surface reader: events', () => {
  it('reads the wrapper, PostHog called directly, and spacing or optional calls', () => {
    const { calls, unresolved } = scanEvents(file(`
      track('a_one', { count: rows.length, currency });
      track ('a_two');
      window.posthog.capture('a_three', { mode: 'x' }, { send_instantly: true });
      window.posthog?.capture?.('a_four', {
        // why
        via: 'click',
      });
      posthog . capture ("a_five", { on });
    `));
    assert.deepEqual(unresolved, []);
    assert.deepEqual(eventProperties(calls), { a_five: ['on'], a_four: ['via'], a_one: ['count', 'currency'], a_three: ['mode'], a_two: [] });
    assert.equal(calls[0].properties.count, 'rows.length');
    assert.equal(calls[0].properties.currency, 'currency');
  });

  it('skips the wrapper’s own definition and a mention in a comment', () => {
    const { calls, unresolved } = scanEvents(file(`
      // track('not_sent', { amount }) is what we never do
      /* posthog.capture('nor_this') */
      function track(event: string, properties?: Record<string, unknown>) {
        window.posthog?.capture?.(event, properties);
      }
    `));
    assert.deepEqual([calls, unresolved], [[], []]);
  });

  it('reports what it cannot read instead of skipping it', () => {
    for (const source of [
      "track(name, { count });", // the event name is not a string
      "track('e', props);", // the properties are not written out
      "track('e', { ...props });", // a spread
      "track('e', { [key]: 1 });", // a computed name
      "posthog['capture']('e', { amount });", // an index
      "const ph2 = window.posthog;\nph2.capture('e');", // another name
      "const { capture } = posthog;", // its methods pulled out
      "const send = window.posthog.capture;", // the method under another name
    ]) {
      assert.notDeepEqual(scanEvents(file(source)).unresolved, [], source);
    }
  });

  it('lists the other PostHog methods called', () => {
    assert.deepEqual(scanPosthogCalls(file("posthog.identify(id); window.posthog?.register?.({ a: 1 }); ph.set_config(c); posthog.capture('e');")),
      ['components/X.tsx: identify', 'components/X.tsx: register', 'components/X.tsx: set_config']);
  });
});

describe('privacy surface reader: storage', () => {
  it('reads literal keys and constants, on any receiver', () => {
    const scan = scanStorage(file(`
      const STORAGE_KEY = 'nidhi-a';
      var OTHER = "nidhi-b";
      localStorage.setItem('nidhi-c', '1');
      window.sessionStorage.getItem(STORAGE_KEY);
      ls.removeItem(OTHER);
      store . setItem (
        'nidhi-d',
        value,
      );
    `));
    assert.deepEqual(scan, { keys: ['nidhi-a', 'nidhi-b', 'nidhi-c', 'nidhi-d'], unresolved: [] });
  });

  it('reports a key it cannot resolve, and storage used without a method', () => {
    for (const source of [
      "localStorage.setItem(prefix + id, v);",
      "localStorage.setItem(keys[i], v);",
      "const KEY = 'nidhi-a' + suffix;\nlocalStorage.setItem(KEY, v);",
      "localStorage.setItem(`nidhi-${id}`, v);",
      "localStorage['nidhi-x'] = v;",
      "window.localStorage.nidhiX = v;",
      "sessionStorage.clear();",
    ]) {
      assert.notDeepEqual(scanStorage(file(source)).unresolved, [], source);
    }
  });

  it('does not take a catalog entry named localStorage for storage', () => {
    assert.deepEqual(scanStorage(file('const t = strings.privacy.localStorage.label;')).unresolved, []);
  });
});

describe('privacy surface reader: hosts and requests', () => {
  it('finds hosts in every form, and leaves comments and this site out', () => {
    const hosts = scanHosts(file(`
      // see https://commented.example.org/docs
      const A = 'https://a.example.org/v1';
      const B = "//b.example.org/x.js";
      const C = \`http://c.example.org/\${id}\`;
      const own = 'https://nidhi.today/learn/';
    `));
    assert.deepEqual(Object.keys(hosts), ['a.example.org', 'b.example.org', 'c.example.org']);
  });

  it('finds requests however they are written', () => {
    assert.deepEqual(scanRequests(file(`
      fetch(url, { method: 'POST' });
      window.fetch (endpoint);
      navigator.sendBeacon(target, body);
      const x = new XMLHttpRequest();
      new WebSocket(addr);
      // fetch(commented)
      prefetch(link);
    `)), [
      'components/X.tsx: fetch(endpoint)',
      'components/X.tsx: fetch(url)',
      'components/X.tsx: new WebSocket',
      'components/X.tsx: new XMLHttpRequest',
      'components/X.tsx: sendBeacon(target)',
    ]);
  });

  it('lists the build-time settings read', () => {
    assert.deepEqual(scanPublicEnv(file('const e = import.meta.env.PUBLIC_B_ENDPOINT || import.meta.env.PUBLIC_A;')), ['PUBLIC_A', 'PUBLIC_B_ENDPOINT']);
  });
});
