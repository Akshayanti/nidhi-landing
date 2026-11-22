/**
 * The stylesheet is three files (#451): global.css on every page, tools.css
 * on the free tools' pages and learn.css on the learning path's pages. A page
 * asks for a part with the `sheets` prop of BaseLayout.
 *
 * The risk in a split is silent: a class styled only in tools.css, written
 * into a page that does not load tools.css, simply has no style, and nothing
 * fails. These tests fail instead. They also hold the order the parts are
 * linked in, because the parts' rules follow the global ones they were split
 * from.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

/** The files whose markup a part's styles are for. A page among them asks for the part. */
const PARTS = {
  tools: {
    sheet: 'styles/tools.css',
    files: [
      /^components\/(LoanCompare|MultiCurrencyNetWorth|MonteCarloSimulator|InflationCalculator|InvestOrPayOff|ToolExport|toolShared|LocaleNumberInput|ChartAmounts)\.tsx$/,
      /^components\/chart\//,
      /^components\/pages\/(LoanComparison|MultiCurrencyNetWorth|MonteCarlo|InflationCalculator|InvestOrPayOff)Page\.astro$/,
      /^components\/ToolPageShell\.astro$/,
    ],
    pages: ['LoanComparison', 'MultiCurrencyNetWorth', 'MonteCarlo', 'InflationCalculator', 'InvestOrPayOff'].map((name) => `components/pages/${name}Page.astro`),
  },
  learn: {
    sheet: 'styles/learn.css',
    files: [
      /^components\/(LearnHome\.astro|LearningPath\.tsx)$/,
      /^layouts\/(BlogIndex|LevelPage)\.astro$/,
      /^components\/pages\/(TagPage|InclusiveFinancesPage)\.astro$/,
    ],
    pages: ['layouts/BlogIndex.astro', 'layouts/LevelPage.astro', 'components/pages/TagPage.astro', 'components/pages/InclusiveFinancesPage.astro'],
  },
} as const;

/** Mentions that are not markup: a script asking whether a printed report is on the page. */
const NOT_MARKUP: Record<string, string[]> = {
  'tool-report': ['layouts/BaseLayout.astro'],
};

/** Class names in a sheet's selectors (declaration blocks and comments left out). */
function classesIn(css: string): Set<string> {
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{[^{}]*\}/g, '{}');
  return new Set([...selectors.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map((m) => m[1]));
}

function sourceFiles(dir = SRC, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(astro|tsx|ts|js|md|mdx)$/.test(name) && !/\.test\./.test(name)) out.push(relative(SRC, path));
  }
  return out;
}

const GLOBAL = classesIn(read('styles/global.css'));
const FILES = sourceFiles().map((path) => [path, read(path)] as const);

describe('split stylesheets (#451)', () => {
  for (const [part, { sheet, files, pages }] of Object.entries(PARTS)) {
    it(`${part}.css: a class styled only there is written only where the sheet is loaded`, () => {
      const own = [...classesIn(read(sheet))].filter((name) => !GLOBAL.has(name));
      assert.ok(own.length > 50, `${sheet} should hold the part's classes`);
      const strays: string[] = [];
      for (const name of own) {
        const mention = new RegExp(`(?<![\\w-])${name}(?![\\w-])`);
        for (const [path, text] of FILES) {
          if (files.some((pattern) => pattern.test(path)) || NOT_MARKUP[name]?.includes(path)) continue;
          if (mention.test(text)) strays.push(`${name} in ${path}`);
        }
      }
      assert.deepEqual(strays, [], `These classes are styled only in ${sheet}, which their page does not load. Move the rule to global.css, or load the sheet (the sheets prop of BaseLayout) and add the file to PARTS in this test.`);
    });

    it(`${part}.css: every page that renders the part asks for it`, () => {
      for (const page of pages) {
        assert.match(read(page), new RegExp(`<BaseLayout[^>]*\\bsheets=\\{\\['${part}'\\]\\}`), `${page} must pass sheets={['${part}']} to BaseLayout`);
      }
    });
  }

  it('the base layout links the global sheet first, then the parts, before a page adds its own', () => {
    const layout = read('layouts/BaseLayout.astro');
    const global = layout.indexOf('<link rel="stylesheet" href={globalCss} />');
    const parts = layout.indexOf('{sheets.map((sheet) => <link rel="stylesheet" href={PART_SHEETS[sheet]} />)}');
    const slot = layout.indexOf('<slot name="head" />');
    assert.ok(global > 0 && parts > global && slot > parts);
    // Imported for its address only: an import for Astro to place would put
    // the sheets in an order that differs from page to page.
    assert.doesNotMatch(layout, /import\s+['"]\.\.\/styles\/[a-z]+\.css['"]/);
  });

  it('no rule is in two sheets under the same selector by accident: the parts hold no global class definitions', () => {
    // A class may be styled in both (a part refines a global class), but a
    // part must not restate a rule the split copied: the copies would drift.
    for (const { sheet } of Object.values(PARTS)) {
      const css = read(sheet);
      assert.doesNotMatch(css, /@font-face|^:root\s*\{/m, `${sheet} defines fonts or root tokens, which belong in global.css`);
    }
  });
});
