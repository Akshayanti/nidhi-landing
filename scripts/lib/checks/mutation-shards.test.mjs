import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shardPatterns, shardUnits, topLevelSpans, units } from './mutation-shards.mjs';
import { mergeReports, partScores } from './mutation-floors.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

/** Which shards' patterns hold the lines first to last of `file` (whole names hold all). */
function holders(patternsByShard, file, first, last) {
  const out = [];
  patternsByShard.forEach((patterns, i) => {
    for (const p of patterns) {
      if (p === file) out.push(i + 1);
      const m = /^(.*):(\d+)-(\d+)$/.exec(p);
      if (m && m[1] === file && Number(m[2]) <= first && Number(m[3]) >= last) out.push(i + 1);
    }
  });
  return out;
}

describe('mutation shards are cut only between top-level statements (#846)', () => {
  const source = [
    'export const a = 1; export const b = 2;', // two statements on one line
    'export function f(x: number) {',
    '  if (x > 1) return x;',
    '  return 0;',
    '}',
    '// a comment between statements',
    'export const g = (y: number) => y * 2;',
  ].join('\n');
  const read = () => source;

  it('never separates two statements that share a line', () => {
    assert.deepEqual(units(['x.ts'], read).map((u) => [u.start, u.end]), [[1, 1], [2, 5], [7, 7]]);
  });

  it('puts every unit in exactly one shard, and a function whole', () => {
    for (const count of [1, 2, 3, 5]) {
      const byShard = Array.from({ length: count }, (_, i) => shardPatterns(['x.ts'], count, i + 1, read));
      for (const [first, last] of [[1, 1], [2, 5], [7, 7]]) {
        assert.equal(holders(byShard, 'x.ts', first, last).length, 1, `${count} shards, lines ${first}-${last}`);
      }
    }
  });

  it('refuses a shard outside its count', () => {
    assert.throws(() => shardUnits([], 2, 3));
    assert.throws(() => shardUnits([], 0, 1));
  });

  it('reads JSX and TypeScript as Stryker does', () => {
    assert.deepEqual(topLevelSpans('y.tsx', 'export const C = () => <div>{1 as number}</div>;\n'), [[1, 1]]);
  });
});

describe('every top-level statement of every sharded scope is in exactly one shard', () => {
  const shards = JSON.parse(readFileSync(join(ROOT, 'stryker.shards.json'), 'utf8'));
  for (const [scope, count] of Object.entries(shards)) {
    if (count === 1) continue;
    it(`${scope}, in ${count} shards`, async () => {
      process.env.STRYKER_SCOPE = scope;
      const byShard = [];
      for (let i = 1; i <= count; i++) {
        process.env.STRYKER_SHARD = `${i}/${count}`;
        const { default: config } = await import(`../../../stryker.config.mjs?${scope}-${i}`);
        byShard.push(config.mutate);
      }
      delete process.env.STRYKER_SHARD;
      const files = [...new Set(byShard.flat().map((p) => p.replace(/:\d+-\d+$/, '')))];
      assert.ok(files.length > 0);
      for (const file of files) {
        for (const [first, last] of topLevelSpans(file, readFileSync(join(ROOT, file), 'utf8'))) {
          assert.equal(holders(byShard, file, first, last).length, 1, `${file} lines ${first}-${last}`);
        }
      }
    });
  }
});

describe('a sharded scope is scored as one (#846)', () => {
  it('adds each file’s mutants from every shard', () => {
    const merged = mergeReports([
      { files: { 'src/utils/x.ts': { mutants: [{ status: 'Killed' }] } } },
      { files: { 'src/utils/x.ts': { mutants: [{ status: 'Survived' }] }, 'src/components/X.tsx': { mutants: [{ status: 'Killed' }] } } },
    ]);
    assert.equal(merged.files['src/utils/x.ts'].mutants.length, 2);
    assert.equal(partScores(merged).logic, 50);
    assert.equal(partScores(merged).component, 100);
  });
});
