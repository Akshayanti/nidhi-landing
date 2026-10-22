import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { searchTitleProblem, titleWords } from './searchTitle.ts';

describe('search title rule', () => {
  it('passes a search title that shortens the page title', () => {
    assert.equal(searchTitleProblem('Account Consolidation: Combining Old Pensions and Bank Accounts', 'How to Consolidate Old Pensions and Bank Accounts'), null);
    assert.equal(searchTitleProblem('Growing Your Income: Salary Negotiation and Career Capital', 'Growing Income: Salary Negotiation and Career Capital'), null);
    assert.equal(searchTitleProblem('Polyamorous and Multi-Partner Households: Protecting Everyone', 'Polyamorous Households: Protecting Everyone'), null);
  });

  it('matches plurals and listed word forms, not shared prefixes', () => {
    assert.equal(searchTitleProblem('Buying a Home With Friends or Partners', 'Buying a Home With a Friend'), null);
    assert.match(searchTitleProblem('Planning Your Pension', 'Planned Pension') ?? '', /"planned" is not in/);
  });

  it('passes a lesson without a search title', () => {
    assert.equal(searchTitleProblem('Overconfidence and the Planning Fallacy', undefined), null);
  });

  it('rejects a search title that makes a different promise', () => {
    assert.match(
      searchTitleProblem("When the Default Plan Doesn't Fit You", 'Not Married? Who Gets Your Pension and Home if You Die') ?? '',
      /"married" is not in/,
    );
  });

  it('rejects words out of the title\'s order', () => {
    assert.match(
      searchTitleProblem('Advanced Rebalancing: Glide Paths and Bond Tents Near Retirement', 'Glide Paths and Bond Tents: Rebalancing Near Retirement') ?? '',
      /"rebalancing" is not in/,
    );
  });

  it('allows 57 characters and rejects 58', () => {
    const t = 'Caregivers: Protecting Your Pension During a Career Break';
    assert.equal(t.length, 57);
    assert.equal(searchTitleProblem(t, t), null);
    assert.match(searchTitleProblem(`${t}s`, `${t}s`) ?? '', /58 characters/);
  });

  it('lets small words be added but not stand alone', () => {
    assert.equal(searchTitleProblem('Account Consolidation: Combining Old Pensions and Bank Accounts', 'How to Consolidate Old Pensions'), null);
    assert.match(searchTitleProblem('Account Consolidation', 'How to') ?? '', /no words of its own/);
  });

  it('splits on hyphens and apostrophes and drops stop words', () => {
    assert.deepEqual(titleWords("Each Other's Multi-Partner Home"), ['each', 'other', 's', 'multi', 'partner', 'home']);
  });
});
