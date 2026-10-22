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
 *   - `nidhi`, `Frankfurter`, `CSV`, and the currency codes and names.
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

import { currenciesCs, currenciesEn, currenciesEs, currenciesHi, currenciesMr } from './currencies.ts';

export const multiCurrencyNetWorthEn = {
  meta: {
    title: 'Net Worth Calculator, in One Currency or Several | nidhi',
    description:
      'Free net worth calculator for one currency or several: 38 currencies at the latest official exchange rates, plus a currency risk check. Runs in your browser; nothing is sent.',
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
      'Calculate total net worth across 38 currencies in your chosen functional currency',
      'Add unlimited assets and liabilities in any supported currency',
      'Latest official exchange rates via the Frankfurter API',
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
      'Add what you own and what you owe, in one currency or several. See your net worth in your chosen currency at the latest official exchange rates. If you hold more than one currency, check how much of it sits in currencies you don’t actually spend in. Everything runs in your browser. Nothing is sent to a server. Supports USD, EUR, GBP, INR, JPY, and 33 more.',
    plannerLine:
      'The full nidhi planner turns multi-currency net worth into a long-range plan, so you can see how location, spending currency, and major decisions change the path.',
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
            ' is the multiplier that converts one unit of currency X into your functional currency, taken from the Frankfurter API, which combines the rates published by central banks and other official sources, and fetched directly by your browser. Rates are updated as those sources publish them, usually each business day. They are reference rates: benchmarks that may differ from the rates your bank or broker actually offers.',
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
            'You add your assets and liabilities with their currency and current value. The tool fetches the latest official exchange rates (via the free Frankfurter API), converts everything to your chosen functional currency, and shows your total net worth as a single number. Below that, it shows your currency concentration as a donut chart and flags any non-functional currency where you have elevated exposure.',
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
            'Thirty-eight currencies are supported, including the Euro (EUR), US Dollar (USD), British Pound (GBP), Swiss Franc (CHF), Japanese Yen (JPY), Indian Rupee (INR), Chinese Yuan (CNY), Canadian Dollar (CAD), Australian Dollar (AUD), Singapore Dollar (SGD), Bangladeshi Taka (BDT), Kenyan Shilling (KES), the West and Central African CFA francs (XOF, XAF), and the main Nordic, Central European, Latin American, South Asian, South-East Asian and African currencies. Exchange rates come from central banks and other official sources via Frankfurter, and are reference rates and may differ from the rates available to retail customers at their bank.',
        },
        {
          q: 'What\'s the difference between the "Full" and "Redacted" share modes?',
          a:
            'Full mode includes all your asset names, values, currencies, and types in the URL: anyone with the link can see your full breakdown and verify the math. Redacted mode includes only the per-currency concentration percentages and the band labels: no amounts, no asset names. Both are copied to your clipboard as a single link, and you choose which to send.',
        },
        {
          q: 'How are exchange rates sourced?',
          a:
            'Rates come from the free Frankfurter API (api.frankfurter.dev), which combines the exchange rates published by central banks and other official sources. They are reference rates, updated as those sources publish them (usually each business day), intended as benchmarks rather than transactable quotes. The rates you actually receive at your bank or broker include a spread and may be materially different, especially for smaller currencies. No API key is required, and the request is made directly from your browser.',
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
    /** The 38 currency names, shared by the three tools: see `./currencies.ts`. */
    currencies: currenciesEn,
    toolbar: {
      aria: 'Net worth calculator actions',
      currencyLabel: 'Your currency (the one you spend in)',
      currencyHelp:
        'Your net worth is shown in this currency. Anything in another currency is converted at the latest official exchange rates.',
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
      itemsFew: '{count} items',
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
      errorTitleFew: '{count} rows could not be imported:',
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
        'This calculator shows mathematical concentrations of your net positions across currencies, using official reference rates that may differ from rates available at your bank or broker. It does not account for your future spending plans, tax residency, hedging strategies, or risk tolerance, and it is not financial advice. For personalized advice, consult a licensed financial advisor.',
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
        'Live rate for {code} against {currency} was not returned by the exchange-rate service, so this position is excluded from the concentration math. The original-currency net amount is still shown above.',
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
      currencyFew: 'currencies',
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
      confirmFew:
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
    title: 'शुद्ध संपत्ति (Net\u00A0Worth) कैलकुलेटर, एक मुद्रा में या कई में | nidhi',
    description:
      'मुफ़्त शुद्ध संपत्ति कैलकुलेटर, एक मुद्रा के लिए या कई के लिए: ताज़ा आधिकारिक दरों पर 38 मुद्राएँ, और साथ में मुद्रा जोखिम की जाँच। सारी गणना आपके ब्राउज़र में; कुछ भी नहीं भेजा जाता।',
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
      'अपनी चुनी हुई मुद्रा में 38 मुद्राओं तक फैली कुल शुद्ध संपत्ति निकालें',
      'किसी भी समर्थित मुद्रा में जितनी चाहें संपत्तियाँ और देनदारियाँ जोड़ें',
      'Frankfurter API से ताज़ा आधिकारिक विनिमय दरें',
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
    title: 'शुद्ध संपत्ति (Net\u00A0Worth) कैलकुलेटर, एक मुद्रा में या कई में',
    lead:
      'जो आपके पास है और जो आप पर बकाया है, उसे एक मुद्रा में या कई मुद्राओं में दर्ज करें। अपनी चुनी हुई मुद्रा में अपनी शुद्ध संपत्ति देखें, ताज़ा आधिकारिक दरों पर बदलकर। अगर आपके पास एक से ज़्यादा मुद्राएँ हैं, तो देखें कि उनमें से कितना पैसा ऐसी मुद्राओं में पड़ा है जिनमें आप असल में खर्च नहीं करते। सारी गणना आपके ब्राउज़र में होती है। किसी सर्वर पर कुछ नहीं भेजा जाता। USD, EUR, GBP, INR, JPY और 33 अन्य मुद्राएँ समर्थित हैं।',
    plannerLine:
      'nidhi का पूरा प्लानर कई मुद्राओं में फैली शुद्ध संपत्ति को लंबी अवधि की योजना में बदल देता है, ताकि आप देख सकें कि जगह, खर्च की मुद्रा और बड़े फ़ैसले इस रास्ते को कैसे बदलते हैं।',
    explainer: {
      heading: 'हिसाब कैसे लगता है',
      intro:
        'हर मुद्रा में हम आपकी संपत्तियों में से देनदारियाँ (liabilities) घटाकर शुद्ध स्थिति निकालते हैं, फिर उसे ताज़ा विनिमय दरों (exchange\u00A0rates) पर आपकी खर्च की मुद्रा में बदल देते हैं। इन बदली हुई रकमों को जोड़ें, और आपको एक ही मुद्रा में अपनी कुल शुद्ध संपत्ति मिल जाती है। उस कुल में हर मुद्रा का हिस्सा ही उसका जमाव है:',
      formula: 'जमाव % = (मुद्रा X में शुद्ध रकम × खर्च की मुद्रा में दर) / कुल शुद्ध संपत्ति × 100',
      items: [
        {
          strong: 'शुद्ध स्थिति',
          rest:
            ' हर मुद्रा में = उस मुद्रा की संपत्तियों का जोड़ घटा देनदारियों का जोड़। अगर शुद्ध रकम माइनस में है, तो इसका मतलब है कि उस मुद्रा में आपके पास जितना है, उससे ज़्यादा आप पर बकाया है।',
        },
        {
          strong: 'खर्च की मुद्रा में दर',
          rest:
            ' वह गुणक है जो मुद्रा X की एक इकाई को आपकी खर्च की मुद्रा में बदलता है। ये दरें Frankfurter API से सीधे आपके ब्राउज़र में आती हैं, जो केंद्रीय बैंकों और दूसरे आधिकारिक स्रोतों की प्रकाशित दरों को मिलाकर देती है। दरें तब अपडेट होती हैं जब ये स्रोत उन्हें प्रकाशित करते हैं, आम तौर पर हर कारोबारी दिन। ये संदर्भ दरें मानक हैं, और आपके बैंक या ब्रोकर की असल दरों से अलग हो सकती हैं।',
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
            'आप अपनी संपत्तियाँ और देनदारियाँ, उनकी मुद्रा और मौजूदा रकम के साथ दर्ज करते हैं। टूल ताज़ा आधिकारिक विनिमय दरें लाता है (मुफ़्त Frankfurter API से), सब कुछ आपकी चुनी हुई खर्च की मुद्रा में बदलता है, और आपकी कुल शुद्ध संपत्ति एक ही संख्या में दिखाता है। उसके नीचे यह डोनट चार्ट में दिखाता है कि आपका पैसा किन मुद्राओं में कितना जमा है, और हर उस मुद्रा पर निशान लगाता है जो आपकी खर्च की मुद्रा नहीं है और जिसमें आपका एक्सपोज़र "ज़्यादा" स्तर पर है।',
        },
        {
          q: 'मुद्रा जमाव का जोखिम क्या है?',
          a:
            'अगर आपकी शुद्ध संपत्ति का बड़ा हिस्सा ऐसी मुद्रा में है जिसमें आप खर्च नहीं करते, तो विनिमय दर के घटने-बढ़ने से आपकी असल क्रय शक्ति (purchasing\u00A0power) बदल जाती है। जैसे, अगर आप यूरोप में रिटायर होने की सोच रहे हैं लेकिन अपनी 70% संपत्ति USD में रखते हैं, तो USD/EUR में 10% का बदलाव (EUR/USD में कई सालों में, एक ही साल के भीतर, इतना उतार-चढ़ाव देखा गया है) आपके रिटायरमेंट फ़ंड को यूरो में नापने पर क़रीब 7% बदल देगा।',
        },
        {
          q: 'क्या यह मेरे वित्तीय आँकड़े कहीं भेजता है?',
          a:
            'नहीं। सारी गणना आपके ब्राउज़र में होती है। आपकी संपत्तियों के नाम, रकमें और मुद्राएँ किसी सर्वर पर नहीं भेजी जातीं। एकमात्र बाहरी अनुरोध Frankfurter API से विनिमय दरें लाने का है, और उसमें सिर्फ़ आपकी खर्च की मुद्रा का कोड जाता है, आपके आँकड़े नहीं। टूल इस्तेमाल करते समय पेज के पते में कुछ नहीं जाता। जब आप शेयर लिंक कॉपी करते हैं, तो आपकी रकमें लिंक में # के बाद रखी जाती हैं, और लिंक का वह हिस्सा ब्राउज़र कभी सर्वर को नहीं भेजता; पेज उन्हें एनालिटिक्स शुरू होने से पहले पते से हटा देता है। शेयर करना है या नहीं, यह आप तय करते हैं।',
        },
        {
          q: 'कौन सी मुद्राएँ समर्थित हैं?',
          a:
            '38 मुद्राएँ समर्थित हैं, जिनमें यूरो (EUR), अमेरिकी डॉलर (USD), ब्रिटिश पाउंड (GBP), स्विस फ़्रैंक (CHF), जापानी येन (JPY), भारतीय रुपया (INR), चीनी युआन (CNY), कनाडाई डॉलर (CAD), ऑस्ट्रेलियाई डॉलर (AUD), सिंगापुर डॉलर (SGD), बांग्लादेशी टका (BDT), केन्याई शिलिंग (KES), पश्चिम और मध्य अफ़्रीकी CFA फ़्रैंक (XOF, XAF), और नॉर्डिक, मध्य यूरोपीय, लैटिन अमेरिकी, दक्षिण एशियाई, दक्षिण-पूर्व एशियाई तथा अफ़्रीकी प्रमुख मुद्राएँ शामिल हैं। विनिमय दरें केंद्रीय बैंकों और दूसरे आधिकारिक स्रोतों से Frankfurter के ज़रिए आती हैं, जो संदर्भ दरें हैं और आम ग्राहक को उसके बैंक में मिलने वाली दरों से अलग हो सकती हैं।',
        },
        {
          q: 'शेयर करने के "पूरा हिसाब" और "रकम और नाम छिपाकर" वाले तरीक़ों में क्या फ़र्क़ है?',
          a:
            '"पूरा हिसाब" वाले तरीक़े में आपकी संपत्तियों के नाम, रकमें, मुद्राएँ और किस्में सब लिंक में आती हैं: लिंक वाला कोई भी आपका पूरा ब्यौरा देख सकता है और हिसाब जाँच सकता है। "रकम और नाम छिपाकर" वाले तरीक़े में सिर्फ़ हर मुद्रा का जमाव प्रतिशत और जोखिम के स्तर आते हैं: न रकम, न संपत्तियों के नाम। जो भी तरीक़ा चुनें, वह एक लिंक के रूप में आपके क्लिपबोर्ड पर कॉपी होता है, और कौन सा भेजना है यह आप चुनते हैं।',
        },
        {
          q: 'विनिमय दरें कहाँ से आती हैं?',
          a:
            'दरें मुफ़्त Frankfurter API (api.frankfurter.dev) से आती हैं, जो केंद्रीय बैंकों और दूसरे आधिकारिक स्रोतों की प्रकाशित दरों को मिलाकर देती है। ये संदर्भ दरें हैं, जो इन स्रोतों के प्रकाशित करने पर अपडेट होती हैं (आम तौर पर हर कारोबारी दिन), और इन्हें लेन-देन का भाव नहीं बल्कि मानक माना जाना चाहिए। आपके बैंक या ब्रोकर पर असल में जो दर मिलती है उसमें स्प्रेड जुड़ा होता है और वह काफ़ी अलग हो सकती है, ख़ासकर छोटी मुद्राओं में। किसी API कुंजी की ज़रूरत नहीं है, और अनुरोध सीधे आपके ब्राउज़र से जाता है।',
        },
        {
          q: '"खर्च की मुद्रा" (functional\u00A0currency) का क्या मतलब है?',
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
            'हाँ। हर पंक्ति में संपत्ति/देनदारी का टॉगल है। देनदारी की रकम उस मुद्रा की शुद्ध स्थिति से घटा दी जाती है। अगर आपके पास USD की बचत के साथ USD का होम लोन भी है, तो टूल आपका शुद्ध USD एक्सपोज़र दिखाता है। जिस मुद्रा में आपके पास जितना है उससे ज़्यादा आप पर बकाया है, उस पर "शुद्ध देनदारी" का निशान लगता है।',
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
          title: 'देनदारियाँ: आप पर क्या बकाया है, और ब्याज दर क्यों मायने रखती है',
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
            'असल संपत्ति देखने का एक चश्मा मुद्रा है, दूसरा महँगाई। खाते में दिखने वाली रकम (nominal\u00A0balance) इनमें से कुछ नहीं बताती।',
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
            'लक्ष्य अक्सर एसेट एलोकेशन को कैसे आकार देते हैं, इसमें यह भी कि लोग किन मुद्राओं में पैसा रखते हैं।',
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
        'आपकी शुद्ध संपत्ति इसी मुद्रा में दिखाई जाती है। किसी और मुद्रा में जो कुछ है, उसे ताज़ा आधिकारिक दरों पर इसी मुद्रा में बदलकर दिखाया जाता है।',
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
      itemsFew: '{count} आइटम',
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
      errorTitleFew: '{count} पंक्तियाँ आयात नहीं हो सकीं:',
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
        'यह कैलकुलेटर आधिकारिक संदर्भ दरों पर, आपकी हर मुद्रा में शुद्ध स्थिति का गणितीय जमाव दिखाता है; ये दरें आपके बैंक या ब्रोकर पर मिलने वाली दरों से अलग हो सकती हैं। इसमें आपकी आगे की खर्च योजना, कर निवास (tax\u00A0residency), हेजिंग की रणनीति या जोखिम लेने की क्षमता शामिल नहीं है, और यह वित्तीय सलाह नहीं है। अपने हालात के लिए सलाह चाहिए तो किसी लाइसेंस प्राप्त वित्तीय सलाहकार से बात कीजिए।',
    },
    rec: {
      noRate:
        '{code} की {currency} के मुक़ाबले ताज़ा दर विनिमय दर सेवा से नहीं मिली, इसलिए यह स्थिति जमाव के हिसाब से बाहर रखी गई है। मूल मुद्रा वाली शुद्ध रकम ऊपर अब भी दिखाई गई है।',
      functionalHidden:
        'यह आपकी खर्च की मुद्रा है। इस शेयर किए गए हिसाब में जमाव का प्रतिशत शामिल नहीं है।',
      functionalMost:
        'आपकी शुद्ध संपत्ति का {pct}% आपकी खर्च की मुद्रा ({currency}) में है। बाकी {rest}% दूसरी मुद्राओं में है और उनकी विनिमय दरों के साथ घटता-बढ़ता है।',
      functionalMuch:
        'आपकी शुद्ध संपत्ति का {pct}% आपकी खर्च की मुद्रा ({currency}) में है। बाकी {rest}% दूसरी मुद्राओं में है, यानी आपकी रोज़मर्रा की क्रय शक्ति का एक अच्छा-ख़ासा हिस्सा उनकी विनिमय दरों के साथ घटता-बढ़ता है।',
      functionalLittle:
        'आपकी शुद्ध संपत्ति का सिर्फ़ {pct}% आपकी खर्च की मुद्रा ({currency}) में है। बाकी {rest}% दूसरी मुद्राओं में है, यानी आपकी ज़्यादातर क्रय शक्ति उनकी विनिमय दरों के साथ घटती-बढ़ती है।',
      netDebt:
        '{code} में आपके पास जितना है, उससे ज़्यादा आप पर बकाया है (यानी "शुद्ध देनदारी" (net\u00A0debt) की स्थिति)। जब किसी मुद्रा में देनदारियाँ संपत्तियों से ज़्यादा हों, तो असर उलटा होता है: अगर {currency} के मुक़ाबले {code} मज़बूत हो, तो आप पर जो बकाया है वह बढ़ता है और आपकी शुद्ध संपत्ति घटती है; अगर {code} कमज़ोर हो, तो आपकी शुद्ध संपत्ति बढ़ती है।',
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
      currencyFew: 'मुद्राएँ',
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
      confirmFew:
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

/**
 * "Functional currency" is *moneda de referencia* throughout, the glossary's
 * term for the home currency; the risk badge shortens it to *Referencia*.
 */
export const multiCurrencyNetWorthEs: typeof multiCurrencyNetWorthEn = {
  meta: {
    title: 'Calculadora de patrimonio neto: una o varias monedas | nidhi',
    description:
      'Calculadora gratuita de patrimonio neto en 38 monedas, con tipos de cambio oficiales y riesgo cambiario. Se calcula en tu navegador, sin que salgan tus datos.',
  },
  schema: {
    name: 'Calculadora de patrimonio neto de nidhi',
    alternateName: [
      'Calculadora de patrimonio neto multimoneda de nidhi',
      'Calculadora de patrimonio neto multimoneda y análisis del riesgo cambiario de nidhi',
      'Calculadora de patrimonio neto para quienes viven en el extranjero, de nidhi',
      'Análisis del riesgo cambiario de nidhi',
      'Calculadora de exposición a divisas de nidhi',
      'Herramienta de riesgo cambiario de nidhi',
      'Comprobador de concentración en divisas de nidhi',
    ],
    operatingSystem: 'Cualquiera (navegador web)',
    browserRequirements: 'Requiere JavaScript. Navegador actualizado.',
    featureList: [
      'Calcula tu patrimonio neto total en 38 monedas, expresado en la moneda de referencia que elijas',
      'Añade todos los activos y pasivos que quieras, en cualquier moneda disponible',
      'Tipos de cambio oficiales actualizados, a través de la API de Frankfurter',
      'Gráfico de anillo de la concentración por moneda',
      'Evaluación del riesgo por moneda (bajo, moderado, elevado)',
      'Selector de activo o pasivo para calcular la posición neta',
      'Carga masiva desde CSV',
      'Dos formas de compartir: datos completos o anónimos',
      'Todo funciona en tu navegador; no se envía ningún dato a ningún servidor',
    ],
    breadcrumbHome: 'Inicio',
    breadcrumbThis: 'Calculadora de patrimonio neto',
  },
  page: {
    breadcrumb: {
      home: 'Inicio',
      this: 'Calculadora de patrimonio neto',
    },
    eyebrow: 'Herramientas gratuitas',
    title: 'Calculadora de patrimonio neto, en una moneda o en varias',
    lead:
      'Añade lo que tienes y lo que debes, en una moneda o en varias. Consulta tu patrimonio neto en la moneda que elijas, con tipos de cambio oficiales actualizados. Si tienes dinero en más de una moneda, comprueba cuánto está en monedas en las que en realidad no gastas. Todo funciona en tu navegador. No se envía nada a ningún servidor. Admite USD, EUR, GBP, INR, JPY y 33 más.',
    plannerLine:
      'El planificador completo de nidhi convierte tu patrimonio neto en varias monedas en un plan a largo plazo, para que veas cómo el lugar donde vives, la moneda en la que gastas y las grandes decisiones cambian el camino.',
    explainer: {
      heading: 'Cómo se hace el cálculo',
      intro:
        'Para cada moneda, restamos tus pasivos de tus activos y convertimos el resultado a tu moneda de referencia con tipos de cambio al día. Al sumar esas posiciones convertidas obtienes tu patrimonio neto total en una sola moneda. La parte de ese total que corresponde a cada moneda es su concentración:',
      formula:
        'Concentración % = (Neto en la moneda X × Tipo de cambio a la moneda de referencia) / Patrimonio neto total × 100',
      items: [
        {
          strong: 'Posición neta',
          rest:
            ' por moneda = suma de los activos menos suma de los pasivos en esa moneda. Una posición neta negativa significa que en esa moneda debes más de lo que tienes.',
        },
        {
          strong: 'Tipo de cambio a la moneda de referencia',
          rest:
            ' es el multiplicador que convierte una unidad de la moneda X en tu moneda de referencia. Procede de la API de Frankfurter, que reúne los tipos que publican bancos centrales y otras fuentes oficiales, y tu navegador lo obtiene directamente. Los tipos se actualizan cuando esas fuentes los publican, normalmente cada día hábil. Son tipos de referencia, valores orientativos y pueden diferir de los que te ofrecen en realidad tu banco o tu bróker.',
        },
        {
          strong: 'Niveles de concentración',
          rest:
            ' se aplican solo a las monedas que no son la de referencia (monedas en las que no gastas). Menos del 20 % es bajo, del 20 % al 40 % es moderado y más del 40 % es elevado. Describen qué parte del patrimonio neto está en esa moneda, no qué hacer al respecto. Tu moneda de referencia nunca se señala.',
        },
        {
          strong: 'Exposición neta frente a bruta.',
          rest:
            ' La concentración se calcula sobre posiciones netas. Si tienes una deuda grande en una moneda extranjera que compensa un activo en esa misma moneda (por ejemplo, una hipoteca en USD y una cuenta de ahorro en USD), la posición neta es pequeña, pero tu exposición cambiaria bruta en cada lado es mucho mayor. Esta herramienta mide la neta; las cifras brutas conviene mirarlas aparte al dimensionar el riesgo cambiario real.',
        },
        {
          strong: 'Todo el cálculo se hace en tu dispositivo.',
          rest:
            ' Los nombres, valores y totales de tus activos nunca salen de tu navegador. La única petición de red es una consulta puntual de los tipos de cambio a Frankfurter, que lleva el código de tu moneda de referencia (por ejemplo, ',
          after: ') y nada sobre tus activos.',
        },
      ],
    },
    faq: {
      heading: 'Preguntas frecuentes',
      items: [
        {
          q: '¿Cómo funciona la calculadora de patrimonio neto?',
          a:
            'Añades tus activos y pasivos con su moneda y su valor actual. La herramienta obtiene los tipos de cambio oficiales más recientes (a través de la API gratuita de Frankfurter), lo convierte todo a la moneda de referencia que elijas y muestra tu patrimonio neto total como una sola cifra. Debajo, muestra tu concentración por moneda en un gráfico de anillo y señala cualquier moneda distinta de la de referencia en la que tu exposición sea elevada.',
        },
        {
          q: '¿Qué es el riesgo de concentración en una moneda?',
          a:
            'Si una gran parte de tu patrimonio neto está en una moneda en la que no gastas, una variación del tipo de cambio altera tu poder adquisitivo real. Por ejemplo, si piensas jubilarte en Europa pero tienes el 70 % de tu patrimonio en USD, un movimiento del 10 % en el USD/EUR (una magnitud que el EUR/USD ha registrado en muchos años naturales) cambiaría tu fondo de jubilación en torno a un 7 % medido en euros.',
        },
        {
          q: '¿Envía esto mis datos financieros a algún sitio?',
          a:
            'No. Todo funciona en tu navegador. Los nombres, valores y monedas de tus activos nunca se envían a ningún servidor. La única petición externa es a la API de Frankfurter para obtener los tipos de cambio, y solo incluye el código de tu moneda de referencia, no los datos de tus activos. Mientras usas la herramienta, no se escribe nada en la dirección de la página. Cuando copias un enlace para compartir, tus valores van en el enlace después del signo #, una parte de la dirección que los navegadores nunca envían a un servidor, y la página los quita de la barra de direcciones antes de que empiece la analítica. Tú decides si compartes.',
        },
        {
          q: '¿Qué monedas están disponibles?',
          a:
            'Hay treinta y ocho monedas disponibles, entre ellas el euro (EUR), el dólar estadounidense (USD), la libra esterlina (GBP), el franco suizo (CHF), el yen japonés (JPY), la rupia india (INR), el yuan chino (CNY), el dólar canadiense (CAD), el dólar australiano (AUD), el dólar de Singapur (SGD), el taka bangladesí (BDT), el chelín keniano (KES), los francos CFA de África Occidental y Central (XOF, XAF) y las principales monedas nórdicas, de Europa central, de América Latina, del sur y el sudeste de Asia y de África. Los tipos de cambio proceden de bancos centrales y otras fuentes oficiales a través de Frankfurter; son tipos de referencia y pueden diferir de los que los bancos ofrecen a sus clientes particulares.',
        },
        {
          q: '¿Qué diferencia hay entre las formas de compartir «Versión completa» y «Versión con datos ocultos»?',
          a:
            'El modo completo incluye en la URL todos los nombres, valores, monedas y tipos de tus activos: quien tenga el enlace puede ver todo el desglose y comprobar las cuentas. El modo con datos ocultos incluye solo los porcentajes de concentración por moneda y las etiquetas de las bandas: ni cantidades ni nombres de activos. Ambos se copian en tu portapapeles como un único enlace, y tú eliges cuál enviar.',
        },
        {
          q: '¿De dónde salen los tipos de cambio?',
          a:
            'Los tipos proceden de la API gratuita de Frankfurter (api.frankfurter.dev), que reúne los tipos de cambio que publican bancos centrales y otras fuentes oficiales. Son tipos de referencia que se actualizan cuando esas fuentes los publican, normalmente cada día hábil, y sirven como valores orientativos, no como cotizaciones a las que se pueda operar. Los tipos que obtienes de verdad en tu banco o tu bróker incluyen un margen y pueden ser bastante distintos, sobre todo en monedas menos negociadas. No hace falta clave de API, y la petición sale directamente de tu navegador.',
        },
        {
          q: '¿Qué significa «moneda de referencia»?',
          a:
            'Tu moneda de referencia es la moneda en la que gastas y vives principalmente: aquella en la que están tus facturas, tu alquiler y la compra del día a día. La dejamos fuera de los avisos de riesgo porque los movimientos del tipo de cambio no cambian lo que compras con el dinero que tienes en la moneda en la que gastas.',
        },
        {
          q: '¿Qué significan «bajo», «moderado» y «elevado»?',
          a:
            'Son niveles descriptivos para las monedas que no son la de referencia: menos del 20 % del patrimonio neto es «bajo», del 20 % al 40 % es «moderado» y más del 40 % es «elevado». Describen el tamaño de la concentración, no lo que deberías hacer al respecto. Que un nivel encaje o no con tu situación depende de tus planes de gasto futuros, de dónde piensas jubilarte y de cómo eliges equilibrar el riesgo cambiario con otros objetivos.',
        },
        {
          q: '¿Puedo incluir deudas y pasivos?',
          a:
            'Sí. Cada fila tiene un selector de activo o pasivo. Las cantidades de los pasivos se restan de la posición neta de esa moneda. Si tienes una hipoteca en USD junto con ahorros en USD, la herramienta muestra tu exposición neta al USD. Una moneda en la que debes más de lo que tienes se marca como «Deuda neta».',
        },
        {
          q: '¿Cómo funciona la carga de un CSV?',
          a:
            'Crea un archivo CSV con estas columnas: name (opcional), value (obligatoria), currency (obligatoria, código de 3 letras), type (opcional, «asset» o «liability»; si falta, se toma como activo). Haz clic en «Subir CSV», elige el archivo y las filas se rellenan solas. Las filas no válidas aparecen con su número de línea para que puedas corregirlas. Al subir el archivo se sustituyen los datos que ya tienes, después de pedirte confirmación.',
        },
      ],
    },
    related: {
      heading: 'Entiende tu patrimonio neto',
      lead: 'Desde qué es el patrimonio neto hasta cómo gestionar dinero en varias monedas.',
      items: [
        {
          kicker: 'Fundamentos',
          title: 'Qué es el patrimonio neto y por qué importa',
          desc:
            'Activos menos pasivos es la medida más sencilla de la salud financiera. Esta herramienta la extiende a lo que tienes en varias monedas.',
        },
        {
          kicker: 'Patrimonio neto',
          title: 'Cómo calcular tu patrimonio neto en 10 minutos',
          desc:
            'El método de dos columnas que aplica esta calculadora: anota lo que tienes, anota lo que debes y calcula la diferencia.',
        },
        {
          kicker: 'Gestión de divisas',
          title: 'Gestionar dinero en varias monedas',
          desc:
            'Estrategias prácticas para ganar, ahorrar y gastar en varias monedas sin perder dinero en comisiones de cambio.',
        },
        {
          kicker: 'Deuda',
          title: 'Pasivos: lo que debes y por qué importa la tasa de interés',
          desc:
            'Un préstamo en moneda extranjera tiene dos riesgos a la vez: el costo de los intereses y la evolución del tipo de cambio. La calculadora tiene en cuenta los dos en la posición neta.',
        },
        {
          kicker: 'Poder adquisitivo',
          title: 'Por qué tu euro rinde más en unos países que en otros',
          desc:
            'El tipo de cambio es solo la mitad de la historia. Al comparar patrimonios entre países, el nivel de precios local importa tanto como el cambio de divisa.',
        },
        {
          kicker: 'Inflación',
          // A lesson title: the figure is left as the lesson writes it (brief rule).
          title: 'Poder adquisitivo: por qué 1000 € hoy no son 1000 € mañana',
          desc:
            'La moneda es una forma de mirar la riqueza real; la inflación es la otra. Ninguna de las dos se ve en un saldo nominal.',
        },
        {
          kicker: 'FIRE (jubilación anticipada)',
          title: 'Introducción a la independencia financiera',
          desc:
            'Los fundamentos del movimiento FIRE (independencia financiera y jubilación anticipada) y por qué importa diversificar entre monedas cuando tu jubilación abarca varios países.',
        },
        {
          kicker: 'Planificación',
          title: 'Cómo fijar objetivos financieros',
          desc:
            'Cómo los objetivos suelen dar forma a la asignación de activos, incluidas las monedas en las que la gente mantiene su dinero.',
        },
      ],
      footerTag: 'Lee más sobre gestión de divisas',
      footerAll: 'O consulta todos los artículos',
    },
  },
  island: {
    currencies: currenciesEs,
    toolbar: {
      aria: 'Acciones de la calculadora de patrimonio neto',
      currencyLabel: 'Tu moneda (en la que gastas)',
      currencyHelp:
        'Tu patrimonio neto se muestra en esta moneda. Lo que esté en otra moneda se convierte con los tipos de cambio oficiales más recientes.',
      share: 'Compartir',
      shareTitle: 'Comparte tu patrimonio neto',
      reset: 'Restablecer',
      resetTitle: 'Borra todos los datos y empieza de cero',
      copiedLabel: 'Enlace copiado en el portapapeles',
      shareUrlAria: 'URL del enlace para compartir',
    },
    rates: {
      errorBefore: 'Tipos de cambio no disponibles: se muestran las cantidades originales sin convertir.',
      retry: 'Reintentar',
      loading: 'Cargando tipos de cambio…',
      partial:
        'Falta el tipo de cambio actual de una o más monedas, así que quedan fuera del total de abajo. Sus cantidades en la moneda original se muestran en las tarjetas de cada moneda.',
    },
    shared: {
      readOnly:
        'Estás viendo un patrimonio neto compartido. Los datos que ves son los que quien lo envió decidió incluir. Puedes empezar de cero con el formulario de abajo.',
    },
    table: {
      heading: 'Tus activos y pasivos',
      itemsOne: '{count} elemento',
      itemsMany: '{count} elementos',
      itemsFew: '{count} elementos',
      aria: 'Activos y pasivos',
      colName: 'Nombre',
      colValue: 'Valor',
      colCurrency: 'Moneda',
      colType: 'Tipo',
      colActions: 'Acciones',
      addAsset: '+ Añadir activo',
      uploadCsv: 'Subir CSV',
      uploadCsvAria: 'Subir archivo CSV',
      downloadCsv: 'Descargar CSV',
      downloadTitle: 'Descarga tus activos en CSV',
      errorTitleOne: 'No se pudo importar {count} fila:',
      errorTitleMany: 'No se pudieron importar {count} filas:',
      errorTitleFew: 'No se pudieron importar {count} filas:',
      errorLine: 'Línea {line}: {message}',
      // `value` and `currency` stay Latin: they are the column names the parser reads.
      csvErrors: {
        empty: 'El CSV está vacío.',
        columns: 'Se esperaban al menos las columnas value y currency.',
        invalidValue: '«{value}» no es un número positivo válido.',
        emptyCurrency: 'El código de moneda está vacío.',
        unsupportedCurrency: '«{value}» no es una moneda disponible. Disponibles: {supported}.',
      },
    },
    row: {
      nameAria: 'Nombre del activo (fila {index} de {total})',
      valueAria: 'Valor (fila {index})',
      currencyAria: 'Moneda (fila {index})',
      typeAria: 'Tipo (fila {index})',
      namePlaceholder: 'Nombre del activo o pasivo',
      asset: 'Activo',
      liability: 'Pasivo',
      removeTitle: 'Eliminar',
      removeAria: 'Eliminar la fila {index}',
    },
    results: {
      empty: 'Añade al menos un activo para ver tu patrimonio neto.',
      totalLabel: 'Patrimonio neto total',
      hidden: 'Oculto',
      whatYouOwn: 'Lo que tienes',
      whatYouOwe: 'Lo que debes',
      singleNote:
        'Todo lo que hay aquí está en {currency}, así que los tipos de cambio no le afectan. Si añades algo que tengas en otra moneda, también verás qué parte de tu patrimonio neto depende de los tipos de cambio.',
      partialHint:
        'Faltaba el tipo de cambio actual de al menos una moneda, que queda fuera de este total.',
      rateUnavailable: 'Tipo no disponible',
      noRateAvailable:
        'No hay tipo de cambio actual de {code} frente a {currency}; se muestra sin convertir',
      badgeFunctional: 'Referencia',
      badgeNetDebt: 'Deuda neta',
      badgeElevated: 'Elevado',
      badgeModerate: 'Moderado',
      badgeLow: 'Bajo',
      riskHeading: 'Evaluación del riesgo por moneda',
      labelFunctional: 'La moneda en la que gastas',
      labelNetDebt: 'Deuda neta en esta moneda',
      labelElevated: 'Exposición elevada',
      labelModerate: 'Exposición moderada',
      labelLow: 'Exposición baja',
      disclaimer:
        'Esta calculadora muestra la concentración matemática de tus posiciones netas en cada moneda, con tipos de referencia oficiales que pueden diferir de los que ofrecen tu banco o tu bróker. No tiene en cuenta tus planes de gasto futuros, tu residencia fiscal, tus estrategias de cobertura ni tu tolerancia al riesgo, y no es asesoramiento financiero. Para un asesoramiento personalizado, consulta a un profesional acreditado.',
    },
    rec: {
      noRate:
        'El servicio de tipos de cambio no devolvió el tipo actual de {code} frente a {currency}, así que esta posición queda fuera del cálculo de concentración. La cantidad neta en la moneda original se sigue mostrando arriba.',
      functionalHidden:
        'Esta es la moneda en la que gastas. El porcentaje de concentración no se incluye en lo que se ha compartido.',
      functionalMost:
        'El {pct} % de tu patrimonio neto está en la moneda en la que gastas ({currency}). El {rest} % restante está en otras monedas y varía con sus tipos de cambio.',
      functionalMuch:
        'El {pct} % de tu patrimonio neto está en la moneda en la que gastas ({currency}). El {rest} % restante está en otras monedas, así que una parte considerable de tu poder adquisitivo diario varía con sus tipos de cambio.',
      functionalLittle:
        'Solo el {pct} % de tu patrimonio neto está en la moneda en la que gastas ({currency}). El {rest} % restante está en otras monedas, así que la mayor parte de tu poder adquisitivo varía con sus tipos de cambio.',
      netDebt:
        'En {code} debes más de lo que tienes (una posición de «deuda neta»). Cuando en una moneda tienes más pasivos que activos, el efecto es el contrario: si el {code} se fortalece frente al {currency}, lo que debes aumenta y tu patrimonio neto baja; si el {code} se debilita, tu patrimonio neto sube.',
      elevatedHidden:
        'En lo que se ha compartido, tu posición en {code} es una parte grande del patrimonio neto. Si el {code} sube o baja un 10 % frente al {currency}, tu patrimonio neto sube o baja con él en una cantidad considerable.',
      elevatedShown:
        'El {pct} % de tu patrimonio neto está en {code}. Si el {code} sube o baja un 10 % frente al {currency}, tu patrimonio neto sube o baja con él aproximadamente un {sensitivity} %.',
      moderateHidden:
        'Una parte moderada de tu patrimonio neto está en {code}. Si el {code} sube o baja un 10 % frente al {currency}, tu patrimonio neto sube o baja con él aproximadamente una décima parte del porcentaje de tu patrimonio neto que está en {code}.',
      moderateShown:
        'El {pct} % de tu patrimonio neto está en {code}. Si el {code} sube o baja un 10 % frente al {currency}, tu patrimonio neto sube o baja con él aproximadamente un {sensitivity} %.',
      lowHidden:
        'Una parte pequeña de tu patrimonio neto está en {code}. El tipo de cambio {code}/{currency} tiene un efecto limitado en tu patrimonio neto total.',
      lowShown:
        'El {pct} % de tu patrimonio neto está en {code}. Si el {code} sube o baja un 10 % frente al {currency}, tu patrimonio neto sube o baja con él aproximadamente un {sensitivity} %.',
    },
    chart: {
      heading: 'Concentración por moneda',
      emptyNoRates:
        'Ahora mismo no hay tipos de cambio disponibles, así que las monedas no se pueden comparar en un gráfico.',
      emptyNoValues: 'Escribe valores arriba para ver un gráfico de concentración.',
      currencyOne: 'moneda',
      currencyMany: 'monedas',
      currencyFew: 'monedas',
      legendAria: 'Monedas',
      aria: 'Gráfico de anillo de la concentración por moneda. {list}',
      listSeparator: '. ',
      announce: '{name}: {pct} de tu patrimonio neto.',
      announceWithAmount: '{name}: {pct} de tu patrimonio neto, {amount}.',
      note:
        'Fuera del gráfico: {codes}, porque ahora mismo no hay tipo de cambio a {currency}.',
      tableCaption: 'Concentración por moneda según la posición neta',
      tableColCurrency: 'Moneda',
      tableColConcentration: 'Concentración',
      tableColRisk: 'Nivel de riesgo',
    },
    csv: {
      confirmOne:
        'Al subir un CSV, lo que tienes ahora ({current} elemento) se sustituirá por el contenido del archivo ({pending}). ¿Quieres continuar?',
      confirmMany:
        'Al subir un CSV, lo que tienes ahora ({current} elementos) se sustituirá por el contenido del archivo ({pending}). ¿Quieres continuar?',
      confirmFew:
        'Al subir un CSV, lo que tienes ahora ({current} elementos) se sustituirá por el contenido del archivo ({pending}). ¿Quieres continuar?',
      replace: 'Sustituir',
      cancel: 'Cancelar',
    },
    shareModal: {
      title: 'Comparte tu análisis',
      legend: 'Elige qué compartir:',
      fullName: 'Versión completa',
      fullDesc: 'Todos los detalles de los activos, sus valores y el patrimonio neto',
      redactedName: 'Versión con datos ocultos',
      redactedDesc: 'Solo el reparto por moneda en % y los niveles de riesgo. Sin cantidades ni nombres.',
      cancel: 'Cancelar',
      copy: 'Copiar enlace',
      copied: '¡Copiado!',
      previewHeading: 'Lo que verá quien lo reciba',
    },
  },
};

/**
 * The Czech edition. Vykání and „...“ quotes, per `docs/i18n/cs-glossary.md`:
 * čisté jmění, aktiva, závazky, měna vašich výdajů (the tool's "functional"
 * or "spending" currency), expozice, koncentrace, kurzové rozpětí, verze se
 * skrytými údaji (never *anonymní*, which would promise more than hiding the
 * amounts and names). The bands are adjectives agreeing with *expozice*:
 * nízká, střední, zvýšená.
 *
 * The CSV column names and the words `asset` and `liability` in the file stay
 * English, as the note at the top of this module explains; the CSV answer says
 * so rather than translating them.
 */
export const multiCurrencyNetWorthCs: typeof multiCurrencyNetWorthEn = {
  meta: {
    title: 'Kalkulačka čistého jmění, v jedné měně i ve více | nidhi',
    description:
      'Kalkulačka čistého jmění zdarma pro jednu i více měn: 38 měn s nejnovějšími oficiálními kurzy a kontrola měnového rizika. Běží v prohlížeči, nic se neodesílá.',
  },
  schema: {
    name: 'Kalkulačka čistého jmění nidhi',
    alternateName: [
      'Kalkulačka čistého jmění ve více měnách nidhi',
      'Kalkulačka čistého jmění ve více měnách a analýza měnového rizika nidhi',
      'Kalkulačka čistého jmění pro život v zahraničí nidhi',
      'Analýza měnového rizika nidhi',
      'Kalkulačka měnové expozice nidhi',
      'Nástroj pro měnové riziko nidhi',
      'Kontrola měnové koncentrace nidhi',
    ],
    operatingSystem: 'Libovolný operační systém (webový prohlížeč)',
    browserRequirements: 'Vyžaduje JavaScript. Moderní prohlížeč.',
    featureList: [
      'Výpočet celkového čistého jmění napříč 38 měnami ve zvolené měně výdajů',
      'Neomezený počet aktiv a závazků v jakékoli podporované měně',
      'Nejnovější oficiální směnné kurzy přes API Frankfurter',
      'Prstencový graf měnové koncentrace',
      'Posouzení rizika pro každou měnu (nízká, střední, zvýšená expozice)',
      'Přepínač aktivum/závazek pro výpočet čisté pozice',
      'Hromadné nahrání CSV',
      'Dva režimy sdílení: úplná data a verze se skrytými údaji',
      'Vše běží ve vašem prohlížeči; žádná data se neposílají na server',
    ],
    breadcrumbHome: 'Domů',
    breadcrumbThis: 'Kalkulačka čistého jmění',
  },
  page: {
    breadcrumb: {
      home: 'Domů',
      this: 'Kalkulačka čistého jmění',
    },
    eyebrow: 'Nástroje zdarma',
    title: 'Kalkulačka čistého jmění, v jedné měně i ve více',
    lead:
      'Zadejte, co vlastníte a co dlužíte, v jedné měně i ve více. Uvidíte své čisté jmění ve zvolené měně při nejnovějších oficiálních kurzech. Pokud držíte víc než jednu měnu, zjistěte, kolik z toho máte v měnách, ve kterých ve skutečnosti neutrácíte. Vše běží ve vašem prohlížeči. Nic se neposílá na server. Podporuje USD, EUR, GBP, INR, JPY a 33 dalších.',
    plannerLine:
      'Celý plánovač nidhi promění čisté jmění ve více měnách v dlouhodobý plán, takže uvidíte, jak místo pobytu, měna výdajů a velká rozhodnutí mění cestu.',
    explainer: {
      heading: 'Jak výpočet funguje',
      intro:
        'U každé měny odečteme vaše závazky od aktiv a výsledek převedeme do měny vašich výdajů podle aktuálních kurzů. Součet převedených pozic je vaše celkové čisté jmění v jedné měně. Podíl každé měny na tomto celku je vaše koncentrace:',
      formula:
        'Koncentrace v % = (Čistá pozice v měně X × Kurz k měně výdajů) / Celkové čisté jmění × 100',
      items: [
        {
          strong: 'Čistá pozice',
          rest:
            ' pro každou měnu = součet aktiv minus součet závazků v této měně. Záporná čistá pozice znamená, že v této měně dlužíte víc, než máte.',
        },
        {
          strong: 'Kurz k měně výdajů',
          rest:
            ' je násobitel, který převede jednu jednotku měny X do měny vašich výdajů. Pochází z API Frankfurter, které spojuje kurzy zveřejňované centrálními bankami a dalšími oficiálními zdroji, a stahuje ho přímo váš prohlížeč. Kurzy se aktualizují tak, jak je tyto zdroje zveřejňují, obvykle každý pracovní den. Jsou to referenční kurzy: měřítka, která se mohou lišit od kurzů, jaké skutečně nabízí vaše banka nebo broker.',
        },
        {
          strong: 'Pásma koncentrace',
          rest:
            ' platí jen pro měny jiné než měna výdajů (měny, ve kterých neutrácíte). Pod 20 % je expozice nízká, 20 až 40 % střední a nad 40 % zvýšená. Popisují, jak velká část čistého jmění připadá na danou měnu, ne co s tím dělat. Měna vašich výdajů se nikdy neoznačuje.',
        },
        {
          strong: 'Čistá a hrubá expozice.',
          rest:
            ' Koncentrace se počítá z čistých pozic. Pokud máte velký dluh v cizí měně, který vyrovnává aktivum v téže měně (například hypotéku v USD a spořicí účet v USD), je čistá pozice malá, ale hrubá kurzová expozice na každé straně je mnohem větší. Tento nástroj měří čistou pozici; při odhadu skutečného kurzového rizika se hodí podívat se zvlášť i na hrubá čísla.',
        },
        {
          strong: 'Veškeré výpočty probíhají u vás.',
          rest:
            ' Názvy aktiv, hodnoty a součty nikdy neopustí váš prohlížeč. Jediný síťový požadavek je jednorázové stažení kurzů ze služby Frankfurter, které nese kód měny vašich výdajů (např. ',
          after: ') a nic o vašem majetku.',
        },
      ] as NetWorthExplainerItem[],
    },
    faq: {
      heading: 'Časté dotazy',
      items: [
        {
          q: 'Jak kalkulačka čistého jmění funguje?',
          a:
            'Zadáte svá aktiva a závazky s jejich měnou a současnou hodnotou. Nástroj stáhne nejnovější oficiální směnné kurzy (přes bezplatné API Frankfurter), převede vše do zvolené měny výdajů a ukáže celkové čisté jmění jako jedno číslo. Pod ním ukáže měnovou koncentraci v prstencovém grafu a označí každou měnu jinou než měnu výdajů, ve které máte zvýšenou expozici.',
        },
        {
          q: 'Co je riziko měnové koncentrace?',
          a:
            'Pokud je velká část vašeho čistého jmění v měně, ve které neutrácíte, změna kurzu mění vaši skutečnou kupní sílu. Pokud například plánujete odejít do důchodu v Evropě, ale 70 % majetku držíte v USD, pohyb kurzu USD/EUR o 10 % (rozsah, ve kterém se EUR/USD změnil během mnoha kalendářních let) by hodnotu vašich prostředků na důchod měřenou v eurech změnil zhruba o 7 %.',
        },
        {
          q: 'Posílá tato kalkulačka moje finanční data někam?',
          a:
            'Ne. Vše běží ve vašem prohlížeči. Názvy aktiv, hodnoty a měny se nikdy neposílají na žádný server. Jediný vnější požadavek míří na API Frankfurter kvůli kurzům a obsahuje jen kód měny vašich výdajů, ne údaje o majetku. Při používání nástroje se do adresy stránky nic nezapisuje. Když zkopírujete odkaz ke sdílení, vaše hodnoty se vloží do odkazu za znak #, do části adresy, kterou prohlížeče nikdy neposílají na server, a stránka je odstraní z adresního řádku dřív, než se spustí analytika. Zda sdílet, rozhodujete vy.',
        },
        {
          q: 'Které měny jsou podporované?',
          a:
            'Podporovaných měn je třicet osm, mezi nimi euro (EUR), americký dolar (USD), britská libra (GBP), švýcarský frank (CHF), japonský jen (JPY), indická rupie (INR), čínský jüan (CNY), kanadský dolar (CAD), australský dolar (AUD), singapurský dolar (SGD), bangladéšská taka (BDT), keňský šilink (KES), západoafrický a středoafrický frank CFA (XOF, XAF) a hlavní severské, středoevropské, latinskoamerické, jihoasijské, jihovýchodoasijské a africké měny. Směnné kurzy pocházejí od centrálních bank a dalších oficiálních zdrojů přes službu Frankfurter; jsou to referenční kurzy a mohou se lišit od kurzů, které banka nabízí běžným klientům.',
        },
        {
          q: 'Jaký je rozdíl mezi režimy sdílení „Úplná verze“ a „Verze se skrytými údaji“?',
          a:
            'Úplná verze vloží do adresy všechny názvy aktiv, hodnoty, měny a typy: kdokoli s odkazem uvidí celý rozpis a může si výpočet ověřit. Verze se skrytými údaji obsahuje jen procenta koncentrace podle měn a označení pásem: žádné částky, žádné názvy aktiv. V obou případech se do schránky zkopíruje jediný odkaz a vy si vyberete, který odešlete.',
        },
        {
          q: 'Odkud pocházejí směnné kurzy?',
          a:
            'Kurzy pocházejí z bezplatného API Frankfurter (api.frankfurter.dev), které spojuje směnné kurzy zveřejňované centrálními bankami a dalšími oficiálními zdroji. Jsou to referenční kurzy, aktualizované tak, jak je tyto zdroje zveřejňují (obvykle každý pracovní den), a slouží jako měřítko, nikoli jako kurzy, za které lze skutečně směňovat. Kurzy, které skutečně dostanete v bance nebo u brokera, obsahují kurzové rozpětí a mohou se podstatně lišit, zvlášť u menších měn. Není potřeba žádný klíč API a požadavek se odesílá přímo z vašeho prohlížeče.',
        },
        {
          q: 'Co znamená „měna vašich výdajů“?',
          a:
            'Měna vašich výdajů je měna, kterou používáte pro většinu výdajů v místě, kde žijete. Jsou v ní uvedené ceny vašich pravidelných plateb, nájmu a nákupů. Z označení rizika ji vynecháváme, protože pohyby kurzů nemění, co si za peníze v měně svých výdajů koupíte.',
        },
        {
          q: 'Co znamenají „Nízká“, „Střední“ a „Zvýšená“?',
          a:
            'Jsou to popisná pásma pro měny jiné než měna výdajů: pod 20 % čistého jmění je expozice „Nízká“, 20 až 40 % „Střední“ a nad 40 % „Zvýšená“. Popisují velikost koncentrace, ne to, co s ní dělat. Zda daná úroveň odpovídá vaší situaci, závisí na budoucích výdajích, na tom, kde chcete žít v důchodu, a na tom, jak vyvažujete měnové riziko s jinými cíli.',
        },
        {
          q: 'Můžu zahrnout dluhy a závazky?',
          a:
            'Ano. Každý řádek má přepínač „Aktivum“/„Závazek“. Částky závazků se odečtou od čisté pozice dané měny. Pokud máte hypotéku v USD a vedle ní úspory v USD, ukáže nástroj vaši čistou expozici v USD. Měna, ve které dlužíte víc, než máte, se označí jako „Čistý dluh“.',
        },
        {
          q: 'Jak funguje nahrání CSV?',
          a:
            'Vytvořte soubor CSV se sloupci (názvy sloupců i hodnoty typu zůstávají anglicky): name (volitelný), value (povinný), currency (povinný, třípísmenný kód), type (volitelný, „asset“ pro aktivum nebo „liability“ pro závazek, výchozí je asset). Klikněte na „Nahrát CSV“, vyberte soubor a řádky se vyplní automaticky. Neplatné řádky se vypíšou s čísly řádků, aby šly opravit. Nahrání nahradí stávající data až po potvrzení.',
        },
      ],
    },
    related: {
      heading: 'Porozumějte svému čistému jmění',
      lead: 'Od toho, co čisté jmění je, po správu peněz ve více měnách.',
      items: [
        {
          kicker: 'Základy',
          title: 'Co je čisté jmění a proč na něm záleží',
          desc:
            'Rozdíl mezi aktivy a závazky je nejjednodušším měřítkem finančního zdraví. Tento nástroj tento výpočet rozšiřuje na majetek ve více měnách.',
        },
        {
          kicker: 'Čisté jmění',
          title: 'Jak za 10 minut spočítat čisté jmění',
          desc:
            'Metoda dvou sloupců, kterou tato kalkulačka používá: sepište, co vlastníte, sepište, co dlužíte, a spočítejte rozdíl.',
        },
        {
          kicker: 'Správa měn',
          title: 'Správa peněz ve více měnách',
          desc:
            'Praktické postupy, jak vydělávat, spořit a utrácet ve více měnách, aniž by peníze mizely na kurzových poplatcích.',
        },
        {
          kicker: 'Dluh',
          title: 'Závazky: co dlužíte a proč záleží na úrokové sazbě',
          desc:
            'Úvěr v cizí měně nese dvě rizika najednou: náklady na úrok a pohyb kurzu. Kalkulačka započítá obojí.',
        },
        {
          kicker: 'Kupní síla',
          title: 'Proč si za euro v některých zemích koupíte víc než jinde',
          desc:
            'Směnné kurzy jsou jen polovina příběhu. Místní cenová hladina je při porovnávání majetku mezi zeměmi stejně důležitá jako kurz.',
        },
        {
          kicker: 'Inflace',
          title: 'Kupní síla: proč 1 000 € dnes není 1 000 € zítra',
          desc:
            'Měna je jedním pohledem na reálné bohatství, inflace druhým. Nominální zůstatek nezachycuje ani jedno.',
        },
        {
          kicker: 'FIRE',
          title: 'Úvod do finanční nezávislosti',
          desc:
            'Základy FIRE a proč záleží na měnové diverzifikaci, když důchod trávíte ve více zemích.',
        },
        {
          kicker: 'Plánování',
          title: 'Stanovení finančních cílů',
          desc:
            'Jak cíle často utvářejí alokaci aktiv, včetně toho, které měny lidé drží.',
        },
      ],
      footerTag: 'Další články o správě měn',
      footerAll: 'Nebo procházejte všechny články',
    },
  },
  island: {
    currencies: currenciesCs,
    toolbar: {
      aria: 'Akce kalkulačky čistého jmění',
      currencyLabel: 'Vaše měna (ta, ve které utrácíte)',
      currencyHelp:
        'Vaše čisté jmění se zobrazuje v této měně. Vše v jiné měně se převede podle nejnovějších oficiálních kurzů.',
      share: 'Sdílet',
      shareTitle: 'Sdílet čisté jmění',
      reset: 'Začít znovu',
      resetTitle: 'Smazat všechna data a začít znovu',
      copiedLabel: 'Odkaz zkopírován do schránky',
      shareUrlAria: 'Adresa odkazu ke sdílení',
    },
    rates: {
      errorBefore: 'Směnné kurzy nejsou k dispozici, částky se zobrazují bez převodu.',
      retry: 'Zkusit znovu',
      loading: 'Načítání směnných kurzů…',
      partial:
        'U jedné nebo více měn chybí aktuální kurz, proto nejsou zahrnuté do součtu níže. Jejich částky v původní měně jsou na kartách jednotlivých měn.',
    },
    shared: {
      readOnly:
        'Prohlížíte sdílené čisté jmění. Zobrazená data jsou to, co se odesílatel rozhodl zahrnout. Ve formuláři níže můžete začít znovu.',
    },
    table: {
      heading: 'Vaše aktiva a závazky',
      itemsOne: '{count} položka',
      itemsMany: '{count} položek',
      itemsFew: '{count} položky',
      aria: 'Aktiva a závazky',
      colName: 'Název',
      colValue: 'Hodnota',
      colCurrency: 'Měna',
      colType: 'Typ',
      colActions: 'Akce',
      addAsset: '+ Přidat aktivum',
      uploadCsv: 'Nahrát CSV',
      uploadCsvAria: 'Nahrát soubor CSV',
      downloadCsv: 'Stáhnout CSV',
      downloadTitle: 'Stáhnout aktiva jako CSV',
      errorTitleOne: '{count} řádek se nepodařilo importovat:',
      errorTitleMany: '{count} řádků se nepodařilo importovat:',
      errorTitleFew: '{count} řádky se nepodařilo importovat:',
      errorLine: 'Řádek {line}: {message}',
      csvErrors: {
        empty: 'Soubor CSV je prázdný.',
        columns: 'Očekávají se alespoň sloupce value a currency.',
        invalidValue: '„{value}“ není platné kladné číslo.',
        emptyCurrency: 'Kód měny je prázdný.',
        unsupportedCurrency: '„{value}“ není podporovaná měna. Podporované měny: {supported}.',
      },
    },
    row: {
      nameAria: 'Název aktiva (řádek {index} z {total})',
      valueAria: 'Hodnota (řádek {index})',
      currencyAria: 'Měna (řádek {index})',
      typeAria: 'Typ (řádek {index})',
      namePlaceholder: 'Název aktiva nebo závazku',
      asset: 'Aktivum',
      liability: 'Závazek',
      removeTitle: 'Odebrat',
      removeAria: 'Odebrat řádek {index}',
    },
    results: {
      empty: 'Přidejte alespoň jedno aktivum a uvidíte své čisté jmění.',
      totalLabel: 'Celkové čisté jmění',
      hidden: 'Skryto',
      whatYouOwn: 'Co vlastníte',
      whatYouOwe: 'Co dlužíte',
      singleNote:
        'Vše je tu v měně {currency}, takže to směnné kurzy neovlivňují. Pokud přidáte něco v jiné měně, ukáže se tu také, jak velká část čistého jmění závisí na kurzech.',
      partialHint:
        'U alespoň jedné měny chyběl aktuální kurz, a proto není zahrnutá do tohoto součtu.',
      rateUnavailable: 'Kurz chybí',
      noRateAvailable:
        'Pro měnový pár {code}/{currency} není aktuální kurz k dispozici; zobrazeno bez převodu',
      badgeFunctional: 'Měna výdajů',
      badgeNetDebt: 'Čistý dluh',
      badgeElevated: 'Zvýšená',
      badgeModerate: 'Střední',
      badgeLow: 'Nízká',
      riskHeading: 'Posouzení rizika podle měn',
      labelFunctional: 'Měna vašich výdajů',
      labelNetDebt: 'Čistý dluh v této měně',
      labelElevated: 'Zvýšená expozice',
      labelModerate: 'Střední expozice',
      labelLow: 'Nízká expozice',
      disclaimer:
        'Tato kalkulačka ukazuje matematickou koncentraci vašich čistých pozic napříč měnami podle oficiálních referenčních kurzů, které se mohou lišit od kurzů vaší banky nebo brokera. Nezohledňuje vaše budoucí výdaje, daňovou rezidenci, zajištění ani toleranci k riziku a není finančním poradenstvím. Pro osobní radu se obraťte na finančního poradce s příslušným oprávněním.',
    },
    rec: {
      noRate:
        'Služba směnných kurzů nevrátila aktuální kurz {code} vůči {currency}, proto tato pozice není zahrnutá do výpočtu koncentrace. Čistá částka v původní měně je dál zobrazená výše.',
      functionalHidden:
        'Toto je měna vašich výdajů. V této sdílené verzi není procento koncentrace uvedeno.',
      functionalMost:
        '{pct} % vašeho čistého jmění je v měně vašich výdajů ({currency}). Zbývajících {rest} % je v jiných měnách a pohybuje se s jejich kurzy.',
      functionalMuch:
        '{pct} % vašeho čistého jmění je v měně vašich výdajů ({currency}). Zbývajících {rest} % je drženo v jiných měnách, takže se s jejich kurzy pohybuje podstatná část vaší každodenní kupní síly.',
      functionalLittle:
        'Jen {pct} % vašeho čistého jmění je v měně vašich výdajů ({currency}). Zbývajících {rest} % je drženo v jiných měnách, takže se s jejich kurzy pohybuje většina vaší kupní síly.',
      netDebt:
        'V {code} dlužíte víc, než máte (pozice „čistý dluh“). Když máte v nějaké měně víc závazků než aktiv, funguje to obráceně: pokud {code} posílí vůči {currency}, váš dluh roste a čisté jmění klesá; pokud {code} oslabí, čisté jmění roste.',
      elevatedHidden:
        'Vaše pozice v {code} tvoří v tomto sdílení velký podíl čistého jmění. Pokud {code} vůči {currency} posílí nebo oslabí o 10 %, vaše čisté jmění se s ním znatelně zvýší nebo sníží.',
      elevatedShown:
        '{pct} % vašeho čistého jmění je v {code}. Pokud {code} vůči {currency} posílí nebo oslabí o 10 %, vaše čisté jmění se s ním zvýší nebo sníží zhruba o {sensitivity} %.',
      moderateHidden:
        'Střední podíl vašeho čistého jmění je v {code}. Pokud {code} vůči {currency} posílí nebo oslabí o 10 %, vaše čisté jmění se s ním zvýší nebo sníží zhruba o desetinu podílu drženého v {code}.',
      moderateShown:
        '{pct} % vašeho čistého jmění je v {code}. Pokud {code} vůči {currency} posílí nebo oslabí o 10 %, vaše čisté jmění se s ním zvýší nebo sníží zhruba o {sensitivity} %.',
      lowHidden:
        'Malý podíl vašeho čistého jmění je v {code}. Kurz {code}/{currency} má na celkové čisté jmění jen omezený vliv.',
      lowShown:
        '{pct} % vašeho čistého jmění je v {code}. Pokud {code} vůči {currency} posílí nebo oslabí o 10 %, vaše čisté jmění se s ním zvýší nebo sníží zhruba o {sensitivity} %.',
    },
    chart: {
      heading: 'Měnová koncentrace',
      emptyNoRates:
        'Směnné kurzy teď nejsou k dispozici, takže měny nejde porovnat v grafu.',
      emptyNoValues: 'Zadejte hodnoty výše a uvidíte graf koncentrace.',
      currencyOne: 'měna',
      currencyMany: 'měn',
      currencyFew: 'měny',
      legendAria: 'Měny',
      aria: 'Prstencový graf měnové koncentrace. {list}',
      listSeparator: '. ',
      announce: '{name}: {pct} vašeho čistého jmění.',
      announceWithAmount: '{name}: {pct} vašeho čistého jmění, {amount}.',
      note:
        'Mimo graf: {codes}, protože teď není k dispozici kurz vůči {currency}.',
      tableCaption: 'Měnová koncentrace podle čisté pozice',
      tableColCurrency: 'Měna',
      tableColConcentration: 'Koncentrace',
      tableColRisk: 'Úroveň rizika',
    },
    csv: {
      confirmOne:
        'Nahrání CSV nahradí vaši současnou {current} položku obsahem souboru (počet nových položek: {pending}). Pokračovat?',
      confirmMany:
        'Nahrání CSV nahradí vašich současných {current} položek obsahem souboru (počet nových položek: {pending}). Pokračovat?',
      confirmFew:
        'Nahrání CSV nahradí vaše současné {current} položky obsahem souboru (počet nových položek: {pending}). Pokračovat?',
      replace: 'Nahradit',
      cancel: 'Zrušit',
    },
    shareModal: {
      title: 'Sdílet analýzu',
      legend: 'Vyberte, co sdílet:',
      fullName: 'Úplná verze',
      fullDesc: 'Všechny podrobnosti o aktivech, hodnoty a čisté jmění',
      redactedName: 'Verze se skrytými údaji',
      redactedDesc: 'Jen rozdělení podle měn v % a úrovně rizika. Žádné částky ani názvy.',
      cancel: 'Zrušit',
      copy: 'Kopírovat odkaz',
      copied: 'Zkopírováno!',
      previewHeading: 'Náhled pro příjemce',
    },
  },
};

/** Marathi. Vocabulary from docs/i18n/mr-glossary.md. */
export const multiCurrencyNetWorthMr: typeof multiCurrencyNetWorthEn = {
  meta: {
    title: 'निव्वळ संपत्ती (Net Worth) कॅल्क्युलेटर, एका किंवा अनेक चलनांमध्ये | nidhi',
    description: 'एका किंवा अनेक चलनांसाठी मोफत निव्वळ संपत्ती कॅल्क्युलेटर: नवीनतम अधिकृत दरांसह 38 चलने आणि चलन जोखमीची तपासणी. ब्राउझरमध्ये चालतो, काहीही पाठवले जात नाही.',
  },
  schema: {
    name: 'nidhi निव्वळ संपत्ती कॅल्क्युलेटर',
    alternateName: [
      'nidhi अनेक चलनांचा निव्वळ संपत्ती कॅल्क्युलेटर',
      'nidhi अनेक चलनांची निव्वळ संपत्ती आणि चलन जोखीम विश्लेषक',
      'परदेशात राहणाऱ्यांसाठी nidhi निव्वळ संपत्ती कॅल्क्युलेटर',
      'nidhi चलन जोखीम विश्लेषक',
      'nidhi चलननिहाय हिस्सा कॅल्क्युलेटर',
      'nidhi परकीय चलन जोखीम साधन',
      'nidhi चलनातील एकवटलेली गुंतवणूक तपासणी',
    ],
    operatingSystem: 'कोणतेही (वेब ब्राउझर)',
    browserRequirements: 'JavaScript आवश्यक. आधुनिक ब्राउझर.',
    featureList: [
      '38 चलनांमधील एकूण निव्वळ संपत्ती तुम्ही निवडलेल्या खर्चाच्या चलनात मोजा',
      'समर्थित कोणत्याही चलनात हवी तितकी मालमत्ता आणि देणी जोडा',
      'Frankfurter API मार्फत नवीनतम अधिकृत विनिमय दर',
      'चलननिहाय हिश्श्याचा डोनट आलेख',
      'प्रत्येक चलनाच्या जोखमीचे मूल्यमापन (कमी, मध्यम, जास्त)',
      'निव्वळ स्थिती मोजण्यासाठी मालमत्ता/देणी निवड',
      'CSV द्वारे एकाच वेळी अनेक नोंदी अपलोड',
      'शेअर करण्याचे दोन प्रकार: संपूर्ण डेटा आणि निनावी',
      'सगळे तुमच्या ब्राउझरमध्ये चालते; कोणत्याही सर्व्हरकडे डेटा पाठवला जात नाही',
    ],
    breadcrumbHome: 'मुख्यपृष्ठ',
    breadcrumbThis: 'निव्वळ संपत्ती कॅल्क्युलेटर',
  },
  page: {
    breadcrumb: {
      home: 'मुख्यपृष्ठ',
      this: 'निव्वळ संपत्ती कॅल्क्युलेटर',
    },
    eyebrow: 'मोफत साधने',
    title: 'निव्वळ संपत्ती (Net Worth) कॅल्क्युलेटर, एका किंवा अनेक चलनांमध्ये',
    lead: 'तुमच्याकडे काय आहे आणि तुमची देणी काय आहेत ते लिहा, एका चलनात किंवा अनेक चलनांमध्ये. नवीनतम अधिकृत विनिमय दरांनुसार तुमची निव्वळ संपत्ती तुम्ही निवडलेल्या चलनात पाहा. तुमच्याकडे एकापेक्षा जास्त चलने असतील, तर तुम्ही प्रत्यक्षात खर्च करत नाही अशा चलनांमध्ये किती हिस्सा आहे ते तपासा. सगळे तुमच्या ब्राउझरमध्ये चालते. सर्व्हरकडे काहीही पाठवले जात नाही. INR, USD, EUR, GBP, JPY आणि आणखी 33 चलने उपलब्ध.',
    plannerLine:
      'nidhi चा संपूर्ण प्लॅनर अनेक चलनांमधील निव्वळ संपत्तीचे दीर्घकालीन योजनेत रूपांतर करतो, म्हणजे ठिकाण, खर्चाचे चलन आणि मोठे निर्णय मार्ग कसा बदलतात हे तुम्हाला दिसते.',
    explainer: {
      heading: 'हिशेब कसा होतो',
      intro: 'प्रत्येक चलनासाठी आम्ही तुमची मालमत्ता आणि देणी (liabilities) यांची निव्वळ रक्कम काढतो, आणि मग चालू विनिमय दरांनी (exchange rates) ती तुमच्या खर्चाच्या चलनात बदलतो. बदललेल्या या सर्व स्थितींची बेरीज म्हणजे एका चलनातील तुमची एकूण निव्वळ संपत्ती. त्या एकूण रकमेतील प्रत्येक चलनाचा हिस्सा म्हणजे त्या चलनातील एकवटलेली गुंतवणूक:',
      formula: 'हिस्सा % = (चलन X मधील निव्वळ रक्कम × खर्चाच्या चलनाचा दर) / एकूण निव्वळ संपत्ती × 100',
      items: [
        {
          strong: 'निव्वळ स्थिती',
          rest: ' प्रत्येक चलनासाठी = त्या चलनातील मालमत्तेची बेरीज वजा देण्यांची बेरीज. निव्वळ रक्कम उणे असेल तर त्या चलनात तुमच्याकडे जितके आहे त्यापेक्षा तुमची देणी जास्त आहेत.',
        },
        {
          strong: 'खर्चाच्या चलनाचा दर',
          rest: ' म्हणजे चलन X चे एक एकक तुमच्या खर्चाच्या चलनात बदलणारा गुणक. तुमचा ब्राउझर तो थेट Frankfurter API कडून आणतो, जी मध्यवर्ती बँका आणि इतर अधिकृत स्रोतांनी प्रसिद्ध केलेले दर एकत्र करणारी सेवा आहे. हे स्रोत दर प्रसिद्ध करतात तसे दर अपडेट होतात, सहसा प्रत्येक कामकाजाच्या दिवशी. हे संदर्भ दर आहेत: मानक म्हणून वापरले जाणारे दर, जे तुमची बँक किंवा ब्रोकर प्रत्यक्ष देत असलेल्या दरांपेक्षा वेगळे असू शकतात.',
        },
        {
          strong: 'हिश्श्याचे पट्टे',
          rest: ' फक्त खर्चाचे चलन नसलेल्या चलनांना लागू होतात (ज्या चलनांमध्ये तुम्ही खर्च करत नाही). 20% पेक्षा कमी म्हणजे कमी, 20 ते 40% म्हणजे मध्यम, आणि 40% पेक्षा जास्त म्हणजे जास्त. ते निव्वळ संपत्तीचा किती मोठा हिस्सा त्या चलनात आहे याचे वर्णन करतात, त्याबद्दल काय करावे याचे नाही. तुमच्या खर्चाच्या चलनावर कधीच खूण केली जात नाही.',
        },
        {
          strong: 'निव्वळ विरुद्ध एकूण हिस्सा.',
          rest: ' हिस्सा निव्वळ स्थितीवर मोजला जातो. परकीय चलनातील मोठ्या मालमत्तेला परकीय चलनातीलच मोठे कर्ज संतुलित करत असेल (उदाहरणार्थ USD मधील गहाण कर्ज आणि USD मधील बचत खाते), तर निव्वळ स्थिती लहान असते, पण दोन्ही बाजूंचा परकीय चलनातील एकूण हिस्सा खूप मोठा असतो. हे साधन निव्वळ स्थिती मोजते; प्रत्यक्षातील विनिमय दराच्या जोखमीचा अंदाज घेताना एकूण आकडे वेगळे विचारात घ्या.',
        },
        {
          strong: 'सर्व हिशेब तुमच्या डिव्हाइसवर होतो.',
          rest: ' तुमच्या मालमत्तेची नावे, मूल्ये आणि बेरजा तुमच्या ब्राउझरबाहेर कधीच जात नाहीत. नेटवर्कवरची एकमेव विनंती म्हणजे Frankfurter कडून एकदा विनिमय दर आणणे, आणि तिच्यात फक्त तुमच्या खर्चाच्या चलनाचा कोड असतो (उदा. ',
          after: '), तुमच्या मालमत्तेबद्दल काहीही नाही.',
        },
      ],
    },
    faq: {
      heading: 'वारंवार विचारले जाणारे प्रश्न',
      items: [
        {
          q: 'निव्वळ संपत्ती कॅल्क्युलेटर कसा काम करतो?',
          a: 'तुम्ही तुमची मालमत्ता आणि देणी त्यांच्या चलनासह आणि सध्याच्या मूल्यासह लिहिता. साधन नवीनतम अधिकृत विनिमय दर आणते (मोफत Frankfurter API मार्फत), सगळे तुम्ही निवडलेल्या खर्चाच्या चलनात बदलते, आणि तुमची एकूण निव्वळ संपत्ती एकाच आकड्यात दाखवते. त्याखाली ते चलननिहाय हिस्सा डोनट आलेखात दाखवते, आणि खर्चाचे चलन नसलेल्या ज्या चलनात तुमचा हिस्सा जास्त आहे त्यावर खूण करते.',
        },
        {
          q: 'चलनात एकवटलेल्या गुंतवणुकीची जोखीम म्हणजे काय?',
          a: 'तुमच्या निव्वळ संपत्तीचा मोठा भाग तुम्ही खर्च करत नाही अशा चलनात असेल, तर विनिमय दरातील चढ-उतार तुमची खरी क्रयशक्ती (purchasing power) बदलतात. उदाहरणार्थ, तुम्ही युरोपमध्ये निवृत्त होण्याची योजना करत असाल पण तुमची 70% संपत्ती USD मध्ये असेल, तर USD/EUR मध्ये 10% बदल (EUR/USD ने अनेक कॅलेंडर वर्षांत इतका बदल पाहिला आहे) तुमचा निवृत्ती निधी युरोमध्ये मोजल्यास साधारण 7% ने बदलेल.',
        },
        {
          q: 'हे साधन माझा आर्थिक डेटा कुठे पाठवते का?',
          a: 'नाही. सगळे तुमच्या ब्राउझरमध्ये चालते. तुमच्या मालमत्तेची नावे, मूल्ये आणि चलने कधीच कोणत्याही सर्व्हरकडे पाठवली जात नाहीत. बाहेरची एकमेव विनंती विनिमय दर आणण्यासाठी Frankfurter API कडे जाते, आणि त्या विनंतीत फक्त तुमच्या खर्चाच्या चलनाचा कोड असतो, तुमच्या मालमत्तेचा डेटा नाही. साधन वापरताना पानाच्या पत्त्यात काहीही जात नाही. तुम्ही शेअर लिंक कॉपी करता तेव्हा तुमची मूल्ये लिंकमध्ये # चिन्हानंतर जातात, पत्त्याचा हा भाग ब्राउझर कधीच सर्व्हरकडे पाठवत नाहीत, आणि वापराचे विश्लेषण (analytics) सुरू होण्यापूर्वी पान ती पत्त्याच्या पट्टीतून काढून टाकते. शेअर करायचे की नाही हे तुम्ही ठरवता.',
        },
        {
          q: 'कोणती चलने उपलब्ध आहेत?',
          a: '38 चलने उपलब्ध आहेत, ज्यात भारतीय रुपया (INR), अमेरिकी डॉलर (USD), युरो (EUR), ब्रिटिश पाउंड (GBP), स्विस फ्रँक (CHF), जपानी येन (JPY), चिनी युआन (CNY), कॅनेडियन डॉलर (CAD), ऑस्ट्रेलियन डॉलर (AUD), सिंगापूर डॉलर (SGD), बांगलादेशी टका (BDT), केनियन शिलिंग (KES), पश्चिम आणि मध्य आफ्रिकन CFA फ्रँक (XOF, XAF), आणि नॉर्डिक, मध्य युरोपियन, लॅटिन अमेरिकन, दक्षिण आशियाई, आग्नेय आशियाई आणि आफ्रिकन प्रमुख चलने आहेत. विनिमय दर मध्यवर्ती बँका आणि इतर अधिकृत स्रोतांकडून Frankfurter मार्फत येतात; ते संदर्भ दर आहेत आणि ग्राहकांना त्यांच्या बँकेत मिळणाऱ्या दरांपेक्षा वेगळे असू शकतात.',
        },
        {
          q: '“पूर्ण” आणि “रकमा लपवलेल्या” या शेअर प्रकारांमध्ये काय फरक आहे?',
          a: 'पूर्ण प्रकारात तुमच्या मालमत्तेची सर्व नावे, मूल्ये, चलने आणि प्रकार URL मध्ये असतात: लिंक असलेल्या कोणालाही तुमचा संपूर्ण तपशील दिसतो आणि गणित तपासता येते. रकमा लपवलेल्या प्रकारात फक्त प्रत्येक चलनाच्या हिश्श्याची टक्केवारी आणि पट्ट्यांची लेबले असतात: रकमा नाहीत, मालमत्तेची नावे नाहीत. दोन्ही एका लिंकच्या रूपात तुमच्या क्लिपबोर्डवर कॉपी होतात, आणि कोणती पाठवायची हे तुम्ही निवडता.',
        },
        {
          q: 'विनिमय दर कुठून येतात?',
          a: 'दर मोफत Frankfurter API (api.frankfurter.dev) कडून येतात, जी मध्यवर्ती बँका आणि इतर अधिकृत स्रोतांनी प्रसिद्ध केलेले विनिमय दर एकत्र करते. हे संदर्भ दर आहेत, ते स्रोत प्रसिद्ध करतात तसे अपडेट होतात (सहसा प्रत्येक कामकाजाच्या दिवशी), आणि व्यवहाराचे दर नसून मानक म्हणून दिलेले असतात. तुम्हाला तुमच्या बँकेत किंवा ब्रोकरकडे प्रत्यक्ष मिळणाऱ्या दरांमध्ये खरेदी-विक्री दरातील फरक (spread) असतो आणि ते लक्षणीयरीत्या वेगळे असू शकतात, विशेषतः लहान चलनांसाठी. API key ची गरज नाही, आणि विनंती थेट तुमच्या ब्राउझरमधून जाते.',
        },
        {
          q: '“खर्चाचे चलन (functional currency)” म्हणजे काय?',
          a: 'खर्चाचे चलन म्हणजे ज्या चलनात तुम्ही मुख्यतः खर्च करता आणि जगता ते. तुमची बिले, भाडे आणि किराणा ज्या चलनात मोजले जातात ते हेच. आम्ही ते जोखमीच्या खुणांमधून वगळतो, कारण विनिमय दरातील बदलांमुळे तुमच्या खर्चाच्या चलनातील पैशात तुम्हाला काय मिळते ते बदलत नाही.',
        },
        {
          q: '“कमी”, “मध्यम” आणि “जास्त” यांचा अर्थ काय?',
          a: 'खर्चाचे चलन नसलेल्या चलनांसाठी हे वर्णनात्मक पट्टे आहेत: निव्वळ संपत्तीच्या 20% पेक्षा कमी म्हणजे “कमी”, 20 ते 40% म्हणजे “मध्यम”, आणि 40% पेक्षा जास्त म्हणजे “जास्त”. ते हिश्श्याच्या आकाराचे वर्णन करतात, तुम्ही काय करावे याचे नाही. एखादी पातळी तुमच्या परिस्थितीला बसते का, हे तुमच्या भविष्यातील खर्चाच्या योजना, तुम्ही कुठे निवृत्त होणार आहात, आणि चलन जोखीम आणि इतर उद्दिष्टे यांचा तोल तुम्ही कसा साधता, या सगळ्यांवर अवलंबून असते.',
        },
        {
          q: 'कर्जे आणि देणी समाविष्ट करता येतात का?',
          a: 'हो. प्रत्येक ओळीत मालमत्ता/देणी अशी निवड असते. देण्यांच्या रकमा त्या चलनाच्या निव्वळ स्थितीतून वजा होतात. तुमच्याकडे USD बचतीसोबत USD मधील गहाण कर्ज असेल, तर साधन तुमचा निव्वळ USD हिस्सा दाखवते. ज्या चलनात तुमच्याकडे जितके आहे त्यापेक्षा तुमची देणी जास्त आहेत, त्यावर “निव्वळ कर्ज” अशी खूण होते.',
        },
        {
          q: 'CSV अपलोड कसे काम करते?',
          a: 'या स्तंभांसह CSV फाइल तयार करा: name (ऐच्छिक), value (आवश्यक), currency (आवश्यक, 3 अक्षरी कोड), type (ऐच्छिक, “asset” किंवा “liability”, न दिल्यास asset). “CSV अपलोड करा” वर क्लिक करा, फाइल निवडा, आणि ओळी आपोआप भरल्या जातात. अवैध ओळी त्यांच्या क्रमांकासह दाखवल्या जातात, म्हणजे तुम्ही त्या दुरुस्त करू शकता. पुष्टी विचारल्यानंतर अपलोड सध्याच्या डेटाची जागा घेते.',
        },
      ],
    },
    related: {
      heading: 'तुमची निव्वळ संपत्ती समजून घ्या',
      lead: 'निव्वळ संपत्ती म्हणजे काय इथपासून अनेक चलनांमधील पैशांच्या व्यवस्थापनापर्यंत.',
      items: [
        {
          kicker: 'मूलतत्त्वे',
          title: 'निव्वळ संपत्ती म्हणजे काय आणि ती का महत्त्वाची आहे',
          desc: 'मालमत्ता वजा देणी हे आर्थिक आरोग्याचे सर्वात सोपे मोजमाप आहे. हे साधन ते अनेक चलनांमधील मालमत्तेपर्यंत वाढवते.',
        },
        {
          kicker: 'निव्वळ संपत्ती',
          title: 'तुमची निव्वळ संपत्ती 10 मिनिटांत कशी काढायची',
          desc: 'हा कॅल्क्युलेटर वापरतो ती दोन स्तंभांची पद्धत: तुमच्याकडे काय आहे त्याची यादी करा, तुमच्या देण्यांची यादी करा, फरक काढा.',
        },
        {
          kicker: 'चलनांचे व्यवस्थापन',
          title: 'अनेक चलनांमधील पैशांचे व्यवस्थापन',
          desc: 'चलन विनिमयाच्या शुल्कात पैसे न गमावता अनेक चलनांमध्ये कमाई, बचत आणि खर्च करण्याच्या व्यावहारिक पद्धती.',
        },
        {
          kicker: 'कर्ज',
          title: 'देणी: तुमची देणी काय आहेत आणि व्याजदर का महत्त्वाचा असतो',
          desc: 'परकीय चलनातील कर्जात एकाच वेळी दोन जोखमी असतात: व्याजाचा खर्च आणि विनिमय दरातील बदल. कॅल्क्युलेटर दोन्हींची निव्वळ रक्कम काढतो.',
        },
        {
          kicker: 'क्रयशक्ती',
          title: 'तुमच्या युरोमध्ये काही देशांत जास्त का मिळते',
          desc: 'विनिमय दर ही अर्धीच गोष्ट आहे. देशांमधील संपत्तीची तुलना करताना स्थानिक किमतींची पातळी विनिमय दराइतकीच महत्त्वाची असते.',
        },
        {
          kicker: 'महागाई',
          title: 'क्रयशक्ती: आजचे €1,000 उद्या €1,000 का नसतात',
          desc: 'चलन हा खऱ्या संपत्तीकडे पाहण्याचा एक दृष्टिकोन आहे; महागाई हा दुसरा. नाममात्र शिल्लक (nominal balance) रकमेत दोन्हींपैकी काहीच दिसत नाही.',
        },
        {
          kicker: 'FIRE',
          title: 'आर्थिक स्वातंत्र्याची ओळख',
          desc: 'FIRE च्या मूलभूत गोष्टी, आणि तुमची निवृत्ती अनेक देशांमध्ये पसरलेली असेल तेव्हा चलनांचे विविधीकरण का महत्त्वाचे असते.',
        },
        {
          kicker: 'नियोजन',
          title: 'आर्थिक उद्दिष्टे ठरवणे',
          desc: 'उद्दिष्टे अनेकदा मालमत्ता वाटपाला कसा आकार देतात, लोक कोणती चलने ठेवतात यासह.',
        },
      ],
      footerTag: 'चलनांच्या व्यवस्थापनावर आणखी वाचा',
      footerAll: 'किंवा सर्व लेख पाहा',
    },
  },
  island: {
    currencies: currenciesMr,
    toolbar: {
      aria: 'निव्वळ संपत्ती कॅल्क्युलेटरच्या क्रिया',
      currencyLabel: 'तुमचे चलन (ज्यात तुम्ही खर्च करता)',
      currencyHelp: 'तुमची निव्वळ संपत्ती या चलनात दाखवली जाते. दुसऱ्या चलनातील सगळे नवीनतम अधिकृत विनिमय दरांनी बदलले जाते.',
      share: 'शेअर करा',
      shareTitle: 'तुमची निव्वळ संपत्ती शेअर करा',
      reset: 'पुन्हा सुरुवात करा',
      resetTitle: 'सगळा डेटा पुसून नव्याने सुरुवात करा',
      copiedLabel: 'लिंक क्लिपबोर्डवर कॉपी झाली',
      shareUrlAria: 'शेअर करता येणाऱ्या लिंकचा URL',
    },
    rates: {
      errorBefore: 'विनिमय दर उपलब्ध नाहीत; रकमा न बदलता जशाच्या तशा दाखवल्या जात आहेत.',
      retry: 'पुन्हा प्रयत्न करा',
      loading: 'विनिमय दर लोड होत आहेत…',
      partial: 'एक किंवा अधिक चलनांचे चालू दर मिळाले नाहीत, त्यामुळे ती खालील एकूण रकमेतून वगळली आहेत. त्यांच्या मूळ चलनातील रकमा प्रत्येक चलनाच्या कार्डवर दाखवल्या आहेत.',
    },
    shared: {
      readOnly: 'तुम्ही कोणीतरी शेअर केलेली निव्वळ संपत्ती पाहत आहात. दाखवलेला डेटा पाठवणाऱ्याने समाविष्ट करायचे ठरवले तेवढाच आहे. खालील फॉर्ममधून तुम्ही नव्याने सुरुवात करू शकता.',
    },
    table: {
      heading: 'तुमची मालमत्ता आणि देणी',
      itemsOne: '{count} नोंद',
      itemsMany: '{count} नोंदी',
      itemsFew: '{count} नोंदी',
      aria: 'मालमत्ता आणि देणी',
      colName: 'नाव',
      colValue: 'मूल्य',
      colCurrency: 'चलन',
      colType: 'प्रकार',
      colActions: 'क्रिया',
      addAsset: '+ मालमत्ता जोडा',
      uploadCsv: 'CSV अपलोड करा',
      uploadCsvAria: 'CSV फाइल अपलोड करा',
      downloadCsv: 'CSV डाउनलोड करा',
      downloadTitle: 'तुमची मालमत्ता CSV म्हणून डाउनलोड करा',
      errorTitleOne: '{count} ओळ आयात होऊ शकली नाही:',
      errorTitleMany: '{count} ओळी आयात होऊ शकल्या नाहीत:',
      errorTitleFew: '{count} ओळी आयात होऊ शकल्या नाहीत:',
      errorLine: 'ओळ {line}: {message}',
      csvErrors: {
        empty: 'CSV रिकामी आहे.',
        columns: 'किमान value आणि currency हे स्तंभ अपेक्षित आहेत.',
        invalidValue: '“{value}” ही वैध धन संख्या नाही.',
        emptyCurrency: 'चलनाचा कोड रिकामा आहे.',
        unsupportedCurrency: '“{value}” हे उपलब्ध चलन नाही. उपलब्ध: {supported}.',
      },
    },
    row: {
      nameAria: 'मालमत्तेचे नाव (ओळ {index}, एकूण {total} पैकी)',
      valueAria: 'मूल्य (ओळ {index})',
      currencyAria: 'चलन (ओळ {index})',
      typeAria: 'प्रकार (ओळ {index})',
      namePlaceholder: 'मालमत्तेचे/देण्याचे नाव',
      asset: 'मालमत्ता',
      liability: 'देणे',
      removeTitle: 'काढा',
      removeAria: 'ओळ {index} काढा',
    },
    results: {
      empty: 'तुमची निव्वळ संपत्ती पाहण्यासाठी किमान एक मालमत्ता जोडा.',
      totalLabel: 'एकूण निव्वळ संपत्ती',
      hidden: 'लपवलेले',
      whatYouOwn: 'तुमच्याकडे काय आहे',
      whatYouOwe: 'तुमची देणी',
      singleNote: 'इथे सगळे {currency} मध्ये आहे, त्यामुळे विनिमय दरांचा त्यावर परिणाम होत नाही. तुम्ही दुसऱ्या चलनातील काही जोडले, तर तुमच्या निव्वळ संपत्तीचा किती भाग विनिमय दरांवर अवलंबून आहे हेही इथे दिसेल.',
      partialHint: 'किमान एका चलनाचा चालू दर मिळाला नाही, त्यामुळे ते या एकूण रकमेतून वगळले आहे.',
      rateUnavailable: 'दर उपलब्ध नाही',
      noRateAvailable: '{currency} च्या तुलनेत {code} चा चालू दर उपलब्ध नाही; रक्कम न बदलता दाखवली आहे',
      badgeFunctional: 'खर्चाचे चलन',
      badgeNetDebt: 'निव्वळ कर्ज',
      badgeElevated: 'जास्त',
      badgeModerate: 'मध्यम',
      badgeLow: 'कमी',
      riskHeading: 'प्रत्येक चलनाच्या जोखमीचे मूल्यमापन',
      labelFunctional: 'तुमचे खर्चाचे चलन',
      labelNetDebt: 'या चलनात निव्वळ कर्ज',
      labelElevated: 'जास्त हिस्सा',
      labelModerate: 'मध्यम हिस्सा',
      labelLow: 'कमी हिस्सा',
      disclaimer: 'हा कॅल्क्युलेटर चलनानुसार तुमच्या निव्वळ स्थितीचे गणिती हिस्से दाखवतो, अधिकृत संदर्भ दर वापरून, जे तुमच्या बँकेत किंवा ब्रोकरकडे मिळणाऱ्या दरांपेक्षा वेगळे असू शकतात. तो तुमच्या भविष्यातील खर्चाच्या योजना, कर-निवासाचा दर्जा (tax residency), जोखीम-बचावाच्या (hedging) रणनीती किंवा जोखीम सहनशीलता विचारात घेत नाही, आणि तो आर्थिक सल्ला नाही. वैयक्तिक सल्ल्यासाठी परवानाधारक आर्थिक सल्लागाराशी बोला.',
    },
    rec: {
      noRate: 'विनिमय दराच्या सेवेकडून {currency} च्या तुलनेत {code} चा चालू दर मिळाला नाही, त्यामुळे ही स्थिती हिश्श्याच्या गणितातून वगळली आहे. मूळ चलनातील निव्वळ रक्कम वर दाखवलेली आहेच.',
      functionalHidden: 'हे तुमचे खर्चाचे चलन आहे. त्याच्या हिश्श्याची टक्केवारी या शेअरमध्ये समाविष्ट नाही.',
      functionalMost: 'तुमच्या निव्वळ संपत्तीपैकी {pct}% तुमच्या खर्चाच्या चलनात ({currency}) आहे. उरलेले {rest}% इतर चलनांमध्ये आहे आणि त्यांच्या विनिमय दरांनुसार हलते.',
      functionalMuch: 'तुमच्या निव्वळ संपत्तीपैकी {pct}% तुमच्या खर्चाच्या चलनात ({currency}) आहे. उरलेले {rest}% इतर चलनांमध्ये आहे, त्यामुळे तुमच्या रोजच्या क्रयशक्तीचा लक्षणीय भाग त्यांच्या विनिमय दरांनुसार हलतो.',
      functionalLittle: 'तुमच्या निव्वळ संपत्तीपैकी फक्त {pct}% तुमच्या खर्चाच्या चलनात ({currency}) आहे. उरलेले {rest}% इतर चलनांमध्ये आहे, त्यामुळे तुमच्या क्रयशक्तीचा बहुतेक भाग त्यांच्या विनिमय दरांनुसार हलतो.',
      netDebt: '{code} मध्ये तुमच्याकडे जितके आहे त्यापेक्षा तुमची देणी जास्त आहेत (“निव्वळ कर्ज” (net debt) स्थिती). एखाद्या चलनात मालमत्तेपेक्षा देणी जास्त असतात तेव्हा परिणाम उलटा होतो: {currency} च्या तुलनेत {code} मजबूत झाले, तर तुमची देणी वाढतात आणि निव्वळ संपत्ती घटते; {code} कमकुवत झाले, तर निव्वळ संपत्ती वाढते.',
      elevatedHidden: 'या शेअरमध्ये तुमची {code} स्थिती निव्वळ संपत्तीचा मोठा हिस्सा आहे. {currency} च्या तुलनेत {code} 10% वाढले किंवा घटले, तर तुमची निव्वळ संपत्तीही लक्षणीय प्रमाणात वाढते किंवा घटते.',
      elevatedShown: 'तुमच्या निव्वळ संपत्तीपैकी {pct}% {code} मध्ये आहे. {currency} च्या तुलनेत {code} 10% वाढले किंवा घटले, तर तुमची निव्वळ संपत्ती साधारण {sensitivity}% ने वाढते किंवा घटते.',
      moderateHidden: 'तुमच्या निव्वळ संपत्तीचा मध्यम हिस्सा {code} मध्ये आहे. {currency} च्या तुलनेत {code} 10% वाढले किंवा घटले, तर तुमची निव्वळ संपत्ती {code} मधील हिश्श्याच्या सुमारे एक दशांश इतकी वाढते किंवा घटते.',
      moderateShown: 'तुमच्या निव्वळ संपत्तीपैकी {pct}% {code} मध्ये आहे. {currency} च्या तुलनेत {code} 10% वाढले किंवा घटले, तर तुमची निव्वळ संपत्ती साधारण {sensitivity}% ने वाढते किंवा घटते.',
      lowHidden: 'तुमच्या निव्वळ संपत्तीचा लहान हिस्सा {code} मध्ये आहे. {code}/{currency} दराचा तुमच्या एकूण निव्वळ संपत्तीवर मर्यादितच परिणाम होतो.',
      lowShown: 'तुमच्या निव्वळ संपत्तीपैकी {pct}% {code} मध्ये आहे. {currency} च्या तुलनेत {code} 10% वाढले किंवा घटले, तर तुमची निव्वळ संपत्ती साधारण {sensitivity}% ने वाढते किंवा घटते.',
    },
    chart: {
      heading: 'चलननिहाय हिस्सा',
      emptyNoRates: 'विनिमय दर सध्या उपलब्ध नाहीत, त्यामुळे चलनांची तुलना आलेखात करता येत नाही.',
      emptyNoValues: 'हिश्श्याचा आलेख पाहण्यासाठी वर मूल्ये भरा.',
      currencyOne: 'चलन',
      currencyMany: 'चलने',
      currencyFew: 'चलने',
      legendAria: 'चलने',
      aria: 'चलननिहाय हिश्श्याचा डोनट आलेख. {list}',
      listSeparator: '. ',
      announce: '{name}: तुमच्या निव्वळ संपत्तीपैकी {pct}.',
      announceWithAmount: '{name}: तुमच्या निव्वळ संपत्तीपैकी {pct}, {amount}.',
      note: 'आलेखात नाहीत: {codes}, कारण सध्या {currency} शी त्यांचा विनिमय दर उपलब्ध नाही.',
      tableCaption: 'निव्वळ स्थितीनुसार चलननिहाय हिस्सा',
      tableColCurrency: 'चलन',
      tableColConcentration: 'हिस्सा',
      tableColRisk: 'जोखमीची पातळी',
    },
    csv: {
      confirmOne: 'CSV अपलोड केल्यावर तुमच्या सध्याच्या {current} नोंदीऐवजी फाइलमधील नोंदी (एकूण {pending}) येतील. पुढे जायचे?',
      confirmMany: 'CSV अपलोड केल्यावर तुमच्या सध्याच्या {current} नोंदींची जागा फाइलमधील {pending} नोंदी घेतील. पुढे जायचे?',
      confirmFew: 'CSV अपलोड केल्यावर तुमच्या सध्याच्या {current} नोंदींची जागा फाइलमधील {pending} नोंदी घेतील. पुढे जायचे?',
      replace: 'बदला',
      cancel: 'रद्द करा',
    },
    shareModal: {
      title: 'तुमचे विश्लेषण शेअर करा',
      legend: 'काय शेअर करायचे ते निवडा:',
      fullName: 'पूर्ण आवृत्ती',
      fullDesc: 'मालमत्तेचा सर्व तपशील, मूल्ये आणि निव्वळ संपत्ती',
      redactedName: 'रकमा लपवलेली आवृत्ती',
      redactedDesc: 'फक्त चलननिहाय टक्केवारी आणि जोखमीच्या पातळ्या. रकमा किंवा नावे नाहीत.',
      cancel: 'रद्द करा',
      copy: 'लिंक कॉपी करा',
      copied: 'कॉपी झाली!',
      previewHeading: 'पाहणाऱ्याला असे दिसेल',
    },
  },
};
