/**
 * Unit tests for scripts/lib/publishing/short-link-stub.mjs, and a check that the list
 * of short links in astro.config.mjs is still the list it was.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { cleanPath, isSocialShortLink, readHead, refreshTarget, shortLinkStub } from './short-link-stub.mjs';

const DESTINATION = '/hi/beta/?utm_source=whatsapp&utm_medium=social&utm_campaign=bio&utm_content=beta_link';
const PAGE = [
  '<!DOCTYPE html><html lang="hi"><head><script>var a = 1;</script><meta charset="utf-8">',
  '<title>प्लानर बीटा | nidhi</title><meta name="description" content="मुफ़्त &amp; निमंत्रण से">',
  '<link rel="canonical" href="https://nidhi.today/hi/beta/">',
  '<meta property="og:type" content="website"><meta property="og:url" content="https://nidhi.today/hi/beta/">',
  '<meta property="og:title" content="प्लानर बीटा | nidhi"><meta property="og:image" content="https://nidhi.today/brand/social/og-image.png">',
  '<meta name="twitter:card" content="summary_large_image">',
  '</head><body><meta property="og:title" content="not in the head"></body></html>',
].join('');

describe('isSocialShortLink', () => {
  it('is a bio link, not a renamed page or a poster code', () => {
    assert.ok(isSocialShortLink(DESTINATION));
    assert.ok(!isSocialShortLink('/free/multi-currency-net-worth/'));
    assert.ok(!isSocialShortLink('/free/?utm_source=poster&utm_medium=print&utm_campaign=yoga&utm_content=typed'));
  });
});

describe('readHead', () => {
  it('reads the language, title, description and card from the head only', () => {
    const head = readHead(PAGE);
    assert.equal(head.lang, 'hi');
    assert.equal(head.title, 'प्लानर बीटा | nidhi');
    assert.equal(head.description, '<meta name="description" content="मुफ़्त &amp; निमंत्रण से">');
    assert.equal(head.social.length, 4);
    assert.ok(!head.social.some((tag) => tag.includes('og:url') || tag.includes('not in the head')));
  });
});

describe('shortLinkStub', () => {
  const html = shortLinkStub({ destination: DESTINATION, head: readHead(PAGE), site: 'https://nidhi.today' });

  it('sends the browser to the same address, campaign parameters included', () => {
    assert.equal(refreshTarget(html), DESTINATION);
    assert.ok(html.includes(`<a href="${DESTINATION.replace(/&/g, '&amp;')}">`));
  });

  it('carries the destination\'s language, title, description and card', () => {
    assert.ok(html.includes('<html lang="hi">'));
    assert.ok(html.includes('<title>प्लानर बीटा | nidhi</title>'));
    assert.ok(html.includes('<meta name="description" content="मुफ़्त &amp; निमंत्रण से">'));
    assert.ok(html.includes('<meta property="og:image" content="https://nidhi.today/brand/social/og-image.png">'));
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  });

  it('states the destination without its parameters as canonical and og:url', () => {
    assert.equal(cleanPath(DESTINATION), '/hi/beta/');
    assert.ok(html.includes('<link rel="canonical" href="https://nidhi.today/hi/beta/">'));
    assert.ok(html.includes('<meta property="og:url" content="https://nidhi.today/hi/beta/">'));
    assert.equal(html.match(/og:url/g).length, 1);
    assert.ok(!/(canonical|og:url)[^>]*utm_/.test(html));
  });

  it('stays out of search and loads nothing', () => {
    assert.ok(html.includes('<meta name="robots" content="noindex">'));
    assert.doesNotMatch(html, /<script|<link rel="stylesheet"|<img|<iframe/);
  });

  it('refuses a destination that states no card', () => {
    assert.throws(
      () => shortLinkStub({ destination: DESTINATION, head: readHead('<html lang="hi"><head><title>x</title></head></html>'), site: 'https://nidhi.today' }),
      /states no description, og:image/,
    );
  });
});

describe('the short links in astro.config.mjs', () => {
  // The addresses are printed in bios and on posters and cannot be recalled,
  // and analytics tell the visits apart by these parameters. This pins the
  // whole list: a link added on purpose is added here too; one that changed
  // or went missing by accident fails.
  const config = readFileSync('astro.config.mjs', 'utf8');
  const block = config.slice(config.indexOf('const REDIRECTS = {'), config.indexOf('\n};', config.indexOf('const REDIRECTS = {')));
  const entries = [...block.matchAll(/^\s*'([^']+)':\s*'([^']+)',$/gm)].map((m) => [m[1], m[2]]);
  const locales = ['', '/hi', '/es', '/cs', '/mr'];
  const platforms = { ig: 'instagram', tg: 'telegram', wa: 'whatsapp', dsc: 'discord' };
  const social = (path, code, content) =>
    [`${path}${code}/`, `${path}?utm_source=${platforms[code]}&utm_medium=social&utm_campaign=bio&utm_content=${content}`];
  const expected = [
    ['/free/currency-risk/', '/free/multi-currency-net-worth/'],
    ...locales.map((l) => [`${l}/blog/tag/spending/`, `${l}/blog/tag/psychology/`]),
    ...locales.flatMap((l) => Object.keys(platforms).map((code) => social(`${l}/`, code, 'home_link'))),
    ...Object.keys(platforms).map((code) => social('/blog/', code, 'blog_link')),
    social('/how-to/', 'ig', 'howto_link'),
    ...locales.flatMap((l) => Object.keys(platforms).map((code) => social(`${l}/beta/`, code, 'beta_link'))),
    ['/improv/', '/?utm_source=poster&utm_medium=print&utm_campaign=improv_shows&utm_content=typed'],
    ['/cs/plakat/', '/cs/free/?utm_source=poster&utm_medium=print&utm_campaign=plakat&utm_content=typed'],
    ['/hi/parivar/', '/hi/free/?utm_source=poster&utm_medium=print&utm_campaign=family&utm_content=typed'],
    ['/yoga/', '/free/?utm_source=poster&utm_medium=print&utm_campaign=yoga&utm_content=typed'],
  ];

  it('are the 55 addresses they were, each with the destination it had', () => {
    const sort = (list) => [...list].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    assert.equal(entries.length, 55);
    assert.deepEqual(sort(entries), sort(expected));
  });

  it('45 of them are social links, which get the richer page', () => {
    assert.equal(entries.filter(([, to]) => isSocialShortLink(to)).length, 45);
  });
});
