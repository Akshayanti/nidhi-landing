/**
 * The net worth calculator's small helpers (#790): the words for each share
 * band (`riskLabel`, `riskBadge`), how many minor units a currency's amounts
 * are counted in (`getFactor`), and the result the share dialog previews
 * (`buildPreviewResult`), which must hold no amount when the link will not.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 * Every expected figure is worked out here from those.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DICTS } from '../i18n/index.ts';
import { aggregate, type AssetRow } from '../utils/multi-currency-net-worth/math.ts';
import { buildPreviewResult, getFactor, riskBadge, riskLabel } from './MultiCurrencyNetWorth.tsx';

const island = DICTS.en.tools.multiCurrencyNetWorth.island;
const RATES = { EUR: 1, USD: 2, JPY: 200, CZK: 25 };
const own = (value: string, currency: string): AssetRow => ({ name: '', value, currency, type: 'asset' });
const owe = (value: string, currency: string): AssetRow => ({ name: '', value, currency, type: 'liability' });
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

describe('the words for a share band', () => {
  it('the longer label names each band, and anything else reads as low', () => {
    assert.equal(riskLabel(island, 'functional'), 'Your spending currency');
    assert.equal(riskLabel(island, 'net-debt'), 'Net debt in this currency');
    assert.equal(riskLabel(island, 'elevated'), 'Elevated exposure');
    assert.equal(riskLabel(island, 'moderate'), 'Moderate exposure');
    assert.equal(riskLabel(island, 'unbanded'), 'No share of net worth');
    assert.equal(riskLabel(island, 'low'), 'Low exposure');
    assert.equal(riskLabel(island, ''), 'Low exposure');
  });

  it('the badge says the band and nothing more', () => {
    assert.equal(riskBadge(island, 'functional'), 'Spending currency');
    assert.equal(riskBadge(island, 'net-debt'), 'Net debt');
    assert.equal(riskBadge(island, 'elevated'), 'Elevated');
    assert.equal(riskBadge(island, 'moderate'), 'Moderate');
    assert.equal(riskBadge(island, 'unbanded'), 'No band');
    assert.equal(riskBadge(island, 'low'), 'Low');
    assert.equal(riskBadge(island, ''), 'Low');
  });

  it('the words come from the page’s own language', () => {
    const hi = DICTS.hi.tools.multiCurrencyNetWorth.island;
    assert.equal(riskLabel(hi, 'elevated'), hi.results.labelElevated);
    assert.notEqual(riskLabel(hi, 'elevated'), 'Elevated exposure');
    assert.equal(riskBadge(hi, 'net-debt'), hi.results.badgeNetDebt);
    assert.notEqual(riskBadge(hi, 'net-debt'), 'Net debt');
  });
});

describe('how many minor units a currency counts in', () => {
  it('a hundred cents to the euro and the dollar, and no smaller unit of yen', () => {
    assert.equal(getFactor('EUR'), 100);
    assert.equal(getFactor('USD'), 100);
    assert.equal(getFactor('JPY'), 1);
  });

  it('a currency the tools do not know counts in hundredths', () => {
    assert.equal(getFactor('ZZZ'), 100);
    assert.equal(getFactor(''), 100);
  });
});

describe('the result the share dialog previews', () => {
  // In euros: 1,000, 2,000 dollars is 1,000, 400,000 yen is 2,000. Net worth 4,000.
  const rows = [own('1000', 'EUR'), own('2000', 'USD'), own('400000', 'JPY')];
  const real = aggregate(rows, 'EUR', RATES);

  it('a full link previews the result as it is', () => {
    const preview = buildPreviewResult(real, true);
    assert.equal(preview.totalNetWorthFunctional, 4000);
    assert.equal(preview.hasRates, 'full');
    assert.equal(preview.noShares, false);
    assert.deepEqual(
      preview.positions.map((p) => [p.code, p.netAmountOriginal, p.netAmountFunctional, p.pctOfTotal, p.riskLevel]),
      [['EUR', 1000, 1000, 25, 'functional'], ['JPY', 400000, 2000, 50, 'elevated'], ['USD', 2000, 1000, 25, 'moderate']],
    );
  });

  it('a link without amounts previews none: shares and bands only, and no rates', () => {
    const preview = buildPreviewResult(real, false);
    assert.equal(preview.totalNetWorthFunctional, 0);
    assert.equal(preview.hasRates, 'none');
    assert.equal(preview.noShares, false);
    assert.deepEqual(
      preview.positions.map((p) => [p.code, p.netAmountOriginal, p.netAmountFunctional, p.pctOfTotal, p.riskLevel]),
      [['EUR', 0, 0, 25, 'functional'], ['JPY', 0, 0, 50, 'elevated'], ['USD', 0, 0, 25, 'moderate']],
    );
    // The result on the page keeps its amounts.
    assert.equal(real.positions[0].netAmountOriginal, 1000);
    assert.equal(real.totalNetWorthFunctional, 4000);
  });

  describe('with nothing left after debts', () => {
    // In euros: 5,000 owed, 2,000 dollars is 1,000, 200,000 yen is 1,000. Net worth minus 3,000.
    const under = aggregate([owe('5000', 'EUR'), own('2000', 'USD'), own('200000', 'JPY')], 'EUR', RATES);

    it('a link without amounts carries the concentration in place of a share', () => {
      const preview = buildPreviewResult(under, false);
      assert.equal(preview.noShares, true);
      assert.equal(preview.hasRates, 'none');
      assert.equal(preview.totalNetWorthFunctional, 0);
      // Sizes 5,000, 1,000 and 1,000 of 7,000.
      const shares = new Map(preview.positions.map((p) => [p.code, p.pctOfTotal]));
      close(shares.get('EUR')!, (5000 / 7000) * 100);
      close(shares.get('USD')!, (1000 / 7000) * 100);
      close(shares.get('JPY')!, (1000 / 7000) * 100);
      assert.ok(preview.positions.every((p) => p.netAmountOriginal === 0 && p.netAmountFunctional === 0));
    });

    it('a full link keeps the exposure, which is no share for what is held', () => {
      const preview = buildPreviewResult(under, true);
      assert.equal(preview.noShares, true);
      assert.equal(preview.totalNetWorthFunctional, -3000);
      const shares = new Map(preview.positions.map((p) => [p.code, p.pctOfTotal]));
      // The euro debt is 5,000 of the 3,000 shortfall.
      close(shares.get('EUR')!, (5000 / 3000) * 100);
      assert.equal(shares.get('USD'), 0);
      assert.equal(shares.get('JPY'), 0);
      assert.deepEqual(preview.positions.map((p) => [p.code, p.netAmountOriginal, p.netAmountFunctional]), [['EUR', -5000, -5000], ['USD', 2000, 1000], ['JPY', 200000, 1000]]);
    });

    it('a currency with no rate has no concentration: it is carried as zero', () => {
      // Koruna has no rate here. 5,000 owed and 1,000 held: sizes 5,000 and 1,000 of 6,000.
      const gap = aggregate([owe('5000', 'EUR'), own('2000', 'USD'), own('700', 'CZK')], 'EUR', { EUR: 1, USD: 2 });
      const preview = buildPreviewResult(gap, false);
      const shares = new Map(preview.positions.map((p) => [p.code, p.pctOfTotal]));
      assert.strictEqual(shares.get('CZK'), 0);
      close(shares.get('EUR')!, (5000 / 6000) * 100);
      close(shares.get('USD')!, (1000 / 6000) * 100);
    });
  });

  it('a missing rate stays missing in either preview', () => {
    const gap = aggregate([own('1000', 'EUR'), own('2000', 'USD'), own('700', 'CZK')], 'EUR', { EUR: 1, USD: 2 });
    assert.equal(gap.hasRates, 'partial');
    assert.equal(buildPreviewResult(gap, true).hasRates, 'partial');
    const preview = buildPreviewResult(gap, false);
    assert.equal(preview.hasRates, 'partial');
    assert.equal(preview.positions.find((p) => p.code === 'CZK')?.rateUnavailable, true);
    // Net worth is positive, so the shares are the exposure, as on the page.
    assert.equal(preview.positions.find((p) => p.code === 'EUR')?.pctOfTotal, 50);
    assert.equal(preview.positions.find((p) => p.code === 'USD')?.pctOfTotal, 50);
  });

  it('with no rates at all, both previews say so', () => {
    const none = aggregate(rows, 'EUR', null);
    assert.equal(buildPreviewResult(none, true).hasRates, 'none');
    assert.equal(buildPreviewResult(none, false).hasRates, 'none');
    assert.equal(buildPreviewResult(none, true).positions[0].netAmountOriginal, 400000);
  });
});
