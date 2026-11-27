/**
 * Sharing and saving a Monte Carlo plan (#790): the copied link, the
 * spreadsheet and the printed report.
 */
import { t, island, settle, events, mountWith, openPlan, reader } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fireEvent, screen } from '@testing-library/react';

describe('sharing and saving', () => {
  let written: string[] = [];
  let prompted: unknown[][] = [];
  let refuse = false;
  const realPrompt = window.prompt;
  beforeEach(() => {
    written = [];
    prompted = [];
    refuse = false;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (s: string) => { written.push(s); return refuse ? Promise.reject(new Error('no')) : Promise.resolve(); } },
    });
    window.prompt = (...args: unknown[]) => { prompted.push(args); return null; };
  });
  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).clipboard;
    window.prompt = realPrompt;
  });

  it('copies a link with the plan after the #, offers it by hand when refused, downloads and prints', async () => {
    const realCreate = URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    const realClick = window.HTMLAnchorElement.prototype.click;
    const realPrint = window.print;
    const blobs: Blob[] = [];
    const names: string[] = [];
    let printed = 0;
    URL.createObjectURL = (b: Blob) => { blobs.push(b); return 'blob:x'; };
    URL.revokeObjectURL = () => {};
    window.HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { names.push(this.download); };
    window.print = () => { printed++; };
    try {
      openPlan({ start: 20_000, paths: 100 });
      await settle(20);
      const button = screen.getByRole('button', { name: island.actions.copy });
      {
        // copies a link to the plan, with the plan after the #, and says so
        fireEvent.click(button);
        assert.deepEqual(written, [`https://nidhi.today/free/?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=monte_carlo#s=20000&n=100`]);
        assert.deepEqual(events.at(-1), ['free_monte_carlo_share_copied', undefined]);
        await settle(20);
        assert.ok(button.textContent?.includes(island.actions.copied));
        assert.equal(button.getAttribute('data-attr'), 'free-monte-carlo-share');
        // Said once, and kept under the buttons (#711).
        assert.equal(document.querySelector('.lc-shareUrlLabel')?.textContent, island.actions.copiedBar);
        assert.ok(document.querySelector<HTMLInputElement>('.lc-shareUrlInput')?.value === written[0]);
        await settle(60);
        assert.ok([...document.querySelectorAll('[aria-live]')].some((r) => r.textContent === island.actions.shareStatus));
      }
      {
        // offers the link to copy by hand when the clipboard refuses
        refuse = true;
        fireEvent.click(button);
        await settle(20);
        assert.deepEqual(prompted, [[island.actions.copyPrompt, written[1]]]);
        assert.equal(document.querySelector('.lc-shareUrlLabel')?.textContent, island.actions.copyPrompt);
      }
      // user-event puts its own clipboard in place, so it is set up after the copying.
      const user = reader();
      {
        // downloads the plan on screen as a spreadsheet, counted by its format only
        await user.click(screen.getByRole('button', { name: t.export.spreadsheet }));
        assert.deepEqual(events.at(-1), ['free_monte_carlo_exported', { format: 'xlsx' }]);
        assert.equal(blobs.length, 1);
        assert.match(names[0], /^nidhi-monte-carlo-\d{4}-\d{2}-\d{2}\.xlsx$/);
        const file = new TextDecoder().decode(await blobs[0].arrayBuffer());
        assert.ok(file.includes('EUR'), 'the plan’s currency');
        assert.ok(file.includes('https://nidhi.today/free/'), 'the page, without the plan');
        assert.ok(file.includes('20000'), 'the plan’s starting amount');
      }
      {
        // prints, counted by its format only
        await user.click(screen.getByRole('button', { name: t.export.print }));
        assert.equal(printed, 1);
        assert.deepEqual(events.at(-1), ['free_monte_carlo_exported', { format: 'pdf' }]);
      }
    } finally {
      URL.createObjectURL = realCreate;
      URL.revokeObjectURL = realRevoke;
      window.HTMLAnchorElement.prototype.click = realClick;
      window.print = realPrint;
    }
  });

  it('the untouched plan copies a link that names its currency, and nothing while the results catch up', async () => {
    mountWith({ defaultCurrency: 'INR' });
    await settle(20);
    const button = screen.getByRole('button', { name: island.actions.copy });
    fireEvent.click(button);
    assert.deepEqual(written, ['https://nidhi.today/free/?utm_source=share&utm_medium=referral&utm_campaign=free_tools&utm_content=monte_carlo']);
    events.length = 0;
    // Typing with user-event would put its own clipboard in place.
    fireEvent.change(screen.getByLabelText(island.fields.start), { target: { value: '500001' } });
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    fireEvent.click(button);
    assert.equal(written.length, 1);
    assert.deepEqual(events, []);
    await settle();
    assert.equal(button.getAttribute('aria-disabled'), null);
  });
});
