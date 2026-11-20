/**
 * scripts/volunteer-form.gs builds the "Help translate nidhi" Google Form.
 * It runs in Google's Apps Script runtime, so the test loads it into a Node
 * VM with a fake FormApp that writes down everything the script asks for.
 *
 * The privacy notice describes this form: what it asks, that nothing is
 * collected automatically, and that answers go to a sheet of their own. A
 * change here that changes any of that is a privacy change (CLAUDE.md,
 * "Privacy Policy is the Source of Truth").
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const FILE = 'scripts/volunteer-form.gs';

/** An object whose every `setX(value)` is written into `record.x` and returns the object. */
function recorder(record, extra = {}) {
  return new Proxy(extra, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && /^set[A-Z]/.test(prop)) {
        return (...args) => {
          record[prop[3].toLowerCase() + prop.slice(4)] = args.length === 1 ? args[0] : args;
          return target.self;
        };
      }
      // Anything else the script calls is a call the fake does not know: fail loudly.
      throw new Error(`the fake form has no ${String(prop)}()`);
    },
  });
}

/** Runs createVolunteerForm and returns what it built. */
function build() {
  const made = { forms: [], sheets: [], log: [] };
  const item = (form, type) => {
    const record = { type };
    form.items.push(record);
    const extra = { createChoice: (value) => ({ choice: value }) };
    extra.self = recorder(record, extra);
    return extra.self;
  };
  const ctx = {
    FormApp: {
      DestinationType: { SPREADSHEET: 'SPREADSHEET' },
      create(title) {
        const form = { title, items: [] };
        made.forms.push(form);
        const extra = {
          addTextItem: () => item(form, 'text'),
          addParagraphTextItem: () => item(form, 'paragraph'),
          addCheckboxItem: () => item(form, 'checkbox'),
          addMultipleChoiceItem: () => item(form, 'multipleChoice'),
          getPublishedUrl: () => 'https://forms.example.invalid/published',
          getEditUrl: () => 'https://forms.example.invalid/edit',
        };
        extra.self = recorder(form, extra);
        return extra.self;
      },
      createTextValidation() {
        const rule = [];
        const builder = {
          requireTextIsEmail() { rule.push('email'); return builder; },
          build: () => ({ rule }),
        };
        return builder;
      },
    },
    SpreadsheetApp: {
      create(name) {
        const sheet = { name, id: `sheet-${made.sheets.length + 1}` };
        made.sheets.push(sheet);
        // Only its id is offered: a call that shares the sheet would throw.
        return { getId: () => sheet.id };
      },
    },
    Logger: { log: (line) => made.log.push(line) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(FILE, 'utf8'), ctx);
  ctx.createVolunteerForm();
  return { ...made, ctx };
}

/** A question's choices as plain strings, however the script set them. Copied, since arrays made in the VM are not this realm's arrays. */
const choicesOf = (q) => Array.from(q.choiceValues ?? (q.choices ?? []), (c) => (typeof c === 'string' ? c : c.choice));

describe('volunteer-form.gs: the form it creates', () => {
  it('creates one form and one spreadsheet, and nothing else', () => {
    const { forms, sheets } = build();
    assert.equal(forms.length, 1);
    assert.equal(forms[0].title, 'Help translate nidhi');
    assert.deepEqual(sheets.map((s) => s.name), ['nidhi volunteer translators']);
  });

  it('asks these questions, in this order, of these kinds', () => {
    const { forms } = build();
    assert.deepEqual(forms[0].items.map((q) => [q.type, q.title]), [
      ['text', 'Email'],
      ['text', 'Name to credit (optional)'],
      ['checkbox', 'Which languages?'],
      ['multipleChoice', 'Do you have a financial background?'],
      ['paragraph', 'Tell me a little about it (optional)'],
      ['checkbox', 'How would you like to help?'],
      ['multipleChoice', 'Credit on the site'],
      ['checkbox', 'Consent'],
      ['checkbox', 'Planner beta (optional)'],
      ['paragraph', 'Your level in each language (optional)'],
    ]);
  });

  it('requires the email, languages, background, help, credit and consent, and nothing marked optional', () => {
    const { forms } = build();
    const required = forms[0].items.filter((q) => q.required === true).map((q) => q.title);
    assert.deepEqual(required, [
      'Email',
      'Which languages?',
      'Do you have a financial background?',
      'How would you like to help?',
      'Credit on the site',
      'Consent',
    ]);
    for (const q of forms[0].items) {
      if (/\(optional\)/.test(q.title)) assert.notEqual(q.required, true, q.title);
      else assert.equal(q.required, true, `${q.title} is neither required nor marked optional`);
    }
  });

  it('checks that the email answer is an email address', () => {
    const email = build().forms[0].items[0];
    assert.deepEqual(email.validation, { rule: ['email'] });
  });

  it('offers the open languages first, then the upcoming ones marked as not open yet', () => {
    const languages = choicesOf(build().forms[0].items[2]);
    assert.deepEqual(languages.slice(0, 3), ['Español (Spanish)', 'Čeština (Czech)', 'मराठी (Marathi)']);
    assert.equal(languages.length, 12);
    for (const name of languages.slice(3)) assert.match(name, /^.+ \([A-Za-z]+\), not open yet$/);
    // Hindi is covered already and is not asked for.
    assert.equal(languages.some((name) => /Hindi/.test(name)), false);
    assert.equal(new Set(languages).size, languages.length);
  });

  it('keeps consent to be contacted and the beta invite as two separate ticks', () => {
    const { items } = build().forms[0];
    const consent = items.find((q) => q.title === 'Consent');
    const beta = items.find((q) => q.title === 'Planner beta (optional)');
    assert.deepEqual(choicesOf(consent), ['I agree to be contacted by email about translating for nidhi.']);
    // waitlist.gs and volunteer-list.gs match this exact answer when they count beta invites.
    assert.deepEqual(choicesOf(beta), ["Invite me to the planner's beta when it opens."]);
    assert.notEqual(beta.required, true);
  });

  it('gives the other choice questions these answers', () => {
    const { items } = build().forms[0];
    const answers = (title) => choicesOf(items.find((q) => q.title === title));
    assert.deepEqual(answers('Do you have a financial background?'), ['Yes', 'No']);
    assert.deepEqual(answers('How would you like to help?'), [
      "Review the site's translations",
      'Translate lessons',
      'Hear from me when my language opens',
    ]);
    assert.deepEqual(answers('Credit on the site'), ['Yes, under the name above', 'No, keep me unnamed']);
  });
});

describe('volunteer-form.gs: what the form collects on its own, and where answers go', () => {
  it('collects no email automatically, needs no sign in and allows no edit after sending', () => {
    const form = build().forms[0];
    assert.equal(form.collectEmail, false);
    assert.equal(form.requireLogin, false);
    assert.equal(form.limitOneResponsePerUser, false);
    assert.equal(form.allowResponseEdits, false);
    assert.equal(form.showLinkToRespondAgain, false);
    assert.equal(form.progressBar, false);
  });

  it('sends responses to the new spreadsheet and to nowhere else', () => {
    const { forms, sheets } = build();
    assert.deepEqual(forms[0].destination, ['SPREADSHEET', sheets[0].id]);
  });

  it('says in the description who reads the answers, how to have them deleted, and links the privacy notice', () => {
    const { description } = build().forms[0];
    assert.match(description, /private sheet that only nidhi can read/);
    assert.match(description, /To have them deleted, email hello@nidhi\.today/);
    assert.match(description, /https:\/\/nidhi\.today\/privacy\/$/);
  });

  it('has no file upload, and shares nothing and sends nothing', () => {
    const source = fs.readFileSync(FILE, 'utf8');
    assert.doesNotMatch(source, /addFileUploadItem|addEditor|addViewer|setSharing|DriveApp|MailApp|GmailApp|UrlFetchApp/);
  });

  it('logs the public address and the edit address, for the owner to copy', () => {
    assert.deepEqual(build().log, [
      'Public URL: https://forms.example.invalid/published',
      'Edit URL: https://forms.example.invalid/edit',
    ]);
  });

  it('makes a second form when run again: it never updates the first', () => {
    const first = build();
    first.ctx.createVolunteerForm();
    assert.equal(first.forms.length, 2);
    assert.equal(first.sheets.length, 2);
    assert.deepEqual(first.forms[1].destination, ['SPREADSHEET', 'sheet-2']);
  });
});
