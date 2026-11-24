/**
 * useMoney: the money formatters a component gets with the page's own amount
 * style (`AmountLocaleContext`) already applied.
 */
import '../../test/dom.ts';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { ReactNode } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { formatMoney } from '../utils/loan/math.ts';
import { formatAmount, formatPercent } from '../utils/shared/formatAmount.ts';
import { AmountLocaleContext, useMoney } from './useMoney.ts';

afterEach(cleanup);

const on = (amountLocale: string | null) =>
  renderHook(() => useMoney(), {
    wrapper: ({ children }: { children: ReactNode }) => <AmountLocaleContext.Provider value={amountLocale}>{children}</AmountLocaleContext.Provider>,
  }).result.current;

describe('useMoney', () => {
  it('keeps each currency its own conventions on a page with no amount style', () => {
    const money = renderHook(() => useMoney()).result.current;
    assert.ok(money.amountLocale === null);
    assert.equal(money.formatAmount(1058721, 'EUR'), '€1,058,721');
    assert.equal(money.formatAmount(1058721, 'EUR', true), '€1.06M');
    assert.equal(money.formatMoney(123456, 'EUR'), '€1,234.56');
    assert.equal(money.formatPercent(44.123, 'EUR'), '44.1%');
    assert.equal(money.formatPercent(44.123, 'EUR', 2), '44.12%');
  });

  it('writes every figure in the page style where the page has one', () => {
    const money = on('es');
    assert.equal(money.amountLocale, 'es');
    // The page's style, not the currency's: each differs from the unstyled figure.
    assert.equal(money.formatAmount(1058721, 'EUR'), formatAmount(1058721, 'EUR', false, 'es'));
    assert.notEqual(money.formatAmount(1058721, 'EUR'), formatAmount(1058721, 'EUR'));
    assert.equal(money.formatAmount(1058721, 'GBP', true), formatAmount(1058721, 'GBP', true, 'es'));
    assert.notEqual(money.formatAmount(1058721, 'GBP', true), money.formatAmount(1058721, 'GBP'));
    assert.equal(money.formatMoney(123456, 'EUR'), formatMoney(123456, 'EUR', 'es'));
    assert.notEqual(money.formatMoney(123456, 'EUR'), formatMoney(123456, 'EUR'));
    assert.equal(money.formatPercent(44.123, 'EUR'), formatPercent(44.123, 'EUR', 1, 'es'));
    assert.notEqual(money.formatPercent(44.123, 'EUR'), formatPercent(44.123, 'EUR'));
    assert.equal(money.formatPercent(44.123, 'EUR', 0), formatPercent(44.123, 'EUR', 0, 'es'));
  });
});
