# PostHog dashboards: setup prompt

A prompt to paste into PostHog AI in the nidhi.today project, so it builds the starting dashboards. It is kept here as the reference for what each dashboard shows. Every event and property name was checked against the code on 2026-10-07; the full event list is in `docs/posthog-events.md`.

**When to use:** after data starts arriving (the new project receives events from 00:00 UTC on 2026-10-08). Update the lesson lists below when new lessons publish.

**Things to keep in mind when reading the dashboards**

- **Clicks are a sample.** `$autocapture` (clicks), heatmaps and dead clicks only come from visitors who accepted the cookie banner. Pageviews and the named tool and form events come from everyone.
- **Lesson levels are not in the URL.** The lists in the prompt map each lesson slug to its level. New Optimizing and Inclusive Finances lessons show as "Other / new" until added.
- **Tool URLs never carry inputs.** Only `utm_*` parameters survive on `/free/` URLs, by design (CLAUDE.md, "Free tools keep inputs out of URLs").

---

## Prompt (copy everything below this line)

```text
Set up dashboards for nidhi.today, a free personal finance learning site with free calculators. Data starts 2026-10-08 00:00 UTC; use that as the earliest date everywhere. All visitors are anonymous; there is no login.

IMPORTANT CONTEXT
- $pageview and $pageleave fire for every visitor. $autocapture (clicks on elements with a data-attr), heatmaps and dead clicks fire ONLY for visitors who accepted the cookie banner, so click-based insights are a consented subset: label them "(consented visitors only)".
- URLs under /free/ never carry query parameters except utm_*. Don't build anything on other query params.
- Lessons live at /blog/<slug>/. Learning path: /blog/. Topics: /blog/tag/ and /blog/tag/<tag>/. Inclusive Finances hub: /blog/inclusive-finances/.
- Free tools: /free/ (index), /free/multi-currency-net-worth/ (net worth calculator), /free/loan-comparison/. The Monte Carlo simulator (/free/monte-carlo-simulator/, events free_monte_carlo_*) launches later; include it but expect no data yet.
- Lesson levels (group by pathname, /blog/<slug>/):
  Discovery: what-is-net-worth, how-to-calculate-net-worth, assets, liabilities, how-to-get-out-of-debt, appreciation-vs-depreciation, liquidity, emergency-fund, income-vs-wealth, cash-flow-101, purchasing-power, why-your-euro-buys-more-in-some-countries, saving-vs-investing, budgeting, credit-and-credit-scores, insurance-basics
  Building: understanding-risk, investing-101-asset-classes, satellite-assets-commodities-and-cryptocurrency, diversification, getting-started-investing, taxes-and-your-financial-plan, tax-advantaged-accounts, rebalancing-your-portfolio, introduction-to-financial-independence, passive-income-streams, understanding-loan-terms, real-estate-as-investment, managing-money-across-currencies, setting-financial-goals, financial-health-metrics, financial-dashboard
  Psychology: why-smart-people-make-dumb-money-decisions, loss-aversion-and-the-disposition-effect, mental-accounting, present-bias-and-your-future-self, overconfidence-and-the-planning-fallacy, framing-anchoring-and-price-psychology, herd-behavior-and-fomo, narrative-economics-and-bubbles, money-scripts, building-an-anti-bias-financial-life
  (Optimizing and Inclusive Finances lessons publish over time; treat any other /blog/<slug>/ as "Other / new".)
  Please create a HogQL "level" expression from these lists for breakdowns.

DASHBOARD 1: "Site overview"
- Daily unique visitors and pageviews (trend, last 30 days).
- Top 20 pages by pageviews.
- Visitors by device type (mobile vs desktop) and by country.
- Top referring domains; separately, $ai_referrer events broken down by ai_referrer_domain (visits from ChatGPT, Perplexity, Claude and similar).
- Traffic by utm_source / utm_medium / utm_campaign (Instagram posts use utm_source=instagram, campaign for example "beliefs", content for example "rules_of_thumb"; share links use utm_source=share).
- Average time on page from $pageleave for the top pages.

DASHBOARD 2: "Learning"
- Lesson pageviews per day, broken down by level (using the lists above).
- Top 15 lessons by unique visitors.
- Entry points: share of sessions whose first page is the homepage, /blog/, a lesson, or /free/.
- Lessons per session (distribution of the number of /blog/<slug>/ pageviews per session).
- Funnel: homepage → /blog/ → any lesson (within a session).
- (consented visitors only) Homepage clicks: $autocapture where data-attr starts with "home-start-" (route cards and their "-door" buttons), "home-hero-" (hero buttons and skip links), "home-pair-lesson-", "home-tools".
- (consented visitors only) In-lesson navigation: data-attr "post-nav-prev" / "post-nav-next", "post-series-top" / "post-series-bottom", "related-<slug>", and lesson-to-tool clicks "post-tool-<tool>" and "post-inline-tool-*".

DASHBOARD 3: "Free tools"
- Pageviews per tool page per day.
- Net worth calculator: counts of free_multi_currency_net_worth_asset_added, _func_currency_changed (breakdown by currency), _csv_uploaded, _csv_downloaded, _csv_parse_errors (breakdown by firstReason), and _rates_error with _rates_retry (reliability).
- Loan comparison: free_loan_comparison_vendor_added, _mode_changed (by mode), _rate_kind_changed (by rateKind), _tab_changed (by tab), _horizon_changed, _refi_changed (by field), _currency_changed (by currency), _validation_error (by firstReason).
- Sharing, per tool: <tool>_share_modal_opened → <tool>_share_copied, and <tool>_shared_view_opened by utm_source (people opening shared links).
- Monte Carlo (empty until launch): free_monte_carlo_returns_changed by setting, _runs_changed by runs, _withdrawal_toggled by on, _table_opened, _share_copied.
- Lesson → tool: visitors who viewed a lesson and then a /free/ page in the same session.

DASHBOARD 4: "Newsletter and waitlist"
- Subscribe funnel (the same distinct_id across client and server; the client calls identify with a SHA-256 hash of the email): blog_subscribe_submit → blog_subscribe_pending → blog_subscribe_confirmed, conversion window 7 days. Breakdown of blog_subscribe_submit by "variant" (full = on lessons, compact = on /blog/) and by "source" (page path).
- Pending health: blog_pending_reminded and blog_pending_expired per week (with days_since_signup), and blog_subscribe_duplicate.
- Unsubscribes: blog_unsubscribe per week, breakdown by method; also blog_unsubscribe_clicked (client).
- Deliverability: blog_newsletter_sent (sum of "sent" and "failed"), blog_newsletter_send_failed, blog_welcome_failed, blog_subscriber_bounced, blog_newsletter_quota_warning.
- Waitlist: waitlist_submit and waitlist_sent (client, anonymous) as one funnel, and waitlist_signup (server, hashed-email distinct_id) as a separate trend broken down by "source" (homepage vs the net worth calculator). They don't share a distinct_id, so don't join them into one funnel.
- Dismissals: blog_subscribe_dismissed by "action".

Keep every insight anonymous: no person-level lists, no email domains as a primary breakdown. Name dashboards and insights plainly.
```
