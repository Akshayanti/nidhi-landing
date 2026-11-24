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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { testFiles } from './run-tests.mjs';

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
    const upload = /uses: actions\/upload-pages-artifact@[0-9a-f]{40} # v[\d.]+\n\s+with:\n((?:\s{10}.*\n)+)/.exec(read('.github/workflows/deploy.yml'));
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
    assert.deepEqual(permissions('alert'), ['issues: write']);
  });

  it('every job states its permissions', () => {
    const names = [...workflow.slice(workflow.indexOf('\njobs:\n')).matchAll(/\n {2}([a-z][\w-]*):\n/g)].map((m) => m[1]);
    assert.deepEqual(names, ['build', 'deploy', 'indexnow-ping', 'trigger-newsletter', 'alert']);
    for (const name of names) permissions(name);
  });

  it('a failed deploy opens an issue, and only one at a time (#328)', () => {
    const alert = job('alert');
    assert.match(alert, /\n {4}needs: \[build, deploy, trigger-newsletter\]\n/);
    // A failed job, or one its time limit stopped (reported as cancelled),
    // but not a run a person cancelled.
    assert.match(alert, /\n {4}if: failure\(\) \|\| \(!cancelled\(\) && contains\(needs\.\*\.result, 'cancelled'\)\)\n/);
    // It has no checkout, so gh must be told the repository.
    assert.match(alert, /GH_REPO: \$\{\{ github\.repository \}\}/);
    assert.doesNotMatch(alert, /uses: actions\/checkout/);
    // An open alert takes a comment; a new issue is opened only when none is.
    assert.match(alert, /gh issue list --state open --label deploy-alert/);
    assert.match(alert, /if \[ -n "\$\{EXISTING:-\}" \]; then\n\s+echo [^\n]+\n\s+gh issue comment "\$EXISTING"/);
    assert.match(alert, /else\n\s+echo [^\n]+\n\s+gh issue create --title "\$TITLE" --label deploy-alert/);
    // The only secret it is given is the token that writes the issue.
    assert.deepEqual([...new Set([...alert.matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]))], ['GITHUB_TOKEN']);
  });

  it('the build is given only the secrets the site reads', () => {
    const secrets = [...job('build').matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]);
    for (const name of new Set(secrets)) {
      assert.match(name, /^PUBLIC_|^NEWSLETTER_|^WAITLIST_/, `the build job is given ${name}`);
    }
  });
});

describe('the required checks run on every pull request', () => {
  const REQUIRED = {
    'pr-checks.yml': ['Detect changes', 'Install (lockfile integrity)', 'Lint', 'Type check', 'Tests', 'npm audit (high+)', 'Build (static)', 'Remotion'],
    'tool-privacy.yml': ['No typed value reaches analytics'],
    'tool-mutation.yml': ['Free tools: mutation'],
    'tool-text-size.yml': ['Free tools: text size'],
  };
  // The three free tools workflows skip their jobs for a pull request that
  // changes nothing they read: the job the plan decides, the summary job,
  // what it waits for, and the two tests it makes, in this order.
  const SKIPS = {
    'tool-mutation.yml': {
      job: 'mutation', summary: 'gate', needs: ['plan', 'mutation', 'floors'],
      passes: 'if [ "$PLAN" = "success" ] && [ "$RUN" = "false" ] && [ "$MUTATION" = "skipped" ] && [ "$FLOORS" = "skipped" ]; then',
      fails: 'if [ "$PLAN" != "success" ] || [ "$MUTATION" != "success" ] || [ "$FLOORS" != "success" ]; then',
    },
    'tool-text-size.yml': {
      job: 'text-size', summary: 'gate', needs: ['plan', 'text-size'],
      passes: 'if [ "$PLAN" = "success" ] && [ "$RUN" = "false" ] && [ "$TEXT_SIZE" = "skipped" ]; then',
      fails: 'if [ "$PLAN" != "success" ] || [ "$TEXT_SIZE" != "success" ]; then',
    },
    'tool-privacy.yml': {
      job: 'verify-tool', summary: 'verify', needs: ['plan', 'verify-tool'],
      passes: 'if [ "$PLAN" = "success" ] && [ "$RUN" = "false" ] && [ "$TOOLS" = "skipped" ]; then',
      fails: 'if [ "$PLAN" != "success" ] || [ "$TOOLS" != "success" ]; then',
    },
  };
  it('the workflows that skip are the three check-inputs.mjs knows', () => {
    const known = /export const WORKFLOWS = \[([^\]]*)\]/.exec(read('scripts/lib/checks/check-inputs.mjs'))[1].match(/tool-[\w-]+\.yml/g);
    assert.deepEqual([...known].sort(), Object.keys(SKIPS).sort());
  });
  for (const [file, names] of Object.entries(REQUIRED)) {
    const text = read(join('.github/workflows', file));
    const jobs = text.slice(text.indexOf('\njobs:\n') + 1).split(/\n(?= {2}[a-z][\w-]*:\n)/).slice(1);
    const triggers = text.slice(text.indexOf('\non:\n'), text.indexOf('\npermissions:'));

    it(`${file}: keeps the names branch protection waits for`, () => {
      // A name with a colon in it is quoted in the YAML.
      for (const name of names) assert.ok(jobs.some((job) => job.includes(`\n    name: ${name}\n`) || job.includes(`\n    name: '${name}'\n`)), name);
    });

    it(`${file}: starts on every pull request, with no branch or path selection`, () => {
      assert.match(triggers, /^ {2}pull_request:$/m);
      // The one selection allowed: the mutation run also starts on a merge
      // to main, to keep main's results current (#855). It selects nothing
      // for pull requests.
      const push = "  push:\n    branches: [main]\n";
      assert.equal(triggers.includes(push), file === 'tool-mutation.yml');
      assert.doesNotMatch(triggers.replace(push, ''), /^ +(paths|paths-ignore|branches|branches-ignore):/m);
    });

    it(`${file}: no job is chosen by what changed`, () => {
      for (const job of jobs) {
        const id = job.slice(2, job.indexOf(':'));
        // Not a check: it reports the nightly run (the next describe).
        if (file !== 'pr-checks.yml' && id === 'alert') continue;
        const condition = /\n {4}if: (.*)/.exec(job);
        // The required summary job runs every time: skipped, it would pass.
        // pr-checks.yml's jobs are the required checks themselves; the others
        // gather their jobs into one summary job that is required.
        const required = file !== 'pr-checks.yml' && REQUIRED[file].some((name) => job.includes(`name: ${name}`) || job.includes(`name: '${name}'`));
        // The one exception: each free tools workflow's own jobs, which a
        // pull request that changes nothing they read skips (the plan job
        // decides, and the summary job passes that case only by name, below).
        const allowed = SKIPS[file]?.job === id ? "${{ !cancelled() && needs.plan.outputs.run == 'true' }}" : '${{ !cancelled() }}';
        if (condition) assert.equal(condition[1], required ? '${{ always() }}' : allowed, `job ${id}`);
        else assert.ok(!required, `job ${id}: the required summary job needs if: \${{ always() }}`);
      }
      // The outputs allowed are the plan job's, in the three free tools
      // workflows: `run`, which is 'false' only when a pull request changes
      // nothing the workflow reads (scripts/lib/checks/check-inputs.mjs) and
      // 'true' otherwise, and for mutation the list of shards, read from
      // stryker.shards.json (#846), and the fingerprint its shards' earlier
      // results are kept under.
      let checked = text;
      const skip = SKIPS[file];
      if (skip) {
        const plan = text.slice(text.indexOf('\n  plan:\n'), text.indexOf(`\n  ${skip.job}:\n`));
        assert.ok(plan.startsWith('\n  plan:\n'), 'the plan job comes first, then the job it decides');
        assert.ok(plan.includes(file === 'tool-mutation.yml'
          ? "      run: ${{ steps.inputs.outputs.run || steps.pushed.outputs.run || 'true' }}\n"
          : "      run: ${{ steps.inputs.outputs.run || 'true' }}\n"), 'run defaults to true');
        assert.match(plan, /fetch-depth: 2\n/, 'the base as well, to list what changed');
        assert.match(plan, /import \{ changedPaths, needsRun \} from "\.\/scripts\/lib\/checks\/check-inputs\.mjs"/);
        assert.ok(plan.includes('process.stdout.write(String(needsRun(changedPaths(readFileSync(process.argv[1], "utf8")), process.argv[2])));'));
        // Its own file, and no other: the one workflow file whose change runs it.
        assert.ok(plan.includes(`' "$RUNNER_TEMP/changed" ".github/workflows/${file}") || run=true\n`), 'the workflow names itself');
        assert.match(plan, /if git diff --name-only --no-renames -z HEAD\^1 HEAD > "\$RUNNER_TEMP\/changed"; then/, 'both ends of a move, NUL-separated');
        assert.match(plan, /\[ "\$run" = "false" \] \|\| run=true/, 'anything but a clear false runs');
        assert.match(plan, /\n {8}id: inputs\n {8}if: github\.event_name == 'pull_request'\n/, 'nightly and manual runs always run');
        assert.equal(plan.split('GITHUB_OUTPUT').length - 1, file === 'tool-mutation.yml' ? 4 : 1, 'nothing else writes an output');
        // The job it decides waits for it, and the summary job reads it.
        const decided = jobs.find((job) => job.startsWith(`  ${skip.job}:\n`));
        assert.match(decided, /\n {4}needs: plan\n {4}if: \$\{\{ !cancelled\(\) && needs\.plan\.outputs\.run == 'true' \}\}\n/);
        const summary = jobs.find((job) => job.startsWith(`  ${skip.summary}:\n`));
        assert.ok(summary.includes(`\n    needs: [${skip.needs.join(', ')}]\n    if: \${{ always() }}\n`));
        assert.ok(summary.includes('PLAN: ${{ needs.plan.result }}\n') && summary.includes('RUN: ${{ needs.plan.outputs.run }}\n'));
        // It passes without its jobs only when the plan said so and nothing ran,
        // and that is its only way out before the test every result must pass.
        assert.ok(summary.includes(`          ${skip.passes}\n            echo `), skip.passes);
        assert.equal(summary.split('exit 0').length - 1, 1, 'one way to pass without the jobs');
        assert.ok(summary.includes(`\n          fi\n          ${skip.fails}\n`), skip.fails);
        assert.ok(summary.indexOf(skip.passes) < summary.indexOf(skip.fails));
        assert.match(summary.slice(summary.indexOf(skip.fails)), /^.*\n {12}echo "::error::[^\n]+\n {12}exit 1\n {10}fi\n/);
        checked = text
          .replace('${{ fromJSON(needs.plan.outputs.shards) }}', '')
          .replaceAll('${{ needs.plan.outputs.fingerprint }}', '')
          .replace("${{ !cancelled() && needs.plan.outputs.run == 'true' }}", '')
          .replace('RUN: ${{ needs.plan.outputs.run }}', '')
          .replace(plan, '');
      }
      assert.doesNotMatch(checked, /git diff|GITHUB_OUTPUT"?\s*$[\s\S]*needs\.\w+\.outputs|needs\.\w+\.outputs/m);
    });

    it(`${file}: a manual, a scheduled and a pull request run never cancel one another`, () => {
      assert.match(text, /\n {2}group: [a-z-]+-\$\{\{ github\.event_name \}\}-/);
    });
  }
});

describe('a privacy problem is not left to be noticed', () => {
  const privacy = read('.github/workflows/tool-privacy.yml');
  const alert = privacy.slice(privacy.indexOf('\n  alert:\n'));

  it('a nightly run that failed opens or updates one issue', () => {
    assert.match(privacy, /\n {2}alert:\n/);
    assert.ok(alert.includes('needs: [verify-tool, verify]'));
    assert.ok(alert.includes("if: github.event_name == 'schedule' && (failure() || (!cancelled() && contains(needs.*.result, 'cancelled')))"));
    assert.match(alert, /permissions:\n\s+issues: write/);
    assert.match(alert, /gh issue list --state open --label privacy-check-alert/);
    assert.match(alert, /gh issue comment "\$EXISTING"/);
    assert.match(alert, /gh issue create --title "\$TITLE" --label privacy-check-alert/);
    assert.doesNotMatch(alert, /uses: actions\/checkout|gh run view|--log/);
  });

  it('the changelog guard is part of the Tests job, and fails', () => {
    const checks = read('.github/workflows/pr-checks.yml');
    const tests = checks.slice(checks.indexOf('\n  test:\n'), checks.indexOf('run: npm test'));
    assert.match(tests, /fetch-depth: 2/);
    assert.match(tests, /PRIVACY_NOTICE_BASE: HEAD\^1/);
    assert.ok(testFiles(ROOT).includes('src/utils/privacyNoticeGuard.test.ts'));
    assert.doesNotMatch(read('.github/workflows/deploy.yml'), /Privacy-notice changelog guard/);
  });
});

describe('every workflow', () => {
  const workflows = readdirSync(join(ROOT, '.github/workflows'))
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => [name, read(join('.github/workflows', name))]);

  it('runs each action at one commit, with its release named beside it (#316)', () => {
    // A tag such as v7 can be moved to other code; a commit cannot. The
    // comment is what a person and Dependabot read.
    let seen = 0;
    for (const [name, text] of workflows) {
      for (const [line] of text.matchAll(/^\s*(?:- )?uses:.*$/gm)) {
        seen++;
        assert.match(line, /uses: [\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/, `${name}: ${line.trim()}`);
      }
    }
    assert.ok(seen > 0, 'no action found in any workflow');
  });

  it('gives every job a time limit (#328)', () => {
    // Without one a hung step holds its runner, and a concurrency group that
    // does not cancel, for GitHub's six hours.
    let seen = 0;
    for (const [name, text] of workflows) {
      const jobs = text.slice(text.indexOf('\njobs:\n') + 1).split(/\n(?= {2}[a-z][\w-]*:\n)/).slice(1);
      for (const job of jobs) {
        seen++;
        assert.match(job, /\n {4}timeout-minutes: \d+\n/, `${name}: job ${job.slice(2, job.indexOf(':'))}`);
      }
    }
    assert.ok(seen >= 15, `only ${seen} jobs found: the test no longer reads the workflows`);
  });

  it('installs the Python packages from the pinned file, never by name (#317), each file by its hash', () => {
    for (const [name, text] of workflows) {
      for (const [line] of text.matchAll(/^.*\bpip3? install\b.*$/gm)) {
        assert.match(line, /pip install --require-hashes -r scripts\/requirements\.txt$/, `${name}: ${line.trim()}`);
      }
    }
    const entries = read('scripts/requirements.txt').replace(/\\\n/g, '').split('\n').filter((l) => l !== '' && !l.startsWith('#'));
    assert.ok(entries.length >= 5, 'the packages are listed');
    for (const line of entries) {
      assert.match(line, /^[A-Za-z0-9_.-]+==\d+(\.\d+)+( +--hash=sha256:[0-9a-f]{64})+$/, `scripts/requirements.txt: ${line.slice(0, 120)}`);
    }
  });

  it('leaves the token in a checkout only where a job pushes', () => {
    let seen = 0;
    for (const [name, text] of workflows) {
      const jobs = text.slice(text.indexOf('\njobs:\n') + 1).split(/\n(?= {2}[a-z][\w-]*:\n)/).slice(1);
      for (const job of jobs) {
        for (const step of job.split(/\n(?= {6}- )/).filter((s) => s.includes('uses: actions/checkout@'))) {
          seen++;
          const wanted = /\bgit( -C \S+)? push\b/.test(job.replace(/^\s*#.*$/gm, '')) ? 'true' : 'false';
          assert.match(step, new RegExp(`\\n {10}persist-credentials: ${wanted}(\\n|$)`), `${name}: job ${job.slice(2, job.indexOf(':'))}`);
        }
      }
    }
    assert.ok(seen >= 10, `only ${seen} checkouts found: the test no longer reads the workflows`);
  });
});

describe('the IndexNow job keeps its word when the key file is not reachable (#447)', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const step = (name) => {
    const at = workflow.indexOf(`      - name: ${name}\n`);
    assert.ok(at > 0, `no step "${name}"`);
    const end = workflow.indexOf('\n      - name:', at + 1);
    return workflow.slice(at, end < 0 ? undefined : end);
  };

  it('the key check says how it went', () => {
    const check = step('Verify IndexNow key file is reachable');
    assert.match(check, /\n {8}id: keycheck\n/);
    assert.match(check, /echo "ok=false" >> "\$GITHUB_OUTPUT"\n\s+exit 0\n/);
    assert.match(check, /echo "ok=true" >> "\$GITHUB_OUTPUT"/);
  });

  it('nothing is submitted, and no new baseline is kept, unless the check passed', () => {
    assert.match(step('Submit changed URLs to IndexNow'), /\n {8}if: steps\.keycheck\.outputs\.ok == 'true'\n/);
    for (const name of ['Stage current manifest as next run\'s "previous"', 'Save manifest as cache for next run']) {
      assert.match(step(name), /\n {8}if: always\(\) && steps\.keycheck\.outputs\.ok == 'true'\n/, name);
    }
  });
});

describe('files that only work in one place are in it', () => {
  it('the Bing verification file is served from the site root (#324)', () => {
    // Bing reads it at https://nidhi.today/BingSiteAuth.xml. For six months it
    // sat at the repository root, which the site never serves.
    assert.match(read('public/BingSiteAuth.xml'), /<user>[0-9A-F]{32}<\/user>/);
    assert.ok(!readdirSync(ROOT).includes('BingSiteAuth.xml'), 'a second copy at the repository root does nothing');
  });

  it('the reel script writer names its model once (#333, #472)', () => {
    // A model id stops working on its retirement date. Written in one place,
    // there is one line to change; a dated id (…-20250929) is an old snapshot.
    const id = /claude-(?:opus|sonnet|haiku|fable)-[0-9][\w.-]*/g;
    const found = readdirSync(join(ROOT, 'scripts'), { recursive: true })
      .map(String)
      .filter((name) => /\.(mjs|js|ts|py|sh|md)$/.test(name) && name !== 'repo-hygiene.test.mjs')
      .flatMap((name) => (read(join('scripts', name)).match(id) ?? []).map((model) => `${name}: ${model}`));
    assert.equal(found.length, 1, found.join('\n'));
    assert.match(found[0], /^lib\/media\/llm-script-writer\.mjs: claude-[a-z]+-\d+(-\d+)?$/);
    assert.match(read('scripts/lib/media/llm-script-writer.mjs'), /process\.env\.NIDHI_REEL_MODEL \|\| DEFAULT_REEL_MODEL/);
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

  it('git holds no file that it also ignores (#323)', (t) => {
    // Such a file still shows as modified, while a new file beside it is never
    // offered by `git add`: which ones are versioned becomes an accident.
    const listed = spawnSync('git', ['ls-files', '-ci', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' });
    if (listed.error || listed.status !== 0) return t.skip('not a git checkout');
    assert.deepEqual(listed.stdout.split('\n').filter(Boolean), []);
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
      "steps.load_marker.outcome == 'failure'",
    ]) assert.ok(notify.includes(condition), condition);
    assert.doesNotMatch(notify, /steps\.newsletter\.outcome != 'skipped'/, 'a run that could not start must alert too');
  });

  it('the record of sent lessons is never replaced by the old copy on main (#438)', () => {
    const load = step('load_marker');
    assert.match(load, /git ls-remote --exit-code --heads origin newsletter-state/);
    assert.match(load, /NEWSLETTER_STATE_BOOTSTRAP/, 'a missing branch is allowed only on a first run');
    assert.equal((load.match(/\n\s+exit 1\n/g) ?? []).length, 2, 'a missing branch and an unreadable one both fail');
    assert.match(step('newsletter'), /steps\.load_marker\.outcome == 'success'/, 'nothing is sent without the record');
    assert.doesNotMatch(step('marker'), /2>\/dev\/null; then\n\s+git worktree add --detach "\$STATE" origin\/newsletter-state\n\s+else\n\s+git worktree add --detach "\$STATE" HEAD/);
  });

  it('a run that alerted is red: the last step fails whenever the alert ran', () => {
    const last = workflow.slice(workflow.lastIndexOf('\n      - name:'));
    assert.match(last, /if: always\(\) && steps\.notify\.outcome != 'skipped'/);
    assert.match(last, /\n\s+exit 1\n/);
  });
});

describe('a sign-up form whose script has not run does not put the email into the address', () => {
  // A form with no method is a GET: with JavaScript off, blocked or not yet
  // run, pressing the button reloads the page as /?email=<address>, which
  // lands in the history and in the host's request log.
  const components = readdirSync(join(ROOT, 'src/components'), { recursive: true })
    .filter((name) => /\.(astro|tsx)$/.test(String(name)))
    .map((name) => [String(name), read(join('src/components', String(name)))]);
  const emailForms = components.flatMap(([name, source]) =>
    [...source.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].filter((m) => /type="email"/.test(m[0])).map((m) => [name, m[0], source]));

  it('finds the waitlist form and both newsletter forms', () => {
    assert.deepEqual(emailForms.map(([name]) => name).sort(), ['SubscribeSection.astro', 'SubscribeSection.astro', 'WaitlistSection.astro']);
  });

  it('each one posts, and its component says that signing up needs JavaScript', () => {
    for (const [name, form, source] of emailForms) {
      assert.match(/<form\b[^>]*>/.exec(form)[0], /\smethod="post"/, name);
      assert.match(source, /<noscript><p [^>]*>\{(t|waitlist)\.noScript\}<\/p><\/noscript>/, name);
    }
    const subscribe = components.find(([name]) => name === 'SubscribeSection.astro')[1];
    assert.equal(subscribe.match(/<noscript>/g).length, 2, 'one line for each variant of the newsletter form');
  });
});

describe('npm test finds its files (#791)', () => {
  it('runs every test file in the repository', () => {
    const found = new Set(testFiles(ROOT));
    const named = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
      .stdout.split('\n')
      .filter((f) => /\.test\.(ts|tsx|mjs|js)$/.test(f) && !f.includes('node_modules'));
    assert.ok(named.length > 100, `only ${named.length} test files seen`);
    assert.deepEqual(named.filter((f) => !found.has(f)), []);
  });

  it('is the runner npm test uses', () => {
    assert.equal(JSON.parse(read('package.json')).scripts.test, 'node scripts/run-tests.mjs');
  });
});

describe('the free tools gates cover every tool (#790, #791)', () => {
  // Two workflows, so either can run or be cancelled without the other.
  const gates = read('.github/workflows/tool-mutation.yml');
  const textSize = read('.github/workflows/tool-text-size.yml');
  const matrix = (text, key) => JSON.parse(`[${/\n {8}\w+: \[([^\]]*)\]/.exec(text.slice(text.indexOf(`\n  ${key}:\n`)))[1].split(',').map((v) => `"${v.trim()}"`).join(',')}]`);

  it('is two workflows: mutation and text size, nothing of one in the other', () => {
    assert.ok(!existsSync(join(ROOT, '.github/workflows/tool-gates.yml')), 'tool-gates.yml is split in two');
    assert.doesNotMatch(gates, /audit-text-size/);
    assert.doesNotMatch(textSize, /stryker/i);
  });

  it('mutates every scope stryker.config.mjs knows', () => {
    const config = read('stryker.config.mjs');
    const scopes = [...config.slice(config.indexOf('const SCOPES = {'), config.indexOf('\n};', config.indexOf('const SCOPES = {'))).matchAll(/^ {2}'?([\w-]+)'?: \[/gm)].map((m) => m[1]);
    assert.ok(scopes.length >= 6, `only ${scopes.length} scopes`);
    // The matrix is built from stryker.shards.json (the plan job, #846).
    const shards = JSON.parse(read('stryker.shards.json'));
    assert.deepEqual(Object.keys(shards).sort(), [...scopes].sort());
    for (const [scope, n] of Object.entries(shards)) assert.ok(Number.isInteger(n) && n >= 1 && n <= 8, `${scope}: ${n} shards`);
    assert.match(gates, /readFileSync\("stryker\.shards\.json", "utf8"\)/);
    assert.match(gates, /include: \$\{\{ fromJSON\(needs\.plan\.outputs\.shards\) \}\}/);
  });

  it('measures the text size of every tool the audit knows', () => {
    const tools = JSON.parse(/const TOOLS = (\[[^\]]*\]);/.exec(read('scripts/audit-text-size.mjs'))[1].replace(/'/g, '"'));
    assert.deepEqual([...matrix(textSize, 'text-size')].sort(), [...tools].sort());
  });

  it('holds every scope to its floors, never pooled', () => {
    assert.match(gates, /run: exec node node_modules\/@stryker-mutator\/core\/bin\/stryker\.js run stryker\.config\.mjs\n/);
    assert.match(gates, /STRYKER_SCOPE: \$\{\{ matrix\.scope \}\}/);
    assert.match(gates, /STRYKER_SHARD: \$\{\{ matrix\.shard \}\}\/\$\{\{ matrix\.of \}\}/);
    assert.match(gates, /node scripts\/mutation-floors\.mjs "\$scope" \|\| failed=1/);
    // Each required check waits for every part of its workflow, the floors included.
    assert.match(gates, /\n  gate:\n    name: 'Free tools: mutation'\n    needs: \[plan, mutation, floors\]\n/);
    assert.match(textSize, /\n  gate:\n    name: 'Free tools: text size'\n    needs: \[plan, text-size\]\n/);
    // Pull requests reuse earlier results; the nightly run retests everything.
    // Earlier results are kept only while what a result depends on is the
    // same: the plan job's fingerprint, made once for every shard
    // (scripts/lib/checks/mutation-fingerprint.mjs), not a list written here.
    const fingerprint = 'needs.plan.outputs.fingerprint';
    const planJob = gates.slice(gates.indexOf('\n  plan:\n'), gates.indexOf('\n  mutation:\n'));
    assert.ok(planJob.includes('      fingerprint: ${{ steps.fingerprint.outputs.fingerprint }}\n'));
    assert.match(planJob, /\n {6}- name: [^\n]+\n {8}id: fingerprint\n {8}run: \|\n/, 'on every event, with no condition');
    assert.ok(planJob.includes('git ls-files -z > "$RUNNER_TEMP/tracked"\n'));
    assert.ok(planJob.includes('import { fingerprint, trackedPaths } from "./scripts/lib/checks/mutation-fingerprint.mjs";'));
    assert.ok(planJob.includes('process.stdout.write(fingerprint(trackedPaths(readFileSync(process.argv[1], "utf8")), (path) => readFileSync(path)));'));
    // Nothing but a whole sha256 is handed on; anything else fails the plan, and the gate with it.
    assert.ok(planJob.includes(`          echo "$fingerprint" | grep -Eqx '[0-9a-f]{64}'\n          echo "fingerprint=$fingerprint" >> "$GITHUB_OUTPUT"\n`));
    assert.doesNotMatch(gates, /hashFiles/);
    // Each shard's report holds only its own mutants before it is kept,
    // and neither step runs after a run that failed or was cancelled.
    const shardJob = gates.slice(gates.indexOf('\n  mutation:\n'), gates.indexOf('\n  floors:\n'));
    assert.match(shardJob, /\n {6}- name: Keep only this shard's mutants\n {8}env:\n(?: {10}.*\n)+ {8}run: node scripts\/mutation-shard-report\.mjs\n\n {6}- name: Keep the report\n {8}uses: actions\/upload-artifact@/);
    const base = 'stryker-incremental-${{ matrix.name }}-${{ ' + fingerprint + ' }}-';
    const saved = `${base}\${{ github.sha }}-\${{ github.run_id }}-\${{ github.run_attempt }}`;
    // Restored by the fingerprint alone; saved under a key no other run or
    // attempt has, so a part of a run never stands in the way of a later save.
    assert.ok(shardJob.includes(`        id: earlier\n        uses: actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0\n        with:\n          path: reports/stryker-incremental/\${{ matrix.name }}.json\n          key: ${saved}\n          restore-keys: ${base}\n`));
    assert.equal(shardJob.split('restore-keys:').length - 1, 1);
    // Stryker hears the runner's signal itself (no npx in between), and what
    // it finished is saved whether the run passed, failed or was cancelled:
    // only a file that parses, and only the incremental file, never a report.
    assert.ok(shardJob.indexOf('id: earlier') < shardJob.indexOf('run: exec node node_modules/@stryker-mutator/core/bin/stryker.js'));
    // Between the two: earlier timeouts and errors are taken out of the
    // restored results, since Stryker would hand them on (#855).
    const timeouts = shardJob.indexOf("      - name: Earlier timeouts and errors are tested again\n        env:\n          STRYKER_SCOPE: ${{ matrix.scope }}\n          STRYKER_SHARD: ${{ matrix.shard }}/${{ matrix.of }}\n        run: node scripts/mutation-stale-results.mjs\n");
    assert.ok(shardJob.indexOf('id: earlier') < timeouts && timeouts < shardJob.indexOf('run: exec node node_modules/@stryker-mutator/core/bin/stryker.js'));
    assert.ok(shardJob.indexOf('run: exec node node_modules/@stryker-mutator/core/bin/stryker.js') < shardJob.indexOf('id: kept'));
    assert.match(shardJob, /\n {8}id: kept\n {8}if: \$\{\{ always\(\) \}\}\n {8}env:\n {10}FILE: reports\/stryker-incremental\/\$\{\{ matrix\.name \}\}\.json\n/);
    assert.ok(shardJob.includes(`if [ -s "$FILE" ] && node -e 'const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); if (!r.files || typeof r.files !== "object") process.exit(1);`));
    assert.ok(shardJob.includes(`        if: \${{ always() && steps.kept.outputs.keep == 'true' }}\n        uses: actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0\n        with:\n          path: reports/stryker-incremental/\${{ matrix.name }}.json\n          key: ${saved}\n`));
    assert.equal(shardJob.split('always()').length - 1, 2, 'nothing else runs after a failed or cancelled run');
    assert.doesNotMatch(gates, /uses: actions\/cache@/);
    // Forced on the nightly and the manual run only; a pull request and a
    // merge to main start from earlier results.
    assert.ok(gates.includes("STRYKER_FORCE: ${{ (github.event_name == 'schedule' || github.event_name == 'workflow_dispatch') && '1' || '0' }}\n"));
    // A newer push cancels a pull request's run. A merge to main is in a
    // group of its own: never cancelled, and never replaced while it waits.
    assert.ok(gates.includes("  group: tool-mutation-${{ github.event_name }}-${{ github.event_name == 'push' && github.run_id || github.event.pull_request.number || github.ref }}\n  cancel-in-progress: ${{ github.event_name == 'pull_request' }}\n"));
    // A merge to main: what it changed, from the commit before it; anything unclear runs.
    const pushed = planJob.slice(planJob.indexOf('        id: pushed\n'), planJob.indexOf('      # What a shard'));
    assert.ok(pushed.startsWith("        id: pushed\n        if: github.event_name == 'push'\n        env:\n          BEFORE: ${{ github.event.before }}\n"));
    assert.ok(pushed.includes(`if echo "$BEFORE" | grep -Eqx '[0-9a-f]{40}' && [ "$BEFORE" != "0000000000000000000000000000000000000000" ] \\\n`));
    assert.ok(pushed.includes('&& git fetch --quiet --depth=1 origin "$BEFORE" \\\n            && git diff --name-only --no-renames -z "$BEFORE" HEAD > "$RUNNER_TEMP/changed"; then\n'));
    assert.ok(pushed.includes(`' "$RUNNER_TEMP/changed" ".github/workflows/tool-mutation.yml") || run=true\n`));
    assert.ok(pushed.includes('[ "$run" = "false" ] || run=true\n'));
    assert.match(read('.github/workflows/pr-checks.yml'), /FLOORS_BASE: HEAD\^1/);
  });

  for (const [name, text] of [['mutation', gates], ['text size', textSize]]) {
    it(`a nightly ${name} run that failed opens or updates one issue`, () => {
      const alert = text.slice(text.indexOf('\n  alert:\n'));
      assert.ok(alert.includes("if: github.event_name == 'schedule' && (failure() || (!cancelled() && contains(needs.*.result, 'cancelled')))"));
      assert.match(alert, /gh issue list --state open --label tool-gates-alert/);
    });
  }
});

describe('every install is audited (#791)', () => {
  it('npm-audit.mjs reads every lockfile in the repository', () => {
    const locks = spawnSync('git', ['ls-files', '*package-lock.json'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim().split('\n')
      .map((f) => (f === 'package-lock.json' ? '.' : f.replace(/\/package-lock\.json$/, ''))).sort();
    const listed = /export const INSTALLS = \[([\s\S]*?)\];/.exec(read('scripts/npm-audit.mjs'))[1];
    const dirs = [...listed.matchAll(/dir: '([^']+)'/g)].map((m) => m[1]).sort();
    assert.deepEqual(dirs, locks);
  });
});
