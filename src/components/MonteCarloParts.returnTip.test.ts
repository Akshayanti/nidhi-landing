/**
 * The Monte Carlo simulator's return settings (#790): `returnTip` describes a
 * setting with the rates the model runs at, written in the page's own style.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dict } from '../i18n/index.ts';
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
});
