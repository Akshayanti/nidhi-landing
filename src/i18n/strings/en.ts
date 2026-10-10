/**
 * The English catalog, and the single source of truth for the site's strings.
 *
 * `src/i18n/strings/types.ts` derives `Dict` from this object, so every other
 * catalog must carry exactly these keys. Add a string here first, then
 * translate it.
 *
 * Deliberately not `as const`: with literal types every translated value would
 * have to equal the English literal.
 */
export const en = {
  skipToContent: 'Skip to content',

  /**
   * Site-wide defaults for the document head. `BaseHead` falls back to
   * `defaultImageAlt` whenever a page passes no `imageAlt` of its own, which is
   * every page but the home page, so it has to read in the page's language
   * rather than stay an English literal inside the component.
   */
  meta: {
    defaultImageAlt: 'nidhi: Money, understood. Personal finance tools and financial literacy.',
  },

  /**
   * The language picker. Only the two words around the choice are translated:
   * the languages themselves are named in their own script, the same string in
   * every catalog, so they live in LOCALE_META in src/i18n/config.ts and adding
   * a locale does not add a string here.
   */
  languagePicker: {
    /** Leads the control in the header: "Language: English". */
    label: 'Language',
    /** Spoken after the language you are reading, which the check mark shows. */
    current: 'current language',
  },

  nav: {
    /** `aria-label` on the header's nav. */
    primaryLabel: 'Primary',
    /** `aria-label` on the phone sheet, and on the button that opens it. */
    menuLabel: 'Menu',
    /** The button's label while the sheet is open. */
    menuCloseLabel: 'Close menu',
    /** `aria-label` on the logo link. The wordmark beside it says "nidhi". */
    homeLabel: 'nidhi home',
    /** Read out after a link that opens a new tab. */
    newTabHint: ' (opens in a new tab)',
    /**
     * The sheet's group headings and the two desktop dropdown buttons. The
     * two that appear in both places are separate keys on purpose: they are
     * separate surfaces, the desktop button is uppercased by CSS, and a
     * translation is free to word them differently.
     */
    groups: { learn: 'Learn', tools: 'Free tools', about: 'About', language: 'Language' },
    buttons: { tools: 'Free Tools', learn: 'Learn' },
    /** The wording every surface uses, unless `menu` overrides it. */
    items: {
      blog: 'Learning path',
      blogTopics: 'Browse topics',
      learnEditorial: 'How lessons are written',
      multiCurrencyNetWorth: 'Net worth calculator',
      loanComparison: 'Loan comparison',
      monteCarloSimulator: 'Monte Carlo simulator',
      allTools: 'All free tools',
      about: 'About nidhi',
      beliefs: 'Our beliefs',
      editorialPolicy: 'Editorial policy',
      contact: 'Contact us',
      email: 'Email',
      instagram: 'Instagram',
    },
    /**
     * The desktop dropdown's own wording, for the entries whose label differs
     * from the sheet's. Title Case here against the sheet's sentence case is
     * what the site already shipped, so it is kept as it is.
     */
    menu: {
      multiCurrencyNetWorth: 'Net Worth Calculator',
      loanComparison: 'Loan Comparison',
      monteCarloSimulator: 'Monte Carlo Simulator',
      allTools: 'View all free tools',
    },
  },

  footer: {
    tagline: 'Money, understood',
    columns: {
      learn: 'Learn',
      tools: 'Free Tools',
      product: 'Product',
      about: 'About',
      connect: 'Connect',
    },
    links: {
      blog: 'Learning path',
      blogTopics: 'Browse topics',
      multiCurrencyNetWorth: 'Net worth calculator',
      loanComparison: 'Loan comparison',
      monteCarloSimulator: 'Monte Carlo simulator',
      allTools: 'View all',
      home: 'Home',
      about: 'About nidhi',
      beliefs: 'Our Beliefs',
      editorialPolicy: 'Editorial policy',
      privacy: 'Privacy',
      cookieSettings: 'Cookie settings',
    },
    disclaimerShort:
      'nidhi provides educational information and tools to help you understand your money. It is not a licensed financial adviser.',
    disclaimerLong:
      "The content and tools are educational and shouldn't be treated as professional financial, investment, or tax advice. Past performance of any investment is not indicative of future results. For decisions that matter, consult a qualified professional.",
    copyright: '© {year} nidhi. All rights reserved.',
  },

  cookie: {
    dialogLabel: 'Cookie consent',
    /**
     * The prompt, split around the emphasised word so that no catalog entry
     * has to carry markup. Keep the space at the end of `textBefore` and the
     * one at the start of `textAfter`.
     */
    textBefore: 'We count anonymous pageviews either way, to see what’s helping. Can we also record ',
    textEmphasis: 'clicks',
    textAfter: ' so we can spot broken links and layouts that confuse people? No ads, no data sold.',
    privacyLink: 'See what we actually collect →',
    decline: 'No thanks',
    accept: 'Sure, that’s fine',
  },

  theme: {
    groupLabel: 'Theme',
    light: 'Light',
    lightTitle: 'Light theme',
    system: 'System',
    systemTitle: 'Follow system theme',
    dark: 'Dark',
    darkTitle: 'Dark theme',
  },

  rss: {
    /** The feed's title, as a feed reader shows it. */
    title: 'nidhi | Personal Finance Blog',
  },

  // ---------------------------------------------------------------------
  // Page copy. One namespace per page, named after the page, carrying both
  // what the reader sees and what the page's JSON-LD says, so a page's
  // language and its structured data cannot drift apart.
  // ---------------------------------------------------------------------

  about: {
    meta: {
      title: 'About nidhi: Who Writes This and Why You Can Trust It | nidhi',
      description:
        'Who writes nidhi, the qualifications behind the writing, and how every personal finance post is researched and sourced.',
    },
    schema: {
      name: 'About nidhi',
      description:
        'Who writes nidhi, why the writing can be trusted, and how each post is researched and sourced.',
      organization:
        'Practitioner and research-led personal finance education on nidhi.today, covering net worth, multi-currency money management, and financial independence. Builds the tools the posts describe and sources every article against cited references.',
      /**
       * Read in this order into the JSON-LD `knowsAbout` array, so reordering
       * here reorders the structured data. Named keys rather than an array so
       * a translator sees what each entry is.
       */
      knowsAbout: {
        personalFinance: 'Personal Finance',
        financialLiteracy: 'Financial Literacy',
        netWorthTracking: 'Net Worth Tracking',
        multiCurrencyFinance: 'Multi-Currency Finance',
        financialIndependence: 'Financial Independence',
        moneyManagement: 'Money Management',
      },
      breadcrumbHome: 'Home',
      breadcrumbAbout: 'About',
    },
    title: 'About nidhi',
    intro:
      'nidhi is the name on this writing, and the project it belongs to. One person started it, the name stuck, and it is who you are reading when you read the lessons.',
    sections: {
      whoIsWriting: 'Who is writing',
      whyYouCanTrustIt: 'Why you can trust it',
      howPostsAreMade: 'How posts are made',
      whatNidhiKnowsAbout: 'What nidhi knows about',
    },
    body: {
      whoIsWriting:
        'Every post on this site is written and edited under one name: nidhi. The project began because one person could not find a finance tool that handled an ordinary life with money in more than one currency, debts in another, and a future that crossed borders. The writing comes from that same place: the questions a real person actually has to answer, explained the way they wished someone had explained them.',
      whyYouCanTrustIt1:
        'The authority here is practitioner and research-led, not a wall of letters after a name. nidhi builds the tools that the posts describe, which means the writing is grounded in working through the numbers, not in repeating talking points. Where a post makes a claim, it points to the source: the books, reference pages, and primary material listed on each article under "referential reading."',
      whyYouCanTrustIt2:
        'What this is not: licensed financial advice. nidhi explains how money works so you can make your own decisions. It does not tell you which fund to buy, and it never will. For decisions that turn on your specific tax residency, legal situation, or risk tolerance, a qualified professional is the right call. That boundary is deliberate, and it is the same one stated in the footer of every page.',
      /**
       * Sentences with a link inside them are split into three parts, so a
       * translation can put the link where its own clause order wants it. The
       * two languages do not have to agree: Hindi writes "... पढ़नी हो तो
       * हमारे सिद्धांत पढ़ें।" where English writes "... read our beliefs.",
       * with the verb landed after the link rather than before it. A single
       * format string with a placeholder could not move a link across a verb,
       * nor put the closing punctuation on the side the target language wants
       * it. `before` ends with a space; `after` starts with whatever the link
       * needs, which for the editorial-policy sentence is a leading space.
       */
      howPostsAreMade: {
        before:
          'Each article starts from a concrete question, gets worked through with real numbers and worked examples, and is checked against cited references before it goes out. The full process, sourcing standards, and how corrections are handled live on the ',
        link: 'editorial policy page',
        after: '.',
      },
      whatNidhiKnowsAbout: {
        before:
          'The writing concentrates on net worth and how to measure it, managing money across currencies, cash flow and saving, debt, and the path to financial independence. If you want the worldview behind all of it, read ',
        link: 'our beliefs',
        after: '.',
      },
    },
    cta: {
      text: 'Questions, corrections, or just want to say hello?',
      email: 'Email hello@nidhi.today',
      instagram: 'Instagram @nidhi.today',
    },
  },

  /**
   * The beliefs page. Prose-heavy like `about`, plus a list of beliefs whose
   * order and accent colours are hand-picked, so the list lives in the
   * component and this catalog holds only what a reader reads, keyed by the
   * name the component looks up.
   */
  beliefs: {
    meta: {
      title: 'Our Beliefs: Honest Personal Finance Tools | nidhi',
      description:
        'What we believe at nidhi: honest personal finance tools, free financial literacy education, no ads, no data selling, and lessons that are free forever.',
    },
    schema: {
      name: 'Our Beliefs',
      description:
        'What we believe at nidhi: honest personal finance tools, free financial literacy education, no ads, no data selling.',
      organization: 'Personal finance tools and financial literacy education.',
      foundingLocation: 'Prague',
      knowsAbout: {
        personalFinance: 'Personal Finance',
        financialLiteracy: 'Financial Literacy',
        moneyManagement: 'Money Management',
        multiCurrencyFinance: 'Multi-Currency Finance',
      },
      breadcrumbHome: 'Home',
      breadcrumbAbout: 'Our Beliefs',
    },
    title: 'What We Believe',
    intro:
      "nidhi started because one person couldn't find a decent finance tool, and got annoyed enough to build one",
    items: {
      frustration: {
        heading: 'This whole thing started out of frustration',
        body: "We wanted something that could help a regular person plan their money, see where it's going, and make better decisions about it. Nothing like that existed. So here we are, building it ourselves.",
      },
      noPlanner: {
        heading: "Financial planning shouldn't require a financial planner",
        body: "Whether you just landed your first job or you're five years from retirement, you deserve tools and guidance that actually make sense. Not jargon. Not upsells. Just straight answers.",
      },
      accessibility: {
        heading: 'Built for everyone tech keeps forgetting',
        body: "A lot of apps conveniently forget that money tools should work whether you're colour blind, use a screen reader, or take in information differently, for example through ADHD or dyslexia. Being queer, neurodivergent, and a person of colour, we never had that luxury. Leaving anyone out of their own money just feels cheap.",
      },
      freeForever: {
        heading: 'The lessons are free, forever',
        body: 'No paywalls, no "subscribe for the good stuff" nonsense. If something we wrote helped you make a better decision, even if you never touch our product, that\'s the whole point. Tell us about it. We run on that kind of fuel.',
      },
      rulesOfThumb: {
        heading: 'Not just the rules of thumb',
        body: 'A rule of thumb is a starting point, not an answer. Where a lesson gives one, it also explains why it exists, where it breaks, and what depends on you: your country, your income, your debts, how far ahead you are planning. We would rather you understand the reasoning than follow a rule that was never written for your life.',
      },
      noAds: {
        heading: 'No ads, no data selling, no asterisks',
        body: 'We don\'t run ads. We don\'t sell your data. We don\'t do that creepy thing where you search "term insurance" and then see ads for it everywhere for a week. Your finances are your business. Literally.',
      },
      madeInPrague: {
        heading: 'Made in Prague, powered by word of mouth',
        body: "No VC money. No growth team. No billboard on the highway. If you think nidhi is useful, tell someone. That's our primary marketing strategy.",
      },
    },
    cta: {
      text: "Convinced? Or think we're full of it?",
      sub: "Either way, we'd love to hear from you",
      email: 'Drop us a love letter',
      instagram: 'Slide into our DMs',
    },
  },

  /**
   * The editorial policy. The longest prose page, and the one that says most
   * about how the site is made, so it carries more structure than the others:
   * section headings, a numbered list whose items each open with a bolded
   * term, and four sentences with a link inside them.
   *
   * Two shapes keep markup out of this catalog. A heading is its own key and
   * the component supplies the `<h2>` and its `id`. A list item is a `lead`
   * and a `rest`, the component wrapping the lead in `<strong>`, which is what
   * lets a translation move the comma. Sentences with a link are split the same
   * way the other pages split them, one key per side of the link; where the
   * link text is an address that reads the same in every language (the
   * corrections paragraph's `mailto:`), the component holds the anchor and the
   * catalog holds only the two halves of the sentence around it.
   */
  editorialPolicy: {
    meta: {
      title: 'Editorial Policy: How nidhi Writes Its Lessons | nidhi',
      description:
        'How each nidhi lesson is built and checked, where its figures come from, why it is written for any country, how AI tools are used, and the line between education and advice.',
    },
    schema: {
      name: 'Editorial Policy',
      description:
        'How nidhi builds and checks each lesson, its sourcing standards, why lessons are written for any country, how AI tools are used, the boundary on advice, and how corrections are handled.',
      breadcrumbHome: 'Home',
      // Its own key rather than reuse of `name`, as on the other two prose
      // pages: a breadcrumb label wants to be short, and in some languages a
      // page title and a trail label genuinely differ.
      breadcrumbThis: 'Editorial Policy',
    },
    title: 'Editorial Policy',
    intro:
      'Money writing should be easy to check and honest about its limits. This page explains how every lesson on nidhi is built, sourced, checked and corrected, how AI tools are used along the way, and where the line sits between education and advice.',
    sections: {
      howALessonIsBuilt: 'How a lesson is built',
      anyCountry: 'Written for any country',
      sourcesAndFigures: 'Sources and figures',
      ai: 'How AI is used',
      advice: 'Education, not advice',
      corrections: 'Corrections',
      whoIsBehind: 'Who is behind this',
    },
    body: {
      builtIntro:
        'Each lesson starts from a question a real person would ask and works through it with actual numbers. Many readers are new to money, and a confident sentence can read like an instruction, so lessons explain rather than tell you what to do. Every idea, rule of thumb or common practice goes through the same five steps:',
      builtSteps: {
        idea: {
          lead: 'The idea',
          rest: ', in plain words, with jargon defined the first time it appears.',
        },
        why: {
          lead: 'Why people use it',
          rest: ': the problem it solves and why it caught on.',
        },
        evidence: {
          lead: 'The evidence',
          rest: ", cited, with its limits: which country's data, which years, and what it leaves out.",
        },
        breaks: {
          lead: 'Where it breaks',
          rest: ': the situations it was not built for.',
        },
        depends: {
          lead: 'What depends on you',
          rest: ': country, how steady your income is, how long you have, debts and tax.',
        },
      },
      builtOutro:
        'A rule of thumb is a starting point, not an answer, so lessons describe what many people do and avoid "always" and "never" unless the evidence can carry them. Before a lesson is published, it is read back for two things: whether its claims are supported, and whether a beginner would follow it without a glossary. If one slips through, see Corrections below.',
      anyCountry:
        'The lessons are written for readers anywhere, not for one country. The ideas they teach, such as net worth, diversification or how inflation shrinks savings, work the same way everywhere. The rules around those ideas do not: tax, retirement and tax-advantaged accounts, state pensions and benefits, credit scoring, deposit protection and consumer law differ from country to country, and sometimes within one. Lessons explain the general idea on purpose. Where one depends on rules like these, it says so, and a "Where to check locally" note after the lesson names the usual places to check them where you live, such as your tax authority, your financial regulator or a qualified local adviser. Examples are often in euros; that is a choice of currency, not a sign that a rule is European. Where evidence comes from one country\'s data, such as US stock market history, the lesson says that too, along with what it may not tell you about other markets.',
      sourcesAndFigures:
        'Claims rest on primary and reputable secondary sources: established books, recognised reference material and public data. Where a lesson draws on specific sources, they are listed on the lesson itself under "referential reading," so you can follow the trail rather than take our word for it. Every figure comes with where it is from and what it covers, and the same figure agrees across lessons. Worked examples use realistic numbers, and where a number is illustrative rather than a forecast, the lesson says so. Exchange rates in the free tools are the European Central Bank\'s reference rates, dated on screen.',
      aiUsed1:
        "nidhi uses AI tools, including Anthropic's Claude and other AI agents, in its work. They help research, draft and edit lessons; check lessons against this page; question the financial reasoning in a lesson or a tool from the point of view of an experienced adviser; and build the site and its free tools. Separate AI agents are set against each other's work on purpose, to catch what one of them misses.",
      aiUsed2: {
        // No space before the link, and not by oversight: the original markup
        // broke the line after "the", and Astro drops the newline, so the
        // English page has always rendered "described in theprivacy notice".
        // The two halves are split here exactly as the markup split them, so
        // that a change of shape does not quietly change a character of the
        // English page. The missing space is a bug, and fixing it is its own
        // small change rather than a side effect of this one. Hindi keeps the
        // space, because its sentence is being written now, not moved.
        before:
          'AI output is a draft, never a source. A person is involved at every stage, and reads and approves every lesson before it is published. An AI model asked to think like a financial adviser is a check on reasoning, not advice from a licensed professional. The site itself sends nothing you type or do to an AI service; what we collect is described in the',
        link: 'privacy notice',
        after: '.',
      },
      advice:
        'nidhi is not a licensed financial adviser, and nothing on the site is personal financial, investment or tax advice. Lessons do not recommend specific products, funds or securities. Past performance of any investment is not indicative of future results. For decisions that depend on your tax residency, legal situation or risk tolerance, a qualified professional can apply these ideas to your circumstances.',
      corrections: {
        before:
          'If something is wrong, we want to fix it. Spot an error, an out-of-date figure or a claim that no longer holds, and email ',
        after:
          '. Substantive corrections are made in the lesson and reflected in its "last updated" date, so the change is visible rather than quietly swapped in. Minor fixes such as typos are made without a date change.',
      },
      // Two links in one sentence, so five parts rather than three.
      whoIsBehind: {
        before: 'For who writes nidhi and the experience behind the writing, see the ',
        aboutLink: 'about page',
        middle: '. For the worldview that shapes what we choose to build and publish, read ',
        beliefsLink: 'our beliefs',
        after: '.',
      },
    },
  },

  /**
   * The free tools hub at `/free/`. A directory rather than a document: a card
   * per released tool, one explainer block, one line of footer.
   *
   * Each card's preview drawing, its `data-attr` label and its address stay in
   * the component: the first is structure, the second is an analytics label the
   * privacy notice's changelog names, and the third is what `localizedPath`
   * prefixes. The words are keyed by the same tool name the component uses, so a
   * new tool is one row there and one entry in every catalog.
   */
  freeHub: {
    meta: {
      title: 'Free Personal Finance Tools and Calculators | nidhi',
      description:
        'Free personal finance calculators: net worth in one currency or several, loan comparison and a Monte Carlo retirement simulator. No signup, no tracking, all calculations run in your browser.',
      // The simulator is listed only once it is released, so the description must
      // not promise a card the page does not show.
      descriptionWithoutSimulator:
        'Free personal finance calculators for net worth (in one currency or several) and loan comparison. No signup, no tracking, all calculations run in your browser.',
    },
    schema: {
      breadcrumbHome: 'Home',
      breadcrumbThis: 'Free Tools',
      itemListName: 'nidhi free personal finance tools',
      collectionName: 'Free Personal Finance Tools',
    },
    breadcrumb: {
      home: 'Home',
      this: 'Free Tools',
    },
    eyebrow: 'Free tools',
    title: 'Free personal finance tools that run in your browser.',
    lead: 'No signup, no account, no data sent to a server. Every calculator below runs entirely in your browser, with live ECB exchange rates where currency conversion is needed. Built for expats, cross-border savers, and anyone who has outgrown a spreadsheet.',
    tools: {
      multiCurrencyNetWorth: {
        kicker: 'One currency or several',
        title: 'Net Worth Calculator',
        desc: 'Add what you own and what you owe to see your net worth. Works in one currency or across 29, at live ECB rates, and if you hold several it shows how much sits in currencies you do not spend in.',
        itemName: 'Net Worth Calculator and Currency Risk Analyzer',
      },
      loanComparison: {
        kicker: 'Borrowing decisions',
        title: 'Loan Comparison Calculator',
        desc: 'Compare two or three loan offers side by side. APR, total cost of borrowing, refinancing scenarios, and per-vendor amortisation, without a spreadsheet.',
        itemName: 'Loan Comparison Calculator',
      },
      monteCarlo: {
        kicker: 'Projections and retirement',
        title: 'Monte Carlo Simulator',
        desc: 'Play your savings forward thousands of times with returns from the long-run record of world markets. See a low, median and high outcome, and how often the money lasts once you live off it.',
        itemName: 'Monte Carlo Retirement Simulator',
      },
    },
    how: {
      title: 'How these tools work',
      browser: {
        strong: 'All calculation runs in your browser.',
        rest: ' The numbers you type, the values you upload, and any results are kept on your device. They are not sent to nidhi or to any third party.',
      },
      // The link in this bullet is a product name, so it stays in the component
      // and is the same string in every language, as the privacy notice does with
      // the services it lists. The spaces live at the ends of the two fragments.
      rates: {
        strong: 'Live ECB exchange rates where needed.',
        before: ' When a tool needs a currency conversion, your browser fetches reference rates from the ',
        after: ' API (a free, open mirror of European Central Bank reference rates). The request includes only your selected functional currency, not your asset data.',
      },
      noSignup: {
        strong: 'No signup, no account, no email needed.',
        rest: ' The tools are usable straight from the page. Nothing goes into the page address while you use a tool. An optional share link carries your inputs after the # sign, a part of the address browsers never send to a server, so you control whether to share, and with whom.',
      },
      education: {
        strong: 'Educational, not advice.',
        rest: ' Each tool shows you the math behind the answer and the assumptions it makes, so you can apply the same logic to your own situation. For decisions that matter, talk to a qualified professional.',
      },
    },
    footer: {
      before: 'Want the longer reasoning behind these tools? Read the ',
      blogLink: 'nidhi learning path',
      middle: ', the curriculum that informs them, or learn what we ',
      beliefsLink: 'believe about money and planning',
      after: '.',
    },
  },

  /**
   * The home page. Longer than the prose namespaces because this page is a
   * story rather than a document: three steps, one worked example, and a list
   * of ways in. Split finely on purpose, so a translation can move a number or
   * a link to where its own grammar wants it without the component knowing
   * which language it is rendering. Anything with a `{name}` in it is filled by
   * `format()`; the names match the ones the component passes.
   */
  /**
   * The privacy notice. Unlike the other prose pages this one is a legal
   * document: the English is the version that governs in every edition, and
   * the component says so on any page that is not English (`englishIsAuthoritative`).
   *
   * The changelog is not in this catalog. It is a record of what the notice said
   * on a given day, written and dated in English, and having exactly one copy of
   * that record is the point of it, so its entries stay in the component and read
   * the same in every language. Only the framing around them is here, plus
   * `entriesInEnglish`, which explains that to a reader of a translation.
   *
   * Splits follow the editorial policy's rule. A `<strong>` lead and the prose
   * after it are separate keys, with the punctuation at the start of the second,
   * so a translation can move the colon. The component holds the `<code>`
   * elements and the anchors whose text is identical in every language: the
   * parameter names, the storage keys, the addresses, and the word a reader is
   * asked to put in an email subject. Product and service names stay in this
   * catalog and are deliberately the same string in every language; they are the
   * paths listed in IDENTICAL_OK in catalog.test.ts.
   */
  privacy: {
    meta: {
      title: 'Privacy Notice: How nidhi Handles Your Data | nidhi',
      description:
        'Plain-language privacy notice for nidhi.today: what we collect, why, where it lives, and how to get rid of it.',
    },
    schema: {
      name: 'Privacy Notice: How nidhi Handles Your Data',
      description:
        'Plain-language privacy notice for nidhi.today: what we collect, why, where it lives, and how to get rid of it.',
      breadcrumbHome: 'Home',
      breadcrumbThis: 'Privacy',
    },
    title: 'Privacy, honestly',
    intro:
      'The short version: we collect as little as we can, we don’t sell anything, and you can get rid of what we have whenever you want.',
    /** The label before the date. The trailing space is the one before `<time>`. */
    updatedLabel: 'Last updated: ',
    updatedLink: 'see what changed',
    /**
     * Under the intro, on every page but the English one. Nothing renders it in
     * English, where a notice calling itself authoritative would be talking
     * about the page you are already reading; it is written out here because
     * this file is what a translator works from.
     */
    englishIsAuthoritative:
      'This notice is written in English, and the English version is the one that governs. The translation is here so you can read it in your own language.',
    sections: {
      collect: 'What we collect, and when',
      why: 'Why we collect it',
      whereItLives: 'Where it lives',
      whatWeDontDo: 'What we don’t do',
      retention: 'How long we keep it',
      rights: 'Your rights',
      children: 'Children',
      whoWeAre: 'Who we are',
    },

    /** The bold line that opens a list. The component supplies the `<strong>`. */
    lead: {
      always: 'Always, to keep the site working and improving:',
      withConsent: 'Only if you click “Sure, that’s fine” on the cookie banner:',
      newsletter: 'If you subscribe to the blog newsletter:',
      waitlist: 'If you join the product-launch waitlist:',
      browserOnly: 'Stored only in your browser, never sent to us:',
    },

    collect: {
      pageviews: {
        before: 'Anonymous pageview and page-leave events, via ',
        link: 'PostHog Cloud EU',
        after:
          '. That includes the URL you visited, the URL you came from, your approximate country (derived from your IP address, which PostHog then discards), and your browser, OS, and viewport size. No name, no email, no user ID.',
      },
      // The bold clause sits mid-sentence, so `before` ends with the space that
      // precedes it and `after` begins with the colon that follows it.
      freeTools: {
        before:
          'Anonymous interaction events on the Free Tools pages: which currency you pick on the loan-comparison calculator, whether you toggle between solving for term vs monthly payment, whether you open the “More options” panel, whether you copy the shareable link, and whether you reset the form. ',
        strong: 'The financial values you type are never sent',
        after:
          ': not the loan amount, not the interest rate, not the fees, not the vendor name. The whole point of the calculator is that the math runs in your browser.',
      },
      toolAddresses:
        'On every free tool, the page address never carries what you type, so the page URL that analytics records cannot either. The tools do not write your inputs into the address while you use them. A share link carries them after the # sign, a part of the address browsers never send to a server, and the page moves them out of the address bar before analytics start. As a backstop, the analytics script removes everything except campaign parameters (utm_source and the like) from any free-tool address before an event is sent.',
      monteCarlo: {
        before:
          'Anonymous interaction events on the Monte Carlo simulator: which currency you pick, which return setting and number of simulated paths you choose, whether you switch withdrawals on or off, whether you open the results table, whether you copy the shareable link, and whether you reset the form. ',
        strong: 'The amounts, years, fees and mix you enter are never sent.',
      },
      // Two `<code>` elements in one sentence, so the component supplies both
      // and takes `middle` as the comma between them.
      campaigns: {
        before: 'Campaign parameters (',
        middle: ', ',
        after: ', etc.) if you arrived from a link we or someone else tagged.',
      },
      consentClicks:
        'Click heatmaps and autocaptured events: basically, which elements on a page get clicked, including clicks on things that don’t respond (“dead clicks”). We use this to spot broken links and layouts that confuse people. We don’t record page-speed measurements or browser errors at all.',
    },

    newsletter: {
      email: 'Your email address.',
      page: 'The page you subscribed from (so we know whether the blog index or a specific post got you there).',
      timestamps: 'Timestamps for when you subscribed, confirmed, and (if you do) unsubscribed.',
      status: 'Your subscription status: pending, confirmed, or unsubscribed.',
      // The address itself is a `<code>` in the component.
      from: {
        before: 'Newsletter emails come from ',
        after: '. Add it to your contacts so new-post notifications reach your inbox.',
      },
    },
    waitlist: {
      email: 'Your email address.',
      page: 'The page you signed up from.',
      timestamp: 'Timestamp for when you signed up.',
      singleOptIn: 'No confirmation step, no status tracking. Single opt-in.',
      from: {
        before: 'The launch email will come from ',
        after: '. Add it to your contacts so it doesn’t land in spam.',
      },
    },
    /**
     * The list of what stays in the browser. Each row is the sentence around
     * one `<code>` storage key, which the component supplies so that the key
     * reads the same in every edition.
     */
    browserStorage: {
      consent: { before: 'Your cookie-consent choice (', after: ').' },
      theme: { before: 'Your light/dark/system theme preference (', after: ').' },
      internal: {
        before: 'For the nidhi team only: a flag (',
        after:
          ') set by opening a page from a special link, so our own visits aren’t counted. While it is set, no analytics run in that browser at all.',
      },
      reading: {
        before: 'Which lessons you’ve read (',
        after:
          '), so we can show a subtle “read” indicator next time and suggest your next lesson on the homepage and the learning path, including the next step on each “Start wherever you are” route.',
      },
      subscription: {
        before: 'Whether you’ve confirmed your newsletter subscription (',
        after:
          '), so we stop showing you the subscribe form on every page once you’ve completed the double-opt-in loop. Set only when you click the confirmation link in your email; never contains your email address.',
      },
      dismissed: {
        before: 'Whether you’ve dismissed the newsletter subscribe prompt (',
        after:
          '), so we honor your choice to not see it again for a while. Contains only a dismissal type and timestamp, no email address or personal data.',
      },
      waitlistSignedUp: {
        before: 'Whether you’ve signed up for the product-launch waitlist (',
        after:
          '), so we stop showing you the waitlist form on future visits. Contains only a status flag and timestamp, never your email address.',
      },
    },
    clearsEverything: 'Clearing your browser’s site data wipes all of the above instantly.',

    why: {
      analytics: {
        lead: 'Analytics:',
        rest: ' to figure out which posts actually help people and which ones lose them halfway through. We can’t fix what we can’t see.',
      },
      newsletter: {
        lead: 'Newsletter:',
        rest:
          ' to email you when a new blog post is published, plus one reminder if you start subscribing but do not confirm within 3 days (sent between 9 AM and 12 PM Prague time). No other emails. No promos, no “we miss you” sequences, no cross-promoting other products.',
      },
      waitlist: {
        lead: 'Waitlist:',
        rest: ' to send you exactly one email when the nidhi product launches. Nothing else. Not a newsletter, not a drip sequence, not cross-promotion.',
      },
      localPreferences: {
        lead: 'Local preferences:',
        rest: ' to make the site feel consistent for you without a server round-trip. All of that stays on your device.',
      },
    },

    where: {
      /**
       * The four processors. `posthog`, `google` and `github` name a service, so
       * the name is the same string in every catalog; `browser` is prose and is
       * translated. Google's row is the only one with two `<code>` addresses in
       * it, which is why it is the only one with a `middle`.
       */
      processors: {
        posthog: {
          name: 'PostHog Cloud EU',
          rest: ' (Frankfurt, Germany): our analytics processor. Session recording is disabled. We use their standard product, with no custom person properties that would identify you, unless you subscribe, in which case your subscription status becomes a property on the anonymous person record for funnel analysis.',
        },
        google: {
          name: 'Google Workspace',
          before: ' (Google Cloud EU regions): our email addresses (',
          middle: ' for general contact and support, ',
          after:
            ' for automated product emails like beta invites and newsletter sends) and the Google Sheet that stores newsletter subscribers and waitlist signups (in separate tabs). Only we can read it.',
        },
        github: {
          name: 'GitHub Pages',
          rest: ' (a GitHub / Microsoft service): hosts the static files of this website. GitHub keeps short-lived server access logs for abuse prevention. We don’t read them and don’t get copies.',
        },
        browser: {
          name: 'Your browser',
          rest: ': for the local preferences listed above.',
        },
      },
      thatIsAll:
        'That’s the whole list of services that handle data for us. There’s no fourth processor in a footnote somewhere.',
      // The bold lead names the service; the component supplies the address in
      // parentheses after it, and `rest` carries the comma that follows them.
      frankfurter: {
        lead: 'One service your browser contacts directly: Frankfurter',
        rest: ', a free, open service that publishes European Central Bank exchange rates. Your browser asks it for the day’s rates when you open the net worth calculator (and again if you change your spending currency there). The request names only currency codes, never your amounts or anything you typed. Like any request your browser makes, it shows Frankfurter your IP address and browser type. It goes straight from your browser to Frankfurter, so we never see it, and Frankfurter is independent of us: what it keeps is up to them.',
      },
    },

    dontDo: {
      ads: 'We don’t run ads. No ad tech on this site at all.',
      sell: 'We don’t sell, rent, license, or syndicate your data to anyone.',
      crossSite:
        'We don’t cross-site track you. No Facebook pixel, no Google Ads tag, no LinkedIn Insight, no TikTok pixel, no retargeting of any kind.',
      screen: 'We don’t record your screen, keystrokes, form values, or continuous scroll stream.',
      replies: 'We don’t read replies to newsletter emails and feed them back into any analytics or ads system.',
      imports: 'We don’t import the newsletter or waitlist lists into any other tool or mailing system.',
    },

    retention: {
      analytics: {
        lead: 'Analytics events:',
        rest: ' 12 months (PostHog’s default retention; we haven’t extended it), then auto-deleted.',
      },
      newsletter: {
        lead: 'Newsletter subscribers:',
        rest: ' while you’re subscribed, plus up to 30 days after you unsubscribe so we can make sure you don’t get one more email by accident. After that, the row is deleted.',
      },
      waitlist: {
        lead: 'Waitlist signups:',
        rest: ' until we send the launch email and you’ve had time to act on it, or until you ask us to remove you. Email us anytime.',
      },
      bounced: {
        lead: 'Bounced or invalid emails:',
        rest: ' removed as soon as we notice them, usually within a week.',
      },
      localStorage: {
        lead: 'Your localStorage:',
        rest: ' until you clear your browser data. Again, we never see it.',
      },
    },

    rights: {
      intro:
        'Under the GDPR (and similar regulations), you have the right to ask us what we hold about you, correct it, export it, restrict how we use it, object to it, or delete it.',
      unsubscribe:
        'For the newsletter, unsubscribing is a one-click link in every email we send, and that also schedules the deletion described above. For the waitlist, email us and we’ll remove you. We’ll do it manually for either.',
      analytics: {
        before:
          'For analytics, the events are anonymous; we don’t have a way to look up “your” events because we don’t know who you are. If this bothers you, just decline the cookie banner, or use a content blocker. Nothing on the site breaks. You can change your answer any time with ',
        strong: 'Cookie settings',
        after: ' at the bottom of every page; saying no there stops click recording straight away.',
      },
      // The address is the component's, and so is the word the reader is asked
      // to type in the subject: the same inbox reads every edition, and the
      // word has to be the one that reaches it.
      contact: {
        before: 'For anything else, email ',
        middle: ' with the word ',
        after: ' in the subject. We reply within a few days.',
      },
    },

    children:
      'This site is written for adults trying to figure out their own money. We don’t knowingly collect anything from children under 16. If you think we have, email us and we’ll delete it.',

    whoWeAre: {
      intro:
        'nidhi is a small independent project. No investors, no growth team, no ad budget. Currently built and run by one person in Prague.',
      /** The two handles are the component's; only the tail of each row is here. */
      contact: {
        hello: ': for anything, privacy or otherwise',
        instagram: ': if you prefer DMs',
        beliefsLink: 'Our beliefs',
        beliefsRest: ': if you want the why',
      },
    },

    /**
     * The framing around the changelog, not its entries. See the namespace
     * comment above for why the entries are not translated.
     */
    changelog: {
      eyebrow: 'Changelog',
      title: 'Changes to this notice',
      intro: {
        before:
          'We update this page in place. Every change gets an entry in the log below, newest first, no matter how small. The latest few are shown in full; older ones are kept word for word under “Earlier changes”. Changes that affect how we handle personal data (a new processor, a new category of data, a retention change) are flagged ',
        after: '.',
      },
      second:
        'We don’t push “we updated our privacy policy” emails. If you want to keep an eye on it, bookmark this page or read the log below when you’re curious. If a change ever makes you uncomfortable, unsubscribing from the newsletter is a one-click link in every email, and clearing your browser’s site data wipes everything stored locally.',
      earlier: 'Earlier changes',
      // Two forms rather than a plural rule: Hindi's word for "change" does not
      // inflect for number, and `format()` has no plural machinery to lean on.
      countOne: '{count} change',
      countOther: '{count} changes',
      materialTag: 'material',
      materialLabel: 'Material change',
      /**
       * Under the changelog heading, on every page but the English one. The
       * entries below it are English in every edition, so a reader of a
       * translation is owed the reason.
       */
      entriesInEnglish:
        'The log below is kept in English, in the words it was written in, and is not translated: it is a record of what this notice said on a given day.',
    },
  },

  /**
   * The 404. One file serves every missing path on the host, in both languages,
   * with the path prefix deciding which of the two blocks is shown, so these
   * strings are the only page copy on the site that is not reached through a
   * route's own locale.
   */
  notFound: {
    meta: {
      title: 'Page not found (404) | nidhi',
      description:
        "That page doesn't exist on nidhi. It may have been moved, the URL might be mistyped, or the link may be out of date. Head back home to continue.",
    },
    heading: '404',
    body: "The page you're looking for doesn't exist.",
    cta: 'Go home',
  },

  /**
   * The early-access waitlist box, on the home page and on the net worth tool.
   * It posts to the same Google Apps Script endpoint in every language, and the
   * email it triggers is English, so the copy promises one email and no more:
   * the box must not promise a language the email does not arrive in.
   */
  waitlist: {
    region: 'Early-access waitlist',
    heading: 'Want the planner when it opens?',
    emailLabel: 'Email address',
    cta: 'Notify me',
    /** Split around the link, so a translation can move it inside the sentence. */
    privacyBefore: 'One email when access opens. ',
    privacyLink: 'Privacy policy',
    privacyAfter: '.',
    successTitle: "You're on the list",
    successBody: "We'll send you one email when access opens. That's it.",
    /** Shown on the button while the request is in flight. */
    sending: 'Sending…',
    /** Shown when the build has no endpoint configured, so a signup cannot land. */
    notConfigured: 'Signups are not configured yet. Check back soon.',
  },
  home: {
    meta: {
      title: 'nidhi | Understand your money and plan what comes next',
      description:
        'Free personal finance lessons and private tools to understand your money and plan your future, from the basics to finances that span currencies.',
      imageAlt:
        'nidhi: money, understood. Free personal finance lessons and private tools to understand your money and plan your future.',
    },
    /** Structured data, not visible text. It still reads in the page's language. */
    schema: {
      slogan: 'Money, understood',
      organization:
        'nidhi helps ordinary people understand their money: free, structured personal finance lessons, private in-browser tools, and a planner for their financial future. It starts with the basics and keeps working as finances get more complex, including when money spans currencies and countries.',
      knowsAbout: [
        'Personal finance',
        'Financial literacy',
        'Net worth',
        'Emergency funds',
        'Investing',
        'Financial independence',
        'Retirement planning',
        'Behavioural finance',
        'Multi-currency finance',
      ],
      site: 'Money, understood. Learn personal finance, understand your own money, and plan your future, from the basics to finances that span currencies and countries.',
    },
    hero: {
      heading: 'Understand your money.',
      /** Three phrases, each its own element so they can wrap independently. */
      subhead: ['Free lessons.', 'Private tools.', 'A planner on the way.'],
      startLearning: 'Start learning',
      tryTool: 'Try a free tool',
      /** Shown only to a reader this browser knows has started the path. */
      welcomeBack: 'Welcome back. Pick up where you left off:',
    },
    /**
     * The card beside the hero: the three steps at a glance. Steps 2 and 3
     * carry the worked example's numbers, so their sentences are templates.
     */
    journey: {
      label: 'Learn, take stock, plan ahead · illustrative amounts',
      learnStep: '1 · Learn',
      learnBig: 'What is net worth?',
      learnSmall: 'What you own, minus what you owe.',
      stockStep: '2 · Take stock',
      /**
       * The two illustrative net worths side by side, one person's and the
       * other's. Only the connector between them is translatable, which is why
       * it is a template rather than two spans and a hardcoded "or".
       */
      stockBig: '{one} or {two}',
      stockSmall: 'Two people, both earning {amount} a month.',
      planStep: '3 · Plan ahead',
      planBig: '{gap} apart',
      planSmall: '{low} or {high} a month, over {years} years.',
    },
    /** The numbered marker above each step's heading. */
    steps: {
      learn: 'Learn',
      stock: 'Take stock',
      plan: 'Plan ahead',
      /** Spoken before the heading, and hidden: "Step 1: Learn". */
      mark: 'Step {n}: ',
    },
    /** Step 1: the ways in, one line each. */
    lessons: {
      heading: 'Free lessons, for good.',
      body: 'Short lessons for any household, in any country, and where local rules matter, they say what to check. No paywall, no account.',
      helperQuestion: 'Not sure which fits?',
      helperLink: 'Two questions suggest where to start',
      foot: 'See the whole learning path',
      /** A route whose lessons are still scheduled: shown, not linked. */
      comingSoon: '{level} · lessons coming soon',
      comingSoonNoLevel: 'More lessons',
      levelCount: '{level} · {count} lessons',
      severalLevels: 'Lessons from several levels',
      start: 'Start',
      /** Replaces `start` for a route the reader has already begun. */
      doorContinue: 'Continue with ',
      /** Replaces it once every lesson on the route is read. */
      doorRead: 'Route read. ',
      doorPath: 'Keep going on the learning path',
      inclusiveTitle: 'The standard plan doesn’t fit my life.',
      inclusiveMeta: 'Inclusive Finances · {count} guides, any stage',
      inclusiveMetaOne: 'Inclusive Finances · 1 guide, any stage',
      inclusiveGo: 'Explore',
    },
    /** Step 2: what the free tools are for. */
    tools: {
      heading: 'See where you stand.',
      body: 'Free tools that run in your browser, so what you type stays on your device.',
    },
    /** The two people, same income, different net worth. */
    compare: {
      label: 'Same income, {amount} a month each',
      owns: 'Owns',
      owes: 'Owes',
      netWorth: 'net worth',
      caption: 'Income is what comes in. Net worth is what you own minus what you owe. Illustrative amounts.',
      people: {
        alex: { name: 'Alex', note: 'A car and a card, both on credit' },
        sam: { name: 'Sam', note: 'Savings, a pension, a small loan' },
      },
    },
    /** Step 3: the planner, and the one decision compared. */
    planner: {
      heading: 'See where it could go.',
      body: 'We are building a planner: what you own, owe, earn and spend in one place, in one currency or several, so you can compare decisions like this one before you make them.',
    },
    /**
     * The worked example. Its numbers are computed (src/utils/home/), so the
     * sentences here are templates, and the chart's own labels come from the
     * four keys at the bottom.
     */
    example: {
      label: 'One decision, compared',
      text: 'The same {start} start, with {low} or {high} added each month.',
      /**
       * Answers the question a reader who is not paid in euros asks on seeing
       * one. It is the same point `editorialPolicy.anyCountry` makes at length,
       * in two sentences, and it has to stay true if the example's currency is
       * ever changed: what it describes is a proportion, not an amount.
       */
      currencyNote:
        'Euros are just the currency this example uses. Both paths earn the same percentage return, so the gap between them is a proportion as well: in rupees or dollars the two lines would draw the same shape, only the axis would change.',
      /** Bolded, and read as one sentence with `gapRest` after it. */
      gapLead: 'About {gap} apart',
      gapRest: 'after {years} years: {extra} more put in, and about {growth} more growth.',
      fold: 'How this example works',
      chartTitle: 'Example: one decision compared over ten years',
      /** The chart's x-axis points: the first is `today`, the rest are years. */
      today: 'Today',
      year: 'Year {n}',
      axisStart: 'today',
      axisEnd: '+{years} years',
      /** A chart series label, in the legend and read aloud on hover. */
      perMonth: '{amount}/mo',
      /** Read aloud, and printed for a reader who cannot see the chart. */
      description:
        'Two example paths from the same {invested} invested today, at an illustrative {pct} a year after inflation. Adding {monthly} a month reaches about {end} after {years} years; adding {higher} a month reaches about {alternative}. The gap of about {gap} is {extra} more put in and about {growth} more growth.',
      footnote:
        'Example: {invested} invested today, with {monthly} or {higher} added at the start of each month, at an illustrative {pct} a year after inflation. Real returns vary from year to year and can be negative. A whole net worth does not grow at one rate: a car loses value and a loan is paid down.',
      /** Spoken to a screen reader that lands on the chart. */
      keysHint: 'Use the left and right arrow keys to read its values.',
    },
    faq: {
      heading: 'FAQ',
      /**
       * Questions and answers. The same text is printed on the page and
       * published as FAQPage structured data, so it is written once here.
       */
      items: [
        {
          q: 'Is nidhi for beginners?',
          a: 'Yes. The learning path starts with what net worth is and assumes no prior knowledge. Each lesson explains its terms as it goes, and the {total} lessons so far are in reading order, so you can start at the top and keep going.',
        },
        {
          q: 'Do I need money in more than one currency to use nidhi?',
          a: 'No. Everything works with a single currency. Multi-currency support is there for when your life needs it: savings in one country, a pension or property in another, or plans to move.',
        },
        {
          q: 'What does nidhi cost?',
          a: 'The lessons and the free tools cost nothing and need no account. The lessons will stay free, with no paywall.',
        },
        {
          q: 'Is this financial advice?',
          a: 'No. nidhi is educational: it explains how money works and lets you model your own situation. It is not a licensed financial adviser. For decisions that matter, talk to a qualified professional.',
        },
        {
          q: 'What happens to the numbers I type into the tools?',
          a: 'They stay on your device and are not sent to nidhi. The free tools calculate in your browser and never put what you type into the page address. When a tool needs outside data, such as the day\'s exchange rates, your browser asks that service for the rates only, never your amounts; like any request, it shows that service your IP address. The privacy page has the details.',
        },
        {
          q: 'What is the planner, and when can I use it?',
          a: 'The planner brings everything together: what you own, owe, earn and expect to spend, projected forward with the assumptions shown, so you can compare decisions before you make them. It is opening in stages. Join the list and you will get one email when it opens.',
        },
      ],
      why: 'nidhi started because one person couldn’t find a tool that fit an ordinary financial life: money in more than one country, debts in another, a future that crosses borders. So we are building it, and explaining what we learn along the way.',
      trustLine: 'Made in Prague. No ads, no data selling. Lessons cite their sources.',
      trustBeliefs: 'What we believe',
      trustEditorial: 'How we write',
      trustPrivacy: 'Privacy policy',
    },
    /**
     * The level names, as a level is named on a card. Also still in
     * `LEVEL_LABELS` in src/utils/home/startingPoints.ts, which the blog
     * chrome reads; a test keeps the two in step until that one goes.
     */
    levels: {
      discovery: 'Discovery',
      building: 'Building',
      psychology: 'Psychology',
      optimizing: 'Optimizing',
      mastery: 'Mastery',
    },
    /**
     * The ways in, keyed by the `id` in `STARTING_POINTS`. Only `situation` is
     * on the page today: `audience` and `detail` are carried rather than shown,
     * because they are somebody's copy and dropping them belongs in its own
     * change, not in a translation.
     */
    startingPoints: {
      basics: {
        audience: 'New to this',
        situation: 'I’m starting from the beginning.',
        detail: 'You know you should understand your money better, but not where to begin. Start with the ideas everything else is built on.',
      },
      'no-plan': {
        audience: 'Some experience',
        situation: 'I have some savings, but no plan.',
        detail: 'Money is building up and you are not sure what it should be doing. Learn what saving, investing and goals each are for.',
      },
      habits: {
        audience: 'You know the theory',
        situation: 'I know what to do, but I don’t always do it.',
        detail: 'Most money mistakes are not about knowledge. See how attention, habit and emotion shape the decisions you make.',
      },
      complex: {
        audience: 'Experienced',
        situation: 'My finances have got complicated.',
        detail: 'Projections, what-if scenarios, cash flow, fees and taxes: the same ideas, with more moving parts.',
      },
    },
    /** The tool cards, keyed by `TOOLS` in src/utils/home/startingPoints.ts. */
    toolCards: {
      netWorth: { name: 'Net worth calculator', desc: 'One currency or several.' },
      loanComparison: { name: 'Loan comparison', desc: 'Borrowing offers, side by side.' },
      monteCarlo: { name: 'Monte Carlo simulator', desc: 'A range of outcomes, not one line.' },
    },
  },
};
