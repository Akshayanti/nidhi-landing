/**
 * Unit tests for src/utils/shared/toolStateGuard.js, which ToolStateGuard.astro
 * inlines in the head of every free tool page, and for the component that
 * inlines it.
 *
 * The file is a classic script, so it runs here as the page runs it, in a
 * context of its own, with stand-ins for `window.location` and `history`.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';
import * as loan from '../loan/url.ts';
import * as netWorth from '../multi-currency-net-worth/url.ts';
import * as monteCarlo from '../monte-carlo/url.ts';
import * as inflation from '../inflation/url.ts';
import * as investOrPayOff from '../invest-or-pay-off/url.ts';

const SOURCE = readFileSync(join(import.meta.dirname, 'toolStateGuard.js'), 'utf8');
const COMPONENT = readFileSync(join(import.meta.dirname, '../../components/ToolStateGuard.astro'), 'utf8');
const LAYOUT = readFileSync(join(import.meta.dirname, '../../layouts/BaseLayout.astro'), 'utf8');

const GLOBAL = '__shared';

interface Visit {
  /** What the tool would read on mount. */
  state: string | undefined;
  /** The address bar after the guard ran. */
  address: string;
  /** How many times the address was rewritten. */
  writes: number;
}

/** Opens `path` (a path with its ? and # parts) and runs the guard. */
function visit(path: string, keyPattern: string, globalName = GLOBAL): Visit {
  const url = new URL(path, 'https://nidhi.today');
  const location = { pathname: url.pathname, search: url.search, hash: url.hash };
  let writes = 0;
  const window: Record<string, any> = {
    location,
    history: {
      replaceState: (_s: unknown, _t: string, to: string) => {
        writes += 1;
        const next = new URL(to, 'https://nidhi.today');
        location.pathname = next.pathname;
        location.search = next.search;
        location.hash = next.hash;
      },
    },
  };
  runInNewContext(SOURCE, { window, globalThis: window, URLSearchParams });
  window.nidhiGuardToolState(globalName, keyPattern);
  return { state: window[globalName], address: location.pathname + location.search + location.hash, writes };
}

const PATTERN = loan.STATE_KEY_PATTERN;
const PAGE = '/hi/free/loan-comparison/';

describe('toolStateGuard: moving state out of the address', () => {
  it('moves # state into the window property and clears the address', () => {
    const v = visit(`${PAGE}#c=INR&v1=250000~8.5~20&v1_nm=Home+Bank`, PATTERN);
    assert.equal(v.state, 'c=INR&v1=250000%7E8.5%7E20&v1_nm=Home+Bank');
    assert.equal(v.address, PAGE);
  });

  it('moves old ? state the same way', () => {
    const v = visit(`${PAGE}?c=INR&v1=250000~8.5~20`, PATTERN);
    assert.equal(v.state, 'c=INR&v1=250000%7E8.5%7E20');
    assert.equal(v.address, PAGE);
  });

  it('keeps utm_* and other parameters, removing only the state', () => {
    const v = visit(`${PAGE}?utm_source=share&c=INR&ref=x&utm_medium=link#v1=1~2~3`, PATTERN);
    assert.equal(v.state, 'v1=1%7E2%7E3');
    assert.equal(v.address, `${PAGE}?utm_source=share&ref=x&utm_medium=link`);
  });

  it('removes ? state while keeping a plain anchor: ?utm_source=share&c=INR#faq', () => {
    const v = visit(`${PAGE}?utm_source=share&c=INR#faq`, PATTERN);
    assert.equal(v.state, 'c=INR');
    assert.equal(v.address, `${PAGE}?utm_source=share#faq`);
  });

  it('prefers the # state when both parts carry state, and removes both', () => {
    const v = visit(`${PAGE}?c=USD&utm_source=share#c=INR`, PATTERN);
    assert.equal(v.state, 'c=INR');
    assert.equal(v.address, `${PAGE}?utm_source=share`);
  });

  it('leaves no state value in the address, whichever part carried it', () => {
    for (const form of ['#c=SECRET&n=SECRET', '?c=SECRET&n=SECRET', '?c=SECRET#n=SECRET', '?utm_source=a&c=SECRET#n=SECRET&x=1']) {
      assert.doesNotMatch(visit(PAGE + form, PATTERN).address, /SECRET/, form);
    }
  });
});

describe('toolStateGuard: what is left alone', () => {
  it('does nothing on a plain visit', () => {
    const v = visit(PAGE, PATTERN);
    assert.deepEqual(v, { state: undefined, address: PAGE, writes: 0 });
  });

  it('does nothing for campaign parameters alone', () => {
    const v = visit(`${PAGE}?utm_source=instagram&utm_campaign=x`, PATTERN);
    assert.deepEqual(v, { state: undefined, address: `${PAGE}?utm_source=instagram&utm_campaign=x`, writes: 0 });
  });

  it('does nothing for a plain anchor', () => {
    const v = visit(`${PAGE}#faq`, PATTERN);
    assert.deepEqual(v, { state: undefined, address: `${PAGE}#faq`, writes: 0 });
  });

  it('matches whole parameter names only', () => {
    // `cc` and `xc` are not the state key `c`.
    const v = visit(`${PAGE}?cc=1&xc=2`, PATTERN);
    assert.equal(v.writes, 0);
  });
});

describe('toolStateGuard: every tool', () => {
  const tools = [
    ['loan comparison', loan, 'c=INR&n=2&v1=1~2~3&v2_nm=Bank'],
    ['net worth', netWorth, 'm=f&f=EUR&n=2&a1=Flat~EUR~1&p_USD=1.1'],
    ['Monte Carlo', monteCarlo, null],
    ['inflation calculator', inflation, null],
    ['invest or pay off', investOrPayOff, null],
  ] as const;

  it('each tool writes to its own window property', () => {
    const names = tools.map(([, mod]) => mod.SHARED_STATE_GLOBAL);
    assert.equal(new Set(names).size, names.length);
    for (const name of names) assert.match(name, /^__nidhi[A-Za-z]+Shared$/);
  });

  for (const [name, mod, sample] of tools) {
    it(`${name}: a # link and an old ? link both leave a clean address`, () => {
      // A single-letter class pattern such as [cabr] gives its own sample.
      const single = /^\[([A-Za-z]+)\]$/.exec(mod.STATE_KEY_PATTERN);
      const state = sample ?? [...single![1]].map((k) => `${k}=SECRET`).join('&');
      for (const sep of ['#', '?']) {
        const v = visit(`/free/tool/?utm_source=share${sep === '?' ? '&' : '#'}${state}`, mod.STATE_KEY_PATTERN, mod.SHARED_STATE_GLOBAL);
        assert.equal(v.address, '/free/tool/?utm_source=share', `${name} ${sep}`);
        assert.equal(new URLSearchParams(v.state).toString(), new URLSearchParams(state).toString());
      }
    });

    it(`${name}: its pattern never takes a campaign parameter for state`, () => {
      const isKey = new RegExp(`^(?:${mod.STATE_KEY_PATTERN})$`);
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'internal', 'faq']) {
        assert.equal(isKey.test(key), false, key);
      }
    });
  }
});

describe('ToolStateGuard.astro and where it runs', () => {
  it('inlines the tested script and calls it with the page’s own values', () => {
    assert.match(COMPONENT, /import guardScript from '\.\.\/utils\/shared\/toolStateGuard\.js\?raw';/);
    assert.match(COMPONENT, /<script is:inline set:html=\{guardScript\}><\/script>/);
    assert.match(COMPONENT, /<script is:inline define:vars=\{\{ globalName, keyPattern \}\}>\s*window\.nidhiGuardToolState\(globalName, keyPattern\);\s*<\/script>/);
  });

  it('runs in the head, before the analytics at the end of the body', () => {
    const head = LAYOUT.indexOf('<slot name="head"');
    const analytics = LAYOUT.indexOf('<Analytics');
    assert.ok(head > 0, 'BaseLayout has a head slot');
    assert.ok(analytics > 0, 'BaseLayout renders Analytics');
    assert.ok(head < LAYOUT.indexOf('</head>'), 'the head slot is inside <head>');
    assert.ok(analytics > LAYOUT.indexOf('\n  <body'), 'Analytics is inside <body>');
    assert.ok(head < analytics);
  });
});
