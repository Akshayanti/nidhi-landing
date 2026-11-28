import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { shareCard, shareCardAlt } from './shareCard.ts';

describe('a page’s own share card', () => {
  it('names the page, then what it is, with one stop between', () => {
    assert.equal(shareCardAlt('What Is Net Worth?', 'A lesson from nidhi.'), 'What Is Net Worth? A lesson from nidhi.');
    assert.equal(shareCardAlt('Loan comparison', 'A free tool from nidhi.'), 'Loan comparison. A free tool from nidhi.');
    assert.equal(shareCardAlt(' Inflation calculator ', 'A free tool from nidhi.'), 'Inflation calculator. A free tool from nidhi.');
  });

  it('points at the card when it has been drawn', () => {
    assert.deepEqual(shareCard('tools', 'loan-comparison', 'Loan comparison', 'A free tool from nidhi.'), {
      image: '/brand/social/tools/loan-comparison.png',
      imageAlt: 'Loan comparison. A free tool from nidhi.',
    });
  });

  it('leaves the default card to a page whose card is not drawn yet', () => {
    assert.equal(shareCard('lessons', 'a-lesson-not-written-yet', 'Title', 'A lesson from nidhi.'), undefined);
  });

  it('has a card for each of the five tools', () => {
    const drawn = readdirSync('public/brand/social/tools').sort();
    assert.deepEqual(drawn, ['inflation-calculator.png', 'invest-or-pay-off.png', 'loan-comparison.png', 'monte-carlo-simulator.png', 'multi-currency-net-worth.png']);
  });
});
