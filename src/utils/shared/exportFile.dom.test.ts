/**
 * Tests for the download and the print in src/utils/shared/exportFile.ts.
 *
 * They run against jsdom, with the browser's own parts (the object address,
 * the click, the timer, the print dialog) replaced by stand-ins that record
 * what they were asked to do.
 *
 * Run with:  npm test
 */
import { window } from '../../../test/dom.ts';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { downloadBlob, downloadWorkbook, isoDate, printResults } from './exportFile.ts';
import { buildXlsx, type Sheet } from './xlsx.ts';

interface Click {
  tag: string;
  href: string;
  download: string;
  rel: string;
  inDocument: boolean;
}

const real = {
  createObjectURL: URL.createObjectURL,
  revokeObjectURL: URL.revokeObjectURL,
  click: window.HTMLElement.prototype.click,
  setTimeout: window.setTimeout,
  print: window.print,
};

let blobs: Blob[];
let revoked: string[];
let clicks: Click[];
let timers: { run: () => void; ms: number | undefined }[];
let prints: number;

beforeEach(() => {
  blobs = [];
  revoked = [];
  clicks = [];
  timers = [];
  prints = 0;
  URL.createObjectURL = (blob: Blob) => {
    blobs.push(blob);
    return `blob:https://nidhi.today/${blobs.length}`;
  };
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url);
  };
  // The click is recorded, not followed: jsdom has nowhere to download to.
  window.HTMLElement.prototype.click = function (this: HTMLAnchorElement) {
    clicks.push({ tag: this.tagName, href: this.href, download: this.download, rel: this.rel, inDocument: this.isConnected });
  };
  window.setTimeout = ((run: () => void, ms?: number) => {
    timers.push({ run, ms });
    return timers.length;
  }) as typeof window.setTimeout;
  window.print = () => {
    prints += 1;
  };
});

afterEach(() => {
  URL.createObjectURL = real.createObjectURL;
  URL.revokeObjectURL = real.revokeObjectURL;
  window.HTMLElement.prototype.click = real.click;
  window.setTimeout = real.setTimeout;
  window.print = real.print;
});

describe('downloadBlob', () => {
  it('clicks a link to the file, under the name it is given, that is never part of the page', () => {
    const blob = new Blob(['a,b'], { type: 'text/csv' });
    downloadBlob(blob, 'nidhi-net-worth-2026-10-28.csv');
    assert.deepEqual(blobs, [blob]);
    assert.deepEqual(clicks, [{ tag: 'A', href: 'blob:https://nidhi.today/1', download: 'nidhi-net-worth-2026-10-28.csv', rel: 'noopener', inDocument: false }]);
    assert.equal(document.querySelectorAll('a').length, 0);
  });

  it('lets go of the file a minute later, not before', () => {
    downloadBlob(new Blob(['x']), 'x.csv');
    assert.deepEqual(revoked, [], 'a slow phone is still reading the file');
    assert.deepEqual(timers.map((t) => t.ms), [60_000]);
    timers[0].run();
    assert.deepEqual(revoked, ['blob:https://nidhi.today/1']);
  });
});

describe('downloadWorkbook', () => {
  const sheets: Sheet[] = [{ name: 'About', rows: [['Field', 'Value'], ['Rate', { n: 4.5, fmt: 'decimal2' }]] }];

  it('downloads the sheets as a spreadsheet named by tool and date', async () => {
    const before = isoDate(new Date());
    downloadWorkbook(sheets, 'loan-comparison');
    const after = isoDate(new Date());
    assert.equal(blobs.length, 1);
    assert.equal(blobs[0].type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.deepEqual(new Uint8Array(await blobs[0].arrayBuffer()), buildXlsx(sheets));
    assert.equal(clicks.length, 1);
    assert.ok([before, after].map((day) => `nidhi-loan-comparison-${day}.xlsx`).includes(clicks[0].download), clicks[0].download);
    assert.equal(clicks[0].href, 'blob:https://nidhi.today/1');
  });
});

describe('printResults', () => {
  it('opens the print dialog, once, at the click', () => {
    printResults();
    assert.equal(prints, 1);
    assert.deepEqual(timers, [], 'nothing is waited for first');
  });
});
