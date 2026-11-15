import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LOCAL_RULE_AREAS, LOCAL_RULE_SOURCES } from './localRules.ts';

describe('"Where to check locally"', () => {
  it('every area a lesson can name has a line, and no line is left without an area', () => {
    assert.deepEqual(Object.keys(LOCAL_RULE_SOURCES).sort(), [...LOCAL_RULE_AREAS].sort());
    assert.equal(new Set(LOCAL_RULE_AREAS).size, LOCAL_RULE_AREAS.length);
  });

  it('each line has a label of its own and says where people check', () => {
    const labels = LOCAL_RULE_AREAS.map((a) => LOCAL_RULE_SOURCES[a].label);
    assert.equal(new Set(labels).size, labels.length);
    for (const area of LOCAL_RULE_AREAS) {
      const { label, where } = LOCAL_RULE_SOURCES[area];
      assert.ok(label.trim().length > 0, area);
      assert.ok(where.trim().length > 10, area);
      // Reads after "check with": a lower-case start and no full stop of its own.
      assert.match(where, /^[a-z]/, area);
      assert.doesNotMatch(where, /\.$/, area);
    }
  });

  it('follows the style rules: no em dashes or double dashes, and no instruction to the reader', () => {
    for (const area of LOCAL_RULE_AREAS) {
      const text = `${LOCAL_RULE_SOURCES[area].label} ${LOCAL_RULE_SOURCES[area].where}`;
      assert.doesNotMatch(text, /—|--/, area);
      assert.doesNotMatch(text, /\b(you should|you must|always|never)\b/i, area);
    }
  });

  it('names no single country', () => {
    for (const area of LOCAL_RULE_AREAS) {
      assert.doesNotMatch(LOCAL_RULE_SOURCES[area].where, /\b(IRS|SEC|FDIC|HMRC|FCA|RBI|SEBI|401\(k\))\b/, area);
    }
  });
});
