/**
 * The loan comparison as its page mounts it (#790): copying a link to the
 * comparison, the spreadsheet and the printed copy, what is held back while
 * an offer cannot be worked out, and the one event that says an offer could
 * not be (which reason, never what was typed). Links arriving are in
 * LoanCompare.page-links.dom.test.tsx; adding and removing offers in
 * LoanCompare.page-offers.dom.test.tsx.
 *
 * A link carries the comparison after the `#` only, and the address is
 * never written (CLAUDE.md, "Free Tools Keep Inputs Out of URLs").
 */
import {
  island, events, eventNames, copied, prompted, printed, downloads, clipboard, clock, mount, offer, link, shareAddress, cards, type, c,
  shareButton, xlsxButton, fileText, pdfButton, ariaDisabled, withheld, said, shareLabel, has, one, byId, sentText, addressUntouched, arriveWith,
} from '../../test/loanCompare.page.tsx';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { act, fireEvent } from '@testing-library/react';
import { decodeFromQueryString } from '../utils/loan/url.ts';

const tb = island.toolbar;
/** Clicks the share button and lets the clipboard answer. */
async function copy() {
  await act(async () => {
    fireEvent.click(shareButton());
    await new Promise((done) => setImmediate(done));
  });
}
const bar = () => document.querySelector('.lc-shareUrlBar');
const barLabel = () => one('.lc-shareUrlLabel').textContent;
const barLink = () => (one('.lc-shareUrlBar input') as HTMLInputElement).value;

describe('the loan comparison: copying a link', () => {
  it('copies the comparison after the #, says so once per copy, and drops the address once it changes', async () => {
    clipboard();
    mount();
    assert.ok(bar() === null);
    assert.equal(shareLabel(), tb.share);
    assert.equal(shareButton().hasAttribute('aria-disabled'), false);
    const start = link([offer(0), offer(1)]);

    await copy();
    assert.deepEqual(copied, [shareAddress(start)]);
    assert.equal(barLabel(), tb.copiedBar);
    assert.equal(barLink(), shareAddress(start));
    assert.equal(shareLabel(), tb.shareCopied);
    // Reached from the keyboard, the field selects the whole address to copy.
    const field = one('.lc-shareUrlBar input') as HTMLInputElement;
    fireEvent.focus(field);
    assert.deepEqual([field.selectionStart, field.selectionEnd], [0, field.value.length]);
    clock.pass(60);
    assert.equal(said(), tb.shareStatus);

    // A second copy is said again: the region empties first, so it is a change.
    clock.pass(1000);
    await copy();
    assert.equal(said(), '');
    clock.pass(60);
    assert.equal(said(), tb.shareStatus);
    // "Copied" stays its full time from the second copy.
    clock.pass(2000);
    assert.equal(shareLabel(), tb.shareCopied);
    clock.pass(500);
    assert.equal(shareLabel(), tb.share);
    // The copied address stays, until the comparison changes.
    assert.equal(barLink(), shareAddress(start));

    type(0, c.principal, '73191');
    assert.ok(bar() === null);
    await copy();
    assert.equal(decodeFromQueryString(copied[2].split('#')[1]).vendors[0].principal, '73191');
    assert.deepEqual(eventNames(), [
      'free_loan_comparison_share_modal_opened', 'free_loan_comparison_share_copied',
      'free_loan_comparison_share_modal_opened', 'free_loan_comparison_share_copied',
      'free_loan_comparison_share_modal_opened', 'free_loan_comparison_share_copied',
    ]);
    assert.ok(!sentText().includes('73191'));
    assert.ok(addressUntouched());
  });

  it('offers the address to copy by hand when the browser will not copy it', async () => {
    clipboard(false);
    mount();
    await copy();
    const address = shareAddress(link([offer(0), offer(1)]));
    assert.deepEqual(prompted, [[tb.copyPrompt, address]]);
    assert.equal(barLabel(), tb.copyPrompt);
    assert.equal(barLink(), address);
    assert.equal(shareLabel(), tb.share);
    clock.pass(60);
    assert.equal(said(), tb.copyPrompt);
    assert.deepEqual(eventNames(), ['free_loan_comparison_share_modal_opened']);
  });

  it('says each copy, when one copy works and the next is refused, and the other way round', async () => {
    // Each copy is a new announcement however the one before it went: a copy
    // must never bring the count of what was said back to where it started.
    clipboard();
    mount();
    await copy();
    clock.pass(60);
    assert.equal(said(), tb.shareStatus);
    clipboard(false);
    clock.pass(1000);
    await copy();
    clock.pass(60);
    assert.equal(said(), tb.copyPrompt);
    clipboard();
    clock.pass(1000);
    await copy();
    clock.pass(60);
    assert.equal(said(), tb.shareStatus);
  });

  it('says the copy that works after one that was refused', async () => {
    clipboard(false);
    mount();
    await copy();
    clock.pass(60);
    assert.equal(said(), tb.copyPrompt);
    clipboard();
    clock.pass(1000);
    await copy();
    clock.pass(60);
    assert.equal(said(), tb.shareStatus);
  });
});

describe('the loan comparison: saving a copy, and what is held back', () => {
  it('saves a spreadsheet and prints, each counted by its kind, with the printed copy in the page', async () => {
    mount();
    assert.equal(ariaDisabled(xlsxButton()), false);
    assert.equal(ariaDisabled(pdfButton()), false);
    assert.ok(has('.tool-report'));
    fireEvent.click(xlsxButton());
    assert.equal(downloads.length, 1);
    assert.match(downloads[0].name, /^nidhi-loan-comparison-\d{4}-\d{2}-\d{2}\.xlsx$/);
    // The spreadsheet names the page it came from: the address without anything after it.
    const sheet = await fileText(downloads[0].blob);
    assert.ok(sheet.includes('https://nidhi.today/free/'));
    assert.ok(!sheet.includes('https://nidhi.today/free/?'));
    fireEvent.click(pdfButton());
    assert.equal(printed.length, 1);
    assert.deepEqual(events, [
      ['free_loan_comparison_exported', { format: 'xlsx' }],
      ['free_loan_comparison_exported', { format: 'pdf' }],
    ]);
  });

  it('holds back sharing, saving and the printed copy while an offer cannot be worked out, and gives them back once it can', async () => {
    clipboard();
    mount();
    type(1, c.principal, '');
    assert.equal(withheld(), true);
    assert.equal(ariaDisabled(shareButton()), true);
    assert.equal(byId(shareButton().getAttribute('aria-describedby'))?.textContent, island.delta.fix);
    assert.equal(ariaDisabled(xlsxButton()), true);
    assert.equal(ariaDisabled(pdfButton()), true);
    assert.equal(has('.tool-report'), false);
    await copy();
    fireEvent.click(xlsxButton());
    fireEvent.click(pdfButton());
    assert.deepEqual([copied, downloads, printed, eventNames()], [[], [], [], []]);

    type(1, c.principal, '250000');
    assert.equal(withheld(), false);
    assert.equal(shareButton().hasAttribute('aria-disabled'), false);
    assert.equal(shareButton().hasAttribute('aria-describedby'), false);
    assert.equal(ariaDisabled(xlsxButton()), false);
    assert.ok(has('.tool-report'));
  });
});

describe('the loan comparison: the validation event', () => {
  it('says, once typing pauses, how many offers cannot be worked out and the first one\'s reason', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const wait = (ms: number) => act(() => { mock.timers.tick(ms); });
      const reasons = () => events.filter(([name]) => name === 'free_loan_comparison_validation_error').map(([, props]) => props);
      const view = mount();
      // The example has nothing wrong.
      wait(1000);
      assert.deepEqual(reasons(), []);

      // A burst of typing is one event, for where it ended.
      type(1, c.rate, '');
      wait(300);
      type(1, c.rate, '6');
      type(0, c.term, '');
      wait(599);
      assert.deepEqual(reasons(), []);
      wait(1);
      assert.deepEqual(reasons(), [{ count: 1, firstReason: 'missing_term', firstVendor: 'A' }]);

      const next = (i: number, label: string, value: string) => {
        events.length = 0;
        type(i, label, value);
        wait(600);
        return reasons();
      };
      assert.deepEqual(next(0, c.term, '360'), []);
      assert.deepEqual(next(1, c.rate, ''), [{ count: 1, firstReason: 'missing_rate', firstVendor: 'B' }]);
      assert.deepEqual(next(0, c.rate, '200'), [{ count: 2, firstReason: 'payment_below_interest', firstVendor: 'A' }]);
      assert.deepEqual(next(0, c.rate, '6'), [{ count: 1, firstReason: 'missing_rate', firstVendor: 'B' }]);
      assert.deepEqual(next(1, c.rate, '6'), []);
      assert.deepEqual(next(1, c.principal, ''), [{ count: 1, firstReason: 'other', firstVendor: 'B' }]);
      assert.deepEqual(next(1, c.principal, '250000'), []);
      // A payment typed, too small to be a payment: no word about interest in the reason it gives.
      events.length = 0;
      fireEvent.click(one('input[type="radio"][value="payment"]', cards()[1]));
      type(1, c.monthly, '');
      wait(600);
      assert.deepEqual(reasons(), [{ count: 1, firstReason: 'other', firstVendor: 'B' }]);

      // Leaving the page before typing pauses sends nothing.
      events.length = 0;
      type(0, c.rate, '');
      view.unmount();
      wait(1000);
      assert.deepEqual(reasons(), []);
      assert.ok(!sentText().includes('250000'));
    } finally {
      mock.timers.reset();
    }
  });

  it('files a changing rate that arrives without its later rate under "other", and holds the comparison back (issue 818)', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      arriveWith(link([offer(0, { rateKind: 'hybrid' }), offer(1)]));
      mount();
      events.length = 0;
      act(() => { mock.timers.tick(600); });
      assert.deepEqual(events, [['free_loan_comparison_validation_error', { count: 1, firstReason: 'other', firstVendor: 'A' }]]);
      assert.equal(cards()[0].querySelector('.lc-error')?.textContent, `Error: ${island.engine.errors.rateChangeIncomplete}`);
      assert.ok(cards()[1].querySelector('.lc-error') === null);
      assert.equal(withheld(), true);
      assert.equal(ariaDisabled(xlsxButton()), true);
      assert.equal(has('.tool-report'), false);

      // The later rate typed in: worked out, and nothing more is sent.
      events.length = 0;
      type(0, c.subsequentRate, '9');
      act(() => { mock.timers.tick(600); });
      assert.deepEqual(events, []);
      assert.ok(cards()[0].querySelector('.lc-error') === null);
      assert.equal(withheld(), false);
    } finally {
      mock.timers.reset();
    }
  });

  it('says nothing about a link that cannot be worked out until it settles, and then once', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      arriveWith(link([offer(0), offer(1, { termMonths: '' })]));
      mount();
      events.length = 0;
      act(() => { mock.timers.tick(600); });
      assert.deepEqual(events, [['free_loan_comparison_validation_error', { count: 1, firstReason: 'missing_term', firstVendor: 'B' }]]);
    } finally {
      mock.timers.reset();
    }
  });
});
