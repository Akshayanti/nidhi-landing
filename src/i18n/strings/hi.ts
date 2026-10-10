import type { Dict } from './types.ts';

/**
 * Hindi strings. Typed as `Dict`, so a missing or an extra key is a type error
 * and `catalog.test.ts` re-checks the key sets at build time.
 *
 * Two things that come from CLAUDE.md and apply throughout:
 *   - No em dashes and no double dashes. Devanagari uses the danda `।` as a
 *     full stop; inside a sentence, use a colon or a comma.
 *   - Describe common practice, never instruct. Imperatives are fine for
 *     neutral actions (list your accounts, check your statement), not for
 *     allocation, product or tax decisions.
 *
 * The vocabulary here is fixed by docs/i18n/hi-glossary.md; change a term
 * there first, so the lessons and the chrome keep agreeing.
 */
export const hi: Dict = {
  skipToContent: 'मुख्य सामग्री पर जाएँ',

  langSwitch: {
    toHindi: 'हिन्दी',
    toEnglish: 'English',
    ariaToHindi: 'यह पेज हिन्दी में पढ़ें',
    ariaToEnglish: 'यह पेज अंग्रेज़ी में पढ़ें',
  },

  nav: {
    primaryLabel: 'मुख्य',
    menuLabel: 'मेन्यू',
    menuCloseLabel: 'मेन्यू बंद करें',
    homeLabel: 'nidhi का होम पेज',
    newTabHint: ' (नए टैब में खुलता है)',
    groups: { learn: 'सीखें', tools: 'मुफ़्त टूल', about: 'nidhi के बारे में', language: 'भाषा' },
    buttons: { tools: 'मुफ़्त टूल', learn: 'सीखें' },
    items: {
      blog: 'सीखने का रास्ता',
      blogTopics: 'विषय देखें',
      learnEditorial: 'पाठ कैसे लिखे जाते हैं',
      multiCurrencyNetWorth: 'शुद्ध संपत्ति कैलकुलेटर',
      loanComparison: 'लोन की तुलना',
      monteCarloSimulator: 'मोंटे कार्लो सिम्युलेटर',
      allTools: 'सभी मुफ़्त टूल',
      about: 'nidhi के बारे में',
      beliefs: 'हमारे सिद्धांत',
      editorialPolicy: 'संपादकीय नीति',
      contact: 'हमसे संपर्क करें',
      email: 'ईमेल',
      instagram: 'इंस्टाग्राम',
    },
    // Devanagari has no upper or lower case, so the desktop dropdown and the
    // sheet word these the same. They are listed separately anyway, because
    // `Dict` requires the keys and because a future edit may want them apart.
    menu: {
      multiCurrencyNetWorth: 'शुद्ध संपत्ति कैलकुलेटर',
      loanComparison: 'लोन की तुलना',
      monteCarloSimulator: 'मोंटे कार्लो सिम्युलेटर',
      allTools: 'सभी मुफ़्त टूल देखें',
    },
  },

  footer: {
    tagline: 'पैसे की समझ',
    columns: {
      learn: 'सीखें',
      tools: 'मुफ़्त टूल',
      product: 'प्रोडक्ट',
      about: 'nidhi के बारे में',
      connect: 'जुड़ें',
    },
    links: {
      blog: 'सीखने का रास्ता',
      blogTopics: 'विषय देखें',
      multiCurrencyNetWorth: 'शुद्ध संपत्ति कैलकुलेटर',
      loanComparison: 'लोन की तुलना',
      monteCarloSimulator: 'मोंटे कार्लो सिम्युलेटर',
      allTools: 'सभी देखें',
      home: 'होम',
      about: 'nidhi के बारे में',
      beliefs: 'हमारे सिद्धांत',
      editorialPolicy: 'संपादकीय नीति',
      privacy: 'प्राइवेसी',
      cookieSettings: 'कुकी सेटिंग',
    },
    disclaimerShort:
      'nidhi आपके पैसों को समझने में मदद के लिए जानकारी और टूल देता है। यह लाइसेंस प्राप्त वित्तीय सलाहकार नहीं है।',
    disclaimerLong:
      'सामग्री और टूल सीखने के लिए हैं, इन्हें पेशेवर वित्तीय, निवेश या कर सलाह नहीं माना जाना चाहिए। किसी भी निवेश का पिछला प्रदर्शन आगे के नतीजों के बारे में कुछ नहीं बताता। बड़े फ़ैसलों के लिए किसी योग्य पेशेवर से सलाह लें।',
    copyright: '© {year} nidhi. सर्वाधिकार सुरक्षित।',
  },

  cookie: {
    dialogLabel: 'कुकी सहमति',
    // The space at the end of `textBefore` and the one at the start of
    // `textAfter` are part of the sentence, not formatting.
    textBefore:
      'हम हर हाल में पेज व्यू गिनते हैं, बिना यह जाने कि किसने देखा, ताकि पता चले कि क्या काम आ रहा है। क्या हम ',
    textEmphasis: 'क्लिक',
    textAfter:
      ' भी दर्ज कर सकते हैं, ताकि टूटे लिंक और उलझाने वाले लेआउट पकड़ में आएँ? कोई विज्ञापन नहीं, और डेटा किसी को बेचा नहीं जाता।',
    privacyLink: 'देखें हम असल में कौन सी जानकारी लेते हैं →',
    decline: 'नहीं, धन्यवाद',
    accept: 'हाँ, ठीक है',
  },

  theme: {
    groupLabel: 'थीम',
    light: 'लाइट',
    lightTitle: 'लाइट थीम',
    system: 'सिस्टम',
    systemTitle: 'सिस्टम के अनुसार थीम',
    dark: 'डार्क',
    darkTitle: 'डार्क थीम',
  },

  rss: {
    title: 'nidhi | पर्सनल फाइनेंस ब्लॉग',
  },

  // Page copy, one namespace per page. The same split-before-the-link,
  // split-after-the-link shape as the English catalog, used differently where
  // Hindi wants a different word order.
  about: {
    meta: {
      title: 'nidhi के बारे में: यह कौन लिखता है और इस पर भरोसा क्यों किया जा सकता है | nidhi',
      description:
        'nidhi कौन लिखता है, लेखन के पीछे क्या है, और हर पर्सनल फाइनेंस पोस्ट की रिसर्च और स्रोत कैसे तय होते हैं।',
    },
    schema: {
      name: 'nidhi के बारे में',
      description:
        'nidhi कौन लिखता है, लेखन पर भरोसा क्यों किया जा सकता है, और हर पोस्ट की रिसर्च और स्रोत कैसे तय होते हैं।',
      organization:
        'nidhi.today पर अनुभव और रिसर्च पर टिकी पर्सनल फाइनेंस शिक्षा, जिसमें शुद्ध संपत्ति, एक से ज़्यादा मुद्राओं में पैसा संभालना, और आर्थिक स्वतंत्रता शामिल हैं। पोस्टों में बताए गए टूल खुद बनाता है और हर लेख को बताए गए स्रोतों से जाँचता है।',
      knowsAbout: {
        personalFinance: 'पर्सनल फाइनेंस',
        financialLiteracy: 'वित्तीय साक्षरता',
        netWorthTracking: 'शुद्ध संपत्ति का हिसाब',
        multiCurrencyFinance: 'एक से ज़्यादा मुद्राओं में वित्त',
        financialIndependence: 'आर्थिक स्वतंत्रता',
        moneyManagement: 'पैसे का प्रबंधन',
      },
      breadcrumbHome: 'होम',
      breadcrumbAbout: 'परिचय',
    },
    title: 'nidhi के बारे में',
    intro:
      'nidhi इस लेखन का नाम है, और उस प्रोजेक्ट का भी जिसका यह हिस्सा है। शुरुआत एक व्यक्ति ने की, नाम चल निकला, और जब आप ये पाठ पढ़ते हैं तो उसी को पढ़ रहे होते हैं।',
    sections: {
      whoIsWriting: 'यह कौन लिखता है',
      whyYouCanTrustIt: 'इस पर भरोसा क्यों किया जा सकता है',
      howPostsAreMade: 'पोस्ट कैसे बनती हैं',
      whatNidhiKnowsAbout: 'nidhi किन विषयों पर लिखता है',
    },
    body: {
      whoIsWriting:
        'इस साइट की हर पोस्ट एक ही नाम के तहत लिखी और संपादित होती है: nidhi। यह प्रोजेक्ट इसलिए शुरू हुआ कि एक व्यक्ति को ऐसा वित्तीय टूल नहीं मिला जो एक सामान्य ज़िंदगी संभाल सके, जिसमें पैसा एक से ज़्यादा मुद्राओं में हो, कर्ज़ दूसरी मुद्रा में, और भविष्य सीमाओं के पार। लेखन भी उसी जगह से आता है: असली सवाल, जिनका जवाब एक आम व्यक्ति को देना ही होता है, और वही समझाया गया है जैसे उसने चाहा होता कि कोई समझा दे।',
      whyYouCanTrustIt1:
        'यहाँ अधिकार अनुभव और रिसर्च से आता है, नाम के आगे लगी उपाधियों की कतार से नहीं। nidhi वही टूल बनाता है जिनका ज़िक्र पोस्टों में है, इसलिए लेखन आंकड़ों के साथ काम करने से निकलता है, दोहराए जाते तर्कों से नहीं। जहाँ कोई पोस्ट दावा करती है, वहाँ वह अपना स्रोत बताती है: हर लेख के नीचे "आगे पढ़ने के लिए" वाले हिस्से में दी गई किताबें, संदर्भ पेज और मूल सामग्री।',
      whyYouCanTrustIt2:
        'जो यह नहीं है: लाइसेंस प्राप्त वित्तीय सलाह। nidhi समझाता है कि पैसा कैसे काम करता है, ताकि आप अपने फ़ैसले खुद ले सकें। यह नहीं बताता कि कौन सा फंड खरीदें, और कभी नहीं बताएगा। जहाँ फ़ैसला आपकी कर निवास स्थिति, कानूनी हालत या जोखिम उठाने की क्षमता पर टिका हो, वहाँ किसी योग्य पेशेवर से बात करना सही रहता है। यह सीमा जानबूझकर है, और हर पेज के फुटर में भी वही लिखी है।',
      // Three parts around the link, as in the English catalog, but Hindi puts
      // its word for "page" after the link where English puts it before. The
      // link text of the second one is "हमारे सिद्धांत", the chrome's own
      // wording for the beliefs page, so a reader lands where the link said.
      howPostsAreMade: {
        before:
          'हर लेख की शुरुआत एक ठोस सवाल से होती है, उसे असली आंकड़ों और उदाहरणों के साथ हल किया जाता है, और छपने से पहले बताए गए स्रोतों से जाँचा जाता है। पूरी प्रक्रिया, स्रोतों के मानक, और सुधार कैसे होते हैं, यह सब ',
        link: 'संपादकीय नीति',
        after: ' पेज पर है।',
      },
      whatNidhiKnowsAbout: {
        before:
          'लेखन मुख्य रूप से शुद्ध संपत्ति और उसे नापने के तरीकों, एक से ज़्यादा मुद्राओं में पैसा संभालने, कैश फ़्लो और बचत, कर्ज़, और आर्थिक स्वतंत्रता के रास्ते पर केंद्रित है। इन सबके पीछे की सोच पढ़नी हो तो ',
        link: 'हमारे सिद्धांत',
        after: ' पढ़ें।',
      },
    },
    cta: {
      text: 'सवाल, सुधार, या बस हैलो कहना हो?',
      email: 'ईमेल hello@nidhi.today',
      instagram: 'इंस्टाग्राम @nidhi.today',
    },
  },
};
