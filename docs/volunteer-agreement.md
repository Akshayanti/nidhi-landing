# Volunteer translator agreement

This is the written permission that lets nidhi publish a volunteer's work while the volunteer keeps their copyright. It is a licence rather than a transfer, because Czech authors cannot transfer their economic rights. No lawyer has checked it, so it may not hold in every country. If nidhi starts earning money, a one-off legal review is worth paying for.

Send it by email to volunteers you accept, before their first contribution, not to everyone who fills in the form. Keep every reply: the privacy notice says what the record holds and how long it stays.

## The routine

Everything below happens by hand. The privacy notice promises that a person reads every response and that no reply, decision, credit or beta signup happens automatically.

### Where things live

- **Form answers:** the Google Sheet "nidhi volunteer translators" in the hello@nidhi.today account, filled by the form (`scripts/volunteer-form.gs`). Only nidhi can read it: never share it, not even with a volunteer.
- **The agreement email:** a Gmail template (Gmail on a computer: three dots in the compose window, then Templates). Paste the email and the agreement into the body, not as an attachment, so the volunteer's reply quotes the exact wording they accepted. When the terms change, save a new template ("v2") rather than overwriting, so it stays clear which version each person accepted.
- **Accepted replies:** the Gmail label "Volunteer agreements". The volunteer keeps their own copy in their inbox.
- **This file:** the master copy of the wording; git history shows which version was live when.

### The sheet's two extra columns

The privacy notice allows exactly two columns beyond the form's answers. Add nothing else (no notes, phone numbers or countries) without updating the notice first.

- **Status**, a dropdown (Insert → Dropdown, with "Reject the input" under Advanced options): `Waiting for language`, `Replied`, `Agreement sent`, `Agreed`, `Active`, `Paused`. A blank Status means a new response nobody has read yet: dropdowns have no default, and nothing fills it in automatically. There is no `Removed`: a removal deletes the row.
- **Last contact**, a date (Data → Data validation → Is valid date, Format → Number → Date): the date of the last email either side sent.

Each row is coloured by its Status (Format → Conditional formatting, applied to every column from row 2 down, one "Custom formula is" rule per line below, with `B` as the Email column and `M` as the Status column; use your sheet's letters):

| Rule | Formula | Colour |
|---|---|---|
| Unread | `=AND($B2<>"", $M2="")` | Yellow |
| Agreement sent | `=$M2="Agreement sent"` | Orange |
| Replied | `=$M2="Replied"` | Light blue |
| Agreed | `=$M2="Agreed"` | Light green |
| Active | `=$M2="Active"` | Green |
| Waiting for language | `=$M2="Waiting for language"` | Light grey |
| Paused | `=$M2="Paused"` | Grey |

Yellow and orange are the rows waiting on nidhi or on the volunteer. Keep the dropdown's own chip colours plain, so they do not clash with the row colour.

### Sorting and views

- **Group by Status, then language:** select the whole sheet (the box above row 1, left of column A), then Data → Sort range → Advanced range sorting options. Tick "Data has header row", sort by Status A → Z, add a second sort column for "Which languages?" A → Z, and click Sort. Never sort with a single column selected: that sorts the column on its own and mixes up whose status is whose. Statuses sort alphabetically, with blank (unread) rows last. New responses arrive at the bottom, so sort again when needed.
- **One language at a time:** Data → Create a filter view, then on "Which languages?" use Filter by condition → Text contains (for example `Indonesia`), and name the view after the language. It also finds people who ticked other languages too, which a sort cannot, because the question allows several ticks and a sort groups by the exact combination. A filter view changes nothing in the data; reopen it from Data → Filter views.
- **Counts (optional):** Insert → Pivot table → New sheet, with Status and then "Which languages?" as rows and Email counted with COUNTA as values. It holds only counts.

Do not rename, move or delete the form's own columns. `scripts/volunteer-list.gs` finds `Email`, `Timestamp` and `Planner beta (optional)` by their header text.

### For each volunteer

1. **New response:** it arrives with a blank Status and shows yellow. Read it before doing anything else.
2. **Their language is not open yet:** reply if you like, set Status to `Waiting for language`.
3. **You accept them:** send the agreement from the template, replacing `[name]`. Set Status to `Agreement sent` and Last contact to today.
4. **They reply "I agree":** label the email "Volunteer agreements", set Status to `Agreed`, update Last contact. Only now may they send work.
5. **They ask for credit:** add the name to the site (a code change in the repo).
6. **After every email either way:** update Last contact.

### Every quarter

Sort by Last contact. For anyone last contacted more than two years ago, delete the row in the sheet and the matching response in the Form (Form → Responses). Deleting only the row leaves a copy in the Form.

### When someone asks to be removed

Delete their row, delete their Form response, and remove any credit from the site. Keep only the "I agree" email, for as long as the privacy notice allows.

## The email to accepted volunteers

**Subject:** Thank you for helping translate nidhi: one short agreement first

Hi [name],

Thank you for offering to help translate nidhi. Before you start, I need your permission in writing to publish what you write. You keep the copyright in your work, and you can stop helping at any time.

The agreement is below. If anything is unclear, please ask before you agree.

If you are happy with it, reply to this email with your full legal name, today's date and the words "I agree". Please send no translations before then.

Thank you,

Akshay

## The agreement

This agreement is between Akshay Aggarwal, who runs nidhi.today ("I" or "me"), and you, the volunteer replying to this email. It covers every translation, edit, correction or suggestion you send me for nidhi, before or after you reply ("your work").

1. **You keep your copyright.** You give me a non-exclusive, free licence to reproduce, edit, adapt, combine, publish, distribute and otherwise use your work, in any medium, for nidhi. That includes its website, tools, emails, social media and paid products such as the planner. I may use AI tools to help edit your work, and I do not have to publish it.
2. **How long and how far.** The licence applies worldwide, for the full term of copyright, and cannot be withdrawn, to the fullest extent the law allows. I may sublicense it to service providers and commercial partners for these purposes, and it may be transferred to anyone who takes over nidhi, such as a company I form.
3. **Credit.** If you want credit, the name you choose can appear on the site. You can change it or have it removed at any time. Removing a credit does not withdraw the licence. Personal or moral rights that the law says cannot be waived stay yours.
4. **What you promise.** Your work is your own, and nobody else's rights, including an employer's, stop you giving this licence. If you use AI or a translation tool, you have checked every line and you tell me. You are 18 or older.
5. **nidhi's own material.** I keep all rights in nidhi's text and materials. This agreement does not let you publish my text, or a translation or edit of it, elsewhere without asking me. Your own separate work is not affected. You are welcome to say you helped and to link to the pages.
6. **Volunteering.** This is unpaid and is not employment. Either of us can stop at any time, and what you already sent stays covered. A planner beta invite is a separate choice and is not payment for your work.
7. **Your details.** I keep the record of your acceptance (your legal name, email address, the wording you accepted and the date) while I use your work, and after that only as long as reasonably necessary to establish, exercise or defend legal claims. I do not publish this record. The [privacy notice](https://nidhi.today/privacy/) explains the rest.
8. **Law.** Czech law governs this agreement, without removing any protection the law where you live says cannot be excluded.

To accept, reply with:

Full legal name:

Date:

I agree.
