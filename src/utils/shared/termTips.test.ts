/**
 * Unit tests for src/utils/shared/termTips.js, which BlogPost.astro inlines
 * (#363). The privacy point first: a tip's ids are opaque, so no attribute of
 * a clicked tip carries the term (clicks carry no lesson content; the privacy
 * notice). Then the behaviour: a linked term becomes a button with its
 * definition, a tap opens and a second tap closes, Escape closes and returns
 * focus, and a term with no card entry is left a plain link. Last, where the
 * bubble sits: inside the screen, above the term when there is no room
 * below, and measured without ever being shown early.
 *
 * The stand-in lays a bubble out as a browser does: one that is not displayed
 * measures as nothing, and its left edge follows `--tip-shift` (global.css:
 * `left: var(--tip-shift, 0px)`).
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
  /** Inline style: the custom properties set, and the two plain ones the script touches. */
  style = {
    props: new Map<string, string>(),
    // As in a browser, an empty value takes the property away.
    setProperty(name: string, value: string) { if (value === '') this.props.delete(name); else this.props.set(name, value); },
    visibility: '',
    display: '',
  };
  /** What the stylesheet gives: a bubble is `none` until its term is hovered, focused or open. */
  cssDisplay = 'block';
  /** Where the element would sit with no shift. */
  rect = { left: 10, right: 200, top: 100, bottom: 140 };
  /** The inline visibility at each measurement. */
  measuredWhile: string[] = [];
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
  getBoundingClientRect() {
    this.measuredWhile.push(this.style.visibility);
    if ((this.style.display || this.cssDisplay) === 'none') return { top: 0, bottom: 0, left: 0, right: 0, height: 0, width: 0 };
    const shift = parseFloat(this.style.props.get('--tip-shift') ?? '0');
    const { left, right, top, bottom } = this.rect;
    return { top, bottom, left: left + shift, right: right + shift, height: bottom - top, width: right - left };
  }
  focus() { this.doc.activeElement = this; }
}

function page(opts: { lesson?: boolean } = {}) {
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
  const card = make('section', {}, { 'data-glossary-card': '' },
    term('term-compound-interest', 'Compound interest', 'Interest earned on interest.'),
    term('term-apr', 'APR', 'The yearly cost of a loan.'),
    make('div', { className: 'post-glossary-item', id: 'term-no-name' }, {}, make('dd', { text: 'A definition with no term.' })),
    make('div', { className: 'post-glossary-item', id: 'term-no-definition' }, {}, make('dt', { text: 'A term with no definition' })));
  const p = make('p', {}, {},
    make('a', {}, { href: '#term-compound-interest' }, make('span', { text: 'compound interest' })),
    make('a', {}, { href: '#term-apr' }, make('span', { text: 'APR' })),
    make('a', {}, { href: '#term-missing' }, make('span', { text: 'missing' })),
    make('a', {}, { href: '#term-no-name' }, make('span', { text: 'no name' })),
    make('a', {}, { href: '#term-no-definition' }, make('span', { text: 'no definition' })));
  const body = make('article', { id: 'post-content' }, {}, p);
  const outside = make('div');
  /** The tips the pointer is over. */
  const hovered: El[] = [];
  document.getElementById = (id: string) => (id === 'post-content' && opts.lesson !== false ? body : null);
  document.querySelectorAll = (sel: string) => {
    if (sel === '[data-glossary-card] .post-glossary-item') return card.querySelectorAll('.post-glossary-item');
    if (sel === '.term-tip:hover') return hovered;
    throw new Error(`selector not in the stand-in: ${sel}`);
  };
  runClassicScript(SOURCE, { document, window: { innerHeight: 800 }, getComputedStyle: (el: El) => ({ display: el.style.display || el.cssDisplay }) });
  const fire = (type: string, e: any) => (handlers[type] ?? []).forEach((fn) => fn(e));
  const tips = () => body.querySelectorAll('.term-tip');
  const bubbleOf = (tip: El) => tip.querySelector('.term-tip-bubble')!;
  const triggerOf = (tip: El) => tip.querySelector('.term-tip-trigger')!;
  for (const tip of tips()) bubbleOf(tip).cssDisplay = 'none';
  /** Keyboard focus lands on a term whose bubble would sit at `rect`; returns where the script put it. */
  const focusAt = (tip: El, rect: Partial<El['rect']>, termTop = 80) => {
    Object.assign(bubbleOf(tip).rect, rect);
    tip.rect = { ...tip.rect, top: termTop };
    fire('focusin', { target: triggerOf(tip) });
    return { shift: bubbleOf(tip).style.props.get('--tip-shift'), above: tip.attrs['data-above'] };
  };
  return { body, p, outside, hovered, document, fire, tips, bubbleOf, triggerOf, focusAt, listening: () => Object.keys(handlers) };
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
    assert.equal(p.children[3].tagName, 'A', 'so does one whose entry has no term');
    assert.equal(p.children[4].tagName, 'A', 'and one whose entry has no definition');
    const [first] = tips();
    assert.equal(first.tagName, 'SPAN');
    const trigger = first.querySelector('.term-tip-trigger')!;
    assert.equal(trigger.tagName, 'BUTTON');
    assert.equal(trigger.type, 'button', 'never a submit button');
    assert.equal(trigger.textContent, 'compound interest');
    assert.equal(first.querySelector('.term-tip-bubble')!.attrs.role, 'tooltip');
    assert.match(first.textContent, /Interest earned on interest\./);
  });

  it('shows the term in bold, then its definition; a screen reader gets the definition only', () => {
    const { tips, bubbleOf, triggerOf } = page();
    const [first] = tips();
    const bubble = bubbleOf(first);
    assert.equal(bubble.tagName, 'SPAN');
    const [heading, definition] = bubble.children;
    assert.equal(heading.tagName, 'STRONG');
    assert.equal(heading.textContent, 'Compound interest ', 'a space keeps the term off the definition');
    assert.equal(heading.attrs['aria-hidden'], 'true', 'the button already names the term');
    assert.equal(definition.tagName, 'SPAN');
    assert.equal(definition.textContent, 'Interest earned on interest.');
    assert.equal(definition.id, triggerOf(first).attrs['aria-describedby'], 'the button is described by the definition');
  });

  it('does nothing on a page with no lesson body', () => {
    assert.deepEqual(page({ lesson: false }).listening(), []);
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
    fire('keydown', { key: 'Enter' });
    assert.ok(tip.hasAttribute('data-open'), 'only Escape closes');
    fire('keydown', { key: 'Escape' });
    assert.ok(!tip.hasAttribute('data-open'));
    assert.equal(document.activeElement, trigger, 'focus returns to the term');
  });

  it('stays open on a tap inside the bubble, and closes on a tap on the page itself', () => {
    const { tips, fire, bubbleOf, triggerOf, document } = page();
    const [tip] = tips();
    fire('click', { target: triggerOf(tip) });
    assert.equal(tip.attrs['data-open'], '');
    fire('click', { target: bubbleOf(tip).children[1] });
    assert.ok(tip.hasAttribute('data-open'), 'the definition can be selected');
    fire('click', { target: document }); // the document is no element: it has no closest()
    assert.ok(!tip.hasAttribute('data-open'));
  });

  it('a tap places the bubble and shows a tip that Escape had dismissed', () => {
    const { tips, fire, bubbleOf, triggerOf } = page();
    const [tip] = tips();
    tip.setAttribute('data-dismissed', '');
    bubbleOf(tip).rect = { left: 100, right: 400, top: 100, bottom: 140 };
    fire('click', { target: triggerOf(tip) });
    assert.ok(!tip.hasAttribute('data-dismissed'));
    assert.equal(bubbleOf(tip).style.props.get('--tip-shift'), '-37px');
  });
});

describe('Escape on a tip shown by hover or focus', () => {
  it('dismisses the focused tip and every hovered one, and no other', () => {
    const { tips, fire, triggerOf, hovered, document } = page();
    const [focused, other] = tips();
    triggerOf(focused).focus();
    fire('keydown', { key: 'Escape' });
    assert.equal(focused.attrs['data-dismissed'], '');
    assert.ok(!other.hasAttribute('data-dismissed'));
    hovered.push(other);
    document.activeElement = null;
    fire('keydown', { key: 'Escape' });
    assert.equal(other.attrs['data-dismissed'], '');
  });

  it('is harmless when focus is nowhere in a tip', () => {
    const { tips, fire, outside, document } = page();
    for (const active of [null, outside, {}]) {
      document.activeElement = active;
      fire('keydown', { key: 'Escape' });
    }
    assert.ok(tips().every((tip) => !tip.hasAttribute('data-dismissed')));
  });

  it('comes back once the pointer or focus has left the term, not while it moves inside it', () => {
    for (const leave of ['mouseout', 'focusout']) {
      const { tips, fire, bubbleOf, triggerOf, outside, document } = page();
      const [tip] = tips();
      tip.setAttribute('data-dismissed', '');
      fire(leave, { target: triggerOf(tip), relatedTarget: bubbleOf(tip) });
      assert.ok(tip.hasAttribute('data-dismissed'), `${leave} into the bubble`);
      fire(leave, { target: outside, relatedTarget: null });
      fire(leave, { target: document, relatedTarget: null });
      assert.ok(tip.hasAttribute('data-dismissed'), `${leave} elsewhere on the page`);
      fire(leave, { target: triggerOf(tip), relatedTarget: outside });
      assert.ok(!tip.hasAttribute('data-dismissed'), `${leave} to the page`);
      tip.setAttribute('data-dismissed', '');
      fire(leave, { target: bubbleOf(tip), relatedTarget: null });
      assert.ok(!tip.hasAttribute('data-dismissed'), `${leave} to outside the window`);
    }
  });
});

describe('where the bubble sits', () => {
  it('keeps the bubble 12 px inside a 375 px screen, and lets the left edge win when it is wider', () => {
    const cases: Array<[left: number, right: number, shift: string, why: string]> = [
      [10, 200, '2px', 'two pixels too far left'],
      [50, 200, '0px', 'fits'],
      [12, 150, '0px', 'exactly at the left margin'],
      [173, 363, '0px', 'exactly at the right margin'],
      [100, 400, '-37px', 'past the right edge'],
      [100, 380, '-17px', 'on the screen, but inside the right margin'],
      [20, 400, '-8px', 'wider than the screen: the start of the text stays readable'],
      [-30, 150, '42px', 'past the left edge'],
    ];
    for (const [left, right, shift, why] of cases) {
      const p = page();
      assert.equal(p.focusAt(p.tips()[0], { left, right }).shift, shift, why);
    }
  });

  it('measures from the unshifted place each time, so a second look lands where the first did', () => {
    const p = page();
    const [tip] = p.tips();
    assert.equal(p.focusAt(tip, { left: 100, right: 400 }).shift, '-37px');
    assert.equal(p.focusAt(tip, { left: 100, right: 400 }).shift, '-37px');
    assert.equal(p.bubbleOf(tip).style.props.size, 1, 'one property, --tip-shift');
    assert.equal(tip.style.props.size, 0, 'on the bubble, not the term');
  });

  it('measures a bubble that is not displayed without showing it, and leaves no inline style behind', () => {
    const p = page();
    const [tip] = p.tips();
    const bubble = p.bubbleOf(tip);
    assert.equal(p.focusAt(tip, { left: 100, right: 400 }).shift, '-37px', 'it was laid out to be measured');
    assert.deepEqual(bubble.measuredWhile, ['hidden'], 'and kept invisible meanwhile');
    assert.equal(bubble.style.visibility, '');
    assert.equal(bubble.style.display, '');
  });

  it('measures a bubble that is already showing as it is', () => {
    const p = page();
    const [tip] = p.tips();
    const bubble = p.bubbleOf(tip);
    bubble.cssDisplay = 'block';
    assert.equal(p.focusAt(tip, { left: 100, right: 400 }).shift, '-37px');
    assert.deepEqual(bubble.measuredWhile, [''], 'never hidden while the reader looks at it');
    assert.equal(bubble.style.display, '');
  });

  it('goes above the term only when it does not fit below and does fit above', () => {
    // An 800 px screen and a 100 px bubble: `bottom` is the bubble's, `termTop` the term's.
    const cases: Array<[bottom: number, termTop: number, above: boolean, why: string]> = [
      [790, 600, true, 'no room below, plenty above'],
      [700, 600, false, 'fits below'],
      [788, 600, false, 'just fits below, 12 px from the edge'],
      [790, 100, false, 'no room above either'],
      [790, 120, false, 'above would touch the top of the screen'],
      [790, 128, false, 'above would leave exactly 12 px: not enough'],
      [790, 129, true, 'above leaves 13 px'],
    ];
    for (const [bottom, termTop, above, why] of cases) {
      const p = page();
      assert.equal(p.focusAt(p.tips()[0], { top: bottom - 100, bottom }, termTop).above, above ? '' : undefined, why);
    }
  });

  it('comes back below the term when there is room again', () => {
    const p = page();
    const [tip] = p.tips();
    assert.equal(p.focusAt(tip, { top: 690, bottom: 790 }, 600).above, '');
    assert.equal(p.focusAt(tip, { top: 300, bottom: 400 }, 280).above, undefined);
  });

  it('places a tip the pointer comes over, and leaves an open one where it is', () => {
    const p = page();
    const [tip] = p.tips();
    const bubble = p.bubbleOf(tip);
    bubble.rect = { left: 100, right: 400, top: 100, bottom: 140 };
    p.fire('mouseover', { target: p.outside });
    p.fire('mouseover', { target: p.document });
    assert.equal(bubble.style.props.get('--tip-shift'), undefined);
    p.fire('mouseover', { target: bubble.children[1] });
    assert.equal(bubble.style.props.get('--tip-shift'), '-37px');
    p.fire('click', { target: p.triggerOf(tip) });
    const measured = bubble.measuredWhile.length;
    p.fire('mouseover', { target: bubble });
    assert.equal(bubble.measuredWhile.length, measured, 'an open bubble does not jump under the pointer');
  });

  it('places nothing when focus lands outside a term', () => {
    const p = page();
    p.fire('focusin', { target: p.outside });
    p.fire('focusin', { target: p.document });
    p.fire('focusin', { target: p.bubbleOf(p.tips()[0]) });
    assert.ok(p.tips().every((tip) => p.bubbleOf(tip).style.props.size === 0));
  });
});
