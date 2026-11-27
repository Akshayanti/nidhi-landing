/**
 * The Monte Carlo simulator's form from the withdrawals down, on the page
 * (#790): the switch and its two boxes, and what the page says, holds back
 * and lets be copied, saved and printed while a box is wrong and after it is
 * corrected.
 */
import { t, island, settle, events, openPlan, heading, one, text, describedBy, reader, typeInto } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { screen } from '@testing-library/react';

/** Nothing on the page matches: a count, so a failure says so at once. */
const none = (selector: string, why?: string) => assert.equal(document.querySelectorAll(selector).length, 0, why ?? `there is a ${selector}`);

const share = () => screen.getByRole('button', { name: island.actions.copy });
const status = () => one('.mcs-actions [role="status"]');

describe('the form: withdrawals, and a wrong box', () => {
  it('withdrawals switch on with their two boxes; a wrong box holds the results, the link and the report back until corrected', async () => {
    openPlan({ paths: 100, saveYears: 5 });
    await settle(20);
    const user = reader();
    const check = screen.getByRole('checkbox', { name: island.withdraw.toggle }) as HTMLInputElement;
    {
      // off: one line says what switching on shows, and there are no boxes
      assert.equal(check.checked, false);
      assert.equal(check.closest('label')?.className, 'mcs-check');
      assert.equal(check.closest('legend')?.className, 'mcs-label');
      assert.deepEqual(text('.mcs-withdraw > .mcs-hint'), [island.withdraw.off]);
      none('.mcs-withdraw .mcs-grid');
    }
    {
      // on: counted as a choice, the two boxes with their hints, and the line gone
      events.length = 0;
      await user.click(check);
      assert.deepEqual(events, [['free_monte_carlo_withdrawal_toggled', { on: true }]]);
      assert.equal(check.checked, true);
      assert.deepEqual(text('.mcs-withdraw > .mcs-hint'), []);
      assert.equal(one('.mcs-withdraw > div').className, 'mcs-grid mcs-grid--two');
      const amount = screen.getByLabelText(island.withdraw.amountLabel) as HTMLInputElement;
      const years = screen.getByLabelText(island.withdraw.yearsLabel) as HTMLInputElement;
      assert.equal(amount.value, '30000');
      assert.equal(amount.getAttribute('inputmode'), 'decimal');
      assert.deepEqual(describedBy(amount), [island.withdraw.amountHint]);
      assert.equal(years.value, '30');
      assert.equal(years.getAttribute('inputmode'), 'numeric');
      assert.deepEqual(describedBy(years), [island.withdraw.yearsHint]);
      await settle();
      assert.ok(one('.mcs-lastedHead').textContent?.startsWith('Taking €30,000 a year'));
    }
    {
      // nothing is wrong and nothing is running: the page says neither, and everything can be kept
      assert.equal(status().textContent, '');
      assert.equal(status().className, 'mcs-hint');
      assert.equal(status().getAttribute('aria-live'), 'polite');
      assert.equal(one('.mcs-actions .chart-srOnly').textContent, '');
      assert.equal(share().getAttribute('aria-disabled'), null);
      assert.equal(share().className, 'btn btn--outline');
      assert.equal(share().getAttribute('type'), 'button');
      assert.equal(share().getAttribute('data-attr'), 'free-monte-carlo-share');
      assert.equal(one('.tool-swapLabel > span').textContent, island.actions.copy);
      assert.equal(one('.tool-swapLabel__ghost').textContent, island.actions.copied);
      assert.equal(screen.getByRole('button', { name: t.export.spreadsheet }).getAttribute('data-attr'), 'free-monte-carlo-export-xlsx');
      assert.equal(screen.getByRole('button', { name: t.export.print }).getAttribute('data-attr'), 'free-monte-carlo-export-pdf');
      assert.equal(screen.getByRole('button', { name: t.export.spreadsheet }).getAttribute('aria-disabled'), null);
      assert.ok(document.querySelector('.tool-report'), 'the report is there to print');
      assert.equal(one('.mcs-results').getAttribute('aria-busy'), 'false');
      assert.equal(one('.mcs-quick').className, 'mcs-quick');
    }
    {
      // a wrong withdrawal box says its own range
      let box = await typeInto(island.withdraw.yearsLabel, '61');
      assert.deepEqual(describedBy(box), ['Error: Enter a whole number of years from 1 to 60.', island.withdraw.yearsHint]);
      box = await typeInto(island.withdraw.yearsLabel, '60');
      assert.equal(box.getAttribute('aria-invalid'), null);
      box = await typeInto(island.withdraw.amountLabel, '0');
      assert.deepEqual(describedBy(box), ['Error: Enter an amount from 1 to 100,000,000,000.', island.withdraw.amountHint]);
    }
    {
      // while it is wrong: the results and the report are held back, the reason shown, then said once
      assert.equal(heading().textContent, t.export.report.answer);
      assert.equal(one('.mcs-results .tool-resultReason').textContent, island.actions.fix);
      assert.ok(one('.mcs-results .tool-resultBody').classList.contains('tool-withheld'));
      assert.equal(one('.mcs-quick').className, 'mcs-quick tool-withheld');
      none('.tool-report', 'nothing to print');
      assert.equal(share().getAttribute('aria-disabled'), 'true');
      assert.equal(screen.getByRole('button', { name: t.export.spreadsheet }).getAttribute('aria-disabled'), 'true');
      assert.ok(screen.getByText(t.export.notReady), 'the buttons say why they wait');
      assert.equal(status().textContent, '', 'nothing is running');
      assert.equal(one('.mcs-actions .chart-srOnly').textContent, '');
      await settle(1_050);
      assert.equal(one('.mcs-actions .chart-srOnly').textContent, island.actions.fix);
      assert.equal(one('.mcs-results').getAttribute('aria-busy'), 'false');
    }
    {
      // corrected, for the moment its result takes: still held back, with nothing left to say or to fix
      await typeInto(island.withdraw.amountLabel, '20000');
      assert.equal(heading().textContent, t.export.report.answer);
      none('.mcs-results .tool-resultReason');
      assert.ok(one('.mcs-results .tool-resultBody').classList.contains('tool-withheld'));
      assert.equal(share().getAttribute('aria-disabled'), 'true', 'a plan not shown yet is not shared');
      assert.ok(!screen.queryByText(t.export.notReady), 'a moment’s settling says nothing');
      assert.equal(status().textContent, '');
      none('.tool-report');
    }
    {
      // its result on screen: everything back
      await settle();
      assert.equal(heading().textContent, 'After 5 years of saving');
      assert.ok(one('.mcs-lastedHead').textContent?.startsWith('Taking €20,000 a year, the money lasted all 60 years in'));
      assert.equal(share().getAttribute('aria-disabled'), null);
      assert.ok(document.querySelector('.tool-report'));
      assert.equal(one('.mcs-quick').className, 'mcs-quick');
      await settle(1_050);
      assert.equal(one('.mcs-actions .chart-srOnly').textContent, island.actions.back, 'that the results are back, once (#822)');
    }
    {
      // off again: counted, the boxes gone and the line back
      events.length = 0;
      await user.click(check);
      assert.deepEqual(events, [['free_monte_carlo_withdrawal_toggled', { on: false }]]);
      assert.equal(check.checked, false);
      assert.deepEqual(text('.mcs-withdraw > .mcs-hint'), [island.withdraw.off]);
      assert.ok(!screen.queryByLabelText(island.withdraw.amountLabel));
    }
  });
});
