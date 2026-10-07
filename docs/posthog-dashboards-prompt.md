# PostHog dashboards: setup prompt

A prompt to paste into PostHog AI in the nidhi.today project, so it builds the starting dashboards. It is kept here as the reference for what each dashboard shows. Every event and property name was checked against the code on 2026-10-07; the full event list is in `docs/posthog-events.md`.

**When to use:** after data starts arriving (the new project receives events from 00:00 UTC on 2026-10-08). Paste Part 1 first; once its dashboards exist, paste Part 2 (more insights plus PostHog's other free products). Update the lesson lists when new lessons publish.

**Off limits without a privacy notice change first:** session recordings, page-speed measurements (web vitals), error tracking, surveys and anything that collects new data. The privacy notice says these aren't collected.

**Things to keep in mind when reading the dashboards**

- **Clicks are a sample.** `$autocapture` (clicks), heatmaps and dead clicks only come from visitors who accepted the cookie banner. Pageviews and the named tool and form events come from everyone.
- **Lesson levels are not in the URL.** The lists in the prompt map each lesson slug to its level. New Optimizing and Inclusive Finances lessons show as "Other / new" until added.
- **Tool URLs never carry inputs.** Only `utm_*` parameters survive on `/free/` URLs, by design (CLAUDE.md, "Free tools keep inputs out of URLs").

---

## Part 1: dashboards (copy the block below)

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

---

## Part 2: more insights and other PostHog products (copy the block below)

```text
This continues the nidhi.today setup. Use the same context as before: data starts 2026-10-08 00:00 UTC, all visitors are anonymous, clicks ($autocapture) come only from visitors who accepted cookies, and lesson levels come from the slug lists you already used.

Do NOT turn on session recordings, web vitals / page-speed capture, error tracking, surveys, or any setting that collects data the site does not already send. The site's privacy notice rules them out.

DASHBOARD 5: "Readers and growth"
- Retention: weekly retention where the start and return events are both a $pageview of any /blog/<slug>/ lesson. Show 8 weeks. Breakdown by the level of the first lesson read.
- Stickiness: days per week a visitor has a $pageview, last 30 days.
- Read depth per lesson: the average and median of $prev_pageview_max_scroll_percentage on $pageleave events, grouped by $prev_pageview_pathname (or $current_url) for /blog/<slug>/ lessons. Show it as a table sorted lowest first: those are the lessons people abandon. If that property is not present, tell me which scroll-depth property exists in this project and use it.
- Paths: user paths starting at a lesson (/blog/<slug>/), three steps, to show what readers do next (another lesson, a tool, the learning path, leaving). A second paths insight starting at the homepage "/".
- Instagram to signup: funnel $pageview where the session's entry utm_source = instagram → blog_subscribe_submit → blog_subscribe_confirmed, 7-day window, breakdown by session entry utm_campaign and utm_content. A trend of sessions by entry utm_source and utm_campaign next to it.
- Tool fix lists: free_multi_currency_net_worth_csv_parse_errors by firstReason and free_loan_comparison_validation_error by firstReason, each as a ranked table over the last 30 days.
- Lesson to tool and back: of sessions that open a /free/ page after a lesson, how many return to another lesson in the same session.

WEB ANALYTICS
- Make sure the Web Analytics product is on for this project, so the built-in overview (visitors, sources, entry and exit pages, devices, countries) is available. No setup beyond that.

ALERTS (email me)
- blog_newsletter_send_failed: any occurrence in a day.
- blog_welcome_failed: any occurrence in a day.
- blog_newsletter_quota_warning: any occurrence.
- free_multi_currency_net_worth_rates_error: more than 10 in an hour (the exchange-rate service is failing).
- Daily $pageview count below 30% of its 7-day average (the site or the analytics broke).
- Subscribe confirmation rate (blog_subscribe_confirmed / blog_subscribe_pending, weekly) below 40%.

ACTIONS (named, reusable definitions)
- "Read a lesson": $pageview where pathname matches ^/blog/[a-z0-9-]+/$ and is not /blog/tag/ or /blog/inclusive-finances/.
- "Used a tool": any event whose name starts with free_ .
- "Visited a tool": $pageview where pathname starts with /free/ .
- "Joined the newsletter": blog_subscribe_confirmed.
- "Joined the waitlist": waitlist_signup.
Use these actions in the insights above where they make them simpler.

COHORTS (anonymous, no personal data)
- "Engaged readers": performed "Read a lesson" at least 3 times in the last 30 days.
- "Tool users": performed "Used a tool" at least once in the last 30 days.
- "Instagram arrivals": first-seen session with utm_source = instagram.
Use them as breakdowns or filters, not to list people. The site does not set person_profiles, so anonymous visitors may have no person profile: if retention, stickiness or these cohorts need profiles this project doesn't create, tell me instead of changing any setting.

DATA MANAGEMENT
- Add descriptions to every custom event and mark them verified: the free_* tool events, blog_subscribe_*, blog_unsubscribe*, blog_pending_*, blog_newsletter_*, blog_welcome_failed, blog_subscriber_bounced, waitlist_submit, waitlist_sent, waitlist_signup, $ai_referrer. Describe each as: what the visitor did, and that it never carries amounts or email addresses (email_domain is the only email-derived property; distinct_id on server events is a SHA-256 hash).
- Hide autocapture properties we never use from the property pickers if that option exists; don't delete data.

ANNOTATIONS
- 2026-10-08 00:00 UTC: "Analytics start (new project)".
- I will add Instagram post dates and lesson launches myself; leave a note on how to add one.

SUBSCRIPTIONS
- Email me the "Site overview" dashboard every Monday at 08:00 (Europe/Prague), and the "Newsletter and waitlist" dashboard on the first of each month.

HEATMAPS AND TOOLBAR
- Heatmaps and clickmaps are allowed (consented visitors only). Tell me how to open the toolbar on nidhi.today to see them for the homepage and one lesson. Don't change any capture setting for this.

Finally, list what you created, anything you could not do and why, and any property name you had to guess.
```
