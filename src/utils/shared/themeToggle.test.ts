/**
 * Unit tests for src/utils/shared/themeToggle.js, the theme switch that
 * ThemeToggle.astro inlines (#363): which theme is shown, what is stored
 * (only `nidhi-theme-mode`), and that the buttons keep working where site
 * data is blocked (#346) and after the back button (#520).
 *
 * The file is a classic script, so it runs here as the page runs it, in a
 * context of its own, with a small stand-in for the document.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'themeToggle.js'), 'utf8');
const COMPONENT = readFileSync(join(import.meta.dirname, '../../components/ThemeToggle.astro'), 'utf8');

type Storage = 'works' | 'blocked' | 'read-only';

function page(opts: { saved?: string; storage?: Storage; systemDark?: boolean; toggle?: boolean } = {}) {
  const store = new Map<string, string>(opts.saved ? [['nidhi-theme-mode', opts.saved]] : []);
  const storage = opts.storage ?? 'works';
  const localStorage = {
    getItem(key: string) { if (storage === 'blocked') throw new Error('SecurityError'); return store.get(key) ?? null; },
    setItem(key: string, value: string) { if (storage !== 'works') throw new Error('SecurityError'); store.set(key, value); },
  };
  const attrs: Record<string, string> = {};
  const root = { setAttribute: (n: string, v: string) => { attrs[n] = v; } };
  const buttons = ['light', 'system', 'dark'].map((mode) => {
    const a: Record<string, string> = { 'data-mode': mode };
    const handlers: Array<() => void> = [];
    return {
      attrs: a,
      getAttribute: (n: string) => a[n] ?? null,
      setAttribute: (n: string, v: string) => { a[n] = v; },
      addEventListener: (type: string, fn: () => void) => { assert.equal(type, 'click'); handlers.push(fn); },
      click: () => handlers.forEach((fn) => fn()),
    };
  });
  const toggle = { querySelectorAll: (sel: string) => { assert.equal(sel, '.theme-btn'); return buttons; } };
  const media = { matches: !!opts.systemDark, listeners: [] as Array<() => void> };
  const windowListeners: Record<string, Array<(e: any) => void>> = {};
  const window = {
    matchMedia: (q: string) => {
      assert.equal(q, '(prefers-color-scheme: dark)');
      return { get matches() { return media.matches; }, addEventListener: (_t: string, fn: () => void) => media.listeners.push(fn) };
    },
    addEventListener: (type: string, fn: (e: any) => void) => { (windowListeners[type] ??= []).push(fn); },
  };
  const document = {
    documentElement: root,
    getElementById: (id: string) => { assert.equal(id, 'theme-toggle'); return opts.toggle === false ? null : toggle; },
  };
  runInNewContext(SOURCE, { window, document, localStorage });
  return {
    store,
    theme: () => attrs['data-theme'],
    pressed: () => buttons.filter((b) => b.attrs['aria-pressed'] === 'true').map((b) => b.attrs['data-mode']),
    click: (mode: string) => buttons.find((b) => b.attrs['data-mode'] === mode)!.click(),
    systemChanges: (dark: boolean) => { media.matches = dark; media.listeners.forEach((fn) => fn()); },
    pageshow: (persisted: boolean) => (windowListeners.pageshow ?? []).forEach((fn) => fn({ persisted })),
  };
}

describe('themeToggle.js', () => {
  it('is what ThemeToggle.astro inlines', () => {
    assert.match(COMPONENT, /import themeToggleScript from '\.\.\/utils\/shared\/themeToggle\.js\?raw';/);
    assert.match(COMPONENT, /<script is:inline set:html=\{themeToggleScript\}><\/script>/);
  });

  it('marks the saved choice, or "system" when nothing is saved', () => {
    assert.deepEqual(page({ saved: 'dark' }).pressed(), ['dark']);
    assert.deepEqual(page().pressed(), ['system']);
    assert.deepEqual(page({ storage: 'blocked' }).pressed(), ['system']);
  });

  it('applies and saves a button press, under nidhi-theme-mode only', () => {
    const p = page();
    p.click('dark');
    assert.equal(p.theme(), 'dark');
    assert.deepEqual(p.pressed(), ['dark']);
    assert.deepEqual([...p.store], [['nidhi-theme-mode', 'dark']]);
  });

  it('follows the system theme on "system", and only then', () => {
    const p = page({ systemDark: true });
    p.click('system');
    assert.equal(p.theme(), 'dark');
    p.systemChanges(false);
    assert.equal(p.theme(), 'light');
    p.click('dark');
    p.systemChanges(true);
    p.systemChanges(false);
    assert.equal(p.theme(), 'dark', 'a chosen theme ignores the system');
  });

  it('keeps working for the page where nothing can be saved (#346)', () => {
    const blocked = page({ storage: 'blocked' });
    blocked.click('light');
    assert.equal(blocked.theme(), 'light');
    assert.deepEqual(blocked.pressed(), ['light']);
    blocked.systemChanges(true);
    assert.equal(blocked.theme(), 'light', 'an unsaved choice is still the choice');
    // Writing fails but reading works: the button just pressed beats the older saved answer.
    const readOnly = page({ storage: 'read-only', saved: 'dark' });
    readOnly.click('light');
    readOnly.pageshow(true);
    assert.equal(readOnly.theme(), 'light');
    assert.equal(readOnly.store.get('nidhi-theme-mode'), 'dark');
  });

  it('takes the latest choice when a page comes back from the back button (#520)', () => {
    const p = page({ saved: 'light' });
    p.store.set('nidhi-theme-mode', 'dark'); // chosen on another page since
    p.pageshow(false);
    assert.equal(p.theme(), undefined, 'a fresh load is themed by the head script, not here');
    p.pageshow(true);
    assert.equal(p.theme(), 'dark');
    assert.deepEqual(p.pressed(), ['dark']);
  });

  it('runs on a page without the switch', () => {
    const p = page({ toggle: false, saved: 'dark' });
    p.pageshow(true);
    assert.equal(p.theme(), 'dark');
  });
});
