/**
 * The dash rule over the text readers get that the lint does not read (#358).
 *
 * CLAUDE.md, "Style Rules": no em dash and no double dash anywhere in the
 * site. `npm run lint` holds the em dash rule for everything under src/ except
 * src/content/ and src/data/, and the catalog tests hold both rules for the
 * site's own words. That left the lessons, guides and situations themselves,
 * and the text files served from public/, with no check, and the double dash
 * in prose with none outside the catalogs. This is that check.
 *
 * What counts as prose: everything but fenced code, inline code, markup
 * tags with their attributes (the figures are inline SVG), HTML comments, the `---` lines that fence frontmatter or draw a rule, and the
 * `|---|` line under a table's heading. Frontmatter values are prose: a
 * title, a description and a FAQ answer are read on the page and in search.
 *
 * The rule covers emails too (owner, Nov 20, 2026, #358): the templates in
 * emails/ and the Apps Script and Python files that build and send them. Those
 * are code, where two hyphens are an operator or a flag, so they are read
 * whole, comments included, for the em dash only.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');

// Written so that this file holds no em dash or entity itself: the lint reads it.
const EM_DASH = /\u2014|&(?:mdash|#8212|#x2014);/i;
/** Two hyphens standing in for a dash: between words or spaces, not part of a longer run. */
const DOUBLE_DASH = /(?<![-<!])--(?![->])/;

/** The lines of a Markdown or text file that break the rule, as `line: text`. */
export function dashProblems(text: string): string[] {
  const problems: string[] = [];
  let fence: string | null = null;
  let comment = false;
  text.split(/\r?\n/).forEach((raw, index) => {
    const opening = /^\s*(```+|~~~+)/.exec(raw);
    if (opening) {
      if (fence === null) fence = opening[1][0];
      else if (opening[1][0] === fence) fence = null;
      return;
    }
    if (fence !== null) return;
    // HTML comments, which may run over several lines.
    let line = '';
    let rest = raw;
    while (rest.length > 0) {
      if (comment) {
        const end = rest.indexOf('-->');
        if (end < 0) { rest = ''; break; }
        comment = false;
        rest = rest.slice(end + 3);
      } else {
        const start = rest.indexOf('<!--');
        if (start < 0) { line += rest; break; }
        line += rest.slice(0, start);
        comment = true;
        rest = rest.slice(start + 4);
      }
    }
    // A frontmatter fence or a rule, and the line under a table's heading.
    if (/^\s*-{3,}\s*$/.test(line) || /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) return;
    // Inline code, and markup: a tag's attributes (a figure's
    // `style="fill: var(--color-teal)"`) are not prose, and neither is a
    // custom property written on a line of its own inside a long tag.
    const prose = line.replace(/`[^`]*`/g, '').replace(/<[^>]*>/g, '').replace(/var\(--[\w-]+\)|--[\w-]+\s*:/g, '');
    if (EM_DASH.test(prose) || DOUBLE_DASH.test(prose)) problems.push(`${index + 1}: ${raw.trim().slice(0, 100)}`);
  });
  return problems;
}

function files(dir: string, pattern: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, pattern, out);
    else if (pattern.test(name)) out.push(path);
  }
  return out;
}

describe('the dash rule: reading a file', () => {
  it('finds an em dash, its entities and a double dash in prose', () => {
    const entities = ['mdash', '#8212', '#x2014'].map((name) => `&${name};`).join(' and ');
    assert.deepEqual(dashProblems(`Fine.\nA pause \u2014 here.\nTwo ${entities}.\nA pause -- here.`), [
      '2: A pause \u2014 here.',
      `3: Two ${entities}.`,
      '4: A pause -- here.',
    ]);
  });

  it('finds them in frontmatter values too', () => {
    assert.deepEqual(dashProblems('---\ntitle: "Debt \u2014 a guide"\n---\nBody.'), ['2: title: "Debt \u2014 a guide"']);
  });

  it('leaves code, comments, rules and table lines alone', () => {
    const text = [
      '---', 'title: Fine', '---',
      'Run `npm run build -- --watch` to rebuild.',
      '```sh', 'git log --oneline -- file \u2014 x', '```',
      '<!-- a note -- with dashes \u2014 inside -->',
      '<!-- one that', 'runs on -- over lines', '-->',
      '| A | B |', '|---|:--:|', '| 1 | 2 |',
      '<text class="fig-label" style="fill: var(--color-teal);">Paid off</text>',
      '  stroke="var(--color-border)"', '  style="--lc: 2"',
      '', '----', 'An en dash is fine: 2020\u20132024, and so is a hyphen-ated word.',
    ].join('\n');
    assert.deepEqual(dashProblems(text), []);
  });

  it('still reads the words inside markup', () => {
    assert.deepEqual(dashProblems('<text class="fig-label">Before \u2014 after</text>'), ['1: <text class="fig-label">Before \u2014 after</text>']);
  });

  it('still reads the text after a comment on the same line', () => {
    assert.deepEqual(dashProblems('<!-- note --> A pause \u2014 here.'), ['1: <!-- note --> A pause \u2014 here.']);
  });
});

describe('the dash rule: lessons, guides, situations and served text', () => {
  const content = files(join(ROOT, 'src', 'content'), /\.(md|mdx)$/);
  const served = files(join(ROOT, 'public'), /\.txt$/).filter((path) => !path.endsWith('third-party-notices.txt'));

  it('reads the files it is meant to', () => {
    assert.ok(content.length >= 80, `only ${content.length} content files found`);
    assert.ok(served.some((path) => path.endsWith('llms.txt')), 'public/llms.txt is not among the served text files');
  });

  it('finds no em dash and no double dash in any of them', () => {
    const offenders = [...content, ...served].flatMap((path) => dashProblems(readFileSync(path, 'utf8')).map((problem) => `${relative(ROOT, path)}:${problem}`));
    assert.deepEqual(offenders, [], 'CLAUDE.md, "Style Rules": use a colon, a comma, or reword.');
  });
});

describe('the dash rule: emails and the files that send them', () => {
  const scripts = join(ROOT, 'scripts');
  const sources = [
    ...files(join(ROOT, 'emails'), /./),
    ...readdirSync(scripts).filter((name) => /\.(gs|py)$/.test(name)).map((name) => join(scripts, name)),
  ];

  it('reads the templates and the senders', () => {
    for (const name of ['post.html.j2', 'post_teaser.txt.j2', 'newsletter.gs', 'waitlist.gs', 'send_newsletter.py']) {
      assert.ok(sources.some((path) => path.endsWith(name)), `${name} is not among the files read`);
    }
  });

  it('finds no em dash in any of them', () => {
    const offenders = sources.flatMap((path) =>
      readFileSync(path, 'utf8').split(/\r?\n/).flatMap((line, index) => (EM_DASH.test(line) ? [`${relative(ROOT, path)}:${index + 1}: ${line.trim().slice(0, 100)}`] : [])));
    assert.deepEqual(offenders, [], 'CLAUDE.md, "Style Rules": use a colon, a comma, or reword. A test that needs the character writes it as an escape.');
  });
});
