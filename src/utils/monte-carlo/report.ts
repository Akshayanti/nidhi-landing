/**
 * The Monte Carlo simulator's printed report, built from its spreadsheet's
 * sheets: the plan, the spread at every fifth year, the fan chart and the
 * assumptions. The answer's sentences come from the island, worded as the
 * page words them.
 *
 * Pure: no DOM, no analytics.
 */
import { byYearTable, tableOf, type Report } from '../shared/report.ts';
import { monteCarloSheets, type MonteCarloExport } from './export.ts';

export function monteCarloReport(e: Omit<MonteCarloExport, 'date' | 'page'> & { answer: string[] }): Report {
  const { island, common, state, result, answer } = e;
  const x = island.export;
  const [, inputs, assumptions, byYear] = monteCarloSheets({ ...e, date: '', page: '' });
  const years = result.bands.map((_, y) => y);
  const at = (pick: (b: (typeof result.bands)[number]) => number) => years.map((y) => ({ x: y, y: pick(result.bands[y]) }));
  const c = island.chart;

  return {
    tool: x.tool,
    currency: state.currency,
    answer,
    meaning: x.meaning,
    entered: tableOf(inputs),
    chart: result.years > 0
      ? {
          kind: 'lines',
          title: `${c.title} (${state.currency})`,
          xLabel: c.axisYears,
          bands: [
            { label: c.legendPaths, lower: at((b) => b.p10), upper: at((b) => b.p90), shade: 0.12 },
            { label: c.legendMiddle, lower: at((b) => b.p25), upper: at((b) => b.p75), shade: 0.28 },
          ],
          series: [
            { label: c.legendMedian, points: at((b) => b.p50), strong: true },
            { label: c.legendStraight, points: years.map((y) => ({ x: y, y: result.straightLine[y] })), dash: '6 4' },
          ],
        }
      : null,
    tables: [byYearTable(byYear.rows[0], byYear.rows.slice(1), x.sheets.byYear, common.report.sampled, 0)],
    assumptionTable: tableOf(assumptions),
    // The page's caveat points at a section below it, which the report does
    // not have; the meaning above says the same.
    assumptions: [],
  };
}
