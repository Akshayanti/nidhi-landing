/**
 * The Monte Carlo simulator's form on the page (#790): what the page keeps
 * of a plan on its way in, what the boxes and choices say, when a typed plan
 * is run, and the copied link's "Copied" that comes and goes.
 */
import { t, island, w, shared, STARTING_RESULT, settle, events, mountWith, openPlan, heading, text, one, radio, describedBy } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { dict } from '../i18n/index.ts';
import { DEFAULTS, SHARED_STATE_GLOBAL, decodeState, encodeState } from '../utils/monte-carlo/url.ts';
import MonteCarloSimulator from './MonteCarloSimulator.tsx';

const copyButton = () => screen.getByRole('button', { name: island.actions.copy });
/** What the copy button says to a reader: its other label is kept only for its width. */
const copyLabel = () => one('[data-attr="free-monte-carlo-share"] .tool-swapLabel > span:first-child').textContent;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('the form on the page', () => {
  it('names currencies and choices, says each box’s range, runs a plan once typing stops, and lets go of the window', async () => {
    // A catalog with its own names for the currencies, and none for one of them.
    const hindi = dict('hi').tools.monteCarlo.island.currencies;
    const { INR: _none, ...named } = hindi;
    const strings = { ...island, currencies: named as typeof island.currencies };
    const keys = { added: [] as unknown[], removed: [] as unknown[] };
    const real = { add: window.addEventListener, remove: window.removeEventListener };
    window.addEventListener = ((type: string, f: unknown, ...rest: unknown[]) => {
      if (type === 'keydown') keys.added.push(f);
      return (real.add as (...args: unknown[]) => void).call(window, type, f, ...rest);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, f: unknown, ...rest: unknown[]) => {
      if (type === 'keydown') keys.removed.push(f);
      return (real.remove as (...args: unknown[]) => void).call(window, type, f, ...rest);
    }) as typeof window.removeEventListener;
    try {
      w[SHARED_STATE_GLOBAL] = encodeState({ ...DEFAULTS, paths: 100 });
      const { unmount } = render(
        <MonteCarloSimulator strings={strings} exportStrings={t.export} netWorthHref="/free/multi-currency-net-worth/" defaultCurrency="EUR" amountLocale={null} numberLocale="en" initialResult={STARTING_RESULT} />,
      );
      await settle(20);
      {
        // a currency is named as the page's catalog names it, or by its own label where the catalog has none
        const options = Object.fromEntries([...screen.getByLabelText(island.fields.currency).querySelectorAll('option')].map((o) => [o.value, o.textContent]));
        assert.equal(options.EUR, hindi.EUR);
        assert.notEqual(options.EUR, 'Euro (EUR)');
        assert.equal(options.INR, 'Indian Rupee (INR)');
      }
      {
        // only the chosen return setting is marked
        assert.deepEqual(screen.getAllByRole('radio').map((r) => r.closest('label')?.className), ['mcs-switchOpt', 'mcs-switchOpt mcs-switchOpt--on', 'mcs-switchOpt']);
        assert.equal(radio('historical').checked, true);
      }
      {
        // a plan that is no longer the starting one is not called an example
        assert.equal(one('.ifc-example').textContent, '');
      }
      {
        // a browser without a clipboard: copying does nothing, and does not break the page
        assert.equal(navigator.clipboard, undefined);
        fireEvent.click(copyButton());
        assert.deepEqual(events.at(-1), ['free_monte_carlo_share_copied', undefined]);
        assert.equal(copyLabel(), island.actions.copy);
      }
      {
        // what is typed in the monthly box is the plan's monthly amount
        type(island.fields.monthly, '250');
        assert.equal((screen.getByLabelText(island.fields.monthly) as HTMLInputElement).value, '250');
        assert.equal(decodeState(shared() as string)?.monthly, 250);
        await settle();
      }
      {
        // a plan is run once typing has stopped: a keystroke starts the wait again
        type(island.fields.saveYears, '5');
        await settle(100);
        type(island.fields.saveYears, '7');
        await settle(200);
        assert.equal(heading().textContent, 'After 30 years of saving', 'the half-typed plan is not run');
        await settle(60);
        assert.equal(heading().textContent, 'After 7 years of saving');
      }
      {
        // the monthly and the years boxes say their own ranges
        type(island.fields.monthly, '-1');
        assert.deepEqual(describedBy(screen.getByLabelText(island.fields.monthly)), ['Error: Enter an amount from 0 to 10,000,000,000.']);
        type(island.fields.saveYears, '61');
        assert.deepEqual(describedBy(screen.getByLabelText(island.fields.saveYears)), ['Error: Enter a whole number of years from 0 to 60.', island.fields.saveYearsHint]);
      }
      {
        // the page stops listening for Escape when it goes
        assert.equal(keys.added.length, 1);
        assert.deepEqual(keys.removed, []);
        unmount();
        assert.deepEqual(keys.removed, keys.added);
      }
    } finally {
      window.addEventListener = real.add;
      window.removeEventListener = real.remove;
    }
  });

  it('a plan on its way in is never replaced by the starting one, and only a plan the page head left is read', async () => {
    {
      // nothing is kept for the language switch until the shared plan has been read
      const coming = encodeState({ ...DEFAULTS, start: 20_000, paths: 100 });
      const kept: unknown[] = [];
      let value: unknown = coming;
      Object.defineProperty(w, SHARED_STATE_GLOBAL, { configurable: true, get: () => value, set: (v) => { kept.push(v); value = v; } });
      const { unmount } = mountWith();
      await settle(20);
      assert.ok(kept.length > 0);
      assert.deepEqual([...new Set(kept)], [coming]);
      unmount();
      delete w[SHARED_STATE_GLOBAL];
      events.length = 0;
    }
    {
      // something else under the page's name is not a plan
      w[SHARED_STATE_GLOBAL] = { s: '20000', n: '100' };
      mountWith();
      await settle(20);
      assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '50000');
      assert.equal(one('.ifc-example').textContent, island.example);
      assert.deepEqual(events, []);
    }
  });

  it('the copy button says "Copied" once the link is on the clipboard, for two and a half seconds', async () => {
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (s: string) => { written.push(s); return Promise.resolve(); } } });
    try {
      openPlan({ start: 20_000, paths: 100 });
      await settle(20);
      assert.equal(copyLabel(), island.actions.copy);
      fireEvent.click(copyButton());
      assert.equal(written.length, 1);
      await settle(0);
      assert.equal(copyLabel(), island.actions.copied);
      await settle(2499);
      assert.equal(copyLabel(), island.actions.copied);
      await settle(1);
      assert.equal(copyLabel(), island.actions.copy);
      assert.deepEqual(text('[data-attr="free-monte-carlo-share"] .tool-swapLabel__ghost'), [island.actions.copied]);
    } finally {
      delete (navigator as unknown as Record<string, unknown>).clipboard;
    }
  });
});
