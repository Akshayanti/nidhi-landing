/**
 * The simulator's form as the language switch and links carry it (form.ts).
 * A bad box arrives bad and every choice arrives as it was made (#789).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formErrors, formFromLink, publishableForm, toForm, type BoxField, type FormState } from './form.ts';
import { defaultState } from './url.ts';

const FIELDS: BoxField[] = ['start', 'monthly', 'saveYears', 'stockPct', 'withdrawal', 'withdrawYears', 'feePct'];

const formWith = (change: Partial<FormState>, currency = 'EUR'): FormState => ({ ...toForm(defaultState(currency)), withdrawOn: true, ...change });

const carried = (form: FormState, pageCurrency = 'EUR'): FormState => {
  const arrived = formFromLink(publishableForm(form, pageCurrency));
  assert.ok(arrived, 'nothing was carried');
  return arrived;
};

describe('a box that is not valid arrives as it was (#789)', () => {
  for (const field of FIELDS) {
    for (const value of ['NaN', '', '999999999999999']) {
      it(`${field}: ${value || 'empty'}`, () => {
        const form = formWith({ [field]: value });
        assert.ok(formErrors(form)[field], 'the case is invalid on the page it left');
        const arrived = carried(form);
        assert.equal(arrived[field], value);
        assert.ok(formErrors(arrived)[field], 'and on the page it reached');
      });
    }
  }

  it('several at once', () => {
    const form = formWith({ start: 'NaN', feePct: '', saveYears: '12.5', withdrawal: '0' });
    assert.deepEqual(carried(form), form);
  });

  it('typed text never travels', () => {
    const encoded = publishableForm(formWith({ start: '7secret' }), 'EUR');
    assert.ok(!encoded.includes('secret'));
    assert.equal(formFromLink(encoded)?.start, 'NaN');
  });
});

describe('a choice made while a box is invalid is kept (#789)', () => {
  const choices: Array<[string, Partial<FormState>]> = [
    ['currency', { currency: 'INR' }],
    ['return setting', { returns: 'cautious' }],
    ['run count', { paths: 1000 }],
    ['withdrawals on', { withdrawOn: true }],
    ['withdrawals off', { withdrawOn: false }],
  ];
  for (const [name, change] of choices) {
    it(name, () => {
      const form = formWith({ start: 'NaN', ...change });
      const arrived = carried(form);
      for (const key of Object.keys(change) as Array<keyof FormState>) assert.equal(arrived[key], form[key], key);
      assert.equal(arrived.start, 'NaN');
    });
  }

  it('the page’s own currency, when a bad box is the only change', () => {
    const form = { ...toForm(defaultState('INR')), start: 'NaN' };
    assert.equal(carried(form, 'INR').currency, 'INR');
  });
});

describe('what was already right', () => {
  it('an untouched page carries nothing', () => {
    for (const currency of ['EUR', 'INR', 'CZK']) assert.equal(publishableForm(toForm(defaultState(currency)), currency), '');
  });

  it('a valid plan arrives whole', () => {
    const form = formWith({ start: '1234.56', monthly: '0', feePct: '0.25', withdrawal: '7', withdrawYears: '12' }, 'USD');
    assert.deepEqual(carried(form), form);
  });

  it('a link with no state opens nothing', () => {
    assert.equal(formFromLink('utm_source=share'), null);
  });

  it('raw text in a link shared before the fix opens invalid', () => {
    const arrived = formFromLink('s=7x&w=7x&f=1e3');
    assert.deepEqual([arrived?.start, arrived?.withdrawal, arrived?.feePct, arrived?.withdrawOn], ['NaN', 'NaN', 'NaN', true]);
  });
});
