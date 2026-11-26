/**
 * The Monte Carlo simulator's form below the return settings, on the page
 * (#790): the phone's jump to the full result, and the fold that holds the
 * fee and the number of paths, with the row that says what they are set to.
 */
import { island, events, mountWith, heading, one, text, describedBy, reader } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanup, screen } from '@testing-library/react';

const toggle = () => screen.getByRole('button', { name: island.settings.toggle });
const fold = () => one('.mcs-grid--assumptions');

describe('the form: the jump and the folded settings', () => {
  it('the jump takes a phone to the full result: the heading at the top, focused without a second scroll', async () => {
    mountWith();
    const user = reader();
    const scrolled: unknown[][] = [];
    const focused: unknown[][] = [];
    const h = heading();
    h.scrollIntoView = (...args: unknown[]) => { scrolled.push(args); };
    const focus = h.focus.bind(h);
    h.focus = (...args: unknown[]) => { focused.push(args); focus(...(args as [])); };
    const jump = screen.getByRole('button', { name: island.quick.jump });
    assert.equal(jump.getAttribute('type'), 'button', 'a button that submits nothing');
    assert.equal(jump.parentElement?.className, 'mcs-jump');
    await user.click(jump);
    assert.deepEqual(scrolled, [[{ block: 'start' }]]);
    assert.deepEqual(focused, [[{ preventScroll: true }]]);
    assert.ok(document.activeElement === h, 'the heading has the focus');
    assert.equal(window.location.hash, '', 'nothing is written to the address');
    {
      // with no results heading to go to, the jump does nothing and breaks nothing
      const broke: string[] = [];
      const onError = (e: ErrorEvent) => { broke.push(e.message); e.preventDefault(); };
      window.addEventListener('error', onError);
      h.remove();
      await user.click(jump);
      window.removeEventListener('error', onError);
      assert.deepEqual(broke, []);
      assert.equal(scrolled.length, 1);
    }
  });

  it('the fee and the paths are folded behind a row that says what they are set to', async () => {
    mountWith();
    const user = reader();
    {
      // folded to start with, the row naming the fold it opens
      assert.equal(toggle().getAttribute('aria-expanded'), 'false');
      assert.equal(toggle().getAttribute('aria-controls'), fold().id);
      assert.ok(fold().id);
      assert.equal(toggle().getAttribute('type'), 'button');
      assert.equal(toggle().className, 'mcs-settingsToggle disclosure');
      assert.equal(fold().className, 'mcs-grid mcs-grid--assumptions');
      assert.equal(one('.mcs-settingsRow > .mcs-settingsValue').textContent, '0% fees · 10,000 paths');
      // The typed fee is beside the button, never in it: a clicked button's text can be recorded.
      assert.equal(toggle().textContent, island.settings.toggle);
      assert.equal(one('.mcs-settingsName').textContent, island.settings.toggle);
    }
    {
      // opens and closes
      await user.click(toggle());
      assert.equal(toggle().getAttribute('aria-expanded'), 'true');
      assert.equal(fold().className, 'mcs-grid mcs-grid--assumptions mcs-settings--open');
      await user.click(toggle());
      assert.equal(toggle().getAttribute('aria-expanded'), 'false');
      assert.equal(fold().className, 'mcs-grid mcs-grid--assumptions');
      await user.click(toggle());
    }
    {
      // the fee: its range under it, summarised to two places as typed
      const fee = screen.getByLabelText(island.settings.feeLabel) as HTMLInputElement;
      assert.equal(fee.value, '0');
      assert.equal(fee.getAttribute('inputmode'), 'decimal');
      assert.deepEqual(describedBy(fee), ["Fund and platform fees, taken off every year's return. 0 to 5."]);
      await user.clear(fee);
      await user.type(fee, '0.257');
      assert.equal(one('.mcs-settingsValue').textContent, '0.26% fees · 10,000 paths');
      assert.equal(fee.getAttribute('aria-invalid'), null);
    }
    {
      // a wrong fee says what to type, and keeps the fold open so that it shows
      const fee = screen.getByLabelText(island.settings.feeLabel);
      await user.clear(fee);
      await user.type(fee, '5.5');
      assert.equal(fee.getAttribute('aria-invalid'), 'true');
      assert.deepEqual(describedBy(fee), ['Error: Enter a percentage from 0 to 5.', "Fund and platform fees, taken off every year's return. 0 to 5."]);
      assert.equal(one('.mcs-settingsValue').textContent, '?% fees · 10,000 paths');
      await user.click(toggle());
      assert.equal(toggle().getAttribute('aria-expanded'), 'true');
      assert.equal(fold().className, 'mcs-grid mcs-grid--assumptions mcs-settings--open');
      await user.clear(fee);
      await user.type(fee, '5');
      assert.equal(fee.getAttribute('aria-invalid'), null, 'the top of the range is in it');
      assert.equal(toggle().getAttribute('aria-expanded'), 'false', 'the row was closed meanwhile');
      assert.equal(fold().className, 'mcs-grid mcs-grid--assumptions');
    }
    {
      // the paths: the choices on offer, explained, counted by how many and summarised
      const paths = screen.getByLabelText(island.settings.pathsLabel) as HTMLSelectElement;
      assert.equal(paths.value, '10000');
      assert.equal(paths.className, 'mcs-input');
      assert.deepEqual([...paths.options].map((o) => [o.value, o.textContent]), [['100', '100'], ['1000', '1,000'], ['10000', '10,000'], ['100000', '100,000']]);
      assert.deepEqual(describedBy(paths), [island.settings.pathsHint]);
      assert.equal(document.getElementById(`${paths.id}-hint`)?.className, 'mcs-hint');
      assert.equal(document.querySelector(`label[for="${CSS.escape(paths.id)}"]`)?.className, 'mcs-label');
      events.length = 0;
      await user.selectOptions(paths, '100');
      assert.deepEqual(events, [['free_monte_carlo_runs_changed', { runs: 100 }]]);
      assert.equal(paths.value, '100');
      assert.equal(one('.mcs-settingsValue').textContent, '5% fees · 100 paths');
    }
  });

  it('the row writes the fee and the paths in the page’s own number style', async () => {
    mountWith({ numberLocale: 'de' });
    const user = reader();
    assert.equal(one('.mcs-settingsValue').textContent, '0% fees · 10.000 paths');
    const fee = screen.getByLabelText(island.settings.feeLabel);
    await user.clear(fee);
    await user.type(fee, '1,255');
    assert.equal(one('.mcs-settingsValue').textContent, '1,26% fees · 10.000 paths');
    assert.deepEqual(text(`#${CSS.escape(screen.getByLabelText(island.settings.pathsLabel).id)} option`), ['100', '1.000', '10.000', '100.000']);
    cleanup();
  });
});
