/**
 * The privacy notice does not change without its changelog (CLAUDE.md,
 * "Privacy Policy is the Source of Truth").
 *
 * The notice's English words, the names it quotes (the KEY table) and the
 * markup that puts them together are compared with the commit this merges
 * into. A change to them needs new text in `writtenChangelog`. Styles,
 * classes, comments, key names and a translated edition's wording need none.
 * In CI the base is the pull request's (PRIVACY_NOTICE_BASE=HEAD^1), on a
 * laptop where the branch left origin/main. Without a base it fails.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const FILES = {
  catalog: 'src/i18n/strings/en.ts',
  page: 'src/components/pages/PrivacyPage.astro',
  log: 'src/utils/privacyChangelogEntries.ts',
} as const;

type Sources = Record<keyof typeof FILES, string>;

/** From the line that opens a block to the line that closes it. */
function block(source: string, opens: string, closes: string): string {
  const from = source.indexOf(opens);
  const to = source.indexOf(closes, from + opens.length);
  if (from < 0 || to < 0) throw new Error(`The privacy guard cannot find "${opens.trim()}": update src/utils/privacyNoticeGuard.test.ts.`);
  return source.slice(from + opens.length, to);
}

/** The string literals in order, with comments left out. */
function literals(code: string): string[] {
  const token = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g;
  return (code.match(token) ?? []).filter((t) => !t.startsWith('/')).map((t) => t.slice(1, -1));
}

function markup(page: string): string {
  const body = page.slice(page.indexOf('\n---', 3) + 4).split('\n<style')[0];
  return body
    .replace(/\{\/\*[\s\S]*?\*\/\}|<!--[\s\S]*?-->/g, '')
    .replace(/\sclass(?::list)?=(?:"[^"]*"|\{[^}]*\})/g, '')
    .replace(/<\/?(?:div|section)>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim();
}

/** What a reader of the notice gets. */
function noticeText({ catalog, page }: Sources): string {
  return JSON.stringify([
    literals(block(catalog, '\n  privacy: {', '\n  },\n')),
    literals(block(page, '\nconst KEY = {', '\n};')),
    markup(page),
  ]);
}

/** Whether the changelog says anything it did not say before. */
function hasNewEntryText(base: string, now: string): boolean {
  const text = (log: string) => literals(block(log, '\nexport const writtenChangelog: ChangelogEntry[] = [', '\n];'));
  const before = new Set(text(base));
  return text(now).some((line) => !before.has(line));
}

export function noticeProblems(base: Sources, now: Sources): string[] {
  if (noticeText(base) === noticeText(now) || hasNewEntryText(base.log, now.log)) return [];
  return [`The privacy notice changed and its changelog did not. Add the change to writtenChangelog in ${FILES.log}: one entry per date, material: false when only the notice's own text changed (CLAUDE.md, "Privacy Policy is the Source of Truth").`];
}

const git = (...args: string[]) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 25 });
const now = Object.fromEntries(Object.entries(FILES).map(([name, path]) => [name, readFileSync(join(ROOT, path), 'utf8')])) as Sources;

describe('the privacy notice and its changelog', () => {
  it('changed together since the base', () => {
    const named = process.env.PRIVACY_NOTICE_BASE;
    let base: Sources;
    try {
      const commit = named ? git('rev-parse', '--verify', `${named}^{commit}`).trim() : git('merge-base', 'origin/main', 'HEAD').trim();
      base = Object.fromEntries(Object.entries(FILES).map(([name, path]) => [name, git('show', `${commit}:${path}`)])) as Sources;
    } catch (error) {
      assert.fail(`The base (${named ?? 'origin/main'}) cannot be read, so the privacy notice is unchecked. Run git fetch origin main, or set PRIVACY_NOTICE_BASE. ${String(error)}`);
    }
    assert.deepEqual(noticeProblems(base, now), []);
  });

  const after = (source: string, anchor: string, text: string) => {
    assert.ok(source.includes(anchor), anchor);
    return source.replace(anchor, () => anchor + text);
  };
  const entry = after(now.log, 'export const writtenChangelog: ChangelogEntry[] = [', "\n  { date: 'Jan 2, 2099', iso: '2099-01-02', material: false, summary: 'A test.', details: [] },");
  const changes: Array<[string, Partial<Sources>]> = [
    ['an English sentence', { catalog: now.catalog.replace('Privacy, honestly', 'Privacy, mostly') }],
    ['a new English sentence', { catalog: after(now.catalog, '\n  privacy: {', "\n    added: 'We now collect more.',") }],
    ['a storage key the notice quotes', { page: after(now.page, '\nconst KEY = {', "\n  added: 'nidhi-new-key',") }],
    ['a sentence taken off the page', { page: now.page.replace('<li>{collect.toolExports}</li>', '') }],
    ['an address it links to', { page: now.page.replace('https://posthog.com/eu"', 'https://posthog.com/us"') }],
  ];

  for (const [what, change] of changes) {
    it(`${what}: fails without an entry, passes with one`, () => {
      const edited = { ...now, ...change };
      assert.notDeepEqual(edited, now, 'the fixture no longer matches the file');
      assert.equal(noticeProblems(now, edited).length, 1);
      assert.deepEqual(noticeProblems(now, { ...edited, log: entry }), []);
    });
  }

  it('an entry taken away is no entry', () => {
    const edited = { ...now, catalog: now.catalog.replace('Privacy, honestly', 'Privacy, mostly') };
    assert.equal(noticeProblems({ ...now, log: entry }, edited).length, 1);
  });

  const none: Array<[string, Partial<Sources>]> = [
    ['another namespace', { catalog: after(now.catalog, 'export const en = {', "\n  elsewhere: 'Copy elsewhere on the site',") }],
    ['a comment in the catalog', { catalog: after(now.catalog, '\n  privacy: {', "\n    // the reader's first line") }],
    ['a style', { page: after(now.page, '<style', ' data-changed') }],
    ['a class', { page: now.page.replace('class="privacy-hero"', 'class="privacy-hero privacy-hero--wide"') }],
    ['a comment on the page', { page: after(now.page, '</header>', '\n{/* a note */}') }],
  ];

  for (const [what, change] of none) {
    it(`${what}: needs none`, () => {
      const edited = { ...now, ...change };
      assert.notDeepEqual(edited, now, 'the fixture no longer matches the file');
      assert.deepEqual(noticeProblems(now, edited), []);
    });
  }

  it('a translated edition is not read, so its wording fix needs none', () => {
    assert.deepEqual(Object.values(FILES).filter((path) => /strings\/(hi|es|cs|mr)\.ts/.test(path)), []);
  });
});
