/**
 * A shared view is its sender's until the reader edits it; the first edit
 * makes it the reader's own form (#795). Edited with the sender's total
 * frozen over it, it copied a link that was refused, or a total not its rows'.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { decodeFromQueryString, encodeShared, sharedResult } from './url.ts';
import { aggregate, type AssetRow } from './math.ts';

const source = readFileSync(new URL('../../components/MultiCurrencyNetWorth.tsx', import.meta.url), 'utf8');
/** A callback or handler, from its first line to the one that closes it. */
const body = (opens: string, closes: string) => {
  const at = source.indexOf(opens);
  assert.ok(at >= 0, opens);
  return source.slice(at, source.indexOf(closes, at));
};

describe('each edit makes a shared view the reader’s own', () => {
  const edits: Array<[string, string, string]> = [
    ['a row', 'const updateRow = useCallback(', '}, ['],
    ['add', 'const addRow = useCallback(', '}, ['],
    ['remove', 'const removeRow = useCallback(', '}, ['],
    ['import', 'const applyCsvRows = useCallback(', '}, ['],
    ['the spending currency', 'id={functionalCurrencySelectId}', '</select>'],
    ['clear', 'const reset = useCallback(', '}, ['],
  ];
  for (const [name, opens, closes] of edits) {
    it(name, () => assert.match(body(opens, closes), /leaveSharedView\(\)/));
  }
  it('it drops the view, its positions, its hiding and its doubt', () => {
    const leave = body('const leaveSharedView = useCallback(', '}, [');
    for (const set of ['setIsReadOnlyView(false)', 'setSharedPositions(null)', 'setSharedRedacted(false)', 'setSharedUnreadable(0)', 'setSharedInDoubt(false)']) {
      assert.ok(leave.includes(set), set);
    }
  });
});

describe('untouched, a full view copies what it was sent', () => {
  const row = (value: string, currency: string): AssetRow => ({ name: 'x', value, currency, type: 'asset' });
  const rows = [row('1000', 'EUR'), row('3000', 'CZK'), row('200', 'USD')];
  for (const [name, rates] of [['all known', { EUR: 1, CZK: 24, USD: 1.1 }], ['one missing', { EUR: 1, USD: 1.1 }]] as const) {
    it(name, () => {
      const sent = encodeShared(rows, aggregate(rows, 'EUR', rates).positions, 'EUR', 'full');
      const got = decodeFromQueryString(sent);
      const again = encodeShared(got.rows, sharedResult(got.sharedPositions!, 'EUR', (l) => l).positions, 'EUR', 'full');
      assert.deepEqual(new URLSearchParams(again).getAll('p_CZK'), new URLSearchParams(sent).getAll('p_CZK'));
      assert.equal([...new URLSearchParams(again)].map(String).sort().join('&'), [...new URLSearchParams(sent)].map(String).sort().join('&'));
    });
  }
});

describe('a refused redacted copy is heard (#795)', () => {
  it('by the dialog’s one region, and from its button', () => {
    assert.match(source, /<NoticeRegion notice=\{refusalNotice \?\? notice\} \/>/);
    assert.match(source, /aria-describedby=\{refusalId\} onClick=\{\(\) => onGoToRow/);
  });
});

describe('what a first edit is (#795)', () => {
  const edits = [['add', false], ['remove', false], [{ currency: 'USD' }, false], [{ type: 'liability' }, false], [{ name: 'a' }, true], [{ value: '1' }, true]] as const;
  for (const [edit, ends] of edits) {
    it(`${JSON.stringify(edit)} in a redacted view`, async () => {
      const { endsSharedView } = await import('./url.ts');
      assert.equal(endsSharedView(true, edit), ends);
      assert.equal(endsSharedView(false, edit), true, 'a full view has rows');
    });
  }
  it('the rows ask it', () => {
    assert.match(body('const updateRow = useCallback(', '}, ['), /if \(endsSharedView\(sharedRedacted, patch\)\) leaveSharedView\(\)/);
    assert.match(body('const addRow = useCallback(', '}, ['), /if \(endsSharedView\(sharedRedacted, 'add'\)\) leaveSharedView\(\)/);
    assert.match(body('const removeRow = useCallback(', '}, ['), /if \(endsSharedView\(sharedRedacted, 'remove'\)\) leaveSharedView\(\)/);
  });
  it('a refusal is over at the first edit', () => {
    assert.ok(body('const leaveSharedView = useCallback(', '}, [').includes('setRefused(null)'));
  });
});

it('an example ends a refusal, so clearing it carries nothing (#794)', () => {
  assert.match(body('const showExample = ', '};'), /EXAMPLE_SCALE/);
  assert.match(source.slice(source.indexOf('const showExample = '), source.indexOf('const clearExample = ')), /leaveSharedView\(\)/);
});
