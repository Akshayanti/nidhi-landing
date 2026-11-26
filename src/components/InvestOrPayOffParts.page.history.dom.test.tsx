/**
 * The invest or pay off calculator as its page mounts it (#790): a country's
 * inflation history, fetched from the site's own origin the first time a
 * country is picked that the page did not arrive with, failing, refused and
 * arriving, and what the page says about each country then.
 *
 * The page keeps a fetched history for as long as it runs, across mounts,
 * and forgets a request that failed: so the tests that see a request fail
 * come first, and those after the first answer see no request at all.
 */
import {
  island, fill, events, asked, waitingRequests, answerFetch, clock, turn, arriveWith, mount, one, boxes, currencySelect, countrySelect, chooseCountry,
  headline, resultNotes, countryNote, sentText, addressUntouched,
} from '../../test/investOrPayOffParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { compare, type Inputs } from '../utils/invest-or-pay-off/math.ts';
import { DEFAULTS } from '../utils/invest-or-pay-off/url.ts';
import { resultLines } from './InvestOrPayOff.tsx';

const c = island.country;
const URL_ = '/data/test-history.json';
const money = (code: string) => (v: number) => formatAmount(v, code, false, null).replace(/^-/, '−');
const headlineFor = (inflation: number, code: string) => resultLines(compare({ ...DEFAULTS, inflation } as Inputs), island, 'en', money(code), 'month')[1];
const average = (country: string, avg: string) => fill(c.average, { country, first: 2016, last: 2025, avg });

/** Every text the country note showed, even for a moment. */
function watchNote() {
  const seen: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) seen.push(node.textContent ?? '');
      if (record.type === 'characterData') seen.push(record.target.textContent ?? '');
    }
  });
  observer.observe(one('.iop-countryNote'), { childList: true, subtree: true, characterData: true });
  return () => { observer.takeRecords().forEach((record) => record.addedNodes.forEach((node) => seen.push(node.textContent ?? ''))); observer.disconnect(); return seen; };
}

describe('the invest or pay off calculator: a country\'s inflation history', () => {
  it('fetches the history once a country without one is picked, says it is loading, and that it failed', async () => {
    mount({ historyUrl: URL_ });
    chooseCountry('TST');
    assert.equal(currencySelect().value, 'USD');
    assert.equal(boxes.inflation().value, '');
    assert.equal(boxes.inflation().placeholder, '');
    assert.deepEqual(asked, [{ url: URL_, options: { credentials: 'omit' } }]);
    assert.deepEqual(countryNote(), [c.loading]);
    assert.equal(one('.iop-countryNote p').className, 'ifc-hint');
    clock.pass(250);
    assert.deepEqual(resultNotes(), [c.needed]);
    await answerFetch('offline');
    assert.deepEqual(countryNote(), [c.error]);
    // Another country: asked for again, the failure forgotten.
    chooseCountry('MIX');
    assert.equal(currencySelect().value, 'GBP');
    assert.deepEqual(countryNote(), [c.loading]);
    assert.equal(asked.length, 2);
    await answerFetch('refused');
    assert.deepEqual(countryNote(), [c.error]);
    assert.ok(!sentText().includes(URL_));
    assert.ok(addressUntouched());
  });

  it('pays no heed to a request for a country picked and left before it answered', async () => {
    mount();
    chooseCountry('TST');
    assert.equal(waitingRequests(), 1);
    chooseCountry('EMU');
    assert.deepEqual(countryNote()[0].startsWith(average('Euro area', '2%')), true);
    await answerFetch('offline');
    assert.ok(countryNote()[0].startsWith(average('Euro area', '2%')));
    // The next country never shows the failure that was not its own, not even for a moment.
    const seen = watchNote();
    chooseCountry('MIX');
    await turn();
    assert.deepEqual(countryNote(), [c.loading]);
    assert.ok(!seen().includes(c.error), 'the old failure showed');
    assert.equal(asked.length, 2);
    await answerFetch('offline');
  });

  it('uses the history once it arrives: the country\'s figure, its last five years, or why there is none', async () => {
    mount();
    chooseCountry('TST');
    clock.pass(250);
    await answerFetch('history');
    {
      // Testland: 10% every year
      assert.deepEqual(countryNote(), [`${average('Testland', '10%')} ${fill(c.context, { five: '10%', last: 2025, latest: '10%' })}`]);
      assert.equal(boxes.inflation().placeholder, '10');
      assert.equal(headline(), headlineFor(10, 'USD'));
      assert.equal(events.length, 1);
    }
    {
      // the Euro area keeps the history the page arrived with
      chooseCountry('EMU');
      assert.ok(countryNote()[0].startsWith(average('Euro area', '2%')));
      clock.pass(250);
      assert.equal(headline(), headlineFor(2, 'EUR'));
    }
    {
      // Mixland: an average, but no unbroken last five years
      chooseCountry('MIX');
      assert.deepEqual(countryNote(), [`${average('Mixland', '3.17%')} ${fill(c.contextNoFive, { last: 2025, latest: '4%' })}`]);
      // the box offers the figure to two decimals
      assert.equal(boxes.inflation().placeholder, '3.17');
    }
    {
      // Oldland: too old for an average, and no currency of its own, so the pound stays
      chooseCountry('OLD');
      assert.equal(currencySelect().value, 'GBP');
      assert.deepEqual(countryNote(), [fill(c.noDefault, { country: 'Oldland' })]);
      clock.pass(250);
      assert.deepEqual(resultNotes(), [c.needed]);
    }
    {
      // Ruinland: prices that fall to nothing are no rate to compare with
      chooseCountry('RUI');
      clock.pass(250);
      assert.deepEqual(resultNotes(), [island.problems['impossible-rate']]);
      assert.equal(headline(), null);
    }
    {
      // Nodataland: not in the history, and not asked for again
      chooseCountry('NOD');
      await turn();
      assert.deepEqual(countryNote(), [c.error]);
    }
    assert.equal(asked.length, 1);
  });

  it('opens a link to a country from the history already fetched, without asking again', async () => {
    arriveWith('n=TST&c=USD&b=1000&h=p');
    mount();
    assert.equal(countrySelect().value, 'TST');
    await turn();
    assert.ok(countryNote()[0].startsWith(average('Testland', '10%')));
    assert.deepEqual(asked, []);
    // A country it does not have, on a page that has not looked yet.
    chooseCountry('NOD');
    await turn();
    await turn();
    assert.deepEqual(countryNote(), [c.error]);
    assert.deepEqual(asked, []);
  });
});
