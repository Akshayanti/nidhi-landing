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
import { amountFormat, type Cell, type Sheet } from '../shared/xlsx.ts';
import { fromMinor, getCurrency, type LoanResult } from './math.ts';
import { parseNumber } from './inputs.ts';
import type { VendorInput } from './url.ts';

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
}

const head = (...titles: string[]): Cell[] => titles.map((t) => ({ t, bold: true }));

export function loanSheets({ island, common, currency, vendors, results, names, date, page }: LoanExport): Sheet[] {
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
    return Number.isFinite(n) ? { n, fmt: 'decimal2' } : null;
  };
  const whole = (raw: string): Cell => {
    const n = parseNumber(raw);
    return Number.isFinite(n) ? { n: Math.round(n), fmt: 'integer' } : null;
  };
  const ok = (r: LoanResult) => !r.error && r.schedule.length > 0;

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
    );
  }
  inputRows.push(
    field(c.fee, (v) => major(v.feeMajor || '0')),
    field(c.pointsCost, (v) => major(v.pointsCostMajor || '0')),
    field(c.pointsReduction, (v) => rate(v.pointsRateReductionPct || '0')),
    field(c.extra, (v) => major(v.extraMonthly || '0')),
    field(c.lumps, (v) => v.lumpSumsEncoded || null),
    field(c.penaltyPct, (v) => rate(v.prepayPenaltyPct || '0')),
    field(c.penaltyUntil, (v) => whole(v.prepayPenaltyUntilMonth || '0')),
  );
  const inputs: Sheet = { name: common.sheets.inputs, widths: [34, ...names.map(() => 18)], rows: inputRows };

  const summary: Sheet = {
    name: x.sheets.summary,
    widths: [22, 16, 12, 16, 16, 14, 16, 16, 12],
    rows: [
      head(c.name, island.delta.monthlyPayment, x.months, island.delta.totalInterest, island.results.fees, island.results.penalty, island.delta.totalPaid, x.aprPct, x.computed),
      ...results.map((r, i): Cell[] =>
        ok(r)
          ? [
              names[i],
              minor(r.effectiveMonthlyMinor),
              { n: r.months, fmt: 'integer' },
              minor(r.totalInterestMinor),
              minor(r.feeMinor),
              minor(r.prepaymentPenaltyMinor),
              minor(r.totalPaidMinor),
              Number.isFinite(r.aprNominal) ? { n: Math.round(r.aprNominal * 1_000_000) / 10_000, fmt: 'decimal2' } : null,
              common.yes,
            ]
          : [names[i], null, null, null, null, null, null, null, common.no],
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
