/**
 * Tests for the language switch's view of a free tool's state.
 *
 * Run with:  npm test
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { arrivedByLanguageSwitch, publishToolState } from './toolState.ts';

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
