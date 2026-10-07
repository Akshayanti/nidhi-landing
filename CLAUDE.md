# Project Directives

## Privacy Policy is the Source of Truth

Every material change to the site must be accompanied by a corresponding update to the privacy policy changelog in `src/pages/privacy.astro`. Do not wait for a reminder — this is mandatory.

**Rules:**
1. Before implementing any change, review `src/pages/privacy.astro` to understand current commitments.
2. If a change touches data collection, storage, new localStorage keys, new third-party calls, new analytics events, new forms, new user-facing flows, or retention — add a changelog entry with `material: true` and detailed bullet points following the existing style.
3. If a proposed change conflicts with what the privacy policy states, **pause and ask** whether to proceed. Do not silently implement something that contradicts the policy.
4. Non-material changes (typos, phrasing) still get a changelog entry with `material: false`.
5. **One entry per date.** The changelog has at most one entry for any given date. If an entry for that date already exists, add your bullet points to its `details`, broaden its `summary` to cover everything that changed that day, and set `material: true` if any part of the day's changes is material. Never add a second entry with the same `iso` date. The build fails if two hand-written entries share a date.

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
