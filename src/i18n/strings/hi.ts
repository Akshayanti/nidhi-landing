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
};
