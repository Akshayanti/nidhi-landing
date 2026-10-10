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
 * Why a module of its own rather than two more entries in `../en.ts` and
 * `../hi.ts`: the same reason as the free tools (see `./tools/index.ts`). The
 * path is the densest prose on the site after the calculators, and `LEVELS`,
 * `LEVEL_SUMMARIES`, `TAG_META`, `CONCEPTS` and `GOALS` all read better as one
 * file than as a ninth of two very long ones. The key-parity test in
 * `./catalog.test.ts` covers these namespaces through `en` and `hi` like any
 * other: `learn.tags.debt.title` is a path it walks.
 *
 * English first, because `en` is the source of truth the other languages are
 * measured against; the Hindi object is typed as `typeof` the English one so
 * the two cannot drift in shape.
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
      title: 'Learn Personal Finance | nidhi',
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
      findHeading: 'Find a lesson',
      browseByTopic: 'Browse by topic',
      searchLabel: 'Search lessons',
      searchPlaceholder: 'Search all lessons, for example debt, renting, couples',
      noMatches: 'No lessons match. A broader word, or the topic list, may help.',
      lessonOne: 'lesson',
      lessonMany: 'lessons',
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
      guidesOne: '{count} Inclusive Finances guide',
      guidesMany: '{count} Inclusive Finances guides',
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
        covered: 'शुद्ध संपत्ति (net worth), संपत्तियाँ (assets), देनदारियाँ (liabilities), कैश फ़्लो, कर्ज़ (debt), चक्रवृद्धि ब्याज (compound interest), तरलता (liquidity), आपातकालीन कोष (emergency funds), क्रय शक्ति (purchasing power), पैसे का समय मूल्य (time value of money), बचत बनाम निवेश (saving vs investing), क्रेडिट, बीमा (insurance)',
      },
      building: {
        description: 'टुकड़ों को जोड़ना। बजट, बचत के तरीक़े, और पहला निवेश।',
        covered: 'बजट, जोखिम (risk), परिसंपत्ति वर्ग (asset classes), निवेश खाते (investment accounts), विविधीकरण (diversification), वित्तीय स्वतंत्रता (financial independence) का परिचय, एक से ज़्यादा मुद्राओं में पैसा (multi-currency), रियल एस्टेट, लोन की शर्तें (loan terms), निष्क्रिय आय (passive income), लक्ष्य (goals), डैशबोर्ड, वित्तीय सेहत के पैमाने (health metrics), कर (taxes)',
      },
      psychology: {
        description: 'आपका मन पैसों के मामले में कैसे मदद भी करता है और नुकसान भी। व्यवहारगत पूर्वाग्रह, मानसिक मॉडल, और पैसे की बेहतर आदतें बनाना।',
        covered: 'हानि से बचने की प्रवृत्ति (loss aversion), मानसिक लेखांकन (mental accounting), वर्तमान पूर्वाग्रह (present bias), अति आत्मविश्वास (overconfidence), फ़्रेमिंग और एंकरिंग, भेड़चाल (herd behaviour), कथा अर्थशास्त्र (narrative economics), मनी स्क्रिप्ट, पूर्वाग्रह-रोधी तंत्र (anti-bias systems)',
      },
      optimizing: {
        description: 'जो चल रहा है उसे निखारना। कर दक्षता, पोर्टफ़ोलियो पुनर्संतुलन, और उन्नत रणनीतियाँ।',
        covered: 'टैक्स-लॉस हार्वेस्टिंग, पोर्टफ़ोलियो पुनर्संतुलन (rebalancing), एसेट लोकेशन (कौन-सा निवेश किस खाते में), विविधीकरण (diversification)',
      },
      mastery: {
        description: 'लंबी अवधि की सोच। पीढ़ियों की संपत्ति, एस्टेट योजना (वसीयत और उत्तराधिकार), और वित्तीय स्वतंत्रता।',
        covered: 'एस्टेट योजना (estate planning), FIRE (वित्तीय स्वतंत्रता और जल्दी रिटायरमेंट), पीढ़ियों की संपत्ति (generational wealth), निकासी रणनीतियाँ (withdrawal strategies)',
      },
      'inclusive-finances': {
        description: 'उन घरों के लिए जिनके लिए मानक सलाह नहीं लिखी गई। हर मार्गदर्शिका एक आम धारणा लेती है, दिखाती है कि वह लागू न हो तो क्या टूटता है, और उसे सोच-समझकर नए सिरे से बनाती है।',
        covered: 'अविवाहित और लिव-इन जोड़े (unmarried and cohabiting couples), साझा घर (shared households), गिग काम, ब्याज-रहित वित्त (interest-free finance), सीमा-पार परिवार (cross-border households), अकेले बुढ़ापा जीने वाले (solo agers), तलाक (divorce), देखभाल (caregiving), विकलांगता (disability), चुना हुआ परिवार (chosen family), मिले-जुले परिवार (blended families), जीवनसाथी को खोना (widowhood)',
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
        description: 'निवेश करना सीखें: परिसंपत्ति वर्ग, जोखिम, चक्रवृद्धि ब्याज, और कब शुरू करें। शुरुआती पाठकों के लिए निवेश की आसान मार्गदर्शिकाएँ, वित्तीय साक्षरता के लिए।',
        card: 'निवेश करना सीखें: परिसंपत्ति वर्ग, जोखिम, चक्रवृद्धि ब्याज, और कब शुरू करें। शुरुआती पाठकों के लिए निवेश की आसान मार्गदर्शिकाएँ, वित्तीय साक्षरता के लिए।',
      },
      'risk': {
        name: 'जोखिम',
        title: 'वित्तीय जोखिम को समझना: निवेश साक्षरता | nidhi',
        description: 'जोखिम ख़तरा नहीं, अनिश्चितता है। अस्थिरता और स्थायी नुकसान में फ़र्क़ समझें, और यह भी कि समय जोखिम को कैसे बदलता है। nidhi से वित्तीय साक्षरता।',
        card: 'जोखिम ख़तरा नहीं, अनिश्चितता है। अस्थिरता और स्थायी नुकसान में फ़र्क़ समझें, और यह भी कि समय जोखिम को कैसे बदलता है।',
      },
      'planning': {
        name: 'योजना',
        title: 'वित्तीय योजना: खाते, कर और प्रगति पर नज़र | nidhi',
        description: 'वित्तीय ज्ञान को योजना में कैसे बदलें: खाते, कर, पुनर्संतुलन, लक्ष्य, और किन बातों पर नज़र रखें। nidhi से व्यावहारिक वित्तीय योजना मार्गदर्शिकाएँ।',
        card: 'वित्तीय ज्ञान को योजना में कैसे बदलें: खाते, कर, पुनर्संतुलन, लक्ष्य, और किन बातों पर नज़र रखें। nidhi से व्यावहारिक वित्तीय योजना मार्गदर्शिकाएँ।',
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
      title: 'पर्सनल फाइनेंस सीखें | nidhi',
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
      findHeading: 'पाठ खोजें',
      browseByTopic: 'विषय से देखें',
      searchLabel: 'पाठ खोजें',
      searchPlaceholder: 'पाठ अंग्रेज़ी में हैं, इसलिए अंग्रेज़ी में खोजें, जैसे debt, renting, couples',
      noMatches: 'कोई पाठ नहीं मिला। खोज पाठों के अंग्रेज़ी शीर्षकों और विवरणों में होती है; कोई व्यापक अंग्रेज़ी शब्द, या विषय सूची, मदद कर सकती है।',
      lessonOne: 'पाठ',
      lessonMany: 'पाठ',
      inclusivePill: 'सबके लिए वित्त',
      showAll: 'सभी {count} दिखाएँ',
      concepts: {
        'net-worth': 'शुद्ध संपत्ति (net worth) क्या है, और वह कैसे निकाली जाती है',
        'interest': 'किसी कर्ज़ पर ब्याज दर (interest rate) क्यों मायने रखती है',
        'emergency-fund': 'आपातकालीन कोष (emergency fund) किस काम आता है',
        'inflation': 'महँगाई (inflation) पैसे की क्रय शक्ति (purchasing power) को कैसे घटाती है',
        'asset-classes': 'शेयर, बॉन्ड और नकद (cash) कैसे अलग हैं',
        'diversification': 'विविधीकरण (diversification) क्या करता है, और क्या नहीं',
        'tax-accounts': 'कर-बचत खाता (tax-advantaged account) क्या होता है',
        'rebalancing': 'पोर्टफ़ोलियो अपने तय अनुपात से क्यों खिसकता है, और उसका पुनर्संतुलन (rebalancing) क्यों किया जाता है',
        'fees': '1% सालाना शुल्क (fee) दशकों में कितना बड़ा हो जाता है',
        'real-returns': 'असली रिटर्न (real return) क्या है, महँगाई और लागत के बाद',
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
      guidesOne: 'सबके लिए वित्त की {count} मार्गदर्शिका',
      guidesMany: 'सबके लिए वित्त की {count} मार्गदर्शिकाएँ',
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
};
