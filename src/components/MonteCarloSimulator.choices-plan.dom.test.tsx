/**
 * The Monte Carlo simulator's choices (#790): withdrawals switched on and
 * off, a currency, and reset.
 */
import { island, w, settle, events, mountWith, openPlan, text, one, money, describedBy, reader, typeInto } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { screen } from '@testing-library/react';
import { DEFAULTS } from '../utils/monte-carlo/url.ts';
import { roundedResult, simulate } from '../utils/monte-carlo/math.ts';

describe('the choices: withdrawals, a currency and reset', () => {
  it('withdrawals: switched on and off, counted, even when analytics fail, and their boxes', async () => {
    const { unmount } = mountWith();
    {
      // withdrawals switch on with their boxes, and are counted
      assert.ok(screen.getByText(island.withdraw.off));
      assert.equal(screen.queryByLabelText(island.withdraw.amountLabel), null);
      const user = reader();
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.deepEqual(events.at(-1), ['free_monte_carlo_withdrawal_toggled', { on: true }]);
      assert.equal(screen.queryByText(island.withdraw.off), null);
      assert.equal((screen.getByLabelText(island.withdraw.amountLabel) as HTMLInputElement).value, '30000');
      assert.equal((screen.getByLabelText(island.withdraw.yearsLabel) as HTMLInputElement).value, '30');
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.deepEqual(events.at(-1), ['free_monte_carlo_withdrawal_toggled', { on: false }]);
    }
    const user = reader();
    {
      // analytics that fail never stop the page
      w.posthog = { capture: () => { throw new Error('blocked'); } };
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.ok(screen.getByLabelText(island.withdraw.amountLabel));
      delete w.posthog;
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.equal(screen.queryByLabelText(island.withdraw.amountLabel), null);
      w.posthog = {};
      await user.click(screen.getByRole('checkbox', { name: island.withdraw.toggle }));
      assert.ok(screen.getByLabelText(island.withdraw.amountLabel));
    }
    {
      // the withdrawal boxes say their own ranges
      let box = await typeInto(island.withdraw.amountLabel, '0');
      assert.deepEqual(describedBy(box), ['Error: Enter an amount from 1 to 100,000,000,000.', island.withdraw.amountHint]);
      box = await typeInto(island.withdraw.yearsLabel, '0');
      assert.deepEqual(describedBy(box), ['Error: Enter a whole number of years from 1 to 60.', island.withdraw.yearsHint]);
    }
    {
      // Escape stops hiding them once the simulator is gone
      unmount();
      await user.keyboard('{Escape}');
    }
  });

  it('a currency is counted and redraws the results; reset brings back the starting plan', async () => {
    openPlan({ start: 20_000, feePct: 1, currency: 'INR', paths: 100, saveYears: 5 }, { defaultCurrency: 'GBP' });
    await settle(20);
    const user = reader();
    await user.selectOptions(screen.getByLabelText(island.fields.currency), 'USD');
    await settle();
    assert.deepEqual(events.at(-1), ['free_monte_carlo_currency_changed', { currency: 'USD' }]);
    const worded = roundedResult(simulate({ ...DEFAULTS, start: 20_000, feePct: 1, paths: 100, saveYears: 5 }));
    assert.equal(text('.mcs-cardValue')[1], money(worded.atRetirement.p50, 'USD'));
    await user.click(screen.getByRole('button', { name: island.actions.reset }));
    assert.deepEqual(events.at(-1), ['free_monte_carlo_reset', undefined]);
    assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '50000');
    assert.equal((screen.getByLabelText(island.fields.currency) as HTMLSelectElement).value, 'GBP');
    assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'false');
    assert.equal(one('.ifc-example').textContent, island.example);
    assert.ok(text('.mcs-cardValue')[1].startsWith('£'));
  });
});
