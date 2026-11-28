/**
 * public/third-party-notices.txt against what the site ships (#359).
 *
 * CLAUDE.md, "Third-Party Notices Stay Current": nothing updates that file
 * automatically, and carrying the licence text is the one condition those
 * licences set. So a font file, a package whose code reaches the browser, or
 * a dataset that the file does not name fails here, and so does an entry for
 * something that has left.
 *
 * The three maps below are the expected list. Adding a font, a client package
 * or a dataset means adding its notice (licence text and copyright line from
 * upstream, verbatim) and then its line here.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const NOTICES = readFileSync(join(ROOT, 'public', 'third-party-notices.txt'), 'utf8');
const RULE = 'See CLAUDE.md, "Third-Party Notices Stay Current", and public/third-party-notices.txt.';

/** The file's sections, by their heading in capitals between two rules. */
function section(heading: string): string {
  const parts = NOTICES.split(/^={20,}$/m);
  const found = parts.find((part) => part.trimStart().startsWith(`${heading}\n`));
  assert.ok(found, `third-party-notices.txt has no "${heading}" section`);
  return found;
}

/** Font file prefix (public/fonts/<prefix>-*.woff2) to the family named in the notices. */
const FONT_FAMILIES: Record<string, string> = {
  inter: 'Inter',
  roboto: 'Roboto',
  'noto-devanagari': 'Noto Sans Devanagari',
};

/**
 * Packages imported by code that reaches the browser, to the heading that
 * carries their licence. `react` brings `react-dom` and `scheduler` with it.
 */
const CLIENT_PACKAGES: Record<string, string> = {
  react: 'react, react-dom and scheduler',
  // Imported by name since the charts' flushSync (#889); the same notice.
  'react-dom': 'react, react-dom and scheduler',
};

/** Packages imported under src/ that run at build time only, each with where. */
const BUILD_ONLY_PACKAGES: Record<string, string> = {
  // The RSS endpoints (src/pages/rss.xml.ts, the changes feeds) run in the build.
  '@astrojs/rss': 'feeds are written at build time',
  // Types and build-time helpers.
  astro: 'the framework; its own notice is in the file for the runtime it ships',
  // src/utils/listCount.ts reads the build's environment with it, in Node.
  vite: 'loadEnv at build time',
};

/** Folders under src/data/ to the source named in the notices. */
const DATASETS: Record<string, string> = {
  inflation: 'World Bank',
};

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, out);
    else out.push(path);
  }
  return out;
}

/** Bare package names a source file imports (`react`, `@scope/name`), Node and Astro virtual modules left out. */
export function packagesImported(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (/^[./]/.test(specifier) || /^(node|astro):/.test(specifier)) continue;
    const parts = specifier.split('/');
    found.add(specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
  }
  return [...found].sort();
}

describe('third-party notices: fonts', () => {
  const fontFiles = readdirSync(join(ROOT, 'public', 'fonts')).filter((name) => /\.(woff2?|ttf|otf)$/.test(name));
  const prefixOf = (file: string) => Object.keys(FONT_FAMILIES).sort((a, b) => b.length - a.length).find((prefix) => file.startsWith(prefix));
  const fonts = section('FONTS');

  it('every font file served belongs to a family the notices name', () => {
    assert.ok(fontFiles.length > 0);
    for (const file of fontFiles) {
      const prefix = prefixOf(file);
      assert.ok(prefix, `public/fonts/${file} is a font no notice covers. ${RULE}`);
      assert.match(fonts, new RegExp(`^${FONT_FAMILIES[prefix]}, .*\\n(Copyright .*)$`, 'm'), `${FONT_FAMILIES[prefix]} needs its name and copyright line under FONTS. ${RULE}`);
    }
  });

  it('the notices name no font family that is no longer served', () => {
    // A family is a name, where it is used, and its copyright line with a year.
    const named = [...fonts.matchAll(/^([A-Z][^\n,]*), [^\n]*\nCopyright (?:\(c\) )?\d{4} /gm)].map((m) => m[1]);
    assert.deepEqual(named.sort(), Object.values(FONT_FAMILIES).sort());
    for (const [prefix, family] of Object.entries(FONT_FAMILIES)) {
      assert.ok(fontFiles.some((file) => prefixOf(file) === prefix), `${family} is in the notices but public/fonts/ has no ${prefix}-* file. ${RULE}`);
    }
  });
});

describe('third-party notices: JavaScript sent to browsers', () => {
  const sources = files(join(ROOT, 'src')).filter((path) => /\.(tsx?|jsx?|mjs|astro)$/.test(path) && !/\.test\.|\.d\.ts$/.test(path));
  const imported = new Map<string, string[]>();
  for (const path of sources) {
    for (const name of packagesImported(readFileSync(path, 'utf8'))) {
      imported.set(name, [...(imported.get(name) ?? []), relative(ROOT, path)]);
    }
  }
  const browser = `${section('JAVASCRIPT SENT TO BROWSERS')}\n${NOTICES}`;

  it('every package the source imports is either noticed or known to be build-only', () => {
    for (const [name, where] of imported) {
      assert.ok(name in CLIENT_PACKAGES || name in BUILD_ONLY_PACKAGES, `${name} is imported (${where[0]}) and is in neither list in this test. If its code reaches the browser, add its notice first. ${RULE}`);
    }
  });

  it('every package that reaches the browser has its heading and a licence under it', () => {
    for (const [name, heading] of Object.entries(CLIENT_PACKAGES)) {
      assert.ok(imported.has(name), `${name} is listed as a client package but nothing imports it; remove its notice and its line here. ${RULE}`);
      const at = browser.indexOf(`\n${heading}\n`);
      assert.ok(at >= 0, `the notices have no "${heading}" entry. ${RULE}`);
      assert.match(browser.slice(at, at + 400), /License[\s\S]*Copyright \(c\)/, `"${heading}" needs its licence and copyright line`);
    }
  });

  it('every noticed package is still a dependency', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
    for (const name of ['react', 'react-dom', 'astro', '@astrojs/react']) {
      assert.ok(name in manifest.dependencies, `${name} has a notice but is not a dependency. ${RULE}`);
    }
    // scheduler comes with react-dom rather than being asked for by name.
    assert.ok('node_modules/scheduler' in lock.packages, `scheduler has a notice but is no longer installed. ${RULE}`);
  });

  it('reads imports the way they are written', () => {
    assert.deepEqual(packagesImported(`import { useState } from 'react';\nimport type { APIContext } from "astro";\nimport rss from '@astrojs/rss';\nimport './a.css';\nimport { x } from '../y.ts';\nimport fs from 'node:fs';\nimport { getCollection } from 'astro:content';\nconst m = await import('react-dom/client');`), ['@astrojs/rss', 'astro', 'react', 'react-dom']);
  });
});

describe('third-party notices: data', () => {
  const data = section('DATA');

  it('every dataset kept in the repository names its source', () => {
    const folders = readdirSync(join(ROOT, 'src', 'data'));
    assert.deepEqual(folders.sort(), Object.keys(DATASETS).sort(), `src/data/ and the DATASETS list in this test differ. ${RULE}`);
    for (const [folder, source] of Object.entries(DATASETS)) {
      assert.ok(data.includes(source), `the DATA section does not name ${source} (src/data/${folder}). ${RULE}`);
      assert.match(data, /Licensed under /, 'a dataset entry states its licence');
    }
  });
});
