/**
 * Unit tests for src/utils/shared/lessonPage.js, which BlogPost.astro inlines
 * (#363): the read marker (only the slug, only under `nidhi-reading-progress`,
 * and harmless where storage is blocked or holds junk), the share bar (copies
 * and shares the addresses the page gives it, reads the browser's name and
 * sends nothing) and printing (every expander open, then put back).
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runClassicScript } from '../../../test/classicScript.ts';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'lessonPage.js'), 'utf8');
const LAYOUT = readFileSync(join(import.meta.dirname, '../../layouts/BlogPost.astro'), 'utf8');

class Node {
  hidden = true;
  textContent = '';
  open = false;
  selected = false;
  handlers: Record<string, Array<() => void>> = {};
  addEventListener(type: string, fn: () => void) { (this.handlers[type] ??= []).push(fn); }
  fire(type: string) { (this.handlers[type] ?? []).forEach((fn) => fn()); }
  select() { this.selected = true; }
}

interface Options {
  path?: string;
  stored?: string | null;
  storage?: 'works' | 'blocked';
  userAgent?: string;
  share?: 'none' | 'ok' | 'abort' | 'fail';
  clipboard?: 'ok' | 'fail' | 'none';
  shareBar?: boolean;
  printSaved?: boolean;
}

/** The day every test page prints on, so the printed date can be read exactly. */
class PrintDay extends Date {
  constructor() { super(2026, 0, 5, 12); }
}

async function page(opts: Options = {}) {
  const store = new Map<string, string>();
  if (opts.stored !== undefined && opts.stored !== null) store.set('nidhi-reading-progress', opts.stored);
  const localStorage = {
    getItem: (k: string) => { if (opts.storage === 'blocked') throw new Error('SecurityError'); return store.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (opts.storage === 'blocked') throw new Error('SecurityError'); store.set(k, v); },
  };
  const parts = { native: new Node(), copy: new Node(), save: new Node(), status: new Node(), address: new Node(), fallback: new Node() };
  parts.fallback.hidden = false;
  const bar = {
    dataset: { copyUrl: 'https://nidhi.today/blog/x/?utm_source=share&utm_medium=copy', nativeUrl: 'https://nidhi.today/blog/x/?utm_source=share&utm_medium=native', title: 'Lesson X' },
    querySelector: (sel: string) => ({ '[data-share-native]': parts.native, '[data-share-copy]': parts.copy, '[data-share-save]': parts.save, '[data-share-status]': parts.status, '[data-share-address]': parts.address } as Record<string, Node>)[sel],
    querySelectorAll: (sel: string) => { assert.equal(sel, '[data-share-fallback]'); return [parts.fallback]; },
  };
  const details = [new Node(), new Node()];
  const printSaved = new Node();
  const windowHandlers: Record<string, Array<() => void>> = {};
  const copied: string[] = [];
  const shared: unknown[] = [];
  let printed = 0;
  const timers: Array<{ id: number; fn: () => void; ms: number; cleared: boolean }> = [];
  const navigator: Record<string, unknown> = { userAgent: opts.userAgent ?? 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130' };
  if ((opts.clipboard ?? 'ok') !== 'none') {
    navigator.clipboard = { writeText: (t: string) => { copied.push(t); return opts.clipboard === 'fail' ? Promise.reject(new Error('denied')) : Promise.resolve(); } };
  }
  if (opts.share && opts.share !== 'none') {
    navigator.share = (data: unknown) => {
      shared.push(data);
      if (opts.share === 'ok') return Promise.resolve();
      const err = new Error('x');
      err.name = opts.share === 'abort' ? 'AbortError' : 'NotAllowedError';
      return Promise.reject(err);
    };
  }
  const context = {
    window: {
      location: { pathname: opts.path ?? '/blog/emergency-fund/' },
      addEventListener: (t: string, fn: () => void) => { (windowHandlers[t] ??= []).push(fn); },
      print: () => { printed += 1; },
    },
    document: {
      querySelector: (sel: string) => (sel === '[data-print-saved]' && opts.printSaved !== false ? printSaved : null),
      querySelectorAll: (sel: string) => {
        if (sel === '[data-lesson-share]') return opts.shareBar === false ? [] : [bar];
        assert.match(sel, /details:not\(\[open\]\)/);
        return details.filter((d) => !d.open);
      },
    },
    navigator,
    localStorage,
    setTimeout: (fn: () => void, ms: number) => { timers.push({ id: timers.length + 1, fn, ms, cleared: false }); return timers.length; },
    clearTimeout: (id: number) => { const t = timers.find((x) => x.id === id); if (t) t.cleared = true; },
    Promise,
    JSON,
    Date: PrintDay,
  };
  runClassicScript(SOURCE, context);
  const settle = () => new Promise((r) => setImmediate(r));
  /** Lets the given time pass: every timer due by then, and not cancelled, runs once. */
  const wait = (ms: number) => timers.filter((t) => !t.cleared && t.ms <= ms).forEach((t) => { t.cleared = true; t.fn(); });
  return { store, parts, details, printSaved, copied, shared, wait, pending: () => timers.filter((t) => !t.cleared).length, printed: () => printed, fireWindow: (t: string) => (windowHandlers[t] ?? []).forEach((fn) => fn()), settle };
}

describe('lessonPage.js', () => {
  it('is what BlogPost.astro inlines', () => {
    assert.match(LAYOUT, /import lessonPageScript from '\.\.\/utils\/shared\/lessonPage\.js\?raw';/);
    assert.match(LAYOUT, /<script is:inline set:html=\{lessonPageScript\}><\/script>/);
  });

  it('sends nothing: no request, beacon or other storage in the source', () => {
    assert.doesNotMatch(SOURCE, /fetch\(|sendBeacon|XMLHttpRequest|sessionStorage|document\.cookie|posthog/);
    assert.deepEqual([...SOURCE.matchAll(/'(nidhi-[\w-]+)'/g)].map((m) => m[1]), ['nidhi-reading-progress']);
  });
});

describe('the read marker', () => {
  it('stores the slug once, and only the slug', async () => {
    const p = await page({ stored: JSON.stringify(['budgeting']) });
    assert.deepEqual([...p.store], [['nidhi-reading-progress', '["budgeting","emergency-fund"]']]);
    const again = await page({ stored: '["emergency-fund"]' });
    assert.equal(again.store.get('nidhi-reading-progress'), '["emergency-fund"]');
  });

  it('starts a list when there is none, and survives junk or blocked storage', async () => {
    assert.equal((await page()).store.get('nidhi-reading-progress'), '["emergency-fund"]');
    assert.equal((await page({ stored: '{not json' })).store.get('nidhi-reading-progress'), '{not json');
    await page({ storage: 'blocked' });
  });

  it('marks nothing on an address with no slug', async () => {
    assert.equal((await page({ path: '/' })).store.size, 0);
  });
});

describe('the share bar', () => {
  it('shows copy and save, and copies the copy address', async () => {
    const p = await page();
    assert.ok(!p.parts.copy.hidden && !p.parts.save.hidden && p.parts.native.hidden);
    p.parts.copy.fire('click');
    await p.settle();
    assert.deepEqual(p.copied, ['https://nidhi.today/blog/x/?utm_source=share&utm_medium=copy']);
    assert.equal(p.parts.status.textContent, 'Link copied');
    assert.equal(p.parts.copy.textContent, '\u2713 Copied');
  });

  it('puts the copy button back after four seconds, counted from the last press', async () => {
    const p = await page();
    p.parts.copy.fire('click');
    await p.settle();
    p.wait(3999);
    assert.equal(p.parts.copy.textContent, '\u2713 Copied');
    p.parts.copy.fire('click');
    await p.settle();
    assert.equal(p.pending(), 1, 'the first press no longer has a timer of its own');
    p.wait(4000);
    assert.equal(p.parts.copy.textContent, 'Copy link');
    assert.equal(p.parts.status.textContent, '');
  });

  it('shows the address to copy by hand when copying fails', async () => {
    for (const clipboard of ['fail', 'none'] as const) {
      const p = await page({ clipboard });
      p.parts.copy.fire('click');
      await p.settle();
      assert.ok(!p.parts.address.hidden && p.parts.address.selected, clipboard);
      assert.match(p.parts.status.textContent, /Could not copy/);
    }
  });

  it('uses the system share sheet where there is one, with the native address', async () => {
    const p = await page({ share: 'ok' });
    assert.ok(!p.parts.native.hidden && p.parts.fallback.hidden);
    p.parts.native.fire('click');
    await p.settle();
    assert.deepEqual(JSON.parse(JSON.stringify(p.shared)), [{ title: 'Lesson X', url: 'https://nidhi.today/blog/x/?utm_source=share&utm_medium=native' }]);
    assert.deepEqual(p.copied, []);
  });

  it('copies instead when sharing fails, and does nothing when the reader closes the sheet', async () => {
    const failed = await page({ share: 'fail' });
    failed.parts.native.fire('click');
    await failed.settle();
    await failed.settle();
    assert.equal(failed.copied.length, 1);
    assert.equal(failed.parts.status.textContent, 'Sharing did not open, so the link was copied instead.');
    const neither = await page({ share: 'fail', clipboard: 'fail' });
    neither.parts.native.fire('click');
    await neither.settle();
    await neither.settle();
    assert.ok(!neither.parts.address.hidden);
    assert.equal(neither.parts.status.textContent, 'Sharing did not open. Press and hold the link to copy it.');
    const aborted = await page({ share: 'abort' });
    aborted.parts.native.fire('click');
    await aborted.settle();
    assert.equal(aborted.copied.length, 0);
  });

  it('prints for a PDF, except in an in-app browser, where it says why', async () => {
    const normal = await page();
    normal.parts.save.fire('click');
    assert.equal(normal.printed(), 1);
    assert.equal(normal.parts.status.textContent, 'In the print window, choose Save as PDF. On iPhone: Share, then Save to Files.');
    const inApp = await page({ userAgent: 'Mozilla/5.0 (iPhone) Instagram 300.0' });
    inApp.parts.save.fire('click');
    assert.equal(inApp.printed(), 0);
    assert.match(inApp.parts.status.textContent, /open this page in your phone's browser/);
  });
});

describe('printing', () => {
  it('opens every closed expander, then closes the same ones after', async () => {
    const p = await page();
    p.details[1].open = true;
    p.fireWindow('beforeprint');
    assert.ok(p.details.every((d) => d.open));
    assert.equal(p.printSaved.textContent, 'Saved on January 5, 2026.');
    p.fireWindow('afterprint');
    assert.deepEqual(p.details.map((d) => d.open), [false, true]);
  });

  it('prints a page that has no line for the date', async () => {
    const p = await page({ printSaved: false });
    p.fireWindow('beforeprint');
    assert.ok(p.details.every((d) => d.open));
    assert.equal(p.printSaved.textContent, '');
  });
});
