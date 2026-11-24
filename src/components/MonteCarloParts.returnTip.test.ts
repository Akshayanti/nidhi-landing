/**
 * The Monte Carlo simulator's return settings (#790): `returnTip` describes a
 * setting with the rates the model runs at, written in the page's own style.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dict } from '../i18n/index.ts';
import { QUOTED_RATES } from '../utils/monte-carlo/math.ts';
import { returnTip } from './MonteCarloSimulator.tsx';

const island = dict('en').tools.monteCarlo.island;
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('a return setting’s description', () => {
  it('quotes the rates of that setting, to one decimal, as English writes them', () => {
    assert.equal(returnTip(island, 'cautious', null), 'Stocks grow about 4% a year after inflation and bonds about 1%: the low end of the long-run range. The ups and downs are as large as in history.');
    assert.equal(returnTip(island, 'historical', null), 'World markets from 1900 to 2025: stocks grew about 5.3% a year after inflation and bonds about 1.7%, with the ups and downs they actually had.');
    assert.equal(returnTip(island, 'optimistic', null), 'Stocks grow about 6% a year after inflation and bonds about 3%: the high end of the long-run range. The ups and downs are as large as in history.');
  });

  it('writes the rates in a page’s own style where it has one', () => {
    assert.equal(plain(returnTip(island, 'historical', 'es')), 'World markets from 1900 to 2025: stocks grew about 5,3 % a year after inflation and bonds about 1,7 %, with the ups and downs they actually had.');
  });

  it('without a style of its own, writes any rate plainly: one decimal, a closing .0 dropped, no grouping', () => {
    // The model's own rates never look like these; the table is changed for the test and put back.
    const kept = { ...QUOTED_RATES.cautious };
    const stocksAt = (rate: number) => {
      QUOTED_RATES.cautious.stocks = rate;
      return returnTip({ ...island, returnTips: { ...island.returnTips, cautious: '{stocks}' } }, 'cautious', null);
    };
    try {
      assert.equal(stocksAt(0.0015), '0.1%');
      assert.equal(stocksAt(-0), '0%');
      assert.equal(stocksAt(10), '1000%');
      assert.equal(stocksAt(Infinity), 'Infinity%');
      assert.equal(stocksAt(0.101), '10.1%');
      // Only a closing .0 goes: one inside a number too large to write out stays.
      assert.equal(stocksAt(1.05e19), `${(1.05e19 * 100).toFixed(1)}%`);
      assert.match(stocksAt(1.05e19), /^1\.05\d*e\+21%$/);
    } finally {
      Object.assign(QUOTED_RATES.cautious, kept);
    }
    assert.deepEqual(QUOTED_RATES.cautious, kept);
  });

  it('reads an empty style as none: the English text, and nothing thrown', () => {
    for (const setting of ['cautious', 'historical', 'optimistic'] as const) {
      assert.equal(returnTip(island, setting, ''), returnTip(island, setting, null));
    }
    assert.equal(returnTip(island, 'historical', ''), 'World markets from 1900 to 2025: stocks grew about 5.3% a year after inflation and bonds about 1.7%, with the ups and downs they actually had.');
  });
});
