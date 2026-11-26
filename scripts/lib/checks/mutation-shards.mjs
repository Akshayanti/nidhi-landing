// Splits a mutation scope into shards that run side by side on CI (#846).
//
// Stryker mutates a node only when it lies wholly inside one of the line
// ranges it is given (locationIncluded in its instrumenter), so a range that
// cut through a function would leave that function's body mutant, and every
// other mutant crossing the cut, in no shard at all. Shards are therefore cut
// only between top-level statements: every mutant is a node inside exactly one
// top-level statement, so each lands in exactly one shard. Two statements that
// share a line are never separated, as both ranges would then hold that line.
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';

/** The top-level statements of a file, as [first line, last line] pairs, in order. */
export function topLevelSpans(file, source = readFileSync(file, 'utf8')) {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', ...(/\.[jt]sx$/.test(file) ? ['jsx'] : [])],
  });
  return ast.program.body.map((node) => [node.loc.start.line, node.loc.end.line]);
}

/**
 * The units a scope can be cut into: runs of top-level statements, never split
 * where one statement ends on the line the next begins. Each has a `key`, its
 * name in a weights file: its first line's text, numbered (`#2`, `#3`) when
 * the file repeats that line, so a weight follows its statement when lines
 * above it are added or taken away.
 */
export function units(files, read = (file) => readFileSync(file, 'utf8')) {
  const out = [];
  for (const file of files) {
    const source = read(file);
    const spans = topLevelSpans(file, source);
    if (spans.length === 0) continue;
    const lines = source.split('\n');
    const seen = new Map();
    const push = (u) => {
      const head = (lines[u.start - 1] ?? '').trim();
      const n = (seen.get(head) ?? 0) + 1;
      seen.set(head, n);
      out.push({ ...u, key: n === 1 ? head : `${head}#${n}` });
    };
    let current = { file, start: spans[0][0], end: spans[0][1] };
    for (const [start, end] of spans.slice(1)) {
      if (start <= current.end) current.end = Math.max(current.end, end);
      else {
        push(current);
        current = { file, start, end };
      }
    }
    push(current);
  }
  return out;
}

/**
 * The units of shard `index` (1-based) of `count`.
 *
 * Without `weights` they are dealt round-robin. What a mutant costs depends on
 * the tests that reach it, not on its lines (a component with no tests yet
 * costs nothing, a simulation's maths a great deal), so every file is spread
 * across all the shards rather than cut into blocks.
 *
 * With `weights` (a scope's entry in stryker.shard-weights.json: seconds per
 * unit key, per file, measured from a full run) they are dealt by cost: the
 * dearest first, each to the shard with the least so far, ties to the earlier
 * unit and the lower shard, so the same input always gives the same shards. A
 * unit with no weight (a statement added since) is costed by its lines, at the
 * scope's measured cost per line.
 */
export function shardUnits(all, count, index, weights = null) {
  if (!(Number.isInteger(count) && count >= 1 && Number.isInteger(index) && index >= 1 && index <= count)) {
    throw new Error(`a shard is 1 to ${count} of ${count}, not ${index}`);
  }
  if (!weights) return all.filter((_, i) => i % count === index - 1);
  const cost = unitCosts(all, weights);
  const order = all.map((_, i) => i).sort((a, b) => cost[b] - cost[a] || a - b);
  const load = new Array(count).fill(0);
  const shardOf = new Array(all.length);
  for (const i of order) {
    let lightest = 0;
    for (let s = 1; s < count; s++) if (load[s] < load[lightest]) lightest = s;
    shardOf[i] = lightest;
    load[lightest] += cost[i];
  }
  return all.filter((_, i) => shardOf[i] === index - 1);
}

/** Each unit's cost under `weights`: its measured seconds, or its lines at the measured cost per line. */
export function unitCosts(all, weights) {
  const lines = (u) => u.end - u.start + 1;
  const known = all.filter((u) => typeof weights[u.file]?.[u.key] === 'number');
  const knownLines = known.reduce((sum, u) => sum + lines(u), 0);
  const knownCost = known.reduce((sum, u) => sum + weights[u.file][u.key], 0);
  const perLine = knownLines > 0 && knownCost > 0 ? knownCost / knownLines : 1;
  return all.map((u) => weights[u.file]?.[u.key] ?? lines(u) * perLine);
}

/**
 * A scope's weights from its merged mutation report: per file, per unit key,
 * the seconds its mutants took to test, rounded to a tenth. What
 * stryker.shard-weights.json holds; made from a full (nightly or forced) run,
 * since a mutant whose result was reused took no time.
 */
export function weightsFromReport(all, report) {
  const out = {};
  for (const u of all) {
    const mutants = report.files?.[u.file]?.mutants ?? [];
    const ms = mutants
      .filter((m) => m.location.start.line >= u.start && m.location.end.line <= u.end)
      .reduce((sum, m) => sum + (m.duration ?? 0), 0);
    (out[u.file] ??= {})[u.key] = Math.round(ms / 100) / 10;
  }
  return out;
}

/**
 * Stryker's `mutate` entries for one shard: a file whose every unit is in the
 * shard is named whole; otherwise one `file:first-last` range per run of
 * units that sit next to each other in the file.
 */
export function shardPatterns(files, count, index, read, weights = null) {
  const all = units(files, read);
  const mine = new Set(shardUnits(all, count, index, weights));
  const patterns = [];
  for (const file of files) {
    const fileUnits = all.filter((u) => u.file === file);
    if (fileUnits.length === 0) continue;
    if (fileUnits.every((u) => mine.has(u))) {
      patterns.push(file);
      continue;
    }
    let run = null;
    for (const u of fileUnits) {
      if (mine.has(u)) {
        if (run) run.end = u.end;
        else run = { start: u.start, end: u.end };
      } else if (run) {
        patterns.push(`${file}:${run.start}-${run.end}`);
        run = null;
      }
    }
    if (run) patterns.push(`${file}:${run.start}-${run.end}`);
  }
  return patterns;
}

/**
 * One shard's report, keeping only the mutants its `mutate` entries hold.
 *
 * Stryker's incremental mode keeps earlier results for mutants outside the
 * current ranges and writes them into the report too. When a statement is
 * added, later statements move to other shards, so those kept results would
 * be counted again by the shard that now holds them, and could lift a score
 * past its floor. A file named whole keeps all its mutants; a `file:a-b`
 * range keeps those wholly on lines a to b, as Stryker reads the range.
 */
export function withinShard(report, patterns) {
  const ranges = new Map();
  for (const p of patterns) {
    const m = /^(.*):(\d+)-(\d+)$/.exec(p);
    const [file, range] = m ? [m[1], [Number(m[2]), Number(m[3])]] : [p, null];
    if (!ranges.has(file)) ranges.set(file, []);
    ranges.get(file).push(range);
  }
  const files = {};
  for (const [file, entry] of Object.entries(report.files ?? {})) {
    const mine = ranges.get(file);
    if (!mine) continue;
    const inside = ({ location: { start, end } }) => mine.some((r) => r === null || (start.line >= r[0] && end.line <= r[1]));
    const mutants = entry.mutants.filter(inside);
    if (mutants.length) files[file] = { ...entry, mutants };
  }
  return { ...report, files };
}
