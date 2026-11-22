/**
 * Invest or pay off's form as the language switch and links carry it
 * (form.ts). A bad box arrives bad and every choice arrives as it was made (#789).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BOX_FIELDS, boxErrors, fieldErrors, formFromLink, publishableForm, toForm, type FormState } from './form.ts';
import { defaultState } from './url.ts';

const LOCALES = ['en', 'hi', 'es', 'cs', 'mr'];

const formWith = (change: Partial<FormState>, locale = 'en'): FormState => ({ ...toForm(defaultState('EUR'), locale), returns: 'own', ...change });

const carried = (form: FormState, from = 'en', to = 'en', pageCurrency = 'EUR', pageCountry = ''): FormState => {
  const arrived = formFromLink(publishableForm(form, from, pageCurrency, pageCountry), to);
  assert.ok(arrived, 'nothing was carried');
  return arrived;
};

describe('a box that is not valid arrives invalid (#789)', () => {
  for (const field of BOX_FIELDS) {
    for (const from of LOCALES) {
      for (const to of LOCALES) {
        it(`${field}, ${from} to ${to}`, () => {
          const cases = [['7x', '?'], ['?', '?'], ['999999999999999', '999999999999999']];
          // An empty inflation box is the country's figure, not an error.
          if (field !== 'inflation') cases.push(['', '']);
          for (const [typed, arrives] of cases) {
            const arrived = carried(formWith({ [field]: typed }, from), from, to);
            assert.equal(arrived[field], arrives, typed);
            assert.ok(fieldErrors(arrived, to)[field], `${typed} is invalid where it arrived`);
          }
        });
      }
    }
  }

  it('several at once, and none as typed', () => {
    const form = formWith({ balance: '7secret', debtRate: '', gainsTax: '150' });
    assert.ok(!publishableForm(form, 'en', 'EUR', '').includes('secret'));
    const arrived = carried(form);
    assert.deepEqual([arrived.balance, arrived.debtRate, arrived.gainsTax], ['?', '', '150']);
  });

  it('a range error keeps its number, in the new page’s own marks', () => {
    assert.equal(carried(formWith({ ownReturn: '-200,5' }, 'es'), 'es', 'en').ownReturn, '-200.5');
  });

  it('a bad box the page does not show is still carried', () => {
    const arrived = carried(formWith({ returns: 'cautious', ownReturn: '7x' }));
    assert.equal(arrived.ownReturn, '?');
    assert.equal(fieldErrors(arrived, 'en').ownReturn, undefined);
    assert.ok(boxErrors(arrived, 'en').ownReturn);
  });
});

describe('a choice made while a box is invalid is kept (#789)', () => {
  const choices: Array<Partial<FormState>> = [
    { currency: 'INR' },
    { country: 'IND' },
    { returns: 'cautious' },
    { returns: 'optimistic' },
    { returns: 'own' },
    { horizon: 'payoff' },
    { horizon: 'plus10' },
    { todayAt: 'end' },
  ];
  for (const change of choices) {
    it(JSON.stringify(change), () => {
      const arrived = carried(formWith({ balance: '7x', ...change }));
      for (const key of Object.keys(change) as Array<keyof FormState>) assert.equal(arrived[key], change[key], key);
      assert.equal(arrived.balance, '?');
    });
  }

  it('the page’s own currency and country, when a bad box is the only change', () => {
    const form = { ...toForm(defaultState('INR', 'IND'), 'hi'), balance: '7x' };
    const arrived = carried(form, 'hi', 'en', 'INR', 'IND');
    assert.deepEqual([arrived.currency, arrived.country], ['INR', 'IND']);
  });
});

describe('what was already right', () => {
  it('an untouched page carries nothing', () => {
    for (const locale of LOCALES) assert.equal(publishableForm(toForm(defaultState('CZK'), locale), locale, 'CZK', ''), '');
  });

  it('a valid form arrives whole', () => {
    const form = formWith({ balance: '2500,5', debtRate: '6,25', inflation: '-1,5', feePct: '0,2', currency: 'INR' }, 'es');
    assert.deepEqual(carried(form, 'es', 'es'), form);
  });

  it('an empty inflation box stays the country’s figure', () => {
    assert.equal(carried(formWith({ balance: '7x', inflation: '' })).inflation, '');
  });

  it('raw text in a link shared before the fix opens invalid', () => {
    const arrived = formFromLink('b=7x&r=1e3&i=two', 'en');
    assert.deepEqual([arrived?.balance, arrived?.debtRate, arrived?.inflation], ['?', '?', '?']);
  });
});
