/**
 * Unit tests for src/utils/localRules.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LOCAL_RULE_AREAS, LOCAL_RULE_SOURCES, localRulesSummary } from './localRules.ts';

describe('localRulesSummary', () => {
  it('names one area', () => {
    assert.equal(localRulesSummary(['tax']), 'Rules on tax differ where you live.');
  });

  it('joins two areas with "and"', () => {
    assert.equal(localRulesSummary(['tax', 'deposit-protection']), 'Rules on tax and bank deposits differ where you live.');
  });

  it('joins three or more with commas, keeping the lesson order', () => {
    assert.equal(
      localRulesSummary(['deposit-protection', 'tax', 'investments']),
      'Rules on bank deposits, tax and investment firms differ where you live.',
    );
  });

  it('is empty without areas', () => {
    assert.equal(localRulesSummary([]), '');
  });
});

describe('LOCAL_RULE_SOURCES', () => {
  it('has wording for every area, with no em dashes or double dashes', () => {
    for (const area of LOCAL_RULE_AREAS) {
      const s = LOCAL_RULE_SOURCES[area];
      assert.ok(s.label && s.short && s.where, area);
      assert.doesNotMatch(`${s.label} ${s.short} ${s.where}`, /—|--/, area);
    }
  });
});
