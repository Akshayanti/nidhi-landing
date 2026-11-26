/**
 * The sums behind chart text (#676): how wide a label is taken to be before
 * it is measured, the round steps of an axis, which labels of a row are
 * drawn and how each is anchored, and where an axis title breaks.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FIT_FLOOR, edgeAnchor, labelStep, niceSteps, placeLabels, textWidth, wrapWords } from './useChartRem.ts';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

describe('the smallest a chart word is drawn', () => {
  it('takes chart text of 0.875 rem down to 0.75 rem and no further', () => {
    near(FIT_FLOOR * 0.875, 0.75);
  });
});

describe('the room a label is given before it is measured', () => {
  it('is 0.6 of the text size for every character', () => {
    near(textWidth('2040', 10), 24);
    near(textWidth('1,250', 14), 42);
    assert.equal(textWidth('', 14), 0);
  });

  it('counts a character outside the basic plane once', () => {
    near(textWidth('\u{1F600}5', 10), 12);
  });
});

describe('the round steps of an axis', () => {
  it('covers the value in steps of 1, 2, 2.5 or 5 times a power of ten', () => {
    assert.deepEqual(niceSteps(100, 5), { top: 100, step: 20, count: 5 });
    assert.deepEqual(niceSteps(7, 5), { top: 8, step: 2, count: 4 });
    assert.deepEqual(niceSteps(12, 5), { top: 12.5, step: 2.5, count: 5 });
    assert.deepEqual(niceSteps(45, 10), { top: 45, step: 5, count: 9 });
    assert.deepEqual(niceSteps(95, 10), { top: 100, step: 10, count: 10 });
    assert.deepEqual(niceSteps(3, 4), { top: 3, step: 1, count: 3 });
  });

  it('works below one and in the thousands', () => {
    const small = niceSteps(0.07, 5);
    near(small.step, 0.02);
    near(small.top, 0.08);
    assert.equal(small.count, 4);
    assert.deepEqual(niceSteps(1_200_000, 4), { top: 1_500_000, step: 500_000, count: 3 });
  });

  it('never takes more steps than it is allowed', () => {
    for (const v of [1, 3, 7, 12, 99, 101, 2500, 77_777]) {
      for (const max of [1, 2, 3, 4, 5, 8]) {
        const { top, step, count } = niceSteps(v, max);
        assert.ok(count <= max, `${v} in ${max}: ${count} steps`);
        assert.ok(top >= v, `${v} in ${max}: top ${top}`);
        near(top, step * count);
      }
    }
  });

  it('takes a part of a step allowed as no step', () => {
    assert.deepEqual(niceSteps(100, 4.7), { top: 100, step: 25, count: 4 });
  });

  it('allows one step when asked for none', () => {
    assert.deepEqual(niceSteps(100, 0), { top: 100, step: 100, count: 1 });
    assert.deepEqual(niceSteps(40, -3), { top: 50, step: 50, count: 1 });
  });

  it('draws a plain axis of ones when there is nothing to cover', () => {
    assert.deepEqual(niceSteps(0, 4), { top: 4, step: 1, count: 4 });
    assert.deepEqual(niceSteps(-20, 3.9), { top: 3, step: 1, count: 3 });
    assert.deepEqual(niceSteps(Number.NaN, 0), { top: 1, step: 1, count: 1 });
  });
});

describe('the step between the labels of an axis of whole numbers', () => {
  const spacing = (step: number) => step * 10;

  it('is the smallest step whose labels keep the gap', () => {
    assert.equal(labelStep([1, 2, 5, 10], spacing, 30, 8), 5);
  });

  it('takes a step whose labels keep exactly the gap', () => {
    assert.equal(labelStep([1, 2, 5, 10], spacing, 12, 8), 2);
  });

  it('is the largest step when none of them leaves the gap', () => {
    assert.equal(labelStep([1, 2, 5, 10], spacing, 200, 8), 10);
  });
});

describe('an axis title broken into lines', () => {
  const chars = (line: string) => line.length;

  it('keeps words on one line while they fit, the full width included', () => {
    assert.deepEqual(wrapWords('Years from today', 16, chars), ['Years from today']);
    assert.deepEqual(wrapWords('Years from today', 15, chars), ['Years from', 'today']);
    assert.deepEqual(wrapWords('Years from today', 9, chars), ['Years', 'from', 'today']);
  });

  it('gives a word wider than the line a line of its own', () => {
    assert.deepEqual(wrapWords('a Vermögensentwicklung b c', 5, chars), ['a', 'Vermögensentwicklung', 'b c']);
  });

  it('starts with the first word, whatever the room', () => {
    assert.deepEqual(wrapWords('Worth', 1000, chars), ['Worth']);
  });

  it('ignores spaces around and between the words', () => {
    assert.deepEqual(wrapWords('  Years \n from\ttoday  ', 100, chars), ['Years from today']);
    assert.deepEqual(wrapWords('   ', 100, chars), []);
  });

  it('measures the line as it would be drawn', () => {
    const asked: string[] = [];
    wrapWords('one two three', 7, (line) => { asked.push(line); return line.length; });
    assert.deepEqual(asked, ['one two', 'one two three']);
  });
});

describe('a label anchored so it is not cut at an edge', () => {
  it('is centred when it fits, touching the edge included', () => {
    assert.equal(edgeAnchor(50, 20, 0, 100), 'middle');
    assert.equal(edgeAnchor(10, 20, 0, 100), 'middle');
    assert.equal(edgeAnchor(90, 20, 0, 100), 'middle');
  });

  it('starts at its point when centred it would cross the left edge', () => {
    assert.equal(edgeAnchor(9, 20, 0, 100), 'start');
    assert.equal(edgeAnchor(35, 20, 30, 100), 'start');
  });

  it('ends at its point when centred it would cross the right edge', () => {
    assert.equal(edgeAnchor(91, 20, 0, 100), 'end');
  });
});

describe('the labels of a row that are drawn', () => {
  const kept = (xs: number[], widths: number[], gap = 8, min = 0, max = 100) =>
    placeLabels(xs, widths, min, max, gap).map(({ i, anchor }) => `${i}:${anchor}`);

  it('draws every label centred when they are well apart', () => {
    assert.deepEqual(kept([20, 50, 80], [20, 20, 20]), ['0:middle', '1:middle', '2:middle']);
    assert.deepEqual(kept([], []), []);
  });

  it('anchors the first and last label inside the drawing', () => {
    assert.deepEqual(kept([0, 50, 100], [30, 20, 30]), ['0:start', '1:middle', '2:end']);
  });

  it('keeps a label that leaves exactly the gap, and drops one that comes closer', () => {
    // The first label covers 40 to 60.
    assert.deepEqual(kept([50, 78], [20, 20]).length, 2);
    assert.deepEqual(kept([50, 77, 30], [20, 20, 2]), ['0:middle']);
  });

  it('measures a label at the left edge from its point', () => {
    // Anchored at its start, the first label covers 10 to 50; the second starts at 49 or at 58.
    assert.deepEqual(kept([10, 69, 100], [40, 40, 1], 8, 0, 200), ['0:start', '2:middle']);
    assert.deepEqual(kept([10, 78], [40, 40], 8, 0, 200), ['0:start', '1:middle']);
  });

  it('measures a label left of the drawing from the edge', () => {
    // The first label covers 0 to 10.
    assert.deepEqual(kept([-5, 19, 60], [10, 10, 2]), ['0:start', '2:middle']);
    assert.deepEqual(kept([-5, 23], [10, 10]), ['0:start', '1:middle']);
  });

  it('measures a label at the right edge back from its point', () => {
    // Anchored at its end, the last label covers 75 to 95.
    assert.deepEqual(kept([57, 95], [20, 20]), ['0:middle', '1:end']);
    assert.deepEqual(kept([58, 95, 97], [20, 20, 1]), ['0:middle', '2:middle']);
  });

  it('leaves out a label that cannot be drawn inside', () => {
    assert.deepEqual(kept([50], [120]), []);
    assert.deepEqual(kept([20, 100.5], [20, 20]), ['0:middle', '1:end']);
    assert.deepEqual(kept([20, 100.75], [20, 20]), ['0:middle']);
  });

  it('prefers the last label to the one before it', () => {
    assert.deepEqual(kept([10, 70, 95], [20, 20, 20]), ['0:middle', '2:end']);
  });

  it('drops a label in the middle of the row that is too close', () => {
    assert.deepEqual(kept([10, 40, 55, 90], [20, 20, 20, 20]), ['0:middle', '1:middle', '3:middle']);
  });

  it('keeps the only label drawn when the last one is too close to it', () => {
    assert.deepEqual(kept([50, 60], [20, 20]), ['0:middle']);
  });

  it('drops the last label when it would still touch the label two before it', () => {
    assert.deepEqual(kept([10, 38, 50], [20, 20, 60]), ['0:middle', '1:middle']);
  });
});
