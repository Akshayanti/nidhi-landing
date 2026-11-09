import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prepare, queryWords, search, type SearchItem } from './siteSearch.ts';

const items: SearchItem[] = [
  { id: 'credit-and-credit-scores', kind: 'lesson', title: 'Credit and Credit Scores: What They Are and Why They Matter', terms: ['credit', 'debt'], text: 'How credit works and how a score is built.' },
  { id: 'how-to-get-out-of-debt', kind: 'lesson', title: 'How to Get Out of Debt: Snowball vs. Avalanche', terms: ['debt'], text: 'Two ways to order your debts.' },
  { id: 'minimum-payment', kind: 'guide', title: 'What does the minimum payment on my credit-card bill mean?', terms: ['credit card', 'card bill', 'minimum payment'], text: 'The smallest amount the card company accepts by the due date.' },
  { id: 'scam-message', kind: 'guide', title: 'How can I check a suspicious money message?', terms: ['scam', 'fraud', 'phishing'], text: 'Stop, check through a channel you find yourself.' },
  { id: 'shared-households', kind: 'lesson', title: 'Shared Households: Splitting Rent and Bills Fairly With Flatmates', terms: ['housing'], text: 'Splitting renting costs.' },
  { id: 'currencies', kind: 'lesson', title: 'Managing Money Across Currencies', terms: ['currency'], text: 'Current accounts in two countries.' },
];
const prepared = prepare(items);
const ids = (q: string) => search(prepared, q).map((i) => i.id);

describe('site search', () => {
  it('finds "credit card", which the old whole-string search missed', () => {
    assert.ok(ids('credit card').includes('minimum-payment'));
    assert.ok(ids('credit cards').includes('minimum-payment'));
  });

  it('answers a full question, ignoring filler words', () => {
    assert.deepEqual(queryWords('How do I pay my credit card bill?'), ['pay', 'credit', 'card', 'bill']);
    assert.equal(ids('What does the minimum payment on my credit card mean?')[0], 'minimum-payment');
    assert.equal(ids('is this message a scam?')[0], 'scam-message');
  });

  it('puts the guide first when a guide and a lesson match equally', () => {
    assert.equal(ids('credit')[0], 'minimum-payment');
    assert.equal(ids('fraud')[0], 'scam-message');
  });

  it('matches everyday words to the lessons\' words', () => {
    assert.ok(ids('I owe money').includes('how-to-get-out-of-debt'));
  });

  it('matches word starts, not the middle of a word', () => {
    assert.deepEqual(ids('rent'), ['shared-households']);
  });

  it('returns nothing for a query of filler words only', () => {
    assert.deepEqual(ids('how do I'), []);
  });
});
