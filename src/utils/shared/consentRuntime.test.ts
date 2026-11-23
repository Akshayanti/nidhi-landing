/**
 * Unit tests for src/utils/shared/consentRuntime.js, the cookie-banner answer
 * that CookieConsent.astro inlines and Analytics.astro uses.
 *
 * The file is a classic script, so it runs here as the page runs it, in a
 * context of its own, with a cookie jar, two storages and a PostHog stand-in.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runClassicScript } from '../../../test/classicScript.ts';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'consentRuntime.js'), 'utf8');

class FakeStorage {
  private items = new Map<string, string>();
  get length(): number { return this.items.size; }
  key(i: number): string | null { return [...this.items.keys()][i] ?? null; }
  getItem(k: string): string | null { return this.items.get(k) ?? null; }
  setItem(k: string, v: string): void { this.items.set(k, String(v)); }
  removeItem(k: string): void { this.items.delete(k); }
  keys(): string[] { return [...this.items.keys()]; }
}

interface Page {
  window: Record<string, any>;
  local: FakeStorage;
  session: FakeStorage;
  configs: Record<string, unknown>[];
  resets: number;
  /** What each reset was called with. */
  resetArgs: unknown[][];
  written: string[];
}

interface Options {
  blockCookies?: boolean;
  cookie?: string;
  /** The page's protocol; by default a local build is http and every other host https. */
  protocol?: string;
  /**
   * `denied`: reading `window.localStorage` itself throws, as where site data
   * is blocked; `broken`: the storage is there and every call on it throws.
   */
  storage?: 'works' | 'denied' | 'broken';
  /** `stub`: the snippet's queue before the SDK loads, with no set_config; `none`: no analytics on the page. */
  posthog?: 'loaded' | 'stub' | 'none' | 'no-reset';
}

/** A page on `host`; `blockCookies` drops every cookie write, as a strict browser does. */
function page(host = 'nidhi.today', opts: Options = {}): Page {
  const local = new FakeStorage();
  const session = new FakeStorage();
  let jar = opts.cookie ?? '';
  const written: string[] = [];
  const document = {
    get cookie() { return jar; },
    set cookie(v: string) {
      written.push(v);
      if (opts.blockCookies) return;
      const [pair] = v.split(';');
      const [name] = pair.split('=');
      const rest = jar.split('; ').filter((c) => c && !c.startsWith(name + '='));
      jar = [...rest, pair].join('; ');
    },
  };
  const p: Page = { window: {}, local, session, configs: [], resets: 0, resetArgs: [], written };
  const broken = () => { throw new Error('SecurityError'); };
  p.window = {
    document,
    sessionStorage: session,
    location: { hostname: host, protocol: opts.protocol ?? (host === 'localhost' ? 'http:' : 'https:') },
  };
  Object.defineProperty(p.window, 'localStorage', {
    get() {
      if (opts.storage === 'denied') throw new Error('SecurityError');
      if (opts.storage === 'broken') return { get length() { return broken(); }, key: broken, getItem: broken, setItem: broken, removeItem: broken };
      return local;
    },
  });
  const posthog = opts.posthog ?? 'loaded';
  if (posthog !== 'none') {
    p.window.posthog = posthog === 'stub' ? [] : {
      set_config: (c: Record<string, unknown>) => {
        p.configs.push({ ...c }); // a copy made here, since the script's own objects belong to its context
        // The SDK writes its state out again whenever its settings change.
        local.setItem('ph_key_posthog', '{"distinct_id":"written by the SDK"}');
      },
      ...(posthog === 'no-reset' ? {} : { reset: (...args: unknown[]) => { p.resets += 1; p.resetArgs.push(args); } }),
    };
  }
  runClassicScript(SOURCE, { window: p.window, globalThis: p.window });
  return p;
}

describe('consentRuntime: reading', () => {
  it('reads the shared cookie first and removes the older localStorage copy', () => {
    const p = page('nidhi.today', { cookie: 'a=1; nidhi-cookie-consent=declined' });
    p.local.setItem('nidhi-cookie-consent', 'accepted');
    assert.equal(p.window.nidhiConsent.read(), 'declined');
    assert.equal(p.local.getItem('nidhi-cookie-consent'), null);
  });

  it('honours a choice from before the shared cookie, on this site', () => {
    const p = page();
    p.local.setItem('nidhi-cookie-consent', 'accepted');
    assert.equal(p.window.nidhiConsent.read(), 'accepted');
  });

  it('asks again once a shared answer has expired, instead of reviving an older one', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=declined' });
    p.local.setItem('nidhi-cookie-consent', 'accepted');
    p.window.nidhiConsent.read(); // the shared answer is seen once
    const later = page(); // the cookie has since expired
    later.local.setItem('nidhi-cookie-consent', p.local.getItem('nidhi-cookie-consent') ?? '');
    assert.equal(later.window.nidhiConsent.read(), null);
  });

  it('reads either answer from before the shared cookie', () => {
    for (const answer of ['accepted', 'declined']) {
      const p = page();
      p.local.setItem('nidhi-cookie-consent', answer);
      assert.equal(p.window.nidhiConsent.read(), answer);
    }
    const p = page();
    p.local.setItem('nidhi-cookie-consent', 'maybe');
    assert.equal(p.window.nidhiConsent.read(), null);
  });

  it('finds the shared cookie wherever it sits among the others, spaced or not', () => {
    for (const cookie of ['nidhi-cookie-consent=accepted', 'a=1;nidhi-cookie-consent=accepted', 'a=1;  nidhi-cookie-consent=accepted;b=2', 'nidhi-cookie-consent=accepted; b=2']) {
      assert.equal(page('nidhi.today', { cookie }).window.nidhiConsent.read(), 'accepted', cookie);
    }
  });

  it('says whether the answer is a yes', () => {
    assert.equal(page('nidhi.today', { cookie: 'nidhi-cookie-consent=accepted' }).window.nidhiConsent.accepted(), true);
    assert.equal(page('nidhi.today', { cookie: 'nidhi-cookie-consent=declined' }).window.nidhiConsent.accepted(), false);
    assert.equal(page().window.nidhiConsent.accepted(), false, 'no answer is not a yes');
  });

  it('has no answer, rather than an error, where site data is blocked', () => {
    for (const storage of ['denied', 'broken'] as const) {
      const p = page('nidhi.today', { storage });
      assert.equal(p.window.nidhiConsent.read(), null, storage);
      assert.equal(p.window.nidhiConsent.accepted(), false, storage);
      assert.equal(p.window.nidhiConsent.apply(), false, storage);
      const shared = page('nidhi.today', { storage, cookie: 'nidhi-cookie-consent=declined' });
      assert.equal(shared.window.nidhiConsent.read(), 'declined', `${storage}: the cookie still counts`);
    }
  });

  it('ignores values that are not an answer', () => {
    const p = page('nidhi.today', { cookie: 'xnidhi-cookie-consent=accepted; nidhi-cookie-consent=yes' });
    assert.equal(p.window.nidhiConsent.read(), null);
  });
});

describe('consentRuntime: saving', () => {
  it('writes the shared cookie for a year, Secure, on .nidhi.today', () => {
    const p = page('nidhi.today');
    p.window.nidhiConsent.save('accepted');
    assert.equal(p.written.length, 1);
    assert.match(p.written[0], /^nidhi-cookie-consent=accepted; Domain=\.nidhi\.today; Path=\/; Max-Age=31536000; SameSite=Lax; Secure$/);
    assert.equal(p.local.getItem('nidhi-cookie-consent'), null);
  });

  it('keeps a local build on its own host', () => {
    const p = page('localhost');
    p.window.nidhiConsent.save('declined');
    assert.equal(p.written[0], 'nidhi-cookie-consent=declined; Path=/; Max-Age=31536000; SameSite=Lax');
  });

  it('shares the cookie with nidhi.today and its subdomains, and with no other host', () => {
    const written = (host: string, protocol?: string) => {
      const p = page(host, { protocol });
      p.window.nidhiConsent.save('accepted');
      return p.written[0];
    };
    const shared = 'nidhi-cookie-consent=accepted; Domain=.nidhi.today; Path=/; Max-Age=31536000; SameSite=Lax; Secure';
    const own = 'nidhi-cookie-consent=accepted; Path=/; Max-Age=31536000; SameSite=Lax';
    assert.equal(written('app.nidhi.today'), shared);
    assert.equal(written('nidhi.today', 'http:'), shared, 'the live site is always Secure');
    assert.equal(written('nidhi.today.example'), own + '; Secure', 'a host that only starts like ours');
    assert.equal(written('notnidhi.today'), own + '; Secure', 'a host that only ends like ours');
    assert.equal(written('preview.example'), own + '; Secure', 'a preview over https');
    assert.equal(written('preview.example', 'http:'), own, 'plain http cannot hold a Secure cookie');
  });

  it('once the cookie holds the answer, removes the older copy from localStorage', () => {
    const p = page('nidhi.today');
    p.local.setItem('nidhi-cookie-consent', 'accepted');
    p.window.nidhiConsent.save('declined');
    assert.equal(p.local.getItem('nidhi-cookie-consent'), null);
    assert.equal(p.window.nidhiConsent.read(), 'declined');
  });

  it('keeps the answer in localStorage when cookies are blocked, and changes it there', () => {
    const p = page('nidhi.today', { blockCookies: true });
    p.window.nidhiConsent.save('accepted');
    assert.equal(p.local.getItem('nidhi-cookie-consent'), 'accepted');
    p.window.nidhiConsent.save('declined');
    assert.equal(p.local.getItem('nidhi-cookie-consent'), 'declined');
    assert.equal(p.window.nidhiConsent.read(), 'declined');
  });

  it('saves to the cookie alone, without an error, where site data is blocked', () => {
    for (const storage of ['denied', 'broken'] as const) {
      const p = page('nidhi.today', { storage });
      p.window.nidhiConsent.save('accepted');
      assert.equal(p.window.nidhiConsent.read(), 'accepted', storage);
      const nowhere = page('nidhi.today', { storage, blockCookies: true });
      nowhere.window.nidhiConsent.save('accepted');
      assert.equal(nowhere.window.nidhiConsent.read(), null, `${storage}: nowhere to keep it, so the banner asks again`);
    }
  });

  it('falls back to localStorage when cookies are blocked, even if it already held that answer', () => {
    const p = page('nidhi.today', { blockCookies: true });
    p.local.setItem('nidhi-cookie-consent', 'accepted');
    p.window.nidhiConsent.save('accepted');
    assert.equal(p.local.getItem('nidhi-cookie-consent'), 'accepted');
    assert.equal(p.window.nidhiConsent.read(), 'accepted');
  });
});

describe('consentRuntime: applying to PostHog', () => {
  it('without a yes keeps the visitor ID in memory and removes stored PostHog keys', () => {
    const p = page();
    p.local.setItem('ph_key_posthog', '{"distinct_id":"x"}');
    p.session.setItem('ph_key_window_id', 'w');
    p.local.setItem('nidhi-theme-mode', 'dark');
    assert.equal(p.window.nidhiConsent.apply(), false);
    assert.equal(p.configs.at(-1)?.persistence, 'memory');
    assert.equal(p.configs.at(-1)?.autocapture, false);
    assert.deepEqual(p.local.keys(), ['nidhi-theme-mode']);
    assert.deepEqual(p.session.keys(), []);
    assert.equal(p.resets, 0, 'there was no yes to withdraw');
  });

  it('without a yes switches every kind of click recording and heatmaps off, even where the page offers them', () => {
    for (const cookie of ['', 'nidhi-cookie-consent=declined']) {
      const p = page('nidhi.today', { cookie });
      p.window.nidhiClickCapture = { element_attribute_ignorelist: [] };
      assert.equal(p.window.nidhiConsent.apply(), false);
      assert.deepEqual(p.configs, [{ persistence: 'memory', autocapture: false, enable_heatmaps: false, capture_dead_clicks: false }]);
    }
  });

  it('with a yes switches on clicks, dead clicks and heatmaps, and leaves the stored ID alone', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=accepted' });
    const clicks = { element_attribute_ignorelist: [] };
    p.window.nidhiClickCapture = clicks;
    p.session.setItem('ph_key_window_id', 'w');
    assert.equal(p.window.nidhiConsent.apply(), true);
    assert.deepEqual(p.configs, [{ persistence: 'localStorage', autocapture: clicks, enable_heatmaps: true, capture_dead_clicks: clicks }]);
    assert.deepEqual(p.local.keys(), ['ph_key_posthog']);
    assert.deepEqual(p.session.keys(), ['ph_key_window_id']);
  });

  it('with a yes but no click settings on the page records no clicks', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=accepted' });
    p.window.nidhiConsent.apply();
    assert.equal(p.configs[0].autocapture, false);
    assert.equal(p.configs[0].capture_dead_clicks, false);
  });

  it('removes every stored PostHog key, of either naming, from both storages, and nothing else', () => {
    const p = page();
    for (const store of [p.local, p.session]) {
      for (const key of ['ph_a', 'graph_b', '__ph_opt_in_out_c', 'x__ph', 'ph_d', 'nidhi-theme-mode', '__ph_e']) store.setItem(key, '1');
    }
    p.window.nidhiConsent.forgetStoredAnalyticsId();
    assert.deepEqual(p.local.keys(), ['graph_b', 'x__ph', 'nidhi-theme-mode']);
    assert.deepEqual(p.session.keys(), ['graph_b', 'x__ph', 'nidhi-theme-mode']);
  });

  it('removes what the SDK writes back while it is being switched to memory', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=declined' });
    p.window.nidhiConsent.apply();
    assert.equal(p.configs.length, 1);
    assert.deepEqual(p.local.keys(), []);
  });

  it('before the SDK has loaded, still removes a stored ID without a yes and keeps it with one', () => {
    for (const posthog of ['stub', 'none'] as const) {
      const declined = page('nidhi.today', { posthog });
      declined.local.setItem('ph_key_posthog', 'x');
      assert.equal(declined.window.nidhiConsent.apply(), false, posthog);
      assert.deepEqual(declined.local.keys(), [], posthog);
      const accepted = page('nidhi.today', { posthog, cookie: 'nidhi-cookie-consent=accepted' });
      accepted.local.setItem('ph_key_posthog', 'x');
      assert.equal(accepted.window.nidhiConsent.apply(), true, posthog);
      assert.deepEqual(accepted.local.keys(), ['ph_key_posthog'], posthog);
    }
  });

  it('removes the stored ID from session storage where localStorage is blocked', () => {
    const p = page('nidhi.today', { storage: 'denied' });
    p.session.setItem('ph_key_window_id', 'w');
    p.window.nidhiConsent.apply();
    assert.deepEqual(p.session.keys(), []);
    const broken = page('nidhi.today', { storage: 'broken' });
    broken.session.setItem('ph_key_window_id', 'w');
    broken.window.nidhiConsent.apply();
    assert.deepEqual(broken.session.keys(), []);
  });

  it('with a yes keeps the ID in localStorage and records clicks', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=accepted' });
    p.window.nidhiClickCapture = { element_attribute_ignorelist: [] };
    assert.equal(p.window.nidhiConsent.apply(), true);
    assert.equal(p.configs.at(-1)?.persistence, 'localStorage');
    assert.deepEqual(p.configs.at(-1)?.autocapture, { element_attribute_ignorelist: [] });
    assert.equal(p.resets, 0);
  });

  it('a withdrawn yes gives PostHog a new identity once, and leaves nothing stored', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=accepted' });
    p.window.nidhiConsent.apply();
    p.local.setItem('ph_key_posthog', '{"distinct_id":"x"}');
    p.window.nidhiConsent.save('declined');
    p.window.nidhiConsent.apply();
    assert.equal(p.resets, 1, 'at the withdrawal itself');
    assert.deepEqual(p.resetArgs, [[true]], 'the device ID is renewed too');
    p.window.nidhiConsent.apply(); // a later visibility change: no second reset
    assert.equal(p.resets, 1);
    assert.equal(p.configs.at(-1)?.persistence, 'memory');
    assert.equal(p.local.getItem('ph_key_posthog'), null);
  });

  it('a yes after a no gives no new identity: there is nothing to cut off', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=declined' });
    p.window.nidhiConsent.apply();
    p.window.nidhiConsent.save('accepted');
    p.window.nidhiConsent.apply();
    p.window.nidhiConsent.apply();
    assert.equal(p.resets, 0);
  });

  it('a withdrawn yes still switches storage off on an SDK that cannot reset', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=accepted', posthog: 'no-reset' });
    p.window.nidhiConsent.apply();
    p.window.nidhiConsent.save('declined');
    assert.equal(p.window.nidhiConsent.apply(), false);
    assert.equal(p.configs.at(-1)?.persistence, 'memory');
    assert.deepEqual(p.local.keys(), []);
  });

  it('keeps heatmaps off while the level helper pauses them', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=accepted' });
    p.window.nidhiHeatmapsPaused = true;
    p.window.nidhiConsent.apply();
    assert.equal(p.configs.at(-1)?.enable_heatmaps, false);
  });

  it('lands on the window when there is one, and on the global object when there is not', () => {
    const window: Record<string, any> = {};
    runClassicScript(SOURCE, { window });
    assert.equal(typeof window.nidhiConsent.read, 'function');
    // No `window` at all, as in a worker: the global object is handed in under its own name.
    const bare: Record<string, any> = { document: { cookie: 'nidhi-cookie-consent=accepted' } };
    runClassicScript(SOURCE, { globalThis: bare });
    assert.equal(bare.nidhiConsent.accepted(), true);
  });

  it('a second copy on the page keeps the first', () => {
    const p = page();
    const first = p.window.nidhiConsent;
    runClassicScript(SOURCE, { window: p.window, globalThis: p.window });
    assert.equal(p.window.nidhiConsent, first);
  });
});
