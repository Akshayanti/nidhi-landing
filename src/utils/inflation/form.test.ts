/**
 * The inflation calculator's form as the language switch and links carry it
 * (form.ts). A bad box arrives bad and every choice arrives as it was made (#789).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { boxErrors, formFromLink, publishableForm, toForm, toState, type BoxField, type FormState } from './form.ts';
import { defaultState } from './url.ts';

const FIELDS: BoxField[] = ['amount', 'rate', 'years', 'growth'];
const LOCALES = ['en', 'hi', 'es', 'cs', 'mr'];

const formWith = (change: Partial<FormState>, locale = 'en'): FormState => ({ ...toForm(defaultState('EUR'), locale), mode: 'keep', ...change });

const carried = (form: FormState, from = 'en', to = 'en', pageCurrency = 'EUR', pageCountry = ''): FormState => {
  const arrived = formFromLink(publishableForm(form, from, pageCurrency, pageCountry), to);
  assert.ok(arrived, 'nothing was carried');
  return arrived;
};

describe('a box that is not valid arrives invalid (#789)', () => {
  for (const field of FIELDS) {
    for (const from of LOCALES) {
      for (const to of LOCALES) {
        it(`${field}, ${from} to ${to}`, () => {
          for (const [typed, arrives] of [['7x', '?'], ['?', '?'], ['', ''], ['999999999999999', '999999999999999']]) {
            const arrived = carried(formWith({ [field]: typed }, from), from, to);
            assert.equal(arrived[field], arrives, typed);
            assert.ok(boxErrors(arrived, to)[field], `${typed} is invalid where it arrived`);
          }
        });
      }
    }
  }

  it('one that another page would read as valid is marked, not mended', () => {
    const arrived = carried(formWith({ years: '१२' }, 'hi'), 'hi', 'en');
    assert.equal(arrived.years, '?');
  });

  it('several at once, and none as typed', () => {
    const form = formWith({ amount: '7secret', rate: '', years: '500' });
    assert.ok(!publishableForm(form, 'en', 'EUR', '').includes('secret'));
    const arrived = carried(form);
    assert.deepEqual([arrived.amount, arrived.rate, arrived.years], ['?', '', '500']);
  });

  it('a range error keeps its number, in the new page’s own marks', () => {
    assert.equal(carried(formWith({ growth: '-200,5' }, 'es'), 'es', 'en').growth, '-200.5');
  });
});

describe('too many decimals never arrive as a whole number', () => {
  for (const to of LOCALES) {
    it(`1.234 from en to ${to}`, () => {
      const arrived = carried(formWith({ amount: '1.234' }), 'en', to);
      assert.ok(boxErrors(arrived, to).amount, arrived.amount);
    });
  }
});

describe('a choice made while a box is invalid is kept (#789)', () => {
  const choices: Array<Partial<FormState>> = [{ currency: 'AOA' }, { mode: 'past' }, { mode: 'cost' }, { country: 'IND' }, { country: 'ARG', from: '2018' }];
  for (const change of choices) {
    it(JSON.stringify(change), () => {
      const arrived = carried(formWith({ amount: '7x', ...change }));
      for (const key of Object.keys(change) as Array<keyof FormState>) assert.equal(arrived[key], change[key], key);
      assert.equal(arrived.amount, '?');
    });
  }

  it('the page’s own currency and country, when a bad box is the only change', () => {
    const form = { ...toForm(defaultState('INR', 'IND'), 'hi'), amount: '7x' };
    const arrived = carried(form, 'hi', 'en', 'INR', 'IND');
    assert.deepEqual([arrived.currency, arrived.country], ['INR', 'IND']);
  });
});

describe('what was already right', () => {
  it('an untouched page carries nothing', () => {
    for (const locale of LOCALES) assert.equal(publishableForm(toForm(defaultState('CZK'), locale), locale, 'CZK', ''), '');
  });

  it('a valid form arrives whole', () => {
    const form = formWith({ amount: '2500,5', rate: '6,25', years: '25', growth: '-2,5', currency: 'INR' }, 'es');
    assert.deepEqual(carried(form, 'es', 'es'), form);
  });

  it('raw text in a link shared before the fix opens invalid', () => {
    const arrived = formFromLink('a=7x&r=1e3&y=ten', 'en');
    assert.deepEqual([arrived?.amount, arrived?.rate, arrived?.years], ['?', '?', '?']);
  });
});

describe('a number just out of range is not rounded into it (#789)', () => {
  for (const to of LOCALES) {
    it(`growth of -99.99000000001, en to ${to}`, () => {
      const arrived = carried(formWith({ growth: '-99.99000000001' }), 'en', to);
      assert.ok(boxErrors(arrived, to).growth, arrived.growth);
    });
  }
});

describe('a tiny invalid number does not arrive valid (#789)', () => {
  for (const to of LOCALES) {
    it(`years of 1e-21, en to ${to}`, () => {
      assert.ok(boxErrors(carried(formWith({ years: '0.000000000000000000001' }), 'en', to), to).years);
    });
  }
});

describe('each box is read by its own rule', () => {
  const errors = (change: Partial<FormState>, locale = 'en') => boxErrors(formWith(change, locale), locale);

  it('an amount may be far above the largest rate, and may not be negative', () => {
    assert.equal(errors({ amount: '20000' }).amount, false);
    assert.equal(errors({ amount: '1000000000000' }).amount, false);
    assert.equal(errors({ amount: '1000000000001' }).amount, true);
    assert.equal(errors({ amount: '-5' }).amount, true);
  });

  it('a rate runs from 0 to 10,000 and a raise from -99.99 to 10,000', () => {
    assert.equal(errors({ rate: '10000' }).rate, false);
    assert.equal(errors({ rate: '10000.01' }).rate, true);
    assert.equal(errors({ rate: '-1' }).rate, true);
    assert.equal(errors({ growth: '-99.99' }).growth, false);
    assert.equal(errors({ growth: '-100' }).growth, true);
    assert.equal(errors({ growth: '10000.01' }).growth, true);
  });

  it('years are whole, from 1 to 100', () => {
    assert.equal(errors({ years: '100' }).years, false);
    assert.equal(errors({ years: '101' }).years, true);
    assert.equal(errors({ years: '2.5' }).years, true);
  });

  it('a clean form has no errors, and one bad box marks only itself', () => {
    assert.deepEqual(errors({}), { amount: false, rate: false, years: false, growth: false });
    assert.deepEqual(errors({ rate: 'x' }), { amount: false, rate: true, years: false, growth: false });
    assert.deepEqual(errors({ amount: '2,5', rate: '2,5', growth: '-2,5' }, 'es'), { amount: false, rate: false, years: false, growth: false });
  });
});

describe('the form as a state the sums can use', () => {
  const prev = { ...defaultState('EUR'), amount: 111, rate: 2, years: 3, growth: 4 };

  it('reads every box in the page’s own number style', () => {
    const form: FormState = { mode: 'past', currency: 'INR', amount: '2.500,5', rate: '6,25', years: '25', growth: '-2,5', country: 'IND', from: '1991' };
    assert.deepEqual(toState(form, prev, 'es'), { mode: 'past', currency: 'INR', amount: 2500.5, rate: 6.25, years: 25, growth: -2.5, country: 'IND', from: 1991 });
  });

  it('keeps the last good number for a box that cannot be read, one box at a time', () => {
    const good: FormState = { mode: 'buy', currency: 'EUR', amount: '500', rate: '7', years: '8', growth: '9', country: '', from: '' };
    assert.deepEqual(toState(good, prev, 'en'), { mode: 'buy', currency: 'EUR', amount: 500, rate: 7, years: 8, growth: 9, country: '', from: null });
    assert.equal(toState({ ...good, amount: 'x' }, prev, 'en').amount, 111);
    assert.equal(toState({ ...good, rate: '-1' }, prev, 'en').rate, 2);
    assert.equal(toState({ ...good, years: '0' }, prev, 'en').years, 3);
    assert.equal(toState({ ...good, growth: '-100' }, prev, 'en').growth, 4);
    assert.equal(toState({ ...good, amount: '0', rate: '0', growth: '0' }, prev, 'en').amount, 0, 'a typed zero is a number, not a bad box');
    assert.equal(toState({ ...good, rate: '0' }, prev, 'en').rate, 0);
    assert.equal(toState({ ...good, growth: '0' }, prev, 'en').growth, 0);
  });

  it('writes a state into the boxes in the page’s own number style', () => {
    const state = { mode: 'keep' as const, currency: 'CZK', amount: 2500.5, rate: 6.25, years: 25, growth: -2.5, country: 'CZE', from: 1995 };
    assert.deepEqual(toForm(state, 'cs'), { mode: 'keep', currency: 'CZK', amount: '2500,5', rate: '6,25', years: '25', growth: '-2,5', country: 'CZE', from: '1995' });
    assert.equal(toForm({ ...state, from: null }, 'en').from, '');
    assert.equal(toForm(state, 'en').amount, '2500.5');
  });
});

describe('a link with no state in it', () => {
  it('opens no form at all', () => {
    assert.equal(formFromLink('', 'en'), null);
    assert.equal(formFromLink('?utm_source=share', 'cs'), null);
  });
});
