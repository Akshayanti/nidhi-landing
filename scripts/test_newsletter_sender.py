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
import re
import sys
import tempfile
import unittest
from datetime import datetime, timezone
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


def feed(posts=POSTS, link=guid, ids=None) -> str:
    """The feed as the site builds it; `ids` gives each item a <nidhi:id> (none by default: an old feed)."""
    items = "".join(
        f"<item><title>{slug.title()}</title><description>About {slug}.</description>"
        f"<link>{link(slug)}</link><guid>{link(slug)}</guid><pubDate>{date}</pubDate>"
        + (f"<nidhi:id>{ids(slug)}</nidhi:id>" if ids else "")
        + "<category>building</category></item>"
        for slug, date in posts
    )
    return (f'<?xml version="1.0"?><rss version="2.0" xmlns:nidhi="{nl.NIDHI_NS}">'
            f'<channel><title>nidhi</title>{items}</channel></rss>')


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
                 env: dict | None = None, answers=None, now: datetime | None = None):
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
        # The day after the newest lesson in POSTS, so every one is within
        # the age window unless a test moves the clock.
        self.now = now or datetime(2026, 5, 13, 8, 0, tzinfo=timezone.utc)
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
                mock.patch.object(nl, "_now", return_value=self.now), \
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
        """The ids the marker holds, old address lines read as the ids they name."""
        items = nl.parse_rss(self.tmp / "dist" / "rss.xml")
        return nl.sent_ids(nl.load_sent_guids(self.marker), items)[0]


class WhichLessonsGoOut(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def test_a_first_run_sends_the_newest_lesson_only_and_records_the_rest(self):
        run = Run(self.tmp).go()
        self.assertEqual(run.code, 0)
        self.assertEqual(run.sent, ["fifth"])
        self.assertEqual(run.recorded, {slug for slug, _ in POSTS})

    def test_an_empty_or_comment_only_marker_is_a_first_run_too(self):
        for text in ["", "\n\n", "# One GUID per line.\n"]:
            with self.subTest(marker=text), tempfile.TemporaryDirectory() as tmp:
                run = Run(Path(tmp), marker=text).go()
                self.assertEqual(run.sent, ["fifth"], "one lesson, not the whole feed")

    def test_a_recorded_lesson_is_never_sent_again(self):
        marker = "".join(f"{guid(slug)}\n" for slug, _ in POSTS)
        run = Run(self.tmp, marker=marker).go()
        self.assertEqual(run.code, 0)
        self.assertEqual(run.sent, [])
        # And a second run straight after a send finds nothing to do.
        with tempfile.TemporaryDirectory() as tmp:
            first = Run(Path(tmp)).go()
            again = Run(Path(tmp)).go()
            self.assertEqual(first.sent, ["fifth"])
            self.assertEqual(again.sent, [])

    def test_new_lessons_go_out_oldest_first_by_date_not_by_text(self):
        marker = f"{guid('first')}\n"
        run = Run(self.tmp, marker=marker, feed_xml=feed(POSTS[:4])).go()
        self.assertEqual(run.sent, ["second", "third", "fourth"])
        self.assertEqual(run.recorded, {slug for slug, _ in POSTS[:4]})

    def test_only_most_recent_sends_one_and_records_the_others(self):
        marker = f"{guid('first')}\n"
        run = Run(self.tmp, marker=marker, env={"SEND_ONLY_MOST_RECENT": "1"}).go()
        self.assertEqual(run.sent, ["fifth"])
        self.assertEqual(run.recorded, {slug for slug, _ in POSTS})

    def test_a_feed_whose_addresses_all_changed_sends_nothing_again(self):
        # Every lesson is recorded under its address; then the addresses lose
        # their trailing slash. A post is known by its id now (#438), so not
        # one of them goes out again, and the run is clean.
        marker = "".join(f"{guid(slug)}\n" for slug, _ in POSTS)
        changed = feed(link=lambda slug: f"{SITE_URL}/blog/{slug}")
        run = Run(self.tmp, marker=marker, feed_xml=changed).go()
        self.assertEqual((run.sent, run.code), ([], 0))

    def test_a_feed_whose_ids_all_changed_does_not_resend_the_back_catalogue(self):
        marker = "".join(f"{slug}\n" for slug, _ in POSTS)
        changed = feed(ids=lambda slug: f"new-{slug}")
        run = Run(self.tmp, marker=marker, feed_xml=changed).go()
        self.assertEqual(run.sent, [], "five lessons at once is not a publishing day")
        self.assertEqual(run.code, 2, "the run fails, so that someone looks")
        self.assertIn("Nothing was sent", run.stderr)

    def test_the_limit_is_three_lessons_a_run_unless_asked_for(self):
        marker = f"{guid('first')}\n"
        self.assertEqual(nl.MAX_POSTS_PER_RUN, 3)
        four_waiting = Run(self.tmp, marker=marker).go()
        self.assertEqual((four_waiting.sent, four_waiting.code), ([], 2))
        with tempfile.TemporaryDirectory() as tmp:
            asked = Run(Path(tmp), marker=marker, env={"BACKFILL_OK": "1"}).go()
            self.assertEqual(asked.sent, ["second", "third", "fourth", "fifth"])

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
        self.assertNotIn("fourth", run.recorded)
        # The lesson after it is still tried, and recorded when it goes out.
        self.assertEqual(run.sent, ["fourth", "fifth"])
        self.assertIn("fifth", run.recorded)

    def test_a_refused_request_is_not_recorded(self):
        for answer in [{"ok": False, "error": "bad_signature"}, {"ok": False, "error": "from_email_not_sendable: x"}, {"ok": False, "raw": "<html>"}]:
            with self.subTest(answer=answer), tempfile.TemporaryDirectory() as tmp:
                run = Run(Path(tmp), marker=self.marker, answers=[answer]).go()
                self.assertEqual(run.code, 2)
                self.assertNotIn("fourth", run.recorded)

    def test_a_send_that_ran_out_of_time_is_not_recorded_so_the_next_run_resumes_it(self):
        run = self.run_with([{"ok": True, "partial": True, "sent": 40, "failed": 0, "resume_after": "m@x.io"}])
        self.assertEqual(run.code, 2)
        self.assertNotIn("fourth", run.recorded)
        self.assertNotIn("m@x.io", "".join(sorted(run.recorded)))

    def test_a_lesson_the_script_found_nobody_to_send_to_is_not_recorded(self):
        run = self.run_with([{"ok": True, "sent": 0, "failed": 0, "no_recipients": True}])
        self.assertEqual(run.code, 2, "a list that reads as empty fails the run")
        self.assertNotIn("fourth", run.recorded)
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
                mock.patch.object(nl, "_now", return_value=datetime(2026, 5, 13, tzinfo=timezone.utc)), \
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
        self.assertEqual(run.recorded, {"first", "second", "third"})
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


class APostIsKnownByItsId(unittest.TestCase):
    """#438: the newsletter id, not the address, decides whether a lesson went out."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def test_the_request_carries_the_id_and_the_old_address(self):
        marker = "first\nsecond\nthird\nfourth\n"
        run = Run(self.tmp, marker=marker, feed_xml=feed(ids=lambda slug: slug)).go()
        self.assertEqual(run.code, 0)
        self.assertEqual([(p["guid"], p["legacy_guid"]) for p in run.posted],
                         [("fifth", guid("fifth"))])
        self.assertIn("fifth", nl.load_sent_guids(run.marker), "the marker records the id")

    def test_a_lesson_whose_address_changed_keeps_its_id(self):
        marker = "".join(f"{slug}\n" for slug, _ in POSTS)
        moved = feed(link=lambda slug: f"{SITE_URL}/learn/{slug}/", ids=lambda slug: slug)
        run = Run(self.tmp, marker=marker, feed_xml=moved).go()
        self.assertEqual((run.sent, run.code), ([], 0))

    def test_an_old_address_line_names_the_post_with_that_slug_or_at_that_address(self):
        items = nl.parse_rss(feed(ids=lambda slug: "renamed" if slug == "fifth" else slug).encode())
        sent, expired = nl.sent_ids({guid("first"), f"{SITE_URL}/blog/fifth", "second"}, items)
        self.assertEqual((sent, expired), ({"first", "renamed", "second"}, set()))

    def test_a_marker_line_that_is_not_an_id_or_a_lesson_address_stops_the_run(self):
        for line in ["https://example.com/blog/first/", "https://nidhi.today/blog/a/b/", "Not An Id", "expired:"]:
            with self.subTest(line=line), tempfile.TemporaryDirectory() as tmp:
                run = Run(Path(tmp), marker=f"{line}\n").go()
                self.assertEqual((run.sent, run.code), ([], 2))
                self.assertIn("Nothing was sent", run.stderr)

    def test_an_old_address_that_could_name_two_posts_stops_the_run(self):
        # "first" is one post's id, and another post now lives at /blog/first/.
        xml = feed(posts=[("first", POSTS[0][1]), ("other", POSTS[1][1])],
                   link=lambda slug: guid("first") if slug == "other" else guid("elsewhere"),
                   ids=lambda slug: slug)
        items = nl.parse_rss(xml.encode())
        with self.assertRaises(nl.MarkerError):
            nl.sent_ids({guid("first")}, items)

    def test_a_lesson_older_than_two_weeks_is_recorded_as_expired_and_warned_about(self):
        marker = "first\nsecond\nthird\nfourth\n"
        late = datetime(2026, 5, 12, 8, tzinfo=timezone.utc) + nl.MAX_POST_AGE + nl.timedelta(hours=1)
        run = Run(self.tmp, marker=marker, now=late).go()
        self.assertEqual((run.sent, run.code), ([], 0))
        self.assertIn("expired:fifth", nl.load_sent_guids(run.marker))
        self.assertNotIn("fifth", run.recorded, "expired is not sent")
        again = Run(self.tmp, now=late).go()
        self.assertEqual((again.sent, again.code), ([], 0), "and it is not tried again")

    def test_backfill_sends_an_old_lesson_after_all(self):
        late = datetime(2026, 6, 30, tzinfo=timezone.utc)
        run = Run(self.tmp, marker="first\nsecond\nthird\nfourth\n", now=late, env={"BACKFILL_OK": "1"}).go()
        self.assertEqual(run.sent, ["fifth"])

    def test_a_lesson_dated_in_the_future_is_not_sent_and_fails_the_run(self):
        early = datetime(2026, 5, 11, 12, tzinfo=timezone.utc)
        run = Run(self.tmp, marker="first\nsecond\nthird\n", now=early).go()
        self.assertEqual((run.sent, run.code), (["fourth"], 2))
        self.assertIn("in the future", run.stderr)
        self.assertNotIn("fifth", nl.load_sent_guids(run.marker))

    def test_an_item_without_an_id_is_not_sent_and_fails_the_run(self):
        xml = feed(posts=POSTS, link=lambda slug: f"{SITE_URL}/odd/{slug}.html")
        run = Run(self.tmp, marker="x\n", feed_xml=xml).go()
        self.assertEqual((run.sent, run.code), ([], 2))
        self.assertIn("no newsletter id", run.stderr)

    def test_a_reader_waiting_for_a_retry_is_quiet_but_any_other_stop_alerts(self):
        marker = "first\nsecond\nthird\nfourth\n"
        waiting = {"ok": True, "partial": True, "sent": 9, "failed": 0, "retry_waiting": 1, "stopped": "retry_waiting"}
        run = Run(self.tmp, marker=marker, answers=[waiting]).go()
        self.assertEqual(run.code, 0)
        self.assertNotIn("fifth", run.recorded, "not done yet, so the next run resumes it")
        for stop in ["quota", "auth", "other_streak", "storage_full"]:
            with self.subTest(stop=stop), tempfile.TemporaryDirectory() as tmp:
                answer = {"ok": True, "partial": True, "sent": 2, "failed": 0, "stopped": stop}
                stopped = Run(Path(tmp), marker=marker, answers=[answer]).go()
                self.assertEqual(stopped.code, 2)
                self.assertNotIn("fifth", stopped.recorded)


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

        payload = {"subject": "Café: “quoted”", "html": "<p>\u2014</p>", "guid": "g"}
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
        self.assertIn("https://nidhi.today/blog/first/?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=first", html)
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
        self.assertIn("https://nidhi.today/blog/first/?utm_source=newsletter&utm_medium=email&utm_campaign=first", text)
        # The HTML part still escapes what it is given as text.
        self.assertIn("Saving &amp; investing: what&#39;s the difference?", html)
        for name in ["post_teaser.txt.j2", "post_teaser.html.j2"]:
            out = self.env.get_template(name).render(
                **{**post, "description": "d", "post_url": "u", "post_url_tracked": "https://x/?a=1&b=2", "blog_url": "b",
                   "site_url": SITE_URL, "utm_query": "a=1&b=2", "pub_date": ""})
            self.assertEqual("&amp;" in out, name.endswith(".html.j2"), name)

    def test_every_site_link_in_a_lesson_mail_has_the_canonical_slash(self):
        # A page link without its slash ("/blog?utm=", "/privacy?utm=") only
        # works through the host's redirect keeping the query (#448).
        with contextlib.redirect_stdout(io.StringIO()):
            for long in (False, True):
                post = {**POST, "content_html": POST["content_html"] + '<p><a href="/blog/other">x</a> <a href="/free/loan-comparison">y</a></p>'}
                if long:
                    post["content_html"] += "<p>" + "word " * (nl.TEASER_SIZE_THRESHOLD_BYTES // 4) + "</p>"
                for part in nl.render_email(self.env, item=self.item, post=post, site_url=SITE_URL):
                    links = re.findall(r"https://nidhi\.today(/[^\s\"'<>?#]*)?(?=[?#\s\"'<>.]|$)", part)
                    self.assertTrue(links)
                    for path in links:
                        path = path or ""
                        if path.rsplit("/", 1)[-1].count("."):
                            continue  # a file: /rss.xml, a figure, the logo
                        self.assertTrue(path.endswith("/"), f"a link without its slash: {path!r}")

    def test_a_very_long_lesson_is_sent_as_a_teaser(self):
        long_post = {**POST, "content_html": "<p>" + "word " * (nl.TEASER_SIZE_THRESHOLD_BYTES // 4) + "</p>"}
        with contextlib.redirect_stdout(io.StringIO()):
            html, text = nl.render_email(self.env, item=self.item, post=long_post, site_url=SITE_URL)
        self.assertLess(len(html.encode("utf-8")), nl.TEASER_SIZE_THRESHOLD_BYTES)
        self.assertIn("{{UNSUBSCRIBE_URL}}", html)
        self.assertIn("{{UNSUBSCRIBE_URL}}", text)

    def test_links_are_tagged_with_the_lesson_in_the_canonical_slash_form(self):
        # astro.config.mjs sets trailingSlash: 'always' (#448).
        utm = "utm_source=newsletter&utm_medium=email&utm_campaign=x"
        self.assertEqual(nl._with_utm("https://nidhi.today/blog/x/", "x"), f"https://nidhi.today/blog/x/?{utm}")
        self.assertEqual(nl._with_utm("https://nidhi.today/blog/x", "x"), f"https://nidhi.today/blog/x/?{utm}")
        self.assertEqual(nl._with_utm("https://nidhi.today/blog?a=1", "x"), f"https://nidhi.today/blog/?a=1&{utm}")
        self.assertEqual(nl._with_utm("https://nidhi.today", "x"), f"https://nidhi.today/?{utm}")
        self.assertEqual(nl._with_utm("https://nidhi.today/rss.xml", "x"), f"https://nidhi.today/rss.xml?{utm}")
        self.assertEqual(nl._with_utm("https://nidhi.today/blog/x/#y", "x"), f"https://nidhi.today/blog/x/?{utm}#y")
        self.assertEqual(nl._live_post_url("https://nidhi.today", "/blog/x"), "https://nidhi.today/blog/x/")
        self.assertEqual(nl._post_slug("/blog/a lesson!/"), "a-lesson")
        self.assertEqual(nl._post_slug("/"), "post")


if __name__ == "__main__":
    unittest.main()
