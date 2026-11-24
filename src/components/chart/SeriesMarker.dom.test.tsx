/**
 * The shape that goes with a chart series (WCAG 1.4.1): which shape each
 * series slot gets, and what is drawn for it on a chart and beside a name.
 * The markers are drawn to markup and read as a browser would be given them;
 * nothing here needs a layout.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkerGlyph, SERIES_MARKER_COUNT, SeriesMarker, seriesMarker } from './SeriesMarker.tsx';

/** A marker of slot `index`, 12 units wide, centred on (20, 30), in red. */
const glyph = (index: number, more: Partial<ComponentProps<typeof MarkerGlyph>> = {}) =>
  renderToStaticMarkup(<MarkerGlyph index={index} cx={20} cy={30} r={6} color="red" {...more} />);

const FILLED = 'style="stroke:red;fill:red;stroke-width:0;stroke-linejoin:round"';
const OUTLINE = 'style="stroke:red;fill:none;stroke-width:2.52;stroke-linejoin:round"';
const LINES = 'style="stroke:red;fill:none;stroke-width:3.15;stroke-linecap:round"';

describe('the shape of a series slot', () => {
  it('gives the first five series a filled circle, square, triangle, diamond and cross', () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4].map(seriesMarker),
      [
        { shape: 'circle', hollow: false },
        { shape: 'square', hollow: false },
        { shape: 'triangle', hollow: false },
        { shape: 'diamond', hollow: false },
        { shape: 'cross', hollow: false },
      ],
    );
  });

  it('gives the next five the same shapes as outlines', () => {
    assert.deepEqual(
      [5, 6, 7, 8, 9].map(seriesMarker),
      [
        { shape: 'circle', hollow: true },
        { shape: 'square', hollow: true },
        { shape: 'triangle', hollow: true },
        { shape: 'diamond', hollow: true },
        { shape: 'cross', hollow: true },
      ],
    );
  });

  it('gives the eleventh a plus', () => {
    assert.deepEqual(seriesMarker(10), { shape: 'plus', hollow: false });
  });

  it('starts again after eleven series, and counts back from the end below zero', () => {
    assert.equal(SERIES_MARKER_COUNT, 11);
    assert.deepEqual(seriesMarker(11), seriesMarker(0));
    assert.deepEqual(seriesMarker(17), seriesMarker(6));
    assert.deepEqual(seriesMarker(32), seriesMarker(10));
    assert.deepEqual(seriesMarker(-1), seriesMarker(10));
    assert.deepEqual(seriesMarker(-12), seriesMarker(10));
    assert.deepEqual(seriesMarker(-7), seriesMarker(4));
  });
});

describe('a marker drawn on a chart', () => {
  it('fills a circle as wide as the marker', () => {
    assert.equal(glyph(0), `<g><circle cx="20" cy="30" r="6" ${FILLED}></circle></g>`);
  });

  it('fills a square, a little inside the circle so the two weigh the same', () => {
    assert.equal(glyph(1), `<g><rect x="14.72" y="24.72" width="10.56" height="10.56" ${FILLED}></rect></g>`);
  });

  it('fills a triangle that points up', () => {
    assert.equal(glyph(2), `<g><path d="M20 23.7 L26.3 35.1 L13.7 35.1 Z" ${FILLED}></path></g>`);
  });

  it('fills a diamond', () => {
    assert.equal(glyph(3), `<g><path d="M20 23.1 L26.9 30 L20 36.9 L13.1 30 Z" ${FILLED}></path></g>`);
  });

  it('draws a cross as two round-ended lines with nothing filled', () => {
    assert.equal(glyph(4), `<g><g><path d="M15.32 25.32 L24.68 34.68 M24.68 25.32 L15.32 34.68" ${LINES}></path></g></g>`);
  });

  it('draws an outline inside the marker, its line taken off the shape', () => {
    assert.equal(glyph(5), `<g><circle cx="20" cy="30" r="4.74" ${OUTLINE}></circle></g>`);
    assert.equal(glyph(6), `<g><rect x="15.83" y="25.83" width="8.34" height="8.34" ${OUTLINE}></rect></g>`);
    assert.equal(glyph(7), `<g><path d="M20 25.02 L24.98 34.03 L15.02 34.03 Z" ${OUTLINE}></path></g>`);
    assert.equal(glyph(8), `<g><path d="M20 24.55 L25.45 30 L20 35.45 L14.55 30 Z" ${OUTLINE}></path></g>`);
  });

  it('draws an outlined cross as a cross in a ring', () => {
    assert.equal(
      glyph(9),
      '<g><g><path d="M15.32 25.32 L24.68 34.68 M24.68 25.32 L15.32 34.68" ' + LINES + '></path>'
        + '<circle cx="20" cy="30" r="6.9" style="stroke:red;fill:none;stroke-width:2.02"></circle></g></g>',
    );
  });

  it('draws a plus as wide as the marker, with no ring', () => {
    assert.equal(glyph(10), `<g><g><path d="M14 30 L26 30 M20 24 L20 36" ${LINES}></path></g></g>`);
  });

  it('never draws a line thinner than 1.5 units', () => {
    // A marker 4 units wide: 0.42 of its half width would be a line of 0.84.
    assert.equal(
      glyph(5, { r: 2 }),
      '<g><circle cx="20" cy="30" r="1.25" style="stroke:red;fill:none;stroke-width:1.5;stroke-linejoin:round"></circle></g>',
    );
  });

  it('takes the class it is given', () => {
    assert.equal(glyph(0, { className: 'chart-endMark' }), `<g class="chart-endMark"><circle cx="20" cy="30" r="6" ${FILLED}></circle></g>`);
  });
});

describe('a marker with a halo', () => {
  it('draws the same shape underneath first, filled and 3 units wider', () => {
    assert.equal(
      glyph(0, { halo: 'white' }),
      '<g><circle cx="20" cy="30" r="6" style="stroke:white;fill:white;stroke-width:3;stroke-linejoin:round"></circle>'
        + `<circle cx="20" cy="30" r="6" ${FILLED}></circle></g>`,
    );
  });

  it('leaves the inside of an outline empty in the halo too', () => {
    assert.equal(
      glyph(6, { halo: 'white' }),
      '<g><rect x="15.83" y="25.83" width="8.34" height="8.34" style="stroke:white;fill:none;stroke-width:5.52;stroke-linejoin:round"></rect>'
        + `<rect x="15.83" y="25.83" width="8.34" height="8.34" ${OUTLINE}></rect></g>`,
    );
  });

  it('widens both the lines and the ring of an outlined cross', () => {
    const cross = 'd="M15.32 25.32 L24.68 34.68 M24.68 25.32 L15.32 34.68"';
    assert.equal(
      glyph(9, { halo: 'white' }),
      `<g><g><path ${cross} style="stroke:white;fill:none;stroke-width:6.15;stroke-linecap:round"></path>`
        + '<circle cx="20" cy="30" r="6.9" style="stroke:white;fill:none;stroke-width:5.02"></circle></g>'
        + `<g><path ${cross} ${LINES}></path>`
        + '<circle cx="20" cy="30" r="6.9" style="stroke:red;fill:none;stroke-width:2.02"></circle></g></g>',
    );
  });
});

describe('a marker beside a series name', () => {
  it('is a small decorative drawing, 14 px unless told otherwise', () => {
    assert.equal(
      renderToStaticMarkup(<SeriesMarker index={1} color="red" />),
      '<svg class="chart-marker" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">'
        + '<g><rect x="2.72" y="2.72" width="10.56" height="10.56" ' + FILLED + '></rect></g></svg>',
    );
  });

  it('takes a size and a class of its own', () => {
    assert.equal(
      renderToStaticMarkup(<SeriesMarker index={10} color="var(--chart-3)" size={20} className="legend-mark" />),
      '<svg class="chart-marker legend-mark" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false">'
        + '<g><g><path d="M2 8 L14 8 M8 2 L8 14" style="stroke:var(--chart-3);fill:none;stroke-width:3.15;stroke-linecap:round"></path></g></g></svg>',
    );
  });
});
