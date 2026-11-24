/**
 * Where the read-out of the Monte Carlo simulator's chart sits, on the chart
 * mounted by itself (#790): beside the year read, on the side that keeps it
 * inside the plot, following the drawing as it is shown, and the room it
 * keeps under a phone's chart once it is put away.
 */
import {
  drawChart, one, all, near, drawing, plotBox, acrossOf, press, readout, readoutTitle, laidOut, onPhone,
  drawn,
} from '../../test/monteCarloParts.chart-readout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('the chart’s read-out: where it sits', () => {
  it('beside the year read: to its right, or to its left where it would cover the end of the plot', () => {
    laidOut({ card: { width: 200, height: 120 } }, () => {
      drawChart({ saveYears: 10 });
      const p = plotBox();
      const left = () => parseFloat(readout()!.style.left);
      press('Home');
      near(left(), p.x + 14, 1e-6);
      assert.equal(readout()!.style.visibility, '');
      assert.equal(parseFloat(readout()!.style.top), 8);
      // The last year whose card still ends inside the plot, and the first whose would not.
      const fits = Math.floor(((p.w - 214) / p.w) * 10);
      assert.ok(fits >= 2 && fits < 9, 'the case has years on both sides');
      for (let year = 1; year <= fits; year++) press('ArrowRight');
      assert.equal(readoutTitle(), `Year ${fits}`);
      near(left(), acrossOf(fits, 10) + 14, 1e-6);
      press('ArrowRight');
      near(left(), acrossOf(fits + 1, 10) - 14 - 200, 1e-6);
      press('End');
      near(left(), p.right - 14 - 200, 1e-6);
    });
  });

  it('follows the drawing where it is shown smaller and further in', () => {
    laidOut({ shown: 380, left: 100, card: { width: 100, height: 120 } }, () => {
      drawChart({ saveYears: 10 });
      const { W } = drawing();
      const p = plotBox();
      const shownAt = (units: number) => 100 + (units / W) * 380;
      press('Home');
      press('ArrowRight');
      near(parseFloat(readout()!.style.left), shownAt(acrossOf(1, 10)) + 14, 1e-6);
      press('End');
      near(parseFloat(readout()!.style.left), shownAt(p.right) - 14 - 100, 1e-6);
    });
  });

  it('on a phone: placed by the phone’s drawing', () => {
    onPhone(() => laidOut({ card: { width: 120, height: 150 }, figureWidth: 360 }, () => {
      drawChart({ saveYears: 10 });
      const p = plotBox();
      assert.equal(drawing().W, 360);
      press('Home');
      press('ArrowRight');
      near(parseFloat(readout()!.style.left), acrossOf(1, 10) + 14, 1e-6);
      press('End');
      near(parseFloat(readout()!.style.left), p.right - 14 - 120, 1e-6);
    }));
  });

  it('keeps the room it took once it is put away, and gives it back to the card when a year is read again', () => {
    laidOut({ card: { width: 200, height: 120 } }, () => {
      drawChart({ saveYears: 10 });
      press('Home');
      assert.equal(drawn('.chart-readoutSlot'), false, 'no empty room beside an open card');
      press('Escape');
      const slot = one('.chart-readoutSlot');
      assert.equal(slot.style.height, '120px');
      assert.deepEqual(all('.mcs-figure > *').map((el) => el.className), ['mcs-swipe', 'tool-chartUnit', 'mcs-chartScroll', 'chart-readoutSlot', 'mcs-legend']);
      press('End');
      assert.equal(drawn('.chart-readoutSlot'), false);
      assert.deepEqual(all('.mcs-figure > *').map((el) => el.className), ['mcs-swipe', 'tool-chartUnit', 'mcs-chartScroll', 'chart-readout', 'mcs-legend']);
    });
  });
});
