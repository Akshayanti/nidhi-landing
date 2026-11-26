/**
 * The invest or pay off calculator's results (#790): the sentences, each
 * path's range and facts, the chart, the choice of how today's money is
 * counted, the rates sentence, and the reader's own return beside the
 * historical range.
 *
 * The result is small enough to read on paper (test/investOrPayOffParts.results.tsx):
 * paying off is done in 33 months, investing in 52, compared at 33.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';
import type { Result, TodayBasis } from '../utils/invest-or-pay-off/math.ts';
import { draw, island, money, none, one, result, sentNone, text } from '../../test/investOrPayOffParts.results.tsx';
import { Results } from './InvestOrPayOff.tsx';

const s = island.results;

function results(over: {
  result?: Result;
  range?: { cautious: Result; optimistic: Result } | null;
  ownReal?: number | null;
  todayAt?: TodayBasis;
  onTodayAt?: (b: TodayBasis) => void;
  numberLocale?: string;
} = {}) {
  return draw(
    <Results
      strings={island}
      result={over.result ?? result()}
      range={over.range ?? null}
      ownReal={over.ownReal ?? null}
      debtReal={4.61}
      investReal={5.04}
      numberLocale={over.numberLocale ?? 'en'}
      money={money}
      todayAt={over.todayAt ?? 'month'}
      onTodayAt={over.onTodayAt ?? (() => {})}
      basisName="iop-basis-1"
    />,
  );
}

const lengths = (selector: string) => [...document.querySelectorAll(selector)].map((a) => (a as HTMLElement).style.getPropertyValue('--amt-len'));

describe('the results', () => {
  it('lead with who was ahead how often, then when and the gap, with what the gap means and why it is rounded', () => {
    results();
    const ps = [...one('.iop-answer').children].filter((el) => el.tagName === 'P').map((p) => p.textContent);
    assert.deepEqual(ps.slice(0, 4), [
      'Investing the extra money ended with higher modelled net wealth in 54 of 100 scenarios; paying off the debt did in 46.',
      'Compared in 2 years and 9 months. The gap, investing minus paying off, in today\'s money: €-400 at the 10th scenario in 100, €100 in the middle, €700 at the 90th.',
      s.gapNote,
      'Amounts are rounded: another 10,000 random scenarios would give different last digits. The spreadsheet has every digit.',
    ]);
    assert.equal(one('.iop-headline').className, 'ifc-headline iop-headline');
  });

  it('writes the count of scenarios in the page’s own marks', () => {
    results({ numberLocale: 'de' });
    assert.match(one('.iop-answer').textContent ?? '', /another 10\.000 random scenarios/);
  });

  it('each path: its name, its range and middle, when its debt is paid and the interest charged', () => {
    results();
    assert.deepEqual(text('.iop-pathName'), [s.payoffPath, s.investPath]);
    const [a, b] = [...document.querySelectorAll('.iop-path')];
    assert.equal(a.querySelector('.ifc-hint')?.textContent, s.netWealth);
    assert.deepEqual(text('.iop-pathRange'), ['€100 to €300', '€50 to €900']);
    assert.deepEqual(text('.iop-pathMiddle'), ['Middle: €200', 'Middle: €250']);
    assert.deepEqual(text('li', a), ['Debt paid in 2 years and 9 months', 'Interest charged up to the date: €1500']);
    assert.deepEqual(text('li', b), [
      'Debt paid in 4 years and 4 months, after the comparison date',
      'Still owed on the date: €7000',
      'Interest charged up to the date: €2700',
    ]);
  });

  it('a debt paid on the comparison date is paid in time, and nothing owed is not said', () => {
    results({ result: result({ payoffMonthB: 33, remainingB: 0 }) });
    const b = document.querySelectorAll('.iop-path')[1];
    assert.deepEqual(text('li', b), ['Debt paid in 2 years and 9 months', 'Interest charged up to the date: €2700']);
  });

  it('the two paths’ ranges share one size, and their middles another', () => {
    results({ result: result({ a: { p10: 100, p50: 200, p90: 300 }, b: { p10: 50, p50: 250_000, p90: 9_000_000 } }) });
    assert.deepEqual(lengths('.iop-pathRange .amt'), ['8.1', '8.1', '8.1', '8.1']);
    assert.deepEqual(lengths('.iop-pathMiddle .amt'), ['7.1', '7.1']);
  });

  it('draws the chart from both paths as worded', () => {
    results();
    assert.deepEqual(text('.iop-chartLabel'), [
      'Paying off first: €100 to €300, middle €200',
      'Investing the extra: €50 to €900, middle €250',
    ]);
  });

  it('says the interest avoided, counted month by month, and offers the other count', () => {
    results();
    assert.ok(text('.iop-answer > p').includes('Paying off early avoids €1200 of interest up to the date (€1150 in today\'s money).'));
    assert.equal(one('.iop-basisTitle').textContent, s.basis.title);
    assert.equal(one('.iop-moreStatus').textContent, s.basis.month);
    const group = screen.getByRole('radiogroup');
    assert.equal(group.getAttribute('aria-label'), s.basis.title);
    const radios = [...group.querySelectorAll('input')] as HTMLInputElement[];
    assert.deepEqual(radios.map((r) => [r.type, r.name, r.value, r.checked]), [['radio', 'iop-basis-1', 'month', true], ['radio', 'iop-basis-1', 'end', false]]);
    assert.deepEqual(text('.iop-choiceLabel'), [s.basis.month, s.basis.end]);
    assert.deepEqual(text('.iop-choiceText .ifc-hint'), [s.basis.monthHint, s.basis.endHint]);
  });

  it('counted at the comparison date when that is the choice', () => {
    results({ todayAt: 'end' });
    assert.ok(text('.iop-answer > p').includes('Paying off early avoids €1200 of interest up to the date (€1100 in today\'s money).'));
    assert.equal(one('.iop-moreStatus').textContent, s.basis.end);
    const radios = [...document.querySelectorAll('input[type=radio]')] as HTMLInputElement[];
    assert.deepEqual(radios.map((r) => r.checked), [false, true]);
  });

  it('a choice of count goes to the page, and no analytics carry an amount', () => {
    const picked: TodayBasis[] = [];
    results({ onTodayAt: (b) => picked.push(b) });
    fireEvent.click(screen.getByLabelText(new RegExp(s.basis.end)));
    assert.deepEqual(picked, ['end']);
    sentNone(1200, 1150, 1100, 7000);
  });

  it('picking month by month, from the other count', () => {
    const picked: TodayBasis[] = [];
    results({ todayAt: 'end', onTodayAt: (b) => picked.push(b) });
    fireEvent.click(screen.getByLabelText(new RegExp(s.basis.month)));
    assert.deepEqual(picked, ['month']);
  });

  it('says what the debt costs and what the investment returns, after inflation', () => {
    results();
    assert.ok(text('.ifc-hint').includes('The debt costs 4.6% a year after relief and inflation; the investment\'s compound return in this setting is 5% a year after inflation, before fees.'));
  });

  it('no table beside the range without a range, or without the reader’s own figure', () => {
    results();
    none('.iop-side');
  });

  it('no table when a range comes without the reader’s figure', () => {
    results({ range: { cautious: result(), optimistic: result() }, ownReal: null });
    none('.iop-side');
  });

  it('the reader’s own figure beside the cautious and optimistic settings', () => {
    const cautious = result({ bAhead: 0.314, diff: { p10: -900, p50: -250, p90: 300 } });
    const optimistic = result({ bAhead: 0.786, diff: { p10: -100, p50: 600, p90: 1500 } });
    results({ range: { cautious, optimistic }, ownReal: 7.5 });
    assert.equal(one('.iop-side .iop-pathName').textContent, s.side.heading);
    assert.equal(one('.iop-side caption').textContent, s.side.caption);
    assert.deepEqual(text('.iop-side thead th'), [s.side.figure, s.side.invest, s.side.gap]);
    for (const th of document.querySelectorAll('.iop-side th')) assert.equal(th.getAttribute('scope'), th.closest('thead') ? 'col' : 'row');
    const rows = [...document.querySelectorAll('.iop-side tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent));
    assert.deepEqual(rows, [
      ['Your figure (7.5% after inflation)', '54', '€100'],
      ['Cautious (4%)', '31', '€-250'],
      ['Optimistic (6%)', '79', '€600'],
    ]);
  });
});
