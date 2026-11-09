# Volunteer review material

How volunteer translators get the site's words, the English beside them and the notes on what needs care, and how their suggestions and judgements come back into the catalogs.

Status: agreed by the council (Claude, DeepSeek, Codex) on Nov 9, 2026, after three rounds. Anything marked **Owner** waits for the owner, and nothing reaches a volunteer before steps 2 to 6 are done.

## What the owner has decided (Nov 9, 2026)

Settled; the council designs within them:

1. **Google Sheets, not files.** Volunteers work in Google Sheets (and later Google Docs), not in emailed .xlsx files.
2. **Link access.** Volunteers open their sheet through an "anyone with the link" share, so nobody is invited by email and volunteers do not see each other's addresses.
3. **Several volunteers per language.**
4. **Volunteers suggest and judge**: they mark whether the current wording works, propose better wording where it does not, and judge each other's suggestions.
5. **Sheets plus a review preview** of the site that shows where each string appears.
6. **Site content first, lesson translation after.**
7. **A translation-only fix changes only that language** (Nov 9): when a volunteer corrects one language's wording and the English stays as it is, only that catalog changes, unless reworking the English makes more sense, in which case the English is reworded and every language with it. CLAUDE.md, "Copy Changes Reach Every Language", rule 1, says so.
8. **No new agreement clause** (Nov 9): it is volunteer work, given to help, and the agreement's licence already covers using it, including showing it to other volunteers under a pseudonym. Volunteers who already agreed do not re-accept. The privacy notice still says it (section 6).
9. **Reply time** (Nov 9): the owner aims to answer volunteers within 24 hours.
10. **Volunteers today** (Nov 9): one for Bahasa Indonesia. The owner reviews Hindi personally, so Hindi is not part of the volunteer pilot.

## The material today

- The site's words are in TypeScript catalogs under `src/i18n/strings/` (`en.ts`, `hi.ts`, `es.ts`, `cs.ts`, `mr.ts`, `learn.ts`, `tools/*.ts`, `changes.ts`). On Nov 9, 2026 the English catalog holds about 2,260 strings and 24,500 words per language; 255 carry a `{placeholder}`. The tools hold 1,366 strings, the privacy notice 165, the home page 100.
- Keys follow the code (`volunteers.get.credit.rest`), not the page a reader sees.
- Many sentences are split into fragments (`before` / `link` / `after`, `lead` / `rest`) that a component joins around a link or a bold part.
- The notes a translator needs are in code comments and in `docs/i18n/*-glossary.md`.
- Every translation was drafted with AI. The owner reviews Hindi personally; the others have had no native review.
- Volunteers are recruited through `/volunteers/` and a Google Form. Their answers sit in a private sheet only nidhi reads, which by the privacy notice holds the form answers plus exactly two columns, Status and Last contact (`docs/volunteer-agreement.md`). Volunteers may send work only after replying "I agree" to the agreement.

## Design

### 1. One link-shared copy per volunteer

Every volunteer with Status `Agreed` gets their own copy of their language's review sheet, shared from the hello@nidhi.today Workspace account as "anyone with the link can edit".

- **What it protects, and what it does not.** Separate copies mean volunteers never meet in a file, so a signed-in volunteer's Google name, photo or email is not shown to the others. A link identifies a copy, not a person: anyone the link is forwarded to can edit it and pass as its volunteer. So:
  - **Submission is by email.** When a volunteer finishes a batch, they reply on their existing email thread ("batch 2 done"). Only work confirmed that way is collected. The email also sets Last contact.
  - **A copy ID** (random, e.g. `hi-7Q3K`) is shown on Start here and recorded in a private map of copy to volunteer, which lives in the private recruitment sheet, never in a review copy.
  - **No identities in copies**: no legal names, emails, agreement details or other volunteers' names, ever.
  - **On a leak**, the old copy's sharing is turned off and the volunteer gets a new copy with a new link.
- **Workspace sharing** (checked Nov 9, 2026): sharing outside the domain is on, and files can be made visible to anyone with the link; nothing needs changing.
- **Protection is an accident warning, not a boundary.** The English, Current, Ref and Notes columns get protection (restricted if Google allows it with link editors, warning-only if not; the sample tests which). Integrity comes from the import, which checks every row against a private export manifest (below), not from the sheet.

### 2. What a copy holds

- **Start here** (in the volunteer's language): what the sheet is for, how long a batch takes, how to submit, the rules, the glossary link, the copy ID, that stopping at any point is fine, a reminder that the agreement is for people 18 or older, whom to write to with a question and that a reply usually comes within a day, and a batch declaration on tool use (below).
- **Batches by user journey**, sized for 30 to 60 minutes each (roughly 500 to 1,000 words), in priority order: for example "Comparing two loans: inputs", "Comparing two loans: results and charts", "Home page", "Menus and footer". One tab per batch, a **Progress** tab listing them, and only the current and next batch open; later batches arrive with the next export. The privacy notice is not in the first rounds (section 7).
- **Every string, not just what shows first**: error messages, empty states, accessibility labels, page titles and descriptions, and dynamic result sentences with sample values.
- **Columns:**

| Column | Filled by | Notes |
|---|---|---|
| Ref | script | Stable code, e.g. `LC-042`, the same on the preview |
| Where | script | Link to this round's preview with the string highlighted |
| English | script | Fragments joined, with markers: `⟦link⟧…⟦/link⟧`, `⟦b⟧…⟦/b⟧` |
| Current | script | The live translation, joined the same way |
| Notes | script | From the context manifest (below) |
| Verdict | volunteer | Blank (not reviewed yet) / Fine / Awkward / Unclear / Wrong / English unclear / Not sure |
| Suggestion | volunteer | Optional for every verdict: naming a problem without a fix is useful |
| Why | volunteer | Optional |
| Tool used | volunteer | Blank / None / AI / Translation tool / Both, overriding the batch declaration for this row |
| Result | script | Next round: Accepted / Accepted with changes / Kept current / Needs clarification / Pending, with a short reason |

- **Tool use is declared, never assumed.** Each batch's Progress row asks once, "For this batch I used: None / AI / Translation tool / Both", with no default, and the batch cannot be collected while it is blank. A row's own Tool used answer overrides it. A blank never means None.
- **Edits outside the volunteer's columns are flagged, not lost.** If the Current (or English, Ref, Notes) cell differs from the export, the row is collected as "Reference cell changed by you": the changed text is quarantined and shown to the owner as a suggestion, never applied as it is, and the master and the catalogs keep using the exported values.

- **"English unclear" goes further than the language**: if the English changes, every language changes in the same pull request, so these rows go to the owner and the council, not to the language's review.
- **Fragments.** Markers keep links and bold parts in place. When a natural sentence in the language needs the link or bold part elsewhere, or split differently, the volunteer writes it with the markers where they belong; if the component cannot take that order, the row is flagged for a code change rather than forced into the old boundaries.
- **Notes come from a reviewed context manifest**, not straight from code comments. The manifest is a file in the repo that says, per key or group: where it renders, what each placeholder becomes (with a sample value), length limits, which rules apply (neutral instruction allowed; never a financial prescription; the founder ungendered in What's changed), and glossary terms. It is built once from comments, glossaries and the components, read by a person, and kept up to date with the catalogs (the export fails on a key without an entry). Only reviewed, public-safe notes reach a sheet or the preview: no internal comments, roadmap or personal data.
- **Formula safety**, in every direction:
  - The export writes every cell as literal text (RAW input).
  - The collection reads each volunteer cell's formula as well as its value; a cell holding a formula is rejected and shown to the owner as such, never read through its computed result.
  - Any CSV or other file made from the sheets prefixes a cell starting with `=`, `+`, `-`, `@`, a tab or a carriage return with an apostrophe.
  - The preview and the catalogs only ever receive text: the preview escapes it, and accepted wording passes the catalog checks before it reaches a component.

### 3. Several volunteers per language: suggest, then judge

Rounds with clear boundaries, never a live edit of someone's work:

1. **Review round.** Each volunteer works through their batches in their own copy and submits by email.
2. **Collect.** The collection reads only submitted batches and writes each into its own **master file**, one private file per review copy (snapshot, review and register tabs), that only nidhi can open. One file per copy means a removal deletes whole files, with their version history, instead of editing rows out of a shared file (council, Nov 9, 2026). Collection is idempotent: running it twice changes nothing, and a failed API call leaves a recoverable state.
3. **Compare round.** Each volunteer gets a separate **Compare sheet**, a new link-shared file per round (never a tab added to their copy, for the same reason as the master), for the rows where volunteers differed: the English, notes, current wording and the other suggestions (with their reasons, cleaned of anything identifying), in random order, identical suggestions merged, labelled with **pseudonyms that change every round** (so nobody builds a reputation or links a suggestion to a public credit). Choices per suggestion: Better than current / About the same / Worse / Not sure, plus "neither, here is another". A volunteer's view of their own suggestion is not counted.
4. **Decide.** The owner decides from the evidence; Compare is evidence, not a vote. The council reviews the accepted changes as one diff per batch and language (not string by string, so review keeps pace). A material disagreement about meaning that the owner cannot settle waits for a qualified reviewer of that language, ideally with financial knowledge; until then the current wording stays and the row is marked unresolved.
5. **Review status, with the version it applies to.** The master records, per row, the exact wording each person assessed (by fingerprint), their verdict, the date, any dissent, and the owner's decision with its reason and date. Three statuses, never merged:
   - **Independently reviewed**: two volunteers, neither the author of that wording, marked the same version Fine (or Better than current, for a suggestion).
   - **Owner approved**: the owner accepted it after the council, but two independent reviewers have not checked that exact wording, for example when a suggestion was accepted with changes, or the language has one volunteer. The next round sends these rows to a volunteer who did not write them.
   - **Unresolved**: a dispute about meaning; the current wording stays until a qualified reviewer of that language settles it. Neither the council nor Compare stands in for that reviewer.

   Any change to the English or the translation clears the status: it applies to a version, not to a key forever.
6. **Close the loop.** The next export fills the Result column, so volunteers see what happened and why.

### 4. The review preview

A build of the site made only for review.

- Tapping a string (keyboard focus works too; hover is never the only way) opens a panel with its Ref, the English and the notes. A Where link opens the page with that string highlighted, found by a `data-ref` attribute, not by text matching.
- **One immutable preview per round**, at its own path (for example `/2026-11-r1/hi/...`), with its source commit, locale and export version recorded in the export manifest, so the preview always matches the sheet a volunteer holds. Old rounds are removed when their sheets close.
- **Hosting**: a second GitHub repository with its own Pages site at `review.nidhi.today` (open: check that the custom domain and deploy settings do not interfere with the main site). It is **public**: `noindex`, a disallow-all `robots.txt` and no links from the live site keep it out of search, but they are not access control. So it contains only what is already published, plus reviewed notes: no future lessons or tools, no internal comments, no volunteer IDs, no sheet links.
- **No analytics** from nidhi (PostHog is not in this build). GitHub records visitors' IP addresses for security, as for any GitHub Pages site. Browser storage: the build's own behaviour is tested before the notice describes it (the theme preference, for example, may still be stored).
- **Refs** live in a committed map (key path to Ref, plus an occurrence id where one string appears in several places), assigned once and never reused. A renamed key keeps its Ref; a split or merge gets new Refs and records the old ones as retired. The export fails on a missing, duplicate or reused Ref.

### 5. Round trip into the repo

- **Export** (`scripts/review-export.mjs`): reads the catalogs, the context manifest and the Ref map; creates or extends each copy through the Sheets API without ever overwriting a volunteer's cells (new batches are added as new tabs; old rounds are archived); writes a **private export manifest** (Ref, key, English and translation fingerprints, round, copy ID), kept outside the public repo.
- **Submitted snapshots**: Start here asks volunteers not to edit a batch after sending "batch done" (a later change goes in the next batch's notes or a new email). When a volunteer submits a batch by email, the collection first copies that batch, on the day the email arrives, as it stood, into a private, read-only snapshot in nidhi's Workspace. Every later step works from the snapshot, not the live copy, so what a volunteer submitted is preserved even if their copy changes or is deleted. Each accepted wording is linked privately to its snapshot and to the agreement record of the person who wrote it (which version of the agreement they accepted, and when). That link, not the full review history, is the permission evidence.
- **Import** (`scripts/review-import.mjs`): reads submitted snapshots; keeps out of automatic application any row with an unknown, missing or duplicated Ref, malformed markers, or a changed reference cell (those are quarantined for the owner, as in section 2); builds the master; and, for rows the owner accepted, edits the catalog value in place on a branch, keeping comments and formatting. It checks the fingerprints again at that moment, and a row whose source changed since export is not applied.
- **Checks**: the catalog tests, plus placeholders preserved, markers balanced and mapped to keys, no long dashes or double dashes, glossary terms used or the difference flagged. A suggestion that changes a glossary term changes the glossary first.
- **Credentials**: a service account (or OAuth client) that can reach only the review sheets, with its key outside the repo; quota limits handled with backoff and retries.
- **Every accepted batch is a normal copy change**: the council reviews it, under CLAUDE.md's "Copy Changes Reach Every Language". A fix to one language's wording, with the English unchanged, changes only that catalog (owner decision 7). A row marked "English unclear", or a fix that shows the English should be reworked, goes to the owner; if the English is reworded, every language changes in the same pull request.
- **Partial failures**: collection and import keep a run log; a run that stops halfway can be repeated and finishes the job without duplicating or losing rows. The dry run in step 3 includes a deliberately interrupted run.
- **What's changed**: one item per language round that readers would notice (for example, "The Spanish loan comparison reads more naturally now, thanks to two volunteers"), not one per string.

### 6. Privacy

The notice and the changelog change **before the first volunteer gets a link**, with a material entry and new wording in the volunteers section in all five languages. Wording to settle in council, covering:

- **Where the work lives**: volunteers' suggestions, verdicts, reasons and tool-use answers are kept in Google Sheets in nidhi's Google Workspace account (Google processes them under nidhi's Workspace terms, as it already does the form answers).
- **New records beyond Status and Last contact**: the copy-to-volunteer map, the master sheet of who suggested what, and the batch submissions. The notice today allows only two extra columns, so this is a change, not a clarification.
- **Identity**: someone who opens the sheet signed in to Google may be shown to nidhi by their Google name (in version history and comments), depending on device and app; signed out, they may appear as an anonymous animal. Worded conditionally, after the device tests.
- **Shared with other volunteers**: suggestions and reasons, cleaned of identifying details, shown under a pseudonym that changes every round. Pseudonymous, not anonymous: in a small group, someone could guess.
- **Link holders**: anyone with the link can view, copy, download and forward the copy; volunteers are asked not to.
- **The preview**: a public review address with no analytics from nidhi; GitHub logs IP addresses; what it stores in the browser, as tested.
- **Retention and deletion**, per store, below.

#### Where review data lives, and how it is deleted

The owner does every deletion, by hand, within 30 days of a removal request, or at the monthly check on the day anyone passes two years since their last contact (a submitted batch counts as contact). The facts below were checked in the Admin console on Nov 9, 2026 (step 2). The routine is in `docs/volunteer-agreement.md`.

| Store | Holds | On removal or after two years |
|---|---|---|
| The volunteer's review copy, with its comments and version history | Their verdicts, suggestions, reasons, tool use | The file is deleted; comments and history go with it |
| Compare sheets | Their suggestions and reasons, identifying details removed, under a round pseudonym | Every Compare sheet showing them is deleted in the same deletion run (whole files), and the others get a new one if the round is open. Copies someone else made from a link cannot be recalled; the notice says so. |
| Archived rounds (closed copies kept for reference) | Same as a review copy | Deleted with the volunteer's other material; archived rounds are kept at most until the round's changes ship |
| Master files | One private file per review copy: snapshot, verdicts, dates, decisions | Deleted with the copy (whole file) |
| Submitted snapshots | Each submitted batch as it stood | Deleted, except for wording that was accepted and published |
| Published wording log | One private sheet per language: for accepted and published wording only, Ref, wording, copy code, batch, date sent, agreement version and the Gmail message ID of the "I agree" reply (so the row still points to its permission after a removal); no other part of a batch | Kept while the wording is used and then only as long as reasonably necessary for legal claims, as the permission record is today |
| Copy map | Copy ID to volunteer | The row is deleted |
| The menu's records (script properties) | Per copy code: language, batch, state, file ids; no name or email | Deleted with "Forget this person's review records" during a removal |
| Local files made by the scripts | Temporary CSV or JSON | Never kept: deleted at the end of each run, never committed |
| Google Drive trash | Deleted files for up to 30 days | Emptied by hand in the deletion run. Checked Nov 9, 2026: Drive deletes trashed files after 30 days on its own; once the trash is emptied, a Workspace admin can still restore the files for 25 days, after which Google purges them. So the notice says a deleted copy may be recoverable by nidhi's admin for up to 25 days after deletion, then is gone. |
| Google Vault or retention rules | Copies kept by an admin policy | Checked Nov 9, 2026: none. The account is Google Workspace Business Standard, which has no Vault, so no retention rules or holds exist. If the plan is upgraded to one with Vault, the notice is checked first. |
| Backups | Any copy outside Drive | Checked Nov 9, 2026: none. No backup tool is connected; the only apps with Drive access are nidhi's own Apps Scripts (beta waitlist, volunteer form and lists, newsletter), and every third-party app uses Google sign-in only. If a backup tool is ever connected, the notice changes first. |

Accepted wording on the site is published work under the agreement, separate from the removable credit.

`docs/volunteer-agreement.md`'s routine changes in the same pull request as the notice: it allows exactly two extra columns today and describes removal around the form row and the "I agree" email, so it would otherwise contradict the new notice.

No new agreement clause (owner decision 8): the licence already covers this use, and the notice says it.

### 7. The privacy notice as review material

Kept out of the first rounds. Afterwards it is reviewed with extra care, because a low-traffic page is not a low-consequence one: collection, consent, sharing, retention and rights first; the English frozen during the round. Every change to a translated notice needs:

- **an independent bilingual reviewer**, fluent in English and the language, who did not draft or propose the change;
- **a promise-by-promise comparison**: for each promise in the English (what is collected, when, who it is shared with, how long it is kept, which rights a reader has), the reviewer confirms the translation says the same, no more and no less;
- **the owner's sign-off** on every change, and the council for any change of meaning; substantive uncertainty goes to the owner and is not settled by a vote. The notice already says the English version governs (`privacy.englishIsAuthoritative`), but a misleading translation still has to be fixed. A translated wording fix that keeps the English and the promises unchanged gets no changelog entry; one that changes what a reader is promised is classified under CLAUDE.md's rules like any other notice change.

### 8. Lessons, later

Lessons are English only today (CLAUDE.md, "Copy Changes Reach Every Language", rule 6, and no language UI on lesson pages). Translating them is a separate owner decision that changes that rule, the lesson routes, the sitemap and the privacy notice. When it comes, the same pattern applies with Google Docs: one Doc per lesson per volunteer, English and translation side by side, a second volunteer reviewing in Suggesting mode.

### 9. Devices and accessibility

The sample is tested before any volunteer sees a sheet, by the owner and a second, external Google account, signed in and signed out: Mac (Chrome, Safari), Windows (Chrome, Edge), iPad (Sheets app, Safari), Android tablet (Sheets app, Chrome) and a phone. Checked and recorded before any volunteer gets a link: editing through the link without signing in (if tablets cannot, the privacy wording changes), what version history and comments show the owner, dropdowns, long cells, restricted, owner-only and warning protection of the reference columns, Where links, a row with a placeholder, a fragment that needs reordering, a formula typed into a volunteer cell, an edit to Current, the deletion run against every store in section 6, and the preview with a keyboard and a screen reader.

### 10. Indonesian material, and credit

Agreed by the council on Nov 9, 2026 (two rounds), after the owner's direction: "We are not yet building the site. We are gathering material. As we get more and more material, we'll need to start making it take proper shape. And also, we need to find out how to give credit."

**Gathering material for a language that is not live**

- **Roadmap rule**, added to `docs/i18n/locale-roadmap.md`: "Material may be gathered for any listed language when someone offers to help. This does not start an edition, promise one or set a date, and does not change the order editions are built and published; any change to that order is an owner decision." The volunteer is told there is no launch date and no obligation to continue. No Indonesian language option or page appears anywhere on the site.
- **Where it lives**: `docs/i18n/id-glossary.md`, headed "Working material, not a published edition", with agreed terms, open questions, decision status, the English source commit and a "last checked against English" date. Never volunteer identities or raw deliberation.
- **No drafted catalog yet.** When the owner wants drafted copy, the council decides where it is stored. Wherever it is, it carries a source commit and per-string English fingerprints, rows whose English changed are marked for review, and volunteer work is never overwritten. A sheet export is fresh only on the day it is made.
- **First volunteer material**: the register question, then terms in batches. The aim is 100 to 200 terms; the first batch is 30 to 50. Glossary sheet columns: Ref, English term, meaning and example sentence, where it appears, proposed Indonesian (marked as an AI draft), alternatives, verdict, suggested wording, why, tool used, owner decision.
- **The register question** shows *kamu*, *Anda* and leaving the pronoun out (where natural) in four contexts: an explanation, a tool instruction, an error message and a sensitive money topic. It asks for a default and any exceptions by context. The volunteer advises; the owner decides after the council. One volunteer is not proof of what readers prefer, so unresolved points stay open.
- **No shortcut**: the glossary sheet needs every prerequisite of the review sheets (Workspace checks, owner-only sample, notice change, Status `Agreed`).

**Credit**

- **Where**: one "Thank you" section on `/volunteers/`, in every live edition, grouped by the language contributed to. No about-page lines, footers or `/credits/` page for now. Work for a language that is not live is credited as preparation ("Bahasa Indonesia, in preparation: glossary contributions: A"), only after completed work and confirmation. Signing up earns no credit.
- **What it says**: role labels for work actually done: "Glossary contributions", "Review of selected sections", "Translation of selected sections" (lessons later get their own label). Beside the list, in every language, a note: translations are drafted with AI; contributors helped with the work shown; a credit does not mean they checked every page or endorse every statement. Chosen names only, no links, no transliteration, no ranking by amount.
- **Order**: by date of confirmation, oldest first, with the private sheet's row as the tie-breaker; documented in the code.
- **Consent**: the form's opt-in is a first preference. After a contribution, the owner emails the exact name, language, role wording and placement; only an explicit yes counts. The public name never comes from the legal name in the agreement record.
- **Names are never committed** (the repository is public, and git history keeps what is removed). Credits live in the private volunteer sheet (display name, language, role, confirmation date). The build reads them once, through an Apps Script `credits` action with its own secret token (not the volunteer-list action, which returns email addresses), on the pattern of `src/utils/listCount.ts`. The action returns only confirmed display names, language ids and role ids, already ordered; dates, emails and consent evidence stay private. The build validates the answer, renders names as escaped text, never prints names to logs, and shows no section if the fetch fails (never an older saved list).
- **Removal**: within seven calendar days: clear the credit in the sheet, deploy, purge any cache, check the live pages, and check owner-controlled copies (deployment artifacts, logs, previews). The notice says what removal cannot reach: copies others made and archives such as the Wayback Machine. Before the first credit is published, check that deployment artifacts and logs are private or short-lived.
- **Catalogs**: the role labels and the note go in all five catalogs; names never do.
- **Privacy**: not part of the review sheets notice update (live Nov 9, 2026), which covers the review sheets only (council, Nov 9). Credits are not published until their own notice update and changelog entry ship, covering (the sheets, the glossary sheet, credit roles, credit for a language in preparation, the new credit fields in the private sheet, how credits reach the site, the removal target and its limits).
- **What's changed**: one item when the Thank you section first appears; later additions described by outcome without names; removals never announced by name.
- **Built when** the first completed, confirmed contribution exists.

## Steps

| # | Step | Status |
|---|---|---|
| 1 | Council sign-off on this design | Done Nov 9, 2026 (three rounds) |
| 2 | Check the Workspace: sharing setting, trash handling, Vault or retention rules, connected backup tools | Done Nov 9, 2026 (read only, nothing changed): link sharing outside the domain on; Business Standard, no Vault or retention rules; no backup tool; trash 30 days, then 25 days admin-restorable after emptying |
| 3 | Sample: Hindi loan comparison, owner-only and disposable, public strings and made-up suggestions; device and deletion tests (section 9); a dry-run collection and import against a small export manifest, including the rejections, a formula cell, a Current edit and an interrupted run | In progress. The sample is the Indonesian glossary batch G1 instead (what the first volunteer gets), built by `scripts/review/glossary-export.ts` and `scripts/review/review-sheet.gs` in the Apps Script project "nidhi volunteer review" (spreadsheets scope only). Nov 9, 2026: a new sheet is private until the owner sets General access to "Anyone with the link", Editor; after that, opening and editing signed out (incognito) works. Still to test: tablets, phone, version history, protection, collection |
| 4 | Owner decides: the agreement clause, translation-only changes under the copy rule, the reply time for volunteers, the pilot language | Done Nov 9, 2026 (decisions 7 to 10), except the pilot language, which waits on the Bahasa question |
| 5 | Context manifest and Ref map | |
| 6 | Privacy notice wording, changelog entry and the matching routine in `docs/volunteer-agreement.md`, council-approved in all five languages, shipped | Drafted Nov 9, 2026 for the review sheets only; credits (step 14) and the preview (step 8) get their own updates. Device tests on tablets and phones are still a prerequisite to sending a volunteer a link |
| 7 | Export, import, master sheet, Compare tab | |
| 8 | Review preview build and hosting. Gated on its own privacy notice update (hosting, GitHub's IP logs, tested browser storage), which the review sheets update does not cover | |
| 9 | Pilot: language waits on the Bahasa decision (Hindi is reviewed by the owner). With one volunteer, the Compare round and "Independently reviewed" status cannot be exercised; rows end as "Owner approved" until a second volunteer joins | |
| 10 | All batches, all languages; then the privacy notice (section 7) | |
| 11 | Lessons (owner decision first) | |
| 12 | Indonesian: roadmap rule, `id-glossary.md` with the register examples and a first seed of 30 to 50 terms (no volunteer contact needed) | Done Nov 9, 2026: 51 draft terms and the register question; council signed off after two rounds |
| 13 | Indonesian: register tab and first glossary batch to the volunteer, after steps 2 to 6 | |
| 14 | Credits: Apps Script `credits` action, the Thank you section, the note and role labels in five languages, the removal runbook; built when the first confirmed contribution exists | |

## Running costs

Refs, the context manifest, preview rounds, collections and the council's batch reviews are ongoing work, not a one-off script. A round takes the owner roughly: an export, an email per volunteer, a collection, decisions on the master, a council review, a pull request. Volunteers' questions also come to the owner, the only support contact, aiming to reply within 24 hours; deletion runs are the owner's too.

## The review menu (Nov 10, 2026)

Owner decision: batches should look after themselves. Council round on Nov 10 agreed the shape below; the code is `scripts/review/review-sheet.gs` and `review-text.gs`, the owner's steps are in `docs/volunteer-agreement.md`.

- **Where:** the Apps Script project bound to the private volunteer sheet, with a "nidhi review" menu. Scopes: spreadsheets and the container's UI only; no Drive, Gmail or outside requests.
- **Data:** `glossary-export.ts --langs id,...` writes every batch of every language with material into Data.js, with a fingerprint per batch. Nothing about any volunteer. Once a batch has been sent to anyone, its terms never change; new terms go in a new batch.
- **Every language the form offers** gets the same sheet, in its own words with the English after them (`review-text.gs`); a language without a glossary yet gets "no material yet" from the menu.
- **Prepare:** for the selected row, only when Status is Agreed or Active and nothing is open; the next batch in order; the code goes into Review copies before any file exists, so an interrupted build is finished by running Prepare again. Each copy gets a private master at once, whose "Sent" tab records exactly what was sent, the layout and the source; collection checks against that, never against newer data.
- **Collect:** asks the owner to confirm the "batch done" email arrived; refuses a blank or computed tool answer; flags formulas anywhere, changed reference cells and inconsistent rows; keeps formulas as literal text in the snapshot; keeps the owner's decisions on a repeat run; then builds the next batch, and says to hold it if the flags need a reply.
- **Recovery:** each file's id is saved the moment it exists and files are refilled from empty on a retry; a build resumes only if a hash of everything the copy shows is unchanged. Collection first writes a complete capture of every submitted cell and formula into the master, then works only from it, building new tabs under temporary names and swapping them in, so decisions and evidence survive any interruption. Everything written to a sheet is escaped, so no text becomes a formula.
- **Replace** (leaked or lost link), **What's next?**, **Show this person's files** and **Forget this person's review records** (removal) complete the menu. Every action ends with a box of the owner's next manual steps.
- **Never automatic:** sharing, sending, Status, Last contact, decisions, deletion. The council agreed no privacy notice change is needed for this: the notice already says the private sheet holds each copy's code and that nothing is replied to or decided automatically.
