/**
 * Chart colours meet WCAG in both themes, and stay that way.
 *
 *   - 1.4.11 (non-text contrast): every series colour and every risk fill is
 *     3:1 or more against the card and the page it is drawn on.
 *   - 1.4.3 (text contrast): the ink used on a series colour or a risk fill
 *     is 4.5:1 or more against it; a series colour is never a text colour.
 *   - 1.4.1 (use of colour): every series has a marker of its own.
 *
 * The values are read from global.css as a browser would resolve them, so a
 * change to a token there is checked here.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHART_SERIES, CHART_SERIES_ON, CHART_SERIES_VALUES, RISK_COLORS } from './palette.ts';
import { seriesMarker, SERIES_MARKER_COUNT } from '../components/chart/SeriesMarker.tsx';

const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src/styles/global.css'), 'utf8');

/** Every custom property set in blocks opened by `selector {`, later ones winning. */
function declarations(selector: string): Map<string, string> {
  const out = new Map<string, string>();
  let at = 0;
  for (;;) {
    const start = css.indexOf(`\n${selector} {`, at);
    if (start < 0) break;
    const end = css.indexOf('\n}', start);
    for (const m of css.slice(start, end).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) out.set(m[1], m[2].trim());
    at = end;
  }
  return out;
}
const light = declarations(':root');
const dark = new Map([...light, ...declarations('[data-theme="dark"]')]);

function resolve(value: string, theme: Map<string, string>, depth = 0): string {
  assert.ok(depth < 12, `too deep: ${value}`);
  const m = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (!m) return value.trim().toUpperCase();
  const next = theme.get(m[1]);
  assert.ok(next, `${m[1]} is not defined`);
  return resolve(next, theme, depth + 1);
}

function luminance(hex: string): number {
  assert.match(hex, /^#[0-9A-F]{6}$/, `not a six-digit hex colour: ${hex}`);
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

const THEMES = [
  { name: 'light', vars: light, surfaces: ['--color-bg-white', '--color-bg'] },
  { name: 'dark', vars: dark, surfaces: ['--color-bg-white', '--color-bg'] },
] as const;

describe('chart series colours', () => {
  it('global.css and palette.ts hold the same eleven pairs', () => {
    assert.equal(CHART_SERIES.length, 11);
    assert.equal(CHART_SERIES_VALUES.length, 11);
    CHART_SERIES.forEach((token, i) => {
      assert.equal(token, `var(--chart-${i + 1})`);
      assert.equal(resolve(token, light), CHART_SERIES_VALUES[i][0].toUpperCase(), `slot ${i + 1}, light`);
      assert.equal(resolve(token, dark), CHART_SERIES_VALUES[i][1].toUpperCase(), `slot ${i + 1}, dark`);
    });
  });

  it('every slot is 3:1 or more against the card and the page, in both themes', () => {
    for (const theme of THEMES) {
      for (const [i, token] of CHART_SERIES.entries()) {
        for (const surface of theme.surfaces) {
          const ratio = contrast(resolve(token, theme.vars), resolve(`var(${surface})`, theme.vars));
          assert.ok(ratio >= 3, `slot ${i + 1} on ${surface} in ${theme.name} is ${ratio.toFixed(2)}:1`);
        }
      }
    }
  });

  it('the ink for a label on a slot is 4.5:1 or more against it, in both themes', () => {
    for (const theme of THEMES) {
      for (const [i, token] of CHART_SERIES.entries()) {
        const ratio = contrast(resolve(CHART_SERIES_ON[i], theme.vars), resolve(token, theme.vars));
        assert.ok(ratio >= 4.5, `ink on slot ${i + 1} in ${theme.name} is ${ratio.toFixed(2)}:1`);
      }
    }
  });

  it('no two slots share a colour within a theme', () => {
    for (const theme of THEMES) {
      const values = CHART_SERIES.map((token) => resolve(token, theme.vars));
      assert.equal(new Set(values).size, values.length, theme.name);
    }
  });

  it('a series colour is never a text colour', () => {
    // `color:` sets text. Lines, borders, fills and backgrounds may use a
    // series colour; a name is written in neutral ink beside its marker.
    const asText = [...css.matchAll(/^\s*color:\s*var\(--(lc-color|chart-\d+)\b[^;]*;/gm)].map((m) => m[0].trim());
    assert.deepEqual(asText, []);
  });
});

describe('series markers', () => {
  it('every slot has a marker of its own', () => {
    assert.equal(SERIES_MARKER_COUNT, CHART_SERIES.length);
    const seen = CHART_SERIES.map((_, i) => { const m = seriesMarker(i); return `${m.shape}${m.hollow ? ' outline' : ''}`; });
    assert.equal(new Set(seen).size, CHART_SERIES.length, seen.join(', '));
    assert.deepEqual(seen.slice(0, 5), ['circle', 'square', 'triangle', 'diamond', 'cross']);
    assert.equal(seen[10], 'plus');
  });

  it('the shapes repeat after the last slot, as the colours do', () => {
    assert.deepEqual(seriesMarker(11), seriesMarker(0));
  });
});

describe('risk colours', () => {
  const INK = 'var(--risk-on)';

  it('are the five levels and the neutral for no band, each a variable with a light and a dark value', () => {
    assert.deepEqual(Object.keys(RISK_COLORS), ['functional', 'low', 'moderate', 'elevated', 'net-debt', 'unbanded']);
    for (const token of Object.values(RISK_COLORS)) {
      assert.match(token, /^var\(--risk-[\w-]+\)$/);
      assert.notEqual(resolve(token, light), resolve(token, dark), token);
    }
  });

  it('each fill stands clear of its card (3:1) and holds its word (4.5:1), in both themes', () => {
    for (const theme of THEMES) {
      for (const [level, token] of Object.entries(RISK_COLORS)) {
        const fill = resolve(token, theme.vars);
        for (const surface of theme.surfaces) {
          const edge = contrast(fill, resolve(`var(${surface})`, theme.vars));
          assert.ok(edge >= 3, `${level} on ${surface} in ${theme.name} is ${edge.toFixed(2)}:1`);
        }
        const word = contrast(resolve(INK, theme.vars), fill);
        assert.ok(word >= 4.5, `the word on ${level} in ${theme.name} is ${word.toFixed(2)}:1`);
      }
    }
  });
});

describe('orange in the loan comparison’s split chart', () => {
  it('the label inside an orange bar and the orange label on the card both read at 4.5:1', () => {
    for (const theme of THEMES) {
      const inside = contrast(resolve('var(--chart-on-warn)', theme.vars), resolve('var(--color-warning)', theme.vars));
      assert.ok(inside >= 4.5, `inside the bar in ${theme.name}: ${inside.toFixed(2)}:1`);
      const above = contrast(resolve('var(--chart-text-warn)', theme.vars), resolve('var(--color-bg-white)', theme.vars));
      assert.ok(above >= 4.5, `above the bar in ${theme.name}: ${above.toFixed(2)}:1`);
    }
  });
});
