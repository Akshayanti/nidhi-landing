/**
 * The sentence under each currency in the net worth calculator (#790): what
 * it says for the spending currency at every size of share, for a debt, for
 * a currency with no rate or no share, and how far a 10% move in another
 * currency moves net worth, written in the page's own number style. It states
 * sizes and never says what to do.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 * Every expected figure is worked out here from those.
 */
import { draw, island, own, owe, position, text, worked, type Style } from '../../test/netWorthParts.results.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CurrencyPosition } from '../utils/multi-currency-net-worth/math.ts';
import { Recommendation } from './MultiCurrencyNetWorth.tsx';

type Shown = { hidePct?: boolean; noShares?: boolean; currency?: string };

/** The sentence the card shows for one position. */
function said(pos: CurrencyPosition, shown: Shown = {}, style: Style = {}) {
  const drawn = draw(
    <Recommendation pos={pos} functionalCurrency={shown.currency ?? 'EUR'} hidePct={shown.hidePct} noShares={shown.noShares} strings={island} />,
    style,
  );
  const lines = text('.mcnw-riskRec');
  drawn.unmount();
  assert.equal(lines.length, 1, `one sentence, not ${lines.length}`);
  return lines[0];
}

/** A position as the calculator works it out, with its share set by hand to a boundary. */
const at = (pos: CurrencyPosition, pctOfTotal: number): CurrencyPosition => ({ ...pos, pctOfTotal });

describe('the spending currency', () => {
  it('most of net worth: says the share and the rest', () => {
    // 3,000 euros and 2,000 dollars (1,000 euros): 75% and 25% of 4,000.
    const eur = position(worked([own('3000'), own('2000', 'USD')]), 'EUR');
    assert.equal(said(eur), '75% of your net worth is in your spending currency (EUR). The remaining 25% sits in other currencies and moves with their exchange rates.');
  });

  it('exactly half is not most of it', () => {
    // 1,000 euros and 2,000 dollars (1,000 euros).
    const eur = position(worked([own('1000'), own('2000', 'USD')]), 'EUR');
    assert.equal(said(eur), format(island.rec.functionalMuch, '50', '50'));
  });

  it('a quarter: a meaningful share moves with other currencies', () => {
    // 1,000 euros and 6,000 dollars (3,000 euros): 25% of 4,000.
    const eur = position(worked([own('1000'), own('6000', 'USD')]), 'EUR');
    assert.equal(said(eur), '25% of your net worth is in your spending currency (EUR). The remaining 75% is held in other currencies, so a meaningful share of your day-to-day purchasing power moves with their exchange rates.');
  });

  it('exactly a fifth is little of it', () => {
    // 1,000 euros and 8,000 dollars (4,000 euros): 20% of 5,000.
    const eur = position(worked([own('1000'), own('8000', 'USD')]), 'EUR');
    assert.equal(said(eur), 'Only 20% of your net worth is in your spending currency (EUR). The remaining 80% is held in other currencies, so most of your purchasing power moves with their exchange rates.');
  });

  it('nothing left in it once its own debt is taken off: none of net worth, all of it elsewhere', () => {
    // 500 euros held and 500 owed, 2,000 dollars (1,000 euros): the euro is 0% of 1,000.
    const eur = position(worked([own('500'), owe('500'), own('2000', 'USD')]), 'EUR');
    assert.equal(eur.netAmountOriginal, 0);
    assert.equal(said(eur), format(island.rec.functionalLittle, '0', '100'));
  });

  it('more than the whole of net worth, when the debt is in another currency', () => {
    // 3,000 euros held, 2,000 dollars (1,000 euros) owed: 3,000 of 2,000 is 150%.
    const eur = position(worked([own('3000'), owe('2000', 'USD')]), 'EUR');
    assert.equal(said(eur), 'What you hold in your spending currency (EUR) comes to 150% of your net worth, more than the whole of it. The difference is what you owe, net, in other currencies.');
  });

  it('a share that rounds to 101% is over the whole; one that rounds to 100% is all of it, with none left', () => {
    const eur = position(worked([own('3000'), owe('2000', 'USD')]), 'EUR');
    assert.equal(said(at(eur, 100.5)), format(island.rec.functionalOver, '101'));
    assert.equal(said(at(eur, 100.4)), format(island.rec.functionalMost, '100', '0'));
  });

  it('owing more than is held in it, with net worth held elsewhere', () => {
    // 1,000 euros owed, 6,000 dollars (3,000 euros): net worth 2,000.
    const eur = position(worked([owe('1000'), own('6000', 'USD')]), 'EUR');
    assert.ok(eur.pctOfTotal < 0);
    assert.equal(said(eur), 'You owe more than you hold in your spending currency (EUR), so your net worth sits in other currencies and moves with their exchange rates.');
  });

  describe('with nothing left after debts', () => {
    it('a debt in the spending currency is said, and no share', () => {
      // 5,000 euros owed, 2,000 dollars (1,000 euros) held: minus 4,000.
      const result = worked([owe('5000'), own('2000', 'USD')]);
      assert.equal(said(position(result, 'EUR'), { noShares: result.noShares }), 'You owe more than you hold in your spending currency (EUR). Your net worth is zero or negative, so a share of it cannot be calculated.');
    });

    it('something held in it, or nothing at all, only says there is no share', () => {
      // 1,000 euros held, 4,000 dollars (2,000 euros) owed: minus 1,000.
      const held = worked([own('1000'), owe('4000', 'USD')]);
      assert.equal(said(position(held, 'EUR'), { noShares: held.noShares }), island.rec.unbandedHidden);
      // 500 euros held and 500 owed, 2,000 dollars owed.
      const even = worked([own('500'), owe('500'), owe('2000', 'USD')]);
      assert.equal(position(even, 'EUR').netAmountOriginal, 0);
      assert.equal(said(position(even, 'EUR'), { noShares: even.noShares }), island.rec.unbandedHidden);
    });
  });

  it('a view without shares says only that it is the spending currency, whatever the amounts', () => {
    const result = worked([owe('5000'), own('2000', 'USD')]);
    assert.equal(said(position(result, 'EUR'), { hidePct: true, noShares: true }), island.rec.functionalHidden);
    assert.equal(said(position(worked([own('3000'), own('2000', 'USD')]), 'EUR'), { hidePct: true }), 'This is your spending currency. The concentration percentage is not included in this share.');
  });

  it('names the spending currency the page uses', () => {
    // In dollars: 2,000 dollars and 1,000 euros (2,000 dollars): half each.
    const usd = position(worked([own('2000', 'USD'), own('1000')], 'USD', { USD: 1, EUR: 0.5 }), 'USD');
    assert.equal(said(usd, { currency: 'USD' }), format(island.rec.functionalMuch, '50', '50').replace('(EUR)', '(USD)'));
  });
});

describe('another currency', () => {
  it('with no rate: left out of the total and the shares, by name', () => {
    const czk = position(worked([own('1000'), own('700', 'CZK')], 'EUR', { EUR: 1, USD: 2 }), 'CZK');
    assert.equal(said(czk), 'There is no reference rate for CZK against EUR on this page, so this currency is left out of the total and the shares.');
    // Whatever else the view hides.
    assert.equal(said(czk, { hidePct: true, noShares: true }), said(czk));
  });

  it('owed more than held: how a move in it works the other way round', () => {
    // 5,000 euros, 2,000 dollars owed (1,000 euros).
    const usd = position(worked([own('5000'), owe('2000', 'USD')]), 'USD');
    assert.equal(said(usd), 'You owe more than you hold in USD (a “net debt” position). When you have more liabilities than assets in a currency, it works the other way round: if USD strengthens against EUR, what you owe grows and your net worth falls; if USD weakens, your net worth rises.');
  });

  describe('with nothing left after debts', () => {
    // 5,000 euros owed, 2,000 dollars (1,000 euros) held: no share, but a tenth of 1,000 is 100.
    const result = worked([owe('5000'), own('2000', 'USD')]);
    const usd = position(result, 'USD');

    it('says what a 10% move does: a tenth of the holding, as a whole amount', () => {
      assert.equal(usd.riskLevel, 'unbanded');
      assert.equal(said(usd, { noShares: true }), 'Your net worth is zero or negative, so a share of it cannot be calculated. If USD rises or falls 10% against EUR, your net worth rises or falls with it by about €100.');
      // 25 dollars are 12.50 euros, a tenth of which rounds to one euro.
      const small = position(worked([owe('5000'), own('25', 'USD')]), 'USD');
      assert.equal(said(small, { noShares: true }), format(island.rec.unbandedShown, '', '', '€1'));
    });

    it('a tenth that rounds to nothing, or a view without amounts, says only that there is no share', () => {
      // 8 dollars are 4 euros: a tenth is 0.40.
      const tiny = position(worked([owe('5000'), own('8', 'USD')]), 'USD');
      assert.equal(said(tiny, { noShares: true }), island.rec.unbandedHidden);
      assert.equal(said(usd, { hidePct: true, noShares: true }), island.rec.unbandedHidden);
    });

    it('a holding arriving as a minus moves net worth by the same tenth', () => {
      assert.equal(said({ ...usd, netAmountFunctional: -1000 }, { noShares: true }), said(usd, { noShares: true }));
    });

    it('writes the amount in the page’s own style', () => {
      assert.match(said(usd, { noShares: true }, { amountLocale: 'es' }), /by about 100\s€\.$/);
    });
  });

  describe('a share of net worth, and how far a 10% move takes it', () => {
    it('elevated: half of net worth moves it 5%', () => {
      // 2,000 euros and 400,000 yen (2,000 euros).
      const jpy = position(worked([own('2000'), own('400000', 'JPY')]), 'JPY');
      assert.equal(jpy.riskLevel, 'elevated');
      assert.equal(said(jpy), '50% of your net worth sits in JPY. If JPY rises or falls 10% against EUR, your net worth rises or falls with it by roughly 5%.');
      assert.equal(said(jpy, { hidePct: true }), 'Your JPY position is a large share of net worth in this share. If JPY rises or falls 10% against EUR, your net worth rises or falls with it by a meaningful amount.');
    });

    it('moderate: 30% of net worth moves it 3%', () => {
      // 7,000 euros and 6,000 dollars (3,000 euros): 30% of 10,000.
      const usd = position(worked([own('7000'), own('6000', 'USD')]), 'USD');
      assert.equal(usd.riskLevel, 'moderate');
      assert.equal(said(usd), '30% of your net worth is in USD. If USD rises or falls 10% against EUR, your net worth rises or falls with it by roughly 3%.');
      assert.equal(said(usd, { hidePct: true }), 'A moderate share of your net worth is in USD. If USD rises or falls 10% against EUR, your net worth rises or falls with it by about a tenth of the share held in USD.');
    });

    it('low: 5% moves it half a percent, and the small band says so without a share', () => {
      // 9,500 euros and 1,000 dollars (500 euros): 5% of 10,000.
      const usd = position(worked([own('9500'), own('1000', 'USD')]), 'USD');
      assert.equal(usd.riskLevel, 'low');
      assert.equal(said(usd), '5% of your net worth is in USD. If USD rises or falls 10% against EUR, your net worth rises or falls with it by roughly 0.5%.');
      assert.equal(said(usd, { hidePct: true }), 'A small share of your net worth is in USD. The USD/EUR rate has only a limited effect on your overall net worth.');
    });

    it('a move of exactly one percent is written whole', () => {
      // 9,000 euros and 2,000 dollars (1,000 euros): 10% of 10,000.
      const usd = position(worked([own('9000'), own('2000', 'USD')]), 'USD');
      assert.equal(said(usd), format(island.rec.lowShown, '10', '1'));
    });

    it('a move under a tenth of a percent is written as a tenth', () => {
      // 9,960 euros and 80 dollars (40 euros): 0.4% of 10,000, which moves it 0.04%.
      const usd = position(worked([own('9960'), own('80', 'USD')]), 'USD');
      assert.equal(said(usd), format(island.rec.lowShown, '0', '0.1'));
    });

    it('a share arriving as a minus is stated as its size', () => {
      const usd = position(worked([own('7000'), own('6000', 'USD')]), 'USD');
      assert.equal(said(at(usd, -30)), said(usd));
    });

    it('in the page’s own number style, to a whole percent from one up and to a tenth below', () => {
      // 15%: a 1.5% move, written whole. 5%: half a percent.
      const fifteen = position(worked([own('8500'), own('3000', 'USD')]), 'USD');
      assert.equal(said(fifteen, {}, { amountLocale: 'es' }), format(island.rec.lowShown, '15', '2'));
      const five = position(worked([own('9500'), own('1000', 'USD')]), 'USD');
      assert.equal(said(five, {}, { amountLocale: 'es' }), format(island.rec.lowShown, '5', '0,5'));
    });
  });
});

/**
 * A sentence from the catalog with its figures filled in by hand: the share,
 * then the rest (or the sensitivity), then an amount, in EUR and USD.
 */
function format(template: string, pct: string, second = '', amount = '') {
  return template
    .replaceAll('{pct}', pct)
    .replaceAll('{rest}', second)
    .replaceAll('{sensitivity}', second)
    .replaceAll('{amount}', amount)
    .replaceAll('{currency}', 'EUR')
    .replaceAll('{code}', 'USD');
}
