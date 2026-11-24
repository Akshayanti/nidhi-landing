/**
 * The net worth calculator's donut (`ConcentrationChart`, #790): each
 * currency's slice of everything held or owed, drawn to scale, its share and
 * amount in the legend, the words in the hole, what a screen reader is told
 * and given as a table, highlighting a currency by mouse, touch, keyboard or
 * Escape, the currencies left out for want of a rate, and what is drawn when
 * there is nothing to draw.
 *
 * The rates are round: one euro buys 2 US dollars, 200 yen and 25 koruna.
 * Every share and every point on the drawing is worked out here by hand.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';
import { all, atTextSize, czech, draw, island, one, own, owe, text, textDrawnAs, worked, type Strings } from '../../test/netWorthParts.charts.tsx';
import { CURRENCIES } from '../utils/loan/math.ts';
import type { CurrencyPosition } from '../utils/multi-currency-net-worth/math.ts';
import { ConcentrationChart } from './MultiCurrencyNetWorth.tsx';

function chart(positions: CurrencyPosition[], strings: Strings = island, locale = 'en') {
  return draw(<ConcentrationChart positions={positions} functionalCurrency="EUR" strings={strings} />, locale);
}

/** As a link without amounts gives them: the shares kept, every amount gone. */
const withoutAmounts = (positions: CurrencyPosition[]) => positions.map((p) => ({ ...p, netAmountFunctional: 0, netAmountOriginal: 0 }));

const slices = () => all('path.mcnw-slice');
const legendButtons = () => all('.mcnw-legendItem') as HTMLElement[];
const legendEntry = (code: string) => legendButtons().find((b) => b.querySelector('.mcnw-legendCode')?.textContent === code) as HTMLElement;
const centre = () => text('svg.mcnw-chart > text');
const said = () => one('.chart-srOnly[aria-live="polite"]').textContent;
const marks = () => all('g.mcnw-sliceMark');
const sliceOf = (code: string) => slices()[legendButtons().indexOf(legendEntry(code))];
const markOf = (code: string) => {
  const i = legendButtons().indexOf(legendEntry(code));
  return all('g.mcnw-sliceMark')[i];
};

// 300 euros and 200 dollars (100 euros): three quarters and one quarter.
const QUARTERS = () => worked([own('300', 'EUR'), own('200', 'USD')]).positions;

describe('the currency donut', () => {
  it('draws each currency to scale: three quarters from the top round to the left, the last quarter back to the top', () => {
    chart(QUARTERS());
    assert.equal(one('svg.mcnw-chart').getAttribute('viewBox'), '-10 -10 260 260');
    assert.deepEqual(slices().map((p) => p.getAttribute('d')), [
      'M 120.00 16.00 A 104 104 0 1 1 16.00 120.00 L 56.00 120.00 A 64 64 0 1 0 120.00 56.00 Z',
      'M 16.00 120.00 A 104 104 0 0 1 120.00 16.00 L 120.00 56.00 A 64 64 0 0 0 56.00 120.00 Z',
    ]);
    assert.deepEqual(slices().map((p) => p.getAttribute('fill')), ['var(--chart-1)', 'var(--chart-2)']);
    assert.deepEqual(slices().map((p) => p.getAttribute('transform')), [null, null]);
    assert.deepEqual(slices().map((p) => p.getAttribute('class')), ['mcnw-slice', 'mcnw-slice']);
  });

  it('marks each slice wide enough with its series marker, halfway across the ring at the slice’s middle', () => {
    chart(QUARTERS());
    assert.equal(marks().length, 2);
    // The euro slice's middle is 45 degrees below the right: 84 units out.
    const circle = marks()[0].querySelector('circle');
    assert.equal(circle?.getAttribute('cx'), String(Number((120 + 84 * Math.SQRT1_2).toFixed(2))));
    assert.equal(circle?.getAttribute('cy'), String(Number((120 + 84 * Math.SQRT1_2).toFixed(2))));
    assert.equal(circle?.getAttribute('r'), '7');
    assert.equal((circle as SVGElement | null)?.style.stroke, 'var(--chart-1-on)');
    // The dollar slice's middle is 45 degrees above the left; its marker is a square.
    const square = marks()[1].querySelector('rect');
    assert.equal(square?.getAttribute('x'), String(Number((120 - 84 * Math.SQRT1_2 - 7 * 0.88).toFixed(2))));
    assert.equal(marks().map((m) => m.getAttribute('opacity')).join(), ',');
  });

  it('a share of exactly a half is not drawn the long way round, and the legend repeats each slice’s colour and marker', () => {
    // 100 euros and 200 dollars (100 euros).
    chart(worked([own('100', 'EUR'), own('200', 'USD')]).positions);
    assert.deepEqual(slices().map((p) => p.getAttribute('d')), [
      'M 120.00 16.00 A 104 104 0 0 1 120.00 224.00 L 120.00 184.00 A 64 64 0 0 0 120.00 56.00 Z',
      'M 120.00 224.00 A 104 104 0 0 1 120.00 16.00 L 120.00 56.00 A 64 64 0 0 0 120.00 184.00 Z',
    ]);
    assert.equal(legendButtons()[1].querySelector('rect')?.getAttribute('x') != null, true);
    assert.equal((legendButtons()[1].querySelector('rect') as SVGElement | null)?.style.fill, 'var(--chart-2)');
  });

  it('one currency is a whole ring, and so is one at 99.99% beside a sliver', () => {
    const ring = 'M 16 120 A 104 104 0 1 1 224 120 A 104 104 0 1 1 16 120 M 56 120 A 64 64 0 1 0 184 120 A 64 64 0 1 0 56 120 Z';
    const { unmount } = chart(worked([own('5000', 'EUR')]).positions);
    assert.deepEqual(slices().map((p) => p.getAttribute('d')), [ring]);
    unmount();
    // 9,999 euros and 2 dollars (1 euro): the euro share is 0.9999 of 10,000.
    chart(worked([own('9999', 'EUR'), own('2', 'USD')]).positions);
    assert.equal(slices()[0].getAttribute('d'), ring);
    assert.notEqual(slices()[1].getAttribute('d'), ring);
  });

  it('a slice of exactly 5% carries its marker; a thinner one does not', () => {
    // 95 euros and 10 dollars (5 euros): 5 of 100.
    const { unmount } = chart(worked([own('95', 'EUR'), own('10', 'USD')]).positions);
    assert.equal(marks().length, 2);
    unmount();
    // 96 euros and 8 dollars (4 euros): 4 of 100.
    chart(worked([own('96', 'EUR'), own('8', 'USD')]).positions);
    assert.equal(marks().length, 1);
  });

  it('a debt is drawn by its size, beside what is held, and its amount keeps its sign', () => {
    // 1,500 euros, 400 dollars (200 euros) and a debt of 50,000 yen (250
    // euros): 1,500, 250 and 200 of 1,950.
    chart(worked([own('1500', 'EUR'), own('400', 'USD'), owe('50000', 'JPY')]).positions);
    assert.deepEqual(text('.mcnw-legendCode'), ['EUR', 'JPY', 'USD']);
    assert.deepEqual(text('.mcnw-legendPct'), ['76.9%', '12.8%', '10.3%']);
    // The legend writes the debt with a hyphen-minus (the cards use the minus sign).
    assert.deepEqual(text('.mcnw-legendAmount'), ['€1,500', '-€250', '€200']);
    assert.equal(one('svg.mcnw-chart').getAttribute('aria-label'),
      'Currency concentration donut chart. Euro (EUR): 76.9%. Japanese Yen (JPY): 12.8%. US Dollar (USD): 10.3%');
    assert.deepEqual(all('.mcnw-srOnly tbody tr').map((tr) => [...tr.children].map((td) => td.textContent)), [
      ['Euro (EUR)', '76.9%', 'Your spending currency'],
      ['Japanese Yen (JPY)', '12.8%', 'Net debt in this currency'],
      ['US Dollar (USD)', '10.3%', 'Low exposure'],
    ]);
    assert.equal(one('.mcnw-srOnly caption').textContent, 'Currency concentration by net position');
    assert.deepEqual(text('.mcnw-srOnly th'), ['Currency', 'Concentration', 'Share band']);
    assert.equal(one('.mcnw-chartTitle').textContent, 'Currency concentration');
    assert.equal(one('svg.mcnw-chart title').textContent, 'Currency concentration');
    assert.equal(one('svg.mcnw-chart').getAttribute('aria-describedby'), one('.mcnw-legend').id);
    assert.equal(one('.mcnw-legend').getAttribute('aria-label'), 'Currencies');
  });

  it('the hole counts the currencies, in the language’s plural', () => {
    const { unmount } = chart(QUARTERS());
    assert.deepEqual(centre(), ['2', 'currencies']);
    unmount();
    const cases: Array<[string[], string]> = [[['EUR'], 'měna'], [['EUR', 'USD', 'JPY'], 'měny'], [['EUR', 'USD', 'JPY', 'CZK', 'INR'], 'měn']];
    for (const [codes, word] of cases) {
      const view = chart(worked(codes.map((c) => own('100', c)), 'EUR', { EUR: 1, USD: 2, JPY: 200, CZK: 25, INR: 100 }).positions, czech, 'cs');
      assert.deepEqual(centre(), [String(codes.length), word]);
      view.unmount();
    }
  });

  it('from a link without amounts, sizes the slices by their shares and shows no amount', () => {
    chart(withoutAmounts(QUARTERS()));
    assert.equal(slices()[0].getAttribute('d'), 'M 120.00 16.00 A 104 104 0 1 1 16.00 120.00 L 56.00 120.00 A 64 64 0 1 0 120.00 56.00 Z');
    assert.deepEqual(text('.mcnw-legendPct'), ['75.0%', '25.0%']);
    assert.equal(all('.mcnw-legendAmount').length, 0);
    fireEvent.click(legendEntry('USD'));
    assert.equal(said(), 'US Dollar (USD): 25.0% of your net worth.');
    assert.deepEqual(centre(), ['USD', '25.0%']);
    assert.ok(!(document.body.textContent ?? '').includes('€'));
  });

  it('highlights a currency from its legend entry: the slice moves out, the others dim, and the share is said', () => {
    chart(QUARTERS());
    fireEvent.click(legendEntry('EUR'));
    const dx = (7 * Math.SQRT1_2).toFixed(2);
    assert.equal(sliceOf('EUR').getAttribute('transform'), `translate(${dx} ${dx})`);
    assert.equal(markOf('EUR').getAttribute('transform'), `translate(${dx} ${dx})`);
    assert.equal(sliceOf('USD').getAttribute('transform'), null);
    assert.equal(markOf('USD').getAttribute('transform'), null);
    assert.equal(sliceOf('EUR').getAttribute('class'), 'mcnw-slice');
    assert.equal(sliceOf('USD').getAttribute('class'), 'mcnw-slice mcnw-slice--dim');
    assert.equal(markOf('EUR').getAttribute('opacity'), null);
    assert.equal(markOf('USD').getAttribute('opacity'), '0.35');
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'true');
    assert.equal(legendEntry('EUR').className, 'mcnw-legendItem mcnw-legendItem--on');
    assert.equal(legendEntry('USD').getAttribute('aria-pressed'), 'false');
    assert.equal(legendEntry('USD').className, 'mcnw-legendItem');
    assert.equal(said(), 'Euro (EUR): 75.0% of your net worth, €300.');
    assert.deepEqual(centre(), ['EUR', '75.0%', '€300']);
    // Pressed again, it stays highlighted.
    fireEvent.click(legendEntry('EUR'));
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'true');
    fireEvent.click(legendEntry('USD'));
    assert.equal(sliceOf('USD').getAttribute('transform'), `translate(-${dx} -${dx})`);
    assert.equal(said(), 'US Dollar (USD): 25.0% of your net worth, €100.');
  });

  it('keyboard focus on a legend entry highlights it, and leaving it clears the highlight', () => {
    chart(QUARTERS());
    assert.equal(said(), '');
    fireEvent.focus(legendEntry('USD'));
    assert.equal(legendEntry('USD').getAttribute('aria-pressed'), 'true');
    fireEvent.blur(legendEntry('USD'));
    assert.equal(legendEntry('USD').getAttribute('aria-pressed'), 'false');
    assert.equal(said(), '');
    assert.deepEqual(centre(), ['2', 'currencies']);
  });

  it('the mouse over a legend entry or a slice highlights it; leaving the chart with the mouse clears it, a touch does not', () => {
    chart(QUARTERS());
    fireEvent.mouseEnter(legendEntry('USD'));
    assert.equal(legendEntry('USD').getAttribute('aria-pressed'), 'true');
    fireEvent.pointerOver(sliceOf('EUR'), { pointerType: 'mouse' });
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'true');
    fireEvent.pointerOver(sliceOf('USD'), { pointerType: 'touch' });
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'true');
    fireEvent.pointerOut(one('.mcnw-chartWrap'), { pointerType: 'touch', relatedTarget: document.body });
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'true');
    fireEvent.pointerOut(one('.mcnw-chartWrap'), { pointerType: 'mouse', relatedTarget: document.body });
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'false');
  });

  it('a tap on a slice highlights it, and a second tap clears it', () => {
    chart(QUARTERS());
    fireEvent.click(sliceOf('USD'));
    assert.equal(legendEntry('USD').getAttribute('aria-pressed'), 'true');
    fireEvent.click(sliceOf('EUR'));
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'true');
    fireEvent.click(sliceOf('EUR'));
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'false');
    assert.equal(said(), '');
  });

  it('Escape clears the highlight wherever focus is; other keys do not', () => {
    chart(QUARTERS());
    fireEvent.click(sliceOf('USD'));
    fireEvent.keyDown(window, { key: 'Enter' });
    assert.equal(legendEntry('USD').getAttribute('aria-pressed'), 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    assert.equal(legendEntry('USD').getAttribute('aria-pressed'), 'false');
    // Highlighted again after that, Escape still clears it.
    fireEvent.click(sliceOf('EUR'));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    assert.equal(legendEntry('EUR').getAttribute('aria-pressed'), 'false');
  });

  it('stops listening for Escape when it goes', () => {
    const { unmount } = chart(QUARTERS());
    fireEvent.click(sliceOf('USD'));
    unmount();
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => { errors.push(e.message); };
    window.addEventListener('error', onError);
    fireEvent.keyDown(window, { key: 'Escape' });
    window.removeEventListener('error', onError);
    assert.deepEqual(errors, []);
  });

  it('leaves out a currency with no exchange rate and names it underneath', () => {
    // No rate for yen or koruna: 300 euros and 200 dollars remain.
    chart(worked([own('300', 'EUR'), own('200', 'USD'), own('1000', 'JPY'), own('50', 'CZK')], 'EUR', { EUR: 1, USD: 2 }).positions);
    assert.deepEqual(text('.mcnw-legendCode'), ['EUR', 'USD']);
    assert.deepEqual(text('.mcnw-legendPct'), ['75.0%', '25.0%']);
    assert.equal(one('.mcnw-chartNote').textContent, 'Not in the chart: JPY, CZK, because there is no exchange rate to EUR right now.');
    assert.deepEqual(centre(), ['2', 'currencies']);
  });

  it('names nothing underneath when every rate is there', () => {
    chart(QUARTERS());
    assert.ok(document.querySelector('.mcnw-chartNote') === null);
  });

  it('with no rates at all, says the currencies cannot be compared', () => {
    chart(worked([own('300', 'EUR'), own('200', 'USD')], 'EUR', null).positions.filter((p) => p.rateUnavailable));
    assert.equal(one('.mcnw-chartEmpty').textContent, 'Exchange rates are unavailable right now, so the currencies cannot be compared in a chart.');
    assert.equal(one('.mcnw-chartTitle').textContent, 'Currency concentration');
    assert.ok(document.querySelector('svg.mcnw-chart') === null);
  });

  it('with nothing to draw, asks for values', () => {
    const { unmount } = chart([]);
    assert.equal(one('.mcnw-chartEmpty').textContent, 'Enter values above to see a concentration chart.');
    unmount();
    // Owed as much as held in euros, and dollars with no rate: nothing to draw, yet a rate is not what is missing.
    chart(worked([own('100', 'EUR'), owe('100', 'EUR'), own('5', 'USD')], 'EUR', { EUR: 1 }).positions);
    assert.equal(one('.mcnw-chartEmpty').textContent, 'Enter values above to see a concentration chart.');
  });

  it('shows the amounts when any currency has one, even beside one that comes to nothing', () => {
    // 100 euros held and 100 owed come to nothing; 200 dollars are 100 euros.
    chart(worked([own('100', 'EUR'), owe('100', 'EUR'), own('200', 'USD')]).positions);
    assert.deepEqual(text('.mcnw-legendCode'), ['EUR', 'USD']);
    assert.deepEqual(text('.mcnw-legendAmount'), ['€0', '€100']);
  });

  it('the hole’s words: the main figure at 1 rem, the others at 0.875 rem, measured against the drawing as shown', () => {
    // The drawing shown at its own width (260 units) at 16 px text: 1 rem is 16 units.
    atTextSize(16, 260);
    chart(QUARTERS());
    const lines = () => all('svg.mcnw-chart > text').map((t) => [t.getAttribute('class'), (t as SVGElement).style.fontSize, t.textContent]);
    assert.deepEqual(lines(), [['mcnw-chartCenterLabel', '16px', '2'], ['mcnw-chartCenterSub', '14px', 'currencies']]);
    fireEvent.click(legendEntry('EUR'));
    assert.deepEqual(lines(), [['mcnw-chartCenterCode', '14px', 'EUR'], ['mcnw-chartCenterLabel', '16px', '75.0%'], ['mcnw-chartCenterSub', '14px', '€300']]);
  });

  it('an amount too wide for the hole (60 units across from the centre) is left out of it', () => {
    // With three lines, the amount's box reaches 25 units below the centre,
    // where a circle of 60 leaves 54.5 units either side: 109 across.
    atTextSize(16, 260);
    textDrawnAs((words, size) => (words === '€300' ? 115 : words.length * size * 0.6));
    chart(QUARTERS());
    fireEvent.click(legendEntry('EUR'));
    assert.deepEqual(centre(), ['EUR', '75.0%']);
    // The legend still says it.
    assert.deepEqual(text('.mcnw-legendAmount'), ['€300', '€100']);
  });

  it('draws without a warning from React, highlighted or not', () => {
    // React warns on the error console; caught here to show there is nothing to catch.
    // lint-allow no-console: React's warnings are what this test reads
    const real = console.error;
    const warnings: string[] = [];
    // lint-allow no-console: React's warnings are what this test reads
    console.error = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };
    try {
      chart(QUARTERS());
      fireEvent.click(legendEntry('EUR'));
      fireEvent.click(legendEntry('USD'));
    } finally {
      // lint-allow no-console: React's warnings are what this test reads
      console.error = real;
    }
    assert.deepEqual(warnings, []);
  });

  it('gives a twelfth currency the first colour again', () => {
    const codes = CURRENCIES.map((c) => c.code).filter((c) => c !== 'EUR').slice(0, 11);
    const rates = Object.fromEntries([['EUR', 1], ...codes.map((c) => [c, 1])]);
    // 120 euros, then 11 other currencies at 1 each, largest first: 11, 10, ... 1.
    chart(worked([own('120', 'EUR'), ...codes.map((c, i) => own(String(11 - i), c))], 'EUR', rates).positions);
    const fills = slices().map((p) => p.getAttribute('fill'));
    assert.equal(fills.length, 12);
    assert.deepEqual(fills.slice(0, 11), Array.from({ length: 11 }, (_, i) => `var(--chart-${i + 1})`));
    assert.equal(fills[11], 'var(--chart-1)');
  });
});
