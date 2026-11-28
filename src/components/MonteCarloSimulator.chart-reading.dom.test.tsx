/**
 * Reading a year off the Monte Carlo simulator's chart (#790): by the arrow
 * keys, by a pointer, what the read-out says and where it sits, and how it
 * is put away.
 */
import { island, drawPlan, one, money, num, svg, plotBox, heightOf, near } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { act, fireEvent } from '@testing-library/react';

describe('reading a year off the chart', () => {
  const box = () => one('.mcs-chartBox');
  const readoutTitle = () => document.querySelector('.chart-readoutTitle');
  const announced = () => one('.mcs-chartBox .mcs-srOnly').textContent;
  const press = (key: string) => fireEvent.keyDown(box(), { key });

  it('arrow keys step through the years, and say each one', async () => {
    const { exact, worded } = await drawPlan({ saveYears: 3, withdrawal: 20_000, withdrawYears: 4, paths: 100 });
    assert.ok(readoutTitle() === null);
    assert.equal(announced(), '');
    assert.ok(document.querySelector('.chart-readoutSlot') === null);
    press('ArrowRight');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 0');
    assert.equal(one('.chart-readoutTag').textContent, island.chart.phaseStart);
    const b = worded.bands[0];
    assert.equal(announced(), `Year 0, start. High ${money(b.p90)}, middle half ${money(b.p25)} to ${money(b.p75)}, median ${money(b.p50)}, low ${money(b.p10)}, single line ${money(worded.straightLine[0])}.`);
    press('ArrowRight');
    press('ArrowRight');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 2');
    assert.equal(one('.chart-readoutTag').textContent, island.chart.phaseSaving);
    const y2 = worded.bands[2];
    assert.deepEqual([...document.querySelectorAll('.chart-readout dd')].map((d) => d.textContent), [money(y2.p90), `${money(y2.p25)} to ${money(y2.p75)}`, money(y2.p50), money(y2.p10), money(worded.straightLine[2])]);
    assert.deepEqual([...document.querySelectorAll('.chart-readout dt')].map((d) => d.textContent), [island.chart.readoutHigh, island.chart.readoutMiddle, island.chart.readoutMedian, island.chart.readoutLow, island.chart.readoutStraight]);
    // Each line's swatch in the colour and shape the chart draws it with.
    assert.deepEqual(
      [...document.querySelectorAll<HTMLElement>('.chart-readout .chart-swatch')].map((el) => [el.className, el.style.color]),
      [
        ['chart-swatch chart-swatch--dot', 'color-mix(in srgb, var(--color-deep-blue) 55%, var(--color-bg-white))'],
        ['chart-swatch chart-swatch--band', 'color-mix(in srgb, var(--color-deep-blue) 34%, transparent)'],
        ['chart-swatch chart-swatch--dot', 'var(--color-deep-blue)'],
        ['chart-swatch chart-swatch--dot', 'color-mix(in srgb, var(--color-deep-blue) 55%, var(--color-bg-white))'],
        ['chart-swatch chart-swatch--dot', 'var(--color-teal)'],
      ],
    );
    press('ArrowRight');
    assert.equal(one('.chart-readoutTag').textContent, island.chart.phaseSaving, 'the last year of saving');
    press('ArrowRight');
    assert.equal(one('.chart-readoutTag').textContent, 'Withdrawing, year 1');
    assert.ok(announced()?.startsWith('Year 4, withdrawing, year 1. '));
    press('End');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 7');
    press('ArrowRight');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 7', 'it stops at the last year');
    press('ArrowLeft');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 6');
    press('Home');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 0');
    press('ArrowLeft');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 0', 'and at the first');
    press('Escape');
    assert.ok(readoutTitle() === null);
    assert.equal(announced(), '');
    press('ArrowLeft');
    assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 7', 'left from nothing starts at the end');
    void exact;
  });

  it('keys, focus, the mouse and Escape on a four-year plan', async () => {
    const { exact, worded } = await drawPlan({ saveYears: 4, paths: 100 });
    {
      // other keys leave it alone, and the arrows keep the page from scrolling
      const ignored = fireEvent.keyDown(box(), { key: 'a' });
      assert.equal(ignored, true);
      assert.ok(readoutTitle() === null);
      const handled = fireEvent.keyDown(box(), { key: 'ArrowRight' });
      assert.equal(handled, false);
      const escape = fireEvent.keyDown(box(), { key: 'Escape' });
      assert.equal(escape, true);
    }
    {
      // a plan without withdrawals names no phase
      press('End');
      assert.ok(document.querySelector('.chart-readoutTag') === null);
      const b = worded.bands[4];
      assert.equal(announced(), `Year 4. High ${money(b.p90)}, middle half ${money(b.p25)} to ${money(b.p75)}, median ${money(b.p50)}, low ${money(b.p10)}, single line ${money(worded.straightLine[4])}.`);
      press('Escape');
    }
    {
      // marks the year read with a line and a dot on each value
      press('ArrowRight');
      press('ArrowRight');
      press('ArrowRight');
      const p = plotBox();
      const x = p.x + (2 / 4) * p.w;
      const line = one('.mcs-hoverLine');
      assert.deepEqual([num(line, 'x1'), num(line, 'x2'), num(line, 'y1'), num(line, 'y2')], [x, x, p.y, p.bottom]);
      assert.equal(one('.mcs-hover').getAttribute('pointer-events'), 'none');
      const dots = [...document.querySelectorAll('.mcs-hoverDot')];
      assert.deepEqual(dots.map((d) => d.getAttribute('class')), ['mcs-hoverDot mcs-hoverDot--outer', 'mcs-hoverDot mcs-hoverDot--outer', 'mcs-hoverDot mcs-hoverDot--straight', 'mcs-hoverDot mcs-hoverDot--median']);
      const b = exact.bands[2];
      [b.p90, b.p10, exact.straightLine[2], b.p50].forEach((v, i) => {
        assert.equal(num(dots[i], 'cx'), x);
        near(num(dots[i], 'cy'), heightOf(v), 1e-6, `dot ${i}`);
      });
      assert.deepEqual(dots.map((d) => d.getAttribute('r')), ['5', '5', '5', '6']);
    }
    {
      // leaving the chart, by focus or by mouse, puts the read-out away; a finger lifting does not
      press('ArrowRight');
      fireEvent.blur(box());
      assert.ok(readoutTitle() === null);
      press('ArrowRight');
      fireEvent.pointerLeave(one('.mcs-figure'), { pointerType: 'touch' });
      assert.ok(readoutTitle());
      fireEvent.pointerLeave(one('.mcs-figure'), { pointerType: 'mouse' });
      assert.ok(readoutTitle() === null);
    }
    {
      // Escape anywhere puts the read-out away
      press('ArrowRight');
      fireEvent.keyDown(window, { key: 'Escape' });
      assert.ok(readoutTitle() === null);
    }
  });

  it('the read-out: beside the crosshair, and read by a pointer', async () => {
    const proto = window.HTMLElement.prototype;
    const real = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
    Object.defineProperty(proto, 'offsetWidth', { configurable: true, get(this: HTMLElement) { return this.classList.contains('chart-readout') ? 200 : 0; } });
    try {
      await drawPlan({ saveYears: 10, paths: 100 });
      assert.ok(document.querySelector('.chart-readoutSlot') === null, 'no empty slot while it is closed');
      const figure = one('.mcs-figure');
      Object.defineProperty(figure, 'clientWidth', { configurable: true, value: 760 });
      (svg() as unknown as Record<string, unknown>).getBoundingClientRect = () => ({ left: 0, top: 0, width: 760, height: 398, right: 760, bottom: 398, x: 0, y: 0 });
      const p = plotBox();
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'Home' });
      await act(async () => {});
      const card = one('.chart-readout');
      assert.equal(parseFloat(card.style.left), p.x + 14);
      assert.equal(parseFloat(card.style.top), 8);
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'End' });
      await act(async () => {});
      assert.equal(parseFloat(one('.chart-readout').style.left), p.right - 14 - 200);
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'ArrowLeft' });
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'ArrowLeft' });
      fireEvent.keyDown(one('.mcs-chartBox'), { key: 'ArrowLeft' });
      await act(async () => {});
      const x7 = p.x + 0.7 * p.w;
      near(parseFloat(one('.chart-readout').style.left), x7 + 14 + 200 > p.right ? x7 - 214 : x7 + 14, 0.01);
      {
        // a pointer reads the year under it, and nothing beyond the plot
      const s = svg();
        // Shown at its own width, from the left edge of the window.
        (s as unknown as Record<string, unknown>).getBoundingClientRect = () => ({ left: 0, top: 0, width: 760, height: 398, right: 760, bottom: 398, x: 0, y: 0 });
        const p = plotBox();
        const at = (y: number) => p.x + (y / 10) * p.w;
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: at(4) + 3 });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 4');
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: at(7) - 35 });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 6');
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: p.x - 11 });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 0', 'just left of the plot still reads its first year');
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: p.right + 11 });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 10');
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: p.x - 13 });
        assert.ok(readoutTitle() === null);
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: at(2) });
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: p.right + 13 });
        assert.ok(readoutTitle() === null);
      }
      {
        // reads the same year when the chart is drawn at another size or place
      const s = svg();
        (s as unknown as Record<string, unknown>).getBoundingClientRect = () => ({ left: 100, top: 0, width: 380, height: 199, right: 480, bottom: 199, x: 100, y: 0 });
        const p = plotBox();
        const at = (y: number) => 100 + ((p.x + (y / 10) * p.w) / 760) * 380;
        fireEvent.pointerMove(s, { pointerType: 'mouse', clientX: at(3) });
        assert.equal(readoutTitle()?.firstChild?.textContent, 'Year 3');
      }
    } finally {
      if (real) Object.defineProperty(proto, 'offsetWidth', real);
    }
  });

});
