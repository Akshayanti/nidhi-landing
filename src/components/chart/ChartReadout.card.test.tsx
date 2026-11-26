/**
 * The read-out card the free tools' charts share: what it shows and where it
 * sits, drawn to markup, so it needs no browser. Where it is placed beside
 * the crosshair, and how it opens and closes, are in ChartReadout.dom.test.tsx.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChartReadout, type ReadoutPosition, type ReadoutRow } from './ChartReadout.tsx';

const ROWS: ReadoutRow[] = [
  { label: 'Invested', value: '€ 73,191', swatch: 'dot', color: 'var(--chart-1)', strong: true },
  { label: 'Likely range', value: '€ 50,000 to € 90,000', swatch: 'band', color: 'rgb(1, 2, 3)' },
  { label: 'Paid in', value: '€ 40,000', swatch: 'dash', color: 'var(--chart-3)' },
];

const card = ({ position = { left: 30, top: 12 } as ReadoutPosition | null, tag = undefined as string | null | undefined, rows = ROWS } = {}) =>
  renderToStaticMarkup(<ChartReadout title="Year 12" tag={tag} rows={rows} cardRef={{ current: null }} position={position} />);

describe('the read-out card', () => {
  it('lists every value at the point picked, each with its swatch, and marks the row that matters and no other', () => {
    assert.equal(
      card().replace(/^<div[^>]*>/, ''),
      '<div class="chart-readoutTitle">Year 12</div><dl>'
        + '<div class="chart-readoutStrong"><dt><i class="chart-swatch chart-swatch--dot" style="color:var(--chart-1)"></i>Invested</dt><dd>€ 73,191</dd></div>'
        + '<div><dt><i class="chart-swatch chart-swatch--band" style="color:rgb(1, 2, 3)"></i>Likely range</dt><dd>€ 50,000 to € 90,000</dd></div>'
        + '<div><dt><i class="chart-swatch chart-swatch--dash" style="color:var(--chart-3)"></i>Paid in</dt><dd>€ 40,000</dd></div>'
        + '</dl></div>',
    );
  });

  it('is kept from screen readers, which hear the chart\'s own live region, and sits where it is placed, seen', () => {
    assert.match(card(), /^<div class="chart-readout" style="left:30px;top:12px" aria-hidden="true">/);
  });

  it('is drawn unseen in the corner until it has a place, so it can be measured', () => {
    assert.match(card({ position: null }), /^<div class="chart-readout" style="left:0;top:0;visibility:hidden" aria-hidden="true">/);
  });

  it('shows a tag beside the title only when there is one', () => {
    assert.match(card({ tag: 'median' }), /<div class="chart-readoutTitle">Year 12<span class="chart-readoutTag">median<\/span><\/div>/);
    assert.match(card({ tag: null }), /<div class="chart-readoutTitle">Year 12<\/div>/);
    assert.match(card({ tag: '' }), /<div class="chart-readoutTitle">Year 12<\/div>/);
  });
});
