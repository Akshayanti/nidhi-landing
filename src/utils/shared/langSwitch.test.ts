/**
 * Unit tests for src/utils/shared/langSwitch.js, the language switch script
 * Header.astro inlines: links rebuilt from the live address, and a free tool's
 * state added only at click time, never in an href.
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
import { LOCALES, localePrefix } from '../../i18n/config.ts';

const SOURCE = readFileSync(join(import.meta.dirname, 'langSwitch.js'), 'utf8');
const HEADER = readFileSync(join(import.meta.dirname, '../../components/Header.astro'), 'utf8');

// Built the way Header.astro builds it.
const PREFIXES: Record<string, string> = {};
for (const l of LOCALES) PREFIXES[l] = localePrefix(l);

const GLOBAL = '__nidhiLoanCompareShared';
const STATE = 'c=INR&v1=250000%7E8.5%7E20&v1_nm=SECRETBANK';

class Element {
  attrs: Record<string, string>;
  constructor(attrs: Record<string, string>) { this.attrs = { ...attrs }; }
  getAttribute(name: string): string | null { return this.attrs[name] ?? null; }
  setAttribute(name: string, value: string): void { this.attrs[name] = value; }
  closest(selector: string): Element | null {
    assert.equal(selector, '[data-lang-switch]');
    return 'data-lang-switch' in this.attrs ? this : null;
  }
}

interface Click {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
}

interface Page {
  links: Element[];
  /** Addresses the page navigated to. */
  assigned: string[];
  /** Addresses opened in a new tab. */
  opened: string[];
  listeners: string[];
  /** Fires `type` on `target`; returns whether the default was prevented. */
  fire(type: 'click' | 'auxclick', target: unknown, init?: Click): boolean;
  href(locale: string): string | null;
}

/** A page at `address` whose switch offers `targets`, with `state` in the tool's window property. */
function page(address: string, opts: { targets?: string[]; toolStateGlobal?: string; state?: string } = {}): Page {
  const url = new URL(address, 'https://nidhi.today');
  const targets = opts.targets ?? LOCALES.filter((l) => PREFIXES[l] !== undefined);
  // Each locale appears twice, as it does on the page: the desktop picker and the phone menu.
  const links = [...targets, ...targets].map((l) => new Element({ 'data-lang-switch': l, href: `${PREFIXES[l] ?? ''}/as-rendered/` }));
  const handlers: Record<string, ((e: any) => void)[]> = {};
  const assigned: string[] = [];
  const opened: string[] = [];
  const window: Record<string, any> = {
    Element,
    location: { pathname: url.pathname, search: url.search, hash: url.hash, assign: (to: string) => { assigned.push(to); } },
    open: (to: string, target: string, features: string) => {
      assert.equal(target, '_blank');
      assert.equal(features, 'noopener');
      opened.push(to);
    },
    document: {
      querySelectorAll: (selector: string) => {
        assert.equal(selector, '[data-lang-switch]');
        return links;
      },
      addEventListener: (type: string, fn: (e: any) => void) => { (handlers[type] ??= []).push(fn); },
    },
  };
  if (opts.toolStateGlobal && opts.state !== undefined) window[opts.toolStateGlobal] = opts.state;
  runInNewContext(SOURCE, { window, globalThis: window, URLSearchParams });
  window.nidhiLangSwitch(PREFIXES, opts.toolStateGlobal ?? '');
  return {
    links,
    assigned,
    opened,
    listeners: Object.keys(handlers),
    fire(type, target, init = {}) {
      let prevented = init.defaultPrevented ?? false;
      const event = {
        target, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...init,
        get defaultPrevented() { return prevented; },
        preventDefault() { prevented = true; },
      };
      for (const fn of handlers[type] ?? []) fn(event);
      return prevented && !(init.defaultPrevented ?? false);
    },
    href: (locale) => links.find((l) => l.attrs['data-lang-switch'] === locale)?.getAttribute('href') ?? null,
  };
}

describe('langSwitch: links rebuilt from the live address', () => {
  it('moves the path between editions', () => {
    const p = page('/hi/learn/');
    assert.equal(p.href('en'), '/learn/');
    assert.equal(p.href('hi'), '/hi/learn/');
    assert.equal(p.href('es'), '/es/learn/');
    assert.equal(p.href('cs'), '/cs/learn/');
    assert.equal(p.href('mr'), '/mr/learn/');
  });

  it('handles an edition’s home page, with and without the last slash', () => {
    assert.equal(page('/es/').href('en'), '/');
    assert.equal(page('/es').href('hi'), '/hi/');
    assert.equal(page('/').href('cs'), '/cs/');
  });

  it('does not take a two-letter page segment or a longer word for a locale', () => {
    assert.equal(page('/xx/page/').href('hi'), '/hi/xx/page/');
    assert.equal(page('/history/').href('hi'), '/hi/history/');
  });

  it('keeps utm_* and a plain anchor, and drops every other parameter', () => {
    const p = page('/free/loan-comparison/?utm_source=share&c=INR&q=typed&utm_medium=link#faq');
    assert.equal(p.href('hi'), '/hi/free/loan-comparison/?utm_source=share&utm_medium=link#faq');
  });

  it('rewrites both copies of each link', () => {
    const p = page('/learn/');
    assert.equal(p.links.length, LOCALES.length * 2);
    for (const link of p.links) assert.doesNotMatch(link.attrs.href, /as-rendered/);
  });

  it('leaves a link to a locale it does not know as it was rendered', () => {
    const p = page('/learn/', { targets: ['hi', 'zz'] });
    assert.equal(p.href('hi'), '/hi/learn/');
    assert.equal(p.href('zz'), '/as-rendered/');
  });
});

describe('langSwitch: tool state is carried at click time, never in an href', () => {
  const tool = (address = '/free/loan-comparison/?utm_source=share') => page(address, { toolStateGlobal: GLOBAL, state: STATE });

  it('no href holds the state, before or after a click', () => {
    const p = tool();
    const hi = p.links.find((l) => l.attrs['data-lang-switch'] === 'hi')!;
    for (const link of p.links) assert.doesNotMatch(link.attrs.href, /SECRETBANK|INR|#/);
    p.fire('click', hi);
    p.fire('click', hi, { metaKey: true });
    for (const link of p.links) assert.doesNotMatch(link.attrs.href, /SECRETBANK|INR|#/);
  });

  it('a plain click goes to the other edition with the state after the #', () => {
    const p = tool();
    const prevented = p.fire('click', p.links.find((l) => l.attrs['data-lang-switch'] === 'hi'));
    assert.equal(prevented, true);
    assert.deepEqual(p.assigned, [`/hi/free/loan-comparison/?utm_source=share#${STATE}`]);
    assert.deepEqual(p.opened, []);
  });

  it('the state replaces a plain anchor instead of joining it', () => {
    const p = tool('/free/loan-comparison/#faq');
    p.fire('click', p.links.find((l) => l.attrs['data-lang-switch'] === 'es'));
    assert.deepEqual(p.assigned, [`/es/free/loan-comparison/#${STATE}`]);
  });

  it('Cmd, Ctrl and Shift clicks open a new tab with the state', () => {
    for (const key of ['metaKey', 'ctrlKey', 'shiftKey'] as const) {
      const p = tool();
      p.fire('click', p.links[1], { [key]: true });
      assert.deepEqual(p.opened, [`/hi/free/loan-comparison/?utm_source=share#${STATE}`], key);
      assert.deepEqual(p.assigned, []);
    }
  });

  it('a middle click opens a new tab once', () => {
    const p = tool();
    assert.deepEqual(p.listeners.sort(), ['auxclick', 'click']);
    p.fire('auxclick', p.links[1], { button: 1 });
    assert.deepEqual(p.opened, [`/hi/free/loan-comparison/?utm_source=share#${STATE}`]);
    // A right click fires auxclick too, and carries nothing.
    p.fire('auxclick', p.links[1], { button: 2 });
    assert.equal(p.opened.length, 1);
  });

  it('an Alt click, a handled click and a right click keep the clean link', () => {
    for (const init of [{ altKey: true }, { defaultPrevented: true }, { button: 2 }]) {
      const p = tool();
      assert.equal(p.fire('click', p.links[1], init), false);
      assert.deepEqual([p.assigned, p.opened], [[], []]);
    }
  });

  it('a click elsewhere on the page does nothing', () => {
    const p = tool();
    assert.equal(p.fire('click', new Element({ href: '/learn/' })), false);
    assert.equal(p.fire('click', { nodeType: 3 }), false);
    assert.deepEqual([p.assigned, p.opened], [[], []]);
  });

  it('reads the state at click time, so it carries what is on screen now', () => {
    const p = page('/free/loan-comparison/', { toolStateGlobal: GLOBAL, state: '' });
    assert.equal(p.fire('click', p.links[1]), false, 'nothing to carry yet');
    const later = page('/free/loan-comparison/', { toolStateGlobal: GLOBAL, state: 'c=EUR' });
    later.fire('click', later.links[1]);
    assert.deepEqual(later.assigned, ['/hi/free/loan-comparison/#c=EUR']);
  });

  it('a page that is not a tool carries nothing and listens for nothing', () => {
    const p = page('/learn/');
    assert.deepEqual(p.listeners, []);
  });
});

describe('Header.astro', () => {
  it('inlines the tested script and passes it the locale prefixes and the tool’s property', () => {
    assert.match(HEADER, /import langSwitchScript from '\.\.\/utils\/shared\/langSwitch\.js\?raw';/);
    assert.match(HEADER, /<script is:inline set:html=\{langSwitchScript\}><\/script>/);
    assert.match(HEADER, /window\.nidhiLangSwitch\(prefixes, toolStateGlobal\);/);
    assert.match(HEADER, /for \(const l of LOCALES\) prefixes\[l\] = localePrefix\(l\);/);
  });

  it('renders no link whose href is built from tool state', () => {
    assert.doesNotMatch(HEADER, /href=\{[^}]*toolStateGlobal/);
    assert.doesNotMatch(HEADER, /href=\{[^}]*window\[/);
  });
});
