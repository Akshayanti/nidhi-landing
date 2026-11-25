// Whether a merge to main can take the mutation results its pull request's
// last run already produced, instead of running every shard again.
//
// A cache a pull request saves lives on its merge ref (refs/pull/N/merge),
// and GitHub lets no other branch read it: so main's push run after a merge
// found no earlier results and ran the whole suite again, on exactly the
// code the pull request's last run had tested (#886: ~25 minutes on up to
// 18 runners). Now the pull request's run notes what it tested (an artifact
// whose name holds the tested tree, its base tree and the fingerprint) and
// keeps each shard's results as an artifact too. On the push, the plan job
// asks this module whether that run counts; if it does, main runs no shard
// and copies each shard's results into its own cache for later pull
// requests (council, 2026-11-25).
//
// It counts only when all of this holds; anything else, or anything it
// cannot read, runs every shard as before:
// - the pushed commit came from exactly one merged pull request into main,
//   from a branch of this repository (never a fork);
// - that pull request's latest PR Checks run on its final head is complete,
//   a success, and its first attempt (a rerun of some jobs is ambiguous);
// - in that run every shard the plan lists, and the floors, ran and
//   succeeded (a run that skipped mutation also ends in success);
// - the run tested the same tree as the pushed commit, on the same base
//   tree (the tests compare with the base), under the same fingerprint.

export const MANIFEST_PREFIX = 'stryker-manifest-';
export const RESULTS_PREFIX = 'stryker-incremental-';

const HASH = /^[0-9a-f]{40}$/;
const FINGERPRINT = /^[0-9a-f]{64}$/;

/** The name of the artifact that says what a pull request's run tested. */
export function manifestName({ tree, baseTree, fingerprint }) {
  if (!HASH.test(tree) || !HASH.test(baseTree) || !FINGERPRINT.test(fingerprint)) {
    throw new Error('mutation-reuse: a tree is 40 hex digits and a fingerprint 64');
  }
  return `${MANIFEST_PREFIX}${tree}-${baseTree}-${fingerprint}`;
}

/** The name of the artifact holding one shard's results. */
export function resultsName(shard) {
  if (!/^[a-z0-9-]+$/.test(shard)) throw new Error(`mutation-reuse: not a shard name: ${shard}`);
  return `${RESULTS_PREFIX}${shard}`;
}

const no = (reason) => ({ reuse: false, reason });

/**
 * @param {object} a
 * @param {string} a.repo          owner/name of this repository
 * @param {unknown} a.pulls        GET /repos/{repo}/commits/{sha}/pulls
 * @param {unknown} a.runs         GET /repos/{repo}/actions/runs?head_sha=...&event=pull_request (its object)
 * @param {(runId: number, attempt: number) => unknown} a.jobsOf  that attempt's jobs (its object)
 * @param {(runId: number) => unknown} a.artifactsOf               the run's artifacts (its object)
 * @param {string} a.tree          the pushed commit's tree
 * @param {string} a.baseTree      its parent's tree
 * @param {string} a.fingerprint   main's fingerprint
 * @param {string[]} a.shards      the shard names the plan lists
 * @param {string} [a.workflowPath] the pull requests' workflow
 * @returns {{ reuse: true, runId: number, pull: number, reason: string } | { reuse: false, reason: string }}
 */
export function decideReuse({ repo, pulls, runs, jobsOf, artifactsOf, tree, baseTree, fingerprint, shards, workflowPath = '.github/workflows/pr-checks.yml' }) {
  let wanted;
  try {
    wanted = manifestName({ tree, baseTree, fingerprint });
  } catch {
    return no('the pushed commit could not be described');
  }
  if (!Array.isArray(shards) || shards.length === 0) return no('no shards listed');

  if (!Array.isArray(pulls)) return no('the pull requests could not be read');
  const merged = pulls.filter((p) => p && p.merged_at && p.base?.ref === 'main');
  if (merged.length !== 1) return no(`${merged.length} merged pull requests lead to this commit`);
  const pull = merged[0];
  if (pull.head?.repo?.full_name !== repo) return no(`pull request #${pull.number} comes from another repository`);
  const head = pull.head?.sha;
  if (typeof head !== 'string' || !HASH.test(head)) return no('the pull request has no head commit');

  const list = runs && Array.isArray(runs.workflow_runs) ? runs.workflow_runs : null;
  if (!list) return no('the runs could not be read');
  const ours = list
    .filter((r) => r && r.event === 'pull_request' && r.head_sha === head && r.path === workflowPath)
    .sort((x, y) => y.run_number - x.run_number || y.id - x.id);
  if (ours.length === 0) return no(`no PR Checks run on #${pull.number}'s head`);
  const run = ours[0];
  if (run.status !== 'completed' || run.conclusion !== 'success') return no(`run ${run.id} did not succeed (${run.status}, ${run.conclusion})`);
  if (run.run_attempt !== 1) return no(`run ${run.id} was rerun (attempt ${run.run_attempt})`);

  const jobsAnswer = jobsOf(run.id, run.run_attempt);
  const jobs = jobsAnswer && Array.isArray(jobsAnswer.jobs) ? jobsAnswer.jobs : null;
  if (!jobs) return no(`run ${run.id}'s jobs could not be read`);
  if (typeof jobsAnswer.total_count !== 'number' || jobsAnswer.total_count > jobs.length) return no(`run ${run.id} has more jobs than were read`);
  const passed = (suffix) => {
    const found = jobs.filter((j) => j && typeof j.name === 'string' && (j.name === suffix || j.name.endsWith(` / ${suffix}`)));
    return found.length === 1 && found[0].status === 'completed' && found[0].conclusion === 'success';
  };
  for (const shard of shards) {
    if (!passed(`Mutation: ${shard}`)) return no(`shard ${shard} did not run and pass in run ${run.id}`);
  }
  if (!passed('mutation-floors')) return no(`the floors did not run and pass in run ${run.id}`);

  const artifactsAnswer = artifactsOf(run.id);
  const artifacts = artifactsAnswer && Array.isArray(artifactsAnswer.artifacts) ? artifactsAnswer.artifacts : null;
  if (!artifacts) return no(`run ${run.id}'s artifacts could not be read`);
  if (typeof artifactsAnswer.total_count !== 'number' || artifactsAnswer.total_count > artifacts.length) return no(`run ${run.id} has more artifacts than were read`);
  const manifests = artifacts.filter((a) => a && typeof a.name === 'string' && a.name.startsWith(MANIFEST_PREFIX));
  if (manifests.length !== 1) return no(`run ${run.id} noted ${manifests.length} tested trees`);
  if (manifests[0].name !== wanted) return no(`run ${run.id} tested other code or another base`);
  if (manifests[0].expired) return no(`run ${run.id}'s note has expired`);

  return { reuse: true, runId: run.id, pull: pull.number, reason: `pull request #${pull.number}'s run ${run.id} already tested this exact code, on this base, and every shard and the floors passed` };
}
