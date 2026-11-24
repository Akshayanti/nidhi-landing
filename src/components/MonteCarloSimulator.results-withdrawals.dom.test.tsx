/**
 * The Monte Carlo simulator's results in words, for a plan of withdrawals
 * (#790): how often the money lasted, in every case the words differ.
 */
import { island, settle, openPlan, drawdown, one, money, retype, choosePaths } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('the results in words: withdrawals', () => {
  it('withdrawals: how often the money lasted, in every case the words differ', async () => {
    openPlan(drawdown(30_000));
    await settle(20);
    {
      // lasting in some paths: the share, in tenths and in percent, and when it ran out
      assert.equal(one('.mcs-lastedHead').textContent, `Taking ${money(30_000)} a year, the money lasted all 30 years in 6 in 10 simulated paths (58%).`);
      assert.equal(one('.mcs-lastedHead strong').textContent, '6 in 10');
      assert.equal(one('.mcs-lasted .mcs-note').textContent, 'Among the paths where it ran out, the median year it did so was year 21 of 30.');
      assert.equal(one('.mcs-quick .mcs-quickRange').textContent, 'The money lasted all 30 years in 6 in 10 paths.');
      assert.equal(document.querySelector('.mcs-quickTitle'), null, 'no saving, no median of it');
      assert.equal(document.querySelector('.mcs-cards'), null);
    }
    {
      // nearly every path: more than 9 in 10, never all
      await retype(island.withdraw.amountLabel, '16000');
      assert.equal(one('.mcs-lastedHead strong').textContent, island.inTenMore);
      assert.ok(one('.mcs-lastedHead').textContent?.endsWith('(95%).'));
    }
    {
      // nearly no path: fewer than 1 in 10
      await retype(island.withdraw.amountLabel, '60000');
      assert.equal(one('.mcs-lastedHead strong').textContent, island.inTenFewer);
      assert.ok(one('.mcs-lastedHead').textContent?.endsWith('(2%).'));
    }
    {
      // every path lasting, and none
      await retype(island.withdraw.amountLabel, '1000');
      assert.equal(one('.mcs-lastedHead').textContent, `Taking ${money(1_000)} a year, the money lasted all 30 years in every simulated path.`);
      assert.equal(one('.mcs-quick .mcs-quickRange').textContent, 'The money lasted all 30 years in every path.');
      assert.equal(document.querySelector('.mcs-lasted .mcs-note'), null, 'no year it ran out');
      await retype(island.withdraw.amountLabel, '200000');
      assert.equal(one('.mcs-lastedHead').textContent, `Taking ${money(200_000)} a year, the money ran out before the 30 years were over in every simulated path.`);
      assert.equal(one('.mcs-quick .mcs-quickRange').textContent, 'The money ran out before the 30 years were over in every path.');
    }
    {
      // a share that rounds to all or none keeps a decimal, so it never says all or none
      await choosePaths('1000');
      await retype(island.withdraw.amountLabel, '11000');
      assert.ok(one('.mcs-lastedHead').textContent?.endsWith('(99.6%).'));
      await retype(island.withdraw.amountLabel, '74000');
      assert.ok(one('.mcs-lastedHead').textContent?.endsWith('(0.3%).'));
    }
    {
      // one year of withdrawals has words of its own, in every case
      await choosePaths('100');
      await retype(island.fields.start, '100000');
      await retype(island.withdraw.yearsLabel, '1');
      const cases: Array<[number, string, string]> = [
        [95_000, `Taking ${money(95_000)} for one year, the money lasted the full year in 9 in 10 simulated paths (89%).`, 'The money lasted the full year in 9 in 10 paths.'],
        [1_000, `Taking ${money(1_000)} for one year, the money lasted the full year in every simulated path.`, island.quick.lastedAllOne],
        [900_000, `Taking ${money(900_000)} for one year, the money ran out before the year was over in every simulated path.`, island.quick.lastedNoneOne],
      ];
      for (const [withdrawal, head, quick] of cases) {
        await retype(island.withdraw.amountLabel, String(withdrawal));
        assert.equal(one('.mcs-lastedHead').textContent, head);
        assert.equal(one('.mcs-quick .mcs-quickRange').textContent, quick);
      }
    }
  });

  it('a share that rounds to all or none, in a page’s own style', async () => {
    openPlan(drawdown(11_000, { paths: 1_000 }), { amountLocale: 'es' });
    await settle(20);
    assert.match(one('.mcs-lastedHead').textContent ?? '', /\(99,6\s%\)\.$/);
  });
});
