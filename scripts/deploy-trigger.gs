/**
 * Nidhi daily deploy trigger — Google Apps Script (no Web App)
 * ============================================================
 *
 * Lessons are date-gated at build time, so a lesson goes live only when a
 * deploy runs on its date. GitHub's scheduler started that deploy after the
 * 12:15 IST day 1 reel on every day of Oct 3 to Nov 1, 2026 (08:22 to 11:45
 * UTC), so the reel's link was a 404. This script asks GitHub for the deploy
 * at about 11:00 IST (between 10:45 and 11:15). The cron in deploy.yml stays
 * as the backstop; a second deploy on the same day changes nothing.
 *
 * Required setup in the Apps Script project:
 *   1. Create a fine-grained GitHub token: this repository only, permission
 *      "Actions: Read and write", nothing else.
 *   2. Project Settings → Script properties → add:
 *        GITHUB_TOKEN   <that token>
 *   3. Run installDailyTrigger once from the editor and approve the prompt.
 *
 * Google emails the owner when a run fails. A failure usually means the token
 * has expired: make a new one and replace the property.
 */

var REPO = 'Akshayanti/nidhi-landing';
var WORKFLOW = 'deploy.yml';

function triggerDeploy() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN script property is not set');

  var response = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      payload: JSON.stringify({ ref: 'main' }),
      muteHttpExceptions: true,
    }
  );

  var code = response.getResponseCode();
  if (code !== 204) throw new Error('GitHub returned ' + code + ': ' + response.getContentText());
}

/** Run once from the editor. Safe to run again: it replaces the old trigger. */
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'triggerDeploy') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('triggerDeploy')
    .timeBased()
    .everyDays(1)
    .atHour(11)
    .nearMinute(0)
    .inTimezone('Asia/Kolkata')
    .create();
}
