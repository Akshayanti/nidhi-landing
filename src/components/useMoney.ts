import { createContext, useContext } from 'react';
import { formatMoney as formatMoneyIn } from '../utils/loan/math.ts';
import { formatAmount as formatAmountIn, formatPercent as formatPercentIn } from '../utils/shared/formatAmount.ts';

/**
 * The page's own number style for amounts (`TOOL_AMOUNT_LOCALE`), or null to
 * keep each currency's conventions. A tool sets it once at its root, like
 * `NumberLocaleContext`, instead of passing it to every card and chart.
 */
export const AmountLocaleContext = createContext<string | null>(null);

/**
 * The money formatters with the page's amount style already applied, so a
 * component calls `formatAmount(v, code)` the way it always has and a Spanish
 * page still reads "1.058.721 €".
 */
export function useMoney() {
  const amountLocale = useContext(AmountLocaleContext);
  return {
    amountLocale,
    formatAmount: (value: number, code: string, compact = false) => formatAmountIn(value, code, compact, amountLocale),
    formatMoney: (units: number, code: string) => formatMoneyIn(units, code, amountLocale),
    formatPercent: (pct: number, code: string, digits = 1) => formatPercentIn(pct, code, digits, amountLocale),
  };
}
