# Project Directives

## Privacy Policy is the Source of Truth

Every material change to the site must be accompanied by a corresponding update to the privacy policy changelog in `src/pages/privacy.astro`. Do not wait for a reminder — this is mandatory.

**Rules:**
1. Before implementing any change, review `src/pages/privacy.astro` to understand current commitments.
2. If a change touches data collection, storage, new localStorage keys, new third-party calls, new analytics events, new forms, new user-facing flows, or retention — add a changelog entry with `material: true` and detailed bullet points following the existing style.
3. If a proposed change conflicts with what the privacy policy states, **pause and ask** whether to proceed. Do not silently implement something that contradicts the policy.
4. Non-material changes (typos, phrasing) still get a changelog entry with `material: false`.

## Style Rules

- Never use em dashes (`&mdash;` or `—`) or double dashes (`--`) anywhere in the site. Use colons, commas, or reword instead.
