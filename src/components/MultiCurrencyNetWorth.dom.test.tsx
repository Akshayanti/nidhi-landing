import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dict } from '../i18n/index.ts';
import { format } from '../i18n/format.ts';
import { isUnreadableAmount } from '../utils/multi-currency-net-worth/math.ts';
import { SHARED_STATE_GLOBAL, decodeFromQueryString } from '../utils/multi-currency-net-worth/url.ts';
import MultiCurrencyNetWorth from './MultiCurrencyNetWorth.tsx';

const t = dict('en').tools;
const island = t.multiCurrencyNetWorth.island;
const shared = () => (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];

// The tool asks for exchange rates on mount. A test never reaches the
// network: the request is answered here, with no rates.
const realFetch = globalThis.fetch;
before(() => {
  globalThis.fetch = (async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
});

// As the English page renders it (src/components/pages/MultiCurrencyNetWorthPage.astro).
function mount() {
  return render(
    <MultiCurrencyNetWorth
      strings={island}
      exportStrings={t.export}
      defaultCurrency="EUR"
      numberLocale="en"
      amountLocale={null}
    />,
  );
}

/** Types `text` into the first row's value, replacing what is there, and leaves the box. */
async function typeFirstValue(text: string) {
  const user = userEvent.setup();
  const box = screen.getByLabelText(format(island.row.valueAria, { index: 1 }));
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

describe('the net worth calculator, mounted', () => {
  it('publishes what is typed, readable or not, and marks what cannot be read', async () => {
    mount();
    {
      // publishes a typed row value for the language switch
      await typeFirstValue('73191');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      const decoded = decodeFromQueryString(raw as string);
      assert.equal(decoded.refused, undefined);
      assert.equal(decoded.isReadOnly, false);
      assert.equal(decoded.rows[0].value, '73191');
    }
    {
      // publishes an unreadable row value as still unreadable
      const box = await typeFirstValue('7x');
      assert.equal(box.getAttribute('aria-invalid'), 'true');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      const decoded = decodeFromQueryString(raw as string);
      assert.equal(decoded.refused, undefined);
      assert.equal(isUnreadableAmount(decoded.rows[0].value), true);
    }
  });
});
