/**
 * Small promises the repository makes about itself:
 *   - public/.well-known/security.txt names a contact and has not lapsed;
 *   - the deploy workflow gives no job more than it needs, and the job that
 *     runs third-party code (npm ci, the build) can only read the code;
 *   - local working notes cannot be committed by accident.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

describe('security.txt', () => {
  const fields = Object.fromEntries(read('public/.well-known/security.txt').trim().split('\n').map((line) => {
    const at = line.indexOf(':');
    return [line.slice(0, at), line.slice(at + 1).trim()];
  }));

  it('names a contact and its own address', () => {
    assert.equal(fields.Contact, 'mailto:hello@nidhi.today');
    assert.equal(fields.Canonical, 'https://nidhi.today/.well-known/security.txt');
    assert.equal(fields['Preferred-Languages'], 'en');
  });

  it('is published: the deploy does not leave out folders that start with a dot', () => {
    // actions/upload-pages-artifact skips hidden files unless told otherwise;
    // without this the file is in the repository and a 404 on the site.
    const upload = /uses: actions\/upload-pages-artifact@v\d+\n\s+with:\n((?:\s{10}.*\n)+)/.exec(read('.github/workflows/deploy.yml'));
    assert.ok(upload, 'no Pages upload step');
    assert.match(upload[1], /^\s+include-hidden-files: true$/m);
  });

  it('nothing else in public/ starts with a dot, so nothing else is published by that', () => {
    assert.deepEqual(readdirSync(join(ROOT, 'public')).filter((name) => name.startsWith('.')), ['.well-known']);
    assert.deepEqual(readdirSync(join(ROOT, 'public/.well-known')), ['security.txt']);
  });

  it('has not lapsed, and will not within 30 days', () => {
    const expires = Date.parse(fields.Expires);
    assert.ok(Number.isFinite(expires), 'Expires is not a date');
    const days = (expires - Date.now()) / 86_400_000;
    assert.ok(days > 30, `security.txt expires in ${Math.floor(days)} days: set Expires in public/.well-known/security.txt to a date up to a year ahead`);
    // The format's own advice: no more than a year ahead (a little slack for the day it is written).
    assert.ok(days < 400, 'Expires is more than a year ahead');
  });
});

describe('deploy workflow permissions', () => {
  const workflow = read('.github/workflows/deploy.yml');
  // Each job's text: from its name at two spaces of indent to the next one.
  const job = (name) => {
    const start = workflow.indexOf(`\n  ${name}:\n`);
    assert.ok(start > 0, `no job ${name}`);
    const rest = workflow.slice(start + 1);
    const next = rest.slice(3).search(/\n {2}[a-z][\w-]*:\n/);
    return next === -1 ? rest : rest.slice(0, next + 3);
  };
  const permissions = (name) => {
    const m = /\n {4}permissions:\n((?: {6}.*\n)+)/.exec(job(name));
    assert.ok(m, `job ${name} states no permissions`);
    return m[1].trim().split('\n').map((line) => line.replace(/#.*/, '').trim()).sort();
  };

  it('gives nothing by default', () => {
    assert.match(workflow, /\npermissions: \{\}\n/);
  });

  it('each job asks only for what it needs', () => {
    assert.deepEqual(permissions('build'), ['contents: read']);
    assert.deepEqual(permissions('deploy'), ['id-token: write', 'pages: write']);
    assert.deepEqual(permissions('indexnow-ping'), ['contents: read']);
    assert.deepEqual(permissions('trigger-newsletter'), ['actions: write']);
  });

  it('every job states its permissions', () => {
    const names = [...workflow.slice(workflow.indexOf('\njobs:\n')).matchAll(/\n {2}([a-z][\w-]*):\n/g)].map((m) => m[1]);
    assert.deepEqual(names, ['build', 'deploy', 'indexnow-ping', 'trigger-newsletter']);
    for (const name of names) permissions(name);
  });

  it('the build is given only the secrets the site reads', () => {
    const secrets = [...job('build').matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]);
    for (const name of new Set(secrets)) {
      assert.match(name, /^PUBLIC_|^NEWSLETTER_|^WAITLIST_/, `the build job is given ${name}`);
    }
  });
});

describe('.gitignore', () => {
  const ignored = read('.gitignore').split('\n');

  it('keeps local working notes and the private findings out', () => {
    for (const line of ['reports/', 'research_notes/', 'logs/', '.shot-tmp.mjs', 'docs/curr_bugs.md', '.env']) {
      assert.ok(ignored.includes(line), `${line} is not ignored`);
    }
  });

  it('does not ignore a folder that holds tracked files', () => {
    assert.ok(!ignored.includes('remotion/public/'));
  });
});

describe('the newsletter workflow says so when something went wrong', () => {
  const workflow = read('.github/workflows/newsletter.yml');
  const step = (id) => {
    const at = workflow.indexOf(`        id: ${id}\n`);
    assert.ok(at > 0, `no step with id ${id}`);
    const end = workflow.indexOf('\n      - name:', at);
    return workflow.slice(workflow.lastIndexOf('\n      - name:', at), end < 0 ? undefined : end);
  };

  it('the bounce scan and the health check report how they went', () => {
    for (const id of ['bounce_scan', 'health']) {
      assert.match(step(id), /echo "ok=true" >> "\$GITHUB_OUTPUT"/, id);
      assert.match(step(id), /echo "ok=false" >> "\$GITHUB_OUTPUT"/, id);
    }
  });

  it('the alert fires for a missing secret, a failed scan and a failed health check, not only a failed send', () => {
    const notify = step('notify');
    for (const condition of [
      "steps.preflight.outputs.configured != 'true'",
      "steps.bounce_scan.outputs.ok == 'false'",
      "steps.health.outputs.ok == 'false'",
      "steps.newsletter.outcome == 'failure'",
      "steps.marker.outcome == 'failure'",
    ]) assert.ok(notify.includes(condition), condition);
    assert.doesNotMatch(notify, /steps\.newsletter\.outcome != 'skipped'/, 'a run that could not start must alert too');
  });

  it('a run that alerted is red: the last step fails whenever the alert ran', () => {
    const last = workflow.slice(workflow.lastIndexOf('\n      - name:'));
    assert.match(last, /if: always\(\) && steps\.notify\.outcome != 'skipped'/);
    assert.match(last, /\n\s+exit 1\n/);
  });
});
