/**
 * The loan comparison's analysis tabs as a list (`analysisTabs` in
 * LoanCompare.tsx), tested without a browser: which tabs there are, the order
 * they read in, and the name and hint each one takes from the page's words.
 * The ids are what a share link stores (`t=horizon`) and what the analytics
 * label of each tab ends in, so they are written out here.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dict } from '../i18n/index.ts';
import { analysisTabs } from './LoanCompare.tsx';

const island = dict('en').tools.loanComparison.island;

describe('the analysis tabs, as a list', () => {
  it('lists charts, horizon, refinance and how it works, in that order, with the English words', () => {
    assert.deepEqual(analysisTabs(island), [
      { id: 'charts', label: 'Charts', hint: 'Balance over time and how each payment splits' },
      { id: 'horizon', label: 'Horizon', hint: 'Where you stand if you sell or refinance early' },
      { id: 'refi', label: 'Refinance', hint: 'Compare keep vs. refinance with break-even' },
      { id: 'how', label: 'How it works', hint: 'Formula and methodology' },
    ]);
  });

  it('keeps the ids and takes only the words from another language', () => {
    const hindi = dict('hi').tools.loanComparison.island;
    const tabs = analysisTabs(hindi);
    assert.deepEqual(tabs.map((t) => t.id), ['charts', 'horizon', 'refi', 'how']);
    assert.deepEqual(tabs.map((t) => t.label), [hindi.tabs.charts.label, hindi.tabs.horizon.label, hindi.tabs.refi.label, hindi.tabs.how.label]);
    assert.deepEqual(tabs.map((t) => t.hint), [hindi.tabs.charts.hint, hindi.tabs.horizon.hint, hindi.tabs.refi.hint, hindi.tabs.how.hint]);
    assert.notEqual(tabs[0].label, 'Charts');
  });
});
