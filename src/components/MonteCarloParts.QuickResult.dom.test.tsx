/**
 * The Monte Carlo simulator's quick answer, the headline result a phone shows
 * under the main inputs (#790): the median and the range after the saving
 * years, how often the money lasted, and how it looks while a run is under
 * way or its result is withheld.
 */
import { draw, none, drawdown, island, money, one, text, worked } from '../../test/monteCarloParts.results.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QuickResult } from './MonteCarloSimulator.tsx';

type Plan = ReturnType<typeof worked>;
const quick = (plan: Plan, change: Partial<{ busy: boolean; withheld: boolean }> = {}, amountLocale: string | null = null) =>
  draw(<QuickResult result={plan.worded} state={plan.state} busy={change.busy ?? false} withheld={change.withheld ?? false} strings={island} />, { amountLocale });

describe('the quick answer', () => {
  it('a plan of saving: the median after the years, and the range 8 in 10 paths fell in', () => {
    const plan = worked();
    quick(plan);
    assert.equal(one('.mcs-quickTitle').textContent, 'Median after 30 years');
    assert.equal(one('.mcs-quickValue').textContent, '€1,000,000');
    assert.equal(one('.mcs-quickValue').textContent, money(plan.worded.atRetirement.p50));
    assert.deepEqual(text('.mcs-quickRange'), ['8 in 10 paths between €600,000 and €2,100,000'], 'and nothing about withdrawals');
    // Each figure is one unit, never broken across lines.
    assert.deepEqual(text('.mcs-quickValue .amt'), ['€1,000,000']);
    assert.deepEqual(text('.mcs-quickRange .amt'), ['8', '10', '€600,000', '€2,100,000']);
  });

  it('is the full results said again, so a screen reader skips it', () => {
    quick(worked());
    assert.equal(one('.mcs-quick').getAttribute('aria-hidden'), 'true');
    assert.equal(one('.mcs-quick').className, 'mcs-quick');
  });

  it('one year of saving has a title of its own', () => {
    quick(worked({ saveYears: 1 }));
    assert.equal(one('.mcs-quickTitle').textContent, island.quick.medianOne);
    assert.equal(one('.mcs-quickValue').textContent, '€65,000');
    assert.deepEqual(text('.mcs-quickRange'), ['8 in 10 paths between €56,000 and €74,000']);
  });

  it('writes the amounts in the plan’s currency and the page’s own style', () => {
    const plan = worked({ currency: 'USD' });
    quick(plan, {}, 'es');
    assert.equal(one('.mcs-quickValue').textContent, money(1_000_000, 'USD', 'es'));
    assert.equal(one('.mcs-quickRange').textContent, `8 in 10 paths between ${money(600_000, 'USD', 'es')} and ${money(2_100_000, 'USD', 'es')}`);
    assert.notEqual(money(1_000_000, 'USD', 'es'), money(1_000_000, 'EUR', null));
  });

  it('a plan of withdrawals only: how often the money lasted, and no median of saving', () => {
    quick(drawdown(30_000));
    assert.deepEqual(text('.mcs-quickRange'), ['The money lasted all 30 years in 6 in 10 paths.']);
    none('.mcs-quickTitle');
    none('.mcs-quickValue');
  });

  it('withdrawals: every path, no path, and one year have words of their own', () => {
    const cases: Array<[Plan, string]> = [
      [drawdown(1_000), 'The money lasted all 30 years in every path.'],
      [drawdown(200_000), 'The money ran out before the 30 years were over in every path.'],
      [drawdown(16_000), 'The money lasted all 30 years in more than 9 in 10 paths.'],
      [drawdown(60_000), 'The money lasted all 30 years in fewer than 1 in 10 paths.'],
      [drawdown(95_000, { start: 100_000, withdrawYears: 1 }), 'The money lasted the full year in 9 in 10 paths.'],
      [drawdown(1_000, { start: 100_000, withdrawYears: 1 }), island.quick.lastedAllOne],
      [drawdown(900_000, { start: 100_000, withdrawYears: 1 }), island.quick.lastedNoneOne],
    ];
    for (const [plan, words] of cases) {
      const { unmount } = quick(plan);
      assert.deepEqual(text('.mcs-quickRange'), [words]);
      unmount();
    }
  });

  it('saving, then withdrawals: both answers, the saving first', () => {
    const plan = worked({ saveYears: 10, withdrawal: 30_000, withdrawYears: 20 });
    quick(plan);
    assert.equal(one('.mcs-quickTitle').textContent, 'Median after 10 years');
    assert.equal(one('.mcs-quickValue').textContent, '€250,000');
    assert.deepEqual(text('.mcs-quickRange'), [
      '8 in 10 paths between €160,000 and €340,000',
      'The money lasted all 20 years in 1 in 10 paths.',
    ]);
  });

  it('a plan with no saving and no withdrawals has no quick answer', () => {
    quick(worked({ saveYears: 0 }));
    none('.mcs-quick');
  });

  it('says nothing about withdrawals for a plan that takes nothing out, whatever result it is shown with', () => {
    // The moment between a plan and its result is never drawn by the page; the part still keeps to the plan.
    const saving = worked();
    const { unmount } = draw(<QuickResult result={drawdown(30_000).worded} state={saving.state} busy={false} withheld={false} strings={island} />);
    assert.equal(text('.mcs-quickRange').length, 1);
    unmount();
    draw(<QuickResult result={drawdown(30_000).worded} state={worked({ saveYears: 0 }).state} busy={false} withheld={false} strings={island} />);
    none('.mcs-quick');
  });

  it('is marked while a run is under way, and while its result is withheld', () => {
    const plan = worked();
    let drawn = quick(plan, { busy: true });
    assert.equal(one('.mcs-quick').className, 'mcs-quick mcs-quick--busy');
    drawn.unmount();
    drawn = quick(plan, { withheld: true });
    assert.equal(one('.mcs-quick').className, 'mcs-quick tool-withheld');
    drawn.unmount();
    quick(plan, { busy: true, withheld: true });
    assert.equal(one('.mcs-quick').className, 'mcs-quick mcs-quick--busy tool-withheld');
  });
});
