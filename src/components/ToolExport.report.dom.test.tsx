/**
 * ToolReport: the report that prints in place of a tool's page. What it
 * holds and in what order, when it joins the page, the date and address it
 * prints, and how its tables write and align their cells. Its chart has its
 * own file (ToolExport.chart.dom.test.tsx).
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, cleanup, render } from '@testing-library/react';
import { dict } from '../i18n/index.ts';
import type { Report, ReportTable } from '../utils/shared/report.ts';
import { ToolReport } from './ToolExport.tsx';

const strings = dict('en').tools.export;
const r = strings.report;

const REPORT: Report = {
  tool: 'Inflation calculator',
  currency: 'EUR',
  answer: ['€100 then buys what €182 buys now.', 'Prices rose 82%.'],
  meaning: 'The same basket costs more.',
  entered: null,
  tables: [],
  chart: null,
  assumptions: [],
};

beforeEach(() => {
  mock.timers.enable({ apis: ['Date'], now: new Date(2026, 2, 4, 23, 30) });
  window.history.replaceState(null, '', '/free/inflation-calculator/?utm_source=share#a=73191');
});
afterEach(() => {
  cleanup();
  mock.timers.reset();
  window.history.replaceState(null, '', '/free/');
});

const mount = (report: Partial<Report> = {}, locale = 'en') => {
  const view = render(<ToolReport report={{ ...REPORT, ...report }} strings={strings} locale={locale} />);
  return { view, article: view.container.querySelector('article') as HTMLElement };
};
const texts = (root: Element, selector: string) => [...root.querySelectorAll(selector)].map((el) => el.textContent);

describe('the printed report', () => {
  it('is not in the page as it is built', () => {
    assert.equal(renderToStaticMarkup(<ToolReport report={REPORT} strings={strings} locale="en" />), '');
  });

  it('joins the page when the tool starts, readable by a saved PDF', () => {
    const { article, view } = mount();
    assert.equal(view.container.children.length, 1);
    assert.equal(article.className, 'tool-report');
    assert.equal(article.hasAttribute('aria-hidden'), false);
    assert.equal(article.querySelectorAll('button, a, input, [data-attr]').length, 0, 'no control, link or analytics label');
  });

  it('opens with the tool, the day it was made and the currency', () => {
    const header = mount().article.querySelector('header') as HTMLElement;
    assert.equal(header.className, 'tool-reportHeader');
    assert.equal(header.querySelector('.tool-reportKicker')!.textContent, r.heading);
    assert.equal(header.querySelector('h1.tool-reportTitle')!.textContent, 'Inflation calculator');
    assert.equal(header.querySelector('.tool-reportMeta')!.textContent, 'Made on 2026-03-04 · Currency: EUR');
  });

  it('gives the answer as the page words it, the first line leading, then what it means', () => {
    const { article } = mount();
    const [answer, meaning, last, ...rest] = [...article.querySelectorAll('section.tool-reportBlock')];
    assert.equal(rest.length, 0);
    assert.equal(answer.querySelector('h2')!.textContent, r.answer);
    assert.deepEqual(texts(answer, 'p'), REPORT.answer);
    assert.deepEqual([...answer.querySelectorAll('p')].map((p) => p.getAttribute('class')), ['tool-reportLead', null]);
    assert.equal(meaning.querySelector('h2')!.textContent, r.meaning);
    assert.deepEqual(texts(meaning, 'p'), [REPORT.meaning]);
    assert.equal(last.querySelector('h2')!.textContent, r.assumptions);
  });

  it('leaves out what a report does not carry', () => {
    const { article } = mount();
    assert.deepEqual(texts(article, 'h2'), [r.answer, r.meaning, r.assumptions]);
    assert.equal(article.querySelectorAll('table, figure, ul').length, 0);
  });

  it('prints what was entered, the tables and the assumptions, in that order', () => {
    const table = (caption: string): ReportTable => ({ caption, head: ['Item', 'Value'], rows: [['Rate', 2]] });
    const { article } = mount({
      entered: table('entered'),
      tables: [table('first'), table('second')],
      assumptionTable: table('assumed'),
      assumptions: ['Prices are national averages.', 'Past inflation says little about the future.'],
    });
    assert.deepEqual(texts(article, 'h2'), [r.answer, r.meaning, r.entered, r.assumptions]);
    assert.deepEqual(texts(article, 'caption'), ['entered', 'first', 'second', 'assumed']);
    const tables = [...article.querySelectorAll('table')];
    // What the reader typed can hold names: that table alone is marked for it.
    assert.deepEqual(tables.map((t) => t.className), ['tool-reportTable tool-reportTable--names', 'tool-reportTable', 'tool-reportTable', 'tool-reportTable']);
    const entered = tables[0].closest('section') as HTMLElement;
    assert.equal(entered.className, 'tool-reportBlock');
    assert.equal(entered.querySelector('h2')!.textContent, r.entered);
    const assumptions = tables[3].closest('section') as HTMLElement;
    assert.equal(assumptions.querySelector('h2')!.textContent, r.assumptions);
    assert.deepEqual(texts(assumptions, 'ul > li'), ['Prices are national averages.', 'Past inflation says little about the future.']);
    assert.ok(tables[1].closest('section') === null);
    assert.equal(tables[1].parentElement!.className, 'tool-reportBlock');
  });

  it('closes with the day, the beta line and the tool address without any state', () => {
    const footer = mount().article.querySelector('footer') as HTMLElement;
    assert.equal(footer.className, 'tool-reportFooter');
    assert.deepEqual(texts(footer, 'p'), [
      r.footer.replace('{date}', '2026-03-04'),
      r.beta,
      'https://nidhi.today/free/inflation-calculator/',
    ]);
  });

  it('prints the date of the day it is printed, on a page left open overnight', () => {
    const { article } = mount();
    mock.timers.setTime(new Date(2026, 2, 5, 0, 10).getTime());
    act(() => { window.dispatchEvent(new window.Event('beforeprint')); });
    assert.equal(article.querySelector('.tool-reportMeta')!.textContent, 'Made on 2026-03-05 · Currency: EUR');
    assert.equal(article.querySelector('footer p')!.textContent, r.footer.replace('{date}', '2026-03-05'));
  });

  it('stops listening for a print when it leaves the page', () => {
    const heard: [string, unknown][] = [];
    const dropped: [string, unknown][] = [];
    const add = mock.method(window, 'addEventListener', (type: string, fn: unknown) => { heard.push([type, fn]); });
    const remove = mock.method(window, 'removeEventListener', (type: string, fn: unknown) => { dropped.push([type, fn]); });
    try {
      const { view } = mount();
      const mine = heard.filter(([type]) => type === 'beforeprint');
      assert.equal(mine.length, 1);
      assert.equal(dropped.filter(([type]) => type === 'beforeprint').length, 0);
      view.unmount();
      assert.deepEqual(dropped.filter(([type]) => type === 'beforeprint'), mine);
    } finally {
      add.mock.restore();
      remove.mock.restore();
    }
  });
});

describe('a table in the report', () => {
  const one = (table: ReportTable, locale = 'en') => mount({ tables: [table] }, locale).article.querySelector('table') as HTMLTableElement;
  const body = (table: HTMLTableElement) => [...table.tBodies[0].rows].map((row) => [...row.cells].map((c) => c.textContent));
  const classes = (table: HTMLTableElement) => [...table.tBodies[0].rows].map((row) => [...row.cells].map((c) => c.getAttribute('class')));

  it('writes each kind of cell in the reader locale, as the spreadsheet formats it', () => {
    const table = one({
      head: ['Kind', 'Value'],
      rows: [
        ['words', 'as typed'],
        ['text cell', { t: 'Offer A', bold: true }],
        ['nothing', null],
        ['not given', undefined],
        ['a number', 1234567.891],
        ['a small number', 0.1234567],
        ['a number cell', { n: 1234567.891 }],
        ['general', { n: 0.1234567, fmt: 'general' }],
        ['whole amount', { n: 1234.5, fmt: 'amount0' }],
        ['amount', { n: 1234.5, fmt: 'amount2' }],
        ['amount in thousandths', { n: 1.5, fmt: 'amount3' }],
        ['rate', { n: 2, fmt: 'decimal2' }],
        ['year', { n: 2026, fmt: 'integer' }],
        ['months', { n: 9999, fmt: 'integer' }],
        ['count', { n: 10000, fmt: 'integer' }],
        ['count below zero', { n: -10000, fmt: 'integer' }],
        ['below zero', { n: -9999, fmt: 'integer' }],
      ],
    });
    assert.deepEqual(body(table).map((row) => row[1]), [
      'as typed', 'Offer A', '', '', '1,234,570', '0.123457', '1,234,570', '0.123457',
      '1,235', '1,234.50', '1.500', '2.00', '2026', '9999', '10,000', '-10,000', '-9999',
    ]);
  });

  it('uses the locale it is given', () => {
    const table = one({ head: ['Kind', 'Value'], rows: [['a', 1234.5], ['b', { n: 1234.5, fmt: 'amount2' }], [1234.5, { n: 0.5 }]] }, 'de');
    assert.deepEqual(body(table), [['a', '1.234,5'], ['b', '1.234,50'], ['1.234,5', '0,5']]);
  });

  it('has a column heading for every column and a row heading for every row', () => {
    const table = one({ head: ['Year', 'Balance'], rows: [[{ n: 2026, fmt: 'integer' }, 5], [{ n: 2027, fmt: 'integer' }, 6]] });
    const head = [...table.tHead!.rows[0].cells];
    assert.deepEqual(head.map((c) => [c.tagName, c.getAttribute('scope'), c.textContent]), [['TH', 'col', 'Year'], ['TH', 'col', 'Balance']]);
    const rows = [...table.tBodies[0].rows].map((row) => [...row.cells].map((c) => [c.tagName, c.getAttribute('scope'), c.textContent]));
    assert.deepEqual(rows, [[['TH', 'row', '2026'], ['TD', null, '5']], [['TH', 'row', '2027'], ['TD', null, '6']]]);
    assert.ok(table.querySelector('caption') === null);
    assert.equal(table.querySelectorAll('.tool-reportLabel').length, 0);
  });

  it('sets a column of numbers flush right, header included, and keeps a mixed column on one edge', () => {
    const table = one({
      head: ['Item', 'Amount', 'Offer A', 'Notes', 'Unused'],
      rows: [
        ['Principal', 1000, 250000, 'fixed', null],
        ['Rate', { n: 2.5, fmt: 'decimal2' }, 'n/a', { t: 'yearly' }, ''],
        ['Fees', null, { n: 12, fmt: 'amount2' }, null, undefined],
        ['Tax', '', null, '', null],
      ],
    });
    assert.deepEqual([...table.tHead!.rows[0].cells].map((c) => c.getAttribute('class')), [null, 'tool-reportNum', null, null, null]);
    assert.deepEqual(classes(table), [
      [null, 'tool-reportNum', 'tool-reportWhole', null, 'tool-reportEmpty'],
      [null, 'tool-reportNum', null, null, 'tool-reportEmpty'],
      [null, 'tool-reportNum tool-reportEmpty', 'tool-reportWhole', 'tool-reportEmpty', 'tool-reportEmpty'],
      [null, 'tool-reportNum tool-reportEmpty', 'tool-reportEmpty', 'tool-reportEmpty', 'tool-reportEmpty'],
    ]);
  });

  it('repeats each column heading in its cells when the table stacks on narrow paper', () => {
    const table = one({ head: ['Year', 'Offer A', 'Offer B'], rows: [[1, 5, 'none'], [2, 6, null]], stack: true });
    assert.equal(table.className, 'tool-reportTable tool-reportTable--stack');
    const cells = [...table.querySelectorAll('td')];
    assert.deepEqual(cells.map((td) => td.querySelector('span.tool-reportLabel')!.textContent), ['Offer A', 'Offer B', 'Offer A', 'Offer B']);
    assert.deepEqual(cells.map((td) => td.textContent), ['Offer A5', 'Offer Bnone', 'Offer A6', 'Offer B']);
    // Text, not an attribute: a heading can be a name the reader typed.
    for (const td of cells) assert.deepEqual(td.getAttributeNames().filter((n) => n !== 'class'), []);
    assert.equal(table.querySelectorAll('th .tool-reportLabel').length, 0);
  });

  it('marks a stacked table of what was entered both ways', () => {
    const { article } = mount({ entered: { head: ['Item', 'Value'], rows: [['Rate', 2]], stack: true } });
    assert.equal(article.querySelector('table')!.className, 'tool-reportTable tool-reportTable--stack tool-reportTable--names');
  });

  it('prints its caption and the lines under it', () => {
    const block = (table: ReportTable) => one(table).parentElement as HTMLElement;
    const base = { head: ['Item', 'Value'], rows: [['Rate', 2]] };
    const single = block({ ...base, caption: 'Year by year', note: 'Every fifth year is shown.' });
    assert.equal(single.querySelector('caption')!.textContent, 'Year by year');
    assert.deepEqual(texts(single, 'p.tool-reportNote'), ['Every fifth year is shown.']);
    cleanup();
    assert.deepEqual(texts(block({ ...base, note: ['One.', 'Two.'] }), 'p'), ['One.', 'Two.']);
    cleanup();
    assert.equal(block(base).querySelectorAll('p').length, 0);
  });
});
