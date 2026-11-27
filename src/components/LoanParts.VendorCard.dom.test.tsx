/**
 * The card for one loan offer (`VendorCard` in LoanCompare.tsx), mounted on
 * its own with the props the page gives it: the offer as typed, its result
 * from the engine, and the tool's English words.
 *
 * What is pinned is what a reader sees and uses: each box's label, its error
 * wiring, what typing hands back, which rows of optional boxes are open and
 * what they say they hold, the result rows of small loans whose figures are
 * worked out here by hand, and the fixed labels that analytics may see.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';
import { exportEn } from '../i18n/strings/tools/export.ts';
import { computeFromInput, computeNoPointsBaseline } from '../utils/loan/inputs.ts';
import type { LoanResult } from '../utils/loan/math.ts';
import { UNREADABLE } from '../utils/shared/linkInput.ts';
import { makeAddedVendor, type VendorInput } from '../utils/loan/url.ts';
import { VendorCard } from './LoanCompare.tsx';
import { NumberLocaleContext } from './LocaleNumberInput.tsx';
import { ErrorLeadContext, UnreadableContext } from './toolShared.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
};

const t = TOOL_STRINGS.en;
const s = t.loanComparison.island;
const c = s.card;
const r = s.results;

/** The loan every case starts from: 1,200 at 0% over 12 months, so 100 a month and 1,200 in all. */
function loan(patch: Partial<VendorInput> = {}): VendorInput {
  return { ...makeAddedVendor(0), principal: '1200', annualRatePct: '0', termMonths: '12', ...patch };
}

interface Options {
  label?: string;
  index?: number;
  active?: boolean;
  locale?: string;
  onRemove?: () => void;
  /** A result other than the engine's own for this offer. */
  result?: LoanResult;
}

/** What the card handed back, and what it sent to analytics. */
let patches: Partial<VendorInput>[] = [];
let sent: [string, unknown][] = [];

function element(vendor: VendorInput, options: Options) {
  return (
    <ErrorLeadContext.Provider value={t.export.fieldError}>
      <UnreadableContext.Provider value={t.export.fieldUnreadable}>
        <NumberLocaleContext.Provider value={options.locale ?? 'en'}>
          <VendorCard
            domId="offer-card-0"
            active={options.active ?? false}
            label={options.label ?? 'A'}
            color="#123456"
            index={options.index ?? 0}
            vendor={vendor}
            result={options.result ?? computeFromInput(vendor, 'EUR')}
            noPointsBaseline={computeNoPointsBaseline(vendor, 'EUR')}
            shared={{ monthly: 17, totalPaid: 19, totalInterest: 15 }}
            currency="EUR"
            strings={s}
            onChange={(patch) => { patches.push(patch); }}
            onRemove={options.onRemove}
          />
        </NumberLocaleContext.Provider>
      </UnreadableContext.Provider>
    </ErrorLeadContext.Provider>
  );
}

/** Mounts the card for an offer, as the page does. */
function show(vendor: VendorInput, options: Options = {}) {
  const view = render(element(vendor, options));
  const card = view.container.querySelector('article') as HTMLElement;
  return {
    card,
    /** The same card after the offer changed. */
    update: (next: VendorInput, nextOptions: Options = options) => view.rerender(element(next, nextOptions)),
    unmount: view.unmount,
  };
}

/** The controls of one kind whose label reads exactly `label` (a label's text includes its mark and currency). */
function labelled(card: HTMLElement, label: string, type: 'text' | 'radio'): HTMLInputElement[] {
  const found: HTMLInputElement[] = [];
  for (const el of card.querySelectorAll('label')) {
    if ((el.textContent ?? '').replace(/\s+/g, ' ').trim() !== label) continue;
    const control = el.control;
    if (control instanceof window.HTMLInputElement && control.type === type && card.contains(control)) found.push(control);
  }
  return found;
}

function only(found: HTMLInputElement[], label: string): HTMLInputElement {
  assert.equal(found.length, 1, `one control labelled "${label}"`);
  return found[0];
}

/** A text box by the whole text of its label. */
const box = (card: HTMLElement, label: string) => only(labelled(card, label, 'text'), label);

/** A choice by the whole text of its label. */
const choice = (card: HTMLElement, label: string) => only(labelled(card, label, 'radio'), label);

/** Whether the card has a box, or a choice, with this label. */
const asks = (card: HTMLElement, label: string) => labelled(card, label, 'text').length + labelled(card, label, 'radio').length > 0;

/** The result rows as read: label, value, and the lines under the value. */
function rows(card: HTMLElement): { label: string; value: string; hints: string[] }[] {
  return [...card.querySelectorAll('.lc-resultRow')].map((row) => {
    const value = (row.querySelector('dd') as Element).cloneNode(true) as Element;
    const hints = [...value.querySelectorAll('.lc-resultHint')].map((hint) => hint.textContent ?? '');
    for (const hint of value.querySelectorAll('.lc-resultHint')) hint.remove();
    return { label: row.querySelector('dt')?.textContent ?? '', value: value.textContent ?? '', hints };
  });
}

/** One of the four rows of optional boxes, by its title. */
function fold(card: HTMLElement, title: string): { open: boolean; state: string; toggle: (open: boolean) => void } {
  const all = [...card.querySelectorAll<HTMLDetailsElement>('details.lc-fieldGroup')];
  const details = all.find((d) => d.querySelector('.lc-fieldGroupTitle')?.textContent === title);
  assert.ok(details, `no row of optional boxes titled ${title}`);
  return {
    open: details.open,
    state: details.querySelector('.lc-fieldGroupState')?.textContent ?? '',
    // What a click on the row does: the browser opens or closes it, then says so.
    toggle: (open) => {
      details.open = open;
      fireEvent(details, new window.Event('toggle'));
    },
  };
}

/** Which of the four rows are open, in the order they stand. */
function openFolds(card: HTMLElement): string[] {
  return [c.rateStructure.title, c.costs.title, c.prepayments.title, c.penalty.title].filter((title) => fold(card, title).open);
}

const errorOf = (card: HTMLElement) => card.querySelector('.lc-error');

/** Whether a box is marked as wrong and pointed at the card's message. */
function wiring(card: HTMLElement, input: HTMLInputElement): { invalid: string | null; describes: boolean } {
  const describedBy = input.getAttribute('aria-describedby');
  const error = errorOf(card);
  return {
    invalid: input.getAttribute('aria-invalid'),
    describes: describedBy !== null && error !== null && error.id !== '' && describedBy === error.id,
  };
}

const UNMARKED = { invalid: null, describes: false };
const MARKED = { invalid: 'true', describes: true };

const LABELS = {
  name: c.name,
  principal: `${c.principal} * (EUR)`,
  rate: `${c.rate} *`,
  term: `${c.term} *`,
  monthly: `${c.monthly} * (EUR)`,
  // The two boxes of a rate that changes are required while they are shown.
  initialFixed: `${c.initialFixed} *`,
  subsequentRate: `${c.subsequentRate} *`,
};

/** The optional boxes: the field each one edits, its label, and whether it shows only for a rate that changes. */
const OPTIONAL: { key: keyof VendorInput; label: string; hybrid?: boolean; bad?: string }[] = [
  { key: 'initialFixedMonths', label: LABELS.initialFixed, hybrid: true },
  { key: 'subsequentRatePct', label: LABELS.subsequentRate, hybrid: true },
  { key: 'feeMajor', label: `${c.fee} (EUR)` },
  { key: 'pointsCostMajor', label: `${c.pointsCost} (EUR)` },
  { key: 'pointsRateReductionPct', label: c.pointsReduction },
  { key: 'extraMonthly', label: `${c.extra} (EUR)` },
  { key: 'lumpSumsEncoded', label: c.lumps, bad: '12-5000' },
  { key: 'prepayPenaltyPct', label: c.penaltyPct },
  { key: 'prepayPenaltyUntilMonth', label: c.penaltyUntil },
];

const HYBRID = { rateKind: 'hybrid', initialFixedMonths: '6', subsequentRatePct: '12' } as const;

beforeEach(() => {
  patches = [];
  sent = [];
  (window as unknown as { posthog?: unknown }).posthog = { capture: (event: string, properties: unknown) => { sent.push([event, properties]); } };
});
afterEach(() => {
  cleanup();
  delete (window as unknown as { posthog?: unknown }).posthog;
});

describe('the offer card: its heading, name and remove button', () => {
  it('is a labelled region that carries its id, its colour and whether it is the one shown on a phone', () => {
    const { card, update } = show(loan());
    assert.equal(card.id, 'offer-card-0');
    assert.deepEqual([...card.classList], ['lc-card']);
    assert.equal(card.style.getPropertyValue('--lc-color'), '#123456');
    const heading = card.querySelector('h3') as HTMLElement;
    assert.notEqual(heading.id, '');
    assert.equal(card.getAttribute('aria-labelledby'), heading.id);

    update(loan(), { active: true });
    assert.deepEqual([...card.classList], ['lc-card', 'lc-cardActive']);
  });

  it('heads an untouched or empty name with the offer and its letter, and a typed name with the letter and the name', () => {
    const untouched = show(loan({ name: 'Vendor B' }), { label: 'C' });
    // The heading takes the slot's letter; the box shows the stored default in the page's words.
    assert.equal(untouched.card.querySelector('h3')?.textContent, 'Offer C');
    assert.equal(box(untouched.card, LABELS.name).value, 'Offer B');
    assert.ok(untouched.card.querySelector('.lc-cardName') === null);
    untouched.unmount();

    const blank = show(loan({ name: '  ' }));
    assert.equal(blank.card.querySelector('h3')?.textContent, 'Offer A');
    assert.equal(box(blank.card, LABELS.name).value, '  ');
    blank.unmount();

    const typed = show(loan({ name: 'Zed Bank 9000' }), { label: 'B' });
    assert.equal(typed.card.querySelector('.lc-cardLetter')?.textContent, 'B');
    assert.equal(typed.card.querySelector('.lc-cardName')?.textContent, 'Zed Bank 9000');
    assert.equal(typed.card.querySelector('h3')?.textContent, 'BZed Bank 9000');
    assert.equal(box(typed.card, LABELS.name).value, 'Zed Bank 9000');
  });

  it('hands back a typed name as typed, and leaves the browser out of it', () => {
    const { card } = show(loan());
    const name = box(card, LABELS.name);
    assert.equal(name.getAttribute('autocomplete'), 'off');
    assert.equal(name.getAttribute('spellcheck'), 'false');
    fireEvent.change(name, { target: { value: ' Zed Bank ' } });
    assert.deepEqual(patches, [{ name: ' Zed Bank ' }]);
  });

  it('has no remove button when the page gives it nothing to remove with', () => {
    const { card } = show(loan());
    assert.equal(card.querySelectorAll('button').length, 0);
  });

  it('names its remove button by the offer letter, never by the typed name, and removes on a click', () => {
    let removed = 0;
    const { card } = show(loan({ name: 'Zed Bank 9000' }), { label: 'B', onRemove: () => { removed += 1; } });
    const buttons = card.querySelectorAll('button');
    assert.equal(buttons.length, 1);
    const remove = buttons[0];
    assert.equal(remove.getAttribute('aria-label'), 'Remove offer B from comparison');
    assert.equal(remove.getAttribute('title'), c.removeTitle);
    assert.equal(remove.getAttribute('data-attr'), 'lc-vendor-remove');
    assert.equal(remove.getAttribute('type'), 'button');
    fireEvent.click(remove);
    assert.equal(removed, 1);
    assert.deepEqual(patches, []);

    // The typed name is text on the page and the value of its own box, and in no other attribute.
    const holders: string[] = [];
    for (const node of [card, ...card.querySelectorAll('*')]) {
      for (const attribute of node.attributes) {
        if (attribute.value.includes('Zed') && !(node === box(card, LABELS.name) && attribute.name === 'value')) holders.push(`${node.tagName}.${attribute.name}`);
      }
    }
    assert.deepEqual(holders, []);
    // The remove button is the card's one analytics label.
    assert.deepEqual([...card.querySelectorAll('[data-attr]')].map((node) => node.getAttribute('data-attr')), ['lc-vendor-remove']);
  });
});

describe('the offer card: the required boxes', () => {
  it('labels each with its mark and currency, shows the offer as typed, and marks none while the offer is valid', () => {
    const { card } = show(loan({ principal: '1200', annualRatePct: '4.5', termMonths: '24' }));
    const principal = box(card, LABELS.principal);
    const rate = box(card, LABELS.rate);
    const term = box(card, LABELS.term);
    assert.equal(principal.value, '1200');
    assert.equal(rate.value, '4.5');
    assert.equal(term.value, '24');
    assert.equal(principal.getAttribute('inputmode'), 'decimal');
    assert.equal(term.getAttribute('inputmode'), 'numeric');
    for (const input of [principal, rate, term]) {
      assert.equal(input.getAttribute('aria-required'), 'true');
      assert.deepEqual(wiring(card, input), UNMARKED);
      assert.ok(!input.hasAttribute('aria-describedby'));
    }
    assert.ok(errorOf(card) === null);
    // Solving for the payment: the term is asked for, the payment is not.
    assert.ok(!asks(card, LABELS.monthly));
    assert.equal(card.querySelectorAll(`[title="${c.requiredTitle}"]`).length, 4);
  });

  it('asks for the payment instead of the term when the offer is entered by its payment', () => {
    const { card } = show(loan({ modeKind: 'payment', monthlyPayment: '100', termMonths: '' }));
    const monthly = box(card, LABELS.monthly);
    assert.equal(monthly.value, '100');
    assert.equal(monthly.getAttribute('aria-required'), 'true');
    assert.equal(monthly.getAttribute('inputmode'), 'decimal');
    assert.deepEqual(wiring(card, monthly), UNMARKED);
    assert.ok(!asks(card, LABELS.term));
    // 1,200 at 0%, 100 a month: twelve payments.
    assert.deepEqual(rows(card)[0], { label: r.monthly, value: '€100.00', hints: [] });
    assert.deepEqual(rows(card)[3], { label: r.timeToPayoff, value: '1 yr', hints: ['12 payments'] });
  });

  it('says what is wrong with a required box, marks the required boxes and points each at the message', () => {
    const { card } = show(loan({ principal: '' }));
    const error = errorOf(card) as HTMLElement;
    assert.equal(error.textContent, `Error: ${s.engine.errors.amount}`);
    assert.equal(error.tagName, 'P');
    for (const input of [box(card, LABELS.principal), box(card, LABELS.rate), box(card, LABELS.term)]) {
      assert.deepEqual(wiring(card, input), MARKED);
    }
    // No result is shown beside an error, and the optional boxes are not blamed.
    assert.deepEqual(rows(card), []);
    assert.ok(card.querySelector('.lc-resultDetails') === null);
    assert.deepEqual(wiring(card, box(card, `${c.fee} (EUR)`)), UNMARKED);

    cleanup();
    const byPayment = show(loan({ modeKind: 'payment', monthlyPayment: '' }));
    assert.equal(errorOf(byPayment.card)?.textContent, `Error: ${s.engine.errors.paymentEnter}`);
    assert.deepEqual(wiring(byPayment.card, box(byPayment.card, LABELS.monthly)), MARKED);
  });

  it('hands back what is typed as a plain number, however the page writes numbers', () => {
    const term = show(loan(), { locale: 'es' });
    fireEvent.change(box(term.card, LABELS.principal), { target: { value: '10.000,5' } });
    fireEvent.change(box(term.card, LABELS.rate), { target: { value: '2,5' } });
    fireEvent.change(box(term.card, LABELS.term), { target: { value: '24' } });
    assert.deepEqual(patches, [{ principal: '10000.5' }, { annualRatePct: '2.5' }, { termMonths: '24' }]);
    term.unmount();

    patches = [];
    const payment = show(loan({ modeKind: 'payment', monthlyPayment: '100' }), { locale: 'es' });
    fireEvent.change(box(payment.card, LABELS.monthly), { target: { value: '1.050,25' } });
    assert.deepEqual(patches, [{ monthlyPayment: '1050.25' }]);
  });

  it('says a value that arrived unreadable could not be read, and names the fault once the reader types', () => {
    const vendor = loan({ principal: UNREADABLE });
    const { card } = show(vendor);
    assert.equal(errorOf(card)?.textContent, `Error: ${t.export.fieldUnreadable}`);
    assert.deepEqual(wiring(card, box(card, LABELS.principal)), MARKED);
    // The page keeps the offer as it is here, so only the card knows that typing began.
    fireEvent.change(box(card, LABELS.rate), { target: { value: '3' } });
    assert.deepEqual(patches, [{ annualRatePct: '3' }]);
    assert.equal(errorOf(card)?.textContent, `Error: ${s.engine.errors.amount}`);
  });

  it('names the fault at once for a wrong value that carries no mark of having arrived', () => {
    const { card } = show(loan({ annualRatePct: '-1' }));
    assert.equal(errorOf(card)?.textContent, `Error: ${s.engine.errors.rate}`);
  });
});

describe('the offer card: solving for the payment or for the months', () => {
  it('shows which is chosen, in a group of its own', () => {
    const { card } = show(loan());
    const payment = choice(card, c.modeTerm);
    const monthsChoice = choice(card, c.modePayment);
    assert.ok(payment.checked);
    assert.ok(!monthsChoice.checked);
    assert.equal(payment.value, 'term');
    assert.equal(monthsChoice.value, 'payment');
    assert.deepEqual([...(payment.closest('label') as Element).classList], ['lc-modeOption', 'lc-modeOptionActive']);
    assert.deepEqual([...(monthsChoice.closest('label') as Element).classList], ['lc-modeOption']);
    assert.equal(payment.closest('fieldset')?.querySelector('legend')?.textContent, `${c.solveFor} *`);
    // One group per question and per card: the arrow keys stay inside it.
    const rateType = choice(card, c.fixed);
    assert.notEqual(payment.name, '');
    assert.equal(payment.name, monthsChoice.name);
    assert.notEqual(rateType.name, '');
    assert.equal(rateType.name, choice(card, c.hybrid).name);
    assert.notEqual(rateType.name, payment.name);
    const other = show(loan());
    assert.notEqual(choice(other.card, c.modeTerm).name, payment.name);
    assert.notEqual(choice(other.card, c.fixed).name, rateType.name);
  });

  it('hands back the other choice on a click and tells analytics the choice and the offer letter only', () => {
    const term = show(loan(), { label: 'B' });
    fireEvent.click(choice(term.card, c.modePayment));
    assert.deepEqual(patches, [{ modeKind: 'payment' }]);
    assert.deepEqual(sent, [['free_loan_comparison_mode_changed', { vendor: 'B', mode: 'payment' }]]);
    term.unmount();

    patches = [];
    sent = [];
    const payment = show(loan({ modeKind: 'payment', monthlyPayment: '100' }), { label: 'C' });
    const chosen = choice(payment.card, c.modePayment);
    assert.ok(chosen.checked);
    assert.ok(!choice(payment.card, c.modeTerm).checked);
    assert.deepEqual([...(chosen.closest('label') as Element).classList], ['lc-modeOption', 'lc-modeOptionActive']);
    assert.deepEqual([...(choice(payment.card, c.modeTerm).closest('label') as Element).classList], ['lc-modeOption']);
    fireEvent.click(choice(payment.card, c.modeTerm));
    assert.deepEqual(patches, [{ modeKind: 'term' }]);
    assert.deepEqual(sent, [['free_loan_comparison_mode_changed', { vendor: 'C', mode: 'term' }]]);
  });
});

describe('the offer card: the result rows', () => {
  it('shows a plain loan: 1,200 at 0% over 12 months is 100 a month and 1,200 in all', () => {
    const { card } = show(loan());
    assert.deepEqual(rows(card), [
      { label: r.monthly, value: '€100.00', hints: [] },
      { label: r.apr, value: '0.00%', hints: [r.aprNoFees, r.aprBasis] },
      { label: r.totalPaid, value: '€1,200.00', hints: [] },
      { label: r.timeToPayoff, value: '1 yr', hints: ['12 payments'] },
      { label: r.totalInterest, value: '€0.00', hints: [] },
    ]);
    assert.deepEqual([...card.querySelectorAll('.lc-resultRowEmphasized dt')].map((dt) => dt.textContent), [r.totalPaid]);
    assert.equal(card.querySelector('.lc-resultDetailsSummary')?.textContent, r.showDetails);
    assert.equal(card.querySelectorAll('.lc-warning').length, 0);
    // The headline rows are sized with the same rows of the other offers.
    const size = (label: string) => {
      const row = [...card.querySelectorAll('.lc-resultRow')].find((el) => el.querySelector('dt')?.textContent === label);
      return (row?.querySelector('dd > .amt') as HTMLElement).style.getPropertyValue('--amt-len');
    };
    assert.deepEqual([size(r.monthly), size(r.totalPaid), size(r.totalInterest)], ['17', '19', '15']);
  });

  it('shows one payment of interest: 1,000 at 12% for a month is 1,010, of which 10 is interest', () => {
    const { card } = show(loan({ principal: '1000', annualRatePct: '12', termMonths: '1' }));
    assert.deepEqual(rows(card), [
      { label: r.monthly, value: '€1,010.00', hints: [] },
      { label: r.apr, value: '12.00%', hints: [r.aprNoFees, r.aprBasis] },
      { label: r.totalPaid, value: '€1,010.00', hints: [] },
      { label: r.timeToPayoff, value: '1 mo', hints: ['1 payment'] },
      { label: r.totalInterest, value: '€10.00', hints: [] },
    ]);
  });

  it('counts a fee in the total, shows it on a row of its own and says the APR includes it', () => {
    const { card } = show(loan({ feeMajor: '60' }));
    const shown = rows(card);
    assert.deepEqual(shown.map((row) => row.label), [r.monthly, r.apr, r.totalPaid, r.timeToPayoff, r.totalInterest, r.fees]);
    assert.deepEqual(shown[1].hints, [r.aprFees, r.aprBasis]);
    assert.deepEqual(shown[2], { label: r.totalPaid, value: '€1,260.00', hints: [] });
    assert.deepEqual(shown[5], { label: r.fees, value: '€60.00', hints: [] });
  });

  it('says how much of the payment is extra: 100 due and 100 extra clears 1,200 in six months', () => {
    const { card } = show(loan({ extraMonthly: '100' }));
    assert.deepEqual(rows(card), [
      { label: r.monthly, value: '€200.00', hints: ['€100.00 + €100.00 extra'] },
      { label: r.apr, value: '0.00%', hints: [r.aprNoFees, r.aprBasis] },
      { label: r.totalPaid, value: '€1,200.00', hints: [] },
      { label: r.timeToPayoff, value: '6 mo', hints: ['6 payments'] },
      { label: r.totalInterest, value: '€0.00', hints: [] },
    ]);
  });

  it('shows the penalty for paying off early: 10% of the 200 cleared in month 6', () => {
    const { card } = show(loan({ extraMonthly: '100', prepayPenaltyPct: '10', prepayPenaltyUntilMonth: '12' }));
    const shown = rows(card);
    assert.deepEqual(shown.map((row) => row.label), [r.monthly, r.apr, r.totalPaid, r.timeToPayoff, r.totalInterest, r.penalty]);
    assert.deepEqual(shown[5], { label: r.penalty, value: '€20.00', hints: [r.penaltyHint] });
    assert.equal(shown[2].value, '€1,220.00');
  });

  it('shows both payments of a rate that changes, each under its own months', () => {
    // 600 is owed after six months at 0%. Six more at 1% a month: the level payment of an annuity.
    const later = (600 * 0.01) / (1 - 1.01 ** -6);
    const { card } = show(loan(HYBRID));
    const shown = rows(card);
    assert.deepEqual(shown[0], {
      label: r.monthly,
      value: `Months 1 to 6 €100.00From month 7 €${later.toFixed(2)}`,
      hints: [r.monthlyLaterNote],
    });
    assert.equal(later.toFixed(2), '103.53');
    assert.deepEqual(shown.map((row) => row.label), [r.monthly, r.apr, r.totalPaid, r.timeToPayoff, r.totalInterest]);
    assert.ok(card.querySelector('.lc-resultRowSteps') !== null);
  });

  it('says a later payment that is the last one is the last: 100 left for month 12 costs 101 at 1% a month', () => {
    const { card } = show(loan({ ...HYBRID, initialFixedMonths: '11' }));
    assert.deepEqual(rows(card)[0], {
      label: r.monthly,
      value: 'Months 1 to 11 €100.00Month 12, last payment €101.00',
      hints: [r.monthlyLaterNote],
    });
  });

  it('says what part of a changing payment is extra', () => {
    const { card } = show(loan({ ...HYBRID, extraMonthly: '10' }));
    const first = rows(card)[0];
    assert.ok(first.value.startsWith('Months 1 to 6 €110.00From month 7 €'));
    assert.deepEqual(first.hints, [r.monthlyLaterNote, 'includes €10.00 extra each month']);
  });

  it('shows one payment, and when it ended, for a loan paid off before its rate would change', () => {
    // 100 due and 200 extra clears 1,200 in month 4; the rate would change in month 7.
    const { card } = show(loan({ ...HYBRID, extraMonthly: '200' }));
    assert.deepEqual(rows(card)[0], {
      label: r.monthly,
      value: '€300.00',
      hints: ['€100.00 + €200.00 extra', 'Paid off in month 4, before the rate changes'],
    });
    assert.ok(card.querySelector('.lc-resultRowSteps') === null);
  });

  it('shows a kept payment as one amount with its payoff, and the interest the later rate adds', () => {
    // 600 is owed after month 6; from month 7 it bears 1% a month, 100 is paid, and month 12 clears the rest.
    let owed = 60000;
    let interest = 0;
    for (let month = 7; month <= 12; month++) {
      const charge = Math.round(owed * 0.01);
      interest += charge;
      owed = month === 12 ? 0 : owed + charge - 10000;
    }
    const euros = (cents: number) => `€${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    assert.equal(interest, 2171);
    const { card } = show(loan({ ...HYBRID, rateChangeKeeps: 'payment' }));
    const shown = rows(card);
    assert.deepEqual(shown[0], { label: r.monthly, value: '€100.00', hints: [r.keptNote] });
    assert.deepEqual(shown[1], { label: r.payoff, value: 'Month 12', hints: ['Matches the entered term of 1 yr.'] });
    assert.deepEqual(shown[3], { label: r.totalPaid, value: euros(120000 + interest), hints: [] });
    assert.deepEqual(shown[4], { label: r.timeToPayoff, value: '1 yr', hints: ['12 payments'] });
    assert.deepEqual(shown[5], { label: r.totalInterest, value: euros(interest), hints: [] });
    assert.equal(shown.length, 6);
    assert.ok(card.querySelector('.lc-resultRowSteps') === null);
  });

  it('says what part of a kept payment is extra', () => {
    const { card } = show(loan({ ...HYBRID, rateChangeKeeps: 'payment', extraMonthly: '10' }));
    assert.deepEqual(rows(card)[0], {
      label: r.monthly,
      value: '€110.00',
      hints: [r.keptNote, 'includes €10.00 extra each month'],
    });
  });

  it('gives no totals, APR or payoff time for a loan that is never paid off', () => {
    // 600 owed at 20% a month is 120 of interest against a payment of 100.
    const { card } = show(loan({ ...HYBRID, subsequentRatePct: '240', rateChangeKeeps: 'payment' }));
    assert.deepEqual(rows(card), [
      { label: r.monthly, value: '€100.00', hints: [r.keptNote] },
      { label: r.payoff, value: r.notPaidOff, hints: ['From month 7, the payment is less than the monthly interest. The balance grows.'] },
      { label: r.apr, value: r.notAvailable, hints: [] },
      { label: r.totalPaid, value: r.noFiniteTotal, hints: [] },
      { label: r.timeToPayoff, value: r.notPaidOff, hints: [] },
      { label: r.totalInterest, value: r.noFiniteTotal, hints: [] },
    ]);
  });

  it('says so in words when a fee leaves no APR to work out', () => {
    const { card } = show(loan({ feeMajor: '1200' }));
    assert.deepEqual(rows(card)[1], { label: r.apr, value: r.aprNa, hints: [r.aprFees, r.aprBasis] });
  });

  it('shows the engine warnings under the result, in the reader language, as status messages', () => {
    const vendor = loan(HYBRID);
    const result = {
      ...computeFromInput(vendor, 'EUR'),
      warnings: [
        'After the initial fixed period, the subsequent rate is so high that the recast payment barely covers interest.',
        'A sentence the tool does not know.',
      ],
    };
    const { card } = show(vendor, { result });
    const warnings = [...card.querySelectorAll('.lc-warning')];
    assert.deepEqual(warnings.map((w) => w.textContent), [s.engine.warnings.subsequentRate, 'A sentence the tool does not know.']);
    assert.deepEqual(warnings.map((w) => w.getAttribute('role')), ['status', 'status']);
    assert.equal(rows(card).length, 5);
  });

  it('tells analytics that the details were opened, with the offer letter only, and nothing when they close', () => {
    const { card } = show(loan(), { label: 'B' });
    const details = card.querySelector('details.lc-resultDetails') as HTMLDetailsElement;
    details.open = true;
    fireEvent(details, new window.Event('toggle'));
    assert.deepEqual(sent, [['free_loan_comparison_details_toggled', { vendor: 'B' }]]);
    details.open = false;
    fireEvent(details, new window.Event('toggle'));
    assert.equal(sent.length, 1);
  });
});

describe('the offer card: when discount points pay for themselves', () => {
  const breakEven = (card: HTMLElement) => rows(card).find((row) => row.label === r.breakEven);

  it('has no such row for an offer without points', () => {
    const { card } = show(loan({ feeMajor: '10' }));
    assert.ok(breakEven(card) === undefined);
  });

  it('says the month and the saving: 6 of points save 12 of interest on a one-month loan', () => {
    // With points: 1,200 at 0% for a month, fee 10. Without: 12% (1% a month, 12 of interest), fee 4.
    const { card } = show(loan({ termMonths: '1', feeMajor: '10', pointsCostMajor: '6', pointsRateReductionPct: '12' }));
    assert.deepEqual(breakEven(card), { label: r.breakEven, value: '1 mo', hints: ['Saves €6.00 over the term'] });
  });

  it('says what the points cost when the loan ends first: 20 of points against 12 of interest', () => {
    // The payment falls by 12, so 20 is recovered in the second month; the loan lasts one.
    const { card } = show(loan({ termMonths: '1', feeMajor: '20', pointsCostMajor: '20', pointsRateReductionPct: '12' }));
    assert.deepEqual(breakEven(card), {
      label: r.breakEven,
      value: '2 mo',
      hints: ['Costs €8.00 more over the term: the loan ends before the points pay for themselves'],
    });
  });

  it('says never when the points are never recovered', () => {
    // Entered by its payment, the payment is the same with and without points, and 5,000 is more than is ever owed.
    const { card } = show(loan({ modeKind: 'payment', monthlyPayment: '100', feeMajor: '5000', pointsCostMajor: '5000', pointsRateReductionPct: '1' }));
    assert.deepEqual(breakEven(card), { label: r.breakEven, value: r.never, hints: [r.breakEvenNever] });
  });

  it('has no such row when the offer without points cannot be worked out', () => {
    // 12.50 a month covers the 12 of interest at 12%, but not the 13 at 13%.
    const vendor = loan({ annualRatePct: '12', modeKind: 'payment', monthlyPayment: '12.5', feeMajor: '10', pointsCostMajor: '6', pointsRateReductionPct: '1' });
    assert.ok(computeNoPointsBaseline(vendor, 'EUR')?.error);
    const { card } = show(vendor);
    assert.ok(errorOf(card) === null);
    assert.ok(breakEven(card) === undefined);
    assert.equal(rows(card).at(-1)?.label, r.fees);
  });
});

describe('the offer card: the rows of optional boxes', () => {
  it('keeps all four closed on an untouched offer and says in words what each holds', () => {
    for (const label of ['A', 'B', 'E', 'not a letter']) {
      const { card, unmount } = show(loan(), { label });
      assert.deepEqual(openFolds(card), []);
      assert.equal(fold(card, c.rateStructure.title).state, c.statusFixed);
      assert.equal(fold(card, c.costs.title).state, c.foldNone);
      assert.equal(fold(card, c.prepayments.title).state, c.foldNone);
      assert.equal(fold(card, c.penalty.title).state, c.foldNone);
      unmount();
    }
  });

  it('opens the row whose box differs from the starting offer, and no other', () => {
    const cases: [Partial<VendorInput>, string][] = [
      [{ rateKind: 'hybrid' }, c.rateStructure.title],
      [{ rateChangeKeeps: 'payment' }, c.rateStructure.title],
      [{ feeMajor: '60' }, c.costs.title],
      [{ feeMajor: '60', pointsCostMajor: '6' }, c.costs.title],
      [{ pointsRateReductionPct: '0.25' }, c.costs.title],
      // An emptied points box is no longer the starting 0, and is neither unreadable nor above the fee.
      [{ pointsCostMajor: '' }, c.costs.title],
      [{ extraMonthly: '50' }, c.prepayments.title],
      [{ lumpSumsEncoded: '3:100' }, c.prepayments.title],
      [{ prepayPenaltyPct: '2' }, c.penalty.title],
      [{ prepayPenaltyUntilMonth: '12' }, c.penalty.title],
    ];
    for (const [patch, title] of cases) {
      const { card, unmount } = show(loan(patch));
      assert.deepEqual(openFolds(card), [title], JSON.stringify(patch));
      unmount();
    }
    // A points cost alone opens its row too (the card then carries the fee error).
    const points = show(loan({ pointsCostMajor: '6' }));
    assert.deepEqual(openFolds(points.card), [c.costs.title]);
  });

  it('says what each row holds: the kind of rate, and filled in or none', () => {
    const state = (patch: Partial<VendorInput>, title: string) => {
      const { card, unmount } = show(loan(patch));
      const said = fold(card, title).state;
      unmount();
      return said;
    };
    assert.equal(state({ rateKind: 'hybrid' }, c.rateStructure.title), c.statusHybrid);
    assert.equal(state({ rateKind: 'hybrid', rateChangeKeeps: 'payment' }, c.rateStructure.title), c.statusHybridKept);
    // Entered by its payment, the row still says what is chosen: the offer is refused for it, not worked out as a fixed rate.
    assert.equal(state({ rateKind: 'hybrid', modeKind: 'payment', monthlyPayment: '100' }, c.rateStructure.title), c.statusHybrid);
    // What happens at the change is not asked there, so the row does not say it.
    assert.equal(state({ rateKind: 'hybrid', rateChangeKeeps: 'payment', modeKind: 'payment', monthlyPayment: '100' }, c.rateStructure.title), c.statusHybrid);
    assert.equal(state({ modeKind: 'payment', monthlyPayment: '100' }, c.rateStructure.title), c.statusFixed);
    assert.equal(state({ rateChangeKeeps: 'payment' }, c.rateStructure.title), c.statusFixed);

    assert.equal(state({ feeMajor: '60' }, c.costs.title), c.foldSet);
    assert.equal(state({ pointsCostMajor: '6' }, c.costs.title), c.foldSet);
    assert.equal(state({ pointsRateReductionPct: '0.25' }, c.costs.title), c.foldNone);

    assert.equal(state({ extraMonthly: '50' }, c.prepayments.title), c.foldSet);
    assert.equal(state({ lumpSumsEncoded: '3:100' }, c.prepayments.title), c.foldSet);
    assert.equal(state({ lumpSumsEncoded: '  ' }, c.prepayments.title), c.foldNone);

    assert.equal(state({ prepayPenaltyPct: '2' }, c.penalty.title), c.foldSet);
    assert.equal(state({ prepayPenaltyUntilMonth: '12' }, c.penalty.title), c.foldSet);
  });

  it('keeps a row the reader opened open when its box is emptied again', () => {
    const { card, update } = show(loan());
    fold(card, c.costs.title).toggle(true);
    update(loan({ feeMajor: '60' }));
    update(loan());
    assert.deepEqual(openFolds(card), [c.costs.title]);
  });

  it('keeps a row the reader closed closed while its boxes can be read', () => {
    const { card, update } = show(loan());
    update(loan({ extraMonthly: '50' }));
    assert.deepEqual(openFolds(card), [c.prepayments.title]);
    fold(card, c.prepayments.title).toggle(false);
    update(loan({ extraMonthly: '55' }));
    update(loan());
    update(loan({ extraMonthly: '60' }));
    assert.deepEqual(openFolds(card), []);
  });

  it('opens a row the reader closed again when one of its boxes cannot be read', () => {
    const cases: [title: string, good: Partial<VendorInput>, bad: Partial<VendorInput>][] = [
      [c.rateStructure.title, HYBRID, { ...HYBRID, initialFixedMonths: 'six' }],
      [c.rateStructure.title, HYBRID, { ...HYBRID, subsequentRatePct: '-2' }],
      // A box of a changing rate that is left out is marked the same way.
      [c.rateStructure.title, HYBRID, { ...HYBRID, subsequentRatePct: '' }],
      [c.rateStructure.title, HYBRID, { ...HYBRID, initialFixedMonths: '' }],
      [c.costs.title, { feeMajor: '60' }, { feeMajor: '€60' }],
      [c.costs.title, { feeMajor: '60' }, { feeMajor: '60', pointsCostMajor: 'x' }],
      [c.costs.title, { feeMajor: '60' }, { feeMajor: '60', pointsRateReductionPct: 'x' }],
      // A points cost above the fee is marked the same way.
      [c.costs.title, { feeMajor: '60' }, { feeMajor: '60', pointsCostMajor: '70' }],
      [c.prepayments.title, { extraMonthly: '50' }, { extraMonthly: '50 a month' }],
      [c.prepayments.title, { extraMonthly: '50' }, { extraMonthly: '50', lumpSumsEncoded: '12-5000' }],
      [c.penalty.title, { prepayPenaltyPct: '2' }, { prepayPenaltyPct: 'two' }],
      [c.penalty.title, { prepayPenaltyPct: '2' }, { prepayPenaltyPct: '2', prepayPenaltyUntilMonth: 'x' }],
    ];
    for (const [title, good, bad] of cases) {
      const { card, update, unmount } = show(loan(good));
      assert.deepEqual(openFolds(card), [title], JSON.stringify(good));
      fold(card, title).toggle(false);
      update(loan({ ...good, name: 'still readable' }));
      assert.deepEqual(openFolds(card), [], JSON.stringify(good));
      update(loan(bad));
      assert.deepEqual(openFolds(card), [title], JSON.stringify(bad));
      unmount();
    }
  });
});

describe('the offer card: the optional boxes', () => {
  it('labels each box, shows its value and its help, and marks none while they can be read', () => {
    const vendor = loan({
      ...HYBRID, feeMajor: '60', pointsCostMajor: '6', pointsRateReductionPct: '0.25', extraMonthly: '50',
      lumpSumsEncoded: '3:100', prepayPenaltyPct: '2', prepayPenaltyUntilMonth: '12',
    });
    const { card } = show(vendor);
    for (const field of OPTIONAL) {
      const input = box(card, field.label);
      assert.equal(input.value, vendor[field.key], field.key);
      assert.deepEqual(wiring(card, input), UNMARKED, field.key);
      assert.ok(!input.hasAttribute('aria-describedby'), field.key);
      // The two boxes of a changing rate are needed while they are shown; the rest are optional.
      assert.equal(input.getAttribute('aria-required'), field.hybrid ? 'true' : null, field.key);
    }
    // Each of the two carries the mark the required boxes have, beside theirs.
    assert.equal(card.querySelectorAll(`[title="${c.requiredTitle}"]`).length, 6);
    for (const label of [LABELS.initialFixed, LABELS.subsequentRate]) {
      const mark = box(card, label).labels?.[0]?.querySelector('.lc-required');
      assert.equal(mark?.getAttribute('aria-hidden'), 'true', label);
      assert.equal(mark?.getAttribute('title'), c.requiredTitle, label);
    }
    const text = card.textContent ?? '';
    const lumps = c.lumpsHelp;
    for (const help of [
      c.rateStructure.hint, c.costs.hint, c.prepayments.hint, c.penalty.hint,
      c.initialFixedHelp, c.subsequentRateHelp, c.pointsCostHelp, c.pointsReductionHelp, c.penaltyUntilHelp,
      `${lumps.before}${lumps.format}${lumps.mid}12:5000;36:3000${lumps.after}`,
    ]) assert.ok(text.includes(help), help);
    assert.equal(box(card, c.lumps).getAttribute('placeholder'), '12:5000;36:3000');
    assert.equal(box(card, c.lumps).getAttribute('spellcheck'), 'false');
  });

  it('marks the one box that cannot be read and points it at the message, and leaves the required boxes alone', () => {
    for (const field of OPTIONAL) {
      const { card, unmount } = show(loan({ ...(field.hybrid ? HYBRID : {}), [field.key]: field.bad ?? 'abc' }));
      assert.equal(errorOf(card)?.textContent, `Error: ${s.engine.errors.optionalUnreadable}`, field.key);
      for (const other of OPTIONAL) {
        if (other.hybrid && !field.hybrid) continue;
        assert.deepEqual(wiring(card, box(card, other.label)), other === field ? MARKED : UNMARKED, `${other.key} when ${field.key} is unreadable`);
      }
      for (const label of [LABELS.principal, LABELS.rate, LABELS.term]) {
        assert.deepEqual(wiring(card, box(card, label)), UNMARKED, `${label} when ${field.key} is unreadable`);
      }
      unmount();
    }
  });

  it('marks the lump-sum box for part of a month or a month past 1,200, where the lump sum used to be moved or dropped (issue 796)', () => {
    for (const lumpSumsEncoded of ['3.5:100', '1300:100']) {
      const { card, unmount } = show(loan({ lumpSumsEncoded }));
      assert.equal(errorOf(card)?.textContent, `Error: ${s.engine.errors.lumpMonth}`, lumpSumsEncoded);
      assert.deepEqual(wiring(card, box(card, c.lumps)), MARKED, lumpSumsEncoded);
      assert.deepEqual(wiring(card, box(card, LABELS.principal)), UNMARKED, lumpSumsEncoded);
      assert.deepEqual(rows(card), [], lumpSumsEncoded);
      unmount();
    }
    // Text that does not read keeps the other message, also beside such a month.
    const mixed = show(loan({ lumpSumsEncoded: '3.5:100;12-5000' }));
    assert.equal(errorOf(mixed.card)?.textContent, `Error: ${s.engine.errors.optionalUnreadable}`);
    mixed.unmount();
    const { card } = show(loan({ lumpSumsEncoded: '3:100' }));
    assert.equal(errorOf(card), null);
    assert.deepEqual(wiring(card, box(card, c.lumps)), UNMARKED);
  });

  it('marks the points cost, not the fee, when the points cost is more than the fee they are part of', () => {
    const { card } = show(loan({ feeMajor: '5', pointsCostMajor: '10' }));
    assert.equal(errorOf(card)?.textContent, `Error: ${s.engine.errors.pointsAboveFee}`);
    assert.deepEqual(wiring(card, box(card, `${c.pointsCost} (EUR)`)), MARKED);
    assert.deepEqual(wiring(card, box(card, `${c.fee} (EUR)`)), UNMARKED);
    assert.deepEqual(wiring(card, box(card, LABELS.principal)), UNMARKED);
  });

  it('marks the box of a changing rate that is left out, says both are needed, and leaves the required boxes alone (issue 818)', () => {
    const cases: [patch: Partial<VendorInput>, months: ReturnType<typeof wiring>, later: ReturnType<typeof wiring>][] = [
      [{ subsequentRatePct: '' }, UNMARKED, MARKED],
      [{ initialFixedMonths: '' }, MARKED, UNMARKED],
      [{ initialFixedMonths: '0' }, MARKED, UNMARKED],
      [{ initialFixedMonths: '', subsequentRatePct: '' }, MARKED, MARKED],
    ];
    for (const [patch, months, later] of cases) {
      const { card, unmount } = show(loan({ ...HYBRID, ...patch }));
      const at = JSON.stringify(patch);
      assert.equal(errorOf(card)?.textContent, `Error: ${s.engine.errors.rateChangeIncomplete}`, at);
      assert.deepEqual(wiring(card, box(card, LABELS.initialFixed)), months, at);
      assert.deepEqual(wiring(card, box(card, LABELS.subsequentRate)), later, at);
      for (const label of [LABELS.principal, LABELS.rate, LABELS.term, `${c.fee} (EUR)`]) assert.deepEqual(wiring(card, box(card, label)), UNMARKED, `${label} with ${at}`);
      // No result rows while a box is missing: the offer is not worked out at its starting rate.
      assert.deepEqual(rows(card), [], at);
      assert.deepEqual(openFolds(card), [c.rateStructure.title], at);
      unmount();
    }
    // Both filled: nothing is marked and the offer is worked out.
    const { card } = show(loan(HYBRID));
    assert.equal(errorOf(card), null);
    assert.deepEqual(wiring(card, box(card, LABELS.subsequentRate)), UNMARKED);
    assert.ok(rows(card).length > 0);
  });

  it('marks the month of the change, and no other box, when it is part of a month: 60.4 used to be worked out as 60 (issue 914)', () => {
    for (const initialFixedMonths of ['6.4', '0.5', '0.4']) {
      const { card, unmount } = show(loan({ ...HYBRID, initialFixedMonths }));
      assert.equal(errorOf(card)?.textContent, 'Error: The initial fixed period is a whole number of months, from 1 up. Correct it, or choose “Fixed” under “Rate structure”.', initialFixedMonths);
      assert.deepEqual(wiring(card, box(card, LABELS.initialFixed)), MARKED, initialFixedMonths);
      for (const label of [LABELS.subsequentRate, LABELS.principal, LABELS.rate, LABELS.term, `${c.fee} (EUR)`]) assert.deepEqual(wiring(card, box(card, label)), UNMARKED, `${label} with ${initialFixedMonths}`);
      assert.deepEqual(rows(card), [], initialFixedMonths);
      assert.deepEqual(openFolds(card), [c.rateStructure.title], initialFixedMonths);
      unmount();
    }
    // With the amount missing as well, it is still this box that is said and marked.
    const { card } = show(loan({ ...HYBRID, initialFixedMonths: '6.4', principal: '' }));
    assert.equal(errorOf(card)?.textContent, `Error: ${s.engine.errors.initialFixed}`);
    assert.deepEqual(wiring(card, box(card, LABELS.initialFixed)), MARKED);
    assert.deepEqual(wiring(card, box(card, LABELS.principal)), UNMARKED);
  });

  it('works out a fixed period as long as the term, or far longer, as a fixed rate, and says the later rate is not used (issue 914)', () => {
    for (const initialFixedMonths of ['12', '13', '1200', '5000']) {
      const { card, unmount } = show(loan({ ...HYBRID, initialFixedMonths }));
      assert.equal(errorOf(card), null, initialFixedMonths);
      const notes = [...card.querySelectorAll('.lc-warning')];
      assert.deepEqual(notes.map((n) => n.textContent), ['The rate does not change within this term, so the subsequent rate is not used.'], initialFixedMonths);
      assert.deepEqual(notes.map((n) => n.getAttribute('role')), ['status']);
      for (const label of [LABELS.initialFixed, LABELS.subsequentRate, LABELS.term]) assert.deepEqual(wiring(card, box(card, label)), UNMARKED, label);
      // 1,200 at 0% over 12 months: the fixed loan's rows.
      assert.deepEqual(rows(card).map((row) => row.label), rows(show(loan()).card).map((row) => row.label), initialFixedMonths);
      unmount();
      cleanup();
    }
    // One month short of the term: a payment is made at the later rate, and there is nothing to note.
    assert.ok(show(loan({ ...HYBRID, initialFixedMonths: '11' })).card.querySelector('.lc-warning') === null);
  });

  it('hands back each box as a plain number under its own field, however the page writes numbers', () => {
    const { card } = show(loan(HYBRID), { locale: 'es' });
    for (const field of OPTIONAL) {
      patches = [];
      const lumps = field.key === 'lumpSumsEncoded';
      fireEvent.change(box(card, field.label), { target: { value: lumps ? '12:5.000,5;36:3000' : '1.234,5' } });
      assert.deepEqual(patches, [{ [field.key]: lumps ? '12:5000.5;36:3000' : '1234.5' }], field.key);
    }
    assert.deepEqual(sent, []);
  });

  it('writes lump sums the way the page writes numbers', () => {
    const { card } = show(loan({ lumpSumsEncoded: '12:5000.5;36:3000' }), { locale: 'es' });
    assert.equal(box(card, c.lumps).value, '12:5000,5;36:3000');
  });
});

describe('the offer card: a rate that changes', () => {
  it('shows which rate type is chosen and offers both for an offer with a term', () => {
    const { card } = show(loan());
    const fixed = choice(card, c.fixed);
    const hybrid = choice(card, c.hybrid);
    assert.ok(fixed.checked);
    assert.ok(!hybrid.checked);
    assert.ok(!hybrid.disabled);
    assert.ok(!hybrid.hasAttribute('aria-describedby'));
    assert.deepEqual([...(fixed.closest('label') as Element).classList], ['lc-modeOption', 'lc-modeOptionActive']);
    assert.deepEqual([...(hybrid.closest('label') as Element).classList], ['lc-modeOption']);
    assert.equal(fixed.closest('fieldset')?.querySelector('legend')?.textContent, c.rateTypeAria);
    // A fixed rate has no later rate to ask about.
    assert.ok(!asks(card, LABELS.initialFixed));
    assert.ok(!asks(card, LABELS.subsequentRate));
    assert.ok(!asks(card, c.atChange.term));
    assert.ok(!(card.textContent ?? '').includes(c.hybridHint.before));
  });

  it('hands back the rate type on a click and tells analytics the type and the offer letter only', () => {
    const fixed = show(loan(), { label: 'B' });
    fireEvent.click(choice(fixed.card, c.hybrid));
    assert.deepEqual(patches, [{ rateKind: 'hybrid' }]);
    assert.deepEqual(sent, [['free_loan_comparison_rate_kind_changed', { vendor: 'B', rateKind: 'hybrid' }]]);
    fixed.unmount();

    patches = [];
    sent = [];
    const hybrid = show(loan(HYBRID), { label: 'D' });
    assert.ok(choice(hybrid.card, c.hybrid).checked);
    assert.ok(!choice(hybrid.card, c.fixed).checked);
    assert.deepEqual([...(choice(hybrid.card, c.hybrid).closest('label') as Element).classList], ['lc-modeOption', 'lc-modeOptionActive']);
    assert.deepEqual([...(choice(hybrid.card, c.fixed).closest('label') as Element).classList], ['lc-modeOption']);
    fireEvent.click(choice(hybrid.card, c.fixed));
    assert.deepEqual(patches, [{ rateKind: 'fixed' }]);
    assert.deepEqual(sent, [['free_loan_comparison_rate_kind_changed', { vendor: 'D', rateKind: 'fixed' }]]);
  });

  it('switches the changing rate off for an offer entered by its payment, and says why', () => {
    const { card } = show(loan({ ...HYBRID, modeKind: 'payment', monthlyPayment: '100' }));
    const hybrid = choice(card, c.hybrid);
    assert.ok(hybrid.disabled);
    const hint = card.ownerDocument.getElementById(hybrid.getAttribute('aria-describedby') ?? 'none');
    assert.ok(hint !== null && card.contains(hint));
    const h = c.hybridHint;
    assert.equal(hint.textContent, `${h.before}${h.solveFor}${h.mid}${h.modeTerm}${h.after}`);
    assert.deepEqual([...hint.querySelectorAll('em')].map((em) => em.textContent), [h.solveFor, h.modeTerm]);
    // Its boxes are not shown: they would not be used.
    assert.ok(!asks(card, LABELS.initialFixed));
    assert.ok(!asks(card, LABELS.subsequentRate));
    assert.ok(!asks(card, c.atChange.payment));

    // The offer is not worked out as a fixed rate while its choice says the rate changes (issue 818).
    assert.equal(errorOf(card)?.textContent, `Error: ${s.engine.errors.hybridMode}`);
    cleanup();
    const empty = show(loan({ rateKind: 'hybrid', initialFixedMonths: '', subsequentRatePct: '', modeKind: 'payment', monthlyPayment: '100' }));
    assert.equal(errorOf(empty.card)?.textContent, `Error: ${s.engine.errors.hybridMode}`);
    assert.deepEqual(rows(empty.card), []);
    // The message says where to go: the amount, rate and payment are not what is wrong, so none is marked.
    for (const label of [LABELS.principal, LABELS.rate, LABELS.monthly]) assert.deepEqual(wiring(empty.card, box(empty.card, label)), UNMARKED, label);
    cleanup();
    // With the payment missing as well, that is said first and the required boxes are marked as ever.
    const noPayment = show(loan({ rateKind: 'hybrid', modeKind: 'payment', monthlyPayment: '' }));
    assert.equal(errorOf(noPayment.card)?.textContent, `Error: ${s.engine.errors.paymentEnter}`);
    for (const label of [LABELS.principal, LABELS.rate, LABELS.monthly]) assert.deepEqual(wiring(noPayment.card, box(noPayment.card, label)), MARKED, label);

    cleanup();
    // Whatever the two boxes, which are not on the page, still hold, and however small the payment: the message is the same (issue 914).
    // 1,200 at 12% is 12 of interest in the first month, so a payment of 5 never pays it off.
    for (const hidden of [{ initialFixedMonths: '0.5' }, { initialFixedMonths: 'five', subsequentRatePct: 'abc' }, { initialFixedMonths: '5000' }]) {
      const low = show(loan({ ...HYBRID, ...hidden, annualRatePct: '12', modeKind: 'payment', monthlyPayment: '5' }));
      assert.equal(errorOf(low.card)?.textContent, `Error: ${s.engine.errors.hybridMode}`, JSON.stringify(hidden));
      for (const label of [LABELS.principal, LABELS.rate, LABELS.monthly]) assert.deepEqual(wiring(low.card, box(low.card, label)), UNMARKED, label);
      cleanup();
    }

    // The reason is there before the choice is ever made.
    const fixed = show(loan({ modeKind: 'payment', monthlyPayment: '100' }));
    assert.ok(choice(fixed.card, c.hybrid).disabled);
    assert.ok((fixed.card.textContent ?? '').includes(h.before));
  });

  it('asks what the lender keeps at the change, explains it, and hands back the choice without telling analytics', () => {
    const { card } = show(loan(HYBRID));
    const keepTerm = choice(card, c.atChange.term);
    const keepPayment = choice(card, c.atChange.payment);
    assert.ok(keepTerm.checked);
    assert.ok(!keepPayment.checked);
    assert.equal(keepTerm.value, 'term');
    assert.equal(keepPayment.value, 'payment');
    assert.deepEqual([...(keepTerm.closest('label') as Element).classList], ['lc-modeOption', 'lc-modeOptionActive']);
    assert.deepEqual([...(keepPayment.closest('label') as Element).classList], ['lc-modeOption']);
    assert.equal(keepTerm.closest('fieldset')?.querySelector('legend')?.textContent, c.atChange.label);
    assert.notEqual(keepTerm.name, '');
    assert.equal(keepTerm.name, keepPayment.name);
    assert.notEqual(keepTerm.name, choice(card, c.fixed).name);
    assert.notEqual(keepTerm.name, choice(card, c.modeTerm).name);
    for (const input of [keepTerm, keepPayment]) {
      const hint = card.ownerDocument.getElementById(input.getAttribute('aria-describedby') ?? 'none');
      assert.equal(hint?.textContent, c.atChange.hint);
    }
    fireEvent.click(keepPayment);
    assert.deepEqual(patches, [{ rateChangeKeeps: 'payment' }]);
    assert.deepEqual(sent, []);

    cleanup();
    patches = [];
    const kept = show(loan({ ...HYBRID, rateChangeKeeps: 'payment' }));
    assert.ok(choice(kept.card, c.atChange.payment).checked);
    assert.deepEqual([...(choice(kept.card, c.atChange.payment).closest('label') as Element).classList], ['lc-modeOption', 'lc-modeOptionActive']);
    assert.deepEqual([...(choice(kept.card, c.atChange.term).closest('label') as Element).classList], ['lc-modeOption']);
    fireEvent.click(choice(kept.card, c.atChange.term));
    assert.deepEqual(patches, [{ rateChangeKeeps: 'term' }]);
  });

  it('gives every box and message an id of its own', () => {
    const { card } = show(loan({ ...HYBRID, principal: '' }));
    const ids = [...card.querySelectorAll('[id]')].map((node) => node.id);
    assert.ok(ids.length >= 16);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => id !== ''));
  });
});
