/**
 * Fixture tests for scripts/lib/checks/lint-figures.mjs, the prebuild gate on lesson
 * figures (#364). Each check is shown passing on a good figure and failing on
 * the mistake it exists for. The stylesheet is the real one unless a test
 * needs a broken one.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lintFigures } from './lib/checks/lint-figures.mjs';

const ROOT = join(import.meta.dirname, '..');
const CSS = readFileSync(join(ROOT, 'src/styles/global.css'), 'utf8');
const LAYOUT = { path: 'src/layouts/BlogPost.astro', text: '<article><slot /></article>\n<style>\n  .post { color: red; }\n</style>\n' };

function lint(figure, { css = CSS, layout = LAYOUT } = {}) {
  const text = `---\nslug: x\n---\n\nIntro.\n\n${figure}\n\nAfter.\n`;
  return lintFigures({ files: [{ path: 'src/content/blog/x.md', text }], layout, css });
}

/** A figure with a phone-ready width and theme-coloured parts. */
const GOOD = [
  '<figure>',
  '<svg viewBox="0 0 720 360" role="img" aria-labelledby="t1"><title id="t1">Growth</title>',
  '<rect class="fig-fill-blue" x="10" y="10" width="100" height="40"/>',
  '<text class="fig-on-fill" x="20" y="30">€100</text>',
  '<rect class="fig-fill-warn" x="200" y="10" width="100" height="40"/>',
  '<text class="fig-on-warn" x="210" y="30">Fees</text>',
  '<text class="fig-label" x="400" y="30">Outside any box</text>',
  '</svg>',
  '<figcaption>A caption.</figcaption>',
  '</figure>',
].join('\n');

describe('lint-figures', () => {
  it('passes a well-made figure', () => {
    assert.deepEqual(lint(GOOD), []);
  });

  it('reports a blank line inside a figure, at the blank line', () => {
    const errors = lint(GOOD.replace('<text class="fig-label"', '\n<text class="fig-label"'));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^src\/content\/blog\/x\.md:\d+: blank line inside <figure> block/);
    const line = Number(/:(\d+):/.exec(errors[0])[1]);
    const text = `---\nslug: x\n---\n\nIntro.\n\n${GOOD.replace('<text class="fig-label"', '\n<text class="fig-label"')}`;
    assert.equal(text.split('\n')[line - 1].trim(), '', 'the line named is the blank one');
  });

  it('reports a viewBox width that has no minimum width rule', () => {
    const errors = lint(GOOD.replace('0 0 720 360', '0 0 613 360'));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /figure viewBox width 613 has no minimum width/);
  });

  it('reports figure CSS in a scoped style block of the layout, but not in a global one or a comment', () => {
    const scoped = { path: LAYOUT.path, text: '<style>\n  .prose figure { margin: 0; }\n</style>\n' };
    assert.match(lintFigures({ files: [], layout: scoped, css: CSS })[0], /BlogPost\.astro:1: figure CSS/);
    const global = { path: LAYOUT.path, text: '<style is:global>\n  .fig-label { fill: red; }\n</style>\n' };
    assert.deepEqual(lintFigures({ files: [], layout: global, css: CSS }), []);
    const comment = { path: LAYOUT.path, text: '<style>\n  /* .fig-* rules live in global.css */\n  .post { margin: 0; }\n</style>\n' };
    assert.deepEqual(lintFigures({ files: [], layout: comment, css: CSS }), []);
  });

  it('reports a colour written into a figure, in each form', () => {
    for (const colour of ['fill="#ff0000"', 'stroke="rgb(1,2,3)"', 'style="color: white"', 'fill="var(--neutral-white)"', 'stop-color="hsl(1,2%,3%)"']) {
      const errors = lint(GOOD.replace('<text class="fig-label"', `<text ${colour} class="fig-label"`));
      assert.equal(errors.length, 1, colour);
      assert.match(errors[0], /writes a colour of its own/, colour);
    }
    assert.deepEqual(lint(GOOD.replace('class="fig-label"', 'class="fig-label" fill="var(--color-text)"')), [], 'a theme variable is fine');
  });

  it('reports a label on a solid fill without the ink for that fill', () => {
    const errors = lint(GOOD.replace('class="fig-on-fill" x="20"', 'class="fig-label" x="20"'));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /sits on a \.fig-fill-blue shape and needs class="fig-on-fill"/);
    const warn = lint(GOOD.replace('class="fig-on-warn"', 'class="fig-on-fill"'));
    assert.match(warn[0], /sits on a \.fig-fill-warn shape and needs class="fig-on-warn"/);
  });

  it('counts the number classes as on-fill ink', () => {
    assert.deepEqual(lint(GOOD.replace('class="fig-on-fill" x="20"', 'class="fig-num-lg" x="20"')), []);
  });

  it('reports an on-fill ink with no fill under it', () => {
    const errors = lint(GOOD.replace('class="fig-label" x="400"', 'class="fig-on-fill" x="400"'));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /has an on-fill ink class but does not sit on a solid filled rectangle/);
  });

  it('leaves tinted shapes to ordinary text', () => {
    const tinted = GOOD.replace('<rect class="fig-fill-blue" x="10"', '<rect class="fig-fill-blue" fill-opacity="0.2" x="10"').replace('class="fig-on-fill" x="20"', 'class="fig-label" x="20"');
    assert.deepEqual(lint(tinted), []);
  });

  it('reports a fill and ink pair under 4.5:1 in the stylesheet', () => {
    // Dark mode's on-fill ink made the same as the blue it sits on.
    const css = `${CSS}\n[data-theme="dark"] {\n  --fig-on-fill: var(--color-deep-blue);\n}\n`;
    const errors = lint(GOOD, { css });
    assert.ok(errors.some((e) => /a label on \.fig-fill-blue is 1\.00:1 in the dark theme/.test(e)), errors.join('\n'));
  });

  it('reports a token that does not resolve to a colour', () => {
    const css = `${CSS}\n:root {\n  --fig-on-warn: inherit;\n}\n`;
    const errors = lint(GOOD, { css });
    assert.ok(errors.some((e) => /--color-warning or --fig-on-warn does not resolve to a colour in the light theme/.test(e)), errors.join('\n'));
  });
});
