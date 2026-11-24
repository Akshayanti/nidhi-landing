/**
 * The invest or pay off calculator's range chart (#790): each path's 10th to
 * 90th scenario as a bar with the middle marked, on one scale that spans
 * both, with room around them and a line at zero when the scale crosses it.
 *
 * Every position below is worked out by hand from the chart's rule: the
 * span is the distance from the lowest 10th to the highest 90th (at least 5%
 * of the top, and at least 1); the scale starts 15% of the span below the
 * lowest figure (5% when the figures cross zero) and ends 5% above the highest.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draw, island, money, none, one, text } from '../../test/investOrPayOffParts.results.tsx';
import { RangeChart } from './InvestOrPayOff.tsx';

type P = { p10: number; p50: number; p90: number };
const chart = (a: P, b: P) => draw(
  <RangeChart strings={island} money={money} paths={[{ name: 'Paying off first', p: a }, { name: 'Investing the extra', p: b }]} />,
);

/** A style's percentage as a number: "17.4%" or "calc(19.61%)". */
const percent = (css: string | undefined) => Number(/(-?[\d.]+)%/.exec(css ?? '')?.[1] ?? Number.NaN);

/** Each row's bar (left and width) and middle mark, in percent of the track. */
function bars() {
  return [...document.querySelectorAll('.iop-chartRow')].map((row) => {
    const bar = row.querySelector('.iop-bar') as HTMLElement;
    const mid = row.querySelector('.iop-mid') as HTMLElement;
    return { left: percent(bar.style.left), width: percent(bar.style.width), mid: percent(mid.style.left) };
  });
}
const zeros = () => [...document.querySelectorAll('.iop-zero')].map((z) => percent((z as HTMLElement).style.left));

const near = (actual: number, expected: number, what: string) => assert.ok(Math.abs(actual - expected) < 0.006, `${what}: ${actual} is not ${expected}`);

/**
 * The rows sit on a scale from `lo` to `hi`, worked out by hand for each
 * case: each figure at its place on it, to a hundredth of a percent.
 */
function onScale(lo: number, hi: number, paths: P[]) {
  const at = (v: number) => Math.round(((v - lo) / (hi - lo)) * 10_000) / 100;
  const drawn = bars();
  assert.equal(drawn.length, paths.length);
  paths.forEach((p, i) => {
    near(drawn[i].left, at(p.p10), `row ${i} left`);
    near(drawn[i].width, at(p.p90) - at(p.p10), `row ${i} width`);
    near(drawn[i].mid, at(p.p50), `row ${i} middle`);
  });
  return at;
}

describe('the range chart', () => {
  it('names itself and each path with its three figures, the bars hidden from screen readers', () => {
    chart({ p10: 100, p50: 200, p90: 300 }, { p10: 50, p50: 250, p90: 900 });
    const figure = one('figure');
    assert.equal(figure.className, 'iop-chart');
    assert.equal(figure.getAttribute('data-attr'), 'free-invest-or-pay-off-chart');
    assert.equal(one('figcaption').textContent, island.results.chartTitle);
    assert.deepEqual(text('.iop-chartLabel'), [
      'Paying off first: €100 to €300, middle €200',
      'Investing the extra: €50 to €900, middle €250',
    ]);
    assert.deepEqual(text('.iop-track').length, 2);
    for (const track of document.querySelectorAll('.iop-track')) assert.equal(track.getAttribute('aria-hidden'), 'true');
  });

  it('every figure in the chart shares the size of the longest', () => {
    chart({ p10: 100, p50: 200, p90: 300 }, { p10: 50, p50: 250, p90: 1_000_000 });
    const sizes = [...document.querySelectorAll('.iop-chartLabel .amt')].map((a) => (a as HTMLElement).style.getPropertyValue('--amt-len'));
    assert.deepEqual(sizes, Array(6).fill('8.1'));
  });

  const cases: Array<[string, P, P, number, number, boolean]> = [
    // low 50, high 900, span 850.
    ['all above zero: the scale starts 15% of the span below the lowest, which can still reach below zero', { p10: 100, p50: 200, p90: 300 }, { p10: 50, p50: 250, p90: 900 }, -77.5, 942.5, true],
    // low -500, high 600, span 1100.
    ['across zero: 5% of the span below the lowest, and a line at zero', { p10: -300, p50: -100, p90: 100 }, { p10: -500, p50: 0, p90: 600 }, -555, 655, true],
    // low 0, high 100, span 100.
    ['starting exactly at zero is not across it', { p10: 0, p50: 50, p90: 100 }, { p10: 0, p50: 25, p90: 80 }, -15, 105, true],
    // low -100, high 0, span 100.
    ['ending exactly at zero is not across it either', { p10: -100, p50: -50, p90: 0 }, { p10: -80, p50: -40, p90: -20 }, -115, 5, true],
    // low -500, high -100, span 400.
    ['all below zero: no line at zero', { p10: -500, p50: -300, p90: -100 }, { p10: -400, p50: -200, p90: -100 }, -560, -80, false],
    // span 5% of 1000.
    ['no spread: the span is 5% of the top', { p10: 1000, p50: 1000, p90: 1000 }, { p10: 1000, p50: 1000, p90: 1000 }, 992.5, 1002.5, false],
    // span 5% of the size of -1000.
    ['no spread below zero: 5% of the top’s size', { p10: -1000, p50: -1000, p90: -1000 }, { p10: -1000, p50: -1000, p90: -1000 }, -1007.5, -997.5, false],
    // span 1.
    ['nothing at all: the span is 1, and zero is marked', { p10: 0, p50: 0, p90: 0 }, { p10: 0, p50: 0, p90: 0 }, -0.15, 0.05, true],
    // low 1000, high 1010: span max(10, 50.5) = 50.5.
    ['a small spread far from zero still spans 5% of the top', { p10: 1000, p50: 1005, p90: 1010 }, { p10: 1002, p50: 1004, p90: 1008 }, 992.425, 1012.525, false],
    // low 0.2, high 0.6: span max(0.4, 0.03, 1) = 1.
    ['a spread under 1 spans 1', { p10: 0.2, p50: 0.4, p90: 0.6 }, { p10: 0.3, p50: 0.4, p90: 0.5 }, 0.05, 0.65, false],
    // low 3, high 23, span 20: the scale starts exactly at zero, so there is no line.
    ['a scale that starts exactly at zero draws no line there', { p10: 3, p50: 10, p90: 23 }, { p10: 5, p50: 12, p90: 20 }, 0, 24, false],
    // low -21, high -1, span 20: the scale ends exactly at zero.
    ['a scale that ends exactly at zero draws no line there', { p10: -21, p50: -10, p90: -1 }, { p10: -18, p50: -9, p90: -3 }, -24, 0, false],
  ];
  for (const [name, a, b, lo, hi, zero] of cases) {
    it(name, () => {
      chart(a, b);
      const at = onScale(lo, hi, [a, b]);
      if (zero) {
        const z = zeros();
        assert.equal(z.length, 2);
        for (const left of z) near(left, at(0), 'zero');
      } else {
        none('.iop-zero');
      }
    });
  }
});
