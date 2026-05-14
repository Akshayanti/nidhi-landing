/**
 * Unit tests for scripts/indexnow.mjs.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildIndexNowPayload,
  computeDiff,
  hashSitemapPages,
  readSitemapUrls,
  urlToDistPath,
} from './indexnow.mjs';

// ---------------------------------------------------------------------------
// urlToDistPath
// ---------------------------------------------------------------------------

describe('urlToDistPath', () => {
  it('maps the site root to index.html', () => {
    assert.equal(urlToDistPath('https://nidhi.today'), 'index.html');
    assert.equal(urlToDistPath('https://nidhi.today/'), 'index.html');
  });

  it('maps a content page to <path>/index.html (Astro trailingSlash:never)', () => {
    assert.equal(
      urlToDistPath('https://nidhi.today/free/loan-comparison'),
      'free/loan-comparison/index.html',
    );
    assert.equal(
      urlToDistPath('https://nidhi.today/blog/emergency-fund'),
      'blog/emergency-fund/index.html',
    );
  });

  it('strips a trailing slash before adding /index.html', () => {
    assert.equal(
      urlToDistPath('https://nidhi.today/blog/'),
      'blog/index.html',
    );
  });

  it('keeps the path verbatim for URLs that end in a file extension', () => {
    assert.equal(
      urlToDistPath('https://nidhi.today/rss.xml'),
      'rss.xml',
    );
    assert.equal(
      urlToDistPath('https://nidhi.today/sitemap-index.xml'),
      'sitemap-index.xml',
    );
  });

  it('handles deep nesting', () => {
    assert.equal(
      urlToDistPath('https://nidhi.today/a/b/c/d'),
      'a/b/c/d/index.html',
    );
  });

  it('is host-agnostic (works for any site: value)', () => {
    assert.equal(
      urlToDistPath('https://example.com/foo'),
      'foo/index.html',
    );
  });
});

// ---------------------------------------------------------------------------
// computeDiff
// ---------------------------------------------------------------------------

describe('computeDiff', () => {
  it('returns an empty array when manifests are identical', () => {
    const m = { 'https://x.test/a': 'h1', 'https://x.test/b': 'h2' };
    assert.deepEqual(computeDiff(m, m), []);
  });

  it('returns every URL when previous is empty (first-run / cache miss)', () => {
    const current = {
      'https://x.test/a': 'h1',
      'https://x.test/b': 'h2',
    };
    assert.deepEqual(
      computeDiff({}, current).sort(),
      ['https://x.test/a', 'https://x.test/b'],
    );
  });

  it('returns only URLs whose hash changed', () => {
    const previous = {
      'https://x.test/a': 'h1',
      'https://x.test/b': 'h2',
      'https://x.test/c': 'h3',
    };
    const current = {
      'https://x.test/a': 'h1', // unchanged
      'https://x.test/b': 'CHANGED',
      'https://x.test/c': 'h3', // unchanged
    };
    assert.deepEqual(computeDiff(previous, current), ['https://x.test/b']);
  });

  it('returns newly-added URLs', () => {
    const previous = { 'https://x.test/a': 'h1' };
    const current = {
      'https://x.test/a': 'h1',
      'https://x.test/new': 'hN',
    };
    assert.deepEqual(computeDiff(previous, current), ['https://x.test/new']);
  });

  it('does NOT return URLs that were removed in current', () => {
    // IndexNow has no "forget this URL" op; removals are intentionally
    // not surfaced (search engines learn via 404s on recrawl).
    const previous = {
      'https://x.test/a': 'h1',
      'https://x.test/gone': 'h2',
    };
    const current = { 'https://x.test/a': 'h1' };
    assert.deepEqual(computeDiff(previous, current), []);
  });

  it('preserves current insertion order in the output', () => {
    const previous = {};
    const current = {
      'https://x.test/c': 'h',
      'https://x.test/a': 'h',
      'https://x.test/b': 'h',
    };
    assert.deepEqual(
      computeDiff(previous, current),
      ['https://x.test/c', 'https://x.test/a', 'https://x.test/b'],
    );
  });

  it('treats missing-vs-empty-string as a change', () => {
    // Defensive: an entry with an empty hash (filesystem returned empty
    // file, for instance) is "different from missing", so we'd flag it
    // for re-submission. This documents the chosen behaviour.
    assert.deepEqual(
      computeDiff({}, { 'https://x.test/a': '' }),
      ['https://x.test/a'],
    );
  });
});

// ---------------------------------------------------------------------------
// buildIndexNowPayload
// ---------------------------------------------------------------------------

describe('buildIndexNowPayload', () => {
  it('produces the documented IndexNow JSON shape', () => {
    const payload = buildIndexNowPayload({
      urls: ['https://nidhi.today/free/loan-comparison'],
      key: 'abc123',
      host: 'nidhi.today',
    });
    assert.deepEqual(payload, {
      host: 'nidhi.today',
      key: 'abc123',
      keyLocation: 'https://nidhi.today/abc123.txt',
      urlList: ['https://nidhi.today/free/loan-comparison'],
    });
  });

  it('preserves the URL list verbatim (no sorting, no rewriting)', () => {
    // The caller controls ordering and de-duping; this function is a
    // pure formatter. Asserting non-mutation pins the contract.
    const urls = ['https://x.test/b', 'https://x.test/a'];
    const payload = buildIndexNowPayload({ urls, key: 'k', host: 'x.test' });
    assert.deepEqual(payload.urlList, urls);
  });
});

// ---------------------------------------------------------------------------
// readSitemapUrls + hashSitemapPages (filesystem fixtures)
// ---------------------------------------------------------------------------

/**
 * Build a temporary dist/ tree with one sitemap-index.xml referencing
 * one or two sub-sitemaps, each listing some URLs whose corresponding
 * HTML files are written to expected paths.
 *
 * Returns the temp dir path. Cleanup is handled by `t.after`.
 */
function makeFixtureDist(t, { subSitemaps }) {
  const dir = mkdtempSync(join(tmpdir(), 'indexnow-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  // sitemap-index.xml lists each sub-sitemap as a fully-qualified URL.
  const indexLocs = subSitemaps
    .map(({ name }) => `<loc>https://test.local/${name}</loc>`)
    .join('');
  writeFileSync(
    join(dir, 'sitemap-index.xml'),
    `<?xml version="1.0"?><sitemapindex>${indexLocs}</sitemapindex>`,
  );

  for (const { name, urls } of subSitemaps) {
    const locs = urls.map((u) => `<loc>${u.url}</loc>`).join('');
    writeFileSync(
      join(dir, name),
      `<?xml version="1.0"?><urlset>${locs}</urlset>`,
    );
    // Materialise an HTML file for each URL at its expected dist path.
    for (const u of urls) {
      const distPath = urlToDistPath(u.url);
      const fullPath = join(dir, distPath);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, u.body ?? `<html>${u.url}</html>`);
    }
  }
  return dir;
}

describe('readSitemapUrls', () => {
  it('walks sitemap-index and returns URLs from a single sub-sitemap', (t) => {
    const dir = makeFixtureDist(t, {
      subSitemaps: [
        {
          name: 'sitemap-0.xml',
          urls: [
            { url: 'https://test.local/' },
            { url: 'https://test.local/free/loan-comparison' },
            { url: 'https://test.local/blog/foo' },
          ],
        },
      ],
    });
    assert.deepEqual(readSitemapUrls(dir), [
      'https://test.local/',
      'https://test.local/free/loan-comparison',
      'https://test.local/blog/foo',
    ]);
  });

  it('flattens multiple sub-sitemaps and deduplicates across them', (t) => {
    const dir = makeFixtureDist(t, {
      subSitemaps: [
        {
          name: 'sitemap-0.xml',
          urls: [
            { url: 'https://test.local/a' },
            { url: 'https://test.local/b' },
          ],
        },
        {
          name: 'sitemap-1.xml',
          urls: [
            { url: 'https://test.local/b' }, // duplicate
            { url: 'https://test.local/c' },
          ],
        },
      ],
    });
    const urls = readSitemapUrls(dir);
    // Insertion order preserved; duplicate dropped.
    assert.deepEqual(urls, [
      'https://test.local/a',
      'https://test.local/b',
      'https://test.local/c',
    ]);
  });
});

describe('hashSitemapPages', () => {
  it('hashes every URL and returns deterministic, sorted output', (t) => {
    const dir = makeFixtureDist(t, {
      subSitemaps: [
        {
          name: 'sitemap-0.xml',
          urls: [
            { url: 'https://test.local/c', body: 'CCC' },
            { url: 'https://test.local/a', body: 'AAA' },
            { url: 'https://test.local/b', body: 'BBB' },
          ],
        },
      ],
    });
    const out = hashSitemapPages(dir);
    // Keys are sorted alphabetically by URL.
    assert.deepEqual(Object.keys(out), [
      'https://test.local/a',
      'https://test.local/b',
      'https://test.local/c',
    ]);
    // SHA-256 is a 64-char hex string for non-empty input.
    for (const v of Object.values(out)) {
      assert.match(v, /^[a-f0-9]{64}$/);
    }
    // Different bodies must produce different hashes.
    assert.notEqual(out['https://test.local/a'], out['https://test.local/b']);
  });

  it('produces identical output for two builds with identical content', (t) => {
    const fixture = {
      subSitemaps: [
        {
          name: 'sitemap-0.xml',
          urls: [
            { url: 'https://test.local/page', body: '<html>content</html>' },
          ],
        },
      ],
    };
    const dirA = makeFixtureDist(t, fixture);
    const dirB = makeFixtureDist(t, fixture);
    assert.deepEqual(hashSitemapPages(dirA), hashSitemapPages(dirB));
  });

  it('produces different hashes when one URL\'s content changes', (t) => {
    const v1 = makeFixtureDist(t, {
      subSitemaps: [
        {
          name: 'sitemap-0.xml',
          urls: [
            { url: 'https://test.local/a', body: 'v1' },
            { url: 'https://test.local/b', body: 'same' },
          ],
        },
      ],
    });
    const v2 = makeFixtureDist(t, {
      subSitemaps: [
        {
          name: 'sitemap-0.xml',
          urls: [
            { url: 'https://test.local/a', body: 'v2' }, // edited
            { url: 'https://test.local/b', body: 'same' },
          ],
        },
      ],
    });
    const h1 = hashSitemapPages(v1);
    const h2 = hashSitemapPages(v2);
    // Page 'a' changed, page 'b' did not.
    assert.notEqual(h1['https://test.local/a'], h2['https://test.local/a']);
    assert.equal(h1['https://test.local/b'], h2['https://test.local/b']);
    // computeDiff should flag exactly /a and nothing else.
    assert.deepEqual(computeDiff(h1, h2), ['https://test.local/a']);
  });

  it('skips URLs whose static file is missing rather than throwing', (t) => {
    // Build a fixture, then delete one of the HTML files. The hasher
    // should silently skip the missing entry; this protects against an
    // unrelated build glitch from cratering the IndexNow step.
    const dir = makeFixtureDist(t, {
      subSitemaps: [
        {
          name: 'sitemap-0.xml',
          urls: [
            { url: 'https://test.local/exists', body: 'ok' },
            { url: 'https://test.local/missing', body: 'will-be-deleted' },
          ],
        },
      ],
    });
    rmSync(join(dir, 'missing/index.html'));
    const out = hashSitemapPages(dir);
    assert.ok(out['https://test.local/exists']);
    assert.equal(out['https://test.local/missing'], undefined);
  });
});
