# Blog newsletter setup

A **100% free, self-hosted, GDPR-compliant blog newsletter** that lives on
tools already in the stack:

| Layer              | Tool                                                        |
|--------------------|-------------------------------------------------------------|
| Subscribe form     | `src/components/SubscribeSection.astro` (two variants)      |
| Confirm/unsubscribe landing | `src/pages/confirm.astro`, `src/pages/unsubscribe.astro` (branded, on nidhi.today) |
| Result pages       | `src/pages/subscription-confirmed.astro`, `/unsubscribed.astro`, `/subscription-invalid.astro` |
| Backend / storage  | Google Apps Script Web App + Google Sheet                   |
| Transport          | Gmail API (from Google Workspace account on `nidhi.today`)  |
| Trigger            | GitHub Actions on every deploy                              |
| Templating         | Jinja2 (`emails/post.html.j2`, `emails/post.txt.j2`)        |
| Compliance         | Double opt-in + opaque-token unsubscribe + RFC 8058 `List-Unsubscribe` + `List-Unsubscribe-Post` headers |

No external newsletter provider. **$0/mo** up to the Workspace sending
limit of **1,500 recipients/day**.

## Architecture

```
                                                   ┌─────────────────────────────────────┐
nidhi.today form ─ POST(action=subscribe) ────────▶│                                     │
                                                   │  Apps Script Web App                │
nidhi.today/confirm/?t=... (landing + POST) ──────▶│    doPost: subscribe / confirm /    │
                                                   │            unsubscribe / send_post  │
nidhi.today/unsubscribe/?t=... (landing + POST) ──▶│    doGet:  health / confirm /       │
                                                   │            unsubscribe (via redir)  │
Gmail RFC 8058 native "Unsubscribe" ─────────────▶│                                     │
  (POST direct to Apps Script /exec)               │    Storage: Google Sheet (8 cols)   │
                                                   │    Send:    Gmail API raw MIME      │
                                                   └──────────────▲──────────────────────┘
                                                                  │ HMAC-signed POST
                                                                  │ { subject, html, text,
                                                                  │   url, guid, ... }
                                                                  │
                                         ┌────────────────────────┴────────────────────────┐
                                         │ GitHub Actions (.github/workflows/deploy.yml)   │
                                         │   1. npm run build                              │
                                         │   2. python scripts/send_newsletter.py          │
                                         │        ↳ parse dist/rss.xml                     │
                                         │        ↳ diff against .last-sent-guid.txt       │
                                         │        ↳ for each new item: extract post HTML,  │
                                         │          inject brand-aligned inline styles,    │
                                         │          render Jinja2, sign, POST to Apps Script│
                                         │   3. commit .last-sent-guid.txt back to main    │
                                         │   4. upload pages artifact → deploy             │
                                         └─────────────────────────────────────────────────┘
```

## Sheet schema

Row 1 must be **exactly these 8 column headers** (lowercase, with underscores):

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| `email` | `status` | `source` | `created_at` | `confirmed_at` | `unsubscribed_at` | `confirm_token` | `unsub_token` |

- `status` ∈ `pending` / `confirmed` / `unsubscribed`
- `confirm_token` / `unsub_token`: 64-hex-char opaque random strings, set by the Apps Script at subscribe time. Confirm token is cleared (single-use) after successful confirmation; unsub token is permanent so old newsletter emails' unsubscribe links keep working.

## Why the token flow is designed this way

- **Email never appears in any URL.** All subscriber-facing URLs (confirmation link in email, unsubscribe link in email, `List-Unsubscribe` header) carry only the opaque token. The server looks up the row by token.
- **Tokens are opaque random**, not HMAC-derived. Previous HMAC-of-email schemes were deterministic and forever-valid — a leaked token stayed exploitable indefinitely. These can be invalidated by clearing the cell.
- **Confirm and unsub tokens are separate columns**, so leaking one doesn't leak the other.
- **Subscribers never see `script.google.com` URLs.** Email links target `nidhi.today/confirm?t=...` and `nidhi.today/unsubscribe?t=...` — branded landing pages that POST to Apps Script on explicit button click. (Note: no trailing slash before `?` — matches `astro.config.mjs` `trailingSlash: 'never'`; the slash-before-query form 404s on strict static hosts.) This also protects against Slack/iMessage/WhatsApp link-preview bots that GET URLs to build previews (they don't execute JS + POST, so they can't trigger an action).
- **Gmail's RFC 8058 one-click unsubscribe** still works — the `List-Unsubscribe` header points directly at Apps Script `/exec?action=unsubscribe&t=TOKEN`, and Apps Script accepts that as a POST with a JSON response.
- **Referrer-Policy: no-referrer** on the Apps Script redirect HTML, so the destination nidhi.today page never sees the Apps Script URL (with its token) as the Referer.
- **Confirmation tokens auto-invalidate** after a successful confirm (single-use), so even if the email is later shared or shoulder-surfed, the link is dead.

## One-time setup

### 1. Create the subscribers Google Sheet

1. Create a sheet at <https://sheets.new>. Title something like `nidhi blog subscribers`.
2. In row 1, enter the 8 headers above **exactly as shown**.
3. Copy the sheet's ID from its URL (the long string between `/d/` and `/edit`).
4. Take note of the tab name (default is `Sheet1`). You'll use this as `SHEET_NAME` below — it **must match exactly**. The Apps Script does NOT auto-create a tab if the name doesn't match; it fails with a clear error listing the existing tabs.

### 2. Deploy the Apps Script Web App

1. Go to <https://script.new>, logged in as the Google account that should *own* the script.
   - Simplest: own the script from the account that IS `hello@nidhi.today`.
   - Alternative: own from a different Workspace user; you'll need to add `hello@nidhi.today` as a verified "Send mail as" alias in that user's Gmail settings (step 6 below).
2. Paste the contents of [`scripts/newsletter.gs`](../scripts/newsletter.gs) into `Code.gs`, replacing the stub.
3. **Enable the advanced Gmail service:** Services (left rail) → `+` → `Gmail API` → Add. Required so we can send raw MIME with `List-Unsubscribe` headers.
4. **Script properties** (⚙ Project Settings → Script properties → Add script property):

   | Key | Value |
   |---|---|
   | `SHEET_ID` | The long ID from step 1 |
   | `SHEET_NAME` | The exact tab name (e.g. `Sheet1` or `Subscribers`) |
   | `FROM_NAME` | `nidhi` |
   | `FROM_EMAIL` | `hello@nidhi.today` |
   | `SITE_URL` | `https://nidhi.today` |
   | `HMAC_SECRET` | Generate with `openssl rand -hex 32`. Used only to verify signatures on send-post requests from GitHub Actions — NOT used for per-subscriber tokens (those are random opaque). |
   | `POSTHOG_API_KEY` | *(optional)* the `phc_…` key used on the frontend — enables server-side events for confirm/unsubscribe |
   | `POSTHOG_HOST` | *(optional)* `https://eu.i.posthog.com` |

5. **Deploy as web app:** Top-right → Deploy → New deployment →
   - Type: **Web app**
   - Description: `newsletter v1`
   - Execute as: **Me**
   - Who has access: **Anyone** ← absolutely required. "Anyone with Google account" will return 401 for anonymous subscribe requests.
   - Deploy → authorize the requested scopes (Gmail send, Sheet read/write, external URL fetch).

6. **If FROM_EMAIL isn't the script-owner's primary address**, set up a verified alias:
   - Open Gmail as the script owner → Settings → See all settings → Accounts → **Send mail as** → Add `hello@nidhi.today` → verify.
   - Apps Script will then be allowed to set `From: hello@nidhi.today` on outgoing mail.

7. Copy the **`/exec`** URL (ends in `/exec`, NOT `/dev`). You'll need it in the next two steps.

### 3. Verify setup with the health endpoint

Before hooking anything up, open this in your browser:

```
https://script.google.com/macros/s/YOUR_ID/exec?action=health
```

You should see a JSON response with `"ok": true` and per-check `ok: true`
entries for `script_properties`, `web_app_url`, `gmail_advanced_service`,
`sheet_access` (including the exact tab name and current row count), and
`from_email_sendable`. Any `"ok": false` includes a clear error message.

If any check fails, fix it and re-deploy (**Deploy → Manage deployments →
✏️ pencil → New version → Deploy** — saving the code alone doesn't update
the `/exec` URL).

### 4. Wire up the frontend

Set `PUBLIC_NEWSLETTER_ENDPOINT` to the Apps Script `/exec` URL:

- **Locally** (`.env`):
  ```dotenv
  PUBLIC_NEWSLETTER_ENDPOINT=https://script.google.com/macros/s/AKfycb.../exec
  ```
  Restart `npm run dev` — Astro only reads `.env` at dev-server start.

- **In CI** (GitHub → Settings → Secrets and variables → Actions → **Secrets** → New repository secret):
  - Name: `PUBLIC_NEWSLETTER_ENDPOINT`
  - Value: the same `/exec` URL

The `PUBLIC_` prefix is required to expose the var to the browser.

### 5. Wire up the newsletter-send step

In GitHub → Settings → Secrets and variables → Actions → **Secrets**:

| Secret | Value |
|---|---|
| `NEWSLETTER_ENDPOINT` | Same Apps Script `/exec` URL |
| `NEWSLETTER_HMAC_SECRET` | Same value as the Apps Script `HMAC_SECRET` property |

Optionally, in the **Variables** tab:

| Variable | When |
|---|---|
| `NEWSLETTER_BACKFILL_OK` | Set to `1` **only** on the single run where you want to send every historical post. Default: the first real run only sends the most recent, quietly marking older ones as already-sent. |

### 6. Migrating an existing Sheet (only if you had this set up before)

If your Sheet predates this version (6 columns instead of 8, or email-based
HMAC tokens), run the one-time migration function from the Apps Script
editor:

1. Open the script editor.
2. In the function picker at the top, select `migrateAddTokens`.
3. Click Run. Authorize if prompted.
4. Check the execution log — it'll print `migrateAddTokens: filled N row(s).` for how many rows got backfilled.
5. Refresh the `?action=health` endpoint to confirm the 8-column schema check now passes.

`migrateAddTokens` is **idempotent** — safe to run multiple times; it only fills in missing values.

### 7. Placement

The component renders in two places with variants:

- `src/layouts/BlogIndex.astro:75` → `<SubscribeSection variant="compact" />` — slim inline row near the top of `/blog/`
- `src/layouts/BlogPost.astro:215` → `<SubscribeSection variant="full" />` — full centered box at the end of every blog post (high-intent spot)

## End-to-end testing

After setup, test the whole loop with your own email:

1. **Subscribe:** visit `/blog/`, submit your email on the compact form. Expect "Check your inbox to confirm your subscription."
2. **Sheet check:** look at the configured tab. A new row should appear: `your-email | pending | /blog/ | <timestamp> | | | <token> | <token>`.
3. **Confirm email:** look for `Confirm your subscription to nidhi` from `hello@nidhi.today`. (Check Spam and Promotions tabs too on a first send.)
4. **Confirm flow:** click the "Confirm subscription" button in the email. Expect to land on `https://nidhi.today/confirm/?t=...`, see the token strip from the URL bar immediately, then click "Yes, subscribe me" → redirect to `/subscription-confirmed/`.
5. **Sheet check again:** your row should now have `status=confirmed`, a `confirmed_at` timestamp, and an empty `confirm_token` (invalidated).
6. **Newsletter send:** manually trigger the workflow or push a new post. Confirm the email arrives with correct branding — blue top strip, nidhi logo image, tagline, the post content inline, a "Read on nidhi.today" CTA, and a footer with working Unsubscribe / Privacy / RSS links.
7. **In-email unsubscribe (user flow):** click the footer Unsubscribe link → lands on `/unsubscribe/` → click "Unsubscribe me" → redirect to `/unsubscribed/`. Sheet: `status=unsubscribed`, `unsubscribed_at` set.
8. **Gmail one-click unsubscribe (RFC 8058):** in Gmail, the native "Unsubscribe" link next to the sender name should POST directly to Apps Script and show Gmail's native "Unsubscribed" UI — without ever loading a web page.
9. **Bad link handling:** try manually visiting `/confirm/?t=garbage` → button disabled with an error message, no accidental actions. Same for `/unsubscribe/?t=garbage`.

## Local preview of the email without actually sending

```bash
NEWSLETTER_ENDPOINT="https://..." \
NEWSLETTER_HMAC_SECRET="test-only-dummy-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
DRY_RUN=1 \
python3 scripts/send_newsletter.py
```

Writes HTML previews to `emails/_preview/` (gitignored). Open in a browser
to inspect the branded banner, inline styles, and footer.

## Gotchas, limits, and migration paths

- **Apps Script requires a version bump on every code change.** Deploy → Manage deployments → ✏️ → Version: New version → Deploy. Test deployments (`/dev` URLs) require the owner to be logged in and are not what your users hit.
- **Workspace admin policy** can block "Anyone" access on Apps Script. If "Anyone" greys out, your Workspace admin has restricted sharing. Change the policy or move the script to a personal Google account.
- **Gmail Workspace caps sending at 1,500 recipients/day.** Past that, chunk across days or swap the `sendRaw_()` call in `scripts/newsletter.gs` for a transactional provider (Resend, Mailgun, SES). Your `nidhi.today` domain already DKIM-aligns via Workspace, so a new provider only needs SPF/DKIM DNS records added.
- **Apps Script 6-minute execution limit.** `handleSendPost_()` has a 5-minute time budget and returns `partial: true` if exceeded. The de-dupe marker is only set after the full loop — partial runs cause duplicate sends to early recipients on the next retry. Not a concern under the 1,500/day Workspace ceiling but flagged for future you.
- **Bounces are invisible** via the Gmail API advanced service. Periodically check `hello@nidhi.today`'s inbox for `mailer-daemon` messages and manually mark those Sheet rows `status=bounced` or delete them.
- **Gmail bulk-sender rules (Feb 2024)** apply at 5k+/day — we're already compliant (`List-Unsubscribe` + `List-Unsubscribe-Post` + `Precedence: bulk` + `Auto-Submitted: auto-generated` + proper DKIM via Workspace).
- **Backfill protection:** first real run with existing posts sends only the newest, silently marking older ones as already-sent. Set the Actions variable `NEWSLETTER_BACKFILL_OK=1` for the one run where you want the full backfill to go out.

## Files in this system

| File | Purpose |
|---|---|
| `src/components/SubscribeSection.astro` | Subscribe form UI (compact + full) |
| `src/layouts/BlogIndex.astro` | Compact variant near top of `/blog/` |
| `src/layouts/BlogPost.astro` | Full variant at end of every post |
| `src/pages/confirm.astro` | Branded POST-on-click confirm landing page |
| `src/pages/unsubscribe.astro` | Branded POST-on-click unsubscribe landing page |
| `src/pages/subscription-confirmed.astro` | "You're in" result page |
| `src/pages/unsubscribed.astro` | "You're unsubscribed" result page |
| `src/pages/subscription-invalid.astro` | Error page for expired/invalid tokens |
| `src/styles/global.css` | `.transactional-*` styles shared across the 5 pages above |
| `scripts/newsletter.gs` | Apps Script web app (paste into a new Apps Script project) |
| `scripts/send_newsletter.py` | CI script: RSS diff, extract body, inject inline styles, render, sign, POST |
| `emails/post.html.j2` | HTML email template with brand banner and inline styles |
| `emails/post.txt.j2` | Plain-text email template |
| `.github/workflows/deploy.yml` | build → newsletter send → commit marker → deploy |
| `.last-sent-guid.txt` | Committed marker of RSS GUIDs already sent |

## Observability

Events fire in PostHog (EU cloud) from the frontend and, if `POSTHOG_API_KEY`
is set as a script property, from Apps Script too:

| Event | Where | When |
|---|---|---|
| `blog_subscribe_submit` | frontend | user submitted the subscribe form |
| `blog_subscribe_sent` | frontend | POST to Apps Script didn't error at the network level |
| `blog_subscribe_pending` | Apps Script | row written as pending; confirmation email sent |
| `blog_subscribe_duplicate` | Apps Script | already-confirmed email resubmitted (silently no-op'd) |
| `blog_subscribe_confirm_clicked` | frontend (landing page) | user clicked "Yes, subscribe me" |
| `blog_subscribe_confirmed` | Apps Script | confirm flow reached server, row flipped to confirmed |
| `blog_unsubscribe_clicked` | frontend (landing page) | user clicked "Unsubscribe me" |
| `blog_unsubscribe` | Apps Script | unsubscribe flow reached server, row flipped |
| `blog_newsletter_sent` | Apps Script | a post was mailed out |

Useful PostHog funnel: `blog_subscribe_submit` → `blog_subscribe_pending` →
`blog_subscribe_confirm_clicked` → `blog_subscribe_confirmed` → (retention)
`blog_unsubscribe`.
