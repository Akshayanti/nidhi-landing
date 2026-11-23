// What scripts/verify-tool-privacy.mjs looks for in the PostHog requests a
// free tool page tried to send. Kept apart from the browser so that the
// checks themselves have unit tests (tool-privacy-checks.test.mjs): a check
// that cannot fail is the failure this script exists to prevent.

/** The dummy key a test build carries (src/components/Analytics.astro). PostHog rejects it. */
export const TEST_KEY = 'phc_local_test_build_not_a_real_key';

// Distinctive values typed into the tools. Seven digits each, so a match in a
// payload is not chance, and none is a prefix of another.
export const AMOUNTS = [7131719, 8173391, 9377113, 6241507, 5318263, 4429183, 3652141];
// Distinctive names for a loan offer or an asset.
export const NAMES = ['Zqxvora Bank', 'Wjkpelt Flat', 'Qhuvdeb Fund'];

/**
 * Every box a reader can type in or slide, tool by tool, in the order the
 * check fills them, with a value of its own. A run fails on a box that was
 * shown and is not here (uncoveredBoxes).
 *
 * An amount has seven digits and a rate two decimals, so either is looked for
 * in everything sent. Years and months are short: they are looked for where
 * an event, an address or a body holds values (shortLeaks, shortInBody), and
 * are above any count of rows, offers or tabs the tools send.
 *
 * `reveal` is pressed first, where the box is not showing, and `after` last; `addRow` adds the row a value
 * needs; `steps` moves a slider that many keys from its lowest value.
 */
export const BOXES = {
  'loan-comparison': [
    { name: 'name', selector: 'input[id$="-name"]', value: NAMES[0], all: true },
    { name: 'principal', selector: 'input[id$="-principal"]', value: AMOUNTS[0], all: true },
    { name: 'rate', selector: 'input[id$="-rate"]', value: '7.3147', all: true },
    { name: 'term', selector: 'input[id$="-term"]', value: '347', all: true },
    // Before the extra payments and lump sums, which pay every offer off early:
    // the horizon and the refinance need the full term to take their values.
    { name: 'horizon slider', selector: 'input.lc-horizonSlider', value: '61', steps: 60, reveal: '[data-attr="lc-tab-horizon"]' },
    { name: 'horizon', selector: 'input.lc-horizonInput', value: '67' },
    { name: 'refinance month', selector: '.lc-refiInputs input.lc-input', value: '41', reveal: '[data-attr="lc-tab-refi"]' },
    { name: 'new rate', selector: '.lc-refiInputs input.lc-input', nth: 1, value: '5.9381' },
    { name: 'new term', selector: '.lc-refiInputs input.lc-input', nth: 2, value: '293' },
    { name: 'new costs', selector: '.lc-refiInputs input.lc-input', nth: 3, value: AMOUNTS[6] },
    { name: 'fee', selector: 'input[id$="-fee"]', value: AMOUNTS[1], all: true },
    { name: 'points cost', selector: 'input[id$="-pointsCost"]', value: AMOUNTS[3], all: true },
    { name: 'points reduction', selector: 'input[id$="-pointsReduction"]', value: '1.1371', all: true },
    { name: 'extra', selector: 'input[id$="-extra"]', value: AMOUNTS[2], all: true },
    { name: 'lump sums', selector: 'input[id$="-lumpSums"]', value: `23:${AMOUNTS[4]}`, all: true },
    { name: 'penalty', selector: 'input[id$="-prepayPct"]', value: '2.7163', all: true },
    { name: 'penalty until', selector: 'input[id$="-prepayUntil"]', value: '29', all: true },
    // Before the hybrid rate: a payment is refused beside one. The first offer
    // only, so the second keeps a result for the analysis to work on.
    { name: 'monthly payment', selector: 'input[id$="-monthly"]', value: AMOUNTS[5], reveal: 'input[type="radio"][value="payment"]', after: 'input[type="radio"][value="term"]' },
    { name: 'fixed months', selector: 'input[id$="-initialFixedMonths"]', value: '59', reveal: 'input[type="radio"][value="hybrid"]' },
    { name: 'rate afterwards', selector: 'input[id$="-subsequentRatePct"]', value: '6.1927' },
  ],
  'multi-currency-net-worth': [
    { name: 'name', selector: 'input[id$="-name"]', value: NAMES[0] },
    { name: 'value', selector: 'input[id$="-value"]', value: AMOUNTS[0] },
    // The form opens with one row, so the second amount gets a row of its own.
    { name: 'second value', selector: 'input[id$="-value"]', value: AMOUNTS[1], last: true, addRow: '[data-attr="mcnw-asset-add"]' },
    // Each row's boxes are checked as its own.
    { name: 'second name', selector: 'input[id$="-name"]', value: NAMES[2], last: true },
  ],
  'monte-carlo-simulator': [
    { name: 'start', selector: 'input.mcs-input', value: AMOUNTS[0] },
    { name: 'monthly', selector: 'input.mcs-input', nth: 1, value: AMOUNTS[1] },
    { name: 'years of saving', selector: 'input.mcs-input', nth: 2, value: '37' },
    { name: 'mix', selector: 'input.mcs-range', value: '65', steps: 13 },
    // Before withdrawals are on: their boxes come after it on the page.
    { name: 'fee', selector: 'input.mcs-input', nth: 3, value: '1.8379', reveal: 'button.mcs-settingsToggle' },
    { name: 'withdrawal', selector: 'input.mcs-input', nth: 4, value: AMOUNTS[2], reveal: 'astro-island input[type="checkbox"]' },
    { name: 'years of withdrawals', selector: 'input.mcs-input', nth: 5, value: '43' },
  ],
  'inflation-calculator': [
    { name: 'amount', selector: 'input[id$="-amount"]', value: AMOUNTS[0] },
    { name: 'rate', selector: 'input[id$="-rate"]', value: '4.3719' },
    { name: 'years', selector: 'input[id$="-years"]', value: '47' },
    { name: 'growth', selector: 'input[id$="-growth"]', value: '8.6347', reveal: '[data-attr="free-inflation-tab-keep"]' },
  ],
  'invest-or-pay-off': [
    { name: 'balance', selector: 'input[id$="-balance"]', value: AMOUNTS[0] },
    { name: 'debt rate', selector: 'input[id$="-debtRate"]', value: '7.3147' },
    { name: 'payment', selector: 'input[id$="-payment"]', value: AMOUNTS[1] },
    { name: 'extra', selector: 'input[id$="-extra"]', value: AMOUNTS[2] },
    { name: 'inflation', selector: 'input[id$="-inflation"]', value: '3.7921' },
    { name: 'relief', selector: 'input[id$="-relief"]', value: '13.4719' },
    { name: 'fee', selector: 'input[id$="-feePct"]', value: '1.8379' },
    { name: 'tax on gains', selector: 'input[id$="-gainsTax"]', value: '17.2963' },
    { name: 'own return', selector: 'input[id$="-ownReturn"]', value: '8.6347', reveal: 'input[type="radio"][value="own"]' },
  ],
};

/** What finding each of a tool's values is reported as. */
export function expectedLeaks(boxes) {
  return boxes.flatMap((box) => {
    const value = String(box.value);
    return NAMES.includes(value) ? [value.toLowerCase().split(' ')[0]] : value.split(':');
  });
}

const PROBES = [...new Set(Object.values(BOXES).flatMap(expectedLeaks))];
/**
 * The decimal probes. Each has four or more decimal places (#843), which makes
 * a chance match with a number the page sends unlikely, not impossible: a
 * short one such as 1.83 was once PostHog's own measure of how long a page
 * was open, and failed a clean run.
 */
export const PROBE_DECIMALS = PROBES.filter((p) => /^\d+\.\d+$/.test(p));

/**
 * Numbers PostHog computes itself, never from the page: a time, a token count,
 * how long the last page was open and how far it was scrolled. A typed value
 * cannot reach them, and a decimal probe can equal one by chance, so decimal
 * probes are not looked for in them (#843). Amounts and names are, like
 * everywhere else; every other property is read in full.
 */
export const SDK_MEASUREMENTS = Object.freeze([
  '$time',
  '$lib_rate_limit_remaining_tokens',
  '$prev_pageview_duration',
  '$prev_pageview_last_content_percentage',
  '$prev_pageview_max_content_percentage',
  '$prev_pageview_last_scroll_percentage',
  '$prev_pageview_max_scroll_percentage',
]);

/** `json` without the SDK's own measurements, for the decimal probes. */
export function withoutMeasurements(json) {
  if (Array.isArray(json)) return json.map(withoutMeasurements);
  if (!json || typeof json !== 'object') return json;
  return Object.fromEntries(Object.entries(json)
    .filter(([key, value]) => !(SDK_MEASUREMENTS.includes(key) && typeof value === 'number'))
    .map(([key, value]) => [key, withoutMeasurements(value)]));
}

// A value that stands by itself: no digit, letter or decimal part joined to it.
// With a decimal comma it is not two numbers of a list ([1,8379], a position).
const RATES = PROBE_DECIMALS
  .map((p) => [p, new RegExp(`(?<![\\w.,])${p.replace('.', '\\.')}(?!\\w|[.,]\\d)|(?<![\\w.,[])${p.replace('.', ',')}(?![\\w\\]]|[.,]\\d)`)]);
const SHORT = PROBES.filter((p) => /^\d{1,3}$/.test(p))
  .map((p) => [p, new RegExp(`(?<![\\w.,-])${p}(?![\\w-]|[.,]\\d)`)]);

/** The short values in `text`. */
function shortIn(text) {
  const plain = variants(text);
  return SHORT.filter(([, pattern]) => pattern.test(plain)).map(([value]) => value);
}

/** The short values in what follows the ? or the # of an address. */
export function shortInAddress(address) {
  const from = String(address).search(/[?#]/);
  return from < 0 ? [] : shortIn(String(address).slice(from));
}

/** The short values in a body sent to anyone but PostHog: all of it is the site's own. */
export function shortInBody(body) {
  return shortIn(String(body ?? ''));
}

/**
 * The short values in one event: in any property of the site's own (a name
 * that does not start with $), and in any address. PostHog's own measurements
 * (a window's size, a time, a version) hold small numbers all the time, and
 * are not read.
 */
export function shortLeaks(event) {
  const found = new Set();
  const add = (values) => values.forEach((v) => found.add(v));
  const walk = (value, own) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (key === 'token' || key === 'distinct_id') continue;
        const theirs = key.startsWith('$') && key !== '$set' && key !== '$set_once';
        if (own && !theirs) add(shortIn(key));
        walk(item, own && !theirs);
      }
    } else if (own) {
      add(shortIn(String(value)));
    } else if (typeof value === 'string' && /^(https?:|\/)/.test(value)) {
      add(shortInAddress(value));
    }
  };
  // The name is the site's own too. Its words are joined with underscores.
  add(shortIn(String(event.event ?? '').replace(/_/g, ' ')));
  walk(event.properties || {}, true);
  for (const key of ['$set', '$set_once']) walk(event[key], true);
  return [...found];
}

/** What to report for the boxes that were shown and never given a value. */
export function uncoveredBoxes(shown, typed) {
  const given = new Set(typed);
  return [...new Set(shown)].filter((box) => !given.has(box))
    .map((box) => `a box was shown and given no test value, so what it sends was not checked: ${box}`);
}

/** The languages that write a decimal comma. */
const DECIMAL_COMMA = new Set(['es', 'cs']);

/** A probe as a reader of that language types it. */
export function typedAs(value, locale) {
  return DECIMAL_COMMA.has(locale) && /^\d+\.\d+$/.test(String(value)) ? String(value).replace('.', ',') : String(value);
}

/** Whether a box holds what was meant, read by the page's own marks. */
export function sameTyped(held, value, locale) {
  if (String(held) === String(value)) return true;
  const plain = DECIMAL_COMMA.has(locale)
    ? String(held).replace(/(?<=\d)[.\s](?=\d{3}(?:\D|$))/g, '').replace(',', '.')
    : String(held).replace(/(?<=\d)[,\s'](?=(?:\d{2},)*\d{3}(?:\D|$))/g, '');
  return plain === String(value);
}

const NAME_WORDS = NAMES.flatMap((n) => n.toLowerCase().split(' ').filter((w) => w.length > 5));

/**
 * `text` together with what it decodes to: percent-encoding undone up to
 * three times over, and any long run of base64 letters that turns out to be
 * text. Every check that looks for something in a payload looks in this.
 */
export function variants(text) {
  let plain = String(text);
  let last = plain;
  for (let i = 0; i < 3; i++) {
    let next;
    try { next = decodeURIComponent(last.replace(/%(?![0-9A-Fa-f]{2})/g, '%25').replace(/\+/g, ' ')); } catch { break; }
    if (next === last) break;
    plain += ' ' + next;
    last = next;
  }
  for (const m of plain.match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) || []) {
    const decoded = Buffer.from(m, 'base64').toString('utf8');
    if (/^[\x09\x0a\x0d\x20-\x7e -￿]+$/.test(decoded)) plain += ' ' + decoded;
  }
  return plain;
}

/**
 * The typed values found in `text`. The forms it reads: as typed; grouped
 * (7,131,719 / 71,31,719 / 7.131.719 / 7 131 719); percent-encoded, up to
 * three times over; and base64 of text that holds one of those. It does not
 * read a value that was transformed (rounded, split across fields, hashed):
 * no check of this kind can.
 */
export function findLeaks(text, { decimals = true } = {}) {
  const found = new Set();
  const plain = variants(text);
  // Grouping marks between digits are dropped; nothing else is.
  const digits = plain.replace(/(?<=\d)[,.\s  '’_](?=\d)/g, '');
  for (const a of AMOUNTS) if (digits.includes(String(a))) found.add(String(a));
  if (decimals) for (const [value, pattern] of RATES) if (pattern.test(plain)) found.add(value);
  const lower = plain.toLowerCase();
  for (const w of NAME_WORDS) if (lower.includes(w)) found.add(w);
  return [...found];
}

/**
 * A request body as text and, when it can be read, as JSON. PostHog sends
 * gzip (compression=gzip-js), plain JSON, or, with sendBeacon as a page
 * unloads, base64 in a form field (`data=...`).
 */
export function decodeBody(url, body, gunzip) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  if (bytes.length === 0) return { text: '', json: null, empty: true };
  let text;
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try { text = gunzip(bytes).toString('utf8'); } catch { return { text: bytes.toString('latin1'), json: null, unreadable: true }; }
  } else {
    text = bytes.toString('utf8');
  }
  const tryJson = (s) => { try { return JSON.parse(s); } catch { return undefined; } };
  let json = tryJson(text);
  if (json === undefined && /(^|&)data=/.test(text)) {
    const data = new URLSearchParams(text).get('data') || '';
    const fromBase64 = Buffer.from(data, 'base64').toString('utf8');
    json = tryJson(fromBase64) ?? tryJson(data);
    if (json !== undefined) text = JSON.stringify(json);
  }
  if (json === undefined) {
    const fromBase64 = Buffer.from(text, 'base64').toString('utf8');
    json = tryJson(fromBase64);
    if (json !== undefined) text = JSON.stringify(json);
  }
  return json === undefined ? { text, json: null, unreadable: true } : { text, json };
}

/** Whether a request is one that carries events (as opposed to flags or settings). */
export const carriesEvents = (url) => { try { return /^\/(e|i\/v0\/e|batch|capture|s)\/?$/.test(new URL(url).pathname); } catch { return false; } };

/** Every event object inside a decoded body: one event, a list, or `{ batch: [...] }`. */
export function eventsIn(json) {
  if (!json || typeof json !== 'object') return [];
  if (Array.isArray(json)) return json.flatMap(eventsIn);
  if (Array.isArray(json.batch)) return json.batch.flatMap(eventsIn);
  if (Array.isArray(json.data)) return json.data.flatMap(eventsIn);
  return typeof json.event === 'string' ? [json] : [];
}

// One element as cleanElements.js writes it: a tag, then at most the label and the two positions.
const ELEMENT = /^[a-z][a-z0-9]*:(?:attr__data-attr="[a-z0-9]+(?:-[a-z0-9]+)*")?(?:nth-child="\d{1,3}")?(?:nth-of-type="\d{1,3}")?$/;
const ELEMENT_KEYS = new Set(['tag_name', 'attr__data-attr', 'nth_child', 'nth_of_type']);
const CLICK_EVENTS = ['$autocapture', '$rageclick', '$dead_click', '$$heatmap', '$copy_autocapture'];

/** Problems with how one event describes the element that was clicked. */
export function elementProblems(event) {
  const props = event.properties || {};
  const out = [];
  if ('$elements_chain' in props) {
    const chain = props.$elements_chain;
    if (typeof chain !== 'string') out.push(`${event.event}: $elements_chain is not a string`);
    else if (chain !== '') {
      for (const part of chain.split(';')) {
        if (!ELEMENT.test(part)) { out.push(`${event.event}: an element carries more than a tag, a data-attr label and positions: ${part.slice(0, 120)}`); break; }
      }
    }
  }
  if ('$elements' in props) {
    if (!Array.isArray(props.$elements)) out.push(`${event.event}: $elements is not a list`);
    else for (const el of props.$elements) {
      if (!el || typeof el !== 'object' || Array.isArray(el)) { out.push(`${event.event}: an element is not an object`); break; }
      const extra = Object.keys(el).filter((k) => !ELEMENT_KEYS.has(k));
      if (extra.length) { out.push(`${event.event}: an element carries ${extra.join(', ')}`); break; }
      // The same limits as the string form: a tag, a slug, small whole numbers.
      const position = (v) => v === undefined || (Number.isInteger(v) && v >= 1 && v <= 999);
      const wrong =
        (typeof el.tag_name !== 'string' || !/^[a-z][a-z0-9]*$/.test(el.tag_name)) ? 'tag_name' :
        (el['attr__data-attr'] !== undefined && (typeof el['attr__data-attr'] !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(el['attr__data-attr']))) ? 'attr__data-attr' :
        !position(el.nth_child) ? 'nth_child' : !position(el.nth_of_type) ? 'nth_of_type' : null;
      if (wrong) { out.push(`${event.event}: an element's ${wrong} is not a tag, a label or a position: ${JSON.stringify(el[wrong]).slice(0, 80)}`); break; }
    }
  }
  for (const key of ['$el_text', '$external_click_url', '$element_selectors', '$selected_content', '$copy_type']) {
    if (key in props && key !== '$copy_type') out.push(`${event.event}: carries ${key}`);
  }
  return out;
}

/** Every string anywhere inside `value`, object keys included. */
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { out.push(k); strings(v, out); }
  return out;
}

// The site's own address: a payload may name a tool page by it as well as by the test server's.
const LIVE_ORIGIN = 'https://nidhi.today';

/** Problems with the addresses one event carries: a tool address keeps only utm_* and no # part. */
export function addressProblems(event, origin) {
  const out = [];
  for (const raw of strings(event)) {
    // As written, and with any percent-encoding undone.
    for (const s of new Set(variants(raw).split(' '))) {
      if (!s.includes('/free/')) continue;
      let u;
      try { u = new URL(s, origin); } catch { continue; }
      if ((u.origin !== origin && u.origin !== LIVE_ORIGIN) || !/^\/([a-z]{2}\/)?free\/[^/]+\/?/.test(u.pathname)) continue;
      const extra = [...u.searchParams.keys()].filter((k) => !k.startsWith('utm_'));
      if (u.hash || extra.length) {
        out.push(`${event.event}: a tool address carries ${u.hash ? 'a # part' : ''}${u.hash && extra.length ? ' and ' : ''}${extra.length ? `the parameters ${extra.join(', ')}` : ''}: ${s.slice(0, 160)}`);
        return out;
      }
    }
  }
  return out;
}

const PHASES = { use: 'while the tool was used', share: 'on the # share link', switch: 'on the page the language was switched from', arrived: 'on the page the language switch arrived at', old: 'on the old ? link' };

/**
 * Judges one run. `decoded` is every PostHog request body with the part of
 * the run it was sent in (`phase`); `events` are the events inside them, each
 * with its `phase`. `parts` are the parts of the run that were opened.
 * `mustSend` are the tool's events that using it has to produce (`name` or
 * `name:format`), `sharedView` the one a # link has to.
 * Returns the problems found and a count of each event.
 */
export function checkRun({ decoded, events, consent, headless, ownEvents, mustSend = [], sharedView = null, planted = false, origin, parts = null }) {
  const problems = [];
  const counts = {};
  for (const e of events) counts[e.event] = (counts[e.event] || 0) + 1;

  // 1. Nothing typed, no file, no blob: or data: address, in any request at all.
  for (const d of decoded) {
    const where = (() => { try { return new URL(d.url).pathname; } catch { return d.url; } })();
    if (d.unreadable) problems.push(`a request to ${where} could not be decoded, so it could not be checked`);
    // A request that should hold events and arrived with no body was not read: its body was lost on the way here.
    if (d.empty && carriesEvents(d.url)) problems.push(`a request to ${where} arrived with no body, so it could not be checked`);
    // A body that decodes but holds no event this check knows how to read was not checked either.
    if (!d.unreadable && !d.empty && carriesEvents(d.url) && eventsIn(d.json).length === 0) problems.push(`a request to ${where} holds no event in a form this check reads, so it could not be checked`);
    // The text as sent, and every string inside it as the receiver reads it
    // (a JSON escape such as \u005a is one letter once decoded).
    const texts = [d.text, d.url, d.json ? strings(d.json).join('\n') : ''].map(variants);
    // Decimal probes are looked for in the body less PostHog's own measurements
    // (SDK_MEASUREMENTS); an unreadable body is read whole.
    const ratesIn = d.json ? [JSON.stringify(withoutMeasurements(d.json)), d.url, strings(withoutMeasurements(d.json)).join('\n')].map(variants) : texts;
    // A body without events is read as an event's properties are.
    const inBody = d.json && typeof d.json === 'object' && !carriesEvents(d.url) ? shortLeaks({ properties: d.json }) : [];
    const leaks = new Set([...texts.flatMap((t) => findLeaks(t, { decimals: false })), ...ratesIn.flatMap((t) => findLeaks(t)), ...shortInAddress(d.url), ...inBody]);
    if (leaks.size) problems.push(`a request to ${where} carries what was typed: ${[...leaks].join(', ')}`);
    if (texts.some((t) => /\b(blob|data):[^"\s]{4,}/i.test(t))) problems.push(`a request to ${where} carries a blob: or data: address`);
    const file = texts.map((t) => /[\w%-]+\.(xlsx|csv|pdf)\b/i.exec(t)).find(Boolean);
    if (file) problems.push(`a request to ${where} carries a file name: ${file[0]}`);
  }

  // 2. Element descriptions and addresses, event by event.
  for (const e of events) {
    const short = shortLeaks(e);
    if (short.length) problems.push(`${e.event} carries what was typed: ${short.join(', ')}`);
    problems.push(...elementProblems(e), ...addressProblems(e, origin));
  }

  // 3. The events were there, in the part of the run where they belong. A
  // clean payload proves nothing without them, and a click captured on a
  // later page says nothing about the page where the values were typed.
  const inPhase = (phase) => events.filter((e) => e.phase === phase);
  const has = (phase, name) => inPhase(phase).some((e) => e.event === name);
  if (decoded.length === 0) problems.push('no PostHog request was seen at all: analytics never started, so nothing was checked');
  // The parts that were really opened, as the run reports them: a part that
  // sent nothing at all is still held to account. (Without that report, the
  // parts are those that sent something.)
  const phases = [...new Set(['use', ...(parts || decoded.map((d) => d.phase).filter(Boolean))])];
  for (const phase of phases) {
    const when = PHASES[phase] || phase;
    if (!has(phase, '$pageview')) problems.push(`no $pageview was seen ${when}: analytics did not start there, so nothing was checked`);
    if (!headless && !has(phase, '$pageleave')) problems.push(`no $pageleave was seen ${when}: the events sent as that page unloads were not checked`);
  }
  if (!inPhase('use').some((e) => ownEvents.test(e.event))) problems.push('none of the tool’s own events was seen while it was used: the tool was not used, or its events were not captured');
  const prefix = ownEvents.source.replace(/^\^/, '');
  for (const need of mustSend) {
    const [name, format] = need.split(':');
    const seen = inPhase('use').some((e) => e.event === prefix + name && (!format || (e.properties || {}).format === format));
    if (!seen) problems.push(`the tool never sent ${prefix}${need}: that step was not done, so what it sends was not checked`);
  }
  if (sharedView && phases.includes('share') && !has('share', prefix + sharedView)) problems.push(`the # share link never sent ${prefix}${sharedView}: the link was not read as a shared one`);
  if (consent === 'accepted') {
    if (!has('use', '$autocapture')) problems.push('consent was given but no $autocapture was seen while the tool was used: click capture never started, so clicks were not checked');
    // PostHog decides which clicks count as rage or dead clicks, and on some
    // layouts only one kind comes out of a page. Each run needs one of them;
    // the script then needs both kinds for every tool across its runs.
    if (!has('use', '$rageclick') && !has('use', '$dead_click')) problems.push('consent was given but no $rageclick or $dead_click was seen while the tool was used: those events were not checked');
  } else {
    // The one click a reader without consent makes on the banner itself may
    // not be captured either: nothing is, until they say yes.
    for (const name of CLICK_EVENTS) if (counts[name]) problems.push(`consent was declined, yet ${name} was sent`);
  }
  // The self-test's own event is not one of the tool's.
  if (!planted && counts.free_planted_leak) problems.push('the self-test event was sent in a normal run');
  return { problems: [...new Set(problems)], counts };
}

/**
 * Whether a run's only fault is that a step was not done: nothing wrong was
 * found in what it sent, but a click missed, so less was checked than
 * should have been. Such a run may be done once more. Any other problem (a
 * typed value, a file name, an attribute, a missing kind of event) is not
 * this: a run with one of those is a failed run, and is never repeated.
 */
export function isMissedStepOnly(problems) {
  return problems.length > 0 && problems.every((p) => /^the tool never sent \S+: that step was not done, so what it sends was not checked$/.test(p));
}

/** The problems that say only that something was not seen or not done. */
const ABSENCES = [
  /^the run stopped while /,
  /^the tool never sent \S+: that step was not done/,
  /^the # share link never sent /,
  /^the tool copied no share link$/,
  /^the tool published no state /,
  /^no PostHog request was seen at all/,
  /^no \$page(view|leave) was seen /,
  /^none of the tool’s own events was seen /,
  /^consent was given but no \$/,
  /^no \.\w+ file was saved/,
  /^the print dialog was never asked for/,
];

/**
 * Whether a run found anything: a problem that is more than an absence. One
 * this list does not know counts as found.
 */
function hasFinding(problems) {
  return problems.some((p) => !ABSENCES.some((absence) => absence.test(p)));
}

/**
 * What the worker does after a run: judge it, or do it once more in the same
 * browser ('repeat') or in a new one ('relaunch').
 */
export function afterRun({ attempt, problems, connected }) {
  const lostPage = problems.some((p) => /the run stopped while .*(Session closed|Target closed|detached Frame|Connection closed|page has been closed)/.test(p));
  // What was found stands, whatever became of the page or the browser after
  // it: the second run would be the only one judged.
  if (attempt === 1 || hasFinding(problems) || (connected && !lostPage && !isMissedStepOnly(problems))) return 'judge';
  return connected ? 'repeat' : 'relaunch';
}

/**
 * Judges the runs together. `runs` are `{ slug, consent, counts }`. For every
 * tool that had a run with consent, some run must have shown a $rageclick and
 * some run a $dead_click: both kinds of payload were then seen and checked
 * for that tool.
 */
export function checkMatrix(runs) {
  const problems = [];
  const tools = [...new Set(runs.filter((r) => r.consent === 'accepted').map((r) => r.slug))];
  for (const slug of tools) {
    for (const name of ['$rageclick', '$dead_click']) {
      if (!runs.some((r) => r.slug === slug && r.consent === 'accepted' && (r.counts[name] || 0) > 0)) {
        problems.push(`${slug}: no run with consent showed a ${name}, so that kind of event was never checked for this tool`);
      }
    }
  }
  return problems;
}
