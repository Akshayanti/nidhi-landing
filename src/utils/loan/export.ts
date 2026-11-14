/**
 * The loan comparison's spreadsheet: what each offer was entered with, one
 * summary row per offer, and each offer's schedule month by month.
 *
 * The schedule is the effective one, with any extra principal and lump sums,
 * which is the one the charts and the totals use; the About sheet says so. It
 * is built from the same results the page shows, in the currency's minor
 * units, so every amount is exact to the cent and matches the page.
 *
 * An offer whose inputs do not compute yet is listed by name with its message
 * left out, and gets no schedule sheet.
 *
 * Pure: no DOM, no analytics. The island hands the sheets to `downloadWorkbook`.
 */
import type { Dict } from '../../i18n/strings/types.ts';
import { amountFormat, typedRate, type Cell, type Sheet } from '../shared/xlsx.ts';
import { fromMinor, getCurrency, isNotPaidOff, MAX_TERM_MONTHS, type LoanResult } from './math.ts';
import { parseNumber } from './inputs.ts';
import { parseLumpSums, type VendorInput } from './url.ts';

type Island = Dict['tools']['loanComparison']['island'];
type Common = Dict['tools']['export'];

export interface LoanExport {
  island: Island;
  common: Common;
  currency: string;
  vendors: VendorInput[];
  results: LoanResult[];
  /** Each offer's name as the page shows it. */
  names: string[];
  date: string;
  page: string;
  /**
   * The printed report words a figure that does not exist ("Not paid off",
   * "No finite total"); the spreadsheet leaves the cell empty, so a column of
   * numbers stays one, and says why in the payment note.
   */
  worded?: boolean;
  /** The locale the page writes amounts in, for the lump sums' text. */
  locale?: string | null;
}

const head = (...titles: string[]): Cell[] => titles.map((t) => ({ t, bold: true }));

/** True when at least one offer really has a payment after its rate change. */
export function hasLaterPayment(results: LoanResult[]): boolean {
  return results.some((r) => !r.error && r.schedule.length > 0 && r.rateChange != null && r.rateChange.paymentMinor !== null);
}

/** How many columns the summary sheet gives the monthly payment: one, or four when a payment changes. */
export const LATER_PAYMENT_COLUMNS = 4;

export function loanSheets({ island, common, currency, vendors, results, names, date, page, worded, locale }: LoanExport): Sheet[] {
  const x = island.export;
  const c = island.card;
  const decimals = Math.round(Math.log10(getCurrency(currency).factor));
  const fmt = amountFormat(decimals);
  const minor = (units: number): Cell => ({ n: fromMinor(units, currency), fmt });
  const major = (raw: string): Cell => {
    const n = parseNumber(raw);
    return Number.isFinite(n) ? { n: Number(n.toFixed(decimals)), fmt } : null;
  };
  const rate = (raw: string): Cell => {
    const n = parseNumber(raw);
    if (!Number.isFinite(n)) return null;
    // A record of what was typed: a rate quoted in eighths (4.875) is not rounded to 4.88.
    return typedRate(n);
  };
  // Lump sums for reading: "Month 12: 5,000.00; Month 36: 3,000.50", each
  // amount written as the page writes amounts, not the "12:5000;36:3000.5"
  // the box holds. Text that does not read as lump sums is left as typed.
  // A no-break space keeps "Month 12" on one line in a narrow column.
  const amountText = new Intl.NumberFormat(locale ?? 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const lumps = (encoded: string): Cell => {
    if (!encoded.trim()) return null;
    const entries = parseLumpSums(encoded);
    if (entries.length === 0) return encoded;
    return entries.map((l) => `${island.balance.month.replace('{m}', String(l.month)).replace(/ /g, '\u00a0')}: ${amountText.format(l.amountMajor)}`).join('; ');
  };
  const whole = (raw: string): Cell => {
    const n = parseNumber(raw);
    return Number.isFinite(n) ? { n: Math.round(n), fmt: 'integer' } : null;
  };
  const ok = (r: LoanResult) => !r.error && r.schedule.length > 0;
  // A figure a loan that is not paid off does not have: empty, or in words.
  const missing = (r: LoanResult, what: 'months' | 'total' | 'apr'): Cell => {
    if (!worded) return null;
    const never = r.keptPayment?.outcome === 'never';
    if (what === 'months') return never ? island.results.notPaidOff : island.results.beyondLimit;
    if (what === 'total') return never ? island.results.noFiniteTotal : island.results.notAvailable;
    return island.results.notAvailable;
  };

  const about: Sheet = {
    name: common.sheets.about,
    widths: [22, 90],
    rows: [
      head(common.columns.item, common.columns.value),
      [common.about.tool, x.tool],
      [common.about.made, date],
      [common.about.currency, currency],
      [common.about.page, page],
      [x.scheduleLabel, x.scheduleText],
      [island.results.apr, island.results.aprDocs],
      [common.about.privacy, common.about.privacyText],
      [common.about.note, common.about.noteText],
      [common.about.beta, common.about.betaText],
    ],
  };

  // Inputs: one column per offer, one row per field, as the cards have them.
  const field = (label: string, cell: (v: VendorInput) => Cell): Cell[] => [label, ...vendors.map(cell)];
  const anyHybrid = vendors.some((v) => v.rateKind === 'hybrid');
  const inputRows: Cell[][] = [
    head(common.columns.item, ...names),
    field(c.principal, (v) => major(v.principal)),
    field(c.rate, (v) => rate(v.annualRatePct)),
    field(c.solveFor, (v) => (v.modeKind === 'term' ? c.modeTerm : c.modePayment)),
    field(c.term, (v) => (v.modeKind === 'term' ? whole(v.termMonths) : null)),
    field(c.monthly, (v) => (v.modeKind === 'payment' ? major(v.monthlyPayment) : null)),
    field(c.rateStructure.title, (v) => (v.rateKind === 'hybrid' ? c.hybrid : c.fixed)),
  ];
  if (anyHybrid) {
    inputRows.push(
      field(c.initialFixed, (v) => (v.rateKind === 'hybrid' ? whole(v.initialFixedMonths) : null)),
      field(c.subsequentRate, (v) => (v.rateKind === 'hybrid' ? rate(v.subsequentRatePct) : null)),
      field(c.atChange.label, (v) => (v.rateKind === 'hybrid' ? c.atChange[v.rateChangeKeeps] : null)),
    );
  }
  inputRows.push(
    field(c.fee, (v) => major(v.feeMajor || '0')),
    field(c.pointsCost, (v) => major(v.pointsCostMajor || '0')),
    field(c.pointsReduction, (v) => rate(v.pointsRateReductionPct || '0')),
    field(c.extra, (v) => major(v.extraMonthly || '0')),
    field(c.lumps, (v) => lumps(v.lumpSumsEncoded)),
    field(c.penaltyPct, (v) => rate(v.prepayPenaltyPct || '0')),
    field(c.penaltyUntil, (v) => whole(v.prepayPenaltyUntilMonth || '0')),
  );
  const inputs: Sheet = { name: common.sheets.inputs, widths: [34, ...names.map(() => 18)], rows: inputRows };

  // The monthly payment. When an offer's payment changes with its rate, the one
  // column becomes three numeric ones and a note, so no figure stands for a
  // period it does not cover. With no such offer the summary is as it always was.
  const later = hasLaterPayment(results);
  const paymentHead = later ? [x.monthlyAtStart, x.monthlyAfterChange, x.fromMonth, x.paymentNote] : [island.delta.monthlyPayment];
  const paymentCells = (r: LoanResult): Cell[] => {
    if (!later) return [minor(r.effectiveMonthlyMinor)];
    const change = r.rateChange;
    if (change && change.paymentMinor !== null && r.keptPayment) {
      // The payment is kept: the note says so, and when the loan ends or that it does not.
      const fill = (t: string) => t.replace('{month}', String(change.month)).replace('{payoffMonth}', String(r.months)).replace('{limit}', String(MAX_TERM_MONTHS));
      const note = fill(r.keptPayment.outcome === 'paid' ? x.keptPaid : r.keptPayment.outcome === 'never' ? x.keptNever : x.keptLimit);
      return [minor(r.effectiveMonthlyMinor), minor(change.paymentMinor), { n: change.month, fmt: 'integer' }, note];
    }
    if (change && change.paymentMinor !== null) return [minor(r.effectiveMonthlyMinor), minor(change.paymentMinor), { n: change.month, fmt: 'integer' }, null];
    const note = change ? island.results.paidOffBeforeChange.replace('{payoffMonth}', String(r.months)) : x.noPaymentChange;
    return [minor(r.effectiveMonthlyMinor), null, null, note];
  };
  const summary: Sheet = {
    name: x.sheets.summary,
    widths: [22, ...(later ? [18, 22, 12, 34] : [16]), 12, 16, 16, 14, 16, 34, 12],
    rows: [
      head(c.name, ...paymentHead, x.months, island.delta.totalInterest, island.results.fees, island.results.penalty, island.delta.totalPaid, `${x.aprPct} (${island.results.aprBasis})`, x.computed),
      ...results.map((r, i): Cell[] =>
        ok(r)
          ? [
              names[i],
              ...paymentCells(r),
              isNotPaidOff(r) ? missing(r, 'months') : { n: r.months, fmt: 'integer' },
              isNotPaidOff(r) ? missing(r, 'total') : minor(r.totalInterestMinor),
              minor(r.feeMinor),
              minor(r.prepaymentPenaltyMinor),
              isNotPaidOff(r) ? missing(r, 'total') : minor(r.totalPaidMinor),
              isNotPaidOff(r)
                ? missing(r, 'apr')
                : Number.isFinite(r.aprNominal) ? { n: Math.round(r.aprNominal * 1_000_000) / 10_000, fmt: 'decimal2' } : null,
              common.yes,
            ]
          : [names[i], ...paymentHead.map(() => null), null, null, null, null, null, null, common.no],
      ),
    ],
  };

  const w = island.words;
  const schedules: Sheet[] = results.flatMap((r, i): Sheet[] =>
    ok(r)
      ? [{
          name: names[i],
          widths: [10, 16, 16, 16, 18],
          rows: [
            head(w.month, w.payment, w.interest, w.principal, x.balance),
            ...r.schedule.map((row): Cell[] => [
              { n: row.month, fmt: 'integer' },
              minor(row.payment),
              minor(row.interest),
              minor(row.principal),
              minor(row.balance),
            ]),
          ],
        }]
      : [],
  );

  return [about, summary, inputs, ...schedules];
}
