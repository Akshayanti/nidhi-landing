/**
 * The scripts index (scripts/README.md) is written by scripts/scripts-index.mjs
 * and must match what it writes now; every entry point says what it is for;
 * and every path package.json and the workflows run exists.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { README, entryPoints, purposeOf, render, workflowRuns } from './scripts-index.mjs';

const ROOT = join(import.meta.dirname, '..');

/** Repository paths a command names: words under the tracked top-level folders, without shell variables. */
function pathsIn(command) {
  return [...command.matchAll(/(?:^|[\s'"=(])((?:scripts|src|docs|public|remotion|\.github)\/[^\s'"`;|&)]+)/gm)]
    .map((m) => m[1].replace(/[.,:]+$/, ''))
    .filter((p) => !p.includes('$'));
}

const exists = (p) => (p.includes('*') ? globSync(p, { cwd: ROOT }).length > 0 : existsSync(join(ROOT, p)));

describe('the scripts index', () => {
  it('is what the generator writes now', () => {
    assert.ok(
      existsSync(join(ROOT, README)) && readFileSync(join(ROOT, README), 'utf8') === render(ROOT),
      `${README} is out of date: run node scripts/scripts-index.mjs`,
    );
  });

  it('gives every entry point a purpose line from its header comment', () => {
    const list = entryPoints(ROOT);
    assert.ok(list.length > 20, `only ${list.length} entry points found`);
    const missing = list.filter((p) => purposeOf(readFileSync(join(ROOT, p), 'utf8')) === '');
    assert.deepEqual(missing, [], 'give each of these a header comment whose first sentence says what it is for');
  });

  it('reads a purpose from each comment style and keeps dashes out', () => {
    assert.equal(purposeOf('#!/usr/bin/env node\n// Does a thing. More.\n'), 'Does a thing.');
    assert.equal(purposeOf('/**\n * Title of it\n * ===========\n *\n * Body.\n */'), 'Title of it.');
    assert.equal(purposeOf('#!/usr/bin/env python3\n"""Make one\nthing. Then."""'), 'Make one thing.');
    assert.equal(purposeOf('#!/bin/bash\n# Turn a into b — fast.\n'), 'Turn a into b: fast.');
    assert.equal(purposeOf('// In src/blog/4. optimizing/x.md.\n'), 'In src/blog/4. optimizing/x.md.');
    assert.equal(purposeOf('import x from "y";\n// later comment\n'), '');
  });
});

describe('every path package.json and the workflows run exists', () => {
  it('package.json scripts', () => {
    const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
    const named = Object.values(scripts).flatMap(pathsIn);
    assert.ok(named.length > 10, `only ${named.length} paths found`);
    assert.deepEqual(named.filter((p) => !exists(p)), []);
  });

  it('workflow run: lines', () => {
    const named = workflowRuns(ROOT).flatMap(({ file, runs }) => runs.flatMap(pathsIn).map((p) => ({ file, p })));
    assert.ok(named.length > 5, `only ${named.length} paths found`);
    assert.deepEqual(named.filter(({ p }) => !exists(p)), []);
  });
});
