import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shardPatterns, shardUnits, topLevelSpans, unitCosts, units, weightsFromReport, withinShard } from './mutation-shards.mjs';
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
  const at = (line, status) => ({ status, mutatorName: 'X', location: { start: { line, column: 0 }, end: { line, column: 1 } } });
  it('adds each file’s mutants from every shard', () => {
    const merged = mergeReports([
      { files: { 'src/utils/x.ts': { mutants: [at(1, 'Killed')] } } },
      { files: { 'src/utils/x.ts': { mutants: [at(2, 'Survived')] }, 'src/components/X.tsx': { mutants: [at(1, 'Killed')] } } },
    ]);
    assert.equal(merged.files['src/utils/x.ts'].mutants.length, 2);
    assert.equal(partScores(merged).logic, 50);
    assert.equal(partScores(merged).component, 100);
  });
});

describe('a shard keeps only its own mutants (#846)', () => {
  const mutant = (line, endLine = line, mutatorName = 'X') => ({ mutatorName, replacement: 'r', status: 'Killed', location: { start: { line, column: 0 }, end: { line: endLine, column: 9 } } });

  it('drops earlier results outside its ranges, and files it does not hold', () => {
    const report = { files: {
      'a.ts': { mutants: [mutant(2), mutant(5), mutant(9), mutant(4, 7)] },
      'b.ts': { mutants: [mutant(1)] },
      'c.ts': { mutants: [mutant(1)] },
    } };
    const kept = withinShard(report, ['a.ts:1-5', 'b.ts']);
    assert.deepEqual(kept.files['a.ts'].mutants.map((m) => m.location.start.line), [2, 5]);
    assert.equal(kept.files['b.ts'].mutants.length, 1);
    assert.ok(!('c.ts' in kept.files));
  });

  it('a statement added before others moves them, and no mutant is counted twice', () => {
    // Before: three statements dealt to two shards. After: one added at the top.
    const before = ['export const a = 1;', 'export const b = 2;', 'export const c = 3;'].join('\n');
    const after = ['export const z = 0;', 'export const a = 1;', 'export const b = 2;', 'export const c = 3;'].join('\n');
    // Each shard's cached report still holds every mutant it has ever seen.
    const all = (lines) => ({ files: { 'x.ts': { mutants: lines.map((l) => mutant(l)) } } });
    const reports = [1, 2].map((i) => withinShard(all([1, 2, 3, 4]), shardPatterns(['x.ts'], 2, i, () => after)));
    const merged = mergeReports(reports);
    assert.deepEqual(merged.files['x.ts'].mutants.map((m) => m.location.start.line).sort(), [1, 2, 3, 4]);
    // Without the trim, the shards' cached results overlap and the merge refuses them.
    assert.throws(() => mergeReports([all([1, 2, 3, 4]), all([1, 2, 3, 4])]), /in two shard reports/);
    assert.equal(units(['x.ts'], () => before).length, 3);
  });

  it('the merge fails on a mutant in two reports, rather than count it twice', () => {
    const one = { files: { 'x.ts': { mutants: [mutant(3)] } } };
    assert.throws(() => mergeReports([one, one]), /in two shard reports/);
  });
});

describe('a scope can be dealt by what its statements cost to test (#848)', () => {
  const source = [
    'f();',
    'export function f() {',
    '  return 1;',
    '}',
    'f();',
    'export const g = 2;',
    'export const h = 3;',
  ].join('\n');
  const read = () => source;
  const all = units(['x.ts'], read);

  it('names each unit by its first line, numbering a repeated one', () => {
    assert.deepEqual(all.map((u) => u.key), ['f();', 'export function f() {', 'f();#2', 'export const g = 2;', 'export const h = 3;']);
  });

  it('deals the dearest first, each to the lightest shard, every unit once', () => {
    const weights = { 'x.ts': { 'f();': 1, 'export function f() {': 9, 'f();#2': 5, 'export const g = 2;': 4, 'export const h = 3;': 1 } };
    const byShard = [1, 2].map((i) => shardUnits(all, 2, i, weights).map((u) => u.key));
    // 9 to the first; 5, 4 to the second (9 against 5, then 9 against 9); 1 and 1 to the first then the second.
    assert.deepEqual(byShard, [['f();', 'export function f() {'], ['f();#2', 'export const g = 2;', 'export const h = 3;']]);
    for (const count of [1, 2, 3, 4]) {
      const dealt = Array.from({ length: count }, (_, i) => shardUnits(all, count, i + 1, weights)).flat();
      assert.equal(dealt.length, all.length);
      assert.equal(new Set(dealt).size, all.length);
    }
  });

  it('gives the same shards every time, ties to the earlier unit and the lower shard', () => {
    const even = { 'x.ts': Object.fromEntries(all.map((u) => [u.key, 2])) };
    const once = [1, 2, 3].map((i) => shardUnits(all, 3, i, even).map((u) => u.start));
    assert.deepEqual(once, [[1, 6], [2, 7], [5]]);
    assert.deepEqual([1, 2, 3].map((i) => shardUnits(all, 3, i, even).map((u) => u.start)), once);
  });

  it('costs a unit it has no weight for by its lines, at the measured rate', () => {
    assert.deepEqual(unitCosts(all, { 'x.ts': { 'f();': 2 } }), [2, 6, 2, 2, 2]);
    assert.deepEqual(unitCosts(all, {}), [1, 3, 1, 1, 1]);
  });

  it('cuts weighted shards between statements too', () => {
    const weights = { 'x.ts': { 'export function f() {': 9 } };
    const byShard = [1, 2].map((i) => shardPatterns(['x.ts'], 2, i, read, weights));
    for (const [first, last] of [[1, 1], [2, 4], [5, 5], [6, 6], [7, 7]]) {
      assert.equal(holders(byShard, 'x.ts', first, last).length, 1, `lines ${first}-${last}`);
    }
  });

  it('reads the weights off a report: each unit’s mutants’ test time, in seconds', () => {
    const at = (line, duration) => ({ location: { start: { line }, end: { line } }, duration });
    const report = { files: { 'x.ts': { mutants: [at(1, 1_000), at(3, 2_000), at(3, 1_449), at(6, undefined)] } } };
    assert.deepEqual(weightsFromReport(all, report), { 'x.ts': { 'f();': 1, 'export function f() {': 3.4, 'f();#2': 0, 'export const g = 2;': 0, 'export const h = 3;': 0 } });
  });
});

describe('the checked-in shard weights', () => {
  const weights = JSON.parse(readFileSync(join(ROOT, 'stryker.shard-weights.json'), 'utf8'));
  const shards = JSON.parse(readFileSync(join(ROOT, 'stryker.shards.json'), 'utf8'));

  it('weigh only scopes cut into shards, files that exist, in seconds', () => {
    for (const [scope, files] of Object.entries(weights)) {
      assert.ok(shards[scope] > 1, `${scope} is not cut into shards`);
      for (const [file, byKey] of Object.entries(files)) {
        assert.ok(existsSync(join(ROOT, file)), `${scope}: ${file} does not exist`);
        for (const [key, seconds] of Object.entries(byKey)) {
          assert.ok(typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0, `${file} ${key}: ${seconds}`);
        }
      }
    }
  });

  it('name statements the files still have, most of them', () => {
    for (const [, files] of Object.entries(weights)) {
      for (const [file, byKey] of Object.entries(files)) {
        const keys = new Set(units([join(ROOT, file)]).map((u) => u.key));
        const known = Object.keys(byKey).filter((k) => keys.has(k)).length;
        assert.ok(known >= 0.8 * Object.keys(byKey).length, `${file}: most weights name statements it no longer has; measure again`);
      }
    }
  });
});
