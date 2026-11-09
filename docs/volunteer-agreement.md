# Volunteer translator agreement

This is the written permission that lets nidhi publish a volunteer's work while the volunteer keeps their copyright. It is a licence rather than a transfer, because Czech authors cannot transfer their economic rights. No lawyer has checked it, so it may not hold in every country. If nidhi starts earning money, a one-off legal review is worth paying for.

Send it by email to volunteers you accept, before their first contribution, not to everyone who fills in the form. Keep every reply: the privacy notice says what the record holds and how long it stays.

## The routine

Everything below happens by hand, except what the "nidhi review" menu does when you click it: it builds and collects review sheets and writes their codes into the Review copies cell. It never shares, sends, sets Status or Last contact, decides or deletes. The privacy notice promises that a person reads every response and that no reply, decision, credit or beta signup happens automatically.

### Where things live

- **Form answers:** the Google Sheet "nidhi volunteer translators" in the hello@nidhi.today account, filled by the form (`scripts/volunteer-form.gs`). Only nidhi can read it: never share it, not even with a volunteer.
- **The agreement email:** a Gmail template (Gmail on a computer: three dots in the compose window, then Templates). Paste the email and the agreement into the body, not as an attachment, so the volunteer's reply quotes the exact wording they accepted. When the terms change, save a new template ("v2") rather than overwriting, so it stays clear which version each person accepted.
- **Accepted replies:** the Gmail label "Volunteer agreements". The volunteer keeps their own copy in their inbox.
- **This file:** the master copy of the wording; git history shows which version was live when.

### The sheet's three extra columns

The privacy notice allows exactly three columns beyond the form's answers. Add nothing else (no notes, phone numbers or countries) without updating the notice first.

- **Status**, a dropdown (Insert → Dropdown, with "Reject the input" under Advanced options): `Waiting for language`, `Replied`, `Agreement sent`, `Agreed`, `Active`, `Paused`. A blank Status means a new response nobody has read yet: dropdowns have no default, and nothing fills it in automatically. There is no `Removed`: a removal deletes the row.
- **Last contact**, a date (Data → Data validation → Is valid date, Format → Number → Date): the date of the last email either side sent. A "batch done" email counts.
- **Review copies**, text: the copy code of every review sheet sent to this person (for example `id-G1-7Q3K`: language, batch, four random characters), separated by commas. This column is the only place a copy code is connected to a person: never write a name or email in a review sheet, in the master or in a file name.

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
5. **They ask for credit:** nothing is published yet. Credit follows `docs/plans/volunteer-review-material.md`, section 10 (only after completed work and their explicit yes to the exact name, role and placement; names are never committed to the repo), and waits for its own privacy notice update.
6. **After every email either way:** update Last contact.

### Review sheets

How the sheets work, step by step, is in `docs/plans/volunteer-review-material.md`. Every review file is a whole Google file of its own, so that deleting someone's data means deleting files (with their version history), never editing rows out of a shared file:

- **Review copy:** one per volunteer and batch, link-shared.
- **Master:** one private file per review copy (snapshot, review, register tabs), named with the copy code.
- **Compare sheet:** one separate link-shared file per volunteer and round, when several volunteers work on a language.
- **Published wording log:** one private sheet per language with a row for each accepted and published wording (Ref, wording, copy code, batch, date sent, agreement version, and the Gmail message ID of the person's "I agree" reply). It holds no other part of a batch. The message ID is what still connects published wording to its permission after a removal deletes the Review copies column.
- **The menu's records:** one script property per copy code in the volunteer sheet's Apps Script project (language, batch, state, the two file ids; no name or email). "Forget this person's review records" deletes them.

The parts that touch this sheet:

Select any cell in the person's row, then use the **nidhi review** menu (after Help). Every item ends with a box listing what to do next. If an item stops part way (a network error, say), the box says so; choose **What's next?**, then the item it names: Prepare finishes an interrupted build or replacement with the same files, and Collect finishes an interrupted collection from what it already captured, without rereading the volunteer's sheet.

1. **Only after `Agreed`.** Choose **Prepare next batch**. It refuses unless Status is Agreed or Active and no batch of theirs is open, picks their language from "Which languages?" (it asks if there are several), builds the next batch in order, and adds its code to Review copies. Then, by hand: open the copy, Share, General access "Anyone with the link", Editor; email the link on their existing thread; update Last contact; set Status to Active after the first batch.
2. **"Batch done" email:** update Last contact, then choose **Collect a finished batch** and confirm the email arrived. It refuses a blank tool answer (reply and ask), saves the batch in the copy's private master, and builds the next batch straight away. Fill in the Decision column in the master; if the flags need a reply, hold the next batch until that is sorted, then send it as in step 1.
3. **A leaked or lost link:** choose **Replace the open copy**. It marks the old code replaced (it never counts as a finished batch) and builds a new copy of the same batch. Set the old copy's General access back to Restricted, send the new one, and delete the old copy and its master once nothing in them is needed.
4. **A round's changes are on the site:** delete that round's review copies and Compare sheets (the masters and the published wording log stay, under the rules below).
5. **Not sure where someone is:** choose **What's next?**. **Paused** stops new batches; a finished batch they send anyway can still be collected.

### Every month

Sort by Last contact. For anyone last contacted more than two years ago, do the removal below that day.

### When someone asks to be removed

Within 30 days of the request (on the day itself when the monthly check finds two years without contact), in this order:

1. **Review data:** for each code in their Review copies (closed and replaced copies too), delete the review copy and its master file. Delete every Compare sheet that shows their suggestions, and send the other volunteers a new one without them if the round is still open. Use **Show this person's files** to find every copy and master. After deleting the files, choose **Forget this person's review records**, then delete the row. Keep only their rows in the published wording log (with the reference to their "I agree" email). Delete all other review data associated with their copy codes.
2. **Drive trash:** empty it (drive.google.com → Bin → Empty bin), so the deleted files are not kept the extra 30 days. After that, Google lets an admin restore them for 25 more days; the notice says so.
3. **The form:** delete their row in this sheet and their Form response (Form → Responses). Deleting only the row leaves a copy in the Form.
4. **Credit:** remove any credit from the site.

Keep only the permission record, for as long as the privacy notice allows: the "I agree" email in Gmail, and, for wording that was published, its rows in the published wording log.

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
