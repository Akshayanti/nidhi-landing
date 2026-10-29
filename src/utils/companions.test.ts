/**
 * Unit tests for src/utils/companions.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertCompanionHosts, assertCompanionOrder } from './companions.ts';

const NOW = new Date('2026-10-29');

function post(slug: string, level: string, pubDate: string, companionOf?: string) {
  return { data: { slug, title: slug, level, pubDate: new Date(pubDate), companionOf } };
}

const host = post('life-events', 'optimizing', '2026-10-20');

describe('companion hosts', () => {
  it('passes a live guide whose host is live', () => {
    assert.doesNotThrow(() => assertCompanionHosts([host, post('guide', 'inclusive-finances', '2026-10-21', 'life-events')], NOW));
  });

  it('passes a guide that is not live yet, with or without a host', () => {
    assert.doesNotThrow(() => assertCompanionHosts([host, post('later', 'inclusive-finances', '2099-01-01')], NOW));
    assert.doesNotThrow(() => assertCompanionHosts([post('host-later', 'mastery', '2099-01-01'), post('later', 'inclusive-finances', '2099-01-02', 'host-later')], NOW));
  });

  it('names a live guide with no host', () => {
    assert.throws(() => assertCompanionHosts([host, post('alone', 'inclusive-finances', '2026-10-21')], NOW), /alone -> \(no host\)/);
  });

  it('names a live guide whose host is still scheduled', () => {
    assert.throws(
      () => assertCompanionHosts([post('host-later', 'mastery', '2099-01-01'), post('early', 'inclusive-finances', '2026-10-21', 'host-later')], NOW),
      /early -> host-later/,
    );
  });

  it('names a live companion whose host slug does not exist', () => {
    assert.throws(() => assertCompanionHosts([post('guide', 'inclusive-finances', '2026-10-21', 'no-such-lesson')], NOW), /does not exist/);
  });
});

describe('companion order', () => {
  const lesson = (slug: string, level = 'optimizing') => post(slug, level, '2026-10-01');
  const guide = (slug: string, host?: string) => post(slug, 'inclusive-finances', '2026-10-02', host);

  it('passes a guide right after its host, and a guide on a guide after that', () => {
    assert.doesNotThrow(() => assertCompanionOrder([lesson('a'), guide('g1', 'a'), guide('g2', 'g1'), lesson('b')]));
  });

  it('names a guide with a lesson between it and its host', () => {
    assert.throws(() => assertCompanionOrder([lesson('a'), lesson('b'), guide('g', 'a')]), /g -> a/);
  });

  it('names a guide that comes before its host, or in another level', () => {
    assert.throws(() => assertCompanionOrder([guide('g', 'a'), lesson('a')]), /g -> a/);
    assert.throws(() => assertCompanionOrder([lesson('a', 'psychology'), lesson('b', 'optimizing'), guide('g', 'a')]), /g -> a/);
  });

  it('skips a guide whose host is not visible, and a guide with no host', () => {
    assert.doesNotThrow(() => assertCompanionOrder([lesson('a'), guide('g', 'not-yet-written'), guide('h')]));
  });
});
