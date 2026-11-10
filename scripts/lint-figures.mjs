#!/usr/bin/env node
/**
 * Lint blog figures for two known rendering-pipeline gotchas that fail silently
 * in the browser but pass build + curl-DOM checks. Both are documented in
 * `docs/plans/blog-content-plan.md` Editorial Rule 9.
 *
 * Gotcha 1: CommonMark closes a raw HTML block at the first blank line. Blank
 * lines between `<figure>` and `</figure>` (e.g. for visual spacing of SVG
 * groups) terminate the block and dump the rest of the SVG markup as escaped
 * paragraph text below an empty figure box.
 *
 * Gotcha 2: Astro component-scoped `<style>` blocks add a `[data-astro-cid-*]`
 * qualifier to every selector. Markdown-slotted SVG children never receive
 * that attribute, so any `.fig-*` rule placed inside the `BlogPost.astro`
 * `<style>` block silently fails to match. Figure CSS must live in
 * `src/styles/global.css`.
 *
 * Exits non-zero on any violation so the build can fail fast.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLOG_DIR = join(ROOT, "src/content/blog");
const BLOGPOST_LAYOUT = join(ROOT, "src/layouts/BlogPost.astro");

const errors = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".md") || entry.endsWith(".mdx")) out.push(full);
  }
  return out;
}

// --- Check 1: blank lines inside <figure>...</figure> in blog markdown ---
const figureRe = /<figure\b[^>]*>[\s\S]*?<\/figure>/g;
for (const file of walk(BLOG_DIR)) {
  const text = readFileSync(file, "utf8");
  let m;
  figureRe.lastIndex = 0;
  while ((m = figureRe.exec(text)) !== null) {
    const block = m[0];
    if (/\n[ \t]*\n/.test(block)) {
      const startLine = text.slice(0, m.index).split("\n").length;
      // Pinpoint the offending blank line for a useful error message
      const lines = block.split("\n");
      let offset = 0;
      for (let i = 0; i < lines.length; i++) {
        if (i > 0 && lines[i].trim() === "" && i < lines.length - 1) {
          offset = i;
          break;
        }
      }
      errors.push(
        `${relative(ROOT, file)}:${startLine + offset}: blank line inside <figure> block. ` +
          `CommonMark closes the raw HTML block at the first blank line; ` +
          `the rest of the SVG renders as escaped paragraph text. ` +
          `Remove blank lines between <figure> and </figure>.`,
      );
    }
  }
}

// --- Check 1b: figure width must have a phone minimum width in global.css ---
// On phones, charts scroll sideways at a readable size. src/styles/global.css
// sets a min-width per viewBox width; a chart with any other width would
// shrink to an unreadable size on phones. The allowed widths are read from
// those CSS rules so the lint and the stylesheet cannot drift apart.
const GLOBAL_CSS = join(ROOT, "src/styles/global.css");
const PHONE_WIDTHS = new Set(
  Array.from(
    readFileSync(GLOBAL_CSS, "utf8").matchAll(/\.prose figure svg\[viewBox\^="0 0 (\d+) "\]\s*\{\s*min-width:/g),
    (m) => m[1],
  ),
);
const phoneWidthList = Array.from(PHONE_WIDTHS).join(", ");
for (const file of walk(BLOG_DIR)) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/<figure\b[^>]*>\s*<svg\b[^>]*\bviewBox="0 0 (\d+(?:\.\d+)?) /g)) {
    if (!PHONE_WIDTHS.has(m[1])) {
      const line = text.slice(0, m.index).split("\n").length;
      errors.push(
        `${relative(ROOT, file)}:${line}: figure viewBox width ${m[1]} has no phone min-width. ` +
          `Use one of ${phoneWidthList}, or add a matching rule to the phone block in src/styles/global.css.`,
      );
    }
  }
}

// --- Check 2: figure CSS classes inside scoped style block of BlogPost.astro ---
try {
  const layout = readFileSync(BLOGPOST_LAYOUT, "utf8");
  // Match component-scoped <style> blocks (i.e. those WITHOUT is:global)
  const styleRe = /<style(\s+[^>]*)?>([\s\S]*?)<\/style>/g;
  let sm;
  while ((sm = styleRe.exec(layout)) !== null) {
    const attrs = sm[1] || "";
    const body = sm[2];
    if (/\bis:global\b/.test(attrs)) continue; // global blocks are fine
    // Strip CSS comments so a doc-pointer comment doesn't trigger a false positive
    const bodyNoComments = body.replace(/\/\*[\s\S]*?\*\//g, "");
    if (/\.fig-[a-z-]+|\.prose\s+figure\b|\.prose\s+figcaption\b/.test(bodyNoComments)) {
      const startLine = layout.slice(0, sm.index).split("\n").length;
      errors.push(
        `${relative(ROOT, BLOGPOST_LAYOUT)}:${startLine}: figure CSS (.fig-*, .prose figure, .prose figcaption) ` +
          `found inside a scoped <style> block. Astro adds a [data-astro-cid-*] qualifier to ` +
          `scoped selectors, which markdown-slotted SVG children never receive — the rules silently ` +
          `fail to match. Move figure CSS to src/styles/global.css.`,
      );
    }
  }
} catch (e) {
  // Layout file should exist; if it doesn't, surface the error clearly
  errors.push(`could not read ${BLOGPOST_LAYOUT}: ${e.message}`);
}

// --- Check 3: figure colours come from the theme, and a label on a fill is readable ---
// Agreed by the council on 2026-11-10 (GitHub issues 391 and 406). A figure's
// shapes take role fills that turn light in dark mode. A label painted on one
// must therefore take its ink from a token that turns with it: white on the
// fills in light mode was 1.7:1 on the same fills in dark mode, and white on
// orange is 2.7:1 in either. So:
//   3a. no figure writes a colour of its own (a hex, rgb(), a colour name, or
//       the fixed --neutral-white): colours are theme variables or classes;
//   3b. a label that sits on a solid role fill carries the ink class for that
//       fill (fig-on-fill on blue, teal and green; fig-on-warn on orange), and
//       a label that carries one sits on such a fill;
//       Tinted shapes (a -soft class, or an opacity on the shape) are not
//       covered: they carry ordinary text, and their contrast depends on
//       the tint. That is a known limit of this check.
//   3c. every allowed fill and ink pair reaches 4.5:1 in both themes, read
//       from the values in src/styles/global.css, and a fill that is under
//       3:1 against the page in a theme has an outline there.
const css = readFileSync(GLOBAL_CSS, "utf8");

/** The value of a custom property in a theme, with var() references followed. */
function token(name, theme) {
  const dark = /\[data-theme="dark"\] \{([\s\S]*?)\n\}/g;
  const root = /:root \{([\s\S]*?)\n\}/g;
  const find = (re) => {
    let found;
    for (const block of css.matchAll(re)) {
      const m = new RegExp(`(?:^|\\n)\\s*${name}:\\s*([^;]+);`).exec(block[1]);
      if (m) found = m[1].trim();
    }
    return found;
  };
  const raw = (theme === "dark" && find(dark)) || find(root);
  if (!raw) return undefined;
  const ref = /^var\((--[\w-]+)\)$/.exec(raw);
  return ref ? token(ref[1], theme) : raw;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Which ink a label takes on which solid fill.
const INK_FOR_FILL = {
  "fig-fill-blue": ["fig-on-fill", "--color-deep-blue", "--fig-on-fill"],
  "fig-fill-teal": ["fig-on-fill", "--color-teal", "--fig-on-fill"],
  "fig-fill-success": ["fig-on-fill", "--color-success", "--fig-on-fill"],
  "fig-fill-warn": ["fig-on-warn", "--color-warning", "--fig-on-warn"],
};
// The two number classes are white-on-fill by definition.
const ON_FILL_CLASSES = ["fig-on-fill", "fig-num-lg", "fig-num-md"];

// 3c. The pairs themselves, and the outline where a fill does not stand clear of the page.
const PAGE = { light: "#FFFFFF", dark: "#1E1E1E" };
for (const [fill, [, fillToken, inkToken]] of Object.entries(INK_FOR_FILL)) {
  for (const theme of ["light", "dark"]) {
    const fillHex = token(fillToken, theme);
    const inkHex = token(inkToken, theme);
    if (!/^#[0-9a-fA-F]{6}$/.test(fillHex ?? "") || !/^#[0-9a-fA-F]{6}$/.test(inkHex ?? "")) {
      errors.push(`src/styles/global.css: ${fillToken} or ${inkToken} does not resolve to a colour in the ${theme} theme.`);
      continue;
    }
    const ratio = contrast(fillHex, inkHex);
    if (ratio < 4.5) {
      errors.push(`src/styles/global.css: a label on .${fill} is ${ratio.toFixed(2)}:1 in the ${theme} theme (${inkHex} on ${fillHex}); it needs 4.5:1.`);
    }
    const edge = contrast(fillHex, PAGE[theme]);
    if (edge < 3) {
      const outline = fill === "fig-fill-warn" ? token("--fig-outline-warn", theme) : undefined;
      const outlined = outline && /^#[0-9a-fA-F]{6}$/.test(outline) && contrast(outline, PAGE[theme]) >= 3 &&
        new RegExp(`\\.${fill} \\{[^}]*stroke: var\\(--fig-outline`).test(css);
      if (!outlined) {
        errors.push(`src/styles/global.css: .${fill} is ${edge.toFixed(2)}:1 against the page in the ${theme} theme and has no outline of 3:1 or more there.`);
      }
    }
  }
}

// 3a and 3b, figure by figure.
const attr = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
for (const file of walk(BLOG_DIR)) {
  const text = readFileSync(file, "utf8");
  for (const fm of text.matchAll(figureRe)) {
    const block = fm[0];
    const lineOf = (index) => text.slice(0, fm.index + index).split("\n").length;
    const where = (index) => `${relative(ROOT, file)}:${lineOf(index)}`;

    // 3a. A colour written into the figure.
    for (const m of block.matchAll(/(?:fill|stroke|color|stop-color)\s*[:=]\s*"?\s*(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|white\b|black\b|var\(--neutral-white\))/g)) {
      errors.push(`${where(m.index)}: the figure writes a colour of its own (${m[1]}). Use a theme variable or a .fig-* class; for a label on a filled shape, class="fig-on-fill" (or "fig-on-warn" on orange).`);
    }

    // 3b. Labels against the solid rectangles they sit on.
    const rects = [];
    for (const m of block.matchAll(/<rect\b[^>]*>/g)) {
      const cls = (attr(m[0], "class") ?? "").split(/\s+/);
      const fill = cls.find((c) => c in INK_FOR_FILL);
      if (!fill) continue;
      // A tinted shape (the fill at part strength) lets the page through and
      // carries ordinary text; only solid fills are checked here.
      if (/\b(?:fill-)?opacity\s*[:=]/.test(m[0])) continue;
      const [x, y, w, h] = ["x", "y", "width", "height"].map((n) => Number(attr(m[0], n)));
      if ([x, y, w, h].every(Number.isFinite)) rects.push({ fill, x, y, w, h, at: m.index });
    }
    for (const m of block.matchAll(/<text\b[^>]*>/g)) {
      const cls = (attr(m[0], "class") ?? "").split(/\s+/);
      const x = Number(attr(m[0], "x"));
      const y = Number(attr(m[0], "y"));
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      // The last rectangle drawn before the label that holds its anchor point is the one under it.
      const under = rects.filter((r) => r.at < m.index && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h).pop();
      const onFill = cls.some((c) => ON_FILL_CLASSES.includes(c));
      const onWarn = cls.includes("fig-on-warn");
      if (under) {
        const need = INK_FOR_FILL[under.fill][0];
        const has = need === "fig-on-warn" ? onWarn : onFill;
        if (!has) errors.push(`${where(m.index)}: this label sits on a .${under.fill} shape and needs class="${need}", so that it can be read in both themes.`);
      } else if (onWarn || cls.includes("fig-on-fill")) {
        errors.push(`${where(m.index)}: this label has an on-fill ink class but does not sit on a solid filled rectangle; on the page it would vanish in one theme.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("\n✗ lint-figures: blog figure rendering checks failed\n");
  for (const e of errors) console.error("  " + e);
  console.error(
    `\n${errors.length} issue${errors.length === 1 ? "" : "s"} found. ` +
      `See docs/plans/blog-content-plan.md Editorial Rule 9 for context.\n`,
  );
  process.exit(1);
}

console.log(`✓ lint-figures: ${walk(BLOG_DIR).length} blog files checked, no issues.`);
