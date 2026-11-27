/**
 * The small parts of the loan comparison's cards and results, each mounted on
 * its own: the label of a required box (`RequiredLabel`), a row of optional
 * boxes that opens (`FieldGroup`), one row of an offer's results
 * (`ResultRow`), a payment that changes once (`PaymentSteps`) and the tool's
 * one announcement (`LoanAnnouncement`).
 *
 * What is pinned is what a reader sees or a screen reader says: the words,
 * the amounts kept whole, which lines are there, and what is announced, when.
 * The loans are worked out by hand in test/loanParts.comparedOffers.ts.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { clock } from '../../test/windowClock.ts';
import { window } from '../../test/dom.ts';
import { dear, neverLess, plain } from '../../test/loanParts.comparedOffers.ts';
import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';
import type { LoanResult } from '../utils/loan/math.ts';
import { amountLength } from '../utils/shared/amountUnits.ts';
import { FieldGroup, LoanAnnouncement, PaymentSteps, RequiredLabel, ResultRow, announcedNotes } from './LoanCompare.tsx';
import { WITHHELD_SAID_AFTER, type Notice } from './toolShared.tsx';
import { AmountLocaleContext } from './useMoney.ts';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn },
};

const s = TOOL_STRINGS.en.loanComparison.island;

afterEach(cleanup);

/** The length an amount is sized by, as its element carries it. */
const sizedAs = (amount: Element) => (amount as HTMLElement).style.getPropertyValue('--amt-len');

/** The amounts drawn whole inside an element, as text. */
const amountsIn = (el: Element) => [...el.querySelectorAll('.amt')].map((a) => a.textContent);

describe('the label of a required box', () => {
  const shown = (text: string) => render(<label><RequiredLabel title={s.card.requiredTitle}>{text}</RequiredLabel></label>).container;

  it('ends in an asterisk with its meaning as a tooltip, hidden from a screen reader', () => {
    const mark = shown('Term (months)').querySelector('.lc-required') as HTMLElement;
    assert.equal(mark.textContent, '*');
    assert.equal(mark.getAttribute('title'), 'Required');
    assert.equal(mark.getAttribute('aria-hidden'), 'true');
  });

  it('makes one unit of the last word and the mark, so the asterisk never goes to a line of its own (#917)', () => {
    const label = shown('Initial fixed period (months)').querySelector('label') as HTMLElement;
    assert.equal(label.textContent, 'Initial fixed period (months)*');
    // The words before the last one are plain text, free to wrap; the space stays with them.
    assert.equal(label.childNodes.length, 2);
    assert.equal(label.firstChild?.nodeType, 3);
    assert.equal(label.firstChild?.textContent, 'Initial fixed period ');
    const pair = label.querySelector('.lc-requiredPair') as HTMLElement;
    assert.ok(label.lastChild === pair);
    assert.equal(pair.textContent, '(months)*');
    // The mark is the unit's last piece, straight after the word.
    assert.equal(pair.childNodes.length, 2);
    assert.equal(pair.firstChild?.textContent, '(months)');
    assert.ok(pair.lastChild === pair.querySelector('.lc-required'));
  });

  it('tells the CSS how long the unit is, the mark counted, so it can be drawn to fit its line', () => {
    const length = (text: string) => (shown(text).querySelector('.lc-requiredPair') as HTMLElement).style.getPropertyValue('--pair-len');
    assert.equal(length('Initial fixed period (months)'), '9');
    assert.equal(length('Loan amount'), '7');
    assert.equal(length('Rate'), '5');
  });

  it('takes a label of one word whole, with nothing before the unit', () => {
    const label = shown('Calcular').querySelector('label') as HTMLElement;
    assert.equal(label.childNodes.length, 1);
    assert.equal(label.firstElementChild?.className, 'lc-requiredPair');
    assert.equal(label.textContent, 'Calcular*');
  });
});

describe('a row of optional boxes', () => {
  const group = (props: { open: boolean; hint?: string; onToggle?: (open: boolean) => void }) => (
    <FieldGroup title={s.card.costs.title} hint={props.hint} state={s.card.foldNone} open={props.open} onToggle={props.onToggle ?? (() => {})}>
      <label>Fee <input type="text" /></label>
    </FieldGroup>
  );

  it('names the group and says what it holds on the row itself, open or closed', () => {
    for (const open of [false, true]) {
      const { container, unmount } = render(group({ open }));
      const details = container.querySelector('details') as HTMLDetailsElement;
      assert.equal(details.open, open);
      const row = details.querySelector('summary') as HTMLElement;
      assert.equal(row.querySelector('.lc-fieldGroupTitle')?.textContent, 'Costs and fees');
      assert.equal(row.querySelector('.lc-fieldGroupState')?.textContent, 'None');
      // A screen reader hears a pause between the two.
      assert.equal(row.textContent, 'Costs and fees: None');
      unmount();
    }
  });

  it('holds its boxes, under the hint when there is one', () => {
    const { container } = render(group({ open: true, hint: s.card.costs.hint }));
    const body = container.querySelector('.lc-fieldGroupBody') as HTMLElement;
    const hints = body.querySelectorAll('p.lc-fieldGroupHint');
    assert.equal(hints.length, 1);
    assert.equal(hints[0].textContent, 'Origination, closing, and discount points');
    assert.equal(body.querySelectorAll('input').length, 1);
    assert.equal(body.textContent, 'Origination, closing, and discount pointsFee ');
  });

  it('has no hint line when the group has no hint', () => {
    for (const hint of [undefined, '']) {
      const { container, unmount } = render(group({ open: true, hint }));
      const body = container.querySelector('.lc-fieldGroupBody') as HTMLElement;
      assert.equal(body.querySelectorAll('p').length, 0);
      assert.equal(body.textContent, 'Fee ');
      unmount();
    }
  });

  it('tells the card when a reader opens or closes it', () => {
    const told: boolean[] = [];
    const { container } = render(group({ open: false, onToggle: (open) => told.push(open) }));
    const details = container.querySelector('details') as HTMLDetailsElement;
    // What a click on the row does: the browser opens or closes it, then says so.
    details.open = true;
    fireEvent(details, new window.Event('toggle'));
    assert.deepEqual(told, [true]);
    details.open = false;
    fireEvent(details, new window.Event('toggle'));
    assert.deepEqual(told, [true, false]);
  });
});

describe('one row of an offer\'s results', () => {
  it('shows the label and the amount, whole', () => {
    const { container } = render(<dl><ResultRow label={s.results.totalPaid} value="€1,218.03" /></dl>);
    const row = container.querySelector('.lc-resultRow') as HTMLElement;
    assert.deepEqual([...row.classList], ['lc-resultRow']);
    assert.equal(row.querySelector('dt')?.textContent, 'Total paid');
    assert.equal(row.querySelector('dd')?.textContent, '€1,218.03');
    assert.deepEqual(amountsIn(row), ['€1,218.03']);
    assert.equal(row.querySelectorAll('.lc-resultHint').length, 0);
  });

  it('marks the row that matters most, and no other', () => {
    const { container } = render(
      <dl>
        <ResultRow label={s.results.monthly} value="€609.01" emphasized />
        <ResultRow label={s.results.totalPaid} value="€1,218.03" emphasized={false} />
      </dl>,
    );
    const [first, second] = [...container.querySelectorAll('.lc-resultRow')];
    assert.deepEqual([...first.classList], ['lc-resultRow', 'lc-resultRowEmphasized']);
    assert.deepEqual([...second.classList], ['lc-resultRow']);
  });

  it('sizes the amount with the longest one in the same row of the other cards', () => {
    const { container } = render(
      <dl>
        <ResultRow label={s.results.monthly} value="€100.00" shared={11.5} />
        <ResultRow label={s.results.monthly} value="€100.00" />
      </dl>,
    );
    const [compared, alone] = [...container.querySelectorAll('dd > .amt')];
    assert.equal(sizedAs(compared), '11.5');
    // On its own an amount is sized by its own length: five digits (5), a symbol (1.1) and a point (0.5).
    assert.equal(amountLength('€100.00'), 6.6);
    assert.equal(sizedAs(alone), '6.6');
  });

  it('puts the hint and the note on lines of their own under the value, their amounts whole too', () => {
    const hint = s.results.monthlyIncludesExtra.replace('{extra}', '€200.00');
    const { container } = render(
      <dl><ResultRow label={s.results.monthly} value="€300.00" hint={hint} note={s.results.monthlyLaterNote} shared={30} /></dl>,
    );
    const lines = [...container.querySelectorAll('dd > .lc-resultHint')];
    assert.deepEqual(lines.map((l) => l.textContent), [
      'includes €200.00 extra each month',
      'The later payment uses the rate you entered, not a forecast.',
    ]);
    assert.deepEqual(amountsIn(lines[0]), ['€200.00']);
    // The shared size is for the value compared across cards, not for the line under it.
    assert.equal(sizedAs(lines[0].querySelector('.amt') as Element), '6.6');
    assert.equal(container.querySelector('dd')?.textContent, `€300.00${hint}${s.results.monthlyLaterNote}`);
  });

  it('shows a hint without a note, a note without a hint, and neither for an empty one', () => {
    const lines = (props: { hint?: string; note?: string }) => {
      const { container, unmount } = render(<dl><ResultRow label={s.results.apr} value="12.00%" {...props} /></dl>);
      const found = [...container.querySelectorAll('dd > span.lc-resultHint')].map((l) => l.textContent);
      const all = container.querySelector('dd')?.textContent;
      unmount();
      return { found, all };
    };
    assert.deepEqual(lines({ hint: s.results.aprNoFees }), { found: ['No fees'], all: '12.00%No fees' });
    assert.deepEqual(lines({ note: s.results.aprBasis }), { found: ['Same basis as your rate'], all: '12.00%Same basis as your rate' });
    assert.deepEqual(lines({ hint: '', note: '' }), { found: [], all: '12.00%' });
    assert.deepEqual(lines({}), { found: [], all: '12.00%' });
  });
});

describe('a payment that changes once', () => {
  const steps = (props: { month: number; last?: boolean }) => {
    const { container } = render(<PaymentSteps first="€100.00" later="€103.53" month={props.month} last={props.last} strings={s} />);
    return [...container.querySelectorAll('.lc-steps > .lc-step')].map((step) => ({
      label: step.querySelector('.lc-stepLabel')?.textContent,
      amount: step.querySelector('.lc-stepAmount > .amt')?.textContent,
      // The label is read before its amount, with a space between them.
      read: step.textContent,
    }));
  };

  it('gives the first payment under the months it is paid in, then the later one from its month', () => {
    assert.deepEqual(steps({ month: 7 }), [
      { label: 'Months 1 to 6', amount: '€100.00', read: 'Months 1 to 6 €100.00' },
      { label: 'From month 7', amount: '€103.53', read: 'From month 7 €103.53' },
    ]);
    assert.deepEqual(steps({ month: 3, last: false }).map((step) => step.label), ['Months 1 to 2', 'From month 3']);
  });

  it('calls a first payment made once "Month 1", not a range of one month', () => {
    assert.deepEqual(steps({ month: 2 }).map((step) => step.read), ['Month 1 €100.00', 'From month 2 €103.53']);
  });

  it('says when the later payment is the last one and never repeats', () => {
    assert.deepEqual(steps({ month: 12, last: true }).map((step) => step.read), ['Months 1 to 11 €100.00', 'Month 12, last payment €103.53']);
  });
});

describe('the announcement of the loan results', () => {
  beforeEach(() => clock.install());
  afterEach(() => clock.restore());

  interface Shown {
    withheld?: boolean;
    paidOff: LoanResult[];
    validCount: number;
    noted?: { name: string; notes: string[] }[];
    also?: string;
    notice?: Notice;
    currency?: string;
    amountLocale?: string | null;
  }

  const element = (p: Shown) => (
    <AmountLocaleContext.Provider value={p.amountLocale ?? null}>
      <LoanAnnouncement
        withheld={p.withheld ?? false}
        paidOff={p.paidOff}
        validCount={p.validCount}
        noted={p.noted ?? []}
        currency={p.currency ?? 'EUR'}
        strings={s}
        also={p.also}
        notice={p.notice ?? { text: '', n: 0 }}
      />
    </AmountLocaleContext.Provider>
  );

  /** Mounts the announcement and hands back what is said and a way to change the results. */
  function announce(first: Shown) {
    const view = render(element(first));
    const region = view.container.querySelector('[aria-live]') as HTMLElement;
    return { said: () => region.textContent, region, change: (next: Shown) => view.rerender(element(next)) };
  }

  it('is a polite region, read whole, that says nothing for the results the page loads with', () => {
    const { region, said } = announce({ paidOff: [plain()], validCount: 1 });
    assert.equal(region.getAttribute('aria-live'), 'polite');
    assert.equal(region.getAttribute('aria-atomic'), 'true');
    clock.pass(5000);
    assert.equal(said(), '');
  });

  it('says one offer\'s payment and total once typing has paused for 600 ms', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1 });
    change({ paidOff: [dear()], validCount: 1 });
    clock.pass(599);
    assert.equal(said(), '');
    clock.pass(1);
    assert.equal(said(), 'Monthly payment €609.01. Total paid €1,218.03.');
  });

  it('says the range once a second offer is valid', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1 });
    change({ paidOff: [plain(), dear()], validCount: 2 });
    clock.pass(600);
    assert.equal(said(), 'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.');
  });

  it('says there is no range when the second offer is never paid off', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1 });
    assert.ok(Number.isNaN(neverLess().totalPaidMinor));
    change({ paidOff: [plain()], validCount: 2 });
    clock.pass(600);
    assert.equal(said(), 'Fewer than two of these offers are paid off, so there is no range of totals to compare.');
  });

  it('writes the amounts the way the page writes them, in the currency chosen', () => {
    const spanish = announce({ paidOff: [plain()], validCount: 1, amountLocale: 'es' });
    spanish.change({ paidOff: [dear()], validCount: 1, amountLocale: 'es' });
    clock.pass(600);
    const euros = (value: number) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(value);
    assert.equal(spanish.said(), `Monthly payment ${euros(609.01)}. Total paid ${euros(1218.03)}.`);
    assert.match(spanish.said() ?? '', /609,01/);

    const dollars = announce({ paidOff: [plain()], validCount: 1, currency: 'USD' });
    dollars.change({ paidOff: [dear()], validCount: 1, currency: 'USD' });
    clock.pass(600);
    assert.equal(dollars.said(), 'Monthly payment $609.01 USD. Total paid $1,218.03 USD.');
  });

  it('says why there is no result a full second after a box goes wrong, and not sooner', () => {
    assert.equal(WITHHELD_SAID_AFTER, 1000);
    const { said, change } = announce({ paidOff: [plain(), dear()], validCount: 2 });
    change({ withheld: true, paidOff: [plain(), dear()], validCount: 2 });
    clock.pass(999);
    assert.equal(said(), '');
    clock.pass(1);
    assert.equal(said(), 'Fix the highlighted fields to compare the offers.');
  });

  it('says the result again, after the shorter pause, once the box is put right', () => {
    const { said, change } = announce({ withheld: true, paidOff: [plain(), dear()], validCount: 2 });
    change({ paidOff: [plain(), plain()], validCount: 2 });
    clock.pass(600);
    assert.equal(said(), 'All offers come out at the same total cost of €1,200.00.');
  });

  it('says a refinance result that changed together with the offers, in one go', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1, also: 'Refinancing saves €10.00.' });
    change({ paidOff: [dear()], validCount: 1, also: 'Refinancing saves €20.00.' });
    clock.pass(600);
    assert.equal(said(), 'Monthly payment €609.01. Total paid €1,218.03. Refinancing saves €20.00.');
  });

  it('says a refinance result that changed on its own', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1, also: 'Refinancing saves €10.00.' });
    change({ paidOff: [plain()], validCount: 1, also: 'Refinancing saves €20.00.' });
    clock.pass(600);
    assert.equal(said(), 'Refinancing saves €20.00.');
  });

  it('leaves the refinance result out while the offers are withheld: only the reason is said', () => {
    const { said, change } = announce({ withheld: true, paidOff: [plain()], validCount: 1, also: 'Refinancing saves €10.00.' });
    change({ withheld: true, paidOff: [plain()], validCount: 1, also: 'Refinancing saves €20.00.' });
    clock.pass(5000);
    assert.equal(said(), '');
  });

  it('says one offer\'s notes after its figures, in the card\'s order, and not before the pause', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1 });
    change({ paidOff: [dear()], validCount: 1, noted: [{ name: 'Offer A', notes: ['First note.', 'Second note.'] }] });
    clock.pass(599);
    assert.equal(said(), '');
    clock.pass(1);
    // One offer needs no name before its notes.
    assert.equal(said(), 'Monthly payment €609.01. Total paid €1,218.03. First note. Second note.');
  });

  it('says a note that came or changed with the figures as they were: the result is said again, whole and once', () => {
    const { said, region, change } = announce({ paidOff: [plain()], validCount: 1, noted: [{ name: 'Offer A', notes: [] }] });
    change({ paidOff: [plain()], validCount: 1, noted: [{ name: 'Offer A', notes: ['First note.'] }] });
    clock.pass(600);
    assert.equal(said(), 'Monthly payment €100.00. Total paid €1,200.00. First note.');
    assert.equal(region.childNodes.length, 1);
    // Each digit of a month being typed changes the note: only the one the typing stops on is said.
    change({ paidOff: [plain()], validCount: 1, noted: [{ name: 'Offer A', notes: ['Note for month 1.'] }] });
    clock.pass(300);
    change({ paidOff: [plain()], validCount: 1, noted: [{ name: 'Offer A', notes: ['Note for month 12.'] }] });
    clock.pass(599);
    assert.equal(said(), 'Monthly payment €100.00. Total paid €1,200.00. First note.');
    clock.pass(1);
    assert.equal(said(), 'Monthly payment €100.00. Total paid €1,200.00. Note for month 12.');
  });

  it('says nothing more for offers with no notes: the figures end the sentence', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1 });
    change({ paidOff: [plain(), dear()], validCount: 2, noted: [{ name: 'Offer A', notes: [] }, { name: 'Offer B', notes: [] }] });
    clock.pass(600);
    assert.equal(said(), 'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03.');
  });

  it('names each offer before its notes when there are several offers, after the range', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1 });
    change({
      paidOff: [plain(), dear(), plain()],
      validCount: 3,
      noted: [{ name: 'Offer A', notes: ['First note.', 'Second note.'] }, { name: 'North Bank', notes: [] }, { name: 'Offer C', notes: ['Third note.'] }],
    });
    clock.pass(600);
    assert.equal(said(), 'Total cost ranges from €1,200.00 to €1,218.03 across the offers below: a spread of €18.03. Offer A: First note. Second note. Offer C: Third note.');
  });

  it('names the one offer that has notes, too, when another offer is beside it', () => {
    assert.equal(announcedNotes([{ name: 'Offer A', notes: [] }, { name: 'North Bank', notes: ['A note.'] }]), 'North Bank: A note.');
    assert.equal(announcedNotes([{ name: 'North Bank', notes: ['A note.'] }]), 'A note.');
    assert.equal(announcedNotes([{ name: 'North Bank', notes: [] }]), '');
    assert.equal(announcedNotes([]), '');
  });

  it('says the notes alone for an offer that has no figures to say', () => {
    // One valid offer that is never paid off has no payment and total to say.
    const { said, change } = announce({ paidOff: [], validCount: 1 });
    change({ paidOff: [], validCount: 1, noted: [{ name: 'Offer A', notes: ['A note.'] }] });
    clock.pass(600);
    assert.equal(said(), 'A note.');
  });

  it('leaves the notes out while the offers are withheld: only the reason is said', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1 });
    change({ withheld: true, paidOff: [plain()], validCount: 1, noted: [{ name: 'Offer A', notes: ['A note.'] }] });
    clock.pass(1000);
    assert.equal(said(), 'Fix the highlighted fields to compare the offers.');
  });

  it('says a notice at once, without waiting for typing to pause', () => {
    const { said, change } = announce({ paidOff: [plain()], validCount: 1 });
    change({ paidOff: [plain()], validCount: 1, notice: { text: 'Link copied', n: 1 } });
    clock.pass(60);
    assert.equal(said(), 'Link copied');
  });
});
