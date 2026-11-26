/**
 * The Monte Carlo simulator's results in words, for a plan of saving (#790):
 * the quick answer, the cards, the single line, the table, the printed
 * report and the caveat.
 */
import { t, island, settle, events, openPlan, heading, text, one, money, runDone, retype } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { roundedResult, simulate } from '../utils/monte-carlo/math.ts';

/** A cell's own text, without the column name it shows where the table is drawn as records. */
const cellText = (c: Element) => { const x = c.cloneNode(true) as Element; x.querySelectorAll('.tool-recordLabel').forEach((l) => l.remove()); return x.textContent; };
/** The column name a cell shows where the table is drawn as records. */
const cellLabel = (c: Element) => c.querySelector('.tool-recordLabel')?.textContent ?? null;

describe('the results in words: saving', () => {
  it('saving and then withdrawing: the quick answer, the cards, both answers and the printed report', async () => {
    const { plan } = openPlan({ saveYears: 7, withdrawal: 30_000, withdrawYears: 20, paths: 1_000 });
    await settle(20);
    const r = roundedResult(simulate(plan)).atRetirement;
    assert.equal(one('.mcs-quickTitle').textContent, 'Median after 7 years');
    assert.equal(one('.mcs-quickValue').textContent, money(r.p50));
    assert.equal(one('.mcs-quick .mcs-quickRange').textContent, `8 in 10 paths between ${money(r.p10)} and ${money(r.p90)}`);
    assert.equal(one('.mcs-quick').getAttribute('aria-hidden'), 'true');
    assert.deepEqual(text('.mcs-cardLabel'), [island.results.lowLabel + island.results.lowMore, island.results.medianLabel + island.results.medianMore, island.results.highLabel + island.results.highMore]);
    assert.equal(text('.mcs-quick .mcs-quickRange').length, 2);
    assert.ok(document.querySelector('.mcs-lastedHead'));
    assert.ok(document.querySelector('.mcs-cards'));
    const report = one('.tool-report');
    assert.equal(report.querySelector('.tool-reportTitle')?.textContent, island.export.tool);
    assert.deepEqual([...report.querySelectorAll('.tool-reportBlock')[0].querySelectorAll('p')].map((p) => p.textContent), [
      `Median after 7 years: ${money(r.p50)}`,
      `8 in 10 paths between ${money(r.p10)} and ${money(r.p90)}`,
      one('.mcs-quick .mcs-quickRange:last-child').textContent,
    ]);
    assert.ok(report.textContent?.includes(`${t.export.about.currency}: EUR`));
  });

  it('saving only: the single line, the table, one year, and no years at all', async () => {
    const { plan } = openPlan({ saveYears: 10, paths: 1_000 });
    await settle(20);
    {
      // the single line and the share of paths below it
      const exact = simulate(plan);
      const worded = roundedResult(exact);
      const note = one('.mcs-note');
      assert.equal(note.querySelector('strong')?.textContent, money(worded.straightLine[10]));
      assert.equal(note.textContent, `${island.results.noteBefore} ${money(worded.straightLine[10])}. ${Math.round(exact.belowStraightLine * 100)}% of the simulated paths ended below it.`);
    }
    {
      // the table lists every fifth year and the last, each amount under its column
      await retype(island.fields.saveYears, '12');
      const worded = roundedResult(simulate({ ...plan, saveYears: 12 }));
      const rows = [...document.querySelectorAll('.mcs-table tbody tr')];
      assert.deepEqual(rows.map((r) => cellText(r.querySelector('th')!)), ['0', '5', '10', '12']);
      assert.deepEqual([...rows[1].querySelectorAll('td')].map(cellText), [worded.bands[5].p10, worded.bands[5].p50, worded.bands[5].p90, worded.straightLine[5]].map((v) => money(v)));
      assert.deepEqual([...rows[1].querySelectorAll('td')].map(cellLabel), [island.results.tableLow, island.results.tableMedian, island.results.tableHigh, island.results.tableStraight]);
      assert.deepEqual(text('.mcs-table thead th'), [island.results.tableYear, island.results.tableLow, island.results.tableMedian, island.results.tableHigh, island.results.tableStraight]);
      assert.equal(one('.mcs-table caption').textContent, island.results.tableCaption);
    }
    {
      // opening the table is counted, closing it is not
      const details = one('.mcs-tableWrap') as HTMLDetailsElement;
      details.open = true;
      fireEvent(details, new window.Event('toggle'));
      assert.deepEqual(events.at(-1), ['free_monte_carlo_table_opened', undefined]);
      details.open = false;
      fireEvent(details, new window.Event('toggle'));
      assert.equal(events.filter(([e]) => e === 'free_monte_carlo_table_opened').length, 1);
    }
    {
      // one year of saving has words of its own
      await retype(island.fields.saveYears, '1');
      assert.equal(heading().textContent, island.results.headingOne);
      assert.equal(one('.mcs-quickTitle').textContent, island.quick.medianOne);
    }
    {
      // no saving and no withdrawals: nothing to spread, said once
      await retype(island.fields.saveYears, '0');
      assert.equal(heading().textContent, island.results.headingToday);
      assert.ok(document.querySelector('.mcs-quick') === null);
      assert.ok(document.querySelector('.mcs-cards') === null);
      assert.deepEqual(text('.mcs-note'), [island.results.empty]);
      assert.ok(document.querySelector('.mcs-figure') === null);
      assert.ok(document.querySelector('.mcs-tableWrap') === null);
      assert.ok(screen.getByText(island.results.empty, { selector: '.tool-reportBlock p' }));
    }
  });

  it('writes the share below the line, and a one-year report, in a page’s own style', async () => {
    const { plan } = openPlan({ saveYears: 10, paths: 1_000 }, { amountLocale: 'es' });
    await settle(20);
    const share = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 }).format(simulate(plan).belowStraightLine);
    assert.ok(one('.mcs-note').textContent?.endsWith(`. ${share} of the simulated paths ended below it.`));
    await retype(island.fields.saveYears, '1');
    assert.ok(one('.tool-reportLead').textContent?.startsWith(`${island.quick.medianOne}: `));
  });

  it('the caveat counts the paths in the page’s number style', async () => {
    openPlan({ saveYears: 3, paths: 100_000 }, { numberLocale: 'hi' });
    // A large run finishes a moment after the page opens (there is no worker here).
    await runDone();
    await waitFor(() => assert.ok(one('.mcs-caveat').textContent?.includes('1,00,000')), { timeout: 5_000 });
    assert.ok(one('.mcs-caveat').textContent?.includes('shares of 1,00,000 simulated paths'));
    assert.ok(one('.mcs-caveat').textContent?.includes('another 1,00,000 random runs'));
  });
});
