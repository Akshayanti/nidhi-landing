import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dict } from '../i18n/index.ts';
import data from '../data/inflation/worldbank.json';
import { HISTORY_URL, toCompactSeries, type WorldBankFile } from '../utils/inflation/history.ts';
import { SHARED_STATE_GLOBAL, decodeState } from '../utils/invest-or-pay-off/url.ts';
import { boxErrors, formFromLink } from '../utils/invest-or-pay-off/form.ts';
import InvestOrPayOff, { pct } from './InvestOrPayOff.tsx';

const t = dict('en').tools;
const island = t.investOrPayOff.island;
const LOCALE = 'en';
const shared = () => (window as unknown as Record<string, unknown>)[SHARED_STATE_GLOBAL];

// As the English page builds them (src/components/pages/InvestOrPayOffPage.astro).
const file = data as WorldBankFile;
const series = toCompactSeries(file.countries.EMU?.years ?? {});
const latestYear = Math.max(...Object.values(file.countries).flatMap((c) => Object.keys(c.years).map(Number)));

function mount() {
  return render(
    <InvestOrPayOff
      strings={island}
      exportStrings={t.export}
      defaultCurrency="EUR"
      defaultCountry="EMU"
      countries={[{ code: 'EMU', name: island.country.euroArea, currency: 'EUR' }]}
      initialHistory={series ? { code: 'EMU', series } : null}
      historyUrl={HISTORY_URL}
      latestYear={latestYear}
      numberLocale={LOCALE}
      amountLocale={null}
    />,
  );
}

/** Types `text` into the balance box, replacing what is there, and leaves the box. */
async function typeBalance(text: string) {
  const user = userEvent.setup();
  const box = screen.getByLabelText(island.fields.balance);
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

describe('invest or pay off, mounted', () => {
  it('publishes what is typed, readable or not, and marks what cannot be read', async () => {
    mount();
    {
      // publishes a typed balance for the language switch
      await typeBalance('73191');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      assert.equal(decodeState(raw as string)?.balance, 73191);
    }
    {
      // publishes an unreadable balance as still in error
      await typeBalance('7x');
      const raw = shared();
      assert.equal(typeof raw, 'string');
      assert.notEqual(raw, '');
      const form = formFromLink(raw as string, LOCALE);
      assert.ok(form, 'the published state decodes');
      assert.equal(form.balance, '?');
      assert.equal(boxErrors(form, LOCALE).balance, true);
    }
    {
      // marks an unreadable balance invalid and withholds the result
      const box = screen.getByLabelText(island.fields.balance);
      assert.equal(box.getAttribute('aria-invalid'), 'true');
      assert.ok(screen.getByText(island.results.fix, { selector: '.tool-resultReason' }));
    }
  });
});

describe('pct: a rate below zero', () => {
  const MINUS = String.fromCodePoint(0x2212);
  it('is written with the true minus sign the amounts use, in every language (#884)', () => {
    assert.equal(pct(-1.5, 'en'), `${MINUS}1.5%`);
    assert.equal(pct(-1.5, 'es'), `${MINUS}1,5${String.fromCodePoint(0xa0)}%`);
    assert.equal(pct(-1.5, 'cs'), `${MINUS}1,5${String.fromCodePoint(0xa0)}%`);
    assert.equal(pct(-1.5, 'hi'), `${MINUS}1.5%`);
    assert.ok(!pct(-1.5, 'mr').includes('-'));
    assert.equal(pct(2, 'en'), '2%');
  });
});
