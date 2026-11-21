/**
 * The newsletter's subscriber id is the same on both sides (#363): the
 * browser's subscriberDistinctId() (SubscribeSection.astro) and the Apps
 * Script's distinctIdForEmail_() (scripts/newsletter.gs) both give the
 * SHA-256 of the trimmed, lower-cased address, as 64 lower-case hex digits.
 * The privacy notice describes that hash; if the two drifted, the funnel
 * would stop joining up and, worse, one side would be sending something the
 * notice does not describe.
 *
 * Both functions are read from the source as it stands and run here, the
 * browser's with Node's Web Crypto and the script's with a stand-in for Apps
 * Script's Utilities that returns signed bytes, as Apps Script does. The
 * files themselves are not changed.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const ROOT = join(import.meta.dirname, '..', '..');
const SUBSCRIBE = readFileSync(join(ROOT, 'src/components/SubscribeSection.astro'), 'utf8');
const NEWSLETTER = readFileSync(join(ROOT, 'scripts/newsletter.gs'), 'utf8');

/** The text of `function name(...) { ... }` (optionally async), found by matching braces. */
function functionSource(text: string, name: string): string {
  const start = text.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.ok(start >= 0, `${name} is not in the source`);
  let depth = 0;
  for (let i = text.indexOf('{', start); i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`${name} has no end`);
}

function browserId(email: string): Promise<string | null> {
  const context: Record<string, unknown> = { window: { crypto: webcrypto }, TextEncoder, Uint8Array, String };
  runInNewContext(`${functionSource(SUBSCRIBE, 'subscriberDistinctId')}\nthis.run = subscriberDistinctId;`, context);
  return (context.run as (e: string) => Promise<string | null>)(email);
}

function scriptId(email: string): string {
  const Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest(algorithm: string, value: string, charset: string) {
      assert.equal(algorithm, 'SHA_256');
      assert.equal(charset, 'UTF_8');
      // Apps Script gives bytes as signed numbers, -128 to 127.
      return [...createHash('sha256').update(value, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b));
    },
  };
  const context: Record<string, unknown> = { Utilities, String };
  runInNewContext(`${functionSource(NEWSLETTER, 'sha256Hex_')}\n${functionSource(NEWSLETTER, 'distinctIdForEmail_')}\nthis.run = distinctIdForEmail_;`, context);
  return (context.run as (e: string) => string)(email);
}

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

describe('subscriber id parity', () => {
  it('both sides give the known SHA-256 of a plain address', async () => {
    const known = '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b'; // SHA-256("test@example.com")
    assert.equal(sha('test@example.com'), known);
    assert.equal(await browserId('test@example.com'), known);
    assert.equal(scriptId('test@example.com'), known);
  });

  it('both sides trim and lower-case first, and agree on every address', async () => {
    const addresses = ['  Test@Example.COM \n', 'a.b+tag@sub.example.org', 'ÉLODIE@exemple.fr', 'राम@उदाहरण.भारत', '\tx@y.cz'];
    for (const email of addresses) {
      const want = sha(email.toLowerCase().trim());
      const fromBrowser = await browserId(email);
      assert.equal(fromBrowser, want, `browser: ${JSON.stringify(email)}`);
      assert.equal(scriptId(email), want, `script: ${JSON.stringify(email)}`);
      assert.match(fromBrowser!, /^[0-9a-f]{64}$/);
    }
  });

  it('the browser gives no id, rather than a different one, where Web Crypto is missing', async () => {
    const context: Record<string, unknown> = { window: {}, TextEncoder, Uint8Array, String };
    runInNewContext(`${functionSource(SUBSCRIBE, 'subscriberDistinctId')}\nthis.run = subscriberDistinctId;`, context);
    assert.equal(await (context.run as (e: string) => Promise<string | null>)('test@example.com'), null);
  });
});
