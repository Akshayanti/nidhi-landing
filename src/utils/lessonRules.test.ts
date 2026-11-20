/**
 * Every build-time rule for a lesson or a guide, applied to every file under
 * src/content/, whatever its date (#357).
 *
 * The rules live in the routes (src/pages/blog/[slug].astro, src/utils/
 * guides.ts) and the production build leaves out lessons dated in the future.
 * So a rule broken in a scheduled lesson was first met on the morning it was
 * published, by an unattended deploy, where it also held back every other
 * change waiting in that deploy and the newsletter after it. Here the same
 * rules run on the scheduled lessons too, on every pull request.
 *
 * The files are read the way the build reads them: frontmatter through the
 * collection schemas in src/content.config.ts, heading ids through
 * github-slugger, which is what Astro uses.
 *
 * Run with:  npm test
 */
import './testing/astroContentStub.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import GithubSlugger from 'github-slugger';
import { GLOSSARY_CARD_ID, termId } from './glossary.mjs';
import { LAYERED_LEVELS, layeredLessonProblems } from './layeredLessons.ts';
import { searchTitleProblem } from './searchTitle.ts';
import { assertCorrectionDates } from './corrections.ts';
import { assertTldrRules } from './tldrRules.ts';
import { assertCompanionHosts, assertCompanionOrder } from './companions.ts';

const { collections } = await import('../content.config.ts');
const { assertGuides, assertGuideLists } = await import('./guides.ts');

const CONTENT = join(import.meta.dirname, '..', 'content');
type Parsed = { success: boolean; data?: Record<string, any>; error?: { issues: { path: (string | number)[]; message: string }[] } };
type Schema = { safeParse: (value: unknown) => Parsed };
const schemaOf = (name: keyof typeof collections) => (collections[name] as unknown as { schema: Schema }).schema;

/** Markdown files, leaving out the ones named with a leading underscore (a folder's README), as the loaders do. */
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : /^[^_].*\.mdx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
  );
}

type Entry = { id: string; file: string; data: Record<string, any>; body: string; problems: string[] };

/** One collection's files, each parsed by its schema; a file the schema refuses keeps its reasons. */
function load(name: keyof typeof collections): Entry[] {
  return files(join(CONTENT, name)).map((path) => {
    const raw = readFileSync(path, 'utf8');
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
    const file = relative(CONTENT, path);
    if (!match) return { id: file, file, data: {}, body: '', problems: ['no frontmatter'] };
    const result = schemaOf(name).safeParse(parse(match[1]));
    const problems = result.success ? [] : (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return { id: file, file, data: result.data ?? {}, body: match[2], problems };
  });
}

/** A heading's words, as Astro reduces it before making its id. */
function headingText(markdown: string): string {
  return markdown.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/[*_`]/g, '').trim();
}

/** The body's headings outside code fences, with the ids the build gives them. */
export function headingsOf(body: string): { depth: number; text: string; slug: string }[] {
  const slugger = new GithubSlugger();
  const out: { depth: number; text: string; slug: string }[] = [];
  let fenced = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    const match = fenced ? null : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const text = headingText(match[2]);
      out.push({ depth: match[1].length, text, slug: slugger.slug(text) });
    }
  }
  return out;
}

const lessons = load('blog');
const guides = load('guides');
const situations = load('situations');
/**
 * A lesson with a real date is checked as if that date had come. A lesson
 * parked at a placeholder date (2099) is not scheduled: its host may not be
 * written yet, and the build will say so on the day it is given a real date.
 */
const A_YEAR_AHEAD = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

describe('reading the content', () => {
  it('finds the lessons and the guides', () => {
    assert.ok(lessons.length >= 80, `only ${lessons.length} lessons found`);
    assert.ok(guides.length > 0);
  });

  it('gives headings the ids the build gives them', () => {
    const found = headingsOf('## What it is\n\ntext\n\n### A **bold** [link](/x/) & more\n\n```md\n## not a heading\n```\n\n## What it is\n');
    assert.deepEqual(found.map((h) => [h.depth, h.text, h.slug]), [
      [2, 'What it is', 'what-it-is'],
      [3, 'A bold link & more', 'a-bold-link--more'],
      [2, 'What it is', 'what-it-is-1'],
    ]);
  });
});

describe('every lesson, guide and situation fits its schema', () => {
  for (const [name, entries] of [['blog', lessons], ['guides', guides], ['situations', situations]] as const) {
    it(`${name}: frontmatter is valid in every file`, () => {
      assert.deepEqual(entries.filter((entry) => entry.problems.length > 0).map((entry) => `${entry.file}: ${entry.problems.join('; ')}`), []);
    });
  }

  it('no two lessons share a slug', () => {
    const slugs = lessons.map((lesson) => lesson.data.slug);
    assert.deepEqual(slugs.filter((slug, index) => slugs.indexOf(slug) !== index), []);
  });
});

describe('the rules the lesson route applies, on every lesson', () => {
  it('glossary anchors are usable and unique, and body term links name a defined term', () => {
    const problems: string[] = [];
    for (const lesson of lessons) {
      const ids: string[] = (lesson.data.glossary ?? []).map((g: { term: string }) => termId(g.term));
      ids.forEach((id, index) => {
        if (id === 'term-') problems.push(`${lesson.file}: glossary term "${lesson.data.glossary[index].term}" has no usable anchor`);
        if (ids.indexOf(id) !== index) problems.push(`${lesson.file}: two glossary terms share the anchor #${id}`);
      });
      for (const match of lesson.body.matchAll(/\]\(#(term-[^)\s]+)\)/g)) {
        if (!ids.includes(match[1])) problems.push(`${lesson.file}: a body link points to #${match[1]}, which is not in this lesson's glossary`);
      }
    }
    assert.deepEqual(problems, []);
  });

  it('"In this lesson" links land on a heading, the glossary card or a term', () => {
    const problems: string[] = [];
    for (const lesson of lessons) {
      const ids: string[] = (lesson.data.glossary ?? []).map((g: { term: string }) => termId(g.term));
      const targets = new Set([...headingsOf(lesson.body).map((h) => h.slug), ...(ids.length ? [GLOSSARY_CARD_ID, ...ids] : [])]);
      for (const takeaway of lesson.data.takeaways ?? []) {
        if (typeof takeaway !== 'string' && !targets.has(takeaway.href.slice(1))) {
          problems.push(`${lesson.file}: takeaway "${takeaway.text}" links to ${takeaway.href}, which is not on the page`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  it('a search title only shortens the page title', () => {
    const problems = lessons.flatMap((lesson) => {
      const problem = searchTitleProblem(lesson.data.title, lesson.data.seoTitle);
      return problem ? [`${lesson.file}: ${problem}`] : [];
    });
    assert.deepEqual(problems, []);
  });

  it('Optimizing and Inclusive Finances lessons follow the layered-lesson rule', () => {
    const problems = lessons
      .filter((lesson) => (LAYERED_LEVELS as readonly string[]).includes(lesson.data.level))
      .flatMap((lesson) => layeredLessonProblems(lesson.data as never, headingsOf(lesson.body).filter((h) => h.depth === 2).map((h) => h.text)).map((problem) => `${lesson.file}: ${problem}`));
    assert.deepEqual(problems, []);
  });

  it('TL;DR and correction rules hold', () => {
    assert.doesNotThrow(() => assertTldrRules(lessons.map((lesson) => lesson.data) as never));
    assert.doesNotThrow(() => assertCorrectionDates(lessons as never));
  });

  it('every Inclusive Finances guide has a host lesson, and sits right after it', () => {
    // A "now" a year ahead makes every scheduled lesson count as published,
    // so the rule checked on a guide's publish day is checked today.
    assert.doesNotThrow(() => assertCompanionHosts(lessons as never, A_YEAR_AHEAD));
    const inOrder = lessons.filter((lesson) => lesson.data.pubDate <= A_YEAR_AHEAD).sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
    assert.doesNotThrow(() => assertCompanionOrder(inOrder as never));
  });
});

describe('the rules for guides and situations, on every file', () => {
  it('guides name lessons, figures and related guides that exist, and stay short', () => {
    assert.doesNotThrow(() => assertGuides(guides as never, lessons as never));
    assert.doesNotThrow(() => assertGuideLists(guides as never));
  });

  it('situations list guides that exist', () => {
    const slugs = new Set(guides.map((guide) => guide.data.slug));
    const missing = situations.flatMap((situation) => (situation.data.guides ?? []).filter((id: string) => !slugs.has(id)).map((id: string) => `${situation.file}: guide "${id}" does not exist`));
    assert.deepEqual(missing, []);
  });
});
