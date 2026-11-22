/**
 * A result is shown only for a form it was worked out from (#793). Corrected,
 * a bad box used to uncover the stand-in kept behind it until the form
 * settled; Copy and the exports carried that stand-in (#789).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

for (const name of ['InflationCalculator', 'InvestOrPayOff', 'MonteCarloSimulator']) {
  const source = readFileSync(new URL(`../../components/${name}.tsx`, import.meta.url), 'utf8');
  describe(name, () => {
    it('Copy serializes the form as it stands', () => {
      const copy = /function copyShareLink\(\) \{[\s\S]*?\n {2}\}/.exec(source)?.[0] ?? '';
      assert.match(copy, /publishableForm\(form,/);
    });
    it('results, the report, Copy and export follow the gate', () => {
      assert.match(source, /useResultGate\(hasErrors,/);
      assert.doesNotMatch(source, /withheld=\{hasErrors/);
      assert.doesNotMatch(source, /<Withheld reason=\{hasErrors/);
      assert.doesNotMatch(source, /!hasErrors && <(ToolReport|PrintedReport)|report && !hasErrors/);
      assert.match(source, /onClick=\{copyShareLink\} disabled=\{waiting\}/);
    });
    it('the form does not repeat the withheld reason (#793)', () => {
      assert.doesNotMatch(source, /className="ifc-hint (ifc|iop)-fix"|hasErrors && <span className="mcs-hint">/);
    });
  });
}
