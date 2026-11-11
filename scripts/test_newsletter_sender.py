"""
Tests for what send_newsletter.py decides and sends: which lessons go out,
what is recorded as sent, how a request is signed, and what the templates
produce. The lesson-to-email conversion has its own file
(test_send_newsletter.py).

This script runs unattended, daily and after each deploy. Its failure modes
are a duplicate or mass send to every subscriber, or a silent no-send; these
tests are what stands in front of both.

Run with:
    python3 -m unittest scripts/test_newsletter_sender.py
"""
from __future__ import annotations

import contextlib
import hashlib
import hmac
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import send_newsletter as nl  # noqa: E402

SITE_URL = "https://nidhi.today"
FIXTURE = json.loads((Path(__file__).resolve().parent / "fixtures" / "send-post-signature.json").read_text(encoding="utf-8"))

# pubDates chosen so that sorting them as text would give the wrong order
# ("Wed, 29 Apr" sorts after "Wed, 06 May" as a string).
POSTS = [
    ("first", "Wed, 01 Apr 2026 08:00:00 GMT"),
    ("second", "Wed, 29 Apr 2026 08:00:00 GMT"),
    ("third", "Wed, 06 May 2026 08:00:00 GMT"),
    ("fourth", "Mon, 11 May 2026 08:00:00 GMT"),
    ("fifth", "Tue, 12 May 2026 08:00:00 GMT"),
]


def guid(slug: str) -> str:
    return f"{SITE_URL}/blog/{slug}/"


def feed(posts=POSTS, link=guid) -> str:
    items = "".join(
        f"<item><title>{slug.title()}</title><description>About {slug}.</description>"
        f"<link>{link(slug)}</link><guid>{link(slug)}</guid><pubDate>{date}</pubDate>"
        f"<category>building</category></item>"
        for slug, date in posts
    )
    return f'<?xml version="1.0"?><rss version="2.0"><channel><title>nidhi</title>{items}</channel></rss>'


POST = {
    "title": "A lesson",
    "tldr": "Short answer.",
    "reading_time": 5,
    "level": "Building",
    "content_html": "<p>Body of the lesson.</p>",
    "content_text": "Body of the lesson.",
    "first_paragraph_html": "Body of the lesson.",
    "first_paragraph_text": "Body of the lesson.",
}


class Run:
    """One run of main() over a feed and a marker file, with the network replaced."""

    def __init__(self, tmp: Path, *, feed_xml: str | None = None, marker: str | None = None,
                 env: dict | None = None, answers=None):
        self.tmp = tmp
        (tmp / "dist").mkdir(exist_ok=True)
        (tmp / "dist" / "rss.xml").write_text(feed_xml if feed_xml is not None else feed(), encoding="utf-8")
        self.marker = tmp / "marker.txt"
        if marker is not None:
            self.marker.write_text(marker, encoding="utf-8")
        self.env = {
            "NEWSLETTER_ENDPOINT": "https://script.example/exec",
            "NEWSLETTER_HMAC_SECRET": FIXTURE["secret"],
            "SITE_URL": SITE_URL,
            "DIST_DIR": str(tmp / "dist"),
            "MARKER_FILE": str(self.marker),
            **(env or {}),
        }
        # What the Apps Script answers, one per request; the default says all went well.
        self.answers = list(answers or [])
        self.posted: list[dict] = []
        self.code: int | None = None
        self.stderr = ""

    def _post(self, _cfg, payload):
        self.posted.append(payload)
        answer = self.answers.pop(0) if self.answers else {"ok": True, "sent": 3, "failed": 0}
        if isinstance(answer, Exception):
            raise answer
        return answer

    def go(self) -> "Run":
        err = io.StringIO()
        with mock.patch.dict(os.environ, self.env, clear=True), \
                mock.patch.object(nl, "extract_post", return_value=dict(POST)), \
                mock.patch.object(nl, "post_to_apps_script", side_effect=self._post), \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(err):
            self.code = nl.main()
        self.stderr = err.getvalue()
        return self

    @property
    def sent(self) -> list[str]:
        return [p["guid"] for p in self.posted]

    @property
    def recorded(self) -> set[str]:
        return nl.load_sent_guids(self.marker)


class WhichLessonsGoOut(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def test_a_first_run_sends_the_newest_lesson_only_and_records_the_rest(self):
        run = Run(self.tmp).go()
        self.assertEqual(run.code, 0)
        self.assertEqual(run.sent, [guid("fifth")])
        self.assertEqual(run.recorded, {guid(slug) for slug, _ in POSTS})

    def test_an_empty_or_comment_only_marker_is_a_first_run_too(self):
        for text in ["", "\n\n", "# One GUID per line.\n"]:
            with self.subTest(marker=text), tempfile.TemporaryDirectory() as tmp:
                run = Run(Path(tmp), marker=text).go()
                self.assertEqual(run.sent, [guid("fifth")], "one lesson, not the whole feed")

    def test_a_recorded_lesson_is_never_sent_again(self):
        marker = "".join(f"{guid(slug)}\n" for slug, _ in POSTS)
        run = Run(self.tmp, marker=marker).go()
        self.assertEqual(run.code, 0)
        self.assertEqual(run.sent, [])
        # And a second run straight after a send finds nothing to do.
        with tempfile.TemporaryDirectory() as tmp:
            first = Run(Path(tmp)).go()
            again = Run(Path(tmp)).go()
            self.assertEqual(first.sent, [guid("fifth")])
            self.assertEqual(again.sent, [])

    def test_new_lessons_go_out_oldest_first_by_date_not_by_text(self):
        marker = f"{guid('first')}\n"
        run = Run(self.tmp, marker=marker, feed_xml=feed(POSTS[:4])).go()
        self.assertEqual(run.sent, [guid("second"), guid("third"), guid("fourth")])
        self.assertEqual(run.recorded, {guid(slug) for slug, _ in POSTS[:4]})

    def test_only_most_recent_sends_one_and_records_the_others(self):
        marker = f"{guid('first')}\n"
        run = Run(self.tmp, marker=marker, env={"SEND_ONLY_MOST_RECENT": "1"}).go()
        self.assertEqual(run.sent, [guid("fifth")])
        self.assertEqual(run.recorded, {guid(slug) for slug, _ in POSTS})

    def test_a_feed_whose_addresses_all_changed_does_not_resend_the_back_catalogue(self):
        # Every lesson is recorded; then the feed's addresses lose their
        # trailing slash, so not one of them matches the marker any more.
        marker = "".join(f"{guid(slug)}\n" for slug, _ in POSTS)
        changed = feed(link=lambda slug: f"{SITE_URL}/blog/{slug}")
        run = Run(self.tmp, marker=marker, feed_xml=changed).go()
        self.assertEqual(run.sent, [], "five lessons at once is not a publishing day")
        self.assertEqual(run.code, 2, "the run fails, so that someone looks")
        self.assertIn("Nothing was sent", run.stderr)
        self.assertEqual(run.recorded, {guid(slug) for slug, _ in POSTS}, "and nothing new is recorded")

    def test_the_limit_is_three_lessons_a_run_unless_asked_for(self):
        marker = f"{guid('first')}\n"
        self.assertEqual(nl.MAX_POSTS_PER_RUN, 3)
        four_waiting = Run(self.tmp, marker=marker).go()
        self.assertEqual((four_waiting.sent, four_waiting.code), ([], 2))
        with tempfile.TemporaryDirectory() as tmp:
            asked = Run(Path(tmp), marker=marker, env={"BACKFILL_OK": "1"}).go()
            self.assertEqual(asked.sent, [guid("second"), guid("third"), guid("fourth"), guid("fifth")])

    def test_a_lost_marker_with_backfill_allowed_is_the_only_way_to_send_everything(self):
        run = Run(self.tmp, env={"BACKFILL_OK": "1"}).go()
        self.assertEqual(len(run.sent), 5)


class WhatIsRecordedAsSent(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)
        self.marker = f"{guid('first')}\n{guid('second')}\n{guid('third')}\n"

    def run_with(self, answers) -> Run:
        return Run(self.tmp, marker=self.marker, answers=answers).go()

    def test_a_request_that_fails_is_not_recorded_and_fails_the_run(self):
        run = self.run_with([RuntimeError("POST to Apps Script failed: timed out")])
        self.assertEqual(run.code, 2)
        self.assertNotIn(guid("fourth"), run.recorded)
        # The lesson after it is still tried, and recorded when it goes out.
        self.assertEqual(run.sent, [guid("fourth"), guid("fifth")])
        self.assertIn(guid("fifth"), run.recorded)

    def test_a_refused_request_is_not_recorded(self):
        for answer in [{"ok": False, "error": "bad_signature"}, {"ok": False, "error": "from_email_not_sendable: x"}, {"ok": False, "raw": "<html>"}]:
            with self.subTest(answer=answer), tempfile.TemporaryDirectory() as tmp:
                run = Run(Path(tmp), marker=self.marker, answers=[answer]).go()
                self.assertEqual(run.code, 2)
                self.assertNotIn(guid("fourth"), run.recorded)

    def test_a_send_that_ran_out_of_time_is_not_recorded_so_the_next_run_resumes_it(self):
        run = self.run_with([{"ok": True, "partial": True, "sent": 40, "failed": 0, "resume_after": "m@x.io"}])
        self.assertEqual(run.code, 2)
        self.assertNotIn(guid("fourth"), run.recorded)
        self.assertNotIn("m@x.io", "".join(sorted(run.recorded)))

    def test_a_lesson_the_script_found_nobody_to_send_to_is_not_recorded(self):
        run = self.run_with([{"ok": True, "sent": 0, "failed": 0, "no_recipients": True}])
        self.assertEqual(run.code, 2, "a list that reads as empty fails the run")
        self.assertNotIn(guid("fourth"), run.recorded)
        self.assertIn("NO RECIPIENTS", run.stderr)

    def test_a_lesson_that_cannot_be_rendered_is_not_sent_or_recorded(self):
        err = io.StringIO()
        marker = self.tmp / "marker.txt"
        (self.tmp / "dist").mkdir()
        (self.tmp / "dist" / "rss.xml").write_text(feed(), encoding="utf-8")
        marker.write_text(self.marker, encoding="utf-8")
        env = {"NEWSLETTER_ENDPOINT": "https://script.example/exec", "NEWSLETTER_HMAC_SECRET": "s",
               "DIST_DIR": str(self.tmp / "dist"), "MARKER_FILE": str(marker)}
        posted = []
        with mock.patch.dict(os.environ, env, clear=True), \
                mock.patch.object(nl, "extract_post", side_effect=FileNotFoundError("no page")), \
                mock.patch.object(nl, "post_to_apps_script", side_effect=lambda _c, p: posted.append(p)), \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(err):
            code = nl.main()
        self.assertEqual((code, posted), (2, []))
        self.assertEqual(nl.load_sent_guids(marker), {guid("first"), guid("second"), guid("third")})

    def test_a_dry_run_sends_nothing_and_records_nothing(self):
        with mock.patch.object(nl, "REPO_ROOT", self.tmp):
            run = Run(self.tmp, marker=self.marker, env={"DRY_RUN": "1"}).go()
        self.assertEqual((run.code, run.sent), (0, []))
        self.assertEqual(run.recorded, {guid("first"), guid("second"), guid("third")})
        self.assertTrue(list((self.tmp / "emails" / "_preview").glob("*.html")), "the previews are written")

    def test_without_an_endpoint_or_a_secret_nothing_runs(self):
        for missing in ["NEWSLETTER_ENDPOINT", "NEWSLETTER_HMAC_SECRET"]:
            with self.subTest(missing=missing), tempfile.TemporaryDirectory() as tmp:
                run = Run(Path(tmp), env={missing: ""}).go()
                self.assertEqual((run.code, run.sent), (0, []))

    def test_the_marker_file_keeps_one_address_a_line_under_its_heading(self):
        path = self.tmp / "fresh.txt"
        nl.record_sent(path, "a")
        nl.record_sent(path, "b")
        self.assertEqual(path.read_text(encoding="utf-8"), "# One GUID per line. Managed by scripts/send_newsletter.py.\na\nb\n")
        path.write_text("a\nb", encoding="utf-8")  # no final line break
        nl.record_sent(path, "c")
        self.assertEqual(nl.load_sent_guids(path), {"a", "b", "c"})


class TheFeed(unittest.TestCase):
    def test_reads_each_item_and_falls_back_to_the_link_for_a_missing_guid(self):
        xml = ('<rss><channel><item><title> One </title><link>https://nidhi.today/blog/one/</link>'
               '<pubDate>Wed, 06 May 2026 08:00:00 GMT</pubDate><category>a</category><category></category></item>'
               '<item><title>No link</title></item></channel></rss>')
        items = nl.parse_rss(xml.encode("utf-8"))
        self.assertEqual(len(items), 1, "an item with no link is left out")
        self.assertEqual((items[0].title, items[0].guid, items[0].relative, items[0].categories),
                         ("One", "https://nidhi.today/blog/one/", "/blog/one/", ["a"]))

    def test_a_feed_with_no_channel_or_a_missing_file_is_an_error_not_an_empty_list(self):
        with self.assertRaises(ValueError):
            nl.parse_rss(b"<rss></rss>")
        with self.assertRaises(FileNotFoundError):
            nl.parse_rss(Path("/nonexistent/rss.xml"))

    def test_dates_sort_as_dates_and_a_bad_one_sorts_first(self):
        key = nl._parse_pub_date_for_sort
        self.assertLess(key("Wed, 29 Apr 2026 08:00:00 GMT"), key("Wed, 06 May 2026 08:00:00 GMT"))
        self.assertLess(key("not a date"), key("Wed, 01 Apr 2026 08:00:00 GMT"))
        self.assertEqual(key(""), key("not a date"))
        # A date with no zone is read as UTC, so it can be compared with one that has it.
        self.assertLess(key("Mon, 06 May 2026 00:00:00"), key("Mon, 06 May 2026 00:00:01 GMT"))


class TheSignature(unittest.TestCase):
    def test_signs_the_fixture_the_apps_script_test_checks(self):
        # scripts/newsletter.test.mjs gives the same body and this hex to
        # newsletter.gs and expects it to be accepted.
        self.assertEqual(nl.sign(FIXTURE["secret"], FIXTURE["body"].encode("utf-8")), FIXTURE["hex"])
        self.assertRegex(FIXTURE["hex"], r"^[0-9a-f]{64}$")

    def test_is_hmac_sha256_of_the_exact_bytes(self):
        body = b'{"guid":"x"}'
        self.assertEqual(nl.sign("secret", body), hmac.new(b"secret", body, hashlib.sha256).hexdigest())
        self.assertNotEqual(nl.sign("secret", body), nl.sign("secret", body + b" "))
        self.assertNotEqual(nl.sign("secret", body), nl.sign("other", body))

    def test_the_request_is_ascii_only_and_carries_its_own_signature(self):
        cfg = nl.Config(endpoint="https://script.example/exec", secret="secret", site_url=SITE_URL,
                        dist_dir=Path("."), marker_file=Path("m"), dry_run=False, only_most_recent=False, fetch_live=False)
        seen = {}

        class Answer:
            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

            def read(self):
                return b'{"ok": true, "sent": 1}'

        def urlopen(req, timeout=0):
            seen["url"], seen["body"], seen["method"] = req.full_url, req.data, req.get_method()
            return Answer()

        payload = {"subject": "Café: “quoted”", "html": "<p>—</p>", "guid": "g"}
        with mock.patch.object(nl.urllib.request, "urlopen", urlopen):
            answer = nl.post_to_apps_script(cfg, payload)
        self.assertEqual(answer, {"ok": True, "sent": 1})
        self.assertEqual(seen["method"], "POST")
        self.assertTrue(seen["body"].isascii(), "non-ASCII is sent as escapes, so every layer keeps the bytes")
        self.assertEqual(json.loads(seen["body"]), payload)
        self.assertEqual(seen["url"], f"https://script.example/exec?action=send_post&sig={nl.sign('secret', seen['body'])}")

    def test_an_endpoint_that_already_has_a_query_gets_an_ampersand(self):
        cfg = nl.Config(endpoint="https://script.example/exec?x=1", secret="s", site_url=SITE_URL,
                        dist_dir=Path("."), marker_file=Path("m"), dry_run=False, only_most_recent=False, fetch_live=False)
        seen = {}

        class Answer:
            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

            def read(self):
                return b"not json"

        def urlopen(req, timeout=0):
            seen["url"] = req.full_url
            return Answer()

        with mock.patch.object(nl.urllib.request, "urlopen", urlopen):
            answer = nl.post_to_apps_script(cfg, {"guid": "g"})
        self.assertIn("exec?x=1&action=send_post&sig=", seen["url"])
        self.assertEqual(answer, {"ok": False, "raw": "not json"}, "an answer that is not JSON is a refusal")


class TheTemplates(unittest.TestCase):
    def setUp(self):
        self.env = nl.build_jinja()
        self.item = nl.parse_rss(feed(POSTS[:1]).encode("utf-8"))[0]

    def test_every_template_renders_and_keeps_the_unsubscribe_placeholder(self):
        ctx = {**POST, "description": "About it.", "post_url": self.item.link,
               "post_url_tracked": self.item.link + "?utm_source=newsletter", "blog_url": SITE_URL + "/blog",
               "site_url": SITE_URL, "utm_query": "utm_source=newsletter&utm_medium=email&utm_campaign=first",
               "pub_date": self.item.pub_date}
        for name in ["post.html.j2", "post.txt.j2", "post_teaser.html.j2", "post_teaser.txt.j2"]:
            with self.subTest(template=name):
                out = self.env.get_template(name).render(**ctx)
                # The Apps Script swaps this in per recipient; a template
                # that lost it would send mail nobody can unsubscribe from.
                self.assertIn("{{UNSUBSCRIBE_URL}}", out)
                self.assertIn("A lesson", out)
                self.assertNotIn("{%", out)
                self.assertNotIn("{{ ", out)

    def test_a_lesson_is_sent_whole_and_every_link_is_tagged(self):
        html, text = nl.render_email(self.env, item=self.item, post=dict(POST), site_url=SITE_URL)
        self.assertIn("Body of the lesson.", html)
        self.assertIn("Body of the lesson.", text)
        self.assertIn("https://nidhi.today/blog/first?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=first", html)
        self.assertIn("utm_source=newsletter&utm_medium=email&utm_campaign=first", text)
        self.assertIn("{{UNSUBSCRIBE_URL}}&utm_source=newsletter", html)
        self.assertIn("{{UNSUBSCRIBE_URL}}", text)

    def test_the_plain_text_part_is_plain_text_and_the_html_part_is_escaped(self):
        post = {**POST, "title": "Saving & investing: what's the difference?", "content_text": "If it is < 5% & you're unsure.",
                "content_html": "<p>If it is &lt; 5% &amp; you're unsure.</p>"}
        html, text = nl.render_email(self.env, item=self.item, post=post, site_url=SITE_URL)
        self.assertIn("Saving & investing: what's the difference?", text)
        self.assertIn("If it is < 5% & you're unsure.", text)
        self.assertNotIn("&amp;", text)
        self.assertNotIn("&#39;", text)
        # The line under the title is as long as the title.
        lines = text.splitlines()
        at = lines.index("Saving & investing: what's the difference?")
        self.assertEqual(lines[at + 1], "=" * len(lines[at]))
        # Every link in the text keeps its parameters whole.
        self.assertIn("https://nidhi.today/blog/first?utm_source=newsletter&utm_medium=email&utm_campaign=first", text)
        # The HTML part still escapes what it is given as text.
        self.assertIn("Saving &amp; investing: what&#39;s the difference?", html)
        for name in ["post_teaser.txt.j2", "post_teaser.html.j2"]:
            out = self.env.get_template(name).render(
                **{**post, "description": "d", "post_url": "u", "post_url_tracked": "https://x/?a=1&b=2", "blog_url": "b",
                   "site_url": SITE_URL, "utm_query": "a=1&b=2", "pub_date": ""})
            self.assertEqual("&amp;" in out, name.endswith(".html.j2"), name)

    def test_a_very_long_lesson_is_sent_as_a_teaser(self):
        long_post = {**POST, "content_html": "<p>" + "word " * (nl.TEASER_SIZE_THRESHOLD_BYTES // 4) + "</p>"}
        with contextlib.redirect_stdout(io.StringIO()):
            html, text = nl.render_email(self.env, item=self.item, post=long_post, site_url=SITE_URL)
        self.assertLess(len(html.encode("utf-8")), nl.TEASER_SIZE_THRESHOLD_BYTES)
        self.assertIn("{{UNSUBSCRIBE_URL}}", html)
        self.assertIn("{{UNSUBSCRIBE_URL}}", text)

    def test_links_are_tagged_with_the_lesson_and_lose_a_trailing_slash(self):
        self.assertEqual(nl._with_utm("https://nidhi.today/blog/x/", "x"),
                         "https://nidhi.today/blog/x?utm_source=newsletter&utm_medium=email&utm_campaign=x")
        self.assertEqual(nl._with_utm("https://nidhi.today/blog?a=1", "x"),
                         "https://nidhi.today/blog?a=1&utm_source=newsletter&utm_medium=email&utm_campaign=x")
        self.assertEqual(nl._post_slug("/blog/a lesson!/"), "a-lesson")
        self.assertEqual(nl._post_slug("/"), "post")


if __name__ == "__main__":
    unittest.main()
