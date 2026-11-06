/**
 * Unit tests for src/utils/waitlistCount.ts. The request itself is not run
 * here; what the page shows for any answer is.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { plural } from '../i18n/plural.ts';
import { cs } from '../i18n/strings/cs.ts';
import { shownNewsletterCount } from './newsletterCount.ts';
import { parseCountAnswer, shownWaitlistCount } from './waitlistCount.ts';

describe('shown waitlist count', () => {
  it('shows nothing when the count is unknown or zero', () => {
    assert.equal(shownWaitlistCount(null), null);
    assert.equal(shownWaitlistCount(0), null);
  });

  it('shows the exact number from 1 to 19', () => {
    for (const n of [1, 2, 12, 19]) assert.deepEqual(shownWaitlistCount(n), { n, atLeast: false }, String(n));
  });

  it('rounds 20 to 49 down to a multiple of 5, as "n+"', () => {
    assert.deepEqual(shownWaitlistCount(20), { n: 20, atLeast: true });
    assert.deepEqual(shownWaitlistCount(24), { n: 20, atLeast: true });
    assert.deepEqual(shownWaitlistCount(25), { n: 25, atLeast: true });
    assert.deepEqual(shownWaitlistCount(49), { n: 45, atLeast: true });
  });

  it('rounds 50 and up down to a multiple of 10, as "n+", never up', () => {
    assert.deepEqual(shownWaitlistCount(50), { n: 50, atLeast: true });
    assert.deepEqual(shownWaitlistCount(59), { n: 50, atLeast: true });
    assert.deepEqual(shownWaitlistCount(60), { n: 60, atLeast: true });
    assert.deepEqual(shownWaitlistCount(137), { n: 130, atLeast: true });
  });
});

describe('the newsletter keeps its own rule', () => {
  it('shows nothing under 20 and rounds down to a multiple of 20', () => {
    assert.equal(shownNewsletterCount(19), null);
    assert.equal(shownNewsletterCount(39), 20);
    assert.equal(shownNewsletterCount(137), 120);
  });
});

describe("the script's answer", () => {
  it('accepts a whole, non-negative count', () => {
    assert.equal(parseCountAnswer({ ok: true, count: 137 }), 137);
    assert.equal(parseCountAnswer({ ok: true, count: 0 }), 0);
  });

  it('treats anything else as unknown', () => {
    for (const body of [null, 'x', {}, { ok: false, error: 'forbidden' }, { ok: true }, { ok: true, count: '137' }, { ok: true, count: 1.5 }, { ok: true, count: -1 }]) {
      assert.equal(parseCountAnswer(body), null, JSON.stringify(body));
    }
  });
});

describe('the exact-count wording', () => {
  const pick = (n: number) => plural('cs', n, cs.waitlist.waitingOne, cs.waitlist.waitingFew, cs.waitlist.waitingMany);

  it('picks the Czech form for 1, 2 to 4 and 5 to 19', () => {
    assert.match(pick(1), /člověk/);
    for (const n of [2, 3, 4]) assert.match(pick(n), /lidé/, String(n));
    for (const n of [5, 12, 19]) assert.match(pick(n), /lidí/, String(n));
  });
});
