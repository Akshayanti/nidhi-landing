import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loanComparisonEn } from '../i18n/strings/tools/loanComparison.ts';
import { exportEn } from '../i18n/strings/tools/export.ts';
import { UNREADABLE } from '../utils/shared/linkInput.ts';
import { SHARED_STATE_GLOBAL, decodeFromQueryString } from '../utils/loan/url.ts';
import LoanCompare from './LoanCompare.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn, export: exportEn },
};

const t = TOOL_STRINGS.en;
const island = t.loanComparison.island;
// The label also holds the required mark and the currency, so it is matched by its start.
const principalLabel = new RegExp(`^${island.card.principal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
const shared = () => (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];

// As the English page renders it (src/components/pages/LoanComparisonPage.astro).
function mount() {
  return render(
    <LoanCompare
      strings={island}
      exportStrings={t.export}
      defaultCurrency="EUR"
      numberLocale="en"
      amountLocale={null}
    />,
  );
}

/** Types `text` into the first offer's loan amount, replacing what is there, and leaves the box. */
async function typeFirstPrincipal(text: string) {
  const user = userEvent.setup();
  const box = screen.getAllByLabelText(principalLabel)[0];
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

describe('the loan comparison, mounted', () => {
  it('publishes what is typed, readable or not, and opens it where the switch lands', async () => {
    mount();
    {
      // publishes a typed loan amount for the language switch
      await typeFirstPrincipal('73191');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      assert.equal(decodeFromQueryString(raw as string).vendors[0].principal, '73191');
    }
    {
      // publishes an unreadable loan amount as still unreadable
      await typeFirstPrincipal('7x');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      assert.equal(decodeFromQueryString(raw as string).vendors[0].principal, UNREADABLE);

      // Opened where the switch lands, the box is still in error.
      cleanup();
      (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL] = raw;
      mount();
      assert.equal(screen.getAllByLabelText(principalLabel)[0].getAttribute('aria-invalid'), 'true');
    }
  });
});
