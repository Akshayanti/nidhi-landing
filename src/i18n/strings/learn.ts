/**
 * The learning path's copy, in every language.
 *
 * The pages that make up the path (the index at `/blog/`, a level page, a
 * topic page, the topic hub, and the Inclusive Finances hub) share one
 * vocabulary: the six level names, one line summarising each level, the longer
 * "what this level covers" notes, and the curated title and description of each
 * tag. That shared vocabulary lives in `learn`, and each page's own prose sits
 * under a namespace named after the page. Each island's copy is under
 * `<page>.island` (or `learn.island` for the components shared by several
 * pages), so `LearnHome.tsx` and `LearningPath.tsx` can take exactly one
 * locale's slice as a prop and never import this module at runtime.
 *
 * Why a module of its own rather than more entries in each language's main
 * catalog (`../en.ts`, `../hi.ts` and the rest): the same reason as the free tools (see `./tools/index.ts`). The
 * path is the densest prose on the site after the calculators, and `LEVELS`,
 * `LEVEL_SUMMARIES`, `TAG_META`, `CONCEPTS` and `GOALS` all read better as one
 * file than as a ninth of several very long ones. The key-parity test in
 * `./catalog.test.ts` covers these namespaces in every language like any
 * other: `learn.tags.debt.title` is a path it walks.
 *
 * English first, because `en` is the source of truth the other languages are
 * measured against; every other language's object is typed as `typeof` the
 * English one so none can drift in shape.
 */

export const learnEn = {
  /**
   * The shared learning-path vocabulary. Level ids are the same in every
   * language (they are slugs and CSS colour names), so only the words change.
   */
  learn: {
    /** The six sections, ladder levels first. */
    levels: {
      discovery: 'Discovery',
      building: 'Building',
      psychology: 'Psychology',
      optimizing: 'Optimizing',
      mastery: 'Mastery',
      'inclusive-finances': 'Inclusive Finances',
    } as Record<string, string>,

    /** One line per ladder level, for the level list on `/blog/`. */
    summaries: {
      discovery: 'The basic language of money',
      building: 'Budgets, risk and first investments',
      psychology: 'How habits and biases shape decisions',
      optimizing: 'Reviewing and refining a plan',
      mastery: 'Estate planning and the long game',
    } as Record<string, string>,

    /**
     * What each level page says about itself: the short description and the
     * detail behind "What this level covers".
     */
    levelMeta: {
      discovery: {
        description: 'The fundamentals. If you\'re new to personal finance, start here.',
        covered: 'Net worth, assets, liabilities, cash flow, debt, compound interest, liquidity, emergency funds, purchasing power, time value of money, saving vs investing, credit, insurance',
      },
      building: {
        description: 'Putting the pieces together. Budgets, savings systems, and first investments.',
        covered: 'Budgeting, risk, asset classes, investment accounts, diversification, financial independence intro, multi-currency, real estate, loan terms, passive income, goals, dashboard, health metrics, taxes',
      },
      psychology: {
        description: 'How your mind helps and hurts your money. Behavioural biases, mental models, and building better money habits.',
        covered: 'Loss aversion, mental accounting, present bias, overconfidence, framing and anchoring, herd behaviour, narrative economics, money scripts, anti-bias systems',
      },
      optimizing: {
        description: 'Fine-tuning what works. Tax efficiency, portfolio rebalancing, and advanced strategies.',
        covered: 'Tax-loss harvesting, portfolio rebalancing, asset location, diversification',
      },
      mastery: {
        description: 'The long game. Generational wealth, estate planning, and financial independence.',
        covered: 'Estate planning, FIRE, generational wealth, withdrawal strategies',
      },
      'inclusive-finances': {
        description: 'For households the standard advice was not written for. Each guide takes one default assumption, shows what breaks when it does not hold, and rebuilds it deliberately.',
        covered: 'Unmarried and cohabiting couples, shared households, gig work, interest-free finance, cross-border households, solo agers, divorce, caregiving, disability, chosen family, blended families, widowhood',
      },
    } as Record<string, { description: string; covered: string }>,

    /**
     * The curated copy per tag. `name` is what the tag is called on the topic
     * hub and as a page heading; `title` already carries the `| nidhi` suffix;
     * `description` is the topic page's meta description and intro; `card` is
     * the shorter line the hub's card shows (the first two sentences for a tag
     * whose description runs longer than that).
     */
    tags: {
      'discovery': {
        name: 'Discovery',
        title: 'Discovery Series: Personal Finance Fundamentals | nidhi',
        description: 'The first level of the nidhi learning path: net worth, assets, debt, cash flow, budgeting, and saving. Beginner guides meant to be read in order.',
        card: 'The first level of the nidhi learning path: net worth, assets, debt, cash flow, budgeting, and saving. Beginner guides meant to be read in order.',
      },
      'building': {
        name: 'Building',
        title: 'Building Series: Investing, Taxes, and Planning | nidhi',
        description: 'The second level of the nidhi learning path: risk, investing, taxes, financial independence, loans, and goals. Guides for putting the basics to work.',
        card: 'The second level of the nidhi learning path: risk, investing, taxes, financial independence, loans, and goals. Guides for putting the basics to work.',
      },
      'psychology': {
        name: 'Psychology',
        title: 'Psychology of Money: Behavioural Finance Basics | nidhi',
        description: 'Why knowing the right money move is not the same as making it: loss aversion, mental accounting, present bias, herd behaviour. Behavioural finance, explained.',
        card: 'Why knowing the right money move is not the same as making it: loss aversion, mental accounting, present bias, herd behaviour. Behavioural finance, explained.',
      },
      'optimizing': {
        name: 'Optimizing',
        title: 'Optimizing Series: Projections, Fees, and Taxes | nidhi',
        description: 'The fourth level of the nidhi learning path: projections, cash management, refinancing, fees, and tax efficiency. Guides for tuning a plan that already works.',
        card: 'The fourth level of the nidhi learning path: projections, cash management, refinancing, fees, and tax efficiency. Guides for tuning a plan that already works.',
      },
      'inclusive-finances': {
        name: 'Inclusive Finances',
        title: 'Inclusive Finances: When the Default Plan Does Not Fit | nidhi',
        description: 'Financial planning for households the standard advice skips: unmarried couples, solo agers, gig workers, disability, cross-border families. No prerequisite.',
        card: 'Financial planning for households the standard advice skips: unmarried couples, solo agers, gig workers, disability, cross-border families. No prerequisite.',
      },
      'relationships': {
        name: 'Relationships',
        title: 'Money and Relationships: Couples, Families, Households | nidhi',
        description: 'How couples, blended families, chosen family, and shared households can plan money when the law and the defaults do not match how they live.',
        card: 'How couples, blended families, chosen family, and shared households can plan money when the law and the defaults do not match how they live.',
      },
      'disability': {
        name: 'Disability',
        title: 'Financial Planning with a Disability | nidhi',
        description: 'Saving and planning around means-tested benefits, care costs, and income that may not follow a standard career. Frameworks, not country-specific legal advice.',
        card: 'Saving and planning around means-tested benefits, care costs, and income that may not follow a standard career. Frameworks, not country-specific legal advice.',
      },
      'immigration': {
        name: 'Immigration',
        title: 'Money Across Borders: Immigrants and Expats | nidhi',
        description: 'Credit history, banking, pensions, and recognition gaps when your household crosses borders. Planning frameworks for immigrants and cross-border families.',
        card: 'Credit history, banking, pensions, and recognition gaps when your household crosses borders. Planning frameworks for immigrants and cross-border families.',
      },
      'fundamentals': {
        name: 'Fundamentals',
        title: 'Financial Fundamentals: Personal Finance Literacy | nidhi',
        description: 'Core personal finance concepts every adult should know: assets, liabilities, cash flow, compound interest, and more. Free financial literacy from nidhi.',
        card: 'Core personal finance concepts every adult should know: assets, liabilities, cash flow, compound interest, and more. Free financial literacy from nidhi.',
      },
      'debt': {
        name: 'Debt',
        title: 'Understanding and Managing Debt: Finance Literacy | nidhi',
        description: 'How debt works, why interest rates matter, and proven strategies to get out of debt. Practical personal finance literacy from nidhi.',
        card: 'How debt works, why interest rates matter, and proven strategies to get out of debt. Practical personal finance literacy from nidhi.',
      },
      'saving': {
        name: 'Saving',
        title: 'Saving Money: Personal Finance Basics | nidhi',
        description: 'How to save effectively: emergency funds, savings rates, and when saving beats investing. Personal finance literacy guides from nidhi.',
        card: 'How to save effectively: emergency funds, savings rates, and when saving beats investing. Personal finance literacy guides from nidhi.',
      },
      'investing': {
        name: 'Investing',
        title: 'Investing Basics: Financial Literacy | nidhi',
        description: 'Learn to invest: asset classes, risk, compound interest, and when to start. Beginner-friendly investing guides for personal finance literacy.',
        card: 'Learn to invest: asset classes, risk, compound interest, and when to start. Beginner-friendly investing guides for personal finance literacy.',
      },
      'risk': {
        name: 'Risk',
        title: 'Understanding Financial Risk: Investing Literacy | nidhi',
        description: 'Risk isn\'t danger, it\'s uncertainty. Learn the difference between volatility and permanent loss, and how time transforms risk. Financial literacy from nidhi.',
        card: 'Risk isn\'t danger, it\'s uncertainty. Learn the difference between volatility and permanent loss, and how time transforms risk.',
      },
      'planning': {
        name: 'Planning',
        title: 'Financial Planning: Accounts, Taxes, and Tracking | nidhi',
        description: 'How to turn financial knowledge into a plan: accounts, taxes, rebalancing, goals, and what to track. Practical financial planning guides from nidhi.',
        card: 'How to turn financial knowledge into a plan: accounts, taxes, rebalancing, goals, and what to track. Practical financial planning guides from nidhi.',
      },
      'goals': {
        name: 'Goals',
        title: 'Financial Goals and Tracking Your Progress | nidhi',
        description: 'How to set concrete financial goals and know if you are on track: target amounts, health metrics, and a simple dashboard. Planning guides from nidhi.',
        card: 'How to set concrete financial goals and know if you are on track: target amounts, health metrics, and a simple dashboard. Planning guides from nidhi.',
      },
      'fire': {
        name: 'Fire',
        title: 'Financial Independence (FIRE): The Basics | nidhi',
        description: 'What financial independence means, how the FIRE number and safe withdrawal rates work, and what passive income really takes. Honest guides from nidhi.',
        card: 'What financial independence means, how the FIRE number and safe withdrawal rates work, and what passive income really takes. Honest guides from nidhi.',
      },
      'taxes': {
        name: 'Taxes',
        title: 'Taxes and Investing: Personal Finance Literacy | nidhi',
        description: 'How taxes shape every financial decision, and where tax-advantaged accounts fit. Educational guides with a country-by-country reference table.',
        card: 'How taxes shape every financial decision, and where tax-advantaged accounts fit. Educational guides with a country-by-country reference table.',
      },
      'currency': {
        name: 'Currency',
        title: 'Multi-Currency Money: Exchange Rates and Risk | nidhi',
        description: 'Managing money across currencies: exchange rates, purchasing power, and currency risk when your finances cross borders. Guides for a cross-border life.',
        card: 'Managing money across currencies: exchange rates, purchasing power, and currency risk when your finances cross borders. Guides for a cross-border life.',
      },
      'real-estate': {
        name: 'Real Estate',
        title: 'Real Estate as an Investment: The Basics | nidhi',
        description: 'Real estate beyond owning a home: returns, leverage, illiquidity, and the rent-versus-buy math. Personal finance literacy from nidhi.',
        card: 'Real estate beyond owning a home: returns, leverage, illiquidity, and the rent-versus-buy math. Personal finance literacy from nidhi.',
      },
    } as Record<string, { name: string; title: string; description: string; card: string }>,

    /** The trail's breadcrumb words, shared by every page on the path. */
    crumb: {
      learn: 'Learn',
      topics: 'Topics',
      inclusive: 'Inclusive Finances',
    },

    /** A tag with no curated entry falls back to this as its level name. */
    levelFallback: 'Inclusive Finances',

    /**
     * Shown on a page outside English that lists lessons. The lessons are
     * written in English and are not translated, so a page whose cards are all
     * in English should say so rather than leave the reader to infer it from
     * the titles, and should say what the browser can do about it.
     */
    lessonsInEnglish: 'The lessons are in English. Your browser can translate them as you read.',

    /**
     * What `LearningPath.tsx` renders: the cards, the read toggles and the
     * per-level headings. One locale's slice reaches the island as a prop, so
     * the client bundle never carries both languages.
     */
    island: {
      minRead: 'min read',
      startHere: 'Start here',
      new: 'New',
      markRead: 'Mark as read',
      markUnread: 'Mark as unread',
      step: 'Step {step} of {count}',
      /** On the path an Inclusive Finances card is marked optional. */
      companionOptionalLabel: 'Optional · {label}',
      companionOptionalFollows: 'Optional follow-up to {host}',
      companionFollows: 'Follows up on {host}',
      readCount: '{read} of {total} read on this device',
      markLevelRead: 'Mark the level as read',
      markLevelUnread: 'Mark the level as unread',
      orderHint: 'Read left to right, then down.',
      allLessons: 'All {level} lessons',
      allGuides: 'All {level} guides',
    },
  },

  /** The learning path's front page, at `/blog/`. */
  blogIndex: {
    meta: {
      title: 'Learn About Your Money: Free Personal Finance Lessons | nidhi',
      description: 'Free personal finance education: net worth, budgeting, saving, investing, and debt management. Build your financial literacy step by step with practical guides.',
    },
    schema: {
      breadcrumbLearn: 'Learn',
      itemListName: 'Learning path levels',
      itemListDescription: 'A structured learning path through personal finance, in levels from the basics to reviewing a plan.',
    },
    header: {
      h1: 'Learn about your money',
      subtitle: 'Short lessons for every kind of household, in any country. Where local rules matter, lessons say what to check.',
      link: 'How lessons are written',
    },
    island: {
      minRead: 'min read',
      /** Shown once every ladder lesson is read. */
      finishedEyebrow: 'Every lesson read',
      finishedHeading: 'You have read all {count} lessons on the path so far',
      finishedSub: 'New lessons appear here as they are published. Inclusive Finances and the topic list are other ways back in.',
      /** Shown to someone this browser knows has started the path. */
      returningEyebrow: 'Continue where you left off',
      returningSub: '{level}, lesson {index} of {total}',
      returningNote: '{read} of {total} {level} lessons read on this device',
      /** Shown with no progress at all. */
      newEyebrow: 'New here?',
      newHeading: 'A common starting point is {level}, the basic language of money',
      newSub: 'Lesson 1: {title}',
      continueReading: 'Continue reading',
      readLesson1: 'Read lesson 1',
      exploreInclusive: 'Explore Inclusive Finances',
      helperClose: 'Close the level helper',
      helperOpen: 'Help me choose a level',
      q1Note: 'Question 1 of 2',
      q1Text: 'Which of these could you explain to a friend?',
      q1Hint: 'Tick any that apply. Leaving them all blank is fine too.',
      next: 'Next',
      q2Note: 'Question 2 of 2',
      q2Text: 'What would help most right now?',
      back: 'Back',
      answersNote: 'Your answers are not saved, and no analytics record which ones you pick.',
      resultHeading: '{level} may be a useful place to begin',
      resultSuffix: 'This is only a reading suggestion: every level stays open.',
      resultReasonFoundation: 'You ticked {ticked} of the {total} {level} ideas, and the levels after it build on them.',
      resultReasonGoalPsych: 'It is where the lessons on {topic} are, and they work alongside any level.',
      resultReasonGoal: 'It is where the lessons on {topic} are, and you ticked enough of the ideas it builds on.',
      resultReasonGoalKnown: 'It is where the lessons on {topic} are. You ticked {ticked} of its {total} ideas, so parts may feel familiar.',
      resultReasonAllKnownPsych: 'You ticked most of the ideas in every level so far. Psychology looks at the gap between knowing what to do and doing it.',
      resultReasonAllKnown: 'You ticked most of the ideas in every level so far.',
      gapsNote: 'Lessons on the ideas you did not tick:',
      firstLessonNote: 'Its first lesson:',
      alsoLead: 'After that, or alongside it: ',
      /** Closes the line `alsoLead` opens, after the level's link. */
      alsoEnd: '.',
      seeAll: 'See all {level} lessons',
      startOver: 'Start over',
      pathHeading: 'The learning path',
      pathProgress: '{read} of {total} read on this device',
      pathHint: 'Read in order, or open any level',
      beingWritten: 'Being written',
      youAreHere: 'You are here',
      srRead: 'read',
      lessonsCount: '{count} lessons',
      alongside: 'Alongside every level',
      inclusiveName: 'Inclusive Finances',
      inclusiveSr: ', alongside every level',
      inclusiveSummary: 'When the standard plan does not fit: couples, shared homes, moving countries, disability and more',
      guideOne: 'guide',
      guideMany: 'guides',
      guideFew: 'guides',
      findHeading: 'Find a lesson',
      browseByTopic: 'Browse by topic',
      glossary: 'Glossary',
      searchLabel: 'Search lessons',
      searchPlaceholder: 'Search lessons, e.g. debt, renting',
      noMatches: 'No lessons match. A broader word, or the topic list, may help.',
      lessonOne: 'lesson',
      lessonMany: 'lessons',
      lessonFew: 'lessons',
      inclusivePill: 'Inclusive',
      showAll: 'Show all {count}',
      /** The ideas the helper's first question asks about (src/utils/levelHelper.ts). */
      concepts: {
        'net-worth': 'What net worth is, and how to work it out',
        'interest': 'Why the interest rate on a debt matters',
        'emergency-fund': 'What an emergency fund is for',
        'inflation': 'How inflation shrinks what money buys',
        'asset-classes': 'How shares, bonds and cash differ',
        'diversification': 'What diversification does, and what it does not',
        'tax-accounts': 'What a tax-advantaged account is',
        'rebalancing': 'Why a portfolio drifts and gets rebalanced',
        'fees': 'How a 1% yearly fee adds up over decades',
        'real-returns': 'What a real return is, after inflation and costs',
        'tax-loss': 'Tax-loss harvesting and asset location',
        'glide-path': 'What a glide path is',
      } as Record<string, string>,
      /** The helper's second question, each answer pointing at one level. */
      goals: {
        picture: { label: 'Seeing clearly where my money stands', topic: 'net worth, cash flow and budgeting' },
        safety: { label: 'Building a safety net, or getting on top of debt', topic: 'emergency funds and debt' },
        invest: { label: 'Starting to invest, or setting goals', topic: 'investing, accounts and goals' },
        habits: { label: 'Following through on what I already know', topic: 'habits, biases and following through' },
        refine: { label: 'Making a plan I already have work better', topic: 'fees, taxes and fine-tuning a plan' },
        unsure: { label: 'Not sure yet' },
      } as Record<string, { label: string; topic?: string }>,
    },
  },

  /** One level of the path, at `/blog/<level>/`. */
  level: {
    meta: {
      title: '{label}: {summary} | nidhi',
      descriptionWithCount: '{description} {count} free lessons, in reading order.',
    },
    schema: {
      itemListName: '{label} lessons',
    },
    eyebrow: 'Level {index} of {total}',
    coveredSummary: 'What this level covers',
    scope: 'Written for any country: where a lesson depends on local rules for tax, accounts or benefits, it says what to check where you live.',
    scopeLink: 'How lessons are written',
    empty: 'The lessons in this level are being written. New ones appear here as they are published.',
    nav: {
      /** The nav's own name, for a screen reader. */
      label: 'Levels',
      allLevels: 'All levels',
      next: 'Next level: {label}',
      inclusive: 'Inclusive Finances',
    },
  },

  /** One topic's lessons, at `/blog/tag/<tag>/`. */
  topic: {
    meta: {
      titleFallback: '{tag}: Personal Finance Literacy | nidhi',
      descriptionFallback: 'Articles about {tag}: practical personal finance literacy and financial education from nidhi.',
    },
    schema: {
      itemListName: '{tag} lessons',
    },
    eyebrow: 'Topic',
    /** The one-line count under the intro, joined from its two parts. */
    summary: {
      lessonsOne: '{count} lesson in {levels}',
      lessonsMany: '{count} lessons in {levels}',
      lessonsFew: '{count} lessons in {levels}',
      guidesOne: '{count} Inclusive Finances guide',
      guidesMany: '{count} Inclusive Finances guides',
      guidesFew: '{count} Inclusive Finances guides',
      join: ', plus ',
      levelList: '{list} and {last}',
    },
    nav: {
      /** The nav's own name, for a screen reader. */
      label: 'More ways to find lessons',
      allTopics: 'All topics',
      searchAll: 'Search every lesson',
    },
  },

  /** The topic hub, at `/blog/tag/`. */
  topics: {
    meta: {
      title: 'Browse by topic | nidhi',
      description: 'Every topic on the nidhi blog: net worth, budgeting, debt, investing, risk, and more. Pick a topic to read every post in that area.',
    },
    schema: {
      collectionName: 'Lesson topics',
    },
    h1: 'Browse by topic',
    subtitle: 'Every topic on the learning path, with a lesson count for each. Pick one to read every lesson in that area.',
    empty: 'No topics yet.',
    /** A tag with no curated entry still gets a card, with this line. */
    fallbackCard: 'Articles tagged "{tag}".',
    countOne: '{count} lesson',
    countMany: '{count} lessons',
    countFew: '{count} lessons',
  },

  /** The Inclusive Finances hub, at `/blog/inclusive-finances/`. */
  inclusiveFinances: {
    eyebrow: 'No prerequisite, relevant at any stage',
    h1: 'When the default plan does not fit you',
    lede1: 'Most financial advice quietly assumes one kind of household: a legally married couple or a single adult, a steady employer, a family the law recognises, a life lived in one country. Survivor benefits, joint tax filing, inheritance rules, and workplace pensions are all built around that shape.',
    lede2: 'These guides are for everyone else. Each one takes a single default, shows what breaks when it does not hold for you, and walks through the deliberate choices that replace it. You do not need to have read anything else on this site first.',
    scope: 'These guides teach what to check and what to ask. The legal details differ by country, so they never tell you what the law where you live says. For that, speak to a local professional.',
    situations: {
      heading: 'Explore by situation',
      note: 'Each link shows matching guides from across the whole site, not only this collection.',
      relationships: 'Couples, families, and shared households',
      immigration: 'Crossing borders',
      disability: 'Disability and means-tested benefits',
    },
    empty: 'The first guides in this collection are on their way.',
    emptyLink: 'Browse the learning path in the meantime',
  },

  /** The glossary, at `/blog/glossary/`: every term the published lessons define. */
  glossaryPage: {
    title: 'Glossary: the terms the lessons use',
    description: 'Plain definitions of the terms used across the nidhi lessons, each linked to the lesson that explains it.',
    h1: 'Glossary',
    intro: 'The terms the lessons use, in plain words. Each one links to the lesson that explains it in context.',
    inEnglish: 'The terms and their definitions are in English, like the lessons.',
    jumpToLetter: 'Jump to a letter',
    inContext: 'In context:',
    empty: 'No terms yet.',
  },
};

export const learnHi: typeof learnEn = {
  learn: {
    levels: {
      discovery: 'शुरुआत',
      building: 'निर्माण',
      psychology: 'मनोविज्ञान',
      optimizing: 'निखार',
      mastery: 'निपुणता',
      'inclusive-finances': 'सबके लिए वित्त',
    },
    summaries: {
      discovery: 'पैसे की बुनियादी भाषा',
      building: 'बजट, जोखिम और शुरुआती निवेश',
      psychology: 'आदतें और पूर्वाग्रह फ़ैसलों पर कैसे असर डालते हैं',
      optimizing: 'योजना की समीक्षा और बेहतरी',
      mastery: 'एस्टेट योजना (वसीयत और उत्तराधिकार) और लंबी अवधि की सोच',
    },
    levelMeta: {
      discovery: {
        description: 'बुनियादी बातें। अगर आप पर्सनल फाइनेंस में नए हैं, तो शुरुआत अक्सर यहीं से होती है।',
        covered: 'शुद्ध संपत्ति (net\u00A0worth), संपत्तियाँ (assets), देनदारियाँ (liabilities), कैश फ़्लो, कर्ज़ (debt), चक्रवृद्धि ब्याज (compound\u00A0interest), तरलता (liquidity), आपातकालीन कोष (emergency\u00A0funds), क्रय शक्ति (purchasing\u00A0power), पैसे का समय मूल्य (time\u00A0value\u00A0of\u00A0money), बचत बनाम निवेश (saving\u00A0vs\u00A0investing), क्रेडिट, बीमा (insurance)',
      },
      building: {
        description: 'टुकड़ों को जोड़ना। बजट, बचत के तरीक़े, और पहला निवेश।',
        covered: 'बजट, जोखिम (risk), एसेट क्लास, निवेश खाते (investment\u00A0accounts), विविधीकरण (diversification), वित्तीय स्वतंत्रता (financial\u00A0independence) का परिचय, एक से ज़्यादा मुद्राओं में पैसा (multi-currency), रियल एस्टेट, लोन की शर्तें (loan\u00A0terms), निष्क्रिय आय (passive\u00A0income), लक्ष्य (goals), डैशबोर्ड, वित्तीय सेहत के पैमाने (health\u00A0metrics), कर (taxes)',
      },
      psychology: {
        description: 'आपका मन पैसों के मामले में कैसे मदद भी करता है और नुकसान भी। व्यवहारगत पूर्वाग्रह, मानसिक मॉडल, और पैसे की बेहतर आदतें बनाना।',
        covered: 'हानि से बचने की प्रवृत्ति (loss\u00A0aversion), मानसिक लेखांकन (mental\u00A0accounting), वर्तमान पूर्वाग्रह (present\u00A0bias), अति आत्मविश्वास (overconfidence), फ़्रेमिंग और एंकरिंग, भेड़चाल (herd\u00A0behaviour), कथा अर्थशास्त्र (narrative\u00A0economics), मनी स्क्रिप्ट, पूर्वाग्रह-रोधी तंत्र (anti-bias\u00A0systems)',
      },
      optimizing: {
        description: 'जो चल रहा है उसे निखारना। कर दक्षता, पोर्टफ़ोलियो रीबैलेंसिंग, और उन्नत रणनीतियाँ।',
        covered: 'टैक्स-लॉस हार्वेस्टिंग, पोर्टफ़ोलियो रीबैलेंसिंग, एसेट लोकेशन (कौन-सा निवेश किस खाते में), विविधीकरण (diversification)',
      },
      mastery: {
        description: 'लंबी अवधि की सोच। पीढ़ियों की संपत्ति, एस्टेट योजना (वसीयत और उत्तराधिकार), और वित्तीय स्वतंत्रता।',
        covered: 'एस्टेट योजना (estate\u00A0planning), FIRE (वित्तीय स्वतंत्रता और जल्दी रिटायरमेंट), पीढ़ियों की संपत्ति (generational\u00A0wealth), निकासी रणनीतियाँ (withdrawal\u00A0strategies)',
      },
      'inclusive-finances': {
        description: 'उन घरों के लिए जिनके लिए मानक सलाह नहीं लिखी गई। हर मार्गदर्शिका एक आम धारणा लेती है, दिखाती है कि वह लागू न हो तो क्या टूटता है, और उसे सोच-समझकर नए सिरे से बनाती है।',
        covered: 'अविवाहित और लिव-इन जोड़े (unmarried\u00A0and\u00A0cohabiting\u00A0couples), साझा घर (shared\u00A0households), गिग काम, ब्याज-रहित वित्त (interest-free\u00A0finance), सीमा-पार परिवार (cross-border\u00A0households), अकेले बुढ़ापा जीने वाले (solo\u00A0agers), तलाक (divorce), देखभाल (caregiving), विकलांगता (disability), चुना हुआ परिवार (chosen\u00A0family), मिले-जुले परिवार (blended\u00A0families), जीवनसाथी को खोना (widowhood)',
      },
    },
    tags: {
      'discovery': {
        name: 'शुरुआत',
        title: 'शुरुआत श्रृंखला: पर्सनल फाइनेंस की बुनियाद | nidhi',
        description: 'nidhi सीखने के रास्ते का पहला स्तर: शुद्ध संपत्ति, संपत्तियाँ, कर्ज़, कैश फ़्लो, बजट और बचत। क्रम में पढ़ने के लिए शुरुआती मार्गदर्शिकाएँ।',
        card: 'nidhi सीखने के रास्ते का पहला स्तर: शुद्ध संपत्ति, संपत्तियाँ, कर्ज़, कैश फ़्लो, बजट और बचत। क्रम में पढ़ने के लिए शुरुआती मार्गदर्शिकाएँ।',
      },
      'building': {
        name: 'निर्माण',
        title: 'निर्माण श्रृंखला: निवेश, कर और योजना | nidhi',
        description: 'nidhi सीखने के रास्ते का दूसरा स्तर: जोखिम, निवेश, कर, वित्तीय स्वतंत्रता, लोन और लक्ष्य। बुनियाद को काम पर लगाने की मार्गदर्शिकाएँ।',
        card: 'nidhi सीखने के रास्ते का दूसरा स्तर: जोखिम, निवेश, कर, वित्तीय स्वतंत्रता, लोन और लक्ष्य। बुनियाद को काम पर लगाने की मार्गदर्शिकाएँ।',
      },
      'psychology': {
        name: 'मनोविज्ञान',
        title: 'पैसे का मनोविज्ञान: व्यवहारगत वित्त की मूल बातें | nidhi',
        description: 'पैसे से जुड़ा सही कदम जानना और उसे उठाना एक बात नहीं: हानि से बचने की प्रवृत्ति, मानसिक लेखांकन, वर्तमान पूर्वाग्रह, भेड़चाल। व्यवहारगत वित्त, आसान भाषा में।',
        card: 'पैसे से जुड़ा सही कदम जानना और उसे उठाना एक बात नहीं: हानि से बचने की प्रवृत्ति, मानसिक लेखांकन, वर्तमान पूर्वाग्रह, भेड़चाल। व्यवहारगत वित्त, आसान भाषा में।',
      },
      'optimizing': {
        name: 'निखार',
        title: 'निखार श्रृंखला: अनुमान, शुल्क और कर | nidhi',
        description: 'nidhi सीखने के रास्ते का चौथा स्तर: अनुमान, कैश प्रबंधन, रीफ़ाइनेंस, शुल्क और कर दक्षता। जो योजना चल रही है उसे निखारने की मार्गदर्शिकाएँ।',
        card: 'nidhi सीखने के रास्ते का चौथा स्तर: अनुमान, कैश प्रबंधन, रीफ़ाइनेंस, शुल्क और कर दक्षता। जो योजना चल रही है उसे निखारने की मार्गदर्शिकाएँ।',
      },
      'inclusive-finances': {
        name: 'सबके लिए वित्त',
        title: 'सबके लिए वित्त: जब आम योजना फ़िट नहीं बैठती | nidhi',
        description: 'उन घरों के लिए वित्तीय योजना जिन्हें मानक सलाह छोड़ देती है: अविवाहित जोड़े, अकेले बुढ़ापा जीने वाले, गिग कामगार, विकलांगता, सीमा-पार परिवार। पहले कुछ पढ़ना ज़रूरी नहीं।',
        card: 'उन घरों के लिए वित्तीय योजना जिन्हें मानक सलाह छोड़ देती है: अविवाहित जोड़े, अकेले बुढ़ापा जीने वाले, गिग कामगार, विकलांगता, सीमा-पार परिवार। पहले कुछ पढ़ना ज़रूरी नहीं।',
      },
      'relationships': {
        name: 'रिश्ते',
        title: 'पैसा और रिश्ते: जोड़े, परिवार, घर | nidhi',
        description: 'जोड़े, मिले-जुले परिवार, चुना हुआ परिवार और साझा घर पैसे की योजना कैसे बनाएँ जब कानून और आम धारणाएँ उनके जीने के तरीक़े से मेल न खाएँ।',
        card: 'जोड़े, मिले-जुले परिवार, चुना हुआ परिवार और साझा घर पैसे की योजना कैसे बनाएँ जब कानून और आम धारणाएँ उनके जीने के तरीक़े से मेल न खाएँ।',
      },
      'disability': {
        name: 'विकलांगता',
        title: 'विकलांगता के साथ वित्तीय योजना | nidhi',
        description: 'आय और संपत्ति की जाँच पर मिलने वाले सरकारी लाभ, देखभाल की लागत और ऐसी आय के इर्द-गिर्द बचत और योजना जो आम करियर के ढर्रे पर न चले। ढाँचे, देश-विशेष कानूनी सलाह नहीं।',
        card: 'आय और संपत्ति की जाँच पर मिलने वाले सरकारी लाभ, देखभाल की लागत और ऐसी आय के इर्द-गिर्द बचत और योजना जो आम करियर के ढर्रे पर न चले। ढाँचे, देश-विशेष कानूनी सलाह नहीं।',
      },
      'immigration': {
        name: 'प्रवास',
        title: 'सीमाओं के पार पैसा: आप्रवासी और प्रवासी | nidhi',
        description: 'जब आपका परिवार सीमाएँ पार करता है, तब क्रेडिट इतिहास, बैंकिंग, पेंशन और मान्यता न मिलने की दिक्कतें। आप्रवासियों और सीमा-पार परिवारों के लिए योजना ढाँचे।',
        card: 'जब आपका परिवार सीमाएँ पार करता है, तब क्रेडिट इतिहास, बैंकिंग, पेंशन और मान्यता न मिलने की दिक्कतें। आप्रवासियों और सीमा-पार परिवारों के लिए योजना ढाँचे।',
      },
      'fundamentals': {
        name: 'बुनियाद',
        title: 'वित्त की बुनियाद: वित्तीय साक्षरता | nidhi',
        description: 'हर वयस्क के लिए ज़रूरी पर्सनल फाइनेंस की बुनियादी अवधारणाएँ: संपत्तियाँ, देनदारियाँ, कैश फ़्लो, चक्रवृद्धि ब्याज, और बहुत कुछ। nidhi से मुफ़्त वित्तीय साक्षरता।',
        card: 'हर वयस्क के लिए ज़रूरी पर्सनल फाइनेंस की बुनियादी अवधारणाएँ: संपत्तियाँ, देनदारियाँ, कैश फ़्लो, चक्रवृद्धि ब्याज, और बहुत कुछ। nidhi से मुफ़्त वित्तीय साक्षरता।',
      },
      'debt': {
        name: 'कर्ज़',
        title: 'कर्ज़ को समझना और संभालना: वित्तीय साक्षरता | nidhi',
        description: 'कर्ज़ कैसे काम करता है, ब्याज दरें क्यों मायने रखती हैं, और कर्ज़ से निकलने के आज़माए हुए तरीक़े। nidhi से व्यावहारिक वित्तीय साक्षरता।',
        card: 'कर्ज़ कैसे काम करता है, ब्याज दरें क्यों मायने रखती हैं, और कर्ज़ से निकलने के आज़माए हुए तरीक़े। nidhi से व्यावहारिक वित्तीय साक्षरता।',
      },
      'saving': {
        name: 'बचत',
        title: 'पैसा बचाना: पर्सनल फाइनेंस की मूल बातें | nidhi',
        description: 'बचत कैसे असरदार बनाएँ: आपातकालीन कोष, बचत दरें, और बचत कब निवेश से बेहतर है। nidhi से वित्तीय साक्षरता मार्गदर्शिकाएँ।',
        card: 'बचत कैसे असरदार बनाएँ: आपातकालीन कोष, बचत दरें, और बचत कब निवेश से बेहतर है। nidhi से वित्तीय साक्षरता मार्गदर्शिकाएँ।',
      },
      'investing': {
        name: 'निवेश',
        title: 'निवेश की मूल बातें: वित्तीय साक्षरता | nidhi',
        description: 'निवेश करना सीखें: एसेट क्लास, जोखिम, चक्रवृद्धि ब्याज, और कब शुरू करें। शुरुआती पाठकों के लिए निवेश की आसान मार्गदर्शिकाएँ, वित्तीय साक्षरता के लिए।',
        card: 'निवेश करना सीखें: एसेट क्लास, जोखिम, चक्रवृद्धि ब्याज, और कब शुरू करें। शुरुआती पाठकों के लिए निवेश की आसान मार्गदर्शिकाएँ, वित्तीय साक्षरता के लिए।',
      },
      'risk': {
        name: 'जोखिम',
        title: 'वित्तीय जोखिम को समझना: निवेश साक्षरता | nidhi',
        description: 'जोखिम ख़तरा नहीं, अनिश्चितता है। उतार-चढ़ाव और स्थायी नुकसान में फ़र्क़ समझें, और यह भी कि समय जोखिम को कैसे बदलता है। nidhi से वित्तीय साक्षरता।',
        card: 'जोखिम ख़तरा नहीं, अनिश्चितता है। उतार-चढ़ाव और स्थायी नुकसान में फ़र्क़ समझें, और यह भी कि समय जोखिम को कैसे बदलता है।',
      },
      'planning': {
        name: 'योजना',
        title: 'वित्तीय योजना: खाते, कर और प्रगति पर नज़र | nidhi',
        description: 'वित्तीय ज्ञान को योजना में कैसे बदलें: खाते, कर, रीबैलेंसिंग, लक्ष्य, और किन बातों पर नज़र रखें। nidhi से व्यावहारिक वित्तीय योजना मार्गदर्शिकाएँ।',
        card: 'वित्तीय ज्ञान को योजना में कैसे बदलें: खाते, कर, रीबैलेंसिंग, लक्ष्य, और किन बातों पर नज़र रखें। nidhi से व्यावहारिक वित्तीय योजना मार्गदर्शिकाएँ।',
      },
      'goals': {
        name: 'लक्ष्य',
        title: 'वित्तीय लक्ष्य और प्रगति पर नज़र | nidhi',
        description: 'ठोस वित्तीय लक्ष्य कैसे तय करें और पता करें कि आप सही रास्ते पर हैं या नहीं: लक्ष्य राशि, वित्तीय सेहत के पैमाने, और एक सरल डैशबोर्ड। nidhi से योजना मार्गदर्शिकाएँ।',
        card: 'ठोस वित्तीय लक्ष्य कैसे तय करें और पता करें कि आप सही रास्ते पर हैं या नहीं: लक्ष्य राशि, वित्तीय सेहत के पैमाने, और एक सरल डैशबोर्ड। nidhi से योजना मार्गदर्शिकाएँ।',
      },
      'fire': {
        name: 'FIRE',
        title: 'वित्तीय स्वतंत्रता और जल्दी रिटायरमेंट (FIRE): मूल बातें | nidhi',
        description: 'वित्तीय स्वतंत्रता का मतलब क्या है, FIRE संख्या और सुरक्षित निकासी दरें कैसे काम करती हैं, और निष्क्रिय आय में असल में क्या लगता है। nidhi से ईमानदार मार्गदर्शिकाएँ।',
        card: 'वित्तीय स्वतंत्रता का मतलब क्या है, FIRE संख्या और सुरक्षित निकासी दरें कैसे काम करती हैं, और निष्क्रिय आय में असल में क्या लगता है। nidhi से ईमानदार मार्गदर्शिकाएँ।',
      },
      'taxes': {
        name: 'कर',
        title: 'कर और निवेश: वित्तीय साक्षरता | nidhi',
        description: 'कर हर वित्तीय फ़ैसले को कैसे आकार देते हैं, और कर-बचत खाते कहाँ फ़िट होते हैं। देश-दर-देश संदर्भ तालिका के साथ शैक्षिक मार्गदर्शिकाएँ।',
        card: 'कर हर वित्तीय फ़ैसले को कैसे आकार देते हैं, और कर-बचत खाते कहाँ फ़िट होते हैं। देश-दर-देश संदर्भ तालिका के साथ शैक्षिक मार्गदर्शिकाएँ।',
      },
      'currency': {
        name: 'मुद्रा',
        title: 'कई मुद्राओं में पैसा: विनिमय दरें और जोखिम | nidhi',
        description: 'एक से ज़्यादा मुद्राओं में पैसा संभालना: विनिमय दरें, क्रय शक्ति, और मुद्रा जोखिम जब आपका पैसा सीमाओं के पार हो। सीमा-पार जीवन के लिए मार्गदर्शिकाएँ।',
        card: 'एक से ज़्यादा मुद्राओं में पैसा संभालना: विनिमय दरें, क्रय शक्ति, और मुद्रा जोखिम जब आपका पैसा सीमाओं के पार हो। सीमा-पार जीवन के लिए मार्गदर्शिकाएँ।',
      },
      'real-estate': {
        name: 'रियल एस्टेट',
        title: 'निवेश के रूप में रियल एस्टेट: मूल बातें | nidhi',
        description: 'अपना घर होने से आगे रियल एस्टेट: रिटर्न, लीवरेज (उधार से निवेश), कम तरलता, और किराया बनाम खरीद का गणित। nidhi से वित्तीय साक्षरता।',
        card: 'अपना घर होने से आगे रियल एस्टेट: रिटर्न, लीवरेज (उधार से निवेश), कम तरलता, और किराया बनाम खरीद का गणित। nidhi से वित्तीय साक्षरता।',
      },
    },
    crumb: {
      learn: 'सीखें',
      topics: 'विषय',
      inclusive: 'सबके लिए वित्त',
    },
    levelFallback: 'सबके लिए वित्त',

    /**
     * हिन्दी पन्नों पर, जहाँ पाठों की सूची दिखती है। पाठ अंग्रेज़ी में लिखे गए हैं
     * और उनका अनुवाद नहीं है, इसलिए वह बात पन्ने को ही कहनी चाहिए।
     */
    lessonsInEnglish: 'पाठ अंग्रेज़ी में हैं। आपका ब्राउज़र पढ़ते समय इनका अनुवाद कर सकता है।',
    island: {
      minRead: 'मिनट का पठन',
      startHere: 'यहाँ से शुरू करें',
      new: 'नया',
      markRead: 'पढ़ा हुआ चिह्नित करें',
      markUnread: 'न पढ़ा चिह्नित करें',
      step: 'चरण {step}, कुल {count} में से',
      companionOptionalLabel: 'वैकल्पिक · {label}',
      companionOptionalFollows: '{host} के आगे का वैकल्पिक पाठ',
      companionFollows: '{host} के आगे का पाठ',
      readCount: 'इस डिवाइस पर {total} में से {read} पढ़े गए',
      markLevelRead: 'स्तर को पढ़ा हुआ चिह्नित करें',
      markLevelUnread: 'स्तर को न पढ़ा चिह्नित करें',
      orderHint: 'बाएँ से दाएँ, फिर नीचे पढ़ें।',
      allLessons: '{level} स्तर के सभी पाठ',
      allGuides: '{level} की सभी मार्गदर्शिकाएँ',
    },
  },

  blogIndex: {
    meta: {
      title: 'अपने पैसे के बारे में सीखें: पर्सनल फाइनेंस के मुफ़्त पाठ | nidhi',
      description: 'मुफ़्त पर्सनल फाइनेंस शिक्षा: शुद्ध संपत्ति, बजट, बचत, निवेश और कर्ज़ प्रबंधन। व्यावहारिक मार्गदर्शिकाओं के साथ कदम-दर-कदम वित्तीय साक्षरता बनाएँ।',
    },
    schema: {
      breadcrumbLearn: 'सीखें',
      itemListName: 'सीखने के रास्ते के स्तर',
      itemListDescription: 'पर्सनल फाइनेंस का एक व्यवस्थित सीखने का रास्ता, बुनियाद से योजना की समीक्षा तक के स्तरों में।',
    },
    header: {
      h1: 'अपने पैसे के बारे में सीखें',
      subtitle: 'हर तरह के घर के लिए, किसी भी देश में, छोटे पाठ। जहाँ स्थानीय नियम मायने रखते हैं, पाठ बताते हैं कि क्या जाँचें।',
      link: 'पाठ कैसे लिखे जाते हैं',
    },
    island: {
      minRead: 'मिनट का पठन',
      finishedEyebrow: 'सभी पाठ पढ़ लिए',
      finishedHeading: 'आपने रास्ते के अब तक के सभी {count} पाठ पढ़ लिए हैं',
      finishedSub: 'नए पाठ प्रकाशित होते ही यहाँ दिखते हैं। सबके लिए वित्त और विषय सूची वापस आने के दूसरे तरीक़े हैं।',
      returningEyebrow: 'जहाँ छोड़ा था वहीं से जारी रखें',
      returningSub: '{level} स्तर, पाठ {index} / {total}',
      returningNote: 'इस डिवाइस पर {level} स्तर के {total} में से {read} पाठ पढ़े गए',
      newEyebrow: 'यहाँ नए हैं?',
      newHeading: 'एक आम पहला कदम: {level} स्तर, यानी पैसे की बुनियादी भाषा',
      newSub: 'पाठ 1: {title}',
      continueReading: 'पढ़ना जारी रखें',
      readLesson1: 'पाठ 1 पढ़ें',
      exploreInclusive: 'सबके लिए वित्त देखें',
      helperClose: 'स्तर सहायक बंद करें',
      helperOpen: 'स्तर चुनने में मेरी मदद करें',
      q1Note: 'प्रश्न 1 / 2',
      q1Text: 'इनमें से कौन-सी बातें आप किसी दोस्त को समझा सकते हैं?',
      q1Hint: 'जो लागू हों उन्हें चुनें। सब खाली छोड़ना भी ठीक है।',
      next: 'आगे',
      q2Note: 'प्रश्न 2 / 2',
      q2Text: 'अभी सबसे ज़्यादा क्या मदद करेगा?',
      back: 'पीछे',
      answersNote: 'आपके जवाब सहेजे नहीं जाते, और कोई एनालिटिक्स यह दर्ज नहीं करती कि आपने क्या चुना।',
      resultHeading: '{level} स्तर एक काम का पहला पड़ाव हो सकता है',
      resultSuffix: 'यह सिर्फ़ एक पठन सुझाव है: हर स्तर खुला रहता है।',
      resultReasonFoundation: 'आपने {level} स्तर के {total} में से {ticked} विचार चुने, और उसके बाद के स्तर उन्हीं पर बनते हैं।',
      resultReasonGoalPsych: 'यहीं {topic} के पाठ हैं, और वे किसी भी स्तर के साथ चलते हैं।',
      resultReasonGoal: 'यहीं {topic} के पाठ हैं, और आपने उन विचारों में से काफ़ी चुने जिन पर यह बनता है।',
      resultReasonGoalKnown: 'यहीं {topic} के पाठ हैं। आपने इसके {total} में से {ticked} विचार चुने, तो कुछ हिस्से जाने-पहचाने लग सकते हैं।',
      resultReasonAllKnownPsych: 'आपने अब तक हर स्तर के ज़्यादातर विचार चुने हैं। मनोविज्ञान उस अंतर को देखता है जो जानने और करने के बीच होता है।',
      resultReasonAllKnown: 'आपने अब तक हर स्तर के ज़्यादातर विचार चुने हैं।',
      gapsNote: 'उन विचारों के पाठ जो आपने नहीं चुने:',
      firstLessonNote: 'इसका पहला पाठ:',
      alsoLead: 'उसके बाद, या उसके साथ: ',
      alsoEnd: '।',
      seeAll: '{level} स्तर के सभी पाठ देखें',
      startOver: 'फिर से शुरू करें',
      pathHeading: 'सीखने का रास्ता',
      pathProgress: 'इस डिवाइस पर {total} में से {read} पढ़े गए',
      pathHint: 'क्रम में पढ़ें, या कोई भी स्तर खोलें',
      beingWritten: 'लिखा जा रहा है',
      youAreHere: 'आप यहाँ हैं',
      srRead: 'पढ़ा',
      lessonsCount: '{count} पाठ',
      alongside: 'हर स्तर के साथ',
      inclusiveName: 'सबके लिए वित्त',
      inclusiveSr: ', हर स्तर के साथ',
      inclusiveSummary: 'जब मानक योजना फ़िट नहीं बैठती: जोड़े, साझा घर, देश बदलना, विकलांगता और बहुत कुछ',
      guideOne: 'मार्गदर्शिका',
      guideMany: 'मार्गदर्शिकाएँ',
      guideFew: 'मार्गदर्शिकाएँ',
      findHeading: 'पाठ खोजें',
      browseByTopic: 'विषय से देखें',
      glossary: 'शब्दावली',
      searchLabel: 'पाठ खोजें',
      searchPlaceholder: 'अंग्रेज़ी में खोजें, जैसे debt, renting',
      noMatches: 'कोई पाठ नहीं मिला। खोज पाठों के अंग्रेज़ी शीर्षकों और विवरणों में होती है; कोई व्यापक अंग्रेज़ी शब्द, या विषय सूची, मदद कर सकती है।',
      lessonOne: 'पाठ',
      lessonMany: 'पाठ',
      lessonFew: 'पाठ',
      inclusivePill: 'सबके लिए वित्त',
      showAll: 'सभी {count} दिखाएँ',
      concepts: {
        'net-worth': 'शुद्ध संपत्ति (net\u00A0worth) क्या है, और वह कैसे निकाली जाती है',
        'interest': 'किसी कर्ज़ पर ब्याज दर (interest\u00A0rate) क्यों मायने रखती है',
        'emergency-fund': 'आपातकालीन कोष (emergency\u00A0fund) किस काम आता है',
        'inflation': 'महँगाई (inflation) पैसे की क्रय शक्ति (purchasing\u00A0power) को कैसे घटाती है',
        'asset-classes': 'शेयर, बॉन्ड और नकद (cash) कैसे अलग हैं',
        'diversification': 'विविधीकरण (diversification) क्या करता है, और क्या नहीं',
        'tax-accounts': 'कर-बचत खाता (tax-advantaged\u00A0account) क्या होता है',
        'rebalancing': 'पोर्टफ़ोलियो अपने तय अनुपात से क्यों खिसकता है, और उसे रीबैलेंस क्यों किया जाता है',
        'fees': '1% सालाना शुल्क (fee) दशकों में कितना बड़ा हो जाता है',
        'real-returns': 'असली रिटर्न (real\u00A0return) क्या है, महँगाई और लागत के बाद',
        'tax-loss': 'टैक्स-लॉस हार्वेस्टिंग और एसेट लोकेशन',
        'glide-path': 'ग्लाइड पाथ क्या है',
      },
      goals: {
        picture: { label: 'साफ़ देखना कि मेरा पैसा कहाँ खड़ा है', topic: 'शुद्ध संपत्ति, कैश फ़्लो और बजट' },
        safety: { label: 'सुरक्षा जाल बनाना, या कर्ज़ पर क़ाबू पाना', topic: 'आपातकालीन कोष और कर्ज़' },
        invest: { label: 'निवेश शुरू करना, या लक्ष्य तय करना', topic: 'निवेश, खातों और लक्ष्यों' },
        habits: { label: 'जो पहले से पता है, उस पर अमल कर पाना', topic: 'आदतों, पूर्वाग्रहों और अमल' },
        refine: { label: 'पहले से बनी अपनी योजना को बेहतर बनाना', topic: 'शुल्क, कर और योजना में निखार' },
        unsure: { label: 'अभी तय नहीं' },
      },
    },
  },

  level: {
    meta: {
      title: '{label}: {summary} | nidhi',
      descriptionWithCount: '{description} {count} मुफ़्त पाठ, पढ़ने के क्रम में।',
    },
    schema: {
      itemListName: '{label} स्तर के पाठ',
    },
    eyebrow: 'स्तर {index} / {total}',
    coveredSummary: 'यह स्तर क्या-क्या कवर करता है',
    scope: 'किसी भी देश के लिए लिखा गया: जहाँ कोई पाठ कर, खातों या सरकारी लाभों के स्थानीय नियमों पर निर्भर है, वह बताता है कि अपने यहाँ क्या जाँचें।',
    scopeLink: 'पाठ कैसे लिखे जाते हैं',
    empty: 'इस स्तर के पाठ लिखे जा रहे हैं। प्रकाशित होते ही नए यहाँ दिखेंगे।',
    nav: {
      label: 'स्तर',
      allLevels: 'सभी स्तर',
      next: 'अगला स्तर: {label}',
      inclusive: 'सबके लिए वित्त',
    },
  },

  topic: {
    meta: {
      titleFallback: '{tag}: वित्तीय साक्षरता | nidhi',
      descriptionFallback: '{tag} पर पाठ: व्यावहारिक वित्तीय साक्षरता और nidhi से वित्तीय शिक्षा।',
    },
    schema: {
      itemListName: '{tag} के पाठ',
    },
    eyebrow: 'विषय',
    summary: {
      lessonsOne: '{levels} में {count} पाठ',
      lessonsMany: '{levels} में {count} पाठ',
      lessonsFew: '{levels} में {count} पाठ',
      guidesOne: 'सबके लिए वित्त की {count} मार्गदर्शिका',
      guidesMany: 'सबके लिए वित्त की {count} मार्गदर्शिकाएँ',
      guidesFew: 'सबके लिए वित्त की {count} मार्गदर्शिकाएँ',
      join: ', साथ ही ',
      levelList: '{list} और {last}',
    },
    nav: {
      label: 'पाठ खोजने के और तरीक़े',
      allTopics: 'सभी विषय',
      searchAll: 'हर पाठ खोजें',
    },
  },

  topics: {
    meta: {
      title: 'विषय से देखें | nidhi',
      description: 'nidhi ब्लॉग के सभी विषय: शुद्ध संपत्ति, बजट, कर्ज़, निवेश, जोखिम, और बहुत कुछ। किसी विषय को चुनकर उस क्षेत्र के सभी पाठ पढ़ें।',
    },
    schema: {
      collectionName: 'पाठ के विषय',
    },
    h1: 'विषय से देखें',
    subtitle: 'सीखने के रास्ते के सभी विषय, हर एक के पाठ की गिनती के साथ। किसी एक को चुनकर उस क्षेत्र के सभी पाठ पढ़ें।',
    empty: 'अभी कोई विषय नहीं।',
    fallbackCard: '"{tag}" टैग वाले पाठ।',
    countOne: '{count} पाठ',
    countMany: '{count} पाठ',
    countFew: '{count} पाठ',
  },

  inclusiveFinances: {
    eyebrow: 'पहले कुछ पढ़ना ज़रूरी नहीं, किसी भी चरण में उपयुक्त',
    h1: 'जब आम योजना आप पर फ़िट नहीं बैठती',
    lede1: 'ज़्यादातर वित्तीय सलाह चुपचाप एक तरह के घर को मान लेती है: कानूनी रूप से विवाहित जोड़ा या अकेला वयस्क, स्थिर नौकरी, कानून की मान्यता वाला परिवार, एक ही देश में बीता जीवन। जीवनसाथी की मृत्यु के बाद मिलने वाले लाभ, संयुक्त कर फ़ाइलिंग, विरासत के नियम और कार्यस्थल पेंशन, सब उसी ढाँचे पर बने हैं।',
    lede2: 'ये मार्गदर्शिकाएँ बाक़ी सबके लिए हैं। हर मार्गदर्शिका एक आम धारणा लेती है, दिखाती है कि वह आप पर लागू न हो तो क्या टूटता है, और उसकी जगह सोच-समझकर किए जा सकने वाले चुनावों को समझाती है। इस साइट पर पहले कुछ और पढ़ना ज़रूरी नहीं।',
    scope: 'ये मार्गदर्शिकाएँ सिखाती हैं कि क्या जाँचें और क्या पूछें। कानूनी ब्योरे देश-दर-देश अलग होते हैं, इसलिए ये कभी नहीं बतातीं कि आपके यहाँ कानून क्या कहता है। उसके लिए स्थानीय पेशेवर से बात करें।',
    situations: {
      heading: 'स्थिति से देखें',
      note: 'हर लिंक पूरी साइट की मेल खाती मार्गदर्शिकाएँ दिखाता है, सिर्फ़ इस संग्रह की नहीं।',
      relationships: 'जोड़े, परिवार और साझा घर',
      immigration: 'सीमाएँ पार करना',
      disability: 'विकलांगता और आय-संपत्ति की जाँच वाले सरकारी लाभ',
    },
    empty: 'इस संग्रह की पहली मार्गदर्शिकाएँ जल्द आ रही हैं।',
    emptyLink: 'तब तक सीखने का रास्ता देखें',
  },

  glossaryPage: {
    title: 'शब्दावली: पाठों में आने वाले शब्द',
    description: 'nidhi के पाठों में आने वाले शब्दों की आसान परिभाषाएँ, और हर शब्द उस पाठ से जुड़ा है जो उसे समझाता है।',
    h1: 'शब्दावली',
    intro: 'पाठों में आने वाले शब्द, आसान भाषा में। हर शब्द उस पाठ से जुड़ा है जो उसे संदर्भ के साथ समझाता है।',
    inEnglish: 'शब्द और उनकी परिभाषाएँ अंग्रेज़ी में हैं, पाठों की तरह।',
    jumpToLetter: 'किसी अक्षर पर जाएँ',
    inContext: 'संदर्भ में:',
    empty: 'अभी कोई शब्द नहीं है।',
  },
};

export const learnEs: typeof learnEn = {
  learn: {
    levels: {
      discovery: 'Descubrimiento',
      building: 'Construcción',
      psychology: 'Psicología',
      optimizing: 'Optimización',
      mastery: 'Dominio',
      'inclusive-finances': 'Finanzas inclusivas',
    },
    summaries: {
      discovery: 'El lenguaje básico del dinero',
      building: 'Presupuesto, riesgo y primeras inversiones',
      psychology: 'Hábitos y sesgos que moldean decisiones',
      optimizing: 'Revisar y afinar un plan',
      mastery: 'Planificación patrimonial y el largo plazo',
    },
    levelMeta: {
      discovery: {
        description: 'Los fundamentos. Si las finanzas personales son nuevas para ti, este es un punto de partida habitual.',
        covered: 'Patrimonio neto, activos, pasivos, flujo de efectivo, deuda, interés compuesto, liquidez, fondos de emergencia, poder adquisitivo, valor temporal del dinero, ahorrar frente a invertir, crédito, seguros',
      },
      building: {
        description: 'Unir las piezas. Presupuestos, sistemas de ahorro y las primeras inversiones.',
        covered: 'Presupuesto, riesgo, clases de activos, cuentas de inversión, diversificación, introducción a la independencia financiera, dinero en varias monedas, inmuebles, condiciones de los préstamos, ingresos pasivos, objetivos, panel de seguimiento, indicadores de salud financiera, impuestos',
      },
      psychology: {
        description: 'Cómo tu mente ayuda y perjudica a tu dinero. Sesgos conductuales, modelos mentales y mejores hábitos.',
        covered: 'Aversión a la pérdida, contabilidad mental, sesgo del presente, exceso de confianza, encuadre y anclaje, efecto manada, economía narrativa, guiones de dinero (money scripts), sistemas contra los sesgos',
      },
      optimizing: {
        description: 'Afinar lo que funciona. Eficiencia fiscal, reequilibrio de la cartera y estrategias avanzadas.',
        covered: 'Aprovechamiento fiscal de pérdidas (tax-loss harvesting), reequilibrio de la cartera, ubicación de activos, diversificación',
      },
      mastery: {
        description: 'El largo plazo. Riqueza intergeneracional, planificación patrimonial (testamento y herencia) e independencia financiera.',
        covered: 'Planificación patrimonial, FIRE (independencia financiera y jubilación anticipada), riqueza intergeneracional, estrategias para retirar dinero de la cartera',
      },
      'inclusive-finances': {
        description: 'Para hogares que el consejo habitual no tiene en cuenta. Cada guía examina un supuesto, muestra qué falla si no se cumple y lo replantea con cuidado.',
        covered: 'Parejas no casadas y parejas que conviven, hogares compartidos, trabajo por encargo, finanzas sin intereses, hogares entre países, personas que envejecen solas, divorcio, cuidado de otras personas, discapacidad, familia elegida, familias reconstituidas, viudez',
      },
    },
    tags: {
      'discovery': {
        name: 'Descubrimiento',
        title: 'Descubrimiento: fundamentos de finanzas personales | nidhi',
        description: 'El primer nivel de la ruta de nidhi: patrimonio neto, activos, deuda, flujo de efectivo, presupuesto y ahorro. Guías para empezar, en orden de lectura.',
        card: 'El primer nivel de la ruta de aprendizaje de nidhi: patrimonio neto, activos, deuda, flujo de efectivo, presupuesto y ahorro. Guías para quien empieza, pensadas para leerse en orden.',
      },
      'building': {
        name: 'Construcción',
        title: 'Construcción: inversión, impuestos y planificación | nidhi',
        description: 'El segundo nivel de la ruta de nidhi: riesgo, inversión, impuestos, independencia financiera, préstamos y objetivos. Guías para aplicar lo básico.',
        card: 'El segundo nivel de la ruta de aprendizaje de nidhi: riesgo, inversión, impuestos, independencia financiera, préstamos y objetivos. Guías para poner en práctica lo básico.',
      },
      'psychology': {
        name: 'Psicología',
        title: 'Psicología del dinero: finanzas conductuales | nidhi',
        description: 'Finanzas conductuales: por qué saber qué hacer con el dinero no basta para hacerlo. Aversión a la pérdida, contabilidad mental, sesgo del presente.',
        card: 'Por qué saber cuál es la decisión correcta con el dinero no es lo mismo que tomarla: aversión a la pérdida, contabilidad mental, sesgo del presente, efecto manada. Las finanzas conductuales, explicadas.',
      },
      'optimizing': {
        name: 'Optimización',
        title: 'Optimización: proyecciones, comisiones e impuestos | nidhi',
        description: 'Cuarto nivel de la ruta de nidhi: proyecciones, efectivo, refinanciación, comisiones y eficiencia fiscal, para afinar un plan que ya funciona.',
        card: 'El cuarto nivel de la ruta de aprendizaje de nidhi: proyecciones, gestión del efectivo, refinanciación, comisiones y eficiencia fiscal. Guías para afinar un plan que ya funciona.',
      },
      'inclusive-finances': {
        name: 'Finanzas inclusivas',
        title: 'Finanzas inclusivas: si el plan estándar no encaja | nidhi',
        description: 'Planificación para hogares que el consejo habitual omite: parejas no casadas, vejez en solitario, trabajo por encargo, discapacidad, familias entre países.',
        card: 'Planificación financiera para los hogares que el consejo habitual pasa por alto: parejas no casadas, personas que envejecen solas, trabajo por encargo, discapacidad, familias entre países. No hace falta leer nada antes.',
      },
      'relationships': {
        name: 'Relaciones',
        title: 'Dinero y relaciones: parejas, familias, hogares | nidhi',
        description: 'Cómo planifican el dinero parejas, familias reconstituidas, familia elegida y hogares compartidos cuando la ley y lo habitual no encajan con su vida.',
        card: 'Cómo pueden planificar el dinero las parejas, las familias reconstituidas, la familia elegida y los hogares compartidos cuando la ley y los supuestos habituales no se ajustan a su forma de vivir.',
      },
      'disability': {
        name: 'Discapacidad',
        title: 'Planificación financiera con una discapacidad | nidhi',
        description: 'Ahorrar y planificar con ayudas según ingresos y bienes, costos de cuidado e ingresos sin trayectoria laboral estándar. Marcos, no asesoría legal local.',
        card: 'Ahorrar y planificar teniendo en cuenta las ayudas sujetas a nivel de ingresos y patrimonio, los costos de los cuidados y unos ingresos que quizá no sigan una carrera profesional estándar. Marcos de referencia, no asesoramiento legal específico de un país.',
      },
      'immigration': {
        name: 'Inmigración',
        title: 'Dinero entre fronteras: inmigrantes y expatriados | nidhi',
        description: 'Historial crediticio, banca, pensiones y reconocimientos que se pierden al cruzar fronteras. Marcos para inmigrantes y familias entre países.',
        card: 'Historial crediticio, banca, pensiones y lo que un país no reconoce de otro cuando tu hogar cruza fronteras. Marcos de planificación para inmigrantes y familias entre países.',
      },
      'fundamentals': {
        name: 'Fundamentos',
        title: 'Fundamentos financieros: finanzas personales | nidhi',
        description: 'Lo esencial de las finanzas personales para toda persona adulta: activos, pasivos, flujo de efectivo, interés compuesto y más. Educación financiera gratis.',
        card: 'Conceptos básicos de finanzas personales que toda persona adulta debería conocer: activos, pasivos, flujo de efectivo, interés compuesto y más. Educación financiera gratuita de nidhi.',
      },
      'debt': {
        name: 'Deuda',
        title: 'Entender y gestionar la deuda: educación financiera | nidhi',
        description: 'Cómo funciona la deuda, por qué importan las tasas de interés y estrategias probadas para salir de deudas. Educación financiera práctica de nidhi.',
        card: 'Cómo funciona la deuda, por qué importan las tasas de interés y estrategias probadas para salir de deudas. Educación financiera práctica de nidhi.',
      },
      'saving': {
        name: 'Ahorro',
        title: 'Ahorrar dinero: nociones de finanzas personales | nidhi',
        description: 'Cómo ahorrar de forma eficaz: fondos de emergencia, tasas de ahorro y cuándo ahorrar es mejor que invertir. Guías de educación financiera de nidhi.',
        card: 'Cómo ahorrar de forma eficaz: fondos de emergencia, tasas de ahorro y cuándo ahorrar es mejor que invertir. Guías de educación financiera de nidhi.',
      },
      'investing': {
        name: 'Inversión',
        title: 'Nociones de inversión: educación financiera | nidhi',
        description: 'Aprende a invertir: clases de activos, riesgo, interés compuesto y cuándo empezar. Guías de inversión para principiantes y educación financiera.',
        card: 'Aprende a invertir: clases de activos, riesgo, interés compuesto y cuándo empezar. Guías de inversión para quien empieza, como parte de la educación financiera.',
      },
      'risk': {
        name: 'Riesgo',
        title: 'Entender el riesgo financiero al invertir | nidhi',
        description: 'El riesgo no es peligro, es incertidumbre: la diferencia entre volatilidad y pérdida permanente, y cómo el tiempo cambia el riesgo. Educación financiera.',
        card: 'El riesgo no es peligro, es incertidumbre. Aprende la diferencia entre volatilidad y pérdida permanente, y cómo el tiempo transforma el riesgo.',
      },
      'planning': {
        name: 'Planificación',
        title: 'Planificación financiera: cuentas, impuestos y control | nidhi',
        description: 'Cómo convertir el conocimiento financiero en un plan: cuentas, impuestos, reequilibrio, objetivos y qué seguir de cerca. Guías prácticas de planificación.',
        card: 'Cómo convertir el conocimiento financiero en un plan: cuentas, impuestos, reequilibrio, objetivos y qué seguir de cerca. Guías prácticas de planificación financiera de nidhi.',
      },
      'goals': {
        name: 'Objetivos',
        title: 'Objetivos financieros y seguimiento de tu progreso | nidhi',
        description: 'Cómo fijar objetivos financieros concretos y saber si vas por buen camino: cantidades objetivo, indicadores de salud financiera y un panel sencillo.',
        card: 'Cómo fijar objetivos financieros concretos y saber si vas por buen camino: cantidades objetivo, indicadores de salud financiera y un panel sencillo. Guías de planificación de nidhi.',
      },
      'fire': {
        name: 'FIRE',
        title: 'Independencia financiera (FIRE): lo básico | nidhi',
        description: 'Qué significa la independencia financiera, cómo funcionan la cifra FIRE y las tasas de retiro seguras, y qué exigen de verdad los ingresos pasivos.',
        card: 'Qué significa la independencia financiera, cómo funcionan la cifra FIRE y las tasas de retiro seguras, y qué exigen de verdad los ingresos pasivos. Guías honestas de nidhi.',
      },
      'taxes': {
        name: 'Impuestos',
        title: 'Impuestos e inversión: educación financiera | nidhi',
        description: 'Cómo influyen los impuestos en cada decisión financiera y qué papel tienen las cuentas con ventajas fiscales. Guías con una tabla de referencia por país.',
        card: 'Cómo los impuestos influyen en cada decisión financiera y qué lugar ocupan las cuentas con ventajas fiscales. Guías educativas con una tabla de referencia país por país.',
      },
      'currency': {
        name: 'Monedas',
        title: 'Dinero en varias monedas: tipos de cambio y riesgo | nidhi',
        description: 'Gestionar el dinero en varias monedas: tipos de cambio, poder adquisitivo y riesgo cambiario cuando tus finanzas cruzan fronteras. Para vivir entre países.',
        card: 'Gestionar el dinero en varias monedas: tipos de cambio, poder adquisitivo y riesgo cambiario cuando tus finanzas cruzan fronteras. Guías para una vida entre países.',
      },
      'real-estate': {
        name: 'Inmuebles',
        title: 'Los inmuebles como inversión: lo básico | nidhi',
        description: 'Los inmuebles más allá de la vivienda propia: rentabilidad, apalancamiento, falta de liquidez y las cuentas de alquilar o comprar. Educación financiera.',
        card: 'Los inmuebles más allá de tener vivienda propia: rentabilidad, apalancamiento, falta de liquidez y las cuentas de alquilar frente a comprar. Educación financiera de nidhi.',
      },
    },
    crumb: {
      learn: 'Aprende',
      topics: 'Temas',
      inclusive: 'Finanzas inclusivas',
    },
    levelFallback: 'Finanzas inclusivas',
    lessonsInEnglish: 'Las lecciones están en inglés. Tu navegador puede traducirlas mientras lees.',
    island: {
      minRead: 'min de lectura',
      startHere: 'Empieza aquí',
      new: 'Nueva',
      markRead: 'Marcar como leída',
      markUnread: 'Marcar como no leída',
      step: 'Paso {step} de {count}',
      companionOptionalLabel: 'Opcional · {label}',
      companionOptionalFollows: 'Continuación opcional de {host}',
      companionFollows: 'Continuación de {host}',
      readCount: '{read} de {total} leídas en este dispositivo',
      markLevelRead: 'Marcar el nivel como leído',
      markLevelUnread: 'Marcar el nivel como no leído',
      orderHint: 'Se lee de izquierda a derecha y luego hacia abajo.',
      allLessons: 'Todas las lecciones de {level}',
      allGuides: 'Todas las guías de {level}',
    },
  },

  blogIndex: {
    meta: {
      title: 'Aprende sobre tu dinero: finanzas personales gratis | nidhi',
      description: 'Educación gratuita en finanzas personales: patrimonio neto, presupuesto, ahorro, inversión y gestión de deudas. Aprende paso a paso con guías prácticas.',
    },
    schema: {
      breadcrumbLearn: 'Aprende',
      itemListName: 'Niveles de la ruta de aprendizaje',
      itemListDescription: 'Una ruta de aprendizaje estructurada por las finanzas personales, en niveles que van de lo básico a la revisión de un plan.',
    },
    header: {
      h1: 'Aprende sobre tu dinero',
      subtitle: 'Lecciones breves para todo tipo de hogar, en cualquier país. Donde importan las normas locales, las lecciones dicen qué comprobar.',
      link: 'Cómo se escriben las lecciones',
    },
    island: {
      minRead: 'min de lectura',
      finishedEyebrow: 'Todas las lecciones leídas',
      finishedHeading: 'Has leído las {count} lecciones publicadas hasta ahora en la ruta',
      finishedSub: 'Las lecciones nuevas aparecen aquí a medida que se publican. Finanzas inclusivas y la lista de temas son otras formas de volver a entrar.',
      returningEyebrow: 'Sigue donde lo dejaste',
      returningSub: '{level}, lección {index} de {total}',
      returningNote: '{read} de {total} lecciones de {level} leídas en este dispositivo',
      newEyebrow: '¿Primera vez aquí?',
      newHeading: 'Un punto de partida habitual es {level}, el lenguaje básico del dinero',
      newSub: 'Lección 1: {title}',
      continueReading: 'Seguir leyendo',
      readLesson1: 'Leer la lección 1',
      exploreInclusive: 'Explorar Finanzas inclusivas',
      helperClose: 'Cerrar la ayuda para elegir nivel',
      helperOpen: 'Ayúdame a elegir un nivel',
      q1Note: 'Pregunta 1 de 2',
      q1Text: '¿Cuáles de estas ideas podrías explicarle a alguien de confianza?',
      q1Hint: 'Marca las que correspondan. También está bien dejarlas todas sin marcar.',
      next: 'Siguiente',
      q2Note: 'Pregunta 2 de 2',
      q2Text: '¿Qué te ayudaría más ahora mismo?',
      back: 'Atrás',
      answersNote: 'Tus respuestas no se guardan, y ninguna analítica registra cuáles eliges.',
      resultHeading: '{level} puede ser un punto de partida útil',
      resultSuffix: 'Es solo una sugerencia de lectura: todos los niveles siguen abiertos.',
      resultReasonFoundation: 'Has marcado {ticked} de las {total} ideas de {level}, y los niveles siguientes se apoyan en ellas.',
      resultReasonGoalPsych: 'Ahí están las lecciones sobre {topic}, y se complementan con cualquier nivel.',
      resultReasonGoal: 'Ahí están las lecciones sobre {topic}, y has marcado suficientes de las ideas en las que se apoya.',
      resultReasonGoalKnown: 'Ahí están las lecciones sobre {topic}. Has marcado {ticked} de sus {total} ideas, así que algunas partes pueden resultarte conocidas.',
      resultReasonAllKnownPsych: 'Has marcado la mayoría de las ideas de todos los niveles publicados. Psicología examina la distancia entre saber qué hacer y hacerlo.',
      resultReasonAllKnown: 'Has marcado la mayoría de las ideas de todos los niveles publicados.',
      gapsNote: 'Lecciones sobre las ideas que no has marcado:',
      firstLessonNote: 'Su primera lección:',
      alsoLead: 'Después, o a la vez: ',
      /** Spanish closes the sentence with the same full stop as English. */
      alsoEnd: '.',
      seeAll: 'Ver todas las lecciones de {level}',
      startOver: 'Empezar de nuevo',
      pathHeading: 'La ruta de aprendizaje',
      pathProgress: '{read} de {total} leídas en este dispositivo',
      pathHint: 'Léela en orden o abre cualquier nivel',
      beingWritten: 'En preparación',
      youAreHere: 'Estás aquí',
      srRead: 'leída',
      lessonsCount: '{count} lecciones',
      alongside: 'Junto a todos los niveles',
      inclusiveName: 'Finanzas inclusivas',
      inclusiveSr: ', junto a todos los niveles',
      inclusiveSummary: 'Cuando el plan estándar no encaja: parejas, hogares compartidos, mudarse de país, discapacidad y más',
      guideOne: 'guía',
      guideMany: 'guías',
      guideFew: 'guías',
      findHeading: 'Encuentra una lección',
      browseByTopic: 'Explorar por tema',
      glossary: 'Glosario',
      searchLabel: 'Buscar lecciones',
      /** The search runs over the English titles and descriptions, so it says so. */
      searchPlaceholder: 'Busca en inglés, p. ej. debt, renting',
      noMatches: 'Ninguna lección coincide. La búsqueda mira los títulos y descripciones en inglés; una palabra más amplia en inglés, o la lista de temas, puede ayudar.',
      lessonOne: 'lección',
      lessonMany: 'lecciones',
      lessonFew: 'lecciones',
      /** The glossary never shortens the name to "inclusivas" alone. */
      inclusivePill: 'Finanzas inclusivas',
      showAll: 'Mostrar las {count}',
      concepts: {
        'net-worth': 'Qué es el patrimonio neto y cómo se calcula',
        'interest': 'Por qué importa la tasa de interés de una deuda',
        'emergency-fund': 'Para qué sirve un fondo de emergencia',
        'inflation': 'Cómo la inflación reduce lo que puede comprar el dinero',
        'asset-classes': 'En qué se diferencian las acciones, los bonos y el efectivo',
        'diversification': 'Qué hace la diversificación, y qué no',
        'tax-accounts': 'Qué es una cuenta con ventajas fiscales',
        'rebalancing': 'Por qué una cartera se desvía y se reequilibra',
        'fees': 'Cuánto suma una comisión anual del 1 % a lo largo de décadas',
        'real-returns': 'Qué es la rentabilidad real, después de la inflación y los costos',
        'tax-loss': 'Aprovechamiento fiscal de pérdidas y ubicación de activos',
        'glide-path': 'Qué es un glide path (la senda que reduce el riesgo de la cartera con los años)',
      },
      goals: {
        picture: { label: 'Ver con claridad cómo está mi dinero', topic: 'patrimonio neto, flujo de efectivo y presupuesto' },
        safety: { label: 'Crear un colchón de seguridad o controlar mis deudas', topic: 'fondos de emergencia y deuda' },
        invest: { label: 'Empezar a invertir o fijar objetivos', topic: 'inversión, cuentas y objetivos' },
        habits: { label: 'Llevar a la práctica lo que ya sé', topic: 'hábitos, sesgos y cómo pasar a la práctica' },
        refine: { label: 'Hacer que funcione mejor un plan que ya tengo', topic: 'comisiones, impuestos y cómo afinar un plan' },
        unsure: { label: 'Aún no lo sé' },
      },
    },
  },

  level: {
    meta: {
      title: '{label}: {summary} | nidhi',
      descriptionWithCount: '{description} {count} lecciones gratuitas, en orden de lectura.',
    },
    schema: {
      itemListName: 'Lecciones de {label}',
    },
    eyebrow: 'Nivel {index} de {total}',
    coveredSummary: 'Qué abarca este nivel',
    scope: 'Escrito para cualquier país: cuando una lección depende de las normas locales sobre impuestos, cuentas o ayudas, indica qué comprobar donde vives.',
    scopeLink: 'Cómo se escriben las lecciones',
    empty: 'Las lecciones de este nivel se están escribiendo. Las nuevas aparecen aquí a medida que se publican.',
    nav: {
      label: 'Niveles',
      allLevels: 'Todos los niveles',
      next: 'Siguiente nivel: {label}',
      inclusive: 'Finanzas inclusivas',
    },
  },

  topic: {
    meta: {
      titleFallback: '{tag}: educación en finanzas personales | nidhi',
      descriptionFallback: 'Artículos sobre {tag}: finanzas personales y educación financiera prácticas, de nidhi.',
    },
    schema: {
      itemListName: 'Lecciones sobre {tag}',
    },
    eyebrow: 'Tema',
    summary: {
      lessonsOne: '{count} lección en {levels}',
      lessonsMany: '{count} lecciones en {levels}',
      lessonsFew: '{count} lecciones en {levels}',
      guidesOne: '{count} guía de Finanzas inclusivas',
      guidesMany: '{count} guías de Finanzas inclusivas',
      guidesFew: '{count} guías de Finanzas inclusivas',
      join: ', además de ',
      levelList: '{list} y {last}',
    },
    nav: {
      label: 'Más formas de encontrar lecciones',
      allTopics: 'Todos los temas',
      searchAll: 'Buscar en todas las lecciones',
    },
  },

  topics: {
    meta: {
      title: 'Explorar por tema | nidhi',
      description: 'Todos los temas del blog de nidhi: patrimonio neto, presupuesto, deuda, inversión, riesgo y más. Elige un tema para leer todos los artículos de esa área.',
    },
    schema: {
      collectionName: 'Temas de las lecciones',
    },
    h1: 'Explorar por tema',
    subtitle: 'Todos los temas de la ruta de aprendizaje, con el número de lecciones de cada uno. Elige uno para leer todas las lecciones de esa área.',
    empty: 'Aún no hay temas.',
    fallbackCard: 'Artículos con la etiqueta «{tag}».',
    countOne: '{count} lección',
    countMany: '{count} lecciones',
    countFew: '{count} lecciones',
  },

  inclusiveFinances: {
    eyebrow: 'No hace falta leer nada antes; útil en cualquier etapa',
    h1: 'Cuando el plan estándar no encaja contigo',
    lede1: 'La mayoría de los consejos financieros dan por hecho, sin decirlo, un solo tipo de hogar: una pareja casada legalmente o una persona adulta sola, un empleo estable, una familia que la ley reconoce, una vida en un solo país. Las prestaciones por fallecimiento de la pareja, la declaración conjunta de impuestos, las normas de herencia y las pensiones ligadas al empleo se construyen en torno a esa forma.',
    lede2: 'Estas guías son para todas las demás personas. Cada una toma un solo supuesto de partida, muestra qué falla cuando no se cumple en tu caso y repasa las decisiones deliberadas que lo sustituyen. No hace falta haber leído nada más en este sitio.',
    scope: 'Estas guías enseñan qué comprobar y qué preguntar. Los detalles legales cambian de un país a otro, así que nunca te dirán lo que establece la ley donde vives. Para eso, busca asesoramiento profesional local.',
    situations: {
      heading: 'Explorar por situación',
      note: 'Cada enlace muestra las guías relacionadas de todo el sitio, no solo de esta colección.',
      relationships: 'Parejas, familias y hogares compartidos',
      immigration: 'Cruzar fronteras',
      disability: 'Discapacidad y ayudas sujetas a nivel de ingresos y patrimonio',
    },
    empty: 'Las primeras guías de esta colección están en camino.',
    emptyLink: 'Mientras tanto, explora la ruta de aprendizaje',
  },

  glossaryPage: {
    title: 'Glosario: los términos de las lecciones',
    description: 'Definiciones sencillas de los términos que usan las lecciones de nidhi, cada término con un enlace a la lección que lo explica.',
    h1: 'Glosario',
    intro: 'Los términos que usan las lecciones, en palabras sencillas. Cada uno enlaza con la lección que lo explica en contexto.',
    inEnglish: 'Los términos y sus definiciones están en inglés, como las lecciones.',
    jumpToLetter: 'Ir a una letra',
    inContext: 'En contexto:',
    empty: 'Todavía no hay términos.',
  },
};

/**
 * Czech. Vykání, lowercase *vy*; counts that the code does not pick a form for
 * are written so the noun does not follow the number (*počet lekcí: {count}*),
 * because Czech has three plural forms (docs/i18n/cs-glossary.md).
 */
export const learnCs: typeof learnEn = {
  learn: {
    levels: {
      discovery: 'Objevování',
      building: 'Budování',
      psychology: 'Psychologie',
      optimizing: 'Optimalizace',
      mastery: 'Mistrovství',
      'inclusive-finances': 'Inkluzivní finance',
    } as Record<string, string>,

    summaries: {
      discovery: 'Základní jazyk peněz',
      building: 'Rozpočty, riziko a první investice',
      psychology: 'Jak zvyky a zkreslení utvářejí rozhodnutí',
      optimizing: 'Revize a vylepšování plánu',
      mastery: 'Plánování pozůstalosti a dlouhá hra',
    } as Record<string, string>,

    levelMeta: {
      discovery: {
        description: 'Základy. Pokud s osobními financemi začínáte, tady je běžný výchozí bod.',
        covered: 'Čisté jmění, aktiva, závazky, peněžní tok, dluh, složené úročení, likvidita, finanční rezerva, kupní síla, časová hodnota peněz, spoření a investování, úvěr, pojištění',
      },
      building: {
        description: 'Skládání dílků dohromady. Rozpočty, systémy spoření a první investice.',
        covered: 'Rozpočet, riziko, třídy aktiv, investiční účty, diverzifikace, úvod do finanční nezávislosti, více měn, nemovitosti, podmínky úvěrů, pasivní příjem, cíle, přehled, ukazatele finančního zdraví, daně',
      },
      psychology: {
        description: 'Jak vám vlastní mysl s penězi pomáhá i škodí. Behaviorální zkreslení, mentální modely a budování lepších návyků.',
        covered: 'Averze ke ztrátě, mentální účetnictví, upřednostňování přítomnosti, přehnaná sebedůvěra, rámování a ukotvení, stádní chování, narativní ekonomie, finanční přesvědčení (money scripts), systémy proti zkreslením',
      },
      optimizing: {
        description: 'Doladění toho, co funguje. Daňová efektivita, rebalancování portfolia a pokročilé strategie.',
        covered: 'Daňové využití ztrát (tax-loss harvesting), rebalancování portfolia, rozložení investic mezi účty, diverzifikace',
      },
      mastery: {
        description: 'Dlouhá hra. Mezigenerační bohatství, plánování pozůstalosti a finanční nezávislost.',
        covered: 'Plánování pozůstalosti, FIRE, mezigenerační bohatství, strategie čerpání',
      },
      'inclusive-finances': {
        description: 'Pro domácnosti, pro které běžné rady nebyly psány. Každý průvodce vezme jeden výchozí předpoklad, ukáže, co se rozbije, když neplatí, a záměrně ho postaví znovu.',
        covered: 'Nesezdané a spolu žijící páry, sdílené domácnosti, příležitostná práce na zakázku, bezúročné financování, domácnosti přes hranice, stárnutí bez rodiny, rozvod, péče o blízké, zdravotní postižení, rodina z volby, rodiny s dětmi z předchozích vztahů, ovdovění',
      },
    } as Record<string, { description: string; covered: string }>,

    tags: {
      'discovery': {
        name: 'Objevování',
        title: 'Série Objevování: základy osobních financí | nidhi',
        description: 'První úroveň vzdělávací cesty nidhi: čisté jmění, aktiva, dluh, peněžní tok, rozpočet a spoření. Úvodní průvodci určení ke čtení v pořadí.',
        card: 'První úroveň vzdělávací cesty nidhi: čisté jmění, aktiva, dluh, peněžní tok, rozpočet a spoření. Úvodní průvodci určení ke čtení v pořadí.',
      },
      'building': {
        name: 'Budování',
        title: 'Série Budování: investování, daně a plánování | nidhi',
        description: 'Druhá úroveň vzdělávací cesty nidhi: riziko, investování, daně, finanční nezávislost, úvěry a cíle. Průvodci, jak základy uvést do praxe.',
        card: 'Druhá úroveň vzdělávací cesty nidhi: riziko, investování, daně, finanční nezávislost, úvěry a cíle. Průvodci, jak základy uvést do praxe.',
      },
      'psychology': {
        name: 'Psychologie',
        title: 'Psychologie peněz: základy behaviorálních financí | nidhi',
        description: 'Proč vědět, co s penězi udělat, není totéž jako to udělat: averze ke ztrátě, mentální účetnictví, upřednostňování přítomnosti, stádní chování. Behaviorální finance srozumitelně.',
        card: 'Proč vědět, co s penězi udělat, není totéž jako to udělat: averze ke ztrátě, mentální účetnictví, upřednostňování přítomnosti, stádní chování. Behaviorální finance srozumitelně.',
      },
      'optimizing': {
        name: 'Optimalizace',
        title: 'Série Optimalizace: projekce, poplatky a daně | nidhi',
        description: 'Čtvrtá úroveň vzdělávací cesty nidhi: projekce, správa hotovosti, refinancování, poplatky a daňová efektivita. Průvodci pro doladění plánu, který už funguje.',
        card: 'Čtvrtá úroveň vzdělávací cesty nidhi: projekce, správa hotovosti, refinancování, poplatky a daňová efektivita. Průvodci pro doladění plánu, který už funguje.',
      },
      'inclusive-finances': {
        name: 'Inkluzivní finance',
        title: 'Inkluzivní finance: když výchozí plán nesedí | nidhi',
        description: 'Finanční plánování pro domácnosti, které běžné rady opomíjejí: nesezdané páry, stárnutí bez rodiny, práce na zakázku, zdravotní postižení, rodiny přes hranice. Bez předchozích znalostí.',
        card: 'Finanční plánování pro domácnosti, které běžné rady opomíjejí: nesezdané páry, stárnutí bez rodiny, práce na zakázku, zdravotní postižení, rodiny přes hranice. Bez předchozích znalostí.',
      },
      'relationships': {
        name: 'Vztahy',
        title: 'Peníze a vztahy: páry, rodiny, domácnosti | nidhi',
        description: 'Jak mohou páry, rodiny s dětmi z předchozích vztahů, rodiny z volby a sdílené domácnosti plánovat peníze, když zákon a výchozí nastavení neodpovídají tomu, jak žijí.',
        card: 'Jak mohou páry, rodiny s dětmi z předchozích vztahů, rodiny z volby a sdílené domácnosti plánovat peníze, když zákon a výchozí nastavení neodpovídají tomu, jak žijí.',
      },
      'disability': {
        name: 'Zdravotní postižení',
        title: 'Finanční plánování se zdravotním postižením | nidhi',
        description: 'Spoření a plánování s dávkami závislými na příjmu a majetku, náklady na péči a příjmy, které nemusí odpovídat běžnému průběhu kariéry. Rámce, ne právní rady pro konkrétní zemi.',
        card: 'Spoření a plánování s dávkami závislými na příjmu a majetku, náklady na péči a příjmy, které nemusí odpovídat běžnému průběhu kariéry. Rámce, ne právní rady pro konkrétní zemi.',
      },
      'immigration': {
        name: 'Migrace',
        title: 'Peníze přes hranice: přistěhovalci a expati | nidhi',
        description: 'Úvěrová historie, bankovnictví, důchody a problémy s uznáváním dokladů a kvalifikace, když vaše domácnost překračuje hranice. Rámce plánování pro přistěhovalce a rodiny přes hranice.',
        card: 'Úvěrová historie, bankovnictví, důchody a problémy s uznáváním dokladů a kvalifikace, když vaše domácnost překračuje hranice. Rámce plánování pro přistěhovalce a rodiny přes hranice.',
      },
      'fundamentals': {
        name: 'Základy',
        title: 'Finanční základy: gramotnost v osobních financích | nidhi',
        description: 'Základní pojmy osobních financí, které se hodí znát každému dospělému: aktiva, závazky, peněžní tok, složené úročení a další. Finanční gramotnost zdarma na webu nidhi.',
        card: 'Základní pojmy osobních financí, které se hodí znát každému dospělému: aktiva, závazky, peněžní tok, složené úročení a další. Finanční gramotnost zdarma na webu nidhi.',
      },
      'debt': {
        name: 'Dluh',
        title: 'Jak funguje dluh a jak ho zvládat: finanční gramotnost | nidhi',
        description: 'Jak dluh funguje, proč záleží na úrokových sazbách a jaké osvědčené postupy lidé při splácení dluhů používají. Praktická finanční gramotnost na webu nidhi.',
        card: 'Jak dluh funguje, proč záleží na úrokových sazbách a jaké osvědčené postupy lidé při splácení dluhů používají. Praktická finanční gramotnost na webu nidhi.',
      },
      'saving': {
        name: 'Spoření',
        title: 'Spoření: základy osobních financí | nidhi',
        description: 'Jak efektivně spořit: finanční rezerva, míra úspor a kdy má spoření před investováním přednost. Průvodci finanční gramotností na webu nidhi.',
        card: 'Jak efektivně spořit: finanční rezerva, míra úspor a kdy má spoření před investováním přednost. Průvodci finanční gramotností na webu nidhi.',
      },
      'investing': {
        name: 'Investování',
        title: 'Základy investování: finanční gramotnost | nidhi',
        description: 'Jak investování funguje: třídy aktiv, riziko, složené úročení a otázka, kdy začít. Úvodní průvodci investováním pro rozvoj finanční gramotnosti.',
        card: 'Jak investování funguje: třídy aktiv, riziko, složené úročení a otázka, kdy začít. Úvodní průvodci investováním pro rozvoj finanční gramotnosti.',
      },
      'risk': {
        name: 'Riziko',
        title: 'Finanční riziko srozumitelně: investiční gramotnost | nidhi',
        description: 'Riziko není nebezpečí, je to nejistota. Poznejte rozdíl mezi kolísáním a trvalou ztrátou a jak čas mění riziko. Finanční gramotnost na webu nidhi.',
        card: 'Riziko není nebezpečí, je to nejistota. Poznejte rozdíl mezi kolísáním a trvalou ztrátou a jak čas mění riziko.',
      },
      'planning': {
        name: 'Plánování',
        title: 'Finanční plánování: účty, daně a sledování | nidhi',
        description: 'Jak z finančních znalostí udělat plán: účty, daně, rebalancování, cíle a co sledovat. Praktičtí průvodci finančním plánováním na webu nidhi.',
        card: 'Jak z finančních znalostí udělat plán: účty, daně, rebalancování, cíle a co sledovat. Praktičtí průvodci finančním plánováním na webu nidhi.',
      },
      'goals': {
        name: 'Cíle',
        title: 'Finanční cíle a sledování pokroku | nidhi',
        description: 'Jak si stanovit konkrétní finanční cíle a poznat, zda jste na dobré cestě: cílové částky, ukazatele finančního zdraví a jednoduchý přehled. Průvodci plánováním na webu nidhi.',
        card: 'Jak si stanovit konkrétní finanční cíle a poznat, zda jste na dobré cestě: cílové částky, ukazatele finančního zdraví a jednoduchý přehled. Průvodci plánováním na webu nidhi.',
      },
      'fire': {
        name: 'FIRE',
        title: 'Finanční nezávislost (FIRE): základy | nidhi',
        description: 'Co znamená finanční nezávislost, jak funguje číslo FIRE a takzvaná bezpečná míra čerpání a co pasivní příjem opravdu obnáší. Průvodci bez příkras na webu nidhi.',
        card: 'Co znamená finanční nezávislost, jak funguje číslo FIRE a takzvaná bezpečná míra čerpání a co pasivní příjem opravdu obnáší. Průvodci bez příkras na webu nidhi.',
      },
      'taxes': {
        name: 'Daně',
        title: 'Daně a investování: finanční gramotnost | nidhi',
        description: 'Jak daně ovlivňují každé finanční rozhodnutí a kam zapadají daňově zvýhodněné účty. Vzdělávací průvodci s přehledovou tabulkou podle zemí.',
        card: 'Jak daně ovlivňují každé finanční rozhodnutí a kam zapadají daňově zvýhodněné účty. Vzdělávací průvodci s přehledovou tabulkou podle zemí.',
      },
      'currency': {
        name: 'Měna',
        title: 'Peníze ve více měnách: kurzy a riziko | nidhi',
        description: 'Správa peněz ve více měnách: směnné kurzy, kupní síla a měnové riziko, když vaše finance překračují hranice. Průvodci pro život přes hranice.',
        card: 'Správa peněz ve více měnách: směnné kurzy, kupní síla a měnové riziko, když vaše finance překračují hranice. Průvodci pro život přes hranice.',
      },
      'real-estate': {
        name: 'Nemovitosti',
        title: 'Nemovitosti jako investice: základy | nidhi',
        description: 'Nemovitosti nad rámec vlastního bydlení: výnosy, finanční páka, nízká likvidita a výpočet, zda se vyplatí nájem, nebo koupě. Finanční gramotnost na webu nidhi.',
        card: 'Nemovitosti nad rámec vlastního bydlení: výnosy, finanční páka, nízká likvidita a výpočet, zda se vyplatí nájem, nebo koupě. Finanční gramotnost na webu nidhi.',
      },
    } as Record<string, { name: string; title: string; description: string; card: string }>,

    crumb: {
      learn: 'Lekce',
      topics: 'Témata',
      inclusive: 'Inkluzivní finance',
    },

    levelFallback: 'Inkluzivní finance',

    lessonsInEnglish: 'Lekce jsou v angličtině. Prohlížeč je umí přeložit přímo při čtení.',

    island: {
      minRead: 'min čtení',
      startHere: 'Začít tady',
      new: 'Nové',
      markRead: 'Označit jako přečtené',
      markUnread: 'Označit jako nepřečtené',
      step: 'Krok {step} z {count}',
      companionOptionalLabel: 'Volitelné · {label}',
      companionOptionalFollows: 'Volitelně navazuje na lekci {host}',
      companionFollows: 'Navazuje na lekci {host}',
      readCount: 'Na tomto zařízení přečteno {read} z {total}',
      markLevelRead: 'Označit úroveň jako přečtenou',
      markLevelUnread: 'Označit úroveň jako nepřečtenou',
      orderHint: 'Čtěte zleva doprava, pak dolů.',
      allLessons: 'Všechny lekce úrovně {level}',
      allGuides: 'Všichni průvodci úrovně {level}',
    },
  },

  blogIndex: {
    meta: {
      title: 'Porozumějte svým penězům: lekce osobních financí zdarma | nidhi',
      description: 'Vzdělávání v osobních financích zdarma: čisté jmění, rozpočet, spoření, investování a správa dluhů. Finanční gramotnost krok za krokem s praktickými průvodci.',
    },
    schema: {
      breadcrumbLearn: 'Lekce',
      itemListName: 'Úrovně vzdělávací cesty',
      itemListDescription: 'Strukturovaná vzdělávací cesta osobními financemi, po úrovních od základů po revizi plánu.',
    },
    header: {
      h1: 'Porozumějte svým penězům',
      subtitle: 'Krátké lekce pro každý typ domácnosti, v jakékoli zemi. Kde záleží na místních pravidlech, lekce řeknou, co si ověřit.',
      link: 'Jak lekce vznikají',
    },
    island: {
      minRead: 'min čtení',
      finishedEyebrow: 'Vše přečteno',
      finishedHeading: 'Všechny dosavadní lekce na cestě máte přečtené ({count})',
      finishedSub: 'Nové lekce se tu objeví, jakmile vyjdou. Inkluzivní finance a seznam témat jsou další cesty zpět.',
      returningEyebrow: 'Pokračujte tam, kde to máte rozečtené',
      returningSub: '{level}, lekce {index} z {total}',
      returningNote: 'Počet přečtených lekcí úrovně {level} na tomto zařízení: {read} z {total}',
      newEyebrow: 'Jste tu poprvé?',
      newHeading: 'Běžným výchozím bodem je úroveň {level}, základní jazyk peněz',
      newSub: 'Lekce 1: {title}',
      continueReading: 'Pokračovat ve čtení',
      readLesson1: 'Přečíst lekci 1',
      exploreInclusive: 'Prozkoumat Inkluzivní finance',
      helperClose: 'Zavřít pomocníka s výběrem úrovně',
      helperOpen: 'Pomozte mi vybrat úroveň',
      q1Note: 'Otázka 1 ze 2',
      q1Text: 'Co z toho umíte vysvětlit někomu z přátel?',
      q1Hint: 'Zaškrtněte vše, co platí. Nechat vše prázdné je také v pořádku.',
      next: 'Další',
      q2Note: 'Otázka 2 ze 2',
      q2Text: 'Co by vám teď pomohlo nejvíc?',
      back: 'Zpět',
      answersNote: 'Vaše odpovědi se neukládají a žádná analytika nezaznamenává, které vyberete.',
      resultHeading: 'Úroveň {level} může být užitečným místem, kde začít',
      resultSuffix: 'Je to jen návrh ke čtení: každá úroveň zůstává otevřená.',
      resultReasonFoundation: 'Počet zaškrtnutých myšlenek úrovně {level}: {ticked} z {total}. Následující úrovně na nich stavějí.',
      resultReasonGoalPsych: 'Najdete tu lekce na téma {topic} a fungují vedle kterékoli úrovně.',
      resultReasonGoal: 'Najdete tu lekce na téma {topic} a myšlenek, na kterých staví, je zaškrtnuto dost.',
      resultReasonGoalKnown: 'Najdete tu lekce na téma {topic}. Počet zaškrtnutých myšlenek této úrovně: {ticked} z {total}, takže něco může působit povědomě.',
      resultReasonAllKnownPsych: 'Zaškrtnuta je většina myšlenek ze všech dosavadních úrovní. Psychologie se dívá na mezeru mezi tím, co dělat víme, a tím, co opravdu děláme.',
      resultReasonAllKnown: 'Zaškrtnuta je většina myšlenek ze všech dosavadních úrovní.',
      gapsNote: 'Lekce o myšlenkách, které zaškrtnuté nejsou:',
      firstLessonNote: 'Její první lekce:',
      alsoLead: 'Potom, nebo souběžně: ',
      alsoEnd: '.',
      seeAll: 'Zobrazit všechny lekce úrovně {level}',
      startOver: 'Začít znovu',
      pathHeading: 'Vzdělávací cesta',
      pathProgress: 'Na tomto zařízení přečteno {read} z {total}',
      pathHint: 'Čtěte popořadě, nebo otevřete kteroukoli úroveň',
      beingWritten: 'Připravuje se',
      youAreHere: 'Jste tady',
      srRead: 'přečteno',
      lessonsCount: 'počet lekcí: {count}',
      alongside: 'Souběžně s každou úrovní',
      inclusiveName: 'Inkluzivní finance',
      inclusiveSr: ', souběžně s každou úrovní',
      inclusiveSummary: 'Když standardní plán nesedí: páry, sdílené bydlení, stěhování do jiné země, zdravotní postižení a další',
      guideOne: 'průvodce',
      guideMany: 'průvodců',
      guideFew: 'průvodci',
      findHeading: 'Najít lekci',
      browseByTopic: 'Procházet podle tématu',
      glossary: 'Slovníček pojmů',
      searchLabel: 'Hledat v lekcích',
      searchPlaceholder: 'Hledejte anglicky: debt, renting',
      noMatches: 'Žádná lekce neodpovídá. Pomoci může obecnější slovo nebo seznam témat.',
      lessonOne: 'lekce',
      lessonMany: 'lekcí',
      lessonFew: 'lekce',
      inclusivePill: 'Inkluzivní finance',
      showAll: 'Zobrazit vše ({count})',
      concepts: {
        'net-worth': 'Co je čisté jmění a jak ho spočítat',
        'interest': 'Proč záleží na úrokové sazbě dluhu',
        'emergency-fund': 'K čemu slouží finanční rezerva',
        'inflation': 'Jak inflace zmenšuje, co si za peníze koupíte',
        'asset-classes': 'Jak se liší akcie, dluhopisy a hotovost',
        'diversification': 'Co diverzifikace dělá a co ne',
        'tax-accounts': 'Co je daňově zvýhodněný účet',
        'rebalancing': 'Proč se portfolio odchyluje a rebalancuje',
        'fees': 'Kolik dělá roční poplatek 1 % za desítky let',
        'real-returns': 'Co je reálný výnos po inflaci a nákladech',
        'tax-loss': 'Daňové využití ztrát a rozložení investic mezi účty',
        'glide-path': 'Co je postupné snižování rizika portfolia (glide path)',
      } as Record<string, string>,
      goals: {
        picture: { label: 'Mít jasný přehled, jak na tom s penězi jsem', topic: 'čisté jmění, peněžní tok a rozpočet' },
        safety: { label: 'Vytvořit si finanční polštář nebo dostat dluhy pod kontrolu', topic: 'finanční rezerva a dluhy' },
        invest: { label: 'Začít investovat nebo si stanovit cíle', topic: 'investování, účty a cíle' },
        habits: { label: 'Dotáhnout to, co už vím', topic: 'zvyky, zkreslení a dotahování věcí' },
        refine: { label: 'Vylepšit plán, který už mám', topic: 'poplatky, daně a ladění plánu' },
        unsure: { label: 'Zatím nevím' },
      } as Record<string, { label: string; topic?: string }>,
    },
  },

  level: {
    meta: {
      title: '{label}: {summary} | nidhi',
      descriptionWithCount: '{description} Lekce zdarma v pořadí čtení, celkem {count}.',
    },
    schema: {
      itemListName: 'Lekce úrovně {label}',
    },
    eyebrow: 'Úroveň {index} z {total}',
    coveredSummary: 'Co tato úroveň zahrnuje',
    scope: 'Psáno pro kteroukoli zemi: kde lekce závisí na místních pravidlech pro daně, účty nebo dávky, řekne, co si ověřit tam, kde žijete.',
    scopeLink: 'Jak lekce vznikají',
    empty: 'Lekce této úrovně se připravují. Nové se tu objeví, jakmile vyjdou.',
    nav: {
      label: 'Úrovně',
      allLevels: 'Všechny úrovně',
      next: 'Další úroveň: {label}',
      inclusive: 'Inkluzivní finance',
    },
  },

  topic: {
    meta: {
      titleFallback: '{tag}: finanční gramotnost | nidhi',
      descriptionFallback: 'Články na téma {tag}: praktická finanční gramotnost a vzdělávání v osobních financích na webu nidhi.',
    },
    schema: {
      itemListName: 'Lekce na téma {tag}',
    },
    eyebrow: 'Téma',
    summary: {
      lessonsOne: '{count} lekce (úroveň {levels})',
      lessonsMany: '{count} lekcí (úrovně {levels})',
      lessonsFew: '{count} lekce (úrovně {levels})',
      guidesOne: '{count} průvodce z kolekce Inkluzivní finance',
      guidesMany: '{count} průvodců z kolekce Inkluzivní finance',
      guidesFew: '{count} průvodci z kolekce Inkluzivní finance',
      join: ' a k tomu ',
      levelList: '{list} a {last}',
    },
    nav: {
      label: 'Další způsoby, jak najít lekce',
      allTopics: 'Všechna témata',
      searchAll: 'Hledat ve všech lekcích',
    },
  },

  topics: {
    meta: {
      title: 'Procházet podle tématu | nidhi',
      description: 'Všechna témata blogu nidhi: čisté jmění, rozpočet, dluh, investování, riziko a další. Vyberte téma a čtěte všechny články z dané oblasti.',
    },
    schema: {
      collectionName: 'Témata lekcí',
    },
    h1: 'Procházet podle tématu',
    subtitle: 'Všechna témata vzdělávací cesty s počtem lekcí u každého. Vyberte jedno a čtěte všechny lekce z dané oblasti.',
    empty: 'Zatím žádná témata.',
    fallbackCard: 'Články se štítkem „{tag}“.',
    countOne: '{count} lekce',
    countMany: '{count} lekcí',
    countFew: '{count} lekce',
  },

  inclusiveFinances: {
    eyebrow: 'Bez předchozích znalostí, užitečné v jakékoli fázi',
    h1: 'Když vám výchozí plán nesedí',
    lede1: 'Většina finančních rad mlčky předpokládá jeden typ domácnosti: manželský pár nebo jednoho dospělého, stálé zaměstnání, rodinu, kterou uznává zákon, a život v jedné zemi. Dávky pro pozůstalé, společné zdanění, dědické právo i zaměstnanecké penzijní programy jsou postavené kolem tohoto uspořádání.',
    lede2: 'Tito průvodci jsou pro všechny ostatní. Každý vezme jeden výchozí předpoklad, ukáže, co se rozbije, když pro vás neplatí, a projde záměrné volby, které ho nahradí. Nic jiného na tomto webu není třeba číst předem.',
    scope: 'Tito průvodci učí, co si ověřit a na co se ptát. Právní podrobnosti se liší podle země, takže nikdy neříkají, co stanoví zákon tam, kde žijete. K tomu se obraťte na místního odborníka.',
    situations: {
      heading: 'Procházet podle situace',
      note: 'Každý odkaz ukazuje odpovídající průvodce z celého webu, nejen z této kolekce.',
      relationships: 'Páry, rodiny a sdílené domácnosti',
      immigration: 'Život přes hranice',
      disability: 'Zdravotní postižení a dávky závislé na příjmu a majetku',
    },
    empty: 'První průvodci této kolekce se připravují.',
    emptyLink: 'Mezitím si projděte vzdělávací cestu',
  },

  glossaryPage: {
    title: 'Slovníček pojmů z lekcí',
    description: 'Jednoduchá vysvětlení pojmů, které používají lekce nidhi, u každého s odkazem na lekci, která ho vysvětluje.',
    h1: 'Slovníček pojmů',
    intro: 'Pojmy, které lekce používají, vysvětlené jednoduše. Každý odkazuje na lekci, která ho vysvětluje v souvislostech.',
    inEnglish: 'Pojmy i jejich vysvětlení jsou v angličtině, stejně jako lekce.',
    jumpToLetter: 'Přejít na písmeno',
    inContext: 'V lekci:',
    empty: 'Zatím tu nejsou žádné pojmy.',
  },
};

/** Marathi. Vocabulary from docs/i18n/mr-glossary.md. */
export const learnMr: typeof learnEn = {
  learn: {
    levels: {
      discovery: 'ओळख',
      building: 'उभारणी',
      psychology: 'मानसशास्त्र',
      optimizing: 'सुधारणा',
      mastery: 'प्रभुत्व',
      'inclusive-finances': 'सर्वसमावेशक वित्त',
    },
    summaries: {
      discovery: 'पैशांची मूलभूत भाषा',
      building: 'बजेट, जोखीम आणि पहिली गुंतवणूक',
      psychology: 'सवयी आणि पूर्वग्रह निर्णयांना कसे आकार देतात',
      optimizing: 'योजनेचा आढावा आणि सुधारणा',
      mastery: 'वारसा नियोजन आणि दीर्घ पल्ला',
    },
    levelMeta: {
      discovery: {
        description: 'मूलभूत गोष्टी. वैयक्तिक वित्तात तुम्ही नवीन असाल, तर इथून सुरुवात करा.',
        covered: 'निव्वळ संपत्ती (net worth), मालमत्ता (assets), देणी (liabilities), रोख प्रवाह (cash flow), कर्ज (debt), चक्रवाढ व्याज (compound interest), तरलता (liquidity), आपत्कालीन निधी (emergency funds), क्रयशक्ती (purchasing power), पैशाचे कालमूल्य (time value of money), बचत विरुद्ध गुंतवणूक (saving vs investing), उधारी (credit), विमा (insurance)',
      },
      building: {
        description: 'तुकडे एकत्र जोडणे. बजेट, बचतीची व्यवस्था आणि पहिली गुंतवणूक.',
        covered: 'बजेट, जोखीम (risk), मालमत्ता प्रकार (asset classes), गुंतवणूक खाती (investment accounts), विविधीकरण (diversification), आर्थिक स्वातंत्र्याची ओळख (financial independence), अनेक चलने (multi-currency), स्थावर मालमत्ता (real estate), कर्जाच्या अटी (loan terms), निष्क्रिय उत्पन्न (passive income), उद्दिष्टे (goals), डॅशबोर्ड, आर्थिक आरोग्याचे निर्देशक (health metrics), कर (taxes)',
      },
      psychology: {
        description: 'तुमचे मन पैशांना कशी मदत करते आणि कसे नुकसान करते. वर्तनातील पूर्वग्रह, विचारांचे आराखडे आणि पैशांच्या चांगल्या सवयी.',
        covered: 'तोटा टाळण्याची प्रवृत्ती (loss aversion), मानसिक हिशेब (mental accounting), वर्तमानाला झुकते माप (present bias), अतिआत्मविश्वास (overconfidence), चौकट (framing) आणि पहिल्या आकड्याला चिकटून राहणे (anchoring), कळपवृत्ती (herd behaviour), कथनांचे अर्थशास्त्र (narrative economics), पैशांबद्दलच्या धारणा (money scripts), पूर्वग्रह टाळणाऱ्या व्यवस्था (anti-bias systems)',
      },
      optimizing: {
        description: 'जे चालते आहे ते अधिक नेमके करणे. कर-कार्यक्षमता, पोर्टफोलिओचे पुनर्संतुलन आणि प्रगत रणनीती.',
        covered: 'तोट्याचा कर-वापर (tax-loss harvesting), पोर्टफोलिओचे पुनर्संतुलन (rebalancing), खात्यांमधील मालमत्तांची मांडणी (asset location), विविधीकरण (diversification)',
      },
      mastery: {
        description: 'दीर्घ पल्ला. पिढ्यान्पिढ्यांची संपत्ती, वारसा नियोजन आणि आर्थिक स्वातंत्र्य.',
        covered: 'वारसा नियोजन (estate planning), FIRE, पिढ्यान्पिढ्यांची संपत्ती (generational wealth), पैसे काढण्याच्या रणनीती (withdrawal strategies)',
      },
      'inclusive-finances': {
        description: 'सर्वसाधारण सल्ला ज्यांच्यासाठी लिहिलाच गेला नाही अशा घरांसाठी. प्रत्येक मार्गदर्शिका एक पूर्वनिश्चित गृहीतक घेते, ते लागू पडत नाही तेव्हा काय बिघडते ते दाखवते, आणि ते विचारपूर्वक पुन्हा उभे करते.',
        covered: 'अविवाहित आणि एकत्र राहणारी जोडपी (unmarried and cohabiting couples), सामायिक घरे (shared households), गिग काम (gig work), व्याजमुक्त वित्त (interest-free finance), सीमेपलीकडे पसरलेली घरे (cross-border households), कुटुंबाविना वृद्धत्व (solo agers), घटस्फोट (divorce), काळजीवाहू जबाबदारी (caregiving), अपंगत्व (disability), स्वतः निवडलेले कुटुंब (chosen family), मिश्र कुटुंबे (blended families), वैधव्य (widowhood)',
      },
    },
    tags: {
      discovery: {
        name: 'ओळख',
        title: 'ओळख मालिका: वैयक्तिक वित्ताच्या मूलभूत गोष्टी | nidhi',
        description: 'nidhi च्या शिकण्याच्या मार्गाची पहिली पातळी: निव्वळ संपत्ती, मालमत्ता, कर्ज, रोख प्रवाह, बजेट आणि बचत. क्रमाने वाचायच्या, नवशिक्यांसाठीच्या मार्गदर्शिका.',
        card: 'nidhi च्या शिकण्याच्या मार्गाची पहिली पातळी: निव्वळ संपत्ती, मालमत्ता, कर्ज, रोख प्रवाह, बजेट आणि बचत. क्रमाने वाचायच्या, नवशिक्यांसाठीच्या मार्गदर्शिका.',
      },
      building: {
        name: 'उभारणी',
        title: 'उभारणी मालिका: गुंतवणूक, कर आणि नियोजन | nidhi',
        description: 'nidhi च्या शिकण्याच्या मार्गाची दुसरी पातळी: जोखीम, गुंतवणूक, कर, आर्थिक स्वातंत्र्य, कर्जे आणि उद्दिष्टे. मूलभूत गोष्टी कामाला लावण्यासाठी मार्गदर्शिका.',
        card: 'nidhi च्या शिकण्याच्या मार्गाची दुसरी पातळी: जोखीम, गुंतवणूक, कर, आर्थिक स्वातंत्र्य, कर्जे आणि उद्दिष्टे. मूलभूत गोष्टी कामाला लावण्यासाठी मार्गदर्शिका.',
      },
      psychology: {
        name: 'मानसशास्त्र',
        title: 'पैशांचे मानसशास्त्र: वर्तनविषयक वित्ताच्या मूलभूत गोष्टी | nidhi',
        description: 'योग्य निर्णय माहीत असणे आणि तो घेणे यात फरक का असतो: तोटा टाळण्याची प्रवृत्ती, मानसिक हिशेब, वर्तमानाला झुकते माप, कळपवृत्ती. वर्तनविषयक वित्त, सोप्या भाषेत.',
        card: 'योग्य निर्णय माहीत असणे आणि तो घेणे यात फरक का असतो: तोटा टाळण्याची प्रवृत्ती, मानसिक हिशेब, वर्तमानाला झुकते माप, कळपवृत्ती. वर्तनविषयक वित्त, सोप्या भाषेत.',
      },
      optimizing: {
        name: 'सुधारणा',
        title: 'सुधारणा मालिका: अंदाज, शुल्क आणि कर | nidhi',
        description: 'nidhi च्या शिकण्याच्या मार्गाची चौथी पातळी: अंदाज, रोख व्यवस्थापन, पुनर्वित्त, शुल्क आणि कर-कार्यक्षमता. आधीच चालणारी योजना नेमकी करण्यासाठी मार्गदर्शिका.',
        card: 'nidhi च्या शिकण्याच्या मार्गाची चौथी पातळी: अंदाज, रोख व्यवस्थापन, पुनर्वित्त, शुल्क आणि कर-कार्यक्षमता. आधीच चालणारी योजना नेमकी करण्यासाठी मार्गदर्शिका.',
      },
      'inclusive-finances': {
        name: 'सर्वसमावेशक वित्त',
        title: 'सर्वसमावेशक वित्त: पूर्वनिश्चित योजना बसत नाही तेव्हा | nidhi',
        description: 'सर्वसाधारण सल्ल्यातून सुटणाऱ्या घरांसाठी आर्थिक नियोजन: अविवाहित जोडपी, कुटुंबाविना वृद्धत्व, गिग काम, अपंगत्व, सीमेपलीकडील कुटुंबे. पूर्वज्ञानाची गरज नाही.',
        card: 'सर्वसाधारण सल्ल्यातून सुटणाऱ्या घरांसाठी आर्थिक नियोजन: अविवाहित जोडपी, कुटुंबाविना वृद्धत्व, गिग काम, अपंगत्व, सीमेपलीकडील कुटुंबे. पूर्वज्ञानाची गरज नाही.',
      },
      relationships: {
        name: 'नातेसंबंध',
        title: 'पैसा आणि नातेसंबंध: जोडपी, कुटुंबे, घरे | nidhi',
        description: 'कायदा आणि पूर्वनिश्चित नियम लोकांच्या प्रत्यक्ष जगण्याशी जुळत नाहीत, तेव्हा जोडपी, मिश्र कुटुंबे, निवडलेले कुटुंब आणि सामायिक घरे पैशांचे नियोजन कसे करू शकतात.',
        card: 'कायदा आणि पूर्वनिश्चित नियम लोकांच्या प्रत्यक्ष जगण्याशी जुळत नाहीत, तेव्हा जोडपी, मिश्र कुटुंबे, निवडलेले कुटुंब आणि सामायिक घरे पैशांचे नियोजन कसे करू शकतात.',
      },
      disability: {
        name: 'अपंगत्व',
        title: 'अपंगत्वासह आर्थिक नियोजन | nidhi',
        description: 'उत्पन्न व मालमत्ता तपासून मिळणारे लाभ, काळजीचा खर्च, आणि नेहमीच्या करिअरप्रमाणे न चालणारे उत्पन्न धरून बचत व नियोजन. आराखडे, देशनिहाय कायदेशीर सल्ला नाही.',
        card: 'उत्पन्न व मालमत्ता तपासून मिळणारे लाभ, काळजीचा खर्च, आणि नेहमीच्या करिअरप्रमाणे न चालणारे उत्पन्न धरून बचत व नियोजन. आराखडे, देशनिहाय कायदेशीर सल्ला नाही.',
      },
      immigration: {
        name: 'स्थलांतर',
        title: 'सीमेपलीकडील पैसा: स्थलांतरित आणि परदेशात राहणारे | nidhi',
        description: 'तुमचे घर सीमा ओलांडते तेव्हा क्रेडिट इतिहास, बँकिंग, पेन्शन आणि मान्यतेतील तफावत. स्थलांतरित आणि सीमेपलीकडील कुटुंबांसाठी नियोजनाचे आराखडे.',
        card: 'तुमचे घर सीमा ओलांडते तेव्हा क्रेडिट इतिहास, बँकिंग, पेन्शन आणि मान्यतेतील तफावत. स्थलांतरित आणि सीमेपलीकडील कुटुंबांसाठी नियोजनाचे आराखडे.',
      },
      fundamentals: {
        name: 'मूलतत्त्वे',
        title: 'आर्थिक मूलतत्त्वे: वैयक्तिक वित्ताची साक्षरता | nidhi',
        description: 'प्रत्येक प्रौढाला माहीत असाव्यात अशा मूलभूत आर्थिक संकल्पना: मालमत्ता, देणी, रोख प्रवाह, चक्रवाढ व्याज आणि बरेच काही. nidhi कडून मोफत आर्थिक साक्षरता.',
        card: 'प्रत्येक प्रौढाला माहीत असाव्यात अशा मूलभूत आर्थिक संकल्पना: मालमत्ता, देणी, रोख प्रवाह, चक्रवाढ व्याज आणि बरेच काही. nidhi कडून मोफत आर्थिक साक्षरता.',
      },
      debt: {
        name: 'कर्ज',
        title: 'कर्ज समजून घेणे आणि सांभाळणे: आर्थिक साक्षरता | nidhi',
        description: 'कर्ज कसे काम करते, व्याजदर का महत्त्वाचे असतात, आणि कर्जातून बाहेर पडण्यासाठी लोक वापरत असलेल्या पद्धती. nidhi कडून व्यवहारोपयोगी आर्थिक साक्षरता.',
        card: 'कर्ज कसे काम करते, व्याजदर का महत्त्वाचे असतात, आणि कर्जातून बाहेर पडण्यासाठी लोक वापरत असलेल्या पद्धती. nidhi कडून व्यवहारोपयोगी आर्थिक साक्षरता.',
      },
      saving: {
        name: 'बचत',
        title: 'पैशांची बचत: वैयक्तिक वित्ताच्या मूलभूत गोष्टी | nidhi',
        description: 'परिणामकारक बचत कशी करायची: आपत्कालीन निधी, बचतीचा दर, आणि गुंतवणुकीपेक्षा बचत कधी सरस ठरते. nidhi कडून वैयक्तिक वित्त साक्षरतेच्या मार्गदर्शिका.',
        card: 'परिणामकारक बचत कशी करायची: आपत्कालीन निधी, बचतीचा दर, आणि गुंतवणुकीपेक्षा बचत कधी सरस ठरते. nidhi कडून वैयक्तिक वित्त साक्षरतेच्या मार्गदर्शिका.',
      },
      investing: {
        name: 'गुंतवणूक',
        title: 'गुंतवणुकीच्या मूलभूत गोष्टी: आर्थिक साक्षरता | nidhi',
        description: 'गुंतवणूक शिका: मालमत्ता प्रकार, जोखीम, चक्रवाढ व्याज, आणि सुरुवात कधी करायची. वैयक्तिक वित्त साक्षरतेसाठी नवशिक्यांना सोप्या गुंतवणूक मार्गदर्शिका.',
        card: 'गुंतवणूक शिका: मालमत्ता प्रकार, जोखीम, चक्रवाढ व्याज, आणि सुरुवात कधी करायची. वैयक्तिक वित्त साक्षरतेसाठी नवशिक्यांना सोप्या गुंतवणूक मार्गदर्शिका.',
      },
      risk: {
        name: 'जोखीम',
        title: 'आर्थिक जोखीम समजून घेणे: गुंतवणूक साक्षरता | nidhi',
        description: 'जोखीम म्हणजे धोका नव्हे, तर अनिश्चितता. चढ-उतार आणि कायमचा तोटा यांतील फरक, आणि काळ जोखीम कशी बदलतो, हे शिका. nidhi कडून आर्थिक साक्षरता.',
        card: 'जोखीम म्हणजे धोका नव्हे, तर अनिश्चितता. चढ-उतार आणि कायमचा तोटा यांतील फरक, आणि काळ जोखीम कशी बदलतो, हे शिका.',
      },
      planning: {
        name: 'नियोजन',
        title: 'आर्थिक नियोजन: खाती, कर आणि मागोवा | nidhi',
        description: 'आर्थिक ज्ञानाचे योजनेत रूपांतर कसे करायचे: खाती, कर, पुनर्संतुलन, उद्दिष्टे, आणि कशाचा मागोवा ठेवायचा. nidhi कडून व्यवहारोपयोगी आर्थिक नियोजनाच्या मार्गदर्शिका.',
        card: 'आर्थिक ज्ञानाचे योजनेत रूपांतर कसे करायचे: खाती, कर, पुनर्संतुलन, उद्दिष्टे, आणि कशाचा मागोवा ठेवायचा. nidhi कडून व्यवहारोपयोगी आर्थिक नियोजनाच्या मार्गदर्शिका.',
      },
      goals: {
        name: 'उद्दिष्टे',
        title: 'आर्थिक उद्दिष्टे आणि प्रगतीचा मागोवा | nidhi',
        description: 'ठोस उद्दिष्टे कशी ठरवायची आणि तुम्ही योग्य मार्गावर आहात का हे कसे ओळखायचे: लक्ष्य रकमा, आर्थिक आरोग्याचे निर्देशक, सोपा डॅशबोर्ड. नियोजनाच्या मार्गदर्शिका.',
        card: 'ठोस उद्दिष्टे कशी ठरवायची आणि तुम्ही योग्य मार्गावर आहात का हे कसे ओळखायचे: लक्ष्य रकमा, आर्थिक आरोग्याचे निर्देशक, सोपा डॅशबोर्ड. नियोजनाच्या मार्गदर्शिका.',
      },
      fire: {
        name: 'FIRE',
        title: 'आर्थिक स्वातंत्र्य (FIRE): मूलभूत गोष्टी | nidhi',
        description: 'आर्थिक स्वातंत्र्य म्हणजे काय, FIRE आकडा आणि पैसे काढण्याचा सुरक्षित दर कसे काम करतात, आणि निष्क्रिय उत्पन्नासाठी काय लागते. nidhi च्या प्रामाणिक मार्गदर्शिका.',
        card: 'आर्थिक स्वातंत्र्य म्हणजे काय, FIRE आकडा आणि पैसे काढण्याचा सुरक्षित दर कसे काम करतात, आणि निष्क्रिय उत्पन्नासाठी काय लागते. nidhi च्या प्रामाणिक मार्गदर्शिका.',
      },
      taxes: {
        name: 'कर',
        title: 'कर आणि गुंतवणूक: वैयक्तिक वित्त साक्षरता | nidhi',
        description: 'कर प्रत्येक आर्थिक निर्णयाला कसा आकार देतात, आणि करसवलतीची खाती कुठे बसतात. देशनिहाय संदर्भ तक्त्यासह शैक्षणिक मार्गदर्शिका.',
        card: 'कर प्रत्येक आर्थिक निर्णयाला कसा आकार देतात, आणि करसवलतीची खाती कुठे बसतात. देशनिहाय संदर्भ तक्त्यासह शैक्षणिक मार्गदर्शिका.',
      },
      currency: {
        name: 'चलन',
        title: 'अनेक चलनांमधील पैसा: विनिमय दर आणि जोखीम | nidhi',
        description: 'अनेक चलनांमधील पैशांचे व्यवस्थापन: तुमचे आर्थिक व्यवहार सीमा ओलांडतात तेव्हा विनिमय दर, क्रयशक्ती आणि चलन जोखीम. सीमेपलीकडील आयुष्यासाठी मार्गदर्शिका.',
        card: 'अनेक चलनांमधील पैशांचे व्यवस्थापन: तुमचे आर्थिक व्यवहार सीमा ओलांडतात तेव्हा विनिमय दर, क्रयशक्ती आणि चलन जोखीम. सीमेपलीकडील आयुष्यासाठी मार्गदर्शिका.',
      },
      'real-estate': {
        name: 'स्थावर मालमत्ता',
        title: 'गुंतवणूक म्हणून स्थावर मालमत्ता: मूलभूत गोष्टी | nidhi',
        description: 'स्वतःच्या घरापलीकडची स्थावर मालमत्ता: परतावा, कर्ज घेऊन गुंतवणूक, अतरलता, आणि भाड्याने राहणे विरुद्ध घर घेणे याचे गणित. nidhi कडून वैयक्तिक वित्त साक्षरता.',
        card: 'स्वतःच्या घरापलीकडची स्थावर मालमत्ता: परतावा, कर्ज घेऊन गुंतवणूक, अतरलता, आणि भाड्याने राहणे विरुद्ध घर घेणे याचे गणित. nidhi कडून वैयक्तिक वित्त साक्षरता.',
      },
    },
    crumb: {
      learn: 'शिका',
      topics: 'विषय',
      inclusive: 'सर्वसमावेशक वित्त',
    },
    levelFallback: 'सर्वसमावेशक वित्त',
    lessonsInEnglish: 'धडे इंग्रजीत आहेत. वाचताना तुमचा ब्राउझर त्यांचे भाषांतर करू शकतो.',
    island: {
      minRead: 'मिनिटांचे वाचन',
      startHere: 'इथून सुरुवात करा',
      new: 'नवीन',
      markRead: 'वाचले म्हणून खूण करा',
      markUnread: 'न वाचलेले म्हणून खूण करा',
      step: 'पायरी {step}, एकूण {count} पैकी',
      companionOptionalLabel: 'ऐच्छिक · {label}',
      companionOptionalFollows: '{host} नंतरचा ऐच्छिक पुढचा धडा',
      companionFollows: '{host} चा पुढचा भाग',
      readCount: 'या डिव्हाइसवर {total} पैकी {read} वाचले',
      markLevelRead: 'पातळी वाचली म्हणून खूण करा',
      markLevelUnread: 'पातळी न वाचलेली म्हणून खूण करा',
      orderHint: 'डावीकडून उजवीकडे, मग खाली वाचा.',
      allLessons: '{level} चे सर्व धडे',
      allGuides: '{level} च्या सर्व मार्गदर्शिका',
    },
  },
  blogIndex: {
    meta: {
      title: 'तुमच्या पैशांबद्दल शिका: वैयक्तिक वित्ताचे मोफत धडे | nidhi',
      description: 'वैयक्तिक वित्ताचे मोफत शिक्षण: निव्वळ संपत्ती, बजेट, बचत, गुंतवणूक आणि कर्जाचे व्यवस्थापन. व्यवहारोपयोगी मार्गदर्शिकांनी आर्थिक साक्षरता टप्प्याटप्प्याने वाढवा.',
    },
    schema: {
      breadcrumbLearn: 'शिका',
      itemListName: 'शिकण्याच्या मार्गाच्या पातळ्या',
      itemListDescription: 'वैयक्तिक वित्तातून जाणारा क्रमवार शिकण्याचा मार्ग, मूलभूत गोष्टींपासून योजनेच्या आढाव्यापर्यंतच्या पातळ्यांमध्ये.',
    },
    header: {
      h1: 'तुमच्या पैशांबद्दल शिका',
      subtitle: 'प्रत्येक प्रकारच्या घरासाठी, कोणत्याही देशात उपयोगी पडणारे छोटे धडे. जिथे स्थानिक नियम महत्त्वाचे असतात, तिथे काय तपासायचे ते धडे सांगतात.',
      link: 'धडे कसे लिहिले जातात',
    },
    island: {
      minRead: 'मिनिटांचे वाचन',
      finishedEyebrow: 'सर्व धडे वाचून झाले',
      finishedHeading: 'मार्गावरचे आत्तापर्यंतचे सर्व {count} धडे तुम्ही वाचले आहेत',
      finishedSub: 'नवीन धडे प्रसिद्ध होतील तसे इथे दिसतील. सर्वसमावेशक वित्त आणि विषयांची यादी हे परत येण्याचे आणखी मार्ग आहेत.',
      returningEyebrow: 'मागच्या वेळी जिथे वाचन थांबले, तिथून पुढे वाचा',
      returningSub: '{level}, धडा {index}, एकूण {total} पैकी',
      returningNote: 'या डिव्हाइसवर {level} चे {total} पैकी {read} धडे वाचले',
      newEyebrow: 'इथे नवीन आहात?',
      newHeading: 'एक सामान्य सुरुवात म्हणजे {level}, पैशांची मूलभूत भाषा',
      newSub: 'धडा 1: {title}',
      continueReading: 'पुढे वाचा',
      readLesson1: 'धडा 1 वाचा',
      exploreInclusive: 'सर्वसमावेशक वित्त पाहा',
      helperClose: 'पातळी निवडण्याची मदत बंद करा',
      helperOpen: 'पातळी निवडायला मदत करा',
      q1Note: 'प्रश्न 1, एकूण 2 पैकी',
      q1Text: 'यापैकी कोणत्या गोष्टी तुम्ही मित्राला समजावून सांगू शकाल?',
      q1Hint: 'लागू पडतील त्या सगळ्यांवर खूण करा. सगळे रिकामे ठेवले तरी चालेल.',
      next: 'पुढे',
      q2Note: 'प्रश्न 2, एकूण 2 पैकी',
      q2Text: 'आत्ता सर्वात जास्त कशाची मदत होईल?',
      back: 'मागे',
      answersNote: 'तुमची उत्तरे साठवली जात नाहीत, आणि वापराच्या विश्लेषणातही तुम्ही कोणती निवडता याची नोंद होत नाही.',
      resultHeading: '{level} ही सुरुवातीसाठी उपयोगी जागा असू शकते',
      resultSuffix: 'ही फक्त वाचनासाठी सूचना आहे: प्रत्येक पातळी खुली राहते.',
      resultReasonFoundation: '{level} मधील {total} पैकी {ticked} कल्पनांवर तुम्ही खूण केली, आणि पुढच्या पातळ्या त्यांच्यावरच उभ्या आहेत.',
      resultReasonGoalPsych: '{topic} यावरचे धडे इथे आहेत, आणि ते कोणत्याही पातळीसोबत वाचता येतात.',
      resultReasonGoal: '{topic} यावरचे धडे इथे आहेत, आणि ज्या कल्पनांवर ही पातळी उभी आहे त्यांपैकी पुरेशा कल्पनांवर तुम्ही खूण केली.',
      resultReasonGoalKnown: '{topic} यावरचे धडे इथे आहेत. तुम्ही यातील {total} पैकी {ticked} कल्पनांवर खूण केली, त्यामुळे काही भाग ओळखीचे वाटू शकतात.',
      resultReasonAllKnownPsych: 'आत्तापर्यंतच्या प्रत्येक पातळीतील बहुतेक कल्पनांवर तुम्ही खूण केली. काय करायचे हे माहीत असणे आणि ते करणे यांच्यातील अंतर मानसशास्त्र तपासते.',
      resultReasonAllKnown: 'आत्तापर्यंतच्या प्रत्येक पातळीतील बहुतेक कल्पनांवर तुम्ही खूण केली.',
      gapsNote: 'ज्या कल्पनांवर तुम्ही खूण केली नाही, त्यांच्यावरचे धडे:',
      firstLessonNote: 'याचा पहिला धडा:',
      alsoLead: 'त्यानंतर, किंवा त्यासोबत: ',
      alsoEnd: '.',
      seeAll: '{level} चे सर्व धडे पाहा',
      startOver: 'पुन्हा सुरुवात करा',
      pathHeading: 'शिकण्याचा मार्ग',
      pathProgress: 'या डिव्हाइसवर {total} पैकी {read} वाचले',
      pathHint: 'क्रमाने वाचा, किंवा कोणतीही पातळी उघडा',
      beingWritten: 'लिहिले जात आहे',
      youAreHere: 'तुम्ही इथे आहात',
      srRead: 'वाचले',
      lessonsCount: 'धडे: {count}',
      alongside: 'प्रत्येक पातळीसोबत',
      inclusiveName: 'सर्वसमावेशक वित्त',
      inclusiveSr: ', प्रत्येक पातळीसोबत',
      inclusiveSummary: 'सर्वसाधारण योजना बसत नाही तेव्हा: जोडपी, सामायिक घरे, देश बदलणे, अपंगत्व आणि बरेच काही',
      guideOne: 'मार्गदर्शिका',
      guideMany: 'मार्गदर्शिका',
      guideFew: 'मार्गदर्शिका',
      findHeading: 'धडा शोधा',
      browseByTopic: 'विषयानुसार पाहा',
      glossary: 'शब्दसूची',
      searchLabel: 'धडे शोधा',
      searchPlaceholder: 'इंग्रजीत शोधा, उदा. debt, renting',
      noMatches: 'कोणताही धडा जुळत नाही. अधिक व्यापक शब्द, किंवा विषयांची यादी, उपयोगी पडू शकेल.',
      lessonOne: 'धडा',
      lessonMany: 'धडे',
      lessonFew: 'धडे',
      inclusivePill: 'सर्वसमावेशक',
      showAll: 'सर्व {count} दाखवा',
      concepts: {
        'net-worth': 'निव्वळ संपत्ती (net worth) म्हणजे काय, आणि ती कशी काढायची',
        interest: 'कर्जावरील व्याजदर (interest rate) का महत्त्वाचा असतो',
        'emergency-fund': 'आपत्कालीन निधी (emergency fund) कशासाठी असतो',
        inflation: 'महागाईमुळे (inflation) पैशात मिळणारे (purchasing power) कसे कमी होते',
        'asset-classes': 'शेअर, रोखे आणि रोख रक्कम (cash) यांत काय फरक असतो',
        diversification: 'विविधीकरण (diversification) काय करते, आणि काय करत नाही',
        'tax-accounts': 'करसवलतीचे खाते (tax-advantaged account) म्हणजे काय',
        rebalancing: 'पोर्टफोलिओ का भरकटतो आणि त्याचे पुनर्संतुलन का केले जाते',
        fees: 'वार्षिक 1% शुल्क दशकांमध्ये कसे वाढत जाते',
        'real-returns': 'महागाई आणि खर्च वजा जाता वास्तविक परतावा (real return) म्हणजे काय',
        'tax-loss': 'तोट्याचा कर-वापर आणि खात्यांमधील मालमत्तांची मांडणी',
        'glide-path': 'कालानुसार बदलणारे वाटप (glide path) म्हणजे काय',
      },
      goals: {
        picture: {
          label: 'माझे पैसे नेमके कुठे आहेत हे स्पष्ट पाहणे',
          topic: 'निव्वळ संपत्ती, रोख प्रवाह आणि बजेट',
        },
        safety: {
          label: 'सुरक्षेचे जाळे उभे करणे, किंवा कर्जावर नियंत्रण मिळवणे',
          topic: 'आपत्कालीन निधी आणि कर्ज',
        },
        invest: {
          label: 'गुंतवणुकीला सुरुवात करणे, किंवा उद्दिष्टे ठरवणे',
          topic: 'गुंतवणूक, खाती आणि उद्दिष्टे',
        },
        habits: {
          label: 'मला आधीच माहीत असलेले प्रत्यक्षात आणणे',
          topic: 'सवयी, पूर्वग्रह आणि ठरवलेले पूर्ण करणे',
        },
        refine: {
          label: 'माझ्याकडे आधीच असलेली योजना अधिक चांगली करणे',
          topic: 'शुल्क, कर आणि योजना नेमकी करणे',
        },
        unsure: {
          label: 'अजून नक्की नाही',
        },
      },
    },
  },
  level: {
    meta: {
      title: '{label}: {summary} | nidhi',
      descriptionWithCount: '{description} वाचण्याच्या क्रमाने मोफत धडे: {count}.',
    },
    schema: {
      itemListName: '{label} चे धडे',
    },
    eyebrow: 'पातळी {index}, एकूण {total} पैकी',
    coveredSummary: 'या पातळीत काय आहे',
    scope: 'कोणत्याही देशासाठी लिहिलेले: एखादा धडा कर, खाती किंवा लाभ यांच्या स्थानिक नियमांवर अवलंबून असेल, तर तुम्ही जिथे राहता तिथे काय तपासायचे ते तो सांगतो.',
    scopeLink: 'धडे कसे लिहिले जातात',
    empty: 'या पातळीतील धडे लिहिले जात आहेत. नवीन धडे प्रसिद्ध होतील तसे इथे दिसतील.',
    nav: {
      label: 'पातळ्या',
      allLevels: 'सर्व पातळ्या',
      next: 'पुढची पातळी: {label}',
      inclusive: 'सर्वसमावेशक वित्त',
    },
  },
  topic: {
    meta: {
      titleFallback: '{tag}: वैयक्तिक वित्त साक्षरता | nidhi',
      descriptionFallback: '{tag} विषयीचे लेख: nidhi कडून व्यवहारोपयोगी वैयक्तिक वित्त साक्षरता आणि आर्थिक शिक्षण.',
    },
    schema: {
      itemListName: '{tag} विषयीचे धडे',
    },
    eyebrow: 'विषय',
    summary: {
      lessonsOne: '{levels} मध्ये {count} धडा',
      lessonsMany: '{levels} मध्ये {count} धडे',
      lessonsFew: '{levels} मध्ये {count} धडे',
      guidesOne: 'सर्वसमावेशक वित्ताची {count} मार्गदर्शिका',
      guidesMany: 'सर्वसमावेशक वित्ताच्या {count} मार्गदर्शिका',
      guidesFew: 'सर्वसमावेशक वित्ताच्या {count} मार्गदर्शिका',
      join: ', आणि ',
      levelList: '{list} आणि {last}',
    },
    nav: {
      label: 'धडे शोधण्याचे आणखी मार्ग',
      allTopics: 'सर्व विषय',
      searchAll: 'सर्व धड्यांमध्ये शोधा',
    },
  },
  topics: {
    meta: {
      title: 'विषयानुसार पाहा | nidhi',
      description: 'nidhi ब्लॉगवरील प्रत्येक विषय: निव्वळ संपत्ती, बजेट, कर्ज, गुंतवणूक, जोखीम आणि बरेच काही. त्या क्षेत्रातील सर्व लेख वाचण्यासाठी एक विषय निवडा.',
    },
    schema: {
      collectionName: 'धड्यांचे विषय',
    },
    h1: 'विषयानुसार पाहा',
    subtitle: 'शिकण्याच्या मार्गावरील प्रत्येक विषय, प्रत्येकातील धड्यांच्या संख्येसह. त्या क्षेत्रातील सर्व धडे वाचण्यासाठी एक विषय निवडा.',
    empty: 'अजून कोणतेही विषय नाहीत.',
    fallbackCard: '“{tag}” असा टॅग असलेले लेख.',
    countOne: '{count} धडा',
    countMany: '{count} धडे',
    countFew: '{count} धडे',
  },
  inclusiveFinances: {
    eyebrow: 'पूर्वज्ञानाची गरज नाही, कोणत्याही टप्प्यावर उपयोगी',
    h1: 'पूर्वनिश्चित योजना तुम्हाला बसत नाही तेव्हा',
    lede1: 'बहुतेक आर्थिक सल्ला शांतपणे एकाच प्रकारचे घर गृहीत धरतो: कायदेशीर विवाहित जोडपे किंवा एकटी प्रौढ व्यक्ती, स्थिर नोकरी देणारा नियोक्ता, कायद्याने मान्य केलेले कुटुंब, आणि एकाच देशात जगलेले आयुष्य. वारसांना मिळणारे लाभ, संयुक्त कर विवरण, वारसा नियम आणि कामाच्या ठिकाणची पेन्शन हे सगळे त्याच साच्याभोवती बांधलेले आहेत.',
    lede2: 'या मार्गदर्शिका बाकी सगळ्यांसाठी आहेत. प्रत्येक मार्गदर्शिका एक पूर्वनिश्चित गृहीतक घेते, ते तुमच्या बाबतीत लागू पडत नाही तेव्हा काय बिघडते ते दाखवते, आणि त्याची जागा घेणारे विचारपूर्वक निवडलेले पर्याय समजावते. यासाठी या साइटवरचे इतर काहीही आधी वाचलेले असण्याची गरज नाही.',
    scope: 'या मार्गदर्शिका काय तपासायचे आणि काय विचारायचे ते शिकवतात. कायदेशीर तपशील देशानुसार बदलतात, त्यामुळे तुम्ही राहता तिथला कायदा काय सांगतो हे त्या कधीच सांगत नाहीत. त्यासाठी स्थानिक तज्ज्ञाशी बोला.',
    situations: {
      heading: 'परिस्थितीनुसार पाहा',
      note: 'प्रत्येक लिंक फक्त या संग्रहातील नाही, तर संपूर्ण साइटवरील जुळणाऱ्या मार्गदर्शिका दाखवते.',
      relationships: 'जोडपी, कुटुंबे आणि सामायिक घरे',
      immigration: 'सीमा ओलांडताना',
      disability: 'अपंगत्व आणि उत्पन्न व मालमत्ता तपासून मिळणारे लाभ',
    },
    empty: 'या संग्रहातील पहिल्या मार्गदर्शिका लवकरच येत आहेत.',
    emptyLink: 'तोपर्यंत शिकण्याचा मार्ग पाहा',
  },

  glossaryPage: {
    title: 'शब्दसूची: धड्यांमधील शब्द',
    description: 'nidhi च्या धड्यांमधील शब्दांच्या सोप्या व्याख्या, आणि प्रत्येक शब्द तो समजावणाऱ्या धड्याशी जोडलेला आहे.',
    h1: 'शब्दसूची',
    intro: 'धड्यांमध्ये येणारे शब्द, सोप्या भाषेत. प्रत्येक शब्द तो संदर्भासह समजावणाऱ्या धड्याशी जोडलेला आहे.',
    inEnglish: 'शब्द आणि त्यांच्या व्याख्या इंग्रजीत आहेत, धड्यांप्रमाणेच.',
    jumpToLetter: 'एखाद्या अक्षरावर जा',
    inContext: 'संदर्भात:',
    empty: 'अजून कोणतेही शब्द नाहीत.',
  },
};
