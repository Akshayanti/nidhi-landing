/**
 * The privacy surface, read from the source: what the site's own code can
 * make a browser send, store or contact.
 *
 *   - analytics events and the names of their properties;
 *   - browser storage keys (localStorage, sessionStorage, the consent cookie);
 *   - every outside host named in code, and every `fetch` call.
 *
 * Click labels, the fourth part, are read by `analyticsLabels.ts`.
 *
 * `privacySurface.test.ts` holds a snapshot of all of it, so a change to any
 * part is an explicit, reviewable edit that points at the privacy changelog
 * rule in CLAUDE.md. `shared/toolPrivacy.test.ts` uses the same reader to
 * check what the free tools send.
 *
 * Node-only: it reads files. Only the tests run it.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const CODE = /\.(astro|tsx|ts|jsx|js|mjs|css)$/;

// This reader writes `track(` and `document.cookie` as text; it sends and stores nothing.
const SELF = /^utils\/privacySurface\.ts$/;

/** Lessons and the string catalogs are words, not code: neither can send or store anything. */
const WORDS = /^(content|i18n\/strings)\//;

export interface SourceFile {
  /** Path from `src/`, with forward slashes. */
  path: string;
  /** The file with its comments blanked: what the readers read. */
  text: string;
  /** The file exactly as written: what the closed checks count, so that nothing can be hidden from them. */
  raw: string;
}

/** A source file from its text, as `codeFiles` builds them. */
export function sourceFile(path: string, raw: string): SourceFile {
  return { path, text: withoutComments(raw), raw };
}

/**
 * `text` with its comments blanked out, so a mention in a comment is never
 * read as code. Line breaks are kept.
 *
 * It walks the text once, knowing when it is inside a string, so that `/*`
 * or `//` written inside a string never starts a comment (code between two
 * such strings must stay visible). Quoted strings end with their line;
 * template strings run until their closing backtick. Whenever it is unsure,
 * it keeps the text: an apostrophe in a page's prose is taken for an open
 * string until the line ends, which can only leave a comment in, never take
 * code out. A `//` starts a comment wherever it stands, except in a web
 * address written in a page's text (`http://x` or `https://x`).
 */
export function withoutComments(text: string): string {
  let out = '';
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      out += c;
      if (c === '\\' && i + 1 < text.length) out += text[++i];
      else if (c === quote || (c === '\n' && quote !== '`')) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; continue; }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop - 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/' && !(/https?:$/.test(text.slice(Math.max(0, i - 6), i)) && /[A-Za-z0-9]/.test(text[i + 2] || ''))) {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop - 1;
      continue;
    }
    out += c;
  }
  return out;
}

/** Every code file under `srcDir`, tests left out, comments blanked. */
export function codeFiles(srcDir: string): SourceFile[] {
  const out: SourceFile[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      const path = relative(srcDir, full).split('\\').join('/');
      if (!CODE.test(name) || /\.test\./.test(name) || WORDS.test(path) || SELF.test(path)) continue;
      out.push(sourceFile(path, readFileSync(full, 'utf8')));
    }
  };
  walk(srcDir);
  return out;
}

/** The text from the bracket at `open` to its match, brackets left out. Skips strings and comments. */
export function balanced(text: string, open: number): string | null {
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const stack: string[] = [];
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2) + 1;
      if (i === 0) return null;
    } else if (pairs[c]) {
      stack.push(pairs[c]);
    } else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return text.slice(open + 1, i);
    }
  }
  return null;
}

/** Splits `text` at the commas that are not inside a bracket, a string or a comment. */
function topLevelParts(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++;
    } else if (c === '/' && text[i + 1] === '/') {
      // A comment is cut out, so it cannot be read as part of a property.
      const end = text.indexOf('\n', i);
      text = text.slice(0, i) + text.slice(end === -1 ? text.length : end);
      i--;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      text = text.slice(0, i) + text.slice(end === -1 ? text.length : end + 2);
      i--;
    } else if ('({['.includes(c)) depth++;
    else if (')}]'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { parts.push(text.slice(from, i)); from = i + 1; }
  }
  parts.push(text.slice(from));
  return parts.map((p) => p.trim()).filter(Boolean);
}

export interface EventCall {
  event: string;
  /** Property name to the expression written for it (`currency: next` gives `next`). */
  properties: Record<string, string>;
  file: string;
}

export interface EventScan {
  calls: EventCall[];
  /** Calls whose event name or properties this reader could not resolve, as `file: text`. */
  unresolved: string[];
}

// A component's own `track(...)` wrapper, or `capture` called on anything.
const CAPTURE = /(?<![\w.])track\s*\(|\bcapture\s*\??\.?\s*\(/g;

// Ways of reaching PostHog that this reader cannot follow: an index, another
// name for it, or its methods pulled out of it.
const POSTHOG_ALIAS = [
  /\bposthog\s*\??\.?\s*\[/g,
  /(?:const|let|var)\s+\{[^}]*\}\s*=\s*(?:window\.|root\.)?posthog\b/g,
  /(?:const|let|var)\s+(?!ph\b)[\w$]+\s*=\s*(?:window\.|root\.)?posthog\s*[;\n]/g,
  /\b(?:const|let|var)\s+[\w$]+\s*=\s*[\w$.?]*\bcapture\s*[;\n]/g,
];

/** Every analytics event the site's code sends, with its properties. */
export function scanEvents(files: SourceFile[]): EventScan {
  const calls: EventCall[] = [];
  const unresolved: string[] = [];
  for (const { path, text } of files) {
    for (const pattern of POSTHOG_ALIAS) {
      for (const m of text.matchAll(pattern)) unresolved.push(`${path}: ${m[0].trim()}`);
    }
    for (const m of text.matchAll(CAPTURE)) {
      const open = m.index + m[0].length - 1;
      // `function track(event, properties)` is the wrapper's own definition.
      if (/function\s+$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;
      const args = balanced(text, open);
      if (args === null) { unresolved.push(`${path}: ${text.slice(m.index, m.index + 60)}`); continue; }
      const [first, second, ...rest] = topLevelParts(args);
      // The wrapper's body forwards what it was given; the calls that give it are read instead.
      if (first === 'event' && second === 'properties' && rest.length === 0) continue;
      const name = /^'([^'\\]+)'$|^"([^"\\]+)"$/.exec(first ?? '');
      if (!name) { unresolved.push(`${path}: ${m[0]}${args.slice(0, 60)}`); continue; }
      const event = name[1] ?? name[2];
      const properties: Record<string, string> = {};
      if (second !== undefined) {
        const body = second.startsWith('{') ? balanced(second, 0) : null;
        if (body === null) { unresolved.push(`${path}: ${event} ${second.slice(0, 60)}`); continue; }
        let ok = true;
        for (const part of topLevelParts(body)) {
          // `name: expression` or the shorthand `name`. A spread, a computed
          // or quoted name, or a method is not read, and says so.
          const pair = /^([A-Za-z_$][\w$]*)\s*(?::\s*([\s\S]+))?$/.exec(part);
          if (!pair) { ok = false; break; }
          properties[pair[1]] = (pair[2] ?? pair[1]).replace(/\s+/g, ' ').trim();
        }
        if (!ok) { unresolved.push(`${path}: ${event} ${second.slice(0, 60)}`); continue; }
      }
      calls.push({ event, properties, file: path });
    }
  }
  return { calls, unresolved };
}

/** Every PostHog method the code calls, as `file: method`, sorted. `capture` is read by `scanEvents`. */
export function scanPosthogCalls(files: SourceFile[]): string[] {
  const out = new Set<string>();
  for (const { path, text } of files) {
    for (const m of text.matchAll(/\b(?:posthog|ph)\s*\??\.\s*([A-Za-z_$][\w$]*)\s*\??\.?\s*\(/g)) {
      if (m[1] !== 'capture') out.add(`${path}: ${m[1]}`);
    }
  }
  return [...out].sort();
}

/** Event name to the sorted names of every property any call gives it. */
export function eventProperties(calls: EventCall[]): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const call of calls) {
    out[call.event] ??= new Set();
    for (const key of Object.keys(call.properties)) out[call.event].add(key);
  }
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, [...out[k]].sort()]));
}

export interface StorageScan {
  /** Every key the code reads or writes, sorted. */
  keys: string[];
  /** Storage calls whose key this reader could not resolve, as `file: text`. */
  unresolved: string[];
}

// Any receiver: the storage object is often held in a variable (`ls.setItem`).
const STORAGE_CALL = /\.\s*(setItem|getItem|removeItem)\s*\(/g;
const KEY_LITERAL = /^['"]([^'"\\]+)['"]$/;
const NAME = /^[A-Za-z_$][\w$]*$/;
// Storage reached without a method this reader follows: a property or an index.
const STORAGE_OTHER = /(?:(?<![\w$.])|(?<=\b(?:window|self|globalThis|root)\.))(?:localStorage|sessionStorage)\s*(?:\[|\.\s*(?!setItem\b|getItem\b|removeItem\b|length\b|key\b)[A-Za-z_$])/g;

/**
 * The string `name` stands for, or null. A closed rule, on the file exactly
 * as written: the name stands for a key only when every one of its
 * appearances in the file is accounted for. One is its declaration with one
 * whole string literal. Each of the others must be the first argument of a
 * storage call, a comparison (`=== NAME`, `!== NAME`) or the start of a
 * concatenation (`NAME + '...'`). Anything that could give the name another
 * value, a parameter of any kind, a second declaration, an assignment, a loop
 * variable, has to write the name once more, and that appearance is none of
 * these. So does a mention in a comment: the answer is then "unresolved",
 * which is the safe one.
 */
function boundLiteral(raw: string, name: string): string | null {
  const n = name.replace(/\$/g, '\\$');
  const word = `(?<![\\w$.])${n}(?![\\w$])`;
  const count = (pattern: string): number => [...raw.matchAll(new RegExp(pattern, 'g'))].length;
  const literal = new RegExp(`(?:const|let|var)\\s+${n}\\s*=\\s*(['"])([^'"\\\\]+)\\1\\s*(?:;|\\n)`).exec(raw);
  if (!literal) return null;
  const accounted =
    1 +
    count(`\\.\\s*(?:setItem|getItem|removeItem)\\s*\\(\\s*${word}\\s*[,)]`) +
    count(`[!=]==\\s*${word}(?!\\s*[=(.\\[])`) +
    count(`${word}\\s*\\+\\s*['"]`);
  return count(word) === accounted ? literal[2] : null;
}

/** Every localStorage and sessionStorage key, plus the consent cookie's name. */
export function scanStorage(files: SourceFile[]): StorageScan {
  const keys = new Set<string>();
  const unresolved: string[] = [];
  for (const { path, text, raw } of files) {
    for (const m of text.matchAll(STORAGE_OTHER)) unresolved.push(`${path}: ${m[0]}`);
    for (const m of text.matchAll(STORAGE_CALL)) {
      const args = balanced(text, m.index + m[0].length - 1);
      const arg = args === null ? '' : (topLevelParts(args)[0] ?? '');
      const literal = KEY_LITERAL.exec(arg);
      if (literal) { keys.add(literal[1]); continue; }
      // A name stands for a key only when every appearance of it in the file
      // is accounted for (see boundLiteral). Anything else could be any key.
      const key = NAME.test(arg) ? boundLiteral(raw, arg) : null;
      if (key !== null) keys.add(key);
      else unresolved.push(`${path}: ${m[1]}(${arg.replace(/\s+/g, ' ').slice(0, 60)})`);
    }
    // The one cookie the site sets (consentRuntime.js) is written as KEY + '='.
    if (/document\s*\.\s*cookie\s*=[^=]/.test(text)) {
      const name = /var KEY = '([^']+)';/.exec(text);
      if (name) keys.add(name[1]);
      else unresolved.push(`${path}: document.cookie =`);
    }
  }
  return { keys: [...keys].sort(), unresolved };
}

// Hosts that name a standard or this site itself: nothing is requested from them by being named.
const OWN_OR_NAMESPACE = new Set(['nidhi.today', 'www.w3.org', 'schema.org', 'schemas.openxmlformats.org', 'example.com']);

/** Every outside host named in code, with the files that name it. A link and a request look the same here. */
export function scanHosts(files: SourceFile[]): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const { path, text } of files) {
    // `https://host`, and the protocol-relative `//host` when it opens a quoted string.
    for (const m of text.matchAll(/(?:https?:\/\/|["'`(]\/\/)([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g)) {
      const host = m[1].toLowerCase();
      if (OWN_OR_NAMESPACE.has(host)) continue;
      (out[host] ??= new Set()).add(path);
    }
  }
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, [...out[k]].sort()]));
}

// Everything that makes a browser ask a server for something from script.
const REQUEST = /\b(fetch|sendBeacon|importScripts)\s*(?:\?\.)?\s*\(|\bnew\s+(?:[\w$]+\s*\.\s*)*(XMLHttpRequest|EventSource|WebSocket|Image|Worker|SharedWorker)\b/g;

/** Every such call, as `file: call(first argument)`, sorted. The files that hold one are `requestFiles`. */
export function scanRequests(files: SourceFile[]): string[] {
  const out: string[] = [];
  for (const { path, text } of files) {
    for (const m of text.matchAll(REQUEST)) {
      if (m[2]) { out.push(`${path}: new ${m[2]}`); continue; }
      const args = balanced(text, m.index + m[0].length - 1);
      const first = args === null ? '?' : (topLevelParts(args)[0] ?? '');
      out.push(`${path}: ${m[1]}(${first.replace(/\s+/g, ' ')})`);
    }
  }
  return out.sort();
}

/** The names of the build-time settings the code reads (`import.meta.env.PUBLIC_*`): what reaches the browser. */
export function scanPublicEnv(files: SourceFile[]): string[] {
  const out = new Set<string>();
  for (const { text } of files) for (const m of text.matchAll(/\bPUBLIC_[A-Z0-9_]+\b/g)) out.add(m[0]);
  return [...out].sort();
}

// The names of the browser features through which code reaches analytics,
// browser storage or the network, and of this site's own wrapper (`track`).
// The readers above understand the usual ways of writing a call; this list
// is what is counted whatever the way. It covers these names and the forms
// below, no more: when a count changes because a new wrapper or another name
// for one of them was added, that name belongs in this list from then on.
const SENSITIVE = [
  'posthog', 'capture', 'track', 'localStorage', 'sessionStorage', 'setItem', 'getItem', 'removeItem', 'cookie', 'indexedDB', 'caches',
  'fetch', 'sendBeacon', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'Worker', 'Image',
  // A request can also be made by building an element that loads something,
  // by sending a form, or by going to an address.
  'createElement', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'setAttribute', 'location', 'submit', 'requestSubmit', 'navigator',
  'eval', 'Function',
];

// Two more, counted only where they act: `src` and `open` are ordinary words
// in markup and prose (every image has a `src=`), so the count is of a
// property being set (`.src =`, `.srcset =`) and of a method being called
// (`.open(`), on anything.
const SENSITIVE_FORMS: [string, RegExp][] = [
  ['.src=', /\.\s*src(?:set)?\s*=(?!=)/g],
  ['.open(', /\.\s*open\s*\??\.?\s*\(/g],
  // Where a form is sent to.
  ['.action=', /\.\s*(?:formA|a)ction\s*=(?!=)/g],
];

/**
 * How many times each file spells each sensitive word, as `file: word xN`,
 * sorted. This is the closed half of the surface: another name for PostHog
 * (`const ph = window.posthog`), an index (`window['posthog']`), storage put
 * in a variable (`const ls = localStorage`) or an optional call
 * (`fetch?.(...)`) each add a mention, whatever the readers above make of
 * them. What is then done through such a variable spells none of these words
 * (`ls.amount = v`), which is why `scanHolders` does not allow one.
 *
 * It counts the file exactly as written, comments and strings included. The
 * readers blank comments first, and anything that decides what is a comment
 * can be fooled into hiding code; a plain count of the raw text cannot. The
 * price is that a comment, a class name or a piece of prose naming one of
 * these words counts too. `skip` names
 * files that are words only (the privacy notice).
 */
export function scanMentions(files: SourceFile[], skip: RegExp | null = null): string[] {
  const out: string[] = [];
  for (const { path, raw } of files) {
    if (skip && skip.test(path)) continue;
    for (const word of SENSITIVE) {
      // A whole word, and nothing more is assumed: a hyphen beside it may be
      // a class name (`cookie-btn`) or a minus sign (`-fetch(...)`), and only
      // counting both keeps the second from hiding.
      const n = [...raw.matchAll(new RegExp(`(?<![\\w$])${word}(?![\\w$])`, 'g'))].length;
      if (n > 0) out.push(`${path}: ${word} x${n}`);
    }
    for (const [name, pattern] of SENSITIVE_FORMS) {
      const n = [...raw.matchAll(pattern)].length;
      if (n > 0) out.push(`${path}: ${name} x${n}`);
    }
  }
  return out.sort();
}

const HELD = /(?<![\w$])(?:localStorage|sessionStorage|posthog)(?![\w$])/g;

// The methods that may be called on them outside the pinned files. None
// returns the object or a part of it.
const DIRECT_CALLS: Record<string, string[]> = {
  localStorage: ['getItem', 'setItem', 'removeItem'],
  sessionStorage: ['getItem', 'setItem', 'removeItem'],
  posthog: ['capture', 'identify', 'set_config'],
};

export interface HolderScan {
  /** `file: sha256 <first 16 hex>` for each file named in `wholeFiles`. */
  pinned: string[];
  /** `file: <line>` for each use of storage or PostHog that is not one of the plain forms. */
  unresolved: string[];
}

/**
 * Storage and PostHog are only ever used in plain sight.
 *
 * Following an object through variables in text does not work: every rule
 * for it has had a next case (a copy of a copy, a member kept in a variable,
 * a guard expression that hands the object on). So there is nothing to
 * follow. Outside the files named in `wholeFiles`, each appearance of
 * `localStorage`, `sessionStorage` or `posthog` must be one of:
 *
 *   - one of a fixed list of its methods called on it, there and then:
 *     `localStorage.getItem(...)`, `window.posthog?.capture?.(...)`. The list
 *     is closed because a method can hand the object back
 *     (`localStorage.valueOf()` is the object itself);
 *   - a test of whether it, or a member of it, is there, in the condition of
 *     an `if` or a `while` that assigns and yields nothing: `if (window.posthog)`,
 *     `if (!window.posthog?.__loaded || typeof window.posthog.set_config !==
 *     'function')`. It must stand in the condition itself, not inside a call
 *     made there (`if (list.push(localStorage))` keeps it);
 *   - its name in a string that is not an index: `persistence: 'localStorage'`.
 *
 * Anything else, keeping it or a part of it in a variable, returning it,
 * passing it on, indexing it, setting a property on it, is listed as
 * unresolved, and the test fails. A file that needs to do such a thing is
 * named in `wholeFiles` and pinned by its whole content, so any edit to it
 * at all is looked at.
 */
/**
 * Whether the name at [at, end) is only being tested inside the condition
 * that opens at `from`. What stands right before it must start a test, not
 * hand it on. Every bracket around it, up to the condition's own,
 * must be one that only groups: a `(` that follows `(`, `&&` or `||`, with
 * or without a "not" in between.
 * A `(` after anything else (a name, `)`, `]`, `?.`, whatever a call can be
 * written with) may be a call, which can keep what it is given; so can `[`
 * and `{`. And what follows the name, after at most two member names, must
 * end the test: a closing bracket, `&&`, `||` or a comparison.
 */
/**
 * Whether `before` ends where a test can start: at `(`, `&&` or `||`, with
 * any number of `!` after it. The `!` must be the "not" that follows one of
 * those three: TypeScript also writes `!` after a name (`keep!(x)` is a call
 * to `keep`), and that one follows a name.
 */
function startsTest(before: string): boolean {
  return /(?:\(|&&|\|\|)$/.test(before.replace(/[\s!]+$/, ''));
}

function isTest(whole: string, from: number, at: number, end: number): boolean {
  // Strings are emptied first, keeping their length: a bracket written
  // inside one (`keep(")" && x)`) is text, not a bracket.
  const hollow = (m: string): string => m[0] + ' '.repeat(m.length - 2) + m[0];
  const text = whole.slice(0, from) + whole.slice(from, at).replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, hollow) + whole.slice(at);
  // Nothing that looks like a comment may be left before the name: the
  // blanking keeps a `//` that follows `https:`, and what stands after it
  // would then be read as code.
  if (/\/\/|\/\*/.test(text.slice(from, at))) return false;
  // A quote left over is a string this could not pair up: refuse.
  if (/['"`]/.test(text.slice(from, at).replace(/'\s*'|"\s*"|`\s*`/g, ''))) return false;
  // What stands right before the name (and the `window.` it may hang from)
  // must itself start a test: the bracket, `!`, `&&`, `||`, or one of those
  // then `typeof`. Any other word there (`yield`, `await`, `return`, `void`,
  // a comma) can hand the object on.
  const lead = text.slice(from, at).replace(/(?:window|globalThis|self|root)\s*\.\s*$/, '').trimEnd().replace(/typeof$/, '');
  if (!startsTest(lead)) return false;
  let depth = 0;
  for (let i = at - 1; i > from; i--) {
    const c = text[i];
    if (c === ')' || c === ']' || c === '}') depth++;
    else if (c === '[' || c === '{') { if (depth === 0) return false; depth--; }
    else if (c === '(') {
      if (depth > 0) { depth--; continue; }
      // An open bracket around the name: accepted only if it plainly groups.
      if (!startsTest(text.slice(from, i))) return false;
      // A group that goes on after it closes is not a test of what is in
      // it: `(localStorage).clear()` calls a method on the object.
      const inner = balanced(text, i);
      // However much white space (or a comment, which is white space by
      // now) stands between the bracket and what carries it on.
      if (inner === null || /^(?:\?\.|\.|\[|\(|`)/.test(text.slice(i + inner.length + 2).trimStart())) return false;
    }
  }
  return /^(?:\s*\??\.\s*[A-Za-z_$][\w$]*){0,2}\s*(?:\)|&&|\|\||[!=]==?(?!=))/.test(text.slice(end, end + 120));
}

export function scanHolders(files: SourceFile[], wholeFiles: string[]): HolderScan {
  const pinned: string[] = [];
  const unresolved: string[] = [];
  for (const { path, text, raw } of files) {
    if (wholeFiles.includes(path)) {
      pinned.push(`${path}: sha256 ${createHash('sha256').update(raw).digest('hex').slice(0, 16)}`);
      continue;
    }
    // The conditions of every `if` and `while`, as [start, end) ranges, left
    // out when they assign anything.
    const conditions: [number, number][] = [];
    for (const m of text.matchAll(/(?<![\w$.])(?:if|while)\s*\(/g)) {
      const open = m.index + m[0].length - 1;
      const inner = balanced(text, open);
      // `yield` takes the whole expression after it, however that is written, and hands it to the caller.
      if (inner === null || /(?<![=!<>])=(?![=>])|=>|\+\+|--|(?<![\w$.])yield(?![\w$])/.test(inner)) continue;
      conditions.push([open, open + inner.length + 1]);
    }
    for (const m of text.matchAll(HELD)) {
      const at = m.index;
      const before = text.slice(Math.max(0, at - 40), at);
      const after = text.slice(at + m[0].length, at + m[0].length + 80);
      const quote = text[at - 1];
      const call = /^\s*\??\.\s*([A-Za-z_$][\w$]*)\s*(?:\?\.)?\s*\(/.exec(after);
      const plain =
        // Its name in a string, unless the string is an index (`window['localStorage']`).
        ((quote === "'" || quote === '"' || quote === '`') && after[0] === quote && !/\[\s*$/.test(text.slice(Math.max(0, at - 12), at - 1))) ||
        // One of its permitted methods, called there and then.
        (call !== null && DIRECT_CALLS[m[0]].includes(call[1])) ||
        // A test of whether it, or a member of it, is there.
        conditions.some(([from, to]) => at > from && at < to && isTest(text, from, at, at + m[0].length));
      if (plain) continue;
      const lineStart = text.lastIndexOf('\n', at) + 1;
      const lineEnd = text.indexOf('\n', at);
      unresolved.push(`${path}: ${raw.slice(lineStart, lineEnd === -1 ? raw.length : lineEnd).trim()}`);
    }
  }
  return { pinned: pinned.sort(), unresolved };
}
