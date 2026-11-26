/**
 * The rules for excusing a known browser-check failure (scripts/lib/checks/known-failures.mjs),
 * as the council agreed them on Nov 21, 2026, and the entries in use today.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, KNOWN_FAILURES, entryProblem, inPages, splitKnown, todayUTC } from './known-failures.mjs';

const TODAY = '2026-11-21';
const entry = (over = {}) => ({
  check: 'axe', rule: 'target-size', element: '#a > button:nth-of-type(2)', pages: ['/free/x/'],
  issue: '#1', added: '2026-11-21', until: '2026-12-21', reason: 'Tracked; fixed with the layout change.', ...over,
});
const problem = (over = {}) => ({ check: 'axe', rule: 'target-size', page: '/free/x/', element: '#a > button:nth-of-type(2)', message: 'm', ...over });

describe('a known-failure entry', () => {
  it('is usable when every field is right', () => {
    assert.equal(entryProblem(entry(), TODAY), null);
  });

  it('needs every field', () => {
    for (const field of ['check', 'rule', 'element', 'pages', 'issue', 'added', 'until', 'reason']) {
      assert.ok(entryProblem(entry({ [field]: undefined }), TODAY), field);
    }
  });

  it('takes no wildcard in the rule or the element', () => {
    assert.match(entryProblem(entry({ rule: 'target-*' }), TODAY), /exact/);
    assert.match(entryProblem(entry({ element: 'button*' }), TODAY), /wildcard/);
  });

  it('cannot excuse a page-level finding', () => {
    for (const rule of ['smoke', 'overflow', 'http', 'error']) assert.match(entryProblem(entry({ check: 'audit', rule }), TODAY), /whole page/, rule);
  });

  it('names pages as a list of paths or one route family', () => {
    assert.equal(entryProblem(entry({ pages: 'lessons' }), TODAY), null);
    assert.equal(entryProblem(entry({ pages: 'tool:loan-comparison' }), TODAY), null);
    assert.match(entryProblem(entry({ pages: 'everything' }), TODAY), /pages must be/);
    assert.match(entryProblem(entry({ pages: [] }), TODAY), /pages must list/);
    assert.match(entryProblem(entry({ pages: ['free/x/'] }), TODAY), /pages must list/);
  });

  it('lasts at most 30 days from the day it was added', () => {
    assert.equal(entryProblem(entry({ until: '2026-12-21' }), TODAY), null);
    assert.match(entryProblem(entry({ until: '2026-12-22' }), TODAY), /31 days after added; the most is 30/);
    assert.match(entryProblem(entry({ until: '2026-11-21' }), TODAY), /after added/);
    assert.match(entryProblem(entry({ until: '2026-11-20' }), TODAY), /after added/);
  });

  it('cannot be dated in the future', () => {
    assert.match(entryProblem(entry({ added: '2030-01-01', until: '2030-01-31' }), TODAY), /after today/);
  });

  it('ends after its until day', () => {
    assert.equal(entryProblem(entry({ added: '2026-11-01', until: '2026-11-21' }), TODAY), null, 'usable on its last day');
    assert.match(entryProblem(entry({ added: '2026-11-01', until: '2026-11-20' }), TODAY), /ended on 2026-11-20/);
  });

  it('takes only real calendar dates and an issue number', () => {
    assert.match(entryProblem(entry({ added: '21-11-2026' }), TODAY), /added must be/);
    assert.match(entryProblem(entry({ until: 'soon' }), TODAY), /until must be/);
    assert.match(entryProblem(entry({ issue: '123' }), TODAY), /issue/);
  });
});

describe('route families', () => {
  it('lessons are /blog/<slug>/, not the hubs, levels or tags', () => {
    assert.ok(FAMILIES.lessons('/blog/emergency-fund/'));
    for (const p of ['/blog/', '/blog/discovery/', '/blog/tag/tax/', '/hi/blog/emergency-fund/', '/blog/glossary/']) assert.ok(!FAMILIES.lessons(p), p);
  });

  it('How-to guides are /how-to/<slug>/, not the hub or a situation page', () => {
    assert.ok(FAMILIES['how-to-guides']('/how-to/open-an-account/'));
    for (const p of ['/how-to/', '/hi/how-to/', '/how-to/situation/student/']) assert.ok(!FAMILIES['how-to-guides'](p), p);
  });

  it('a tool family is that tool in every edition, and no other page', () => {
    assert.ok(inPages('tool:invest-or-pay-off', '/free/invest-or-pay-off/'));
    assert.ok(inPages('tool:invest-or-pay-off', '/mr/free/invest-or-pay-off/'));
    assert.ok(!inPages('tool:invest-or-pay-off', '/free/loan-comparison/'));
    assert.ok(!inPages('tool:invest', '/free/invest-or-pay-off/'));
  });
});

describe('splitting a run by its entries', () => {
  it('excuses only the exact element, so a second element sharing a class still fails', () => {
    const r = splitKnown([problem(), problem({ element: '#a > button:nth-of-type(3)' })], [entry()], TODAY);
    assert.equal(r.known.length, 1);
    assert.equal(r.fresh.length, 1);
    assert.equal(r.fresh[0].element, '#a > button:nth-of-type(3)');
  });

  it('excuses a class at one measured value, and not the same class at another', () => {
    const e = entry({ check: 'audit', rule: 'text-under-13px', element: 'span.ref-external @ 12.24px', pages: 'lessons' });
    const at = (element, ruleElement, page = '/blog/a/') => ({ check: 'audit', rule: 'text-under-13px', page, element, ruleElement, message: 'm' });
    const r = splitKnown([
      at('p > span.ref-external:nth-of-type(1) @ 12.24px', 'span.ref-external @ 12.24px'),
      at('p > span.ref-external:nth-of-type(2) @ 12.24px', 'span.ref-external @ 12.24px', '/blog/b/'),
      at('p > span.ref-external:nth-of-type(3) @ 11px', 'span.ref-external @ 11px'),
      at('span.ref-external @ 12.24px', 'span.ref-external @ 12.24px', '/about/'),
    ], [e], TODAY);
    assert.equal(r.known.length, 2);
    assert.deepEqual(r.fresh.map((p) => p.page), ['/blog/a/', '/about/']);
  });

  it('never excuses a page-level finding, whatever the entries say', () => {
    const r = splitKnown([problem({ check: 'smoke', rule: 'smoke', element: '' })], [entry({ check: 'smoke', rule: 'smoke', element: 'x' })], TODAY);
    assert.equal(r.fresh.length, 1);
    assert.equal(r.invalid.length, 1);
  });

  it('reports an entry that cannot be used, and one that matched nothing', () => {
    const r = splitKnown([], [entry({ until: '2026-11-01', added: '2026-10-25' }), entry({ issue: '#2' })], TODAY);
    assert.equal(r.invalid.length, 1);
    assert.deepEqual(r.unmatched.map((e) => e.issue), ['#2']);
  });
});

describe('the entries in use', () => {
  it('every one is usable today', () => {
    for (const e of KNOWN_FAILURES) assert.equal(entryProblem(e, todayUTC()), null, `${e.issue} ${e.rule} ${e.element}`);
  });
});
