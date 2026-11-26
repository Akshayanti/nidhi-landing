/**
 * The Monte Carlo simulator's printed report (#790): the answer it leads
 * with, worded as the quick answer words it, for every kind of plan, and the
 * number style its tables are written in.
 */
import { draw, drawdown, island, t, text, worked, type Style } from '../../test/monteCarloParts.results.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PrintedReport } from './MonteCarloSimulator.tsx';

type Plan = ReturnType<typeof worked>;
const report = (plan: Plan, style: Style = {}, shown: Plan = plan) =>
  draw(<PrintedReport strings={island} exportStrings={t.export} state={plan.state} result={shown.worded} />, style);
/** The report's answer: the paragraphs under its first heading. */
const answer = () => text('.tool-report > section:first-of-type > p');
/** A table's cells, row by row. */
const cells = (table: Element) => [...table.querySelectorAll('tbody tr')].map((row) => [...row.children].map((c) => c.textContent));

describe('the printed report', () => {
  it('a plan of saving: the median after the years, then the range', () => {
    report(worked());
    assert.deepEqual(answer(), ['Median after 30 years: €1,000,000', '8 in 10 paths between €600,000 and €2,100,000']);
    assert.equal(text('.tool-reportTitle')[0], island.export.tool);
  });

  it('one year of saving is worded as one year', () => {
    report(worked({ saveYears: 1 }));
    assert.deepEqual(answer(), ['Median after 1 year: €65,000', '8 in 10 paths between €56,000 and €74,000']);
  });

  it('a plan of withdrawals only: how often the money lasted, and nothing about saving', () => {
    report(drawdown(30_000));
    assert.deepEqual(answer(), ['The money lasted all 30 years in 6 in 10 paths.']);
  });

  it('saving, then withdrawals: all three lines', () => {
    report(worked({ saveYears: 10, withdrawal: 30_000, withdrawYears: 20 }));
    assert.deepEqual(answer(), [
      'Median after 10 years: €250,000',
      '8 in 10 paths between €160,000 and €340,000',
      'The money lasted all 20 years in 1 in 10 paths.',
    ]);
  });

  it('a plan with no saving and no withdrawals says what to add', () => {
    report(worked({ saveYears: 0 }));
    assert.deepEqual(answer(), [island.results.empty]);
  });

  it('says how long the money lasted only for a plan that takes money out, and only from a result that counted it', () => {
    // The page never prints a plan with another plan's result; the report still keeps to both.
    let drawn = report(worked({ saveYears: 0 }), {}, drawdown(30_000));
    assert.deepEqual(answer(), [island.results.empty]);
    drawn.unmount();
    drawn = report(drawdown(30_000), {}, worked({ saveYears: 0 }));
    assert.deepEqual(answer(), [island.results.empty]);
    drawn.unmount();
  });

  it('writes amounts in the plan’s currency, and its tables as English does unless the page has a style of its own', () => {
    let drawn = report(worked({ currency: 'USD' }));
    assert.equal(answer()[0], 'Median after 30 years: $1,000,000');
    const entered = () => cells(document.querySelector('.tool-report table') as Element).flat();
    assert.ok(entered().includes('50,000'), entered().join(' | '));
    drawn.unmount();
    drawn = report(worked(), { amountLocale: 'es' });
    assert.match(answer()[0], /^Median after 30 years: 1\.000\.000\s€$/);
    assert.ok(entered().includes('50.000'), entered().join(' | '));
    assert.ok(!entered().includes('50,000'));
  });
});
