#!/usr/bin/env python3
"""Make a QR code for one URL, as a deterministic SVG file.

    python3 scripts/qr_svg.py https://nidhi.today/free/?utm_source=poster -o qr.svg

The same URL and options always give the same bytes: no timestamps, no random
choices, nothing fetched. It needs only the Python standard library, so no QR
service ever sees the link (some free generators route scans through their own
short links and count them; this one encodes the URL itself).

It encodes a single http or https URL in byte mode (UTF-8), picks the smallest
QR version (1 to 40) that holds it at the chosen error-correction level, and
picks the mask with the lowest penalty score, as the QR standard
(ISO/IEC 18004) describes. Higher error correction (Q, H) survives more damage
on print; M is the default and suits posters.

Usage, options, examples and print tips: python3 scripts/qr_svg.py --help

Tests: python3 -m unittest scripts/test_qr_svg.py
"""
from __future__ import annotations

import argparse
import re
import sys
from urllib.parse import urlsplit

# Error-correction codewords per block and number of blocks, by level and
# version (index 0 unused), from the tables in ISO/IEC 18004.
ECC_PER_BLOCK = {
    'L': [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    'M': [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    'Q': [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    'H': [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
}
NUM_BLOCKS = {
    'L': [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    'M': [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    'Q': [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    'H': [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
}
# The two format bits that name each level.
ECC_FORMAT_BITS = {'L': 1, 'M': 0, 'Q': 3, 'H': 2}

MASKS = [
    lambda x, y: (x + y) % 2 == 0,
    lambda x, y: y % 2 == 0,
    lambda x, y: x % 3 == 0,
    lambda x, y: (x + y) % 3 == 0,
    lambda x, y: (x // 3 + y // 2) % 2 == 0,
    lambda x, y: x * y % 2 + x * y % 3 == 0,
    lambda x, y: (x * y % 2 + x * y % 3) % 2 == 0,
    lambda x, y: ((x + y) % 2 + x * y % 3) % 2 == 0,
]


# ---- Reed-Solomon over GF(256), polynomial 0x11D -----------------------------

def _gf_mul(x: int, y: int) -> int:
    z = 0
    for i in reversed(range(8)):
        z = (z << 1) ^ ((z >> 7) * 0x11D)
        z ^= ((y >> i) & 1) * x
    return z


def _rs_divisor(degree: int) -> list[int]:
    result = [0] * (degree - 1) + [1]
    root = 1
    for _ in range(degree):
        for j in range(degree):
            result[j] = _gf_mul(result[j], root)
            if j + 1 < degree:
                result[j] ^= result[j + 1]
        root = _gf_mul(root, 0x02)
    return result


def _rs_remainder(data: list[int], divisor: list[int]) -> list[int]:
    result = [0] * len(divisor)
    for b in data:
        factor = b ^ result.pop(0)
        result.append(0)
        for i, coef in enumerate(divisor):
            result[i] ^= _gf_mul(coef, factor)
    return result


# ---- Capacity -----------------------------------------------------------------

def _raw_data_modules(version: int) -> int:
    """Modules left for data and error correction once the patterns are drawn."""
    result = (16 * version + 128) * version + 64
    if version >= 2:
        num_align = version // 7 + 2
        result -= (25 * num_align - 10) * num_align - 55
        if version >= 7:
            result -= 36
    return result


def _data_codewords(version: int, ecc: str) -> int:
    return _raw_data_modules(version) // 8 - ECC_PER_BLOCK[ecc][version] * NUM_BLOCKS[ecc][version]


def _encode_data(payload: bytes, ecc: str) -> tuple[int, list[int]]:
    """Choose the smallest version and return it with the padded data codewords."""
    for version in range(1, 41):
        count_bits = 8 if version <= 9 else 16
        capacity_bits = _data_codewords(version, ecc) * 8
        if 4 + count_bits + 8 * len(payload) <= capacity_bits:
            break
    else:
        raise ValueError(f'URL too long for a QR code at level {ecc} ({len(payload)} bytes)')

    bits: list[int] = []

    def put(value: int, length: int) -> None:
        bits.extend((value >> i) & 1 for i in reversed(range(length)))

    put(0b0100, 4)  # byte mode
    put(len(payload), count_bits)
    for b in payload:
        put(b, 8)
    put(0, min(4, capacity_bits - len(bits)))  # terminator
    put(0, -len(bits) % 8)
    pad = 0xEC
    while len(bits) < capacity_bits:
        put(pad, 8)
        pad ^= 0xEC ^ 0x11
    codewords = [int(''.join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    return version, codewords


def _add_ecc_and_interleave(data: list[int], version: int, ecc: str) -> list[int]:
    num_blocks = NUM_BLOCKS[ecc][version]
    block_ecc_len = ECC_PER_BLOCK[ecc][version]
    raw_codewords = _raw_data_modules(version) // 8
    num_short = num_blocks - raw_codewords % num_blocks
    short_len = raw_codewords // num_blocks
    divisor = _rs_divisor(block_ecc_len)

    blocks = []
    k = 0
    for i in range(num_blocks):
        length = short_len - block_ecc_len + (0 if i < num_short else 1)
        dat = data[k:k + length]
        k += length
        ecc_bytes = _rs_remainder(dat, divisor)
        if i < num_short:
            dat = dat + [0]  # placeholder, skipped when interleaving
        blocks.append(dat + ecc_bytes)

    result = []
    for i in range(len(blocks[0])):
        for j, block in enumerate(blocks):
            if i != short_len - block_ecc_len or j >= num_short:
                result.append(block[i])
    return result


# ---- The symbol -------------------------------------------------------------

class _Symbol:
    def __init__(self, version: int, ecc: str):
        self.version = version
        self.ecc = ecc
        self.size = version * 4 + 17
        self.dark = [[False] * self.size for _ in range(self.size)]
        self.function = [[False] * self.size for _ in range(self.size)]
        self._draw_function_patterns()

    def _set(self, x: int, y: int, dark: bool) -> None:
        self.dark[y][x] = dark
        self.function[y][x] = True

    def _alignment_positions(self) -> list[int]:
        if self.version == 1:
            return []
        num_align = self.version // 7 + 2
        step = (self.version * 8 + num_align * 3 + 5) // (num_align * 4 - 4) * 2
        result = [self.size - 7 - i * step for i in range(num_align - 1)] + [6]
        return list(reversed(result))

    def _draw_function_patterns(self) -> None:
        size = self.size
        for i in range(size):
            self._set(6, i, i % 2 == 0)
            self._set(i, 6, i % 2 == 0)
        for cx, cy in ((3, 3), (size - 4, 3), (3, size - 4)):
            for dy in range(-4, 5):
                for dx in range(-4, 5):
                    x, y = cx + dx, cy + dy
                    if 0 <= x < size and 0 <= y < size:
                        self._set(x, y, max(abs(dx), abs(dy)) not in (2, 4))
        positions = self._alignment_positions()
        last = len(positions) - 1
        for i, ay in enumerate(positions):
            for j, ax in enumerate(positions):
                if (i, j) in ((0, 0), (0, last), (last, 0)):
                    continue
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        self._set(ax + dx, ay + dy, max(abs(dx), abs(dy)) != 1)
        self.draw_format_bits(0)  # reserves the area; redrawn with the real mask
        if self.version >= 7:
            rem = self.version
            for _ in range(12):
                rem = (rem << 1) ^ ((rem >> 11) * 0x1F25)
            bits = self.version << 12 | rem
            for i in range(18):
                bit = (bits >> i) & 1 == 1
                a, b = size - 11 + i % 3, i // 3
                self._set(a, b, bit)
                self._set(b, a, bit)

    def draw_format_bits(self, mask: int) -> None:
        data = ECC_FORMAT_BITS[self.ecc] << 3 | mask
        rem = data
        for _ in range(10):
            rem = (rem << 1) ^ ((rem >> 9) * 0x537)
        bits = (data << 10 | rem) ^ 0x5412

        def bit(i: int) -> bool:
            return (bits >> i) & 1 == 1

        size = self.size
        for i in range(6):
            self._set(8, i, bit(i))
        self._set(8, 7, bit(6))
        self._set(8, 8, bit(7))
        self._set(7, 8, bit(8))
        for i in range(9, 15):
            self._set(14 - i, 8, bit(i))
        for i in range(8):
            self._set(size - 1 - i, 8, bit(i))
        for i in range(8, 15):
            self._set(8, size - 15 + i, bit(i))
        self._set(8, size - 8, True)  # the dark module

    def draw_codewords(self, codewords: list[int]) -> None:
        size = self.size
        total = len(codewords) * 8
        i = 0
        right = size - 1
        while right >= 1:
            if right == 6:
                right = 5
            upward = ((right + 1) & 2) == 0
            for vert in range(size):
                y = size - 1 - vert if upward else vert
                for j in range(2):
                    x = right - j
                    if not self.function[y][x] and i < total:
                        self.dark[y][x] = (codewords[i >> 3] >> (7 - (i & 7))) & 1 == 1
                        i += 1
            right -= 2

    def apply_mask(self, mask: int) -> None:
        test = MASKS[mask]
        for y in range(self.size):
            for x in range(self.size):
                if not self.function[y][x] and test(x, y):
                    self.dark[y][x] = not self.dark[y][x]

    def penalty(self) -> int:
        """The four penalty rules of the QR standard, used to choose a mask."""
        size, grid = self.size, self.dark
        score = 0
        lines = [row for row in grid] + [[grid[y][x] for y in range(size)] for x in range(size)]
        finder_a = [True, False, True, True, True, False, True, False, False, False, False]
        finder_b = finder_a[::-1]
        for line in lines:
            run = 1
            for k in range(1, size + 1):
                if k < size and line[k] == line[k - 1]:
                    run += 1
                else:
                    if run >= 5:
                        score += 3 + (run - 5)
                    run = 1
            for k in range(size - 10):
                window = line[k:k + 11]
                if window == finder_a or window == finder_b:
                    score += 40
        for y in range(size - 1):
            for x in range(size - 1):
                c = grid[y][x]
                if c == grid[y][x + 1] == grid[y + 1][x] == grid[y + 1][x + 1]:
                    score += 3
        dark = sum(sum(row) for row in grid)
        percent = dark * 100 / (size * size)
        score += int(abs(percent - 50) // 5) * 10
        return score


def make_matrix(url: str, ecc: str = 'M', mask: int | None = None) -> list[list[bool]]:
    """Return the QR matrix for `url`, rows of booleans (True is dark), no border."""
    ecc = ecc.upper()
    if ecc not in ECC_PER_BLOCK:
        raise ValueError('ecc must be one of L, M, Q, H')
    version, data = _encode_data(url.encode('utf-8'), ecc)
    codewords = _add_ecc_and_interleave(data, version, ecc)
    symbol = _Symbol(version, ecc)
    symbol.draw_codewords(codewords)

    if mask is None:
        best = None
        for candidate in range(8):
            symbol.apply_mask(candidate)
            symbol.draw_format_bits(candidate)
            score = symbol.penalty()
            if best is None or score < best[0]:
                best = (score, candidate)
            symbol.apply_mask(candidate)  # XOR again to undo
        mask = best[1]
    symbol.apply_mask(mask)
    symbol.draw_format_bits(mask)
    return symbol.dark


# ---- SVG ----------------------------------------------------------------------

_COLOUR = re.compile(r'^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|[a-zA-Z]+)$')


def to_svg(matrix: list[list[bool]], border: int = 4, dark: str = '#000000', light: str = '#ffffff') -> str:
    """One background rectangle and one path of dark runs, in module units."""
    for colour in (dark, light):
        if not _COLOUR.match(colour):
            raise ValueError(f'not a colour: {colour!r}')
    if border < 0:
        raise ValueError('border must be 0 or more')
    size = len(matrix)
    full = size + 2 * border
    parts = []
    for y, row in enumerate(matrix):
        x = 0
        while x < size:
            if row[x]:
                start = x
                while x < size and row[x]:
                    x += 1
                parts.append(f'M{start + border} {y + border}h{x - start}v1h-{x - start}z')
            else:
                x += 1
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {full} {full}" shape-rendering="crispEdges">'
        f'<rect width="{full}" height="{full}" fill="{light}"/>'
        f'<path fill="{dark}" d="{"".join(parts)}"/>'
        '</svg>\n'
    )


def check_url(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme not in ('http', 'https') or not parts.netloc or any(c.isspace() for c in url):
        raise ValueError(f'not a single http(s) URL: {url!r}')
    return url


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog='qr_svg.py',
        description=(
            'Make a QR code for one web address and save it as an SVG image.\n'
            'The same address and options always give exactly the same file,\n'
            'and nothing is sent anywhere: the address itself is encoded, so\n'
            'scans go straight to it.'
        ),
        epilog=(
            'examples:\n'
            '  python3 scripts/qr_svg.py "https://nidhi.today/" -o qr.svg\n'
            '      save a QR code for the home page as qr.svg\n\n'
            '  python3 scripts/qr_svg.py "https://nidhi.today/free/?utm_source=poster&utm_campaign=yoga" \\\n'
            '      --ecc H --dark "#0A3D8F" -o poster-qr.svg\n'
            '      a tagged link, sturdier against smudges, in brand blue\n\n'
            'tips:\n'
            '  - Put the address in quotes, or the shell cuts it at "&" or "?".\n'
            '  - Shorter addresses make simpler codes that scan more easily.\n'
            '  - Keep the white border (4 is the standard minimum) and keep\n'
            '    dark modules on a light background, or some phones fail to scan.\n'
            '  - The SVG has no fixed size: scale it to the print size you need.\n'
            '    A common rule of thumb is a width of about a tenth of the\n'
            '    scanning distance, and no less than 2 cm.\n'
            '  - Scan a test print before printing many.'
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('url', help='the one http:// or https:// address to encode (quote it)')
    parser.add_argument('-o', '--output', metavar='FILE',
                        help='where to save the SVG; without it, the SVG is printed to the terminal')
    parser.add_argument('--ecc', default='M', choices=['L', 'M', 'Q', 'H'], type=str.upper,
                        help='error correction: how much of the code can be damaged and still scan '
                             '(L about 7%%, M 15%%, Q 25%%, H 30%%); higher makes a denser code (default: M)')
    parser.add_argument('--border', default=4, type=int, metavar='N',
                        help='white margin around the code, in modules (default: 4, the standard minimum)')
    parser.add_argument('--dark', default='#000000', metavar='COLOUR',
                        help='colour of the dark squares, like "#0A3D8F" or "black" (default: #000000)')
    parser.add_argument('--light', default='#ffffff', metavar='COLOUR',
                        help='background colour (default: #ffffff)')
    parser.add_argument('--mask', type=int, choices=range(8), metavar='0-7',
                        help='force a mask pattern instead of letting the script choose the best one '
                             '(for testing; leave it out)')
    if not (sys.argv[1:] if argv is None else argv):
        parser.print_help()
        return 2
    args = parser.parse_args(argv)
    try:
        url = check_url(args.url)
        matrix = make_matrix(url, args.ecc, args.mask)
        svg = to_svg(matrix, args.border, args.dark, args.light)
    except ValueError as err:
        parser.error(str(err))
    if args.output:
        with open(args.output, 'w', encoding='utf-8', newline='\n') as f:
            f.write(svg)
        version = (len(matrix) - 17) // 4
        print(f'{args.output}: version {version}, {len(matrix)}x{len(matrix)} modules, level {args.ecc}', file=sys.stderr)
    else:
        sys.stdout.write(svg)
    return 0


if __name__ == '__main__':
    sys.exit(main())
