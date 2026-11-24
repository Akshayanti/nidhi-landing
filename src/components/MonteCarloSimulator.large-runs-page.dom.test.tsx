/**
 * The Monte Carlo simulator's large runs without a worker (#790): run on
 * the page, saying so meanwhile, with a newer plan winning over an older one.
 */
import { t, island, settle, openPlan, results, heading, one, runDone, reader, typeInto, choosePaths } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';

describe('large runs, on the page', () => {
  it('without a worker run on the page, saying so; a held-back result says so too; a newer plan wins', async () => {
    openPlan({ saveYears: 1, paths: 100 });
    await settle(20);
    {
      // run on the page, saying they are running meanwhile, and the buttons wait for that
      await choosePaths('100000');
      assert.equal(one('.mcs-actions [role="status"]').textContent, 'Running 100,000 paths…');
      assert.equal(results().getAttribute('aria-busy'), 'true');
      assert.ok(results().classList.contains('mcs-results--busy'));
      assert.ok(one('.mcs-quick').classList.contains('mcs-quick--busy'));
      assert.ok(screen.getByText(t.export.notReady), 'running is said');
      await runDone();
      assert.equal(one('.mcs-actions [role="status"]').textContent, '');
      assert.equal(results().getAttribute('aria-busy'), 'false');
      assert.ok(screen.queryByText(t.export.notReady) === null);
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 100,000 simulated paths'));
    }
    {
      // a result held back for a wrong box says the long run is running once it is corrected
      const user = reader();
      const box = screen.getByLabelText(island.fields.saveYears);
      await user.clear(box);
      await user.type(box, '2');
      await settle();
      assert.equal(heading().textContent, t.export.report.answer);
      assert.equal(one('.mcs-results .tool-resultReason').textContent, 'Running 100,000 paths…');
      await runDone();
      assert.equal(heading().textContent, 'After 2 years of saving');
    }
    {
      // a newer plan wins over a slower older one
      await typeInto(island.fields.saveYears, '3');
      await settle();
      fireEvent.click(screen.getByRole('button', { name: island.actions.reset }));
      await settle(400);
      await runDone();
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 10,000 simulated paths'));
      assert.equal(results().getAttribute('aria-busy'), 'false');
    }
    {
      // a newer plan that comes while the older one waits to start wins too
      await typeInto(island.fields.saveYears, '3');
      await choosePaths('100000');
      await runDone();
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 100,000 simulated paths'));
      const reset = screen.getByRole('button', { name: island.actions.reset });
      // Reset the moment the large run says it is running: before it starts on the page.
      const observer = new MutationObserver(() => {
        if (results().getAttribute('aria-busy') !== 'true') return;
        observer.disconnect();
        fireEvent.click(reset);
      });
      observer.observe(results(), { attributes: true, attributeFilter: ['aria-busy'] });
      await typeInto(island.fields.saveYears, '4');
      await settle(400);
      observer.disconnect();
      await runDone();
      assert.equal(heading().textContent, 'After 30 years of saving');
      assert.ok(one('.mcs-caveat').textContent?.includes('shares of 10,000 simulated paths'));
    }
  });
});
