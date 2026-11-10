import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDE_LAYERS, HUB_GROUP_PREVIEW, REVIEW_AT, SITUATION_MIN_GUIDES,
  filtersShown, groupPageIds, guideFacets, hubGroupView, reviewNotices, situationBuilt,
  type LayerFlags,
} from './guideLayers.ts';

const OFF: LayerFlags = { groupPagesPublic: false, situationPagesPublic: false, filtersVisible: false };
const ON: LayerFlags = { groupPagesPublic: true, situationPagesPublic: true, filtersVisible: true };

describe('How-to layers', () => {
  // Turning a layer on changes this test in the same commit, so it is a deliberate act.
  it('ship switched off: the council turns each one on after its review', () => {
    assert.deepEqual(GUIDE_LAYERS, OFF);
  });

  it('group pages: none while off; one per group with a guide when on', () => {
    const counts = { month: 3, owe: 12, stock: 0 };
    assert.deepEqual(groupPageIds(counts, OFF), []);
    assert.deepEqual(groupPageIds(counts, ON), ['month', 'owe']);
  });

  it('hub groups: every guide while off; a preview and a page link when on and the group is long', () => {
    assert.deepEqual(hubGroupView(12, OFF), { show: 12, linkToPage: false });
    assert.deepEqual(hubGroupView(12, ON), { show: HUB_GROUP_PREVIEW, linkToPage: true });
    assert.deepEqual(hubGroupView(HUB_GROUP_PREVIEW, ON), { show: HUB_GROUP_PREVIEW, linkToPage: false });
  });

  it('situation pages: never while off; when on, only with enough live guides', () => {
    assert.equal(situationBuilt(10, OFF), false);
    assert.equal(situationBuilt(SITUATION_MIN_GUIDES, ON), true);
    assert.equal(situationBuilt(SITUATION_MIN_GUIDES - 1, ON), false);
  });

  it('filters: hidden while off; when on, only with a facet that has more than one value', () => {
    const facets = guideFacets([{ group: 'month' }, { group: 'owe' }, { group: 'owe' }]);
    assert.deepEqual(facets, [{ id: 'group', values: [{ id: 'month', count: 1 }, { id: 'owe', count: 2 }] }]);
    assert.equal(filtersShown(facets, OFF), false);
    assert.equal(filtersShown(facets, ON), true);
    assert.equal(filtersShown(guideFacets([{ group: 'owe' }]), ON), false);
  });

  it('prints a review notice at each count, only for layers still off', () => {
    assert.deepEqual(reviewNotices({ guides: 12, largestGroup: 4 }, OFF), []);
    assert.equal(reviewNotices({ guides: 12, largestGroup: REVIEW_AT.groupGuides }, OFF).length, 1);
    assert.equal(reviewNotices({ guides: REVIEW_AT.situationsHub, largestGroup: 4 }, OFF).length, 2);
    assert.equal(reviewNotices({ guides: REVIEW_AT.filtersHub, largestGroup: 4 }, OFF).length, 3);
    assert.deepEqual(reviewNotices({ guides: 100, largestGroup: 40 }, ON), []);
  });
});
