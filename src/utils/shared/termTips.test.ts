/**
 * Unit tests for src/utils/shared/termTips.js, which BlogPost.astro inlines
 * (#363). The privacy point first: a tip's ids are opaque, so no attribute of
 * a clicked tip carries the term (clicks carry no lesson content; the privacy
 * notice). Then the behaviour: a linked term becomes a button with its
 * definition, a tap opens and a second tap closes, Escape closes and returns
 * focus, and a term with no card entry is left a plain link.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runClassicScript } from '../../../test/classicScript.ts';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'termTips.js'), 'utf8');
const LAYOUT = readFileSync(join(import.meta.dirname, '../../layouts/BlogPost.astro'), 'utf8');

class El {
  tagName: string;
  attrs: Record<string, string> = {};
  children: El[] = [];
  parentElement: El | null = null;
  className = '';
  id = '';
  type = '';
  text = '';
  style = { setProperty: () => undefined, visibility: '', display: '' };
  doc: any;
  constructor(tagName: string, doc: any) { this.tagName = tagName.toUpperCase(); this.doc = doc; }
  get textContent(): string { return this.text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v: string) { this.text = v; this.children = []; }
  get firstChild(): El | null { return this.children[0] ?? null; }
  appendChild(c: El) { if (c.parentElement) c.parentElement.children = c.parentElement.children.filter((x) => x !== c); c.parentElement = this; this.children.push(c); return c; }
  replaceWith(n: El) { const p = this.parentElement!; p.children[p.children.indexOf(this)] = n; n.parentElement = p; this.parentElement = null; }
  getAttribute(n: string) { return this.attrs[n] ?? null; }
  setAttribute(n: string, v: string) { this.attrs[n] = v; }
  removeAttribute(n: string) { delete this.attrs[n]; }
  hasAttribute(n: string) { return n in this.attrs; }
  contains(o: El | null): boolean { for (let n = o; n; n = n.parentElement) if (n === this) return true; return false; }
  all(): El[] { return this.children.flatMap((c) => [c, ...c.all()]); }
  matches(sel: string): boolean {
    if (sel.startsWith('.')) return this.className.split(' ').includes(sel.slice(1));
    if (sel === 'dt' || sel === 'dd') return this.tagName === sel.toUpperCase();
    if (sel === 'a[href^="#term-"]') return this.tagName === 'A' && (this.attrs.href ?? '').startsWith('#term-');
    throw new Error(`selector not in the stand-in: ${sel}`);
  }
  querySelector(sel: string) { return this.all().find((e) => e.matches(sel)) ?? null; }
  querySelectorAll(sel: string) { return this.all().filter((e) => e.matches(sel)); }
  closest(sel: string): El | null { for (let n: El | null = this; n; n = n.parentElement) if (n.matches(sel)) return n; return null; }
  getBoundingClientRect() { return { top: 100, bottom: 140, left: 10, right: 200, height: 40, width: 190 }; }
  focus() { this.doc.activeElement = this; }
}

function page() {
  const handlers: Record<string, Array<(e: any) => void>> = {};
  const document: any = {
    activeElement: null,
    documentElement: { clientWidth: 375 },
    createElement: (t: string) => new El(t, document),
    addEventListener: (t: string, fn: (e: any) => void) => { (handlers[t] ??= []).push(fn); },
  };
  const make = (tag: string, props: Partial<El> = {}, attrs: Record<string, string> = {}, ...kids: El[]) => {
    const e = new El(tag, document);
    Object.assign(e, props);
    Object.assign(e.attrs, attrs);
    kids.forEach((k) => e.appendChild(k));
    return e;
  };
  const term = (id: string, name: string, def: string) => make('div', { className: 'post-glossary-item', id }, {}, make('dt', { text: name }), make('dd', { text: def }));
  const card = make('section', {}, { 'data-glossary-card': '' }, term('term-compound-interest', 'Compound interest', 'Interest earned on interest.'), term('term-apr', 'APR', 'The yearly cost of a loan.'));
  const p = make('p', {}, {},
    make('a', {}, { href: '#term-compound-interest' }, make('span', { text: 'compound interest' })),
    make('a', {}, { href: '#term-apr' }, make('span', { text: 'APR' })),
    make('a', {}, { href: '#term-missing' }, make('span', { text: 'missing' })));
  const body = make('article', { id: 'post-content' }, {}, p);
  const outside = make('div');
  document.getElementById = (id: string) => (id === 'post-content' ? body : null);
  document.querySelectorAll = (sel: string) => {
    if (sel === '[data-glossary-card] .post-glossary-item') return card.querySelectorAll('.post-glossary-item');
    if (sel === '.term-tip:hover') return [];
    throw new Error(`selector not in the stand-in: ${sel}`);
  };
  runClassicScript(SOURCE, { document, window: { innerHeight: 800 }, getComputedStyle: () => ({ display: 'none' }) });
  const fire = (type: string, e: any) => (handlers[type] ?? []).forEach((fn) => fn(e));
  return { body, p, outside, document, fire, tips: () => body.querySelectorAll('.term-tip') };
}

describe('termTips.js', () => {
  it('is what BlogPost.astro inlines', () => {
    assert.match(LAYOUT, /import termTipsScript from '\.\.\/utils\/shared\/termTips\.js\?raw';/);
    assert.match(LAYOUT, /<script is:inline set:html=\{termTipsScript\}><\/script>/);
  });

  it('turns each linked term with a card entry into a tip, and leaves the rest a link', () => {
    const { p, tips } = page();
    assert.equal(tips().length, 2);
    assert.equal(p.children[2].tagName, 'A', 'a term with no entry stays a link');
    const [first] = tips();
    const trigger = first.querySelector('.term-tip-trigger')!;
    assert.equal(trigger.tagName, 'BUTTON');
    assert.equal(trigger.textContent, 'compound interest');
    assert.equal(first.querySelector('.term-tip-bubble')!.attrs.role, 'tooltip');
    assert.match(first.textContent, /Interest earned on interest\./);
  });

  it('gives a tip only opaque ids, so no attribute names the term', () => {
    const { tips } = page();
    tips().forEach((tip, i) => {
      const trigger = tip.querySelector('.term-tip-trigger')!;
      assert.equal(trigger.attrs['aria-describedby'], `term-tip-${i + 1}`);
      for (const el of [tip, ...tip.all()]) {
        for (const value of [el.id, ...Object.values(el.attrs)]) {
          assert.doesNotMatch(value, /compound|interest|apr/i, `${el.tagName} carries "${value}"`);
        }
      }
    });
  });

  it('opens on a tap, closes on a second tap, a tap elsewhere or Escape', () => {
    const { tips, fire, outside, document } = page();
    const [tip, other] = tips();
    const trigger = tip.querySelector('.term-tip-trigger')!;
    fire('click', { target: trigger });
    assert.ok(tip.hasAttribute('data-open'));
    fire('click', { target: trigger });
    assert.ok(!tip.hasAttribute('data-open'));
    fire('click', { target: trigger });
    fire('click', { target: other.querySelector('.term-tip-trigger') });
    assert.ok(!tip.hasAttribute('data-open') && other.hasAttribute('data-open'), 'one open at a time');
    fire('click', { target: outside });
    assert.ok(!other.hasAttribute('data-open'));
    fire('click', { target: trigger });
    fire('keydown', { key: 'Escape' });
    assert.ok(!tip.hasAttribute('data-open'));
    assert.equal(document.activeElement, trigger, 'focus returns to the term');
  });
});
