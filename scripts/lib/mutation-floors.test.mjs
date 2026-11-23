import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TARGET, floorProblems, judgeScope, partOf, partScores } from './mutation-floors.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * The floors on the base commit, or null when that commit has no floors file.
 * Anything else (a base that is not a commit, a file that is not JSON) throws,
 * so the ratchet can never pass by failing to read the base.
 */
function baseFloors(revision) {
  let commit;
  try {
    commit = git('rev-parse', '--verify', '--quiet', `${revision}^{commit}`).trim();
  } catch {
    throw new Error(`FLOORS_BASE ${revision} is not a commit here (is the checkout deep enough?)`);
  }
  try {
    git('cat-file', '-e', `${commit}:stryker.floors.json`);
  } catch {
    return null;
  }
  return JSON.parse(git('show', `${commit}:stryker.floors.json`));
}
const mutants = (...statuses) => ({ mutants: statuses.map((status) => ({ status })) });

describe('mutation floors (#790)', () => {
  it('tells a component from logic', () => {
    assert.equal(partOf('src/components/LoanCompare.tsx'), 'component');
    assert.equal(partOf('src/components/chart/useChartRem.ts'), 'component');
    assert.equal(partOf('src/utils/loan/math.ts'), 'logic');
  });

  it('scores each part as Stryker does, leaving out what did not compile or run', () => {
    const report = { files: {
      'src/utils/x.ts': mutants('Killed', 'Killed', 'Timeout', 'Survived', 'CompileError', 'RuntimeError'),
      'src/components/X.tsx': mutants('Killed', 'NoCoverage', 'NoCoverage'),
    } };
    const s = partScores(report);
    assert.equal(s.logic, 75);
    assert.equal(s.component, 33.33);
  });

  it('a part below its floor fails; at or above it passes; a floored part with no mutants fails', () => {
    assert.deepEqual(judgeScope('x', { logic: 80, component: 10 }, { x: { logic: 80, component: 9.5 } }), []);
    assert.equal(judgeScope('x', { logic: 79.99, component: 10 }, { x: { logic: 80, component: 9.5 } }).length, 1);
    assert.equal(judgeScope('x', { logic: 80, component: null }, { x: { logic: 80, component: 9.5 } }).length, 1);
    assert.equal(judgeScope('y', { logic: 99, component: 99 }, { x: {} }).length, 1);
  });

  it('a floor is never lowered or removed, and never set above the target', () => {
    assert.deepEqual(floorProblems({ x: { logic: 90 } }, { x: { logic: 85 } }), []);
    assert.equal(floorProblems({ x: { logic: 84 } }, { x: { logic: 85 } }).length, 1);
    assert.equal(floorProblems({ x: {} }, { x: { logic: 85 } }).length, 1);
    assert.equal(floorProblems({ x: { logic: TARGET + 1 } }).length, 1);
    assert.equal(floorProblems({ x: { logic: '90' } }).length, 1);
  });
});

describe('stryker.floors.json', () => {
  const floors = JSON.parse(readFileSync(join(ROOT, 'stryker.floors.json'), 'utf8'));
  const config = readFileSync(join(ROOT, 'stryker.config.mjs'), 'utf8');
  const scopes = [...config.slice(config.indexOf('const SCOPES = {'), config.indexOf('\n};', config.indexOf('const SCOPES = {'))).matchAll(/^ {2}'?([\w-]+)'?: \[/gm)].map((m) => m[1]);

  it('holds a logic and a component floor for every scope, and nothing else', () => {
    assert.deepEqual(Object.keys(floors).sort(), [...scopes].sort());
    for (const scope of scopes) assert.deepEqual(Object.keys(floors[scope]).sort(), ['component', 'logic'], scope);
    assert.deepEqual(floorProblems(floors), []);
  });

  // In CI, FLOORS_BASE names the base revision (pr-checks.yml, the Tests job).
  it('lowers no floor of the base branch', { skip: !process.env.FLOORS_BASE && 'FLOORS_BASE is not set' }, () => {
    const base = baseFloors(process.env.FLOORS_BASE);
    // null only when the base has no floors file: the change that adds it.
    if (base !== null) assert.deepEqual(floorProblems(floors, base), []);
  });
});

describe('the base floors are read or the check fails', () => {
  it('fails on a base that is not a commit, instead of passing', () => {
    assert.throws(() => baseFloors('definitely-not-a-revision'), /not a commit/);
  });

  it('reads no floors from a commit that has no floors file', () => {
    // The first commit of the repository has no stryker.floors.json.
    const first = git('rev-list', '--max-parents=0', 'HEAD').trim().split('\n')[0];
    assert.equal(baseFloors(first), null);
  });

  it('reads the floors of a commit that has them', () => {
    assert.deepEqual(baseFloors('HEAD'), JSON.parse(git('show', 'HEAD:stryker.floors.json')));
  });
});
