/**
 * Nidhi volunteer translators — Google Form builder (Google Apps Script)
 * ======================================================================
 *
 * Builds the "Help translate nidhi" Google Form that nidhi.today/volunteers/
 * redirects to. Run once, by hand, in a standalone Apps Script project owned
 * by the nidhi Workspace account (hello@nidhi.today):
 *
 *   1. script.google.com → New project → paste this file.
 *   2. Run createVolunteerForm and approve the Forms and Sheets permissions.
 *   3. The log prints the form's public URL; that is the redirect target for
 *      /volunteers/ in astro.config.mjs.
 *
 * Running it again creates a second form; it does not update the first.
 * Edit the live form in the Forms UI, and keep this file in step so the
 * repo stays the record of what the form asks.
 *
 * Privacy (the privacy notice describes this form):
 *   - No sign in, no automatic email collection: the email is an ordinary
 *     question, so Google does not attach an account to a response.
 *   - No file uploads, no response receipts, no "edit after submit".
 *   - Responses go to a spreadsheet of their own, never shared, so "only we
 *     can read them" stays true. Nothing acts on a response automatically:
 *     every one is read by a person first.
 *
 * After creating it, check in the Forms UI: Settings → Responses → no
 * "Collect email addresses", no "Send responders a copy", no "Allow response
 * editing", no "Limit to 1 response"; Presentation → no "View results
 * summary". Check that neither the form nor the sheet is shared with anyone.
 *
 * Retention (privacy notice): answers are kept until the volunteer asks for
 * removal, or two years after the last message either side sent, whichever
 * is first. Review the sheet every quarter and, for answers past that date,
 * delete both the spreadsheet row and the matching Forms response; a removal
 * request also deletes any site credit.
 */

const PRIVACY_URL = 'https://nidhi.today/privacy/';

const OPEN_LANGUAGES = ['Español (Spanish)', 'Čeština (Czech)', 'मराठी (Marathi)'];

// docs/i18n/locale-roadmap.md, in roadmap order. Hindi is covered and left out.
const UPCOMING_LANGUAGES = [
  'Français (French)',
  'Português (Portuguese)',
  'Bahasa Indonesia (Indonesian)',
  'Deutsch (German)',
  '日本語 (Japanese)',
  'Tiếng Việt (Vietnamese)',
  'Türkçe (Turkish)',
  '한국어 (Korean)',
  'العربية (Arabic)',
];

function createVolunteerForm() {
  const form = FormApp.create('Help translate nidhi');
  form
    .setDescription(
      'nidhi.today reads in English, Hindi, Spanish, Czech and Marathi. I translate the site with AI, ' +
        'and I am looking for native or near native speakers to review it and help translate the lessons. ' +
        'A financial background is more than welcome.\n\n' +
        'What you get: a say in your language\'s words, credit on the site under the name you choose if you ' +
        'want it, and an invite to the planner\'s beta when it opens (no date yet).\n\n' +
        'Your answers go to a private sheet that only nidhi can read. They are used only to understand your ' +
        'languages, level and background, to contact you about translating, to credit you on the site if you ' +
        'ask for it, and, if you ask for it, to invite you to the planner\'s beta. To have them deleted, email hello@nidhi.today. ' +
        'Privacy notice: ' +
        PRIVACY_URL
    )
    .setCollectEmail(false)
    .setRequireLogin(false)
    .setLimitOneResponsePerUser(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false)
    .setProgressBar(false)
    .setConfirmationMessage('Thank you. I will be in touch by email.');

  form
    .addTextItem()
    .setTitle('Email')
    .setHelpText('Where I can reach you about translating and the beta invite.')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());

  form
    .addTextItem()
    .setTitle('Name to credit (optional)')
    .setHelpText('The name or handle to show on the site if you choose credit below. Leave it empty if you would rather not be named.');

  const languages = form.addCheckboxItem().setTitle('Which languages?').setRequired(true);
  languages.setChoices([
    ...OPEN_LANGUAGES.map(name => languages.createChoice(name)),
    ...UPCOMING_LANGUAGES.map(name => languages.createChoice(`${name}, not open yet`)),
  ]);
  languages.setHelpText('Pick every language you speak natively or nearly so. For the ones not open yet, I will reach out when they start.');

  const background = form.addMultipleChoiceItem().setTitle('Do you have a financial background?').setRequired(true);
  background.setChoices([background.createChoice('Yes'), background.createChoice('No')]);

  form
    .addParagraphTextItem()
    .setTitle('Tell me a little about it (optional)')
    .setHelpText('Work, study or anything else that helps with money words.');

  const help = form.addCheckboxItem().setTitle('How would you like to help?').setRequired(true);
  help.setChoices([
    help.createChoice('Review the site\'s translations'),
    help.createChoice('Translate lessons'),
    help.createChoice('Hear from me when my language opens'),
  ]);

  const credit = form.addMultipleChoiceItem().setTitle('Credit on the site').setRequired(true);
  credit.setChoices([
    credit.createChoice('Yes, under the name above'),
    credit.createChoice('No, keep me unnamed'),
  ]);
  credit.setHelpText('If you choose yes, fill in the name above. You can change this or ask to be removed at any time.');

  form
    .addCheckboxItem()
    .setTitle('Consent')
    .setRequired(true)
    .setChoiceValues(['I agree to be contacted by email about translating for nidhi.']);

  // Separate and optional, so the beta invite is its own choice (council, Oct 23, 2026).
  form
    .addCheckboxItem()
    .setTitle('Planner beta (optional)')
    .setChoiceValues(['Invite me to the planner\'s beta when it opens.']);

  form
    .addParagraphTextItem()
    .setTitle('Your level in each language (optional)')
    .setHelpText('For example: Spanish, native. Marathi, near native.');

  const sheet = SpreadsheetApp.create('nidhi volunteer translators');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('Public URL: ' + form.getPublishedUrl());
  Logger.log('Edit URL: ' + form.getEditUrl());
}
