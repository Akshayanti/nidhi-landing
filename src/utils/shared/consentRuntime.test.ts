/**
 * Unit tests for src/utils/shared/consentRuntime.js, the cookie-banner answer
 * that CookieConsent.astro and Analytics.astro inline.
 *
 * The file is a classic script, so it runs here as the page runs it, in a
 * context of its own, with a cookie jar, two storages and a PostHog stand-in.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
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
  written: string[];
}

/** A page on `host`; `blockCookies` drops every cookie write, as a strict browser does. */
function page(host = 'nidhi.today', opts: { blockCookies?: boolean; cookie?: string } = {}): Page {
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
  const p: Page = { window: {}, local, session, configs: [], resets: 0, written };
  p.window = {
    document,
    localStorage: local,
    sessionStorage: session,
    location: { hostname: host, protocol: host === 'localhost' ? 'http:' : 'https:' },
    posthog: {
      set_config: (c: Record<string, unknown>) => { p.configs.push(c); },
      reset: () => { p.resets += 1; },
    },
  };
  runInNewContext(SOURCE, { window: p.window, globalThis: p.window });
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
    assert.doesNotMatch(p.written[0], /Domain=|Secure/);
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
    p.window.nidhiConsent.apply(); // a later visibility change: no second reset
    assert.equal(p.resets, 1);
    assert.equal(p.configs.at(-1)?.persistence, 'memory');
    assert.equal(p.local.getItem('ph_key_posthog'), null);
  });

  it('keeps heatmaps off while the level helper pauses them', () => {
    const p = page('nidhi.today', { cookie: 'nidhi-cookie-consent=accepted' });
    p.window.nidhiHeatmapsPaused = true;
    p.window.nidhiConsent.apply();
    assert.equal(p.configs.at(-1)?.enable_heatmaps, false);
  });

  it('a second copy on the page keeps the first', () => {
    const p = page();
    const first = p.window.nidhiConsent;
    runInNewContext(SOURCE, { window: p.window, globalThis: p.window });
    assert.equal(p.window.nidhiConsent, first);
  });
});
