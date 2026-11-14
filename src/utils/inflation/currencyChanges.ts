/**
 * When a country's money changed its unit: zeros struck off, a new currency
 * at a fixed rate, the euro or the dollar taking over.
 *
 * The inflation history is a price index, and an index does not care what
 * the money was called. A reader does: 10,000 lira of 1990 run through
 * Turkey's prices comes out as about 249 million, which is right as a count
 * of 1990 lira and wrong as an amount of today's lira by a factor of a
 * million. The calculator keeps the index as it is and says, when the years
 * chosen cross one of these dates, what the answer is in today's unit.
 *
 * Only the countries whose currency the calculator switches to are listed
 * (`COUNTRY_CURRENCY`): for any other country the amounts stay in the
 * reader's own currency and are not that country's money at all. Changes at
 * par (Slovenia's tolar for the dinar in 1991, Croatia's dinar in 1991,
 * Brazil's cruzeiro in 1990, the Czech and Slovak korunas in 1993) change no
 * amount and are left out, as are changes before a country's figures begin.
 *
 * `ratio` is how many units of the old money became one unit of the new.
 * `year` is the year from which everyday amounts were in the new unit. For
 * the euro's first twelve members that is 2002, when notes and prices
 * changed, not 1999 or 2001 when the rate was fixed: someone remembering a
 * price from 2000 remembers it in francs or lire.
 *
 * Every ratio and date was read from the source named beside it (a central
 * bank, the law itself, the ECB or the IMF), on 14 November 2026.
 *
 * Pure: no DOM, no analytics.
 */
export interface CurrencyChange {
  /** The first year whose everyday amounts are in the new unit. */
  year: number;
  /** Units of the old money that became one unit of the new. */
  ratio: number;
}

// ECB, "Use of the euro": fixed euro conversion rates.
// https://www.ecb.europa.eu/euro/intro/html/index.en.html
const EURO_2002: Record<string, number> = {
  AUT: 13.7603,
  BEL: 40.3399,
  FIN: 5.94573,
  FRA: 6.55957,
  DEU: 1.95583,
  GRC: 340.75,
  IRL: 0.787564,
  ITA: 1936.27,
  LUX: 40.3399,
  NLD: 2.20371,
  PRT: 200.482,
  ESP: 166.386,
};

// IMF, "The IMF and the Transition from Central Planning" (history volume,
// chapter 6): the Yugoslav dinar was replaced on 1 January 1990 "at a ratio
// of 10,000:1". https://www.imf.org/external/pubs/ft/history/2012/pdf/c6.pdf
const YUGOSLAV_DINAR_1990: CurrencyChange = { year: 1990, ratio: 10_000 };

export const CURRENCY_CHANGES: Record<string, CurrencyChange[]> = {
  ...Object.fromEntries(Object.entries(EURO_2002).map(([code, ratio]) => [code, [{ year: 2002, ratio }]])),
  // Bank of Finland Monthly Bulletin, January 1963: "one new mark equal to one
  // hundred old marks", from 1 January 1963. Then the euro (ECB, above).
  FIN: [
    { year: 1963, ratio: 100 },
    { year: 2002, ratio: EURO_2002.FIN },
  ],
  // The euro's later members (ECB, same page), each from 1 January of the year.
  SVN: [YUGOSLAV_DINAR_1990, { year: 2007, ratio: 239.64 }],
  CYP: [{ year: 2008, ratio: 0.585274 }],
  MLT: [{ year: 2008, ratio: 0.4293 }],
  SVK: [{ year: 2009, ratio: 30.126 }],
  EST: [{ year: 2011, ratio: 15.6466 }],
  // Latvijas Banka, "Transition from Latvian ruble to lats": 1 lats for 200
  // Latvian rubles, 1993. https://www.bank.lv
  LVA: [
    { year: 1993, ratio: 200 },
    { year: 2014, ratio: 0.702804 },
  ],
  // Lietuvos bankas: the litas from 25 June 1993, one litas for 100 talonas.
  // https://www.lb.lt/lt/naujienos/litui-30-nacionalines-valiutos-ivedimo-istorija-ir-paslaptys
  LTU: [
    { year: 1993, ratio: 100 },
    { year: 2015, ratio: 3.4528 },
  ],
  // Narodne novine 37/1994: 1 kuna for 1,000 Croatian dinars, 30 May 1994.
  // https://narodne-novine.nn.hr/clanci/sluzbeni/1994_05_37_682.html
  HRV: [YUGOSLAV_DINAR_1990, { year: 1994, ratio: 1000 }, { year: 2023, ratio: 7.5345 }],
  // Bulgarian National Bank, Annual Report 1999: "A thousand old levs were
  // exchanged for one new lev", 5 July 1999. The euro from 1 January 2026
  // (ECB), which is after the figures end.
  BGR: [
    { year: 1999, ratio: 1000 },
    { year: 2026, ratio: 1.95583 },
  ],
  // Ley para la Transformación Económica del Ecuador (2000): sucres exchanged
  // "a una relación fija e inalterable de veinticinco mil sucres por cada dólar".
  ECU: [{ year: 2000, ratio: 25_000 }],
  // Ley de Integración Monetaria, art. 1: 8.75 colones to the dollar, from
  // 1 January 2001. https://www.asamblea.gob.sv
  SLV: [{ year: 2001, ratio: 8.75 }],
  // Reserve Bank of Australia: decimal currency on 14 February 1966, the
  // dollar equal to ten shillings, so one pound became two dollars.
  // https://museum.rba.gov.au/exhibitions/the-decimal-revolution/
  AUS: [{ year: 1966, ratio: 0.5 }],
  // New Zealand history (Ministry for Culture and Heritage): decimal currency
  // on 10 July 1967, one pound for two dollars.
  // https://nzhistory.govt.nz/nz-adopts-decimal-currency
  NZL: [{ year: 1967, ratio: 0.5 }],
  // South African Reserve Bank: the rand from 14 February 1961, one pound
  // for two rand. https://www.resbank.co.za/en/home/about-us/history
  ZAF: [{ year: 1961, ratio: 0.5 }],
  // IMF press notice 98/20 and Country Report 05/94: the CFA franc from
  // 2 May 1997, "65 pesos per CFA franc".
  GNB: [{ year: 1997, ratio: 65 }],
  // IMF exchange rate country notes: the readjusted kwanza, "equal to 1,000
  // new kwanzas", July 1995; the kwanza, "equal to 1,000,000 readjusted
  // kwanzas", 12 November 1999.
  AGO: [
    { year: 1995, ratio: 1000 },
    { year: 1999, ratio: 1_000_000 },
  ],
  // Banco Central do Brasil, "Brazilian Monetary System Reforms": cruzado
  // (28 Feb 1986, 1,000 cruzeiros), cruzado novo (16 Jan 1989, 1,000
  // cruzados), cruzeiro real (1 Aug 1993, 1,000 cruzeiros), real (1 Jul 1994,
  // 2,750 cruzeiros reais).
  // https://www.bcb.gov.br/ingles/museu-espacos/refmone-i.asp?frame=1
  BRA: [
    { year: 1986, ratio: 1000 },
    { year: 1989, ratio: 1000 },
    { year: 1993, ratio: 1000 },
    { year: 1994, ratio: 2750 },
  ],
  // IMF, Finance & Development 4(3), 1967: "1 zaire = CF 1,000", 23 June 1967.
  // IMF exchange rate country notes: the new zaïre, "equal to three million
  // old zaïres", 22 October 1993; the Congo franc, "equal to 100,000 new
  // zaïres", 1 July 1998.
  COD: [
    { year: 1967, ratio: 1000 },
    { year: 1993, ratio: 3_000_000 },
    { year: 1998, ratio: 100_000 },
  ],
  // The currency law of 1979 (Althingi): from 1 January 1981 one new króna equals one
  // hundred old krónur. https://www.althingi.is/lagasafn/pdf/122b/1979035.pdf
  ISL: [{ year: 1981, ratio: 100 }],
  // Bank Indonesia: under Penetapan Presiden 27/1965 of 13 December 1965 the
  // money's value was cut "from Rp 1,000 to Rp 1". Prices were in the new
  // rupiah from 1966. https://www.bi.go.id
  IDN: [{ year: 1966, ratio: 1000 }],
  // Bank of Korea: the reform of 10 June 1962 issued won "ten times" the
  // value of the hwan. https://www.bok.or.kr/eng/main/contents.do?menuNo=400118
  KOR: [{ year: 1962, ratio: 10 }],
  // Banco de México: a "new peso" equal to 1,000 pesos of the earlier unit,
  // from 1 January 1993. https://www.banxico.org.mx
  MEX: [{ year: 1993, ratio: 1000 }],
  // Banco de Moçambique, Aviso 14/GGBM/2005: the metical divided by 1,000
  // from 1 July 2006. https://www.bancomoc.mz
  MOZ: [{ year: 2006, ratio: 1000 }],
  // Law of 7 July 1994 on the redenomination of the złoty: the new unit
  // equals 10,000 old złotys, from 1 January 1995.
  // https://eli.gov.pl/eli/DU/1994/386/ogl/pol/pdf
  POL: [{ year: 1995, ratio: 10_000 }],
  // Banca Națională a României: 10,000 old lei for 1 new leu, 1 July 2005.
  // https://bnro.ro/apage.aspx?pid=2785
  ROU: [{ year: 2005, ratio: 10_000 }],
  // Central Bank of the Republic of Türkiye, Law on the Currency Unit of the
  // Republic of Turkey: 1 new lira for 1,000,000 lira, from 1 January 2005.
  // https://www3.tcmb.gov.tr/ytlkampanya/ytlsitedokuman/tcmb/5228ING.htm
  TUR: [{ year: 2005, ratio: 1_000_000 }],
};

export interface CrossedChanges {
  /** Changes inside the span: after the first year, up to the last. Oldest first. */
  crossed: CurrencyChange[];
  /** Units of the first year's money that became one unit of the last year's. 1 when nothing was crossed. */
  ratio: number;
  /** Changes after the last year with a figure: the amounts are in the money before them. */
  later: CurrencyChange[];
}

/**
 * The changes that matter for an amount carried from `from` to `to` in the
 * country's own money. A change in year Y is crossed when `from < Y <= to`:
 * an amount "in Y" is already in the new unit.
 */
export function currencyChangesBetween(country: string, from: number, to: number): CrossedChanges {
  const all = CURRENCY_CHANGES[country] ?? [];
  const crossed = all.filter((c) => c.year > from && c.year <= to);
  return {
    crossed,
    ratio: crossed.reduce((r, c) => r * c.ratio, 1),
    later: all.filter((c) => c.year > to),
  };
}
