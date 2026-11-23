/**
 * Three rules of net worth's results that a browser measured and a unit test
 * can only pin: an amount fits its card (#795), the limit's live region stays
 * in the accessibility tree (#794), the subtotal's long label can wrap (#795).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../styles/tools.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const component = readFileSync(new URL('../../components/MultiCurrencyNetWorth.tsx', import.meta.url), 'utf8');
/** Every declaration under exactly this selector. */
const rules = (selector: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].trim() === selector).map((m) => m[2]).join(';');

describe('net worth results', () => {
  it('an amount is sized by its card', () => {
    assert.match(rules('.mcnw-riskCard'), /container-type:\s*inline-size/);
  });
  it('the empty limit line is hidden to the eye only', () => {
    const empty = rules('.mcnw-limit:empty');
    assert.doesNotMatch(empty, /display:\s*none/);
    assert.match(empty, /position:\s*absolute/);
  });
  it('the subtotal label has no capitals and no tracking', () => {
    const label = rules('.mcnw-totalLabel--partial');
    assert.match(label, /text-transform:\s*none/);
    assert.match(label, /letter-spacing:\s*normal/);
    assert.match(component, /mcnw-totalLabel--partial/);
  });
});
