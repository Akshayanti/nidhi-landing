/**
 * The analytics events the Apps Scripts send from the server, pinned.
 *
 * The browser's events are pinned in src/utils/privacySurface.test.ts. These
 * are the other half: `trackPosthog_` calls in scripts/newsletter.gs and
 * scripts/waitlist.gs. Each is listed here with who it is filed under and
 * the names of what it carries, read from the source, so that an event, a
 * property or an identifier cannot be added or changed without this file
 * changing too. A change here is a change to what is sent about a
 * subscriber: check the privacy notice and its changelog rule (CLAUDE.md,
 * "Privacy Policy is the Source of Truth") before updating the table.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** Every `trackPosthog_('event', <who>, { ... })` call in a script: the event, who it is filed under, its property names. */
function eventsIn(path) {
  const source = fs.readFileSync(path, 'utf8');
  const calls = [];
  const unread = [];
  for (const m of source.matchAll(/trackPosthog_\(/g)) {
    // The definition itself is not a call.
    if (/function\s+$/.test(source.slice(Math.max(0, m.index - 12), m.index))) continue;
    // The call's text, to its closing bracket.
    let depth = 0;
    let end = -1;
    for (let i = m.index + 'trackPosthog_'.length; i < source.length; i++) {
      if (source[i] === '(' || source[i] === '{' || source[i] === '[') depth++;
      else if (source[i] === ')' || source[i] === '}' || source[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    const text = source.slice(m.index, end + 1);
    const head = /^trackPosthog_\(\s*'([a-z_]+)',\s*([^,]+?),\s*\{([\s\S]*)\}\s*\)$/.exec(text);
    if (!head) { unread.push(text.slice(0, 80)); continue; }
    // Property names: the keys at the top level of the object literal.
    const keys = [];
    let level = 0;
    let key = '';
    let atKey = true;
    for (const ch of head[3]) {
      if (ch === '(' || ch === '{' || ch === '[') level++;
      else if (ch === ')' || ch === '}' || ch === ']') level--;
      else if (level === 0 && ch === ':' && atKey) { keys.push(key.trim()); atKey = false; key = ''; continue; } else if (level === 0 && ch === ',') { atKey = true; key = ''; continue; }
      if (atKey) key += ch;
    }
    calls.push(`${head[1]} | ${head[2].replace(/\s+/g, ' ')} | ${keys.sort().join(', ')}`);
  }
  return { calls: [...new Set(calls)].sort(), unread };
}

const EXPECTED = {
  'scripts/newsletter.gs': [
    'blog_newsletter_quota_warning | cfg.fromEmail | cap, guid, subscriber_count, utilization',
    // The first carries the mail service's own error text, cut at 300
    // characters, as blog_welcome_failed does: recorded as a finding to fix.
    'blog_newsletter_send_failed | cfg.fromEmail | email_domain, error, guid',
    'blog_newsletter_send_failed | cfg.fromEmail | email_domain, guid, reason',
    'blog_newsletter_sent | cfg.fromEmail | failed, guid, sent, skipped_already_sent, url',
    'blog_pending_expired | distinctIdForEmail_(x.email) | days_since_signup',
    'blog_pending_reminded | distinctIdForEmail_(x.email) | days_since_signup',
    'blog_subscribe_confirmed | distinctIdForEmail_(email) | ',
    'blog_subscribe_duplicate | distinctIdForEmail_(email) | source',
    'blog_subscribe_pending | distinctIdForEmail_(email) | source',
    'blog_subscriber_bounced | distinctIdForEmail_(addr) | email_domain, via',
    'blog_unsubscribe | distinctIdForEmail_(result.email) | method',
    'blog_welcome_failed | distinctIdForEmail_(email) | email_domain, error',
  ],
  'scripts/waitlist.gs': [
    'waitlist_signup | distinctIdForEmail_(email) | email_domain, source',
  ],
};

describe('server-side analytics events', () => {
  for (const [path, expected] of Object.entries(EXPECTED)) {
    it(`${path}: every call can be read`, () => {
      assert.deepEqual(eventsIn(path).unread, [], 'a trackPosthog_ call is written in a way this test cannot read: give it a literal event name and an object literal');
    });

    it(`${path}: the events, who each is filed under, and what each carries are the pinned ones`, () => {
      assert.deepEqual(eventsIn(path).calls, expected,
        'A server-side event, its identifier or its properties changed. That changes what is sent about a subscriber: ' +
        'check the privacy notice and add the changelog entry if it needs one (CLAUDE.md, "Privacy Policy is the Source of Truth"), then update EXPECTED here.');
    });
  }

  it('no event is filed under an address, and none carries one', () => {
    for (const [path] of Object.entries(EXPECTED)) {
      for (const call of eventsIn(path).calls) {
        const [, who, keys] = call.split(' | ');
        // A reader's events go under a hash of the address; the sender's own
        // send reports go under the sending address, which is the site's.
        assert.match(who, /^(distinctIdForEmail_\([\w.]+\)|cfg\.fromEmail)$/, call);
        for (const key of keys.split(', ').filter(Boolean)) assert.doesNotMatch(key, /^(email|address|name|token|ip)$/i, call);
      }
    }
  });

  it('the identifier is a hash of the address, in both scripts', () => {
    for (const path of Object.keys(EXPECTED)) {
      const source = fs.readFileSync(path, 'utf8');
      assert.match(source, /function distinctIdForEmail_\(email\) \{\s*return sha256Hex_\((?:String\(email\)\.toLowerCase\(\)\.trim\(\)|normalizeEmail_\(email\))\);\s*\}/, path);
    }
  });
});
