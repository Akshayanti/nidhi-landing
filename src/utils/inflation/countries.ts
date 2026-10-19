/**
 * Which of the tools' 38 currencies a country's prices are in, for the
 * countries in the World Bank data whose currency is one of them.
 *
 * Picking a country's history switches the calculator to that country's
 * currency, because the history describes prices there. A country whose
 * currency is not among the tools' currencies is simply absent from this map:
 * the calculator keeps the reader's currency and says the history is a
 * percentage, which reads the same in any currency.
 *
 * Keyed by ISO 3166-1 alpha-3, as the World Bank keys its data. Only official
 * currencies (legal tender used for everyday prices) are listed: the euro area
 * and the countries that use the euro or the US dollar outright, the
 * Australian dollar's Pacific users, and Liechtenstein's Swiss franc. A
 * currency pegged to one of these but distinct from it (the Bhutanese
 * ngultrum, the Namibian dollar) is not the same currency and is left out.
 *
 * Used by the page component, on the server; the island receives each
 * country's currency already resolved.
 */
export const COUNTRY_CURRENCY: Record<string, string> = {
  // Euro: the euro area as a whole, its members (Bulgaria from 2026), and the
  // countries that use the euro without being members.
  EMU: 'EUR',
  AUT: 'EUR',
  BEL: 'EUR',
  BGR: 'EUR',
  HRV: 'EUR',
  CYP: 'EUR',
  EST: 'EUR',
  FIN: 'EUR',
  FRA: 'EUR',
  DEU: 'EUR',
  GRC: 'EUR',
  IRL: 'EUR',
  ITA: 'EUR',
  LVA: 'EUR',
  LTU: 'EUR',
  LUX: 'EUR',
  MLT: 'EUR',
  NLD: 'EUR',
  PRT: 'EUR',
  SVK: 'EUR',
  SVN: 'EUR',
  ESP: 'EUR',
  AND: 'EUR',
  MCO: 'EUR',
  SMR: 'EUR',
  MNE: 'EUR',
  XKX: 'EUR',
  // US dollar, including the countries that use it as their own currency.
  USA: 'USD',
  ECU: 'USD',
  SLV: 'USD',
  PAN: 'USD',
  TLS: 'USD',
  FSM: 'USD',
  MHL: 'USD',
  PLW: 'USD',
  PRI: 'USD',
  GUM: 'USD',
  ASM: 'USD',
  VIR: 'USD',
  MNP: 'USD',
  TCA: 'USD',
  VGB: 'USD',
  // Australian dollar.
  AUS: 'AUD',
  KIR: 'AUD',
  NRU: 'AUD',
  TUV: 'AUD',
  // Swiss franc.
  CHE: 'CHF',
  LIE: 'CHF',
  // Danish krone, including the Faroe Islands and Greenland.
  DNK: 'DKK',
  FRO: 'DKK',
  GRL: 'DKK',
  // West African CFA franc (the UEMOA members).
  BEN: 'XOF',
  BFA: 'XOF',
  CIV: 'XOF',
  GNB: 'XOF',
  MLI: 'XOF',
  NER: 'XOF',
  SEN: 'XOF',
  TGO: 'XOF',
  // Central African CFA franc (the CEMAC members).
  CMR: 'XAF',
  CAF: 'XAF',
  TCD: 'XAF',
  COG: 'XAF',
  GNQ: 'XAF',
  GAB: 'XAF',
  // One country each.
  AGO: 'AOA',
  BGD: 'BDT',
  BRA: 'BRL',
  CAN: 'CAD',
  CHN: 'CNY',
  COD: 'CDF',
  CZE: 'CZK',
  GBR: 'GBP',
  HKG: 'HKD',
  HUN: 'HUF',
  IDN: 'IDR',
  IND: 'INR',
  ISL: 'ISK',
  JPN: 'JPY',
  KEN: 'KES',
  KOR: 'KRW',
  MEX: 'MXN',
  MYS: 'MYR',
  MOZ: 'MZN',
  NOR: 'NOK',
  NZL: 'NZD',
  PHL: 'PHP',
  POL: 'PLN',
  ROU: 'RON',
  SWE: 'SEK',
  SGP: 'SGD',
  THA: 'THB',
  TUR: 'TRY',
  TZA: 'TZS',
  UGA: 'UGX',
  ZAF: 'ZAR',
};
