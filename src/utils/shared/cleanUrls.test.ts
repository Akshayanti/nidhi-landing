/**
 * Unit tests for src/utils/shared/cleanUrls.js, the address backstop that
 * Analytics.astro inlines and runs on every event before it is sent, and for
 * the PostHog settings Analytics.astro starts with.
 *
 * The file is a classic script, so it runs here as the page runs it, in a
 * context of its own, with a stand-in for `window.location`.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runClassicScript } from '../../../test/classicScript.ts';
import { join } from 'node:path';
import { LOCALES, localePrefix } from '../../i18n/config.ts';

const SOURCE = readFileSync(join(import.meta.dirname, 'cleanUrls.js'), 'utf8');
const ANALYTICS = readFileSync(join(import.meta.dirname, '../../components/Analytics.astro'), 'utf8');

// Built the way Analytics.astro builds it: from the locale registry.
const PREFIXES = LOCALES.map(localePrefix).filter(Boolean);
// '' is the English edition, which has no prefix.
const EDITIONS = ['', ...PREFIXES];
const ORIGIN = 'https://nidhi.today';

type Win = Record<string, any>;

function page(origin = ORIGIN): Win {
  const window: Win = { location: { origin, host: new URL(origin).host }, URL, URLSearchParams };
  runClassicScript(SOURCE, { window, globalThis: window, URL, URLSearchParams });
  return window;
}

const clean = (value: unknown): unknown => page().nidhiCleanUrl(value, PREFIXES);

const SECRET_QUERY = 'v1_n=SECRETNAME&v1_a=123456&c=INR';
const SECRET_HASH = 'a1=Jane~EUR~98765&f=EUR';

describe('cleanUrls: free tool addresses', () => {
  it('covers every edition the site serves', () => {
    assert.deepEqual(PREFIXES, ['/hi', '/es', '/cs', '/mr']);
  });

  for (const prefix of EDITIONS) {
    const base = `${prefix}/free/loan-comparison/`;
    const name = prefix || 'the English edition';

    it(`${name}: an absolute address keeps only utm_* and loses its # part`, () => {
      assert.equal(
        clean(`${ORIGIN}${base}?utm_source=share&${SECRET_QUERY}&utm_medium=link#${SECRET_HASH}`),
        `${ORIGIN}${base}?utm_source=share&utm_medium=link`,
      );
      assert.equal(clean(`${ORIGIN}${base}?${SECRET_QUERY}`), `${ORIGIN}${base}`);
      assert.equal(clean(`${ORIGIN}${base}#${SECRET_HASH}`), `${ORIGIN}${base}`);
    });

    it(`${name}: a relative address is cleaned and stays relative`, () => {
      assert.equal(clean(`${base}?${SECRET_QUERY}&utm_campaign=x#${SECRET_HASH}`), `${base}?utm_campaign=x`);
      assert.equal(clean(`${base}#faq`), base);
    });

    it(`${name}: the tools hub and a clean tool address are unchanged in meaning`, () => {
      assert.equal(clean(`${ORIGIN}${prefix}/free/`), `${ORIGIN}${prefix}/free/`);
      assert.equal(clean(`${ORIGIN}${base}`), `${ORIGIN}${base}`);
    });
  }

  it('cleans every tool, whatever its name', () => {
    for (const tool of ['loan-comparison', 'multi-currency-net-worth', 'monte-carlo', 'inflation-calculator', 'invest-or-pay-off', 'a-tool-not-built-yet']) {
      assert.equal(clean(`${ORIGIN}/free/${tool}/?x=SECRET#y=SECRET`), `${ORIGIN}/free/${tool}/`);
    }
  });

  it('cleans an address that comes with a space in front, as the browser would read it', () => {
    assert.equal(clean(` /free/loan-comparison/?${SECRET_QUERY}#${SECRET_HASH}`), '/free/loan-comparison/');
  });

  it('keeps a relative address relative, even when a campaign tag holds a link', () => {
    assert.equal(
      clean(`/free/loan-comparison/?utm_source=https://example.com&${SECRET_QUERY}`),
      '/free/loan-comparison/?utm_source=https%3A%2F%2Fexample.com',
    );
  });

  it('keeps a plain http address absolute', () => {
    const w = page('http://localhost:4321');
    assert.equal(
      w.nidhiCleanUrl(`http://localhost:4321/free/loan-comparison/?${SECRET_QUERY}#${SECRET_HASH}`, PREFIXES),
      'http://localhost:4321/free/loan-comparison/',
    );
  });

  it('cleans the English edition when it is given no list of prefixes', () => {
    assert.equal(page().nidhiCleanUrl(`${ORIGIN}/free/loan-comparison/?${SECRET_QUERY}#${SECRET_HASH}`), `${ORIGIN}/free/loan-comparison/`);
  });

  it('reads a longer locale code that begins with a shorter one as its own edition', () => {
    // A regional edition beside its language: /es-mx is not /es followed by a page.
    for (const prefixes of [['/es', '/es-mx'], ['/es-mx', '/es']]) {
      assert.equal(page().nidhiCleanUrl(`${ORIGIN}/es-mx/free/loan-comparison/?${SECRET_QUERY}`, prefixes), `${ORIGIN}/es-mx/free/loan-comparison/`);
      assert.equal(page().nidhiCleanUrl(`${ORIGIN}/es/free/loan-comparison/?${SECRET_QUERY}`, prefixes), `${ORIGIN}/es/free/loan-comparison/`);
    }
  });

  it('leaves no typed value in any cleaned address', () => {
    for (const prefix of EDITIONS) {
      for (const form of [`?${SECRET_QUERY}`, `#${SECRET_HASH}`, `?${SECRET_QUERY}#${SECRET_HASH}`, `?utm_source=a&${SECRET_QUERY}#${SECRET_HASH}`]) {
        for (const origin of [ORIGIN, '']) {
          const out = String(clean(`${origin}${prefix}/free/multi-currency-net-worth/${form}`));
          assert.doesNotMatch(out, /SECRET|123456|Jane|98765|INR|EUR|#/, `${origin}${prefix} ${form}`);
        }
      }
    }
  });
});

describe('cleanUrls: what is left alone', () => {
  it('leaves another site alone, even when its path looks like a tool', () => {
    const foreign = 'https://example.com/free/loan-comparison/?v1_a=5#x=1';
    assert.equal(clean(foreign), foreign);
    const sub = 'https://app.nidhi.today/free/x/?a=1';
    assert.equal(clean(sub), sub);
  });

  it('does not take a two-letter page segment for a locale', () => {
    // /xx/ is not an edition, so /xx/free/ is not a tool address.
    const value = `${ORIGIN}/xx/free/loan-comparison/?a=1#b=2`;
    assert.equal(clean(value), value);
    // A locale prefix is a whole segment: /history/ does not start with /hi/.
    const page2 = `${ORIGIN}/history/free/x/?a=1`;
    assert.equal(clean(page2), page2);
  });

  it('leaves /free/ further down a path alone', () => {
    const value = `${ORIGIN}/blog/a-lesson/free/?a=1`;
    assert.equal(clean(value), value);
  });

  it('passes on an address it leaves alone exactly as it came, anchor included', () => {
    for (const value of ['/xx/free/loan-comparison/?a=1#b=2', '/learn/a-lesson/free/#notes', '/learn/free/../?a=1']) {
      assert.equal(clean(value), value);
    }
  });

  it('leaves an edition’s home page alone, whatever its query mentions', () => {
    for (const value of [`${ORIGIN}/hi?next=/free/loan-comparison/`, `${ORIGIN}/hi/?next=/free/loan-comparison/`]) {
      assert.equal(clean(value), value);
    }
  });

  it('passes on an address it cannot read', () => {
    const value = 'http://[/free/loan-comparison/?a=1';
    assert.equal(clean(value), value);
  });

  it('passes on anything that is not a string, and strings that are not addresses of interest', () => {
    for (const value of [undefined, null, 0, 42, true, 'plain text', `${ORIGIN}/learn/?level=discovery#x`]) {
      assert.equal(clean(value), value);
    }
    const obj = { a: 1 };
    assert.equal(clean(obj), obj);
  });
});

describe('cleanUrls: blog search', () => {
  it('removes ?q= from a /blog address in every edition, and keeps the rest', () => {
    for (const prefix of EDITIONS) {
      assert.equal(clean(`${ORIGIN}${prefix}/blog/?q=my+salary+is+90000&utm_source=g`), `${ORIGIN}${prefix}/blog/?utm_source=g`);
      assert.equal(clean(`${prefix}/blog/?q=secret`), `${prefix}/blog/`);
    }
  });

  it('leaves a blog address with no search alone', () => {
    const value = `${ORIGIN}/blog/a-lesson/?utm_source=q=1`;
    assert.equal(clean(value), value);
  });

  it('removes ?q= from a /blog address that comes with a space in front', () => {
    assert.equal(clean(' /blog/?q=my+salary+is+90000'), '/blog/');
  });

  it('leaves ?q= alone on a page that only has blog further down its path', () => {
    for (const value of [`${ORIGIN}/learn/blog-notes/?q=1`, `${ORIGIN}/learn/blog/?q=1`, `${ORIGIN}/xx/blog/?q=1`]) {
      assert.equal(clean(value), value);
    }
  });

  it('passes on a parameter that holds nothing as it came: there is no search or token to remove', () => {
    // ?q and ?t with no "=" carry no value. The last two name the other page's
    // parameter, which means nothing there.
    for (const value of ['/blog/?q', '/confirm?t', '/unsubscribe?t', '/blog/?q&t=1', '/confirm?t&q=1', '/unsubscribe/?t&q=1']) {
      assert.equal(clean(value), value);
    }
  });
});

describe('cleanUrls: newsletter tokens', () => {
  const TOKEN = 'tok_SECRET_0123456789abcdef';

  it('removes ?t= from the confirm and unsubscribe addresses, and keeps the rest', () => {
    for (const pageName of ['confirm', 'unsubscribe']) {
      assert.equal(clean(`${ORIGIN}/${pageName}?t=${TOKEN}`), `${ORIGIN}/${pageName}`);
      assert.equal(clean(`${ORIGIN}/${pageName}/?t=${TOKEN}&utm_source=email`), `${ORIGIN}/${pageName}/?utm_source=email`);
      assert.equal(clean(`/${pageName}?utm_source=email&t=${TOKEN}`), `/${pageName}?utm_source=email`);
      for (const prefix of PREFIXES) {
        assert.equal(clean(`${ORIGIN}${prefix}/${pageName}/?t=${TOKEN}`), `${ORIGIN}${prefix}/${pageName}/`);
      }
    }
  });

  it('removes ?t= from an address that comes with a space in front', () => {
    for (const pageName of ['confirm', 'unsubscribe']) {
      assert.equal(clean(` /${pageName}?t=${TOKEN}`), `/${pageName}`);
    }
  });

  it('leaves no token in any property of an event', () => {
    const w = page();
    const props: Record<string, unknown> = {
      $current_url: `${ORIGIN}/unsubscribe?t=${TOKEN}`,
      $session_entry_url: `${ORIGIN}/confirm/?t=${TOKEN}`,
      $referrer: `${ORIGIN}/unsubscribe/?t=${TOKEN}`,
    };
    w.nidhiCleanUrlProps(props, PREFIXES);
    assert.doesNotMatch(JSON.stringify(props), /tok_SECRET/);
  });

  it('leaves ?t= alone on any other page, and on another site', () => {
    for (const value of [`${ORIGIN}/blog/?t=1`, `${ORIGIN}/confirmed/?t=1`, `${ORIGIN}/a/confirm?t=1`, `https://example.org/unsubscribe?t=${TOKEN}`]) {
      assert.equal(clean(value), value);
    }
  });
});

describe('cleanUrls: event properties', () => {
  it('cleans every own property of an object in place', () => {
    const w = page();
    const dirty = `${ORIGIN}/hi/free/loan-comparison/?${SECRET_QUERY}#${SECRET_HASH}`;
    const props: Record<string, unknown> = {
      $current_url: dirty,
      $referrer: dirty,
      $session_entry_url: dirty,
      $pathname: '/hi/free/loan-comparison/',
      count: 3,
    };
    w.nidhiCleanUrlProps(props, PREFIXES);
    assert.deepEqual(props, {
      $current_url: `${ORIGIN}/hi/free/loan-comparison/`,
      $referrer: `${ORIGIN}/hi/free/loan-comparison/`,
      $session_entry_url: `${ORIGIN}/hi/free/loan-comparison/`,
      $pathname: '/hi/free/loan-comparison/',
      count: 3,
    });
  });

  it('cleans the addresses that heatmap data is keyed by', () => {
    const w = page();
    const tool = `${ORIGIN}/es/free/loan-comparison/`;
    const props: Record<string, unknown> = {
      $heatmap_data: {
        [`${tool}?${SECRET_QUERY}#${SECRET_HASH}`]: [{ x: 1, y: 2, target_fixed: false, type: 'click' }],
        [`${tool}?utm_source=share&x=1#y`]: [{ x: 3, y: 4, target_fixed: false, type: 'click' }],
        [`${tool}#${SECRET_HASH}`]: [{ x: 5, y: 6, target_fixed: false, type: 'rageclick' }],
        [`${ORIGIN}/blog/`]: [{ x: 7, y: 8, target_fixed: false, type: 'click' }],
      },
    };
    w.nidhiCleanUrlProps(props, PREFIXES);
    const sent = JSON.parse(JSON.stringify(props.$heatmap_data));
    assert.deepEqual(Object.keys(sent).sort(), [`${ORIGIN}/blog/`, tool, `${tool}?utm_source=share`].sort());
    // Two addresses that become the same one keep all their points.
    assert.deepEqual(sent[tool].map((p: { x: number }) => p.x), [1, 5]);
    assert.doesNotMatch(JSON.stringify(sent), /SECRETNAME|123456|Jane|98765/);
  });

  it('when two addresses become one and the first has no list of points, the second is sent as it is', () => {
    const w = page();
    const tool = `${ORIGIN}/free/loan-comparison/`;
    const point = { x: 1, y: 2, target_fixed: false, type: 'click' };
    const props: Record<string, unknown> = { $heatmap_data: { [`${tool}?${SECRET_QUERY}`]: 7, [`${tool}#${SECRET_HASH}`]: [point] } };
    w.nidhiCleanUrlProps(props, PREFIXES);
    assert.deepEqual(JSON.parse(JSON.stringify(props.$heatmap_data)), { [tool]: [point] });
  });

  it('reads only what the event itself holds, never what it inherits', () => {
    const w = page();
    const dirty = `${ORIGIN}/free/loan-comparison/?${SECRET_QUERY}`;
    const point = { x: 1, y: 2, target_fixed: false, type: 'click' };
    const heatmap = Object.create({ [dirty]: [point] });
    heatmap[`${ORIGIN}/learn/`] = [point];
    const props: Record<string, unknown> = Object.create({ $referrer: dirty });
    props.$heatmap_data = heatmap;
    w.nidhiCleanUrlProps(props, PREFIXES);
    assert.deepEqual(Object.keys(props), ['$heatmap_data']);
    assert.deepEqual(JSON.parse(JSON.stringify(props.$heatmap_data)), { [`${ORIGIN}/learn/`]: [point] });
  });

  it('sends no heatmap data it cannot read as addresses with points', () => {
    for (const odd of ['a string', 42, null, undefined, [`${ORIGIN}/free/x/?v1_n=SECRETNAME`]]) {
      const w = page();
      const props: Record<string, unknown> = { $heatmap_data: odd };
      w.nidhiCleanUrlProps(props, PREFIXES);
      assert.equal(JSON.stringify(props.$heatmap_data), '{}', String(odd));
    }
  });

  it('accepts a missing object', () => {
    const w = page();
    assert.doesNotThrow(() => { w.nidhiCleanUrlProps(undefined, PREFIXES); w.nidhiCleanUrlProps(null, PREFIXES); });
  });
});

describe('cleanUrls: where it defines its functions', () => {
  it('on the window when there is one, as on the page', () => {
    const window: Win = {};
    const other: Win = {};
    runClassicScript(SOURCE, { window, globalThis: other, URL, URLSearchParams });
    assert.equal(typeof window.nidhiCleanUrl, 'function');
    assert.equal(typeof window.nidhiCleanUrlProps, 'function');
    assert.deepEqual(Object.keys(other), []);
  });

  it('on the global object where there is no window', () => {
    const global: Win = {};
    runClassicScript(SOURCE, { globalThis: global, URL, URLSearchParams });
    assert.equal(typeof global.nidhiCleanUrl, 'function');
    assert.equal(typeof global.nidhiCleanUrlProps, 'function');
  });
});

describe('Analytics.astro: how PostHog is started', () => {
  // The object literal passed to posthog.init, as written in the source.
  const start = ANALYTICS.indexOf('posthog.init(posthogKey, {');
  const init = ANALYTICS.slice(start, ANALYTICS.indexOf('\n  })', start));

  it('inlines the address backstop before the script that starts PostHog', () => {
    const inlined = ANALYTICS.indexOf('<script is:inline set:html={cleanUrlsScript}></script>');
    assert.ok(inlined > 0);
    assert.ok(inlined < ANALYTICS.indexOf('posthog.init(posthogKey'));
    assert.match(ANALYTICS, /import cleanUrlsScript from '\.\.\/utils\/shared\/cleanUrls\.js\?raw';/);
  });

  it('builds the locale prefixes from the locale registry', () => {
    assert.match(ANALYTICS, /const localePrefixes = LOCALES\.map\(localePrefix\)\.filter\(Boolean\);/);
  });

  it('keeps the settings the privacy notice rests on', () => {
    assert.ok(start > 0 && init.length > 0);
    for (const setting of [
      'mask_all_text: true',
      'capture_performance: false',
      'capture_exceptions: false',
      'disable_session_recording: true',
      'disable_surveys: true',
      "autocapture: hasFullConsent ? window.nidhiClickCapture : false",
      'enable_heatmaps: hasFullConsent && !window.nidhiHeatmapsPaused',
      "capture_dead_clicks: hasFullConsent ? window.nidhiClickCapture : false",
      "persistence: hasFullConsent ? 'localStorage' : 'memory'",
      'before_send: function (event) {',
    ]) {
      assert.ok(init.includes(setting), `posthog.init no longer has: ${setting}`);
    }
  });

  it('before_send cleans addresses in properties, $set and $set_once, then clicks', () => {
    for (const part of ['event.properties', 'event.$set', 'event.$set_once']) {
      assert.ok(ANALYTICS.includes(`window.nidhiCleanUrlProps(${part}, localePrefixes);`), part);
    }
    assert.ok(init.includes('return cleanAddresses(event) && cleanClicks(event);'));
  });

  it('sends nothing when a cleaner is missing', () => {
    assert.match(ANALYTICS, /if \(typeof window\.nidhiCleanUrlProps !== 'function'\) return null;/);
    assert.match(ANALYTICS, /if \(typeof window\.nidhiCleanElements !== 'function'\) return null;/);
  });
});

describe('cleanUrls: addresses the quick test cannot read as written', () => {
  it('cleans a percent-encoded key or a backslashed path the parser reads as a match', () => {
    assert.equal(clean(`${ORIGIN}/blog?%71=SECRETSEARCH`), `${ORIGIN}/blog`);
    assert.equal(clean(`${ORIGIN}/confirm?%74=SECRETTOKEN`), `${ORIGIN}/confirm`);
    assert.equal(clean(`${ORIGIN}\\free\\loan-comparison\\?${SECRET_QUERY}`), `${ORIGIN}/free/loan-comparison/`);
    assert.equal(clean(`${ORIGIN}/es/free/loan-comparison/?utm_source=share&%76%31_n=SECRETNAME`), `${ORIGIN}/es/free/loan-comparison/?utm_source=share`);
  });

  it('leaves a percent sign or backslash that hides nothing as it was written', () => {
    for (const value of [`${ORIGIN}/learn/%C3%A9t%C3%A9/`, `${ORIGIN}/blog?tag=a%20b`, '/a\\b', 'https://example.com/blog?%71=x']) {
      assert.equal(clean(value), value);
    }
  });
});
