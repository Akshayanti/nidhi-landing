/**
 * The invest or pay off calculator as its page mounts it (#790): the form
 * and its parts, typing and the quarter second the result waits for, boxes
 * that cannot be read, and the problems that leave no comparison. The
 * inflation figure, the reader's own return, "Taxes and fees" and how amounts
 * are written are in InvestOrPayOffParts.page.form.dom.test.tsx; links, the
 * language switch, copying, the reset and the exports in
 * InvestOrPayOffParts.page.share.dom.test.tsx; the inflation history
 * loading, failing and arriving in InvestOrPayOffParts.page.history.dom.test.tsx.
 *
 * Throughout: the address is never written while typing, and analytics get
 * fixed event names, never a typed amount, rate or the encoded state
 * (CLAUDE.md, "Free Tools Keep Inputs Out of URLs").
 */
import {
  island, t, w, fill, events, eventNames, published, shared, asked, clock, mount, page, all, text, one, none, has, boxes, type, typeAndSettle,
  currencySelect, countrySelect, pick, more, shareButton, xlsxButton, pdfButton, resetButton, ariaDisabled, headline, resultNotes, withheld, reason,
  said, countryNote, sentText, addressUntouched, COUNTRIES, type BoxName,
} from '../../test/investOrPayOffParts.page.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { CURRENCIES } from '../utils/shared/money.ts';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { compare, rates, type Inputs } from '../utils/invest-or-pay-off/math.ts';
import { DEFAULTS, decodeState } from '../utils/invest-or-pay-off/url.ts';
import { resultLines } from './InvestOrPayOff.tsx';

const f = island.fields;
const r = island.results;
const fieldError = (message: string) => fill(t.export.fieldError, { message });
const minus = (s: string) => s.replace(/^-/, '−');
const money = (code = 'EUR', amountLocale: string | null = null) => (v: number) => minus(formatAmount(v, code, false, amountLocale));
/** The page's sentences for a state, worked out here: the Euro area's 2% unless another inflation is given. */
const linesFor = (s: Partial<Inputs> & { currency?: string } = {}, locale = 'en') => {
  const { currency = 'EUR', ...rest } = s;
  const inputs: Inputs = { ...DEFAULTS, inflation: 2, ...rest } as Inputs;
  return resultLines(compare(inputs), island, locale, money(currency), 'month');
};
const pctText = (v: number, digits = 1) => new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v / 100);
/** Nothing typed reached analytics. */
const nothingTypedSent = (...typed: string[]) => {
  const sent = sentText();
  for (const v of typed) assert.ok(!sent.includes(v), `analytics carried ${v}`);
  for (const [, props] of events) {
    for (const value of Object.values(props ?? {})) assert.ok(value === null || !String(value).includes('='), 'analytics carried the state');
  }
  assert.ok(addressUntouched(), 'the address was written');
};

describe('the invest or pay off calculator on its page', () => {
  it('as the server sends it: held until the island runs, the example figures in the boxes, nothing said and no report', () => {
    const html = renderToString(page());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const root = doc.querySelector('.ifc-root.iop-root');
    assert.ok(root);
    assert.equal(root.hasAttribute('inert'), true);
    assert.equal(root.getAttribute('aria-busy'), 'true');
    const values = Object.fromEntries([...doc.querySelectorAll('input[type="text"]')].map((i) => [i.id.split('-').pop(), i.getAttribute('value')]));
    assert.deepEqual(values, { balance: '18000', debtRate: '6.5', payment: '400', extra: '200', inflation: '', relief: '0', feePct: '0', gainsTax: '0' });
    const selected = [...doc.querySelectorAll('select')].map((s) => s.querySelector('option[selected]')?.getAttribute('value'));
    assert.deepEqual(selected, ['EUR', 'EMU']);
    assert.equal(doc.querySelector('.iop-example')?.textContent, island.example);
    assert.equal(doc.querySelector('.iop-headline')?.textContent, linesFor()[1]);
    assert.equal(doc.querySelector('span[aria-live="polite"]')?.textContent, '');
    assert.ok(doc.querySelector('.tool-report') === null);
    assert.equal(doc.querySelector('input[value="historical"]')?.hasAttribute('checked'), true);
    assert.equal(doc.querySelector('input[value="plus5"]')?.hasAttribute('checked'), true);
    // A page whose country's history is not in it yet says it is loading, not that it failed.
    const waiting = new DOMParser().parseFromString(renderToString(page({ defaultCountry: 'TST', initialHistory: null })), 'text/html');
    assert.deepEqual([...waiting.querySelectorAll('.iop-countryNote p')].map((p) => p.textContent), [island.country.loading]);
    assert.equal(waiting.querySelector('.iop-results .iop-note')?.textContent, island.country.needed);
  });

  it('as the page loads: its parts, their names, the Euro area figure, and nothing sent, asked for or written', () => {
    // A catalog with no name of its own for one currency.
    const { INR: _none, ...named } = island.currencies;
    mount({ strings: { ...island, currencies: named as typeof island.currencies } });
    {
      // the tool can be used, and its heatmaps are paused
      const root = one('.iop-root');
      assert.equal(root.className, 'ifc-root iop-root');
      assert.equal(root.hasAttribute('inert'), false);
      assert.equal(root.hasAttribute('aria-busy'), false);
      assert.equal(w.nidhiHeatmapsPaused, true);
    }
    {
      // the form: unnamed to click capture, named to a screen reader, never sent
      const form = one('.iop-root > form');
      assert.equal(form.className, 'ifc-form ph-no-capture');
      assert.equal(form.getAttribute('aria-label'), island.formLabel);
      assert.equal(fireEvent.submit(form), false, 'the form was sent');
      assert.equal(one('form > .iop-formHead > .iop-example').tagName, 'P');
      assert.equal(one('.iop-example').textContent, island.example);
      const reset = resetButton();
      assert.equal(reset.parentElement?.className, 'iop-formHead');
      assert.deepEqual([reset.type, reset.className, reset.textContent], ['button', 'btn btn--quiet iop-reset', island.actions.reset]);
      assert.deepEqual(all('form > fieldset').map((s) => [s.className, s.querySelector(':scope > legend')?.className, s.querySelector(':scope > legend')?.textContent]), [
        ['iop-section', 'iop-legend', island.sections.debt],
        ['iop-section iop-section--single', 'iop-legend', island.sections.extra],
        ['iop-section', 'iop-legend', island.sections.inflation],
        ['iop-section', 'iop-legend', island.sections.invest],
        ['iop-section iop-section--date', 'iop-legend', island.horizons.legend],
      ]);
      assert.deepEqual(all('form > *').map((el) => el.tagName), ['DIV', 'FIELDSET', 'FIELDSET', 'FIELDSET', 'FIELDSET', 'DETAILS', 'FIELDSET']);
    }
    {
      // the currency: every currency the tool knows, by its catalog name or its own label
      const select = currencySelect();
      assert.equal(select.className, 'ifc-input');
      assert.ok(select.id.endsWith('-currency'));
      assert.equal(select.parentElement?.className, 'ifc-field');
      assert.equal(select.parentElement?.parentElement?.className, 'ifc-grid');
      const label = select.parentElement?.querySelector('label');
      assert.deepEqual([label?.className, label?.htmlFor, label?.textContent], ['ifc-label', select.id, f.currency]);
      assert.equal(select.nextElementSibling?.className, 'ifc-fieldNote');
      assert.equal(select.value, 'EUR');
      const options = Object.fromEntries([...select.options].map((o) => [o.value, o.textContent]));
      assert.equal(options.EUR, island.currencies.EUR);
      assert.equal(options.INR, CURRENCIES.find((c) => c.code === 'INR')?.label);
      assert.deepEqual(Object.keys(options), CURRENCIES.map((c) => c.code));
    }
    {
      // the boxes: names, keyboards, units, help, and what else describes them
      const shape = (name: BoxName) => {
        const input = boxes[name]();
        const unit = input.parentElement?.querySelector('.ifc-unit')?.textContent ?? null;
        const hint = input.closest('.ifc-field')?.querySelector('.ifc-hint')?.textContent ?? null;
        return [input.id.slice(input.id.lastIndexOf('-') + 1), input.inputMode, unit, hint, input.getAttribute('aria-describedby'), input.placeholder, input.value];
      };
      const balance = boxes.balance();
      assert.equal(balance.closest('.ifc-grid')?.parentElement?.tagName, 'FIELDSET');
      const described = (name: BoxName, own: boolean) => (own ? `${boxes[name]().id}-hint` : null);
      assert.deepEqual(shape('balance'), ['balance', 'decimal', null, null, null, '', '18000']);
      assert.deepEqual(shape('debtRate'), ['debtRate', 'decimal', '%', f.debtRateHint, described('debtRate', true), '', '6.5']);
      assert.deepEqual(shape('payment'), ['payment', 'decimal', null, null, null, '', '400']);
      assert.deepEqual(shape('extra'), ['extra', 'decimal', null, f.extraHint, described('extra', true), '', '200']);
      assert.equal(boxes.extra().closest('fieldset')?.className, 'iop-section iop-section--single');
      // The inflation box offers the Euro area's figure, rounded to two decimals, until a figure is typed.
      assert.deepEqual(shape('inflation'), ['inflation', 'text', '%', f.inflationHint, described('inflation', true), '2', '']);
      assert.deepEqual(shape('relief'), ['relief', 'decimal', '%', f.reliefHint, described('relief', true), '', '0']);
      assert.deepEqual(shape('feePct'), ['feePct', 'decimal', '%', null, null, '', '0']);
      assert.deepEqual(shape('gainsTax'), ['gainsTax', 'decimal', '%', f.gainsTaxHint, described('gainsTax', true), '', '0']);
      assert.equal(boxes.feePct().closest('.ifc-grid')?.parentElement?.className, 'iop-moreBody');
      // Your own return is asked for only once it is the choice.
      assert.equal(all(`input[id$="-ownReturn"]`).length, 0);
    }
    {
      // the country: none, or one of the page's, and the Euro area's figures
      const select = countrySelect();
      assert.equal(select.className, 'ifc-input');
      assert.ok(select.id.endsWith('-country'));
      const label = select.parentElement?.querySelector('label');
      assert.deepEqual([label?.className, label?.htmlFor, label?.textContent], ['ifc-label', select.id, f.country]);
      assert.equal(select.nextElementSibling?.className, 'ifc-fieldNote');
      assert.deepEqual([...select.options].map((o) => [o.value, o.textContent]), [['', f.countryNone], ...COUNTRIES.map((c) => [c.code, c.name])]);
      assert.equal(select.value, 'EMU');
      const note = one('.iop-countryNote');
      assert.equal(note.getAttribute('aria-live'), 'polite');
      assert.equal(note.parentElement?.tagName, 'FIELDSET');
      assert.deepEqual(all('.iop-countryNote > p').map((p) => p.className), ['ifc-hint']);
      assert.deepEqual(countryNote(), [
        `${fill(island.country.average, { country: 'Euro area', first: 2016, last: 2025, avg: '2%' })} ${fill(island.country.context, { five: '2%', last: 2025, latest: '2%' })}`,
      ]);
      // The figure is the country's: nothing to go back to.
      none('.iop-linkBtn');
    }
    {
      // the returns: four choices, each with its rate after inflation, as one named group
      const group = one('.iop-choices:not(.iop-choices--date)');
      assert.deepEqual([group.getAttribute('role'), group.getAttribute('aria-label')], ['radiogroup', island.returns.legend]);
      const rows = [...group.children].map((label) => {
        const input = label.querySelector('input') as HTMLInputElement;
        return [label.tagName, label.className, input.type, input.value, input.checked, label.querySelector('.iop-choiceText > .iop-choiceLabel')?.textContent, label.querySelector('.iop-choiceText > .ifc-hint')?.textContent];
      });
      const rate = (choice: 'cautious' | 'historical' | 'optimistic') => pctText(rates({ ...DEFAULTS, inflation: 0, returns: choice } as Inputs).investReal);
      assert.deepEqual(rows, [
        ['LABEL', 'iop-choice', 'radio', 'cautious', false, island.returns.cautious.label, fill(island.returns.cautious.desc, { rate: rate('cautious') })],
        ['LABEL', 'iop-choice', 'radio', 'historical', true, island.returns.historical.label, fill(island.returns.historical.desc, { rate: rate('historical') })],
        ['LABEL', 'iop-choice', 'radio', 'optimistic', false, island.returns.optimistic.label, fill(island.returns.optimistic.desc, { rate: rate('optimistic') })],
        ['LABEL', 'iop-choice', 'radio', 'own', false, island.returns.own.label, island.returns.own.desc],
      ]);
      assert.equal(rate('cautious'), '4%');
      const names = new Set(all('.iop-choices:not(.iop-choices--date) input').map((i) => (i as HTMLInputElement).name));
      assert.equal(names.size, 1);
      assert.ok([...names][0].endsWith('-returns'));
    }
    {
      // taxes and fees: folded, saying none is in use
      const d = more();
      assert.equal(d.className, 'iop-more');
      assert.equal(d.open, false);
      const summary = d.querySelector(':scope > summary');
      assert.equal(summary?.className, 'iop-moreSummary disclosure');
      assert.deepEqual([...(summary?.children ?? [])].map((c) => [c.className, c.textContent]), [['iop-moreTitle', island.more.title], ['iop-moreStatus', island.more.none]]);
      assert.equal(d.querySelector(':scope > div')?.className, 'iop-moreBody');
    }
    {
      // the comparison date: three choices, five years after by default
      const group = one('.iop-choices.iop-choices--date');
      assert.equal(group.className, 'iop-choices iop-choices--date');
      assert.deepEqual([group.getAttribute('role'), group.getAttribute('aria-label')], ['radiogroup', island.horizons.legend]);
      assert.deepEqual([...group.children].map((label) => {
        const input = label.querySelector('input') as HTMLInputElement;
        return [label.className, input.value, input.checked, label.querySelector('.iop-choiceText > .iop-choiceLabel')?.textContent];
      }), [
        ['iop-choice', 'payoff', false, island.horizons.payoff],
        ['iop-choice', 'plus5', true, island.horizons.plus5],
        ['iop-choice', 'plus10', false, island.horizons.plus10],
      ]);
      const names = new Set(all('.iop-section--date .iop-choices--date input').map((i) => (i as HTMLInputElement).name));
      assert.equal(names.size, 1);
      assert.ok([...names][0].endsWith('-horizon'));
    }
    {
      // the results, named by their heading, with the example's comparison
      const section = one('.iop-root > section.iop-results');
      assert.equal(section.className, 'ifc-results iop-results');
      const heading = one('.iop-results > h2');
      assert.deepEqual([heading.className, heading.textContent], ['ifc-resultsTitle', r.heading]);
      assert.ok(heading.id.endsWith('-results'));
      assert.equal(section.getAttribute('aria-labelledby'), heading.id);
      assert.equal(withheld(), false);
      assert.deepEqual(resultNotes(), []);
      const lines = linesFor();
      assert.equal(headline(), lines[1]);
      assert.ok(text('.iop-answer p').includes(`${lines[0]} ${lines[2]}`));
      assert.ok(lines[2].includes('−€'), 'a negative amount has a true minus');
      // The basis choice is named for its group alone.
      const basis = all('input[type="radio"][value="end"]')[0] as HTMLInputElement;
      assert.ok(basis.name.endsWith('-basis'));
      // nothing said yet: the page loaded with it
      assert.equal(said(), '');
    }
    {
      // saving and sharing: ready, with the share note
      const share = shareButton();
      assert.deepEqual([share.type, share.className, ariaDisabled(share), share.hasAttribute('aria-disabled')], ['button', 'btn btn--outline', false, false]);
      assert.equal(share.parentElement?.className, 'iop-share');
      assert.equal(share.textContent?.includes(island.actions.copy), true);
      assert.equal(one('.iop-share > .ifc-hint').textContent, island.actions.shareNote);
      assert.equal(ariaDisabled(xlsxButton()), false);
      assert.equal(ariaDisabled(pdfButton()), false);
      assert.ok(!text('.tool-exportNote').includes(t.export.notReady));
      assert.ok(has('.tool-report'));
    }
    // No event: the example the page opens with is not a comparison anyone asked for (#882);
    // the state kept for the language switch is the untouched one.
    assert.deepEqual(events, []);
    assert.deepEqual(published, ['']);
    assert.deepEqual(asked, []);
    assert.ok(addressUntouched());
  });

  it('pauses heatmaps on a page whose analytics are running, and only there', () => {
    const calls: unknown[] = [];
    w.posthog = { __loaded: true, set_config: (c: { enable_heatmaps: boolean }) => calls.push(c), capture: () => {} };
    const first = mount({ initialHistory: null, defaultCountry: '' });
    assert.deepEqual(calls, [{ enable_heatmaps: false }]);
    first.unmount();
    w.posthog = { __loaded: false, set_config: (c: { enable_heatmaps: boolean }) => calls.push(c), capture: () => {} };
    const second = mount({ initialHistory: null, defaultCountry: '' });
    assert.equal(calls.length, 1);
    second.unmount();
    // analytics that have no settings to change are left alone, without an error
    w.posthog = { __loaded: true, set_config: 'not a function', capture: () => {} };
    mount({ initialHistory: null, defaultCountry: '' });
    assert.equal(w.nidhiHeatmapsPaused, true);
  });

  it('works the comparison out a quarter second after typing stops, from the last figure typed', () => {
    mount();
    const before = headline();
    assert.equal(before, linesFor()[1]);
    type('balance', '3000');
    pick('horizon', 'payoff');
    // still the example's comparison, with saving and sharing waiting quietly
    clock.pass(249);
    assert.equal(headline(), before);
    assert.equal(withheld(), false);
    assert.equal(ariaDisabled(shareButton()), true);
    assert.equal(ariaDisabled(xlsxButton()), true);
    assert.ok(!text('.tool-exportNote').includes(t.export.notReady), 'a keystroke is not a reason to show');
    // a later key starts the wait again
    type('balance', '1000');
    clock.pass(200);
    assert.equal(headline(), before);
    clock.pass(50);
    const lines = linesFor({ balance: 1000, horizon: 'payoff' });
    assert.equal(headline(), lines[1]);
    assert.ok(text('.iop-answer p').includes(`${lines[0]} ${lines[2]}`));
    assert.equal(ariaDisabled(shareButton()), false);
    assert.equal(shareButton().hasAttribute('aria-disabled'), false);
    assert.equal(ariaDisabled(xlsxButton()), false);
    // said once it has stayed the same for a little over half a second
    clock.pass(599);
    assert.equal(said(), '');
    clock.pass(1);
    assert.equal(said(), `${lines[1]} ${lines[0]} ${lines[2]}`);
    // the example is over
    assert.equal(one('.iop-example').textContent, '');
    // one calculated event, for the reader's own figures once they settled (#882), and nothing typed sent or written
    assert.deepEqual(eventNames(), ['free_invest_or_pay_off_calculated']);
    nothingTypedSent('3000', '1000');
    // the language switch carries what is typed
    assert.equal(decodeState(shared() as string)?.balance, 1000);
  });

  it('marks a box that cannot be read, withholds the results and says why after a second', () => {
    mount({ numberLocale: 'hi' });
    // Each box's own message, with its limits written the page's way.
    const big = (1e12).toLocaleString('hi');
    assert.equal(big, '10,00,00,00,00,000');
    const cases: Array<[BoxName, string]> = [
      ['balance', fill(f.amountError, { max: big })],
      ['debtRate', fill(f.percentError, { min: 0, max: (10_000).toLocaleString('hi') })],
      ['payment', fill(f.amountError, { max: big })],
      ['extra', fill(f.amountError, { max: big })],
      ['inflation', fill(f.percentError, { min: (-99.99).toLocaleString('hi'), max: (10_000).toLocaleString('hi') })],
      ['relief', fill(f.percentError, { min: 0, max: 100 })],
      ['feePct', fill(f.percentError, { min: 0, max: (5).toLocaleString('hi') })],
      ['gainsTax', fill(f.percentError, { min: 0, max: 100 })],
    ];
    for (const [name, message] of cases) {
      const input = boxes[name]();
      const was = input.value;
      type(name, '12x');
      assert.equal(input.getAttribute('aria-invalid'), 'true', name);
      const error = input.closest('.ifc-field')?.querySelector('.ifc-error');
      assert.equal(error?.textContent, fieldError(message), name);
      assert.equal(input.getAttribute('aria-errormessage'), error?.id);
      assert.ok(input.getAttribute('aria-describedby')?.startsWith(`${error?.id}`), name);
      type(name, was);
      assert.equal(input.hasAttribute('aria-invalid'), false, name);
    }
    clock.pass(5000);
    events.length = 0;
    const before = headline();
    type('balance', '7x');
    {
      // withheld at once, with the reason in its place
      assert.equal(withheld(), true);
      assert.deepEqual(reason(), [r.fix]);
      assert.equal(one('.iop-results .tool-resultBody').hasAttribute('inert'), true);
      assert.equal(one('.iop-example').textContent, '', 'figures that cannot be read are not the example');
      assert.equal(ariaDisabled(shareButton()), true);
      assert.equal(ariaDisabled(xlsxButton()), true);
      assert.ok(text('.tool-exportNote').includes(t.export.notReady));
      assert.equal(has('.tool-report'), false);
    }
    // nothing is worked out from it, however long it stays
    clock.pass(999);
    assert.equal(said(), '');
    clock.pass(1);
    assert.equal(said(), r.fix);
    clock.pass(5000);
    assert.equal(headline(), before);
    // not even from a choice made beside it
    pick('horizon', 'payoff');
    clock.pass(250);
    assert.equal(headline(), before);
    pick('horizon', 'plus5');
    // the copy and the exports do nothing
    fireEvent.click(shareButton());
    fireEvent.click(xlsxButton());
    fireEvent.click(pdfButton());
    assert.deepEqual(events, []);
    // put right: the results come back once the corrected comparison is there
    type('balance', '18000');
    assert.equal(withheld(), true);
    assert.deepEqual(reason(), []);
    // While the reader goes on typing good figures, the old reason is taken back and nothing else is said.
    for (const v of ['1800', '18000', '1800', '18000']) {
      clock.pass(200);
      type('balance', v);
    }
    assert.equal(withheld(), true);
    assert.equal(said(), '');
    clock.pass(250);
    assert.equal(withheld(), false);
    assert.ok(has('.tool-report'));
    assert.ok(addressUntouched());
  });

  it('says what stops a comparison: nothing owed, a payment below the interest, a debt longer than sixty years', () => {
    mount();
    clock.pass(1000);
    events.length = 0;
    const cases: Array<[BoxName, string, string]> = [
      ['balance', '0', island.problems['no-balance']],
      ['payment', '90', island.problems['payment-too-low']],
      ['payment', '99', fill(island.problems['too-long'], { years: 60 })],
    ];
    for (const [name, value, note] of cases) {
      typeAndSettle(name, value);
      assert.deepEqual(resultNotes(), [note]);
      // A problem leaves no comparison, so nothing is sent for it (#882).
      if (name === 'balance') assert.deepEqual(events, []);
      assert.equal(one('.iop-results .tool-resultBody > .iop-note').tagName, 'P');
      assert.equal(headline(), null);
      assert.equal(ariaDisabled(xlsxButton()), true);
      assert.ok(text('.tool-exportNote').includes(t.export.notReady));
      assert.equal(has('.tool-report'), false);
      clock.pass(600);
      assert.equal(said(), note);
      // Typing the same figure again: still nothing to save, and the page says so while it settles.
      type(name, `0${value}`);
      assert.ok(text('.tool-exportNote').includes(t.export.notReady));
      clock.pass(250);
      assert.deepEqual(resultNotes(), [note]);
      // Not yet a problem: put back.
      typeAndSettle(name, name === 'balance' ? '18000' : '400');
    }
    assert.deepEqual(resultNotes(), []);
    // the first comparison the reader's own figures settle on is sent, once (#882); none after it sends another
    assert.deepEqual(events, [['free_invest_or_pay_off_calculated', undefined]]);
  });
});
