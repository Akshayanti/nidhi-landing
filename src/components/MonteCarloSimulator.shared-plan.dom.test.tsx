/**
 * The Monte Carlo simulator opening a shared plan (#790): its boxes and
 * results, what is counted, and boxes that arrive unreadable or out of range.
 */
import { t, island, w, settle, events, mountWith, openPlan, heading, text, one, money, describedBy, typeInto } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { screen } from '@testing-library/react';
import { SHARED_STATE_GLOBAL } from '../utils/monte-carlo/url.ts';
import { roundedResult, simulate } from '../utils/monte-carlo/math.ts';

describe('a shared plan', () => {
  it('opens with its boxes and its results, and is counted with where it came from', async () => {
    window.history.replaceState(null, '', '/free/monte-carlo-simulator/?utm_source=share');
    try {
      const { plan } = openPlan({ start: 20_000, monthly: 300, saveYears: 12, paths: 1_000 });
      await settle(20);
      assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '20000');
      assert.equal(heading().textContent, 'After 12 years of saving');
      const worded = roundedResult(simulate(plan));
      assert.deepEqual(text('.mcs-cardValue'), [money(worded.atRetirement.p10), money(worded.atRetirement.p50), money(worded.atRetirement.p90)]);
      assert.deepEqual(events.filter(([e]) => e === 'free_monte_carlo_shared_view_opened'), [['free_monte_carlo_shared_view_opened', { utm_source: 'share' }]]);
    } finally {
      window.history.replaceState(null, '', '/free/');
    }
  });

  it('arriving by a language switch is not counted again, and a plain one keeps the settings folded', async () => {
    Object.defineProperty(document, 'referrer', { value: 'https://nidhi.today/hi/free/', configurable: true });
    try {
      openPlan({ start: 20_000 });
      await settle(20);
      assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '20000');
      assert.deepEqual(events, []);
      // that changes neither a fee nor the run count keeps them folded
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'false');
      assert.ok(!one('.mcs-grid--assumptions').classList.contains('mcs-settings--open'));
    } finally {
      Object.defineProperty(document, 'referrer', { value: '', configurable: true });
    }
  });

  it('a link without a plan opens the page as it starts', async () => {
    w[SHARED_STATE_GLOBAL] = 'utm_source=share';
    mountWith();
    await settle(20);
    assert.equal((screen.getByLabelText(island.fields.start) as HTMLInputElement).value, '50000');
    assert.deepEqual(events, []);
  });

  it('boxes that arrived unreadable say so, keep the results back, and open what they need', async () => {
    w[SHARED_STATE_GLOBAL] = 's=NaN&y=10&f=NaN&k=NaN';
    mountWith();
    await settle(20);
    {
      // a box that arrived unreadable says so, and keeps the results back
      const box = screen.getByLabelText(island.fields.start);
      assert.equal(box.getAttribute('aria-invalid'), 'true');
      assert.equal(screen.getAllByText(`Error: ${t.export.fieldUnreadable}`).length, 2);
      assert.equal(heading().textContent, t.export.report.answer);
      assert.equal(one('.ifc-example').textContent, '');
    }
    {
      // with a fee box that cannot be read shows the fees too
      assert.ok(one('.mcs-grid--assumptions').classList.contains('mcs-settings--open'));
      assert.equal(one('.mcs-settingsValue').textContent, '?% fees · 10,000 paths');
    }
    {
      // a mix that arrived unreadable shows as unknown, the slider at the default
      const slider = screen.getByRole('slider') as HTMLInputElement;
      assert.equal(document.querySelector(`label[for="${slider.id}"]`)?.textContent, 'Mix: ?% stocks, ?% bonds');
      assert.equal(slider.value, '80');
      assert.equal(one('.mcs-mix .mcs-hint').textContent, island.fields.mixHint);
    }
    {
      // an unreadable box retyped wrong says the range instead
      const box = await typeInto(island.fields.start, '-3');
      assert.equal(describedBy(box)[0], 'Error: Enter an amount from 0 to 1,000,000,000,000.');
    }
  });

  it('with a box out of range says the range, not that the box cannot be read', async () => {
    w[SHARED_STATE_GLOBAL] = 's=-5';
    mountWith();
    await settle(20);
    const box = screen.getByLabelText(island.fields.start) as HTMLInputElement;
    assert.equal(box.value, '-5');
    assert.equal(box.getAttribute('aria-invalid'), 'true');
    assert.equal(describedBy(box)[0], 'Error: Enter an amount from 0 to 1,000,000,000,000.');
  });

  for (const [name, change] of [['a fee', { feePct: 0.5 }], ['a run count', { paths: 1_000 }]] as const) {
    it(`that sets ${name} shows the fees and paths without a click`, async () => {
      openPlan(change);
      await settle(20);
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'true');
      assert.ok(one('.mcs-grid--assumptions').classList.contains('mcs-settings--open'));
    });
  }

});
