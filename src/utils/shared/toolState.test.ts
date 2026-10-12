/**
 * Tests for the language switch's view of a free tool's state.
 *
 * Run with:  npm test
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { TOOL_DEFAULT_CURRENCY, arrivedByLanguageSwitch, publishToolState } from './toolState.ts';
import { LOCALES } from '../../i18n/config.ts';
import { CURRENCIES } from '../loan/math.ts';

const g = globalThis as unknown as Record<string, unknown>;

function visit(href: string, referrer: string) {
  const url = new URL(href);
  g.window = { location: { origin: url.origin, pathname: url.pathname } };
  g.document = { referrer };
}

afterEach(() => {
  delete g.window;
  delete g.document;
});

describe('arrivedByLanguageSwitch', () => {
  it('is true for the same page under another locale, either way round', () => {
    visit('https://nidhi.today/free/loan-comparison/', 'https://nidhi.today/hi/free/loan-comparison/?utm_source=share');
    assert.equal(arrivedByLanguageSwitch(), true);
    visit('https://nidhi.today/hi/free/loan-comparison/', 'https://nidhi.today/free/loan-comparison/');
    assert.equal(arrivedByLanguageSwitch(), true);
  });

  it('is false for a reload, another page, another site, or no referrer', () => {
    visit('https://nidhi.today/hi/free/loan-comparison/', 'https://nidhi.today/hi/free/loan-comparison/');
    assert.equal(arrivedByLanguageSwitch(), false);
    visit('https://nidhi.today/hi/free/loan-comparison/', 'https://nidhi.today/free/');
    assert.equal(arrivedByLanguageSwitch(), false);
    visit('https://nidhi.today/hi/free/loan-comparison/', 'https://example.com/free/loan-comparison/');
    assert.equal(arrivedByLanguageSwitch(), false);
    visit('https://nidhi.today/hi/free/loan-comparison/', '');
    assert.equal(arrivedByLanguageSwitch(), false);
  });
});

describe('publishToolState', () => {
  it('writes the encoded state to the named window property, and nothing else', () => {
    visit('https://nidhi.today/free/loan-comparison/', '');
    publishToolState('__test', 'c=INR');
    assert.equal((g.window as Record<string, unknown>).__test, 'c=INR');
  });
});

describe('TOOL_DEFAULT_CURRENCY', () => {
  it('opens the tools in rupees on Hindi pages and in euros on English and Spanish ones', () => {
    assert.deepEqual(TOOL_DEFAULT_CURRENCY, { en: 'EUR', hi: 'INR', es: 'EUR' });
  });

  it('names a currency the tools offer, for every locale the site serves', () => {
    for (const locale of LOCALES) {
      assert.ok(CURRENCIES.some((c) => c.code === TOOL_DEFAULT_CURRENCY[locale]), locale);
    }
  });
});
