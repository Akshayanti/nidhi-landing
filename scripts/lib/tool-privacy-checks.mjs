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
export function findLeaks(text) {
  const found = new Set();
  const plain = variants(text);
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
    const leaks = new Set(texts.flatMap((t) => findLeaks(t)));
    if (leaks.size) problems.push(`a request to ${where} carries what was typed: ${[...leaks].join(', ')}`);
    if (texts.some((t) => /\b(blob|data):[^"\s]{4,}/i.test(t))) problems.push(`a request to ${where} carries a blob: or data: address`);
    const file = texts.map((t) => /[\w%-]+\.(xlsx|csv|pdf)\b/i.exec(t)).find(Boolean);
    if (file) problems.push(`a request to ${where} carries a file name: ${file[0]}`);
  }

  // 2. Element descriptions and addresses, event by event.
  for (const e of events) {
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
