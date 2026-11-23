import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dict } from '../i18n/index.ts';
import { SHARED_STATE_GLOBAL, decodeState } from '../utils/monte-carlo/url.ts';
import { formErrors, formFromLink } from '../utils/monte-carlo/form.ts';
import MonteCarloSimulator from './MonteCarloSimulator.tsx';

const t = dict('en').tools;
const island = t.monteCarlo.island;
const shared = () => (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];

// As the English page renders it (src/components/pages/MonteCarloPage.astro).
function mount() {
  return render(
    <MonteCarloSimulator
      strings={island}
      exportStrings={t.export}
      netWorthHref="/free/multi-currency-net-worth/"
      defaultCurrency="EUR"
      amountLocale={null}
      numberLocale="en"
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
  it('publishes a typed starting amount for the language switch', async () => {
    mount();
    await typeStart('73191');
    const raw = shared();
    assert.equal(typeof raw, 'string');
    assert.notEqual(raw, '');
    assert.equal(decodeState(raw as string)?.start, 73191);
  });

  it('publishes an unreadable starting amount as still in error', async () => {
    mount();
    await typeStart('7x');
    const raw = shared();
    assert.equal(typeof raw, 'string');
    assert.notEqual(raw, '');
    const form = formFromLink(raw as string);
    assert.ok(form, 'the published state decodes');
    assert.equal(form.start, 'NaN');
    assert.equal(formErrors(form).start, true);
  });

  it('marks an unreadable starting amount invalid and withholds the results', async () => {
    mount();
    const box = await typeStart('7x');
    assert.equal(box.getAttribute('aria-invalid'), 'true');
    assert.ok(screen.getByText(island.actions.fix, { selector: '.tool-resultReason' }));
  });
});
