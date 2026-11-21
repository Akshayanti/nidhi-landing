/**
 * A lesson's newsletter id never changes and is never reused (#438).
 *
 * The newsletter records a lesson as sent under its id (`newsletterId`, or
 * else its slug), so a published lesson whose id changed would be emailed to
 * every subscriber again, and a new lesson given an old id would never be sent
 * at all. This compares the lessons with the base they merge into: in CI the
 * pull request's base (NEWSLETTER_ID_BASE=HEAD^1, the merge commit's first
 * parent), on a laptop origin/main. Without a base it fails rather than pass
 * unchecked.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const BLOG = 'src/content/blog';
const BASE = process.env.NEWSLETTER_ID_BASE || 'origin/main';

type Lesson = { path: string; slug: string; id: string; pubDate: string };

const git = (...args: string[]) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** The three top-level fields this needs, read from the frontmatter block. */
export function readLesson(path: string, raw: string): Lesson | null {
  const block = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!block) return null;
  const field = (key: string) => block.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]*?)["']?\\s*$`, 'm'))?.[1];
  const slug = field('slug');
  if (!slug) return null;
  return { path, slug, id: field('newsletterId') || slug, pubDate: field('pubDate') ?? '' };
}

const isLessonFile = (p: string) => /\.(md|mdx)$/.test(p);

function branchLessons(): Lesson[] {
  const out: Lesson[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (isLessonFile(name)) {
        const lesson = readLesson(relative(ROOT, full), readFileSync(full, 'utf8'));
        if (lesson) out.push(lesson);
      }
    }
  };
  walk(join(ROOT, BLOG));
  return out;
}

function baseLessons(base: string): Lesson[] {
  return git('ls-tree', '-r', '--name-only', base, '--', BLOG)
    .split('\n').filter(isLessonFile)
    .map(path => readLesson(path, git('show', `${base}:${path}`)))
    .filter((l): l is Lesson => l !== null);
}

/** Where each lesson file on the base is now: git's rename detection, from the base to the working tree. */
function renames(base: string): Map<string, string> {
  const moved = new Map<string, string>();
  for (const line of git('diff', '-M', '--name-status', base, '--', BLOG).split('\n')) {
    const [status, from, to] = line.split('\t');
    if (status?.startsWith('R') && from && to) moved.set(from, to);
  }
  return moved;
}

/** The checks, apart from git, so they can be tested on made-up lessons. */
export function idProblems(base: Lesson[], branch: Lesson[], moved: Map<string, string>, today: string): string[] {
  const problems: string[] = [];
  const byPath = new Map(branch.map(l => [l.path, l]));
  const ids = new Map<string, Lesson[]>();
  for (const l of branch) ids.set(l.id, [...(ids.get(l.id) ?? []), l]);

  for (const [id, lessons] of ids) {
    if (lessons.length > 1) problems.push(`${lessons.map(l => l.path).join(' and ')} share the newsletter id "${id}": give one a newsletterId of its own.`);
  }
  for (const old of base) {
    if (!old.pubDate || old.pubDate.slice(0, 10) > today) continue; // not published yet: nothing was sent
    const now = byPath.get(moved.get(old.path) ?? old.path);
    if (now && now.id !== old.id) {
      problems.push(`${now.path} was published as "${old.id}" and is now "${now.id}": add newsletterId: "${old.id}" to its frontmatter, or the newsletter sends it again.`);
    } else if (!ids.has(old.id)) {
      problems.push(`The published lesson "${old.id}" (${old.path}) is gone: keep a lesson with newsletterId: "${old.id}", or the id could be given to a new lesson that is then never sent.`);
    }
  }
  return problems;
}

describe('newsletter ids (#438)', () => {
  it('every published lesson keeps its id, and no two lessons share one', () => {
    let resolved: string;
    try {
      resolved = git('rev-parse', '--verify', `${BASE}^{commit}`).trim();
    } catch {
      assert.fail(`The base ${BASE} is not available, so newsletter ids cannot be checked. Run git fetch origin main, or set NEWSLETTER_ID_BASE to the commit this merges into.`);
    }
    const today = new Date().toISOString().slice(0, 10);
    assert.deepEqual(idProblems(baseLessons(resolved), branchLessons(), renames(resolved), today), []);
  });

  const lesson = (path: string, slug: string, id = slug, pubDate = '2026-01-01'): Lesson => ({ path, slug, id, pubDate });
  const today = '2026-11-21';

  it('a changed slug needs newsletterId set to the old one', () => {
    const base = [lesson('a.md', 'old')];
    assert.equal(idProblems(base, [lesson('a.md', 'new')], new Map(), today).length, 1);
    assert.deepEqual(idProblems(base, [lesson('a.md', 'new', 'old')], new Map(), today), []);
  });

  it('a moved file is followed by its rename, and two lessons swapping ids fail', () => {
    const base = [lesson('a.md', 'a'), lesson('b.md', 'b')];
    assert.deepEqual(idProblems(base, [lesson('x/a.md', 'a'), lesson('b.md', 'b')], new Map([['a.md', 'x/a.md']]), today), []);
    const swapped = idProblems(base, [lesson('a.md', 'b'), lesson('b.md', 'a')], new Map(), today);
    assert.equal(swapped.length, 2, 'every base id is still there, but each lesson changed');
  });

  it('a removed lesson fails, a lesson not yet published may change, and ids are unique', () => {
    assert.equal(idProblems([lesson('a.md', 'a')], [], new Map(), today).length, 1);
    assert.deepEqual(idProblems([lesson('a.md', 'a', 'a', '2026-12-01')], [lesson('a.md', 'b')], new Map(), today), []);
    assert.equal(idProblems([], [lesson('a.md', 'a'), lesson('b.md', 'b', 'a')], new Map(), today).length, 1);
  });

  it('reads the fields from frontmatter, quoted or not', () => {
    assert.deepEqual(readLesson('a.md', '---\nslug: "a-b"\nnewsletterId: old-a\npubDate: 2026-05-01\ntitle: "T"\n---\nBody'),
      { path: 'a.md', slug: 'a-b', id: 'old-a', pubDate: '2026-05-01' });
    assert.equal(readLesson('a.md', 'no frontmatter'), null);
  });
});
