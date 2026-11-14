import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TAP_SLOP, touchEndIsTap, touchMove, touchStart, touchDown } from './chartTouch.ts';

describe('a finger on a chart', () => {
  it('is a tap when it lifts without moving', () => {
    const t = touchStart(1, 100, 100);
    const moved = touchMove(t, 1, 100 + TAP_SLOP - 1, 100, true);
    assert.equal(moved.follow, false);
    assert.equal(touchEndIsTap(moved.touch, 1), true);
  });

  it('is a scroll, not a tap, when it moves up or down first', () => {
    const moved = touchMove(touchStart(1, 100, 100), 1, 103, 140, true);
    assert.equal(moved.follow, false);
    assert.equal(touchEndIsTap(moved.touch, 1), false);
    // Sideways movement later in the same touch does not start a scrub.
    assert.equal(touchMove(moved.touch, 1, 200, 140, true).follow, false);
  });

  it('scrubs when it moves sideways first, and keeps scrubbing', () => {
    const moved = touchMove(touchStart(1, 100, 100), 1, 130, 104, true);
    assert.equal(moved.follow, true);
    assert.equal(touchMove(moved.touch, 1, 140, 180, true).follow, true);
    assert.equal(touchEndIsTap(moved.touch, 1), false);
  });

  it('does not scrub a chart that scrolls sideways itself', () => {
    const moved = touchMove(touchStart(1, 100, 100), 1, 130, 104, false);
    assert.equal(moved.follow, false);
    assert.equal(touchEndIsTap(moved.touch, 1), false);
  });

  it('ignores another finger', () => {
    const t = touchStart(1, 100, 100);
    assert.equal(touchMove(t, 2, 200, 100, true).follow, false);
    assert.equal(touchEndIsTap(t, 2), false);
    assert.equal(touchEndIsTap(null, 1), false);
  });

  it('reads a second finger as a pinch: nothing opens or scrubs, whichever finger moves', () => {
    const first = touchStart(1, 100, 100);
    const pinch = touchDown(first, 2, 160, 100);
    assert.equal(pinch.id, 1);
    assert.equal(pinch.mode, 'ignore');
    assert.equal(touchMove(pinch, 2, 220, 100, true).follow, false);
    assert.equal(touchMove(pinch, 1, 40, 100, true).follow, false);
    assert.equal(touchEndIsTap(pinch, 2), false);
    assert.equal(touchEndIsTap(pinch, 1), false);
    // A lone finger, or the same one again, starts fresh.
    assert.equal(touchDown(null, 3, 5, 5).mode, 'pending');
  });
});
