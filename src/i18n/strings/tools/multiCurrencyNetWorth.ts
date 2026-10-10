/**
 * The multi-currency net worth calculator's copy, in every language.
 *
 * See `./index.ts` for why the tools keep their words in their own modules
 * rather than in `../en.ts`. The shape here is the same as the rest of the
 * catalog: `meta` and `schema` carry what the head and the structured data say,
 * `page` carries what the page around the calculator says, and `island` carries
 * what the React island says, including the words in its accessible names.
 *
 * A reading rule for `island`: almost every key is one sentence fragment on
 * purpose. The tool names currencies, percentages and amounts inside its
 * sentences, and a language that puts the amount first, or drops a preposition
 * the English needs, can only do that if the sentence is a template. Anything
 * with a `{name}` in it is filled by `format()`, and the names are the ones the
 * component passes.
 *
 * What is deliberately missing, and why:
 *
 *   - The CSV header and the `Asset` / `Liability` cells of the file this tool
 *     downloads. It is a data format, and the tool reads its own files back:
 *     `parseCSV` in `../../utils/multi-currency-net-worth/math.ts` detects a
 *     header by looking for the words `value` and `currency` and reads the type
 *     column as `asset` or `liability`. A translated header would come back as
 *     a data row and a translated type would come back as an asset.
 *   - The parse errors the CSV importer shows (`Line 3: "abc" is not a valid
 *     positive number.`). Those strings live in `math.ts` alongside the parser,
 *     and the island classifies them by matching on their English wording to
 *     pick an analytics reason, so translating them in place would change what
 *     the tool reports.
 *   - `nidhi`, `Frankfurter`, `ECB`, `CSV`, and the currency codes and names.
 *     The catalog test allows a value that reads the same in both languages only
 *     when it holds no word at all, and these are names.
 *
 * The related-reading cards below are this page's own sentences about those
 * lessons, so they are translated here. Item 13 of the Hindi plan reconciles
 * them against the titles the lessons carry in their own Hindi edition, which
 * does not exist yet.
 */
/**
 * One bullet of the "How the calculation works" explainer.
 *
 * `after` exists for the one bullet that ends in a `<code>` sample
 * (`?from=EUR`), which the component holds because it reads the same in every
 * language. The other four bullets leave it out, and the type says so rather
 * than each of them carrying an empty string, which the catalog test rejects.
 */
export interface NetWorthExplainerItem {
  strong: string;
  rest: string;
  after?: string;
}

import { currenciesEn, currenciesHi } from './currencies.ts';

export const multiCurrencyNetWorthEn = {
  meta: {
    title: 'Net Worth Calculator, in One Currency or Several | nidhi',
    description:
      'Free net worth calculator for one currency or several: 29 currencies at live ECB rates, plus a currency risk check. Runs in your browser; nothing is sent.',
  },
  schema: {
    name: 'nidhi Net Worth Calculator',
    alternateName: [
      'nidhi Multi-Currency Net Worth Calculator',
      'nidhi Multi-Currency Net Worth & Currency Risk Analyzer',
      'nidhi Net Worth Calculator for Expats',
      'nidhi Currency Risk Analyzer',
      'nidhi Currency Exposure Calculator',
      'nidhi FX Risk Tool',
      'nidhi Currency Concentration Checker',
    ],
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript. Modern browser.',
    featureList: [
      'Calculate total net worth across 29 currencies in your chosen functional currency',
      'Add unlimited assets and liabilities in any supported currency',
      'Live ECB reference exchange rates via Frankfurter API',
      'Currency concentration donut chart',
      'Per-currency risk assessment (low, moderate, elevated)',
      'Asset/liability toggle for net position calculation',
      'CSV bulk upload',
      'Dual sharing modes: full data and anonymous',
      'Everything runs in your browser; no data sent to any server',
    ],
    breadcrumbHome: 'Home',
    breadcrumbThis: 'Net worth calculator',
  },
  page: {
    breadcrumb: {
      home: 'Home',
      this: 'Net worth calculator',
    },
    eyebrow: 'Free tools',
    title: 'Net worth calculator, in one currency or several',
    /**
     * One string rather than a fragment per sentence: the lead is a paragraph of
     * plain sentences with no markup in it, so there is nothing for a
     * translation to move around, and the spaces are already collapsed the way
     * the browser would collapse them in the markup.
     */
    lead:
      'Add what you own and what you owe, in one currency or several. See your net worth in your chosen currency with live ECB rates. If you hold more than one currency, check how much of it sits in currencies you don’t actually spend in. Everything runs in your browser. Nothing is sent to a server. Supports USD, EUR, GBP, INR, JPY, and 24 more.',
    accessCta: {
      eyebrow: 'Full planner',
      title: 'Want this connected to retirement timing and future expenses?',
      body:
        'The full nidhi planner turns multi-currency net worth into a long-range plan, so you can see how location, spending currency, and major decisions change the path.',
      cta: 'Join early access',
    },
    explainer: {
      heading: 'How the calculation works',
      intro:
        'For each currency, we net your assets and liabilities, then convert the result to your functional currency using live exchange rates. Sum those converted positions and you have your total net worth in one currency. Each currency’s share of that total is your concentration:',
      formula:
        'Concentration % = (Net in currency X × Rate to functional) / Total net worth × 100',
      items: [
        {
          strong: 'Net position',
          rest:
            ' per currency = sum of assets minus sum of liabilities in that currency. A negative net means you owe more than you hold in that currency.',
        },
        {
          strong: 'Rate to functional',
          rest:
            ' is the multiplier that converts one unit of currency X into your functional currency, sourced live from the European Central Bank via the Frankfurter API and fetched directly by your browser. Rates update daily on business days. ECB reference rates are benchmarks and may differ from the rates your bank or broker actually offers.',
        },
        {
          strong: 'Concentration bands',
          rest:
            ' apply only to non-functional currencies (currencies you don\'t spend in). Under 20% is low, 20-40% is moderate, and over 40% is elevated. They describe how big a share of net worth sits in that currency, not what to do about it. Your functional currency is never flagged.',
        },
        {
          strong: 'Net vs. gross exposure.',
          rest:
            ' Concentration is computed on net positions. If you have a large foreign-currency debt that offsets a foreign-currency asset (for example a USD mortgage and a USD savings account), the net position is small but your gross FX exposure on each side is much larger. This tool measures the net; consider the gross figures separately when sizing real-world exchange-rate risk.',
        },
        {
          strong: 'All computation is client-side.',
          rest:
            ' Your asset names, values, and totals never leave your browser. The only network request is a one-time exchange rate fetch from Frankfurter, which carries your functional currency code (e.g. ',
          after: ') and nothing about your assets.',
        },
      ] as NetWorthExplainerItem[],
    },
    faq: {
      heading: 'Frequently asked questions',
      items: [
        {
          q: 'How does the net worth calculator work?',
          a:
            'You add your assets and liabilities with their currency and current value. The tool fetches live ECB reference exchange rates (via the free Frankfurter API), converts everything to your chosen functional currency, and shows your total net worth as a single number. Below that, it shows your currency concentration as a donut chart and flags any non-functional currency where you have elevated exposure.',
        },
        {
          q: 'What is currency concentration risk?',
          a:
            'If a large portion of your net worth is in a currency you don\'t spend in, a swing in the exchange rate changes your real purchasing power. For example, if you plan to retire in Europe but hold 70% of your wealth in USD, a 10% move in USD/EUR (a magnitude EUR/USD has seen in many calendar years) would shift your retirement fund by roughly 7% measured in euros.',
        },
        {
          q: 'Does this send my financial data anywhere?',
          a:
            'No. Everything runs in your browser. Your asset names, values, and currencies are never sent to any server. The only external request is to the Frankfurter API to fetch exchange rates, and that request only includes your functional currency code, not your asset data. Nothing goes into the page address while you use the tool. When you copy a share link, your values go into the link after the # sign, a part of the address browsers never send to a server, and the page removes them from the address bar before analytics start. You control whether to share.',
        },
        {
          q: 'Which currencies are supported?',
          a:
            'Twenty-nine currencies are supported, including the Euro (EUR), US Dollar (USD), British Pound (GBP), Swiss Franc (CHF), Japanese Yen (JPY), Indian Rupee (INR), Chinese Yuan (CNY), Canadian Dollar (CAD), Australian Dollar (AUD), Singapore Dollar (SGD), and the Nordic, Central European, Latin American, and South-East Asian majors. Exchange rates are fetched from the ECB via Frankfurter, which are reference rates and may differ from the rates available to retail customers at their bank.',
        },
        {
          q: 'What\'s the difference between the "Full" and "Redacted" share modes?',
          a:
            'Full mode includes all your asset names, values, currencies, and types in the URL: anyone with the link can see your full breakdown and verify the math. Redacted mode includes only the per-currency concentration percentages and the band labels: no amounts, no asset names. Both are copied to your clipboard as a single link, and you choose which to send.',
        },
        {
          q: 'How are exchange rates sourced?',
          a:
            'Rates come from the European Central Bank via the free Frankfurter API (api.frankfurter.dev). They are reference rates updated daily on ECB business days, intended as benchmarks rather than transactable quotes. The rates you actually receive at your bank or broker include a spread and may be materially different, especially for smaller currencies. No API key is required, and the request is made directly from your browser.',
        },
        {
          q: 'What does "functional currency" mean?',
          a:
            'Your functional currency is the currency you primarily spend and live in. It\'s the one your bills, rent, and groceries are priced in. We leave it out of the risk flags because exchange-rate moves do not change what money in your spending currency buys you.',
        },
        {
          q: 'What do "low", "moderate", and "elevated" mean?',
          a:
            'They are descriptive bands for non-functional currencies: under 20% of net worth is "low", 20-40% is "moderate", and over 40% is "elevated". They describe concentration size, not what you should do about it. Whether a given level fits your situation depends on your future spending plans, where you intend to retire, and how you choose to balance currency risk with other goals.',
        },
        {
          q: 'Can I include debts and liabilities?',
          a:
            'Yes. Each row has an Asset/Liability toggle. Liability amounts are subtracted from that currency\'s net position. If you have a USD mortgage alongside USD savings, the tool shows your net USD exposure. A currency where you owe more than you hold gets flagged as "Net debt."',
        },
        {
          q: 'How does the CSV upload work?',
          a:
            'Create a CSV file with columns: name (optional), value (required), currency (required, 3-letter code), type (optional, "asset" or "liability", defaults to asset). Click "Upload CSV", pick the file, and the rows populate automatically. Any invalid rows are listed with line numbers so you can fix them. Uploading replaces existing data after a confirmation prompt.',
        },
      ],
    },
    related: {
      heading: 'Understand your net worth',
      lead: 'From what net worth is to managing money across currencies.',
      /**
       * One entry per candidate in the page's `RELATED_CANDIDATES`, in the same
       * order. The component holds the slug and the `data-attr` label, because
       * neither is a sentence: the slug has to match a real lesson, and analytics
       * reads the label.
       */
      items: [
        {
          kicker: 'Fundamentals',
          title: 'What is net worth and why it matters',
          desc:
            'Assets minus liabilities is the simplest measure of financial health. This tool extends it to multi-currency holdings.',
        },
        {
          kicker: 'Net worth',
          title: 'How to calculate your net worth in 10 minutes',
          desc:
            'The two-column method this calculator implements: list what you own, list what you owe, take the difference.',
        },
        {
          kicker: 'Currency management',
          title: 'Managing money across currencies',
          desc:
            'Practical strategies for earning, saving, and spending in multiple currencies without losing money to FX fees.',
        },
        {
          kicker: 'Debt',
          title: 'Liabilities: what you owe and why the interest rate matters',
          desc:
            'A foreign-currency loan carries two risks at once: interest cost and exchange-rate movement. The calculator nets both.',
        },
        {
          kicker: 'Purchasing power',
          title: 'Why your euro buys more in some countries than others',
          desc:
            'Exchange rates are only half the story. Local price levels matter as much as FX when you compare wealth across countries.',
        },
        {
          kicker: 'Inflation',
          title: 'Purchasing power: why €1,000 today isn\'t €1,000 tomorrow',
          desc:
            'Currency is one lens on real wealth; inflation is the other. Neither is captured by a nominal balance.',
        },
        {
          kicker: 'FIRE',
          title: 'Introduction to financial independence',
          desc:
            'The basics of FIRE and why currency diversification matters when your retirement spans countries.',
        },
        {
          kicker: 'Planning',
          title: 'Setting financial goals',
          desc:
            'How goals often shape asset allocation, including which currencies people hold.',
        },
      ],
      footerTag: 'Read more on currency management',
      footerAll: 'Or browse every article',
    },
  },
  island: {
    /** The 29 currency names, shared by the three tools: see `./currencies.ts`. */
    currencies: currenciesEn,
    toolbar: {
      aria: 'Net worth calculator actions',
      currencyLabel: 'Your currency (the one you spend in)',
      currencyHelp:
        'Your net worth is shown in this currency. Anything in another currency is converted at today’s ECB rates.',
      share: 'Share',
      shareTitle: 'Share your net worth',
      reset: 'Reset',
      resetTitle: 'Clear all data and start fresh',
      copiedLabel: 'Link copied to clipboard',
      shareUrlAria: 'Shareable link URL',
    },
    rates: {
      errorBefore: 'Exchange rates unavailable, showing raw amounts without conversion.',
      retry: 'Retry',
      loading: 'Loading exchange rates…',
      partial:
        'One or more currencies are missing a live rate, so they are excluded from the total below. Their original-currency amounts are shown on the per-currency cards.',
    },
    shared: {
      readOnly:
        'You\'re viewing a shared net worth. The data shown is what the sender chose to include. You can start fresh with the form below.',
    },
    table: {
      heading: 'Your assets & liabilities',
      /** `{count}` is how many rows carry a value. */
      itemsOne: '{count} item',
      itemsMany: '{count} items',
      aria: 'Assets and liabilities',
      colName: 'Name',
      colValue: 'Value',
      colCurrency: 'Currency',
      colType: 'Type',
      colActions: 'Actions',
      addAsset: '+ Add asset',
      uploadCsv: 'Upload CSV',
      uploadCsvAria: 'Upload CSV file',
      downloadCsv: 'Download CSV',
      downloadTitle: 'Download your assets as CSV',
      /** `{count}` is how many rows the file carried. */
      errorTitleOne: '{count} row could not be imported:',
      errorTitleMany: '{count} rows could not be imported:',
      /** `{line}` is the file's line number; `{message}` is the parser's own reason. */
      errorLine: 'Line {line}: {message}',
      /**
       * Why a line was refused, one per `ParseErrorReason` in the parser.
       * `{value}` is what the file held, quoted back; `{supported}` is the
       * list of currency codes, which stay Latin.
       */
      csvErrors: {
        empty: 'CSV is empty.',
        columns: 'Expected at least value and currency columns.',
        invalidValue: '"{value}" is not a valid positive number.',
        emptyCurrency: 'Currency code is empty.',
        unsupportedCurrency: '"{value}" is not a supported currency. Supported: {supported}.',
      },
    },
    row: {
      /** `{index}` and `{total}` are positions in the table, both counting from one. */
      nameAria: 'Asset name (row {index} of {total})',
      valueAria: 'Value (row {index})',
      currencyAria: 'Currency (row {index})',
      typeAria: 'Type (row {index})',
      namePlaceholder: 'Asset/Liability Name',
      asset: 'Asset',
      liability: 'Liability',
      removeTitle: 'Remove',
      removeAria: 'Remove row {index}',
    },
    results: {
      empty: 'Add at least one asset to see your net worth.',
      totalLabel: 'Total net worth',
      hidden: 'Hidden',
      whatYouOwn: 'What you own',
      whatYouOwe: 'What you owe',
      /** The note under a total that is already entirely in the spending currency. */
      singleNote:
        'Everything here is in {currency}, so exchange rates don’t affect it. If you add something held in another currency, this will also show how much of your net worth depends on exchange rates.',
      partialHint:
        'At least one currency was missing a live rate and is excluded from this total.',
      /** The two-word flag beside a currency whose rate the feed did not return. */
      rateUnavailable: 'Rate unavailable',
      /** The explanatory line under that currency. `{code}` and `{currency}` are codes. */
      noRateAvailable:
        'No live rate available for {code} against {currency}; shown without conversion',
      badgeFunctional: 'Functional',
      badgeNetDebt: 'Net debt',
      badgeElevated: 'Elevated',
      badgeModerate: 'Moderate',
      badgeLow: 'Low',
      riskHeading: 'Per-currency risk assessment',
      /** The longer label a risk card shows under the currency. */
      labelFunctional: 'Your spending currency',
      labelNetDebt: 'Net debt in this currency',
      labelElevated: 'Elevated exposure',
      labelModerate: 'Moderate exposure',
      labelLow: 'Low exposure',
      disclaimer:
        'This calculator shows mathematical concentrations of your net positions across currencies, using ECB reference rates that may differ from rates available at your bank or broker. It does not account for your future spending plans, tax residency, hedging strategies, or risk tolerance, and it is not financial advice. For personalized advice, consult a licensed financial advisor.',
    },
    /**
     * The descriptive line under each currency.
     *
     * These state how big a position is and what a move in the rate would do to
     * the total, and stop there. They are not advice and must not become advice:
     * an earlier revision said things like "consider diversifying", and the
     * platform's regulatory stance forbids that on a free, unauthenticated tool
     * (see docs/strategy/regulatory-advisory-classification.md in the app repo).
     * A translation that turns one of these into a suggestion is the same kind
     * of bug as a wrong number.
     */
    rec: {
      /** Shown when the rate feed did not return this currency at all. */
      noRate:
        'Live rate for {code} against {currency} was not returned by the ECB feed, so this position is excluded from the concentration math. The original-currency net amount is still shown above.',
      /** The spending currency, when the share carries no percentage. */
      functionalHidden:
        'This is your spending currency. The concentration percentage is not included in this share.',
      /** The spending currency, in three bands. `{rest}` is what is left over. */
      functionalMost:
        '{pct}% of your net worth is in your spending currency ({currency}). The remaining {rest}% sits in other currencies and moves with their exchange rates.',
      functionalMuch:
        '{pct}% of your net worth is in your spending currency ({currency}). The remaining {rest}% is held in other currencies, so a meaningful share of your day-to-day purchasing power moves with their exchange rates.',
      functionalLittle:
        'Only {pct}% of your net worth is in your spending currency ({currency}). The remaining {rest}% is held in other currencies, so most of your purchasing power moves with their exchange rates.',
      netDebt:
        'You owe more than you hold in {code} (a "net debt" position). When you have more liabilities than assets in a currency, it works the other way round: if {code} strengthens against {currency}, what you owe grows and your net worth falls; if {code} weakens, your net worth rises.',
      elevatedHidden:
        'Your {code} position is a large share of net worth in this share. If {code} rises or falls 10% against {currency}, your net worth rises or falls with it by a meaningful amount.',
      elevatedShown:
        '{pct}% of your net worth sits in {code}. If {code} rises or falls 10% against {currency}, your net worth rises or falls with it by roughly {sensitivity}%.',
      moderateHidden:
        'A moderate share of your net worth is in {code}. If {code} rises or falls 10% against {currency}, your net worth rises or falls with it by about a tenth of the share held in {code}.',
      moderateShown:
        '{pct}% of your net worth is in {code}. If {code} rises or falls 10% against {currency}, your net worth rises or falls with it by roughly {sensitivity}%.',
      lowHidden:
        'A small share of your net worth is in {code}. The {code}/{currency} rate has only a limited effect on your overall net worth.',
      lowShown:
        '{pct}% of your net worth is in {code}. If {code} rises or falls 10% against {currency}, your net worth rises or falls with it by roughly {sensitivity}%.',
    },
    chart: {
      heading: 'Currency concentration',
      emptyNoRates:
        'Exchange rates are unavailable right now, so the currencies cannot be compared in a chart.',
      emptyNoValues: 'Enter values above to see a concentration chart.',
      /** The word the donut's centre carries under the number of currencies. */
      currencyOne: 'currency',
      currencyMany: 'currencies',
      legendAria: 'Currencies',
      /** `{list}` is every slice, "US Dollar: 40.0%. Euro: 60.0%". */
      aria: 'Currency concentration donut chart. {list}',
      /** What joins the slices inside `{list}`: a full stop and a space, in each language's own script. */
      listSeparator: '. ',
      /** `{name}`, `{pct}` and, when amounts are shown, `{amount}`. */
      announce: '{name}: {pct} of your net worth.',
      announceWithAmount: '{name}: {pct} of your net worth, {amount}.',
      /** `{codes}` is a comma-separated list of currencies left out of the chart. */
      note:
        'Not in the chart: {codes}, because there is no exchange rate to {currency} right now.',
      tableCaption: 'Currency concentration by net position',
      tableColCurrency: 'Currency',
      tableColConcentration: 'Concentration',
      tableColRisk: 'Risk level',
    },
    csv: {
      /** `{current}` and `{pending}` are row counts, in two plural forms. */
      confirmOne:
        'Uploading a CSV will replace your current {current} item with {pending} from the file. Continue?',
      confirmMany:
        'Uploading a CSV will replace your current {current} items with {pending} from the file. Continue?',
      replace: 'Replace',
      cancel: 'Cancel',
    },
    shareModal: {
      title: 'Share your analysis',
      legend: 'Choose what to share:',
      fullName: 'Full version',
      fullDesc: 'All asset details, values, and net worth',
      redactedName: 'Redacted version',
      redactedDesc: 'Only currency split % and risk levels. No amounts or names.',
      cancel: 'Cancel',
      copy: 'Copy link',
      copied: 'Copied!',
      previewHeading: 'Recipient preview',
    },
  },
};

export const multiCurrencyNetWorthHi: typeof multiCurrencyNetWorthEn = {
  meta: {
    title: 'शुद्ध संपत्ति कैलकुलेटर, एक मुद्रा में या कई में | nidhi',
    description:
      'मुफ़्त शुद्ध संपत्ति कैलकुलेटर, एक मुद्रा के लिए या कई के लिए: ECB की ताज़ा दरों पर 29 मुद्राएँ, और साथ में मुद्रा जोखिम की जाँच। सारी गणना आपके ब्राउज़र में; कुछ भी नहीं भेजा जाता।',
  },
  schema: {
    name: 'nidhi शुद्ध संपत्ति कैलकुलेटर',
    alternateName: [
      'nidhi कई मुद्राओं वाला शुद्ध संपत्ति कैलकुलेटर',
      'nidhi कई मुद्राओं वाला शुद्ध संपत्ति और मुद्रा जोखिम विश्लेषक',
      'nidhi प्रवासियों के लिए शुद्ध संपत्ति कैलकुलेटर',
      'nidhi मुद्रा जोखिम विश्लेषक',
      'nidhi मुद्रा एक्सपोज़र कैलकुलेटर',
      'nidhi FX जोखिम टूल',
      'nidhi मुद्रा जमाव जाँच',
    ],
    operatingSystem: 'कोई भी (वेब ब्राउज़र)',
    browserRequirements: 'JavaScript ज़रूरी है। आधुनिक ब्राउज़र।',
    featureList: [
      'अपनी चुनी हुई मुद्रा में 29 मुद्राओं तक फैली कुल शुद्ध संपत्ति निकालें',
      'किसी भी समर्थित मुद्रा में जितनी चाहें संपत्तियाँ और देनदारियाँ जोड़ें',
      'Frankfurter API से ECB की ताज़ा संदर्भ विनिमय दरें',
      'मुद्रा मिश्रण का डोनट चार्ट',
      'हर मुद्रा के लिए जोखिम का आकलन (कम, मध्यम, ज़्यादा)',
      'शुद्ध स्थिति निकालने के लिए संपत्ति/देनदारी का टॉगल',
      'CSV से एक साथ कई पंक्तियाँ अपलोड करें',
      'शेयर करने के दो तरीक़े: पूरा हिसाब, या रकम और नाम छिपाकर',
      'सारी गणना आपके ब्राउज़र में होती है; किसी सर्वर पर कोई डेटा नहीं जाता',
    ],
    breadcrumbHome: 'होम',
    breadcrumbThis: 'शुद्ध संपत्ति कैलकुलेटर',
  },
  page: {
    breadcrumb: {
      home: 'होम',
      this: 'शुद्ध संपत्ति कैलकुलेटर',
    },
    eyebrow: 'मुफ़्त टूल',
    title: 'शुद्ध संपत्ति कैलकुलेटर, एक मुद्रा में या कई में',
    lead:
      'जो आपके पास है और जो आप पर बकाया है, उसे एक मुद्रा में या कई मुद्राओं में दर्ज करें। अपनी चुनी हुई मुद्रा में अपनी शुद्ध संपत्ति (नेट वर्थ) देखें, ECB की ताज़ा दरों पर बदलकर। अगर आपके पास एक से ज़्यादा मुद्राएँ हैं, तो देखें कि उनमें से कितना पैसा ऐसी मुद्राओं में पड़ा है जिनमें आप असल में खर्च नहीं करते। सारी गणना आपके ब्राउज़र में होती है। किसी सर्वर पर कुछ नहीं भेजा जाता। USD, EUR, GBP, INR, JPY और 24 अन्य मुद्राएँ समर्थित हैं।',
    accessCta: {
      eyebrow: 'पूरा प्लानर',
      title: 'इसे रिटायरमेंट के समय और आगे के खर्चों से जोड़कर देखना चाहेंगे?',
      body:
        'nidhi का पूरा प्लानर कई मुद्राओं में फैली शुद्ध संपत्ति को लंबी अवधि की योजना में बदल देता है, ताकि आप देख सकें कि जगह, खर्च की मुद्रा और बड़े फ़ैसले इस रास्ते को कैसे बदलते हैं।',
      cta: 'अर्ली एक्सेस में शामिल हों',
    },
    explainer: {
      heading: 'हिसाब कैसे लगता है',
      intro:
        'हर मुद्रा में हम आपकी संपत्तियों में से देनदारियाँ घटाकर शुद्ध स्थिति निकालते हैं, फिर उसे ताज़ा विनिमय दरों पर आपकी खर्च की मुद्रा में बदल देते हैं। इन बदली हुई रकमों को जोड़ें, और आपको एक ही मुद्रा में अपनी कुल शुद्ध संपत्ति मिल जाती है। उस कुल में हर मुद्रा का हिस्सा ही उसका जमाव है:',
      formula: 'जमाव % = (मुद्रा X में शुद्ध रकम × खर्च की मुद्रा में दर) / कुल शुद्ध संपत्ति × 100',
      items: [
        {
          strong: 'शुद्ध स्थिति',
          rest:
            ' हर मुद्रा में = उस मुद्रा की संपत्तियों का जोड़ घटा देनदारियों का जोड़। अगर शुद्ध रकम माइनस में है, तो इसका मतलब है कि उस मुद्रा में आपके पास जितना है, उससे ज़्यादा आप पर है।',
        },
        {
          strong: 'खर्च की मुद्रा में दर',
          rest:
            ' वह गुणक है जो मुद्रा X की एक इकाई को आपकी खर्च की मुद्रा में बदलता है। ये दरें यूरोपीय केंद्रीय बैंक से Frankfurter API के ज़रिए सीधे आपके ब्राउज़र में आती हैं। दरें कारोबारी दिनों में रोज़ अपडेट होती हैं। ECB की संदर्भ दरें मानक हैं, और आपके बैंक या ब्रोकर की असल दरों से अलग हो सकती हैं।',
        },
        {
          strong: 'जमाव के स्तर',
          rest:
            ' सिर्फ़ उन मुद्राओं पर लागू होते हैं जो आपकी खर्च की मुद्रा नहीं हैं। 20% से नीचे को कम, 20-40% को मध्यम, और 40% से ऊपर को ज़्यादा माना जाता है। ये बताते हैं कि शुद्ध संपत्ति का कितना बड़ा हिस्सा उस मुद्रा में पड़ा है, यह नहीं कि उसके बारे में क्या करना चाहिए। आपकी खर्च की मुद्रा पर कभी यह निशान नहीं लगता।',
        },
        {
          strong: 'शुद्ध और सकल एक्सपोज़र।',
          rest:
            ' जमाव शुद्ध स्थितियों पर निकाला जाता है। अगर आप पर विदेशी मुद्रा में बड़ा कर्ज़ है जो उसी मुद्रा की किसी संपत्ति की भरपाई कर देता है (जैसे USD का होम लोन और साथ में USD की बचत), तो शुद्ध स्थिति छोटी रहती है, लेकिन दोनों तरफ़ आपका सकल FX एक्सपोज़र उससे कहीं बड़ा होता है। यह टूल शुद्ध रकम नापता है; असल दुनिया के विनिमय दर जोखिम को आँकते समय सकल आँकड़े अलग से देखिए।',
        },
        {
          strong: 'सारी गणना आपके डिवाइस पर होती है।',
          rest:
            ' आपकी संपत्तियों के नाम, रकमें और जोड़ कभी आपके ब्राउज़र से बाहर नहीं जाते। एकमात्र नेटवर्क अनुरोध Frankfurter से विनिमय दरें लाने का है, जिसमें सिर्फ़ आपकी खर्च की मुद्रा का कोड जाता है (जैसे ',
          after: ') और आपकी संपत्तियों के बारे में कुछ नहीं।',
        },
      ],
    },
    faq: {
      heading: 'अक्सर पूछे जाने वाले सवाल',
      items: [
        {
          q: 'शुद्ध संपत्ति कैलकुलेटर कैसे काम करता है?',
          a:
            'आप अपनी संपत्तियाँ और देनदारियाँ, उनकी मुद्रा और मौजूदा रकम के साथ दर्ज करते हैं। टूल ECB की ताज़ा संदर्भ विनिमय दरें लाता है (मुफ़्त Frankfurter API से), सब कुछ आपकी चुनी हुई खर्च की मुद्रा में बदलता है, और आपकी कुल शुद्ध संपत्ति एक ही संख्या में दिखाता है। उसके नीचे यह डोनट चार्ट में दिखाता है कि आपका पैसा किन मुद्राओं में कितना जमा है, और हर उस मुद्रा पर निशान लगाता है जो आपकी खर्च की मुद्रा नहीं है और जिसमें आपका एक्सपोज़र "ज़्यादा" स्तर पर है।',
        },
        {
          q: 'मुद्रा जमाव का जोखिम क्या है?',
          a:
            'अगर आपकी शुद्ध संपत्ति का बड़ा हिस्सा ऐसी मुद्रा में है जिसमें आप खर्च नहीं करते, तो विनिमय दर के घटने-बढ़ने से आपकी असल क्रय शक्ति बदल जाती है। जैसे, अगर आप यूरोप में रिटायर होने की सोच रहे हैं लेकिन अपनी 70% संपत्ति USD में रखते हैं, तो USD/EUR में 10% का बदलाव (EUR/USD में कई सालों में, एक ही साल के भीतर, इतना उतार-चढ़ाव देखा गया है) आपके रिटायरमेंट फ़ंड को यूरो में नापने पर क़रीब 7% बदल देगा।',
        },
        {
          q: 'क्या यह मेरे वित्तीय आँकड़े कहीं भेजता है?',
          a:
            'नहीं। सारी गणना आपके ब्राउज़र में होती है। आपकी संपत्तियों के नाम, रकमें और मुद्राएँ किसी सर्वर पर नहीं भेजी जातीं। एकमात्र बाहरी अनुरोध Frankfurter API से विनिमय दरें लाने का है, और उसमें सिर्फ़ आपकी खर्च की मुद्रा का कोड जाता है, आपके आँकड़े नहीं। टूल इस्तेमाल करते समय पेज के पते में कुछ नहीं जाता। जब आप शेयर लिंक कॉपी करते हैं, तो आपकी रकमें लिंक में # के बाद रखी जाती हैं, और लिंक का वह हिस्सा ब्राउज़र कभी सर्वर को नहीं भेजता; पेज उन्हें एनालिटिक्स शुरू होने से पहले पते से हटा देता है। शेयर करना है या नहीं, यह आप तय करते हैं।',
        },
        {
          q: 'कौन सी मुद्राएँ समर्थित हैं?',
          a:
            '29 मुद्राएँ समर्थित हैं, जिनमें यूरो (EUR), अमेरिकी डॉलर (USD), ब्रिटिश पाउंड (GBP), स्विस फ़्रैंक (CHF), जापानी येन (JPY), भारतीय रुपया (INR), चीनी युआन (CNY), कनाडाई डॉलर (CAD), ऑस्ट्रेलियाई डॉलर (AUD), सिंगापुर डॉलर (SGD), और नॉर्डिक, मध्य यूरोपीय, लैटिन अमेरिकी तथा दक्षिण-पूर्व एशियाई प्रमुख मुद्राएँ शामिल हैं। विनिमय दरें ECB से Frankfurter के ज़रिए आती हैं, जो संदर्भ दरें हैं और आम ग्राहक को उसके बैंक में मिलने वाली दरों से अलग हो सकती हैं।',
        },
        {
          q: 'शेयर करने के "पूरा हिसाब" और "रकम और नाम छिपाकर" वाले तरीक़ों में क्या फ़र्क़ है?',
          a:
            '"पूरा हिसाब" वाले तरीक़े में आपकी संपत्तियों के नाम, रकमें, मुद्राएँ और किस्में सब लिंक में आती हैं: लिंक वाला कोई भी आपका पूरा ब्यौरा देख सकता है और हिसाब जाँच सकता है। "रकम और नाम छिपाकर" वाले तरीक़े में सिर्फ़ हर मुद्रा का जमाव प्रतिशत और जोखिम के स्तर आते हैं: न रकम, न संपत्तियों के नाम। जो भी तरीक़ा चुनें, वह एक लिंक के रूप में आपके क्लिपबोर्ड पर कॉपी होता है, और कौन सा भेजना है यह आप चुनते हैं।',
        },
        {
          q: 'विनिमय दरें कहाँ से आती हैं?',
          a:
            'दरें यूरोपीय केंद्रीय बैंक से, मुफ़्त Frankfurter API (api.frankfurter.dev) के ज़रिए आती हैं। ये संदर्भ दरें हैं, ECB के कारोबारी दिनों में रोज़ अपडेट होती हैं, और इन्हें लेन-देन का भाव नहीं बल्कि मानक माना जाना चाहिए। आपके बैंक या ब्रोकर पर असल में जो दर मिलती है उसमें स्प्रेड जुड़ा होता है और वह काफ़ी अलग हो सकती है, ख़ासकर छोटी मुद्राओं में। किसी API कुंजी की ज़रूरत नहीं है, और अनुरोध सीधे आपके ब्राउज़र से जाता है।',
        },
        {
          q: '"खर्च की मुद्रा" (functional currency) का क्या मतलब है?',
          a:
            'आपकी खर्च की मुद्रा (कैलकुलेटर में इस पर "मुख्य मुद्रा" का बैज लगता है) वह मुद्रा है जिसमें आपका रोज़ का खर्च चलता है: आपके बिल, किराया और राशन की क़ीमत उसी मुद्रा में होती है। जोखिम के निशान से हम इसे अलग रखते हैं, क्योंकि विनिमय दरें बदलने से खर्च की मुद्रा में रखे पैसे से खरीदी जा सकने वाली चीज़ें नहीं बदलतीं।',
        },
        {
          q: '"कम", "मध्यम" और "ज़्यादा" का क्या मतलब है?',
          a:
            'ये उन मुद्राओं की स्थिति बताने वाले स्तर हैं जो आपकी खर्च की मुद्रा नहीं हैं: शुद्ध संपत्ति के 20% से नीचे "कम", 20-40% "मध्यम", और 40% से ऊपर "ज़्यादा"। ये सिर्फ़ जमाव का आकार बताते हैं, यह नहीं कि आपको इसके बारे में क्या करना चाहिए। कोई स्तर आपकी स्थिति में ठीक बैठता है या नहीं, यह इस पर निर्भर है कि आगे आपका खर्च कहाँ और किस मुद्रा में होगा, आप कहाँ रिटायर होना चाहते हैं, और आप मुद्रा जोखिम को बाकी लक्ष्यों के साथ कैसे संतुलित करना चुनते हैं।',
        },
        {
          q: 'क्या कर्ज़ और देनदारियाँ भी जोड़ी जा सकती हैं?',
          a:
            'हाँ। हर पंक्ति में संपत्ति/देनदारी का टॉगल है। देनदारी की रकम उस मुद्रा की शुद्ध स्थिति से घटा दी जाती है। अगर आपके पास USD की बचत के साथ USD का होम लोन भी है, तो टूल आपका शुद्ध USD एक्सपोज़र दिखाता है। जिस मुद्रा में आपके पास जितना है उससे ज़्यादा आप पर है, उस पर "शुद्ध देनदारी" का निशान लगता है।',
        },
        {
          q: 'CSV अपलोड कैसे काम करता है?',
          a:
            'एक CSV फ़ाइल बनाएँ जिसमें ये कॉलम हों: name (वैकल्पिक), value (ज़रूरी), currency (ज़रूरी, तीन अक्षरों का कोड), type (वैकल्पिक, "asset" या "liability", न दें तो संपत्ति माना जाता है)। "CSV अपलोड करें" पर क्लिक करें, फ़ाइल चुनें, और पंक्तियाँ अपने आप भर जाएँगी। जो पंक्तियाँ ग़लत हैं, वे लाइन नंबर के साथ दिखा दी जाती हैं, ताकि आप उन्हें ठीक कर सकें। अपलोड करने से पहले पुष्टि माँगी जाती है, फिर मौजूदा आँकड़ों की जगह फ़ाइल के आँकड़े आ जाते हैं।',
        },
      ],
    },
    related: {
      heading: 'अपनी शुद्ध संपत्ति को समझें',
      lead: 'शुद्ध संपत्ति क्या है, इससे लेकर कई मुद्राओं में पैसा संभालने तक।',
      items: [
        {
          kicker: 'बुनियाद',
          title: 'शुद्ध संपत्ति क्या है और यह क्यों मायने रखती है',
          desc:
            'संपत्तियाँ घटा देनदारियाँ: वित्तीय सेहत का सबसे सीधा नाप। यह टूल उसी को कई मुद्राओं तक बढ़ाता है।',
        },
        {
          kicker: 'शुद्ध संपत्ति',
          title: '10 मिनट में अपनी शुद्ध संपत्ति कैसे निकालें',
          desc:
            'वही दो-कॉलम वाला तरीक़ा जो यह कैलकुलेटर अपनाता है: जो आपके पास है वह लिखें, जो आप पर बकाया है वह लिखें, और फ़र्क़ निकालिए।',
        },
        {
          kicker: 'मुद्रा प्रबंधन',
          title: 'कई मुद्राओं में पैसा संभालना',
          desc:
            'कई मुद्राओं में कमाने, बचाने और खर्च करने के व्यावहारिक तरीक़े, बिना FX शुल्क में पैसा गँवाए।',
        },
        {
          kicker: 'कर्ज़',
          title: 'देनदारियाँ: आप पर क्या है, और ब्याज दर क्यों मायने रखती है',
          desc:
            'विदेशी मुद्रा का लोन एक साथ दो जोखिम लाता है: ब्याज की लागत और विनिमय दर का घटना-बढ़ना। कैलकुलेटर दोनों को जोड़कर देखता है।',
        },
        {
          kicker: 'क्रय शक्ति',
          title: 'कुछ देशों में आपका यूरो ज़्यादा क्यों खरीदता है',
          desc:
            'विनिमय दर सिर्फ़ आधी कहानी है। देशों के बीच संपत्ति की तुलना करते समय स्थानीय क़ीमतों का स्तर भी उतना ही मायने रखता है।',
        },
        {
          kicker: 'महँगाई',
          title: 'क्रय शक्ति: आज के €1,000 कल के €1,000 क्यों नहीं रहते',
          desc:
            'असल संपत्ति देखने का एक चश्मा मुद्रा है, दूसरा महँगाई। खाते में दिखने वाली रकम (nominal balance) इनमें से कुछ नहीं बताती।',
        },
        {
          kicker: 'FIRE (जल्दी रिटायरमेंट)',
          title: 'वित्तीय स्वतंत्रता: एक परिचय',
          desc:
            'FIRE की बुनियादी बातें, और यह कि रिटायरमेंट जब कई देशों में फैला हो तो मुद्राओं का विविधीकरण क्यों मायने रखता है।',
        },
        {
          kicker: 'योजना',
          title: 'वित्तीय लक्ष्य तय करना',
          desc:
            'लक्ष्य अक्सर परिसंपत्ति आवंटन (asset allocation) को कैसे आकार देते हैं, इसमें यह भी कि लोग किन मुद्राओं में पैसा रखते हैं।',
        },
      ],
      footerTag: 'मुद्रा प्रबंधन पर और पढ़ें',
      footerAll: 'या सारे पाठ देखें',
    },
  },
  island: {
    currencies: currenciesHi,
    toolbar: {
      aria: 'शुद्ध संपत्ति कैलकुलेटर के बटन',
      currencyLabel: 'आपकी मुद्रा (जिसमें आप खर्च करते हैं)',
      currencyHelp:
        'आपकी शुद्ध संपत्ति इसी मुद्रा में दिखाई जाती है। किसी और मुद्रा में जो कुछ है, उसे आज की ECB दरों पर इसी मुद्रा में बदलकर दिखाया जाता है।',
      share: 'शेयर करें',
      shareTitle: 'अपनी शुद्ध संपत्ति शेयर करें',
      reset: 'रीसेट करें',
      resetTitle: 'सारे आँकड़े हटाकर नए सिरे से शुरू करें',
      copiedLabel: 'लिंक क्लिपबोर्ड पर कॉपी हो गया',
      shareUrlAria: 'शेयर करने योग्य लिंक',
    },
    rates: {
      errorBefore: 'विनिमय दरें उपलब्ध नहीं हैं, इसलिए रकमें अपनी मूल मुद्रा में, बिना बदले दिखाई जा रही हैं।',
      retry: 'फिर कोशिश करें',
      loading: 'विनिमय दरें लाई जा रही हैं…',
      partial:
        'एक या ज़्यादा मुद्राओं की ताज़ा दर नहीं मिली, इसलिए उन्हें नीचे के जोड़ से बाहर रखा गया है। उनकी मूल मुद्रा वाली रकमें हर मुद्रा के कार्ड पर दिखाई गई हैं।',
    },
    shared: {
      readOnly:
        'आप किसी का शेयर किया हुआ शुद्ध संपत्ति का हिसाब देख रहे हैं। जो दिख रहा है, वही भेजने वाले ने शेयर करने के लिए चुना। आप नीचे के फ़ॉर्म से नए सिरे से शुरू कर सकते हैं।',
    },
    table: {
      heading: 'आपकी संपत्तियाँ और देनदारियाँ',
      itemsOne: '{count} आइटम',
      itemsMany: '{count} आइटम',
      aria: 'संपत्तियाँ और देनदारियाँ',
      colName: 'नाम',
      colValue: 'रकम',
      colCurrency: 'मुद्रा',
      colType: 'किस्म',
      colActions: 'क्रियाएँ',
      addAsset: '+ संपत्ति जोड़ें',
      uploadCsv: 'CSV अपलोड करें',
      uploadCsvAria: 'CSV फ़ाइल अपलोड करें',
      downloadCsv: 'CSV डाउनलोड करें',
      downloadTitle: 'अपनी संपत्तियाँ CSV में डाउनलोड करें',
      errorTitleOne: '{count} पंक्ति आयात नहीं हो सकी:',
      errorTitleMany: '{count} पंक्तियाँ आयात नहीं हो सकीं:',
      errorLine: 'लाइन {line}: {message}',
      csvErrors: {
        empty: 'CSV फ़ाइल खाली है।',
        columns: 'कम से कम value और currency कॉलम होने चाहिए।',
        invalidValue: '"{value}" शून्य से बड़ी कोई मान्य संख्या नहीं है।',
        emptyCurrency: 'मुद्रा कोड खाली है।',
        unsupportedCurrency: '"{value}" समर्थित मुद्रा नहीं है। समर्थित मुद्राएँ: {supported}।',
      },
    },
    row: {
      nameAria: 'संपत्ति का नाम (कुल {total} में से पंक्ति {index})',
      valueAria: 'रकम (पंक्ति {index})',
      currencyAria: 'मुद्रा (पंक्ति {index})',
      typeAria: 'किस्म (पंक्ति {index})',
      namePlaceholder: 'संपत्ति/देनदारी का नाम',
      asset: 'संपत्ति',
      liability: 'देनदारी',
      removeTitle: 'हटाएँ',
      removeAria: 'पंक्ति {index} हटाएँ',
    },
    results: {
      empty: 'अपनी शुद्ध संपत्ति देखने के लिए कम से कम एक संपत्ति जोड़िए।',
      totalLabel: 'कुल शुद्ध संपत्ति',
      hidden: 'छिपा हुआ',
      whatYouOwn: 'जो आपके पास है',
      whatYouOwe: 'जो आप पर बकाया है',
      singleNote:
        'यहाँ सब कुछ एक ही मुद्रा में है: {currency}। इसलिए विनिमय दरों का इस पर असर नहीं पड़ता। अगर आप किसी और मुद्रा में रखी कोई चीज़ जोड़ेंगे, तो यह भी दिखेगा कि आपकी शुद्ध संपत्ति का कितना हिस्सा विनिमय दरों पर निर्भर है।',
      partialHint: 'कम से कम एक मुद्रा की ताज़ा दर नहीं मिली, इसलिए वह इस जोड़ में शामिल नहीं है।',
      rateUnavailable: 'दर नहीं मिली',
      noRateAvailable: '{code} की {currency} के मुक़ाबले ताज़ा दर नहीं मिली; रकम मूल मुद्रा में, बिना बदले दिखाई गई है',
      badgeFunctional: 'मुख्य मुद्रा',
      badgeNetDebt: 'शुद्ध देनदारी',
      badgeElevated: 'ज़्यादा',
      badgeModerate: 'मध्यम',
      badgeLow: 'कम',
      riskHeading: 'हर मुद्रा के जोखिम का आकलन',
      labelFunctional: 'यह आपकी खर्च की मुद्रा है',
      labelNetDebt: 'इस मुद्रा में शुद्ध देनदारी',
      labelElevated: 'ज़्यादा एक्सपोज़र',
      labelModerate: 'मध्यम एक्सपोज़र',
      labelLow: 'कम एक्सपोज़र',
      disclaimer:
        'यह कैलकुलेटर ECB की संदर्भ दरों पर, आपकी हर मुद्रा में शुद्ध स्थिति का गणितीय जमाव दिखाता है; ये दरें आपके बैंक या ब्रोकर पर मिलने वाली दरों से अलग हो सकती हैं। इसमें आपकी आगे की खर्च योजना, कर निवास, हेजिंग की रणनीति या जोखिम लेने की क्षमता शामिल नहीं है, और यह वित्तीय सलाह नहीं है। अपने हालात के लिए सलाह चाहिए तो किसी लाइसेंस प्राप्त वित्तीय सलाहकार से बात कीजिए।',
    },
    rec: {
      noRate:
        '{code} की {currency} के मुक़ाबले ताज़ा दर ECB के फ़ीड से नहीं मिली, इसलिए यह स्थिति जमाव के हिसाब से बाहर रखी गई है। मूल मुद्रा वाली शुद्ध रकम ऊपर अब भी दिखाई गई है।',
      functionalHidden:
        'यह आपकी खर्च की मुद्रा है। इस शेयर किए गए हिसाब में जमाव का प्रतिशत शामिल नहीं है।',
      functionalMost:
        'आपकी शुद्ध संपत्ति का {pct}% आपकी खर्च की मुद्रा ({currency}) में है। बाकी {rest}% दूसरी मुद्राओं में है और उनकी विनिमय दरों के साथ घटता-बढ़ता है।',
      functionalMuch:
        'आपकी शुद्ध संपत्ति का {pct}% आपकी खर्च की मुद्रा ({currency}) में है। बाकी {rest}% दूसरी मुद्राओं में है, यानी आपकी रोज़मर्रा की क्रय शक्ति का एक अच्छा-ख़ासा हिस्सा उनकी विनिमय दरों के साथ घटता-बढ़ता है।',
      functionalLittle:
        'आपकी शुद्ध संपत्ति का सिर्फ़ {pct}% आपकी खर्च की मुद्रा ({currency}) में है। बाकी {rest}% दूसरी मुद्राओं में है, यानी आपकी ज़्यादातर क्रय शक्ति उनकी विनिमय दरों के साथ घटती-बढ़ती है।',
      netDebt:
        '{code} में आपके पास जितना है, उससे ज़्यादा आप पर है (यानी "शुद्ध देनदारी" की स्थिति)। जब किसी मुद्रा में देनदारियाँ संपत्तियों से ज़्यादा हों, तो असर उलटा होता है: अगर {currency} के मुक़ाबले {code} मज़बूत हो, तो आप पर जो है वह बढ़ता है और आपकी शुद्ध संपत्ति घटती है; अगर {code} कमज़ोर हो, तो आपकी शुद्ध संपत्ति बढ़ती है।',
      elevatedHidden:
        'इस शेयर किए गए हिसाब में आपकी {code} वाली स्थिति शुद्ध संपत्ति का बड़ा हिस्सा है। अगर {currency} के मुक़ाबले {code} 10% मज़बूत या कमज़ोर हो, तो आपकी शुद्ध संपत्ति भी उसके साथ काफ़ी बढ़ेगी या घटेगी।',
      elevatedShown:
        'आपकी शुद्ध संपत्ति का {pct}% {code} में पड़ा है। अगर {currency} के मुक़ाबले {code} 10% मज़बूत या कमज़ोर हो, तो आपकी शुद्ध संपत्ति भी उसके साथ क़रीब {sensitivity}% बढ़ेगी या घटेगी।',
      moderateHidden:
        'आपकी शुद्ध संपत्ति का एक मध्यम हिस्सा {code} में है। अगर {currency} के मुक़ाबले {code} 10% मज़बूत या कमज़ोर हो, तो आपकी शुद्ध संपत्ति भी उसके साथ बढ़ेगी या घटेगी, {code} वाले हिस्से के क़रीब दसवें भाग जितनी।',
      moderateShown:
        'आपकी शुद्ध संपत्ति का {pct}% {code} में है। अगर {currency} के मुक़ाबले {code} 10% मज़बूत या कमज़ोर हो, तो आपकी शुद्ध संपत्ति भी उसके साथ क़रीब {sensitivity}% बढ़ेगी या घटेगी।',
      lowHidden:
        'आपकी शुद्ध संपत्ति का एक छोटा हिस्सा {code} में है। {code}/{currency} की दर का असर आपकी कुल शुद्ध संपत्ति पर सीमित ही रहता है।',
      lowShown:
        'आपकी शुद्ध संपत्ति का {pct}% {code} में है। अगर {currency} के मुक़ाबले {code} 10% मज़बूत या कमज़ोर हो, तो आपकी शुद्ध संपत्ति भी उसके साथ क़रीब {sensitivity}% बढ़ेगी या घटेगी।',
    },
    chart: {
      heading: 'मुद्रा मिश्रण',
      emptyNoRates:
        'विनिमय दरें अभी उपलब्ध नहीं हैं, इसलिए मुद्राओं की तुलना चार्ट में नहीं की जा सकती।',
      emptyNoValues: 'चार्ट देखने के लिए ऊपर रकमें भरिए।',
      currencyOne: 'मुद्रा',
      currencyMany: 'मुद्राएँ',
      legendAria: 'मुद्राएँ',
      aria: 'मुद्रा मिश्रण का डोनट चार्ट। {list}',
      listSeparator: '। ',
      announce: '{name}: आपकी शुद्ध संपत्ति का {pct}।',
      announceWithAmount: '{name}: आपकी शुद्ध संपत्ति का {pct}, यानी {amount}।',
      note:
        'चार्ट में नहीं: {codes}, क्योंकि {currency} के मुक़ाबले अभी कोई विनिमय दर नहीं है।',
      tableCaption: 'शुद्ध स्थिति के हिसाब से मुद्रा जमाव',
      tableColCurrency: 'मुद्रा',
      tableColConcentration: 'जमाव',
      tableColRisk: 'जोखिम का स्तर',
    },
    csv: {
      confirmOne:
        'CSV अपलोड करने पर आपकी मौजूदा सूची ({current} आइटम) की जगह फ़ाइल की सूची ({pending} आइटम) आ जाएगी। आगे बढ़ें?',
      confirmMany:
        'CSV अपलोड करने पर आपकी मौजूदा सूची ({current} आइटम) की जगह फ़ाइल की सूची ({pending} आइटम) आ जाएगी। आगे बढ़ें?',
      replace: 'बदल दें',
      cancel: 'रद्द करें',
    },
    shareModal: {
      title: 'अपना हिसाब शेयर करें',
      legend: 'क्या शेयर करना है, चुनें:',
      fullName: 'पूरा हिसाब',
      fullDesc: 'संपत्तियों का पूरा ब्यौरा, रकमें और शुद्ध संपत्ति',
      redactedName: 'रकम और नाम छिपाकर',
      redactedDesc: 'सिर्फ़ हर मुद्रा का हिस्सा % और जोखिम के स्तर। न रकम, न नाम।',
      cancel: 'रद्द करें',
      copy: 'लिंक कॉपी करें',
      copied: 'कॉपी हो गया!',
      previewHeading: 'पाने वाले को क्या दिखेगा',
    },
  },
};
