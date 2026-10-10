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
        'nidhi कौन लिखता है, लेखन के पीछे कौन सी योग्यताएँ हैं, और हर पर्सनल फाइनेंस पोस्ट पर रिसर्च कैसे होती है और स्रोत कैसे दिए जाते हैं।',
    },
    schema: {
      name: 'nidhi के बारे में',
      description:
        'nidhi कौन लिखता है, लेखन पर भरोसा क्यों किया जा सकता है, और हर पोस्ट पर रिसर्च कैसे होती है और स्रोत कैसे दिए जाते हैं।',
      organization:
        'nidhi.today पर अनुभव और रिसर्च पर टिकी पर्सनल फाइनेंस शिक्षा, जिसमें शुद्ध संपत्ति, कई मुद्राओं में पैसा संभालना, और वित्तीय स्वतंत्रता शामिल हैं। पोस्टों में बताए गए टूल यहीं बनाए जाते हैं और हर लेख बताए गए स्रोतों से जाँचा जाता है।',
      knowsAbout: {
        personalFinance: 'पर्सनल फाइनेंस',
        financialLiteracy: 'वित्तीय साक्षरता',
        netWorthTracking: 'शुद्ध संपत्ति का हिसाब',
        multiCurrencyFinance: 'कई मुद्राओं में पैसा',
        financialIndependence: 'वित्तीय स्वतंत्रता',
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
      // No subject: the English never says whether the writer is a man or a
      // woman, and a Hindi sentence with nidhi as its subject would have to
      // pick one, because a verb agrees with it either way.
      whatNidhiKnowsAbout: 'किन विषयों पर लिखा जाता है',
    },
    body: {
      whoIsWriting:
        'इस साइट की हर पोस्ट एक ही नाम के तहत लिखी और संपादित होती है: nidhi। यह प्रोजेक्ट इसलिए शुरू हुआ कि एक व्यक्ति को ऐसा वित्तीय टूल नहीं मिला जो एक सामान्य जीवन संभाल सके, जहाँ पैसा एक से ज़्यादा मुद्राओं में हो, कर्ज़ किसी दूसरी मुद्रा में, और भविष्य देशों की सीमाओं के पार बना हो। लेखन भी उसी जगह से आता है: असली सवाल, जिनका जवाब एक आम व्यक्ति को देना ही होता है, और वही समझाया गया है जैसे उसने चाहा होता कि कोई समझा दे।',
      // Passive, and "कर निवास" rather than "कर निवास स्थिति": the direct
      // translations of "authority" and "risk tolerance" that came first read
      // as an official form. See docs/i18n/hi-glossary.md.
      whyYouCanTrustIt1:
        'यहाँ की विश्वसनीयता अनुभव और रिसर्च पर टिकी है, नाम के आगे लगी उपाधियों की कतार पर नहीं। जिन टूल का ज़िक्र पोस्टों में है, वे यहीं बनाए जाते हैं, इसलिए लेखन आंकड़ों के साथ काम करने से निकलता है, तैयार तर्कों को दोहराने से नहीं। जहाँ कोई पोस्ट दावा करती है, वहाँ वह अपना स्रोत बताती है: हर लेख के नीचे "आगे पढ़ने के लिए" वाले हिस्से में दी गई किताबें, संदर्भ पेज और मूल सामग्री।',
      whyYouCanTrustIt2:
        'साफ़ कर दें: यह लाइसेंस प्राप्त वित्तीय सलाह नहीं है। यहाँ यह समझाया जाता है कि पैसा कैसे काम करता है, ताकि आप अपने फ़ैसले खुद ले सकें। यहाँ यह नहीं बताया जाता कि कौन सा फंड खरीदना चाहिए, और कभी नहीं बताया जाएगा। जहाँ फ़ैसला आपके कर निवास, कानूनी स्थिति या जोखिम लेने की क्षमता पर टिका हो, वहाँ किसी योग्य पेशेवर से बात करना सही रहता है। यह सीमा जानबूझकर है, और हर पेज के फुटर में भी वही लिखी है।',
      // Three parts around the link, as in the English catalog, and here the
      // word "पेज" belongs inside the link where English also has it: split
      // across the link boundary it reads as two unrelated nouns.
      howPostsAreMade: {
        before:
          'हर लेख की शुरुआत एक ठोस सवाल से होती है, उसे असली आंकड़ों और उदाहरणों के साथ चरण दर चरण हल किया जाता है, और प्रकाशित होने से पहले बताए गए स्रोतों से जाँचा जाता है। पूरी प्रक्रिया, स्रोत चुनने और उद्धृत करने के मानक, और सुधार कैसे होते हैं, यह सब ',
        link: 'संपादकीय नीति पेज',
        after: ' पर है।',
      },
      whatNidhiKnowsAbout: {
        before:
          'लेखन मुख्य रूप से शुद्ध संपत्ति और उसे नापने के तरीकों, एक से ज़्यादा मुद्राओं में पैसा संभालने, कैश फ़्लो और बचत, कर्ज़, और वित्तीय स्वतंत्रता के रास्ते पर केंद्रित है। इन सबके पीछे की सोच पढ़नी हो तो ',
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

  /**
   * The beliefs page. This is the site's own manifesto rather than a lesson:
   * the English is first person plural, warm and blunt ("we're full of it",
   * "slide into our DMs"), and the Hindi keeps that register instead of
   * flattening it into the lessons' neutral voice. What it does not do is
   * invent a gender for the one person behind the site, so the second
   * sentences are ergative or passive where English says "you" and "we"
   * without saying which.
   */
  beliefs: {
    meta: {
      title: 'हमारे सिद्धांत: ईमानदार पर्सनल फाइनेंस टूल | nidhi',
      description:
        'nidhi पर हम क्या मानते हैं: ईमानदार पर्सनल फाइनेंस टूल, मुफ़्त वित्तीय साक्षरता, कोई विज्ञापन नहीं, डेटा नहीं बेचा जाता, और ऐसे पाठ जो हमेशा मुफ़्त रहेंगे।',
    },
    schema: {
      name: 'हमारे सिद्धांत',
      description:
        'nidhi पर हम क्या मानते हैं: ईमानदार पर्सनल फाइनेंस टूल, मुफ़्त वित्तीय साक्षरता, कोई विज्ञापन नहीं, डेटा नहीं बेचा जाता।',
      organization: 'पर्सनल फाइनेंस टूल और वित्तीय साक्षरता।',
      foundingLocation: 'प्राग',
      knowsAbout: {
        personalFinance: 'पर्सनल फाइनेंस',
        financialLiteracy: 'वित्तीय साक्षरता',
        moneyManagement: 'पैसे का प्रबंधन',
        multiCurrencyFinance: 'कई मुद्राओं में पैसा',
      },
      breadcrumbHome: 'होम',
      breadcrumbAbout: 'हमारे सिद्धांत',
    },
    title: 'हम क्या मानते हैं',
    intro:
      'nidhi इसलिए शुरू हुआ कि एक व्यक्ति को कोई ठीक वित्तीय टूल नहीं मिला, और उसे इतनी चिढ़ हुई कि उसने खुद एक बना डाला।',
    items: {
      frustration: {
        heading: 'यह सब झुंझलाहट से शुरू हुआ',
        body: 'हमें ऐसा कुछ चाहिए था जो एक आम व्यक्ति को अपने पैसे की योजना बनाने में मदद करे, दिखाए कि पैसा कहाँ जा रहा है, और उस पर बेहतर फ़ैसले लेने में मदद करे। ऐसा कुछ था ही नहीं। तो हम यहाँ हैं, खुद बना रहे हैं।',
      },
      noPlanner: {
        heading: 'वित्तीय योजना के लिए वित्तीय सलाहकार ज़रूरी नहीं होना चाहिए',
        body: 'आपने अभी पहली नौकरी शुरू की हो या रिटायरमेंट पाँच साल दूर हो, आप ऐसे टूल और मार्गदर्शन के हक़दार हैं जो असल में समझ आएँ। शब्दजाल नहीं। ऊपर से बेचने की कोशिशें नहीं। सिर्फ़ सीधे जवाब।',
      },
      accessibility: {
        heading: 'उन सबके लिए बना, जिन्हें टेक भूल जाता है',
        body: 'बहुत सारे ऐप बड़े आराम से यह भूल जाते हैं कि पैसे के टूल को हर किसी के लिए काम करना चाहिए: चाहे आप रंग न पहचान पाते हों, स्क्रीन रीडर इस्तेमाल करते हों, या जानकारी अलग तरीके से लेते हों, जैसे ADHD या डिस्लेक्सिया की वजह से। हम क्वीयर हैं, न्यूरोडाइवर्जेंट हैं, और गैर-श्वेत हैं; यह आराम हमें कभी नहीं मिला। किसी को उसके ही पैसों से बाहर रखना सस्ता लगता है।',
      },
      freeForever: {
        heading: 'पाठ हमेशा के लिए मुफ़्त हैं',
        body: 'कोई पेवॉल नहीं, "अच्छी चीज़ों के लिए सब्सक्राइब कीजिए" वाली बकवास नहीं। अगर हमारी लिखी कोई बात आपको बेहतर फ़ैसला लेने में मदद कर गई, चाहे आप हमारा प्रोडक्ट कभी इस्तेमाल ही न करें, तो बात बस वही है। हमें बताइए। हम उसी ईंधन पर चलते हैं।',
      },
      rulesOfThumb: {
        heading: 'सिर्फ़ अंगूठे के नियम नहीं',
        body: 'अंगूठे का नियम एक शुरुआत है, जवाब नहीं। जहाँ कोई पाठ ऐसा नियम देता है, वहाँ यह भी बताया जाता है कि वह क्यों है, कहाँ टूटता है, और क्या आप पर निर्भर करता है: आपका देश, आपकी आय, आपके कर्ज़, और आप कितनी दूर की योजना बना रहे हैं। हमें यह बेहतर लगता है कि आप तर्क समझें, ऐसे नियम के पीछे चलने से जो आपकी ज़िंदगी के लिए कभी लिखा ही नहीं गया।',
      },
      noAds: {
        heading: 'न विज्ञापन, न डेटा की बिक्री, न छोटे अक्षरों वाली शर्तें',
        body: 'हम विज्ञापन नहीं चलाते। हम आपका डेटा नहीं बेचते। हम वह अजीब-सा काम नहीं करते जहाँ आप "टर्म इंश्योरेंस" खोजते हैं और फिर हफ़्ते भर हर जगह उसी के विज्ञापन दिखते हैं। आपके पैसे आपका मामला हैं। सच में।',
      },
      madeInPrague: {
        heading: 'प्राग में बना, मुँह-ज़बानी के दम पर चला',
        body: 'कोई VC का पैसा नहीं। कोई ग्रोथ टीम नहीं। हाईवे पर कोई होर्डिंग नहीं। अगर आपको लगता है कि nidhi काम का है, तो किसी को बताइए। यही हमारी मुख्य मार्केटिंग रणनीति है।',
      },
    },
    cta: {
      text: 'यक़ीन हो गया? या लगता है कि हम बकवास कर रहे हैं?',
      sub: 'किसी भी हाल में, हमें आपसे सुनना अच्छा लगेगा',
      email: 'हमें एक प्यार भरी चिट्ठी भेजिए',
      instagram: 'हमारे DM में आइए',
    },
  },
};
