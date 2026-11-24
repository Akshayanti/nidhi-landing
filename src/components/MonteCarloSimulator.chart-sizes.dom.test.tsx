/**
 * The Monte Carlo simulator's chart at other sizes (#790): drawn for a
 * phone's width, and at a reader's larger text, up to four times the size
 * on a phone.
 */
import {
  t, island, STARTING_RESULT, settle, drawPlan, text, one, num, svg, viewBox,
  plotBox, pathOf, axisTop, heightOf, near, onPhone, atTextSize,
} from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from '@testing-library/react';
import MonteCarloSimulator from './MonteCarloSimulator.tsx';

describe('the chart, on a phone', () => {
  it('is drawn for the phone’s width, without end labels or the swipe hint, and follows the width', async () => {
    await onPhone(async (changes) => {
      const { exact, unmount } = await drawPlan({ saveYears: 30, paths: 100 });
      assert.ok(changes.listeners.length >= 1, 'it listens for the screen changing width');
      const [, , W, H] = viewBox();
      assert.equal(W, 360);
      const p = plotBox();
      assert.equal(p.h, 270 - 18 - 50);
      assert.equal(p.y, 18);
      assert.equal(W - p.right, 14);
      assert.equal(H, p.bottom + Math.max(50, Math.ceil((2.6 + 1.2) * 14)));
      assert.equal(svg().getAttribute('class'), 'mcs-chart mcs-chart--narrow');
      assert.equal(one('.mcs-chartBox').getAttribute('class'), 'mcs-chartBox mcs-chartBox--scrub');
      assert.equal(document.querySelector('.mcs-swipe'), null);
      assert.equal(document.querySelectorAll('.mcs-endLabel text').length, 0);
      assert.equal(document.querySelectorAll('.mcs-leader').length, 0);
      const ends = [exact.bands[30].p90, exact.bands[30].p50, exact.bands[30].p10];
      const dots = [...document.querySelectorAll('.mcs-endLabel circle')];
      assert.equal(dots.length, 3);
      dots.forEach((d, i) => near(num(d, 'cy'), heightOf(ends[i]), 0.051));
      pathOf('.mcs-median').forEach(([x, y], i) => {
        near(x, p.x + (i / 30) * p.w, 0.06);
        near(y, heightOf(exact.bands[i].p50), 0.06);
      });
      unmount();
      assert.ok(changes.removed >= 1, 'and stops when it goes');
    });
  });

  it('a value above the top gets no end dot, and the legend says to tap for it', async () => {
    await onPhone(async () => {
      const { exact } = await drawPlan({ saveYears: 5, withdrawal: 1_000, withdrawYears: 40, start: 500_000, paths: 100 });
      assert.ok(exact.bands[45].p90 > axisTop());
      assert.equal(document.querySelectorAll('.mcs-endLabel circle').length, 2);
      assert.equal(one('.mcs-legendHint').textContent, island.chart.legendHint + island.chart.clippedPhone);
    });
  });

  it('labels every other year where every year would crowd, with no minor year lines between', async () => {
    await onPhone(async () => {
      await drawPlan({ saveYears: 10, paths: 100 });
      const years = text('text.mcs-axis:not(.mcs-axisAmount):not(.mcs-axisTitle):not([data-sample])');
      assert.deepEqual(years, ['0', '2', '4', '6', '8', '10']);
      assert.ok([...document.querySelectorAll('line.mcs-gridMinor')].every((l) => l.getAttribute('y1') === l.getAttribute('y2')));
    });
  });

});

describe('the chart at larger text', () => {
  it('at twice the size: larger text, the same plot, no minor gridlines', async () => {
    await atTextSize(32, async () => {
      await drawPlan({ saveYears: 30, paths: 100 });
      assert.equal(svg().getAttribute('style'), '--chart-fs: 28px; --chart-fv: 32px;');
      const p = plotBox();
      assert.equal(p.h, 324);
      assert.equal(document.querySelectorAll('line.mcs-gridMinor').length, 0);
      const major = [...document.querySelectorAll('line.mcs-grid, line.mcs-axisLine')].filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
      assert.ok(major.length - 1 <= Math.min(6, 324 / (1.8 * 28)), 'fewer gridlines as the text grows');
      const H = viewBox()[3];
      assert.ok(H - p.bottom >= Math.ceil((2.6 + 1.2) * 28), 'room under the plot for the years and the title');
      const title = one('text.mcs-axisTitle:not([data-sample])');
      near(num(title, 'y'), Math.round((p.bottom + 3 * 28) * 10) / 10, 1e-9);
    });
  });

  it('just under twice the size keeps the minor gridlines', async () => {
    await atTextSize(31, async () => {
      await drawPlan({ saveYears: 30, paths: 100 });
      assert.ok(document.querySelectorAll('line.mcs-gridMinor').length > 0);
    });
  });

  it('at four times the size on a phone: amounts move inside the plot, above their lines, and the title wraps', async () => {
    await onPhone(async () => {
      await atTextSize(64, async () => {
        // Gridlines at 2.5 and 5 million: labels wide enough to need the room.
        await drawPlan({ saveYears: 40, paths: 100 });
        const fs = 0.875 * 64;
        const p = plotBox();
        assert.equal(p.x, 22, 'the margin shrinks to its least');
        assert.equal(p.y, Math.max(18, Math.ceil(1.4 * fs)), 'room above for the top label');
        const inside = [...document.querySelectorAll('.mcs-axisAmount--inside:not([data-sample])')];
        assert.ok(inside.length > 0);
        const major = [...document.querySelectorAll('line.mcs-grid, line.mcs-axisLine')].filter((l) => l.getAttribute('y1') === l.getAttribute('y2'));
        assert.equal(inside.length, major.length - 1, 'every gridline but the bottom one');
        inside.forEach((t, i) => {
          assert.equal(t.getAttribute('text-anchor'), 'start');
          assert.equal(num(t, 'x'), p.x + 6);
          near(num(t, 'y'), num(major[i + 1], 'y1') - 0.3 * fs, 0.051);
        });
        const lines = [...document.querySelectorAll('text.mcs-axisTitle:not([data-sample]) tspan')];
        assert.ok(lines.length > 1, 'the axis title takes more than one line');
        assert.equal(lines.map((l) => l.textContent).join(' '), island.chart.axisYears);
        assert.equal(lines[0].getAttribute('dy'), '0');
        assert.equal(Number(lines[1].getAttribute('dy')), Math.round(1.2 * fs * 10) / 10);
        const H = viewBox()[3];
        assert.equal(H - p.bottom, Math.max(50, Math.ceil((2.6 + 1.2 * lines.length) * fs)));
        assert.equal(document.querySelector('.mcs-phaseLabel'), null);
      });
    });
  });

  it('a long axis title on a phone is drawn smaller to fit, and left out below the least size', async () => {
    const strings = { ...island, chart: { ...island.chart, axisYears: 'Yearsfromtodaywrittenasoneverylongwordwithoutanyspace' } };
    await onPhone(async () => {
      render(<MonteCarloSimulator strings={strings} exportStrings={t.export} netWorthHref="/" defaultCurrency="EUR" amountLocale={null} numberLocale="en" initialResult={STARTING_RESULT} />);
      await settle(20);
      const title = one('text.mcs-axisTitle:not([data-sample])');
      const width = strings.chart.axisYears.length * 14 * 0.6;
      const fit = (360 - 4) / width;
      near(parseFloat(title.style.fontSize), 14 * fit, 0.001, 'title size');
      assert.equal(title.getAttribute('visibility'), fit < 0.75 / 0.875 ? 'hidden' : null);
      const half = (fit * width) / 2 + 2;
      assert.equal(num(title, 'x'), Math.round(Math.min(Math.max(plotBox().x + plotBox().w / 2, half), 360 - half)));
    });
  });

});
