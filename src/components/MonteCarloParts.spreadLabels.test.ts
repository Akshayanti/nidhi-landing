/**
 * Where the Monte Carlo chart's end-of-line labels go (#790): `spreadLabels`
 * moves labels that would sit on top of each other apart, keeps them inside
 * the plot and in the order of the lines they name.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spreadLabels } from './MonteCarloSimulator.tsx';

describe('the end-of-line labels, spread apart', () => {
  it('leaves labels that are already apart and inside the plot where they are', () => {
    assert.deepEqual(spreadLabels([40, 120, 200], 14, 10, 300), [40, 120, 200]);
    assert.deepEqual(spreadLabels([], 14, 10, 300), []);
  });

  it('moves a label down by just enough to clear the one above, whatever order they come in', () => {
    // The three lines end at 100, 50 and 52: the last two would overlap.
    assert.deepEqual(spreadLabels([100, 50, 52], 10, 0, 200), [100, 50, 60]);
    // A move can push the next label on in turn.
    assert.deepEqual(spreadLabels([50, 55, 61], 10, 0, 200), [50, 60, 70]);
    // Labels exactly a gap apart do not move.
    assert.deepEqual(spreadLabels([50, 60], 10, 0, 200), [50, 60]);
  });

  it('keeps a label from rising above the top of the plot', () => {
    assert.deepEqual(spreadLabels([-5, 0], 10, 4, 200), [4, 14]);
    assert.deepEqual(spreadLabels([2], 10, 4, 200), [4]);
  });

  it('pushes a stack that ran past the bottom back up, each label only as far as the one below needs', () => {
    // 190 and 195 both end near the bottom; the label at 100 has room and stays.
    assert.deepEqual(spreadLabels([190, 195, 100], 10, 0, 192), [182, 192, 100]);
    // Three at the bottom: the stack is a gap apart, ending at the bottom.
    assert.deepEqual(spreadLabels([199, 198, 197], 10, 0, 192), [192, 182, 172]);
    assert.deepEqual(spreadLabels([250], 10, 0, 192), [192]);
  });

  it('gives back as many places as it was given positions, even when none could be placed', () => {
    // A list whose own `map` hands back nothing: no label is placed, and the
    // answer still has the list's length, every place left empty.
    const ys = Object.assign([1, 2], { map: () => [] }) as number[];
    const out = spreadLabels(ys, 10, 0, 200);
    assert.equal(out.length, 2);
    assert.ok(!(0 in out) && !(1 in out));
  });

  it('does not change the positions it was given', () => {
    const ys = [100, 50, 52];
    spreadLabels(ys, 10, 0, 200);
    assert.deepEqual(ys, [100, 50, 52]);
  });
});
