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
 * `formatAmount` in the chosen currency's own conventions.
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
import { currenciesEn, currenciesEs, currenciesHi } from './currencies.ts';

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
      'Results in 29 currencies',
      'Shareable link to any calculation',
    ],
  },
  page: {
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
   * What the tool itself says while you use it. A plural pair is `one` and
   * `other`, filled by the component, because Hindi does not pluralise a noun
   * the way English adds an "s".
   */
  island: {
    /** The 29 currency names, shared by every tool: see `./currencies.ts`. */
    currencies: currenciesEn,
    formLabel: 'Inflation calculator',
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
      years: { one: '1 year', other: '{n} years' },
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
    title: 'महँगाई कैलकुलेटर (Inflation Calculator) | nidhi',
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
      '29 मुद्राओं में नतीजे',
      'किसी भी हिसाब का शेयर लिंक',
    ],
  },
  page: {
    breadcrumb: {
      home: 'होम',
      freeTools: 'मुफ़्त टूल',
      this: 'महँगाई कैलकुलेटर',
    },
    eyebrow: 'मुफ़्त टूल',
    title: 'महँगाई कैलकुलेटर: समय के साथ पैसे से कितना ख़रीदा जा सकता है',
    lead: {
      before: 'देखें कि सालों में महँगाई किसी रकम पर क्या असर डालती है',
      wide: ', आगे की ओर या पीछे की ओर, आपकी चुनी दर पर या किसी देश के दर्ज इतिहास के साथ। हर जवाब के साथ वही हिसाब एक अंक कम और एक अंक ज़्यादा पर भी दिखता है, क्योंकि यह एक परिदृश्य है, पूर्वानुमान नहीं',
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
          a: 'यह एक परिदृश्य का हिसाब लगाता है: अगर कीमतें आपकी टाइप की गई दर से, हर साल, आपके चुने सालों तक बढ़ें, तो कोई रकम किसके बराबर बैठती है? "आगे कितना ख़रीदा जा सकता है?" दिखाता है कि भविष्य में कोई रकम आज के पैसे में कितनी चीज़ें ख़रीद सकती है। "आगे कितने का हो सकता है?" आज की कीमत को आगे ले जाता है। "बीते साल से आज तक" पुरानी रकम को आज तक लाता है। "क्या बराबरी हो रही है?" वेतन वृद्धि या बचत पर रिटर्न की तुलना महँगाई से करता है। जवाब गोल करके "लगभग" के साथ दिखते हैं, क्योंकि दर एक अनुमान है, माप नहीं।',
        },
        {
          q: 'हर जवाब के साथ दो और जवाब क्यों दिखते हैं?',
          a: 'कोई नहीं जानता कि अगले दस साल में महँगाई का औसत क्या रहेगा। हर जवाब के नीचे की पंक्ति वही हिसाब एक प्रतिशत अंक कम और एक ज़्यादा पर दोहराती है (कभी 0% से नीचे नहीं), ताकि आप देख सकें कि जवाब दर पर कितना निर्भर है। लंबे समय में एक अंक का भी बड़ा फ़र्क पड़ता है, इसलिए अकेला एक आँकड़ा जितना पक्का लगता है, उतना होता नहीं।',
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
          a: 'क्योंकि दोनों पर चक्रवृद्धि होती है। क्रय शक्ति (1 + वेतन वृद्धि) ÷ (1 + महँगाई) में से एक घटाने जितनी बढ़ती है। 5% वेतन वृद्धि और 3% महँगाई पर यह लगभग 1.94% सालाना है, 2% नहीं। कम दरों पर घटाने का छोटा तरीक़ा क़रीब रहता है; ऊँची महँगाई पर वह बहुत दूर चला जाता है: 100% महँगाई के साथ 110% वेतन वृद्धि से क्रय शक्ति 5% बढ़ती है, 10% नहीं।',
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
    tabsLabel: 'सवाल चुनें',
    tabs: {
      buy: 'आगे कितना ख़रीदा जा सकता है?',
      cost: 'आगे कितने का हो सकता है?',
      past: 'बीते साल से आज तक',
      keep: 'क्या बराबरी हो रही है?',
    },
    questions: {
      buy: 'कुछ सालों की महँगाई के बाद किसी रकम से, आज के पैसे में, कितना ख़रीदा जा सकता है?',
      cost: 'जो चीज़ आज इतने की है, वह आगे कितने की हो सकती है?',
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
        'यह ज्यामितीय औसत है: वह एक जैसी दर जिसका कुल असर उतना ही होता। यह इतिहास है, पूर्वानुमान नहीं।',
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
      years: { one: '1 साल', other: '{n} साल' },
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
      'Resultados en 29 monedas',
      'Enlace para compartir cualquier cálculo',
    ],
  },
  page: {
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
    tabsLabel: 'Elige una pregunta',
    tabs: {
      buy: 'Poder de compra futuro',
      cost: 'Costo futuro',
      past: 'Del pasado a hoy',
      keep: '¿Sigue el ritmo?',
    },
    questions: {
      buy: '¿Qué podría comprar una cantidad tras unos años de inflación, en dinero de hoy?',
      cost: '¿Cuánto podría costar más adelante algo que hoy cuesta esto?',
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
      years: { one: '1 año', other: '{n} años' },
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
