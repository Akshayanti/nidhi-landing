import '../utils/testing/astroContentStub.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, dict } from '../i18n';

const { DESKTOP_DROPDOWNS, navGroups, navHref, navLabel } = await import('./nav.ts');
type Entry = ReturnType<typeof navGroups>[number]['entries'][number];

const all = navGroups({ showMonteCarlo: true, showInvestOrPayOff: true });
const links = (groups: ReturnType<typeof navGroups>) =>
  groups.flatMap((g) => g.entries.flatMap((e: Entry) => ('children' in e ? e.children : [e])));

describe('the header\'s destinations', () => {
  it('the sheet shows Learn, Tools, About; the desktop shows the two dropdowns it has buttons for', () => {
    assert.deepEqual(all.map((g) => g.key), ['learn', 'tools', 'about']);
    assert.deepEqual([...DESKTOP_DROPDOWNS], ['tools', 'learn']);
    for (const key of DESKTOP_DROPDOWNS) assert.ok(all.find((g) => g.key === key)?.button, key);
  });

  it('a tool that has not launched has no link, and nothing else moves', () => {
    const none = links(navGroups({ showMonteCarlo: false, showInvestOrPayOff: false })).map((l) => l.key);
    assert.ok(!none.includes('monteCarloSimulator') && !none.includes('investOrPayOff'));
    const full = links(all).map((l) => l.key);
    assert.deepEqual(full.filter((k) => k !== 'monteCarloSimulator' && k !== 'investOrPayOff'), none);
    assert.ok(links(navGroups({ showMonteCarlo: true, showInvestOrPayOff: false })).some((l) => l.key === 'monteCarloSimulator'));
    assert.ok(links(navGroups({ showMonteCarlo: false, showInvestOrPayOff: true })).some((l) => l.key === 'investOrPayOff'));
  });

  // These are the click labels analytics tells links apart by, and the privacy
  // changelog refers to them: renaming one is a privacy change.
  it('the click labels are the ones the privacy notice knows', () => {
    assert.deepEqual(all.map((g) => g.button?.attr), ['nav-learn', 'nav-free-tools', undefined]);
    assert.deepEqual(links(all).map((l) => l.attr), [
      'blog', 'blog-topics', 'blog-glossary', 'learn-editorial',
      'tool-multi-currency-net-worth', 'tool-loan-comparison', 'tool-monte-carlo-simulator',
      'tool-inflation-calculator', 'tool-invest-or-pay-off', 'tool-all',
      'about', 'beliefs', 'editorial-policy', 'email', 'instagram',
    ]);
    assert.equal(new Set(links(all).map((l) => l.attr)).size, links(all).length);
  });

  it('site links are locale-free paths with a trailing slash; only Instagram opens a new tab', () => {
    for (const l of links(all)) {
      if (/^[a-z]+:/.test(l.href)) continue;
      assert.match(l.href, /^\/([a-z0-9-]+\/)*$/, l.key);
      assert.ok(!LOCALES.some((loc) => l.href.startsWith(`/${loc}/`)), l.key);
    }
    assert.deepEqual(links(all).filter((l) => l.external).map((l) => l.key), ['instagram']);
  });

  it('every entry has a label in every language, and the dropdown may word it its own way', () => {
    for (const locale of LOCALES) {
      const strings = dict(locale);
      for (const l of links(all)) {
        assert.ok(navLabel(strings, l.key).trim(), `${locale} ${l.key}`);
        assert.ok(navLabel(strings, l.key, 'menu').trim(), `${locale} ${l.key}`);
      }
    }
    const en = dict('en');
    assert.equal(navLabel(en, 'allTools', 'menu'), en.nav.menu.allTools);
    assert.equal(navLabel(en, 'allTools'), en.nav.items.allTools);
    assert.equal(navLabel(en, 'about', 'menu'), en.nav.items.about);
  });
});

describe('navHref', () => {
  it('localizes a site path in every language', () => {
    assert.equal(navHref('en', '/free/'), '/free/');
    for (const locale of LOCALES.filter((l) => l !== 'en')) {
      assert.equal(navHref(locale, '/free/loan-comparison/'), `/${locale}/free/loan-comparison/`);
    }
  });

  it('leaves an address that leaves the site as it is', () => {
    for (const locale of LOCALES) {
      assert.equal(navHref(locale, 'mailto:hello@nidhi.today'), 'mailto:hello@nidhi.today');
      assert.equal(navHref(locale, 'https://www.instagram.com/nidhi.today'), 'https://www.instagram.com/nidhi.today');
    }
  });
});
