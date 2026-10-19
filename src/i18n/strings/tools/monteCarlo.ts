/**
 * The Monte Carlo simulator's copy, in both languages.
 *
 * Two halves, and the split is not arbitrary. `page` is what
 * `src/components/pages/MonteCarloPage.astro` renders: the heading, the four
 * limits, the method and its sources, the FAQ and the related-reading cards.
 * `island` is what `src/components/MonteCarloSimulator.tsx` renders: the form,
 * the result cards, the table and every word the chart can produce, including
 * the sentence a screen reader hears as you move along it.
 *
 * Figures are never typed twice. A sentence that quotes a number carries a
 * `{name}` and is filled by `format()` from `../../format.ts` at render time,
 * and the names are the ones the page and the island pass, all read from the
 * constants in `src/utils/monte-carlo/math.ts`: the path counts, the four
 * published averages and deviations, the correlation and the fee ceiling. So
 * a change to the engine moves the prose with it, and the Hindi page cannot
 * quietly disagree with the English one about what the model does.
 *
 * The return settings' own names are here once, under `island.returns`, and the
 * page quotes them as `{cautious}`, `{historical}` and `{optimistic}` rather
 * than spelling them out again: the switch in the tool and the prose that names
 * it have to agree, which is the whole reason the tool is careful about them.
 *
 * What is not here: the analytics labels, which the privacy notice's changelog
 * names and which no translator would touch; the addresses, which
 * `localizedPath` prefixes; and the two Latin fragments inside the sources
 * paragraph, the authors' names and the book title, which read the same in
 * every language and so live in the component, the way the tools hub keeps
 * `Frankfurter` and the privacy notice keeps the names of the services it
 * lists. (They cannot live here: the catalog test flags a Hindi value that is
 * byte-identical to its English one and is not on its `IDENTICAL_OK` list, and a
 * book title has no translation to offer.)
 *
 * `island` reaches the tool as a prop, one locale's slice and not the whole
 * catalog: `dict(locale)` reads a runtime-indexed table holding every language
 * and every tool, so nothing tree-shakes and the client chunk would carry all
 * of it to render one calculator. That is why the two halves are separate keys
 * here rather than the component reaching for its own.
 *
 * Two things the tool puts on screen are not translated and are not here: the
 * currency names in the dropdown, which are shared with the other two tools,
 * and the amounts themselves, which `formatAmount` writes by the chosen
 * currency's own conventions. The mix is the one glossary term that appears in a
 * short form: it is a slider's label, so it reads मिश्रण where a sentence would
 * carry the glossary's full पोर्टफ़ोलियो का मिश्रण, the way the net worth tool
 * shortens जिस मुद्रा में आप खर्च करते हैं in a table heading.
 *
 * Register: the lessons'. The tool shows what a spread of outcomes looks like
 * and says plainly what the model leaves out; the Hindi explains the same and
 * lets the reader decide, and is careful, as the English is, that a share of
 * simulated paths is not a chance of anything happening to a person.
 */
import { currenciesCs, currenciesEn, currenciesEs, currenciesHi } from './currencies.ts';

export const monteCarloEn = {
  meta: {
    title: 'Monte Carlo Retirement Simulator: Free, In Your Browser | nidhi',
    description:
      "Free Monte Carlo retirement simulator: see the range of outcomes, in today's money. No signup.",
  },
  /**
   * Structured data. The product names are the tool's own and are translated,
   * as the hub's `itemListName` is; `FinanceApplication` and the currency of
   * the free offer are schema.org values, so they stay in the component.
   */
  schema: {
    name: 'nidhi Monte Carlo Simulator',
    alternateNames: ['nidhi Monte Carlo Retirement Calculator', 'nidhi Retirement Simulator'],
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript. Modern browser.',
    featureList: [
      '{minPaths} to {maxPaths} simulated paths of yearly returns',
      'Return assumptions from world stock and bond markets, 1900 to 2025, with cautious and optimistic settings',
      'Yearly fees',
      'Saving phase and optional withdrawal phase',
      'Stock and bond mix, rebalanced yearly',
      "Results in today's money, in 38 currencies",
      'Shareable link to any plan',
    ],
  },
  page: {
    breadcrumb: {
      home: 'Home',
      freeTools: 'Free tools',
      this: 'Monte Carlo simulator',
    },
    eyebrow: 'Free tools',
    title: 'Monte Carlo simulator: the spread, not the single line',
    /**
     * Three parts, because phones show the first and the last and hide the
     * middle (`mcsp-wideOnly`): what the tool does, and that nothing leaves the
     * browser. The spaces at the ends of the outer two are the markup's.
     */
    lead: {
      before: 'Play your savings forward thousands of times',
      wide: ' with returns drawn from the long-run record of world markets. See a low, median and high outcome, and how often the money lasts once you live off it',
      after: '. Everything runs in your browser; nothing is sent to a server.',
    },
    /**
     * What the model cannot see. Four named limits rather than a list, so a
     * translator can see which one they are working on; the component reads them
     * in this order, and each is a `<strong>` lead with the explanation after it.
     */
    limits: {
      heading: "What this can't see",
      items: {
        onePot: {
          lead: 'One pot, one currency.',
          rest: ' If your savings sit in more than one currency, or you will retire somewhere that spends a different one, exchange rates add a risk this model does not include.',
        },
        steady: {
          lead: 'Steady saving and spending.',
          rest: ' Real lives have a career break, a house, tuition, an inheritance. Each changes the result, sometimes more than markets do.',
        },
        taxes: {
          lead: 'No taxes, and simple fees.',
          rest: ' Taxes come off every real path and depend on where you live and which accounts you use. Fees are one yearly percentage; fixed and one-off charges are left out.',
        },
        extremes: {
          lead: 'Calmer extremes than history.',
          rest: ' Years are drawn independently from a smooth distribution, so long runs of bad years and crashes like 2008 (world stocks -42.9% after inflation) are rarer here than they were in reality.',
        },
      },
      more: 'Why each one matters',
    },
    /**
     * The line to the planner. Split around the link, which lands on the home
     * page's early-access block.
     */
    planner: {
      before:
        'The nidhi planner runs this kind of simulation on your whole picture: every account in its own currency, your income and spending over time, and the events you are planning for.',
      link: 'Join the early-access list',
    },
    how: {
      heading: 'How it works',
      more: 'The method and its sources',
      /** The numbered method, in this order. Every figure in it comes from a constant. */
      steps: {
        draws:
          'Each simulated year draws a stock return and a bond return, after inflation. Their averages and swings match world markets from 1900 to 2025: stocks {stocksMean} a year on average with a standard deviation of {stocksSd}, bonds {bondsMean} with {bondsSd}. The two are mildly linked (a correlation of about {correlation}). That link has swung widely over history, positive and negative, so this is a simplification. "{cautious}" and "{optimistic}" keep these swings and move the compound return to stocks 4% or 6% a year and bonds 1% or 3%.',
        blend:
          "Your portfolio earns the blend of the two at your chosen mix, rebalanced once a year, less your yearly fees. The year's return is spread evenly over its twelve months.",
        flows:
          'Your monthly saving goes in at the start of each month. If you switch on withdrawals, a twelfth of the yearly amount comes out each month after the saving years end. A path that hits zero stays at zero.',
        runs:
          'This repeats as many times as you choose, {defaultPaths} by default. The chart shows where the paths fall each year: the shaded bands hold the middle 8 in 10 and the middle half of them.',
        deterministic:
          'The same inputs always give the same result, so a shared link shows exactly what you saw.',
      },
      /**
       * The citation. Split around the link only; the authors, the paper title,
       * the exhibits and the publisher read the same in every language and are
       * in the component, as the paragraph's own note says.
       */
      source: {
        before:
          'Sources: Elroy Dimson, Paul Marsh and Mike Staunton, “Global Markets over the Last 126 Years” (Exhibits 11.3 and 11.5, from the DMS Database), and Edward F. McQuarrie, “US Stocks and Bonds before 1926” (Exhibit 10.4), in',
        after: ', CFA Institute Research Foundation, 2026.',
      },
    },
    /**
     * The FAQ, printed on the page and published as FAQPage structured data, so
     * it is written once here. Two answers quote a figure, and two name
     * something else on the page: the switch's settings and the share button's
     * label. Those four come in as `{name}`s too, so the words stay one word.
     */
    faq: {
      heading: 'Frequently asked questions',
      items: [
        {
          q: 'What is a Monte Carlo simulation?',
          a: 'Instead of assuming one fixed return every year, it plays your plan forward thousands of times ({defaultPaths} by default), each time with a different random sequence of good and bad years. The result is a spread: what a low, a median and a high outcome might look like. It shows how much the outcome can vary, which a single line hides.',
        },
        {
          q: 'Where do the return assumptions come from?',
          a: 'From the long-run record of world stock and bond markets, 1900 to 2025, compiled by Dimson, Marsh and Staunton and reprinted in Exponential Wealth (CFA Institute Research Foundation, 2026). After inflation, world equities averaged {stocksMean} a year with a standard deviation of {stocksSd}, and world bonds {bondsMean} with {bondsSd}. The "{historical}" setting draws yearly returns from a distribution with those averages and swings. "{cautious}" and "{optimistic}" keep the same swings but set the compound yearly return to the low and high ends of the long-run range used across nidhi\'s articles: stocks 4% or 6% a year after inflation, bonds 1% or 3%. No historical series is copied into the tool.',
        },
        {
          q: 'How many paths should I run?',
          a: '{defaultPaths} is plenty: going up to {maxPaths} usually moves the low, median and high figures by a few percent at most, and takes noticeably longer, especially on a phone. Fewer paths show how far a small sample can drift: with {minPaths}, the figures can be several percent away from what thousands of paths give.',
        },
        {
          q: 'How are fees handled?',
          a: "As a yearly percentage of the balance, taken off every year's return, from 0 to {maxFeePct}%. Use the total of your fund's ongoing charge and any platform fee. Fixed fees and one-off charges are not modelled.",
        },
        {
          q: "Why is everything in today's money?",
          a: "All returns are real returns, after inflation. A result of 500,000 means 500,000 of today's purchasing power, so you can compare it directly with prices and salaries you know. It also means your monthly saving and yearly withdrawal stay constant in real terms, which is roughly what happens if you raise them with inflation.",
        },
        {
          q: 'What does "the money lasted in 8 in 10 paths" mean?',
          a: 'Of all the simulated paths, 8 in 10 paid every withdrawal in full for all the years you chose. It is not an 80% chance that your plan works: the model leaves out taxes, changes in your spending, and the real world can be worse (or better) than any model. Treat it as a way to compare plans, not as a promise.',
        },
        {
          q: 'Why does the single line sit above most paths?',
          a: 'Volatility costs compounding: a 20% loss needs a 25% gain to get back to where you were. So a plan that averages a given return with ups and downs usually ends below the same plan with that return every year. The single line uses the compound rate, which is already lower than the simple average, and still close to half the paths end below it.',
        },
        {
          q: 'Is my data sent anywhere?',
          a: 'No. The simulation runs in your browser and the numbers you type are not sent to us or anyone else. Nothing goes into the page address while you use the tool. When you press "{copyLink}", your values go into the link after the # sign, a part of the address browsers never send to a server, and the page removes them from the address bar before analytics start.',
        },
        {
          q: 'Is this financial advice?',
          a: 'No. It is an educational model of one portfolio. It cannot tell you what to invest in, how much to withdraw, or when you can retire.',
        },
      ],
    },
    /**
     * Related reading on this page, keyed by the lesson's slug so a card and its
     * lesson cannot be paired up wrongly when one of them is unpublished and the
     * next candidate fills in. The slug, the address and the `data-attr` label
     * are in the component. The words are this page's own short description of
     * each lesson, not the lesson's title: item 13, which adds the Hindi lessons,
     * reconciles these against the titles those lessons end up carrying.
     */
    related: {
      heading: 'Read more',
      cards: {
        'financial-projections': {
          kicker: 'The idea behind this tool',
          title: 'Financial projections',
          desc: 'Why one straight line misleads, and how to read a spread of outcomes instead.',
        },
        'what-if-scenarios': {
          kicker: 'Next step',
          title: 'What-if scenarios',
          desc: 'Test one decision at a time against your baseline before you make it.',
        },
        'income-replacement-ratio': {
          kicker: 'How much to take out',
          title: 'Income replacement ratio',
          desc: 'What share of your working income you are likely to need once you stop.',
        },
        'understanding-risk': {
          kicker: 'Fundamentals',
          title: 'Understanding risk',
          desc: 'What volatility means for your money, and why the order of returns matters.',
        },
        diversification: {
          kicker: 'Fundamentals',
          title: 'Diversification',
          desc: 'Why a world portfolio swings less than any single country.',
        },
      },
    },
  },
  /**
   * What the tool itself says while you use it. Every sentence that holds a
   * number is a `{name}` template; the only words left in the component are the
   * currency codes and names the shared currency table supplies, which are the
   * same table on the site's other tools.
   *
   * A plural pair is `<name>One` and `<name>Other`, as on the home page, because
   * Hindi does not pluralise a noun the way English adds an "s".
   */
  island: {
    /** The 38 currency names, shared by the three tools: see `./currencies.ts`. */
    currencies: currenciesEn,
    formLabel: 'Your plan',
    fields: {
      currency: 'Currency',
      start: 'Invested today',
      startHint: "Today's money",
      monthly: 'Added every month',
      saveYears: 'Years of saving',
      saveYearsHint: '0 to 60',
      /** Around the `<strong>`, which holds the stock share. */
      mixBefore: 'Mix: ',
      mixStocks: '{pct}% stocks',
      mixMiddle: ', ',
      mixBonds: '{pct}% bonds',
      mixHint: 'Rebalanced back to this mix once a year.',
      /** Split around the link to the other tool. */
      crossLink: {
        before: 'Money in several currencies? Add it up first with the ',
        link: 'net worth calculator',
        after: ', then enter the total here.',
      },
    },
    /**
     * The three return settings, named once. The switch shows these, and the
     * page's method and FAQ quote them through `{cautious}`, `{historical}` and
     * `{optimistic}`.
     */
    returns: {
      cautious: 'Cautious',
      historical: 'Historical',
      optimistic: 'Optimistic',
    },
    /** Each setting's explanation, on hover, on focus and below the switch on a touch screen. */
    returnTips: {
      cautious:
        'Stocks grow about {stocks} a year after inflation and bonds about {bonds}: the low end of the long-run range. The ups and downs are as large as in history.',
      historical:
        'World markets from 1900 to 2025: stocks grew about {stocks} a year after inflation and bonds about {bonds}, with the ups and downs they actually had.',
      optimistic:
        'Stocks grow about {stocks} a year after inflation and bonds about {bonds}: the high end of the long-run range. The ups and downs are as large as in history.',
    },
    settings: {
      /** The button that opens the folded settings on a phone. */
      toggle: 'Returns, fees and paths',
      summary: '{returns} · {fees}% fees · {paths} paths',
      legend: 'Returns',
      feeLabel: 'Yearly fees, %',
      feeHint: "Fund and platform fees, taken off every year's return. 0 to {maxFeePct}.",
      pathsLabel: 'Simulated paths',
      pathsHint:
        'More paths give steadier figures; past 10,000 they move by a few percent at most.',
    },
    withdraw: {
      toggle: 'Then live off it',
      off: 'Switch on to see how long the money lasts once you start taking it out.',
      amountLabel: 'Taken out every year',
      amountHint: "Today's money, taken monthly",
      yearsLabel: 'For how many years',
      yearsHint: '1 to 60',
    },
    actions: {
      copy: 'Copy a link to this plan',
      copied: 'Link copied',
      /** The fallback prompt when the clipboard is unavailable. */
      copyPrompt: 'Copy this link:',
      reset: 'Reset',
      fix: 'Fix the highlighted fields to update the results.',
      running: 'Running {paths} paths…',
    },
    /**
     * The headline result under the inputs, on a phone only. It says the same
     * as the full results below, which is why it is hidden from screen readers.
     */
    quick: {
      medianOne: 'Median after 1 year',
      medianOther: 'Median after {years} years',
      range: '8 in 10 paths between {low} and {high}',
      lasted: 'The money lasted all {years} years in {inTen} paths.',
    },
    /** "9 in 10" style phrasing, filled with a count of tenths. */
    inTen: '{n} in 10',
    results: {
      headingOne: 'After 1 year of saving',
      headingOther: 'After {years} years of saving',
      headingToday: 'Starting from today',
      lowLabel: 'Low',
      lowMore: ' (10th percentile): 1 in 10 paths ended below',
      medianLabel: 'Median',
      medianMore: ': half the paths ended above, half below',
      highLabel: 'High',
      highMore: ' (90th percentile): 1 in 10 paths ended above',
      cardsKey:
        'Low and high: 1 in 10 paths ended below or above (the 10th and 90th percentiles). Median: half ended above, half below.',
      /** Split around the `<strong>`, which holds the single line's end value. */
      noteBefore: 'A calculator with one fixed return would draw a single line to',
      noteAfter: '. {share} of the simulated paths ended below it.',
      empty: 'Add some years of saving, or switch on withdrawals, to see a spread of outcomes.',
      /** Split around the `<strong>`, which holds the 8-in-10 phrasing. */
      lastedHeadBefore: 'Taking {amount} a year, the money lasted all {years} years in',
      lastedHeadAfter: ' simulated paths ({share}).',
      runOut:
        'Among the paths where it ran out, the median year it did so was year {year} of {years}.',
      caveat:
        'These are shares of {paths} simulated paths, not the chance of anything happening to you. The model is a simplification; see what it leaves out below.',
      /** Appended to the sentence above only when few paths were run. */
      caveatFew:
        ' With only {paths} paths, the figures can be several percent away from what thousands of paths give.',
      tableSummary: 'Show the numbers as a table',
      tableCaption: "Balance at the end of each year, in today's money",
      tableYear: 'Year',
      tableLow: 'Low (10th)',
      tableMedian: 'Median',
      tableHigh: 'High (90th)',
      tableStraight: 'Single line',
    },
    /** Every word the chart can put on screen or read out. */
    chart: {
      swipe: 'Swipe to see the whole chart →',
      groupLabel: 'Chart. Use the left and right arrow keys to read the values for each year.',
      title: 'Spread of simulated outcomes',
      desc: 'Fan chart of {paths} simulated paths over {years} years. At the end, the 10th percentile is {low}, the median {median}, and the 90th percentile {high}. A single fixed-return line ends at {straight}.',
      livingOff: 'Living off it',
      axisYears: 'Years from today',
      endHigh: 'High',
      endMedian: 'Median',
      endLow: 'Low',
      readoutYear: 'Year {year}',
      readoutHigh: 'High (90th)',
      readoutMiddle: 'Middle half',
      /** The middle half's value: the 25th and 75th percentile amounts. */
      readoutMiddleRange: '{low} to {high}',
      readoutMedian: 'Median',
      readoutLow: 'Low (10th)',
      readoutStraight: 'Single line',
      /** `{phase}` arrives already carrying its own comma, or empty. */
      announce:
        'Year {year}{phase}. High {high}, middle half {middleLow} to {middleHigh}, median {median}, low {low}, single line {straight}.',
      phaseStart: 'Start',
      phaseSaving: 'Saving',
      phaseWithdrawing: 'Withdrawing, year {year}',
      legendPaths: '8 in 10 paths',
      legendMiddle: 'Middle half',
      legendMedian: 'Median balance',
      legendStraight: 'Single fixed-return line',
      legendHint: 'Point at the chart, tap it, or use the arrow keys to read any year.',
      clippedLabels:
        ' The lightest band runs above the top of the chart; the High label on the right shows where it ends.',
      clippedPhone:
        ' The lightest band runs above the top of the chart; tap any year to read its high value.',
    },
  },
};

/**
 * The Hindi edition. Same shape by construction, and the same figures: nothing
 * here spells a path count or a return out by hand, so the two editions cannot
 * disagree about what the model did.
 *
 * The words follow `docs/i18n/hi-glossary.md`, section "The free tools":
 * सिम्युलेशन, सिम्युलेटेड रास्ता, निकासी, महँगाई के बाद, बीच का (never औसत),
 * पोर्टफ़ोलियो का मिश्रण, हर साल पुनर्संतुलित. `median` is बीच का everywhere,
 * including the chart legends and the table headings, because the tool's whole
 * point is that the middle of a spread is not an average.
 *
 * What stays Latin: the currency codes, `JavaScript`, `CFA Institute`, the
 * authors and titles in the sources paragraph, and `nidhi`. Currency amounts
 * are not translated at all: `formatAmount` writes them by the chosen
 * currency's own conventions.
 */
export const monteCarloHi: typeof monteCarloEn = {
  meta: {
    title: 'मोंटे कार्लो रिटायरमेंट सिम्युलेटर: मुफ़्त, आपके ब्राउज़र में | nidhi',
    description:
      'मुफ़्त मोंटे कार्लो रिटायरमेंट सिम्युलेटर: आज के पैसे में देखें कि नतीजे कितने अलग-अलग हो सकते हैं। साइनअप की ज़रूरत नहीं।',
  },
  schema: {
    name: 'nidhi मोंटे कार्लो सिम्युलेटर',
    alternateNames: ['nidhi मोंटे कार्लो रिटायरमेंट कैलकुलेटर', 'nidhi रिटायरमेंट सिम्युलेटर'],
    operatingSystem: 'कोई भी (वेब ब्राउज़र)',
    browserRequirements: 'JavaScript चाहिए। आधुनिक ब्राउज़र।',
    featureList: [
      'सालाना रिटर्न के {minPaths} से {maxPaths} सिम्युलेटेड रास्ते',
      '1900 से 2025 तक के दुनिया के शेयर और बॉन्ड बाज़ारों पर आधारित रिटर्न की मान्यताएँ, सतर्क और आशावादी सेटिंग के साथ',
      'सालाना शुल्क',
      'बचत का दौर, और उसके बाद वैकल्पिक निकासी का दौर',
      'पोर्टफ़ोलियो का मिश्रण (शेयर और बॉन्ड), हर साल पुनर्संतुलित',
      'नतीजे आज के पैसे में, 38 मुद्राओं में',
      'किसी भी योजना का शेयर करने योग्य लिंक',
    ],
  },
  page: {
    breadcrumb: {
      home: 'होम',
      freeTools: 'मुफ़्त टूल',
      this: 'मोंटे कार्लो सिम्युलेटर',
    },
    eyebrow: 'मुफ़्त टूल',
    title: 'मोंटे कार्लो सिम्युलेटर: एक सीधी लकीर नहीं, पूरा फैलाव',
    lead: {
      before: 'अपनी बचत को हज़ारों बार आगे चलाकर देखें',
      wide: ', हर बार दुनिया के बाज़ारों के लंबे रिकॉर्ड से लिए गए रिटर्न के साथ। कम, बीच का और ज़्यादा वाला नतीजा देखें, और यह भी कि उस पैसे से गुज़ारा करने पर वह कितनी बार टिकता है',
      after: '। सब कुछ आपके ब्राउज़र में चलता है; कुछ भी किसी सर्वर पर नहीं भेजा जाता।',
    },
    limits: {
      heading: 'यह क्या नहीं देख सकता',
      items: {
        onePot: {
          lead: 'एक ही पोर्टफ़ोलियो, एक ही मुद्रा।',
          rest: ' अगर आपकी बचत एक से ज़्यादा मुद्राओं में है, या आप ऐसी जगह रिटायर होंगे जहाँ दूसरी मुद्रा चलती है, तो विनिमय दरें एक ऐसा जोखिम जोड़ती हैं जो इस मॉडल में शामिल नहीं है।',
        },
        steady: {
          lead: 'बचत और खर्च, हर साल एक बराबर।',
          rest: ' असली ज़िंदगी में करियर में ब्रेक, घर, पढ़ाई का खर्च, विरासत: सब आते हैं। हर एक नतीजा बदल देता है, कभी-कभी बाज़ारों से भी ज़्यादा।',
        },
        taxes: {
          lead: 'कर शामिल नहीं, और शुल्क सरल।',
          rest: ' असल ज़िंदगी में हर रास्ते पर कर कटता है, और वह इस पर निर्भर करता है कि आप कहाँ रहते हैं और कौन-से खाते इस्तेमाल करते हैं। यहाँ शुल्क एक ही सालाना प्रतिशत है; तय और एकबारगी शुल्क शामिल नहीं हैं।',
        },
        extremes: {
          lead: 'इतिहास की तुलना में कम तीखे चरम नतीजे।',
          rest: ' हर साल का रिटर्न दूसरे सालों से स्वतंत्र रूप से, एक सहज, बिना अचानक झटकों वाले वितरण से निकाला जाता है, इसलिए लगातार ख़राब सालों की लंबी कतारें और 2008 जैसी गिरावटें (दुनिया के शेयर महँगाई के बाद -42.9%) यहाँ असल इतिहास से कम आती हैं।',
        },
      },
      more: 'हर एक क्यों मायने रखता है',
    },
    planner: {
      before:
        'nidhi का प्लानर इस तरह का सिम्युलेशन आपकी पूरी तस्वीर पर चलाता है: हर खाता अपनी मुद्रा में, समय के साथ आपकी आय और खर्च, और वे घटनाएँ जिनकी आप योजना बना रहे हैं।',
      link: 'अर्ली-एक्सेस लिस्ट में जुड़ें',
    },
    how: {
      heading: 'यह कैसे काम करता है',
      more: 'तरीक़ा और उसके स्रोत',
      steps: {
        draws:
          'हर सिम्युलेटेड साल शेयरों का एक रिटर्न और बॉन्ड का एक रिटर्न निकालता है, महँगाई के बाद। इनके औसत और उतार-चढ़ाव 1900 से 2025 तक के दुनिया के बाज़ारों से मेल खाते हैं: शेयरों में औसतन सालाना {stocksMean} और मानक विचलन {stocksSd}, बॉन्ड में {bondsMean} और {bondsSd}। दोनों आपस में थोड़े जुड़े हैं (लगभग {correlation} का सहसंबंध)। इतिहास में यह जुड़ाव बहुत बदलता रहा है, कभी सकारात्मक तो कभी नकारात्मक, इसलिए यह एक सरलीकरण है। "{cautious}" और "{optimistic}" इन्हीं उतार-चढ़ावों को रखते हुए चक्रवृद्धि रिटर्न शेयरों में सालाना 4% या 6% और बॉन्ड में 1% या 3% कर देते हैं।',
        blend:
          'आपका पोर्टफ़ोलियो आपके चुने हुए मिश्रण पर इन दोनों का मिलाजुला रिटर्न कमाता है, हर साल एक बार पुनर्संतुलित, और उसमें से आपका सालाना शुल्क कटता है। साल का रिटर्न उसके बारह महीनों पर बराबर बाँट दिया जाता है।',
        flows:
          'आपकी मासिक बचत हर महीने की शुरुआत में जमा होती है। निकासी चालू करें, तो बचत के साल ख़त्म होने के बाद हर महीने सालाना रकम का बारहवाँ हिस्सा निकलता है। जो रास्ता शून्य पर पहुँच जाए, वह शून्य पर ही रहता है।',
        runs:
          'यह उतनी बार दोहराया जाता है जितनी बार आप चुनें, पहले से तय {defaultPaths} बार। चार्ट दिखाता है कि हर साल रास्ते कहाँ पड़ते हैं: छायादार पट्टियों में बीच वाले 10 में से 8 रास्ते हैं, और बीच के आधे रास्ते।',
        deterministic:
          'एक ही इनपुट से हमेशा एक ही नतीजा आता है, इसलिए शेयर किया हुआ लिंक ठीक वही दिखाता है जो आपने देखा था।',
      },
      source: {
        before:
          'स्रोत: Elroy Dimson, Paul Marsh और Mike Staunton की “Global Markets over the Last 126 Years” (Exhibits 11.3 और 11.5, DMS Database से), और Edward F. McQuarrie की “US Stocks and Bonds before 1926” (Exhibit 10.4), ये दोनों',
        after: ' में हैं, CFA Institute Research Foundation, 2026।',
      },
    },
    faq: {
      heading: 'अक्सर पूछे जाने वाले सवाल',
      items: [
        {
          q: 'मोंटे कार्लो सिम्युलेशन क्या है?',
          a: 'हर साल एक तय रिटर्न मानने के बजाय यह आपकी योजना को हज़ारों बार आगे चलाता है ({defaultPaths} बार, पहले से तय), हर बार अच्छे और बुरे सालों का एक अलग क्रम लेकर। नतीजा एक फैलाव है: कम, बीच का और ज़्यादा वाला नतीजा कैसा हो सकता है। यह दिखाता है कि नतीजा कितना बदल सकता है, जो एक सीधी लकीर छिपा देती है।',
        },
        {
          q: 'रिटर्न की मान्यताएँ कहाँ से आती हैं?',
          a: 'दुनिया के शेयर और बॉन्ड बाज़ारों के 1900 से 2025 तक के लंबे रिकॉर्ड से, जिसे Dimson, Marsh और Staunton ने संकलित किया और जो Exponential Wealth (CFA Institute Research Foundation, 2026) में दोबारा छपा। महँगाई के बाद दुनिया के शेयरों ने औसतन सालाना {stocksMean} दिया, मानक विचलन {stocksSd}, और दुनिया के बॉन्ड ने {bondsMean}, मानक विचलन {bondsSd}। "{historical}" सेटिंग उन्हीं औसतों और उतार-चढ़ावों वाले वितरण से हर साल का रिटर्न निकालती है। "{cautious}" और "{optimistic}" वही उतार-चढ़ाव रखते हैं, पर चक्रवृद्धि सालाना रिटर्न को उस लंबी अवधि की सीमा के निचले और ऊपरी सिरे पर रख देते हैं जो nidhi के लेखों में इस्तेमाल होती है: शेयर महँगाई के बाद सालाना 4% या 6%, बॉन्ड 1% या 3%। इस टूल में इतिहास की कोई साल-दर-साल श्रृंखला शामिल नहीं है।',
        },
        {
          q: 'कितने रास्ते चलाने चाहिए?',
          a: '{defaultPaths} काफ़ी हैं: {maxPaths} तक जाने पर कम, बीच के और ज़्यादा वाले आँकड़े आमतौर पर ज़्यादा से ज़्यादा कुछ प्रतिशत ही बदलते हैं, और समय काफ़ी ज़्यादा लगता है, ख़ासकर फ़ोन पर। कम रास्ते दिखाते हैं कि छोटा नमूना कितना भटक सकता है: {minPaths} रास्तों पर आँकड़े हज़ारों रास्तों से कई प्रतिशत दूर हो सकते हैं।',
        },
        {
          q: 'शुल्क का हिसाब कैसे लगता है?',
          a: 'पोर्टफ़ोलियो की रकम का एक सालाना प्रतिशत, जो हर साल के रिटर्न में से कटता है, 0 से {maxFeePct}% तक। इसमें अपने फ़ंड का सालाना चालू शुल्क (ongoing charge) और प्लेटफ़ॉर्म का शुल्क, अगर कोई हो, जोड़कर डालिए। तय शुल्क और एकबारगी शुल्क नहीं जोड़े जाते।',
        },
        {
          q: 'सब कुछ आज के पैसे में क्यों है?',
          a: 'हर रिटर्न महँगाई के बाद का रिटर्न है। 500,000 के नतीजे का मतलब है आज की क्रय शक्ति के 500,000, ताकि आप उसकी सीधी तुलना उन क़ीमतों और वेतनों से कर सकें जो आप जानते हैं। इसका यह भी मतलब है कि आपकी मासिक बचत और सालाना निकासी महँगाई के बाद के हिसाब से एक जैसी रहती हैं, जो लगभग वही होता है जो महँगाई के साथ उन्हें बढ़ाने पर होता है।',
        },
        {
          q: '“10 में से 8 रास्तों में पैसा टिका” का क्या मतलब है?',
          a: 'सारे सिम्युलेटेड रास्तों में से 10 में से 8 ने आपके चुने हुए सारे सालों तक हर निकासी पूरी दी। इसका मतलब यह नहीं कि आपकी योजना के सफल होने की 80% संभावना है: मॉडल में कर और आपके खर्च में बदलाव शामिल नहीं हैं, और असली दुनिया किसी भी मॉडल से बुरी (या बेहतर) हो सकती है। इसे योजनाओं की तुलना करने का तरीक़ा मानें, वादा नहीं।',
        },
        {
          q: 'एक सीधी लकीर ज़्यादातर रास्तों के ऊपर क्यों रहती है?',
          a: 'उतार-चढ़ाव चक्रवृद्धि पर महँगा पड़ता है: 20% का नुक़सान भरपाई के लिए 25% का फ़ायदा माँगता है। इसलिए जो योजना औसतन एक तय रिटर्न देती है, उतार-चढ़ाव के साथ, वह आमतौर पर हर साल वही रिटर्न देने वाली योजना से नीचे ख़त्म होती है। सीधी लकीर चक्रवृद्धि दर लेती है, जो साधारण औसत से पहले ही कम है, और फिर भी लगभग आधे रास्ते उसके नीचे ख़त्म होते हैं।',
        },
        {
          q: 'क्या मेरा डेटा कहीं भेजा जाता है?',
          a: 'नहीं। सिम्युलेशन आपके ब्राउज़र में चलता है और आपके टाइप किए आँकड़े हमें या किसी और को नहीं भेजे जाते। टूल इस्तेमाल करते समय पेज के पते में कुछ नहीं जाता। जब आप "{copyLink}" दबाते हैं, तो आपके आँकड़े लिंक में # के बाद जाते हैं, और पते का वह हिस्सा ब्राउज़र कभी सर्वर को नहीं भेजता; पेज उन्हें एनालिटिक्स शुरू होने से पहले पते से हटा देता है।',
        },
        {
          q: 'क्या यह वित्तीय सलाह है?',
          a: 'नहीं। यह एक पोर्टफ़ोलियो का शैक्षिक मॉडल है। यह नहीं बता सकता कि किसमें निवेश करें, कितना निकालें, या आप कब रिटायर हो सकते हैं।',
        },
      ],
    },
    related: {
      heading: 'आगे पढ़ें',
      cards: {
        'financial-projections': {
          kicker: 'इस टूल के पीछे की सोच',
          title: 'वित्तीय अनुमान',
          desc: 'एक सीधी लकीर क्यों भटकाती है, और उसके बजाय नतीजों का फैलाव कैसे पढ़ें।',
        },
        'what-if-scenarios': {
          kicker: 'अगला क़दम',
          title: 'क्या-अगर के परिदृश्य',
          desc: 'कोई फ़ैसला लेने से पहले, एक बार में एक फ़ैसले को अपनी मौजूदा स्थिति से मिलाकर परखें।',
        },
        'income-replacement-ratio': {
          kicker: 'कितना निकालें',
          title: 'आय की भरपाई का अनुपात',
          desc: 'काम बंद करने के बाद आपकी कमाई का कितना हिस्सा शायद चाहिए होगा।',
        },
        'understanding-risk': {
          kicker: 'बुनियाद',
          title: 'जोखिम को समझना',
          desc: 'उतार-चढ़ाव आपके पैसे के लिए क्या मतलब रखता है, और रिटर्न का क्रम क्यों मायने रखता है।',
        },
        diversification: {
          kicker: 'बुनियाद',
          title: 'विविधीकरण',
          desc: 'दुनिया भर का पोर्टफ़ोलियो किसी भी एक देश से कम उतार-चढ़ाव क्यों दिखाता है।',
        },
      },
    },
  },
  island: {
    currencies: currenciesHi,
    formLabel: 'आपकी योजना',
    fields: {
      currency: 'मुद्रा',
      start: 'आज निवेश की गई रकम',
      startHint: 'आज के पैसे में',
      monthly: 'हर महीने जुड़ने वाली रकम',
      saveYears: 'बचत के साल',
      saveYearsHint: '0 से 60',
      mixBefore: 'मिश्रण: ',
      mixStocks: '{pct}% शेयर',
      mixMiddle: ', ',
      mixBonds: '{pct}% बॉन्ड',
      mixHint: 'हर साल इसी मिश्रण पर पुनर्संतुलित।',
      crossLink: {
        before: 'पैसा कई मुद्राओं में है? पहले ',
        link: 'शुद्ध संपत्ति कैलकुलेटर',
        after: ' से सब जोड़ लें, फिर यहाँ कुल रकम डालें।',
      },
    },
    returns: {
      cautious: 'सतर्क',
      historical: 'ऐतिहासिक',
      optimistic: 'आशावादी',
    },
    returnTips: {
      cautious:
        'शेयर महँगाई के बाद सालाना लगभग {stocks} बढ़ते हैं और बॉन्ड लगभग {bonds}: लंबी अवधि की सीमा का निचला सिरा। उतार-चढ़ाव इतिहास जितने ही बड़े हैं।',
      historical:
        '1900 से 2025 तक के दुनिया के बाज़ार: शेयर महँगाई के बाद सालाना लगभग {stocks} बढ़े और बॉन्ड लगभग {bonds}, और उतार-चढ़ाव वही जो असल में आए।',
      optimistic:
        'शेयर महँगाई के बाद सालाना लगभग {stocks} बढ़ते हैं और बॉन्ड लगभग {bonds}: लंबी अवधि की सीमा का ऊपरी सिरा। उतार-चढ़ाव इतिहास जितने ही बड़े हैं।',
    },
    settings: {
      toggle: 'रिटर्न, शुल्क और रास्ते',
      summary: '{returns} · {fees}% शुल्क · {paths} रास्ते',
      legend: 'रिटर्न',
      feeLabel: 'सालाना शुल्क, %',
      feeHint: 'फ़ंड और प्लेटफ़ॉर्म का शुल्क, जो हर साल के रिटर्न में से कटता है। 0 से {maxFeePct}।',
      pathsLabel: 'सिम्युलेटेड रास्ते',
      pathsHint:
        'ज़्यादा रास्तों से आँकड़े ज़्यादा स्थिर रहते हैं; 10,000 से ऊपर वे ज़्यादा से ज़्यादा कुछ प्रतिशत ही बदलते हैं।',
    },
    withdraw: {
      toggle: 'फिर उसी से गुज़ारा करें',
      off: 'चालू करें और देखें कि पैसा निकालना शुरू करने पर वह कितने समय तक टिकता है।',
      amountLabel: 'हर साल निकाली जाने वाली रकम',
      amountHint: 'आज के पैसे में, हर महीने निकाली जाती है',
      yearsLabel: 'कितने सालों तक',
      yearsHint: '1 से 60',
    },
    actions: {
      copy: 'इस योजना का लिंक कॉपी करें',
      copied: 'लिंक कॉपी हो गया',
      copyPrompt: 'यह लिंक कॉपी करें:',
      reset: 'रीसेट',
      fix: 'नतीजे अपडेट करने के लिए चिह्नित खानों को ठीक कीजिए।',
      running: '{paths} रास्ते चल रहे हैं…',
    },
    quick: {
      medianOne: '1 साल बाद, बीच का नतीजा',
      medianOther: '{years} साल बाद, बीच का नतीजा',
      range: '10 में से 8 रास्ते {low} और {high} के बीच',
      lasted: 'पैसा पूरे {years} साल तक {inTen} रास्तों में टिका।',
    },
    inTen: '10 में से {n}',
    results: {
      headingOne: '1 साल की बचत के बाद',
      headingOther: '{years} साल की बचत के बाद',
      headingToday: 'आज से शुरू',
      lowLabel: 'कम',
      lowMore: ' (10वाँ पर्सेंटाइल): 10 में से 1 रास्ता इसके नीचे ख़त्म हुआ',
      medianLabel: 'बीच का',
      medianMore: ': आधे रास्ते इसके ऊपर ख़त्म हुए, आधे नीचे',
      highLabel: 'ज़्यादा',
      highMore: ' (90वाँ पर्सेंटाइल): 10 में से 1 रास्ता इसके ऊपर ख़त्म हुआ',
      cardsKey:
        'कम और ज़्यादा: 10 में से 1 रास्ता क्रमशः इनसे नीचे या ऊपर ख़त्म हुआ (10वाँ और 90वाँ पर्सेंटाइल)। बीच का: आधे ऊपर ख़त्म हुए, आधे नीचे।',
      noteBefore: 'एक ही तय रिटर्न मानने वाला कैलकुलेटर एक सीधी लकीर खींचता, जो यहाँ ख़त्म होती:',
      noteAfter: '। सिम्युलेटेड रास्तों में से {share} इसके नीचे ख़त्म हुए।',
      empty: 'नतीजों का फैलाव देखने के लिए कुछ साल की बचत जोड़ें, या निकासी चालू कीजिए।',
      lastedHeadBefore: 'सालाना {amount} निकालने पर पैसा पूरे {years} साल तक टिका:',
      lastedHeadAfter: ' सिम्युलेटेड रास्तों में ({share})।',
      runOut:
        'जिन रास्तों में पैसा ख़त्म हुआ, उनमें ख़त्म होने का बीच का साल था: {years} में से साल {year}।',
      caveat:
        'ये {paths} सिम्युलेटेड रास्तों में से गिने गए अनुपात हैं, आपके साथ कुछ होने की संभावना नहीं। मॉडल एक सरलीकरण है; नीचे देखें कि इसमें क्या शामिल नहीं है।',
      caveatFew:
        ' सिर्फ़ {paths} रास्तों पर आँकड़े हज़ारों रास्तों से कई प्रतिशत दूर हो सकते हैं।',
      tableSummary: 'आँकड़े तालिका में देखें',
      tableCaption: 'हर साल के अंत में पोर्टफ़ोलियो की रकम, आज के पैसे में',
      tableYear: 'साल',
      tableLow: 'कम (10वाँ)',
      tableMedian: 'बीच का',
      tableHigh: 'ज़्यादा (90वाँ)',
      tableStraight: 'सीधी लकीर',
    },
    chart: {
      swipe: 'पूरा चार्ट देखने के लिए स्वाइप करें →',
      groupLabel: 'चार्ट। हर साल के आँकड़े पढ़ने के लिए बाएँ और दाएँ तीर की कुंजियाँ इस्तेमाल करें।',
      title: 'सिम्युलेटेड नतीजों का फैलाव',
      desc: '{years} साल में {paths} सिम्युलेटेड रास्तों का पंखे जैसा चार्ट। अंत में 10वाँ पर्सेंटाइल {low}, बीच का {median}, और 90वाँ पर्सेंटाइल {high} है। एक तय रिटर्न वाली सीधी लकीर {straight} पर ख़त्म होती है।',
      livingOff: 'इसी से गुज़ारा',
      axisYears: 'आज से कितने साल बाद',
      endHigh: 'ज़्यादा',
      endMedian: 'बीच का',
      endLow: 'कम',
      readoutYear: 'साल {year}',
      readoutHigh: 'ज़्यादा (90वाँ)',
      readoutMiddle: 'बीच के आधे रास्ते',
      readoutMiddleRange: '{low} से {high}',
      readoutMedian: 'बीच का',
      readoutLow: 'कम (10वाँ)',
      readoutStraight: 'सीधी लकीर',
      announce:
        'साल {year}{phase}। ज़्यादा {high}, बीच के आधे रास्ते {middleLow} से {middleHigh}, बीच का {median}, कम {low}, सीधी लकीर {straight}।',
      phaseStart: 'शुरुआत',
      phaseSaving: 'बचत',
      phaseWithdrawing: 'निकासी का साल {year}',
      legendPaths: '10 में से 8 रास्ते',
      legendMiddle: 'बीच के आधे रास्ते',
      legendMedian: 'बीच की रकम',
      legendStraight: 'एक तय रिटर्न वाली सीधी लकीर',
      legendHint: 'चार्ट पर इशारा करें, उस पर टैप करें, या तीर की कुंजियों से कोई भी साल पढ़िए।',
      clippedLabels:
        ' सबसे हल्की पट्टी चार्ट की ऊपरी सीमा से बाहर निकल जाती है; दाईं ओर का ज़्यादा वाला लेबल दिखाता है कि वह कहाँ ख़त्म होती है।',
      clippedPhone:
        ' सबसे हल्की पट्टी चार्ट की ऊपरी सीमा से बाहर निकल जाती है; किसी भी साल पर टैप करके उसका ज़्यादा वाला आँकड़ा पढ़िए।',
    },
  },
};

/**
 * The Spanish edition. Same shape and the same figures as the English, from
 * the same constants. Words follow `docs/i18n/es-glossary.md`: simulación,
 * trayectoria, mediana, percentil, cartera, valor de la cartera (never saldo),
 * rentabilidad, comisiones, reequilibrio. A withdrawal is a retiro. Percentages
 * take a no-break space before the sign. What stays Latin is what the Hindi
 * keeps: currency codes, `JavaScript`, `CFA Institute`, the sources' authors,
 * titles and exhibit labels, and `nidhi`.
 */
export const monteCarloEs: typeof monteCarloEn = {
  meta: {
    title: 'Simulador Monte Carlo de jubilación gratuito | nidhi',
    description:
      'Simulador Monte Carlo de jubilación gratuito: mira el abanico de resultados posibles, en dinero de hoy. Sin registro.',
  },
  schema: {
    name: 'Simulador Monte Carlo de nidhi',
    alternateNames: ['Calculadora Monte Carlo de jubilación de nidhi', 'Simulador de jubilación de nidhi'],
    operatingSystem: 'Cualquiera (navegador web)',
    browserRequirements: 'Requiere JavaScript. Navegador moderno.',
    featureList: [
      'De {minPaths} a {maxPaths} trayectorias simuladas de rentabilidades anuales',
      'Supuestos de rentabilidad basados en los mercados mundiales de acciones y bonos de 1900 a 2025, con escenarios prudente y optimista',
      'Comisiones anuales',
      'Fase de ahorro y fase de retiros opcional',
      'Combinación de acciones y bonos, con reequilibrio anual',
      'Resultados en dinero de hoy, en 38 monedas',
      'Enlace para compartir cualquier plan',
    ],
  },
  page: {
    breadcrumb: {
      home: 'Inicio',
      freeTools: 'Herramientas gratuitas',
      this: 'Simulador Monte Carlo',
    },
    eyebrow: 'Herramientas gratuitas',
    title: 'Simulador Monte Carlo: el abanico, no una sola línea',
    lead: {
      before: 'Proyecta tus ahorros hacia el futuro miles de veces',
      wide: ', con rentabilidades tomadas del historial a largo plazo de los mercados mundiales. Mira un resultado bajo, la mediana y uno alto, y con qué frecuencia el dinero alcanza una vez que empiezas a vivir de él',
      after: '. Todo se ejecuta en tu navegador; no se envía nada a ningún servidor.',
    },
    limits: {
      heading: 'Lo que esto no puede ver',
      items: {
        onePot: {
          lead: 'Una sola cartera, una sola moneda.',
          rest: ' Si tus ahorros están en más de una moneda, o te vas a jubilar en un lugar que usa otra, el tipo de cambio añade un riesgo que este modelo no incluye.',
        },
        steady: {
          lead: 'Ahorro y gasto constantes.',
          rest: ' La vida real trae una pausa en la carrera, una vivienda, estudios, una herencia. Cada una cambia el resultado, a veces más que los mercados.',
        },
        taxes: {
          lead: 'Sin impuestos, y comisiones simplificadas.',
          rest: ' En la realidad, los impuestos se descuentan en cada trayectoria y dependen de dónde vives y de qué cuentas usas. Las comisiones son un único porcentaje anual; los cargos fijos y puntuales quedan fuera.',
        },
        extremes: {
          lead: 'Extremos más suaves que en la historia.',
          rest: ' Cada año se extrae de forma independiente de una distribución suave, así que las rachas largas de años malos y las caídas como la de 2008 (las acciones mundiales perdieron un 42,9 % descontada la inflación) son aquí más raras de lo que fueron en realidad.',
        },
      },
      more: 'Por qué importa cada una',
    },
    planner: {
      before:
        'El planificador de nidhi hace este tipo de simulación sobre tu situación completa: cada cuenta en su propia moneda, tus ingresos y gastos a lo largo del tiempo, y los acontecimientos que estás planeando.',
      link: 'Únete a la lista de acceso anticipado',
    },
    how: {
      heading: 'Cómo funciona',
      more: 'El método y sus fuentes',
      steps: {
        draws:
          'Cada año simulado extrae una rentabilidad para las acciones y otra para los bonos, descontada la inflación. Sus medias y oscilaciones coinciden con las de los mercados mundiales de 1900 a 2025: acciones, {stocksMean} anual de media con una desviación estándar de {stocksSd}; bonos, {bondsMean} con {bondsSd}. Las dos están ligeramente relacionadas (una correlación de aproximadamente {correlation}). Esa relación ha variado mucho a lo largo de la historia, a veces positiva y a veces negativa, así que esto es una simplificación. «{cautious}» y «{optimistic}» mantienen estas oscilaciones y llevan la rentabilidad compuesta de las acciones al 4 % o al 6 % anual y la de los bonos al 1 % o al 3 %.',
        blend:
          'Tu cartera obtiene la combinación de ambas rentabilidades según la proporción que elijas, con reequilibrio una vez al año, menos tus comisiones anuales. La rentabilidad del año se reparte por igual entre sus doce meses.',
        flows:
          'Tu ahorro mensual entra al principio de cada mes. Si activas los retiros, cuando terminan los años de ahorro sale cada mes una doceava parte de la cantidad anual. Una trayectoria que llega a cero se queda en cero.',
        runs:
          'Esto se repite tantas veces como elijas, {defaultPaths} de forma predeterminada. El gráfico muestra dónde caen las trayectorias cada año: las bandas sombreadas abarcan el 80 % central y el 50 % central de las trayectorias.',
        deterministic:
          'Los mismos datos dan siempre el mismo resultado, así que un enlace compartido muestra exactamente lo que viste.',
      },
      source: {
        before:
          'Fuentes: Elroy Dimson, Paul Marsh y Mike Staunton, «Global Markets over the Last 126 Years» (Exhibits 11.3 y 11.5, de la DMS Database), y Edward F. McQuarrie, «US Stocks and Bonds before 1926» (Exhibit 10.4), en',
        after: ', publicado por la CFA Institute Research Foundation en 2026.',
      },
    },
    faq: {
      heading: 'Preguntas frecuentes',
      items: [
        {
          q: '¿Qué es una simulación Monte Carlo?',
          a: 'En lugar de suponer una única rentabilidad fija cada año, proyecta tu plan miles de veces ({defaultPaths} de forma predeterminada), cada vez con una secuencia aleatoria distinta de años buenos y malos. El resultado es un abanico: cómo podrían ser un resultado bajo, la mediana y uno alto. Muestra cuánto puede variar el resultado, algo que una sola línea oculta.',
        },
        {
          q: '¿De dónde salen los supuestos de rentabilidad?',
          a: 'Del historial a largo plazo de los mercados mundiales de acciones y bonos, de 1900 a 2025, recopilado por Dimson, Marsh y Staunton y reproducido en Exponential Wealth (CFA Institute Research Foundation, 2026). Descontada la inflación, la renta variable mundial obtuvo de media un {stocksMean} anual con una desviación estándar de {stocksSd}, y los bonos mundiales un {bondsMean} con {bondsSd}. El escenario «{historical}» extrae las rentabilidades anuales de una distribución con esas medias y oscilaciones. «{cautious}» y «{optimistic}» mantienen las mismas oscilaciones, pero sitúan la rentabilidad anual compuesta en el extremo bajo y el alto del rango a largo plazo que se usa en los artículos de nidhi: acciones al 4 % o al 6 % anual descontada la inflación, bonos al 1 % o al 3 %. La herramienta no copia ninguna serie histórica.',
        },
        {
          q: '¿Cuántas trayectorias conviene simular?',
          a: 'Con {defaultPaths} hay de sobra: subir a {maxPaths} suele mover las cifras baja, mediana y alta unos pocos puntos porcentuales como mucho, y tarda bastante más, sobre todo en un teléfono. Con menos trayectorias se ve cuánto puede desviarse una muestra pequeña: con {minPaths}, las cifras pueden alejarse varios puntos porcentuales de lo que dan miles de trayectorias.',
        },
        {
          q: '¿Cómo se tienen en cuenta las comisiones?',
          a: 'Como un porcentaje anual del valor de la cartera, descontado de la rentabilidad de cada año, de 0 a {maxFeePct} %. Escribe la suma de los gastos anuales de tu fondo y de la comisión de la plataforma, si la hay. Las comisiones fijas y los cargos puntuales no se modelan.',
        },
        {
          q: '¿Por qué está todo en dinero de hoy?',
          a: 'Todas las rentabilidades son reales, es decir, descontada la inflación. Un resultado de 500.000 significa 500.000 con el poder adquisitivo de hoy, así que puedes compararlo directamente con precios y sueldos que conoces. También significa que tu ahorro mensual y tu retiro anual se mantienen constantes en términos reales, que es aproximadamente lo que ocurre si los subes con la inflación.',
        },
        {
          q: '¿Qué significa «el dinero duró en 8 de cada 10 trayectorias»?',
          a: 'De todas las trayectorias simuladas, 8 de cada 10 pagaron cada retiro completo durante todos los años que elegiste. No es un 80 % de probabilidad de que tu plan funcione: el modelo deja fuera los impuestos y los cambios en tu gasto, y el mundo real puede ser peor (o mejor) que cualquier modelo. Tómalo como una forma de comparar planes, no como una promesa.',
        },
        {
          q: '¿Por qué la línea única queda por encima de la mayoría de las trayectorias?',
          a: 'La volatilidad le resta al efecto del interés compuesto: una pérdida del 20 % necesita una ganancia del 25 % para volver al punto de partida. Por eso, un plan que obtiene de media cierta rentabilidad con altibajos suele terminar por debajo del mismo plan con esa rentabilidad todos los años. La línea única usa la tasa compuesta, que ya es más baja que la media simple, y aun así cerca de la mitad de las trayectorias terminan por debajo de ella.',
        },
        {
          q: '¿Se envían mis datos a algún sitio?',
          a: 'No. La simulación se ejecuta en tu navegador y los números que escribes no se nos envían ni a nosotros ni a nadie más. Mientras usas la herramienta, no se escribe nada en la dirección de la página. Cuando pulsas «{copyLink}», tus valores van en el enlace después del signo #, una parte de la dirección que los navegadores nunca envían a un servidor, y la página los quita de la barra de direcciones antes de que se inicie la analítica.',
        },
        {
          q: '¿Esto es asesoramiento financiero?',
          a: 'No. Es un modelo educativo de una sola cartera. No puede decirte en qué invertir, cuánto retirar ni cuándo puedes jubilarte.',
        },
      ],
    },
    related: {
      heading: 'Para seguir leyendo',
      cards: {
        'financial-projections': {
          kicker: 'La idea detrás de esta herramienta',
          title: 'Proyecciones financieras',
          desc: 'Por qué una sola línea recta engaña, y cómo leer en su lugar un abanico de resultados.',
        },
        'what-if-scenarios': {
          kicker: 'Siguiente paso',
          title: 'Escenarios hipotéticos',
          desc: 'Pon a prueba una decisión cada vez frente a tu situación de partida antes de tomarla.',
        },
        'income-replacement-ratio': {
          kicker: 'Cuánto retirar',
          title: 'Tasa de reemplazo de ingresos',
          desc: 'Qué parte de tus ingresos de la etapa laboral probablemente necesitarás cuando dejes de trabajar.',
        },
        'understanding-risk': {
          kicker: 'Fundamentos',
          title: 'Entender el riesgo',
          desc: 'Qué significa la volatilidad para tu dinero, y por qué importa el orden de las rentabilidades.',
        },
        diversification: {
          kicker: 'Fundamentos',
          title: 'Diversificación',
          desc: 'Por qué una cartera mundial oscila menos que la de cualquier país por separado.',
        },
      },
    },
  },
  island: {
    currencies: currenciesEs,
    formLabel: 'Tu plan',
    fields: {
      currency: 'Moneda',
      start: 'Invertido hoy',
      startHint: 'Dinero de hoy',
      monthly: 'Aportación mensual',
      saveYears: 'Años de ahorro',
      saveYearsHint: 'De 0 a 60',
      mixBefore: 'Combinación: ',
      mixStocks: '{pct} % acciones',
      mixMiddle: ', ',
      mixBonds: '{pct} % bonos',
      mixHint: 'Se reequilibra a esta combinación una vez al año.',
      crossLink: {
        before: '¿Tienes dinero en varias monedas? Súmalo primero con la ',
        link: 'calculadora de patrimonio neto',
        after: ' y luego escribe aquí el total.',
      },
    },
    returns: {
      cautious: 'Prudente',
      historical: 'Histórico',
      optimistic: 'Optimista',
    },
    returnTips: {
      cautious:
        'Las acciones crecen alrededor de un {stocks} anual descontada la inflación y los bonos alrededor de un {bonds}: el extremo bajo del rango a largo plazo. Los altibajos son tan grandes como en la historia.',
      historical:
        'Los mercados mundiales de 1900 a 2025: las acciones crecieron alrededor de un {stocks} anual descontada la inflación y los bonos alrededor de un {bonds}, con los altibajos que tuvieron en realidad.',
      optimistic:
        'Las acciones crecen alrededor de un {stocks} anual descontada la inflación y los bonos alrededor de un {bonds}: el extremo alto del rango a largo plazo. Los altibajos son tan grandes como en la historia.',
    },
    settings: {
      toggle: 'Rentabilidad, comisiones y trayectorias',
      summary: '{returns} · {fees} % de comisiones · {paths} trayectorias',
      legend: 'Rentabilidad',
      feeLabel: 'Comisiones anuales, %',
      feeHint: 'Comisiones del fondo y de la plataforma, descontadas de la rentabilidad de cada año. De 0 a {maxFeePct}.',
      pathsLabel: 'Trayectorias simuladas',
      pathsHint:
        'Más trayectorias dan cifras más estables; por encima de 10.000 cambian unos pocos puntos porcentuales como mucho.',
    },
    withdraw: {
      toggle: 'Después, vivir de ese dinero',
      off: 'Actívalo para ver cuánto dura el dinero una vez que empiezas a retirarlo.',
      amountLabel: 'Retiro anual',
      amountHint: 'Dinero de hoy, retirado cada mes',
      yearsLabel: 'Durante cuántos años',
      yearsHint: 'De 1 a 60',
    },
    actions: {
      copy: 'Copiar un enlace a este plan',
      copied: 'Enlace copiado',
      copyPrompt: 'Copia este enlace:',
      reset: 'Restablecer',
      fix: 'Corrige los campos resaltados para actualizar los resultados.',
      running: 'Simulando {paths} trayectorias…',
    },
    quick: {
      medianOne: 'Mediana tras 1 año',
      medianOther: 'Mediana tras {years} años',
      range: '8 de cada 10 trayectorias entre {low} y {high}',
      lasted: 'El dinero alcanzó para los {years} años en {inTen} trayectorias.',
    },
    inTen: '{n} de cada 10',
    results: {
      headingOne: 'Tras 1 año de ahorro',
      headingOther: 'Tras {years} años de ahorro',
      headingToday: 'Desde hoy',
      lowLabel: 'Bajo',
      lowMore: ' (percentil 10): 1 de cada 10 trayectorias terminó por debajo',
      medianLabel: 'Mediana',
      medianMore: ': la mitad de las trayectorias terminó por encima y la mitad por debajo',
      highLabel: 'Alto',
      highMore: ' (percentil 90): 1 de cada 10 trayectorias terminó por encima',
      cardsKey:
        'Bajo y alto: 1 de cada 10 trayectorias terminó por debajo o por encima (los percentiles 10 y 90). Mediana: la mitad terminó por encima y la mitad por debajo.',
      noteBefore: 'Una calculadora con una única rentabilidad fija trazaría una sola línea hasta',
      noteAfter: '. El {share} de las trayectorias simuladas terminó por debajo.',
      empty: 'Añade algunos años de ahorro, o activa los retiros, para ver un abanico de resultados.',
      lastedHeadBefore: 'Retirando {amount} al año, el dinero alcanzó para los {years} años en',
      lastedHeadAfter: ' trayectorias simuladas ({share}).',
      runOut:
        'En las trayectorias en las que se agotó, la mediana del año en que ocurrió fue el año {year} de {years}.',
      caveat:
        'Son proporciones de {paths} trayectorias simuladas, no la probabilidad de que te ocurra nada. El modelo es una simplificación; más abajo se explica lo que deja fuera.',
      caveatFew:
        ' Con solo {paths} trayectorias, las cifras pueden alejarse varios puntos porcentuales de lo que dan miles de trayectorias.',
      tableSummary: 'Ver las cifras en una tabla',
      tableCaption: 'Valor de la cartera al final de cada año, en dinero de hoy',
      tableYear: 'Año',
      tableLow: 'Bajo (p10)',
      tableMedian: 'Mediana',
      tableHigh: 'Alto (p90)',
      tableStraight: 'Línea única',
    },
    chart: {
      swipe: 'Desliza para ver el gráfico completo →',
      groupLabel: 'Gráfico. Usa las flechas izquierda y derecha del teclado para leer los valores de cada año.',
      title: 'Abanico de resultados simulados',
      desc: 'Gráfico de abanico de {paths} trayectorias simuladas a lo largo de {years} años. Al final, el percentil 10 es {low}, la mediana {median} y el percentil 90 {high}. Una sola línea con rentabilidad fija termina en {straight}.',
      livingOff: 'Viviendo de ese dinero',
      axisYears: 'Años desde hoy',
      endHigh: 'Alto',
      endMedian: 'Mediana',
      endLow: 'Bajo',
      readoutYear: 'Año {year}',
      readoutHigh: 'Alto (p90)',
      readoutMiddle: 'Mitad central',
      readoutMiddleRange: 'De {low} a {high}',
      readoutMedian: 'Mediana',
      readoutLow: 'Bajo (p10)',
      readoutStraight: 'Línea única',
      announce:
        'Año {year}{phase}. Alto {high}, mitad central de {middleLow} a {middleHigh}, mediana {median}, bajo {low}, línea única {straight}.',
      phaseStart: 'Inicio',
      phaseSaving: 'Ahorro',
      phaseWithdrawing: 'Retiros, año {year}',
      legendPaths: '8 de cada 10 trayectorias',
      legendMiddle: 'Mitad central',
      legendMedian: 'Valor mediano de la cartera',
      legendStraight: 'Línea única con rentabilidad fija',
      legendHint: 'Señala el gráfico, tócalo o usa las flechas del teclado para leer cualquier año.',
      clippedLabels:
        ' La banda más clara sobrepasa el borde superior del gráfico; la etiqueta Alto de la derecha indica dónde termina.',
      clippedPhone:
        ' La banda más clara sobrepasa el borde superior del gráfico; toca cualquier año para leer su valor alto.',
    },
  },
};

/**
 * The Czech edition. Same shape and the same figures; vykání and „...“ quotes,
 * per `docs/i18n/cs-glossary.md`: simulace, trajektorie, výběr, po odečtení
 * inflace, medián, poměr akcií a dluhopisů, rebalancování.
 *
 * Counts the code fills without picking a form (`{paths}`, `{years}`) sit
 * where every form of the noun reads right: after *z* or *po* (*z 10 000
 * trajektorií*, *po 3 letech*), or in brackets after a label (*počet let:
 * {years}*). Path counts are always 5 or more, so *trajektorií* is right for
 * every one the tool offers.
 */
export const monteCarloCs: typeof monteCarloEn = {
  meta: {
    title: 'Simulátor Monte Carlo pro důchod: zdarma, v prohlížeči | nidhi',
    description:
      'Důchodový simulátor Monte Carlo zdarma: rozpětí možných výsledků, v dnešních penězích. Bez registrace.',
  },
  schema: {
    name: 'Simulátor Monte Carlo nidhi',
    alternateNames: ['Důchodová kalkulačka Monte Carlo nidhi', 'Důchodový simulátor nidhi'],
    operatingSystem: 'Libovolný operační systém (webový prohlížeč)',
    browserRequirements: 'Vyžaduje JavaScript. Moderní prohlížeč.',
    featureList: [
      '{minPaths} až {maxPaths} simulovaných trajektorií ročních výnosů',
      'Předpoklady výnosů ze světových akciových a dluhopisových trhů v letech 1900 až 2025, s opatrným a optimistickým nastavením',
      'Roční poplatky',
      'Fáze spoření a volitelná fáze výběrů',
      'Poměr akcií a dluhopisů, rebalancovaný jednou ročně',
      'Výsledky v dnešních penězích, ve 38 měnách',
      'Odkaz ke sdílení libovolného plánu',
    ],
  },
  page: {
    breadcrumb: {
      home: 'Domů',
      freeTools: 'Nástroje zdarma',
      this: 'Simulátor Monte Carlo',
    },
    eyebrow: 'Nástroje zdarma',
    title: 'Simulátor Monte Carlo: rozpětí, ne jedna čára',
    lead: {
      before: 'Nasimulujte budoucí vývoj svých úspor v tisících variant',
      wide: ' s výnosy vybíranými z dlouhodobé historie světových trhů. Uvidíte nízký, mediánový a vysoký výsledek a jak často peníze vydrží, až z nich budete žít',
      after: '. Vše běží ve vašem prohlížeči; nic se neposílá na server.',
    },
    limits: {
      heading: 'Co tento model nevidí',
      items: {
        onePot: {
          lead: 'Jedno portfolio, jedna měna.',
          rest: ' Pokud jsou vaše úspory ve více než jedné měně nebo budete v důchodu žít tam, kde se platí jinou, přidávají směnné kurzy riziko, které tento model nezahrnuje.',
        },
        steady: {
          lead: 'Stálé spoření a utrácení.',
          rest: ' Ve skutečném životě přichází přestávka v kariéře, dům, školné nebo dědictví. Každá taková věc výsledek změní, někdy víc než trhy.',
        },
        taxes: {
          lead: 'Žádné daně a jednoduché poplatky.',
          rest: ' Daně snižují výsledek každé skutečné trajektorie a závisí na tom, kde žijete a jaké účty používáte. Poplatky model zachycuje jedinou roční procentní sazbou; pevné a jednorázové poplatky vynechává.',
        },
        extremes: {
          lead: 'Klidnější extrémy než v historii.',
          rest: ' Roky se losují nezávisle z hladkého rozdělení, takže dlouhé série špatných let a propady jako v roce 2008 (světové akcie −42,9 % po odečtení inflace) jsou tu vzácnější, než byly ve skutečnosti.',
        },
      },
      more: 'Proč na každém z nich záleží',
    },
    planner: {
      before:
        'Plánovač nidhi provádí tento druh simulace pro celou vaši finanční situaci: každý účet v jeho vlastní měně, vaše příjmy a výdaje v čase a události, na které se připravujete.',
      link: 'Zapište se na čekací listinu pro přednostní přístup',
    },
    how: {
      heading: 'Jak to funguje',
      more: 'Metoda a její zdroje',
      steps: {
        draws:
          'Každý simulovaný rok vylosuje výnos akcií a výnos dluhopisů po odečtení inflace. Jejich průměry a výkyvy odpovídají světovým trhům v letech 1900 až 2025: akcie v průměru {stocksMean} ročně se směrodatnou odchylkou {stocksSd}, dluhopisy {bondsMean} s {bondsSd}. Obojí je mírně provázané (korelace zhruba {correlation}). Tato vazba se v historii výrazně měnila, byla kladná i záporná, takže jde o zjednodušení. „{cautious}“ a „{optimistic}“ ponechávají tyto výkyvy a posouvají složený výnos akcií na 4 % nebo 6 % ročně a dluhopisů na 1 % nebo 3 %.',
        blend:
          'Výnos vašeho portfolia odpovídá zvolenému poměru obou tříd aktiv, který se jednou ročně rebalancuje, po odečtení ročních poplatků. Výnos za daný rok se rozloží rovnoměrně do jeho dvanácti měsíců.',
        flows:
          'Měsíční vklad se přidává na začátku každého měsíce. Pokud zapnete výběry, po skončení let spoření se každý měsíc vybere dvanáctina roční částky. Trajektorie, která klesne na nulu, na nule zůstane.',
        runs:
          'Simulace se opakuje tolikrát, kolikrát zvolíte; výchozí počet opakování je {defaultPaths}. Graf ukazuje, kde se trajektorie v jednotlivých letech nacházejí: stínované pásy zahrnují prostředních 8 z 10 trajektorií a jejich prostřední polovinu.',
        deterministic:
          'Stejné vstupy vždy dají stejný výsledek, takže sdílený odkaz ukáže přesně stejný výsledek.',
      },
      source: {
        before:
          'Zdroje: Elroy Dimson, Paul Marsh a Mike Staunton, „Global Markets over the Last 126 Years“ (Exhibits 11.3 a 11.5, z databáze DMS), a Edward F. McQuarrie, „US Stocks and Bonds before 1926“ (Exhibit 10.4), v publikaci',
        after: ', CFA Institute Research Foundation, 2026.',
      },
    },
    faq: {
      heading: 'Časté dotazy',
      items: [
        {
          q: 'Co je simulace Monte Carlo?',
          a: 'Místo předpokladu jednoho pevného výnosu každý rok model nasimuluje budoucí vývoj vašeho plánu v tisících variant (ve výchozím nastavení {defaultPaths}), pokaždé s jiným náhodným sledem dobrých a špatných let. Výsledkem je rozpětí: jak by mohl vypadat nízký, mediánový a vysoký výsledek. Ukazuje, jak moc se výsledek může lišit, což jedna čára skryje.',
        },
        {
          q: 'Odkud pocházejí předpoklady výnosů?',
          a: 'Z dlouhodobé historie světových akciových a dluhopisových trhů v letech 1900 až 2025, kterou sestavili Dimson, Marsh a Staunton a která vyšla v publikaci Exponential Wealth (CFA Institute Research Foundation, 2026). Po odečtení inflace měly světové akcie průměrný výnos {stocksMean} ročně se směrodatnou odchylkou {stocksSd} a světové dluhopisy {bondsMean} s {bondsSd}. Nastavení „{historical}“ losuje roční výnosy z rozdělení s těmito průměry a výkyvy. „{cautious}“ a „{optimistic}“ ponechávají stejné výkyvy, ale nastavují složený roční výnos na dolní a horní okraj dlouhodobého rozpětí, které používají články nidhi: akcie 4 % nebo 6 % ročně po odečtení inflace, dluhopisy 1 % nebo 3 %. Žádná historická řada se do nástroje nekopíruje.',
        },
        {
          q: 'Kolik trajektorií spustit?',
          a: 'Výchozí počet {defaultPaths} bohatě stačí: zvýšení počtu na {maxPaths} obvykle posune nízký, mediánový a vysoký výsledek nanejvýš o pár procent a trvá znatelně déle, zvlášť na telefonu. Menší počet trajektorií ukazuje, jak daleko se může malý vzorek odchýlit: při počtu {minPaths} mohou být výsledky o několik procent jinde než u tisíců trajektorií.',
        },
        {
          q: 'Jak se počítají poplatky?',
          a: 'Jako roční procento z hodnoty portfolia, odečtené od výnosu každého roku, od 0 do {maxFeePct} %. Běžně se zadává součet průběžných nákladů fondu a případného poplatku platformy. Pevné a jednorázové poplatky se nemodelují.',
        },
        {
          q: 'Proč je vše v dnešních penězích?',
          a: 'Všechny výnosy jsou reálné, po odečtení inflace. Výsledek 500 000 znamená 500 000 v dnešní kupní síle, takže ho lze přímo porovnat s cenami a platy, které znáte. Znamená to také, že měsíční vklad a roční výběr zůstávají v reálném vyjádření stálé, což zhruba odpovídá tomu, když je s inflací zvyšujete.',
        },
        {
          q: 'Co znamená „peníze vydržely v 8 z 10 trajektorií“?',
          a: 'Ze všech simulovaných trajektorií 8 z 10 vyplatilo každý výběr v plné výši po všechny zvolené roky. Není to 80% šance, že váš plán vyjde: model vynechává daně a změny vašich výdajů a skutečný svět může být horší (nebo lepší) než jakýkoli model. Berte to jako způsob, jak porovnávat plány, ne jako slib.',
        },
        {
          q: 'Proč jedna čára leží nad většinou trajektorií?',
          a: 'Kolísání ubírá ze složeného úročení: po ztrátě 20 % je potřeba zisk 25 %, aby se hodnota vrátila na původní úroveň. Plán, který má daný průměrný výnos se vzestupy a poklesy, proto obvykle skončí níž než stejný plán s tímto výnosem každý rok. Jedna čára používá složenou sazbu, která je už nižší než prostý průměr, a přesto pod ní skončí téměř polovina trajektorií.',
        },
        {
          q: 'Posílají se moje data někam?',
          a: 'Ne. Simulace běží ve vašem prohlížeči a čísla, která zadáte, se neposílají nám ani nikomu jinému. Při používání nástroje se do adresy stránky nic nezapisuje. Když stisknete „{copyLink}“, vaše hodnoty se vloží do odkazu za znak #, do části adresy, kterou prohlížeče nikdy neposílají na server, a stránka je odstraní z adresního řádku dřív, než se spustí analytika.',
        },
        {
          q: 'Je to finanční poradenství?',
          a: 'Ne. Je to vzdělávací model jednoho portfolia. Nedokáže říct, do čeho investovat, kolik vybírat ani kdy můžete odejít do důchodu.',
        },
      ],
    },
    related: {
      heading: 'Čtěte dál',
      cards: {
        'financial-projections': {
          kicker: 'Princip tohoto nástroje',
          title: 'Finanční projekce',
          desc: 'Proč jedna přímka klame a jak místo toho číst rozpětí výsledků.',
        },
        'what-if-scenarios': {
          kicker: 'Další krok',
          title: 'Scénáře „co kdyby“',
          desc: 'Jak předem otestovat vždy jedno rozhodnutí v porovnání s výchozím stavem.',
        },
        'income-replacement-ratio': {
          kicker: 'Kolik vybírat',
          title: 'Míra náhrady příjmu',
          desc: 'Jaký podíl pracovního příjmu budete pravděpodobně potřebovat, až pracovat přestanete.',
        },
        'understanding-risk': {
          kicker: 'Základy',
          title: 'Riziko srozumitelně',
          desc: 'Co kolísání znamená pro vaše peníze a proč záleží na pořadí výnosů.',
        },
        diversification: {
          kicker: 'Základy',
          title: 'Diverzifikace',
          desc: 'Proč světové portfolio kolísá méně než portfolio kterékoli jednotlivé země.',
        },
      },
    },
  },
  island: {
    currencies: currenciesCs,
    formLabel: 'Váš plán',
    fields: {
      currency: 'Měna',
      start: 'Investováno dnes',
      startHint: 'V dnešních penězích',
      monthly: 'Vklad každý měsíc',
      saveYears: 'Počet let spoření',
      saveYearsHint: '0 až 60',
      mixBefore: 'Poměr: ',
      mixStocks: '{pct} % akcií',
      mixMiddle: ', ',
      mixBonds: '{pct} % dluhopisů',
      mixHint: 'Jednou ročně se rebalancuje zpět na tento poměr.',
      crossLink: {
        before: 'Peníze ve více měnách? Nejdřív je sečtěte v ',
        link: 'kalkulačce čistého jmění',
        after: ' a sem zadejte celkovou částku.',
      },
    },
    returns: {
      cautious: 'Opatrný',
      historical: 'Historický',
      optimistic: 'Optimistický',
    },
    returnTips: {
      cautious:
        'Akcie rostou zhruba o {stocks} ročně po odečtení inflace a dluhopisy zhruba o {bonds}: dolní okraj dlouhodobého rozpětí. Vzestupy a poklesy jsou stejně velké jako v historii.',
      historical:
        'Světové trhy v letech 1900 až 2025: akcie rostly zhruba o {stocks} ročně po odečtení inflace a dluhopisy zhruba o {bonds}, se vzestupy a poklesy, které skutečně měly.',
      optimistic:
        'Akcie rostou zhruba o {stocks} ročně po odečtení inflace a dluhopisy zhruba o {bonds}: horní okraj dlouhodobého rozpětí. Vzestupy a poklesy jsou stejně velké jako v historii.',
    },
    settings: {
      toggle: 'Výnosy, poplatky a trajektorie',
      summary: '{returns} · poplatky {fees} % · trajektorie: {paths}',
      legend: 'Odhad výnosu',
      feeLabel: 'Roční poplatky, %',
      feeHint: 'Poplatky fondu a platformy, odečtené od výnosu každého roku. 0 až {maxFeePct}.',
      pathsLabel: 'Simulované trajektorie',
      pathsHint:
        'Více trajektorií dává stabilnější čísla; nad 10 000 se mění nanejvýš o pár procent.',
    },
    withdraw: {
      toggle: 'Potom z toho žít',
      off: 'Zapněte a uvidíte, jak dlouho peníze vydrží, až z nich začnete vybírat.',
      amountLabel: 'Výběr každý rok',
      amountHint: 'V dnešních penězích, vybíráno měsíčně',
      yearsLabel: 'Na kolik let',
      yearsHint: '1 až 60',
    },
    actions: {
      copy: 'Kopírovat odkaz na tento plán',
      copied: 'Odkaz zkopírován',
      copyPrompt: 'Zkopírujte tento odkaz:',
      reset: 'Obnovit výchozí',
      fix: 'Opravte zvýrazněná pole a výsledky se aktualizují.',
      running: 'Probíhá simulace, počet trajektorií: {paths}…',
    },
    quick: {
      medianOne: 'Medián po 1 roce',
      medianOther: 'Medián po {years} letech',
      range: '8 z 10 trajektorií mezi {low} a {high}',
      lasted: 'Peníze vydržely po celou dobu (počet let: {years}) v {inTen} trajektorií.',
    },
    inTen: '{n} z 10',
    results: {
      headingOne: 'Po 1 roce spoření',
      headingOther: 'Po {years} letech spoření',
      headingToday: 'Od dneška',
      lowLabel: 'Nízký',
      lowMore: ' (10. percentil): 1 z 10 trajektorií skončila níž',
      medianLabel: 'Medián',
      medianMore: ': polovina trajektorií skončila výš, polovina níž',
      highLabel: 'Vysoký',
      highMore: ' (90. percentil): 1 z 10 trajektorií skončila výš',
      cardsKey:
        'Nízký a vysoký: 1 z 10 trajektorií skončila níž, nebo výš (10. a 90. percentil). Medián: polovina skončila výš, polovina níž.',
      noteBefore: 'Kalkulačka s jedním pevným výnosem by nakreslila jedinou čáru až k',
      noteAfter: '. {share} simulovaných trajektorií skončilo pod ní.',
      empty: 'Přidejte nějaké roky spoření nebo zapněte výběry a uvidíte rozpětí výsledků.',
      lastedHeadBefore: 'Při výběru {amount} ročně vydržely peníze po celou dobu (počet let: {years}) v',
      lastedHeadAfter: ' simulovaných trajektorií ({share}).',
      runOut:
        'U trajektorií, kde peníze došly, to v mediánu nastalo v roce {year} z {years}.',
      caveat:
        'Jde o podíly v simulaci s tímto počtem trajektorií: {paths}. Nejde o pravděpodobnost, že se vám něco stane. Model je zjednodušení; co vynechává, najdete níže.',
      caveatFew:
        ' Při takto malém počtu trajektorií ({paths}) mohou být výsledky o několik procent jinde než u tisíců trajektorií.',
      tableSummary: 'Zobrazit čísla jako tabulku',
      tableCaption: 'Hodnota na konci každého roku, v dnešních penězích',
      tableYear: 'Rok',
      tableLow: 'Nízký (10.)',
      tableMedian: 'Medián',
      tableHigh: 'Vysoký (90.)',
      tableStraight: 'Jedna čára',
    },
    chart: {
      swipe: 'Přejeďte prstem a uvidíte celý graf →',
      groupLabel: 'Graf. Hodnoty pro jednotlivé roky přečtete šipkami doleva a doprava.',
      title: 'Rozpětí simulovaných výsledků',
      desc: 'Vějířový graf simulovaných trajektorií (počet: {paths}, počet let: {years}). Na konci je 10. percentil {low}, medián {median} a 90. percentil {high}. Jedna čára s pevným výnosem končí na {straight}.',
      livingOff: 'Život z úspor',
      axisYears: 'Roky od dneška',
      endHigh: 'Vysoký',
      endMedian: 'Medián',
      endLow: 'Nízký',
      readoutYear: 'Rok {year}',
      readoutHigh: 'Vysoký (90.)',
      readoutMiddle: 'Prostřední polovina',
      readoutMiddleRange: '{low} až {high}',
      readoutMedian: 'Medián',
      readoutLow: 'Nízký (10.)',
      readoutStraight: 'Jedna čára',
      announce:
        'Rok {year}{phase}. Vysoký {high}, prostřední polovina {middleLow} až {middleHigh}, medián {median}, nízký {low}, jedna čára {straight}.',
      phaseStart: 'Začátek',
      phaseSaving: 'Spoření',
      phaseWithdrawing: 'Výběry, rok {year}',
      legendPaths: '8 z 10 trajektorií',
      legendMiddle: 'Prostřední polovina',
      legendMedian: 'Medián hodnoty',
      legendStraight: 'Jedna čára s pevným výnosem',
      legendHint: 'Ukažte na graf, klepněte na něj nebo použijte šipky a přečtete kterýkoli rok.',
      clippedLabels:
        ' Nejsvětlejší pás přesahuje horní okraj grafu; popisek „Vysoký“ vpravo ukazuje, kde končí.',
      clippedPhone:
        ' Nejsvětlejší pás přesahuje horní okraj grafu; klepnutím na kterýkoli rok přečtete jeho vysokou hodnotu.',
    },
  },
};
