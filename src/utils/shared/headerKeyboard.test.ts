/**
 * The header's menus and theme switch say to assistive technology only what
 * they do (issue 392).
 *
 * A role is a promise of keys: "menu" and "menuitem" promise arrow keys
 * between the items, "radio" promises arrow keys within the group and one
 * tab stop. The header's dropdowns are lists of links opened by a button,
 * and the theme switch is three buttons, so neither claims those roles; and
 * the link the keyboard is on is shown by a bar, since its colours differ
 * too little from the other rows to show it.
 *
 * Read from the source: the pages are static, so what is written here is
 * what every page gets. The keys themselves are checked in a browser.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (name: string) => readFileSync(join(import.meta.dirname, '../../components', name), 'utf8');
const HEADER = read('Header.astro');
const THEME = read('ThemeToggle.astro');
/** A component's markup and script, without its comments. */
const code = (source: string) => source.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('header dropdowns', () => {
  const header = code(HEADER);

  it('claim no menu roles and no popup', () => {
    assert.doesNotMatch(header, /role="menu(item)?"/);
    assert.doesNotMatch(header, /aria-haspopup/);
    assert.match(header, /class:list=\{\['nav-link', 'nav-dropdownToggle'[\s\S]{0,120}aria-expanded="false"/);
  });

  it('mark the page you are on', () => {
    assert.match(header, /aria-current=\{isMenuActive\(entry\) \? 'page' : undefined\}/);
  });

  it('show which link the keyboard is on with a bar', () => {
    assert.match(header, /\.nav-dropdownMenu a:focus-visible \{\s*box-shadow: inset 3px 0 0 var\(--color-teal\);\s*\}/);
  });

  it('let Tab move on by itself, and close once the focus has left', () => {
    const script = header.slice(header.indexOf("document.querySelectorAll('.nav-dropdown')"));
    const dropdowns = script.slice(0, script.indexOf("querySelector('.lang-picker--header')"));
    assert.doesNotMatch(dropdowns, /e\.key !== 'Tab'|e\.key === 'Tab'/, 'Tab is not intercepted');
    assert.match(dropdowns, /dropdown\.addEventListener\('focusout', function\(e\) \{\s*if \(isOpen\(\) && e\.relatedTarget && !dropdown\.contains\(e\.relatedTarget\)\) closeMenu\(\);/);
    assert.match(dropdowns, /if \(e\.key === 'Escape'\) \{ closeMenu\(\); toggle\.focus\(\); \}/);
  });
});

describe('theme switch', () => {
  const theme = code(THEME);

  it('is a group of three buttons, one pressed, not radio buttons', () => {
    assert.doesNotMatch(theme, /role="radio(group)?"/);
    assert.doesNotMatch(theme, /aria-checked/);
    assert.match(theme, /id="theme-toggle" role="group" aria-label=\{strings\.theme\.groupLabel\}/);
    assert.equal((theme.match(/<button class="theme-btn"[^>]*aria-pressed="false"/g) ?? []).length, 3);
  });

  it('the script keeps the pressed state with the choice', () => {
    assert.match(theme, /btn\.setAttribute\('aria-pressed', btn\.getAttribute\('data-mode'\) === mode \? 'true' : 'false'\);/);
  });
});
