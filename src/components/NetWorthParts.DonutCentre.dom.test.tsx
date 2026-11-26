/**
 * The words in the net worth donut's hole (`DonutCentre`, #790): stacked
 * about the centre, the main figure at 1 rem and the others at 0.875 rem of
 * the reader's text size, and a line that would not fit inside the hole left
 * out, the highest `drop` first, until what remains fits.
 *
 * Every position is worked out here by hand: a line takes 1.2 times its
 * size, its box starts a tenth of its size into that, and its baseline is
 * 0.8 of its size below the box's top.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useRef } from 'react';
import { all, atTextSize, drawSettled, textDrawnAs } from '../../test/netWorthParts.charts.tsx';
import { DonutCentre } from './MultiCurrencyNetWorth.tsx';

interface Line { cls: string; text: string; main?: boolean; drop: number }

function Hole({ r, lines }: { r: number; lines: Line[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  return (
    <svg ref={svgRef} viewBox="0 0 260 260">
      <DonutCentre svgRef={svgRef} width={260} cx={120} cy={120} r={r} lines={lines} />
    </svg>
  );
}

const hole = (r: number, lines: Line[]) => drawSettled(<Hole r={r} lines={lines} />);
/** The lines drawn (not the unseen copies measured): class, words, size, x and baseline. */
const shown = () => all('svg > text').map((t) => [
  t.getAttribute('class'), t.textContent, (t as SVGElement).style.fontSize, t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('text-anchor'),
]);

const MAIN: Line = { cls: 'main', text: '75.0%', main: true, drop: 1 };
const SUB: Line = { cls: 'sub', text: 'EUR', drop: 2 };
const AMOUNT: Line = { cls: 'amount', text: '€300', drop: 3 };

describe('the words in the donut’s hole', () => {
  it('stacks the lines about the centre, the main one at 1 rem and the others at 0.875 rem', async () => {
    // At 16 px: 16 and 14 units, lines of 19.2 and 16.8, 36 in all, from 102.
    // The first box starts at 103.6 (baseline 116.4), the second at 122.6 (baseline 133.8).
    await hole(60, [MAIN, SUB]);
    assert.deepEqual(shown(), [
      ['main', '75.0%', '16px', '120', '116.4', 'middle'],
      ['sub', 'EUR', '14px', '120', '133.8', 'middle'],
    ]);
  });

  it('grows with the reader’s text size', async () => {
    // At 32 px text on a drawing shown at its own width: 32 and 28 units,
    // lines of 38.4 and 33.6, 72 in all, from 84. Boxes at 87.2 and 125.2;
    // baselines at 112.8 and 147.6.
    atTextSize(32, 260);
    await hole(60, [MAIN, SUB]);
    assert.deepEqual(shown().map((l) => [l[2], l[4]]), [['32px', '112.8'], ['28px', '147.6']]);
  });

  it('is sized against the drawing as shown, not its own units', () => {
    // At 16 px, a drawing shown 520 px wide: half a unit to the pixel, so 1 rem is 8 units.
    // One line of 8: from 115.2, box at 116, baseline 122.4.
    atTextSize(16, 520);
    return hole(60, [MAIN]).then(() => {
      assert.deepEqual(shown().map((l) => [l[2], l[4]]), [['8px', '122.4']]);
    });
  });

  it('leaves out a line too wide for the hole, the highest drop first', async () => {
    // Three lines (14, 16, 14 units) from 93.6: the last box is 131 to 145,
    // 25 below the centre, where a hole of 60 is 54.5 either side.
    textDrawnAs((words, size) => (words === '€300' ? 110 : words.length * size * 0.6));
    const { unmount } = await hole(60, [SUB, MAIN, AMOUNT]);
    assert.deepEqual(shown().map((l) => l[1]), ['EUR', '75.0%']);
    unmount();
    // 109 across fits.
    textDrawnAs((words, size) => (words === '€300' ? 109 : words.length * size * 0.6));
    await hole(60, [SUB, MAIN, AMOUNT]);
    assert.deepEqual(shown().map((l) => [l[1], l[4]]), [['EUR', '106.2'], ['75.0%', '124.8'], ['€300', '142.2']]);
  });

  it('when the main line is the one too wide, leaves out the others first, then it', async () => {
    textDrawnAs((words, size) => (words === '75.0%' ? 200 : words.length * size * 0.6));
    await hole(60, [MAIN, SUB, AMOUNT]);
    assert.deepEqual(shown(), []);
  });

  it('leaves out the line of the highest drop, wherever it is in the list', async () => {
    // The sub line is too wide; the amount (drop 3) goes first, then the sub line (drop 2).
    textDrawnAs((words, size) => (words === 'EUR' ? 150 : words.length * size * 0.6));
    await hole(60, [AMOUNT, MAIN, SUB]);
    assert.deepEqual(shown().map((l) => l[1]), ['75.0%']);
  });

  it('a line whose box reaches the edge of the hole does not fit; one just inside it does', async () => {
    // One main line of 16 from 110.4: its box is 112 to 128, 8 from the centre.
    // Exactly as wide as the circle leaves there (2 x 6 at a radius of 10) fits.
    textDrawnAs(() => 12);
    const { unmount } = await hole(10, [MAIN]);
    assert.deepEqual(shown().map((l) => l[1]), ['75.0%']);
    unmount();
    textDrawnAs(() => 12.5);
    const second = await hole(10, [MAIN]);
    assert.deepEqual(shown(), []);
    second.unmount();
    // A hole of 8 reaches only the box's edge: an empty line does not fit either.
    textDrawnAs(() => 0);
    await hole(8, [{ cls: 'main', text: '', main: true, drop: 1 }]);
    assert.deepEqual(shown(), []);
  });

  it('with no lines draws none', async () => {
    await hole(60, []);
    assert.deepEqual(shown(), []);
  });

  it('measures each line unseen, at the size it is drawn at, never putting its words in an attribute', async () => {
    await hole(60, [MAIN, SUB]);
    const samples = all('g.chart-measure text');
    assert.deepEqual(samples.map((t) => [t.textContent, (t as SVGElement).style.fontSize]), [['75.0%', '16px'], ['EUR', '14px']]);
    for (const el of all('svg *')) for (const { value } of [...el.attributes]) assert.ok(!value.includes('75.0'), value);
  });
});
