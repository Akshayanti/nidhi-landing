# Project Directives

## Privacy Policy is the Source of Truth

Every change that affects privacy must come with an entry in the privacy policy changelog in `src/components/pages/PrivacyPage.astro` (the `writtenChangelog` array; `src/pages/privacy.astro` and `src/pages/[locale]/privacy.astro` are thin routes that render it). Do not wait for a reminder: this is mandatory. Changes that do not affect privacy get no entry, so the log stays a record of what the site collects and promises, not of everything that ships.

**Rules:**
1. Before implementing any change, review the privacy notice (`src/components/pages/PrivacyPage.astro`, with its prose in the `privacy` namespace of the catalogs) to understand current commitments.
2. **Decide whether the change needs an entry.** Ask one question: does it change what a visitor's browser stores, sends or reveals, or what the privacy notice says?
   - **Entry, `material: true`**, with detailed bullet points following the existing style:
     - New or changed analytics: events, event properties, new or renamed data-attr labels, capture settings, consent behaviour.
     - New or changed browser storage (localStorage, sessionStorage, cookies), or a new use of an existing key.
     - New third-party requests (scripts, fonts, APIs, embeds), or a change to what an existing one sends.
     - New forms or server-side events. Changes to retention, deletion, vendors or hosting.
     - A new tool or page that collects or sends anything.
   - **Entry, `material: false`**: edits to the privacy notice's own text (clarifications, corrections, restructuring).
   - **No entry**: publishing or scheduling lessons, editorial and figure changes, layout, styling, accessibility, SEO metadata, sitemap, robots.txt and llms.txt, copy elsewhere on the site, refactors, tests and docs. Also a wording fix in a translated edition of the notice that leaves the English text and what it promises unchanged (a synonym swapped to match a glossary change, say). Also removing a data-attr label, with or without its element: fewer events are sent, nothing new is stored, sent or revealed, and the notice text is unchanged. This does not cover consent controls: removing or changing one is a consent-behaviour change and takes an entry.
   - **Unsure? Ask** before adding an entry or leaving one out.
3. If a proposed change conflicts with what the privacy policy states, **pause and ask** whether to proceed. Do not silently implement something that contradicts the policy. This applies to every change, whether or not it needs an entry.
4. Existing entries stay as written, even ones this rule would not require today: the changelog is a record of what the notice said and when.
5. **One entry per date.** The changelog has at most one entry for any given date. If an entry for that date already exists, add your bullet points to its `details`, broaden its `summary` to cover everything that changed that day, and set `material: true` if any part of the day's changes is material. Never add a second entry with the same `iso` date. The build fails if two hand-written entries share a date.

## Free Tools Keep Inputs Out of URLs

Every page sends an anonymous pageview and page-leave event, and every PostHog event carries the page address. Anything a free tool puts in the address reaches analytics. The privacy policy promises that the values people type are never sent, so every tool under `/free/`, in every language (`/free/...`, `/hi/free/...`, `/es/free/...`, `/cs/free/...` and `/mr/free/...` today; all of them render one page component in `src/components/pages/`), must meet all of these. Today that is the loan comparison, the net worth calculator, the Monte Carlo simulator and the inflation calculator:

1. **Never write inputs into the address while someone types.** No `history.replaceState`/`pushState` with form state, no query-string sync for reload or bookmarking.
2. **Share links carry state after the `#`**, never in the query string: `/free/<tool>/?utm_source=share&...#<state>`. Browsers never send the fragment to a server.
3. **The page uses `ToolStateGuard`** (`src/components/ToolStateGuard.astro`) in its head slot, with the tool's `SHARED_STATE_GLOBAL` and `STATE_KEY_PATTERN` exported from its `url.ts`. It moves shared state (and older `?`-style state) out of the address into a window property before analytics load, keeping `utm_*` parameters and plain `#anchors`. The tool reads its state from that window property on mount, never from `window.location`, and keeps its current state there with `publishToolState` (`src/utils/shared/toolState.ts`), which is what the language switch carries after the `#`.
4. **Keep the analytics backstops.** Do not remove or narrow either of them.
   - **Addresses:** `before_send` in `src/components/Analytics.astro` keeps only the `utm_*` parameters of any URL property that points at a `/free/` page, with or without a locale prefix, and drops its `#` part.
   - **Clicks:** autocapture, rage clicks and dead clicks describe the clicked element and every ancestor up to `<body>`, with all their attributes; `mask_all_text` hides text only. So PostHog is given `element_attribute_ignorelist` (accessibility labels, titles, values, styles, links, ids, chart geometry), and `before_send` rebuilds every element description through `src/utils/shared/cleanElements.js`: a tag from a fixed list, the `data-attr` label only if the label registry (`src/utils/analyticsLabels.ts`, read from the source at build time) knows it, and the element's position, nothing else. A description it cannot read is sent empty. A new `data-attr` must be written so the registry can resolve it (a literal, a fixed prefix in a template, or a `dataAttr`/`attr`/`*Attr` value written in the source); `npm test` fails otherwise.
   - Neither backstop is a licence to put state in an attribute: no link's `href` may ever hold tool state, which is why the language switch in `Header.astro` adds the state only at click time, and no `aria-label`, `title` or other attribute should carry a typed value where a fixed label would do.
5. **Tracked events carry choices, never values**: which currency, which tab, how many rows, never an amount, rate, name or the encoded state.
6. **Verify in a browser before merging**, on a phone-sized and a laptop-sized viewport, in every language the tool is published in, and **both without and with cookie consent** (set `nidhi-cookie-consent` to `accepted` before the page loads): type distinctive amounts and a distinctive name (a loan offer, an asset), click inputs, buttons (including a remove button on a named row), result cards and charts, click a chart three times quickly (a rage click) and once where nothing responds (a dead click), use every export the tool has, leave the page, open a `#` share link and an old `?` link, switch language from a share link, and confirm no PostHog payload contains the amounts, the names, a file name, a `blob:` or `data:` address, or any element attribute other than `data-attr` and positions (decode the gzip bodies, and the base64 bodies PostHog sends with `sendBeacon` as a page unloads; headless Chrome needs a normal user agent and `--disable-blink-features=AutomationControlled`, or PostHog drops its events as bot traffic).
   - **A clean payload counts only if the events were there.** The consent run must show `$autocapture` events in the payloads, and clicks on the charts must show `$rageclick` or `$dead_click`. Zero click events means click capture never started, not that clicks are clean: in Oct 2026 every test aborted PostHog's settings request, so autocapture stayed off in every consent run, and a click that sent a typed loan offer's name was never seen.
   - **Answer PostHog's settings request locally**, never from PostHog: intercept `https://eu-assets.i.posthog.com/array/<key>/config` (and `config.js`) and fulfil it in the test with the live project's settings that change what is sent, at least `"elementsChainAsString": true` (the live project sends element data as a string) and `"autocapture_opt_out": false`. The live settings can be read from the same address with the public key.
   - Run the check against a build made with `PUBLIC_ANALYTICS_TEST=1`, never one carrying the real key: analytics start only on nidhi.today, and that flag lets them run on localhost with a dummy key PostHog rejects, so nothing a test sends can reach the real numbers. Let only the SDK's static scripts load from PostHog (`/static/*.js`, including versioned extensions such as `/static/<version>/dead-clicks-autocapture.js`, or dead clicks are never tested), fulfil the settings request as above, and abort every other PostHog request. Start Chrome with `--host-resolver-rules="MAP eu.i.posthog.com ~NOTFOUND"` so an event that escapes the abort cannot connect, and move each page to `about:blank` before closing it, so its last events go out while the abort still applies.

A new tool that cannot meet these is a privacy-policy conflict: pause and ask (rule 3 above).

## Copy Changes Reach Every Language

The site serves more than one language, so a copy change is not finished when English reads well: it is finished when every language the site supports at that moment carries it. The site's words live in the catalogs under `src/i18n/strings/` (`en.ts`, `hi.ts`, `es.ts`, `cs.ts`, `mr.ts`, `learn.ts`, `tools/*.ts`), and they change together. This is mandatory, in the same way the privacy changelog is, and it applies to new strings, reworded strings and deleted strings alike.

**Rules:**
1. **Add or edit the key in every catalog in the same change.** A new English string gets its Hindi, Spanish, Czech and Marathi values before the commit, not in a follow-up. Each language follows its glossary in `docs/i18n/` (`hi-glossary.md`, `es-glossary.md`, `cs-glossary.md`, `mr-glossary.md`). A reworded string is reworded in every language. A key that is no longer used is deleted from every catalog at once.
2. **The catalogs are one shape.** `Dict` is `typeof en`, and `src/i18n/strings/catalog.test.ts` fails on a key present in one catalog only, on a blank value, and on a value left identical to its English source. Those checks are the floor, not the goal: passing them with a stiff literal translation is still an unfinished change.
3. **Translation happens once per change, not per language later.** A language whose catalog drifts behind is a half-translated site, which is the failure this rule exists to prevent: the reader sees one page in their language and the next one in English.
4. **A locale added later starts complete.** Its catalog is written before its routes are published, because the parity test will not let a partial catalog through.
5. **If a change cannot be translated yet, pause and ask** rather than shipping English copy into a catalog that is otherwise translated. Say which string and why.
6. **Copy in the catalogs means the site's own words**: chrome, page prose, tool labels, headings, meta descriptions, structured data that a reader can see. Two things are deliberately outside it, and neither is an exception to this rule:
   - **Lessons are content, not copy.** They are written once, in English, and are not translated. A page in another language lists the English lessons, links to them at their one address, and says in its own language that the lessons are English (`LessonsInEnglish.astro`).
   - **Names stay in their own script**: a language's own name (`LOCALE_META`), the brand, company and product names, and a person's name. Those are the same string in every language and do not belong in a catalog at all.
7. **The privacy changelog is the one deliberate exception**, and the reason is recorded there: it is kept in English in every edition, so Hindi, Spanish, Czech, Marathi and English readers are all reading the same record of what changed.

## What's Changed Grows With Every Visible Change

The site has a "What's changed" page (`/changes/` in every language). It is how readers see that the site is looked after, so it stays current without anyone having to remember a separate chore: the change carries its own item. Items are grouped by day, like the privacy changelog, so the page stays readable as the site grows.

**Rules:**
1. **One item per change a reader experiences, grouped by day.** A pull request that changes what a reader can do, find, understand or rely on updates `src/i18n/strings/changes.ts` in the same pull request, in all five languages. Items describe what readers experience, not pull requests: if that day already has an item for the same outcome, edit it instead of adding one, and on a later day add an item only when a reader would notice something new. There is at most one day per date (YYYY-MM-DD, UTC), newest first. Each item has a short, permanent `id`: its anchor on the page and its guid in the RSS feeds, never changed and never reused. When items are merged, the surviving item keeps the merged ids as `aliases`, so old links still land. The page shows the two latest months open and folds older ones; once it covers more than 12 months or about 500 items, it moves to yearly archive pages, with old links still resolving. The council reviews every new or edited item in all five languages.
2. **Write it for a reader, not a developer**: what is different for them ("The loan comparison now has the planner waitlist too"), never a file, a component or a pull request title.
3. **In the founder's voice**, plain and warm, as "I" where a person is speaking. The founder is never given a gender: Hindi and Marathi use dative, ergative or impersonal sentences; Czech uses the present tense or a participle that agrees with something else; Spanish avoids gendered adjectives about the founder.
4. **What counts**: copy, pages, tools, layout, behaviour, and anything the privacy changelog records, once readers can see it. **What does not**: refactors, tests, docs, CI, tooling, dependency updates, SEO metadata, performance with no visible change, spacing, alignment and contrast polish, typo fixes that do not change meaning, fixes to something shipped earlier the same day, and lessons published on schedule (the learning path lists those). A correction inside a lesson has its own record (the lesson's `corrections` field), so it gets no item here either. A pull request with nothing that counts adds nothing.
5. `src/i18n/strings/changes.test.ts` checks the mechanical rules (one day per date, newest first, no empty day, unique ids and aliases, every language present, typography); it is the floor, as the catalog tests are.

## Automated Visits Use the Internal Address

Whenever the live site is opened automatically (a headless browser, the Chrome extension, a script or any other tool), start from this address: **https://nidhi.today/?internal=1**. It marks that browser as internal (the `nidhi-internal` key the privacy notice describes), so it runs no analytics and never counts as a reader. A fresh browser profile starts unmarked, so open this address first in every new browser or session before visiting any other page. Local test builds follow the rules above for analytics testing instead.

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

## Decisions Go Through the Three-Model Council

Every decision is approved by all three members of the council before it is accepted:

- **Claude** (Opus).
- **DeepSeek** via Ollama: `ollama run deepseek-v4.1-flash:cloud --hidethinking < brief.md > out.md` (strip ANSI codes from the output).
- **Codex**, with the model most relevant to the decision: `codex exec --sandbox read-only --skip-git-repo-check -o out.md "<prompt>" </dev/null` (without `</dev/null` it hangs waiting on stdin).

**Rules:**
1. **A decision is accepted only when all three agree.** A 2-to-1 is not agreement, and a change of position without a reason does not count.
2. **Agreement is reached by argument.** Write a shared brief, give each member every other member's position in each round, and end with a sign-off round where each member answers SIGN OFF or OBJECT, with a new argument for any objection.
3. **When the council does not agree, the council decides the way forward**: another round with new evidence, splitting the decision into parts that can be agreed separately, a smaller or reversible step, or taking the open question to the user. No single member settles it alone.
4. **Keep both runs alive.** Run Codex and DeepSeek in the background and check on them every 20 to 30 seconds; a stalled run is restarted, not waited out.
5. The council does not override the rest of this file: a decision that conflicts with the privacy policy, or that is the user's to make, still goes to the user.
