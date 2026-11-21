/**
 * The palette meets the contrast targets docs/color-palette.md sets, and
 * palette.ts says what global.css says (#364).
 *
 *   - PALETTE: every identity is 8:1 or more (AAA) on its background, white in
 *     light and #1E1E1E in dark; the one exception the guide records is the
 *     dark-mode teal for text and charts, #26A69A, at AA (5.6:1 on #1E1E1E).
 *   - SEMANTIC: each pair the site draws text with is 4.5:1 or more (AA):
 *     white on the CTA, destructive and callout fills, status text on its
 *     surface, warning text on its notice. The light warning and info
 *     colours are under 4.5:1 on white and are for fills, borders and icons
 *     only; no stylesheet may set them as a text colour.
 *   - CHART_SERIES: held to 3:1 against the card by chartColors.test.ts.
 *   - Mirror: every value here is the value of its CSS constant, so a colour
 *     changed on one side only fails.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NEUTRAL, PALETTE, SEMANTIC } from './palette.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src/styles/global.css'), 'utf8');

/** The first value each custom property gets in a `:root {` block. */
const constants = new Map<string, string>();
for (const block of css.split('\n:root {').slice(1)) {
  for (const m of block.slice(0, block.indexOf('\n}')).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    if (!constants.has(m[1])) constants.set(m[1], m[2].trim());
  }
}
function resolve(value: string, depth = 0): string {
  assert.ok(depth < 12, `too deep: ${value}`);
  const m = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (!m) return value.trim().toUpperCase();
  const next = constants.get(m[1]);
  assert.ok(next, `${m[1]} is not defined in a :root block`);
  return resolve(next, depth + 1);
}

function luminance(hex: string): number {
  assert.match(hex, /^#[0-9A-F]{6}$/i, `not a six-digit hex colour: ${hex}`);
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const kebab = (key: string) => key.replace(/([a-z])([A-Z0-9])/g, '$1-$2').replace(/([0-9])([A-Z])/g, '$1-$2').toLowerCase();

const WHITE = NEUTRAL.white;
const SURFACE_DARK = NEUTRAL.surfaceDark;
const PAGE_DARK = NEUTRAL.pageBgDark;

describe('palette.ts mirrors global.css', () => {
  const families: Array<[string, Record<string, string>, (key: string) => string]> = [
    ['PALETTE', PALETTE, (k) => `--palette-${kebab(k)}`],
    ['NEUTRAL', NEUTRAL, (k) => `--neutral-${kebab(k).replace(/^n-?(?=\d)/, '')}`],
    ['SEMANTIC', SEMANTIC, (k) => (/^(status|notice|warning(Light|Dark)[A-Z])/.test(k) ? `--${kebab(k)}` : `--semantic-${kebab(k)}`)],
  ];
  for (const [family, values, cssName] of families) {
    it(`every ${family} value is its CSS constant's value`, () => {
      for (const [key, value] of Object.entries(values)) {
        const name = cssName(key);
        const declared = constants.get(name);
        assert.ok(declared, `${family}.${key}: ${name} is not in global.css`);
        assert.equal(value.toUpperCase(), resolve(declared), `${family}.${key} is ${value}, but ${name} is ${declared}`);
      }
    });
  }
});

describe('palette contrast, as docs/color-palette.md sets it', () => {
  it('every light identity is AAA (8:1) on white', () => {
    for (const [key, value] of Object.entries(PALETTE)) {
      if (key.endsWith('Dark')) continue;
      assert.ok(contrast(value, WHITE) >= 8, `${key} ${value} is ${contrast(value, WHITE).toFixed(2)}:1 on white`);
    }
  });

  it('every dark identity is AAA (8:1) on #1E1E1E, except the dark-mode teal at AA', () => {
    for (const [key, value] of Object.entries(PALETTE)) {
      if (!key.endsWith('Dark') || key === 'tealMidDark') continue;
      assert.ok(contrast(value, SURFACE_DARK) >= 8, `${key} ${value} is ${contrast(value, SURFACE_DARK).toFixed(2)}:1 on #1E1E1E`);
    }
    // The guide's one exception: 5.6:1 on #1E1E1E and 6.3:1 on #121212.
    assert.ok(contrast(PALETTE.tealMidDark, SURFACE_DARK) >= 5.5, 'tealMidDark keeps the 5.6:1 the guide gives');
    assert.ok(contrast(PALETTE.tealMidDark, PAGE_DARK) >= 6.2, 'tealMidDark keeps the 6.3:1 the guide gives on the page');
  });

  it('every fill that holds white text holds it at AA (4.5:1)', () => {
    const fills = ['ctaBgLight', 'ctaBgHoverLight', 'ctaBgDark', 'ctaBgHoverDark', 'destructiveBg', 'destructiveBgHover', 'calloutBg'] as const;
    for (const key of fills) {
      assert.ok(contrast(WHITE, SEMANTIC[key]) >= 4.5, `white on ${key} ${SEMANTIC[key]} is ${contrast(WHITE, SEMANTIC[key]).toFixed(2)}:1`);
    }
  });

  it('every status and warning text colour is AA (4.5:1) on the surface it is written on', () => {
    const pairs: Array<[string, string, string, string]> = [
      ['successLight', SEMANTIC.successLight, 'white', WHITE],
      ['dangerLight', SEMANTIC.dangerLight, 'white', WHITE],
      ['statusErrorLight', SEMANTIC.statusErrorLight, 'white', WHITE],
      ['destructiveTextLight', SEMANTIC.destructiveTextLight, 'white', WHITE],
      ['successDark', SEMANTIC.successDark, '#1E1E1E', SURFACE_DARK],
      ['warningDark', SEMANTIC.warningDark, '#1E1E1E', SURFACE_DARK],
      ['dangerDark', SEMANTIC.dangerDark, '#1E1E1E', SURFACE_DARK],
      ['infoDark', SEMANTIC.infoDark, '#1E1E1E', SURFACE_DARK],
      ['destructiveTextDark', SEMANTIC.destructiveTextDark, '#1E1E1E', SURFACE_DARK],
      ['statusSuccessOnDark', SEMANTIC.statusSuccessOnDark, 'calloutBg', SEMANTIC.calloutBg],
      ['statusErrorOnDark', SEMANTIC.statusErrorOnDark, 'calloutBg', SEMANTIC.calloutBg],
      ['warningLightText', SEMANTIC.warningLightText, 'warningLightBg', SEMANTIC.warningLightBg],
      ['warningLightTextStrong', SEMANTIC.warningLightTextStrong, 'warningLightBg', SEMANTIC.warningLightBg],
    ];
    for (const [name, ink, surfaceName, surface] of pairs) {
      assert.ok(contrast(ink, surface) >= 4.5, `${name} ${ink} on ${surfaceName} is ${contrast(ink, surface).toFixed(2)}:1`);
    }
  });

  it('the light warning and info colours, under 4.5:1 on white, are never a text colour', () => {
    assert.ok(contrast(SEMANTIC.warningLight, WHITE) < 4.5 && contrast(SEMANTIC.infoLight, WHITE) < 4.5, 'if either now reaches 4.5:1, this rule can go');
    const sheets = readdirSync(join(ROOT, 'src/styles')).filter((f) => f.endsWith('.css'));
    const text = /(?:^|[;{\s])color:\s*var\(--(?:color-warning|semantic-warning-light|color-info|semantic-info-light)\)/m;
    for (const sheet of sheets) {
      const source = readFileSync(join(ROOT, 'src/styles', sheet), 'utf8');
      for (const rule of source.split('}')) {
        if (!text.test(rule)) continue;
        const selector = rule.slice(0, rule.indexOf('{')).trim().split('\n').pop()?.trim() ?? '';
        // In a dark-only rule the token resolves to its dark value, which is AA.
        if (selector.split(',').every((s) => s.trim().startsWith('[data-theme="dark"]'))) continue;
        assert.fail(`${sheet}: ${selector} writes text in a colour under 4.5:1 on white in light mode`);
      }
    }
  });
});
