/**
 * The nidhi icon in the middle of a QR code, for the QR maker at /studio/qr/.
 *
 * The code is made at level H, which can rebuild about 30% of its data. The
 * icon clears a square of modules in the centre and sits inside it with one
 * module of white around it, so a phone never sees half-covered modules. The
 * square is kept to about 7% of the code's area or less, so most of the
 * error correction is still free for smudges, folds and glare. `logo.test.ts`
 * and a decoder check (two independent readers) confirm the codes still scan.
 *
 * The finder patterns sit in three corners and the format information beside
 * them; a centred square never reaches either.
 */
import { toSvg } from './encode.ts';

/** Share of the code's width the cleared square may take, at most. */
export const LOGO_MAX_SHARE = 0.27;

/**
 * The cleared square: its first module (row and column, without the border)
 * and its side in modules. The side has the same parity as the code's size so
 * the square sits exactly in the centre.
 */
export function logoBox(size: number): { start: number; span: number } {
  // Never into the finder patterns or the format information beside them,
  // which take the first and last 9 rows and columns (matters only for the
  // smallest codes, which these links never need).
  let span = Math.min(Math.floor(size * LOGO_MAX_SHARE), size - 18);
  if (span % 2 !== size % 2) span -= 1;
  return { start: (size - span) / 2, span };
}

/** A copy of the matrix with the centre square cleared to light modules. */
export function clearCentre(matrix: boolean[][]): boolean[][] {
  const { start, span } = logoBox(matrix.length);
  return matrix.map((row, y) =>
    row.map((cell, x) => (x >= start && x < start + span && y >= start && y < start + span ? false : cell)),
  );
}

// The brand icon (public/favicon.svg, light colours), on its 512-unit grid.
const ICON = [
  '<rect width="512" height="512" rx="96" fill="#0A3D8F"/>',
  '<g fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">',
  '<path d="M120 200H360" stroke-width="16"/>',
  '<path d="M150 360V290Q150 250 195 250Q240 250 240 290V360" stroke-width="24"/>',
  '<circle cx="320" cy="310" r="45" stroke-width="24"/>',
  '<path d="M365 310V205" stroke-width="24"/>',
  '<path d="M365 200L425 140" stroke-width="16"/>',
  '<path d="M385 140H425V180" stroke-width="16"/>',
  '</g>',
  '<circle cx="410" cy="220" r="14" fill="#80CBC4"/>',
].join('');

/**
 * The QR code as SVG with the icon in its cleared centre: one module of white
 * margin inside the square, the icon filling the rest.
 */
export function toSvgWithLogo(matrix: boolean[][], border = 4, dark = '#000000'): string {
  const { start, span } = logoBox(matrix.length);
  const svg = toSvg(clearCentre(matrix), border, dark, '#ffffff');
  const side = span - 2;
  const offset = start + border + 1;
  const scale = side / 512;
  const logo =
    `<g transform="translate(${offset} ${offset}) scale(${scale})" shape-rendering="geometricPrecision">` +
    ICON +
    '</g>';
  return svg.replace('</svg>', `${logo}</svg>`);
}
