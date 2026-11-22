# Data model: the sheets behind the lists

The site is static. The newsletter, the planner waitlist and the volunteer form keep their records in Google Sheets, which the Apps Script projects in `scripts/` read and write (#445). This page lists each sheet and tab, its columns, which script writes it and which reads it, and the order of steps for adding a column. How to deploy a script, its properties and its tokens are in [operations.md](operations.md).

Sheets are named here by their role. Their IDs, tab names in production and web-app addresses are not written in the repository: the IDs are script properties (`SHEET_ID`, `SPREADSHEET_ID`) or, for the volunteer responses, a constant in `waitlist.gs`, and each address is a secret or a variable where it is used.

What the privacy notice promises about each list (what is kept, for how long, what is deleted) is in `src/components/pages/PrivacyPage.astro` and the `privacy` namespace of the catalogs. A change to a column that holds personal data is a change the notice may need to describe.

## The subscriber tab (newsletter)

One tab, named by the `SHEET_NAME` property of `newsletter.gs`, in the spreadsheet `SHEET_ID` names. One row per address.

| # | Column | What it holds |
|---|---|---|
| 1 | `email` | The address, lower case and trimmed. |
| 2 | `status` | `pending`, `confirmed`, `unsubscribed` or `bounced`. |
| 3 | `source` | The site path the sign-up came from, or empty. |
| 4 | `created_at` | When the row was added. |
| 5 | `confirmed_at` | When the reader confirmed. |
| 6 | `unsubscribed_at` | When the reader left, or the address bounced. |
| 7 | `confirm_token` | The random token in the confirmation link; cleared once used, or on unsubscribe. |
| 8 | `unsub_token` | The random token in every unsubscribe link. |
| 9 | `reminder_sent_at` | When the one reminder went out. |

- **Writes:** `newsletter.gs` only: sign-up appends a row; confirm, unsubscribe and the bounce scan change `status` and the dates; the hourly `handleRemindPending` stamps `reminder_sent_at` (a second sign-up while pending, which resends the link, counts as the reminder too) and deletes rows the notice says are deleted (pending after 7 days, unsubscribed after 30, bounced after a week); `migrateAddTokens` fills empty token columns, run by hand.
- **Reads:** `newsletter.gs` only. Its `count` action gives the site's build one number (confirmed readers); `send_post` reads the confirmed rows to mail a lesson. Nothing outside the script reads the tab: `scripts/send_newsletter.py` sends the lesson to the script, not to the sheet.
- **Checked:** every handler that opens the tab refuses it unless its first nine headers are these, in this order (`sheet_()`); columns after the ninth are allowed. Nothing is then read past the header row or written: a POST answers `error`, a link opened with GET shows "Something went wrong", health is not ok and the hourly run fails, with the reason in the log.
- **Not checked:** `migrateAddTokens`, which is run only from the editor. It rewrites the header row and fills the token columns by position, so run it only once the columns themselves are in this order.

## The waitlist tab (planner waitlist)

One tab, named by the `SHEET_NAME` property of `waitlist.gs`, in the spreadsheet `SPREADSHEET_ID` names (it may be the newsletter's spreadsheet, in a tab of its own). One row per address.

| # | Column | What it holds |
|---|---|---|
| 1 | `email` | The address, lower case and trimmed. |
| 2 | `source` | The site path the sign-up came from, or empty. |
| 3 | `created_at` | When the row was added. |

- **Writes:** `waitlist.gs` only: a sign-up appends a row unless the address is already there; `dedupeOnce_` removed duplicates kept from before they were blocked, once.
- **Reads:** `waitlist.gs`. Its `count` action gives the site's build one number (this tab and the beta volunteers below, each address once); its `list` action gives the planner's admin tools `email`, `source` and `created_at` for each address.
- **Checked:** every handler that opens the tab (sign-up, `count`, `list` and health) refuses it unless its first three headers are these, in this order (`headersMatch_`). The first three answer `schema` and health is not ok; a refused sign-up writes nothing and is logged. Past the day's limit a sign-up answers `busy` without opening the tab.

## The volunteer responses (volunteer form)

The spreadsheet the volunteer Google Form sends its answers to, made by `scripts/volunteer-form.gs`. Google writes one row per response, with a `Timestamp` column and then one column per question, titled with the question's text. The live form can be edited in the Forms UI; `volunteer-form.gs` is the record of what it asks.

| Column | Read by a script |
|---|---|
| `Timestamp` | Yes |
| `Email` | Yes |
| `Name to credit (optional)` | No |
| `Which languages?` | No |
| `Do you have a financial background?` | No |
| `Tell me a little about it (optional)` | No |
| `How would you like to help?` | No |
| `Credit on the site` | No |
| `Consent` | No |
| `Planner beta (optional)` | Yes |
| `Your level in each language (optional)` | No |

- **Writes:** Google Forms only. The owner deletes rows by hand on the notice's retention schedule (see the header of `volunteer-form.gs`).
- **Reads:** `volunteer-list.gs`, bound to this spreadsheet, gives the planner's admin tools `email` and `submitted_at` for each volunteer who ticked the beta box; `waitlist.gs` opens it by ID to add the same volunteers to its count. Only the three columns marked above are read.
- **One definition:** both scripts find the volunteers with the same code, the "Volunteer form contract" block copied word for word into each (#444). The response tab is the one tab whose header row has `Email`, `Timestamp` and `Planner beta (optional)`, found by header text, so columns can move. If no tab has them, or two do (an archived copy, say), both answer `schema` instead of guessing. A volunteer "ticked the beta box" when the cell is the choice text, or the choice sits between the `, ` separators Google uses for several choices; a cell that only contains the text does not count. `scripts/apps-script-shared.test.mjs` fails if the two copies differ, and compares the list with the count on the same rows.

## State kept in script properties

Not sheets, but stored with them: each script also keeps small records in its own script properties (the day's mail and sign-up counters, the record of a lesson being sent, the last reminder run). `operations.md` lists them under "Script properties".

## Adding a column

The scripts read and write cells by position, except the volunteer columns, which are found by header text. A column is added so that no script ever reads a sheet it does not expect:

1. **Add the column at the end** of the tab, after the last column a script uses, with its header in row 1. The subscriber tab allows extra columns after the ninth and the waitlist tab after the third, so the deployed scripts keep working; never insert a column between existing ones, or every handler refuses the tab (newsletter, waitlist) until the script matches.
2. **Change the script** in a pull request: add the column to the file header, to `COL` and the expected headers if the script must check it, and to whatever writes or reads it; give old rows an empty value a handler can live with. Update this page in the same pull request. Run `npm run gs:version` and `npm test`.
3. **Check the privacy notice.** A column that stores something new about a person needs a privacy changelog entry and, if the notice does not already say it, a change to the notice (CLAUDE.md, "Privacy Policy is the Source of Truth").
4. **Deploy the script** from the branch once its checks pass, and check by hand that health is ok and its version is the branch's (operations.md, "Deploying a script").
5. **Merge**, run the "Apps Script versions" workflow, then fill any old rows that need a value, by hand or with a one-off function run from the editor.

To remove a column, go the other way: first deploy a script that no longer reads or writes it, then delete the column, last in the tab or with the scripts' header checks changed in the same deploy.

For the volunteer form, add the question in the Forms UI and in `volunteer-form.gs`. Google adds its column itself. If a script must read it, give it a header constant in the "Volunteer form contract" block, in both copies at once.

Backups of these sheets are not in place yet: that choice waits for the owner (#773).
