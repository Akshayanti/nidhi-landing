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
import { currenciesEn, currenciesHi } from './currencies.ts';

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
      "Results in today's money, in 29 currencies",
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
    /** The 29 currency names, shared by the three tools: see `./currencies.ts`. */
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
        'Stocks grow about 4% a year after inflation and bonds about 1%: the low end of the long-run range. The ups and downs are as large as in history.',
      historical:
        'World markets from 1900 to 2025: stocks grew about 5.3% a year after inflation and bonds about 1.7%, with the ups and downs they actually had.',
      optimistic:
        'Stocks grow about 6% a year after inflation and bonds about 3%: the high end of the long-run range. The ups and downs are as large as in history.',
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
      'शेयर और बॉन्ड का मिश्रण, हर साल पुनर्संतुलित',
      'नतीजे आज के पैसे में, 29 मुद्राओं में',
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
          lead: 'इतिहास की तुलना में शांत चरम।',
          rest: ' हर साल का रिटर्न दूसरे सालों से स्वतंत्र रूप से, एक सहज, बिना अचानक झटकों वाले वितरण से निकाला जाता है। उतार-चढ़ाव पूरा रहता है, पर लगातार ख़राब सालों की लंबी कतारें और 2008 जैसी गिरावटें (दुनिया के शेयर महँगाई के बाद -42.9%) यहाँ असल इतिहास से कम आती हैं।',
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
          'यह उतनी बार दोहराया जाता है जितनी बार आप चुनें, डिफ़ॉल्ट रूप से {defaultPaths} बार। चार्ट दिखाता है कि हर साल रास्ते कहाँ पड़ते हैं: छायादार पट्टियों में बीच वाले 10 में से 8 रास्ते हैं, और बीच के आधे रास्ते।',
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
          a: 'हर साल एक तय रिटर्न मानने के बजाय यह आपकी योजना को हज़ारों बार आगे चलाता है ({defaultPaths} बार, डिफ़ॉल्ट रूप से), हर बार अच्छे और बुरे सालों का एक अलग क्रम लेकर। नतीजा एक फैलाव है: कम, बीच का और ज़्यादा वाला नतीजा कैसा हो सकता है। यह दिखाता है कि नतीजा कितना बदल सकता है, जो एक सीधी लकीर छिपा देती है।',
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
          a: 'सारे सिम्युलेटेड रास्तों में से 10 में से 8 ने आपके चुने हुए सारे सालों तक हर निकासी पूरी दी। इसका मतलब यह नहीं कि आपकी योजना के सफल होने की 80% संभावना है: मॉडल में कर और आपके खर्च में बदलाव शामिल नहीं हैं, और असली दुनिया किसी भी मॉडल से बुरी (या बेहतर) हो सकती है। इसे योजनाओं की तुलना करने का तरीक़ा मानिए, वादा नहीं।',
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
          a: 'नहीं। यह एक पोर्टफ़ोलियो का शैक्षिक मॉडल है। यह नहीं बता सकता कि किसमें निवेश करें, कितना निकालें, या कब रिटायर हो सकते हैं।',
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
        'शेयर महँगाई के बाद सालाना लगभग 4% बढ़ते हैं और बॉन्ड लगभग 1%: लंबी अवधि की सीमा का निचला सिरा। उतार-चढ़ाव इतिहास जितने ही बड़े हैं।',
      historical:
        '1900 से 2025 तक के दुनिया के बाज़ार: शेयर महँगाई के बाद सालाना लगभग 5.3% बढ़े और बॉन्ड लगभग 1.7%, और उतार-चढ़ाव वही जो असल में आए।',
      optimistic:
        'शेयर महँगाई के बाद सालाना लगभग 6% बढ़ते हैं और बॉन्ड लगभग 3%: लंबी अवधि की सीमा का ऊपरी सिरा। उतार-चढ़ाव इतिहास जितने ही बड़े हैं।',
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
      off: 'चालू कीजिए और देखिए कि पैसा निकालना शुरू करने पर वह कितने समय तक टिकता है।',
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
        'कम और ज़्यादा: 10 में से 1 रास्ता इसके नीचे या ऊपर ख़त्म हुआ (10वाँ और 90वाँ पर्सेंटाइल)। बीच का: आधे ऊपर ख़त्म हुए, आधे नीचे।',
      noteBefore: 'एक ही तय रिटर्न मानने वाला कैलकुलेटर एक सीधी लकीर खींचता, जो यहाँ ख़त्म होती:',
      noteAfter: '। सिम्युलेटेड रास्तों में से {share} इसके नीचे ख़त्म हुए।',
      empty: 'नतीजों का फैलाव देखने के लिए कुछ साल की बचत जोड़िए, या निकासी चालू कीजिए।',
      lastedHeadBefore: 'सालाना {amount} निकालने पर पैसा पूरे {years} साल तक टिका:',
      lastedHeadAfter: ' सिम्युलेटेड रास्तों में ({share})।',
      runOut:
        'जिन रास्तों में पैसा ख़त्म हुआ, उनमें ख़त्म होने का बीच का साल था: {years} में से साल {year}।',
      caveat:
        'ये {paths} सिम्युलेटेड रास्तों में से गिने गए अनुपात हैं, आपके साथ कुछ होने की संभावना नहीं। मॉडल एक सरलीकरण है; नीचे देखिए कि इसमें क्या शामिल नहीं है।',
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
      desc: '{years} सालों में {paths} सिम्युलेटेड रास्तों का पंखे जैसा चार्ट। अंत में 10वाँ पर्सेंटाइल {low}, बीच का {median}, और 90वाँ पर्सेंटाइल {high} है। एक तय रिटर्न वाली सीधी लकीर {straight} पर ख़त्म होती है।',
      livingOff: 'इसी से गुज़ारा',
      axisYears: 'आज से साल',
      endHigh: 'ज़्यादा',
      endMedian: 'बीच का',
      endLow: 'कम',
      readoutYear: 'साल {year}',
      readoutHigh: 'ज़्यादा (90वाँ)',
      readoutMiddle: 'बीच का आधा',
      readoutMiddleRange: '{low} से {high}',
      readoutMedian: 'बीच का',
      readoutLow: 'कम (10वाँ)',
      readoutStraight: 'सीधी लकीर',
      announce:
        'साल {year}{phase}। ज़्यादा {high}, बीच का आधा {middleLow} से {middleHigh}, बीच का {median}, कम {low}, सीधी लकीर {straight}।',
      phaseStart: 'शुरुआत',
      phaseSaving: 'बचत',
      phaseWithdrawing: 'निकासी का साल {year}',
      legendPaths: '10 में से 8 रास्ते',
      legendMiddle: 'बीच का आधा',
      legendMedian: 'बीच की रकम',
      legendStraight: 'एक तय रिटर्न वाली सीधी लकीर',
      legendHint: 'चार्ट पर इशारा कीजिए, उस पर टैप कीजिए, या तीर की कुंजियों से कोई भी साल पढ़िए।',
      clippedLabels:
        ' सबसे हल्की पट्टी चार्ट की ऊपरी सीमा से बाहर निकल जाती है; दाईं ओर का ज़्यादा वाला लेबल दिखाता है कि वह कहाँ ख़त्म होती है।',
      clippedPhone:
        ' सबसे हल्की पट्टी चार्ट की ऊपरी सीमा से बाहर निकल जाती है; किसी भी साल पर टैप करके उसका ज़्यादा वाला आँकड़ा पढ़िए।',
    },
  },
};
