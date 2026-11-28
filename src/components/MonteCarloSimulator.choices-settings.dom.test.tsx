/**
 * The Monte Carlo simulator's choices (#790): a return setting and its
 * descriptions, the mix, the run count and the fee.
 */
import { island, settle, events, mountWith, text, one, radio, reader } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';

describe('the choices: returns, the mix, runs and fees', () => {
  it('a return setting, the descriptions and the mix', async () => {
    mountWith();
    {
      // a return setting is counted, marked and described under the switch
      const user = reader();
      await user.click(radio('cautious'));
      assert.deepEqual(events.at(-1), ['free_monte_carlo_returns_changed', { setting: 'cautious' }]);
      assert.equal((radio('cautious') as HTMLInputElement).checked, true);
      assert.deepEqual(text('.mcs-switchOpt--on span:first-of-type'), [island.returns.cautious]);
      const tip = 'Stocks grow about 4% a year after inflation and bonds about 1%: a cautious setting, below what world markets returned since 1900. The ups and downs are as large as in history.';
      assert.equal(one('.mcs-switch > .mcs-hint').textContent, tip);
    }
    {
      // Escape hides the setting descriptions until the pointer or focus leaves the switch
      const fieldset = one('.mcs-switch');
      const user = reader();
      await user.keyboard('{Shift}');
      assert.ok(!fieldset.classList.contains('mcs-switch--tipsOff'));
      await user.keyboard('{Escape}');
      assert.ok(fieldset.classList.contains('mcs-switch--tipsOff'));
      fireEvent.mouseLeave(fieldset);
      assert.ok(!fieldset.classList.contains('mcs-switch--tipsOff'));
      await user.keyboard('{Escape}');
      const radios = screen.getAllByRole('radio');
      fireEvent.blur(fieldset, { relatedTarget: radios[1] });
      assert.ok(fieldset.classList.contains('mcs-switch--tipsOff'), 'focus moving within the switch keeps them hidden');
      fireEvent.blur(fieldset, { relatedTarget: document.body });
      assert.ok(!fieldset.classList.contains('mcs-switch--tipsOff'));
    }
    {
      // the mix names both shares, and says the default is only an example
      const label = () => document.querySelector(`label[for="${screen.getByRole('slider').id}"]`)?.textContent;
      assert.equal(label(), 'Mix: 80% stocks, 20% bonds');
      assert.ok(one('.mcs-mix .mcs-hint').textContent?.includes('80% stocks is an example value'));
      // the slider is described by that hint, so a screen reader hears it too
      assert.ok(document.getElementById(screen.getByRole('slider').getAttribute('aria-describedby') ?? '') === one('.mcs-mix .mcs-hint'));
      fireEvent.change(screen.getByRole('slider'), { target: { value: '65' } });
      assert.equal(label(), 'Mix: 65% stocks, 35% bonds');
      assert.equal(one('.mcs-mix .mcs-hint').textContent, island.fields.mixHint);
    }
  });

  it('the run count and the rates, in a page\u2019s own number styles', async () => {
    mountWith({ numberLocale: 'de', amountLocale: 'es' });
    {
      // writes the rates in a page’s own style where it has one
      assert.deepEqual(text('.mcs-tip').map((s) => s.match(/[\d,]+\s%/g)?.map((m) => m.replace(/\s/, ' '))), [['4 %', '1 %'], ['5,3 %', '1,7 %'], ['6 %', '3 %']]);
    }
    {
      // the run count is counted, summarised and warned about when it is small
      const user = reader();
      await user.selectOptions(screen.getByLabelText(island.settings.pathsLabel), '1000');
      assert.deepEqual(events.at(-1), ['free_monte_carlo_runs_changed', { runs: 1_000 }]);
      assert.equal(one('.mcs-settingsValue').textContent, '0% fees · 1.000 paths');
      await settle();
      assert.ok(one('.mcs-caveat').textContent?.includes(' With only 1.000 paths'));
      assert.deepEqual(text(`#${CSS.escape(screen.getByLabelText(island.settings.pathsLabel).id)} option`), ['100', '1.000', '10.000', '100.000']);
    }
  });

  it('the fee: summarised as typed, and kept open while wrong', async () => {
    mountWith();
    {
      // the fee is summarised as typed, to two places
      const user = reader();
      await user.click(screen.getByRole('button', { name: island.settings.toggle }));
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'true');
      const box = screen.getByLabelText(island.settings.feeLabel);
      await user.clear(box);
      await user.type(box, '0.257');
      assert.equal(one('.mcs-settingsValue').textContent, '0.26% fees · 10,000 paths');
      await user.click(screen.getByRole('button', { name: island.settings.toggle }));
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'false');
    }
    {
      // a wrong fee keeps the fold open and says what to type
      const user = reader();
      const box = screen.getByLabelText(island.settings.feeLabel);
      await user.clear(box);
      await user.type(box, '9');
      assert.equal(screen.getByRole('button', { name: island.settings.toggle }).getAttribute('aria-expanded'), 'true');
      assert.ok(one('.mcs-grid--assumptions').classList.contains('mcs-settings--open'));
      assert.ok(screen.getByText('Error: Enter a percentage from 0 to 5.'));
      assert.equal(one('.mcs-settingsValue').textContent, '?% fees · 10,000 paths');
    }
  });
});
