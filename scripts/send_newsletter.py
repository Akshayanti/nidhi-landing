#!/usr/bin/env python3
"""
Send blog-post newsletters to the Apps Script newsletter endpoint.

Reads the built RSS feed (dist/rss.xml), finds items that haven't been sent
yet (tracked in .last-sent-guid.txt), extracts the full post body from the
matching dist/<slug>/index.html file, renders the Jinja2 email templates in
emails/, and POSTs an HMAC-signed payload to the Apps Script web app for
each new post.

Design notes:
  - GUIDs are stored one-per-line in .last-sent-guid.txt. We APPEND on
    success. If the workflow crashes mid-loop, only unsent posts will be
    retried next run.
  - The Apps Script de-duplicates internally on GUID too, so accidental
    double-runs are safe.
  - Fails closed: if NEWSLETTER_ENDPOINT or NEWSLETTER_HMAC_SECRET is unset,
    the script logs and exits 0 (treated as "no-op in setups that haven't
    wired up newsletter sending yet"). The workflow can thus run on every
    deploy without breaking deployments for the pre-setup state.

Env:
  NEWSLETTER_ENDPOINT        Apps Script web app /exec URL. Required.
  NEWSLETTER_HMAC_SECRET     64 hex chars, must match Apps Script
                             HMAC_SECRET script property. Required.
  SITE_URL                   Default https://nidhi.today. Used to make
                             relative hrefs/images absolute in email HTML,
                             and — when NEWSLETTER_FETCH_LIVE=1 — as the
                             base URL to fetch /rss.xml and per-post HTML
                             from.
  NEWSLETTER_FETCH_LIVE      If set to "1", read the RSS feed and each
                             post's HTML from SITE_URL over HTTPS instead
                             of from DIST_DIR on disk. Used by
                             newsletter.yml so the workflow doesn't need
                             to `npm run build`; guarantees subscribers
                             receive exactly what's live on the web at
                             send time.
  DIST_DIR                   Default "dist". Used only when
                             NEWSLETTER_FETCH_LIVE is not set.
  MARKER_FILE                Default ".last-sent-guid.txt".
  DRY_RUN                    If set to "1", renders but does not POST.
  SEND_ONLY_MOST_RECENT      If set to "1", only the most-recent unsent
                             post is sent (useful for initial rollout so
                             you don't backfill every historical post).
"""

from __future__ import annotations

import hashlib
import hmac
import html
import json
import os
import re
import sys
import textwrap
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Iterable

try:
    from bs4 import BeautifulSoup  # type: ignore
    from jinja2 import Environment, FileSystemLoader, select_autoescape
except ImportError as err:
    print(f"[send_newsletter] Missing dependency: {err}. "
          f"Install with: pip install beautifulsoup4 jinja2",
          file=sys.stderr)
    sys.exit(1)


REPO_ROOT = Path(__file__).resolve().parent.parent
EMAIL_TEMPLATE_DIR = REPO_ROOT / "emails"

# Teaser fallback: when the full-body HTML email exceeds this threshold we
# switch to the teaser template (title + TL;DR + first paragraph + CTA).
# 50KB was chosen to stay well under Gmail's ~102KB clip point once MIME
# overhead + inline-styled content + JSON wrapping round-trip through the
# Apps Script payload; 50KB of HTML typically maps to ~75KB of total
# JSON payload which is still comfortably inside the "never clipped" band.
TEASER_SIZE_THRESHOLD_BYTES = 50 * 1024


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass
class Config:
    endpoint: str
    secret: str
    site_url: str
    dist_dir: Path
    marker_file: Path
    dry_run: bool
    only_most_recent: bool
    fetch_live: bool


def load_config() -> Config | None:
    endpoint = os.environ.get("NEWSLETTER_ENDPOINT", "").strip()
    secret = os.environ.get("NEWSLETTER_HMAC_SECRET", "").strip()
    if not endpoint or not secret:
        print("[send_newsletter] NEWSLETTER_ENDPOINT or NEWSLETTER_HMAC_SECRET "
              "not set — skipping newsletter send.")
        return None

    site_url = os.environ.get("SITE_URL", "https://nidhi.today").rstrip("/")
    dist_dir = Path(os.environ.get("DIST_DIR", str(REPO_ROOT / "dist")))
    marker_file = Path(os.environ.get("MARKER_FILE", str(REPO_ROOT / ".last-sent-guid.txt")))
    dry_run = os.environ.get("DRY_RUN", "").strip() == "1"
    only_most_recent = os.environ.get("SEND_ONLY_MOST_RECENT", "").strip() == "1"
    fetch_live = os.environ.get("NEWSLETTER_FETCH_LIVE", "").strip() == "1"

    return Config(
        endpoint=endpoint,
        secret=secret,
        site_url=site_url,
        dist_dir=dist_dir,
        marker_file=marker_file,
        dry_run=dry_run,
        only_most_recent=only_most_recent,
        fetch_live=fetch_live,
    )


# ---------------------------------------------------------------------------
# Live-fetch helpers (used when NEWSLETTER_FETCH_LIVE=1)
# ---------------------------------------------------------------------------

_LIVE_USER_AGENT = "nidhi-newsletter/1.0 (+https://nidhi.today)"


def _http_get_bytes(url: str, timeout: int = 60) -> bytes:
    """GET a URL, return raw bytes. Small wrapper for consistent UA + timeout."""
    req = urllib.request.Request(url, headers={"User-Agent": _LIVE_USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _live_post_url(site_url: str, relative: str) -> str:
    """
    Build the URL to fetch a post's HTML from the live site.

    Astro is configured with `trailingSlash: 'never'`, so `/blog/foo/` 404s
    but `/blog/foo` serves the content (GH Pages handles the index.html
    resolution internally). We strip any trailing slash from the relative
    path to match, and don't append one.
    """
    rel = relative.rstrip("/")
    if not rel.startswith("/"):
        rel = "/" + rel
    return site_url.rstrip("/") + rel


# ---------------------------------------------------------------------------
# RSS parsing
# ---------------------------------------------------------------------------

@dataclass
class RssItem:
    title: str
    description: str
    link: str          # site-absolute URL (e.g. https://nidhi.today/blog/xxx/)
    relative: str      # path portion (e.g. /blog/xxx/)
    pub_date: str
    guid: str          # we use link as guid if RSS didn't emit one
    categories: list[str]


def parse_rss(src: Path | bytes) -> list[RssItem]:
    """
    Parse an RSS feed from either a filesystem path (Path) or in-memory bytes
    (typical output of _http_get_bytes in live-fetch mode).
    """
    if isinstance(src, Path):
        if not src.exists():
            raise FileNotFoundError(f"RSS feed not found at {src}. "
                                    f"Did the build step run?")
        tree = ET.parse(src)
        root = tree.getroot()
    else:
        root = ET.fromstring(src)
    channel = root.find("channel")
    if channel is None:
        raise ValueError("RSS feed has no <channel> element")

    items: list[RssItem] = []
    for node in channel.findall("item"):
        title = _text(node.find("title"))
        description = _text(node.find("description"))
        link = _text(node.find("link"))
        pub_date = _text(node.find("pubDate"))
        guid = _text(node.find("guid")) or link
        categories = [_text(c) for c in node.findall("category") if _text(c)]
        if not link:
            continue
        relative = urllib.parse.urlparse(link).path or link
        items.append(RssItem(
            title=title,
            description=description,
            link=link,
            relative=relative,
            pub_date=pub_date,
            guid=guid,
            categories=categories,
        ))
    return items


def _text(el) -> str:
    return (el.text or "").strip() if el is not None else ""


# Sentinel "very old" datetime used as the sort key for RSS items with a
# missing or unparseable pubDate. Timezone-aware so comparisons with
# parsed pubDates (which can be either naive or aware) are safe after
# we normalise in _parse_pub_date_for_sort.
_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _parse_pub_date_for_sort(pub_date: str) -> datetime:
    """
    Parse an RSS pubDate (RFC 822 / 2822) into a tz-aware datetime for
    sorting.

    Previous versions sorted RssItem.pub_date as a string, which ordered
    items by the lexicographic form of the date — so "Wed, 29 Apr 2026"
    (starts "Wed, 2…") sorted after "Wed, 06 May 2026" (starts "Wed, 0…")
    even though the second date is actually later. That bug quietly
    picked the wrong "newest" post for backfill protection and
    SEND_ONLY_MOST_RECENT, and sent emails in the wrong chronological
    order too. Parsing via email.utils fixes all three.

    Falls back to _EPOCH on unparseable input so a single malformed
    pubDate never breaks the whole send — that item just drifts to the
    bottom of the sort.
    """
    if not pub_date:
        return _EPOCH
    try:
        dt = parsedate_to_datetime(pub_date)
    except (TypeError, ValueError):
        return _EPOCH
    if dt is None:
        return _EPOCH
    # parsedate_to_datetime returns naive when the input lacks a timezone
    # (e.g. "Mon, 06 May 2026 00:00:00"). Anchor to UTC so every key we
    # produce is tz-aware and sortable against the others.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# ---------------------------------------------------------------------------
# Marker file (which GUIDs have already been sent)
# ---------------------------------------------------------------------------

def load_sent_guids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    }


def record_sent(path: Path, guid: str) -> None:
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    if existing and not existing.endswith("\n"):
        existing += "\n"
    if not existing:
        existing = "# One GUID per line. Managed by scripts/send_newsletter.py.\n"
    existing += f"{guid}\n"
    path.write_text(existing, encoding="utf-8")


# ---------------------------------------------------------------------------
# Post HTML extraction
# ---------------------------------------------------------------------------

def extract_post(
    source: Path | str,
    relative: str,
    site_url: str,
    utm_query: str | None = None,
) -> dict[str, str | int | None]:
    """Pull article content + meta for a single post.

    `source` selects where to read the post HTML from:
      - Path  → a local dist directory (used by DRY_RUN and the legacy
                build-in-the-workflow mode).
      - str   → a base URL (e.g. https://nidhi.today), used in live-fetch
                mode. The deployed page is fetched over HTTPS.

    When `utm_query` is provided, every in-body <a> pointing to site_url
    also gets UTM params appended (see absolutize_urls()).
    """
    if isinstance(source, Path):
        # Astro's static output lives at dist<relative>/index.html (with trailing /).
        rel = relative.strip("/")
        candidate = source / rel / "index.html"
        if not candidate.exists():
            # Fallback for trailing-slash variations
            candidate = source / (rel + ".html")
        if not candidate.exists():
            raise FileNotFoundError(
                f"Could not locate built post HTML for {relative} "
                f"(tried {source / rel / 'index.html'})"
            )
        html_source = candidate.read_text(encoding="utf-8")
    else:
        # Live fetch. Astro serves without trailing slash (trailingSlash:
        # 'never'), and GH Pages does the index.html resolution server-side.
        url = _live_post_url(source, relative)
        try:
            html_source = _http_get_bytes(url).decode("utf-8", errors="replace")
        except Exception as err:
            raise RuntimeError(
                f"Could not fetch post HTML from live site ({url}): {err}. "
                f"If this is a deploy-to-send race, the 45s propagation "
                f"delay in deploy.yml's trigger-newsletter job may need "
                f"tuning via the PAGES_PROPAGATION_SECONDS Actions variable."
            ) from err

    soup = BeautifulSoup(html_source, "html.parser")

    # Strip chrome we don't want in email — TOC, suggested reading, post-nav,
    # subscribe section, disclaimer (we include our own in the email footer).
    for sel in [
        ".toc",
        ".suggested-reading",
        ".post-nav",
        ".subscribe",
        ".disclaimer",
        ".post-tags",
        "nav",
        "script",
        "style",
        "noscript",
    ]:
        for node in soup.select(sel):
            node.decompose()

    content_node = soup.select_one("#post-content") or soup.select_one(".prose")
    if content_node is None:
        raise RuntimeError(f"No #post-content / .prose found in {candidate}")
    absolutize_urls(content_node, site_url, utm_query=utm_query)
    style_inline(content_node)

    title_node = soup.select_one(".post-title") or soup.select_one("h1")
    title = title_node.get_text(strip=True) if title_node else ""

    tldr_node = soup.select_one(".post-tldr p")
    tldr = tldr_node.get_text(strip=True) if tldr_node else ""

    reading_time = None
    rt_node = soup.select_one(".post-reading-time")
    if rt_node:
        m = re.search(r"(\d+)", rt_node.get_text())
        if m:
            reading_time = int(m.group(1))

    level_node = soup.select_one(".level-badge, .post-meta .level")
    level = level_node.get_text(strip=True) if level_node else ""

    content_html = content_node.decode_contents()
    content_text = html_to_text(content_node)

    # First paragraph: used as the hook in the teaser-template fallback.
    # Skip over any lingering figure/aside/hr/heading — find the first
    # meaningful <p>. Strip inline styles in the teaser context since the
    # teaser template restyles from scratch.
    first_p = None
    for p in content_node.find_all("p"):
        txt = p.get_text(strip=True)
        if len(txt) >= 40:       # skip tiny captions/leftovers
            first_p = p
            break
    first_paragraph_html = ""
    first_paragraph_text = ""
    if first_p is not None:
        first_paragraph_html = first_p.decode_contents()
        first_paragraph_text = first_p.get_text(" ", strip=True)

    return {
        "title": title,
        "tldr": tldr,
        "reading_time": reading_time,
        "level": level,
        "content_html": content_html,
        "content_text": content_text,
        "first_paragraph_html": first_paragraph_html,
        "first_paragraph_text": first_paragraph_text,
    }


def absolutize_urls(node, site_url: str, utm_query: str | None = None) -> None:
    """
    Rewrite href/src starting with '/' to absolute URLs under site_url.

    When `utm_query` is provided, also appends newsletter UTM params to
    every in-body <a> that points to the site. Rules:
      - Only rewrite links whose final host matches site_url (skip external
        links, mailto:, tel:, fragment-only, and anything with a query that
        already contains `utm_source=`).
      - `?` if the URL has no existing query, `&` otherwise.
      - Strips trailing `/` before appending (matches trailingSlash:'never').

    `utm_query` is the canonical "utm_source=newsletter&utm_medium=email
    &utm_campaign=<slug>" string built once per post in render_email().
    """
    site_host = urllib.parse.urlparse(site_url).netloc
    for a in node.find_all("a"):
        href = a.get("href") or ""
        if href.startswith("/") and not href.startswith("//"):
            href = site_url + href
            a["href"] = href

        if not utm_query:
            continue

        # Skip non-http(s), in-page anchors, and already-UTM'd URLs.
        parsed = urllib.parse.urlparse(href)
        if parsed.scheme not in ("http", "https"):
            continue
        if parsed.netloc != site_host:
            continue
        if "utm_source=" in (parsed.query or ""):
            continue

        # Normalise trailing slash on the path (but not on file-extension
        # paths like /rss.xml) to match astro.config.mjs trailingSlash:'never'.
        path = parsed.path
        if path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
            path = path.rstrip("/") or "/"

        sep = "&" if parsed.query else "?"
        new_query = (parsed.query + sep + utm_query) if parsed.query else utm_query
        a["href"] = urllib.parse.urlunparse(parsed._replace(path=path, query=new_query))

    for img in node.find_all("img"):
        src = img.get("src") or ""
        if src.startswith("/") and not src.startswith("//"):
            img["src"] = site_url + src
        # Strip srcset — Gmail and friends often don't handle it, and it
        # inflates email size without much gain.
        if img.has_attr("srcset"):
            del img["srcset"]


# ---------------------------------------------------------------------------
# Inline style injection
# ---------------------------------------------------------------------------
#
# Gmail strips <style> blocks — the only reliable way to style email content
# is via the `style=""` attribute on every element. The extracted post body
# comes from dist/*/index.html where styles live in scoped <style> blocks
# that won't survive the trip into an inbox. Before the body goes into the
# Jinja template, we walk it and add brand-aligned inline styles to every
# element that would otherwise render as an unstyled default.
#
# Rules (nidhi brand):
#   - Links: teal, underlined
#   - Headings: deep blue, own tight spacing
#   - Blockquotes: left border accent, muted text
#   - Code/pre: monospace, subtle background
#   - Tables: full width, cell borders
#   - Lists / paragraphs: restore reasonable line-height on clients (notably
#     Outlook) that collapse it without explicit styles
#
# Existing `style` attributes on the element are preserved — we PREPEND
# brand defaults so authored overrides still win. Classes are kept but
# inert (they have no effect since <style> blocks are stripped).

_BRAND_STYLES: dict[str, str] = {
    "a":          "color:#009688;text-decoration:underline;",
    "h1":         "color:#0D47A1;font-weight:700;font-size:22px;line-height:1.3;margin:28px 0 12px;letter-spacing:-0.01em;",
    "h2":         "color:#0D47A1;font-weight:700;font-size:19px;line-height:1.3;margin:28px 0 10px;letter-spacing:-0.01em;",
    "h3":         "color:#0D47A1;font-weight:600;font-size:16px;line-height:1.35;margin:22px 0 8px;",
    "h4":         "color:#0D47A1;font-weight:600;font-size:15px;line-height:1.4;margin:18px 0 6px;",
    "p":          "margin:0 0 14px;line-height:1.7;color:#222;",
    "ul":         "margin:0 0 14px;padding-left:22px;line-height:1.7;color:#222;",
    "ol":         "margin:0 0 14px;padding-left:22px;line-height:1.7;color:#222;",
    "li":         "margin-bottom:6px;",
    "blockquote": "margin:16px 0;padding:8px 16px;border-left:3px solid #0D47A1;background:#f0f4f8;color:#445;font-style:italic;",
    "code":       "background:#f1f5f9;padding:1px 5px;border-radius:3px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:0.9em;color:#0D47A1;",
    "pre":        "background:#f1f5f9;padding:14px 16px;border-radius:6px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.5;margin:0 0 14px;",
    "hr":         "border:0;border-top:1px solid #eee;margin:24px 0;",
    "table":      "border-collapse:collapse;width:100%;margin:0 0 14px;font-size:14px;",
    "th":         "border:1px solid #e5e7eb;padding:8px 10px;text-align:left;background:#f8fafc;color:#0D47A1;font-weight:600;",
    "td":         "border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;",
    "strong":     "font-weight:600;color:#0f172a;",
    "em":         "font-style:italic;",
    "img":        "max-width:100%;height:auto;border:0;outline:none;display:block;margin:12px 0;border-radius:4px;",
}


def style_inline(node) -> None:
    """
    Prepend brand-default inline styles onto every element in `node` that
    has a rule in _BRAND_STYLES. Preserves any existing inline style so
    authored overrides still take effect (CSS last-wins: we prepend, so
    the author's declarations come later and override).
    """
    # Wrap `code` inside `pre` — browsers typically give the outer <pre> its
    # styling, but our code styling assumes standalone inline code. Drop the
    # inner code's background so it doesn't double-up visually.
    for pre in node.find_all("pre"):
        for inner_code in pre.find_all("code"):
            existing = inner_code.get("style", "")
            inner_code["style"] = "background:transparent;padding:0;color:inherit;" + (";" + existing if existing else "")

    for tag in node.find_all(True):
        name = tag.name.lower()
        base = _BRAND_STYLES.get(name)
        if not base:
            continue
        existing = tag.get("style", "").strip()
        tag["style"] = base + (existing if not existing or existing.endswith(";") else existing + ";")


def html_to_text(node) -> str:
    """Minimal HTML→text conversion. Adequate for readable plaintext fallback."""
    text = node.get_text("\n", strip=False)
    text = html.unescape(text)
    # Collapse excessive blank lines (preserve paragraph breaks).
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Wrap for readability in text email clients.
    wrapped_lines: list[str] = []
    for line in text.splitlines():
        if not line.strip():
            wrapped_lines.append("")
            continue
        wrapped_lines.extend(textwrap.wrap(line, width=78) or [""])
    return "\n".join(wrapped_lines).strip() + "\n"


# ---------------------------------------------------------------------------
# Jinja2 rendering
# ---------------------------------------------------------------------------

def build_jinja() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(EMAIL_TEMPLATE_DIR)),
        autoescape=select_autoescape(enabled_extensions=("html", "j2")),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def _utm_query(campaign: str) -> str:
    """
    Canonical newsletter UTM query fragment (without leading ? or &).

    Kept as a single source of truth so every link in every email uses
    the same source/medium pair. Campaign varies by email purpose:
      - newsletter post → post slug
      - welcome email   → "welcome"
      - confirmation    → "confirm"
    """
    return (
        f"utm_source=newsletter"
        f"&utm_medium=email"
        f"&utm_campaign={campaign}"
    )


def _with_utm(url: str, campaign: str) -> str:
    """
    Append nidhi's standard newsletter UTMs to an outbound email link.

    - Strips any trailing "/" so the resulting URL matches astro.config.mjs
      `trailingSlash: 'never'` (trailing slash before a query string 404s on
      strict static hosts).
    - Uses "?" or "&" depending on whether the base URL already has a query.
    - Campaign is the post slug so we can segment newsletter traffic per post
      in PostHog / GA.
    """
    base = url.rstrip("/")
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}{_utm_query(campaign)}"


def _post_slug(relative: str) -> str:
    """Derive a UTM-safe slug from /blog/<slug>/ paths."""
    parts = [p for p in relative.strip("/").split("/") if p]
    slug = parts[-1] if parts else "post"
    return re.sub(r"[^a-zA-Z0-9_-]", "-", slug).strip("-") or "post"


def render_email(env: Environment, *, item: RssItem, post: dict, site_url: str) -> tuple[str, str]:
    """
    Render both HTML and plaintext email bodies for a post.

    UTM tagging strategy: *every* outbound link in the final email carries
    `utm_source=newsletter&utm_medium=email&utm_campaign=<post-slug>`. This
    includes the brand banner, the "Read on nidhi.today" CTA, every in-body
    article link (handled by absolutize_urls), the unsubscribe link (which
    already carries `?t=TOKEN`, so UTM joins with `&`), privacy, and RSS.
    The one-click unsubscribe *header* (RFC 8058) is left bare — it's
    machine-parsed by Gmail/Outlook, not clicked by a human.

    Size-based teaser fallback: we render the full version first. If the
    HTML body is at or above TEASER_SIZE_THRESHOLD_BYTES, we re-render
    using post_teaser.html.j2 / post_teaser.txt.j2 — title, TL;DR, first
    paragraph, and a CTA to read on the site. Avoids Gmail's ~102KB clip
    point and keeps the inbox light for long explainers.
    """
    campaign = _post_slug(item.relative)
    utm_query = _utm_query(campaign)
    post_url_tracked = _with_utm(item.link, campaign)
    blog_url = _with_utm(f"{site_url}/blog", campaign)

    ctx = {
        "title": post["title"] or item.title,
        "description": item.description,
        "tldr": post["tldr"],
        "reading_time": post["reading_time"],
        "level": post["level"],
        "content_html": post["content_html"],
        "content_text": post["content_text"],
        "first_paragraph_html": post.get("first_paragraph_html", ""),
        "first_paragraph_text": post.get("first_paragraph_text", ""),
        "post_url": item.link,                # raw — kept in context for
                                              # compatibility; templates use
                                              # post_url_tracked for clicks
        "post_url_tracked": post_url_tracked,
        "blog_url": blog_url,
        "site_url": site_url,
        "utm_query": utm_query,
        "pub_date": item.pub_date,
    }

    html_full = env.get_template("post.html.j2").render(**ctx)
    html_size = len(html_full.encode("utf-8"))
    if html_size >= TEASER_SIZE_THRESHOLD_BYTES:
        print(
            f"[send_newsletter]   full HTML is {html_size / 1024:.1f}KB "
            f"(>= {TEASER_SIZE_THRESHOLD_BYTES / 1024:.0f}KB threshold) — "
            f"falling back to teaser template."
        )
        html_out = env.get_template("post_teaser.html.j2").render(**ctx)
        text_out = env.get_template("post_teaser.txt.j2").render(**ctx)
    else:
        html_out = html_full
        text_out = env.get_template("post.txt.j2").render(**ctx)
    return html_out, text_out


# ---------------------------------------------------------------------------
# HMAC + HTTP
# ---------------------------------------------------------------------------

def sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def post_to_apps_script(cfg: Config, payload: dict) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    signature = sign(cfg.secret, body)
    # Apps Script doesn't reliably expose custom request headers to the script
    # context, so we send the signature as a query-string parameter alongside
    # the required `action=send_post`. The Apps Script handler HMACs the raw
    # body and compares.
    sep = "&" if "?" in cfg.endpoint else "?"
    url = f"{cfg.endpoint}{sep}action=send_post&sig={signature}"

    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "nidhi-newsletter/1.0 (+https://nidhi.today)",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=360) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as err:
        raise RuntimeError(f"POST to Apps Script failed: {err}") from err

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"ok": False, "raw": raw}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    cfg = load_config()
    if cfg is None:
        return 0

    # Source of truth: either the deployed site (live mode, used by the
    # decoupled newsletter.yml workflow) or the local dist/ directory
    # (legacy path + DRY_RUN testing).
    if cfg.fetch_live:
        rss_url = f"{cfg.site_url}/rss.xml"
        print(f"[send_newsletter] live fetch: {rss_url}")
        try:
            rss_bytes = _http_get_bytes(rss_url)
        except Exception as err:
            print(f"[send_newsletter] could not fetch live RSS from {rss_url}: {err}",
                  file=sys.stderr)
            return 2
        items = parse_rss(rss_bytes)
        post_source: Path | str = cfg.site_url
    else:
        rss_path = cfg.dist_dir / "rss.xml"
        items = parse_rss(rss_path)
        post_source = cfg.dist_dir

    sent = load_sent_guids(cfg.marker_file)

    pending = [it for it in items if it.guid not in sent]
    if not pending:
        print(f"[send_newsletter] No new posts to send "
              f"(feed has {len(items)}, {len(sent)} already sent).")
        return 0

    # First-run protection: if the marker file is empty and we have a huge
    # backlog, don't spam subscribers with every historical post. Require
    # explicit opt-in with BACKFILL_OK=1 to actually send every post; by
    # default only the newest gets sent and the rest are recorded as
    # already-sent so they never fire retroactively.
    if not sent and len(pending) > 1 and not os.environ.get("BACKFILL_OK"):
        print(f"[send_newsletter] First run with {len(pending)} unsent posts. "
              f"Marking all but the newest as already-sent to avoid backfill "
              f"spam. Set BACKFILL_OK=1 to override.")
        pending.sort(key=lambda it: _parse_pub_date_for_sort(it.pub_date), reverse=True)
        newest = pending[0]
        print(f"[send_newsletter]   keeping newest: {newest.title} "
              f"({newest.pub_date})")
        if not cfg.dry_run:
            for it in pending[1:]:
                record_sent(cfg.marker_file, it.guid)
        pending = [newest]

    if cfg.only_most_recent and len(pending) > 1:
        pending.sort(key=lambda it: _parse_pub_date_for_sort(it.pub_date), reverse=True)
        if not cfg.dry_run:
            for it in pending[1:]:
                record_sent(cfg.marker_file, it.guid)
        pending = pending[:1]

    # Send oldest first so subscribers see them in chronological order.
    pending.sort(key=lambda it: _parse_pub_date_for_sort(it.pub_date))

    env = build_jinja()
    print(f"[send_newsletter] {len(pending)} post(s) to send.")

    any_failed = False
    total_sent = 0
    total_failed = 0
    total_partial = 0
    for item in pending:
        print(f"[send_newsletter] → {item.title}  ({item.link})")
        try:
            # Derive UTMs before extraction so in-body article links get
            # tagged with the same campaign that render_email uses on
            # banner/CTA/footer links.
            campaign = _post_slug(item.relative)
            utm_query = _utm_query(campaign)
            post = extract_post(
                post_source, item.relative, cfg.site_url,
                utm_query=utm_query,
            )
            html_out, text_out = render_email(
                env, item=item, post=post, site_url=cfg.site_url,
            )
        except Exception as err:
            print(f"[send_newsletter]   extract/render failed: {err}", file=sys.stderr)
            any_failed = True
            continue

        payload = {
            "subject": str(post["title"] or item.title),
            "html": html_out,
            "text": text_out,
            "url": item.link,
            "guid": item.guid,
            "pubDate": item.pub_date,
            "title": post["title"] or item.title,
            "description": item.description,
        }

        size_kb = len(json.dumps(payload)) / 1024
        if size_kb > 95:
            print(f"[send_newsletter]   WARNING: payload is {size_kb:.1f}KB — "
                  f"Gmail may clip emails over ~102KB.", file=sys.stderr)

        if cfg.dry_run:
            out = REPO_ROOT / "emails" / "_preview" / f"{slugify(item.guid)}.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html_out, encoding="utf-8")
            print(f"[send_newsletter]   DRY_RUN: wrote preview to {out}")
            # Still record as "sent" so the caller's workflow matches steady-state
            # behaviour — but ONLY for dry runs that set DRY_RUN_RECORD=1.
            if os.environ.get("DRY_RUN_RECORD") == "1":
                record_sent(cfg.marker_file, item.guid)
            continue

        try:
            resp = post_to_apps_script(cfg, payload)
        except Exception as err:
            print(f"[send_newsletter]   POST failed: {err}", file=sys.stderr)
            any_failed = True
            continue

        if not resp.get("ok"):
            print(f"[send_newsletter]   Apps Script rejected: {resp}", file=sys.stderr)
            # Actionable hints for the common misconfigurations that
            # produce a well-formed !ok response. bad_signature is
            # almost always a secret-mismatch between the Actions secret
            # (NEWSLETTER_HMAC_SECRET) and the Apps Script Script
            # Property (HMAC_SECRET) — they share one key and must be
            # byte-identical. from_email_not_sendable means someone
            # removed the "Send mail as" alias in Gmail settings.
            err = str(resp.get("error", ""))
            if err == "bad_signature":
                print(
                    "[send_newsletter]   HINT: GitHub Actions secret "
                    "NEWSLETTER_HMAC_SECRET does not match the Apps "
                    "Script property HMAC_SECRET. Both must be the SAME "
                    "value (output of `openssl rand -hex 32`). Copy one "
                    "side to the other, redeploy the Apps Script (Deploy "
                    "→ Manage deployments → ✏️ → New version), and re-run.",
                    file=sys.stderr,
                )
            elif err.startswith("from_email_not_sendable"):
                print(
                    "[send_newsletter]   HINT: the Gmail account that "
                    "owns the Apps Script can't send as FROM_EMAIL. Go "
                    "to Gmail settings → Accounts and Import → \"Send "
                    "mail as\" on the owner account and verify that "
                    "address. Then curl ?action=health to confirm.",
                    file=sys.stderr,
                )
            any_failed = True
            continue

        sent_count = int(resp.get("sent", 0) or 0)
        failed_count = int(resp.get("failed", 0) or 0)
        total_sent += sent_count
        total_failed += failed_count

        # Partial responses mean Apps Script ran out of its 5-minute budget
        # and has persisted a per-guid `send_progress:<guid>` marker. The
        # idempotency marker (`sent_guid:<guid>`) has NOT been written yet.
        # If we recorded the guid in .last-sent-guid.txt here, the workflow
        # would never retry and the remaining subscribers would silently
        # never get the email. Skip recording and flag as failure so the
        # next workflow run picks up where this one left off.
        if resp.get("partial"):
            total_partial += 1
            resume_after = resp.get("resume_after", "")
            print(
                f"[send_newsletter]   PARTIAL: sent={sent_count} failed={failed_count}"
                + (f" resume_after={resume_after}" if resume_after else "")
                + " — guid NOT marked; next workflow run will resume.",
                file=sys.stderr,
            )
            any_failed = True
            continue

        record_sent(cfg.marker_file, item.guid)
        print(f"[send_newsletter]   sent={sent_count} failed={failed_count}")

    # Emit step outputs so the workflow can make smart decisions about
    # failure notification without re-parsing stderr.
    _write_gh_output({
        "any_failed": "1" if any_failed else "0",
        "total_sent": str(total_sent),
        "total_failed": str(total_failed),
        "total_partial": str(total_partial),
        "posts_attempted": str(len(pending)),
    })

    return 2 if any_failed else 0


def _write_gh_output(kv: dict[str, str]) -> None:
    """
    Append key=value pairs to the file pointed to by $GITHUB_OUTPUT, which
    is how GitHub Actions reads step outputs. No-op if the env var isn't
    set (local runs, DRY_RUN, manual invocations). Uses the documented
    heredoc form so values with newlines would survive if we ever emit
    any — though we don't today.
    """
    out_path = os.environ.get("GITHUB_OUTPUT", "").strip()
    if not out_path:
        return
    try:
        with open(out_path, "a", encoding="utf-8") as fh:
            for k, v in kv.items():
                if "\n" in v:
                    fh.write(f"{k}<<__END__\n{v}\n__END__\n")
                else:
                    fh.write(f"{k}={v}\n")
    except OSError as err:
        print(f"[send_newsletter] could not write GITHUB_OUTPUT: {err}", file=sys.stderr)


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-") or "post"


if __name__ == "__main__":
    sys.exit(main())
