// Whether a merge to main takes its pull request's mutation results (mutation-reuse.mjs).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decideReuse, manifestName, resultsName } from './mutation-reuse.mjs';

const REPO = 'owner/site';
const TREE = 'a'.repeat(40);
const BASE = 'b'.repeat(40);
const FP = 'c'.repeat(64);
const HEAD = 'd'.repeat(40);
const SHARDS = ['inflation-1of2', 'inflation-2of2', 'shared'];

const pull = (over = {}) => ({ number: 890, merged_at: '2026-11-25T12:00:00Z', base: { ref: 'main' }, head: { sha: HEAD, repo: { full_name: REPO } }, ...over });
const run = (over = {}) => ({ id: 77, run_number: 5, event: 'pull_request', head_sha: HEAD, path: '.github/workflows/pr-checks.yml', status: 'completed', conclusion: 'success', run_attempt: 1, ...over });
const job = (name, over = {}) => ({ name: `Tool stage: mutation / ${name}`, status: 'completed', conclusion: 'success', ...over });
const allJobs = () => [...SHARDS.map((s) => job(`Mutation: ${s}`)), job('mutation-floors'), job('mutation-plan'), { name: 'Lint', status: 'completed', conclusion: 'success' }];
const artifacts = (names = [manifestName({ tree: TREE, baseTree: BASE, fingerprint: FP })]) => ({ total_count: names.length, artifacts: names.map((name) => ({ name, expired: false })) });

function decide(over = {}) {
  return decideReuse({
    repo: REPO,
    pulls: [pull()],
    runs: { workflow_runs: [run()] },
    jobsOf: () => ({ total_count: allJobs().length, jobs: allJobs() }),
    artifactsOf: () => artifacts(),
    tree: TREE,
    baseTree: BASE,
    fingerprint: FP,
    shards: SHARDS,
    ...over,
  });
}

describe('mutation results a merge can take from its pull request', () => {
  it('are taken when the pull request’s last run tested this exact code and every shard and the floors passed', () => {
    const answer = decide();
    assert.equal(answer.reuse, true);
    assert.equal(answer.runId, 77);
    assert.equal(answer.pull, 890);
    assert.match(answer.reason, /#890.*77/);
  });

  it('are not taken from a fork, from no pull request, or when two lead to the commit', () => {
    assert.equal(decide({ pulls: [pull({ head: { sha: HEAD, repo: { full_name: 'someone/fork' } } })] }).reuse, false);
    assert.equal(decide({ pulls: [pull({ head: { sha: HEAD, repo: null } })] }).reuse, false);
    assert.equal(decide({ pulls: [] }).reuse, false);
    assert.equal(decide({ pulls: [pull(), pull({ number: 891 })] }).reuse, false);
    assert.equal(decide({ pulls: [pull({ merged_at: null })] }).reuse, false);
    assert.equal(decide({ pulls: [pull({ base: { ref: 'other' } })] }).reuse, false);
    assert.equal(decide({ pulls: null }).reuse, false);
  });

  it('are not taken from a run that failed, was cancelled, is still going, or was rerun', () => {
    for (const over of [{ conclusion: 'failure' }, { conclusion: 'cancelled' }, { status: 'in_progress', conclusion: null }, { run_attempt: 2 }]) {
      assert.equal(decide({ runs: { workflow_runs: [run(over)] } }).reuse, false, JSON.stringify(over));
    }
  });

  it('look only at the latest PR Checks run on the pull request’s final head', () => {
    const older = run({ id: 70, run_number: 4 });
    const failedLatest = run({ id: 80, run_number: 6, conclusion: 'failure' });
    assert.equal(decide({ runs: { workflow_runs: [older, failedLatest] } }).reuse, false);
    assert.equal(decide({ runs: { workflow_runs: [run({ head_sha: 'e'.repeat(40) })] } }).reuse, false);
    assert.equal(decide({ runs: { workflow_runs: [run({ path: '.github/workflows/other.yml' })] } }).reuse, false);
    assert.equal(decide({ runs: { workflow_runs: [run({ event: 'push' })] } }).reuse, false);
    assert.equal(decide({ runs: {} }).reuse, false);
  });

  it('are not taken when a shard or the floors were skipped, failed or are missing, though the run succeeded', () => {
    const jobsWith = (jobs) => () => ({ total_count: jobs.length, jobs });
    const without = (name) => allJobs().filter((j) => !j.name.endsWith(name));
    const changed = (name, over) => allJobs().map((j) => (j.name.endsWith(name) ? { ...j, ...over } : j));
    assert.equal(decide({ jobsOf: jobsWith(without('Mutation: shared')) }).reuse, false);
    assert.equal(decide({ jobsOf: jobsWith(changed('Mutation: shared', { conclusion: 'skipped' })) }).reuse, false);
    assert.equal(decide({ jobsOf: jobsWith(without('mutation-floors')) }).reuse, false);
    assert.equal(decide({ jobsOf: jobsWith(changed('mutation-floors', { conclusion: 'skipped' })) }).reuse, false);
    assert.equal(decide({ jobsOf: jobsWith([...allJobs(), job('Mutation: shared')]) }).reuse, false, 'a shard listed twice');
    assert.equal(decide({ jobsOf: () => ({ total_count: 500, jobs: allJobs() }) }).reuse, false, 'more jobs than were read');
    assert.equal(decide({ jobsOf: () => null }).reuse, false);
  });

  it('are not taken when the run tested other code, another base, or under another fingerprint', () => {
    const other = (o) => artifacts([manifestName({ tree: TREE, baseTree: BASE, fingerprint: FP, ...o })]);
    assert.equal(decide({ artifactsOf: () => other({ tree: 'f'.repeat(40) }) }).reuse, false);
    assert.equal(decide({ artifactsOf: () => other({ baseTree: 'f'.repeat(40) }) }).reuse, false);
    assert.equal(decide({ artifactsOf: () => other({ fingerprint: 'f'.repeat(64) }) }).reuse, false);
    assert.equal(decide({ artifactsOf: () => artifacts([]) }).reuse, false);
    const two = [manifestName({ tree: TREE, baseTree: BASE, fingerprint: FP }), manifestName({ tree: 'f'.repeat(40), baseTree: BASE, fingerprint: FP })];
    assert.equal(decide({ artifactsOf: () => artifacts(two) }).reuse, false);
    assert.equal(decide({ artifactsOf: () => ({ total_count: 1, artifacts: [{ name: two[0], expired: true }] }) }).reuse, false);
    // A list cut short could hide another note: only a whole list counts.
    assert.equal(decide({ artifactsOf: () => ({ ...artifacts(), total_count: 101 }) }).reuse, false);
    assert.equal(decide({ artifactsOf: () => ({ artifacts: artifacts().artifacts }) }).reuse, false);
    assert.equal(decide({ jobsOf: () => ({ jobs: allJobs() }) }).reuse, false, 'a job list with no count');
    assert.equal(decide({ artifactsOf: () => null }).reuse, false);
  });

  it('are not taken when the pushed commit or the shards cannot be described', () => {
    assert.equal(decide({ tree: 'short' }).reuse, false);
    assert.equal(decide({ fingerprint: '' }).reuse, false);
    assert.equal(decide({ shards: [] }).reuse, false);
  });
});

describe('the artifacts’ names', () => {
  it('hold the tested tree, its base and the fingerprint, and a shard’s name', () => {
    assert.equal(manifestName({ tree: TREE, baseTree: BASE, fingerprint: FP }), `stryker-manifest-${TREE}-${BASE}-${FP}`);
    assert.equal(resultsName('net-worth-1of2'), 'stryker-incremental-net-worth-1of2');
    assert.throws(() => resultsName('../x'));
    assert.throws(() => manifestName({ tree: 'x', baseTree: BASE, fingerprint: FP }));
  });

  it('never start like a shard report, which the floors job collects as mutation-*', () => {
    assert.ok(!manifestName({ tree: TREE, baseTree: BASE, fingerprint: FP }).startsWith('mutation-'));
    assert.ok(!resultsName('shared').startsWith('mutation-'));
  });
});
