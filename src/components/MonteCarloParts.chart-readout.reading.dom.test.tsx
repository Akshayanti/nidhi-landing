/**
 * The read-out of the Monte Carlo simulator's chart, on the chart mounted by
 * itself (#790): the words it gives a year, the phase it names, the amounts
 * it quotes, what a screen reader is told, and how it is put away.
 */
import {
  words, drawChart, one, all, money, chartBox, press, readout, readoutTitle, readoutTag, readoutValues, announced,
  drawn,
} from '../../test/monteCarloParts.chart-readout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';

const OUTER = 'color-mix(in srgb, var(--color-deep-blue) 55%, var(--color-bg-white))';
const INNER = 'color-mix(in srgb, var(--color-deep-blue) 34%, transparent)';

describe('the chart’s read-out: its words', () => {
  it('reads nothing until a year is picked', () => {
    drawChart({ saveYears: 3, withdrawal: 20_000, withdrawYears: 4 });
    assert.equal(drawn('.chart-readout'), false);
    assert.equal(announced(), '');
    assert.equal(one('.mcs-chartBox .mcs-srOnly').getAttribute('aria-live'), 'polite');
    assert.equal(drawn('.chart-readoutSlot'), false, 'and keeps no room for a read-out never opened');
  });

  it('names the start, the saving years and each year of withdrawals', () => {
    const { worded } = drawChart({ saveYears: 3, withdrawal: 20_000, withdrawYears: 4 });
    const said = (year: number, phase: string) => {
      const b = worded.bands[year];
      return `Year ${year}${phase}. High ${money(b.p90)}, middle half ${money(b.p25)} to ${money(b.p75)}, median ${money(b.p50)}, low ${money(b.p10)}, single line ${money(worded.straightLine[year])}.`;
    };
    press('Home');
    assert.equal(readoutTitle(), 'Year 0');
    assert.equal(readoutTag(), 'Start');
    assert.equal(announced(), said(0, ', start'));
    press('ArrowRight');
    press('ArrowRight');
    assert.equal(readoutTitle(), 'Year 2');
    assert.equal(readoutTag(), 'Saving');
    assert.equal(announced(), said(2, ', saving'));
    press('ArrowRight');
    assert.equal(readoutTag(), 'Saving', 'the last year of saving');
    press('ArrowRight');
    assert.equal(readoutTitle(), 'Year 4');
    assert.equal(readoutTag(), 'Withdrawing, year 1');
    assert.equal(announced(), said(4, ', withdrawing, year 1'));
    press('End');
    assert.equal(readoutTag(), 'Withdrawing, year 4');
    assert.equal(announced(), said(7, ', withdrawing, year 4'));
  });

  it('withdrawing from the first year: the start is still the start', () => {
    drawChart({ saveYears: 0, start: 500_000, monthly: 0, withdrawal: 20_000, withdrawYears: 5 });
    press('Home');
    assert.equal(readoutTag(), 'Start');
    press('ArrowRight');
    assert.equal(readoutTag(), 'Withdrawing, year 1');
  });

  it('names no phase for a plan that only saves', () => {
    const { worded } = drawChart({ saveYears: 4 });
    press('Home');
    assert.equal(readoutTag(), null);
    press('End');
    assert.equal(readoutTitle(), 'Year 4');
    assert.equal(readoutTag(), null);
    const b = worded.bands[4];
    assert.equal(announced(), `Year 4. High ${money(b.p90)}, middle half ${money(b.p25)} to ${money(b.p75)}, median ${money(b.p50)}, low ${money(b.p10)}, single line ${money(worded.straightLine[4])}.`);
  });

  it('quotes the year’s rounded amounts, each beside the mark the chart draws it with', () => {
    const { exact, worded } = drawChart({ saveYears: 12 });
    press('End');
    press('ArrowLeft');
    press('ArrowLeft');
    press('ArrowLeft');
    assert.equal(readoutTitle(), 'Year 9');
    const b = worded.bands[9];
    const drawn = exact.bands[9];
    // The case tells the two apart: every amount read is rounded away from the one drawn.
    for (const k of ['p10', 'p25', 'p50', 'p75', 'p90'] as const) assert.notEqual(money(b[k]), money(drawn[k]), k);
    assert.notEqual(money(worded.straightLine[9]), money(exact.straightLine[9]));
    assert.deepEqual(readoutValues(), [money(b.p90), `${money(b.p25)} to ${money(b.p75)}`, money(b.p50), money(b.p10), money(worded.straightLine[9])]);
    assert.equal(announced(), `Year 9. High ${money(b.p90)}, middle half ${money(b.p25)} to ${money(b.p75)}, median ${money(b.p50)}, low ${money(b.p10)}, single line ${money(worded.straightLine[9])}.`);
    assert.deepEqual(all('.chart-readout dt').map((d) => d.textContent), [words.readoutHigh, words.readoutMiddle, words.readoutMedian, words.readoutLow, words.readoutStraight]);
    assert.deepEqual(
      all('.chart-readout .chart-swatch').map((el) => [el.className, (el as HTMLElement).style.color]),
      [
        ['chart-swatch chart-swatch--dot', OUTER],
        ['chart-swatch chart-swatch--band', INNER],
        ['chart-swatch chart-swatch--dot', 'var(--color-deep-blue)'],
        ['chart-swatch chart-swatch--dot', OUTER],
        ['chart-swatch chart-swatch--dot', 'var(--color-teal)'],
      ],
    );
    assert.deepEqual(all('.chart-readout dl > div').map((row) => row.className), ['', '', 'chart-readoutStrong', '', ''], 'the median stands out');
    assert.equal(readout()?.getAttribute('aria-hidden'), 'true', 'a screen reader hears the line, not the card');
  });
});

describe('the chart’s read-out: putting it away', () => {
  it('Escape anywhere, focus leaving and the mouse leaving put it away; a finger lifting does not', () => {
    drawChart({ saveYears: 4 });
    press('Home');
    fireEvent.keyDown(window, { key: 'Escape' });
    assert.equal(drawn('.chart-readout'), false);
    assert.equal(announced(), '');
    press('Home');
    fireEvent.keyDown(window, { key: 'a' });
    assert.ok(drawn('.chart-readout'), 'another key leaves it');
    fireEvent.blur(chartBox());
    assert.equal(drawn('.chart-readout'), false);
    press('Home');
    fireEvent.pointerLeave(one('.mcs-figure'), { pointerType: 'touch' });
    assert.ok(drawn('.chart-readout'));
    fireEvent.pointerLeave(one('.mcs-figure'), { pointerType: 'mouse' });
    assert.equal(drawn('.chart-readout'), false);
  });

  it('listens for Escape on the window only while a year is read', () => {
    const added: string[] = [];
    const removed: string[] = [];
    const real = { add: window.addEventListener, remove: window.removeEventListener };
    window.addEventListener = function (this: Window, type: string, ...rest: unknown[]) {
      added.push(type);
      return (real.add as (...a: unknown[]) => void).call(this, type, ...rest);
    } as typeof window.addEventListener;
    window.removeEventListener = function (this: Window, type: string, ...rest: unknown[]) {
      removed.push(type);
      return (real.remove as (...a: unknown[]) => void).call(this, type, ...rest);
    } as typeof window.removeEventListener;
    try {
      drawChart({ saveYears: 4 });
      assert.equal(added.filter((type) => type === 'keydown').length, 0, 'nothing read, nothing listened for');
      press('Home');
      assert.equal(added.filter((type) => type === 'keydown').length, 1);
      press('ArrowRight');
      press('ArrowRight');
      assert.equal(added.filter((type) => type === 'keydown').length, 1, 'one listener, kept from year to year');
      assert.equal(removed.filter((type) => type === 'keydown').length, 0);
      press('Escape');
      assert.equal(removed.filter((type) => type === 'keydown').length, 1);
    } finally {
      window.addEventListener = real.add;
      window.removeEventListener = real.remove;
    }
  });

  it('a plan that becomes shorter than the year being read puts it away', () => {
    const chart = drawChart({ saveYears: 8 });
    press('End');
    assert.equal(readoutTitle(), 'Year 8');
    chart.redraw({ saveYears: 3 });
    assert.equal(drawn('.chart-readout'), false);
    assert.equal(announced(), '');
    assert.equal(drawn('.mcs-hover'), false);
    press('Home');
    assert.equal(readoutTitle(), 'Year 0', 'and the shorter plan is read like any other');
  });
});
