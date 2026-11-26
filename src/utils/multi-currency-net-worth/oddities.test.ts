/**
 * Two net worth oddities found while writing the mutation tests: the
 * spending currency banded "Low" when there are no rates (#874), and CSV
 * errors numbered by non-blank lines only (#875).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aggregate, parseCSV, type AssetRow } from './math.ts';

const row = (value: string, currency: string): AssetRow => ({ name: '', value, currency, type: 'asset' });

describe('the spending currency without exchange rates (#874)', () => {
  it('is the reader\'s own currency, as it is with rates, never "Low"', () => {
    const rows = [row('1000', 'EUR'), row('2000', 'USD')];
    const none = aggregate(rows, 'EUR', null);
    const eur = none.positions.find((p) => p.code === 'EUR')!;
    assert.equal(eur.riskLevel, 'functional');
    assert.equal(eur.riskLabel, 'Your spending currency');
    assert.equal(eur.rateUnavailable, undefined);
    const usd = none.positions.find((p) => p.code === 'USD')!;
    assert.equal(usd.rateUnavailable, true);
    // The same band the rates give it.
    const withRates = aggregate(rows, 'EUR', { USD: 1.1 }).positions.find((p) => p.code === 'EUR')!;
    assert.equal(withRates.riskLevel, eur.riskLevel);
    assert.equal(withRates.riskLabel, eur.riskLabel);
  });

  it('is its own currency when it is a debt, too', () => {
    const eur = aggregate([{ ...row('1000', 'EUR'), type: 'liability' }, row('2000', 'USD')], 'EUR', null).positions.find((p) => p.code === 'EUR')!;
    assert.equal(eur.riskLevel, 'functional');
  });
});

describe('a CSV error line (#875)', () => {
  it('is the line the file shows, counting the blank lines', () => {
    const csv = 'Name,Value,Currency,Type\n\nCash,100,EUR,Asset\n\n\nBad,abc,EUR,Asset\r\n\nShort\n';
    const { rows, errors } = parseCSV(csv);
    assert.equal(rows.length, 1);
    assert.deepEqual(errors.map((e) => e.line), [6, 8]);
  });

  it('is the line the file shows without a header, and after a byte order mark', () => {
    const { errors } = parseCSV('﻿\n100,EUR\n\n100,QQQ');
    assert.deepEqual(errors.map((e) => e.line), [4]);
  });
});
