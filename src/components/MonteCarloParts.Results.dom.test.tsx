/**
 * The Monte Carlo simulator's results panel for a plan of saving (#790): the
 * heading that names the years, the three amounts compared, the single line
 * and the share of paths below it, the caveat, the table of numbers, and how
 * the panel looks while a run is under way or its result is withheld.
 */
import { draw, none, events, island, money, one, text, worked, type Style } from '../../test/monteCarloParts.results.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent } from '@testing-library/react';
import { amountLength } from '../utils/shared/amountUnits.ts';
import { Results } from './MonteCarloSimulator.tsx';

type Plan = ReturnType<typeof worked>;
const panel = (plan: Plan, change: Partial<{ busy: boolean; withheld: { title: string; reason: string } | null }> = {}, style: Style = {}) =>
  draw(
    <Results
      result={plan.worded}
      exact={plan.exact}
      state={plan.state}
      code={plan.state.currency}
      busy={change.busy ?? false}
      withheld={change.withheld ?? null}
      strings={island}
      actions={<button type="button" className="kept">Keep</button>}
    />,
    style,
  );
const cardSize = (card: Element) => (card.querySelector('.amt') as HTMLElement).style.getPropertyValue('--amt-len');

describe('the results of a plan of saving', () => {
  it('the heading names the years, and is where the phone’s jump lands', () => {
    panel(worked());
    const heading = one('#mcs-results-h');
    assert.equal(heading.textContent, 'After 30 years of saving');
    assert.equal(heading.tagName, 'H2');
    assert.equal(heading.className, 'mcs-resultsTitle');
    assert.equal(heading.getAttribute('tabindex'), '-1', 'focusable from the jump, not by Tab');
    const section = one('section');
    assert.equal(section.className, 'mcs-results');
    assert.equal(section.getAttribute('aria-labelledby'), 'mcs-results-h');
    assert.equal(section.getAttribute('aria-busy'), 'false');
  });

  it('one year of saving has a heading of its own', () => {
    panel(worked({ saveYears: 1 }));
    assert.equal(one('#mcs-results-h').textContent, island.results.headingOne);
  });

  it('the low, median and high amounts, each explained, drawn at one shared size', () => {
    panel(worked());
    assert.deepEqual(text('.mcs-cardValue'), ['€600,000', '€1,000,000', '€2,100,000']);
    assert.deepEqual(text('.mcs-cardLabel'), [
      'Low (10th percentile): 1 in 10 paths ended below',
      'Median: half the paths ended above, half below',
      'High (90th percentile): 1 in 10 paths ended above',
    ]);
    // A phone shows the short name and hides the rest.
    assert.deepEqual(text('.mcs-cardMore'), [island.results.lowMore, island.results.medianMore, island.results.highMore]);
    const cards = [...document.querySelectorAll('.mcs-cards > *')];
    assert.deepEqual(cards.map((c) => c.className), ['mcs-card', 'mcs-card mcs-card--mid', 'mcs-card']);
    // They are compared, so if one has to be drawn smaller they all are.
    assert.deepEqual(cards.map(cardSize), Array(3).fill(String(amountLength('€2,100,000'))));
    assert.ok(amountLength('€2,100,000') > amountLength('€600,000'));
    assert.equal(one('.mcs-cardsKey').textContent, island.results.cardsKey);
  });

  it('the amounts in the plan’s currency and the page’s own style', () => {
    const plan = worked({ currency: 'USD' });
    panel(plan, {}, { amountLocale: 'es' });
    assert.deepEqual(text('.mcs-cardValue'), [600_000, 1_000_000, 2_100_000].map((v) => money(v, 'USD', 'es')));
    assert.equal(one('.mcs-note strong').textContent, money(1_200_000, 'USD', 'es'));
    assert.match(one('.mcs-note').textContent ?? '', /\. 60\s%\sof the simulated paths ended below it\.$/);
  });

  it('where a single line at the average return would end, and the share of paths below it', () => {
    panel(worked());
    assert.deepEqual(text('.mcs-note'), ['A calculator that used the average return every year would draw a single line to €1,200,000. 60% of the simulated paths ended below it.']);
    assert.equal(one('.mcs-note strong').textContent, '€1,200,000');
    assert.deepEqual(text('.mcs-note .amt'), ['€1,200,000']);
  });

  it('draws the chart for a plan with years in it, between the amounts and the note', () => {
    panel(worked());
    const order = [...one('.tool-resultBody').children].map((el) => el.className.split(' ')[0]);
    assert.ok(document.querySelector('svg.mcs-chart'));
    assert.equal(order[0], 'mcs-cards');
    assert.equal(order[1], 'mcs-cardsKey');
    assert.deepEqual(order.slice(-3), ['mcs-note', 'mcs-caveat', 'mcs-tableWrap']);
    none('.mcs-lasted', 'nothing about withdrawals');
  });

  it('a plan with no saving and no withdrawals: only what to add, and the caveat', () => {
    panel(worked({ saveYears: 0 }));
    assert.equal(one('#mcs-results-h').textContent, island.results.headingToday);
    assert.deepEqual(text('.mcs-note'), [island.results.empty]);
    assert.deepEqual([...one('.tool-resultBody').children].map((el) => el.className), ['mcs-note', 'mcs-caveat']);
    none('svg.mcs-chart');
    none('.mcs-cards');
    none('.mcs-cardsKey');
    none('details');
  });

  it('the caveat counts the paths, and says so when they are few', () => {
    panel(worked({ saveYears: 1, paths: 1_000 }), {}, { numberLocale: 'de' });
    assert.equal(
      one('.mcs-caveat').textContent,
      'These are shares of 1.000 simulated paths, not the chance of anything happening to you. The model is a simplification; see what it leaves out below.'
        + ' With only 1.000 paths, the figures can be several percent away from what thousands of paths give.'
        + ' Amounts are rounded: another 1.000 random runs would give different last digits. The spreadsheet has every digit.',
    );
  });

  it('ten thousand paths are not few', () => {
    panel(worked({ saveYears: 1, paths: 10_000 }));
    assert.equal(
      one('.mcs-caveat').textContent,
      'These are shares of 10,000 simulated paths, not the chance of anything happening to you. The model is a simplification; see what it leaves out below.'
        + ' Amounts are rounded: another 10,000 random runs would give different last digits. The spreadsheet has every digit.',
    );
  });

  it('the table of numbers: every fifth year and the last, each amount under its column’s name', () => {
    const plan = worked({ saveYears: 12 });
    panel(plan);
    const details = one('details');
    assert.equal(details.className, 'mcs-tableWrap');
    assert.equal(one('summary').textContent, island.results.tableSummary);
    assert.equal(one('summary').className, 'mcs-tableSummary disclosure');
    assert.equal(one('.mcs-tableScroll > table').className, 'mcs-table tool-recordTable');
    assert.equal(one('caption').textContent, island.results.tableCaption);
    assert.equal(one('table').getAttribute('aria-describedby'), one('caption').id);
    assert.ok(one('caption').id);
    const columns = ['Year', 'Low (10th)', 'Median', 'High (90th)', 'Single line'];
    assert.deepEqual(text('thead th'), columns);
    const b = plan.worded.bands;
    assert.deepEqual(
      [...document.querySelectorAll('tbody tr')].map((row) => [...row.children].map((cell) => cell.textContent)),
      [0, 5, 10, 12].map((y) => [String(y), money(b[y].p10), money(b[y].p50), money(b[y].p90), money(plan.worded.straightLine[y])]),
    );
    assert.deepEqual(text('tbody tr:last-child td'), ['€190,000', '€300,000', '€480,000', '€310,000']);
    assert.deepEqual(text('tbody tr:first-child td'), ['€50,000', '€50,000', '€50,000', '€50,000']);
    // Where the columns do not fit, each year is a short list and every amount carries its column's name.
    for (const row of document.querySelectorAll('tbody tr')) {
      assert.deepEqual([...row.children].map((cell) => cell.getAttribute('data-label')), columns);
      assert.deepEqual([...row.querySelectorAll('.amt')].map((a) => a.textContent), [...row.querySelectorAll('td')].map((c) => c.textContent));
    }
  });

  it('the table stays a table for a screen reader when it is drawn as lists', () => {
    panel(worked({ saveYears: 5 }));
    assert.equal(one('table').getAttribute('role'), 'table');
    assert.deepEqual([...document.querySelectorAll('thead, tbody')].map((g) => g.getAttribute('role')), ['rowgroup', 'rowgroup']);
    assert.deepEqual([...document.querySelectorAll('tr')].map((r) => r.getAttribute('role')), ['row', 'row', 'row']);
    assert.deepEqual([...document.querySelectorAll('thead th')].map((h) => [h.getAttribute('role'), h.getAttribute('scope')]), Array(5).fill(['columnheader', 'col']));
    assert.deepEqual([...document.querySelectorAll('tbody th')].map((h) => [h.getAttribute('role'), h.getAttribute('scope')]), Array(2).fill(['rowheader', 'row']));
    assert.deepEqual([...document.querySelectorAll('td')].map((c) => c.getAttribute('role')), Array(8).fill('cell'));
  });

  it('opening the table is counted, closing it is not, and no amount is sent', () => {
    panel(worked({ saveYears: 5 }));
    const details = one('details') as HTMLDetailsElement;
    details.open = true;
    fireEvent(details, new window.Event('toggle'));
    assert.deepEqual(events, [['free_monte_carlo_table_opened', undefined]]);
    details.open = false;
    fireEvent(details, new window.Event('toggle'));
    assert.equal(events.length, 1);
  });

  it('is marked while a run is under way', () => {
    panel(worked({ saveYears: 5 }), { busy: true });
    assert.equal(one('section').className, 'mcs-results mcs-results--busy');
    assert.equal(one('section').getAttribute('aria-busy'), 'true');
  });

  it('shows its results as they are when nothing is withheld', () => {
    panel(worked({ saveYears: 5 }));
    assert.equal(one('.tool-resultBody').className, 'tool-resultBody');
    assert.equal(one('.tool-resultBody').hasAttribute('inert'), false);
    none('.tool-resultReason');
  });

  it('withheld: the heading names no years, the results are out of reach and the reason is shown', () => {
    panel(worked({ saveYears: 5 }), { withheld: { title: 'Your answer', reason: island.actions.fix } });
    assert.equal(one('#mcs-results-h').textContent, 'Your answer');
    assert.ok(one('.tool-resultBody').classList.contains('tool-withheld'));
    assert.equal(one('.tool-resultBody').hasAttribute('inert'), true);
    assert.equal(one('.tool-resultReason').textContent, island.actions.fix);
  });

  it('withheld with nothing left to fix: still out of reach, with no reason to show', () => {
    panel(worked({ saveYears: 0 }), { withheld: { title: 'Your answer', reason: '' } });
    assert.equal(one('#mcs-results-h').textContent, 'Your answer');
    assert.ok(one('.tool-resultBody').classList.contains('tool-withheld'));
    none('.tool-resultReason');
  });

  it('what the page gives it to keep the results with comes last, and is never withheld', () => {
    panel(worked({ saveYears: 5 }), { withheld: { title: 'Your answer', reason: island.actions.fix } });
    assert.ok(one('section').lastElementChild === one('.kept'));
    assert.ok(!one('.kept').closest('.tool-resultBody'));
  });
});
