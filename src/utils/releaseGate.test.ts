import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isReleased, releaseDate } from './releaseGate.ts';

const pub = new Date('2026-11-04T00:00:00Z');
const before = new Date('2026-11-03T23:59:59Z');
const after = new Date('2026-11-04T05:30:00Z');

describe('launch gates', () => {
  it('a build before the lesson goes out leaves the tool out', () => {
    assert.equal(isReleased(pub, before, false), false);
    assert.equal(releaseDate(pub, before, false), null);
  });

  it('opens at the very moment of the pubDate, and stays open', () => {
    assert.equal(isReleased(pub, pub, false), true);
    assert.equal(isReleased(pub, after, false), true);
    assert.equal(releaseDate(pub, after, false), pub);
  });

  it('no host lesson means no launch', () => {
    assert.equal(isReleased(null, after, false), false);
    assert.equal(releaseDate(null, after, false), null);
  });

  it('the dev server shows everything, dated now until the real date has passed', () => {
    assert.equal(isReleased(pub, before, true), true);
    assert.equal(isReleased(null, before, true), true);
    assert.equal(releaseDate(pub, before, true), before);
    assert.equal(releaseDate(null, before, true), before);
    assert.equal(releaseDate(pub, after, true), pub);
  });

  it('the two gates use this rule and take a clock', async () => {
    const { readFileSync } = await import('node:fs');
    for (const file of ['monte-carlo/release.ts', 'invest-or-pay-off/release.ts']) {
      const src = readFileSync(new URL(file, import.meta.url), 'utf8');
      assert.match(src, /return isReleased\(await hostPubDate\(\), now, import\.meta\.env\.DEV\);/, file);
      assert.match(src, /return releaseDate\(await hostPubDate\(\), now, import\.meta\.env\.DEV\);/, file);
      assert.doesNotMatch(src.replace(/now: Date = new Date\(\)/g, ''), /new Date\(/, `${file} reads the clock on its own`);
    }
  });
});
