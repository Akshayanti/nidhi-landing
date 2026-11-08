/**
 * The browser encoder must draw exactly what `scripts/qr_svg.py` draws: that
 * script was checked module by module against segno and decoded with a reader,
 * so matching it byte for byte carries that check over. Runs the script for a
 * spread of lengths (versions 1 to 40), every level, and a forced mask.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ECC_LEVELS, makeMatrix, toSvg, versionOf } from './encode.ts';

function python(url: string, args: string[] = []): string {
  return execFileSync('python3', ['scripts/qr_svg.py', url, ...args], { encoding: 'utf8' });
}

const urls = [
  'https://nidhi.today/',
  'https://nidhi.today/hi/?utm_source=event&utm_medium=print&utm_campaign=parivaar&utm_content=qr',
  'https://nidhi.today/free/loan-comparison/?utm_source=event&utm_medium=print&utm_campaign=diwali-mela_2026&utm_content=qr',
  // Long enough for version 7 and above (version information blocks) and,
  // at H, for many interleaved blocks of two lengths.
  'https://nidhi.today/cs/free/multi-currency-net-worth/?' + 'utm_campaign=' + 'x'.repeat(180),
  'https://nidhi.today/?q=' + 'a'.repeat(1200),
  // Non-ASCII, so UTF-8 byte mode is exercised.
  'https://nidhi.today/hi/?utm_campaign=परिवार',
];

for (const url of urls) {
  for (const ecc of ECC_LEVELS) {
    test(`matches qr_svg.py: ${ecc}, ${url.length} chars`, (t) => {
      let expected: string;
      try {
        expected = python(url, ['--ecc', ecc]);
      } catch {
        // Too long at this level: the script refuses, so must the port.
        assert.throws(() => makeMatrix(url, ecc), RangeError);
        return;
      }
      assert.equal(toSvg(makeMatrix(url, ecc)), expected);
      t.diagnostic(`version ${versionOf(makeMatrix(url, ecc))}`);
    });
  }
}

test('matches qr_svg.py with a forced mask, border and colours', () => {
  const url = urls[1];
  for (let mask = 0; mask < 8; mask++) {
    const expected = python(url, ['--mask', String(mask), '--border', '2', '--dark', '#0A3D8F', '--light', 'white']);
    assert.equal(toSvg(makeMatrix(url, 'M', mask), 2, '#0A3D8F', 'white'), expected);
  }
});

test('reaches version 40 and refuses beyond it', () => {
  assert.equal(versionOf(makeMatrix('https://nidhi.today/?q=' + 'a'.repeat(2900), 'L')), 40);
  assert.throws(() => makeMatrix('https://nidhi.today/?q=' + 'a'.repeat(3000), 'L'), RangeError);
});

test('rejects a colour that could break out of the attribute', () => {
  assert.throws(() => toSvg(makeMatrix('https://nidhi.today/'), 4, '"/><script>'), RangeError);
});
