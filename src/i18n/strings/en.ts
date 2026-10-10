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
};
