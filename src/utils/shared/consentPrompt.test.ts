/**
 * Unit tests for src/utils/shared/consentPrompt.js, the cookie prompt that
 * CookieConsent.astro inlines (#363). Since #399 it is a sheet at the bottom
 * of the screen that leaves the page alone: it opens only when no answer is
 * saved, without moving focus or making anything inert; the "Cookie choices"
 * link after "Skip to content" and the footer's "Cookie settings" lead into
 * it; it keeps room for itself at the bottom of the page and below the
 * header; it saves exactly the button pressed and applies it at once; and it
 * gives focus back only when focus was inside it.
 *
 * How an answer is stored and applied is consentRuntime.js, tested in
 * consentRuntime.test.ts; here `window.nidhiConsent` is a stand-in that
 * records what the prompt asks of it.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runClassicScript } from '../../../test/classicScript.ts';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'consentPrompt.js'), 'utf8');
const COMPONENT = readFileSync(join(import.meta.dirname, '../../components/CookieConsent.astro'), 'utf8');
const LAYOUT = readFileSync(join(import.meta.dirname, '../../layouts/BaseLayout.astro'), 'utf8');

type Listener = (e: any) => void;

class El {
  tagName: string;
  id: string;
  children: El[] = [];
  parentElement: El | null = null;
  inert = false;
  hidden = false;
  scrollTop = 40;
  rect = { top: 0, bottom: 0 };
  handlers: Record<string, Listener[]> = {};
  attrs: Record<string, string>;
  focusOptions: unknown = null;
  doc: any;
  constructor(tagName: string, id = '', attrs: Record<string, string> = {}) { this.tagName = tagName; this.id = id; this.attrs = attrs; }
  add(...kids: El[]) { for (const k of kids) { k.parentElement = this; this.children.push(k); } return this; }
  addEventListener(type: string, fn: Listener) { (this.handlers[type] ??= []).push(fn); }
  focus(options?: unknown) { this.focusOptions = options ?? null; this.doc.activeElement = this; this.doc.fire('focusin', { target: this }); }
  contains(other: El | null): boolean { for (let n = other; n; n = n.parentElement) if (n === this) return true; return false; }
  hasAttribute(name: string) { return name in this.attrs; }
  setAttribute(name: string, value: string) { this.attrs[name] = value; }
  getBoundingClientRect() { return this.rect; }
  closest(sel: string): El | null {
    assert.equal(sel, '[data-cookie-settings]');
    for (let n: El | null = this; n; n = n.parentElement) if ('data-cookie-settings' in n.attrs) return n;
    return null;
  }
  click() { const e = { target: this, preventDefault() {} }; (this.handlers.click ?? []).forEach((fn) => fn(e)); this.doc.fire('click', e); }
}

function page(saved: string | null) {
  const skip = new El('A', 'cookie-skip');
  skip.hidden = true;
  const header = new El('HEADER');
  header.rect = { top: 0, bottom: 60 };
  const field = new El('INPUT', 'field');
  const main = new El('MAIN', 'main-content').add(field);
  const settings = new El('BUTTON', 'settings', { 'data-cookie-settings': '' });
  const footer = new El('FOOTER').add(settings);
  const decline = new El('BUTTON', 'cookie-decline');
  const accept = new El('BUTTON', 'cookie-accept');
  const link = new El('A', 'privacy');
  const sheet = new El('SECTION', 'cookie-sheet').add(decline, accept, link);
  sheet.hidden = true;
  sheet.rect = { top: 500, bottom: 800 };
  const body = new El('BODY').add(skip, header, main, footer, sheet);
  const rootClasses = new Set<string>();
  const rootProps = new Map<string, string>();
  const docHandlers: Record<string, Listener[]> = {};
  const winHandlers: Record<string, Listener[]> = {};
  const calls: string[] = [];
  const observed: El[] = [];
  const document: any = {
    activeElement: body,
    body,
    documentElement: {
      classList: { add: (c: string) => rootClasses.add(c), remove: (c: string) => rootClasses.delete(c) },
      style: { setProperty: (k: string, v: string) => rootProps.set(k, v), removeProperty: (k: string) => rootProps.delete(k) },
    },
    getElementById: (id: string) => [sheet, skip, accept, decline, main].find((e) => e.id === id) ?? null,
    querySelector: (sel: string) => (sel === '.site-header' ? header : null),
    addEventListener: (type: string, fn: Listener) => { (docHandlers[type] ??= []).push(fn); },
    removeEventListener: (type: string, fn: Listener) => { docHandlers[type] = (docHandlers[type] ?? []).filter((f) => f !== fn); },
    fire: (type: string, e: any) => (docHandlers[type] ?? []).forEach((fn) => fn(e)),
  };
  for (const el of [skip, header, field, main, settings, footer, decline, accept, link, sheet, body]) el.doc = document;
  const window: any = {
    innerHeight: 800,
    addEventListener: (type: string, fn: Listener) => { (winHandlers[type] ??= []).push(fn); },
    removeEventListener: (type: string, fn: Listener) => { winHandlers[type] = (winHandlers[type] ?? []).filter((f) => f !== fn); },
    nidhiConsent: {
      read: () => saved,
      save: (choice: string) => calls.push(`save ${choice}`),
      apply: () => calls.push('apply'),
    },
  };
  class ResizeObserver {
    observe(el: El) { observed.push(el); }
    disconnect() { observed.length = 0; }
  }
  runClassicScript(SOURCE, { window, document, ResizeObserver, requestAnimationFrame: (fn: () => void) => { fn(); return 1; } });
  return {
    sheet, skip, header, main, field, footer, settings, accept, decline, link, document, window, calls, rootClasses, rootProps, observed, winHandlers,
    open: () => !sheet.hidden,
  };
}

describe('consentPrompt.js', () => {
  it('is what CookieConsent.astro inlines, after the consent runtime', () => {
    assert.match(COMPONENT, /import consentPromptScript from '\.\.\/utils\/shared\/consentPrompt\.js\?raw';/);
    const runtime = COMPONENT.indexOf('set:html={consentRuntimeScript}');
    const prompt = COMPONENT.indexOf('<script is:inline set:html={consentPromptScript}></script>');
    assert.ok(runtime > 0 && prompt > runtime);
  });

  it('is a labelled region, not a modal dialog (#399)', () => {
    assert.match(COMPONENT, /<section id="cookie-sheet" class="cookie-sheet" role="region" aria-labelledby="cookie-title" hidden>/);
    assert.match(COMPONENT, /<h2 id="cookie-title"/);
    assert.doesNotMatch(COMPONENT, /aria-modal|role="dialog"/);
    assert.doesNotMatch(SOURCE, /\.inert\s*=|trapFocus/);
  });

  it('puts "No thanks" first, before "Sure" and the privacy link', () => {
    const decline = COMPONENT.indexOf('id="cookie-decline"');
    const accept = COMPONENT.indexOf('id="cookie-accept"');
    const link = COMPONENT.indexOf('data-attr="cookie-privacy-link"');
    assert.ok(decline > 0 && decline < accept && accept < link);
  });

  it('has its "Cookie choices" link right after every "Skip to content"', () => {
    const skips = LAYOUT.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('<a class="skip-link" href="#main-content">'));
    const cookieSkips = LAYOUT.match(/<a id="cookie-skip" class="skip-link" href="#cookie-sheet" hidden>/g) ?? [];
    // The <noscript> header has none: without scripts the sheet never opens.
    assert.equal(cookieSkips.length, skips.length - 1);
  });

  it('stays closed when an answer is saved, and stores nothing', () => {
    for (const saved of ['accepted', 'declined']) {
      const p = page(saved);
      assert.ok(!p.open() && p.skip.hidden);
      assert.deepEqual(p.calls, []);
      assert.ok(!p.rootClasses.has('cookie-open'));
    }
  });

  it('opens when there is no answer, at its first line, without moving focus or blocking the page', () => {
    const p = page(null);
    assert.ok(p.open());
    assert.ok(!p.skip.hidden, 'the "Cookie choices" link is shown');
    assert.equal(p.document.activeElement, p.document.body, 'focus is not moved');
    assert.equal(p.sheet.scrollTop, 0);
    assert.ok(!p.header.inert && !p.main.inert && !p.footer.inert);
    assert.ok(p.rootClasses.has('cookie-open'));
    assert.deepEqual(p.calls, [], 'opening saves nothing');
  });

  it('keeps room for itself at the bottom of the page, and below the header', () => {
    const p = page(null);
    // 800 px screen, header bottom at 60, an 8 px gap.
    assert.equal(p.rootProps.get('--cookie-room'), '732px');
    // The sheet's top at 500: 300 px to the bottom edge, plus the gap.
    assert.equal(p.rootProps.get('--cookie-space'), '308px');
    assert.deepEqual(p.observed, [p.sheet]);
    p.header.rect = { top: -60, bottom: 0 };
    p.sheet.rect = { top: 400, bottom: 800 };
    p.winHandlers.scroll.forEach((fn) => fn({}));
    assert.equal(p.rootProps.get('--cookie-room'), '792px', 'a header scrolled away leaves the whole screen');
    assert.equal(p.rootProps.get('--cookie-space'), '408px');
  });

  it('saves exactly the button pressed, applies it at once, and takes the room back', () => {
    for (const [button, choice] of [['accept', 'accepted'], ['decline', 'declined']] as const) {
      const p = page(null);
      p[button].click();
      assert.deepEqual(p.calls, [`save ${choice}`, 'apply']);
      assert.ok(!p.open() && p.skip.hidden);
      assert.ok(!p.rootClasses.has('cookie-open'));
      assert.ok(!p.rootProps.has('--cookie-space') && !p.rootProps.has('--cookie-room'));
      assert.deepEqual(p.observed, []);
      assert.equal(p.winHandlers.scroll.length + p.winHandlers.resize.length, 0);
    }
  });

  it('leaves focus alone when it was not inside the sheet', () => {
    const p = page(null);
    p.field.focus();
    p.accept.click();
    assert.equal(p.document.activeElement, p.field);
  });

  it('the "Cookie choices" link moves focus to "No thanks"; an answer gives it back to the page', () => {
    const p = page(null);
    p.field.focus();
    p.skip.focus();
    p.skip.click();
    assert.equal(p.document.activeElement, p.decline);
    p.decline.click();
    assert.equal(p.document.activeElement, p.field, 'back to the last element focused outside the sheet');
  });

  it('falls back to the main content when there is nowhere else to go', () => {
    const p = page(null);
    p.skip.focus();
    p.skip.click();
    p.decline.click();
    assert.equal(p.document.activeElement, p.main);
    assert.equal(p.main.attrs.tabindex, '-1');
    assert.equal(JSON.stringify(p.main.focusOptions), JSON.stringify({ preventScroll: true }));
  });

  it('reopens from "Cookie settings", and only from there, with focus on "No thanks" and back on close', () => {
    const p = page('declined');
    p.main.click();
    assert.ok(!p.open());
    p.settings.focus();
    p.settings.click();
    assert.ok(p.open() && !p.skip.hidden);
    assert.equal(p.document.activeElement, p.decline);
    p.accept.focus();
    p.accept.click();
    assert.deepEqual(p.calls, ['save accepted', 'apply']);
    assert.equal(p.document.activeElement, p.settings);
  });
});
