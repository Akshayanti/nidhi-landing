import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMatrix, toSvg } from './encode.ts';
import { clearCentre, logoBox, toSvgWithLogo } from './logo.ts';

test('the cleared square is centred, at most 7.3% of the code, and clear of the corners', () => {
  for (let version = 1; version <= 40; version++) {
    const size = version * 4 + 17;
    const { start, span } = logoBox(size);
    assert.equal(start * 2 + span, size, `centred at version ${version}`);
    assert.ok((span * span) / (size * size) <= 0.073, `coverage at version ${version}`);
    assert.ok(start >= 9 && start + span <= size - 9, `clear of finders and format bits at version ${version}`);
    assert.ok(span >= 3, `room for the icon at version ${version}`);
  }
});

test('only the centre square changes', () => {
  const m = makeMatrix('https://nidhi.today/?utm_source=event&utm_medium=social_in_person&utm_campaign=pint-of-view&utm_content=qr', 'H');
  const c = clearCentre(m);
  const { start, span } = logoBox(m.length);
  m.forEach((row, y) =>
    row.forEach((cell, x) => {
      const inside = x >= start && x < start + span && y >= start && y < start + span;
      assert.equal(c[y][x], inside ? false : cell);
    }),
  );
});

test('the SVG is the cleared code plus the icon, nothing else', () => {
  const m = makeMatrix('https://nidhi.today/', 'H');
  const svg = toSvgWithLogo(m, 4, '#0A3D8F');
  const base = toSvg(clearCentre(m), 4, '#0A3D8F', '#ffffff');
  assert.ok(svg.startsWith(base.replace('</svg>\n', '')));
  assert.match(svg, /<g transform="translate\([\d.]+ [\d.]+\) scale\([\d.]+\)" shape-rendering="geometricPrecision">/);
  assert.ok(svg.endsWith('</g></svg>\n'));
});
