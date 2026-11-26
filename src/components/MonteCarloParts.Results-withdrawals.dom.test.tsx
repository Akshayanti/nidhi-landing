/**
 * The Monte Carlo simulator's results panel for a plan with withdrawals
 * (#790): how often the money lasted, in every case the words differ, and
 * the year it ran out.
 */
import { draw, none, drawdown, island, one, text, worked, type Style } from '../../test/monteCarloParts.results.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Results } from './MonteCarloSimulator.tsx';

type Plan = ReturnType<typeof worked>;
const panel = (plan: Plan, style: Style = {}, shown: Plan = plan) =>
  draw(<Results result={shown.worded} exact={shown.exact} state={plan.state} code={plan.state.currency} busy={false} withheld={null} strings={island} actions={null} />, style);
const oneYear = (withdrawal: number) => drawdown(withdrawal, { start: 100_000, withdrawYears: 1 });

describe('the results of a plan with withdrawals', () => {
  it('lasting in some paths: the share in tenths and in percent, and the year it ran out', () => {
    panel(drawdown(30_000));
    assert.equal(one('.mcs-lastedHead').textContent, 'Taking €30,000 a year, the money lasted all 30 years in 6 in 10 simulated paths (58%).');
    assert.equal(one('.mcs-lastedHead strong').textContent, '6 in 10');
    assert.deepEqual(text('.mcs-lastedHead .amt').filter((a) => a.startsWith('€')), ['€30,000']);
    assert.deepEqual(text('.mcs-lasted .mcs-note'), ['Among the paths where it ran out, the median year it did so was year 21 of 30.']);
    assert.equal(one('#mcs-results-h').textContent, island.results.headingToday);
    // No saving: no amounts to compare, no single line, and nothing to add.
    assert.deepEqual(text('.mcs-note'), ['Among the paths where it ran out, the median year it did so was year 21 of 30.']);
    none('.mcs-cards');
    none('.mcs-cardsKey');
    assert.ok(document.querySelector('svg.mcs-chart'));
    assert.ok(document.querySelector('details'));
    assert.deepEqual([...one('.mcs-lasted').children].map((el) => el.className), ['mcs-lastedHead', 'mcs-note']);
  });

  it('nearly every path, and nearly none: never said as all or none', () => {
    let drawn = panel(drawdown(16_000));
    assert.equal(one('.mcs-lastedHead').textContent, 'Taking €16,000 a year, the money lasted all 30 years in more than 9 in 10 simulated paths (95%).');
    assert.equal(one('.mcs-lastedHead strong').textContent, island.inTenMore);
    assert.deepEqual(text('.mcs-lasted .mcs-note'), ['Among the paths where it ran out, the median year it did so was year 26 of 30.']);
    drawn.unmount();
    drawn = panel(drawdown(60_000));
    assert.equal(one('.mcs-lastedHead').textContent, 'Taking €60,000 a year, the money lasted all 30 years in fewer than 1 in 10 simulated paths (2%).');
    assert.equal(one('.mcs-lastedHead strong').textContent, island.inTenFewer);
  });

  it('every path: one sentence, and no year it ran out', () => {
    panel(drawdown(1_000));
    assert.equal(one('.mcs-lastedHead').textContent, 'Taking €1,000 a year, the money lasted all 30 years in every simulated path.');
    none('.mcs-lastedHead strong');
    assert.deepEqual(text('.mcs-lastedHead .amt').filter((a) => a.startsWith('€')), ['€1,000']);
    none('.mcs-lasted .mcs-note');
  });

  it('no path: one sentence, and the year it ran out', () => {
    panel(drawdown(200_000));
    assert.equal(one('.mcs-lastedHead').textContent, 'Taking €200,000 a year, the money ran out before the 30 years were over in every simulated path.');
    none('.mcs-lastedHead strong');
    assert.deepEqual(text('.mcs-lasted .mcs-note'), ['Among the paths where it ran out, the median year it did so was year 3 of 30.']);
  });

  it('one year of withdrawals has words of its own, in every case', () => {
    const cases: Array<[number, string]> = [
      [95_000, 'Taking €95,000 for one year, the money lasted the full year in 9 in 10 simulated paths (89%).'],
      [1_000, 'Taking €1,000 for one year, the money lasted the full year in every simulated path.'],
      [900_000, 'Taking €900,000 for one year, the money ran out before the year was over in every simulated path.'],
    ];
    for (const [withdrawal, words] of cases) {
      const { unmount } = panel(oneYear(withdrawal));
      assert.equal(one('.mcs-lastedHead').textContent, words);
      unmount();
    }
    panel(oneYear(95_000));
    assert.deepEqual(text('.mcs-lasted .mcs-note'), ['Among the paths where it ran out, the median year it did so was year 1 of 1.']);
  });

  it('in a page’s own style: the amount, the share, and the same words for one year and for many', () => {
    let drawn = panel(drawdown(30_000), { amountLocale: 'es' });
    assert.match(one('.mcs-lastedHead').textContent ?? '', /^Taking 30\.000\s€ a year, the money lasted all 30 years in 6 in 10 simulated paths \(58\s%\)\.$/);
    drawn.unmount();
    drawn = panel(oneYear(95_000), { amountLocale: 'es' });
    assert.match(one('.mcs-lastedHead').textContent ?? '', /^Taking 95\.000\s€ for one year, the money lasted the full year in 9 in 10 simulated paths \(89\s%\)\.$/);
    drawn.unmount();
    drawn = panel(oneYear(1_000), { amountLocale: 'es' });
    assert.match(one('.mcs-lastedHead').textContent ?? '', /^Taking 1000\s€ for one year, the money lasted the full year in every simulated path\.$/);
    drawn.unmount();
    panel(oneYear(900_000), { amountLocale: 'es' });
    assert.match(one('.mcs-lastedHead').textContent ?? '', /^Taking 900\.000\s€ for one year, the money ran out before the year was over in every simulated path\.$/);
  });

  it('saving, then withdrawals: the saving years’ amounts and single line, then how long the money lasted', () => {
    const plan = worked({ saveYears: 10, withdrawal: 30_000, withdrawYears: 20 });
    panel(plan);
    assert.equal(one('#mcs-results-h').textContent, 'After 10 years of saving');
    assert.deepEqual(text('.mcs-cardValue'), ['€160,000', '€250,000', '€340,000']);
    assert.deepEqual(text('.mcs-note'), [
      // The single line where the saving ends, not where the plan does.
      'A calculator that used the average return every year would draw a single line to €250,000. 51% of the simulated paths ended below it.',
      'Among the paths where it ran out, the median year it did so was year 10 of 20.',
    ]);
    assert.notEqual(plan.worded.straightLine[10], plan.worded.straightLine[30]);
    assert.equal(one('.mcs-lastedHead').textContent, 'Taking €30,000 a year, the money lasted all 20 years in 1 in 10 simulated paths (10%).');
    assert.deepEqual([...one('.tool-resultBody').children].map((el) => el.className.split(' ')[0]).slice(-4), ['mcs-note', 'mcs-lasted', 'mcs-caveat', 'mcs-tableWrap']);
  });

  it('says how long the money lasted only for a plan that takes money out, and only from a result that counted it', () => {
    // The page never draws a plan with another plan's result; the panel still keeps to both.
    let drawn = panel(worked(), {}, drawdown(30_000));
    none('.mcs-lasted');
    drawn.unmount();
    drawn = panel(drawdown(30_000), {}, worked());
    none('.mcs-lasted');
    assert.deepEqual(text('.mcs-note'), [], 'and a plan that takes money out is not asked to add some');
    drawn.unmount();
  });
});
