/**
 * The inflation calculator's copy, in every language.
 *
 * Two halves, as for the other tools. `page` is what
 * `src/components/pages/InflationCalculatorPage.astro` renders: the heading,
 * the notes on how to read a result, the source of the history, the FAQ and
 * the related reading. `island` is what `src/components/InflationCalculator.tsx`
 * renders: the four questions, the fields, the history panel, the answer, the
 * line under it and the charts. The island is handed one locale's `island`
 * slice as a prop and never imports a catalog, so the client chunk carries one
 * language's words and not every tool's in every language.
 *
 * Figures are never typed here. A sentence that quotes one carries a `{name}`
 * and the component fills it: the rate limits from the constants in
 * `src/utils/inflation/math.ts`, the World Bank's update date from the data
 * file, the amounts and rates from what the reader typed, written by
 * `formatAmount` in the chosen currency's own conventions, or the page's own
 * style where it has one (Spanish, see `TOOL_AMOUNT_LOCALE`).
 *
 * Every result sentence says "if inflation averages", never "will": the tool
 * shows a scenario at a rate the reader chose, and the line under each result
 * repeats it a point lower and higher so that it cannot read as a forecast.
 *
 * Country names are not here. The page writes them with `Intl.DisplayNames` in
 * the page's own language from each country's ISO code, so no list of 190
 * countries needs translating. The one name the browser cannot supply is the
 * euro area, which is not a country and has no ISO code; it is
 * `island.history.euroArea`.
 *
 * Not here either: the analytics labels, which the privacy notice's changelog
 * names; the addresses, which `localizedPath` prefixes; and the source's own
 * name, "World Bank", and the English lesson title, which read the same in
 * every language and so live in the component.
 */
import { currenciesCs, currenciesEn, currenciesEs, currenciesHi, currenciesMr } from './currencies.ts';

export const inflationEn = {
  meta: {
    title: 'Inflation Calculator: What Your Money Buys Later | nidhi',
    description:
      'Free inflation calculator: what money buys after years of inflation, what a price may cost later, and history by country. Runs in your browser.',
  },
  /**
   * Structured data. The names are the tool's own and are translated, as the
   * other tools' are; `FinanceApplication` and the free offer's currency are
   * schema.org values and stay in the component.
   */
  schema: {
    name: 'nidhi Inflation Calculator',
    alternateNames: ['nidhi Purchasing Power Calculator', 'nidhi Real Return Calculator'],
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript. Modern browser.',
    featureList: [
      "What an amount buys after years of inflation, in today's money",
      'What a price costs after years of inflation',
      "What a past amount is worth today, at a rate you choose or with a country's actual yearly inflation",
      'Whether a raise or a savings return keeps up with inflation, with the exact real rate',
      'Every result also shown one percentage point lower and higher',
      'Yearly inflation history for {countries} countries and the euro area, from the World Bank',
      'Rates from {minRate} to {maxRate}% a year, so hyperinflation can be shown',
      'Results in 38 currencies',
      'Shareable link to any calculation',
    ],
  },
  page: {
    /** Above the planner waitlist box: why the planner matters for this tool. */
    plannerLine:
      'The nidhi planner projects your whole picture forward with its assumptions on screen, inflation included, in one currency or several.',
    breadcrumb: {
      home: 'Home',
      freeTools: 'Free tools',
      this: 'Inflation calculator',
    },
    eyebrow: 'Free tools',
    title: 'Inflation calculator: what money buys over time',
    /**
     * Three parts: phones show the first and the last (`ifcp-wideOnly` hides
     * the middle). The spaces at the ends of the outer two are the markup's.
     */
    lead: {
      before: 'See what inflation does to an amount over the years',
      wide: ", forwards or backwards, at a rate you choose or with a country's actual history. Every answer comes with the same sum one point lower and higher, because it is a scenario, not a forecast",
      after: '. Everything runs in your browser; nothing you type is sent anywhere.',
    },
    /** Three short notes, each a `<strong>` lead and the explanation after it, in this order. */
    notes: {
      heading: 'How to read the answer',
      items: {
        steady: {
          lead: 'One rate, every year.',
          rest: ' The tool applies the rate you type once a year, the same every year. Real prices rise unevenly: some years jump, a few fall, and an average over a decade hides both.',
        },
        personal: {
          lead: 'National inflation is an average.',
          rest: ' It is measured on a basket of goods and services that a statistics office chooses to represent a typical household. If your rent, school fees or medicines rise faster than that basket, your own inflation is higher; if most of your spending went on things that got cheaper, it is lower.',
        },
        history: {
          lead: 'History is not a forecast.',
          rest: " A country's last ten years say little about its next ten. Inflation has changed sharply within a few years many times, in both directions.",
        },
      },
      /** Split around the lesson's title, which is English and lives in the component. */
      lesson: {
        before: 'The idea behind this tool, with worked examples: ',
        after: '.',
      },
    },
    /**
     * Where the history comes from. Split around the link, whose text is the
     * source's own name ("World Bank") and lives in the component.
     */
    source: {
      heading: 'Where the history comes from',
      before: 'Yearly consumer price inflation by country, from the ',
      link: 'World Bank',
      after:
        ' (indicator FP.CPI.TOTL.ZG, "Inflation, consumer prices (annual %)"), licensed CC BY 4.0. The World Bank last updated these figures on {updated}. nidhi keeps a copy and checks for new figures every month, so your browser loads the history from nidhi.today and never contacts the World Bank. The euro area figure is for the euro area as a whole. Figures can be revised, and a few countries have years with no figure or a record that starts late.',
    },
    /**
     * The FAQ, printed on the page and published as FAQPage structured data.
     * `{copyLink}` is the share button's own label and `{updated}` the data's
     * update date, so neither can disagree with the thing it names.
     */
    faq: {
      heading: 'Frequently asked questions',
      items: [
        {
          q: 'What does the answer mean?',
          a: 'It works out one scenario: if prices rise at the rate you typed, every year, for the years you chose, what does an amount correspond to? "Buying power later" shows what an amount could buy in the future, in today\'s money. "Cost later" carries a price forward. "Past to today" brings an old amount up to date. "Keeping up" compares a raise or a savings return with inflation. Answers are rounded and say "about", because the rate is an assumption, not a measurement.',
        },
        {
          q: 'Why does every answer come with two more?',
          a: 'Nobody knows what inflation will average over the next ten years. The line under each answer repeats the sum one percentage point lower and one higher (never below 0%), so you can see how much the answer depends on the rate. Over long periods a single point makes a large difference, which is why one figure on its own can read as more certain than it is.',
        },
        {
          q: 'Is national inflation the same as my inflation?',
          a: 'Not necessarily. National inflation measures the price of a basket of goods and services chosen to represent a typical household. Your own spending differs: whether you rent or own, where you live, your age, whether you pay school fees or care costs. Many statistics offices publish inflation by category (food, housing, transport, health), which can show whether your largest costs have been rising faster or slower than the headline figure. Some people try a rate a point or two above or below the national one to see how much that matters.',
        },
        {
          q: 'Where does the history come from, and how recent is it?',
          a: 'From the World Bank\'s World Development Indicators: "Inflation, consumer prices (annual %)" (indicator FP.CPI.TOTL.ZG), licensed CC BY 4.0, which gathers the figures national statistics offices and the IMF publish. The World Bank last updated them on {updated}; nidhi checks for new figures every month. For most countries the latest year is the last full calendar year, some lag behind, and a few have years with no figure. The tool shows each country\'s coverage and never fills a gap with a guess: "Past to today" starts only from years with an unbroken record up to the latest year.',
        },
        {
          q: 'Why can the rate go up to {maxRate}%?',
          a: 'Because it has happened. Hyperinflation, often defined as prices rising more than 50% a month, has struck several countries in living memory, and yearly rates in the thousands of percent appear in the World Bank\'s own data. A tool capped at 20% could not show what those years did to savings. At such rates the answers grow so large or so small that the tool says "more than" or "less than" rather than printing every digit.',
        },
        {
          q: 'Why is the real rate not just the raise minus inflation?',
          a: 'Because both compound. Buying power grows by (1 + raise) ÷ (1 + inflation), minus one. With a 5% raise and 3% inflation that is about 1.94% a year, not 2%. At low rates the shortcut of subtracting is close; at high inflation it is far off: a 110% raise with 100% inflation leaves 5% more buying power, not 10%.',
        },
        {
          q: 'Is my data sent anywhere?',
          a: 'No. The calculations run in your browser, and the amounts, rates and years you type are not sent to us or anyone else. Picking a country loads its history from nidhi.today, this site, never from the World Bank. Nothing goes into the page address while you use the tool. When you press "{copyLink}", your values go into the link after the # sign, a part of the address browsers never send to a server, and the page removes them from the address bar before analytics start. Analytics records which question, currency and country you pick, never the numbers.',
        },
        {
          q: 'Is this financial advice?',
          a: 'No. It shows what a rate you choose does to an amount over time. It cannot tell you what inflation will be, or what to do with your money.',
        },
      ],
    },
    /**
     * Related reading, keyed by the lesson's slug. The slug, the address and
     * the `data-attr` label are in the component; the words are this page's
     * own short description of each lesson.
     */
    related: {
      heading: 'Read more',
      cards: {
        'purchasing-power': {
          kicker: 'The idea behind this tool',
          title: 'Purchasing power',
          desc: 'Why the same money buys less as prices rise, and how to work out a real return.',
        },
        'saving-vs-investing': {
          kicker: 'Next step',
          title: 'Saving vs. investing',
          desc: 'Where cash fits, where investing fits, and what inflation does to each.',
        },
        'why-your-euro-buys-more-in-some-countries': {
          kicker: 'Across borders',
          title: 'What money buys abroad',
          desc: 'Exchange rates against purchasing power: why the same amount buys more in some countries.',
        },
      },
    },
  },
  /**
   * What the tool itself says while you use it. A counted string is `one`,
   * `few` and `other`, picked by `plural()` in the component, because Hindi
   * does not pluralise a noun the way English adds an "s" and Czech has a
   * third form for 2 to 4.
   */
  island: {
    /** The 38 currency names, shared by every tool: see `./currencies.ts`. */
    currencies: currenciesEn,
    formLabel: 'Inflation calculator',
    /** The spreadsheet's own sheets and rows; the rest reuses the labels below. */
    export: {
      /** The printed report's "What this means": interprets the answer, never advises. */
      meaning: 'Inflation is the rise in prices over time. Unless a country’s actual inflation was used, the figures assume the same rate every year; real inflation changes from year to year, and the prices you pay may rise faster or slower than the average.',
      moneyLabel: 'Amounts',
      moneyText: "To the currency's smallest unit. The page rounds its headline; these are the exact figures behind it.",
      sheets: { answer: 'Answer', byYear: 'By year' },
      question: 'Question',
      country: 'Inflation history',
      result: 'Result',
      realRate: 'Buying power, % a year',
      inWords: 'In words',
      years: 'Years used',
      source: 'Source',
      sourceText: 'World Bank, indicator FP.CPI.TOTL.ZG, "Inflation, consumer prices (annual %)", CC BY 4.0.',
    },
    tabsLabel: 'Choose a question',
    tabs: {
      buy: 'Buying power later',
      cost: 'Cost later',
      past: 'Past to today',
      keep: 'Keeping up',
    },
    /** The question each tab answers, shown above the fields. */
    questions: {
      buy: "What could an amount buy after some years of inflation, in today's money?",
      cost: 'What could something that costs this today cost later, if prices keep rising?',
      past: 'What is an amount from the past worth today, at a rate you choose?',
      pastCountry: "What is an amount from the past worth today in {country}, using its actual yearly inflation?",
      keep: 'Does a raise or a savings return keep up with inflation?',
    },
    fields: {
      currency: 'Currency',
      amount: {
        buy: 'Amount',
        cost: 'What it costs today',
        past: 'Amount back then',
        keep: 'Amount today',
      },
      amountError: 'Enter an amount from 0 to {max}.',
      rate: 'Inflation, % a year',
      rateHint: '{min} to {max}, up to two decimals',
      rateError: 'Enter a rate from {min} to {max}, with up to two decimals.',
      years: {
        buy: 'Years from now',
        cost: 'Years from now',
        past: 'Years ago',
        keep: 'Years',
      },
      yearsHint: '{min} to {max}',
      yearsError: 'Enter a whole number of years from {min} to {max}.',
      growth: 'Raise or return, % a year',
      growthHint: 'Can be negative, for a pay cut or a loss',
      growthError: 'Enter a rate from {min} to {max}, with up to two decimals.',
      from: 'Starting year',
      fromHint: 'Up to {last}, the latest year with a figure.',
    },
    history: {
      label: 'Inflation history, for context',
      hint: "Optional. Shows a country's past inflation; the answer uses it only in \"Past to today\", or if you use its average.",
      none: 'No country',
      euroArea: 'Euro area',
      loading: 'Loading the history…',
      error: 'The history could not be loaded. The calculator still works with the rate you type.',
      chartLabel: 'Yearly inflation in {country}, {first} to {last}. Highest {high} in {highYear}, lowest {low} in {lowYear}.',
      average: '{country}, {first} to {last}: about {average} a year on average.',
      averageGaps: '{country}, the {count} most recent years with a figure ({first} to {last}): about {average} a year on average.',
      averageNote:
        'A geometric average: the steady rate that would have had the same total effect. This is history, not a prediction.',
      coverage: 'Figures cover {first} to {last}.',
      gaps: 'No figure for {years}.',
      gapStart: '"Past to today" starts no earlier than {start}, so that no year is skipped.',
      use: 'Use this average as the rate',
      useOutside: 'This average is outside the {min} to {max}% the rate box accepts, so it cannot be used as the rate.',
      currencyOther:
        "Amounts stay in {currency}: {country}'s own currency is not one of this tool's currencies. The history is a percentage, so it reads the same in any currency.",
      capped: 'Bars above {cap} are cut off at the top.',
      legendRecent: 'Years in the average',
      legendOlder: 'Earlier years',
      tableSummary: 'Show the yearly figures',
      tableCaption: 'Yearly inflation in {country}',
      tableYear: 'Year',
      tableRate: 'Inflation',
      tableNone: 'No figure',
      /** Joins a list of year ranges in the gaps sentence. */
      rangeJoin: ', ',
      range: '{first} to {last}',
    },
    results: {
      heading: 'The answer',
      years: { one: '1 year', few: '{n} years', other: '{n} years' },
      /** `{result}` arrives with its own "about", "more than" or "less than". */
      buy: 'If inflation averages {rate} a year, {amount} in {years} buys what {result} buys today.',
      cost: 'If prices rise {rate} a year on average, something that costs {amount} today costs {result} in {years}.',
      past: 'If inflation averaged {rate} a year, {amount} from {years} ago buys what {result} buys today.',
      pastCountry: 'In {country}, {amount} in {from} bought what {result} bought in {to}.',
      pastCountryRise: 'Prices rose about {total} in total over those {years}, an average of {average} a year.',
      keepMore: 'With a raise or return of {growth} a year and inflation averaging {rate}, buying power grows about {real} a year.',
      keepLess: 'With a raise or return of {growth} a year and inflation averaging {rate}, buying power shrinks about {real} a year.',
      keepSame: 'With a raise or return of {growth} a year and inflation averaging {rate}, buying power stays about the same.',
      keepAfter: 'After {years}, {amount} growing at {growth} a year buys what {result} buys today.',
      keepExact:
        'Worked out exactly: (1 + {growth}) ÷ (1 + {rate}) − 1. Subtracting one rate from the other ({shortcut}) is a common shortcut, close at low rates and far off at high ones.',
      keepHeadline: '{real} a year',
      about: 'about {amount}',
      moreThan: 'more than {amount}',
      lessThan: 'less than {amount}',
      /** The line under an answer: the same sum one point either side. */
      bandLabel: 'One point either side:',
      bandItem: 'At {rate}: {result}',
      bandKeep: 'At {rate} inflation: {real} a year',
      method: 'Compounded once a year, at the same rate every year. A scenario, not a forecast.',
      methodHistory: "Compounded year by year with each year's actual figure. History, not a forecast.",
      fix: 'Fix the highlighted fields to see the answer.',
      /** Shown, and announced, over a stale answer while a field is invalid. */
      stale: 'This answer is out of date: fix the highlighted fields to update it.',
      /** Announced to screen readers after each recalculation. */
      announce: 'Updated answer: {headline}. {sentence}',
    },
    chart: {
      title: {
        buy: "What {amount} buys each year, in today's money",
        cost: 'What {amount} becomes each year',
        past: 'What {amount} is worth each year since',
        keep: "What {amount} buys each year, in today's money",
      },
      axis: {
        buy: 'Years from now',
        cost: 'Years from now',
        past: 'Years since then',
        keep: 'Years from now',
        pastCountry: 'Year',
      },
      desc: 'Line chart. Starts at {start} ({from}) and ends at {end} ({to}).',
      yearsFrom: 'year {n}',
      tooLarge: 'At this rate the amounts grow too large to draw.',
    },
    actions: {
      copy: 'Copy a link to this calculation',
      copied: 'Link copied',
      /** The fallback prompt when the clipboard is unavailable. */
      copyPrompt: 'Copy this link:',
      reset: 'Reset',
    },
  },
};

/**
 * The Hindi edition. Same shape by construction, and the same figures.
 *
 * Words from `docs/i18n/hi-glossary.md`: महँगाई (never मुद्रास्फीति outside a
 * cited name), क्रय शक्ति, चक्रवृद्धि, लगभग for an approximate figure, शेयर लिंक.
 * Added for this tool: महँगाई कैलकुलेटर, वेतन वृद्धि (a raise), असली दर (the
 * real rate, after the glossary's असली रिटर्न), ज्यामितीय औसत, प्रतिशत अंक,
 * परिदृश्य (a scenario) and पूर्वानुमान (a forecast), and वस्तुओं और सेवाओं की
 * टोकरी for the basket, which is how Indian CPI reporting says it.
 */
export const inflationHi: typeof inflationEn = {
  meta: {
    title: 'महँगाई कैलकुलेटर (Inflation\u00A0Calculator) | nidhi',
    description:
      'मुफ़्त महँगाई कैलकुलेटर: सालों बाद पैसे से कितना ख़रीदा जा सकता है, कोई चीज़ आगे कितने की हो सकती है, और देशों की महँगाई का इतिहास। ब्राउज़र में चलता है।',
  },
  schema: {
    name: 'nidhi महँगाई कैलकुलेटर',
    alternateNames: ['nidhi क्रय शक्ति कैलकुलेटर', 'nidhi असली रिटर्न कैलकुलेटर'],
    operatingSystem: 'कोई भी (वेब ब्राउज़र)',
    browserRequirements: 'JavaScript ज़रूरी है। आधुनिक ब्राउज़र।',
    featureList: [
      'सालों की महँगाई के बाद किसी रकम से आज के पैसे में कितना ख़रीदा जा सकता है',
      'सालों की महँगाई के बाद किसी चीज़ की कीमत',
      'पुरानी रकम आज कितनी के बराबर है, आपकी चुनी दर पर या किसी देश की दर्ज हुई सालाना महँगाई के साथ',
      'वेतन वृद्धि या बचत पर रिटर्न महँगाई के बराबर चलता है या नहीं, सटीक असली दर के साथ',
      'हर नतीजा एक प्रतिशत अंक कम और ज़्यादा पर भी',
      'World Bank से {countries} देशों और यूरो क्षेत्र की सालाना महँगाई का इतिहास',
      '{minRate} से {maxRate}% सालाना तक की दरें, ताकि हाइपरइन्फ़्लेशन भी दिखाया जा सके',
      '38 मुद्राओं में नतीजे',
      'किसी भी हिसाब का शेयर लिंक',
    ],
  },
  page: {
    plannerLine:
      'nidhi प्लानर आपकी पूरी तस्वीर को आगे के सालों तक ले जाकर दिखाता है, सारी मान्यताएँ स्क्रीन पर रखकर, महँगाई समेत, एक मुद्रा में या कई में।',
    breadcrumb: {
      home: 'होम',
      freeTools: 'मुफ़्त टूल',
      this: 'महँगाई कैलकुलेटर',
    },
    eyebrow: 'मुफ़्त टूल',
    title: 'महँगाई कैलकुलेटर: समय के साथ पैसे से कितना ख़रीदा जा सकता है',
    lead: {
      before: 'देखें कि सालों में महँगाई किसी रकम पर क्या असर डालती है',
      wide: ', आगे की ओर या पीछे की ओर, आपकी चुनी दर पर या किसी देश के दर्ज इतिहास के साथ। हर जवाब के साथ वही हिसाब एक अंक कम और एक अंक ज़्यादा पर भी दिखता है, क्योंकि यह एक परिदृश्य (scenario) है, पूर्वानुमान नहीं',
      after: '। सब कुछ आपके ब्राउज़र में चलता है; आपका टाइप किया कुछ भी कहीं नहीं भेजा जाता।',
    },
    notes: {
      heading: 'जवाब को कैसे पढ़ें',
      items: {
        steady: {
          lead: 'एक दर, हर साल।',
          rest: ' टूल आपकी टाइप की गई दर साल में एक बार लगाता है, हर साल वही। कीमतें असल में एक जैसी नहीं बढ़तीं: किसी साल तेज़ी से बढ़ती हैं, कभी-कभी घटती भी हैं, और दस साल का औसत दोनों को छिपा देता है।',
        },
        personal: {
          lead: 'देश की महँगाई एक औसत है।',
          rest: ' इसे वस्तुओं और सेवाओं की एक टोकरी पर मापा जाता है, जिसे सांख्यिकी विभाग एक आम परिवार के खर्च के हिसाब से चुनता है। अगर आपका किराया, स्कूल की फ़ीस या दवाइयाँ उस टोकरी से तेज़ी से महँगी हो रही हैं, तो आपकी अपनी महँगाई ज़्यादा है; अगर आपका ज़्यादातर खर्च उन चीज़ों पर है जो सस्ती हुईं, तो कम।',
        },
        history: {
          lead: 'इतिहास पूर्वानुमान नहीं है।',
          rest: ' किसी देश के पिछले दस साल उसके अगले दस साल के बारे में ज़्यादा नहीं बताते। महँगाई कई बार कुछ ही सालों में तेज़ी से बदली है, दोनों दिशाओं में।',
        },
      },
      lesson: {
        before: 'इस टूल के पीछे का विचार, उदाहरणों के साथ: ',
        after: ' (यह पाठ अंग्रेज़ी में है)।',
      },
    },
    source: {
      heading: 'इतिहास कहाँ से आता है',
      before: 'देशों की सालाना उपभोक्ता महँगाई, ',
      link: 'World Bank (विश्व बैंक)',
      after:
        ' से (इंडिकेटर FP.CPI.TOTL.ZG, "Inflation, consumer prices (annual %)"), CC BY 4.0 लाइसेंस के तहत। World Bank ने ये आँकड़े आख़िरी बार {updated} को अपडेट किए। nidhi इनकी एक कॉपी रखता है और हर महीने नए आँकड़े देखता है, इसलिए आपका ब्राउज़र इतिहास nidhi.today से लेता है और World Bank से कभी संपर्क नहीं करता। यूरो क्षेत्र का आँकड़ा पूरे यूरो क्षेत्र का है। आँकड़े बाद में संशोधित हो सकते हैं, और कुछ देशों के कुछ सालों का आँकड़ा नहीं है या उनका रिकॉर्ड देर से शुरू होता है।',
    },
    faq: {
      heading: 'अक्सर पूछे जाने वाले सवाल',
      items: [
        {
          q: 'जवाब का मतलब क्या है?',
          a: 'यह एक परिदृश्य का हिसाब लगाता है: अगर कीमतें आपकी टाइप की गई दर से, हर साल, आपके चुने सालों तक बढ़ें, तो कोई रकम किसके बराबर बैठती है? "आगे कितना ख़रीदा जा सकता है?" दिखाता है कि भविष्य में कोई रकम आज के पैसे में कितना ख़रीद सकती है। "आगे कितने का हो सकता है?" आज की कीमत को आगे ले जाता है। "बीते साल से आज तक" पुरानी रकम को आज तक लाता है। "क्या बराबरी हो रही है?" वेतन वृद्धि या बचत पर रिटर्न की तुलना महँगाई से करता है। जवाब गोल करके "लगभग" के साथ दिखते हैं, क्योंकि दर एक अनुमान है, माप नहीं।',
        },
        {
          q: 'हर जवाब के साथ दो और जवाब क्यों दिखते हैं?',
          a: 'कोई नहीं जानता कि अगले दस साल में महँगाई का औसत क्या रहेगा। हर जवाब के नीचे की पंक्ति वही हिसाब एक प्रतिशत अंक (percentage\u00A0point) कम और एक ज़्यादा पर दोहराती है (कभी 0% से नीचे नहीं), ताकि आप देख सकें कि जवाब दर पर कितना निर्भर है। लंबे समय में एक अंक का भी बड़ा फ़र्क पड़ता है, इसलिए अकेला एक आँकड़ा जितना पक्का लगता है, उतना होता नहीं।',
        },
        {
          q: 'क्या देश की महँगाई और मेरी महँगाई एक ही है?',
          a: 'ज़रूरी नहीं। देश की महँगाई वस्तुओं और सेवाओं की उस टोकरी की कीमत मापती है जो एक आम परिवार के खर्च को दर्शाने के लिए चुनी जाती है। आपका खर्च अलग होता है: आप किराए पर रहते हैं या अपने घर में, कहाँ रहते हैं, आपकी उम्र, आप स्कूल की फ़ीस या देखभाल का खर्च उठाते हैं या नहीं। कई सांख्यिकी विभाग श्रेणी के हिसाब से महँगाई भी छापते हैं (खाना, घर, यातायात, स्वास्थ्य), जिससे पता चल सकता है कि आपके सबसे बड़े खर्च मुख्य आँकड़े से तेज़ बढ़े या धीमे। कुछ लोग देश की दर से एक-दो अंक ऊपर या नीचे की दर आज़माकर देखते हैं कि इससे कितना फ़र्क पड़ता है।',
        },
        {
          q: 'इतिहास कहाँ से आता है, और कितना ताज़ा है?',
          a: 'World Bank के World Development Indicators से: "Inflation, consumer prices (annual %)" (इंडिकेटर FP.CPI.TOTL.ZG), CC BY 4.0 लाइसेंस के तहत, जिसमें देशों के सांख्यिकी विभागों और IMF द्वारा प्रकाशित आँकड़े इकट्ठा होते हैं। World Bank ने इन्हें आख़िरी बार {updated} को अपडेट किया; nidhi हर महीने नए आँकड़े देखता है। ज़्यादातर देशों का सबसे नया साल पिछला पूरा कैलेंडर साल होता है, कुछ देश पीछे चलते हैं, और कुछ के कुछ सालों का आँकड़ा नहीं है। टूल हर देश के आँकड़ों की अवधि दिखाता है और किसी कमी को अंदाज़े से नहीं भरता: "बीते साल से आज तक" सिर्फ़ उन सालों से शुरू होता है जिनसे सबसे नए साल तक रिकॉर्ड बिना टूटे चलता है।',
        },
        {
          q: 'दर {maxRate}% तक क्यों जा सकती है?',
          a: 'क्योंकि ऐसा हुआ है। हाइपरइन्फ़्लेशन, जिसे अक्सर कीमतों के हर महीने 50% से ज़्यादा बढ़ने के रूप में परिभाषित किया जाता है, हाल के दशकों में कई देशों में आया है, और हज़ारों प्रतिशत की सालाना दरें World Bank के अपने आँकड़ों में दिखती हैं। 20% पर रुकने वाला टूल यह नहीं दिखा सकता कि उन सालों ने बचत के साथ क्या किया। ऐसी दरों पर जवाब इतने बड़े या इतने छोटे हो जाते हैं कि टूल हर अंक लिखने के बजाय "से ज़्यादा" या "से कम" कहता है।',
        },
        {
          q: 'असली दर सिर्फ़ वेतन वृद्धि में से महँगाई घटाकर क्यों नहीं निकलती?',
          a: 'क्योंकि दोनों पर चक्रवृद्धि (compounding) होती है। क्रय शक्ति (purchasing\u00A0power) उतनी बढ़ती है जितना (1 + वेतन वृद्धि) ÷ (1 + महँगाई) में से एक घटाने पर आता है। 5% वेतन वृद्धि और 3% महँगाई पर यह लगभग 1.94% सालाना है, 2% नहीं। कम दरों पर घटाने का छोटा तरीक़ा क़रीब रहता है; ऊँची महँगाई पर वह बहुत दूर चला जाता है: 100% महँगाई के साथ 110% वेतन वृद्धि से क्रय शक्ति 5% बढ़ती है, 10% नहीं।',
        },
        {
          q: 'क्या मेरा डेटा कहीं भेजा जाता है?',
          a: 'नहीं। हिसाब आपके ब्राउज़र में होता है, और आपकी टाइप की गई रकम, दरें और साल हमें या किसी और को नहीं भेजे जाते। कोई देश चुनने पर उसका इतिहास nidhi.today से, यानी इसी साइट से, आता है, World Bank से कभी नहीं। टूल इस्तेमाल करते समय पेज के पते में कुछ नहीं जाता। जब आप "{copyLink}" दबाते हैं, तो आपके आँकड़े लिंक में # के बाद जाते हैं, और पते का वह हिस्सा ब्राउज़र कभी सर्वर को नहीं भेजता; पेज उन्हें एनालिटिक्स शुरू होने से पहले पते से हटा देता है। एनालिटिक्स यह दर्ज करता है कि आपने कौन-सा सवाल, कौन-सी मुद्रा और कौन-सा देश चुना, आँकड़े कभी नहीं।',
        },
        {
          q: 'क्या यह वित्तीय सलाह है?',
          a: 'नहीं। यह दिखाता है कि आपकी चुनी दर समय के साथ किसी रकम पर क्या असर डालती है। यह नहीं बता सकता कि महँगाई कितनी रहेगी, या आपको अपने पैसे के साथ क्या करना चाहिए।',
        },
      ],
    },
    related: {
      heading: 'और पढ़ें',
      cards: {
        'purchasing-power': {
          kicker: 'इस टूल के पीछे का विचार',
          title: 'क्रय शक्ति',
          desc: 'कीमतें बढ़ने पर उसी पैसे से कम क्यों ख़रीदा जा पाता है, और असली रिटर्न कैसे निकालें।',
        },
        'saving-vs-investing': {
          kicker: 'अगला कदम',
          title: 'बचत या निवेश',
          desc: 'नकदी कहाँ ठीक बैठती है, निवेश कहाँ, और महँगाई दोनों के साथ क्या करती है।',
        },
        'why-your-euro-buys-more-in-some-countries': {
          kicker: 'सीमाओं के पार',
          title: 'विदेश में पैसे से कितना मिलता है',
          desc: 'विनिमय दर और क्रय शक्ति: एक ही रकम से कुछ देशों में ज़्यादा क्यों ख़रीदा जा सकता है।',
        },
      },
    },
  },
  island: {
    currencies: currenciesHi,
    formLabel: 'महँगाई कैलकुलेटर',
    export: {
      meaning: 'महँगाई का मतलब है समय के साथ क़ीमतों का बढ़ना। जब तक किसी देश की असल महँगाई इस्तेमाल न हुई हो, ये आँकड़े हर साल एक ही दर मानते हैं; असल महँगाई साल-दर-साल बदलती है, और आप जो क़ीमतें चुकाते हैं वे औसत से तेज़ या धीमी बढ़ सकती हैं।',
      moneyLabel: 'रकम',
      moneyText: 'मुद्रा की सबसे छोटी इकाई तक। पेज अपना मुख्य जवाब गोल करके दिखाता है; ये उसके पीछे के सटीक आँकड़े हैं।',
      sheets: { answer: 'जवाब', byYear: 'हर साल' },
      question: 'सवाल',
      country: 'महँगाई का इतिहास',
      result: 'नतीजा',
      realRate: 'क्रय शक्ति, % सालाना',
      inWords: 'शब्दों में',
      years: 'इस्तेमाल हुए साल',
      source: 'स्रोत',
      sourceText: 'World Bank (विश्व बैंक), संकेतक FP.CPI.TOTL.ZG, "Inflation, consumer prices (annual %)", CC BY 4.0।',
    },
    tabsLabel: 'सवाल चुनें',
    tabs: {
      buy: 'आगे कितना ख़रीदा जा सकता है?',
      cost: 'आगे कितने का हो सकता है?',
      past: 'बीते साल से आज तक',
      keep: 'क्या बराबरी हो रही है?',
    },
    questions: {
      buy: 'कुछ सालों की महँगाई के बाद किसी रकम से, आज के पैसे में, कितना ख़रीदा जा सकता है?',
      cost: 'जो चीज़ आज इतने की है, वह आगे कितने की हो सकती है, अगर कीमतें बढ़ती रहें?',
      past: 'बीते समय की कोई रकम आज कितने के बराबर है, आपकी चुनी दर पर?',
      pastCountry: 'बीते समय की कोई रकम {country} में आज कितने के बराबर है, वहाँ की दर्ज हुई सालाना महँगाई के हिसाब से?',
      keep: 'क्या वेतन वृद्धि या बचत पर रिटर्न महँगाई के बराबर चल रहा है?',
    },
    fields: {
      currency: 'मुद्रा',
      amount: {
        buy: 'रकम',
        cost: 'आज की कीमत',
        past: 'उस समय की रकम',
        keep: 'आज की रकम',
      },
      amountError: '0 से {max} तक की रकम लिखें।',
      rate: 'महँगाई, % सालाना',
      rateHint: '{min} से {max}, ज़्यादा से ज़्यादा दो दशमलव',
      rateError: '{min} से {max} तक की दर लिखें, ज़्यादा से ज़्यादा दो दशमलव के साथ।',
      years: {
        buy: 'अब से कितने साल',
        cost: 'अब से कितने साल',
        past: 'कितने साल पहले',
        keep: 'साल',
      },
      yearsHint: '{min} से {max}',
      yearsError: '{min} से {max} तक के पूरे साल लिखें।',
      growth: 'वेतन वृद्धि या रिटर्न, % सालाना',
      growthHint: 'वेतन कटौती या नुकसान के लिए ऋणात्मक भी हो सकता है',
      growthError: '{min} से {max} तक की दर लिखें, ज़्यादा से ज़्यादा दो दशमलव के साथ।',
      from: 'शुरुआती साल',
      fromHint: '{last} तक, जो आँकड़े वाला सबसे नया साल है।',
    },
    history: {
      label: 'महँगाई का इतिहास, संदर्भ के लिए',
      hint: 'वैकल्पिक। किसी देश की पिछली महँगाई दिखाता है; जवाब इसे सिर्फ़ "बीते साल से आज तक" में इस्तेमाल करता है, या तब जब आप इसका औसत अपनाएँ।',
      none: 'कोई देश नहीं',
      euroArea: 'यूरो क्षेत्र',
      loading: 'इतिहास लोड हो रहा है…',
      error: 'इतिहास लोड नहीं हो सका। कैलकुलेटर आपकी टाइप की गई दर के साथ अब भी काम करता है।',
      chartLabel: '{country} में सालाना महँगाई, {first} से {last}। सबसे ज़्यादा {high}, {highYear} में; सबसे कम {low}, {lowYear} में।',
      average: '{country}, {first} से {last}: औसतन लगभग {average} सालाना।',
      averageGaps: '{country}, आँकड़े वाले सबसे नए {count} साल ({first} से {last}): औसतन लगभग {average} सालाना।',
      averageNote:
        'यह ज्यामितीय औसत (geometric\u00A0average) है: वह एक जैसी दर जिसका कुल असर उतना ही होता। यह इतिहास है, पूर्वानुमान नहीं।',
      coverage: 'आँकड़े {first} से {last} तक के हैं।',
      gaps: '{years} का आँकड़ा नहीं है।',
      gapStart: '"बीते साल से आज तक" {start} से पहले शुरू नहीं होता, ताकि कोई साल छूटे नहीं।',
      use: 'यह औसत दर के रूप में अपनाएँ',
      useOutside: 'यह औसत {min} से {max}% के दायरे से बाहर है जो दर का खाना स्वीकार करता है, इसलिए इसे दर के रूप में नहीं अपनाया जा सकता।',
      currencyOther:
        'रकम {currency} में ही रहेगी: {country} की अपनी मुद्रा इस टूल की मुद्राओं में नहीं है। इतिहास प्रतिशत में है, इसलिए वह किसी भी मुद्रा में एक जैसा पढ़ा जाता है।',
      capped: '{cap} से ऊपर के बार ऊपर से कटे हुए हैं।',
      legendRecent: 'औसत में शामिल साल',
      legendOlder: 'पहले के साल',
      tableSummary: 'सालाना आँकड़े दिखाएँ',
      tableCaption: '{country} में सालाना महँगाई',
      tableYear: 'साल',
      tableRate: 'महँगाई',
      tableNone: 'आँकड़ा नहीं',
      rangeJoin: ', ',
      range: '{first} से {last}',
    },
    results: {
      heading: 'जवाब',
      years: { one: '1 साल', few: '{n} साल', other: '{n} साल' },
      buy: 'अगर महँगाई औसतन {rate} सालाना रहे, तो {years} बाद {amount} से उतना ही ख़रीदा जा सकता है जितना आज {result} से।',
      cost: 'अगर कीमतें औसतन {rate} सालाना बढ़ें, तो जो चीज़ आज {amount} की है, वह {years} बाद {result} की हो सकती है।',
      past: 'अगर महँगाई औसतन {rate} सालाना रही, तो {years} पहले के {amount} से उतना ख़रीदा जा सकता था जितना आज {result} से।',
      pastCountry: '{country} में {from} के {amount} से उतना ख़रीदा जा सकता था जितना {to} में {result} से।',
      pastCountryRise: 'इन {years} में कीमतें कुल मिलाकर लगभग {total} बढ़ीं, यानी औसतन {average} सालाना।',
      keepMore: '{growth} सालाना वेतन वृद्धि या रिटर्न और औसतन {rate} महँगाई पर, क्रय शक्ति हर साल लगभग {real} बढ़ती है।',
      keepLess: '{growth} सालाना वेतन वृद्धि या रिटर्न और औसतन {rate} महँगाई पर, क्रय शक्ति हर साल लगभग {real} घटती है।',
      keepSame: '{growth} सालाना वेतन वृद्धि या रिटर्न और औसतन {rate} महँगाई पर, क्रय शक्ति लगभग वैसी ही रहती है।',
      keepAfter: '{years} बाद, {growth} सालाना बढ़ते {amount} से उतना ख़रीदा जा सकता है जितना आज {result} से।',
      keepExact:
        'सटीक हिसाब: (1 + {growth}) ÷ (1 + {rate}) − 1। एक दर में से दूसरी घटाना ({shortcut}) एक आम छोटा तरीक़ा है, जो कम दरों पर क़रीब रहता है और ऊँची दरों पर बहुत दूर।',
      keepHeadline: '{real} सालाना',
      about: 'लगभग {amount}',
      moreThan: '{amount} से ज़्यादा रकम',
      lessThan: '{amount} से कम रकम',
      bandLabel: 'एक अंक कम और ज़्यादा पर:',
      bandItem: '{rate} पर: {result}',
      bandKeep: '{rate} महँगाई पर: {real} सालाना',
      method: 'साल में एक बार चक्रवृद्धि, हर साल एक ही दर पर। यह एक परिदृश्य है, पूर्वानुमान नहीं।',
      methodHistory: 'हर साल के दर्ज आँकड़े के साथ साल-दर-साल चक्रवृद्धि। यह इतिहास है, पूर्वानुमान नहीं।',
      fix: 'जवाब देखने के लिए चिह्नित खाने ठीक करें।',
      stale: 'यह जवाब पुराना है: इसे अपडेट करने के लिए चिह्नित खाने ठीक करें।',
      announce: 'नया जवाब: {headline}। {sentence}',
    },
    chart: {
      title: {
        buy: '{amount} से हर साल कितना ख़रीदा जा सकता है, आज के पैसे में',
        cost: '{amount} हर साल कितना हो जाता है',
        past: '{amount} उसके बाद हर साल कितने के बराबर है',
        keep: '{amount} से हर साल कितना ख़रीदा जा सकता है, आज के पैसे में',
      },
      axis: {
        buy: 'अब से साल',
        cost: 'अब से साल',
        past: 'तब से साल',
        keep: 'अब से साल',
        pastCountry: 'साल',
      },
      desc: 'लाइन चार्ट। {start} ({from}) से शुरू होकर {end} ({to}) पर ख़त्म होता है।',
      yearsFrom: 'साल {n}',
      tooLarge: 'इस दर पर रकम इतनी बड़ी हो जाती है कि चार्ट में नहीं बन सकती।',
    },
    actions: {
      copy: 'इस हिसाब का लिंक कॉपी करें',
      copied: 'लिंक कॉपी हो गया',
      copyPrompt: 'यह लिंक कॉपी करें:',
      reset: 'रीसेट करें',
    },
  },
};

/**
 * The Spanish edition. Neutral international Spanish, tú, angle quotes, per
 * `docs/i18n/es-glossary.md`: inflación, poder adquisitivo, rentabilidad real.
 * Added for this tool: calculadora de inflación, subida salarial, tasa real,
 * media geométrica, punto porcentual, escenario and previsión, and «conjunto de
 * bienes y servicios» for the basket, where *cesta* and *canasta* each lean to
 * one side of the Atlantic.
 */
export const inflationEs: typeof inflationEn = {
  meta: {
    title: 'Calculadora de inflación: qué compra tu dinero | nidhi',
    description:
      'Calculadora de inflación gratuita: qué compra tu dinero tras años de inflación, cuánto podría costar algo después y la historia por país. En tu navegador.',
  },
  schema: {
    name: 'Calculadora de inflación de nidhi',
    alternateNames: ['Calculadora de poder adquisitivo de nidhi', 'Calculadora de rentabilidad real de nidhi'],
    operatingSystem: 'Cualquiera (navegador web)',
    browserRequirements: 'Requiere JavaScript. Navegador moderno.',
    featureList: [
      'Qué compra una cantidad tras años de inflación, en dinero de hoy',
      'Cuánto cuesta algo tras años de inflación',
      'Cuánto vale hoy una cantidad del pasado, a la tasa que elijas o con la inflación anual real de un país',
      'Si una subida salarial o la rentabilidad de tus ahorros siguen el ritmo de la inflación, con la tasa real exacta',
      'Cada resultado, también un punto porcentual por debajo y por encima',
      'Historia de la inflación anual de {countries} países y la zona del euro, del Banco Mundial',
      'Tasas de {minRate} a {maxRate} % anual, para poder mostrar la hiperinflación',
      'Resultados en 38 monedas',
      'Enlace para compartir cualquier cálculo',
    ],
  },
  page: {
    plannerLine:
      'El planificador de nidhi proyecta tu situación completa hacia adelante con sus supuestos a la vista, inflación incluida, en una moneda o en varias.',
    breadcrumb: {
      home: 'Inicio',
      freeTools: 'Herramientas gratuitas',
      this: 'Calculadora de inflación',
    },
    eyebrow: 'Herramientas gratuitas',
    title: 'Calculadora de inflación: qué compra el dinero con el tiempo',
    lead: {
      before: 'Mira qué le hace la inflación a una cantidad con los años',
      wide: ', hacia el futuro o hacia el pasado, a la tasa que elijas o con la historia real de un país. Cada respuesta llega con el mismo cálculo un punto por debajo y por encima, porque es un escenario, no una previsión',
      after: '. Todo se ejecuta en tu navegador; nada de lo que escribes se envía a ninguna parte.',
    },
    notes: {
      heading: 'Cómo leer la respuesta',
      items: {
        steady: {
          lead: 'Una tasa, cada año.',
          rest: ' La herramienta aplica la tasa que escribes una vez al año, la misma cada año. Los precios reales suben de forma desigual: algunos años se disparan, unos pocos bajan, y la media de una década oculta ambas cosas.',
        },
        personal: {
          lead: 'La inflación nacional es una media.',
          rest: ' Se mide sobre un conjunto de bienes y servicios que una oficina de estadística elige para representar a un hogar típico. Si tu alquiler, la matrícula escolar o las medicinas suben más rápido que ese conjunto, tu propia inflación es mayor; si la mayor parte de tu gasto fue a cosas que se abarataron, es menor.',
        },
        history: {
          lead: 'La historia no es una previsión.',
          rest: ' Los últimos diez años de un país dicen poco de los diez siguientes. La inflación ha cambiado bruscamente en pocos años muchas veces, en ambos sentidos.',
        },
      },
      lesson: {
        before: 'La idea detrás de esta herramienta, con ejemplos: ',
        after: ' (la lección está en inglés).',
      },
    },
    source: {
      heading: 'De dónde sale la historia',
      before: 'Inflación anual de los precios al consumidor por país, del ',
      link: 'Banco Mundial',
      after:
        ' (indicador FP.CPI.TOTL.ZG, «Inflation, consumer prices (annual %)»), con licencia CC BY 4.0. El Banco Mundial actualizó estas cifras por última vez el {updated}. nidhi guarda una copia y busca cifras nuevas cada mes, así que tu navegador carga la historia desde nidhi.today y nunca contacta con el Banco Mundial. La cifra de la zona del euro corresponde a la zona del euro en su conjunto. Las cifras pueden revisarse, y algunos países tienen años sin cifra o un registro que empieza tarde.',
    },
    faq: {
      heading: 'Preguntas frecuentes',
      items: [
        {
          q: '¿Qué significa la respuesta?',
          a: 'Calcula un escenario: si los precios suben a la tasa que escribiste, cada año, durante los años que elegiste, ¿a qué equivale una cantidad? «Poder de compra futuro» muestra lo que una cantidad podría comprar en el futuro, en dinero de hoy. «Costo futuro» lleva un precio hacia el futuro. «Del pasado a hoy» trae una cantidad antigua al presente. «¿Sigue el ritmo?» compara una subida salarial o la rentabilidad de tus ahorros con la inflación. Las respuestas se redondean y dicen «unos», porque la tasa es un supuesto, no una medición.',
        },
        {
          q: '¿Por qué cada respuesta viene con dos más?',
          a: 'Nadie sabe cuál será la inflación media de los próximos diez años. La línea bajo cada respuesta repite el cálculo un punto porcentual por debajo y otro por encima (nunca por debajo del 0 %), para que veas cuánto depende la respuesta de la tasa. En periodos largos, un solo punto marca una gran diferencia, y por eso una cifra sola puede parecer más segura de lo que es.',
        },
        {
          q: '¿La inflación nacional es la misma que la mía?',
          a: 'No necesariamente. La inflación nacional mide el precio de un conjunto de bienes y servicios elegido para representar a un hogar típico. Tu gasto es distinto: si alquilas o tienes vivienda propia, dónde vives, tu edad, si pagas matrículas o cuidados. Muchas oficinas de estadística publican la inflación por categorías (alimentación, vivienda, transporte, salud), lo que puede mostrar si tus mayores gastos han subido más o menos que la cifra general. Hay quien prueba una tasa uno o dos puntos por encima o por debajo de la nacional para ver cuánto importa.',
        },
        {
          q: '¿De dónde sale la historia y cuán reciente es?',
          a: 'De los Indicadores del Desarrollo Mundial del Banco Mundial: «Inflation, consumer prices (annual %)» (indicador FP.CPI.TOTL.ZG), con licencia CC BY 4.0, que reúne las cifras que publican las oficinas nacionales de estadística y el FMI. El Banco Mundial las actualizó por última vez el {updated}; nidhi busca cifras nuevas cada mes. Para la mayoría de los países, el último año es el último año natural completo; algunos van con retraso y unos pocos tienen años sin cifra. La herramienta muestra la cobertura de cada país y nunca rellena un hueco con una suposición: «Del pasado a hoy» solo empieza en años con un registro sin interrupciones hasta el último año.',
        },
        {
          q: '¿Por qué la tasa puede llegar al {maxRate} %?',
          a: 'Porque ha ocurrido. La hiperinflación, que suele definirse como precios que suben más de un 50 % al mes, ha golpeado a varios países en las últimas décadas, y tasas anuales de miles por ciento aparecen en los propios datos del Banco Mundial. Una herramienta limitada al 20 % no podría mostrar lo que esos años hicieron con los ahorros. A esas tasas, las respuestas se vuelven tan grandes o tan pequeñas que la herramienta dice «más de» o «menos de» en lugar de escribir cada cifra.',
        },
        {
          q: '¿Por qué la tasa real no es simplemente la subida menos la inflación?',
          a: 'Porque las dos se capitalizan. El poder adquisitivo crece (1 + subida) ÷ (1 + inflación), menos uno. Con una subida del 5 % y una inflación del 3 %, eso es alrededor del 1,94 % anual, no el 2 %. Con tasas bajas, el atajo de restar se acerca; con inflación alta se aleja mucho: una subida del 110 % con una inflación del 100 % deja un 5 % más de poder adquisitivo, no un 10 %.',
        },
        {
          q: '¿Se envían mis datos a algún sitio?',
          a: 'No. Los cálculos se hacen en tu navegador, y las cantidades, tasas y años que escribes no se nos envían ni a nosotros ni a nadie más. Elegir un país carga su historia desde nidhi.today, este mismo sitio, nunca desde el Banco Mundial. Mientras usas la herramienta, no se escribe nada en la dirección de la página. Cuando pulsas «{copyLink}», tus valores van en el enlace después del signo #, una parte de la dirección que los navegadores nunca envían a un servidor, y la página los quita de la barra de direcciones antes de que se inicie la analítica. La analítica registra qué pregunta, qué moneda y qué país eliges, nunca las cifras.',
        },
        {
          q: '¿Esto es asesoramiento financiero?',
          a: 'No. Muestra lo que una tasa que tú eliges le hace a una cantidad con el tiempo. No puede decirte cuál será la inflación ni qué hacer con tu dinero.',
        },
      ],
    },
    related: {
      heading: 'Para seguir leyendo',
      cards: {
        'purchasing-power': {
          kicker: 'La idea detrás de esta herramienta',
          title: 'Poder adquisitivo',
          desc: 'Por qué el mismo dinero compra menos cuando suben los precios, y cómo calcular una rentabilidad real.',
        },
        'saving-vs-investing': {
          kicker: 'Siguiente paso',
          title: 'Ahorrar o invertir',
          desc: 'Dónde encaja el efectivo, dónde la inversión, y qué les hace la inflación a cada uno.',
        },
        'why-your-euro-buys-more-in-some-countries': {
          kicker: 'Más allá de las fronteras',
          title: 'Qué compra tu dinero en otro país',
          desc: 'Tipos de cambio frente a poder adquisitivo: por qué la misma cantidad compra más en algunos países.',
        },
      },
    },
  },
  island: {
    currencies: currenciesEs,
    formLabel: 'Calculadora de inflación',
    export: {
      meaning: 'La inflación es la subida de los precios con el tiempo. Salvo que se haya usado la inflación real de un país, las cifras suponen la misma tasa cada año; la inflación real cambia de un año a otro, y los precios que pagas pueden subir más rápido o más despacio que la media.',
      moneyLabel: 'Importes',
      moneyText: 'Hasta la unidad más pequeña de la moneda. La página redondea su titular; estas son las cifras exactas que hay detrás.',
      sheets: { answer: 'Respuesta', byYear: 'Por año' },
      question: 'Pregunta',
      country: 'Historia de la inflación',
      result: 'Resultado',
      realRate: 'Poder adquisitivo, % al año',
      inWords: 'En palabras',
      years: 'Años usados',
      source: 'Fuente',
      sourceText: 'Banco Mundial, indicador FP.CPI.TOTL.ZG, «Inflation, consumer prices (annual %)», CC BY 4.0.',
    },
    tabsLabel: 'Elige una pregunta',
    tabs: {
      buy: 'Poder de compra futuro',
      cost: 'Costo futuro',
      past: 'Del pasado a hoy',
      keep: '¿Sigue el ritmo?',
    },
    questions: {
      buy: '¿Qué podría comprar una cantidad tras unos años de inflación, en dinero de hoy?',
      cost: '¿Cuánto podría costar más adelante algo que hoy cuesta esto, si los precios siguen subiendo?',
      past: '¿Cuánto vale hoy una cantidad del pasado, a la tasa que elijas?',
      pastCountry: '¿Cuánto vale hoy en {country} una cantidad del pasado, con su inflación anual real?',
      keep: '¿Sigue el ritmo de la inflación una subida salarial o la rentabilidad de tus ahorros?',
    },
    fields: {
      currency: 'Moneda',
      amount: {
        buy: 'Cantidad',
        cost: 'Lo que cuesta hoy',
        past: 'Cantidad de entonces',
        keep: 'Cantidad hoy',
      },
      amountError: 'Escribe una cantidad de 0 a {max}.',
      rate: 'Inflación, % anual',
      rateHint: 'De {min} a {max}, con dos decimales como máximo',
      rateError: 'Escribe una tasa de {min} a {max}, con dos decimales como máximo.',
      years: {
        buy: 'Años a partir de hoy',
        cost: 'Años a partir de hoy',
        past: 'Hace cuántos años',
        keep: 'Años',
      },
      yearsHint: 'De {min} a {max}',
      yearsError: 'Escribe un número entero de años de {min} a {max}.',
      growth: 'Subida o rentabilidad, % anual',
      growthHint: 'Puede ser negativa, por una bajada de sueldo o una pérdida',
      growthError: 'Escribe una tasa de {min} a {max}, con dos decimales como máximo.',
      from: 'Año de partida',
      fromHint: 'Hasta {last}, el último año con cifra.',
    },
    history: {
      label: 'Historia de la inflación, como contexto',
      hint: 'Opcional. Muestra la inflación pasada de un país; la respuesta solo la usa en «Del pasado a hoy» o si usas su media.',
      none: 'Ningún país',
      euroArea: 'Zona del euro',
      loading: 'Cargando la historia…',
      error: 'No se pudo cargar la historia. La calculadora sigue funcionando con la tasa que escribas.',
      chartLabel: 'Inflación anual en {country}, de {first} a {last}. La más alta, {high} en {highYear}; la más baja, {low} en {lowYear}.',
      average: '{country}, de {first} a {last}: unos {average} anuales de media.',
      averageGaps: '{country}, los {count} años más recientes con cifra (de {first} a {last}): unos {average} anuales de media.',
      averageNote:
        'Una media geométrica: la tasa constante que habría tenido el mismo efecto total. Es historia, no una previsión.',
      coverage: 'Las cifras van de {first} a {last}.',
      gaps: 'Sin cifra para {years}.',
      gapStart: '«Del pasado a hoy» no empieza antes de {start}, para no saltarse ningún año.',
      use: 'Usar esta media como tasa',
      useOutside: 'Esta media queda fuera del rango de {min} a {max} % que acepta la casilla de la tasa, así que no puede usarse como tasa.',
      currencyOther:
        'Las cantidades siguen en {currency}: la moneda de {country} no está entre las de esta herramienta. La historia es un porcentaje, así que se lee igual en cualquier moneda.',
      capped: 'Las barras por encima de {cap} aparecen cortadas arriba.',
      legendRecent: 'Años de la media',
      legendOlder: 'Años anteriores',
      tableSummary: 'Mostrar las cifras anuales',
      tableCaption: 'Inflación anual en {country}',
      tableYear: 'Año',
      tableRate: 'Inflación',
      tableNone: 'Sin cifra',
      rangeJoin: ', ',
      range: 'de {first} a {last}',
    },
    results: {
      heading: 'La respuesta',
      years: { one: '1 año', few: '{n} años', other: '{n} años' },
      buy: 'Si la inflación media fuera del {rate} anual, {amount} dentro de {years} comprarían lo que hoy compran {result}.',
      cost: 'Si los precios subieran de media un {rate} anual, algo que hoy cuesta {amount} costaría {result} dentro de {years}.',
      past: 'Si la inflación media fue del {rate} anual, {amount} de hace {years} compran lo que hoy compran {result}.',
      pastCountry: 'En {country}, {amount} en {from} compraban lo que en {to} compraban {result}.',
      pastCountryRise: 'Los precios subieron un {total} en total en esos {years}, una media del {average} anual.',
      keepMore: 'Con una subida o rentabilidad del {growth} anual y una inflación media del {rate}, el poder adquisitivo crece alrededor de un {real} al año.',
      keepLess: 'Con una subida o rentabilidad del {growth} anual y una inflación media del {rate}, el poder adquisitivo se reduce alrededor de un {real} al año.',
      keepSame: 'Con una subida o rentabilidad del {growth} anual y una inflación media del {rate}, el poder adquisitivo se mantiene más o menos igual.',
      keepAfter: 'Dentro de {years}, {amount} que crecen un {growth} anual comprarían lo que hoy compran {result}.',
      keepExact:
        'Cálculo exacto: (1 + {growth}) ÷ (1 + {rate}) − 1. Restar una tasa de la otra ({shortcut}) es un atajo habitual, que se acerca con tasas bajas y se aleja mucho con tasas altas.',
      keepHeadline: '{real} al año',
      about: 'unos {amount}',
      moreThan: 'más de {amount}',
      lessThan: 'menos de {amount}',
      bandLabel: 'Un punto por debajo y por encima:',
      bandItem: 'Al {rate}: {result}',
      bandKeep: 'Con inflación del {rate}: {real} al año',
      method: 'Capitalización una vez al año, a la misma tasa cada año. Un escenario, no una previsión.',
      methodHistory: 'Capitalización año a año con la cifra real de cada año. Historia, no una previsión.',
      fix: 'Corrige los campos marcados para ver la respuesta.',
      stale: 'Esta respuesta está desactualizada: corrige los campos marcados para actualizarla.',
      announce: 'Respuesta actualizada: {headline}. {sentence}',
    },
    chart: {
      title: {
        buy: 'Lo que compran {amount} cada año, en dinero de hoy',
        cost: 'En qué se convierten {amount} cada año',
        past: 'Lo que valen {amount} cada año desde entonces',
        keep: 'Lo que compran {amount} cada año, en dinero de hoy',
      },
      axis: {
        buy: 'Años a partir de hoy',
        cost: 'Años a partir de hoy',
        past: 'Años desde entonces',
        keep: 'Años a partir de hoy',
        pastCountry: 'Año',
      },
      desc: 'Gráfico de líneas. Empieza en {start} ({from}) y termina en {end} ({to}).',
      yearsFrom: 'año {n}',
      tooLarge: 'A esta tasa, las cantidades crecen demasiado para dibujarlas.',
    },
    actions: {
      copy: 'Copiar un enlace a este cálculo',
      copied: 'Enlace copiado',
      copyPrompt: 'Copia este enlace:',
      reset: 'Restablecer',
    },
  },
};

/**
 * The Czech edition. Vykání, „...“ quotes, per `docs/i18n/cs-glossary.md`:
 * inflace, kupní síla, reálný výnos, zhruba for an approximate figure. Added
 * for this tool: inflační kalkulačka, zvýšení platu, reálná sazba, geometrický
 * průměr, procentní bod, scénář and prognóza, and spotřební koš for the basket,
 * the Czech Statistical Office's own term.
 *
 * `results.years` is in the accusative (1 rok, 3 roky, 5 let), and every
 * sentence that takes it is built around a preposition that wants that case
 * (*za*, *o ... dříve*), so the three forms fit each one.
 */
export const inflationCs: typeof inflationEn = {
  meta: {
    title: 'Inflační kalkulačka: co si za peníze koupíte později | nidhi',
    description:
      'Inflační kalkulačka zdarma: co si za peníze koupíte po letech inflace, kolik může něco stát později a historie podle zemí. Běží ve vašem prohlížeči.',
  },
  schema: {
    name: 'Inflační kalkulačka nidhi',
    alternateNames: ['Kalkulačka kupní síly nidhi', 'Kalkulačka reálného výnosu nidhi'],
    operatingSystem: 'Libovolný operační systém (webový prohlížeč)',
    browserRequirements: 'Vyžaduje JavaScript. Moderní prohlížeč.',
    featureList: [
      'Co si za částku koupíte po letech inflace, v dnešních penězích',
      'Kolik bude cena stát po letech inflace',
      'Jakou hodnotu má dnes částka z minulosti při vámi zvolené sazbě nebo při skutečné roční inflaci dané země',
      'Zda zvýšení platu nebo výnos z úspor drží krok s inflací, s přesnou reálnou sazbou',
      'Každý výsledek je uveden také pro sazbu o jeden procentní bod nižší a vyšší',
      'Roční historie inflace pro každou zahrnutou zemi a eurozónu, od Světové banky; počet zemí: {countries}',
      'Sazby od {minRate} do {maxRate} % ročně, aby šla ukázat i hyperinflace',
      'Výsledky v 38 měnách',
      'Odkaz ke sdílení libovolného výpočtu',
    ],
  },
  page: {
    plannerLine:
      'Plánovač nidhi promítá celý obraz vašich financí do budoucna s předpoklady na obrazovce, včetně inflace, v jedné měně i ve více měnách.',
    breadcrumb: {
      home: 'Domů',
      freeTools: 'Nástroje zdarma',
      this: 'Inflační kalkulačka',
    },
    eyebrow: 'Nástroje zdarma',
    title: 'Inflační kalkulačka: co si za peníze koupíte v průběhu času',
    lead: {
      before: 'Podívejte se, co inflace s částkou udělá v průběhu let',
      wide: ', dopředu i dozadu, při vámi zvolené sazbě nebo podle skutečné historie dané země. Každá odpověď obsahuje také výpočet se sazbou o bod nižší a vyšší, protože jde o scénář, ne o prognózu',
      after: '. Vše běží ve vašem prohlížeči; nic, co zadáte, se nikam neposílá.',
    },
    notes: {
      heading: 'Jak číst odpověď',
      items: {
        steady: {
          lead: 'Jedna sazba, každý rok.',
          rest: ' Nástroj uplatní zadanou sazbu jednou ročně, každý rok stejnou. Skutečné ceny rostou nerovnoměrně: některé roky vyskočí, pár jich klesne a průměr za desetiletí obojí skryje.',
        },
        personal: {
          lead: 'Celostátní inflace je průměr.',
          rest: ' Měří se na spotřebním koši zboží a služeb, který statistický úřad sestavuje tak, aby představoval typickou domácnost. Pokud vaše nájemné, školné nebo léky zdražují rychleji než tento koš, je vaše vlastní inflace vyšší; pokud většina vašich výdajů šla na věci, které zlevnily, je nižší.',
        },
        history: {
          lead: 'Historie není prognóza.',
          rest: ' Posledních deset let dané země o příštích deseti letech mnoho neříká. Inflace se už mnohokrát během pár let prudce změnila, oběma směry.',
        },
      },
      lesson: {
        before: 'Princip tohoto nástroje s propočítanými příklady: ',
        after: '.',
      },
    },
    source: {
      heading: 'Odkud historie pochází',
      before: 'Roční inflace spotřebitelských cen podle zemí, od ',
      link: 'Světové banky',
      after:
        ' (ukazatel FP.CPI.TOTL.ZG, „Inflation, consumer prices (annual %)“), s licencí CC BY 4.0. Světová banka tato čísla naposledy aktualizovala {updated}. nidhi uchovává jejich kopii a každý měsíc kontroluje nová čísla, takže váš prohlížeč načítá historii z nidhi.today a nikdy nekontaktuje Světovou banku. Číslo za eurozónu platí pro eurozónu jako celek. Čísla mohou být revidována a u několika zemí chybějí některé roky nebo záznam začíná pozdě.',
    },
    faq: {
      heading: 'Časté dotazy',
      items: [
        {
          q: 'Co odpověď znamená?',
          a: 'Počítá jeden scénář: pokud ceny rostou zadanou sazbou, každý rok, po zvolený počet let, čemu částka odpovídá? „Kupní síla později“ ukazuje, co by si za částku šlo koupit v budoucnu, v dnešních penězích. „Cena později“ posouvá cenu dopředu. „Z minulosti do dneška“ převádí starou částku na dnešní hodnotu. „Drží krok?“ porovnává zvýšení platu nebo výnos z úspor s inflací. Odpovědi jsou zaokrouhlené a říkají „zhruba“, protože sazba je předpoklad, ne měření.',
        },
        {
          q: 'Proč ke každé odpovědi patří další dvě?',
          a: 'Nikdo neví, jaká bude průměrná inflace v příštích deseti letech. Řádek pod každou odpovědí zopakuje výpočet o jeden procentní bod níž a o jeden výš (nikdy pod 0 %), takže je vidět, jak moc odpověď na sazbě závisí. Za dlouhá období dělá jediný bod velký rozdíl, a proto může jedno číslo samo o sobě působit jistěji, než je.',
        },
        {
          q: 'Je celostátní inflace totéž co moje inflace?',
          a: 'Ne nutně. Celostátní inflace měří cenu spotřebního koše zboží a služeb, který má představovat typickou domácnost. Vaše vlastní výdaje se liší: zda bydlíte v nájmu, nebo ve vlastním, kde žijete, váš věk, zda platíte školné nebo náklady na péči. Mnoho statistických úřadů zveřejňuje inflaci podle kategorií (potraviny, bydlení, doprava, zdraví), z čehož lze vyčíst, zda vaše největší výdaje rostly rychleji, nebo pomaleji než celkový údaj. Někteří lidé zkoušejí sazbu o jeden nebo dva body nad celostátní sazbou nebo pod ní, aby viděli, kolik to dělá.',
        },
        {
          q: 'Odkud historie pochází a jak je aktuální?',
          a: 'Z ukazatelů světového rozvoje Světové banky (World Development Indicators): „Inflation, consumer prices (annual %)“ (ukazatel FP.CPI.TOTL.ZG), s licencí CC BY 4.0, které shromažďují čísla zveřejněná národními statistickými úřady a MMF. Světová banka je naposledy aktualizovala {updated}; nidhi každý měsíc kontroluje nová čísla. U většiny zemí je posledním rokem poslední celý kalendářní rok, některé se zpožďují a u několika chybějí některé roky. Nástroj u každé země ukazuje pokrytí a mezeru nikdy nevyplní odhadem: „Z minulosti do dneška“ začíná jen od let s nepřerušeným záznamem až do posledního roku.',
        },
        {
          q: 'Proč může sazba jít až do {maxRate} %?',
          a: 'Protože se to stalo. Hyperinflace, často definovaná jako růst cen o více než 50 % měsíčně, za života dnešních lidí zasáhla několik zemí a roční sazby v tisících procent se objevují i v datech samotné Světové banky. Nástroj omezený na 20 % by nedokázal ukázat, co takové roky udělaly s úsporami. Při takových sazbách jsou odpovědi tak velké nebo tak malé, že nástroj místo vypsání všech číslic řekne „více než“ nebo „méně než“.',
        },
        {
          q: 'Proč reálná sazba není jen míra zvýšení minus míra inflace?',
          a: 'Protože obě sazby působí složeně. Kupní síla roste v poměru (1 + zvýšení) ÷ (1 + inflace), minus jedna. Při zvýšení o 5 % a inflaci 3 % je to zhruba 1,94 % ročně, ne 2 %. Při nízkých sazbách dává prosté odečtení podobný výsledek, při vysoké inflaci se však výrazně rozchází: zvýšení o 110 % při inflaci 100 % přinese o 5 % víc kupní síly, ne o 10 %.',
        },
        {
          q: 'Posílají se moje data někam?',
          a: 'Ne. Výpočty běží ve vašem prohlížeči a částky, sazby a roky, které zadáte, se neposílají nám ani nikomu jinému. Výběr země načte její historii z nidhi.today, tohoto webu, nikdy ze Světové banky. Při používání nástroje se do adresy stránky nic nezapisuje. Když stisknete „{copyLink}“, vaše hodnoty se vloží do odkazu za znak #, do části adresy, kterou prohlížeče nikdy neposílají na server, a stránka je odstraní z adresního řádku dřív, než se spustí analytika. Analytika zaznamenává, kterou otázku, měnu a zemi vyberete, nikdy čísla.',
        },
        {
          q: 'Je to finanční poradenství?',
          a: 'Ne. Ukazuje, co zvolená sazba udělá s částkou v průběhu času. Nedokáže říct, jaká inflace bude, ani co s penězi dělat.',
        },
      ],
    },
    related: {
      heading: 'Čtěte dál',
      cards: {
        'purchasing-power': {
          kicker: 'Princip tohoto nástroje',
          title: 'Kupní síla',
          desc: 'Proč si za stejné peníze koupíte méně, když ceny rostou, a jak spočítat reálný výnos.',
        },
        'saving-vs-investing': {
          kicker: 'Další krok',
          title: 'Spoření versus investování',
          desc: 'Kam patří hotovost, kam investování a co s obojím dělá inflace.',
        },
        'why-your-euro-buys-more-in-some-countries': {
          kicker: 'Přes hranice',
          title: 'Co si za peníze koupíte v zahraničí',
          desc: 'Směnné kurzy a kupní síla: proč si za stejnou částku v některých zemích koupíte víc.',
        },
      },
    },
  },
  island: {
    currencies: currenciesCs,
    formLabel: 'Inflační kalkulačka',
    export: {
      meaning: 'Inflace je růst cen v průběhu času. Pokud nebyla použita skutečná inflace dané země, výpočet vychází ze stejné sazby v každém roce; skutečná inflace se rok od roku mění a ceny, které platíte, mohou růst rychleji i pomaleji než průměr.',
      moneyLabel: 'Částky',
      moneyText: 'Na nejmenší jednotku měny. Stránka hlavní odpověď zaokrouhluje; tady jsou přesná čísla, ze kterých vychází.',
      sheets: { answer: 'Odpověď', byYear: 'Po letech' },
      question: 'Otázka',
      country: 'Historie inflace',
      result: 'Výsledek',
      realRate: 'Kupní síla, % ročně',
      inWords: 'Slovy',
      years: 'Použité roky',
      source: 'Zdroj',
      sourceText: 'Světová banka, ukazatel FP.CPI.TOTL.ZG, „Inflation, consumer prices (annual %)“, CC BY 4.0.',
    },
    tabsLabel: 'Vyberte otázku',
    tabs: {
      buy: 'Kupní síla později',
      cost: 'Cena později',
      past: 'Z minulosti do dneška',
      keep: 'Drží krok?',
    },
    questions: {
      buy: 'Co by si za částku šlo koupit po několika letech inflace, v dnešních penězích?',
      cost: 'Kolik by mohlo později stát něco, co dnes stojí tolik, pokud ceny porostou dál?',
      past: 'Jakou hodnotu má dnes částka z minulosti při vámi zvolené sazbě?',
      pastCountry: 'Jakou hodnotu má dnes částka z minulosti v zemi {country} podle její skutečné roční inflace?',
      keep: 'Drží zvýšení platu nebo výnos z úspor krok s inflací?',
    },
    fields: {
      currency: 'Měna',
      amount: {
        buy: 'Částka',
        cost: 'Kolik to stojí dnes',
        past: 'Částka tehdy',
        keep: 'Částka dnes',
      },
      amountError: 'Zadejte částku od 0 do {max}.',
      rate: 'Inflace, % ročně',
      rateHint: '{min} až {max}, nejvýše dvě desetinná místa',
      rateError: 'Zadejte sazbu od {min} do {max}, nejvýše se dvěma desetinnými místy.',
      years: {
        buy: 'Počet let od dneška',
        cost: 'Počet let od dneška',
        past: 'Před kolika lety',
        keep: 'Počet let',
      },
      yearsHint: '{min} až {max}',
      yearsError: 'Zadejte celý počet let od {min} do {max}.',
      growth: 'Zvýšení nebo výnos, % ročně',
      growthHint: 'Může být záporné, při snížení platu nebo ztrátě',
      growthError: 'Zadejte sazbu od {min} do {max}, nejvýše se dvěma desetinnými místy.',
      from: 'Počáteční rok',
      fromHint: 'Nejvýše {last}, poslední rok s číslem.',
    },
    history: {
      label: 'Historie inflace, pro souvislosti',
      hint: 'Volitelné. Ukazuje minulou inflaci dané země; odpověď ji používá jen v záložce „Z minulosti do dneška“, nebo pokud použijete její průměr.',
      none: 'Žádná země',
      euroArea: 'Eurozóna',
      loading: 'Načítání historie…',
      error: 'Historii se nepodařilo načíst. Kalkulačka dál funguje se zadanou sazbou.',
      chartLabel: 'Roční inflace, {country}, {first} až {last}. Nejvyšší {high} v roce {highYear}, nejnižší {low} v roce {lowYear}.',
      average: '{country}, {first} až {last}: v průměru zhruba {average} ročně.',
      averageGaps: '{country}, nejnovější roky s dostupným číslem (počet: {count}, období: {first} až {last}): v průměru zhruba {average} ročně.',
      averageNote:
        'Geometrický průměr: stálá sazba, která by měla stejný celkový účinek. Je to historie, ne předpověď.',
      coverage: 'Čísla pokrývají roky {first} až {last}.',
      gaps: 'Bez čísla: {years}.',
      gapStart: '„Z minulosti do dneška“ nezačíná dřív než v roce {start}, aby se žádný rok nepřeskočil.',
      use: 'Použít tento průměr jako sazbu',
      useOutside: 'Tento průměr je mimo rozsah {min} až {max} %, který pole sazby přijímá, takže ho nelze použít jako sazbu.',
      currencyOther:
        'Částky zůstávají v měně {currency}: vlastní měna země {country} mezi měnami tohoto nástroje není. Historie je vyjádřena v procentech, takže nezávisí na zvolené měně.',
      capped: 'Sloupce nad {cap} jsou nahoře oříznuté.',
      legendRecent: 'Roky v průměru',
      legendOlder: 'Dřívější roky',
      tableSummary: 'Zobrazit roční čísla',
      tableCaption: 'Roční inflace, {country}',
      tableYear: 'Rok',
      tableRate: 'Inflace',
      tableNone: 'Bez čísla',
      rangeJoin: ', ',
      range: '{first} až {last}',
    },
    results: {
      heading: 'Odpověď',
      years: { one: '1 rok', few: '{n} roky', other: '{n} let' },
      buy: 'Pokud bude inflace v průměru {rate} ročně, bude mít {amount} za {years} stejnou kupní sílu jako dnes {result}.',
      cost: 'Pokud budou ceny růst v průměru o {rate} ročně, bude něco, co dnes stojí {amount}, za {years} stát {result}.',
      past: 'Pokud byla inflace v průměru {rate} ročně, odpovídá {amount} z doby o {years} dříve dnešní částce {result}.',
      pastCountry: 'V zemi {country} měla částka {amount} v roce {from} stejnou kupní sílu jako {result} v roce {to}.',
      pastCountryRise: 'Za {years} vzrostly ceny celkem zhruba o {total}, v průměru o {average} ročně.',
      keepMore: 'Při roční míře zvýšení platu nebo výnosu z úspor {growth} a průměrné inflaci {rate} roste kupní síla zhruba o {real} ročně.',
      keepLess: 'Při roční míře zvýšení platu nebo výnosu z úspor {growth} a průměrné inflaci {rate} klesá kupní síla zhruba o {real} ročně.',
      keepSame: 'Při roční míře zvýšení platu nebo výnosu z úspor {growth} a průměrné inflaci {rate} zůstává kupní síla zhruba stejná.',
      keepAfter: 'Za {years} bude mít částka {amount}, která roste o {growth} ročně, stejnou kupní sílu jako dnes {result}.',
      keepExact:
        'Přesný výpočet: (1 + {growth}) ÷ (1 + {rate}) − 1. Odečíst jednu sazbu od druhé ({shortcut}) je běžná zkratka, která je při nízkých sazbách blízko přesnému výsledku, ale při vysokých sazbách se výrazně rozchází.',
      keepHeadline: '{real} ročně',
      about: 'zhruba {amount}',
      moreThan: 'více než {amount}',
      lessThan: 'méně než {amount}',
      bandLabel: 'O bod níž a výš:',
      bandItem: 'Při {rate}: {result}',
      bandKeep: 'Při inflaci {rate}: {real} ročně',
      method: 'Počítáno složeně jednou ročně, každý rok stejnou sazbou. Scénář, ne prognóza.',
      methodHistory: 'Počítáno rok po roku se skutečnou hodnotou za každý rok. Historie, ne prognóza.',
      fix: 'Opravte zvýrazněná pole a uvidíte odpověď.',
      stale: 'Tato odpověď je zastaralá: opravte zvýrazněná pole a odpověď se aktualizuje.',
      announce: 'Aktualizovaná odpověď: {headline}. {sentence}',
    },
    chart: {
      title: {
        buy: 'Co si za {amount} koupíte v každém roce, v dnešních penězích',
        cost: 'Kolik bude z {amount} v každém roce',
        past: 'Jakou hodnotu má {amount} v každém dalším roce',
        keep: 'Co si za {amount} koupíte v každém roce, v dnešních penězích',
      },
      axis: {
        buy: 'Roky od dneška',
        cost: 'Roky od dneška',
        past: 'Roky od té doby',
        keep: 'Roky od dneška',
        pastCountry: 'Rok',
      },
      desc: 'Spojnicový graf. Začíná na {start} ({from}) a končí na {end} ({to}).',
      yearsFrom: 'rok {n}',
      tooLarge: 'Při této sazbě jsou částky příliš velké na vykreslení.',
    },
    actions: {
      copy: 'Kopírovat odkaz na tento výpočet',
      copied: 'Odkaz zkopírován',
      copyPrompt: 'Zkopírujte tento odkaz:',
      reset: 'Obnovit výchozí',
    },
  },
};

/** Marathi. Vocabulary from docs/i18n/mr-glossary.md. */
export const inflationMr: typeof inflationEn = {
  meta: {
    title: 'महागाई कॅल्क्युलेटर (Inflation Calculator): पुढे तुमच्या पैशात काय मिळेल | nidhi',
    description: 'मोफत महागाई कॅल्क्युलेटर: अनेक वर्षांच्या महागाईनंतर पैशात काय मिळते, एखादी किंमत पुढे किती होऊ शकते, आणि देशनिहाय इतिहास. तुमच्या ब्राउझरमध्ये चालतो.',
  },
  schema: {
    name: 'nidhi महागाई कॅल्क्युलेटर',
    alternateNames: [
      'nidhi क्रयशक्ती कॅल्क्युलेटर',
      'nidhi वास्तविक परतावा कॅल्क्युलेटर',
    ],
    operatingSystem: 'कोणतेही (वेब ब्राउझर)',
    browserRequirements: 'JavaScript आवश्यक. आधुनिक ब्राउझर.',
    featureList: [
      'अनेक वर्षांच्या महागाईनंतर एखाद्या रकमेत आजच्या पैशांच्या हिशेबात काय मिळते',
      'अनेक वर्षांच्या महागाईनंतर एखादी किंमत किती होते',
      'भूतकाळातील रकमेचे आजचे मूल्य, तुम्ही निवडलेल्या दराने किंवा देशाच्या प्रत्यक्ष वार्षिक महागाईनुसार',
      'पगारवाढ किंवा बचतीवरील परतावा महागाईच्या बरोबरीने जातो का, नेमक्या वास्तविक दरासह',
      'प्रत्येक निकाल एक टक्के बिंदू कमी आणि जास्त दरानेही दाखवला जातो',
      '{countries} देश आणि युरो क्षेत्र यांचा वार्षिक महागाईचा इतिहास, World Bank कडून',
      'दरवर्षी {minRate} ते {maxRate}% पर्यंतचे दर, म्हणजे अतिमहागाईही दाखवता येते',
      '38 चलनांमध्ये निकाल',
      'कोणत्याही हिशेबाची शेअर करता येणारी लिंक',
    ],
  },
  page: {
    plannerLine:
      'nidhi प्लॅनर तुमचे संपूर्ण आर्थिक चित्र पुढच्या वर्षांपर्यंत मांडून दाखवतो, सगळी गृहीतके पडद्यावर ठेवून, महागाईसह, एका चलनात किंवा अनेक चलनांमध्ये.',
    breadcrumb: {
      home: 'मुख्यपृष्ठ',
      freeTools: 'मोफत साधने',
      this: 'महागाई कॅल्क्युलेटर',
    },
    eyebrow: 'मोफत साधने',
    title: 'महागाई कॅल्क्युलेटर (Inflation Calculator): काळानुसार पैशात काय मिळते',
    lead: {
      before: 'वर्षानुवर्षे महागाई एखाद्या रकमेचे काय करते ते पाहा',
      wide: ', पुढच्या किंवा मागच्या काळासाठी, तुम्ही निवडलेल्या दराने किंवा देशाच्या प्रत्यक्ष इतिहासानुसार. प्रत्येक उत्तरासोबत तोच हिशेब एक बिंदू कमी आणि जास्त दरानेही दिसतो, कारण ते एक परिदृश्य (scenario) आहे, अंदाज नाही',
      after: '. सगळे तुमच्या ब्राउझरमध्ये चालते; तुम्ही लिहिलेले काहीही कुठेही पाठवले जात नाही.',
    },
    notes: {
      heading: 'उत्तर कसे वाचायचे',
      items: {
        steady: {
          lead: 'एकच दर, प्रत्येक वर्षी.',
          rest: ' तुम्ही लिहिलेला दर साधन वर्षातून एकदा, प्रत्येक वर्षी तसाच लावते. प्रत्यक्ष किमती असमानपणे वाढतात: काही वर्षी उसळी घेतात, काही वर्षी घसरतात, आणि दशकाची सरासरी हे दोन्ही लपवते.',
        },
        personal: {
          lead: 'राष्ट्रीय महागाई ही सरासरी असते.',
          rest: ' ती वस्तू व सेवांच्या अशा टोपलीवर मोजली जाते जी सांख्यिकी कार्यालय एका सर्वसाधारण घराचे प्रतिनिधित्व करण्यासाठी निवडते. तुमचे भाडे, शाळेची फी किंवा औषधे त्या टोपलीपेक्षा वेगाने महाग होत असतील, तर तुमची स्वतःची महागाई जास्त आहे; तुमचा बहुतेक खर्च स्वस्त झालेल्या गोष्टींवर होत असेल, तर ती कमी आहे.',
        },
        history: {
          lead: 'इतिहास म्हणजे अंदाज नाही.',
          rest: ' एखाद्या देशाची मागची दहा वर्षे त्याच्या पुढच्या दहा वर्षांबद्दल फारसे काही सांगत नाहीत. काही वर्षांतच महागाई दोन्ही दिशांनी झपाट्याने बदलल्याचे अनेकदा झाले आहे.',
        },
      },
      lesson: {
        before: 'या साधनामागची कल्पना, सोडवलेल्या उदाहरणांसह: ',
        after: '.',
      },
    },
    source: {
      heading: 'इतिहास कुठून येतो',
      before: 'देशनिहाय वार्षिक ग्राहक किंमत महागाई, ',
      link: 'World Bank',
      after: ' कडून (निर्देशक FP.CPI.TOTL.ZG, “Inflation, consumer prices (annual %)”), CC BY 4.0 परवान्याखाली. World Bank ने हे आकडे शेवटचे {updated} रोजी अपडेट केले. nidhi त्यांची प्रत ठेवते आणि दर महिन्याला नवीन आकडे तपासते, त्यामुळे तुमचा ब्राउझर इतिहास nidhi.today वरून घेतो आणि World Bank शी कधीच संपर्क साधत नाही. युरो क्षेत्राचा आकडा संपूर्ण युरो क्षेत्रासाठी आहे. आकडे सुधारले जाऊ शकतात, आणि काही देशांच्या काही वर्षांचा आकडा नसतो किंवा नोंद उशिरा सुरू होते.',
    },
    faq: {
      heading: 'वारंवार विचारले जाणारे प्रश्न',
      items: [
        {
          q: 'उत्तराचा अर्थ काय?',
          a: 'ते एक परिदृश्य मांडते: तुम्ही निवडलेल्या वर्षांसाठी, प्रत्येक वर्षी तुम्ही लिहिलेल्या दराने किमती वाढल्या, तर एखादी रक्कम कशाच्या बरोबरीची होते? “पुढे क्रयशक्ती” भविष्यात एखाद्या रकमेत आजच्या पैशांच्या हिशेबात काय मिळेल ते दाखवते. “पुढे किंमत” एखादी किंमत पुढे नेते. “भूतकाळापासून आजपर्यंत” जुनी रक्कम आजच्या पातळीवर आणते. “महागाईच्या बरोबरीने” पगारवाढ किंवा बचतीवरील परतावा महागाईशी ताडून पाहते. उत्तरे पूर्णांकित असतात आणि “सुमारे” म्हणतात, कारण दर हे गृहीतक आहे, मोजमाप नाही.',
        },
        {
          q: 'प्रत्येक उत्तरासोबत आणखी दोन उत्तरे का येतात?',
          a: 'पुढच्या दहा वर्षांत महागाईची सरासरी किती असेल हे कोणालाच माहीत नसते. प्रत्येक उत्तराखालची ओळ तोच हिशेब एक टक्के बिंदू (percentage point) कमी आणि एक जास्त दराने पुन्हा दाखवते (कधीही 0% च्या खाली नाही), म्हणजे उत्तर दरावर किती अवलंबून आहे हे तुम्हाला दिसते. दीर्घ काळात एक बिंदूही मोठा फरक करतो, म्हणूनच एकटा आकडा प्रत्यक्षापेक्षा जास्त निश्चित वाटू शकतो.',
        },
        {
          q: 'राष्ट्रीय महागाई आणि माझी महागाई एकच असते का?',
          a: 'असेच नाही. राष्ट्रीय महागाई एका सर्वसाधारण घराचे प्रतिनिधित्व करण्यासाठी निवडलेल्या वस्तू व सेवांच्या टोपलीची किंमत मोजते. तुमचा स्वतःचा खर्च वेगळा असतो: तुम्ही भाड्याने राहता की स्वतःच्या घरात, कुठे राहता, तुमचे वय, तुम्ही शाळेची फी किंवा काळजीचा खर्च भरता का. अनेक सांख्यिकी कार्यालये प्रकारानुसार महागाई प्रसिद्ध करतात (अन्न, घर, वाहतूक, आरोग्य), त्यावरून तुमचे सर्वात मोठे खर्च मुख्य आकड्यापेक्षा वेगाने वाढले की हळू, हे दिसू शकते. काही लोक हे किती महत्त्वाचे आहे हे पाहण्यासाठी राष्ट्रीय दरापेक्षा एक-दोन बिंदू जास्त किंवा कमी दर वापरून पाहतात.',
        },
        {
          q: 'इतिहास कुठून येतो, आणि तो किती अलीकडचा आहे?',
          a: 'World Bank च्या World Development Indicators मधून: “Inflation, consumer prices (annual %)” (निर्देशक FP.CPI.TOTL.ZG), CC BY 4.0 परवान्याखाली, ज्यात राष्ट्रीय सांख्यिकी कार्यालये आणि IMF प्रसिद्ध करत असलेले आकडे एकत्र केलेले असतात. World Bank ने ते शेवटचे {updated} रोजी अपडेट केले; nidhi दर महिन्याला नवीन आकडे तपासते. बहुतेक देशांसाठी सर्वात अलीकडचे वर्ष म्हणजे शेवटचे पूर्ण कॅलेंडर वर्ष असते, काही देश मागे असतात, आणि काहींच्या काही वर्षांचा आकडा नसतो. साधन प्रत्येक देशाची व्याप्ती दाखवते आणि रिकामी जागा कधीच अंदाजाने भरत नाही: “भूतकाळापासून आजपर्यंत” फक्त अशा वर्षांपासून सुरू होते जिथून सर्वात अलीकडच्या वर्षापर्यंत नोंद अखंड आहे.',
        },
        {
          q: 'दर {maxRate}% पर्यंत का जाऊ शकतो?',
          a: 'कारण असे घडले आहे. अतिमहागाई, ज्याची व्याख्या अनेकदा दरमहा 50% पेक्षा जास्त किंमतवाढ अशी केली जाते, अलीकडच्या काळात अनेक देशांत आली आहे, आणि World Bank च्या स्वतःच्या डेटामध्ये हजारो टक्क्यांचे वार्षिक दर दिसतात. 20% वर मर्यादा असलेले साधन त्या वर्षांनी बचतीचे काय केले हे दाखवू शकले नसते. अशा दरांवर उत्तरे इतकी मोठी किंवा इतकी लहान होतात की साधन प्रत्येक अंक छापण्याऐवजी “पेक्षा जास्त” किंवा “पेक्षा कमी” असे सांगते.',
        },
        {
          q: 'वास्तविक दर म्हणजे फक्त पगारवाढ वजा महागाई का नाही?',
          a: 'कारण दोन्ही चक्रवाढीने (compounding) वाढतात. क्रयशक्ती (purchasing power) दरवर्षी (1 + पगारवाढ) ÷ (1 + महागाई), वजा एक, इतकी वाढते. 5% पगारवाढ आणि 3% महागाई असेल तर ते दरवर्षी सुमारे 1.94% होते, 2% नाही. कमी दरांवर वजाबाकीचा सोपा मार्ग जवळपास बरोबर येतो; जास्त महागाईत तो खूप चुकतो: 100% महागाईसोबत 110% पगारवाढ झाली तर क्रयशक्ती 10% नाही, तर 5% वाढते.',
        },
        {
          q: 'माझा डेटा कुठे पाठवला जातो का?',
          a: 'नाही. हिशेब तुमच्या ब्राउझरमध्ये होतात, आणि तुम्ही लिहिलेल्या रकमा, दर आणि वर्षे आम्हाला किंवा इतर कोणालाही पाठवली जात नाहीत. देश निवडल्यावर त्याचा इतिहास nidhi.today या साइटवरूनच येतो, World Bank कडून कधीच नाही. साधन वापरताना पानाच्या पत्त्यात काहीही जात नाही. तुम्ही “{copyLink}” दाबता तेव्हा तुमची मूल्ये लिंकमध्ये # चिन्हानंतर जातात, पत्त्याचा हा भाग ब्राउझर कधीच सर्व्हरकडे पाठवत नाहीत, आणि वापराचे विश्लेषण सुरू होण्यापूर्वी पान ती पत्त्याच्या पट्टीतून काढून टाकते. वापराचे विश्लेषण तुम्ही कोणता प्रश्न, चलन आणि देश निवडता याची नोंद करते, आकड्यांची कधीच नाही.',
        },
        {
          q: 'हा आर्थिक सल्ला आहे का?',
          a: 'नाही. तुम्ही निवडलेला दर काळाच्या ओघात एखाद्या रकमेचे काय करतो ते हे दाखवते. महागाई किती असेल, किंवा तुम्ही तुमच्या पैशांचे काय करावे, हे ते सांगू शकत नाही.',
        },
      ],
    },
    related: {
      heading: 'आणखी वाचा',
      cards: {
        'purchasing-power': {
          kicker: 'या साधनामागची कल्पना',
          title: 'क्रयशक्ती',
          desc: 'किमती वाढल्यावर त्याच पैशात कमी का मिळते, आणि वास्तविक परतावा कसा काढायचा.',
        },
        'saving-vs-investing': {
          kicker: 'पुढची पायरी',
          title: 'बचत विरुद्ध गुंतवणूक',
          desc: 'रोख रक्कम कुठे बसते, गुंतवणूक कुठे बसते, आणि महागाई प्रत्येकाचे काय करते.',
        },
        'why-your-euro-buys-more-in-some-countries': {
          kicker: 'सीमेपलीकडे',
          title: 'परदेशात पैशात काय मिळते',
          desc: 'विनिमय दर विरुद्ध क्रयशक्ती: त्याच रकमेत काही देशांत जास्त का मिळते.',
        },
      },
    },
  },
  island: {
    currencies: currenciesMr,
    formLabel: 'महागाई कॅल्क्युलेटर',
    export: {
      meaning: 'महागाई म्हणजे काळानुसार किमती वाढणे. एखाद्या देशाची प्रत्यक्ष महागाई वापरली नसेल, तर हे आकडे दरवर्षी एकच दर धरतात; प्रत्यक्ष महागाई वर्षागणिक बदलते, आणि तुम्ही भरता त्या किमती सरासरीपेक्षा जलद किंवा हळू वाढू शकतात.',
      moneyLabel: 'रक्कम',
      moneyText: 'चलनाच्या सर्वात लहान एककापर्यंत. पेज मुख्य उत्तर पूर्णांकात दाखवते; हे त्यामागचे नेमके आकडे आहेत.',
      sheets: { answer: 'उत्तर', byYear: 'दरवर्षी' },
      question: 'प्रश्न',
      country: 'महागाईचा इतिहास',
      result: 'निकाल',
      realRate: 'क्रयशक्ती, % दरवर्षी',
      inWords: 'शब्दांत',
      years: 'वापरलेली वर्षे',
      source: 'स्रोत',
      sourceText: 'World Bank, निर्देशक FP.CPI.TOTL.ZG, “Inflation, consumer prices (annual %)”, CC BY 4.0.',
    },
    tabsLabel: 'प्रश्न निवडा',
    tabs: {
      buy: 'पुढे क्रयशक्ती',
      cost: 'पुढे किंमत',
      past: 'भूतकाळापासून आजपर्यंत',
      keep: 'महागाईच्या बरोबरीने',
    },
    questions: {
      buy: 'काही वर्षांच्या महागाईनंतर एखाद्या रकमेत, आजच्या पैशांच्या हिशेबात, काय मिळू शकेल?',
      cost: 'किमती वाढत राहिल्या, तर आज इतकी किंमत असलेली वस्तू पुढे किती महाग होऊ शकेल?',
      past: 'तुम्ही निवडलेल्या दराने, भूतकाळातील एखाद्या रकमेचे आज मूल्य किती?',
      pastCountry: '{country} च्या प्रत्यक्ष वार्षिक महागाईनुसार, भूतकाळातील एखाद्या रकमेचे तिथे आज मूल्य किती?',
      keep: 'पगारवाढ किंवा बचतीवरील परतावा महागाईच्या बरोबरीने जातो का?',
    },
    fields: {
      currency: 'चलन',
      amount: {
        buy: 'रक्कम',
        cost: 'आजची किंमत',
        past: 'तेव्हाची रक्कम',
        keep: 'आजची रक्कम',
      },
      amountError: '0 ते {max} दरम्यानची रक्कम भरा.',
      rate: 'महागाई, दरवर्षी %',
      rateHint: '{min} ते {max}, जास्तीत जास्त दोन दशांश स्थानांपर्यंत',
      rateError: '{min} ते {max} दरम्यानचा दर भरा, जास्तीत जास्त दोन दशांश स्थानांपर्यंत.',
      years: {
        buy: 'आजपासून किती वर्षे',
        cost: 'आजपासून किती वर्षे',
        past: 'किती वर्षांपूर्वी',
        keep: 'वर्षे',
      },
      yearsHint: '{min} ते {max}',
      yearsError: '{min} ते {max} दरम्यान वर्षांची पूर्ण संख्या भरा.',
      growth: 'पगारवाढ किंवा परतावा, दरवर्षी %',
      growthHint: 'पगारकपात किंवा तोटा असेल तर उणे असू शकतो',
      growthError: '{min} ते {max} दरम्यानचा दर भरा, जास्तीत जास्त दोन दशांश स्थानांपर्यंत.',
      from: 'सुरुवातीचे वर्ष',
      fromHint: '{last} पर्यंत, आकडा असलेले सर्वात अलीकडचे वर्ष.',
    },
    history: {
      label: 'संदर्भासाठी महागाईचा इतिहास',
      hint: 'ऐच्छिक. एखाद्या देशाची मागची महागाई दाखवते; उत्तर ती फक्त “भूतकाळापासून आजपर्यंत” मध्ये, किंवा तुम्ही तिची सरासरी वापरली तरच वापरते.',
      none: 'कोणताही देश नाही',
      euroArea: 'युरो क्षेत्र',
      loading: 'इतिहास लोड होत आहे…',
      error: 'इतिहास लोड होऊ शकला नाही. तुम्ही लिहिलेल्या दराने कॅल्क्युलेटर तरीही चालतो.',
      chartLabel: '{country} मधील वार्षिक महागाई, {first} ते {last}. सर्वाधिक {high}, {highYear} मध्ये; सर्वात कमी {low}, {lowYear} मध्ये.',
      average: '{country}, {first} ते {last}: सरासरी दरवर्षी सुमारे {average}.',
      averageGaps: '{country}, आकडा असलेली सर्वात अलीकडची {count} वर्षे ({first} ते {last}): सरासरी दरवर्षी सुमारे {average}.',
      averageNote: 'भूमितीय सरासरी (geometric average): एकूण परिणाम तेवढाच देणारा स्थिर दर. हा इतिहास आहे, भाकीत नाही.',
      coverage: 'आकडे {first} ते {last} पर्यंतचे आहेत.',
      gaps: '{years} साठी आकडा नाही.',
      gapStart: 'कोणतेही वर्ष सुटू नये म्हणून “भूतकाळापासून आजपर्यंत” {start} च्या आधीपासून सुरू होत नाही.',
      use: 'ही सरासरी दर म्हणून वापरा',
      useOutside: 'ही सरासरी दराच्या रकान्यात चालणाऱ्या {min} ते {max}% च्या बाहेर आहे, त्यामुळे ती दर म्हणून वापरता येत नाही.',
      currencyOther: 'रकमा {currency} मध्येच राहतात: {country} चे स्वतःचे चलन या साधनाच्या चलनांमध्ये नाही. इतिहास टक्केवारीत असल्यामुळे तो कोणत्याही चलनात सारखाच वाचता येतो.',
      capped: '{cap} पेक्षा उंच स्तंभ वरच्या बाजूला कापलेले आहेत.',
      legendRecent: 'सरासरीतील वर्षे',
      legendOlder: 'आधीची वर्षे',
      tableSummary: 'वार्षिक आकडे दाखवा',
      tableCaption: '{country} मधील वार्षिक महागाई',
      tableYear: 'वर्ष',
      tableRate: 'महागाई',
      tableNone: 'आकडा नाही',
      rangeJoin: ', ',
      range: '{first} ते {last}',
    },
    results: {
      heading: 'उत्तर',
      years: {
        one: '1 वर्ष',
        few: '{n} वर्षे',
        other: '{n} वर्षे',
      },
      buy: 'महागाईची सरासरी दरवर्षी {rate} राहिली, तर {years} उलटल्यावर {amount} मध्ये तेवढे मिळेल जेवढे आज {result} मध्ये मिळते.',
      cost: 'किमती सरासरी दरवर्षी {rate} वाढल्या, तर आज {amount} किंमत असलेली वस्तू {years} उलटल्यावर {result} ला मिळेल.',
      past: 'महागाईची सरासरी दरवर्षी {rate} राहिली असेल, तर {years} आधीच्या {amount} मध्ये तेवढे मिळत असे जेवढे आज {result} मध्ये मिळते.',
      pastCountry: '{country} मध्ये, {from} साली {amount} मध्ये तेवढे मिळत असे जेवढे {to} साली {result} मध्ये मिळत होते.',
      pastCountryRise: 'या कालावधीत ({years}) किमती एकूण सुमारे {total} वाढल्या, म्हणजे सरासरी दरवर्षी {average}.',
      keepMore: 'दरवर्षी {growth} पगारवाढ किंवा परतावा आणि सरासरी {rate} महागाई असेल, तर क्रयशक्ती दरवर्षी सुमारे {real} वाढते.',
      keepLess: 'दरवर्षी {growth} पगारवाढ किंवा परतावा आणि सरासरी {rate} महागाई असेल, तर क्रयशक्ती दरवर्षी सुमारे {real} कमी होते.',
      keepSame: 'दरवर्षी {growth} पगारवाढ किंवा परतावा आणि सरासरी {rate} महागाई असेल, तर क्रयशक्ती जवळपास तेवढीच राहते.',
      keepAfter: '{years} उलटल्यावर, दरवर्षी {growth} ने वाढणाऱ्या {amount} मध्ये तेवढे मिळेल जेवढे आज {result} मध्ये मिळते.',
      keepExact: 'नेमका हिशेब: (1 + {growth}) ÷ (1 + {rate}) − 1. एका दरातून दुसरा वजा करणे ({shortcut}) हा सामान्य सोपा मार्ग आहे, कमी दरांवर जवळपास बरोबर आणि जास्त दरांवर खूप चुकीचा.',
      keepHeadline: 'दरवर्षी {real}',
      about: 'सुमारे {amount}',
      moreThan: '{amount} पेक्षा जास्त',
      lessThan: '{amount} पेक्षा कमी',
      bandLabel: 'दोन्ही बाजूंनी एक बिंदू:',
      bandItem: '{rate} वर: {result}',
      bandKeep: '{rate} महागाईवर: दरवर्षी {real}',
      method: 'वर्षातून एकदा, प्रत्येक वर्षी त्याच दराने चक्रवाढ. एक परिदृश्य, अंदाज नाही.',
      methodHistory: 'प्रत्येक वर्षाच्या प्रत्यक्ष आकड्याने वर्षानुवर्षे चक्रवाढ. इतिहास, अंदाज नाही.',
      fix: 'उत्तर पाहण्यासाठी ठळक केलेले रकाने दुरुस्त करा.',
      stale: 'हे उत्तर जुने झाले आहे: ते अपडेट करण्यासाठी ठळक केलेले रकाने दुरुस्त करा.',
      announce: 'अपडेट झालेले उत्तर: {headline}. {sentence}',
    },
    chart: {
      title: {
        buy: 'प्रत्येक वर्षी {amount} मध्ये आजच्या पैशांच्या हिशेबात काय मिळते',
        cost: 'प्रत्येक वर्षी {amount} किती होतात',
        past: 'तेव्हापासून प्रत्येक वर्षी {amount} चे मूल्य',
        keep: 'प्रत्येक वर्षी {amount} मध्ये आजच्या पैशांच्या हिशेबात काय मिळते',
      },
      axis: {
        buy: 'आजपासूनची वर्षे',
        cost: 'आजपासूनची वर्षे',
        past: 'तेव्हापासूनची वर्षे',
        keep: 'आजपासूनची वर्षे',
        pastCountry: 'वर्ष',
      },
      desc: 'रेषा आलेख. {start} ({from}) पासून सुरू होतो आणि {end} ({to}) ला संपतो.',
      yearsFrom: 'वर्ष {n}',
      tooLarge: 'या दराने रकमा इतक्या मोठ्या होतात की आलेख काढता येत नाही.',
    },
    actions: {
      copy: 'या हिशेबाची लिंक कॉपी करा',
      copied: 'लिंक कॉपी झाली',
      copyPrompt: 'ही लिंक कॉपी करा:',
      reset: 'पूर्वनिश्चित मूल्ये परत आणा',
    },
  },
};
