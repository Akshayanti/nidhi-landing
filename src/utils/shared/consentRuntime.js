/**
 * The cookie-banner answer, shared with the planner at app.nidhi.today, and
 * the one place it is applied to PostHog.
 *
 * Since Nov 6 2026 an answer is kept in a cookie on .nidhi.today, which the
 * planner reads too, so one answer covers both sites. An answer given before
 * then is in localStorage, where this site always kept it: it keeps applying
 * here, but not in the planner, which it never covered. Once this site sees a
 * shared answer, that older copy is removed, so it can't come back here after
 * the cookie expires; an expired shared answer means the banner asks again.
 * localStorage is also where the answer goes when cookies are blocked.
 *
 * Without a yes, PostHog keeps its visitor ID in memory, so it lasts only for
 * the page, and any PostHog storage left in the browser is removed. Until
 * Nov 6 2026 the ID was kept in localStorage for every visitor, which tied a
 * decliner's visits together. Withdrawing a yes also gives PostHog a new
 * identity, so later events can't be joined to earlier ones.
 *
 * A classic script, not a module: CookieConsent.astro and Analytics.astro
 * inline this file, and consentRuntime.test.ts runs the same file. It defines
 * one global, `nidhiConsent`; a second copy on the same page keeps the first.
 */
(function (root) {
  if (root.nidhiConsent) return;

  var KEY = 'nidhi-cookie-consent';
  var PATTERN = /(?:^|;\s*)nidhi-cookie-consent=(accepted|declined)(?:;|$)/;
  var lastApplied = null;

  function storage() {
    try { return root.localStorage; } catch (_) { return null; }
  }

  function readCookieChoice() {
    var m = PATTERN.exec(root.document.cookie || '');
    return m ? m[1] : null;
  }

  function read() {
    var shared = readCookieChoice();
    var ls = storage();
    if (shared) {
      try { if (ls) ls.removeItem(KEY); } catch (_) {}
      return shared;
    }
    try {
      var old = ls ? ls.getItem(KEY) : null;
      return old === 'accepted' || old === 'declined' ? old : null;
    } catch (_) { return null; }
  }

  function save(choice) {
    var host = root.location.hostname;
    var live = /(^|\.)nidhi\.today$/.test(host);
    var shared = live ? '; Domain=.nidhi.today' : '';
    var secure = live || root.location.protocol === 'https:' ? '; Secure' : '';
    try {
      root.document.cookie = KEY + '=' + choice + shared + '; Path=/; Max-Age=31536000; SameSite=Lax' + secure;
    } catch (_) {}
    var ls = storage();
    try {
      // Check the cookie itself: the localStorage fallback may already hold the
      // same answer, and must survive when cookies are blocked.
      if (readCookieChoice() === choice) { if (ls) ls.removeItem(KEY); }
      else if (ls) ls.setItem(KEY, choice);
    } catch (_) {}
  }

  function forgetStoredAnalyticsId() {
    var stores = [];
    try { stores.push(root.localStorage); } catch (_) {}
    try { stores.push(root.sessionStorage); } catch (_) {}
    for (var s = 0; s < stores.length; s++) {
      var st = stores[s];
      if (!st) continue;
      try {
        for (var i = st.length - 1; i >= 0; i--) {
          var k = st.key(i);
          if (k && (k.indexOf('ph_') === 0 || k.indexOf('__ph') === 0)) st.removeItem(k);
        }
      } catch (_) {}
    }
  }

  // Applies the current answer to a running PostHog, both ways. Before the SDK
  // loads, posthog is a stub without set_config, and Analytics.astro's
  // `loaded` calls this again.
  function apply() {
    var on = read() === 'accepted';
    var ph = root.posthog;
    if (!on) forgetStoredAnalyticsId();
    if (!ph || typeof ph.set_config !== 'function') return on;
    var clicks = on && root.nidhiClickCapture ? root.nidhiClickCapture : false;
    ph.set_config({
      persistence: on ? 'localStorage' : 'memory',
      autocapture: clicks,
      enable_heatmaps: on && !root.nidhiHeatmapsPaused,
      capture_dead_clicks: clicks,
    });
    // A withdrawn yes: PostHog keeps its identity when storage changes, so give
    // it a new one, once, and later events can't be joined to earlier visits.
    if (lastApplied === true && !on && typeof ph.reset === 'function') {
      try { ph.reset(true); } catch (_) {}
    }
    if (!on) forgetStoredAnalyticsId();
    lastApplied = on;
    return on;
  }

  root.nidhiConsent = {
    read: read,
    save: save,
    apply: apply,
    accepted: function () { return read() === 'accepted'; },
    forgetStoredAnalyticsId: forgetStoredAnalyticsId,
  };
})(typeof window !== 'undefined' ? window : globalThis);
