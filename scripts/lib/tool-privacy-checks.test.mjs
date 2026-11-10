/**
 * The checks scripts/verify-tool-privacy.mjs applies to the PostHog requests
 * a free tool page tried to send. Each one is shown a payload it must reject:
 * a check that cannot fail is the failure the script exists to prevent.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import {
  AMOUNTS, NAMES, TEST_KEY, addressProblems, checkRun, decodeBody, elementProblems, eventsIn, findLeaks,
} from './tool-privacy-checks.mjs';

const ORIGIN = 'http://127.0.0.1:4000';
const OWN = /^free_loan_comparison_/;

const ev = (event, properties = {}) => ({ event, properties: { $current_url: `${ORIGIN}/free/loan-comparison/`, ...properties } });
const CHAIN = 'button:attr__data-attr="lc-reset"nth-child="2"nth-of-type="1";div:nth-child="1"nth-of-type="1";body:nth-child="2"nth-of-type="1"';

/** A run with everything a clean consent run has. */
function cleanEvents(consent = 'accepted') {
  const events = [ev('$pageview'), ev('free_loan_comparison_reset'), ev('$pageleave')];
  if (consent === 'accepted') events.push(ev('$autocapture', { $elements_chain: CHAIN, $event_type: 'click' }), ev('$rageclick', { $elements_chain: CHAIN }), ev('$dead_click', { $elements_chain: CHAIN }));
  return events;
}

/** Judges `events` as the script would: packed into request bodies, decoded, then checked. */
function judge(events, { consent = 'accepted', headless = false, url = 'https://eu.i.posthog.com/i/v0/e/', extraRequests = [] } = {}) {
  const bodies = [{ url, body: gzipSync(JSON.stringify(events)) }, ...extraRequests];
  const decoded = bodies.map((r) => ({ url: r.url, ...decodeBody(r.url, r.body, gunzipSync) }));
  return checkRun({ decoded, events: decoded.flatMap((d) => eventsIn(d.json)), consent, headless, ownEvents: OWN, hasCharts: true, origin: ORIGIN });
}

describe('tool privacy checks: a clean run passes', () => {
  it('with consent', () => assert.deepEqual(judge(cleanEvents()).problems, []));
  it('without consent', () => assert.deepEqual(judge(cleanEvents('declined'), { consent: 'declined' }).problems, []));
  it('counts each event', () => assert.equal(judge(cleanEvents()).counts.$pageview, 1));
});

describe('tool privacy checks: what was typed', () => {
  it('finds an amount however it is grouped or encoded', () => {
    for (const text of ['7131719', '7,131,719', '71,31,719', '7.131.719', '7 131 719', '7 131 719', "7'131'719", '%377131719', 'a1=Flat~EUR~7131719', 'x7131719.00']) {
      assert.deepEqual(findLeaks(text), ['7131719'], text);
    }
  });

  it('finds a name in any case, whole or encoded', () => {
    assert.deepEqual(findLeaks('aria-label="Remove ZQXVORA bank"'), ['zqxvora']);
    assert.deepEqual(findLeaks('v1=Zqxvora+Bank~1'), ['zqxvora']);
    assert.deepEqual(findLeaks('n=Wjkpelt%20Flat'), ['wjkpelt']);
  });

  it('does not find them where they are not', () => {
    // Digits split by a grouping mark are joined on purpose: better a false alarm than a miss.
    for (const text of ['', 'pages 713 to 1719', '2026-11-10T07:13:17.190Z', 'bank flat', '0193a7131-71x9', '7131718', '713171']) {
      assert.deepEqual(findLeaks(text), [], text);
    }
  });

  it('uses values that cannot be mistaken for one another', () => {
    assert.equal(new Set(AMOUNTS).size, AMOUNTS.length);
    for (const a of AMOUNTS) assert.match(String(a), /^\d{7}$/);
    for (const n of NAMES) assert.match(n, /^[A-Z][a-z]{6} [A-Z][a-z]+$/);
  });

  for (const [what, properties] of [
    ['an event property', { amount: AMOUNTS[0] }],
    ['a grouped amount in a label', { $elements_chain: `button:attr__aria-label="Remove 7,131,719"nth-child="1"nth-of-type="1"` }],
    ['an offer name', { vendor_name: NAMES[0] }],
    ['a tool address with state', { $current_url: `${ORIGIN}/free/loan-comparison/#v1=${encodeURIComponent(NAMES[0])}~${AMOUNTS[1]}` }],
    ['a key of a nested object', { $heatmap_data: { [`${ORIGIN}/free/loan-comparison/?v1_a=${AMOUNTS[2]}`]: [{ x: 1, y: 2 }] } }],
    ['a person property', { $set: { $initial_current_url: `${ORIGIN}/free/x/?a=${AMOUNTS[0]}` } }],
  ]) {
    it(`fails a run that sends it in ${what}`, () => {
      const { problems } = judge([...cleanEvents(), ev('free_loan_comparison_x', properties)]);
      assert.ok(problems.some((p) => p.includes('carries what was typed')), problems.join('\n'));
    });
  }

  it('fails a run that sends it in a request address, or in a request that is not an event', () => {
    assert.ok(judge(cleanEvents(), { url: `https://eu.i.posthog.com/i/v0/e/?u=${AMOUNTS[0]}` }).problems.some((p) => p.includes('carries what was typed')));
    const flags = { url: 'https://eu.i.posthog.com/flags/?v=2', body: gzipSync(JSON.stringify({ token: TEST_KEY, person_properties: { note: NAMES[1] } })) };
    assert.ok(judge(cleanEvents(), { extraRequests: [flags] }).problems.some((p) => p.includes('/flags/') && p.includes('wjkpelt')));
  });
});

describe('tool privacy checks: files and local addresses', () => {
  for (const [what, value, expected] of [
    ['a spreadsheet name', 'loan-comparison-2026-11-10.xlsx', 'file name'],
    ['a CSV name', 'net-worth.csv', 'file name'],
    ['a blob address', 'blob:http://127.0.0.1:4000/0b1c2d3e-aaaa', 'blob: or data:'],
    ['a data address', 'data:text/csv;base64,QUJD', 'blob: or data:'],
  ]) {
    it(`fails a run that sends ${what}`, () => {
      const { problems } = judge([...cleanEvents(), ev('$autocapture', { $elements_chain: CHAIN, href: value })]);
      assert.ok(problems.some((p) => p.includes(expected)), problems.join('\n'));
    });
  }
});

describe('tool privacy checks: element descriptions', () => {
  it('accepts a tag with a label and positions, a tag alone, and an empty chain', () => {
    for (const chain of [CHAIN, 'svg:', 'path:nth-child="3"', 'a:attr__data-attr="nav-menu-learn"', '']) {
      assert.deepEqual(elementProblems(ev('$autocapture', { $elements_chain: chain })), [], chain);
    }
  });

  for (const chain of [
    'button.lc-btn:attr__data-attr="lc-reset"nth-child="1"', // a class
    'button:attr__aria-label="Remove Home Bank"nth-child="1"', // an accessibility label
    'a:attr__href="/free/x/#a=1"nth-child="1"', // a link
    'input:attr__value="250000"nth-child="1"', // a value
    'button:text="Remove"nth-child="1"', // text
    'button:attr__data-attr="Lc Reset"', // not a slug
    'button:attr__id="_r1_"nth-of-type="1"', // an id
    'path:attr__d="M0 0L7 13"', // chart geometry
    'button:nth-child="1";div:attr__style="width: 12px"', // an ancestor
  ]) {
    it(`rejects ${chain.slice(0, 50)}`, () => {
      assert.notDeepEqual(elementProblems(ev('$autocapture', { $elements_chain: chain })), []);
      assert.notDeepEqual(judge([...cleanEvents(), ev('$dead_click', { $elements_chain: chain })]).problems, []);
    });
  }

  it('rejects an element list with anything but a tag, a label and positions', () => {
    assert.deepEqual(elementProblems(ev('$autocapture', { $elements: [{ tag_name: 'button', 'attr__data-attr': 'lc-reset', nth_child: 1, nth_of_type: 1 }] })), []);
    assert.notDeepEqual(elementProblems(ev('$autocapture', { $elements: [{ tag_name: 'button', $el_text: 'Remove' }] })), []);
    assert.notDeepEqual(elementProblems(ev('$autocapture', { $elements: [{ tag_name: 'a', attr__href: '/x' }] })), []);
    assert.notDeepEqual(elementProblems(ev('$autocapture', { $elements_chain: 'svg:', $el_text: 'x' })), []);
  });
});

describe('tool privacy checks: tool addresses', () => {
  it('accepts a tool address with campaign tags only, in any edition', () => {
    for (const url of [`${ORIGIN}/free/loan-comparison/`, `${ORIGIN}/hi/free/loan-comparison/?utm_source=share&utm_medium=referral`, '/mr/free/inflation-calculator/', `${ORIGIN}/free/`, 'https://example.com/free/x/?a=1#b']) {
      assert.deepEqual(addressProblems(ev('$pageview', { $current_url: url }), ORIGIN), [], url);
    }
  });

  for (const url of [`${ORIGIN}/free/loan-comparison/?c=INR`, `${ORIGIN}/free/loan-comparison/#c=INR`, `${ORIGIN}/es/free/monte-carlo-simulator/?utm_source=share&s=1`, '/cs/free/invest-or-pay-off/#faq']) {
    it(`rejects ${url.replace(ORIGIN, '')}`, () => {
      assert.notDeepEqual(addressProblems(ev('$pageview', { $referrer: url }), ORIGIN), []);
      assert.notDeepEqual(addressProblems(ev('$pageview', { $set_once: { $initial_referrer: url } }), ORIGIN), []);
    });
  }
});

describe('tool privacy checks: the events have to be there', () => {
  const without = (name, consent = 'accepted') => cleanEvents(consent).filter((e) => e.event !== name);

  it('fails when nothing was sent at all', () => {
    const { problems } = checkRun({ decoded: [], events: [], consent: 'accepted', headless: false, ownEvents: OWN, hasCharts: true, origin: ORIGIN });
    assert.ok(problems.some((p) => p.includes('no PostHog request was seen')));
  });

  it('fails without a pageview, a page-leave or one of the tool’s own events', () => {
    assert.ok(judge(without('$pageview')).problems.some((p) => p.includes('no $pageview')));
    assert.ok(judge(without('$pageleave')).problems.some((p) => p.includes('no $pageleave')));
    assert.ok(judge(without('free_loan_comparison_reset')).problems.some((p) => p.includes('own events')));
  });

  it('a headless run is not asked for a page-leave', () => {
    assert.deepEqual(judge(without('$pageleave'), { headless: true }).problems, []);
  });

  it('with consent, fails when click capture never started', () => {
    assert.ok(judge(without('$autocapture')).problems.some((p) => p.includes('no $autocapture')));
    const neither = cleanEvents().filter((e) => e.event !== '$rageclick' && e.event !== '$dead_click');
    assert.ok(judge(neither).problems.some((p) => p.includes('no $rageclick or $dead_click')));
    assert.deepEqual(judge(without('$rageclick')).problems, [], 'either one is enough');
  });

  it('without consent, fails when any click event was sent', () => {
    for (const name of ['$autocapture', '$rageclick', '$dead_click', '$$heatmap']) {
      const { problems } = judge([...cleanEvents('declined'), ev(name, { $elements_chain: CHAIN })], { consent: 'declined' });
      assert.ok(problems.some((p) => p.includes(`yet ${name} was sent`)), name);
    }
  });
});

describe('tool privacy checks: reading request bodies', () => {
  const events = [ev('$pageview'), ev('$pageleave')];

  it('reads gzip, plain JSON, a batch, and base64 in a form field', () => {
    const json = JSON.stringify(events);
    const forms = [
      gzipSync(json),
      Buffer.from(json),
      Buffer.from(JSON.stringify({ api_key: TEST_KEY, batch: events })),
      Buffer.from(`data=${encodeURIComponent(Buffer.from(json).toString('base64'))}&compression=base64`),
      Buffer.from(Buffer.from(json).toString('base64')),
    ];
    for (const body of forms) {
      const d = decodeBody('https://eu.i.posthog.com/e/', body, gunzipSync);
      assert.deepEqual(eventsIn(d.json).map((e) => e.event), ['$pageview', '$pageleave']);
      assert.ok(d.text.includes('$pageleave'));
    }
  });

  it('a body it cannot read fails the run instead of passing unseen', () => {
    const d = decodeBody('https://eu.i.posthog.com/e/', Buffer.from([0x1f, 0x8b, 1, 2, 3]), gunzipSync);
    assert.equal(d.unreadable, true);
    const { problems } = judge(cleanEvents(), { extraRequests: [{ url: 'https://eu.i.posthog.com/e/', body: Buffer.from('not json at all') }] });
    assert.ok(problems.some((p) => p.includes('could not be decoded')));
  });

  it('an empty body is nothing to check', () => {
    assert.deepEqual(decodeBody('u', Buffer.alloc(0), gunzipSync), { text: '', json: null, empty: true });
  });
});

describe('verify-tool-privacy.mjs stays in step with the site', () => {
  const script = fs.readFileSync('scripts/verify-tool-privacy.mjs', 'utf8');

  it('uses the key a test build carries', () => {
    assert.ok(fs.readFileSync('src/components/Analytics.astro', 'utf8').includes(`'${TEST_KEY}'`));
  });

  it('runs every language the site serves', () => {
    const locales = /export const LOCALES = \[([^\]]+)\] as const;/.exec(fs.readFileSync('src/i18n/config.ts', 'utf8'))[1];
    const inScript = /export const LOCALE_CODES = \[([^\]]+)\];/.exec(script)[1];
    assert.equal(inScript.replace(/\s/g, ''), locales.replace(/\s/g, ''));
  });

  it('runs every tool that has a page, with that tool’s own window property', () => {
    const routes = fs.readdirSync('src/pages/free').filter((f) => f !== 'index.astro').map((f) => f.replace(/\.astro$/, '')).sort();
    const inScript = [...script.matchAll(/^  '([a-z-]+)': \{\n    global: '(__nidhi[A-Za-z]+Shared)',/gm)];
    assert.deepEqual(inScript.map((m) => m[1]).sort(), routes);
    const globals = fs.readdirSync('src/utils', { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(`src/utils/${d.name}/url.ts`))
      .map((d) => /export const SHARED_STATE_GLOBAL = '([^']+)';/.exec(fs.readFileSync(`src/utils/${d.name}/url.ts`, 'utf8'))[1])
      .sort();
    assert.deepEqual(inScript.map((m) => m[2]).sort(), globals);
  });

  it('lets nothing through to PostHog but its static scripts', () => {
    assert.ok(script.includes("'--host-resolver-rules=MAP eu.i.posthog.com ~NOTFOUND'"));
    assert.ok(script.includes("'--disable-blink-features=AutomationControlled'"));
    assert.match(script, /if \(req\.method\(\) === 'GET' && \/\^\\\/static\\\//);
    assert.match(script, /elementsChainAsString: true/);
    assert.match(script, /autocapture_opt_out: false/);
    assert.match(script, /await page\.goto\('about:blank'\)/);
  });
});
