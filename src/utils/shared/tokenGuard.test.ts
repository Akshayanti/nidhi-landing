/**
 * Unit tests for src/utils/shared/tokenGuard.js, which the confirm and
 * unsubscribe pages inline in their head so that the token in ?t= is out of
 * the address before analytics load.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runClassicScript } from '../../../test/classicScript.ts';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'tokenGuard.js'), 'utf8');
// Each path is written out, not built from a name: the mutation cache works out what a test
// reads from its source, and a path it cannot work out ties the test to every file (#904).
const PAGES = [
  { name: 'confirm', source: readFileSync(join(import.meta.dirname, '../../pages/confirm.astro'), 'utf8') },
  { name: 'unsubscribe', source: readFileSync(join(import.meta.dirname, '../../pages/unsubscribe.astro'), 'utf8') },
];
const LAYOUT = readFileSync(join(import.meta.dirname, '../../layouts/BaseLayout.astro'), 'utf8');

type Win = Record<string, any>;

function open(pathname: string, search: string, { blocked = false, unreadable = false } = {}): Win {
  const window: Win = {
    location: {
      pathname,
      get search(): string {
        if (unreadable) throw new Error('unreadable');
        return search;
      },
    },
    URLSearchParams,
    replaced: [] as string[],
    entries: [] as unknown[][],
    history: {
      replaceState(state: unknown, title: string, url: string) {
        if (blocked) throw new Error('blocked');
        window.replaced.push(url);
        window.entries.push([state, title]);
      },
    },
  };
  runClassicScript(SOURCE, { window, globalThis: window, URLSearchParams });
  window.nidhiTakeToken();
  return window;
}

describe('tokenGuard', () => {
  it('keeps the token for the page and takes it out of the address', () => {
    const w = open('/unsubscribe', '?t=abc123');
    assert.equal(w.nidhiToken, 'abc123');
    assert.deepEqual(w.replaced, ['/unsubscribe']);
  });

  it('takes everything else in the query with it, as before', () => {
    const w = open('/confirm/', '?utm_source=email&t=abc123');
    assert.equal(w.nidhiToken, 'abc123');
    assert.deepEqual(w.replaced, ['/confirm/']);
  });

  it('reads the links the mails send, in the canonical slash form (#448)', () => {
    for (const page of ['/confirm/', '/unsubscribe/']) {
      const w = open(page, '?t=abc123&utm_source=newsletter&utm_medium=email&utm_campaign=confirm');
      assert.equal(w.nidhiToken, 'abc123');
      assert.deepEqual(w.replaced, [page]);
    }
  });

  it('leaves the address alone when there is no token', () => {
    for (const search of ['', '?utm_source=email', '?t=']) {
      const w = open('/confirm', search);
      assert.equal(w.nidhiToken, '');
      assert.deepEqual(w.replaced, []);
    }
  });

  it('still hands over the token when the address cannot be rewritten', () => {
    const w = open('/unsubscribe', '?t=abc123', { blocked: true });
    assert.equal(w.nidhiToken, 'abc123');
  });

  it('hands over an empty token, and writes nothing, when the address cannot be read', () => {
    const w = open('/unsubscribe', '?t=abc123', { unreadable: true });
    assert.equal(w.nidhiToken, '');
    assert.deepEqual(w.replaced, []);
  });

  it('puts nothing but the path into the history entry: no state and no title', () => {
    const w = open('/confirm', '?t=abc123');
    assert.deepEqual(w.entries, [[null, '']]);
  });
});

describe('tokenGuard: where it defines its function', () => {
  it('on the window when there is one, as on the page', () => {
    const window: Win = {};
    const other: Win = {};
    runClassicScript(SOURCE, { window, globalThis: other, URLSearchParams });
    assert.equal(typeof window.nidhiTakeToken, 'function');
    assert.equal(other.nidhiTakeToken, undefined);
  });

  it('on the global object where there is no window', () => {
    const global: Win = {};
    runClassicScript(SOURCE, { globalThis: global, URLSearchParams });
    assert.equal(typeof global.nidhiTakeToken, 'function');
  });
});

describe('the confirm and unsubscribe pages', () => {
  for (const { name, source } of PAGES) {
    it(`${name}: runs the guard in the head, and reads the token from the window only`, () => {
      assert.match(source, /import tokenGuardScript from '\.\.\/utils\/shared\/tokenGuard\.js\?raw';/);
      const head = /<Fragment slot="head">([\s\S]*?)<\/Fragment>/.exec(source);
      assert.ok(head, 'no head slot');
      assert.ok(head[1].includes('<script is:inline set:html={tokenGuardScript}></script>'));
      assert.ok(head[1].includes('<script is:inline>window.nidhiTakeToken();</script>'));
      assert.ok(source.includes("var token = window.nidhiToken || '';"));
      assert.doesNotMatch(source, /location\.search|searchParams|params\.get\('t'\)/, 'the page reads the address itself');
    });
  }

  it('the head slot comes before the analytics script', () => {
    const slot = LAYOUT.indexOf('<slot name="head" />');
    const analytics = LAYOUT.search(/<Analytics\b/);
    assert.ok(slot > 0 && analytics > slot);
  });
});
