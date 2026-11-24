/**
 * The Monte Carlo simulator's chart, finding the year to read (#790): which
 * year a pointer is over, where the plot's edges stop it, the keys that open
 * the read-out and move it along the years, and when the read-out names the
 * part of the plan a year falls in. The chart is mounted by itself, with
 * plans worked out for real; what the read-out then shows has its own tests.
 */
import {
  island, drawChart, atTextSize, textDrawnAs, onPhone, one, plot, chartBox, press, yearRead, pointAt,
} from '../../test/monteCarloParts.chart-layout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';

describe('the year under a pointer', () => {
  /** A thirty-year chart shown at half its drawn width, 100 px in from the window's edge. */
  function shownAtHalf(plotLeft = 40) {
    // Text at half size too, so the drawing is laid out as at normal text.
    atTextSize(8, { shown: 0.5, left: 100 });
    drawChart({ saveYears: 30 });
    const p = plot();
    assert.deepEqual([p.x, p.right], [plotLeft, 628]);
    /** The window position of a place across the drawing, in its own units. */
    return (units: number) => 100 + units / 2;
  }

  it('is the nearest year, wherever on the screen the chart is shown and at whatever width', () => {
    const at = shownAtHalf();
    const year = (y: number) => 40 + (y / 30) * 588;
    pointAt(at(year(15)));
    assert.equal(yearRead(), 15);
    pointAt(at(year(14.4)));
    assert.equal(yearRead(), 14);
    pointAt(at(year(14.6)));
    assert.equal(yearRead(), 15);
    pointAt(at(year(0)));
    assert.equal(yearRead(), 0);
    pointAt(at(year(30)));
    assert.equal(yearRead(), 30);
  });

  it('reads the first or last year up to 12 units outside the plot, and nothing beyond', () => {
    // Amounts drawn narrow, so the plot starts at 32 units.
    textDrawnAs(() => 10);
    const at = shownAtHalf(32);
    pointAt(at(32 - 12));
    assert.equal(yearRead(), 0, 'twelve units left of the plot is still the first year');
    pointAt(at(32 - 13));
    assert.equal(yearRead(), null, 'a unit further closes the read-out');
    pointAt(at(628 + 12));
    assert.equal(yearRead(), 30, 'twelve units right of the plot is still the last year');
    pointAt(at(628 + 13));
    assert.equal(yearRead(), null);
  });

  it('follows the phone drawing’s own width and margins', () => {
    onPhone();
    atTextSize(16, { shown: 1, left: 0 });
    drawChart({ saveYears: 30 });
    const p = plot();
    assert.equal(360 - p.right, 14);
    pointAt(p.x + (20 / 30) * p.w);
    assert.equal(yearRead(), 20);
    pointAt(p.right + 12);
    assert.equal(yearRead(), 30);
    pointAt(p.right + 13);
    assert.equal(yearRead(), null);
  });

  it('a plan with no years has nothing to read', () => {
    atTextSize(16);
    const { exact } = drawChart({ saveYears: 0, withdrawal: 0 });
    assert.equal(exact.years, 0);
    pointAt(plot().x);
    assert.equal(yearRead(), null);
    // Its one point is drawn at the left edge of the plot.
    assert.equal(one('.mcs-median').getAttribute('d'), `M${plot().x.toFixed(1)},${plot().y.toFixed(1)}`);
  });
});

describe('reading the chart by keyboard', () => {
  it('the right arrow opens at the first year and steps forward, stopping at the last', () => {
    drawChart({ saveYears: 3 });
    assert.equal(yearRead(), null);
    assert.equal(press('ArrowRight'), false, 'the chart keeps the key from scrolling the page');
    assert.equal(yearRead(), 0);
    press('ArrowRight');
    assert.equal(yearRead(), 1);
    press('ArrowRight');
    press('ArrowRight');
    assert.equal(yearRead(), 3);
    press('ArrowRight');
    assert.equal(yearRead(), 3);
  });

  it('the left arrow opens at the last year and steps back, stopping at the first', () => {
    drawChart({ saveYears: 3 });
    assert.equal(press('ArrowLeft'), false);
    assert.equal(yearRead(), 3);
    press('ArrowLeft');
    assert.equal(yearRead(), 2);
    press('ArrowLeft');
    press('ArrowLeft');
    assert.equal(yearRead(), 0);
    press('ArrowLeft');
    assert.equal(yearRead(), 0);
  });

  it('Home and End jump to the first and last year, open or not', () => {
    drawChart({ saveYears: 3 });
    assert.equal(press('End'), false);
    assert.equal(yearRead(), 3);
    assert.equal(press('Home'), false);
    assert.equal(yearRead(), 0);
    press('ArrowRight');
    press('End');
    assert.equal(yearRead(), 3);
    press('Escape');
    press('Home');
    assert.equal(yearRead(), 0);
  });

  it('other keys are left to the page and change nothing', () => {
    drawChart({ saveYears: 3 });
    assert.equal(press('a'), true);
    assert.equal(press('ArrowDown'), true);
    assert.equal(yearRead(), null);
    press('ArrowRight');
    press('ArrowRight');
    assert.equal(press('a'), true);
    assert.equal(press('Tab'), true);
    assert.equal(yearRead(), 1, 'the read-out stays on its year');
  });

  it('Escape closes the read-out, even when the page swallows the key above the chart', () => {
    drawChart({ saveYears: 3 });
    press('ArrowRight');
    assert.equal(yearRead(), 0);
    const swallow = (e: Event) => e.stopPropagation();
    document.addEventListener('keydown', swallow);
    try {
      assert.equal(press('Escape'), true, 'Escape itself is left to the page');
      assert.equal(yearRead(), null);
    } finally {
      document.removeEventListener('keydown', swallow);
    }
    // And the next arrow starts again from the edge.
    press('ArrowLeft');
    assert.equal(yearRead(), 3);
  });

  it('leaving the chart with the keyboard closes it', () => {
    drawChart({ saveYears: 3 });
    press('End');
    fireEvent.blur(chartBox());
    assert.equal(yearRead(), null);
  });
});

describe('the part of the plan a year falls in', () => {
  const tag = () => document.querySelector('.chart-readoutTag')?.textContent ?? null;

  it('is named when the plan saves and then lives off the money', () => {
    drawChart({ saveYears: 2, withdrawal: 20_000, withdrawYears: 3 });
    press('ArrowRight');
    assert.equal(tag(), island.chart.phaseStart);
    press('ArrowRight');
    assert.equal(tag(), island.chart.phaseSaving);
    press('End');
    assert.equal(tag(), 'Withdrawing, year 3');
    assert.ok(document.querySelector('rect.mcs-phase'), 'and the years of living off it are shaded');
  });

  it('is not named for a plan that only saves', () => {
    drawChart({ saveYears: 5, withdrawal: 0, withdrawYears: 30 });
    press('ArrowRight');
    assert.equal(yearRead(), 0);
    assert.equal(tag(), null);
    assert.equal(document.querySelector('rect.mcs-phase'), null);
  });

  it('is not named when withdrawals are set for no years', () => {
    // As the form can hold it for a moment: an amount to withdraw, over nought years.
    drawChart({ saveYears: 5, withdrawal: 20_000, withdrawYears: 0 });
    press('ArrowRight');
    assert.equal(yearRead(), 0);
    assert.equal(tag(), null);
  });
});
