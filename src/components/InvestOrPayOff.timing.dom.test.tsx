/**
 * Invest or pay off, as time passes on a page: a history that comes after the
 * reader has moved on (#879), what a screen reader hears as a shared link
 * opens (#880), and when the "calculated" event is sent (#882).
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, describe, it } from 'node:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { investOrPayOffEn } from '../i18n/strings/tools/investOrPayOff.ts';
import { exportEn } from '../i18n/strings/tools/export.ts';
import data from '../data/inflation/worldbank.json';
import { HISTORY_URL, toCompactSeries, type CompactHistory, type WorldBankFile } from '../utils/inflation/history.ts';
import { SHARED_STATE_GLOBAL, defaultState, encodeState } from '../utils/invest-or-pay-off/url.ts';
import { clock } from '../../test/windowClock.ts';
import InvestOrPayOff from './InvestOrPayOff.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { investOrPayOff: investOrPayOffEn, export: exportEn },
};

const t = TOOL_STRINGS.en;
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

describe('invest or pay off, as time passes', () => {
  it('a history that arrives after its country was left is asked for again, not said to have failed (#879)', async () => {
    mount();
    fireEvent.change(country(), { target: { value: 'TST' } });
    assert.ok(hints().includes(island.country.loading));
    // Back to the page's own country, whose history the page holds, before the answer comes.
    fireEvent.change(country(), { target: { value: 'EMU' } });
    await act(async () => {
      pending.shift()?.({ ok: true, status: 200, json: () => Promise.resolve(HISTORY) });
      await new Promise((done) => setImmediate(done));
    });
    fireEvent.change(country(), { target: { value: 'TST' } });
    await turn();
    assert.ok(!hints().includes(island.country.error), 'said the history could not load');
    assert.ok(!hints().includes(island.country.loading), 'still loading');
  });

  it('an untouched page says nothing and sends no "calculated" event', async () => {
    mount();
    await turn();
    clock.pass(2000);
    assert.equal(said(), '');
    assert.equal(calculated(), 0);
  });

  it('a shared link opens quietly, and its comparison is counted once (#880, #882)', async () => {
    w[SHARED_STATE_GLOBAL] = encodeState({ ...defaultState('EUR', 'EMU'), balance: 42000 });
    mount();
    await turn();
    clock.pass(2000);
    assert.equal(said(), '', 'the link’s result was read out on opening');
    assert.equal(calculated(), 1);
  });

  it('a link that cannot be read sends no "calculated" event for the example (#882)', async () => {
    w[SHARED_STATE_GLOBAL] = 'zz=1';
    mount();
    await turn();
    clock.pass(2000);
    assert.equal(calculated(), 0);
  });

  it('a link with a box that cannot be read is counted only once its fix has settled (#882)', async () => {
    w[SHARED_STATE_GLOBAL] = 'b=oops&i=2';
    mount();
    await turn();
    clock.pass(2000);
    assert.equal(calculated(), 0, 'counted while a box could not be read');
    const balance = screen.getByLabelText(island.fields.balance);
    fireEvent.change(balance, { target: { value: '42000' } });
    assert.equal(calculated(), 0, 'counted before the fix settled');
    clock.pass(100);
    fireEvent.change(balance, { target: { value: 'x' } });
    clock.pass(2000);
    assert.equal(calculated(), 0, 'counted for a fix that was undone before the pause');
    fireEvent.change(balance, { target: { value: '42000' } });
    clock.pass(250);
    assert.equal(calculated(), 1);
  });

  it('the reader’s own inputs are counted once they settle, and the new result is said', async () => {
    mount();
    await turn();
    fireEvent.change(screen.getByLabelText(island.fields.balance), { target: { value: '42000' } });
    assert.equal(calculated(), 0, 'counted before typing settled');
    clock.pass(250);
    assert.equal(calculated(), 1);
    clock.pass(1000);
    assert.notEqual(said(), '');
    fireEvent.change(screen.getByLabelText(island.fields.balance), { target: { value: '43000' } });
    clock.pass(2000);
    assert.equal(calculated(), 1);
  });
});
