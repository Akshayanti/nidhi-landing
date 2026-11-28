/**
 * The country history of the inflation calculator (#790): `HistoryPanel`
 * offers the countries, says a history is loading or could not be loaded,
 * and once it is there says its average, the years it covers and the years
 * with no figure, offers the average as the rate where the rate box would
 * take it, and lists every year in a table. Folded behind one row for every
 * question but "Past to today".
 */
import { island, fill, draw, clear, all, text, one, none } from '../../test/inflationParts.components.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import { HistoryPanel, type CountryOption } from './InflationCalculator.tsx';

/** A cell's own text, without the column name it shows where the table is drawn as records. */
const cellText = (c: Element) => { const x = c.cloneNode(true) as Element; x.querySelectorAll('.tool-recordLabel').forEach((l) => l.remove()); return x.textContent; };
/** The column name a cell shows where the table is drawn as records. */
const cellLabel = (c: Element) => c.querySelector('.tool-recordLabel')?.textContent ?? null;

const h = island.history;
const TESTLAND: CountryOption = { code: 'TST', name: 'Testland', currency: 'EUR' };
const OTHERLAND: CountryOption = { code: 'OTH', name: 'Otherland', currency: null };
const EURO_AREA: CountryOption = { code: 'EMU', name: 'Euro area', currency: 'EUR' };
const COUNTRIES = [EURO_AREA, OTHERLAND, TESTLAND];

type Props = ComponentProps<typeof HistoryPanel>;
const calls = { country: [] as string[], use: [] as number[], toggle: [] as boolean[] };

const element = (props: Partial<Props> = {}) => (
  <HistoryPanel
    strings={island}
    ids={{ country: 'c1' }}
    countries={COUNTRIES}
    country={null}
    currency="EUR"
    series={null}
    state="none"
    showUse
    fold={false}
    open={false}
    onToggle={(open) => calls.toggle.push(open)}
    narrow={false}
    numberLocale="en"
    onCountry={(code) => calls.country.push(code)}
    onUse={(avg) => calls.use.push(avg)}
    {...props}
  />
);

function panel(props: Partial<Props> = {}) {
  calls.country = [];
  calls.use = [];
  calls.toggle = [];
  return draw(element(props));
}

const select = () => screen.getByLabelText(h.label, { selector: 'select' }) as HTMLSelectElement;
const hints = () => text('.ifc-historyBody > p.ifc-hint');
const rows = () => all('tbody tr').map((r) => [...r.children].map(cellText));

// Two years with no gap: 5.26% then -1.04%. The steady rate with the same
// effect is the square root of 1.0526 x 0.9896 = 1.04165, less one: 2.06%.
const PLAIN = { 2010: 5.26, 2011: -1.04 };
// Four years around a gap, 1.1 x 1 x 1.21 x 1.1 = 1.1 to the fourth: 10% a year.
const GAPPED = { 2001: 10, 2002: 0, 2004: 21, 2005: 10 };

describe('the country history of the inflation calculator', () => {
  it('with no country it offers the countries and nothing else, and hands a choice on', () => {
    panel();
    assert.equal(one('.ifc-history').tagName, 'DIV');
    assert.equal(one('.ifc-history').className, 'ifc-history');
    assert.equal(one('.ifc-countryField').className, 'ifc-field ifc-countryField');
    assert.equal(select().id, 'c1');
    assert.equal(select().className, 'ifc-input');
    assert.equal(one('.ifc-countryField label').className, 'ifc-label');
    assert.equal(select().value, '');
    assert.deepEqual([...select().options].map((o) => [o.value, o.textContent]), [['', h.none], ['EMU', 'Euro area'], ['OTH', 'Otherland'], ['TST', 'Testland']]);
    assert.equal(select().getAttribute('aria-describedby'), 'c1-hint');
    assert.equal(one('#c1-hint').textContent, h.hint);
    assert.equal(one('#c1-hint').className, 'ifc-hint');
    none('.ifc-note');
    none('.ifc-historyBody');
    none('details');
    fireEvent.change(select(), { target: { value: 'OTH' } });
    assert.deepEqual(calls.country, ['OTH']);
    clear();
    // The page as the server sends it, before any script runs, has "no country" chosen.
    assert.ok(renderToString(element()).includes(`<option value="" selected="">${h.none}</option>`));
    // A status with no country to load says nothing.
    panel({ state: 'loading' });
    none('.ifc-note');
    clear();
    panel({ state: 'error' });
    none('.ifc-note');
    clear();
    // A history that is ready but holds no year shows the choice alone.
    panel({ country: TESTLAND, state: 'ready', series: {} });
    assert.equal(select().value, 'TST');
    none('.ifc-historyBody');
    clear();
    panel({ country: TESTLAND, state: 'ready', series: null });
    none('.ifc-historyBody');
    none('.ifc-note');
  });

  it('says a history is loading, or could not be loaded, as a status', () => {
    panel({ country: TESTLAND, state: 'loading' });
    assert.deepEqual(all('.ifc-note').map((p) => [p.className, p.getAttribute('role'), p.textContent]), [['ifc-note', 'status', h.loading]]);
    none('.ifc-historyBody');
    clear();
    panel({ country: TESTLAND, state: 'error' });
    assert.deepEqual(all('.ifc-note').map((p) => [p.className, p.getAttribute('role'), p.textContent]), [['ifc-note ifc-note--warn', 'status', h.error]]);
    clear();
    // Figures that arrived are not shown under a status that is not "ready".
    panel({ country: TESTLAND, state: 'loading', series: PLAIN });
    none('.ifc-historyBody');
    clear();
    panel({ country: TESTLAND, state: 'ready', series: PLAIN });
    none('.ifc-note');
  });

  it('a history with no gap: its chart, its average, the years it covers, the offer and the table', () => {
    panel({ country: TESTLAND, state: 'ready', series: PLAIN });
    {
      // the chart is named with the years and the highest and lowest year, to one decimal
      const svg = one('.ifc-historyBody svg');
      assert.equal(svg.getAttribute('aria-label'), 'Yearly inflation in Testland, 2010 to 2011. Highest 5.3% in 2010, lowest −1% in 2011.');
      assert.equal(svg.getAttribute('viewBox')?.split(' ')[2], '760');
      // Both years are in the average.
      assert.equal(all('rect.ifc-bar--recent').length, 2);
    }
    {
      // the average, to one decimal, then what kind of average it is
      assert.equal(one('.ifc-historyAvg strong').textContent, 'Testland, 2010 to 2011: about 2.1% a year on average.');
      assert.equal(one('.ifc-historyAvg').textContent, `Testland, 2010 to 2011: about 2.1% a year on average. ${h.averageNote}`);
      assert.deepEqual(hints(), ['Figures cover 2010 to 2011.']);
    }
    {
      // the average can be used as the rate, exactly as worked out
      const use = screen.getByRole('button', { name: h.use });
      assert.equal(use.getAttribute('data-attr'), 'free-inflation-use-average');
      assert.equal(use.getAttribute('type'), 'button');
      assert.equal(use.className, 'ifc-linkBtn');
      fireEvent.click(use);
      assert.equal(calls.use.length, 1);
      assert.ok(Math.abs(calls.use[0] - (Math.sqrt(1.0526 * 0.9896) - 1) * 100) < 1e-9);
    }
    {
      // every year in a table a screen reader can read, newest first, to two decimals
      const details = one('details.ifc-tableWrap') as HTMLDetailsElement;
      assert.equal(details.open, false);
      assert.equal(one('.ifc-tableWrap summary').textContent, h.tableSummary);
      assert.equal(one('.ifc-tableWrap summary').className, 'ifc-tableSummary disclosure');
      assert.equal(one('.ifc-tableScroll table').className, 'ifc-table tool-recordTable');
      assert.equal(one('table').getAttribute('role'), 'table');
      assert.equal(one('caption').textContent, 'Yearly inflation in Testland');
      assert.deepEqual(all('thead th').map((c) => [c.textContent, c.getAttribute('scope'), c.getAttribute('role')]), [[h.tableYear, 'col', 'columnheader'], [h.tableRate, 'col', 'columnheader']]);
      assert.deepEqual([one('thead').getAttribute('role'), one('tbody').getAttribute('role'), one('thead tr').getAttribute('role')], ['rowgroup', 'rowgroup', 'row']);
      assert.deepEqual(rows(), [['2011', '−1.04%'], ['2010', '5.26%']]);
      assert.deepEqual(all('tbody tr').map((r) => r.getAttribute('role')), ['row', 'row']);
      assert.deepEqual(all('tbody th').map((c) => [c.getAttribute('scope'), c.getAttribute('role'), cellLabel(c)]), [['row', 'rowheader', h.tableYear], ['row', 'rowheader', h.tableYear]]);
      assert.deepEqual(all('tbody td').map((c) => [c.getAttribute('role'), cellLabel(c)]), [['cell', h.tableRate], ['cell', h.tableRate]]);
    }
    {
      // nothing is said of another currency while the country's own is one of the tool's
      none('.ifc-note');
    }
    clear();
    // Where the rate box is not shown there is nothing to use the average for.
    panel({ country: TESTLAND, state: 'ready', series: PLAIN, showUse: false });
    none('.ifc-linkBtn');
    assert.deepEqual(hints(), ['Figures cover 2010 to 2011.']);
  });

  it('a history with gaps says how many years the average counts, which years have no figure, and where “Past to today” can start', () => {
    panel({ country: OTHERLAND, currency: 'USD', state: 'ready', series: GAPPED, narrow: true });
    assert.equal(one('.ifc-historyAvg strong').textContent, 'Otherland, the 4 most recent years with a figure (2001 to 2005): about 10% a year on average.');
    assert.deepEqual(hints(), ['Figures cover 2001 to 2005. No figure for 2003. “Past to today” starts no earlier than 2004, so that no year is skipped.']);
    assert.equal(one('.ifc-historyBody svg').getAttribute('aria-label'), 'Yearly inflation in Otherland, 2001 to 2005. Highest 21% in 2004, lowest 0% in 2002.');
    // A phone's drawing.
    assert.equal(one('.ifc-historyBody svg').getAttribute('viewBox')?.split(' ')[2], '360');
    assert.deepEqual(rows(), [['2005', '10%'], ['2004', '21%'], ['2003', h.tableNone], ['2002', '0%'], ['2001', '10%']]);
    // A country whose own money the tool does not have: the amounts stay in the currency chosen.
    assert.deepEqual(all('.ifc-historyBody > .ifc-note').map((p) => [p.className, p.textContent]), [['ifc-note', fill(h.currencyOther, { currency: 'USD', country: 'Otherland' })]]);
    assert.ok(h.currencyOther.includes('{currency}') && h.currencyOther.includes('{country}'));
    clear();
    // Several runs of missing years: single years alone, longer runs as a range.
    panel({ country: TESTLAND, state: 'ready', series: { 2000: 1, 2002: 1, 2005: 1 } });
    assert.equal(hints()[0], 'Figures cover 2000 to 2005. No figure for 2001, 2003 to 2004. “Past to today” starts no earlier than 2005, so that no year is skipped.');
  });

  it('only the ten most recent years are marked as the average’s', () => {
    const series = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [1990 + i, 2]));
    panel({ country: TESTLAND, state: 'ready', series });
    assert.equal(all('rect.ifc-bar').length, 12);
    assert.equal(all('rect.ifc-bar--recent').length, 10);
    assert.equal(one('.ifc-historyAvg strong').textContent, 'Testland, 1992 to 2001: about 2% a year on average.');
  });

  it('the average is offered as the rate only where the rate box takes it: from 0 to 10,000', () => {
    const outside = 'This average is outside the 0 to 10,000% the rate box accepts, so it cannot be used as the rate.';
    // No inflation at all is a rate the box takes.
    panel({ country: TESTLAND, state: 'ready', series: { 2000: 0, 2001: 0 } });
    fireEvent.click(screen.getByRole('button', { name: h.use }));
    assert.deepEqual(calls.use, [0]);
    assert.equal(hints().length, 1);
    clear();
    // Falling prices are not.
    panel({ country: TESTLAND, state: 'ready', series: { 2000: -5 } });
    none('.ifc-linkBtn');
    assert.deepEqual(hints(), ['Figures cover 2000 to 2000.', outside]);
    clear();
    // 10,000% a year is the most the box takes.
    panel({ country: TESTLAND, state: 'ready', series: { 2000: 10_000 } });
    fireEvent.click(screen.getByRole('button', { name: h.use }));
    assert.deepEqual(calls.use, [10_000]);
    clear();
    panel({ country: TESTLAND, state: 'ready', series: { 2000: 20_000 } });
    none('.ifc-linkBtn');
    assert.equal(hints()[1], outside);
    clear();
    // The limits are written the page's way, and so are the percentages.
    panel({ country: TESTLAND, state: 'ready', series: { 2000: 20_000 }, numberLocale: 'es' });
    assert.equal(hints()[1], fill(h.useOutside, { min: '0', max: '10.000' }));
    clear();
    panel({ country: TESTLAND, state: 'ready', series: { 2000: -5 }, showUse: false });
    assert.deepEqual(hints(), ['Figures cover 2000 to 2000.']);
    clear();
    // Below zero with the true minus sign, as the page writes it (#888).
    const pct = (v: number, digits: number) => new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: digits }).format(v / 100).replace('-', '\u2212');
    panel({ country: TESTLAND, state: 'ready', series: PLAIN, numberLocale: 'es' });
    assert.notEqual(pct(5.26, 2), '5.26%');
    assert.deepEqual(rows(), [['2011', pct(-1.04, 2)], ['2010', pct(5.26, 2)]]);
    assert.equal(one('.ifc-historyAvg strong').textContent, fill(h.average, { country: 'Testland', first: 2010, last: 2011, average: pct(2.06, 1) }));
    assert.equal(one('.ifc-historyBody svg').getAttribute('aria-label'), fill(h.chartLabel, { country: 'Testland', first: 2010, last: 2011, high: pct(5.26, 1), highYear: 2010, low: pct(-1.04, 1), lowYear: 2011 }));
  });

  it('the euro area is not called a country', () => {
    panel({ country: EURO_AREA, state: 'ready', series: PLAIN });
    assert.equal(one('.ifc-historyBody svg').getAttribute('aria-label'), 'Yearly inflation in the euro area, 2010 to 2011. Highest 5.3% in 2010, lowest −1% in 2011.');
    assert.equal(one('caption').textContent, h.tableCaptionEuroArea);
    assert.notEqual(h.tableCaptionEuroArea, fill(h.tableCaption, { country: 'Euro area' }));
  });

  it('folded behind one row that names the country, and says when it is opened or closed', () => {
    panel({ fold: true });
    const fold = one('details.ifc-history') as HTMLDetailsElement;
    assert.equal(fold.className, 'ifc-history ifc-history--fold');
    assert.equal(fold.open, false);
    assert.equal(one('.ifc-history > summary').className, 'ifc-historySummary disclosure');
    assert.equal(one('.ifc-historyTitle').textContent, h.label);
    assert.equal(one('.ifc-historyStatus').textContent, h.none);
    // The choice is inside the fold.
    assert.ok(one('.ifc-historyFold').contains(select()));
    assert.ok(one('.ifc-historyFold').parentElement === fold);
    fold.open = true;
    fireEvent(fold, new window.Event('toggle'));
    fold.open = false;
    fireEvent(fold, new window.Event('toggle'));
    assert.deepEqual(calls.toggle, [true, false]);
    clear();
    panel({ fold: true, open: true, country: TESTLAND, state: 'ready', series: PLAIN });
    assert.equal((one('details.ifc-history') as HTMLDetailsElement).open, true);
    assert.equal(one('.ifc-historyStatus').textContent, 'Testland');
    assert.ok(one('.ifc-historyFold').contains(one('.ifc-historyBody')));
  });
});
