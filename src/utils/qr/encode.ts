/**
 * QR codes for one URL, in the browser, as deterministic SVG.
 *
 * A line-for-line port of `scripts/qr_svg.py`: byte mode (UTF-8), the smallest
 * version 1 to 40 that holds the URL at the chosen level, and the mask with the
 * lowest penalty score, as the QR standard (ISO/IEC 18004) describes. The same
 * URL and options give the same SVG, byte for byte, as the Python script, and
 * `encode.test.ts` runs both to keep it that way. Nothing is fetched: the code
 * is drawn on the device, so no QR service ever sees the link.
 */

export type EccLevel = 'L' | 'M' | 'Q' | 'H';
export const ECC_LEVELS: readonly EccLevel[] = ['L', 'M', 'Q', 'H'];

// Error-correction codewords per block and number of blocks, by level and
// version (index 0 unused), from the tables in ISO/IEC 18004.
const ECC_PER_BLOCK: Record<EccLevel, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
const NUM_BLOCKS: Record<EccLevel, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};
// The two format bits that name each level.
const ECC_FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

// ---- Reed-Solomon over GF(256), polynomial 0x11D ----------------------------

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree - 1).fill(0).concat([1]);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= gfMul(coef, factor);
    });
  }
  return result;
}

// ---- Capacity ---------------------------------------------------------------

/** Modules left for data and error correction once the patterns are drawn. */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number, ecc: EccLevel): number {
  return Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[ecc][version] * NUM_BLOCKS[ecc][version];
}

/** Choose the smallest version and return it with the padded data codewords. */
function encodeData(payload: Uint8Array, ecc: EccLevel): { version: number; codewords: number[] } {
  let version = 1;
  let countBits = 8;
  let capacityBits = 0;
  for (; version <= 40; version++) {
    countBits = version <= 9 ? 8 : 16;
    capacityBits = dataCodewords(version, ecc) * 8;
    if (4 + countBits + 8 * payload.length <= capacityBits) break;
  }
  if (version > 40) throw new RangeError(`URL too long for a QR code at level ${ecc} (${payload.length} bytes)`);

  const bits: number[] = [];
  const put = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  put(0b0100, 4); // byte mode
  put(payload.length, countBits);
  for (const b of payload) put(b, 8);
  put(0, Math.min(4, capacityBits - bits.length)); // terminator
  put(0, (8 - (bits.length % 8)) % 8);
  let pad = 0xec;
  while (bits.length < capacityBits) {
    put(pad, 8);
    pad ^= 0xec ^ 0x11;
  }
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  return { version, codewords };
}

function addEccAndInterleave(data: number[], version: number, ecc: EccLevel): number[] {
  const numBlocks = NUM_BLOCKS[ecc][version];
  const blockEccLen = ECC_PER_BLOCK[ecc][version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsDivisor(blockEccLen);

  const blocks: number[][] = [];
  let k = 0;
  for (let i = 0; i < numBlocks; i++) {
    const length = shortLen - blockEccLen + (i < numShort ? 0 : 1);
    let dat = data.slice(k, k + length);
    k += length;
    const eccBytes = rsRemainder(dat, divisor);
    if (i < numShort) dat = dat.concat([0]); // placeholder, skipped when interleaving
    blocks.push(dat.concat(eccBytes));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLen - blockEccLen || j >= numShort) result.push(block[i]);
    });
  }
  return result;
}

// ---- The symbol -------------------------------------------------------------

class QrSymbol {
  readonly size: number;
  readonly dark: boolean[][];
  private readonly fn: boolean[][];

  constructor(
    readonly version: number,
    readonly ecc: EccLevel,
  ) {
    this.size = version * 4 + 17;
    this.dark = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.fn = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.drawFunctionPatterns();
  }

  private set(x: number, y: number, dark: boolean): void {
    this.dark[y][x] = dark;
    this.fn[y][x] = true;
  }

  private alignmentPositions(): number[] {
    if (this.version === 1) return [];
    const numAlign = Math.floor(this.version / 7) + 2;
    const step = Math.floor((this.version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
    const result: number[] = [];
    for (let i = 0; i < numAlign - 1; i++) result.push(this.size - 7 - i * step);
    result.push(6);
    return result.reverse();
  }

  private drawFunctionPatterns(): void {
    const size = this.size;
    for (let i = 0; i < size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < size && y >= 0 && y < size) {
            const d = Math.max(Math.abs(dx), Math.abs(dy));
            this.set(x, y, d !== 2 && d !== 4);
          }
        }
      }
    }
    const positions = this.alignmentPositions();
    const last = positions.length - 1;
    positions.forEach((ay, i) => {
      positions.forEach((ax, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            this.set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
          }
        }
      });
    });
    this.drawFormatBits(0); // reserves the area; redrawn with the real mask
    if (this.version >= 7) {
      let rem = this.version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (this.version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) === 1;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        this.set(a, b, bit);
        this.set(b, a, bit);
      }
    }
  }

  drawFormatBits(mask: number): void {
    const data = (ECC_FORMAT_BITS[this.ecc] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) === 1;

    const size = this.size;
    for (let i = 0; i < 6; i++) this.set(8, i, bit(i));
    this.set(8, 7, bit(6));
    this.set(8, 8, bit(7));
    this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.set(8, size - 15 + i, bit(i));
    this.set(8, size - 8, true); // the dark module
  }

  drawCodewords(codewords: number[]): void {
    const size = this.size;
    const total = codewords.length * 8;
    let i = 0;
    let right = size - 1;
    while (right >= 1) {
      if (right === 6) right = 5;
      const upward = ((right + 1) & 2) === 0;
      for (let vert = 0; vert < size; vert++) {
        const y = upward ? size - 1 - vert : vert;
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          if (!this.fn[y][x] && i < total) {
            this.dark[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
            i++;
          }
        }
      }
      right -= 2;
    }
  }

  applyMask(mask: number): void {
    const test = MASKS[mask];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.fn[y][x] && test(x, y)) this.dark[y][x] = !this.dark[y][x];
      }
    }
  }

  /** The four penalty rules of the QR standard, used to choose a mask. */
  penalty(): number {
    const size = this.size;
    const grid = this.dark;
    let score = 0;
    const lines: boolean[][] = grid.map((row) => row);
    for (let x = 0; x < size; x++) lines.push(grid.map((row) => row[x]));
    const finderA = [true, false, true, true, true, false, true, false, false, false, false];
    const finderB = [...finderA].reverse();
    const matches = (line: boolean[], k: number, pattern: boolean[]) => pattern.every((v, i) => line[k + i] === v);
    for (const line of lines) {
      let run = 1;
      for (let k = 1; k <= size; k++) {
        if (k < size && line[k] === line[k - 1]) {
          run++;
        } else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      for (let k = 0; k < size - 10; k++) {
        if (matches(line, k, finderA) || matches(line, k, finderB)) score += 40;
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = grid[y][x];
        if (c === grid[y][x + 1] && c === grid[y + 1][x] && c === grid[y + 1][x + 1]) score += 3;
      }
    }
    let dark = 0;
    for (const row of grid) for (const cell of row) if (cell) dark++;
    const percent = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;
    return score;
  }
}

/** The QR matrix for `url`, rows of booleans (true is dark), no border. */
export function makeMatrix(url: string, ecc: EccLevel = 'M', mask?: number): boolean[][] {
  if (!ECC_LEVELS.includes(ecc)) throw new RangeError('ecc must be one of L, M, Q, H');
  const { version, codewords: data } = encodeData(new TextEncoder().encode(url), ecc);
  const codewords = addEccAndInterleave(data, version, ecc);
  const symbol = new QrSymbol(version, ecc);
  symbol.drawCodewords(codewords);

  let chosen = mask;
  if (chosen === undefined) {
    let best: [number, number] | null = null;
    for (let candidate = 0; candidate < 8; candidate++) {
      symbol.applyMask(candidate);
      symbol.drawFormatBits(candidate);
      const score = symbol.penalty();
      if (best === null || score < best[0]) best = [score, candidate];
      symbol.applyMask(candidate); // XOR again to undo
    }
    chosen = (best as [number, number])[1];
  }
  symbol.applyMask(chosen);
  symbol.drawFormatBits(chosen);
  return symbol.dark;
}

const COLOUR = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|[a-zA-Z]+)$/;

/** One background rectangle and one path of dark runs, in module units. */
export function toSvg(matrix: boolean[][], border = 4, dark = '#000000', light = '#ffffff'): string {
  for (const colour of [dark, light]) {
    if (!COLOUR.test(colour)) throw new RangeError(`not a colour: ${colour}`);
  }
  if (border < 0) throw new RangeError('border must be 0 or more');
  const size = matrix.length;
  const full = size + 2 * border;
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < size) {
      if (row[x]) {
        const start = x;
        while (x < size && row[x]) x++;
        parts.push(`M${start + border} ${y + border}h${x - start}v1h-${x - start}z`);
      } else {
        x++;
      }
    }
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges">` +
    `<rect width="${full}" height="${full}" fill="${light}"/>` +
    `<path fill="${dark}" d="${parts.join('')}"/>` +
    '</svg>\n'
  );
}

/** The QR version (1 to 40) a matrix of this size belongs to. */
export function versionOf(matrix: boolean[][]): number {
  return (matrix.length - 17) / 4;
}
