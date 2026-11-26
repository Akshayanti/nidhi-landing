/**
 * A result is shown only for a form it was worked out from (#793). Corrected,
 * a bad box used to uncover the stand-in kept behind it until the form
 * settled; Copy and the exports carried that stand-in (#789).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readsSource } from '../../../test/mutationRun.ts';

type Gate = (now: { invalid: boolean; held: boolean; current: boolean }) => { withheld: boolean; waiting: boolean };
const module_ = './settle.ts';
const loaded = (await import(module_).catch(() => ({}))) as { resultGate?: Gate };

describe('resultGate', () => {
  const cases: Array<[string, boolean, boolean, boolean, boolean, boolean]> = [
    // name, invalid, held, current, withheld, waiting
    ['settled', false, false, true, false, false],
    ['valid typing not settled yet', false, false, false, false, true],
    ['invalid', true, false, false, true, true],
    ['invalid, as a link arrived', true, false, true, true, true],
    ['corrected, not settled yet', false, true, false, true, true],
    ['corrected and settled', false, true, true, false, false],
  ];
  for (const [name, invalid, held, current, withheld, waiting] of cases) {
    it(name, () => {
      assert.ok(loaded.resultGate, 'no gate');
      assert.deepEqual(loaded.resultGate({ invalid, held, current }), { withheld, waiting });
    });
  }
});

// Each path is written out, not built from a name: the mutation cache works out what a test
// reads from its source, and a path it cannot work out ties the test to every file (#904).
const COMPONENTS = {
  InflationCalculator: readFileSync(new URL('../../components/InflationCalculator.tsx', import.meta.url), 'utf8'),
  InvestOrPayOff: readFileSync(new URL('../../components/InvestOrPayOff.tsx', import.meta.url), 'utf8'),
  MonteCarloSimulator: readFileSync(new URL('../../components/MonteCarloSimulator.tsx', import.meta.url), 'utf8'),
};
for (const [name, source] of Object.entries(COMPONENTS)) {
  describe(name, { skip: readsSource }, () => {
    it('Copy serializes the form as it stands', () => {
      const copy = /function copyShareLink\(\) \{[\s\S]*?\n {2}\}/.exec(source)?.[0] ?? '';
      assert.match(copy, /publishableForm\(form,/);
    });
    it('results, the report, Copy and export follow the gate', () => {
      assert.match(source, /useResultGate\(hasErrors,/);
      assert.doesNotMatch(source, /withheld=\{hasErrors/);
      assert.doesNotMatch(source, /<Withheld reason=\{hasErrors/);
      assert.doesNotMatch(source, /!hasErrors && <(ToolReport|PrintedReport)|report && !hasErrors/);
      assert.match(source, /onClick=\{copyShareLink\} aria-disabled=\{waiting \|\| undefined\}/, 'Copy leaves the tab order');
      assert.match(source, /if \(waiting\) return;/);
    });
    it('an ordinary settle says nothing, and a corrected box has nothing to fix (#793)', () => {
      assert.match(source, /settling=\{/);
      assert.doesNotMatch(source, /withheld \? strings\.results\.fix|: strings\.actions\.fix,/);
    });
    it('the form does not repeat the withheld reason (#793)', () => {
      assert.doesNotMatch(source, /className="ifc-hint (ifc|iop)-fix"|hasErrors && <span className="mcs-hint">/);
    });
  });
}

it('the loan’s Copy keeps the focus and says why (#793)', { skip: readsSource }, () => {
  const source = readFileSync(new URL('../../components/LoanCompare.tsx', import.meta.url), 'utf8');
  assert.match(source, /aria-disabled=\{withheld \|\| undefined\}/);
  assert.match(source, /aria-describedby=\{withheld \? withheldReasonId : undefined\}/);
  assert.match(source, /if \(withheld\) return;/);
  assert.doesNotMatch(source, /disabled=\{withheld\}\n/);
});

it('the own-return note is of its own two boxes: another box’s error does not take it away (#793)', { skip: readsSource }, () => {
  const source = readFileSync(new URL('../../components/InvestOrPayOff.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /!withheld && formNote/);
});
