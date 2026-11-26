/**
 * JSON written into a <script> element cannot end that element
 * (jsonForScript.ts). That no page writes JSON there any other way is checked
 * against the source in jsonForScript.pages.test.ts: this file reads no file (#904).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { jsonForScript } from './jsonForScript.ts';

describe('jsonForScript', () => {
  it('means the same as the value it was given', () => {
    const value = { title: 'A </script><script>alert(1)</script> title', list: ['<!--', 'a < b', '\u2028\u2029'], n: 1, nested: { ok: true } };
    assert.deepEqual(JSON.parse(jsonForScript(value)), value);
  });

  it('holds nothing that can end a script element or start a comment', () => {
    const out = jsonForScript({ a: '</script>', b: '<!-- x -->', c: '</SCRIPT >', d: '\u2028' });
    assert.doesNotMatch(out, /</);
    assert.doesNotMatch(out, /[\u2028\u2029]/);
  });

  it('leaves ordinary text as it is', () => {
    assert.equal(jsonForScript({ name: 'nidhi', q: 'कैसे करें?' }), '{"name":"nidhi","q":"कैसे करें?"}');
  });
});
