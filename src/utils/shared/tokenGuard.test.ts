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
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'tokenGuard.js'), 'utf8');
const PAGES = ['confirm', 'unsubscribe'].map((name) => ({
  name,
  source: readFileSync(join(import.meta.dirname, `../../pages/${name}.astro`), 'utf8'),
}));
const LAYOUT = readFileSync(join(import.meta.dirname, '../../layouts/BaseLayout.astro'), 'utf8');

type Win = Record<string, any>;

function open(pathname: string, search: string, { blocked = false } = {}): Win {
  const window: Win = {
    location: { pathname, search },
    URLSearchParams,
    replaced: [] as string[],
    history: {
      replaceState(_state: unknown, _title: string, url: string) {
        if (blocked) throw new Error('blocked');
        window.replaced.push(url);
      },
    },
  };
  runInNewContext(SOURCE, { window, globalThis: window, URLSearchParams });
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
