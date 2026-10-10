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

  languagePicker: {
    label: 'भाषा',
    current: 'वर्तमान भाषा',
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

  /**
   * The editorial policy. The English keeps the same five step names in its
   * list that the lessons themselves use, so the list is translated with the
   * lessons' vocabulary rather than freshly: पहले आइडिया, फिर तर्क, फिर सबूत,
   * फिर वे जगहें जहाँ बात टूटती है, और आख़िर में वह जो आप पर निर्भर करता है। The
   * closing sentence of the first section points at the Corrections section
   * below it, so the Hindi names that section in its own words rather than
   * repeating the English heading.
   */
  editorialPolicy: {
    meta: {
      title: 'संपादकीय नीति: nidhi के पाठ कैसे लिखे जाते हैं | nidhi',
      description:
        'हर nidhi पाठ कैसे बनता है और कैसे जाँचा जाता है, उसके आंकड़े कहाँ से आते हैं, वह हर देश के पाठक के लिए क्यों लिखा जाता है, AI टूल कैसे इस्तेमाल होते हैं, और सलाह और शिक्षा के बीच रेखा कहाँ है।',
    },
    schema: {
      name: 'संपादकीय नीति',
      description:
        'nidhi हर पाठ कैसे बनाता और जाँचता है, स्रोत चुनने के उसके मानक, पाठ हर देश के लिए क्यों लिखे जाते हैं, AI टूल कैसे इस्तेमाल होते हैं, सलाह पर लगी सीमा, और सुधार कैसे होते हैं।',
      breadcrumbHome: 'होम',
      breadcrumbThis: 'संपादकीय नीति',
    },
    title: 'संपादकीय नीति',
    intro:
      'पैसे पर लिखी बात जाँचने में आसान होनी चाहिए और अपनी सीमाओं के बारे में साफ़। यह पेज बताता है कि nidhi का हर पाठ कैसे बनता है, उसके स्रोत कहाँ से आते हैं, उसे कैसे जाँचा और सुधारा जाता है, बीच में AI टूल कैसे काम आते हैं, और शिक्षा और सलाह के बीच रेखा कहाँ खिंची है।',
    sections: {
      howALessonIsBuilt: 'पाठ बनता कैसे है',
      anyCountry: 'हर देश के पाठक के लिए लिखा गया',
      sourcesAndFigures: 'स्रोत और आंकड़े',
      ai: 'AI का इस्तेमाल कैसे होता है',
      advice: 'शिक्षा, सलाह नहीं',
      corrections: 'सुधार',
      whoIsBehind: 'इसके पीछे कौन है',
    },
    body: {
      // Devanagari has no capitals, so the English's sentence-initial "Every
      // idea" becomes "हर आइडिया" inside a longer opening sentence.
      builtIntro:
        'हर पाठ किसी असली सवाल से शुरू होता है, ऐसे सवाल से जो किसी आम व्यक्ति के मन में आता है, और उसे असली आंकड़ों के साथ हल किया जाता है। बहुत पाठक पैसे की बातों में नए होते हैं, और कोई भरोसे भरा वाक्य निर्देश जैसा पढ़ा जा सकता है, इसलिए यहाँ समझाया जाता है, बताया नहीं जाता कि करना क्या है। हर आइडिया, हर अंगूठे का नियम, और हर आम तौर पर अपनाई जाने वाली बात इन्हीं पाँच चरणों से गुज़रती है:',
      builtSteps: {
        idea: {
          lead: 'आइडिया',
          rest: ', सीधी भाषा में, और शब्दजाल की व्याख्या पहली बार आते ही।',
        },
        why: {
          lead: 'लोग इसका इस्तेमाल क्यों करते हैं',
          rest: ': यह किस दिक्कत का हल है और यह चला कैसे।',
        },
        evidence: {
          lead: 'सबूत',
          rest: ', स्रोत के साथ, और उसकी सीमाओं के साथ भी: किस देश के आंकड़े, कौन से साल, और उसमें क्या नहीं आता।',
        },
        breaks: {
          lead: 'कहाँ टूटता है',
          rest: ': वे हालात जिनके लिए यह बना ही नहीं था।',
        },
        depends: {
          lead: 'क्या आप पर निर्भर करता है',
          rest: ': आपका देश, आपकी आय कितनी पक्की है, आपके पास कितना समय है, कर्ज़, और कर।',
        },
      },
      builtOutro:
        'अंगूठे का नियम एक शुरुआत है, जवाब नहीं, इसलिए यहाँ यह बताया जाता है कि बहुत लोग क्या करते हैं, और "हमेशा" या "कभी नहीं" जैसी बात तभी लिखी जाती है जब सबूत उसका वज़न उठा सके। पाठ के प्रकाशित होने से पहले उसे दो बातों के लिए दोबारा पढ़ा जाता है: उसके दावों का आधार है या नहीं, और क्या शब्दकोश के बिना भी एक नया पाठक उसे समझ और पूरा कर पाएगा। अगर कोई दावा चुपचाप निकल जाए, तो नीचे "सुधार" वाला हिस्सा देखें।',
      anyCountry:
        'ये पाठ कहीं भी बैठे पाठक के लिए लिखे जाते हैं, किसी एक देश के लिए नहीं। जो बुनियादी बातें यहाँ सिखाई जाती हैं, जैसे शुद्ध संपत्ति, निवेश फैलाना, या महँगाई बचत को कैसे घिसती है, वे हर जगह एक जैसी ही चलती हैं। मगर उन बातों के आसपास के नियम एक जैसे नहीं हैं: कर, रिटायरमेंट और कर में छूट देने वाले खाते, सरकारी पेंशन और भत्ते, क्रेडिट स्कोर, जमा की सुरक्षा और उपभोक्ता कानून हर देश में अलग हैं, और कभी-कभी एक ही देश के अंदर भी। इसलिए पाठ जानबूझकर सिर्फ़ आम बात समझाते हैं। जहाँ कोई पाठ इन नियमों पर टिका हो, वहाँ यह लिखा जाता है, और पाठ के बाद "अपने यहाँ क्या देखें" वाला हिस्सा उन जगहों के नाम बताता है जहाँ आपके यहाँ यह जाँचा जाता है, जैसे आपका कर विभाग, आपका वित्तीय नियामक, या कोई योग्य स्थानीय सलाहकार। उदाहरण अक्सर यूरो में होते हैं; यह मुद्रा चुनने की बात है, इसका मतलब यह नहीं कि नियम यूरोपीय है। जहाँ सबूत किसी एक देश के आंकड़ों से आता है, जैसे अमेरिकी शेयर बाज़ार का इतिहास, वहाँ पाठ यह भी बताता है, और यह भी कि दूसरे बाज़ारों के बारे में वह क्या नहीं बता सकता।',
      sourcesAndFigures:
        'हर दावा मूल स्रोतों और भरोसेमंद दूसरे स्रोतों पर टिकता है: मान्यता प्राप्त किताबें, जाने-माने संदर्भ, और सार्वजनिक आंकड़े। जहाँ कोई पाठ किसी खास स्रोत से लेता है, वहाँ वे स्रोत उसी पाठ के नीचे "आगे पढ़ने के लिए" वाले हिस्से में दिए जाते हैं, ताकि आप खुद रास्ता देख सकें, हमारी बात मान लेने के बजाय। हर आंकड़े के साथ यह भी रहता है कि वह कहाँ से है और क्या कवर करता है, और एक ही आंकड़ा सब पाठों में एक जैसा रहता है। उदाहरणों में असली जैसे आंकड़े लिए जाते हैं, और जहाँ कोई आंकड़ा सिर्फ़ मिसाल के लिए है, भविष्यवाणी नहीं, वहाँ पाठ यह भी बताता है। मुफ़्त टूल में दिखने वाली विनिमय दरें यूरोपीय केंद्रीय बैंक की संदर्भ दरें हैं, और तारीख़ स्क्रीन पर लिखी रहती है।',
      aiUsed1:
        'nidhi अपने काम में AI टूल इस्तेमाल करता है, जिनमें Anthropic का Claude और दूसरे AI एजेंट शामिल हैं। ये खोज में मदद करते हैं, पाठ का मसौदा लिखते और संपादित करते हैं; पाठ को इसी पेज के मानकों पर जाँचते हैं; किसी पाठ या टूल की वित्तीय दलील को एक तजुर्बेकार सलाहकार की नज़र से सवाल करते हैं; और साइट तथा उसके मुफ़्त टूल बनाते हैं। अलग-अलग AI एजेंट जानबूझकर एक-दूसरे का काम जाँचते हैं, ताकि वह पकड़ में आ जाए जो किसी एक से छूट जाता है।',
      // "described in the privacy notice" splits here with the noun phrase
      // after the link, as in the English; Hindi keeps "में" with it.
      aiUsed2: {
        before:
          'AI का नतीजा एक मसौदा है, कभी स्रोत नहीं। हर चरण में कोई व्यक्ति शामिल रहता है, और प्रकाशित होने से पहले हर पाठ उसी ने पढ़ा और मंज़ूर किया होता है। किसी AI मॉडल से यह कहना कि एक वित्तीय सलाहकार की तरह सोचो, तर्क की एक जाँच है, लाइसेंस प्राप्त पेशेवर की सलाह नहीं। साइट खुद आपकी टाइप की हुई या की गई कोई बात किसी AI सेवा तक नहीं भेजती; हम क्या जमा करते हैं, यह ',
        link: 'प्राइवेसी नोटिस',
        after: ' में लिखा है।',
      },
      advice:
        'nidhi लाइसेंस प्राप्त वित्तीय सलाहकार नहीं है, और इस साइट पर कुछ भी व्यक्तिगत वित्तीय, निवेश या कर सलाह नहीं है। पाठ किसी खास प्रोडक्ट, फंड या सिक्योरिटी की सिफ़ारिश नहीं करते। किसी भी निवेश का पिछला प्रदर्शन आगे के नतीजों के बारे में कुछ नहीं बताता। जहाँ फ़ैसला आपके कर निवास, कानूनी स्थिति या जोखिम लेने की क्षमता पर टिका हो, वहाँ कोई योग्य पेशेवर इन बातों को आपके हालात पर लागू कर सकता है।',
      // The link is an address, so it reads the same in both languages and
      // the component holds it; only the two halves of the sentence move.
      corrections: {
        before:
          'अगर कहीं कुछ ग़लत है, तो हम उसे ठीक करना चाहते हैं। कोई ग़लती, पुराना पड़ चुका आंकड़ा, या ऐसा दावा जो अब सही नहीं रहा, दिखे तो ईमेल कीजिए ',
        after:
          ' पर। बड़े सुधार पाठ में ही किए जाते हैं और उसकी "आख़िरी बार अपडेट" वाली तारीख़ में दिखते हैं, ताकि बदलाव दिखे, चुपचाप बदल कर रखा न जाए। टाइपिंग की छोटी-मोटी ग़लतियाँ बिना तारीख़ बदले ठीक कर दी जाती हैं।',
      },
      // Two links in one sentence, so five parts rather than three, and the
      // Hindi puts the verb before the first link where the English puts it
      // before neither: "... देखें " + link.
      whoIsBehind: {
        before: 'nidhi कौन लिखता है और लेखन के पीछे कौन सा अनुभव है, यह ',
        aboutLink: 'परिचय पेज',
        middle: ' पर देखें। हम क्या बनाना और छापना चुनते हैं, इसके पीछे की सोच पढ़नी हो तो ',
        beliefsLink: 'हमारे सिद्धांत',
        after: ' पढ़ें।',
      },
    },
  },
  /**
   * The home page. Same shape as the English one: the card beside the hero, the
   * three steps, the worked example and the FAQ. Sentences carrying a `{name}`
   * are templates, and the names are the ones the component passes, so a
   * sentence may put a number or a link somewhere else than the English does.
   *
   * The register is the lessons' own: it explains and lets the reader decide.
   * The FAQ answers that describe what the tools do are the same promises the
   * privacy notice makes, so they are worded to match it.
   */
  /** The early-access waitlist box. See the English catalog for what it promises. */
  waitlist: {
    region: 'अर्ली-एक्सेस वेटलिस्ट',
    heading: 'प्लानर खुलने पर चाहिए?',
    emailLabel: 'ईमेल पता',
    cta: 'मुझे बताएँ',
    privacyBefore: 'एक्सेस खुलने पर सिर्फ़ एक ईमेल। ',
    privacyLink: 'प्राइवेसी नीति',
    privacyAfter: ' देखें।',
    successTitle: 'आप लिस्ट में हैं',
    successBody: 'एक्सेस खुलने पर हम एक ईमेल भेजेंगे। बस इतना ही।',
    sending: 'भेजा जा रहा है…',
    notConfigured: 'साइनअप अभी सेट नहीं हैं। थोड़ी देर बाद देखें।',
  },
  home: {
    meta: {
      title: 'nidhi | अपने पैसे को समझें और आगे की योजना बनाएँ',
      description:
        'अपने पैसे को समझने और अपने भविष्य की योजना बनाने के लिए मुफ़्त पर्सनल फाइनेंस पाठ और निजी टूल: बुनियादी बातों से लेकर उन वित्तों तक जो कई मुद्राओं में फैले हैं।',
      imageAlt:
        'nidhi: पैसा, समझ के साथ। अपने पैसे को समझने और अपने भविष्य की योजना बनाने के लिए मुफ़्त पर्सनल फाइनेंस पाठ और निजी टूल।',
    },
    /** Structured data, not visible text. It still reads in the page's language. */
    schema: {
      slogan: 'पैसा, समझ के साथ',
      organization:
        'nidhi आम लोगों को अपना पैसा समझने में मदद करता है: मुफ़्त और क्रमबद्ध पर्सनल फाइनेंस पाठ, ब्राउज़र में ही चलने वाले निजी टूल, और वित्तीय भविष्य के लिए एक प्लानर। शुरुआत बुनियादी बातों से होती है और वित्त के जटिल होते जाने पर भी यह काम आता है, तब भी जब पैसा कई मुद्राओं और देशों में बँटा हो।',
      knowsAbout: [
        'पर्सनल फाइनेंस',
        'वित्तीय साक्षरता',
        'शुद्ध संपत्ति',
        'आपातकालीन कोष',
        'निवेश',
        'वित्तीय स्वतंत्रता',
        'रिटायरमेंट की योजना',
        'बिहेवियरल फाइनेंस',
        'कई मुद्राओं में पैसा',
      ],
      site: 'पैसा, समझ के साथ। पर्सनल फाइनेंस सीखें, अपने पैसे को समझें, और अपने भविष्य की योजना बनाएँ: बुनियादी बातों से लेकर उन वित्तों तक जो कई मुद्राओं और देशों में फैले हैं।',
    },
    hero: {
      heading: 'अपने पैसे को समझें।',
      /** Three phrases, each its own element so they can wrap independently. */
      subhead: ['मुफ़्त पाठ।', 'निजी टूल।', 'प्लानर आ रहा है।'],
      startLearning: 'सीखना शुरू करें',
      tryTool: 'कोई मुफ़्त टूल आज़माएँ',
      /** Shown only to a reader this browser knows has started the path. */
      welcomeBack: 'फिर से स्वागत है। जहाँ छोड़ा था, वहीं से आगे बढ़ें:',
    },
    /**
     * The card beside the hero: the three steps at a glance. Steps 2 and 3
     * carry the worked example's numbers, so their sentences are templates.
     */
    journey: {
      label: 'सीखें, हिसाब लगाएँ, योजना बनाएँ · राशियाँ उदाहरण के लिए',
      learnStep: '1 · सीखें',
      learnBig: 'शुद्ध संपत्ति क्या है?',
      learnSmall: 'जो आपके पास है, घटाकर जो आप पर है।',
      stockStep: '2 · हिसाब लगाएँ',
      stockSmall: 'दो लोग, दोनों की आय हर महीने {amount}।',
      planStep: '3 · योजना बनाएँ',
      planBig: '{gap} का फ़र्क़',
      planSmall: 'हर महीने {low} या {high}, {years} साल तक।',
    },
    /** The numbered marker above each step's heading. */
    steps: {
      learn: 'सीखें',
      stock: 'हिसाब लगाएँ',
      plan: 'योजना बनाएँ',
      /** Spoken before the heading, and hidden: "चरण 1: सीखें". */
      mark: 'चरण {n}: ',
    },
    /** Step 1: the ways in, one line each. */
    lessons: {
      heading: 'मुफ़्त पाठ, हमेशा के लिए।',
      body: 'हर तरह के घर और हर देश के लिए छोटे पाठ, और जहाँ जगह-जगह के नियम मायने रखते हैं, वहाँ ये बताते हैं कि क्या देखना है। न पेवॉल, न अकाउंट।',
      helperQuestion: 'तय नहीं हो रहा कि कहाँ से शुरू करें?',
      helperLink: 'दो सवाल बता देंगे कि शुरुआत कहाँ से बेहतर बैठेगी',
      foot: 'पूरा सीखने का रास्ता देखें',
      /** A route whose lessons are still scheduled: shown, not linked. */
      comingSoon: '{level} · पाठ जल्द आ रहे हैं',
      comingSoonNoLevel: 'और पाठ',
      levelCount: '{level} · {count} पाठ',
      severalLevels: 'कई स्तरों के पाठ',
      start: 'शुरू करें',
      /** Replaces `start` for a route the reader has already begun. */
      doorContinue: 'आगे बढ़ें: ',
      /** Replaces it once every lesson on the route is read. */
      doorRead: 'रास्ता पूरा। ',
      doorPath: 'सीखने के रास्ते पर आगे बढ़ते रहें',
      inclusiveTitle: 'मानक योजना मेरे जीवन में नहीं बैठती।',
      inclusiveMeta: 'सबके लिए वित्त · {count} गाइड, किसी भी पड़ाव पर',
      inclusiveMetaOne: 'सबके लिए वित्त · 1 गाइड, किसी भी पड़ाव पर',
      inclusiveGo: 'देखें',
    },
    /** Step 2: what the free tools are for. */
    tools: {
      heading: 'देखें कि आप कहाँ खड़े हैं।',
      body: 'ऐसे मुफ़्त टूल जो आपके ब्राउज़र में ही चलते हैं, इसलिए आप जो लिखते हैं वह आपके ही डिवाइस पर रहता है।',
    },
    /** The two people, same income, different net worth. */
    compare: {
      label: 'एक ही आय, हर महीने {amount}',
      owns: 'जो आपके पास है',
      owes: 'जो आप पर है',
      netWorth: 'शुद्ध संपत्ति',
      caption: 'आय वह है जो अंदर आता है। शुद्ध संपत्ति वह है जो आपके पास है, घटाकर जो आप पर है। राशियाँ उदाहरण के लिए।',
      people: {
        alex: { name: 'Alex', note: 'एक कार और एक कार्ड, दोनों उधार पर' },
        sam: { name: 'Sam', note: 'बचत, एक पेंशन, एक छोटा लोन' },
      },
    },
    /** Step 3: the planner, and the one decision compared. */
    planner: {
      heading: 'देखें कि यह कहाँ तक जा सकता है।',
      body: 'हम एक प्लानर बना रहे हैं: जो आपके पास है, जो आप पर है, जो आप कमाते हैं और जो खर्च करते हैं, सब एक जगह, एक मुद्रा में या कई में, ताकि ऐसे फ़ैसले लेने से पहले आप उनकी तुलना कर सकें।',
    },
    /**
     * The worked example. Its numbers are computed (src/utils/home/), so the
     * sentences here are templates, and the chart's own labels come from the
     * four keys at the bottom.
     */
    example: {
      label: 'एक फैसला, तुलना में',
      text: 'शुरुआत वही {start}, हर महीने {low} या {high} जोड़ने पर।',
      currencyNote:
        'यूरो सिर्फ़ इस उदाहरण की मुद्रा है। दोनों रास्ते एक ही प्रतिशत रिटर्न कमाते हैं, इसलिए उनके बीच का फ़र्क़ भी एक अनुपात है: रुपयों या डॉलरों में दोनों रेखाएँ वही आकार बनाएँगी, बदलेगा तो बस अक्ष।',
      /** Bolded, and read as one sentence with `gapRest` after it. */
      gapLead: 'करीब {gap} का फ़र्क़',
      gapRest: '{years} साल बाद: {extra} ज़्यादा डाला गया, और करीब {growth} ज़्यादा रिटर्न।',
      fold: 'यह उदाहरण कैसे बना',
      chartTitle: 'उदाहरण: दस साल में एक फ़ैसले की तुलना',
      /** The chart's x-axis points: the first is `today`, the rest are years. */
      today: 'आज',
      year: 'साल {n}',
      axisStart: 'आज',
      axisEnd: '+{years} साल',
      /** A chart series label, in the legend and read aloud on hover. */
      perMonth: '{amount} €/महीना',
      /** Read aloud, and printed for a reader who cannot see the chart. */
      description:
        'आज निवेश किए गए उसी {invested} से बने दो उदाहरण रास्ते, महँगाई के बाद सालाना {pct} मानकर। हर महीने {monthly} जोड़ने पर {years} साल बाद करीब {end} बनता है; हर महीने {higher} जोड़ने पर करीब {alternative}। करीब {gap} का फ़र्क़ इतना है: {extra} ज़्यादा डाला गया, और करीब {growth} ज़्यादा रिटर्न।',
      footnote:
        'उदाहरण: आज {invested} निवेश किया गया, और हर महीने की शुरुआत में {monthly} या {higher} जोड़े गए, महँगाई के बाद सालाना {pct} मानकर। असली रिटर्न साल दर साल बदलते रहते हैं और नकारात्मक भी हो सकते हैं। पूरी शुद्ध संपत्ति एक ही दर से नहीं बढ़ती: कार की कीमत घटती है और लोन चुकाया जाता है।',
      /** Spoken to a screen reader that lands on the chart. */
      keysHint: 'इसके आंकड़े पढ़ने के लिए बाईं और दाईं तीर कुंजियाँ दबाएँ।',
    },
    faq: {
      heading: 'आम सवाल',
      /**
       * Questions and answers. The same text is printed on the page and
       * published as FAQPage structured data, so it is written once here.
       */
      items: [
        {
          q: 'क्या nidhi शुरुआत करने वालों के लिए है?',
          a: 'हाँ। सीखने का रास्ता शुद्ध संपत्ति क्या है, इससे शुरू होता है और किसी पहले के ज्ञान की अपेक्षा नहीं करता। हर पाठ अपने शब्द चलते-चलते समझाता है, और अब तक के {total} पाठ पढ़ने के क्रम में हैं, इसलिए ऊपर से शुरू करके आगे बढ़ते जाया जा सकता है।',
        },
        {
          q: 'nidhi इस्तेमाल करने के लिए एक से ज़्यादा मुद्राओं में पैसा होना ज़रूरी है?',
          a: 'नहीं। सब कुछ एक ही मुद्रा में काम करता है। एक से ज़्यादा मुद्राओं का सहारा तब के लिए है जब आपका जीवन उसकी माँग करे: बचत एक देश में, पेंशन या संपत्ति किसी दूसरे में, या आगे कहीं और जाने की योजना।',
        },
        {
          q: 'nidhi का खर्च क्या है?',
          a: 'पाठ और मुफ़्त टूल बिल्कुल मुफ़्त हैं और इनके लिए किसी अकाउंट की ज़रूरत नहीं। पाठ आगे भी मुफ़्त रहेंगे, कोई पेवॉल नहीं।',
        },
        {
          q: 'क्या यह वित्तीय सलाह है?',
          a: 'नहीं। nidhi शिक्षा के लिए है: यह समझाता है कि पैसा कैसे काम करता है और आपको अपनी स्थिति का हिसाब लगाने देता है। यह लाइसेंस प्राप्त वित्तीय सलाहकार नहीं है। जो फ़ैसले मायने रखते हैं, उनके लिए किसी योग्य पेशेवर से बात करना सही रहता है।',
        },
        {
          q: 'टूल में मेरे लिखे आंकड़ों का क्या होता है?',
          a: 'वे आपके डिवाइस पर ही रहते हैं और nidhi को नहीं भेजे जाते। मुफ़्त टूल आपके ब्राउज़र में हिसाब लगाते हैं और आप जो लिखते हैं उसे कभी पेज के पते में नहीं डालते। जब किसी टूल को बाहर का डेटा चाहिए, जैसे उस दिन की विनिमय दरें, तो आपका ब्राउज़र उस सेवा से सिर्फ़ दरें माँगता है, कभी आपकी राशियाँ नहीं; और हर अनुरोध की तरह यह उस सेवा को आपका IP पता दिखा देता है। ब्यौरा प्राइवेसी पेज पर है।',
        },
        {
          q: 'प्लानर क्या है, और मैं इसे कब इस्तेमाल कर पाऊँगा?',
          a: 'प्लानर सब कुछ एक जगह लाता है: जो आपके पास है, जो आप पर है, जो आप कमाते हैं और जो खर्च करने की उम्मीद है, सब दिखाई गई मान्यताओं के साथ आगे तक, ताकि फ़ैसला लेने से पहले आप उसकी तुलना कर सकें। यह चरणों में खुल रहा है। लिस्ट में शामिल हो जाइए और खुलते ही एक ईमेल मिलेगा।',
        },
      ],
      why: 'nidhi इसलिए शुरू हुआ कि एक व्यक्ति को ऐसा टूल नहीं मिला जो एक सामान्य वित्तीय जीवन में बैठे: पैसा एक से ज़्यादा देशों में, कर्ज़ किसी और में, और भविष्य जो सीमाओं के पार बना हो। इसलिए हम उसे बना रहे हैं, और साथ-साथ बताते जा रहे हैं कि रास्ते में क्या सीखते हैं।',
      trustLine: 'प्राग में बना। न विज्ञापन, न डेटा की बिक्री। पाठ अपने स्रोत बताते हैं।',
      trustBeliefs: 'हमारे सिद्धांत',
      trustEditorial: 'हम कैसे लिखते हैं',
      trustPrivacy: 'प्राइवेसी नीति',
    },
    /**
     * The level names, as a level is named on a card. Also still in
     * `LEVEL_LABELS` in src/utils/home/startingPoints.ts, which the blog
     * chrome reads; a test keeps the two in step until that one goes.
     */
    levels: {
      discovery: 'शुरुआत',
      building: 'बनाना',
      psychology: 'मनोविज्ञान',
      optimizing: 'अनुकूलन',
      mastery: 'निपुणता',
    },
    /**
     * The ways in, keyed by the `id` in `STARTING_POINTS`. Only `situation` is
     * on the page today: `audience` and `detail` are carried rather than shown,
     * because they are somebody's copy and dropping them belongs in its own
     * change, not in a translation.
     */
    startingPoints: {
      basics: {
        audience: 'नए हैं',
        situation: 'मैं बिल्कुल शुरुआत से चल रहा हूँ।',
        detail: 'आप जानते हैं कि अपने पैसे को बेहतर समझना चाहिए, पर यह नहीं कि कहाँ से शुरू करें। पहले वे विचार लीजिए जिन पर बाक़ी सब टिका है।',
      },
      'no-plan': {
        audience: 'कुछ अनुभव है',
        situation: 'कुछ बचत है, पर कोई योजना नहीं।',
        detail: 'पैसा जमा हो रहा है और तय नहीं कि उसे क्या करना चाहिए। समझिए कि बचत, निवेश और लक्ष्य, इनमें से हर एक किस काम का है।',
      },
      habits: {
        audience: 'सिद्धांत पता है',
        situation: 'जानता हूँ कि क्या करना है, पर हमेशा कर नहीं पाता।',
        detail: 'पैसे की ज़्यादातर ग़लतियाँ जानकारी की कमी से नहीं होतीं। देखिए कि ध्यान, आदत और भावना आपके फ़ैसलों को कैसे ढालते हैं।',
      },
      complex: {
        audience: 'तजुर्बा है',
        situation: 'मेरे वित्त जटिल हो गए हैं।',
        detail: 'अनुमान, क्या-अगर के परिदृश्य, कैश फ़्लो, शुल्क और कर: वही विचार, बस ज़्यादा चलती हुई चीज़ों के साथ।',
      },
    },
    /** The tool cards, keyed by `TOOLS` in src/utils/home/startingPoints.ts. */
    toolCards: {
      netWorth: { name: 'शुद्ध संपत्ति कैलकुलेटर', desc: 'एक मुद्रा में या कई में।' },
      loanComparison: { name: 'लोन की तुलना', desc: 'उधार के प्रस्ताव, आमने-सामने।' },
      monteCarlo: { name: 'मोंटे कार्लो सिम्युलेटर', desc: 'एक रेखा नहीं, नतीजों की एक पूरी रेंज।' },
    },
  },
};
