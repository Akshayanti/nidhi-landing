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
  AMOUNTS, NAMES, TEST_KEY, addressProblems, checkMatrix, checkRun, decodeBody, elementProblems, eventsIn, findLeaks, isMissedStepOnly } from './tool-privacy-checks.mjs';

const ORIGIN = 'http://127.0.0.1:4000';
const OWN = /^free_loan_comparison_/;

const MUST = ['vendor_removed', 'exported:xlsx', 'exported:pdf'];
const ev = (event, properties = {}) => ({ event, properties: { $current_url: `${ORIGIN}/free/loan-comparison/`, ...properties } });
const CHAIN = 'button:attr__data-attr="lc-reset"nth-child="2"nth-of-type="1";div:nth-child="1"nth-of-type="1";body:nth-child="2"nth-of-type="1"';

/** What a clean run sends while the tool is used. */
function cleanEvents(consent = 'accepted') {
  const events = [
    ev('$pageview'), ev('free_loan_comparison_vendor_removed', { vendor: 'C', count: 2 }),
    ev('free_loan_comparison_exported', { format: 'xlsx' }), ev('free_loan_comparison_exported', { format: 'pdf' }), ev('$pageleave'),
  ];
  if (consent === 'accepted') events.push(ev('$autocapture', { $elements_chain: CHAIN, $event_type: 'click' }), ev('$rageclick', { $elements_chain: CHAIN }), ev('$dead_click', { $elements_chain: CHAIN }));
  return events;
}
/** What the # share link page sends. */
const shareEvents = () => [ev('$pageview'), ev('free_loan_comparison_shared_view_opened', { vendors: 2, utm_source: 'share' }), ev('$pageleave')];

/**
 * Judges a run as the script would: each part's events packed into a request
 * body, decoded, then checked. `events` are those sent while the tool was used.
 */
function judge(events, { consent = 'accepted', headless = false, url = 'https://eu.i.posthog.com/i/v0/e/', extraRequests = [], share = shareEvents(), planted = false } = {}) {
  const bodies = [{ url, phase: 'use', body: gzipSync(JSON.stringify(events)) }, ...extraRequests.map((r) => ({ phase: 'use', ...r }))];
  if (share) bodies.push({ url, phase: 'share', body: gzipSync(JSON.stringify(share)) });
  const decoded = bodies.map((r) => ({ url: r.url, phase: r.phase, ...decodeBody(r.url, r.body, gunzipSync) }));
  const all = decoded.flatMap((d) => eventsIn(d.json).map((e) => ({ ...e, phase: d.phase })));
  return checkRun({ decoded, events: all, consent, headless, ownEvents: OWN, mustSend: MUST, sharedView: 'shared_view_opened', planted, origin: ORIGIN });
}

describe('tool privacy checks: a clean run passes', () => {
  it('with consent', () => assert.deepEqual(judge(cleanEvents()).problems, []));
  it('without consent', () => assert.deepEqual(judge(cleanEvents('declined'), { consent: 'declined' }).problems, []));
  it('counts each event', () => assert.equal(judge(cleanEvents()).counts.$pageview, 2));
});

describe('tool privacy checks: what was typed', () => {
  it('finds an amount however it is grouped or encoded', () => {
    const twice = encodeURIComponent(encodeURIComponent('amount=7,131,719'));
    const base64 = Buffer.from('{"amount":"7 131 719"}').toString('base64');
    for (const text of ['7131719', '7,131,719', '71,31,719', '7.131.719', '7 131 719', '7 131 719', "7'131'719", '%377131719', 'a1=Flat~EUR~7131719', 'x7131719.00', twice, base64, `data=${base64}`]) {
      assert.deepEqual(findLeaks(text), ['7131719'], text);
    }
  });

  it('finds a name in any case, whole or encoded', () => {
    assert.deepEqual(findLeaks('aria-label="Remove ZQXVORA bank"'), ['zqxvora']);
    assert.deepEqual(findLeaks('v1=Zqxvora+Bank~1'), ['zqxvora']);
    assert.deepEqual(findLeaks('n=Wjkpelt%20Flat'), ['wjkpelt']);
    assert.deepEqual(findLeaks('n=Wjkpelt%2520Flat'), ['wjkpelt']);
    assert.deepEqual(findLeaks(Buffer.from('Remove Zqxvora Bank').toString('base64')), ['zqxvora']);
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

  it('fails a run that sends a name written with JSON escapes', () => {
    const escaped = JSON.stringify([...cleanEvents(), ev('free_loan_comparison_x', { label: 'PLACEHOLDER' })]).replace('PLACEHOLDER', '\\u005aqxvora Bank');
    assert.ok(!escaped.toLowerCase().includes('zqxvora'), 'the body as sent does not spell the name');
    const decoded = [{ url: 'https://eu.i.posthog.com/i/v0/e/', phase: 'use', ...decodeBody('u', gzipSync(escaped), gunzipSync) }];
    const events = decoded.flatMap((d) => eventsIn(d.json).map((e) => ({ ...e, phase: 'use' })));
    const { problems } = checkRun({ decoded, events, consent: 'accepted', headless: false, ownEvents: OWN, origin: ORIGIN });
    assert.ok(problems.some((p) => p.includes('carries what was typed: zqxvora')), problems.join('\n'));
  });

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
    ['an encoded blob address', 'blob%3Ahttp%3A%2F%2F127.0.0.1%3A4000%2F0b1c2d3e', 'blob: or data:'],
    ['an encoded file name', 'net%2Dworth%2Ecsv', 'file name'],
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

  it('rejects an element list whose allowed keys hold anything but a tag, a label and positions', () => {
    for (const el of [
      { tag_name: 'button', 'attr__data-attr': 'arbitrary private text' },
      { tag_name: 'button', 'attr__data-attr': { nested: 'x' } },
      { tag_name: 'Home Bank' },
      { tag_name: 'button', nth_child: 'second' },
      { tag_name: 'button', nth_of_type: 250000 },
      'button',
      null,
    ]) {
      assert.notDeepEqual(elementProblems(ev('$autocapture', { $elements: [el] })), [], JSON.stringify(el));
    }
  });
});

describe('tool privacy checks: tool addresses', () => {
  it('accepts a tool address with campaign tags only, in any edition', () => {
    for (const url of [`${ORIGIN}/free/loan-comparison/`, `${ORIGIN}/hi/free/loan-comparison/?utm_source=share&utm_medium=referral`, '/mr/free/inflation-calculator/', `${ORIGIN}/free/`, 'https://example.com/free/x/?a=1#b']) {
      assert.deepEqual(addressProblems(ev('$pageview', { $current_url: url }), ORIGIN), [], url);
    }
  });

  it('rejects state in a tool address written with the live site’s name, or percent-encoded', () => {
    for (const url of ['https://nidhi.today/free/loan-comparison/?c=INR', 'https://nidhi.today/hi/free/loan-comparison/#c=INR', encodeURIComponent(`${ORIGIN}/free/loan-comparison/?c=INR`)]) {
      assert.notDeepEqual(addressProblems(ev('$pageview', { $referrer: url }), ORIGIN), [], url);
    }
    assert.deepEqual(addressProblems(ev('$pageview', { $referrer: 'https://nidhi.today/free/loan-comparison/?utm_source=share' }), ORIGIN), []);
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
  const says = (problems, text) => assert.ok(problems.some((p) => p.includes(text)), `expected "${text}" in:\n${problems.join('\n')}`);

  it('fails when nothing was sent at all', () => {
    const { problems } = checkRun({ decoded: [], events: [], consent: 'accepted', headless: false, ownEvents: OWN, origin: ORIGIN });
    says(problems, 'no PostHog request was seen');
  });

  it('fails without a pageview, a page-leave or one of the tool’s own events', () => {
    says(judge(without('$pageview')).problems, 'no $pageview was seen while the tool was used');
    says(judge(without('$pageleave')).problems, 'no $pageleave was seen while the tool was used');
    says(judge(cleanEvents().filter((e) => !OWN.test(e.event))).problems, 'own events');
  });

  it('a headless run is not asked for a page-leave', () => {
    assert.deepEqual(judge(without('$pageleave'), { headless: true, share: shareEvents().filter((e) => e.event !== '$pageleave') }).problems, []);
  });

  it('each part of the run needs its own evidence: a later page does not stand in for an earlier one', () => {
    // No click capture while the tool was used, plenty on the share page.
    const share = [...shareEvents(), ev('$autocapture', { $elements_chain: CHAIN }), ev('$rageclick', { $elements_chain: CHAIN }), ev('$dead_click', { $elements_chain: CHAIN })];
    const quiet = cleanEvents().filter((e) => !['$autocapture', '$rageclick', '$dead_click'].includes(e.event));
    const { problems } = judge(quiet, { share });
    says(problems, 'no $autocapture was seen while the tool was used');
    says(problems, 'no $rageclick or $dead_click was seen while the tool was used');
    // And the share page needs its own pageview and page-leave.
    says(judge(cleanEvents(), { share: shareEvents().filter((e) => e.event !== '$pageleave') }).problems, 'no $pageleave was seen on the # share link');
    says(judge(cleanEvents(), { share: shareEvents().filter((e) => e.event !== '$pageview') }).problems, 'no $pageview was seen on the # share link');
  });

  it('with consent, a run needs click capture and a rage or a dead click', () => {
    says(judge(without('$autocapture')).problems, 'no $autocapture');
    const neither = cleanEvents().filter((e) => e.event !== '$rageclick' && e.event !== '$dead_click');
    says(judge(neither).problems, 'no $rageclick or $dead_click');
    assert.deepEqual(judge(without('$rageclick')).problems, []);
    assert.deepEqual(judge(without('$dead_click')).problems, []);
  });

  it('across its runs, every tool needs both a rage click and a dead click', () => {
    const run = (slug, consent, counts) => ({ slug, consent, counts });
    assert.deepEqual(checkMatrix([
      run('a', 'accepted', { $rageclick: 2 }), run('a', 'accepted', { $dead_click: 1 }), run('a', 'declined', {}),
      run('b', 'declined', {}),
    ]), []);
    const problems = checkMatrix([run('a', 'accepted', { $rageclick: 2 }), run('b', 'accepted', { $dead_click: 1 }), run('b', 'declined', { $rageclick: 1 })]);
    assert.deepEqual(problems.map((p) => p.split(',')[0]), ['a: no run with consent showed a $dead_click', 'b: no run with consent showed a $rageclick']);
  });

  it('without consent, fails when any click event was sent', () => {
    for (const name of ['$autocapture', '$rageclick', '$dead_click', '$$heatmap']) {
      const { problems } = judge([...cleanEvents('declined'), ev(name, { $elements_chain: CHAIN })], { consent: 'declined' });
      says(problems, `yet ${name} was sent`);
    }
  });

  it('fails when a step the tool must take sent nothing: a removal or an export that did not happen', () => {
    says(judge(without('free_loan_comparison_vendor_removed')).problems, 'never sent free_loan_comparison_vendor_removed');
    const noPdf = cleanEvents().filter((e) => !(e.event === 'free_loan_comparison_exported' && e.properties.format === 'pdf'));
    const { problems } = judge(noPdf);
    says(problems, 'never sent free_loan_comparison_exported:pdf');
    assert.ok(!problems.some((p) => p.includes('exported:xlsx')));
    // Sent on a later page does not count.
    says(judge(without('free_loan_comparison_vendor_removed'), { share: [...shareEvents(), ev('free_loan_comparison_vendor_removed')] }).problems, 'never sent free_loan_comparison_vendor_removed');
  });

  it('a part of the run that was opened and sent nothing at all still fails', () => {
    const only = (parts) => {
      const decoded = [{ url: 'https://eu.i.posthog.com/i/v0/e/', phase: 'use', ...decodeBody('u', gzipSync(JSON.stringify(cleanEvents())), gunzipSync) }];
      const events = decoded.flatMap((d) => eventsIn(d.json).map((e) => ({ ...e, phase: 'use' })));
      return checkRun({ decoded, events, consent: 'accepted', headless: false, ownEvents: OWN, mustSend: MUST, sharedView: 'shared_view_opened', origin: ORIGIN, parts }).problems;
    };
    assert.deepEqual(only(['use']), []);
    const silent = only(['use', 'share', 'switch', 'arrived', 'old']);
    for (const where of ['on the # share link', 'on the page the language was switched from', 'on the page the language switch arrived at', 'on the old ? link']) {
      says(silent, `no $pageview was seen ${where}`);
      says(silent, `no $pageleave was seen ${where}`);
    }
    says(silent, 'never sent free_loan_comparison_shared_view_opened');
  });

  it('fails when the # share link was not read as a shared link', () => {
    says(judge(cleanEvents(), { share: shareEvents().filter((e) => e.event !== 'free_loan_comparison_shared_view_opened') }).problems, 'never sent free_loan_comparison_shared_view_opened');
  });

  it('fails on an event request it cannot read events from', () => {
    const odd = { url: 'https://eu.i.posthog.com/i/v0/e/', body: gzipSync(JSON.stringify({ envelope: { items: [{ name: 'x' }] } })) };
    says(judge(cleanEvents(), { extraRequests: [odd] }).problems, 'holds no event in a form this check reads');
    // A flags request holds no events and is not expected to.
    const flags = { url: 'https://eu.i.posthog.com/flags/?v=2', body: gzipSync(JSON.stringify({ token: TEST_KEY })) };
    assert.deepEqual(judge(cleanEvents(), { extraRequests: [flags] }).problems, []);
  });

  it('the self-test event in a normal run is a failure, and expected in a self-test', () => {
    says(judge([...cleanEvents(), ev('free_planted_leak', { amount: 1 })]).problems, 'self-test event');
    assert.ok(!judge([...cleanEvents(), ev('free_planted_leak', { amount: 1 })], { planted: true }).problems.some((p) => p.includes('self-test event')));
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

  it('an event request that arrives with no body fails the run; a request that carries no events may be empty', () => {
    assert.deepEqual(decodeBody('u', Buffer.alloc(0), gunzipSync), { text: '', json: null, empty: true });
    const lost = judge(cleanEvents(), { extraRequests: [{ url: 'https://eu.i.posthog.com/i/v0/e/', body: Buffer.alloc(0) }] });
    assert.ok(lost.problems.some((p) => p.includes('arrived with no body')));
    assert.deepEqual(judge(cleanEvents(), { extraRequests: [{ url: 'https://eu.i.posthog.com/flags/?v=2', body: Buffer.alloc(0) }] }).problems, []);
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
    // Each names the events that prove its buttons were pressed, both exports among them.
    const musts = [...script.matchAll(/mustSend: \[([^\]]*)\]/g)];
    assert.equal(musts.length, routes.length);
    for (const m of musts) for (const need of ["'share_copied'", "'exported:xlsx'", "'exported:pdf'", "'reset'"]) assert.ok(m[1].includes(need), `${need} in ${m[1]}`);
    assert.deepEqual(inScript.map((m) => m[1]).sort(), routes);
    const globals = fs.readdirSync('src/utils', { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(`src/utils/${d.name}/url.ts`))
      .map((d) => /export const SHARED_STATE_GLOBAL = '([^']+)';/.exec(fs.readFileSync(`src/utils/${d.name}/url.ts`, 'utf8'))[1])
      .sort();
    assert.deepEqual(inScript.map((m) => m[2]).sort(), globals);
  });

  it('lets nothing through to PostHog but its static scripts', () => {
    assert.ok(script.includes('MAP eu.i.posthog.com ~NOTFOUND'));
    assert.ok(script.includes("'--disable-blink-features=AutomationControlled'"));
    assert.ok(script.includes("if (req.method() === 'GET' && !url.search && /^\\/static\\/"), 'static scripts are let through only by their bare address');
    assert.match(script, /elementsChainAsString: true/);
    assert.match(script, /autocapture_opt_out: false/);
    assert.match(script, /await page\.goto\('about:blank'\)/);
  });
});

describe('a run that only missed a step', () => {
  const missed = 'the tool never sent free_loan_comparison_reset: that step was not done, so what it sends was not checked';

  it('is one whose every problem is a step not done', () => {
    assert.equal(isMissedStepOnly([missed]), true);
    assert.equal(isMissedStepOnly([missed, missed.replace('reset', 'share_copied')]), true);
  });

  it('is never a run with anything else wrong, and never a clean run', () => {
    assert.equal(isMissedStepOnly([]), false);
    for (const other of [
      'a request to /i/v0/e/ carries what was typed: 7131719',
      'an element in $autocapture carries an attribute other than data-attr and its position: aria-label',
      'consent was given but no $rageclick or $dead_click was seen while the tool was used: those events were not checked',
      'no .xlsx file was saved: that export did not run',
    ]) {
      assert.equal(isMissedStepOnly([other]), false, other);
      assert.equal(isMissedStepOnly([missed, other]), false, 'a missed step beside a real problem is a failed run');
    }
  });

  it('matches the sentence checkRun writes for a missing step', () => {
    const result = checkRun({ decoded: [], events: [], consent: 'declined', headless: true, origin: 'http://127.0.0.1:1', parts: ['use'], ownEvents: /^free_x_/, mustSend: ['reset'], sharedView: null, planted: false });
    const steps = result.problems.filter((p) => p.includes('that step was not done'));
    assert.ok(steps.length > 0, result.problems.join(' | '));
    assert.equal(isMissedStepOnly(steps), true);
  });
});
