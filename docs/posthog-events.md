# PostHog Events

> Auto-generated 2026-05-24 from the codebase. Update when events are added, renamed, or removed.

All events use `https://eu.i.posthog.com` as the API host. Client-side events go through the PostHog JS SDK (`window.posthog.capture`). Server-side events go through the PostHog HTTP API (`POST /capture/`) from the Google Apps Script (`newsletter.gs`).

---

## SDK Auto-events (every page)

Configured in `BaseHead.astro:102-108`.

| Event | Config flag | Notes |
|---|---|---|
| `$pageview` | `capture_pageview: true` | Fires on every page load, regardless of consent |
| `$pageleave` | `capture_pageleave: true` | Fires on page leave, regardless of consent |
| `$autocapture` | `autocapture: <consent>` | Click/input capture on `data-attr` elements; **gated on cookie consent** |

---

## Client-side explicit events

### Global — `src/components/BaseHead.astro`

| Event | Properties | Trigger |
|---|---|---|
| `$ai_referrer` | `ai_referrer_domain: string` — referring hostname<br>`ai_referrer_full: string` — full referrer URL | Document referrer matches a known AI crawler domain |

### Newsletter subscription — `src/components/SubscribeSection.astro`

| Event | Properties | Trigger |
|---|---|---|
| `blog_subscribe_submit` | `email_domain: string` — domain part of email<br>`source: string` — `window.location.pathname`<br>`variant: string` — A/B test variant | User submits the subscribe form |
| `blog_subscribe_sent` | `variant: string` | Server responds OK (confirmation email queued) |
| `blog_subscribe_dismissed` | `action: "already_subscribed" \| "not_now"`<br>`variant: string` | User dismisses the subscribe prompt |
| `blog_subscribe_dismiss_undo` | `variant: string` | User clicks undo after dismissing |
| `blog_subscribe_retry_clicked` | `variant: string` | User clicks retry after a failed submit |

Also calls `window.posthog.identify(sha256(email))` on submit to alias the anonymous `distinct_id` to the subscriber's hashed email, stitching client + server events into a single user timeline.

### Product waitlist — `src/components/WaitlistSection.astro`

| Event | Properties | Trigger |
|---|---|---|
| `waitlist_submit` | `email_domain: string` — domain part of email<br>`source: string` — `window.location.pathname` | User submits the waitlist form |
| `waitlist_sent` | — | Server responds OK (signup recorded) |

No `posthog.identify()` call — the waitlist is a single-step funnel with no follow-up events to stitch, so the `distinct_id` remains anonymous.

### Subscription confirmation — `src/pages/confirm.astro`

| Event | Properties | Trigger |
|---|---|---|
| `blog_subscribe_confirm_clicked` | — | User clicks the confirm-subscription button |

### Unsubscribe — `src/pages/unsubscribe.astro`

| Event | Properties | Trigger |
|---|---|---|
| `blog_unsubscribe_clicked` | — | User clicks the unsubscribe button |

### Loan Comparison tool — `src/components/LoanCompare.tsx`

All events prefixed `free_loan_comparison_`. Uses a `track()` wrapper (`line 59`) that silently no-ops if `window.posthog` is absent.

| Event | Properties | Trigger |
|---|---|---|
| `free_loan_comparison_shared_view_opened` | `vendors: number` — vendor count from URL<br>`utm_source: string \| null` | URL contains encoded state (shared link opened) |
| `free_loan_comparison_vendor_added` | `count: number` — new total after add | User adds a vendor row |
| `free_loan_comparison_vendor_removed` | `vendor: string` — slot label A-E that was removed | User removes a vendor row |
| `free_loan_comparison_validation_error` | `count: number` — errored field count<br>`firstReason: string` — category of first error<br>`firstVendor: string` — slot label of first error | Validation fails (debounced 600ms) |
| `free_loan_comparison_share_modal_opened` | — | User opens the share modal |
| `free_loan_comparison_share_copied` | — | User copies the share link to clipboard |
| `free_loan_comparison_currency_changed` | `currency: string` — new currency code | User changes the display currency |
| `free_loan_comparison_reset` | — | User clicks "Reset to defaults" |
| `free_loan_comparison_mode_changed` | `vendor: string` — slot label<br>`mode: "term" \| "payment"` | User toggles monthly-payment vs payoff-months |
| `free_loan_comparison_rate_kind_changed` | `vendor: string` — slot label<br>`rateKind: "fixed" \| "hybrid"` | User toggles fixed vs hybrid rate type |
| `free_loan_comparison_details_toggled` | `vendor: string` — slot label | User expands a result details `<details>` |
| `free_loan_comparison_tab_changed` | `tab: string` — analysis tab id<br>`via: "click" \| "keyboard"` | User switches analysis tab |
| `free_loan_comparison_split_vendor_changed` | `vendor: string` — slot label of selected vendor | User picks a vendor in the split-comparison view |
| `free_loan_comparison_horizon_changed` | `months: number` — selected horizon in months | User changes the time horizon slider (debounced 600ms) |
| `free_loan_comparison_refi_changed` | `field: string` — changed input field name | User changes a refinance input (debounced 600ms) |

### Multi-Currency Net Worth tool — `src/components/MultiCurrencyNetWorth.tsx`

All events prefixed `free_multi_currency_net_worth_`. Uses the same `track()` wrapper pattern (`line 32`).

| Event | Properties | Trigger |
|---|---|---|
| `free_multi_currency_net_worth_shared_view_opened` | `mode: string` — share mode from URL<br>`positions: number` — shared position count<br>`utm_source: string \| null` | URL contains encoded state (shared link opened) |
| `free_multi_currency_net_worth_rates_error` | `functionalCurrency: string`<br>`reason: string` — first 80 chars of error | Exchange rate API fetch fails |
| `free_multi_currency_net_worth_asset_added` | `count: number` — new total after add | User clicks "Add asset" |
| `free_multi_currency_net_worth_asset_removed` | `count: number` — new total after remove | User removes an asset row |
| `free_multi_currency_net_worth_csv_parse_errors` | `errorCount: number`<br>`validRowCount: number`<br>`firstReason: string` | CSV upload has parse errors |
| `free_multi_currency_net_worth_csv_uploaded` | `count: number` — rows applied | CSV rows successfully applied to the table |
| `free_multi_currency_net_worth_csv_overwrite_confirmed` | `count: number` — incoming row count | User confirms overwriting existing data with CSV |
| `free_multi_currency_net_worth_csv_overwrite_cancelled` | — | User cancels the CSV overwrite confirmation |
| `free_multi_currency_net_worth_share_modal_opened` | — | User opens the share modal |
| `free_multi_currency_net_worth_share_copied` | `mode: string` — share mode at time of copy | User copies the share link to clipboard |
| `free_multi_currency_net_worth_reset` | — | User clicks "Reset" |
| `free_multi_currency_net_worth_func_currency_changed` | `currency: string` — new currency code | User changes the functional currency |
| `free_multi_currency_net_worth_rates_retry` | — | User clicks "Retry" on failed rate fetch |
| `free_multi_currency_net_worth_csv_downloaded` | `count: number` — rows in the download | User downloads CSV |

---

## Server-side explicit events — `scripts/newsletter.gs`

Sent via `POST https://eu.i.posthog.com/capture/` (function `trackPosthog_`, line 1454). The `distinct_id` is `SHA-256(lowercase(trim(email)))`, hex-encoded — identical to the browser's `posthog.identify(hash)` call, so PostHog stitches client + server events into a single user timeline.

### Subscription lifecycle

| Event | distinct_id | Properties | Trigger |
|---|---|---|---|
| `blog_subscribe_pending` | hashed email | `source: string` — page path from subscribe form | New subscriber, confirmation email sent |
| `blog_subscribe_confirmed` | hashed email | — | User clicks email confirmation link; welcome email sent |
| `blog_subscribe_duplicate` | hashed email | `source: string` | Already-confirmed email tries to re-subscribe |
| `blog_welcome_failed` | hashed email | `email_domain: string`<br>`error: string` — first 300 chars | Welcome email send fails |
| `blog_unsubscribe` | hashed email | `method: string` — unsubscribe trigger | User unsubscribes (email link or manual) |
| `blog_pending_reminded` | hashed email | `days_since_signup: number` — days since original signup | Pending subscriber older than 3 days gets a reminder email |
| `blog_pending_expired` | hashed email | `days_since_signup: number` — days since original signup | Pending subscriber older than 7 days is removed from the sheet |
| `blog_subscriber_bounced` | hashed email | `email_domain: string`<br>`via: "mailer_daemon_scan"` | Mailer-daemon bounce scanner marks a subscriber as bounced |

### Newsletter send operations

These use `cfg.fromEmail` as the `distinct_id` (operational events, not tied to a subscriber).

| Event | distinct_id | Properties | Trigger |
|---|---|---|---|
| `blog_newsletter_sent` | `cfg.fromEmail` | `guid: string` — post GUID<br>`sent: number` — successful sends<br>`failed: number` — failed sends | Newsletter batch send completes |
| `blog_newsletter_send_failed` | `cfg.fromEmail` | `guid: string` — post GUID<br>`email_domain: string` — recipient domain<br>`error: string` — first 300 chars | Individual send fails (also for missing `unsub_token`) |
| `blog_newsletter_quota_warning` | `cfg.fromEmail` | `subscriber_count: number`<br>`cap: number` — daily Workspace recipient cap | Confirmed subscriber count crosses 80% of daily cap |

---

## Funnels

### Blog subscription (with pending reminder)

This funnel stitches across client and server via a shared `distinct_id`:

```
blog_subscribe_submit          (client — SubscribeSection.astro)
    │
    ▼
blog_subscribe_pending         (server — newsletter.gs)
    │
    ├── 3+ days, no confirm ── blog_pending_reminded  (server — newsletter.gs)
    │         │
    │         ▼
    │   blog_subscribe_confirm_clicked?  (client — confirm.astro)
    │         │
    │         ▼
    │   blog_subscribe_confirmed   (server — newsletter.gs)
    │
    └── 7+ days, no confirm ── blog_pending_expired   (server — newsletter.gs)
```

Pending subscribers get one reminder email after 3 days (between 9 AM–12 PM Prague time). If they haven't confirmed after 7 days, the row is deleted. Both events carry `days_since_signup`.

### Product waitlist

```
waitlist_submit   (client — WaitlistSection.astro)
    │
    ▼
waitlist_sent     (client — WaitlistSection.astro)
```

Single-step funnel. No `posthog.identify()` — the waitlist has no follow-up events, so the `distinct_id` remains anonymous.

The key to the stitch: both the browser (`SubscribeSection.astro:413`) and the server (`newsletter.gs:1481`) compute `SHA-256(lowercase(trim(email)))` the same way. The browser calls `posthog.identify(hash)` to alias its anonymous `distinct_id`, and the server sends server-side events under that same hash as `distinct_id`.

---

## Autocapture: `data-attr` elements

PostHog autocapture records clicks on elements with a `data-attr` attribute. These are gated on cookie consent (`CookieConsent.astro:57` enables `autocapture` + `enable_heatmaps` only after accept).

### Navigation (`src/components/Header.astro`)

| `data-attr` value | Element |
|---|---|
| `nav-logo` | Home logo link |
| `nav-free-tools` | Free tools dropdown trigger |
| `nav-tool-multi-currency-net-worth` | Dropdown link to net worth tool |
| `nav-tool-loan-comparison` | Dropdown link to loan comparison tool |
| `nav-blog` | Blog link |

### Theme toggle (`src/components/ThemeToggle.astro`)

| `data-attr` value | Element |
|---|---|
| `theme-light` | Light theme button |
| `theme-system` | System theme button |
| `theme-dark` | Dark theme button |

### Footer (`src/components/Footer.astro`)

| `data-attr` value | Element |
|---|---|
| `footer-blog` | Blog link |
| `footer-multi-currency-net-worth` | Net worth tool link |
| `footer-loan-comparison` | Loan comparison tool link |
| `footer-home` | Home link |
| `footer-beliefs` | Beliefs page link |
| `footer-privacy` | Privacy page link |
| `footer-email` | Email contact link |
| `footer-instagram` | Instagram link |

### Cookie consent (`src/components/CookieConsent.astro`)

| `data-attr` value | Element |
|---|---|
| `cookie-privacy-link` | Privacy policy link in consent banner |
| `cookie-decline` | "No thanks" button |
| `cookie-accept` | "Sure, that's fine" button |

### Home page (`src/pages/index.astro`)

| `data-attr` value | Element |
|---|---|
| `home-cta-multi-currency-net-worth` | Net worth tool card |
| `home-cta-loan-comparison` | Loan comparison tool card |
| `home-cta-blog` | Blog link |
| `home-cta-beliefs` | Beliefs page link |

### Beliefs page (`src/pages/beliefs.astro`)

| `data-attr` value | Element |
|---|---|
| `beliefs-cta-email` | Email CTA link |
| `beliefs-cta-instagram` | Instagram CTA link |

### Blog post layout (`src/layouts/BlogPost.astro`)

| `data-attr` value | Element |
|---|---|
| `post-nav-prev` | Previous post link |
| `post-nav-next` | Next post link |

### Loan comparison page (`src/pages/free/loan-comparison.astro`)

| `data-attr` value | Element |
|---|---|
| `related-tag-debt` | "More on debt" related posts link |
| `related-all` | "All posts" link |

### Multi-currency net worth page (`src/pages/free/multi-currency-net-worth.astro`)

| `data-attr` value | Element |
|---|---|
| `related-tag-currency` | "More on currency" related posts link |
| `related-all` | "All posts" link |

### Loan comparison tool (`src/components/LoanCompare.tsx`)

| `data-attr` value | Element |
|---|---|
| `lc-share-copy` | Share/copy button |
| `lc-reset` | Reset to defaults button |
| `lc-vendor-add` | Add vendor button |
| `lc-vendor-remove` | Remove vendor button |
| `lc-tab-{id}` | Analysis tab buttons |

### Multi-currency net worth tool (`src/components/MultiCurrencyNetWorth.tsx`)

| `data-attr` value | Element |
|---|---|
| `mcnw-share-open` | Share button |
| `mcnw-reset` | Reset button |
| `mcnw-rates-retry` | Retry rates button |
| `mcnw-asset-add` | Add asset button |
| `mcnw-csv-upload` | CSV upload button |
| `mcnw-csv-download` | CSV download button |
| `mcnw-asset-remove` | Remove asset button |
| `mcnw-share-cancel` | Share modal cancel button |
| `mcnw-share-copy` | Share modal copy button |
| `mcnw-csv-overwrite-confirm` | CSV overwrite confirm button |
| `mcnw-csv-overwrite-cancel` | CSV overwrite cancel button |
