import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { LIST_COUNT_STEP, LIST_COUNT_THRESHOLD, askListCount, shownListCount } from './listCount.ts';

describe('the number a sign-up line may show', () => {
  it('no line when the count is unknown or under the threshold', () => {
    assert.equal(shownListCount(null), null);
    assert.equal(shownListCount(0), null);
    assert.equal(shownListCount(LIST_COUNT_THRESHOLD - 1), null);
  });

  it('rounds down, so the page never claims more people than there are', () => {
    assert.equal(shownListCount(LIST_COUNT_THRESHOLD), 20);
    assert.equal(shownListCount(39), 20);
    assert.equal(shownListCount(40), 40);
    assert.equal(shownListCount(1234), 1220);
    for (const n of [20, 21, 59, 60, 999]) {
      const shown = shownListCount(n)!;
      assert.ok(shown <= n && shown % LIST_COUNT_STEP === 0, String(n));
    }
  });
});

describe('asking a list for its size', () => {
  // No request leaves the machine: fetch is replaced in every test, and the
  // address is one that cannot resolve.
  const ENDPOINT = 'https://list.invalid/exec';
  const TOKEN = 'TEST_LIST_COUNT_TOKEN';
  const answer = (body: unknown, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response;

  afterEach(() => {
    mock.restoreAll();
    delete process.env[TOKEN];
  });

  it('with no endpoint it does not ask', async () => {
    process.env[TOKEN] = 'secret';
    const fetched = mock.method(globalThis, 'fetch', answer({ ok: true, count: 41 }));
    mock.method(console, 'warn', () => {});
    assert.equal(await askListCount(undefined, TOKEN, 'test'), null);
    assert.equal(fetched.mock.callCount(), 0);
  });

  it('with no token it does not ask', async () => {
    const fetched = mock.method(globalThis, 'fetch', answer({ ok: true, count: 41 }));
    mock.method(console, 'warn', () => {});
    assert.equal(await askListCount(ENDPOINT, TOKEN, 'test'), null);
    assert.equal(fetched.mock.callCount(), 0);
  });

  it('posts the count action with the token in the body, and returns the number', async () => {
    process.env[TOKEN] = 'secret';
    const fetched = mock.method(globalThis, 'fetch', answer({ ok: true, count: 41 }));
    assert.equal(await askListCount(ENDPOINT, TOKEN, 'test'), 41);
    const [url, init] = fetched.mock.calls[0].arguments as [string, RequestInit];
    assert.equal(url, ENDPOINT, 'the token is never in the address');
    assert.equal(init.method, 'POST');
    assert.equal(String(init.body), 'action=count&token=secret');
  });

  it('an answer that is not a count, a failed reply or a failed request all give no number, and never log the token', async () => {
    process.env[TOKEN] = 'secret';
    const warned = mock.method(console, 'warn', () => {});
    mock.method(globalThis, 'fetch', answer({ ok: false, error: 'bad token' }));
    assert.equal(await askListCount(ENDPOINT, TOKEN, 'test'), null);
    mock.method(globalThis, 'fetch', answer({ ok: true, count: 41 }, false));
    assert.equal(await askListCount(ENDPOINT, TOKEN, 'test'), null);
    mock.method(globalThis, 'fetch', async () => { throw new Error('offline secret'); });
    assert.equal(await askListCount(ENDPOINT, TOKEN, 'test'), null);
    assert.equal(warned.mock.callCount(), 3);
    for (const call of warned.mock.calls) assert.doesNotMatch(call.arguments.join(' '), /secret/);
  });
});

describe('the newsletter line', () => {
  it('uses the same threshold and rounding as the waitlist', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('./newsletterCount.ts', import.meta.url), 'utf8');
    assert.match(src, /export const shownNewsletterCount = shownListCount;/);
    assert.match(src, /askListCount\(import\.meta\.env\.PUBLIC_NEWSLETTER_ENDPOINT, 'NEWSLETTER_COUNT_TOKEN', 'newsletter'\)/);
  });
});
