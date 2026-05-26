#!/usr/bin/env python3
"""
Render HTML previews of the two transactional emails built by
scripts/newsletter.gs — the confirmation email (`sendConfirmationEmail_`) and
the welcome email (`sendWelcomeEmail_`). Those emails live inside Apps Script
as string-concatenated HTML, so this script re-creates them locally for
design review / spotting inline-style mistakes without needing a redeploy.

Output files land in `emails/_preview/` alongside the newsletter previews
produced by scripts/send_newsletter.py.

Usage:
    python3 scripts/preview_transactional_emails.py

Keep in sync with:
    scripts/newsletter.gs — sendConfirmationEmail_ and sendWelcomeEmail_.
"""
from __future__ import annotations

import html
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PREVIEW_DIR = REPO_ROOT / "emails" / "_preview"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

SITE_URL = "https://nidhi.today"
FROM_NAME = "nidhi"
FROM_EMAIL = "updates@nidhi.today"
# A plausible token the real Apps Script would generate — 64 hex chars. Not
# real, never accepted by Apps Script; purely for preview optics.
SAMPLE_TOKEN = "a" * 64


def _escape(s: str) -> str:
    return html.escape(s, quote=True)


def _utm_query(campaign: str) -> str:
    """Mirror utmQuery_ in scripts/newsletter.gs."""
    from urllib.parse import quote
    return f"utm_source=newsletter&utm_medium=email&utm_campaign={quote(campaign)}"


def _with_utm(url: str, campaign: str) -> str:
    """Mirror withUtm_ in scripts/newsletter.gs."""
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{_utm_query(campaign)}"


def _brand_banner(site_url: str, from_name: str, campaign: str) -> str:
    """
    Mirrors brandBannerHtml_ in scripts/newsletter.gs. Kept as a local copy
    so this preview can run offline; update both if one changes.
    """
    logo_url = f"{site_url}/brand/logo/full/logo-full-400-light.png"
    banner_href = _with_utm(f"{site_url}/blog", campaign)
    return (
        '<tr><td style="padding:0;">'
        '<div style="background:#0D47A1;height:4px;line-height:4px;font-size:0;">&nbsp;</div>'
        '<div style="padding:24px 28px 20px;border-bottom:1px solid #eee;">'
        f'<a href="{_escape(banner_href)}" style="text-decoration:none;color:inherit;display:inline-block;">'
        f'<img src="{_escape(logo_url)}" alt="{_escape(from_name)} - Money, understood." '
        'width="200" height="auto" '
        'style="display:block;max-width:200px;height:auto;border:0;outline:none;">'
        '</a>'
        '</div>'
        '</td></tr>'
    )


def _footer_html(
    site_url: str, unsub_page_url: str, is_newsletter: bool, campaign: str
) -> str:
    """Mirrors footerHtml_ in scripts/newsletter.gs — with UTMs everywhere."""
    blog_href = _with_utm(f"{site_url}/blog", campaign)
    privacy_href = _with_utm(f"{site_url}/privacy", campaign)
    rss_href = _with_utm(f"{site_url}/rss.xml", campaign)
    host = site_url.replace("https://", "").replace("http://", "")
    if is_newsletter:
        body = (
            '<p style="margin:0 0 8px;">You’re getting this because you subscribed to '
            f'<a href="{_escape(blog_href)}" style="color:#0D47A1;text-decoration:underline;">'
            f'{_escape(host)}/blog</a>.</p>'
            '<p style="margin:0 0 8px;">'
            f'<a href="{_escape(unsub_page_url)}" style="color:#777;text-decoration:underline;">Unsubscribe</a> · '
            f'<a href="{_escape(privacy_href)}" style="color:#777;text-decoration:underline;">Privacy</a> · '
            f'<a href="{_escape(rss_href)}" style="color:#777;text-decoration:underline;">RSS</a>'
            '</p>'
        )
    else:
        body = (
            '<p style="margin:0 0 8px;">'
            f'<a href="{_escape(privacy_href)}" style="color:#777;text-decoration:underline;">Privacy</a> · '
            f'<a href="{_escape(rss_href)}" style="color:#777;text-decoration:underline;">RSS</a>'
            '</p>'
        )
    return (
        '<tr><td style="padding:20px 28px;background:#fafafa;border-top:1px solid #eee;'
        'font-size:12px;color:#777;line-height:1.5;">'
        + body
        + '<p style="margin:0;color:#999;">Educational, not financial advice. '
        'Everyone’s situation is different.</p>'
        '</td></tr>'
    )


def render_confirmation_email(
    *, email: str, token: str, site_url: str, from_name: str
) -> str:
    """Mirrors sendConfirmationEmail_ in scripts/newsletter.gs."""
    campaign = "confirm"
    confirm_page_url = _with_utm(f"{site_url}/confirm?t={token}", campaign)
    # In the real flow, Apps Script grabs the subscriber's own unsub token
    # and uses it as the List-Unsubscribe target. For preview we just stub it.
    unsub_page_url = _with_utm(f"{site_url}/unsubscribe?t={token}", campaign)

    subject = f"Confirm your subscription to {from_name}"
    banner = _brand_banner(site_url, from_name, campaign)

    body = (
        '<tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.65;color:#222;">'
        '<p style="margin:0 0 16px;">Hi,</p>'
        f'<p style="margin:0 0 20px;">Click the button below to confirm you’d like a '
        f'heads-up from <strong style="color:#0D47A1;">{_escape(from_name)}</strong> '
        'whenever a new post goes up.</p>'
        f'<p style="margin:0 0 24px;"><a href="{_escape(confirm_page_url)}" '
        'style="display:inline-block;padding:12px 28px;background:#009688;color:#ffffff;'
        'text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">'
        'Confirm subscription</a></p>'
        '<p style="margin:0 0 12px;color:#666;font-size:14px;">If the button doesn’t work, '
        'copy and paste this link into your browser:</p>'
        f'<p style="margin:0 0 20px;color:#666;font-size:13px;word-break:break-all;">'
        f'<a href="{_escape(confirm_page_url)}" style="color:#009688;text-decoration:underline;">'
        f'{_escape(confirm_page_url)}</a></p>'
        '<p style="margin:0;color:#666;font-size:14px;">If you didn’t sign up, ignore this '
        'email and you won’t hear from us again.</p>'
        '</td></tr>'
    )
    footer = _footer_html(site_url, unsub_page_url, is_newsletter=False, campaign=campaign)

    return (
        '<!doctype html><html lang="en"><head>'
        '<meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{_escape(subject)}</title>'
        '</head>'
        '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,'
        'BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,sans-serif;color:#222;'
        'line-height:1.6;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        'style="background:#f5f5f5;">'
        '<tr><td align="center" style="padding:24px 12px;">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" '
        'style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">'
        + banner + body + footer +
        '</table></td></tr></table>'
        '</body></html>'
    )


def render_welcome_email(
    *, email: str, unsub_token: str, site_url: str, from_name: str, from_email: str
) -> str:
    """Mirrors sendWelcomeEmail_ in scripts/newsletter.gs."""
    campaign = "welcome"
    blog_url = _with_utm(f"{site_url}/blog", campaign)
    unsub_page_url = _with_utm(f"{site_url}/unsubscribe?t={unsub_token}", campaign)

    subject = f"You’re subscribed to {from_name}"
    banner = _brand_banner(site_url, from_name, campaign)

    body = (
        '<tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.65;color:#222;">'
        '<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#0D47A1;'
        'font-weight:700;letter-spacing:-0.01em;">You’re in.</h1>'
        f'<p style="margin:0 0 16px;">Thanks for confirming. We’ll ping you from '
        f'<strong style="color:#0D47A1;">{_escape(from_email)}</strong> whenever a new '
        'post goes up, nothing else. No digests, no surprises, no "special offers".</p>'
        '<p style="margin:0 0 20px;">While you wait for the next one, the existing posts '
        'are all on the blog:</p>'
        f'<p style="margin:0 0 24px;"><a href="{_escape(blog_url)}" '
        'style="display:inline-block;padding:12px 24px;background:#009688;color:#ffffff;'
        'text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">'
        'Start reading →</a></p>'
        '<p style="margin:0 0 12px;color:#555;font-size:14px;">Reply to this email if '
        'anything ever lands wrong, a real person reads it.</p>'
        f'<p style="margin:24px 0 0;color:#555;font-size:14px;">- {_escape(from_name)}</p>'
        '</td></tr>'
    )
    footer = _footer_html(site_url, unsub_page_url, is_newsletter=True, campaign=campaign)

    return (
        '<!doctype html><html lang="en"><head>'
        '<meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{_escape(subject)}</title>'
        '</head>'
        '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,'
        'BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,sans-serif;color:#222;'
        'line-height:1.6;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        'style="background:#f5f5f5;">'
        '<tr><td align="center" style="padding:24px 12px;">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" '
        'style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">'
        + banner + body + footer +
        '</table></td></tr></table>'
        '</body></html>'
    )


def main() -> None:
    confirmation_html = render_confirmation_email(
        email="akshayantimatter@gmail.com",
        token=SAMPLE_TOKEN,
        site_url=SITE_URL,
        from_name=FROM_NAME,
    )
    welcome_html = render_welcome_email(
        email="akshayantimatter@gmail.com",
        unsub_token=SAMPLE_TOKEN,
        site_url=SITE_URL,
        from_name=FROM_NAME,
        from_email=FROM_EMAIL,
    )

    confirmation_path = PREVIEW_DIR / "confirmation-email.html"
    welcome_path = PREVIEW_DIR / "welcome-email.html"

    confirmation_path.write_text(confirmation_html, encoding="utf-8")
    welcome_path.write_text(welcome_html, encoding="utf-8")

    print(f"Wrote confirmation preview → {confirmation_path}")
    print(f"Wrote welcome preview      → {welcome_path}")


if __name__ == "__main__":
    main()
