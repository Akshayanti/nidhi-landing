/**
 * Invest or pay off's form as the language switch and links carry it
 * (form.ts). A bad box arrives bad and every choice arrives as it was made (#789).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BOX_FIELDS, boxErrors, fieldErrors, formFromLink, parseField, publishableForm, toForm, toState, type FormState } from './form.ts';
import { DEFAULTS, defaultState } from './url.ts';

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

describe('too many decimals never arrive as a whole number', () => {
  for (const to of LOCALES) {
    it(`1.234 from en to ${to}`, () => {
      const arrived = carried(formWith({ balance: '1.234' }), 'en', to);
      assert.ok(boxErrors(arrived, to).balance, arrived.balance);
    });
  }
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

describe('each box’s own rules (#790)', () => {
  it('a typed inflation figure fills its box; none leaves it empty', () => {
    assert.equal(toForm({ ...DEFAULTS, inflation: 3.5 }, 'en').inflation, '3.5');
    assert.equal(toForm({ ...DEFAULTS, inflation: -1.25 }, 'es').inflation, '-1,25');
    assert.equal(toForm(DEFAULTS, 'en').inflation, '');
  });

  it('inflation may fall to -99.99% and no further', () => {
    assert.equal(parseField('inflation', '-50', 'en'), -50);
    assert.equal(parseField('inflation', '-99.99', 'en'), -99.99);
    assert.equal(parseField('inflation', '-100', 'en'), null);
    assert.equal(parseField('inflation', '10001', 'en'), null);
  });

  it('a rate is held to its own limits, an amount is not a rate', () => {
    assert.equal(parseField('debtRate', '20000', 'en'), null);
    assert.equal(parseField('feePct', '6', 'en'), null);
    assert.equal(parseField('feePct', '5', 'en'), 5);
    assert.equal(parseField('relief', '101', 'en'), null);
    assert.equal(parseField('gainsTax', '-1', 'en'), null);
    assert.equal(parseField('balance', '20000', 'en'), 20000);
    assert.equal(parseField('payment', '20000', 'en'), 20000);
    assert.equal(parseField('extra', '20000', 'en'), 20000);
  });

  it('an inflation box of spaces is the country’s figure, not an error', () => {
    const form = formWith({ inflation: '   ' });
    assert.equal(boxErrors(form, 'en').inflation, undefined);
    assert.equal(toState(form, DEFAULTS, 'en').inflation, null);
  });

  it('a bad inflation box keeps the last figure, or 0 when there was none', () => {
    const form = formWith({ inflation: 'abc' });
    assert.equal(toState(form, { ...DEFAULTS, inflation: 4 }, 'en').inflation, 4);
    assert.equal(toState(form, { ...DEFAULTS, inflation: null }, 'en').inflation, 0);
    assert.equal(toState(formWith({ inflation: '2.5' }), DEFAULTS, 'en').inflation, 2.5);
  });

  it('a bad box that reads as a good number once written plainly arrives as unreadable, never as that number', () => {
    // "1.000" has too many decimals for an amount in English; written plainly it would be a valid 1.
    for (const [box, locale] of [['balance', 'en'], ['debtRate', 'en'], ['inflation', 'es']] as const) {
      const typed = locale === 'es' ? '1,000' : '1.000';
      const form = formWith({ [box]: typed }, locale);
      assert.ok(boxErrors(form, locale)[box], `${typed} is bad in ${locale}`);
      const link = publishableForm(form, locale, 'EUR', '');
      assert.equal(formFromLink(link, 'en')?.[box], '?');
    }
  });

  it('a link with no tool state opens no form', () => {
    assert.equal(formFromLink('', 'en'), null);
    assert.equal(formFromLink('utm_source=share', 'en'), null);
  });
});
