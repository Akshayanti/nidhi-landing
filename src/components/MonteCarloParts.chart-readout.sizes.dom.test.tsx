/**
 * What the Monte Carlo simulator's chart draws on a phone and at a reader's
 * larger text, on the chart mounted by itself (#790): the phone's frame, the
 * end dots without their labels, the amounts moved inside the plot, an amount
 * or a title drawn smaller to fit or left out, and the name over the years
 * of living off the money where the room for it changes.
 */
import {
  island, words, drawChart, one, all, text, num, money, tenth, near, svg, drawing, plotBox, axisTop,
  heightOf, levelLines, press, readoutValues, laidOut, onPhone,
} from '../../test/monteCarloParts.chart-readout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** The least a chart word is drawn smaller, as a share of its size. */
const FLOOR = 0.75 / 0.875;
const withWords = (chart: Partial<typeof words>) => ({ ...island, chart: { ...words, ...chart } });

describe('the chart on a phone', () => {
  it('is drawn for the phone: no swipe hint, no end labels, a dot where each path ends', () => {
    onPhone(() => {
      const { exact } = drawChart({ saveYears: 10 });
      assert.deepEqual(all('.mcs-figure > *').map((el) => el.className), ['tool-chartUnit', 'mcs-chartScroll', 'mcs-legend']);
      assert.equal(one('.mcs-chartScroll > div').className, 'mcs-chartBox mcs-chartBox--scrub');
      assert.equal(svg().getAttribute('class'), 'mcs-chart mcs-chart--narrow');
      const p = plotBox();
      assert.equal(svg().getAttribute('viewBox'), `0 0 360 ${p.bottom + Math.ceil((2.6 + 1.2) * 14)}`);
      const top = axisTop();
      const end = exact.bands[10];
      assert.deepEqual(all('g.mcs-endLabel').map((g) => g.getAttribute('class')), ['mcs-endLabel mcs-endLabel--outer', 'mcs-endLabel mcs-endLabel--median', 'mcs-endLabel mcs-endLabel--outer']);
      assert.equal(all('.mcs-endLabel text').length, 0);
      assert.equal(all('.mcs-leader').length, 0);
      const dots = all('.mcs-endLabel circle');
      assert.equal(dots.length, 3);
      [end.p90, end.p50, end.p10].forEach((v, i) => assert.deepEqual([num(dots[i], 'cx'), num(dots[i], 'cy')], [p.right, tenth(heightOf(v, top))]));
      assert.equal(one('.mcs-legendHint').textContent, words.legendHint);
    });
  });

  it('a path that ends above the top gets no dot there, and the legend says to tap for its value', () => {
    onPhone(() => {
      const { exact, worded } = drawChart({ saveYears: 5, start: 500_000, withdrawal: 1_000, withdrawYears: 40 });
      const top = axisTop();
      assert.ok(exact.bands[45].p90 > top && exact.bands[45].p50 <= top, 'the case: only the high path ends above the top');
      assert.deepEqual(all('g.mcs-endLabel').map((g) => g.querySelectorAll('circle').length), [0, 1, 1]);
      assert.equal(one('.mcs-legendHint').textContent, words.legendHint + words.clippedPhone);
      press('End');
      assert.equal(readoutValues()[0], money(worded.bands[45].p90), 'the read-out has the high value');
    });
  });

  it('paths that end close together get their dots and no line to a label, as there is none', () => {
    onPhone(() => {
      drawChart({ saveYears: 1, stockPct: 0, start: 0, monthly: 10_000 });
      assert.equal(all('.mcs-leader').length, 0);
      assert.equal(all('.mcs-endLabel circle').length, 3);
    });
  });
});

describe('the chart at four times the text size on a phone', () => {
  it('moves the amounts inside the plot, above their lines, and wraps the axis title', () => {
    onPhone(() => laidOut({ textSize: 64 }, () => {
      // Gridlines at 2.5 and 5 million: labels wide enough to need the room.
      drawChart({ saveYears: 40 });
      const fs = 0.875 * 64;
      const p = plotBox();
      const { H } = drawing();
      const top = axisTop();
      assert.equal(p.x, 22, 'the margin shrinks to its least');
      const lines = levelLines('line.mcs-grid, line.mcs-axisLine');
      const inside = all('text.mcs-axisAmount:not([data-sample])');
      assert.ok(inside.length >= 2);
      assert.equal(inside.length, lines.length - 1, 'every gridline but the bottom one');
      const step = top / inside.length;
      inside.forEach((amount, i) => {
        assert.equal(amount.getAttribute('class'), 'mcs-axis mcs-axisAmount mcs-axisAmount--inside');
        assert.equal(amount.getAttribute('text-anchor'), 'start');
        assert.equal(num(amount, 'x'), p.x + 6);
        assert.equal(num(amount, 'y'), tenth(heightOf((i + 1) * step, top) - 0.3 * fs));
        assert.equal(amount.getAttribute('style'), null, 'at its full size');
        assert.equal(amount.getAttribute('visibility'), null);
      });
      {
        // the axis title, a line a row, each from the same middle
        const title = one('text.mcs-axisTitle:not([data-sample])');
        const rows = all('tspan', title);
        assert.deepEqual(rows.map((r) => r.textContent), ['Years from', 'today']);
        assert.deepEqual(rows.map((r) => r.getAttribute('x')), [title.getAttribute('x'), title.getAttribute('x')]);
        assert.deepEqual(rows.map((r) => num(r, 'dy')), [0, tenth(1.2 * fs)]);
        assert.equal(num(title, 'y'), tenth(p.bottom + 3 * fs));
        assert.equal(H - p.bottom, Math.ceil((2.6 + 1.2 * 2) * fs));
        assert.equal(title.getAttribute('style'), null);
        assert.equal(title.getAttribute('visibility'), null);
      }
    }));
  });

  it('an amount wider than the drawing is drawn smaller, by just enough, and left out below the least size', () => {
    onPhone(() => laidOut({ textSize: 64 }, () => {
      // Drawn outside a tool, the gridlines keep full amounts: the longest a chart writes.
      drawChart({ saveYears: 30, start: 9_000_000 }, { chartWords: null });
      const fs = 0.875 * 64;
      const p = plotBox();
      const amounts = all('text.mcs-axisAmount--inside:not([data-sample])') as HTMLElement[];
      assert.deepEqual(amounts.map((a) => a.textContent), ['€50,000,000', '€100,000,000']);
      const room = 360 - p.x - 8;
      const fit = (chars: number) => room / (chars * fs * 0.6);
      assert.ok(fit(11) < 1 && fit(11) >= FLOOR && fit(12) < FLOOR, 'the case: one fits smaller, one does not fit');
      near(parseFloat(amounts[0].style.fontSize), fs * fit(11), 1e-3);
      assert.equal(amounts[0].getAttribute('visibility'), null);
      assert.equal(amounts[1].getAttribute('visibility'), 'hidden');
    }));
  });

  it('an amount that fits inside keeps its full size', () => {
    onPhone(() => laidOut({ textSize: 64 }, () => {
      drawChart({ saveYears: 5, start: 30_000, monthly: 0 }, { chartWords: null });
      const amounts = all('text.mcs-axisAmount--inside:not([data-sample])');
      assert.ok(amounts.length >= 1);
      for (const amount of amounts) {
        assert.ok([...(amount.textContent ?? '')].length <= 9, `the case: ${amount.textContent} fits`);
        assert.equal(amount.getAttribute('style'), null);
        assert.equal(amount.getAttribute('visibility'), null);
      }
    }));
  });
});

describe('the chart at four times the text size on a phone, its amounts measured as drawn', () => {
  it('an amount is fitted by its measured width, and one that needs exactly the least size is still drawn', () => {
    // Each letter 11/16 of its size wide: ten letters at 56 are 385 across, and the 330 of room is 6/7 of that, the least size.
    onPhone(() => laidOut({ textSize: 64, letter: 0.6875 }, () => {
      drawChart({ saveYears: 40 }, { chartWords: null });
      const amounts = all('text.mcs-axisAmount--inside:not([data-sample])') as HTMLElement[];
      assert.deepEqual(amounts.map((a) => a.textContent), ['€2,500,000', '€5,000,000']);
      assert.equal(plotBox().x, 22);
      for (const amount of amounts) {
        assert.equal(amount.style.fontSize, '48px');
        assert.equal(amount.getAttribute('visibility'), null);
      }
    }));
  });
});

describe('the chart’s axis title where it is too long for the drawing', () => {
  const titleOf = (axisYears: string) => {
    drawChart({ saveYears: 10 }, { strings: withWords({ axisYears }) });
    return one('text.mcs-axisTitle:not([data-sample])');
  };

  it('a word a little wider than a phone is drawn smaller, by just enough to fit', () => {
    onPhone(() => {
      const word = 'Y'.repeat(46);
      const title = titleOf(word);
      const fit = (360 - 4) / (46 * 14 * 0.6);
      assert.ok(fit < 1 && fit >= FLOOR);
      near(parseFloat(title.style.fontSize), 14 * fit, 1e-3);
      assert.equal(title.getAttribute('visibility'), null);
      assert.equal(num(title, 'x'), 180, 'in the middle of the drawing');
      assert.deepEqual(text('text.mcs-axisTitle:not([data-sample]) tspan'), [word]);
    });
  });

  it('a word that needs exactly the least size is still drawn', () => {
    // On a wide screen 105 letters are 882 across, and the 756 of room is 6/7 of that.
    const title = titleOf('Y'.repeat(105));
    assert.equal((760 - 4) / (105 * 14 * 0.6), FLOOR);
    assert.equal(title.style.fontSize, '12px');
    assert.equal(title.getAttribute('visibility'), null);
  });

  it('a word that would need less than the least size is left out', () => {
    onPhone(() => {
      const title = titleOf('Y'.repeat(60));
      assert.ok((360 - 4) / (60 * 14 * 0.6) < FLOOR);
      assert.equal(title.getAttribute('visibility'), 'hidden');
    });
  });
});

describe('the name over the years of living off the money, where room is short', () => {
  it('is left out on a plot less than three of its lines high', () => {
    // A name short enough to have room across a phone at this text size.
    const strings = withWords({ livingOff: 'Out' });
    const named = (textSize: number) => {
      let there = false;
      onPhone(() => laidOut({ textSize }, () => {
        const { unmount } = drawChart({ saveYears: 3, start: 500_000, withdrawal: 20_000, withdrawYears: 7 }, { strings });
        const fs = 0.875 * textSize;
        assert.ok(num(one('rect.mcs-phase'), 'width') >= 3 * fs * 0.6 + 20, 'the case: room across for the name');
        assert.equal(all('.mcs-axisAmount--inside:not([data-sample])').length, 0, 'the case: the amounts are beside the plot');
        there = Boolean(document.querySelector('.mcs-phaseLabel'));
        unmount();
      }));
      return there;
    };
    assert.equal(202 >= 3 * 0.875 * 76, true);
    assert.equal(named(76), true, 'three lines fit the plot');
    assert.equal(202 >= 3 * 0.875 * 80, false);
    assert.equal(named(80), false, 'three lines do not');
  });

  it('where the amounts are written inside the plot, it is left out unless it starts clear of them', () => {
    // More than twice the text size, on a chart drawn outside a tool, whose gridlines keep full amounts.
    const fs = 0.875 * 36;
    const clearBy = (saveYears: number) => {
      const { unmount } = drawChart({ saveYears, start: 500_000, withdrawal: 20_000, withdrawYears: 40 - saveYears }, { chartWords: null });
      const p = plotBox();
      const amounts = all('text.mcs-axisAmount--inside:not([data-sample])').map((a) => [...(a.textContent ?? '')].length);
      assert.ok(amounts.length >= 2, 'the case: the amounts are inside the plot');
      const shade = one('rect.mcs-phase');
      assert.ok(num(shade, 'width') >= words.livingOff.length * fs * 0.6 + 20, 'the case: room across for the name');
      // The amounts start 6 in from the plot's edge; the name starts 10 into the shade and keeps a letter's height clear.
      const by = num(shade, 'x') + 10 - (p.x + 6 + Math.max(...amounts) * fs * 0.6 + fs);
      const named = Boolean(document.querySelector('.mcs-phaseLabel'));
      unmount();
      return { by, named };
    };
    laidOut({ textSize: 36 }, () => {
      const under = clearBy(15);
      assert.ok(under.by <= 0 && under.by > -12, `the case: just under the amounts (${under.by})`);
      assert.equal(under.named, false);
      const clear = clearBy(16);
      assert.ok(clear.by > 0 && clear.by < 12, `the case: just clear of them (${clear.by})`);
      assert.equal(clear.named, true);
    });
  });
});
