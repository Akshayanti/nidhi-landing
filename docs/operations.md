# Operations: the Apps Script projects

The site is static, but five Google Apps Script projects hold the lists and send the mail. They are not deployed from this repository: each is pasted into its own project in the Apps Script editor and published by hand. This page is the record of what each needs, how to deploy it and how to tell that production runs what `main` holds (#443).

Each file's header comment has the full setup; this page collects it in one place. The sheets the scripts read and write, their columns and how to add one are in [data-model.md](data-model.md).

## The scripts

| File | What it is | Web app | Triggers | Version check |
|---|---|---|---|---|
| `scripts/newsletter.gs` | Newsletter sign-up, confirm, unsubscribe, lesson emails, bounces, reminders | Yes (`PUBLIC_NEWSLETTER_ENDPOINT`) | Hourly `handleRemindPending` | Yes |
| `scripts/waitlist.gs` | Planner waitlist sign-up, count, list for the planner | Yes (`PUBLIC_WAITLIST_ENDPOINT`) | None | Yes |
| `scripts/volunteer-list.gs` | Reads who ticked the beta box on the volunteer form, for the planner | Yes (address held by the planner; `VOLUNTEER_LIST_ENDPOINT` here if set) | None | Yes, when the secret is set |
| `scripts/volunteer-form.gs` | Builds the volunteer Google Form, run once by hand | No | None | No: it is run, not deployed |
| `scripts/deploy-trigger.gs` | Starts the daily site deploy (the backstop for GitHub's late schedules) | No | Daily `triggerDeploy` | No: Google emails the owner when a run fails |

## Knowing what is deployed

Each web-app script has a `VERSION` near its top: the first 12 hexadecimal characters of the SHA-256 of the file, read with that literal empty. Its `?action=health` answer reports it, beside an `ok` for each check and nothing else (the reasons go to the script's execution log).

- **After editing a `.gs` file**, run `npm run gs:version`. `npm test` fails until the literal matches the file (`scripts/gs-version.test.mjs`).
- **The comparison** is `.github/workflows/apps-script-versions.yml`: nightly, after every site deploy and by hand. It runs `scripts/check-gs-versions.mjs`, which asks each script for its health and compares the version with `main`. A script that differs, cannot be reached, reports no version, or whose health is not ok opens or comments on an issue labelled `apps-script-drift`, and the run is red.
- **By hand:** `curl -sL "<exec address>?action=health"`, and `npm run gs:check` for the versions on your branch.

An edit made in the Apps Script editor shows up as a difference too: copy it back into the file here, or paste the file over it.

## Deploying a script

For each script a pull request changes, once its checks pass:

1. Open the project in the Apps Script editor and paste the whole file from the pull request's branch over the old one.
2. Deploy → Manage deployments → pencil → Version: **New version** → Deploy. The `/exec` address stays the same. (A *new deployment* would give a new address, which the site does not know.)
3. If Google asks for new permissions, read the list and approve.
4. Check the deployment by hand: `curl -sL "<exec address>?action=health"` must report `ok` true and the `version` of the branch's file (`npm run gs:check` on that branch prints it). The workflow cannot check this yet: it checks out `main`.

Then, once every changed script is deployed and checked:

5. Merge. If a script changes again on the branch before that, repeat steps 1 to 4 for it.
6. Run the "Apps Script versions" workflow by hand: production and `main` must now agree.

**Order:** deploy from the branch, check by hand, merge, run the workflow. Between the deploy and the merge, a run of the workflow (nightly or after a site deploy) reports a difference, which is expected, so keep that time short. A pull request that changes both a script and the site says so. When a change needs a one-off step (a new trigger, a new property), the pull request lists it.

**Rollback:** Manage deployments → pencil → pick the earlier version → Deploy. The version check then reports a difference until `main` is reverted too, which is correct.

## Triggers

| Script | Handler | When | Install |
|---|---|---|---|
| `newsletter.gs` | `handleRemindPending` | Every hour | Run `installReminderTrigger` from the editor once after deploying. Running it again replaces the trigger; it also runs the handler once. |
| `deploy-trigger.gs` | `triggerDeploy` | Daily, near 11:00 India time | Run `installDailyTrigger` once. |

The hourly run sends the reminder to pending subscribers (between 9:00 and 11:59 Prague time) and deletes what the privacy notice says is deleted: pending rows after 7 days, unsubscribed rows after 30 days, bounced rows after a week. Without the trigger none of that happens, so the newsletter's health checks two things: `reminder_trigger` (a trigger for `handleRemindPending` exists) and `reminder_ran` (a run finished in the last three hours, stamped in the property `remind_last_run`). Either one failing makes health not ok, which the daily newsletter run and the version check both report.

## Script properties

Set in Project Settings → Script properties. Values marked secret never go in the repository.

**`newsletter.gs`**

- `SHEET_ID`, `SHEET_NAME`: the subscriber sheet and its tab (9 columns, listed in the file header).
- `FROM_NAME`, `FROM_EMAIL`, `SITE_URL`. `FROM_EMAIL` must be the account's own address or a verified "Send mail as" alias; health checks it.
- `HMAC_SECRET` (secret): 64 hexadecimal characters, the same value as the repository secret `NEWSLETTER_HMAC_SECRET`. It signs the lesson sends and the bounce scan from the newsletter workflow.
- `POSTHOG_API_KEY`, `POSTHOG_HOST` (optional): the server-side events.
- `TEST_REMIND_EMAIL` (optional): the address `testRemindFromEditor` mails.
- Written by the script itself, never by hand: `remind_last_run`; `confirm_mails:<date>` (the day's confirmation emails, older days deleted); `alias_check:*`; and for a lesson being sent, `sending:<id>` (a run's claim), `send_progress:<id>` (where the run got to), `send_retry:<id>` (subscribers whose email failed: a short hash of the address, the attempts and the kind of error) and `sent_guid:<id>` (the lesson went out). `send_progress` and `send_retry` are deleted when the lesson has gone out to everyone it can reach; the privacy notice describes `send_retry`.

**`waitlist.gs`**

- `SPREADSHEET_ID`, `SHEET_NAME`, `SITE_URL`, and the optional `POSTHOG_API_KEY`, `POSTHOG_HOST`.
- Written by the script: `signups:<date>` (the day's sign-ups, older days deleted).

**`volunteer-list.gs`**: none. It is bound to the volunteer form's response spreadsheet.

**`deploy-trigger.gs`**: `GITHUB_TOKEN` (secret), a fine-grained token for this repository only with "Actions: Read and write".

## Tokens and rotation

The scripts hold only the SHA-256 of each read token, so the source can be public. To rotate one: make a new token (`openssl rand -hex 32`), put its SHA-256 in the file, run `npm run gs:version`, deploy from the branch and check it, set the new token where it is used, then merge and run the workflow ("Deploying a script").

| Token | Hash in | Plain token lives in |
|---|---|---|
| Newsletter count | `COUNT_TOKEN_SHA256_`, `newsletter.gs` | Repository secret `NEWSLETTER_COUNT_TOKEN` (the build reads the count) |
| Waitlist count | `COUNT_TOKEN_SHA256_`, `waitlist.gs` | Repository secret `WAITLIST_COUNT_TOKEN` |
| Waitlist list | `LIST_TOKEN_SHA256_`, `waitlist.gs` | The planner server's environment |
| Volunteer list | `VOLUNTEER_LIST_TOKEN_SHA256_`, `volunteer-list.gs` | The planner server's environment |
| Send signing key | Not hashed: `HMAC_SECRET` property | Repository secret `NEWSLETTER_HMAC_SECRET`. Change both together; `debugHmacSecret` in the editor and the newsletter workflow's preflight print a probe to compare them. |
| Deploy token | Not hashed: `GITHUB_TOKEN` property | Only there. Google emails the owner when it expires. |

## Services and permissions

- `newsletter.gs` needs the **Gmail API** advanced service (Services → Add service) to send mail with `List-Unsubscribe` headers. Health checks it.
- Every web app runs as **Execute as: Me**, **Who has access: Anyone**: the tokens, signatures and the daily caps are the gate.
- Apps Script works out the permissions from the code. `newsletter.gs` asks for Sheets, Gmail, external requests (PostHog) and, since #443, managing its own triggers (`ScriptApp.getProjectTriggers` in health and `installReminderTrigger`). Approve the new one on the first deploy after this change.

## The newsletter's record of sent lessons

Separate from the script's own `sent_guid:` record, the newsletter workflow keeps `.last-sent-guid.txt` on the `newsletter-state` branch: one line per lesson id that went out, plus `expired:<id>` for a lesson that was more than 14 days old before it was ever sent. A run that cannot read that branch sends nothing; a missing branch is allowed only once, on a first run, with the repository variable `NEWSLETTER_STATE_BOOTSTRAP=1` (remove it afterwards). Lessons are known by their newsletter id (`newsletterId` in the frontmatter, else the slug), so changing a published lesson's slug needs `newsletterId: <old slug>`; `npm test` says so (`src/utils/newsletterIds.test.ts`).
