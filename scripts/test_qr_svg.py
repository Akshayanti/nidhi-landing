"""Tests for scripts/qr_svg.py.

Run with:  python3 -m unittest scripts/test_qr_svg.py

The two fixed hashes below are of SVGs whose modules were checked, one by one,
against the segno library (with its padding set to the standard's exact rule:
segno adds a whole zero byte where ISO/IEC 18004 asks only for the bits up to
the next byte) and decoded with a QR reader. A change that alters them changes
what gets printed: check the new output the same way before updating them.
"""
import hashlib
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))

import qr_svg  # noqa: E402

YOGA = 'https://nidhi.today/free/?utm_source=poster&utm_medium=print&utm_campaign=yoga&utm_content=qr'


def sha(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


class KnownOutput(unittest.TestCase):
    def test_poster_url_at_level_m(self):
        svg = qr_svg.to_svg(qr_svg.make_matrix(YOGA, 'M'))
        self.assertEqual(sha(svg), '467cb2622c25c635c085becb4569d9010a4b160156d07f23f48ee7ca02dd40c4')

    def test_home_page_at_level_h(self):
        svg = qr_svg.to_svg(qr_svg.make_matrix('https://nidhi.today/', 'H'))
        self.assertEqual(sha(svg), '7866940b889141f3956f1ac66ffb0ef5ddc2eab3e122ab74efb728b12bc0ea67')


class Structure(unittest.TestCase):
    def test_same_input_same_bytes(self):
        self.assertEqual(qr_svg.to_svg(qr_svg.make_matrix(YOGA)), qr_svg.to_svg(qr_svg.make_matrix(YOGA)))

    def test_smallest_version_is_chosen(self):
        # Version 1 at level L holds 17 bytes in byte mode; 18 needs version 2.
        self.assertEqual(len(qr_svg.make_matrix('http://a.io/' + 'x' * 5, 'L')), 21)
        self.assertEqual(len(qr_svg.make_matrix('http://a.io/' + 'x' * 6, 'L')), 25)

    def test_finder_patterns_and_dark_module(self):
        m = qr_svg.make_matrix(YOGA)
        size = len(m)
        for x0, y0 in ((0, 0), (size - 7, 0), (0, size - 7)):
            self.assertTrue(all(m[y0][x0 + i] for i in range(7)))
            self.assertFalse(m[y0 + 1][x0 + 1])
            self.assertTrue(m[y0 + 3][x0 + 3])
        self.assertTrue(m[size - 8][8])

    def test_svg_size_includes_border(self):
        svg = qr_svg.to_svg(qr_svg.make_matrix('https://nidhi.today/'), border=2)
        size = len(qr_svg.make_matrix('https://nidhi.today/')) + 4
        self.assertIn(f'viewBox="0 0 {size} {size}"', svg)

    def test_too_long_is_refused(self):
        with self.assertRaises(ValueError):
            qr_svg.make_matrix('https://a.io/' + 'x' * 3000, 'H')


class CommandLine(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'qr_svg.py'), *args],
                              capture_output=True, text=True)

    def test_writes_file(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'qr.svg')
            result = self.run_cli(YOGA, '-o', out)
            self.assertEqual(result.returncode, 0, result.stderr)
            with open(out, encoding='utf-8') as f:
                self.assertEqual(sha(f.read()), '467cb2622c25c635c085becb4569d9010a4b160156d07f23f48ee7ca02dd40c4')

    def test_refuses_anything_but_one_url(self):
        for bad in ('nidhi.today', 'ftp://nidhi.today/', 'https://nidhi.today/ two'):
            self.assertNotEqual(self.run_cli(bad).returncode, 0, bad)
        self.assertNotEqual(self.run_cli(YOGA, '--dark', 'red;x').returncode, 0)


if __name__ == '__main__':
    unittest.main()
