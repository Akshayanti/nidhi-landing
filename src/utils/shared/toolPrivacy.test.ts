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
 * The part of rule 3 that runs the tools' encoders (the guard's key pattern
 * matches every key an encoder can emit) is in toolPrivacy.keys.test.ts,
 * which reads no file: this one imports no tool's code, only reads it.
 *
 * Run with:  npm test
 */
import { readsSource } from '../../../test/mutationRun.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
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


describe('tool pages: every route under /free/ renders a guarded page', { skip: readsSource }, () => {
  it('finds the tool routes in both the English and the [locale] tree', () => {
    assert.ok(ROUTES.length >= 10, `only ${ROUTES.length} routes found`);
    const en = ROUTES.filter((f) => f.startsWith('pages/free/')).map((f) => f.replace('pages/free/', ''));
    const other = ROUTES.filter((f) => f.startsWith('pages/[locale]/free/')).map((f) => f.replace('pages/[locale]/free/', ''));
    assert.deepEqual(en, other, 'a tool is published in one tree and not the other');
  });

  it('each route imports exactly one page component from src/components/pages/ and renders it', () => {
    for (const route of ROUTES) {
      const pages = pageComponents(route);
      assert.equal(pages.length, 1, route);
      const name = /([A-Za-z]+)\.astro$/.exec(pages[0])![1];
      const body = read(route).split(/^---$/m).slice(2).join('---');
      assert.match(body, new RegExp(`<${name}\\b[^>]*/>`), `${route} does not render <${name} />`);
      assert.equal([...body.matchAll(/<[A-Z][A-Za-z]*/g)].length, 1, `${route} renders something besides <${name} />`);
    }
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

      // The values are the tool's own: the island this page mounts takes its
      // SHARED_STATE_GLOBAL from the same url.ts, reads its state from that
      // window property and publishes its state back to it.
      const mounted = [...text.matchAll(/import ([A-Za-z]+)(?:, \{[^}]*\})? from '([^']*\/components\/|\.\.\/)([A-Za-z]+)\.tsx';/g)]
        .filter((m) => new RegExp(`<${m[1]}\\s[^>]*client:`).test(text))
        .map((m) => `components/${m[3]}.tsx`);
      assert.equal(mounted.length, 1, `expected one island, found: ${mounted.join(', ')}`);
      const island = read(mounted[0]);
      const islandUrl = new RegExp(`import \\{[^}]*\\bSHARED_STATE_GLOBAL\\b[^}]*\\} from '[^']*/utils/${urlModule[2]}/url\\.ts';`);
      assert.match(island, islandUrl, `${mounted[0]} does not take SHARED_STATE_GLOBAL from ${urlModule[2]}/url.ts`);
      assert.match(island, /\(window as unknown as Record<string, unknown>\)\[SHARED_STATE_GLOBAL\]/, `${mounted[0]} does not read its state from the window property`);
      assert.match(island, /publishToolState\(SHARED_STATE_GLOBAL, /, `${mounted[0]} does not publish its state for the language switch`);
    });
  }
});

describe('tool islands: state comes from the window property, never the address', { skip: readsSource }, () => {
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

describe('no code outside the allowed places writes to the address', { skip: readsSource }, () => {
  // Each entry is a place that rewrites the address to take something out of it, never to put inputs in.
  const ALLOWED: Record<string, string> = {
    'utils/shared/toolStateGuard.js': 'moves shared tool state out of the address',
    'components/Analytics.astro': 'removes ?internal= after reading it',
    'components/LearnHome.astro': 'removes ?q= after applying a search-engine query',
    'utils/shared/tokenGuard.js': 'removes the confirm or unsubscribe token, in the page head',
  };

  it('replaceState and pushState appear only where the address is being cleaned, once each', () => {
    const writers = Object.fromEntries(
      codeFiles(SRC)
        .map((f) => [f.path, [...f.text.matchAll(/\b(replaceState|pushState)\b/g)].length] as const)
        .filter(([, n]) => n > 0)
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    const expected = Object.fromEntries(Object.keys(ALLOWED).sort().map((k) => [k, 1]));
    assert.deepEqual(writers, expected,
      'A file started writing to the address, writes to it once more, or stopped. Tools must never write inputs there (CLAUDE.md, "Free tools keep inputs out of URLs", rule 1).');
  });

  it('the links a tool island renders are the pinned ones', () => {
    // Every `href={...}` in the tool islands and the shared export bar. A new
    // one is checked by a person: no link may be built from what was typed.
    const EXPECTED_HREFS = [
      // A fixed path to the net worth calculator, handed down by the page.
      'components/MonteCarloSimulator.tsx: netWorthHref',
    ];
    const islands = codeFiles(SRC).filter((f) => /^components\/[A-Za-z]+\.tsx$/.test(f.path) && /SHARED_STATE_GLOBAL|tool-exportBtn/.test(f.text));
    const hrefs = islands.flatMap((f) => [...f.text.matchAll(/\bhref\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|'([^']*)')/g)].map((m) => `${f.path}: ${(m[1] ?? m[2] ?? m[3]).trim()}`)).sort();
    assert.deepEqual(hrefs, EXPECTED_HREFS, 'CLAUDE.md, "Free tools keep inputs out of URLs", rule 4: no link’s href may ever hold tool state.');
  });

  it('no href anywhere is built from tool state', () => {
    for (const f of codeFiles(SRC)) {
      for (const m of f.text.matchAll(/href=\{([^}]*)\}/g)) {
        assert.doesNotMatch(m[1], /SHARED_STATE_GLOBAL|toolStateGlobal|encode(State|ToQueryString|FullData|Shared)|publishableState/, `${f.path}: href={${m[1]}}`);
      }
    }
  });
});

describe('tracked tool events carry choices, never values', { skip: readsSource }, () => {
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

  // A property that is sent and is not a choice would be listed here, so
  // that nothing joins it unseen. There is none: the last one, the loan
  // comparison's horizon in months, stopped being sent in Nov 2026.
  const KNOWN_VALUES: Record<string, string[]> = {};

  const EXPECTED_VALUES: string[] = [
    "free_inflation_country_changed.country = code || 'none'",
    'free_inflation_currency_changed.currency = currency',
    "free_inflation_exported.format = 'pdf'",
    "free_inflation_exported.format = 'xlsx'",
    'free_inflation_mode_changed.mode = mode',
    "free_inflation_shared_view_opened.utm_source = new URLSearchParams(window.location.search).get('utm_source')",
    "free_invest_or_pay_off_exported.format = 'pdf'",
    "free_invest_or_pay_off_exported.format = 'xlsx'",
    "free_invest_or_pay_off_shared_view_opened.utm_source = new URLSearchParams(window.location.search).get('utm_source')",
    'free_loan_comparison_currency_changed.currency = next',
    'free_loan_comparison_details_toggled.vendor = label',
    "free_loan_comparison_exported.format = 'pdf'",
    "free_loan_comparison_exported.format = 'xlsx'",
    "free_loan_comparison_mode_changed.mode = 'payment'",
    "free_loan_comparison_mode_changed.mode = 'term'",
    'free_loan_comparison_mode_changed.vendor = label',
    "free_loan_comparison_rate_kind_changed.rateKind = 'fixed'",
    "free_loan_comparison_rate_kind_changed.rateKind = 'hybrid'",
    'free_loan_comparison_rate_kind_changed.vendor = label',
    'free_loan_comparison_refi_changed.field = field',
    "free_loan_comparison_shared_view_opened.utm_source = new URLSearchParams(window.location.search).get('utm_source') ?? null",
    'free_loan_comparison_shared_view_opened.vendors = decoded.length',
    'free_loan_comparison_split_vendor_changed.vendor = VENDOR_LABELS[next]',
    'free_loan_comparison_tab_changed.tab = nextTab.id',
    'free_loan_comparison_tab_changed.tab = t.id',
    "free_loan_comparison_tab_changed.via = 'click'",
    "free_loan_comparison_tab_changed.via = 'keyboard'",
    'free_loan_comparison_validation_error.count = errored.length',
    'free_loan_comparison_validation_error.firstReason = firstReason',
    'free_loan_comparison_validation_error.firstVendor = VENDOR_LABELS[errored[0].i]',
    'free_loan_comparison_vendor_added.count = vendors.length + 1',
    'free_loan_comparison_vendor_removed.count = vendors.length - 1',
    'free_loan_comparison_vendor_removed.vendor = removedLabel',
    'free_monte_carlo_currency_changed.currency = e.target.value',
    "free_monte_carlo_exported.format = 'pdf'",
    "free_monte_carlo_exported.format = 'xlsx'",
    'free_monte_carlo_returns_changed.setting = s',
    'free_monte_carlo_runs_changed.runs = paths',
    "free_monte_carlo_shared_view_opened.utm_source = new URLSearchParams(window.location.search).get('utm_source')",
    'free_monte_carlo_withdrawal_toggled.on = on',
    'free_multi_currency_net_worth_asset_added.count = rows.length + 1',
    'free_multi_currency_net_worth_asset_removed.count = rows.length - 1',
    'free_multi_currency_net_worth_csv_downloaded.count = filled.length',
    'free_multi_currency_net_worth_csv_overwrite_confirmed.count = csvConfirmPending.length',
    'free_multi_currency_net_worth_csv_parse_errors.errorCount = parseErrors.length',
    'free_multi_currency_net_worth_csv_parse_errors.firstReason = firstReason',
    'free_multi_currency_net_worth_csv_parse_errors.validRowCount = parsed.length',
    'free_multi_currency_net_worth_csv_uploaded.count = newRows.length',
    "free_multi_currency_net_worth_exported.format = 'pdf'",
    "free_multi_currency_net_worth_exported.format = 'xlsx'",
    'free_multi_currency_net_worth_func_currency_changed.currency = next',
    'free_multi_currency_net_worth_rates_error.functionalCurrency = functionalCurrency',
    'free_multi_currency_net_worth_rates_error.reason = reason',
    'free_multi_currency_net_worth_share_copied.mode = shareMode',
    "free_multi_currency_net_worth_shared_view_opened.mode = decoded.shareMode ?? 'unknown'",
    'free_multi_currency_net_worth_shared_view_opened.positions = decoded.sharedPositions.length',
    'free_multi_currency_net_worth_shared_view_opened.utm_source = utmSource ?? null',
  ];

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

  it('each property is given exactly the pinned expression', () => {
    // What each tool event property is set to, as written in the source. A
    // name says what kind of thing is sent; this says where it comes from. A
    // changed or new line here is read by a person: is it still a choice, a
    // count or a yes or no? What is really sent is then checked in a browser
    // (scripts/verify-tool-privacy.mjs), since a variable can hold anything.
    const actual = [...new Set(toolCalls.flatMap((c) => Object.entries(c.properties).map(([name, expr]) => `${c.event}.${name} = ${expr}`)))].sort();
    assert.deepEqual(actual, EXPECTED_VALUES.slice().sort(),
      'A tool event property is new, or set from somewhere else. Tracked events carry choices, never values (CLAUDE.md, "Free tools keep inputs out of URLs", rule 5).\n' +
      `Added: ${actual.filter((x) => !EXPECTED_VALUES.includes(x)).join(' | ') || 'none'}\nRemoved: ${EXPECTED_VALUES.filter((x) => !actual.includes(x)).join(' | ') || 'none'}`);
  });

  it('the known exceptions are still exactly these', () => {
    for (const [event, names] of Object.entries(KNOWN_VALUES)) {
      const sent = new Set(toolCalls.filter((c) => c.event === event).flatMap((c) => Object.keys(c.properties)));
      for (const name of names) assert.ok(sent.has(name), `${event}.${name} is no longer sent: remove it from KNOWN_VALUES`);
    }
  });
});
