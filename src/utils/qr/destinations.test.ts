import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { DESTINATIONS, buildLink, fileName, normaliseUtm } from './destinations.ts';

// A path is served by `<dir>/index.astro`, `<dir>.astro` or a rest route
// `<dir>/[...path].astro`, both at the root (English) and under [locale].
function hasPage(root: string, path: string): boolean {
  const dir = `${root}${path.replace(/\/$/, '')}`;
  if (path === '/') return existsSync(`${root}/index.astro`);
  return [`${dir}/index.astro`, `${dir}.astro`, `${dir}/[...path].astro`].some((f) => existsSync(f));
}

test('every destination has a page in English and in every other language', () => {
  for (const d of DESTINATIONS) {
    assert.ok(hasPage('src/pages', d.path), `no English page for ${d.path}`);
    assert.ok(hasPage('src/pages/[locale]', d.path), `no localized page for ${d.path}`);
  }
});

test('normaliseUtm keeps a clean slug and shows what typing would send', () => {
  assert.equal(normaliseUtm('  Diwali Mela 2026 '), 'diwali-mela-2026');
  assert.equal(normaliseUtm('Parivaar'), 'parivaar');
  assert.equal(normaliseUtm('a.b  c'), 'a-b-c');
  assert.equal(normaliseUtm('--yoga__'), 'yoga');
  assert.equal(normaliseUtm('परिवार'), '');
  assert.equal(normaliseUtm('x'.repeat(80)).length, 60);
});

test('buildLink tags the address and drops empty parameters', () => {
  assert.equal(
    buildLink({ prefix: 'hi', path: '/', source: 'event', medium: 'print', campaign: 'Parivaar', content: 'qr' }),
    'https://nidhi.today/hi/?utm_source=event&utm_medium=print&utm_campaign=parivaar&utm_content=qr',
  );
  assert.equal(
    buildLink({ prefix: '', path: '/free/', source: '', medium: '', campaign: 'yoga', content: '' }),
    'https://nidhi.today/free/?utm_campaign=yoga',
  );
});

test('buildLink refuses an empty campaign, so no stale code is exported', () => {
  assert.equal(buildLink({ prefix: '', path: '/', source: 'event', medium: 'print', campaign: ' !! ', content: 'qr' }), null);
});

test('buildLink refuses the placeholder campaign until it is replaced', () => {
  const base = { prefix: '', path: '/', source: 'event', medium: 'social_in_person', content: 'qr' };
  assert.equal(buildLink({ ...base, campaign: 'tba' }), null);
  assert.equal(buildLink({ ...base, campaign: ' TBA ' }), null);
  assert.equal(
    buildLink({ ...base, campaign: 'pint-of-view' }),
    'https://nidhi.today/?utm_source=event&utm_medium=social_in_person&utm_campaign=pint-of-view&utm_content=qr',
  );
});

test('fileName uses normalised values only', () => {
  assert.equal(fileName('Diwali Mela', 'hi', 'png'), 'nidhi-qr-diwali-mela-hi.png');
  assert.equal(fileName('../x', 'en', 'svg'), 'nidhi-qr-x-en.svg');
});
