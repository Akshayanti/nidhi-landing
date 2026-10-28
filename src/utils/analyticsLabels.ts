/**
 * The registry of click labels: every `data-attr` the site can render.
 *
 * Click events keep an element's `data-attr` only when this registry knows it
 * (`src/utils/shared/cleanElements.js`), so a label is how the site tells clicks
 * apart and nothing else can pass as one. It is read from the source at build
 * time, by `Analytics.astro`, so a new button needs no extra step; the test
 * fails if a `data-attr` is written in a form this reader cannot resolve.
 *
 * Three forms are resolved:
 *   - a literal, `data-attr="post-nav-next"`, or the quoted strings inside an
 *     expression, `data-attr={returning ? 'blog-start-continue' : '...'}`;
 *   - a template, `data-attr={`lc-tab-${t.id}`}`: its fixed start becomes a
 *     prefix, which the click filter accepts only before a lowercase slug;
 *   - a property, `data-attr={post.dataAttr}`, whose values are the
 *     `dataAttr: '...'` and `attr: '...'` entries written in the source, or a
 *     component's own prop, `data-attr={xlsxAttr}`, whose values are the
 *     `xlsxAttr="..."` written where the component is used.
 *
 * Node-only: it reads files. Only the build and the tests run it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface LabelRegistry {
  exact: string[];
  prefixes: string[];
}

export interface LabelScan extends LabelRegistry {
  /** `data-attr` expressions this reader could not resolve, with their file. */
  unresolved: string[];
}

const SOURCE = /\.(astro|tsx|ts|jsx|js|mjs)$/;
// Lessons can link to a tool with a plain `data-attr="..."` in their Markdown.
const CONTENT = /\.(md|mdx)$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// The click filter itself writes `data-attr` as text; it renders none.
const SKIP = /(analyticsLabels\.ts|cleanElements\.js)$/;
const QUOTED = /'([^'\\\n]*)'|"([^"\\\n]*)"/g;

function files(dir: string, match: RegExp): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...files(path, match));
    else if (match.test(name) && !/\.test\./.test(name) && !SKIP.test(path)) out.push(path);
  }
  return out;
}

const sourceFiles = (dir: string) => files(dir, SOURCE);

/** The text between a `{` at `start` and its matching `}`. */
function braced(text: string, start: number): string | null {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(start + 1, i);
  }
  return null;
}

export function scanLabels(srcDir: string): LabelScan {
  const exact = new Set<string>();
  const prefixes = new Set<string>();
  const unresolved: string[] = [];
  let needsProperties = false;

  for (const file of sourceFiles(srcDir)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/data-attr="([^"]*)"/g)) exact.add(m[1]);

    for (const m of text.matchAll(/data-attr=\{/g)) {
      const expr = braced(text, m.index! + 'data-attr='.length)?.trim();
      if (expr === undefined) {
        unresolved.push(`${file}: unclosed data-attr expression`);
        continue;
      }
      const template = /^`([^`$]*)(\$\{[\s\S]*)?`$/.exec(expr);
      if (template) {
        if (!template[2]) exact.add(template[1]);
        else if (template[1]) prefixes.add(template[1]);
        else unresolved.push(`${file}: data-attr={${expr}} starts with a variable`);
        continue;
      }
      const quoted = [...expr.matchAll(QUOTED)].map((q) => q[1] ?? q[2]);
      if (quoted.length > 0) {
        quoted.forEach((q) => exact.add(q));
        continue;
      }
      if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*\.(dataAttr|attr)$/.test(expr) || /^[a-z][A-Za-z0-9]*Attr$/.test(expr)) {
        needsProperties = true;
        continue;
      }
      unresolved.push(`${file}: data-attr={${expr}}`);
    }
  }

  for (const file of files(srcDir, CONTENT)) {
    for (const m of readFileSync(file, 'utf8').matchAll(/data-attr="([^"]*)"/g)) exact.add(m[1]);
  }

  if (needsProperties) {
    for (const file of sourceFiles(srcDir)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\b(?:dataAttr|attr):\s*'([^'\\\n]+)'/g)) exact.add(m[1]);
      for (const m of text.matchAll(/\b[a-z][A-Za-z0-9]*Attr="([^"]+)"/g)) exact.add(m[1]);
    }
  }

  // Only a slug can pass as a label (the click filter's own rule), so anything
  // else a loose match picked up is left out rather than carried around.
  return {
    exact: [...exact].filter((l) => SLUG.test(l)).sort(),
    prefixes: [...prefixes].filter((p) => SLUG.test(p.replace(/-$/, ''))).sort(),
    unresolved,
  };
}
