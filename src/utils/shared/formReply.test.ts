/**
 * Unit tests for src/utils/shared/formReply.js, which the waitlist and
 * newsletter forms, /confirm/ and /unsubscribe/ inline to read what the Apps
 * Script answered (#342): only a readable { ok: true } is success.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runClassicScript } from '../../../test/classicScript.ts';
import { join } from 'node:path';

const SOURCE = readFileSync(join(import.meta.dirname, 'formReply.js'), 'utf8');

type Reply = (pending: unknown) => Promise<string>;

function load(): Reply {
  const window: Record<string, any> = {};
  runClassicScript(SOURCE, { window, Promise, JSON });
  return window.nidhiFormReply as Reply;
}

function response(body: string, { ok = true }: { ok?: boolean } = {}) {
  return { ok, text: () => Promise.resolve(body) };
}

const reply = load();

describe('formReply', () => {
  it('a readable { ok: true } is ok', async () => {
    assert.equal(await reply(Promise.resolve(response('{"ok":true}'))), 'ok');
  });

  it('names the refusals the forms explain', async () => {
    for (const error of ['invalid_email', 'invalid_token', 'busy']) {
      assert.equal(await reply(Promise.resolve(response(JSON.stringify({ ok: false, error })))), error);
    }
  });

  it('any other refusal is failed', async () => {
    assert.equal(await reply(Promise.resolve(response('{"ok":false,"error":"error"}'))), 'failed');
    assert.equal(await reply(Promise.resolve(response('{"ok":false}'))), 'failed');
    assert.equal(await reply(Promise.resolve(response('{"ok":false,"error":"toString"}'))), 'failed');
  });

  it('an HTTP error is failed, even with ok in its body', async () => {
    assert.equal(await reply(Promise.resolve(response('{"ok":true}', { ok: false }))), 'failed');
  });

  it('a page that is not JSON is failed (a quota page, the old confirm redirect)', async () => {
    assert.equal(await reply(Promise.resolve(response('<html>Service invoked too many times</html>'))), 'failed');
    assert.equal(await reply(Promise.resolve(response('null'))), 'failed');
    assert.equal(await reply(Promise.resolve(response('"ok"'))), 'failed');
  });

  it('an opaque no-cors reply is failed, not success', async () => {
    assert.equal(await reply(Promise.resolve({ ok: false, type: 'opaque', status: 0, text: () => Promise.resolve('') })), 'failed');
  });

  it('a network failure, a timeout and an unreadable body are failed', async () => {
    assert.equal(await reply(Promise.reject(new TypeError('Failed to fetch'))), 'failed');
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    assert.equal(await reply(Promise.reject(abort)), 'failed');
    assert.equal(await reply(Promise.resolve({ ok: true, text: () => Promise.reject(new Error('reset')) })), 'failed');
    assert.equal(await reply(Promise.resolve(undefined)), 'failed');
  });
});

describe('the forms read the reply', () => {
  const FILES = [
    'components/WaitlistSection.astro',
    'components/SubscribeSection.astro',
    'pages/confirm.astro',
    'pages/unsubscribe.astro',
  ];
  for (const file of FILES) {
    const source = readFileSync(join(import.meta.dirname, '../..', file), 'utf8');
    it(`${file} inlines formReply.js and never posts with no-cors`, () => {
      assert.match(source, /formReply\.js\?raw/);
      assert.match(source, /nidhiFormReply\(/);
      assert.doesNotMatch(source, /no-cors/);
    });
    it(`${file} gives up on a request that hangs`, () => {
      assert.match(source, /AbortController/);
    });
  }
});
