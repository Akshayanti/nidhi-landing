# Project Directives

## Privacy Policy is the Source of Truth

Every change that affects privacy must come with an entry in the privacy policy changelog in `src/pages/privacy.astro`. Do not wait for a reminder: this is mandatory. Changes that do not affect privacy get no entry, so the log stays a record of what the site collects and promises, not of everything that ships.

**Rules:**
1. Before implementing any change, review `src/pages/privacy.astro` to understand current commitments.
2. **Decide whether the change needs an entry.** Ask one question: does it change what a visitor's browser stores, sends or reveals, or what the privacy notice says?
   - **Entry, `material: true`**, with detailed bullet points following the existing style:
     - New or changed analytics: events, event properties, data-attr labels, capture settings, consent behaviour.
     - New or changed browser storage (localStorage, sessionStorage, cookies), or a new use of an existing key.
     - New third-party requests (scripts, fonts, APIs, embeds), or a change to what an existing one sends.
     - New forms or server-side events. Changes to retention, deletion, vendors or hosting.
     - A new tool or page that collects or sends anything.
   - **Entry, `material: false`**: edits to the privacy notice's own text (clarifications, corrections, restructuring).
   - **No entry**: publishing or scheduling lessons, editorial and figure changes, layout, styling, accessibility, SEO metadata, sitemap, robots.txt and llms.txt, copy elsewhere on the site, refactors, tests and docs.
   - **Unsure? Ask** before adding an entry or leaving one out.
3. If a proposed change conflicts with what the privacy policy states, **pause and ask** whether to proceed. Do not silently implement something that contradicts the policy. This applies to every change, whether or not it needs an entry.
4. Existing entries stay as written, even ones this rule would not require today: the changelog is a record of what the notice said and when.
5. **One entry per date.** The changelog has at most one entry for any given date. If an entry for that date already exists, add your bullet points to its `details`, broaden its `summary` to cover everything that changed that day, and set `material: true` if any part of the day's changes is material. Never add a second entry with the same `iso` date. The build fails if two hand-written entries share a date.

## Free Tools Keep Inputs Out of URLs

Every page sends an anonymous pageview and page-leave event, and every PostHog event carries the page address. Anything a free tool puts in the address reaches analytics. The privacy policy promises that the values people type are never sent, so every tool under `/free/` (today: the loan comparison, the net worth calculator, the Monte Carlo simulator) must meet all of these:

1. **Never write inputs into the address while someone types.** No `history.replaceState`/`pushState` with form state, no query-string sync for reload or bookmarking.
2. **Share links carry state after the `#`**, never in the query string: `/free/<tool>/?utm_source=share&...#<state>`. Browsers never send the fragment to a server.
3. **The page uses `ToolStateGuard`** (`src/components/ToolStateGuard.astro`) in its head slot, with the tool's `SHARED_STATE_GLOBAL` and `STATE_KEY_PATTERN` exported from its `url.ts`. It moves shared state (and older `?`-style state) out of the address into a window property before analytics load, keeping `utm_*` parameters and plain `#anchors`. The tool reads its state from that window property on mount, never from `window.location`.
4. **Keep the analytics backstop.** `before_send` in `src/components/Analytics.astro` strips everything but `utm_*` and the `#` part from any URL property that points at a `/free/` page. Do not remove or narrow it.
5. **Tracked events carry choices, never values**: which currency, which tab, how many rows, never an amount, rate, name or the encoded state.
6. **Verify in a browser before merging**, on a phone-sized and a laptop-sized viewport: type distinctive amounts, leave the page, open a `#` share link and an old `?` link, and confirm no PostHog payload contains the amounts (decode the gzip bodies; headless Chrome needs a normal user agent and `--disable-blink-features=AutomationControlled`, or PostHog drops its events as bot traffic).

A new tool that cannot meet these is a privacy-policy conflict: pause and ask (rule 3 above).

## Style Rules

- Never use em dashes (`&mdash;` or `—`) or double dashes (`--`) anywhere in the site. Use colons, commas, or reword instead.

## Editorial Voice: Teach, Don't Prescribe

Many readers are new to finance and will read a confident sentence as a recommendation. Lessons educate; they do not tell a reader what to do with their money. Every concept, rule of thumb or common practice follows this order:

1. **Here's the concept.**
2. **Here's why people use it.**
3. **Here's the evidence** (cited, with its limits: US-only data, period, survivorship).
4. **Here's where it breaks.**
5. **Here's what depends on your situation** (country, income stability, horizon, debts, tax).

The introduction-to-financial-independence lesson is the model: it presents the 4% rule, then its US-data basis, horizon assumptions, geographic limits and more conservative alternatives, and calls it a starting point rather than an answer.

- Describe common practice ("a common starting point is...", "many people begin with...") instead of instructing ("start with...", "you should...", "covers the basics for most people").
- No superlatives the evidence cannot carry ("the single most", "always", "never").
- Numbers come with their source and scope. Figures must agree across lessons.
- Imperatives are fine for neutral, low-stakes actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
