/**
 * The How-to section's own words (/how-to/ and the lines that lead to it), in
 * every language.
 *
 * The guides themselves are content, written once in English like the lessons
 * (src/content/guides/); only the hub and the links into it are copy. A module
 * of its own for the same reason as `learn.ts`: one file holds the section's
 * words in every language, and each language's catalog spreads its slice in.
 *
 * English first: every other language's object is typed as the English one.
 */

export const howToEn = {
  howTo: {
    /** The section's name: breadcrumbs, search result labels. */
    name: 'How-to',
    meta: {
      title: 'How-to: short answers to everyday money questions',
      description: 'Short guides that answer one money question each, in plain words: what the answer is, what to check, and where to read more. Free, no sign-up.',
    },
    crumbHome: 'Home',
    eyebrow: 'Short guides',
    h1: 'What do you need help with?',
    lede: 'Each guide answers one money question in a few minutes, in plain words. It starts with the answer, then shows what to check, and links to a longer lesson if you want to go deeper.',
    scope: 'The guides explain how to work something out or check it. They do not decide for you: what to do next depends on your country, your income and your contracts.',
    /** Hub groups, in the reader's words. Ids match `group` in src/content.config.ts. */
    groups: {
      month: 'Getting through the month',
      owe: 'I owe money',
      borders: 'Money across borders',
      safe: 'Is this safe?',
    } as Record<string, string>,
    /** `{n}` is a whole number of minutes. */
    readTime: '{n} min read',
    /** On a guide card outside English: the guide itself is in English. */
    inEnglish: 'Guide in English',
    empty: 'The first guides are on their way.',
    emptyLink: 'Browse the lessons in the meantime',
    schemaListName: 'How-to guides',
    /** The line at the top of /blog/; the page adds the arrow. */
    blogLine: 'Got one question?',
    blogLink: 'Short how-to guides',
    /** Under the "no lessons match" line of a search on /blog/ that matched nothing. */
    searchEmpty: 'Or a short how-to guide might answer it:',
    /** The label on a search result that is a guide rather than a lesson. */
    searchGuide: 'How-to',
    /** Under the home page's "Which sounds like you?". */
    homeLine: 'Just one question?',
    homeLink: 'Short how-to guides',
    /** On the volunteer page, for a visitor who came for help, not to help. */
    volunteerLine: 'Looking for help with your own money?',
    volunteerLink: 'Short how-to guides',
  },
};

export const howToHi: typeof howToEn = {
  howTo: {
    name: 'कैसे करें',
    meta: {
      title: 'कैसे करें: पैसों के रोज़ के सवालों के छोटे जवाब',
      description: 'छोटी गाइडें, जिनमें से हर एक पैसों से जुड़े एक सवाल का जवाब आसान शब्दों में देती है: जवाब क्या है, क्या जाँचना है, और आगे कहाँ पढ़ें। मुफ़्त, बिना साइन-अप।',
    },
    crumbHome: 'होम',
    eyebrow: 'छोटी गाइडें',
    h1: 'आपको किस बात में मदद चाहिए?',
    lede: 'हर गाइड पैसों से जुड़े एक सवाल का जवाब कुछ ही मिनटों में, आसान शब्दों में देती है। पहले जवाब आता है, फिर यह कि क्या जाँचना है, और अगर आप गहराई में जाना चाहें तो एक लंबे पाठ का लिंक।',
    scope: 'गाइडें बताती हैं कि कोई हिसाब कैसे लगाया जाए या कोई बात कैसे जाँची जाए। वे आपके लिए फ़ैसला नहीं करतीं: आगे क्या करना है, यह आपके देश, आपकी आमदनी और आपके अनुबंधों पर निर्भर करता है।',
    groups: {
      month: 'महीना कैसे निकले',
      owe: 'मुझ पर कर्ज़ है',
      borders: 'देशों के बीच पैसा',
      safe: 'क्या यह सुरक्षित है?',
    },
    readTime: '{n} मिनट में पढ़ें',
    inEnglish: 'गाइड अंग्रेज़ी में',
    empty: 'पहली गाइडें जल्द आ रही हैं।',
    emptyLink: 'तब तक पाठ देखें',
    schemaListName: 'कैसे करें: गाइडें',
    blogLine: 'बस एक सवाल है?',
    blogLink: 'कैसे करें: छोटी गाइडें',
    searchEmpty: 'या हो सकता है कोई छोटी गाइड इसका जवाब दे:',
    searchGuide: 'कैसे करें',
    homeLine: 'बस एक सवाल है?',
    homeLink: 'कैसे करें: छोटी गाइडें',
    volunteerLine: 'अपने पैसों से जुड़ी मदद चाहिए?',
    volunteerLink: 'कैसे करें: छोटी गाइडें',
  },
};

export const howToEs: typeof howToEn = {
  howTo: {
    name: 'Cómo hacerlo',
    meta: {
      title: 'Cómo hacerlo: respuestas breves a preguntas de dinero de cada día',
      description: 'Guías breves que responden a una pregunta de dinero cada una, con palabras sencillas: cuál es la respuesta, qué comprobar y dónde leer más. Gratis y sin registro.',
    },
    crumbHome: 'Inicio',
    eyebrow: 'Guías breves',
    h1: '¿Con qué necesitas ayuda?',
    lede: 'Cada guía responde a una pregunta de dinero en pocos minutos, con palabras sencillas. Empieza por la respuesta, luego muestra qué comprobar y enlaza con una lección más larga si quieres profundizar.',
    scope: 'Las guías explican cómo calcular o comprobar algo. No deciden por ti: qué hacer después depende de tu país, tus ingresos y tus contratos.',
    groups: {
      month: 'Llegar a fin de mes',
      owe: 'Tengo deudas',
      borders: 'Dinero entre países',
      safe: '¿Es seguro?',
    },
    readTime: '{n} min de lectura',
    inEnglish: 'Guía en inglés',
    empty: 'Las primeras guías están en camino.',
    emptyLink: 'Mientras tanto, explora las lecciones',
    schemaListName: 'Guías Cómo hacerlo',
    blogLine: '¿Tienes una sola pregunta?',
    blogLink: 'Guías breves Cómo hacerlo',
    searchEmpty: 'O quizá una guía breve lo responda:',
    searchGuide: 'Cómo hacerlo',
    homeLine: '¿Solo una pregunta?',
    homeLink: 'Guías breves Cómo hacerlo',
    volunteerLine: '¿Buscas ayuda con tu propio dinero?',
    volunteerLink: 'Guías breves Cómo hacerlo',
  },
};

export const howToCs: typeof howToEn = {
  howTo: {
    name: 'Jak na to',
    meta: {
      title: 'Jak na to: krátké odpovědi na běžné otázky o penězích',
      description: 'Krátké návody, z nichž každý odpovídá na jednu otázku o penězích jednoduchými slovy: jaká je odpověď, co si ověřit a kde číst dál. Zdarma a bez registrace.',
    },
    crumbHome: 'Úvod',
    eyebrow: 'Krátké návody',
    h1: 'S čím potřebujete pomoct?',
    lede: 'Každý návod odpoví na jednu otázku o penězích za pár minut, jednoduchými slovy. Začíná odpovědí, pak ukáže, co si ověřit, a odkáže na delší lekci, pokud chcete jít víc do hloubky.',
    scope: 'Návody vysvětlují, jak něco spočítat nebo ověřit. Nerozhodují za vás: co dál, záleží na vaší zemi, vašich příjmech a vašich smlouvách.',
    groups: {
      month: 'Jak vyjít do výplaty',
      owe: 'Mám dluhy',
      borders: 'Peníze přes hranice',
      safe: 'Je to bezpečné?',
    },
    readTime: '{n} min čtení',
    inEnglish: 'Návod v angličtině',
    empty: 'První návody se připravují.',
    emptyLink: 'Mezitím si projděte lekce',
    schemaListName: 'Návody Jak na to',
    blogLine: 'Máte jen jednu otázku?',
    blogLink: 'Krátké návody Jak na to',
    searchEmpty: 'Nebo možná odpoví krátký návod:',
    searchGuide: 'Jak na to',
    homeLine: 'Jen jedna otázka?',
    homeLink: 'Krátké návody Jak na to',
    volunteerLine: 'Hledáte pomoc s vlastními penězi?',
    volunteerLink: 'Krátké návody Jak na to',
  },
};

export const howToMr: typeof howToEn = {
  howTo: {
    name: 'कसे करायचे',
    meta: {
      title: 'कसे करायचे: पैशांच्या रोजच्या प्रश्नांची छोटी उत्तरे',
      description: 'छोट्या मार्गदर्शिका: प्रत्येक मार्गदर्शिका पैशांच्या एका प्रश्नाचे उत्तर सोप्या शब्दांत देते आणि काय तपासायचे, पुढे कुठे वाचायचे तेही सांगते. मोफत, नोंदणीशिवाय.',
    },
    crumbHome: 'मुख्यपृष्ठ',
    eyebrow: 'छोट्या मार्गदर्शिका',
    h1: 'तुम्हाला कशात मदत हवी आहे?',
    lede: 'प्रत्येक मार्गदर्शिका पैशांशी संबंधित एका प्रश्नाचे उत्तर काही मिनिटांत, सोप्या शब्दांत देते. आधी उत्तर येते, मग काय तपासायचे ते, आणि तुम्हाला खोलात जायचे असेल तर एका मोठ्या धड्याची लिंक.',
    scope: 'मार्गदर्शिका एखादा हिशोब कसा करायचा किंवा एखादी गोष्ट कशी तपासायची हे सांगतात. त्या तुमच्यासाठी निर्णय घेत नाहीत: पुढे काय करायचे हे तुमच्या देशावर, तुमच्या उत्पन्नावर आणि तुमच्या करारांवर अवलंबून असते.',
    groups: {
      month: 'महिना कसा निभवायचा',
      owe: 'माझ्यावर कर्ज आहे',
      borders: 'देशांदरम्यान पैसे',
      safe: 'हे सुरक्षित आहे का?',
    },
    readTime: '{n} मिनिटांचे वाचन',
    inEnglish: 'मार्गदर्शिका इंग्रजीत',
    empty: 'पहिल्या मार्गदर्शिका लवकरच येत आहेत.',
    emptyLink: 'तोपर्यंत धडे पाहा',
    schemaListName: 'कसे करायचे: मार्गदर्शिका',
    blogLine: 'फक्त एकच प्रश्न आहे?',
    blogLink: 'कसे करायचे: छोट्या मार्गदर्शिका',
    searchEmpty: 'किंवा कदाचित एखादी छोटी मार्गदर्शिका याचे उत्तर देईल:',
    searchGuide: 'कसे करायचे',
    homeLine: 'फक्त एकच प्रश्न?',
    homeLink: 'कसे करायचे: छोट्या मार्गदर्शिका',
    volunteerLine: 'स्वतःच्या पैशांबाबत मदत हवी आहे?',
    volunteerLink: 'कसे करायचे: छोट्या मार्गदर्शिका',
  },
};
