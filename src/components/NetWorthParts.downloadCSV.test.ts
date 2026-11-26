/**
 * The net worth calculator's rows file (`downloadCSV`, #790): what the
 * downloaded CSV holds in full and in anonymous mode, how a typed name is
 * written so a spreadsheet reads it as text and the tool reads it back, and
 * the fixed file name, which never carries anything typed.
 *
 * No browser: the download is caught where it starts, with a stand-in for
 * the link the browser would follow and for the address of the file.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { AssetRow } from '../utils/multi-currency-net-worth/math.ts';
import { downloadCSV } from './MultiCurrencyNetWorth.tsx';

interface Saved { blob: Blob; href: string; download: string; rel: string; clicked: number }

const g = globalThis as unknown as Record<string, unknown>;
const real = { document: g.document, window: g.window, create: URL.createObjectURL };
let saved: Saved[] = [];

beforeEach(() => {
  saved = [];
  const blobs = new Map<string, Blob>();
  URL.createObjectURL = (blob: Blob) => {
    const url = `blob:https://nidhi.today/file-${blobs.size + 1}`;
    blobs.set(url, blob);
    return url;
  };
  g.document = {
    createElement: (tag: string) => {
      assert.equal(tag, 'a');
      const a = {
        href: '', download: '', rel: '', clicked: 0,
        click() { a.clicked++; saved.push({ blob: blobs.get(a.href) as Blob, href: a.href, download: a.download, rel: a.rel, clicked: a.clicked }); },
      };
      return a;
    },
  };
  g.window = { setTimeout: () => 0 };
});
afterEach(() => {
  g.document = real.document;
  g.window = real.window;
  URL.createObjectURL = real.create;
});

const row = (name: string, value: string, currency: string, type: AssetRow['type']): AssetRow => ({ name, value, currency, type });

/** The one file saved, as text, with its name and type. */
async function file() {
  assert.equal(saved.length, 1, 'one file is saved');
  const [f] = saved;
  return { text: await f.blob.text(), type: f.blob.type, name: f.download, href: f.href };
}

const ROWS: AssetRow[] = [
  row('Savings, joint', '1500', 'EUR', 'asset'),
  row('Say "hi"', '200', 'USD', 'liability'),
  row('=SUM(A1)', '70000', 'JPY', 'asset'),
  row('Line one\r\n\nline two', '3', 'CZK', 'asset'),
  row('Plain', '1,00,000', 'INR', 'liability'),
];

describe('the downloaded rows file', () => {
  it('in full, holds every row with its amount, currency and type, under an English header', async () => {
    downloadCSV(ROWS, 'full');
    const f = await file();
    assert.equal(f.text, [
      'Name,Value,Currency,Type',
      '"Savings, joint",1500,EUR,Asset',
      '"Say ""hi""",200,USD,Liability',
      "'=SUM(A1),70000,JPY,Asset",
      'Line one line two,3,CZK,Asset',
      'Plain,1,00,000,INR,Liability',
    ].join('\n'));
    assert.equal(f.name, 'asset-details.csv');
    assert.equal(f.type, 'text/csv;charset=utf-8;');
  });

  it('anonymous, holds no amount at all, only the names, currencies and types', async () => {
    downloadCSV(ROWS, 'anon');
    const f = await file();
    assert.equal(f.text, [
      'Name,Currency,Type',
      '"Savings, joint",EUR,Asset',
      '"Say ""hi""",USD,Liability',
      "'=SUM(A1),JPY,Asset",
      'Line one line two,CZK,Asset',
      'Plain,INR,Liability',
    ].join('\n'));
    for (const amount of ['1500', '200', '70000', '1,00,000']) assert.ok(!f.text.includes(amount), `${amount} is in the anonymous file`);
    assert.equal(f.name, 'asset-details-anonymous.csv');
    assert.equal(f.type, 'text/csv;charset=utf-8;');
  });

  it('the file name is fixed, never a typed name or amount, and the link is the file itself', async () => {
    downloadCSV([row('My flat in Pune', '4200000', 'INR', 'asset')], 'full');
    const f = await file();
    assert.equal(f.name, 'asset-details.csv');
    assert.ok(f.href.startsWith('blob:'));
    assert.equal(saved[0].clicked, 1);
    assert.equal(f.text, 'Name,Value,Currency,Type\nMy flat in Pune,4200000,INR,Asset');
  });

  it('with no rows, holds the header alone', async () => {
    downloadCSV([], 'anon');
    assert.equal((await file()).text, 'Name,Currency,Type');
  });
});
