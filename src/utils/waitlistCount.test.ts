/**
 * Unit tests for src/utils/waitlistCount.ts. The request itself is not run
 * here; what the page shows for any answer is.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseCountAnswer, shownWaitlistCount } from './waitlistCount.ts';

describe('shown waitlist count', () => {
  it('shows nothing when the count is unknown or under the threshold', () => {
    assert.equal(shownWaitlistCount(null), null);
    assert.equal(shownWaitlistCount(0), null);
    assert.equal(shownWaitlistCount(49), null);
  });

  it('rounds down to a multiple of 50, never up', () => {
    assert.equal(shownWaitlistCount(50), 50);
    assert.equal(shownWaitlistCount(99), 50);
    assert.equal(shownWaitlistCount(100), 100);
    assert.equal(shownWaitlistCount(149), 100);
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
