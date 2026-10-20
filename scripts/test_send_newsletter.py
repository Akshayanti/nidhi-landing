"""
Tests for the lesson-to-email conversion in send_newsletter.py.

Run with:
    python3 -m unittest scripts/test_send_newsletter.py
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import send_newsletter as nl  # noqa: E402

SITE_URL = "https://nidhi.today"

PAGE = """<!doctype html><html><body>
<h1 class="post-title">A lesson</h1>
<div class="post-tldr"><p>Short answer.</p></div>
<div class="prose" id="post-content">
<p>This opening paragraph is long enough to be the teaser hook for the email.</p>
<details class="quick-check">
<summary class="disclosure">Quick check: which default applies if you name nobody?</summary>
<p>The law of the country where you live decides, which may not be what you want.</p>
</details>
<details class="lesson-depth">
<summary class="disclosure">The evidence and its limits</summary>
<p>The figures come from one survey of one country over a few years only.</p>
<ul><li>US data only</li></ul>
<details><summary>Nested note</summary><p>Inner text that also has to stay visible.</p></details>
</details>
</div>
</body></html>"""


def _extract(page: str) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        post_dir = Path(tmp) / "blog" / "a-lesson"
        post_dir.mkdir(parents=True)
        (post_dir / "index.html").write_text(page, encoding="utf-8")
        return nl.extract_post(Path(tmp), "/blog/a-lesson/", SITE_URL)


class ReadingTimeTest(unittest.TestCase):
    def test_email_shows_total_minutes(self) -> None:
        page = PAGE.replace(
            '<h1 class="post-title">',
            '<span class="post-reading-time" data-total-minutes="9">5 min read'
            '<span class="post-reading-depth"> · +4 min of optional detail</span></span><h1 class="post-title">',
        )
        self.assertEqual(_extract(page)["reading_time"], 9)

    def test_falls_back_to_the_visible_number(self) -> None:
        page = PAGE.replace('<h1 class="post-title">', '<span class="post-reading-time">7 min read</span><h1 class="post-title">')
        self.assertEqual(_extract(page)["reading_time"], 7)


class FlattenDetailsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.post = _extract(PAGE)
        self.html = self.post["content_html"]
        self.text = self.post["content_text"]

    def test_no_details_or_summary_left(self) -> None:
        self.assertNotIn("<details", self.html)
        self.assertNotIn("<summary", self.html)

    def test_summary_becomes_bold_lead_line(self) -> None:
        self.assertRegex(
            self.html,
            r"<p[^>]*><strong[^>]*>Quick check: which default applies if you name nobody\?</strong></p>",
        )
        self.assertRegex(self.html, r"<p[^>]*><strong[^>]*>The evidence and its limits</strong></p>")

    def test_contents_stay_visible_including_nested(self) -> None:
        self.assertIn("The law of the country where you live decides", self.html)
        self.assertIn("US data only", self.html)
        self.assertRegex(self.html, r"<strong[^>]*>Nested note</strong>")
        self.assertIn("Inner text that also has to stay visible.", self.html)

    def test_wrappers_keep_their_class_and_get_inline_styles(self) -> None:
        self.assertRegex(self.html, r'<div class="quick-check email-expander" style="background-color:#e6f2f0;')
        self.assertRegex(self.html, r'<div class="lesson-depth email-expander" style="border-left:2px solid #cbd5e1;')
        # An expander with no known class gets the quiet lesson-depth look.
        self.assertRegex(self.html, r'<div class="email-expander" style="border-left:2px solid #cbd5e1;')

    def test_lead_line_gets_brand_paragraph_style(self) -> None:
        self.assertRegex(self.html, r'<p style="margin:0 0 14px;[^"]*;margin:0 0 6px;"><strong style="font-weight:600;')

    def test_plaintext_puts_question_before_answer(self) -> None:
        question = self.text.index("Quick check: which default applies")
        answer = self.text.index("The law of the country")
        self.assertLess(question, answer)
        self.assertLess(self.text.index("The evidence and its limits"), self.text.index("one survey of one country"))

    def test_teaser_hook_skips_expanders(self) -> None:
        self.assertTrue(self.post["first_paragraph_text"].startswith("This opening paragraph"))
        only_expanders = PAGE.replace(
            "<p>This opening paragraph is long enough to be the teaser hook for the email.</p>", ""
        )
        self.assertEqual(_extract(only_expanders)["first_paragraph_text"], "")

    def test_plaintext_keeps_question_and_answer_on_separate_lines(self) -> None:
        self.assertRegex(self.text, r"name nobody\?\n+The law of the country")

    def test_plaintext_starts_expander_on_a_new_paragraph(self) -> None:
        glued = PAGE.replace("email.</p>\n<details", "email.</p><details")
        self.assertRegex(_extract(glued)["content_text"], r"for the email\.\n\n+Quick check:")

    def test_nested_summary_sits_next_to_its_own_content(self) -> None:
        self.assertRegex(self.html, r"Nested note</strong></p><p[^>]*>Inner text")

    def test_quick_check_inside_lesson_depth(self) -> None:
        page = PAGE.replace(
            "<details><summary>Nested note</summary><p>Inner text that also has to stay visible.</p></details>",
            '<details class="quick-check"><summary>Quick check: nested?</summary><p>Nested answer.</p></details>',
        )
        html_out = _extract(page)["content_html"]
        self.assertRegex(
            html_out,
            r'<div class="quick-check email-expander"[^>]*><p[^>]*><strong[^>]*>Quick check: nested\?</strong></p><p[^>]*>Nested answer\.</p></div>',
        )

    def test_summary_keeps_inline_markup(self) -> None:
        page = PAGE.replace(
            "The evidence and its limits",
            'The <em>evidence</em> and <a href="/blog/other">its limits</a>',
        )
        html_out = _extract(page)["content_html"]
        self.assertRegex(html_out, r"<strong[^>]*>The <em[^>]*>evidence</em> and <a href=\"https://nidhi.today/blog/other\"")

    def test_details_without_summary_and_stray_summary(self) -> None:
        page = PAGE.replace(
            "<details><summary>Nested note</summary>", "<details open>"
        ).replace("</div>\n</body>", "<summary>Stray label</summary></div>\n</body>")
        html_out = _extract(page)["content_html"]
        self.assertNotIn("<details", html_out)
        self.assertNotIn("<summary", html_out)
        self.assertNotRegex(html_out, r"<[^>]*\sopen[\s=>]")
        self.assertIn("Inner text that also has to stay visible.", html_out)
        self.assertRegex(html_out, r"<strong[^>]*>Stray label</strong>")

    def test_page_without_expanders_is_unchanged(self) -> None:
        plain = PAGE.split("<details", 1)[0] + "</div></body></html>"
        flattened = _extract(plain)
        original = nl.flatten_details
        nl.flatten_details = lambda node, soup: None
        try:
            untouched = _extract(plain)
        finally:
            nl.flatten_details = original
        self.assertEqual(flattened, untouched)


if __name__ == "__main__":
    unittest.main()
