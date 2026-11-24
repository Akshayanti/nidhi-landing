/**
 * The edges of a touch on a chart (src/utils/shared/chartTouch.ts): where a
 * tap ends and a drag begins, and which way a diagonal drag goes.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TAP_SLOP, touchMove, touchStart } from './chartTouch.ts';

describe('a touch on a chart, at its edges', () => {
  it('a finger that has moved the whole slop is no longer a tap', () => {
    const moved = touchMove(touchStart(1, 100, 100), 1, 100 + TAP_SLOP, 100, true);
    assert.equal(moved.touch?.mode, 'scrub');
    assert.equal(moved.follow, true);
  });

  it('a drag exactly on the diagonal is left to the page, not taken for the chart', () => {
    const moved = touchMove(touchStart(1, 100, 100), 1, 100 + TAP_SLOP, 100 + TAP_SLOP, true);
    assert.equal(moved.touch?.mode, 'ignore');
    assert.equal(moved.follow, false);
  });
});
