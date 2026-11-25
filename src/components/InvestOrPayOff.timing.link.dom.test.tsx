/**
 * Invest or pay off: a shared link naming a country whose inflation history
 * the page does not hold opens as quietly as any other link (#880). In a file
 * of its own, so the page's one history request is still to come.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, describe, it } from 'node:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { dict } from '../i18n/index.ts';
import data from '../data/inflation/worldbank.json';
import { HISTORY_URL, toCompactSeries, type CompactHistory, type WorldBankFile } from '../utils/inflation/history.ts';
import { SHARED_STATE_GLOBAL, defaultState, encodeState } from '../utils/invest-or-pay-off/url.ts';
import { clock } from '../../test/windowClock.ts';
import InvestOrPayOff from './InvestOrPayOff.tsx';

const t = dict('en').tools;
const island = t.investOrPayOff.island;
const w = window as unknown as Record<string, unknown>;

const file = data as WorldBankFile;
const series = toCompactSeries(file.countries.EMU?.years ?? {});
const latestYear = Math.max(...Object.values(file.countries).flatMap((c) => Object.keys(c.years).map(Number)));
const HISTORY: CompactHistory = { updated: '2026-10-08', countries: { TST: series!, OTH: series! } };

const events: string[] = [];
const pending: Array<(v: unknown) => void> = [];
const realFetch = globalThis.fetch;

function mount() {
  return render(
    <InvestOrPayOff
      strings={island}
      exportStrings={t.export}
      defaultCurrency="EUR"
      defaultCountry="EMU"
      countries={[
        { code: 'EMU', name: island.country.euroArea, currency: 'EUR' },
        { code: 'TST', name: 'Testland', currency: 'EUR' },
        { code: 'OTH', name: 'Otherland', currency: 'EUR' },
      ]}
      initialHistory={series ? { code: 'EMU', series } : null}
      historyUrl={HISTORY_URL}
      latestYear={latestYear}
      numberLocale="en"
      amountLocale={null}
    />,
  );
}

const said = () => document.querySelector('span.chart-srOnly[aria-live="polite"]')?.textContent ?? null;
const calculated = () => events.filter((e) => e === 'free_invest_or_pay_off_calculated').length;
const turn = () => act(async () => { await new Promise((done) => setImmediate(done)); });
const country = () => screen.getByLabelText(island.fields.country, { selector: 'select' });
const hints = () => [...document.querySelectorAll('.ifc-hint')].map((p) => p.textContent);

beforeEach(() => {
  events.length = 0;
  pending.length = 0;
  w.posthog = { capture: (event: string) => { events.push(event); } };
  clock.install();
  globalThis.fetch = (() => new Promise<Response>((resolve) => pending.push(resolve as (v: unknown) => void))) as typeof fetch;
});
afterEach(() => {
  cleanup();
  delete w[SHARED_STATE_GLOBAL];
  delete w.posthog;
  clock.restore();
  globalThis.fetch = realFetch;
});
after(() => window.close());

describe('invest or pay off, a link whose history comes later', () => {
  it('a link naming a country whose history the page does not hold opens quietly too (#880)', async () => {
    w[SHARED_STATE_GLOBAL] = encodeState({ ...defaultState('EUR', 'TST'), balance: 42000 });
    mount();
    await turn();
    assert.ok(hints().includes(island.country.loading), 'the link’s history was not still loading');
    await act(async () => {
      pending.shift()?.({ ok: true, status: 200, json: () => Promise.resolve(HISTORY) });
      await new Promise((done) => setImmediate(done));
    });
    clock.pass(2000);
    assert.ok(!hints().includes(island.country.loading), 'the history never arrived');
    assert.equal(said(), '', 'the link’s result was read out when its history arrived');
    fireEvent.change(screen.getByLabelText(island.fields.balance), { target: { value: '43000' } });
    clock.pass(2000);
    assert.notEqual(said(), '', 'the reader’s own change was not said');
  });
});
