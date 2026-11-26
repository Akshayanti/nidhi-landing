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

// A workflow's jobs, each from its id at two spaces of indent to the next.
const jobsOf = (text) => text.slice(text.indexOf('\njobs:\n') + 1).split(/\n(?= {2}[a-z][\w-]*:\n)/).slice(1);
const jobIdOf = (job) => job.slice(2, job.indexOf(':'));
// A workflow's triggers: the block under `on:`.
const triggersOf = (text) => {
  const rest = text.slice(text.indexOf('\non:\n') + 5);
  return rest.slice(0, rest.search(/^\S/m));
};
const SUITE_FILE = '.github/workflows/tool-suite.yml';
// One suite's jobs in tool-suite.yml: from its plan job to the next suite's
// heading (or the end of the file).
const suiteJobsOf = (suite) => {
  const text = read(SUITE_FILE);
  const start = text.indexOf(`\n  ${suite}-plan:\n`);
  assert.ok(start > 0, `no ${suite}-plan job in ${SUITE_FILE}`);
  const end = text.indexOf('\n  # ====', start);
  return text.slice(start, end === -1 ? undefined : end);
};
const SUITES = ['privacy', 'mutation', 'text-size'];
// The workflow that runs each suite nightly, by hand and (mutation) on a merge to main.
const STANDALONE = { privacy: 'tool-privacy.yml', mutation: 'tool-mutation.yml', 'text-size': 'tool-text-size.yml' };

describe('the required checks run on every pull request, in one workflow, in order', () => {
  const checks = read('.github/workflows/pr-checks.yml');
  const jobs = jobsOf(checks);
  const job = (id) => {
    const found = jobs.find((j) => j.startsWith(`  ${id}:\n`));
    assert.ok(found, `no job ${id} in pr-checks.yml`);
    return found;
  };
  // What branch protection on main waits for, by name, and the one written
  // as required though it is not yet (Free tools: text size, #851).
  const REQUIRED = [
    'Detect changes', 'Install (lockfile integrity)', 'Lint', 'Type check', 'Tests', 'npm audit (high+)',
    'Build (static)', 'Remotion', 'No typed value reaches analytics', 'Free tools: mutation', 'Free tools: text size',
  ];
  const VALIDATION = ['Lint', 'Type check', 'Tests', 'npm audit (high+)', 'Remotion'];
  const legs = () => [...job('validation').matchAll(/\n {10}- name: (.+)\n/g)].map((m) => m[1]);
  // A job's own name (quoted when it holds a colon).
  const nameOf = (text) => /\n {4}name: '?([^'\n]+)'?\n/.exec(text)?.[1];

  it('keeps every name branch protection waits for, as a plain check name, once', () => {
    // The validation legs are one matrix job, named by its leg: exactly
    // these names, no matrix values added.
    assert.ok(job('validation').startsWith('  validation:\n    name: ${{ matrix.name }}\n'));
    assert.deepEqual(legs(), VALIDATION);
    const names = [...jobs.map(nameOf).filter((n) => n && !n.includes('${{')), ...legs()];
    for (const name of REQUIRED) assert.equal(names.filter((n) => n === name).length, 1, name);
  });

  it('is the only workflow a pull request starts, with no branch or path selection', () => {
    for (const name of readdirSync(join(ROOT, '.github/workflows')).filter((n) => /\.ya?ml$/.test(n))) {
      const triggers = triggersOf(read(join('.github/workflows', name)));
      assert.equal(/^ {2}pull_request(_target)?:/m.test(triggers), name === 'pr-checks.yml', name);
    }
    const triggers = triggersOf(checks);
    assert.match(triggers, /^ {2}pull_request:$/m);
    assert.match(triggers, /^ {2}workflow_dispatch:$/m);
    assert.doesNotMatch(triggers, /^ +(paths|paths-ignore|branches|branches-ignore|types):/m);
  });

  it('runs its stages in order, each only after the one before passed', () => {
    assert.deepEqual(jobs.map(jobIdOf), ['changes', 'install', 'validation', 'build', 'tools', 'privacy', 'mutation', 'text-size']);
    assert.doesNotMatch(job('changes'), /\n {4}needs:/);
    for (const [id, needs] of [['install', 'changes'], ['validation', 'install'], ['build', 'validation'], ['tools', 'build']]) {
      assert.match(job(id), new RegExp(`\\n {4}needs: ${needs}\\n`), id);
    }
    // No stage is chosen by what changed: a job skipped by `if:` reports
    // "skipped", which satisfies a required check. Only the three free tools
    // checks have a condition, and it is `always()`.
    for (const j of jobs) {
      const condition = /\n {4}if: (.*)/.exec(j);
      if (['privacy', 'mutation', 'text-size'].includes(jobIdOf(j))) assert.equal(condition?.[1], '${{ always() }}', jobIdOf(j));
      else assert.equal(condition, null, `job ${jobIdOf(j)}`);
    }
    // Nothing is decided from what changed in this workflow.
    assert.doesNotMatch(checks, /git diff|needs\.[\w-]+\.outputs/);
  });

  it('every leg runs only its own steps, with its time limit, folder and lockfile', () => {
    const validation = job('validation');
    assert.match(validation, /\n {4}timeout-minutes: \$\{\{ matrix\.timeout \}\}\n/);
    const include = validation.slice(validation.indexOf('        include:\n'), validation.indexOf('\n    steps:\n'));
    const entries = include.split(/\n(?= {10}- name: )/).slice(1).map((entry) => `${entry}\n`);
    assert.equal(entries.length, VALIDATION.length);
    for (const entry of entries) assert.match(entry, /\n {12}timeout: \d+\n/, entry);
    assert.match(entries.find((e) => e.includes('- name: Tests\n')), /\n {12}fetch-depth: 2\n/);
    assert.match(entries.find((e) => e.includes('- name: Remotion\n')), /\n {12}lockfile: remotion\/package-lock\.json\n/);
    assert.ok(validation.includes('          fetch-depth: ${{ matrix.fetch-depth || 1 }}\n'));
    assert.ok(validation.includes("          cache-dependency-path: ${{ matrix.lockfile || 'package-lock.json' }}\n"));
    // After the checkout and Node, every step names the leg it belongs to.
    const steps = validation.slice(validation.indexOf('\n    steps:\n')).split(/\n(?= {6}- name: )/).slice(1);
    assert.deepEqual(steps.slice(0, 2).map((s) => /- name: (.+)/.exec(s)[1]), ['Checkout', 'Setup Node']);
    for (const step of steps.slice(2)) {
      const leg = /\n {8}if: matrix\.name (==|!=) '([^']+)'\n/.exec(step);
      assert.ok(leg && VALIDATION.includes(leg[2]), step.slice(0, 80));
      // Remotion's steps run in its own folder, and only Remotion's.
      assert.equal(/\n {8}working-directory: remotion\n/.test(step), leg[1] === '==' && leg[2] === 'Remotion', step.slice(0, 80));
    }
    assert.ok(steps.some((s) => s.includes("if: matrix.name == 'Lint'\n        run: npm run lint\n")));
    assert.ok(steps.some((s) => s.includes("if: matrix.name == 'Type check'\n        run: npm run typecheck\n")));
    assert.ok(steps.some((s) => s.includes("if: matrix.name == 'npm audit (high+)'\n")) && validation.includes('run: node scripts/npm-audit.mjs\n'));
    assert.ok(steps.some((s) => s.includes("if: matrix.name == 'Remotion'\n        working-directory: remotion\n        run: npx --no-install tsc --noEmit -p .\n")));
  });

  it('one failure cancels the rest: every matrix is fail-fast on a pull request, and nothing may fail quietly', () => {
    const suites = read(SUITE_FILE);
    // pr-checks.yml: the validation legs and the tool stage.
    assert.equal(checks.split('\n    strategy:\n').length - 1, 2);
    assert.equal(checks.split('\n    strategy:\n').slice(1).filter((s) => /^(?: {6}#.*\n)* {6}fail-fast: true\n/.test(s)).length, 2);
    // tool-suite.yml: each suite's workers, fail-fast on a pull request, and
    // every one reporting nightly and by hand.
    assert.equal(suites.split('\n    strategy:\n').length - 1, 4);
    assert.equal(suites.split("\n      fail-fast: ${{ github.event_name == 'pull_request' }}\n").length - 1, 3);
    // The fourth: mutation-seed, which runs only on a merge to main and only
    // fills a cache (each shard's copy reports on its own).
    assert.ok(suites.includes("  mutation-seed:\n    name: 'Mutation results from the pull request: ${{ matrix.name }}'\n    needs: mutation-plan\n    if: ${{ !cancelled() && needs.mutation-plan.outputs.seed != '' }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    permissions:\n      actions: read\n    strategy:\n      fail-fast: false\n"));
    // A job or step that may fail without failing the run would let a
    // failure through without cancelling anything.
    for (const text of [checks, suites]) assert.doesNotMatch(text, /continue-on-error/);
    // At most this many of each suite's jobs at once, in one run (owner,
    // 2026-11-25): privacy and text size five each, mutation eighteen, which
    // it reaches once the other two have finished.
    for (const [suite, cap] of [['privacy', 5], ['mutation', 18], ['text-size', 5]]) {
      assert.match(suiteJobsOf(suite), new RegExp(`\\n {6}max-parallel: ${cap}\\n`), suite);
    }
  });

  it('the tool stage needs the build, and runs each suite once, under a name that is not a required one', () => {
    const tools = job('tools');
    assert.match(tools, /\n {4}needs: build\n/);
    assert.ok(tools.includes("\n    name: 'Tool stage: ${{ matrix.suite }}'\n"));
    assert.ok(tools.includes('\n        suite: [privacy, mutation, text-size]\n'));
    assert.ok(tools.includes('\n    uses: ./.github/workflows/tool-suite.yml\n    with:\n      suite: ${{ matrix.suite }}\n'));
    // No secrets handed on, and only reading: the code, and on a merge the
    // pull request's runs and artifacts (mutation-plan, mutation-seed).
    assert.doesNotMatch(tools, /secrets/);
    assert.match(tools, new RegExp('\n {4}permissions:\n {6}contents: read\n {6}actions: read\n {6}pull-requests: read\n'));
    assert.equal(tools.split('permissions:').length - 1, 1);
    assert.doesNotMatch(tools, /: write/);
    assert.match(checks, /\npermissions:\n {2}contents: read\n\n/);
  });

  it('the free tools checks pass only when the whole tool stage passed', () => {
    for (const [id, name] of [['privacy', 'No typed value reaches analytics'], ['mutation', "'Free tools: mutation'"], ['text-size', "'Free tools: text size'"]]) {
      const gate = job(id);
      assert.ok(gate.startsWith(`  ${id}:\n    name: ${name}\n    needs: tools\n    if: \${{ always() }}\n`), id);
      assert.ok(gate.includes('          TOOLS: ${{ needs.tools.result }}\n'), id);
      // Success is the one way through: failed, cancelled and skipped all fail.
      assert.match(gate, /\n {10}if \[ "\$TOOLS" != "success" \]; then\n {12}echo "::error::[^\n]+\n {12}exit 1\n {10}fi\n/, id);
      assert.doesNotMatch(gate, /exit 0/, id);
      assert.equal(gate.split('\n      - name:').length - 1, 1, id);
    }
  });

  it('a manual, a scheduled and a pull request run never cancel one another', () => {
    for (const file of ['pr-checks.yml', ...Object.values(STANDALONE)]) {
      assert.match(read(join('.github/workflows', file)), /\n {2}group: [a-z-]+-\$\{\{ github\.event_name \}\}-/, file);
    }
    // The suites have no group of their own: the caller's decides.
    assert.doesNotMatch(read(SUITE_FILE), /concurrency:/);
  });
});

describe('the free tools suites are written once, in tool-suite.yml', () => {
  const suites = read(SUITE_FILE);
  const jobs = jobsOf(suites);
  // For each suite: the job its plan decides, its summary job, what that
  // waits for, and the two tests it makes, in this order.
  const SKIPS = {
    mutation: {
      job: 'mutation-shard', summary: 'mutation-gate', needs: ['mutation-plan', 'mutation-shard', 'mutation-floors', 'mutation-deps-trace'],
      passes: 'if [ "$PLAN" = "success" ] && [ "$RUN" = "false" ] && [ "$MUTATION" = "skipped" ] && [ "$FLOORS" = "skipped" ]; then',
      fails: 'if [ "$PLAN" != "success" ] || [ "$MUTATION" != "success" ] || [ "$FLOORS" != "success" ]; then',
    },
    'text-size': {
      job: 'text-size-tool', summary: 'text-size-gate', needs: ['text-size-plan', 'text-size-tool'],
      passes: 'if [ "$PLAN" = "success" ] && [ "$RUN" = "false" ] && [ "$TEXT_SIZE" = "skipped" ]; then',
      fails: 'if [ "$PLAN" != "success" ] || [ "$TEXT_SIZE" != "success" ]; then',
    },
    privacy: {
      job: 'privacy-tool', summary: 'privacy-gate', needs: ['privacy-plan', 'privacy-tool'],
      passes: 'if [ "$PLAN" = "success" ] && [ "$RUN" = "false" ] && [ "$TOOLS" = "skipped" ]; then',
      fails: 'if [ "$PLAN" != "success" ] || [ "$TOOLS" != "success" ]; then',
    },
  };

  it('is called with a suite, and starts nothing by itself', () => {
    assert.equal(triggersOf(suites), '  workflow_call:\n    inputs:\n      suite:\n        description: \'The suite to run: privacy, mutation or text-size\'\n        required: true\n        type: string\n\n');
  });

  it('fails a suite it does not know, rather than run nothing and pass', () => {
    const known = jobs.find((j) => j.startsWith('  known-suite:\n'));
    assert.ok(known.includes(`\n    if: \${{ !contains(fromJSON('${JSON.stringify(SUITES).replaceAll(',', ', ')}'), inputs.suite) }}\n`));
    assert.match(known, /\n {10}exit 1\n/);
    assert.deepEqual(Object.keys(SKIPS).sort(), [...SUITES].sort());
  });

  it('only reads, holds no secret, and is given none', () => {
    assert.match(suites, /\npermissions:\n {2}contents: read\n\n/);
    assert.doesNotMatch(suites, /secrets\./);
    // Two jobs read more than the code, and only read: the mutation plan (on
    // a merge, which pull request the commit came from, its runs, jobs and
    // artifacts) and the seed (that run's artifacts).
    const granted = [...suites.matchAll(/\n {4}permissions:\n((?: {6}[\w-]+: \w+\n)+)/g)].map((m) => m[1]);
    assert.deepEqual(granted, ['      contents: read\n      actions: read\n      pull-requests: read\n', '      actions: read\n']);
    assert.ok(suites.includes("  mutation-plan:\n    if: inputs.suite == 'mutation'\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    # Read only"));
    assert.doesNotMatch(suites, /: write\b/);
  });

  it('the workflows whose files name the suites are the three check-inputs.mjs knows', () => {
    const known = /export const WORKFLOWS = \[([^\]]*)\]/.exec(read('scripts/lib/checks/check-inputs.mjs'))[1].match(/tool-[\w-]+\.yml/g);
    assert.deepEqual([...known].sort(), Object.values(STANDALONE).sort());
    const shared = /export const SHARED = \[([^\]]*)\]/.exec(read('scripts/lib/checks/check-inputs.mjs'))[1].match(/[\w-]+\.yml/g);
    assert.deepEqual(shared, ['tool-suite.yml', 'pr-checks.yml']);
  });

  it('no job is chosen by what changed, except a suite\'s own jobs by its plan', () => {
    for (const job of jobs) {
      const id = jobIdOf(job);
      const condition = /\n {4}if: (.*)/.exec(job)?.[1];
      const suite = SUITES.find((s) => id.startsWith(`${s}-`));
      if (id === 'known-suite') continue;
      assert.ok(suite, `job ${id} belongs to no suite`);
      const allowed = {
        [`${suite}-plan`]: `inputs.suite == '${suite}'`,
        [SKIPS[suite].job]: `\${{ !cancelled() && needs.${suite}-plan.outputs.run == 'true' }}`,
        // Its summary runs every time its suite is asked for: skipped, it would pass.
        [SKIPS[suite].summary]: `\${{ always() && inputs.suite == '${suite}' }}`,
      };
      // The floors need the shards, so they are skipped with them; the seed
      // runs only when the plan names a run to take results from.
      if (id === 'mutation-floors') assert.equal(condition, undefined);
      else if (id === 'mutation-seed') assert.equal(condition, "${{ !cancelled() && needs.mutation-plan.outputs.seed != '' }}");
      // The trace of what each test reaches runs nightly and by hand (#891),
      // and on a pull request whose plan says it changes the analysis or the trace.
      else if (id === 'mutation-deps-trace') assert.equal(condition, "${{ !cancelled() && inputs.suite == 'mutation' && (github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' || needs.mutation-plan.outputs.trace == 'true') }}");
      else assert.equal(condition, allowed[id], `job ${id}`);
    }
  });

  for (const [suite, skip] of Object.entries(SKIPS)) {
    it(`${suite}: skips its jobs only for a pull request that changes nothing it reads, and says so`, () => {
      const plan = suites.slice(suites.indexOf(`\n  ${suite}-plan:\n`), suites.indexOf(`\n  ${skip.job}:\n`));
      assert.ok(plan.startsWith(`\n  ${suite}-plan:\n    if: inputs.suite == '${suite}'\n`), 'the plan job comes first, then the job it decides');
      // `run` is 'false' only when a pull request (or, for mutation, a
      // merge) changes nothing the suite reads (scripts/lib/checks/check-inputs.mjs)
      // and 'true' otherwise.
      assert.ok(plan.includes(suite === 'mutation'
        ? "      run: ${{ steps.reuse.outputs.run || steps.inputs.outputs.run || steps.pushed.outputs.run || 'true' }}\n"
        : "      run: ${{ steps.inputs.outputs.run || 'true' }}\n"), 'run defaults to true');
      assert.match(plan, /fetch-depth: 2\n/, 'the base as well, to list what changed');
      assert.match(plan, /import \{ changedPaths, needsRun \} from "\.\/scripts\/lib\/checks\/check-inputs\.mjs"/);
      assert.ok(plan.includes('process.stdout.write(String(needsRun(changedPaths(readFileSync(process.argv[1], "utf8")), process.argv[2])));'));
      // Its own workflow's file, and no other.
      const named = [...plan.matchAll(/' "\$RUNNER_TEMP\/changed" "([^"]+)"\) \|\| run=true\n/g)].map((m) => m[1]);
      assert.deepEqual([...new Set(named)], [`.github/workflows/${STANDALONE[suite]}`], 'the suite names its own workflow');
      assert.match(plan, /if git diff --name-only --no-renames -z HEAD\^1 HEAD > "\$RUNNER_TEMP\/changed"; then/, 'both ends of a move, NUL-separated');
      assert.match(plan, /\[ "\$run" = "false" \] \|\| run=true/, 'anything but a clear false runs');
      // github.event_name is the caller's: pull_request only in PR Checks'
      // run of a pull request. Nightly and manual runs always run.
      assert.match(plan, /\n {8}id: inputs\n {8}if: github\.event_name == 'pull_request'\n/, 'nightly and manual runs always run');
      // Mutation also writes the fingerprint, the shards, the note's name,
      // whether the trace runs (#891) and, on a merge whose pull request's
      // run counts, run=false and seed.
      assert.equal(plan.split('GITHUB_OUTPUT').length - 1, suite === 'mutation' ? 7 : 1, 'nothing else writes an output');
      if (suite === 'mutation') {
        // The trace runs on a pull request only when it changes the analysis, the hook or the trace script.
        assert.ok(plan.includes("        id: trace\n        if: github.event_name == 'pull_request'\n"));
        // The three paths named to git diff, not a pattern: scripts-index.test.mjs checks every path a run line names exists.
        assert.ok(plan.includes("git diff --name-only --no-renames HEAD^1 HEAD -- scripts/lib/checks/mutation-deps.mjs scripts/lib/checks/trace-deps-hook.mjs scripts/check-mutation-deps.mjs | grep -q .; then trace=true; fi\n"));
      }
      if (suite === 'mutation') {
        assert.ok(plan.includes("        id: reuse\n        if: github.event_name == 'push' && steps.pushed.outputs.run != 'false'\n"), 'reuse only on a merge that changed what mutation reads');
        assert.ok(plan.includes('if (answer.reuse) appendFileSync(process.env.GITHUB_OUTPUT, `run=false\\nseed=${answer.runId}\\n`);'), 'run=false only with a run to seed from');
        assert.ok(plan.includes('import { decideReuse } from "./scripts/lib/checks/mutation-reuse.mjs";'));
      }
      // The job it decides waits for it, and the summary job reads it.
      const decided = jobs.find((job) => job.startsWith(`  ${skip.job}:\n`));
      assert.ok(decided.includes(`\n    needs: ${suite}-plan\n    if: \${{ !cancelled() && needs.${suite}-plan.outputs.run == 'true' }}\n`));
      const summary = jobs.find((job) => job.startsWith(`  ${skip.summary}:\n`));
      assert.ok(summary.includes(`\n    needs: [${skip.needs.join(', ')}]\n    if: \${{ always() && inputs.suite == '${suite}' }}\n`));
      assert.ok(summary.includes(`PLAN: \${{ needs.${suite}-plan.result }}\n`) && summary.includes(`RUN: \${{ needs.${suite}-plan.outputs.run }}\n`));
      // It passes without its jobs only when the plan said so and nothing ran,
      // and that is its only way out before the test every result must pass.
      assert.ok(summary.includes(`          ${skip.passes}\n            echo `), skip.passes);
      assert.equal(summary.split('exit 0').length - 1, 1, 'one way to pass without the jobs');
      assert.ok(summary.includes(`\n          fi\n          ${skip.fails}\n`), skip.fails);
      assert.ok(summary.indexOf(skip.passes) < summary.indexOf(skip.fails));
      assert.match(summary.slice(summary.indexOf(skip.fails)), /^.*\n {12}echo "::error::[^\n]+\n {12}exit 1\n {10}fi\n/);
    });
  }

  it('reads a plan\'s outputs only where the plan decides', () => {
    // The outputs allowed: each plan's `run`, and for mutation the list of
    // shards, read from stryker.shards.json (#846), and the fingerprint its
    // shards' earlier results are kept under.
    // The seed job reads which run to take results from.
    let checked = suites
      .replace("if: ${{ !cancelled() && needs.mutation-plan.outputs.seed != '' }}", '')
      .replaceAll('${{ needs.mutation-plan.outputs.seed }}', '')
      .replace('${{ fromJSON(needs.mutation-plan.outputs.shards) }}', '')
      .replace('${{ fromJSON(needs.mutation-plan.outputs.shards) }}', '')
      .replaceAll('${{ needs.mutation-plan.outputs.fingerprint }}', '')
      // The trace job (#891) runs when the plan says the analysis changed.
      .replace("|| needs.mutation-plan.outputs.trace == 'true')", ')');
    for (const suite of SUITES) {
      checked = checked
        .replace(`\${{ !cancelled() && needs.${suite}-plan.outputs.run == 'true' }}`, '')
        .replace(`RUN: \${{ needs.${suite}-plan.outputs.run }}`, '')
        .replace(suites.slice(suites.indexOf(`\n  ${suite}-plan:\n`), suites.indexOf(`\n  ${SKIPS[suite].job}:\n`)), '');
    }
    assert.doesNotMatch(checked, /git diff|needs\.[\w-]+\.outputs/);
  });

  for (const [suite, file] of Object.entries(STANDALONE)) {
    it(`${file}: runs the ${suite} suite nightly and by hand, and alerts on a nightly failure`, () => {
      const text = read(join('.github/workflows', file));
      const own = jobsOf(text);
      assert.deepEqual(own.map(jobIdOf), [suite, 'alert']);
      assert.ok(own[0].includes(`\n    uses: ./.github/workflows/tool-suite.yml\n    with:\n      suite: ${suite}\n`));
      // No secrets, and only reading (the suite's mutation jobs read, on a
      // merge, the pull request's runs and artifacts).
      assert.doesNotMatch(own[0], /secrets|: write/);
      assert.match(own[0], new RegExp('\n {4}permissions:\n {6}contents: read\n {6}actions: read\n {6}pull-requests: read\n'));
      assert.equal(own[0].split('permissions:').length - 1, 1);
      assert.match(text, /\npermissions:\n {2}contents: read\n\n/);
      const triggers = triggersOf(text);
      assert.match(triggers, /^ {2}schedule:$/m);
      assert.match(triggers, /^ {2}workflow_dispatch:$/m);
      // The one more: the mutation run on every merge to main, to keep main's
      // results current (#855).
      const push = '  push:\n    branches: [main]\n';
      assert.equal(triggers.includes(push), file === 'tool-mutation.yml');
      assert.doesNotMatch(triggers.replace(push, ''), /^ +(paths|paths-ignore|branches|branches-ignore):/m);
    });
  }
});

describe('a privacy problem is not left to be noticed', () => {
  const privacy = read('.github/workflows/tool-privacy.yml');
  const alert = privacy.slice(privacy.indexOf('\n  alert:\n'));

  it('a nightly run that failed opens or updates one issue', () => {
    assert.match(privacy, /\n {2}alert:\n/);
    assert.ok(alert.includes('needs: [privacy]'));
    assert.ok(alert.includes("if: github.event_name == 'schedule' && (failure() || (!cancelled() && contains(needs.*.result, 'cancelled')))"));
    assert.match(alert, /permissions:\n\s+issues: write/);
    assert.match(alert, /gh issue list --state open --label privacy-check-alert/);
    assert.match(alert, /gh issue comment "\$EXISTING"/);
    assert.match(alert, /gh issue create --title "\$TITLE" --label privacy-check-alert/);
    assert.doesNotMatch(alert, /uses: actions\/checkout|gh run view|--log/);
  });

  it('the changelog guard is part of the Tests leg, and fails', () => {
    const checks = read('.github/workflows/pr-checks.yml');
    const validation = checks.slice(checks.indexOf('\n  validation:\n'), checks.indexOf('\n  build:\n'));
    assert.match(validation, /\n {10}- name: Tests\n(?: {12}.*\n| {12}#.*\n)* {12}fetch-depth: 2\n/);
    const tests = validation.slice(validation.indexOf('      - name: Run tests\n'), validation.indexOf('run: npm test'));
    assert.match(tests, /\n {8}if: matrix\.name == 'Tests'\n/);
    assert.match(tests, /PRIVACY_NOTICE_BASE: HEAD\^1/);
    assert.ok(testFiles(ROOT).includes('src/utils/privacyNoticeGuard.test.ts'));
    assert.doesNotMatch(read('.github/workflows/deploy.yml'), /Privacy-notice changelog guard/);
  });
});

describe('every workflow', () => {
  const workflows = readdirSync(join(ROOT, '.github/workflows'))
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => [name, read(join('.github/workflows', name))]);
  // A job that calls a workflow of this repository.
  const CALL = /\n {4}uses: \.\/\.github\/workflows\/([\w-]+\.yml)\n/;

  it('runs each action at one commit, with its release named beside it (#316)', () => {
    // A tag such as v7 can be moved to other code; a commit cannot. The
    // comment is what a person and Dependabot read. A workflow of this
    // repository is called by its path: it is in the same commit.
    let seen = 0;
    for (const [name, text] of workflows) {
      for (const [line] of text.matchAll(/^\s*(?:- )?uses:.*$/gm)) {
        seen++;
        const local = /^ {4}uses: \.\/\.github\/workflows\/([\w-]+\.yml)$/.exec(line);
        if (local) assert.ok(existsSync(join(ROOT, '.github/workflows', local[1])), `${name}: ${line.trim()}`);
        else assert.match(line, /uses: [\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/, `${name}: ${line.trim()}`);
      }
    }
    assert.ok(seen > 0, 'no action found in any workflow');
  });

  it('gives every job a time limit (#328)', () => {
    // Without one a hung step holds its runner, and a concurrency group that
    // does not cancel, for GitHub's six hours. A job that calls another
    // workflow runs no steps and GitHub refuses a limit on it: every job of
    // the workflow it calls has one.
    let seen = 0;
    for (const [name, text] of workflows) {
      for (const job of jobsOf(text)) {
        seen++;
        const id = `${name}: job ${jobIdOf(job)}`;
        const call = CALL.exec(job);
        if (call) {
          assert.doesNotMatch(job, /\n {4}(timeout-minutes|runs-on|steps):/, id);
          assert.ok(workflows.some(([other]) => other === call[1]), id);
          continue;
        }
        const limit = /\n {4}timeout-minutes: (\d+|\$\{\{ matrix\.timeout \}\})\n/.exec(job);
        assert.ok(limit, id);
        if (limit[1].startsWith('$')) {
          // Each leg names its own limit.
          const legs = job.split(/\n {10}- name: /).length - 1;
          assert.ok(legs > 0 && job.split(/\n {12}timeout: \d+\n/).length - 1 === legs, id);
        }
      }
    }
    assert.ok(seen >= 15, `only ${seen} jobs found: the test no longer reads the workflows`);
  });

  it('installs the Python packages from the pinned file, never by name (#317), each file by its hash', () => {
    for (const [name, text] of workflows) {
      for (const [line] of text.matchAll(/^.*\bpip3? install\b.*$/gm)) {
        assert.match(line, /^\s+python -m pip install --require-hashes -r scripts\/requirements(-pip)?\.txt$/, `${name}: ${line.trim()}`);
      }
    }
    const entries = read('scripts/requirements.txt').replace(/\\\n/g, '').split('\n').filter((l) => l !== '' && !l.startsWith('#'));
    assert.ok(entries.length >= 5, 'the packages are listed');
    for (const line of entries) {
      assert.match(line, /^[A-Za-z0-9_.-]+==\d+(\.\d+)+( +--hash=sha256:[0-9a-f]{64})+$/, `scripts/requirements.txt: ${line.slice(0, 120)}`);
    }
  });

  it('runs Python at the one version in .python-version, never at a version written in a workflow', () => {
    assert.match(read('.python-version'), /^\d+\.\d+\.\d+\n$/);
    let seen = 0;
    for (const [name, text] of workflows) {
      assert.doesNotMatch(text, /^\s*python-version:/m, name);
      for (const job of jobsOf(text)) {
        for (const step of job.split(/\n(?= {6}- )/).filter((s) => s.includes('uses: actions/setup-python@'))) {
          seen++;
          assert.match(step, /\n {10}python-version-file: \.python-version(\n|$)/, `${name}: job ${jobIdOf(job)}`);
        }
      }
    }
    assert.ok(seen >= 2, `only ${seen} Python setups found: the test no longer reads the workflows`);
  });

  it('installs the pinned pip first, by its hash, wherever Python is set up', () => {
    const entries = read('scripts/requirements-pip.txt').replace(/\\\n/g, '').split('\n').filter((l) => l !== '' && !l.startsWith('#'));
    assert.equal(entries.length, 1, 'pip and nothing else');
    assert.match(entries[0], /^pip==\d+(\.\d+)+( +--hash=sha256:[0-9a-f]{64})+$/);
    let seen = 0;
    for (const [name, text] of workflows) {
      for (const job of jobsOf(text).filter((j) => j.includes('uses: actions/setup-python@'))) {
        seen++;
        const id = `${name}: job ${jobIdOf(job)}`;
        const installs = [...job.slice(job.indexOf('uses: actions/setup-python@')).matchAll(/\bpip install --require-hashes -r (scripts\/requirements(?:-pip)?\.txt)$/gm)].map((m) => m[1]);
        assert.deepEqual(installs, ['scripts/requirements-pip.txt', 'scripts/requirements.txt'], id);
        assert.ok(!job.slice(0, job.indexOf('uses: actions/setup-python@')).includes('pip install'), `${id}: nothing is installed before Python is set up`);
      }
    }
    assert.ok(seen >= 2, `only ${seen} jobs with Python found`);
  });

  it('leaves the token in a checkout only where a job pushes', () => {
    let seen = 0;
    for (const [name, text] of workflows) {
      for (const job of jobsOf(text)) {
        for (const step of job.split(/\n(?= {6}- )/).filter((s) => s.includes('uses: actions/checkout@'))) {
          seen++;
          const wanted = /\bgit( -C \S+)? push\b/.test(job.replace(/^\s*#.*$/gm, '')) ? 'true' : 'false';
          assert.match(step, new RegExp(`\\n {10}persist-credentials: ${wanted}(\\n|$)`), `${name}: job ${jobIdOf(job)}`);
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
  // Each suite's jobs, from tool-suite.yml.
  const gates = suiteJobsOf('mutation');
  const textSize = suiteJobsOf('text-size');
  const privacy = suiteJobsOf('privacy');
  const matrix = (text, key) => JSON.parse(`[${/\n {8}\w+: \[([^\]]*)\]/.exec(text.slice(text.indexOf(`\n  ${key}:\n`)))[1].split(',').map((v) => `"${v.trim()}"`).join(',')}]`);

  it('is three suites, nothing of one in another', () => {
    assert.ok(!existsSync(join(ROOT, '.github/workflows/tool-gates.yml')), 'tool-gates.yml is split in two');
    assert.doesNotMatch(gates, /audit-text-size|verify-tool-privacy/);
    assert.doesNotMatch(textSize, /stryker|verify-tool-privacy/i);
    assert.doesNotMatch(privacy, /stryker|audit-text-size/i);
    // The jobs live in tool-suite.yml alone: the workflows that call it run none of their own.
    for (const file of Object.values(STANDALONE)) {
      assert.doesNotMatch(read(join('.github/workflows', file)).replace(/^\s*#.*$/gm, ''), /stryker|audit-text-size|verify-tool-privacy/i, file);
    }
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
    assert.match(gates, /include: \$\{\{ fromJSON\(needs\.mutation-plan\.outputs\.shards\) \}\}/);
  });

  it('measures the text size of every tool the audit knows', () => {
    const tools = JSON.parse(/const TOOLS = (\[[^\]]*\]);/.exec(read('scripts/audit-text-size.mjs'))[1].replace(/'/g, '"'));
    assert.deepEqual([...matrix(textSize, 'text-size-tool')].sort(), [...tools].sort());
  });

  it('holds every scope to its floors, never pooled', () => {
    assert.match(gates, /run: exec node node_modules\/@stryker-mutator\/core\/bin\/stryker\.js run stryker\.config\.mjs\n/);
    assert.match(gates, /STRYKER_SCOPE: \$\{\{ matrix\.scope \}\}/);
    assert.match(gates, /STRYKER_SHARD: \$\{\{ matrix\.shard \}\}\/\$\{\{ matrix\.of \}\}/);
    assert.match(gates, /node scripts\/mutation-floors\.mjs "\$scope" \|\| failed=1/);
    // Each suite's result waits for every part of it, the floors included.
    assert.match(gates, /\n  mutation-gate:\n    name: 'Free tools: mutation'\n    needs: \[mutation-plan, mutation-shard, mutation-floors, mutation-deps-trace\]\n/);
    assert.match(textSize, /\n  text-size-gate:\n    name: 'Free tools: text size'\n    needs: \[text-size-plan, text-size-tool\]\n/);
    assert.match(gates, /\n  mutation-floors:\n    needs: mutation-shard\n/);
    // The floors read the shards' reports by their prefix, and no other
    // suite's artifact has it: all three suites run in one PR Checks run.
    assert.match(gates, /\n {10}pattern: mutation-\*\n/);
    assert.ok(gates.includes('          name: mutation-${{ matrix.name }}\n'));
    for (const [, name] of read(SUITE_FILE).matchAll(/uses: actions\/upload-artifact@[^\n]+\n {8}with:\n {10}name: (\S+)\n/g)) {
      assert.ok(name === 'mutation-${{ matrix.name }}' || !name.startsWith('mutation-'), name);
    }
    // Pull requests reuse earlier results; the nightly run retests everything.
    // Earlier results are kept only while what a result depends on is the
    // same: the plan job's fingerprint, made once for every shard
    // (scripts/lib/checks/mutation-fingerprint.mjs), not a list written here.
    const fingerprint = 'needs.mutation-plan.outputs.fingerprint';
    const planJob = gates.slice(gates.indexOf('\n  mutation-plan:\n'), gates.indexOf('\n  mutation-shard:\n'));
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
    const shardJob = gates.slice(gates.indexOf('\n  mutation-shard:\n'), gates.indexOf('\n  mutation-floors:\n'));
    assert.match(shardJob, /\n {6}- name: Keep only this shard's mutants\n {8}env:\n(?: {10}.*\n)+ {8}run: node scripts\/mutation-shard-report\.mjs\n\n(?: {6}#.*\n)* {6}- name: Keep the report\n {8}uses: actions\/upload-artifact@/);
    const base = 'stryker-incremental-${{ matrix.name }}-${{ ' + fingerprint + ' }}-';
    // The caller's run id and attempt (a called workflow sees the caller's):
    // no other run or attempt has the key.
    const saved = `${base}\${{ github.sha }}-\${{ github.run_id }}-\${{ github.run_attempt }}`;
    // Restored by the fingerprint alone; saved under a key no other run or
    // attempt has, so a part of a run never stands in the way of a later save.
    assert.ok(shardJob.includes(`        id: earlier\n        uses: actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0\n        with:\n          path: |\n            reports/stryker-incremental/\${{ matrix.name }}.json\n            reports/stryker-incremental/\${{ matrix.name }}.deps.json\n          key: ${saved}\n          restore-keys: ${base}\n`));
    assert.equal(shardJob.split('restore-keys:').length - 1, 1);
    // Stryker hears the runner's signal itself (no npx in between), and what
    // it finished is saved whether the run passed, failed or was cancelled:
    // only a file that parses, and only the incremental file, never a report.
    const stryker = 'run: exec node node_modules/@stryker-mutator/core/bin/stryker.js run stryker.config.mjs\n';
    const first = shardJob.indexOf(stryker);
    assert.ok(shardJob.indexOf('id: earlier') < first);
    // Between the two: earlier timeouts and errors are taken out of the
    // restored results, since Stryker would hand them on (#855), and the
    // restored test files are noted for the recheck (#854). The step is told
    // of a forced run in the words the Stryker steps are.
    const force = "          STRYKER_FORCE: ${{ (github.event_name == 'schedule' || github.event_name == 'workflow_dispatch') && '1' || '0' }}\n";
    const timeouts = shardJob.indexOf(`      - name: Earlier timeouts and errors are tested again\n        env:\n          STRYKER_SCOPE: \${{ matrix.scope }}\n          STRYKER_SHARD: \${{ matrix.shard }}/\${{ matrix.of }}\n${force}        run: node scripts/mutation-stale-results.mjs\n`);
    assert.ok(shardJob.indexOf('id: earlier') < timeouts && timeouts < first);
    // After the first run, whatever became of it: the kills a new or edited
    // test file covers are taken out of the results (#854).
    const recheck = shardJob.indexOf("      - name: Kills a new or edited test covers are taken out, to be tested again\n        id: recheck\n        if: ${{ always() }}\n        env:\n          STRYKER_SCOPE: ${{ matrix.scope }}\n          STRYKER_SHARD: ${{ matrix.shard }}/${{ matrix.of }}\n        run: node scripts/mutation-recheck.mjs\n");
    assert.ok(first < recheck);
    // Then the second run, only when the first passed and kills were taken
    // out: Stryker twice and no more, the same command with the same settings.
    const second = shardJob.indexOf(stryker, first + 1);
    const again = shardJob.indexOf("      - name: Mutation testing of ${{ matrix.name }}, again for the kills taken out\n        if: ${{ success() && steps.recheck.outputs.selected != '0' }}\n        env:\n");
    assert.ok(recheck < again && again < second);
    assert.equal(shardJob.split(stryker).length - 1, 2);
    const settings = (run) => /\n {8}env:\n((?: {10}.*\n)+)(?: {8}#.*\n)* {8}$/.exec(shardJob.slice(0, run))[1];
    assert.equal(settings(second), settings(first));
    assert.ok(settings(first).includes(force) && settings(first).split('\n').length - 1 === 7);
    assert.equal(shardJob.split(force).length - 1, 3, 'the note, the first run and the second');
    // Nothing is saved before the recheck, nor without it: the two saving
    // steps come after both runs and wait for the output the recheck sets last.
    const kept = shardJob.indexOf('id: kept');
    assert.ok(second < kept);
    assert.match(shardJob, /\n {8}id: kept\n {8}if: \$\{\{ always\(\) && steps\.recheck\.outputs\.checked == 'true' \}\}\n {8}env:\n {10}FILE: reports\/stryker-incremental\/\$\{\{ matrix\.name \}\}\.json\n/);
    assert.ok(shardJob.includes(`if [ -s "$FILE" ] && [ -s "\${FILE%.json}.deps.json" ] && node -e 'const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); if (!r.files || typeof r.files !== "object") process.exit(1);`));
    const save = shardJob.indexOf(`        if: \${{ always() && steps.kept.outputs.keep == 'true' }}\n        uses: actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0\n        with:\n          path: |\n            reports/stryker-incremental/\${{ matrix.name }}.json\n            reports/stryker-incremental/\${{ matrix.name }}.deps.json\n          key: ${saved}\n`);
    assert.ok(kept < save);
    assert.equal(shardJob.split('uses: actions/cache/save@').length - 1, 1, 'one save, after the recheck');
    // On a pull request, the same results as an artifact too, for the merge
    // to main, under the same condition as the save, right after it.
    const merge = shardJob.indexOf("      - name: Keep the results for the merge\n        if: ${{ always() && steps.kept.outputs.keep == 'true' && github.event_name == 'pull_request' }}\n        uses: actions/upload-artifact@");
    assert.ok(save < merge && merge < shardJob.indexOf("Keep only this shard's mutants"));
    assert.ok(shardJob.includes('          name: stryker-incremental-${{ matrix.name }}\n          path: |\n            reports/stryker-incremental/${{ matrix.name }}.json\n            reports/stryker-incremental/${{ matrix.name }}.deps.json\n'));
    assert.match(read('scripts/mutation-recheck.mjs'), /\nif \(process\.env\.GITHUB_OUTPUT\) appendFileSync\(process\.env\.GITHUB_OUTPUT, `checked=true\\nselected=\$\{selected\}\\n`\);\n$/, 'the outputs are set last');
    // Three steps run after a failed or cancelled run, in this order: the
    // recheck, then the two that save.
    const always = [...shardJob.matchAll(/always\(\)/g)].map((m) => m.index);
    assert.equal(always.length, 4, 'nothing else runs after a failed or cancelled run');
    assert.ok(recheck < always[0] && always[0] < again && again < always[1] && always[1] < save && save < always[2] && always[2] < merge && merge < always[3]);
    // The note of the test files is beside the results, never saved with
    // them; the dependency fingerprints (#891) always are.
    assert.equal(shardJob.split('path: |\n            reports/stryker-incremental/${{ matrix.name }}.json\n            reports/stryker-incremental/${{ matrix.name }}.deps.json\n          ').length - 1, 3, 'restored, saved and kept for the merge: the results and their fingerprints');
    assert.doesNotMatch(shardJob, /before\.json/);
    assert.doesNotMatch(gates, /uses: actions\/cache@/);
    // Forced on the nightly and the manual run only; a pull request and a
    // merge to main start from earlier results.
    assert.ok(gates.includes("STRYKER_FORCE: ${{ (github.event_name == 'schedule' || github.event_name == 'workflow_dispatch') && '1' || '0' }}\n"));
    // A merge to main is in a group of its own: never cancelled, and never
    // replaced while it waits.
    assert.ok(read('.github/workflows/tool-mutation.yml').includes("  group: tool-mutation-${{ github.event_name }}-${{ github.event_name == 'push' && github.run_id || github.event.pull_request.number || github.ref }}\n  cancel-in-progress: ${{ github.event_name == 'pull_request' }}\n"));
    // A merge to main: what it changed, from the commit before it; anything unclear runs.
    const pushed = planJob.slice(planJob.indexOf('        id: pushed\n'), planJob.indexOf('      # What a shard'));
    assert.ok(pushed.startsWith("        id: pushed\n        if: github.event_name == 'push'\n        env:\n          BEFORE: ${{ github.event.before }}\n"));
    assert.ok(pushed.includes(`if echo "$BEFORE" | grep -Eqx '[0-9a-f]{40}' && [ "$BEFORE" != "0000000000000000000000000000000000000000" ] \\\n`));
    assert.ok(pushed.includes('&& git fetch --quiet --depth=1 origin "$BEFORE" \\\n            && git diff --name-only --no-renames -z "$BEFORE" HEAD > "$RUNNER_TEMP/changed"; then\n'));
    assert.ok(pushed.includes(`' "$RUNNER_TEMP/changed" ".github/workflows/tool-mutation.yml") || run=true\n`));
    assert.ok(pushed.includes('[ "$run" = "false" ] || run=true\n'));
    assert.match(read('.github/workflows/pr-checks.yml'), /FLOORS_BASE: HEAD\^1/);
  });

  for (const [name, file] of [['mutation', 'tool-mutation.yml'], ['text size', 'tool-text-size.yml']]) {
    it(`a nightly ${name} run that failed opens or updates one issue`, () => {
      const text = read(join('.github/workflows', file));
      const alert = text.slice(text.indexOf('\n  alert:\n'));
      assert.ok(alert.includes(`needs: [${name.replace(' ', '-')}]`));
      assert.ok(alert.includes("if: github.event_name == 'schedule' && (failure() || (!cancelled() && contains(needs.*.result, 'cancelled')))"));
      assert.match(alert, /permissions:\n\s+issues: write/);
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
