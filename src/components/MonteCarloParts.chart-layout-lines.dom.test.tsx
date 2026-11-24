/**
 * The Monte Carlo simulator's chart, its lines and bands (#790): every
 * year's point at its place across the plot and at its amount up the axis,
 * each line drawn as one stroke, and each band filled between its two edges.
 * Also the words of the axis title as they are measured. The chart is
 * mounted by itself, with a plan worked out for real.
 */
import {
  drawChart, withChartWords, all, one, plot, amountLabels, measuredSamples, titleLines, xOfYear, yOfAmount,
} from '../../test/monteCarloParts.chart-layout.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('the chart’s lines and bands', () => {
  /** One stroke through every year's amount, as the chart writes a line. */
  const stroke = (amounts: number[], top: number, first = 'M') =>
    amounts.map((v, i) => `${i === 0 ? first : 'L'}${xOfYear(i, amounts.length - 1).toFixed(1)},${yOfAmount(v, top).toFixed(1)}`).join(' ');
  const d = (el: Element) => el.getAttribute('d');

  it('each line is one stroke from today to the last year, through every year’s amount', () => {
    const { exact } = drawChart({ saveYears: 12 });
    assert.deepEqual(amountLabels().at(-1), '500');
    const top = 500_000;
    const of = (key: 'p10' | 'p25' | 'p50' | 'p75' | 'p90') => exact.bands.map((b) => b[key]);
    assert.equal(d(one('.mcs-median')), stroke(of('p50'), top));
    assert.equal(d(one('.mcs-medianGlow')), stroke(of('p50'), top));
    assert.equal(d(one('.mcs-straight')), stroke(exact.straightLine, top));
    const [high, low] = all('.mcs-edge--outer');
    const [upper, lower] = all('.mcs-edge--inner');
    assert.equal(d(high), stroke(of('p90'), top));
    assert.equal(d(low), stroke(of('p10'), top));
    assert.equal(d(upper), stroke(of('p75'), top));
    assert.equal(d(lower), stroke(of('p25'), top));
    assert.equal(xOfYear(12, 12), plot().right, 'the last year at the right edge of the plot');
  });

  it('each band is filled from its upper edge forward and back along its lower edge', () => {
    const { exact } = drawChart({ saveYears: 12 });
    const top = 500_000;
    const of = (key: 'p10' | 'p25' | 'p75' | 'p90') => exact.bands.map((b) => b[key]);
    /** The lower edge from the last year back to today, joined on with lines. */
    const back = (amounts: number[]) => stroke(amounts, top, 'L').split(' ').reverse().join(' ');
    const [outer, inner] = all('g[clip-path] > path:not([class])');
    assert.equal(d(outer), `${stroke(of('p90'), top)} ${back(of('p10'))} Z`);
    assert.equal(d(inner), `${stroke(of('p75'), top)} ${back(of('p25'))} Z`);
  });
});

describe('the axis title’s words', () => {
  it('are measured once each, whatever spaces the title is written with', () => {
    drawChart({ saveYears: 12 }, { strings: withChartWords({ axisYears: ' Years  from today ' }) });
    const words = measuredSamples().filter((s) => s.cls.includes('mcs-axisTitle')).map((s) => s.words);
    assert.deepEqual(words, ['Years', 'from', 'today']);
    assert.deepEqual(titleLines(), ['Years from today']);
  });
});
