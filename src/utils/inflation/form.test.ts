/**
 * The inflation calculator's form as the language switch and links carry it
 * (form.ts). A bad box arrives bad and every choice arrives as it was made (#789).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { boxErrors, formFromLink, publishableForm, toForm, type BoxField, type FormState } from './form.ts';
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
