import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dict } from '../i18n/index.ts';
import { DEFAULTS, SHARED_STATE_GLOBAL, decodeState, defaultState, encodeState, type ToolState } from '../utils/monte-carlo/url.ts';
import { roundedResult, simulate, type SimulationResult } from '../utils/monte-carlo/math.ts';
import { formatAmount } from '../utils/shared/formatAmount.ts';
import { formErrors, formFromLink } from '../utils/monte-carlo/form.ts';
import MonteCarloSimulator from './MonteCarloSimulator.tsx';

const t = dict('en').tools;
const island = t.monteCarlo.island;
const shared = () => (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];

/** The starting plan's result, as the page works it out for the island. */
const STARTING_RESULT = simulate(defaultState('EUR'));

// As the English page renders it (src/components/pages/MonteCarloPage.astro).
function mount(initialResult: SimulationResult = STARTING_RESULT) {
  return render(
    <MonteCarloSimulator
      strings={island}
      exportStrings={t.export}
      netWorthHref="/free/multi-currency-net-worth/"
      defaultCurrency="EUR"
      amountLocale={null}
      numberLocale="en"
      initialResult={initialResult}
    />,
  );
}

/** Types `text` into the "invested today" box, replacing what is there, and leaves the box. */
async function typeStart(text: string) {
  const user = userEvent.setup();
  const box = screen.getByLabelText(island.fields.start);
  await user.clear(box);
  await user.type(box, text);
  await user.tab();
  return box;
}

beforeEach(() => {
  delete (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
});
afterEach(() => {
  cleanup();
  delete (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];
});

describe('the Monte Carlo simulator, mounted', () => {
  it('publishes what is typed, readable or not, and marks what cannot be read', async () => {
    mount();
    {
      // publishes a typed starting amount for the language switch
      await typeStart('73191');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      assert.equal(decodeState(raw as string)?.start, 73191);
    }
    {
      // publishes an unreadable starting amount as still in error
      await typeStart('7x');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      const form = formFromLink(raw as string);
      assert.ok(form, 'the published state decodes');
      assert.equal(form.start, 'NaN');
      assert.equal(formErrors(form).start, true);
    }
    {
      // marks an unreadable starting amount invalid and withholds the results
      const box = screen.getByLabelText(island.fields.start);
      assert.equal(box.getAttribute('aria-invalid'), 'true');
      assert.ok(screen.getByText(island.actions.fix, { selector: '.tool-resultReason' }));
    }
  });
});

describe('the starting result', () => {
  // A result the starting plan would never give, so it shows which was drawn.
  const given = simulate({ ...defaultState('EUR'), start: 123_456 });
  const median = (r: SimulationResult) => formatAmount(roundedResult(r).atRetirement.p50, 'EUR', false, null);
  const quickValue = () => document.querySelector('.mcs-quickValue')?.textContent;
  /** Lets the typing settle and the result follow. */
  const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 320)));

  it('an ordinary load draws the one the page worked out, and does not work it out again', async () => {
    mount(given);
    await settle();
    assert.notEqual(median(given), median(STARTING_RESULT));
    assert.equal(quickValue(), median(given));
  });

  it('a shared plan replaces it with its own', async () => {
    const plan: ToolState = { ...DEFAULTS, saveYears: 5, paths: 100 };
    (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL] = encodeState(plan);
    mount(given);
    await settle();
    assert.equal(quickValue(), median(simulate(plan)));
  });

  it('a shared plan whose boxes read differently shows what the boxes say', async () => {
    (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL] = 's=0000000000000001&n=100';
    mount(given);
    await settle();
    assert.equal(quickValue(), median(simulate({ ...DEFAULTS, start: 1, paths: 100 })));
  });
});
