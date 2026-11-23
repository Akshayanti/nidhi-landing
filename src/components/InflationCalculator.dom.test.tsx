import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dict } from '../i18n/index.ts';
import { SHARED_STATE_GLOBAL, decodeState } from '../utils/inflation/url.ts';
import { boxErrors, formFromLink } from '../utils/inflation/form.ts';
import InflationCalculator from './InflationCalculator.tsx';

const t = dict('en').tools;
const LOCALE = 'en';
const shared = () => (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];

function mount() {
  return render(
    <InflationCalculator
      strings={t.inflation.island}
      exportStrings={t.export}
      defaultCurrency="EUR"
      defaultCountry=""
      countries={[]}
      initialHistory={null}
      historyUrl="/data/inflation/"
      numberLocale={LOCALE}
      amountLocale={null}
    />,
  );
}

/** Types `text` into the amount box, replacing what is there, and leaves the box. */
async function typeAmount(text: string) {
  const user = userEvent.setup();
  const box = screen.getByLabelText(t.inflation.island.fields.amount.buy);
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

describe('the inflation calculator, mounted', () => {
  it('renders its form', () => {
    mount();
    assert.ok(screen.getAllByRole('textbox').length > 0);
  });

  it('publishes a typed amount for the language switch', async () => {
    mount();
    await typeAmount('73191');
    const raw = shared();
    assert.equal(typeof raw, 'string');
    assert.notEqual(raw, '');
    assert.equal(decodeState(raw as string)?.amount, 73191);
  });

  it('publishes an unreadable amount as still in error', async () => {
    mount();
    await typeAmount('7x');
    const raw = shared();
    assert.equal(typeof raw, 'string');
    assert.notEqual(raw, '');
    const form = formFromLink(raw as string, LOCALE);
    assert.ok(form, 'the published state decodes');
    assert.equal(form.amount, '?');
    assert.equal(boxErrors(form, LOCALE).amount, true);
  });

  it('marks an unreadable amount invalid and withholds the answer', async () => {
    mount();
    const box = await typeAmount('7x');
    assert.equal(box.getAttribute('aria-invalid'), 'true');
    assert.ok(screen.getByText(t.inflation.island.results.fix, { selector: '.tool-resultReason' }));
  });
});
