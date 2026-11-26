/**
 * The Monte Carlo simulator's one-line answer about withdrawals (#790):
 * `inTen` words a share as tenths without claiming more than happened, and
 * `lastedLine` builds the sentence the quick answer and the files carry.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { monteCarloEn } from '../i18n/strings/tools/monteCarlo.ts';
import { inTen, lastedLine } from './MonteCarloSimulator.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { monteCarlo: monteCarloEn },
};

const island = TOOL_STRINGS.en.monteCarlo.island;

describe('a share of the paths, in tenths', () => {
  it('rounds to the nearest tenth in the middle of the range', () => {
    assert.equal(inTen(0.5, island), '5 in 10');
    assert.equal(inTen(0.84, island), '8 in 10');
    assert.equal(inTen(0.86, island), '9 in 10');
    assert.equal(inTen(0.949, island), '9 in 10');
  });

  it('says "more than 9 in 10" from 95%, never "10 in 10"', () => {
    assert.equal(inTen(0.95, island), 'more than 9 in 10');
    assert.equal(inTen(0.999, island), 'more than 9 in 10');
  });

  it('says "fewer than 1 in 10" below 5%, never "0 in 10"', () => {
    assert.equal(inTen(0.049, island), 'fewer than 1 in 10');
    assert.equal(inTen(0.001, island), 'fewer than 1 in 10');
    assert.equal(inTen(0.05, island), '1 in 10');
  });
});

describe('the one-line answer about withdrawals', () => {
  it('names the years and the share of paths in which the money lasted', () => {
    assert.equal(lastedLine(0.8, 30, island, null), 'The money lasted all 30 years in 8 in 10 paths.');
    assert.equal(lastedLine(0.97, 25, island, null), 'The money lasted all 25 years in more than 9 in 10 paths.');
    assert.equal(lastedLine(0.02, 25, island, null), 'The money lasted all 25 years in fewer than 1 in 10 paths.');
  });

  it('has a sentence of its own for every path and for no path', () => {
    assert.equal(lastedLine(1, 30, island, null), 'The money lasted all 30 years in every path.');
    assert.equal(lastedLine(0, 30, island, null), 'The money ran out before the 30 years were over in every path.');
  });

  it('speaks of "the year" when the withdrawals last one year', () => {
    assert.equal(lastedLine(0.8, 1, island, null), 'The money lasted the full year in 8 in 10 paths.');
    assert.equal(lastedLine(1, 1, island, null), 'The money lasted the full year in every path.');
    assert.equal(lastedLine(0, 1, island, null), 'The money ran out before the year was over in every path.');
  });

  it('reads the same on a page with its own number style', () => {
    assert.equal(lastedLine(0.8, 30, island, 'es'), 'The money lasted all 30 years in 8 in 10 paths.');
    assert.equal(lastedLine(0.8, 1, island, 'cs'), 'The money lasted the full year in 8 in 10 paths.');
    // Czech counts 2 to 4 its own way; the sentence for several years covers it.
    assert.equal(lastedLine(1, 3, island, 'cs'), 'The money lasted all 3 years in every path.');
  });
});
