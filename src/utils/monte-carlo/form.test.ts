/**
 * The simulator's form as the language switch and links carry it (form.ts).
 * A bad box arrives bad and every choice arrives as it was made (#789).
 */
import { readsSource } from '../../../test/mutationRun.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formErrors, formFromLink, openedPlan, publishableForm, toForm, toState, type BoxField, type FormState } from './form.ts';
import { STATE_KEY_PATTERN, decodeState, defaultState, publishableState } from './url.ts';

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

describe('a value this page accepts is accepted where it arrives (#789)', () => {
  for (const field of ['start', 'monthly', 'stockPct', 'feePct'] as const) {
    it(`${field}: a very small number`, () => {
      const arrived = carried(formWith({ [field]: '1e-7' }));
      assert.equal(Number(arrived[field]), 1e-7);
      assert.equal(formErrors(arrived)[field], false);
    });
  }
});

describe('years of withdrawing, typed wrong and then switched off', () => {
  for (const value of ['NaN', '', '500']) {
    it(`arrive as they were: ${value || 'empty'}`, () => {
      const form = formWith({ withdrawOn: false, withdrawYears: value });
      const arrived = carried(form);
      assert.deepEqual([arrived.withdrawOn, arrived.withdrawYears], [false, value]);
      assert.ok(formErrors({ ...arrived, withdrawOn: true }).withdrawYears, 'invalid once switched on again');
    });
  }

  it('never reach the simulation as NaN', () => {
    assert.ok(Object.values(toState(formWith({ withdrawOn: false, withdrawYears: 'NaN' }))).every((v) => !Number.isNaN(v)));
  });
});

describe('an amount to withdraw, typed wrong and then switched off', () => {
  for (const value of ['NaN', '', '0', '999999999999999']) {
    it(`arrives as it was, with withdrawals off: ${value || 'empty'}`, () => {
      const form = formWith({ withdrawOn: false, withdrawal: value });
      const wire = publishableForm(form, 'EUR');
      const arrived = carried(form);
      assert.deepEqual([arrived.withdrawOn, arrived.withdrawal], [false, value]);
      assert.equal(decodeState(wire)?.withdrawal, 0, 'the plan behind it has no withdrawal');
      assert.ok(formErrors({ ...arrived, withdrawOn: true }).withdrawal, 'invalid once switched on again');
    });
  }

  it('the guard takes every key of that link out of the address', () => {
    const wire = publishableForm(formWith({ withdrawOn: false, withdrawal: 'NaN' }), 'EUR');
    const key = new RegExp(`^(?:${STATE_KEY_PATTERN})$`);
    assert.ok(new URLSearchParams(wire).has('o'));
    for (const name of new URLSearchParams(wire).keys()) assert.match(name, key);
  });

  it('the key is written only then', () => {
    for (const change of [{ withdrawOn: true, withdrawal: 'NaN' }, { withdrawOn: false, start: 'NaN' }]) {
      assert.ok(!new URLSearchParams(publishableForm(formWith(change), 'EUR')).has('o'));
    }
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

describe('a remembered withdrawal travels with withdrawals off (#789)', () => {
  for (const change of [{ withdrawal: '45000' }, { withdrawYears: '12' }, { withdrawal: '45000', withdrawYears: '12' }, { withdrawal: '45000', start: 'NaN' }]) {
    it(JSON.stringify(change), async () => {
      const { DEFAULTS: plan, decodeState: read } = await import('./url.ts');
      const form = { ...toForm(plan), withdrawOn: false, ...change };
      const sent = publishableForm(form, 'EUR');
      const got = formFromLink(sent);
      assert.deepEqual([got?.withdrawal, got?.withdrawYears, got?.withdrawOn], [form.withdrawal, form.withdrawYears, false]);
      assert.equal(read(sent)?.withdrawal, 0, 'the plan still has none');
    });
  }
});

describe('a tiny number is never rounded on the way (#789)', () => {
  for (const [field, value] of [['start', '0.00000000012'], ['start', '0.00000000001'], ['monthly', '1.00000000001'], ['saveYears', '0.000000000000000000001']] as const) {
    it(`${field} ${value}`, async () => {
      const { DEFAULTS: plan } = await import('./url.ts');
      const form = { ...toForm(plan), [field]: value };
      const back = formFromLink(publishableForm(form, 'EUR'))!;
      assert.equal(Number(back[field]), Number(value));
      assert.equal(Boolean(formErrors(back)[field]), Boolean(formErrors(form)[field]));
    });
  }
});

describe('a number too long for a link is invalid where it is typed (#789)', () => {
  it('past 200 characters', async () => {
    const { DEFAULTS: plan } = await import('./url.ts');
    const long = `0.${'0'.repeat(199)}1`;
    assert.equal(formErrors({ ...toForm(plan), start: long }).start, true);
  });
  it('past 200 characters as typed, where the number itself rounds to zero', async () => {
    const { DEFAULTS: plan } = await import('./url.ts');
    assert.equal(formErrors({ ...toForm(plan), start: `0.${'0'.repeat(400)}1` }).start, true);
  });
  it('the edge is 200 characters, written or typed', async () => {
    const { DEFAULTS: plan } = await import('./url.ts');
    const bad = (start: string) => formErrors({ ...toForm(plan), start }).start;
    const at200 = `0.${'0'.repeat(197)}1`;
    assert.equal(at200.length, 200);
    assert.equal(bad(at200), false);
    assert.equal(bad(`0.${'0'.repeat(198)}1`), true);
    assert.equal(bad(`0.1${'0'.repeat(197)}`), false);
    assert.equal(bad(`0.1${'0'.repeat(198)}`), true);
  });
  it('and arrives still invalid, through a link or the language switch', async () => {
    const { DEFAULTS: plan } = await import('./url.ts');
    for (const start of [`0.${'0'.repeat(400)}1`, `0.1${'0'.repeat(198)}`, `0.${'0'.repeat(198)}1`]) {
      const arrived = formFromLink(publishableForm({ ...toForm(plan), start }, 'EUR'))!;
      assert.equal(formErrors(arrived).start, true, start.length + ' characters');
    }
  });
  it('up to 200 it travels whole', async () => {
    const { DEFAULTS: plan } = await import('./url.ts');
    const fits = `0.${'0'.repeat(196)}1`;
    const form = { ...toForm(plan), start: fits };
    assert.equal(formErrors(form).start, false);
    assert.equal(Number(formFromLink(publishableForm(form, 'EUR'))!.start), Number(fits));
  });
});

describe('a box refused for its length says it cannot be read (#789)', () => {
  it('tooLongForLink names exactly the boxes refused for their length', async () => {
    const { tooLongForLink } = await import('./inputs.ts');
    assert.equal(tooLongForLink(`0.${'0'.repeat(197)}1`), false);
    assert.equal(tooLongForLink(`0.${'0'.repeat(198)}1`), true);
    assert.equal(tooLongForLink(`0.${'0'.repeat(400)}1`), true);
    assert.equal(tooLongForLink(`0.1${'0'.repeat(198)}`), true);
    assert.equal(tooLongForLink('1e-250'), true);
    assert.equal(tooLongForLink('2000000'), false);
    assert.equal(tooLongForLink(''), false);
  });
  it('such a box shows the unreadable words, not the range', { skip: readsSource }, async () => {
    const { readFileSync } = await import('node:fs');
    const page = readFileSync(new URL('../../components/MonteCarloSimulator.tsx', import.meta.url), 'utf8');
    assert.match(page, /arrived \|\| tooLongForLink\(props\.value\) \? unreadable : error\}/);
  });
});

describe('a shared plan opens as the plan its boxes give', () => {
  // The page shows the plan a link decodes to and does not work it out again
  // from the boxes, so the two must be one plan for every link it reads.
  it('the boxes a link opens with give back the plan it decodes to', () => {
    const links = [
      '', 's=0', 's=20000&m=300&y=12&n=1000', 'y=0&w=30000&r=30', 'w=1000&r=1&y=0&s=100000', 'w=30000&o=1', 'w=30000&o=1&r=12.5',
      'k=0&f=0.25&e=c&n=100', 'k=100&e=o&n=100000&c=INR', 'c=usd&s=-5&m=1e3', 's=999999999999999&m=999999999999999&w=999999999999999',
      'y=61&r=0', 'f=40&n=5000', 's=1.5&m=0.25', 'e=constructor', 'r=60&w=1&y=60',
    ];
    for (const link of links) {
      const plan = decodeState(link || 'c=EUR');
      const form = formFromLink(link || 'c=EUR');
      assert.ok(plan && form, link);
      if (Object.values(formErrors(form)).some(Boolean)) continue;
      assert.deepEqual(toState(form), plan, link);
    }
  });

  it('shows the plan its boxes give when they disagree with the plan it decodes to', () => {
    // The box reads as 1; the plan part is refused for its 16 digits and falls back.
    const link = 's=0000000000000001&n=100';
    const form = formFromLink(link);
    const decoded = decodeState(link);
    assert.ok(form && decoded);
    assert.notDeepEqual(toState(form), decoded);
    assert.deepEqual(openedPlan(form, decoded), toState(form));
    assert.equal(openedPlan(form, decoded).start, 1);
  });

  it('shows the decoded plan when a box is in error', () => {
    const link = 'c=EUR&s=7x';
    const form = formFromLink(link);
    const decoded = decodeState(link);
    assert.ok(form && decoded);
    assert.ok(Object.values(formErrors(form)).some(Boolean));
    assert.deepEqual(openedPlan(form, decoded), decoded);
  });
});

describe('the form and the plan, in detail', () => {
  it('a plan with a withdrawal opens with withdrawals on, at that amount', () => {
    const form = toForm({ ...defaultState('EUR'), withdrawal: 24_000, withdrawYears: 20 });
    assert.equal(form.withdrawOn, true);
    assert.equal(form.withdrawal, '24000');
    assert.equal(form.withdrawYears, '20');
  });

  it('a plan without one opens with them off, the box at its starting amount', () => {
    const form = toForm(defaultState('EUR'));
    assert.equal(form.withdrawOn, false);
    assert.equal(form.withdrawal, '30000');
  });

  it('years of withdrawing that are fine are kept while withdrawals are off', () => {
    assert.equal(toState(formWith({ withdrawOn: false, withdrawYears: '20' })).withdrawYears, 20);
  });

  it('half a year of withdrawing, off the page, gives the plan the default years', () => {
    assert.equal(toState(formWith({ withdrawOn: false, withdrawYears: '12.5' })).withdrawYears, 30);
  });

  it('an empty or blank box gives the plan nothing, and spaces around a number are read past', () => {
    for (const blank of ['', ' ', '   ', '\t', '\n']) {
      const plan = toState(formWith({ start: blank, monthly: blank, withdrawal: blank }));
      assert.deepEqual([plan.start, plan.monthly, plan.withdrawal], [0, 0, 0], JSON.stringify(blank));
    }
    const plan = toState(formWith({ start: ' 1200 ', monthly: '\t300', saveYears: '12 ', withdrawal: ' 0.5' }));
    assert.deepEqual([plan.start, plan.monthly, plan.saveYears, plan.withdrawal], [1200, 300, 12, 0.5]);
  });

  it('half a year is wrong in either year box', () => {
    assert.equal(formErrors(formWith({ saveYears: '12.5' })).saveYears, true);
    assert.equal(formErrors(formWith({ withdrawYears: '12.5' })).withdrawYears, true);
  });

  it('a changed withdrawal with withdrawals on travels as the plan does', () => {
    const form = formWith({ withdrawal: '20000', withdrawYears: '25' });
    assert.equal(publishableForm(form, 'EUR'), 'w=20000&r=25');
  });

  it('with withdrawals on and every box readable, what travels is the plan, whatever the boxes hold', () => {
    const changes: Partial<FormState>[] = [
      {},
      { withdrawal: '20000' },
      { withdrawYears: '25' },
      { withdrawal: '20000.50', withdrawYears: '1' },
      { withdrawal: ' 1200 ', withdrawYears: '60 ' },
      { withdrawal: '020000', start: '0', monthly: '0', feePct: '0.25' },
      { withdrawal: '1', returns: 'cautious', paths: 1_000 },
    ];
    for (const currency of ['EUR', 'INR']) {
      for (const change of changes) {
        const form = formWith(change, currency);
        assert.ok(!Object.values(formErrors(form)).some(Boolean), JSON.stringify(change));
        for (const page of ['EUR', 'INR', 'USD']) {
          assert.equal(publishableForm(form, page), publishableState(toState(form), page), `${currency} ${page} ${JSON.stringify(change)}`);
        }
      }
    }
  });

  it('with withdrawals on and a bad box, the withdrawal goes as the plan has it, beside the bad box', () => {
    const wire = publishableForm(formWith({ start: '7x', withdrawal: '020000.0', withdrawYears: '25' }), 'EUR');
    assert.equal(wire, 'w=20000&r=25&s=NaN');
  });

  it('a bad withdrawal keeps the years beside it', () => {
    const arrived = carried(formWith({ withdrawal: 'NaN', withdrawYears: '20' }));
    assert.equal(arrived.withdrawal, 'NaN');
    assert.equal(arrived.withdrawYears, '20');
    assert.equal(arrived.withdrawOn, true);
  });
});

describe('a link for one form is always the same text', () => {
  // The plan's keys keep their usual order (w, r, then f), and a box written
  // over a key stays where that key was; only a box the plan lacks is added last.
  it('a bad withdrawal amount is written where the plan has its withdrawal', () => {
    assert.equal(publishableForm(formWith({ withdrawal: '7x', feePct: '0.25' }), 'EUR'), 'w=NaN&f=0.25');
    assert.equal(publishableForm(formWith({ withdrawal: '', withdrawYears: '25', feePct: '0.25' }), 'EUR'), 'w=&r=25&f=0.25');
  });

  it('bad years of withdrawing follow the plan, which has the years it starts with', () => {
    assert.equal(publishableForm(formWith({ withdrawal: '20000', withdrawYears: '12.5', feePct: '0.25' }), 'EUR'), 'w=20000&f=0.25&r=12.5');
  });
});
