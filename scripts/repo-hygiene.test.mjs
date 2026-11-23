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
      assert.doesNotMatch(triggers, /^ +(paths|paths-ignore|branches|branches-ignore):/m);
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
        if (condition) assert.equal(condition[1], required ? '${{ always() }}' : '${{ !cancelled() }}', `job ${id}`);
        else assert.ok(!required, `job ${id}: the required summary job needs if: \${{ always() }}`);
      }
      // One output is allowed: the free tools gates' list of mutation shards,
      // read from stryker.shards.json and never from what changed (#846).
      let checked = text;
      if (file === 'tool-mutation.yml') {
        const plan = text.slice(text.indexOf('\n  plan:\n'), text.indexOf('\n  mutation:\n'));
        assert.doesNotMatch(plan, /git |github\.event\.pull_request|changed/, 'the plan job reads stryker.shards.json only');
        checked = text.replace('${{ fromJSON(needs.plan.outputs.shards) }}', '');
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
    assert.match(gates, /npx stryker run stryker\.config\.mjs\n/);
    assert.match(gates, /STRYKER_SCOPE: \$\{\{ matrix\.scope \}\}/);
    assert.match(gates, /STRYKER_SHARD: \$\{\{ matrix\.shard \}\}\/\$\{\{ matrix\.of \}\}/);
    assert.match(gates, /node scripts\/mutation-floors\.mjs "\$scope" \|\| failed=1/);
    // Each required check waits for every part of its workflow, the floors included.
    assert.match(gates, /\n  gate:\n    name: 'Free tools: mutation'\n    needs: \[plan, mutation, floors\]\n/);
    assert.match(textSize, /\n  gate:\n    name: 'Free tools: text size'\n    needs: \[text-size\]\n/);
    // Pull requests reuse earlier results; the nightly run retests everything.
    // Earlier results are kept only while what the tests run on is the same.
    const fingerprint = "hashFiles('package-lock.json', 'stryker.config.mjs', 'stryker.shards.json', 'stryker.shard-weights.json', '.nvmrc', 'test/**', 'src/**', '!src/content/**')";
    // Each shard's report holds only its own mutants before it is kept.
    assert.match(gates, /run: npx stryker run stryker\.config\.mjs\n\n(?:.*\n)*? {8}run: node scripts\/mutation-shard-report\.mjs\n\n {6}- name: Keep the report/);
    assert.ok(gates.includes(`key: stryker-incremental-\${{ matrix.name }}-\${{ ${fingerprint} }}-\${{ github.sha }}`));
    assert.ok(gates.includes(`restore-keys: stryker-incremental-\${{ matrix.name }}-\${{ ${fingerprint} }}-\n`));
    assert.match(gates, /STRYKER_FORCE: \$\{\{ github\.event_name == 'pull_request' && '0' \|\| '1' \}\}/);
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
