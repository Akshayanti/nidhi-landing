// What scripts/verify-tool-privacy.mjs looks for in the PostHog requests a
// free tool page tried to send. Kept apart from the browser so that the
// checks themselves have unit tests (tool-privacy-checks.test.mjs): a check
// that cannot fail is the failure this script exists to prevent.

/** The dummy key a test build carries (src/components/Analytics.astro). PostHog rejects it. */
export const TEST_KEY = 'phc_local_test_build_not_a_real_key';

// Distinctive values typed into the tools. Seven digits each, so a match in a
// payload is not chance, and none is a prefix of another.
export const AMOUNTS = [7131719, 8173391, 9377113];
// Distinctive names for a loan offer or an asset.
export const NAMES = ['Zqxvora Bank', 'Wjkpelt Flat'];

const NAME_WORDS = NAMES.flatMap((n) => n.toLowerCase().split(' ').filter((w) => w.length > 5));

/**
 * The typed values found in `text`, however they were formatted: as typed, or
 * grouped (7,131,719 / 71,31,719 / 7.131.719 / 7 131 719), or percent-encoded.
 */
export function findLeaks(text) {
  const found = new Set();
  let plain = String(text);
  try { plain += ' ' + decodeURIComponent(plain.replace(/%(?![0-9A-Fa-f]{2})/g, '%25')); } catch { /* not encoded */ }
  // Grouping marks between digits are dropped; nothing else is.
  const digits = plain.replace(/(?<=\d)[,.\s  '’_](?=\d)/g, '');
  for (const a of AMOUNTS) if (digits.includes(String(a))) found.add(String(a));
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
      const extra = Object.keys(el || {}).filter((k) => !ELEMENT_KEYS.has(k));
      if (extra.length) { out.push(`${event.event}: an element carries ${extra.join(', ')}`); break; }
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

/** Problems with the addresses one event carries: a tool address keeps only utm_* and no # part. */
export function addressProblems(event, origin) {
  const out = [];
  for (const s of strings(event)) {
    if (!s.includes('/free/')) continue;
    let u;
    try { u = new URL(s, origin); } catch { continue; }
    if (u.origin !== origin || !/^\/([a-z]{2}\/)?free\/[^/]+\/?/.test(u.pathname)) continue;
    const extra = [...u.searchParams.keys()].filter((k) => !k.startsWith('utm_'));
    if (u.hash || extra.length) { out.push(`${event.event}: a tool address carries ${u.hash ? 'a # part' : ''}${u.hash && extra.length ? ' and ' : ''}${extra.length ? `the parameters ${extra.join(', ')}` : ''}: ${s.slice(0, 160)}`); break; }
  }
  return out;
}

/**
 * Judges one run. `decoded` is every PostHog request body, `events` the
 * events inside them. Returns the problems found and a count of each event.
 */
export function checkRun({ decoded, events, consent, headless, ownEvents, hasCharts, origin }) {
  const problems = [];
  const counts = {};
  for (const e of events) counts[e.event] = (counts[e.event] || 0) + 1;

  // 1. Nothing typed, no file, no blob: or data: address, in any request at all.
  for (const d of decoded) {
    const where = (() => { try { return new URL(d.url).pathname; } catch { return d.url; } })();
    if (d.unreadable) problems.push(`a request to ${where} could not be decoded, so it could not be checked`);
    for (const text of [d.text, d.url]) {
      const leaks = findLeaks(text);
      if (leaks.length) problems.push(`a request to ${where} carries what was typed: ${leaks.join(', ')}`);
      if (/\b(blob|data):[^"\s]{4,}/i.test(text)) problems.push(`a request to ${where} carries a blob: or data: address`);
      const file = /[\w%-]+\.(xlsx|csv|pdf)\b/i.exec(text);
      if (file) problems.push(`a request to ${where} carries a file name: ${file[0]}`);
    }
  }

  // 2. Element descriptions and addresses, event by event.
  for (const e of events) {
    problems.push(...elementProblems(e), ...addressProblems(e, origin));
  }

  // 3. The events were there. A clean payload proves nothing without them.
  const has = (name) => (counts[name] || 0) > 0;
  if (decoded.length === 0) problems.push('no PostHog request was seen at all: analytics never started, so nothing was checked');
  if (!has('$pageview')) problems.push('no $pageview was seen: analytics never started, so nothing was checked');
  if (!headless && !has('$pageleave')) problems.push('no $pageleave was seen: the events sent as a page unloads were not checked');
  if (!events.some((e) => ownEvents.test(e.event))) problems.push('none of the tool’s own events was seen: the tool was not used, or its events were not captured');
  if (consent === 'accepted') {
    if (!has('$autocapture')) problems.push('consent was given but no $autocapture was seen: click capture never started, so clicks were not checked');
    if (!has('$rageclick') && !has('$dead_click')) {
      problems.push(`consent was given but no $rageclick or $dead_click was seen${hasCharts ? ' from the clicks on the charts' : ''}: those events were not checked`);
    }
  } else {
    // The one click a reader without consent makes on the banner itself may
    // not be captured either: nothing is, until they say yes.
    for (const name of CLICK_EVENTS) if (has(name)) problems.push(`consent was declined, yet ${name} was sent`);
  }
  return { problems: [...new Set(problems)], counts };
}
