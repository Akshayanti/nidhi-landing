/**
 * The Monte Carlo simulator's number boxes (#790): what each says when it is
 * wrong, and how the results and the exports wait until it is corrected.
 */
import { t, island, settle, mountWith, heading, one, describedBy, reader, typeInto, retype } from '../../test/monteCarloPage.tsx';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { screen } from '@testing-library/react';

describe('the number boxes', () => {
  it('say what is wrong, hold the results and the exports back, and let go once corrected', async () => {
    // A hundred paths: every correction below works the plan out again.
    mountWith();
    await settle(20);
    const user = reader();
    {
      // the export buttons say why they wait while a box is wrong, and not while a result settles
      const xlsx = screen.getByRole('button', { name: t.export.spreadsheet });
      assert.equal(xlsx.getAttribute('aria-disabled'), null);
      assert.ok(screen.queryByText(t.export.notReady) === null);
      const box = screen.getByLabelText(island.fields.start);
      await user.type(box, '1');
      assert.equal(xlsx.getAttribute('aria-disabled'), 'true');
      assert.ok(screen.queryByText(t.export.notReady) === null, 'settling says nothing');
      await user.type(box, 'x');
      assert.ok(screen.getByText(t.export.notReady));
      await retype(island.fields.start, '50000');
      assert.ok(screen.queryByText(t.export.notReady) === null);
    }
    {
      // out of range says the range, in the page’s number style
      const cases: Array<[string, string, string, string]> = [
        [island.fields.start, '-5', 'Error: Enter an amount from 0 to 1,000,000,000,000.', '50000'],
        [island.fields.monthly, '20000000000', 'Error: Enter an amount from 0 to 10,000,000,000.', '1000'],
        [island.fields.saveYears, '61', 'Error: Enter a whole number of years from 0 to 60.', '30'],
      ];
      for (const [label, value, error, back] of cases) {
        const box = await typeInto(label, value);
        assert.equal(box.getAttribute('aria-invalid'), 'true', label);
        assert.equal(describedBy(box)[0], error);
        await typeInto(label, back);
      }
    }
    {
      // while a box is wrong the results are held back, the reason is said, and nothing is printed
      await settle();
      await typeInto(island.fields.saveYears, '61');
      assert.equal(heading().textContent, t.export.report.answer);
      assert.ok(one('.mcs-results .tool-resultBody').classList.contains('tool-withheld'));
      assert.ok(one('.mcs-quick').classList.contains('tool-withheld'));
      assert.equal(one('.mcs-results .tool-resultReason').textContent, island.actions.fix);
      assert.equal(one('.mcs-actions [role="status"]').textContent, '');
      assert.ok(document.querySelector('.tool-report') === null);
      await settle(1_050);
      assert.equal(one('.mcs-actions .chart-srOnly').textContent, island.actions.fix);
      await typeInto(island.fields.saveYears, '20');
      await settle();
      assert.equal(heading().textContent, 'After 20 years of saving');
      assert.ok(!one('.mcs-quick').classList.contains('tool-withheld'));
    }
    {
      // a corrected box shows its result once it settles, the old one never
      await typeInto(island.fields.saveYears, '12');
      assert.equal(heading().textContent, t.export.report.answer, 'not the last plan’s result');
      await settle();
      assert.equal(heading().textContent, 'After 12 years of saving');
    }
    {
      // an empty box counts as nothing where nothing is allowed
      await typeInto(island.fields.monthly, '');
      assert.equal(screen.getByLabelText(island.fields.monthly).getAttribute('aria-invalid'), 'true');
    }
    {
      // a number too long for a link is refused as unreadable where it is typed
      const box = await typeInto(island.fields.start, '1'.repeat(201));
      assert.equal(describedBy(box)[0], `Error: ${t.export.fieldUnreadable}`);
    }
  });
});
