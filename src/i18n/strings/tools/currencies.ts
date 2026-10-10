/**
 * The 29 currencies the three free tools offer, named in each language.
 *
 * One list for three tools. `RAW_CURRENCIES` in `src/utils/loan/math.ts` is the
 * engine's own table (code, `Intl` locale, fraction digits) and every dropdown
 * reads its codes from it, so the *names* belong together rather than beside one
 * tool's labels: a currency renamed once is renamed in all three. Each tool's
 * `island` subtree spreads `currencies` in, which is what carries them to the
 * React islands, since an island is handed one locale's slice as a prop and
 * never imports a catalog (see the `island` note in `loanComparison.ts`).
 *
 * A currency code stays Latin in every language, the way `APR` does, because it
 * is what a reader types into a search engine and what the tool writes into its
 * own shared link. So the key and the parenthesised suffix are the same string
 * in both maps, and only the name is translated.
 *
 * The English names are deliberately the same text as `RAW_CURRENCIES[].label`,
 * the engine's fallback label for a code, and a test in `../catalog.test.ts`
 * holds the two in step: a currency added to the engine without a name here
 * fails the build rather than appearing as a bare code in the dropdown.
 * `अमेरिकी डॉलर` and not `यूएस डॉलर`, which is what `Intl.DisplayNames` returns,
 * for the same reason: the prose in this catalog already says `अमेरिकी डॉलर`,
 * and a dropdown that disagreed with the sentence beside it would read as two
 * different currencies.
 */

/**
 * One name per code, in the engine's own order. A `Record` rather than an exact
 * key type on purpose: the islands look a code up with a `string` read off
 * `CURRENCIES`, so an exact key type would need a cast at every call site, and
 * the test against `RAW_CURRENCIES` catches a missing or unknown code anyway.
 */
export const currenciesEn: Record<string, string> = {
  AUD: 'Australian Dollar (AUD)',
  BRL: 'Brazilian Real (BRL)',
  CAD: 'Canadian Dollar (CAD)',
  CHF: 'Swiss Franc (CHF)',
  CNY: 'Chinese Yuan (CNY)',
  CZK: 'Czech Koruna (CZK)',
  DKK: 'Danish Krone (DKK)',
  EUR: 'Euro (EUR)',
  GBP: 'British Pound (GBP)',
  HKD: 'Hong Kong Dollar (HKD)',
  HUF: 'Hungarian Forint (HUF)',
  IDR: 'Indonesian Rupiah (IDR)',
  INR: 'Indian Rupee (INR)',
  ISK: 'Icelandic Króna (ISK)',
  JPY: 'Japanese Yen (JPY)',
  KRW: 'South Korean Won (KRW)',
  MXN: 'Mexican Peso (MXN)',
  MYR: 'Malaysian Ringgit (MYR)',
  NOK: 'Norwegian Krone (NOK)',
  NZD: 'New Zealand Dollar (NZD)',
  PHP: 'Philippine Peso (PHP)',
  PLN: 'Polish Złoty (PLN)',
  RON: 'Romanian Leu (RON)',
  SEK: 'Swedish Krona (SEK)',
  SGD: 'Singapore Dollar (SGD)',
  THB: 'Thai Baht (THB)',
  TRY: 'Turkish Lira (TRY)',
  USD: 'US Dollar (USD)',
  ZAR: 'South African Rand (ZAR)',
};

export const currenciesHi: Record<string, string> = {
  AUD: 'ऑस्ट्रेलियाई डॉलर (AUD)',
  BRL: 'ब्राज़ीलियाई रियाल (BRL)',
  CAD: 'कनाडाई डॉलर (CAD)',
  CHF: 'स्विस फ़्रैंक (CHF)',
  CNY: 'चीनी युआन (CNY)',
  CZK: 'चेक गणराज्य का कोरुना (CZK)',
  DKK: 'डेनिश क्रोन (DKK)',
  EUR: 'यूरो (EUR)',
  GBP: 'ब्रिटिश पाउंड (GBP)',
  HKD: 'हांगकांग डॉलर (HKD)',
  HUF: 'हंगेरियन फ़ोरिंट (HUF)',
  IDR: 'इंडोनेशियाई रुपिया (IDR)',
  INR: 'भारतीय रुपया (INR)',
  ISK: 'आइसलैंडिक क्रोना (ISK)',
  JPY: 'जापानी येन (JPY)',
  KRW: 'दक्षिण कोरियाई वॉन (KRW)',
  MXN: 'मैक्सिकन पेसो (MXN)',
  MYR: 'मलेशियाई रिंगिट (MYR)',
  NOK: 'नॉर्वेजियन क्रोन (NOK)',
  NZD: 'न्यूज़ीलैंड डॉलर (NZD)',
  PHP: 'फ़िलिपीनी पेसो (PHP)',
  PLN: 'पोलिश ज़्लॉटी (PLN)',
  RON: 'रोमानियाई ल्यू (RON)',
  SEK: 'स्वीडिश क्रोना (SEK)',
  SGD: 'सिंगापुर डॉलर (SGD)',
  THB: 'थाई बाट (THB)',
  TRY: 'तुर्की लीरा (TRY)',
  USD: 'अमेरिकी डॉलर (USD)',
  ZAR: 'दक्षिण अफ़्रीकी रैंड (ZAR)',
};
