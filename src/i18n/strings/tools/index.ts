/**
 * The three free tools' copy, in every language, one module each.
 *
 * The prose pages keep their copy in `../en.ts` and `../hi.ts`, next to all the
 * chrome. These three do not, for one reason: a calculator is the densest
 * interface on the site. Each tool is several hundred short labels, chart
 * legends and FAQ answers that share words with one another and with nothing
 * else, so a tool reads better as one file than as a fifth of two very long
 * ones, and a change to one tool touches one file.
 *
 * The shape is the same as the rest of the catalog, and the key-parity test in
 * `../catalog.test.ts` covers these modules through `en` and `hi` like any other
 * namespace: `tools.loanComparison.meta.title` is a path it walks.
 *
 * Each module exports its English object and its Hindi object, the Hindi typed
 * as `typeof` the English one so the two cannot drift in shape. English first,
 * because `en` is the source of truth the other languages are measured against.
 */
import { loanComparisonEn, loanComparisonHi } from './loanComparison.ts';
import { multiCurrencyNetWorthEn, multiCurrencyNetWorthHi } from './multiCurrencyNetWorth.ts';
import { monteCarloEn, monteCarloHi } from './monteCarlo.ts';

export const toolsEn = {
  loanComparison: loanComparisonEn,
  multiCurrencyNetWorth: multiCurrencyNetWorthEn,
  monteCarlo: monteCarloEn,
};

export const toolsHi = {
  loanComparison: loanComparisonHi,
  multiCurrencyNetWorth: multiCurrencyNetWorthHi,
  monteCarlo: monteCarloHi,
};
