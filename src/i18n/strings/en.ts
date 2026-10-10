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
};
