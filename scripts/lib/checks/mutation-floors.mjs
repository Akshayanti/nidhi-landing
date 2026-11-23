// The mutation floors (#790): each scope's logic and component scores may not
// drop below the floor in stryker.floors.json. A floor starts at the score
// measured when the gates landed and rises to 95 in that scope's own pull
// request; it is never lowered. The logic and the components are held apart,
// so a better-tested helper cannot hide a component tested less.

/** The minimum every floor reaches, and where it stops. */
export const TARGET = 95;

/** Which part of a scope a file is: its component(s) or its logic. */
export function partOf(file) {
  return /^src\/components\//.test(file.split('\\').join('/')) ? 'component' : 'logic';
}

/**
 * Each part's mutation score, the way Stryker counts it: detected (killed or
 * timed out) over detected and undetected (survived or not covered). Mutants
 * that do not compile or crash the run are left out, as Stryker leaves them.
 */
export function partScores(report) {
  const tally = { logic: { detected: 0, undetected: 0 }, component: { detected: 0, undetected: 0 } };
  for (const [file, { mutants }] of Object.entries(report.files ?? {})) {
    const t = tally[partOf(file)];
    for (const { status } of mutants) {
      if (status === 'Killed' || status === 'Timeout') t.detected++;
      else if (status === 'Survived' || status === 'NoCoverage') t.undetected++;
    }
  }
  const score = ({ detected, undetected }) => (detected + undetected === 0 ? null : Math.floor((detected / (detected + undetected)) * 10000) / 100);
  return { logic: score(tally.logic), component: score(tally.component), counts: tally };
}

/** What fails a scope: a part below its floor, a part with a floor and no mutants, or a scope with no floors. */
export function judgeScope(scope, scores, floors) {
  const floor = floors[scope];
  if (!floor) return [`${scope}: no floors in stryker.floors.json`];
  const problems = [];
  for (const part of ['logic', 'component']) {
    if (floor[part] === undefined) continue;
    if (scores[part] === null) problems.push(`${scope} ${part}: no mutants were tested, so the floor of ${floor[part]}% was not checked`);
    else if (scores[part] < floor[part]) problems.push(`${scope} ${part}: ${scores[part]}% is below its floor of ${floor[part]}%`);
  }
  return problems;
}

/** What is wrong with a floors file, alone and against the one on the base branch. */
export function floorProblems(floors, base = null) {
  const problems = [];
  for (const [scope, parts] of Object.entries(floors)) {
    for (const [part, value] of Object.entries(parts)) {
      if (!['logic', 'component'].includes(part)) problems.push(`${scope}: unknown part ${part}`);
      if (typeof value !== 'number' || !(value >= 0) || value > TARGET) problems.push(`${scope} ${part}: a floor is a number from 0 to ${TARGET}, not ${value}`);
      const before = base?.[scope]?.[part];
      if (typeof before === 'number' && value < before) problems.push(`${scope} ${part}: the floor was lowered from ${before} to ${value}`);
    }
  }
  for (const [scope, parts] of Object.entries(base ?? {})) {
    for (const part of Object.keys(parts)) if (floors[scope]?.[part] === undefined) problems.push(`${scope} ${part}: the floor was removed`);
  }
  return problems;
}
