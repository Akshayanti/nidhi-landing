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
   * The language switcher. Each catalog names both languages in their own
   * script, so these two labels read the same in every locale; the aria
   * labels are the page's own language saying where the link goes.
   */
  langSwitch: {
    toHindi: 'हिन्दी',
    toEnglish: 'English',
    ariaToHindi: 'Read this page in Hindi',
    ariaToEnglish: 'Read this page in English',
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
};
