/**
 * Unit tests for scripts/lib/audit-exceptions.mjs.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EXCEPTIONS, advisoryId, judge } from './audit-exceptions.mjs';

const advisory = (id, severity = 'high') => ({ source: 1, title: `title of ${id}`, url: `https://github.com/advisories/${id}`, severity, range: '<=1.0.0' });
const A = 'GHSA-aaaa-bbbb-cccc';
const B = 'GHSA-dddd-eeee-ffff';
// One advisory in `glob`, and two packages listed only because they depend on it.
const report = {
  vulnerabilities: {
    glob: { severity: 'high', via: [advisory(A)] },
    builder: { severity: 'high', via: ['glob'] },
    site: { severity: 'high', via: ['builder'] },
  },
};

describe('advisoryId', () => {
  it('reads the GHSA id out of an advisory address', () => {
    assert.equal(advisoryId('https://github.com/advisories/GHSA-fc5q-39xc-vjpf'), 'GHSA-fc5q-39xc-vjpf');
  });

  it('keeps an address that has no GHSA id, so it can never match an exception by accident', () => {
    assert.equal(advisoryId('https://example.test/advisory/1'), 'https://example.test/advisory/1');
    assert.equal(advisoryId(undefined), '');
  });
});

describe('judge', () => {
  it('blocks on a high advisory that has no exception', () => {
    const { blocking, excepted } = judge(report, [], '2026-11-17');
    assert.deepEqual(blocking.map((b) => b.id), [A]);
    assert.deepEqual(excepted, []);
  });

  it('counts an advisory once, however many packages depend on the vulnerable one', () => {
    const { blocking } = judge(report, [], '2026-11-17');
    assert.equal(blocking.length, 1);
    assert.deepEqual(blocking[0].packages, ['glob']);
  });

  it('lets an advisory through while its exception lasts, the last day included', () => {
    const exceptions = [{ id: A, until: '2026-12-17', reason: 'no fix yet' }];
    assert.deepEqual(judge(report, exceptions, '2026-11-17').blocking, []);
    assert.deepEqual(judge(report, exceptions, '2026-12-17').blocking, []);
    assert.equal(judge(report, exceptions, '2026-12-17').excepted[0].reason, 'no fix yet');
  });

  it('blocks again from the day after the exception ends, and says the exception ran out', () => {
    const exceptions = [{ id: A, until: '2026-12-17', reason: 'no fix yet' }];
    const { blocking, excepted } = judge(report, exceptions, '2026-12-18');
    assert.deepEqual(blocking.map((b) => [b.id, b.expired]), [[A, '2026-12-17']]);
    assert.deepEqual(excepted, []);
  });

  it('covers only the advisory named: another one in the same report still blocks', () => {
    const two = { vulnerabilities: { glob: { via: [advisory(A), advisory(B, 'critical')] } } };
    const { blocking, excepted } = judge(two, [{ id: A, until: '2026-12-17', reason: 'no fix yet' }], '2026-11-17');
    assert.deepEqual(blocking.map((b) => b.id), [B]);
    assert.deepEqual(excepted.map((e) => e.id), [A]);
  });

  it('ignores moderate and low advisories, as the check always has', () => {
    const mild = { vulnerabilities: { glob: { via: [advisory(A, 'moderate'), advisory(B, 'low')] } } };
    assert.deepEqual(judge(mild, [], '2026-11-17'), { blocking: [], excepted: [] });
  });

  it('passes a report with nothing in it', () => {
    assert.deepEqual(judge({}, EXCEPTIONS, '2026-11-17'), { blocking: [], excepted: [] });
    assert.deepEqual(judge({ vulnerabilities: {} }, EXCEPTIONS, '2026-11-17'), { blocking: [], excepted: [] });
  });
});

describe('EXCEPTIONS', () => {
  it('gives every exception a GHSA id, a last day and a reason', () => {
    for (const e of EXCEPTIONS) {
      assert.match(e.id, /^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/);
      assert.match(e.until, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(e.reason.length > 40, `${e.id}: say why`);
    }
  });

  it('names each advisory once', () => {
    assert.equal(new Set(EXCEPTIONS.map((e) => e.id)).size, EXCEPTIONS.length);
  });
});
