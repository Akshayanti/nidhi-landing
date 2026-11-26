/**
 * The loan comparison's charts panel (`ChartsPanel` in LoanCompare.tsx),
 * mounted by itself with offers small enough to work out by hand and results
 * from the real engine: which offer's payments it shows and how the reader
 * chooses one, what an offer that cannot be worked out looks like in the
 * chooser, the sentence under the chart, and what choosing tells the page and
 * analytics. The two charts have their own tests; here they are read only for
 * whose figures they were given.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { dict } from '../i18n/index.ts';
import { CHART_SERIES } from '../styles/palette.ts';
import { computeFromInput } from '../utils/loan/inputs.ts';
import { emptyResult, type LoanResult } from '../utils/loan/math.ts';
import { makeAddedVendor, type VendorInput } from '../utils/loan/url.ts';
import { ChartWordsContext } from './ChartAmounts.tsx';
import { ChartsPanel } from './LoanCompare.tsx';

const tools = dict('en').tools;
const island = tools.loanComparison.island;
const win = window as unknown as { posthog?: unknown };

// The offers, as the reader would have typed them, in euros.

const offer = (slot: number, typed: Partial<VendorInput>): VendorInput => ({ ...makeAddedVendor(slot), ...typed });
const worked = (offers: VendorInput[]) => offers.map((v) => computeFromInput(v, 'EUR'));

/** €1,200 over a year at 0%: €100 a month, all of it principal; €1,200.00 in all. */
const UNION = offer(0, { name: 'Credit union', principal: '1200', annualRatePct: '0', termMonths: '12' });
/**
 * €1,000 over six months at 12% a year, 1% a month, under the name the tool
 * gave the second slot. The payment is 1000 × 0.01 / (1 − 1.01^−6) = €172.55,
 * the first month's interest €10.00 and its principal €162.55. Six payments
 * come to about €1,035, less than the credit union's €1,200.
 */
const SECOND = offer(1, { principal: '1000', annualRatePct: '12', termMonths: '6' });
/** €1,200 over two years at 0%: €50 a month. */
const TWO_YEARS = offer(0, { name: 'Town bank', principal: '1200', annualRatePct: '0', termMonths: '24' });
/** The credit union's loan with €50 extra a month: the contract is still €100 a month. */
const WITH_EXTRA = offer(0, { name: 'Broker', principal: '1200', annualRatePct: '0', termMonths: '12', extraMonthly: '50' });
/** An offer the engine refuses: no loan amount. */
const NO_AMOUNT = offer(2, { name: 'Online lender', principal: '0' });
/**
 * A loan that is never paid off: €1,200 over a year, interest-free for one
 * month (so the payment is €100 and €1,100 is left), then 120% a year, 10% a
 * month, with the payment kept. From month 2 the interest (€110.00, then
 * more) is above the payment, so the engine's rows carry a negative principal.
 */
const NEVER = offer(1, { name: 'Employer', principal: '1200', annualRatePct: '0', termMonths: '12', rateKind: 'hybrid', initialFixedMonths: '1', subsequentRatePct: '120', rateChangeKeeps: 'payment' });
/** A result with nothing in it yet: no refusal, and no schedule either. */
const BLANK: LoanResult = { ...emptyResult(0, 'none'), error: undefined };

// What the tests listen to.

/** What the page was told: the offer chosen, or null for the automatic choice. */
let told: unknown[] = [];
/** What analytics was sent. */
let sent: unknown[][] = [];

beforeEach(() => {
  told = [];
  sent = [];
  win.posthog = { capture: (...event: unknown[]) => { sent.push(event); } };
});
afterEach(() => {
  cleanup();
  delete win.posthog;
});

const all = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)];
const one = (root: ParentNode, selector: string) => {
  const found = all(root, selector);
  assert.equal(found.length, 1, `one ${selector}`);
  return found[0] as HTMLElement;
};
const texts = (root: ParentNode, selector: string) => all(root, selector).map((el) => el.textContent);
const attrs = (root: ParentNode, selector: string, name: string) => all(root, selector).map((el) => el.getAttribute(name));

// ---- The charts panel -----------------------------------------------------------

type PanelOptions = { results?: LoanResult[]; lowest: number; chosen?: number | null };

/** The panel as the tabs draw it: the offers, their results, the offer lowest in cost and the reader's choice. */
function charts(offers: VendorInput[], { results = worked(offers), lowest, chosen = null }: PanelOptions) {
  const { container } = render(
    <ChartWordsContext.Provider value={tools.export.chart}>
      <ChartsPanel
        vendors={offers}
        results={results}
        currency="EUR"
        cheapestByTotal={lowest}
        splitVendorIdx={chosen}
        onSplitVendorChange={(next) => { told.push(next); }}
        strings={island}
      />
    </ChartWordsContext.Provider>,
  );
  return container;
}

const chooser = (root: Element) => one(root, 'select.lc-splitSelect') as HTMLSelectElement;
/** The sentence under the split chart. */
const sentence = (root: Element) => one(root, '.lc-splitCaption').textContent;
const SENTENCE_END = '. An extra payment early in the loan stops interest on that amount for all the years left; the same payment near the end has few months left to save on.';
/** The offer the split chart shows: the name it was drawn under, and its table's rows as [when, payment, interest, principal]. */
function shown(root: Element) {
  const section = one(root, '.lc-splitSection');
  assert.equal(all(section, '.lc-chartEmpty').length, 0, 'a chart, not the empty note');
  one(section, 'svg.lc-splitChart');
  return {
    name: one(section, '.lc-splitCaption strong').textContent,
    caption: one(section, 'table caption').textContent,
    colours: [...new Set(attrs(section, '.lc-splitBarPrincipal', 'style'))],
    rows: all(section, 'tbody tr').map((row) => texts(row, 'th, td')),
  };
}
/** The note the panel shows in place of the split chart, after checking no chart is drawn. */
function emptyNote(root: Element) {
  const section = one(root, '.lc-splitSection');
  assert.equal(all(section, 'svg').length, 0, 'no split chart');
  assert.equal(all(section, 'table').length, 0, 'no table');
  return one(section, 'p.lc-chartEmpty').textContent;
}
const EMPTY = 'Enter valid inputs above to see how each payment splits between interest and principal.';

describe('the charts panel', () => {
  it('has two headed sections, the balance over time and where each payment goes', () => {
    const root = charts([UNION, SECOND], { lowest: 1 });
    const sections = all(one(root, '.lc-chartsPanel'), 'section.lc-chartSection');
    assert.equal(sections.length, 2);
    const headings = sections.map((s) => document.getElementById(s.getAttribute('aria-labelledby') ?? ''));
    assert.deepEqual(headings.map((h) => h?.tagName), ['H3', 'H3']);
    assert.deepEqual(headings.map((h) => h?.textContent), ['Balance over time', 'Where each payment goes']);
    assert.deepEqual(texts(root, '.lc-chartLead'), [island.charts.balanceLead, island.charts.splitLead]);
    assert.ok(island.charts.balanceLead.startsWith("Each line is one offer's outstanding balance"));
    assert.ok(island.charts.splitLead.startsWith('Same monthly payment every month.'));
  });

  it('gives the balance chart every offer under the name the tool shows for it', () => {
    const root = charts([UNION, SECOND, NO_AMOUNT], { lowest: 1 });
    // A typed name as typed, an untouched "Vendor B" as "Offer B"; the refused offer has no line.
    assert.equal(one(root, '.lc-balanceLegend').textContent, 'Credit unionpaid off in 1 yrOffer Bpaid off in 6 mo');
    const never = charts([NO_AMOUNT, UNION, offer(2, {})], { lowest: 1 });
    assert.equal(one(never, '.lc-balanceLegend').textContent, 'Credit unionpaid off in 1 yrOffer Cpaid off in 30 yr');
  });

  it('shows the offer lowest in cost until the reader chooses one', () => {
    const root = charts([UNION, SECOND], { lowest: 1 });
    assert.equal(chooser(root).value, '');
    const split = shown(root);
    assert.equal(split.name, 'Offer B');
    assert.equal(split.caption, 'Interest and principal split for Offer B, sampled across the loan');
    assert.deepEqual(split.rows[0], ['Year 1', '€172.55', '€10.00', '€162.55']);
    assert.deepEqual(split.colours, [`fill: ${CHART_SERIES[1]};`]);
    assert.equal(sentence(root), `Showing Offer B's contract schedule${SENTENCE_END}`);
  });

  it('shows the offer the reader chose, in that offer\'s colour', () => {
    const root = charts([UNION, SECOND], { lowest: 1, chosen: 0 });
    assert.equal(chooser(root).value, '0');
    const split = shown(root);
    assert.equal(split.name, 'Credit union');
    assert.equal(split.caption, 'Interest and principal split for Credit union, sampled across the loan');
    assert.deepEqual(split.rows[0], ['Year 1', '€100.00', '€0.00', '€100.00']);
    assert.deepEqual(split.colours, ['fill: var(--chart-1);']);
    assert.equal(sentence(root), `Showing Credit union's contract schedule${SENTENCE_END}`);
    // The second offer, chosen by hand where the first is lowest in cost.
    const other = charts([UNION, SECOND], { lowest: 0, chosen: 1 });
    assert.equal(chooser(other).value, '1');
    assert.equal(shown(other).name, 'Offer B');
    assert.deepEqual(shown(other).colours, ['fill: var(--chart-2);']);
  });

  it('labels the chooser and lists the automatic choice, then every offer by its shown name', () => {
    const root = charts([UNION, SECOND, NO_AMOUNT], { lowest: 1 });
    const select = chooser(root);
    const label = one(root, '.lc-splitControls label') as HTMLLabelElement;
    assert.equal(label.textContent, 'Offer');
    assert.ok(label.htmlFor !== '' && label.htmlFor === select.id);
    assert.deepEqual(texts(select, 'option'), ['Auto (lowest total cost)', 'Credit union', 'Offer B', 'Online lender (incomplete)']);
    assert.deepEqual(attrs(select, 'option', 'value'), ['', '0', '1', '2']);
    // An offer that cannot be worked out is listed and cannot be chosen.
    assert.deepEqual(all(select, 'option').map((o) => (o as HTMLOptionElement).disabled), [false, false, false, true]);
  });

  it('tells the page the offer chosen, as a number, and sends analytics its letter only', () => {
    const root = charts([UNION, SECOND], { lowest: 1 });
    fireEvent.change(chooser(root), { target: { value: '0' } });
    assert.equal(told.length, 1);
    assert.ok(told[0] === 0);
    fireEvent.change(chooser(root), { target: { value: '1' } });
    assert.ok(told.at(-1) === 1);
    assert.deepEqual(sent, [
      ['free_loan_comparison_split_vendor_changed', { vendor: 'A' }],
      ['free_loan_comparison_split_vendor_changed', { vendor: 'B' }],
    ]);
  });

  it('tells the page when the reader goes back to the automatic choice, and sends nothing', () => {
    const root = charts([UNION, SECOND], { lowest: 1, chosen: 0 });
    fireEvent.change(chooser(root), { target: { value: '' } });
    assert.equal(told.length, 1);
    assert.ok(told[0] === null);
    assert.equal(sent.length, 0);
  });

  it('goes back to the automatic choice for a value that is not an offer', () => {
    // A value the page did not list (an extension rewriting the menu, say).
    const root = charts([UNION, SECOND], { lowest: 1, chosen: 0 });
    const stray = document.createElement('option');
    stray.value = 'second';
    chooser(root).append(stray);
    fireEvent.change(chooser(root), { target: { value: 'second' } });
    assert.equal(told.length, 1);
    assert.ok(told[0] === null);
  });

  it('falls back to the offer lowest in cost when the chosen one cannot be worked out', () => {
    const root = charts([NO_AMOUNT, UNION, SECOND], { lowest: 2, chosen: 0 });
    const split = shown(root);
    // "Vendor B" keeps its letter in the third slot, and takes the slot's colour.
    assert.equal(split.name, 'Offer B');
    assert.deepEqual(split.rows[0], ['Year 1', '€172.55', '€10.00', '€162.55']);
    assert.deepEqual(split.colours, ['fill: var(--chart-3);']);
  });

  it('falls back to the offer lowest in cost when the chosen one has been removed', () => {
    // The reader chose the third offer, then removed it: two are left.
    const root = charts([UNION, SECOND], { lowest: 1, chosen: 2 });
    assert.equal(shown(root).name, 'Offer B');
    // The last offer there is can still be chosen.
    assert.equal(shown(charts([SECOND, UNION], { lowest: 0, chosen: 1 })).name, 'Credit union');
  });

  it('shows the first offer with a schedule when none has a total to be lowest', () => {
    // A refused offer and one that is never paid off: neither has a total.
    const root = charts([NO_AMOUNT, NEVER], { lowest: -1 });
    assert.equal(shown(root).name, 'Employer');
    // An offer with nothing worked out yet is passed over too.
    const blank = charts([UNION, NEVER], { results: [BLANK, worked([NEVER])[0]], lowest: -1 });
    assert.equal(shown(blank).name, 'Employer');
    // Chosen by hand, it has nothing to draw: the note, under its own name.
    const chosen = charts([UNION, NEVER], { results: [BLANK, worked([NEVER])[0]], lowest: -1, chosen: 0 });
    assert.equal(emptyNote(chosen), EMPTY);
    assert.equal(sentence(chosen), `Showing Credit union's contract schedule${SENTENCE_END}`);
  });

  it('takes the page\'s word for the offer lowest in cost, whichever slot it is', () => {
    const [refused, union] = worked([NO_AMOUNT, UNION]);
    // The page never names a refused offer; if it did, the panel would not pick another by itself.
    const root = charts([NO_AMOUNT, UNION], { results: [refused, union], lowest: 0 });
    assert.equal(emptyNote(root), EMPTY);
    assert.equal(sentence(root), `Showing Online lender's contract schedule${SENTENCE_END}`);
  });

  it('shows a note in place of the chart, under the first offer\'s name, when no offer can be worked out', () => {
    const offers = [offer(0, { name: 'Credit union', principal: '0' }), NO_AMOUNT];
    const root = charts(offers, { lowest: -1 });
    assert.equal(emptyNote(root), EMPTY);
    assert.equal(sentence(root), `Showing Credit union's contract schedule${SENTENCE_END}`);
    assert.deepEqual(texts(chooser(root), 'option'), ['Auto (lowest total cost)', 'Credit union (incomplete)', 'Online lender (incomplete)']);
    // A chosen offer that is refused, with nothing to fall back on, is the same.
    assert.equal(emptyNote(charts(offers, { lowest: -1, chosen: 1 })), EMPTY);
  });

  it('shows the note for an offer whose result has not arrived, and lists it as an offer like any other', () => {
    const offers = [UNION, SECOND, offer(2, {})];
    const root = charts(offers, { results: worked([UNION, SECOND]), lowest: 1, chosen: 2 });
    assert.equal(emptyNote(root), EMPTY);
    assert.equal(sentence(root), `Showing Offer C's contract schedule${SENTENCE_END}`);
    assert.deepEqual(texts(chooser(root), 'option'), ['Auto (lowest total cost)', 'Credit union', 'Offer B', 'Offer C']);
    assert.deepEqual(all(chooser(root), 'option').map((o) => (o as HTMLOptionElement).disabled), [false, false, false, false]);
  });

  it('stands with no offers at all: the note, and the first slot\'s name', () => {
    const root = charts([], { results: [], lowest: -1 });
    assert.equal(emptyNote(root), EMPTY);
    assert.equal(sentence(root), `Showing Offer A's contract schedule${SENTENCE_END}`);
    assert.deepEqual(texts(chooser(root), 'option'), ['Auto (lowest total cost)']);
  });

  it('says the chart leaves out extra payments only when the shown offer has some', () => {
    const withExtra = charts([WITH_EXTRA, SECOND], { lowest: 0 });
    assert.equal(sentence(withExtra), `Showing Broker's contract schedule (without optional extra principal; APR-equivalent view)${SENTENCE_END}`);
    // The contract's €100 a month is drawn, not the €150 the reader pays.
    assert.deepEqual(shown(withExtra).rows[0], ['Year 1', '€100.00', '€0.00', '€100.00']);
    // The other offer has none: an extra of "0", and an empty box.
    assert.equal(sentence(charts([WITH_EXTRA, SECOND], { lowest: 0, chosen: 1 })), `Showing Offer B's contract schedule${SENTENCE_END}`);
    assert.equal(sentence(charts([{ ...UNION, extraMonthly: '' }, SECOND], { lowest: 0 })), `Showing Credit union's contract schedule${SENTENCE_END}`);
  });

  it('draws a loan that is never paid off over the months the balance chart shows, each payment all interest', () => {
    // Beside a two-year loan the balance chart runs to month 24, not to the
    // 100 years the engine follows the growing balance for.
    const root = charts([TWO_YEARS, NEVER], { lowest: 0, chosen: 1 });
    const split = shown(root);
    assert.equal(split.name, 'Employer');
    // Month 1 is interest-free: the whole €100 is principal. After that the
    // interest due is more than the €100 paid, so all of it goes on interest
    // and none on principal (not the engine's negative principal).
    assert.deepEqual(split.rows[0], ['Year 1', '€100.00', '€0.00', '€100.00']);
    assert.deepEqual(split.rows.slice(1).map((r) => r.slice(1)), Array.from({ length: 5 }, () => ['€100.00', '€100.00', '€0.00']));
    assert.equal(split.rows.at(-1)![0], 'Year 2');
    // By itself it is drawn over its own term, one year.
    const alone = shown(charts([NO_AMOUNT, NEVER], { lowest: -1 }));
    assert.equal(alone.rows.at(-1)![0], 'Month 12');
    assert.deepEqual(alone.rows.at(-1)!.slice(1), ['€100.00', '€100.00', '€0.00']);
  });
});
