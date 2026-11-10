/**
 * The structural privacy rules every free tool keeps (CLAUDE.md, "Free tools
 * keep inputs out of URLs"), checked against the source:
 *
 *   rule 1  no tool writes its inputs into the address;
 *   rule 3  every tool page uses ToolStateGuard with its own tool's values,
 *           the guard's key pattern matches every key the tool's encoder can
 *           emit, and the tool reads its state from the window property;
 *   rule 4  no link's href is built from tool state;
 *   rule 5  tracked events carry choices, never values.
 *
 * A sixth tool, or a new field in an existing one, is where these slip. The
 * pages and components are read as text, the way the label registry test
 * reads them.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import * as loan from '../loan/url.ts';
import * as netWorth from '../multi-currency-net-worth/url.ts';
import type { AssetRow, CurrencyPosition } from '../multi-currency-net-worth/math.ts';
import * as monteCarlo from '../monte-carlo/url.ts';
import * as inflation from '../inflation/url.ts';
import * as investOrPayOff from '../invest-or-pay-off/url.ts';
import { codeFiles, scanEvents } from '../privacySurface.ts';

const SRC = resolve(import.meta.dirname, '../..');
const read = (path: string): string => readFileSync(join(SRC, path), 'utf8');

function astroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(SRC, dir)).sort()) {
    const path = `${dir}/${name}`;
    if (statSync(join(SRC, path)).isDirectory()) out.push(...astroFiles(path));
    else if (name.endsWith('.astro')) out.push(path);
  }
  return out;
}

/** The files a source file imports from `components/pages/`, as paths from `src/`. */
function pageComponents(file: string): string[] {
  const out: string[] = [];
  for (const m of read(file).matchAll(/from\s+'([^']*components\/pages\/[^']+\.astro)'/g)) {
    out.push(relative(SRC, resolve(join(SRC, dirname(file)), m[1])).split('\\').join('/'));
  }
  return out;
}

// Every route under /free/ in every language, except the hub, which lists the tools and holds no inputs.
const ROUTES = [...astroFiles('pages/free'), ...astroFiles('pages/[locale]/free')].filter((f) => !/\/free\/index\.astro$/.test(f));
const TOOL_PAGES = [...new Set(ROUTES.flatMap(pageComponents))].sort();

const key = (pattern: string): RegExp => new RegExp(`^(?:${pattern})$`);
const keysOf = (encoded: string): string[] => [...new URLSearchParams(encoded).keys()];

describe('tool pages: every route under /free/ renders a guarded page', () => {
  it('finds the tool routes in both the English and the [locale] tree', () => {
    assert.ok(ROUTES.length >= 10, `only ${ROUTES.length} routes found`);
    const en = ROUTES.filter((f) => f.startsWith('pages/free/')).map((f) => f.replace('pages/free/', ''));
    const other = ROUTES.filter((f) => f.startsWith('pages/[locale]/free/')).map((f) => f.replace('pages/[locale]/free/', ''));
    assert.deepEqual(en, other, 'a tool is published in one tree and not the other');
  });

  it('each route renders exactly one page component from src/components/pages/', () => {
    for (const route of ROUTES) assert.equal(pageComponents(route).length, 1, route);
  });

  it('the hub is the only page under /free/ without inputs', () => {
    assert.ok(existsSync(join(SRC, 'pages/free/index.astro')));
    assert.deepEqual(pageComponents('pages/free/index.astro'), ['components/pages/FreeHubPage.astro']);
    assert.ok(!TOOL_PAGES.includes('components/pages/FreeHubPage.astro'));
  });

  const seenUrlModules = new Set<string>();
  for (const page of TOOL_PAGES) {
    it(`${page} uses ToolStateGuard with its own tool's values`, () => {
      const text = read(page);
      assert.match(text, /import ToolStateGuard from '[^']*\/ToolStateGuard\.astro';/, 'does not import ToolStateGuard');
      const urlModule = /import \{ SHARED_STATE_GLOBAL, STATE_KEY_PATTERN \} from '([^']*\/utils\/([a-z-]+)\/url\.ts)';/.exec(text);
      assert.ok(urlModule, 'does not import SHARED_STATE_GLOBAL and STATE_KEY_PATTERN from a tool url.ts');
      assert.ok(!seenUrlModules.has(urlModule[2]), `two pages share ${urlModule[2]}/url.ts`);
      seenUrlModules.add(urlModule[2]);
      assert.match(
        text,
        /<ToolStateGuard slot="head" globalName=\{SHARED_STATE_GLOBAL\} keyPattern=\{STATE_KEY_PATTERN\} \/>/,
        'ToolStateGuard is not in the head slot with the tool’s own values',
      );
      // The language switch carries the state from the same window property.
      assert.match(text, /toolStateGlobal=\{SHARED_STATE_GLOBAL\}/, 'the layout is not given the tool’s window property');
    });
  }
});

describe('tool islands: state comes from the window property, never the address', () => {
  // The React components the tool pages mount.
  const islands = codeFiles(SRC).filter((f) => /^components\/[A-Za-z]+\.tsx$/.test(f.path) && /SHARED_STATE_GLOBAL/.test(f.text));

  it('finds one island per tool page', () => {
    assert.equal(islands.length, TOOL_PAGES.length, islands.map((f) => f.path).join(', '));
  });

  for (const island of islands) {
    it(`${island.path} never reads state from, or writes to, the address`, () => {
      assert.doesNotMatch(island.text, /location\.hash/, 'reads the # part of the address');
      assert.doesNotMatch(island.text, /location\.href/, 'reads the whole address');
      assert.doesNotMatch(island.text, /\b(replaceState|pushState)\b/, 'writes to the address');
      assert.doesNotMatch(island.text, /location\.(assign|replace)\(|location\s*=[^=]|location\.search\s*=[^=]|location\.hash\s*=[^=]/, 'navigates with state');
      // The query string is read for one thing only: the campaign tag of a shared link.
      for (const m of island.text.matchAll(/location\.search[^\n]*/g)) {
        assert.match(m[0], /^location\.search\)\.get\('utm_source'\)/, `reads the query string for something else: ${m[0]}`);
      }
    });
  }
});

describe('no code outside the allowed places writes to the address', () => {
  // Each entry is a place that rewrites the address to take something out of it, never to put inputs in.
  const ALLOWED: Record<string, string> = {
    'utils/shared/toolStateGuard.js': 'moves shared tool state out of the address',
    'components/Analytics.astro': 'removes ?internal= after reading it',
    'components/LearnHome.tsx': 'removes ?q= after applying a search-engine query',
    'pages/confirm.astro': 'removes the confirm token',
    'pages/unsubscribe.astro': 'removes the unsubscribe token',
  };

  it('replaceState and pushState appear only where the address is being cleaned', () => {
    const writers = codeFiles(SRC).filter((f) => /\b(replaceState|pushState)\b/.test(f.text)).map((f) => f.path).sort();
    assert.deepEqual(writers, Object.keys(ALLOWED).sort(),
      'A file started writing to the address, or stopped. Tools must never write inputs there (CLAUDE.md, "Free tools keep inputs out of URLs", rule 1).');
  });

  it('no href in a component is built from tool state', () => {
    for (const f of codeFiles(SRC)) {
      for (const m of f.text.matchAll(/href=\{([^}]*)\}/g)) {
        assert.doesNotMatch(m[1], /SHARED_STATE_GLOBAL|toolStateGlobal|encode(State|ToQueryString|FullData|Shared)|publishableState/, `${f.path}: href={${m[1]}}`);
      }
    }
  });
});

describe('the guard’s key pattern covers every key the encoder can emit', () => {
  it('loan comparison: five offers with every field changed', () => {
    // Built from the default shapes, so a field added later is changed here too.
    const special: Record<string, string> = { name: 'Home Bank ~ & Co', modeKind: 'payment', rateKind: 'hybrid', lumpSumsEncoded: '12:5000;24:2500' };
    const vendors = Array.from({ length: loan.MAX_VENDORS }, (_, i) => {
      const v = loan.makeDefaultVendor(i) as unknown as Record<string, string>;
      for (const field of Object.keys(v)) v[field] = special[field] ?? (v[field] === '7' ? '8' : '7');
      return v as unknown as loan.VendorInput;
    });
    const global = { ...loan.DEFAULT_GLOBAL_STATE } as unknown as Record<string, string | boolean>;
    for (const field of Object.keys(global)) {
      global[field] = typeof global[field] === 'boolean' ? true : field === 'currency' ? 'INR' : field === 'activeTab' ? 'refi' : '7';
    }
    const keys = keysOf(loan.encodeToQueryString(vendors, global as unknown as loan.GlobalState));
    const isKey = key(loan.STATE_KEY_PATTERN);
    for (const k of keys) assert.ok(isKey.test(k), `the pattern misses ${k}`);
    // Ten globals, then per offer the tuple and its eight advanced fields.
    assert.equal(keys.length, 10 + loan.MAX_VENDORS * 9, keys.join(' '));
  });

  const rows: AssetRow[] = Array.from({ length: 60 }, (_, i) => ({
    name: `Asset ${i} ~ flat`, value: String(1000 + i), currency: i % 2 ? 'INR' : 'USD', type: i % 3 ? 'asset' : 'liability',
  }));
  const positions: CurrencyPosition[] = ['EUR', 'USD', 'INR', 'CZK', 'JPY'].map((code, i) => ({
    code, netAmountOriginal: 1000 + i, netAmountFunctional: 900 + i, pctOfTotal: 20, isFunctional: i === 0,
    riskLevel: 'low', riskLabel: 'Low',
  } as CurrencyPosition));

  it('net worth: the tool’s own state, a full share and a redacted share', () => {
    const isKey = key(netWorth.STATE_KEY_PATTERN);
    const own = keysOf(netWorth.encodeFullData(rows, 'INR'));
    const full = keysOf(netWorth.encodeShared(rows, positions, 'INR', 'full'));
    const redacted = keysOf(netWorth.encodeShared(rows, positions, 'INR', 'redacted'));
    for (const k of [...own, ...full, ...redacted]) assert.ok(isKey.test(k), `the pattern misses ${k}`);
    assert.ok(own.includes('f') && own.includes('n') && own.includes('a50'), own.join(' '));
    assert.ok(full.includes('m') && full.includes('p_CZK'), full.join(' '));
    assert.deepEqual(redacted.sort(), ['f', 'm', 'p_CZK', 'p_EUR', 'p_INR', 'p_JPY', 'p_USD']);
  });

  it('Monte Carlo: every field changed emits every key', () => {
    const state: monteCarlo.ToolState = {
      ...monteCarlo.DEFAULTS, currency: 'INR', start: 1, monthly: 2, saveYears: 3, stockPct: 4, withdrawal: 5,
      withdrawYears: 6, feePct: 0.5, returns: 'optimistic', paths: monteCarlo.DEFAULTS.paths + 1,
    };
    for (const field of Object.keys(monteCarlo.DEFAULTS) as (keyof monteCarlo.ToolState)[]) {
      assert.notEqual(state[field], monteCarlo.DEFAULTS[field], `${field} is new: change it in this test`);
    }
    const keys = keysOf(monteCarlo.encodeState(state));
    assert.deepEqual(keys.slice().sort(), [...monteCarlo.STATE_KEYS].sort());
    const isKey = key(monteCarlo.STATE_KEY_PATTERN);
    for (const k of keys) assert.ok(isKey.test(k), `the pattern misses ${k}`);
  });

  it('inflation and invest or pay off: the pattern is built from the encoder’s own key list', () => {
    for (const mod of [inflation, investOrPayOff, monteCarlo]) {
      assert.equal(mod.STATE_KEY_PATTERN, `[${mod.STATE_KEYS.join('')}]`);
      for (const k of mod.STATE_KEYS) assert.equal(k.length, 1, `${k}: a character class matches one letter`);
    }
  });

  it('no tool’s pattern takes a campaign or site parameter for state', () => {
    for (const mod of [loan, netWorth, monteCarlo, inflation, investOrPayOff]) {
      const isKey = key(mod.STATE_KEY_PATTERN);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'internal', 'q']) {
        assert.equal(isKey.test(k), false, `${mod.SHARED_STATE_GLOBAL}: ${k}`);
      }
    }
  });
});

describe('tracked tool events carry choices, never values', () => {
  const { calls, unresolved } = scanEvents(codeFiles(SRC));
  const toolCalls = calls.filter((c) => c.event.startsWith('free_'));

  // A property name says what kind of thing is sent. Each of these is a
  // choice from a fixed list, a count, or a yes or no: never an amount, a
  // rate, a name or the encoded state.
  const CHOICES = new Set([
    'count', 'vendors', 'positions', 'errorCount', 'validRowCount', 'runs', // how many
    'currency', 'functionalCurrency', 'country', // which code, from a list
    'mode', 'format', 'setting', 'tab', 'via', 'rateKind', 'field', // which option
    'vendor', 'firstVendor', // which slot, A to E: never the offer's name
    'on', // yes or no
    'utm_source', // the campaign tag of a shared link
    'firstReason', 'reason', // which kind of error
  ]);

  // Sent today, and not a choice. Listed so that nothing joins them unseen;
  // each is recorded in docs/curr_bugs.md until it is settled.
  const KNOWN_VALUES: Record<string, string[]> = {
    // The horizon someone typed or dragged to, in months.
    free_loan_comparison_horizon_changed: ['months'],
  };

  it('reads every event call in the source', () => {
    assert.deepEqual(unresolved, [], 'write the event name as a string and its properties as an object literal');
    assert.ok(toolCalls.length >= 60, `only ${toolCalls.length} tool event calls found`);
  });

  it('every tool event belongs to a tool, by name', () => {
    for (const c of toolCalls) {
      assert.match(c.event, /^free_(loan_comparison|multi_currency_net_worth|monte_carlo|inflation|invest_or_pay_off)_[a-z_]+$/, c.file);
    }
  });

  it('every property is a known kind of choice', () => {
    for (const c of toolCalls) {
      for (const name of Object.keys(c.properties)) {
        if (KNOWN_VALUES[c.event]?.includes(name)) continue;
        assert.ok(CHOICES.has(name),
          `${c.file}: ${c.event} sends "${name}". Tracked events carry choices, never values (CLAUDE.md, "Free tools keep inputs out of URLs", rule 5). ` +
          'If it is a choice, add the name to CHOICES here, to EXPECTED_EVENTS in src/utils/privacySurface.test.ts and to the privacy changelog.');
      }
    }
  });

  it('no property is given a field’s value, the encoded state or an address', () => {
    // A <select>'s value is one of its options: here, a currency code from the list.
    const SELECTS = new Set(['free_monte_carlo_currency_changed.currency']);
    for (const c of toolCalls) {
      for (const [name, expr] of Object.entries(c.properties)) {
        if (KNOWN_VALUES[c.event]?.includes(name) || SELECTS.has(`${c.event}.${name}`)) continue;
        assert.doesNotMatch(expr, /\.(value|name|principal|amount|rate)\b(?!s?\.length)/i, `${c.file}: ${c.event}.${name} = ${expr}`);
        assert.doesNotMatch(expr, /encode|publishableState|location\.(href|hash|pathname)|SHARED_STATE_GLOBAL/, `${c.file}: ${c.event}.${name} = ${expr}`);
      }
    }
  });

  it('the known exceptions are still exactly these', () => {
    for (const [event, names] of Object.entries(KNOWN_VALUES)) {
      const sent = new Set(toolCalls.filter((c) => c.event === event).flatMap((c) => Object.keys(c.properties)));
      for (const name of names) assert.ok(sent.has(name), `${event}.${name} is no longer sent: remove it from KNOWN_VALUES`);
    }
  });
});
