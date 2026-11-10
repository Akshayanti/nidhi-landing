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
  text: string;
}

/** Every code file under `srcDir`, tests left out. */
export function codeFiles(srcDir: string): SourceFile[] {
  const out: SourceFile[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      const path = relative(srcDir, full).split('\\').join('/');
      if (!CODE.test(name) || /\.test\./.test(name) || WORDS.test(path) || SELF.test(path)) continue;
      out.push({ path, text: readFileSync(full, 'utf8') });
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

// A component's own `track(...)` wrapper, or PostHog called directly.
const CAPTURE = /(?<![\w.])track\(|posthog\??\.capture\??\.?\(/g;

/** Every analytics event the site's code sends, with its properties. */
export function scanEvents(files: SourceFile[]): EventScan {
  const calls: EventCall[] = [];
  const unresolved: string[] = [];
  for (const { path, text } of files) {
    for (const m of text.matchAll(CAPTURE)) {
      const open = m.index + m[0].length - 1;
      // `function track(event, properties)` and the wrapper's own body forward
      // what they were given: the calls that give it are the ones read here.
      const before = text.slice(Math.max(0, m.index - 12), m.index);
      if (/function\s+$/.test(before)) continue;
      // A mention in a comment is not a call.
      const line = text.slice(text.lastIndexOf('\n', m.index) + 1, m.index);
      if (/^\s*(\/\/|\*|\/\*)/.test(line) || /(^|[^:])\/\//.test(line)) continue;
      const args = balanced(text, open);
      if (args === null) { unresolved.push(`${path}: ${text.slice(m.index, m.index + 60)}`); continue; }
      const [first, second] = topLevelParts(args);
      if (first === 'event' && second === 'properties') continue;
      const name = /^'([^'\\]+)'$|^"([^"\\]+)"$/.exec(first ?? '');
      if (!name) { unresolved.push(`${path}: ${m[0]}${args.slice(0, 60)}`); continue; }
      const properties: Record<string, string> = {};
      if (second !== undefined) {
        if (!second.startsWith('{')) { unresolved.push(`${path}: ${name[1] ?? name[2]} ${second.slice(0, 60)}`); continue; }
        let ok = true;
        for (const part of topLevelParts(balanced(second, 0) ?? '')) {
          const pair = /^([A-Za-z_$][\w$]*)\s*(?::\s*([\s\S]+))?$/.exec(part);
          if (!pair) { ok = false; break; }
          properties[pair[1]] = (pair[2] ?? pair[1]).trim();
        }
        if (!ok) { unresolved.push(`${path}: ${name[1] ?? name[2]} ${second.slice(0, 60)}`); continue; }
      }
      calls.push({ event: name[1] ?? name[2], properties, file: path });
    }
  }
  return { calls, unresolved };
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

const STORAGE_CALL = /(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|getItem|removeItem)\(\s*([^,)\s]+)/g;
const KEY_LITERAL = /^['"]([^'"\\]+)['"]$/;

/** Every localStorage and sessionStorage key, plus the consent cookie's name. */
export function scanStorage(files: SourceFile[]): StorageScan {
  const keys = new Set<string>();
  const unresolved: string[] = [];
  for (const { path, text } of files) {
    for (const m of text.matchAll(STORAGE_CALL)) {
      const arg = m[1];
      const literal = KEY_LITERAL.exec(arg);
      if (literal) { keys.add(literal[1]); continue; }
      // A name: its values are the string literals assigned to it in this file.
      const assigned = [...text.matchAll(new RegExp(`(?:const|let|var)\\s+${arg.replace(/[$]/g, '\\$')}\\s*=\\s*(['"])([^'"\\\\]+)\\1`, 'g'))];
      if (/^[A-Za-z_$][\w$]*$/.test(arg) && assigned.length > 0) for (const a of assigned) keys.add(a[2]);
      else unresolved.push(`${path}: ${m[0]}`);
    }
    // The one cookie the site sets (consentRuntime.js) is written as KEY + '='.
    if (/document\.cookie\s*=/.test(text)) {
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
    for (const m of text.matchAll(/https?:\/\/([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g)) {
      const host = m[1].toLowerCase();
      if (OWN_OR_NAMESPACE.has(host)) continue;
      (out[host] ??= new Set()).add(path);
    }
  }
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, [...out[k]].sort()]));
}

/** Every call that makes the browser (or the build) ask a server for something, as `file: what it asks`. */
export function scanRequests(files: SourceFile[]): string[] {
  const out: string[] = [];
  for (const { path, text } of files) {
    for (const m of text.matchAll(/(?<![\w.])(fetch|sendBeacon|XMLHttpRequest|EventSource|WebSocket|importScripts)\(/g)) {
      const args = balanced(text, m.index + m[0].length - 1);
      const first = args === null ? '?' : (topLevelParts(args)[0] ?? '');
      out.push(`${path}: ${m[1]}(${first.replace(/\s+/g, ' ')})`);
    }
    for (const m of text.matchAll(/navigator\.sendBeacon\(/g)) out.push(`${path}: ${m[0]}`);
  }
  return out.sort();
}
