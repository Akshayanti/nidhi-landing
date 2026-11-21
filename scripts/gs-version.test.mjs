// Each web-app Apps Script says which source it is (#443): its VERSION is the
// hash of the file, so the deployed script's health answer can be compared
// with main. Edit a .gs file, then run `npm run gs:version`.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSIONED_SCRIPTS, gsVersion, writtenVersion, withVersion } from './lib/gs-version.mjs';

const ROOT = join(import.meta.dirname, '..');

describe('Apps Script versions (#443)', () => {
  for (const file of VERSIONED_SCRIPTS) {
    it(`${file} carries the hash of its own source, and health reports it`, () => {
      const source = readFileSync(join(ROOT, file), 'utf8');
      assert.equal(writtenVersion(source), gsVersion(source), `run npm run gs:version (${file} changed since its VERSION was written)`);
      assert.match(source, /var report = \{ ok: true, version: VERSION, checks: \{\} \};/);
    });
  }

  it('the hash ignores the literal and line endings, and sees any other change', () => {
    const a = "// x\nvar VERSION = '';\nfunction f() {}\n";
    assert.equal(gsVersion(a), gsVersion(withVersion(a)));
    assert.equal(gsVersion(a), gsVersion(a.replace(/\n/g, '\r\n')));
    assert.notEqual(gsVersion(a), gsVersion(a.replace('f()', 'g()')));
    assert.throws(() => gsVersion('no version here'));
  });
});

describe('the live version check (#443)', async () => {
  const { ENDPOINTS, verdict } = await import('./check-gs-versions.mjs');

  it('knows where every versioned script is deployed', () => {
    assert.deepEqual(Object.keys(ENDPOINTS).sort(), [...VERSIONED_SCRIPTS].sort());
  });

  it('fails on no answer, no version, another version, or health not ok', () => {
    assert.equal(verdict('f', 'abc', null).ok, false);
    assert.equal(verdict('f', 'abc', { ok: true }).ok, false);
    assert.equal(verdict('f', 'abc', { ok: true, version: 'def' }).ok, false);
    assert.equal(verdict('f', 'abc', { ok: false, version: 'abc' }).ok, false);
    assert.equal(verdict('f', 'abc', { ok: true, version: 'abc' }).ok, true);
  });

  it('runs nightly, after a deploy and by hand, and says so in an issue', () => {
    const wf = readFileSync(join(ROOT, '.github/workflows/apps-script-versions.yml'), 'utf8');
    assert.match(wf, /schedule:/);
    assert.match(wf, /workflow_run:\n\s+workflows: \['Deploy to GitHub Pages'\]/);
    assert.match(wf, /workflow_dispatch:/);
    assert.match(wf, /node scripts\/check-gs-versions\.mjs/);
    assert.match(wf, /gh issue (create|comment)/);
    for (const name of Object.values(ENDPOINTS)) assert.match(wf, new RegExp(`${name}:`), name);
  });
});
