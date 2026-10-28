import { useEffect, useId, useState, type ReactNode } from 'react';
import { format } from '../i18n/format.ts';
import type { Dict } from '../i18n/strings/types.ts';
import { isoDate } from '../utils/shared/exportFile.ts';
import type { Report, ReportChart, ReportPoint, ReportTable } from '../utils/shared/report.ts';
import type { Cell } from '../utils/shared/xlsx.ts';

/**
 * The free tools' "Save or share these results" block, placed right after a
 * tool's headline result, and the report that prints in place of the page.
 *
 * Each tool hands in its own share button, its two actions (building its
 * workbook, opening the print dialog) and records its own analytics event, so
 * this file knows no tool and no event. What the buttons carry for analytics
 * is only their fixed `data-attr` label: no title, no aria text and no value.
 */

type Strings = Dict['tools']['export'];

/** Instagram's and Facebook's in-app browsers, which may not save files or print. Read here only, never sent. */
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS/;

export function ToolExport({
  strings,
  share,
  xlsxAttr,
  pdfAttr,
  ready,
  onSpreadsheet,
  onPrint,
}: {
  strings: Strings;
  /** The tool's own share button (and its status), shown first. */
  share?: ReactNode;
  /**
   * The two buttons' analytics labels, written out in full where the tool
   * uses this component, so the label registry (src/utils/analyticsLabels.ts)
   * can read them from the source.
   */
  xlsxAttr: string;
  pdfAttr: string;
  /** False while there are no results to keep; the buttons stay focusable and say why. */
  ready: boolean;
  onSpreadsheet: () => void;
  onPrint: () => void;
}) {
  const headingId = useId();
  const reasonId = useId();
  const [inApp, setInApp] = useState(false);
  const [made, setMade] = useState(false);
  useEffect(() => {
    setInApp(IN_APP.test(navigator.userAgent));
  }, []);
  useEffect(() => {
    if (!made) return;
    const timer = window.setTimeout(() => setMade(false), 6000);
    return () => window.clearTimeout(timer);
  }, [made]);

  // aria-disabled, not disabled: a disabled button leaves the tab order, and
  // focus on it would drop to the page whenever a keystroke makes the results
  // pending for a moment.
  const guarded = (action: () => void) => () => {
    if (ready) action();
  };
  return (
    <section className="tool-export" aria-labelledby={headingId}>
      <h3 id={headingId} className="tool-exportHeading">{strings.heading}</h3>
      <div className="tool-exportButtons">
        {share}
        <button
          type="button"
          className="tool-exportBtn"
          onClick={guarded(() => { onSpreadsheet(); setMade(true); })}
          aria-disabled={!ready || undefined}
          aria-describedby={ready ? undefined : reasonId}
          data-attr={xlsxAttr}
        >
          {strings.spreadsheet}
        </button>
        <button
          type="button"
          className="tool-exportBtn"
          onClick={guarded(onPrint)}
          aria-disabled={!ready || undefined}
          aria-describedby={ready ? undefined : reasonId}
          data-attr={pdfAttr}
        >
          {strings.print}
        </button>
      </div>
      <p className="tool-exportNote">{strings.note}</p>
      {inApp && <p className="tool-exportNote tool-exportNote--app">{strings.inApp}</p>}
      {!ready && <p id={reasonId} className="tool-exportNote">{strings.notReady}</p>}
      <p className="tool-exportStatus" role="status">{made ? strings.downloaded : ''}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

/** A number cell in the reader's locale, as the spreadsheet formats it. */
function cellText(c: Cell, locale: string): string {
  if (c === null || c === undefined) return '';
  if (typeof c === 'string') return c;
  if (typeof c === 'number') return new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(c);
  if ('t' in c) return c.t;
  const fmt = c.fmt ?? 'general';
  if (fmt === 'general') return new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(c.n);
  const digits = fmt === 'amount2' || fmt === 'decimal2' ? 2 : fmt === 'amount3' ? 3 : 0;
  // A year or a month count is not grouped; a count of thousands is.
  const useGrouping = fmt !== 'integer' || Math.abs(c.n) >= 10_000;
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping }).format(c.n);
}

const isNumber = (c: Cell) => typeof c === 'number' || (typeof c === 'object' && c !== null && 'n' in c);

function Table({ table, locale }: { table: ReportTable; locale: string }) {
  return (
    <div className="tool-reportBlock">
      <table className="tool-reportTable">
        {table.caption && <caption>{table.caption}</caption>}
        <thead>
          <tr>{table.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row">{cellText(c, locale)}</th>
                ) : (
                  <td key={i} className={isNumber(c) ? 'tool-reportNum' : undefined}>{cellText(c, locale)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {table.note && <p className="tool-reportNote">{table.note}</p>}
    </div>
  );
}

/** Round gridline steps (1, 2, 2.5 or 5 times a power of ten), at most five. */
function niceTop(v: number): { top: number; step: number } {
  if (v <= 0) return { top: 1, step: 0.25 };
  const raw = v / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return { top: Math.ceil(v / step) * step, step };
}

const W = 680;
const H = 300;
const PAD = { top: 12, right: 16, bottom: 44, left: 76 };

/**
 * The report's one chart, drawn for paper: black lines told apart by dashes,
 * grey bands, a key under it. No interaction, nothing focusable.
 */
function Chart({ chart, locale }: { chart: ReportChart; locale: string }) {
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  if (chart.kind === 'bars') {
    const rowH = 26;
    const labelW = 200;
    const h = chart.bars.length * rowH + 8;
    const max = Math.max(100, ...chart.bars.map((b) => b.share));
    const pct = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    return (
      <figure className="tool-reportBlock tool-reportFigure">
        <figcaption>{chart.title}</figcaption>
        <svg viewBox={`0 0 ${W} ${h}`} width="100%" aria-hidden="true" focusable="false">
          {chart.bars.map((b, i) => {
            const y = i * rowH + 4;
            const w = Math.max(0, (Math.abs(b.share) / max) * (W - labelW - 70));
            return (
              <g key={i}>
                <text x={labelW - 8} y={y + 15} textAnchor="end" className="tool-reportAxis">{b.label}</text>
                <rect x={labelW} y={y + 3} width={w} height={rowH - 10} fill={b.share < 0 ? '#fff' : '#555'} stroke="#222" strokeWidth="1" />
                <text x={labelW + w + 6} y={y + 15} className="tool-reportAxis">{pct.format(b.share)}%</text>
              </g>
            );
          })}
        </svg>
      </figure>
    );
  }

  const all = [...chart.series.flatMap((s) => s.points), ...(chart.bands ?? []).flatMap((b) => [...b.lower, ...b.upper])];
  if (all.length === 0) return null;
  const xMin = Math.min(...all.map((p) => p.x));
  const xMax = Math.max(...all.map((p) => p.x));
  const yMin = Math.min(0, ...all.map((p) => p.y));
  const { top, step } = niceTop(Math.max(...all.map((p) => p.y)) - yMin);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * plotW);
  const sy = (y: number) => PAD.top + plotH - ((y - yMin) / top) * plotH;
  const path = (pts: ReportPoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(yMin + v);
  // Whole, evenly spaced ticks (years, or calendar years), never a fraction.
  const xStep = Math.max(1, niceTop(xMax - xMin).step);
  const xTicks: number[] = [];
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) xTicks.push(Math.round(x));

  return (
    <figure className="tool-reportBlock tool-reportFigure">
      <figcaption>{chart.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" focusable="false">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(v)} y2={sy(v)} stroke="#ccc" strokeWidth="0.75" />
            <text x={PAD.left - 6} y={sy(v) + 4} textAnchor="end" className="tool-reportAxis">{compact.format(v)}</text>
          </g>
        ))}
        {xTicks.map((x) => (
          <text key={x} x={sx(x)} y={H - PAD.bottom + 16} textAnchor="middle" className="tool-reportAxis">{x}</text>
        ))}
        <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" className="tool-reportAxis">{chart.xLabel}</text>
        {(chart.bands ?? []).map((b, i) => (
          <path
            key={i}
            d={`${path(b.upper)}${[...b.lower].reverse().map((p) => `L${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('')}Z`}
            fill={`rgba(0,0,0,${b.shade})`}
            stroke="none"
          />
        ))}
        {chart.series.map((s, i) => (
          <path key={i} d={path(s.points)} fill="none" stroke="#111" strokeWidth={s.strong ? 2.5 : 1.5} strokeDasharray={s.dash || undefined} />
        ))}
      </svg>
      {chart.series.length + (chart.bands?.length ?? 0) > 1 && <ul className="tool-reportKey">
        {(chart.bands ?? []).map((b, i) => (
          <li key={`b${i}`}>
            <svg width="28" height="12" aria-hidden="true" focusable="false"><rect width="28" height="12" fill={`rgba(0,0,0,${b.shade})`} /></svg>
            {b.label}
          </li>
        ))}
        {chart.series.map((s, i) => (
          <li key={`s${i}`}>
            <svg width="28" height="12" aria-hidden="true" focusable="false"><line x1="0" x2="28" y1="6" y2="6" stroke="#111" strokeWidth={s.strong ? 2.5 : 1.5} strokeDasharray={s.dash || undefined} /></svg>
            {s.label}
          </li>
        ))}
      </ul>}
    </figure>
  );
}

/**
 * The printable report. It is always on the page, hidden on screen and the
 * only thing shown on paper, so the button, the browser's menu, a shortcut and
 * iOS's Share > Print all print the same thing without waiting on an event.
 * It holds no control, no link and no analytics label, and is hidden from
 * assistive technology: on screen the tool itself is the content.
 */
export function ToolReport({ report, strings, locale }: { report: Report; strings: Strings; locale: string }) {
  const r = strings.report;
  // The day it is printed, in the reader's time zone: a page left open
  // overnight prints tomorrow's date.
  const [date, setDate] = useState('');
  // The tool's address with no state: never the # part a share link carries.
  const [address, setAddress] = useState('');
  useEffect(() => {
    setAddress(`${window.location.origin}${window.location.pathname}`);
    const today = () => setDate(isoDate());
    today();
    window.addEventListener('beforeprint', today);
    return () => window.removeEventListener('beforeprint', today);
  }, []);

  return (
    <article className="tool-report" aria-hidden="true">
      <header className="tool-reportHeader">
        <p className="tool-reportKicker">{r.heading}</p>
        <h1 className="tool-reportTitle">{report.tool}</h1>
        <p className="tool-reportMeta">
          {date ? format(r.made, { date }) : ''} · {strings.about.currency}: {report.currency}
        </p>
      </header>

      <section className="tool-reportBlock">
        <h2>{r.answer}</h2>
        {report.answer.map((p, i) => <p key={i} className={i === 0 ? 'tool-reportLead' : undefined}>{p}</p>)}
      </section>

      <section className="tool-reportBlock">
        <h2>{r.meaning}</h2>
        <p>{report.meaning}</p>
      </section>

      {report.entered && (
        <section className="tool-reportBlock">
          <h2>{r.entered}</h2>
          <Table table={report.entered} locale={locale} />
        </section>
      )}

      {report.chart && <Chart chart={report.chart} locale={locale} />}

      {report.tables.map((t, i) => <Table key={i} table={t} locale={locale} />)}

      <section className="tool-reportBlock">
        <h2>{r.assumptions}</h2>
        {report.assumptionTable && <Table table={report.assumptionTable} locale={locale} />}
        {report.assumptions.length > 0 && (
          <ul>
            {report.assumptions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        )}
      </section>

      <footer className="tool-reportFooter">
        <p>{date ? format(r.footer, { date }) : ''}</p>
        <p>{address}</p>
      </footer>
    </article>
  );
}
