/**
 * The Monte Carlo simulator while a large run is under way, on the page
 * (#790): what the form and the results say meanwhile, in the page's own
 * number style, and which of a wrong box and a running plan is the reason
 * for a result held back.
 */
import { t, island, settle, openPlan, heading, one, results, runDone, typeInto, choosePaths } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { screen } from '@testing-library/react';

/** Nothing on the page matches: a count, so a failure says so at once. */
const none = (selector: string, why?: string) => assert.equal(document.querySelectorAll(selector).length, 0, why ?? `there is a ${selector}`);

const status = () => one('.mcs-actions [role="status"]');
const share = () => screen.getByRole('button', { name: island.actions.copy });

describe('the form and the results while a large run is under way', () => {
  it('says how many paths are running, holds the link and the files back, and names the right reason', async () => {
    openPlan({ saveYears: 1, paths: 100 }, { numberLocale: 'de' });
    await settle(20);
    {
      // running: said under the form, the results marked, the buttons waiting and saying why
      await choosePaths('100000');
      assert.equal(status().textContent, 'Running 100.000 paths…');
      assert.equal(results().className, 'mcs-results mcs-results--busy');
      assert.equal(results().getAttribute('aria-busy'), 'true');
      assert.equal(one('.mcs-quick').className, 'mcs-quick mcs-quick--busy');
      assert.equal(share().getAttribute('aria-disabled'), 'true');
      assert.ok(screen.getByText(t.export.notReady), 'a long run is said, unlike a moment’s settling');
      assert.equal(heading().textContent, 'After 1 year of saving', 'the last result stays meanwhile');
      none('.mcs-results .tool-resultReason');
    }
    {
      // a box made wrong meanwhile: the reason is the box, and the form no longer says it is running
      await typeInto(island.fields.saveYears, '61');
      assert.equal(status().textContent, '');
      assert.equal(one('.mcs-results .tool-resultReason').textContent, island.actions.fix);
      await runDone();
      assert.equal(one('.mcs-results .tool-resultReason').textContent, island.actions.fix);
      assert.equal(results().className, 'mcs-results');
    }
    {
      // corrected: the reason is now the run, until its result is on screen
      await typeInto(island.fields.saveYears, '2');
      await settle();
      assert.equal(heading().textContent, t.export.report.answer);
      assert.equal(one('.mcs-results .tool-resultReason').textContent, 'Running 100.000 paths…');
      assert.equal(status().textContent, 'Running 100.000 paths…');
      none('.tool-report');
      await runDone();
      assert.equal(heading().textContent, 'After 2 years of saving');
      assert.equal(status().textContent, '');
      assert.equal(share().getAttribute('aria-disabled'), null);
      assert.ok(!screen.queryByText(t.export.notReady));
      assert.ok(document.querySelector('.tool-report'));
    }
  });
});
