/**
 * Unit tests for src/utils/shared/consentPrompt.js, the cookie prompt that
 * CookieConsent.astro inlines (#363): it opens only when no answer is saved,
 * saves exactly the button pressed and applies it at once, keeps focus inside
 * while open and the page behind it inert (#481), puts everything back when
 * it closes, and reopens from "Cookie settings".
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
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'consentPrompt.js'), 'utf8');
const COMPONENT = readFileSync(join(import.meta.dirname, '../../components/CookieConsent.astro'), 'utf8');

type Listener = (e: any) => void;

class El {
  tagName: string;
  id: string;
  children: El[] = [];
  parentElement: El | null = null;
  inert = false;
  style: Record<string, string> = {};
  classes = new Set<string>();
  classList = { add: (c: string) => this.classes.add(c), remove: (c: string) => this.classes.delete(c) };
  scrollTop = 40;
  handlers: Record<string, Listener[]> = {};
  attrs: Record<string, string>;
  doc: any;
  constructor(tagName: string, id = '', attrs: Record<string, string> = {}) { this.tagName = tagName; this.id = id; this.attrs = attrs; }
  add(...kids: El[]) { for (const k of kids) { k.parentElement = this; this.children.push(k); } return this; }
  addEventListener(type: string, fn: Listener) { (this.handlers[type] ??= []).push(fn); }
  focus() { this.doc.activeElement = this; }
  all(): El[] { return this.children.flatMap((c) => [c, ...c.all()]); }
  querySelector(sel: string) { return sel === '.cookie-modal' ? this.all().find((e) => e.classes.has('cookie-modal')) ?? null : null; }
  querySelectorAll(_sel: string) { return this.all().filter((e) => e.tagName === 'BUTTON' || e.tagName === 'A'); }
  closest(sel: string): El | null {
    assert.equal(sel, '[data-cookie-settings]');
    for (let n: El | null = this; n; n = n.parentElement) if ('data-cookie-settings' in n.attrs) return n;
    return null;
  }
  click() { (this.handlers.click ?? []).forEach((fn) => fn({ target: this })); }
}

function page(saved: string | null) {
  const link = new El('A', 'privacy');
  const decline = new El('BUTTON', 'cookie-decline');
  const accept = new El('BUTTON', 'cookie-accept');
  const modal = new El('DIV');
  modal.classes.add('cookie-modal');
  modal.add(link, decline, accept);
  const overlay = new El('DIV', 'cookie-overlay').add(modal);
  const settings = new El('BUTTON', 'settings', { 'data-cookie-settings': '' });
  const header = new El('HEADER');
  const main = new El('MAIN');
  const footer = new El('FOOTER').add(settings);
  const script = new El('SCRIPT');
  const wrapper = new El('DIV').add(overlay, new El('SCRIPT'));
  const body = new El('BODY').add(header, main, wrapper, footer, script);
  const rootClasses = new Set<string>();
  const docHandlers: Record<string, Listener[]> = {};
  const calls: string[] = [];
  const document: any = {
    activeElement: main,
    body,
    documentElement: { classList: { add: (c: string) => rootClasses.add(c), remove: (c: string) => rootClasses.delete(c) } },
    getElementById: (id: string) => [overlay, accept, decline].find((e) => e.id === id) ?? null,
    addEventListener: (type: string, fn: Listener) => { (docHandlers[type] ??= []).push(fn); },
    removeEventListener: (type: string, fn: Listener) => { docHandlers[type] = (docHandlers[type] ?? []).filter((f) => f !== fn); },
  };
  for (const el of [link, decline, accept, modal, overlay, settings, header, main, footer, script, wrapper, body]) el.doc = document;
  const window = {
    nidhiConsent: {
      read: () => saved,
      save: (choice: string) => calls.push(`save ${choice}`),
      apply: () => calls.push('apply'),
    },
  };
  runInNewContext(SOURCE, { window, document, requestAnimationFrame: (fn: () => void) => fn() });
  const fireDoc = (type: string, e: any) => (docHandlers[type] ?? []).forEach((fn) => fn(e));
  return {
    overlay, accept, decline, link, settings, header, main, footer, script, modal, document, calls, rootClasses,
    open: () => overlay.style.display === 'flex',
    tab: (shiftKey = false) => { let prevented = false; fireDoc('keydown', { key: 'Tab', shiftKey, preventDefault: () => { prevented = true; } }); return prevented; },
    clickDoc: (target: El) => { let prevented = false; fireDoc('click', { target, preventDefault: () => { prevented = true; } }); return prevented; },
  };
}

describe('consentPrompt.js', () => {
  it('is what CookieConsent.astro inlines, after the consent runtime', () => {
    assert.match(COMPONENT, /import consentPromptScript from '\.\.\/utils\/shared\/consentPrompt\.js\?raw';/);
    const runtime = COMPONENT.indexOf('set:html={consentRuntimeScript}');
    const prompt = COMPONENT.indexOf('<script is:inline set:html={consentPromptScript}></script>');
    assert.ok(runtime > 0 && prompt > runtime);
  });

  it('stays closed when an answer is saved, and stores nothing', () => {
    for (const saved of ['accepted', 'declined']) {
      const p = page(saved);
      assert.equal(p.overlay.style.display, 'none');
      assert.deepEqual(p.calls, []);
      assert.ok(!p.header.inert && !p.rootClasses.has('consent-open'));
    }
  });

  it('opens when there is no answer, on its first line, with "No thanks" focused', () => {
    const p = page(null);
    assert.ok(p.open());
    assert.ok(p.overlay.classes.has('cookie-overlay--visible'));
    assert.equal(p.document.activeElement, p.decline);
    assert.equal(p.modal.scrollTop, 0);
    assert.deepEqual(p.calls, [], 'opening saves nothing');
  });

  it('makes the page behind it inert while open (#481), but not scripts or the prompt itself', () => {
    const p = page(null);
    assert.ok(p.header.inert && p.main.inert && p.footer.inert);
    assert.ok(!p.script.inert && !p.overlay.inert);
    assert.ok(p.rootClasses.has('consent-open'));
  });

  it('saves exactly the button pressed, applies it at once, and puts the page back', () => {
    for (const [button, choice] of [['accept', 'accepted'], ['decline', 'declined']] as const) {
      const p = page(null);
      p[button].click();
      assert.deepEqual(p.calls, [`save ${choice}`, 'apply']);
      assert.ok(!p.open());
      assert.ok(!p.header.inert && !p.main.inert && !p.footer.inert);
      assert.ok(!p.rootClasses.has('consent-open'));
      assert.equal(p.document.activeElement, p.main, 'focus returns where it was');
      assert.equal(p.tab(), false, 'the focus trap is gone');
    }
  });

  it('keeps Tab inside the prompt while open', () => {
    const p = page(null);
    p.document.activeElement = p.accept;
    assert.equal(p.tab(), true);
    assert.equal(p.document.activeElement, p.link, 'Tab from the last control goes to the first');
    assert.equal(p.tab(true), true);
    assert.equal(p.document.activeElement, p.accept, 'Shift+Tab from the first goes to the last');
  });

  it('reopens from "Cookie settings", and only from there', () => {
    const p = page('declined');
    assert.equal(p.clickDoc(p.main), false);
    assert.ok(!p.open());
    assert.equal(p.clickDoc(p.settings), true);
    assert.ok(p.open());
    p.accept.click();
    assert.deepEqual(p.calls, ['save accepted', 'apply']);
  });
});
