import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TARGET, floorProblems, judgeScope, partOf, partScores } from './mutation-floors.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
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
    let base = null;
    try {
      base = JSON.parse(execFileSync('git', ['show', `${process.env.FLOORS_BASE}:stryker.floors.json`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    } catch {
      return; // The base branch has no floors yet: this is the change that adds them.
    }
    assert.deepEqual(floorProblems(floors, base), []);
  });
});
