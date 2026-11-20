/**
 * scripts/deploy-trigger.gs asks GitHub for the daily deploy. It runs in
 * Google's Apps Script runtime, so the test loads it into a Node VM with
 * fakes for the three services it uses, and checks the one request it sends,
 * where its token comes from, and what it does when GitHub says no.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const FILE = 'scripts/deploy-trigger.gs';
// An obvious dummy: the real token lives only in the project's script properties.
const TOKEN = 'dummy-token-for-tests';

/**
 * `properties` are the script properties; `answer` is what GitHub replies;
 * `triggers` are the handler names of the triggers already installed.
 */
function load({ properties = { GITHUB_TOKEN: TOKEN }, answer = { code: 204, text: '' }, triggers = [] } = {}) {
  const seen = { requests: [], asked: [], deleted: [], created: [] };
  const installed = triggers.map((handler) => ({ getHandlerFunction: () => handler }));
  const ctx = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name) => { seen.asked.push(name); return properties[name] ?? null; },
      }),
    },
    UrlFetchApp: {
      fetch(url, options) {
        seen.requests.push({ url, options });
        return { getResponseCode: () => answer.code, getContentText: () => answer.text };
      },
    },
    ScriptApp: {
      getProjectTriggers: () => installed.slice(),
      deleteTrigger: (trigger) => { seen.deleted.push(trigger.getHandlerFunction()); installed.splice(installed.indexOf(trigger), 1); },
      newTrigger(handler) {
        const made = { handler, steps: [] };
        const builder = {};
        for (const step of ['timeBased', 'everyDays', 'atHour', 'nearMinute', 'inTimezone']) {
          builder[step] = (...args) => { made.steps.push([step, ...args]); return builder; };
        }
        builder.create = () => { seen.created.push(made); installed.push({ getHandlerFunction: () => handler }); };
        return builder;
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(FILE, 'utf8'), ctx);
  return { ctx, seen, installed };
}

describe('deploy-trigger.gs: the request', () => {
  it('sends one POST that dispatches deploy.yml on main in this repository', () => {
    const { ctx, seen } = load();
    ctx.triggerDeploy();
    assert.equal(seen.requests.length, 1);
    const { url, options } = seen.requests[0];
    assert.equal(url, 'https://api.github.com/repos/Akshayanti/nidhi-landing/actions/workflows/deploy.yml/dispatches');
    assert.equal(options.method, 'post');
    assert.equal(options.contentType, 'application/json');
    assert.deepEqual(JSON.parse(options.payload), { ref: 'main' });
  });

  it('names a workflow that exists and can be dispatched', () => {
    const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
    assert.match(workflow, /^\s*workflow_dispatch:/m, 'deploy.yml no longer accepts a dispatch, so the trigger would get a 422');
  });

  it('takes the token from the GITHUB_TOKEN script property and sends it only as a bearer header', () => {
    const { ctx, seen } = load();
    ctx.triggerDeploy();
    assert.deepEqual(seen.asked, ['GITHUB_TOKEN']);
    const { url, options } = seen.requests[0];
    assert.deepEqual({ ...options.headers }, {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
    assert.equal(url.includes(TOKEN), false);
    assert.equal(options.payload.includes(TOKEN), false);
  });

  it('holds no token in its source', () => {
    const source = fs.readFileSync(FILE, 'utf8');
    assert.doesNotMatch(source, /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/);
    assert.doesNotMatch(source, /Bearer\s+[A-Za-z0-9_-]{8,}/);
  });

  it('succeeds quietly on 204', () => {
    const { ctx } = load();
    assert.equal(ctx.triggerDeploy(), undefined);
  });
});

describe('deploy-trigger.gs: failure', () => {
  it('throws before any request when the token is not set', () => {
    for (const properties of [{}, { GITHUB_TOKEN: '' }]) {
      const { ctx, seen } = load({ properties });
      assert.throws(() => ctx.triggerDeploy(), /GITHUB_TOKEN script property is not set/);
      assert.equal(seen.requests.length, 0);
    }
  });

  it('reads the status itself instead of letting the fetch throw', () => {
    // With muteHttpExceptions the error below carries GitHub's own answer.
    const { ctx, seen } = load();
    ctx.triggerDeploy();
    assert.equal(seen.requests[0].options.muteHttpExceptions, true);
  });

  it('throws with the status and GitHub\'s answer on anything but 204, so Google emails the owner', () => {
    const cases = [
      { code: 401, text: '{"message":"Bad credentials"}' },
      { code: 404, text: '{"message":"Not Found"}' },
      { code: 422, text: '{"message":"Workflow does not have \'workflow_dispatch\' trigger"}' },
      { code: 500, text: 'oops' },
      // Any other success code is not the answer a dispatch gives.
      { code: 200, text: '{}' },
    ];
    for (const answer of cases) {
      const { ctx } = load({ answer });
      assert.throws(() => ctx.triggerDeploy(), (err) => err.message === `GitHub returned ${answer.code}: ${answer.text}`);
    }
  });

  it('does not put the token in the error', () => {
    const { ctx } = load({ answer: { code: 401, text: 'Bad credentials' } });
    assert.throws(() => ctx.triggerDeploy(), (err) => !err.message.includes(TOKEN));
  });

  it('sends the request once: a failure is not retried', () => {
    const { ctx, seen } = load({ answer: { code: 500, text: '' } });
    assert.throws(() => ctx.triggerDeploy());
    assert.equal(seen.requests.length, 1);
  });
});

describe('deploy-trigger.gs: the daily trigger', () => {
  it('runs triggerDeploy every day near 11:00 India time', () => {
    const { ctx, seen } = load();
    ctx.installDailyTrigger();
    assert.equal(seen.created.length, 1);
    assert.equal(seen.created[0].handler, 'triggerDeploy');
    assert.deepEqual(seen.created[0].steps, [
      ['timeBased'],
      ['everyDays', 1],
      ['atHour', 11],
      ['nearMinute', 0],
      ['inTimezone', 'Asia/Kolkata'],
    ]);
  });

  it('replaces its own older triggers and leaves any other trigger alone', () => {
    const { ctx, seen, installed } = load({ triggers: ['triggerDeploy', 'somethingElse', 'triggerDeploy'] });
    ctx.installDailyTrigger();
    assert.deepEqual(seen.deleted, ['triggerDeploy', 'triggerDeploy']);
    assert.deepEqual(installed.map((t) => t.getHandlerFunction()), ['somethingElse', 'triggerDeploy']);
  });

  it('leaves exactly one trigger however often it is run', () => {
    const { ctx, installed } = load();
    ctx.installDailyTrigger();
    ctx.installDailyTrigger();
    ctx.installDailyTrigger();
    assert.equal(installed.length, 1);
  });

  it('installing the trigger sends no request', () => {
    const { ctx, seen } = load();
    ctx.installDailyTrigger();
    assert.equal(seen.requests.length, 0);
  });
});
