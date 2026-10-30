/**
 * "What's changed": the changes a reader could notice, grouped by day, newest
 * first.
 *
 * One item per change a reader experiences, not per pull request (CLAUDE.md,
 * "What's Changed Grows With Every Visible Change"). A follow-up the same day
 * edits that day's item instead of adding one; a later day adds an item only
 * when a reader would notice something new. Every item is in all five
 * languages, in the founder's voice, plainly, and never gives the founder a
 * gender: Hindi and Marathi use dative, ergative or impersonal sentences,
 * Czech the present tense or a participle that agrees with something else.
 *
 * Each language follows its glossary in docs/i18n/, and the rules the catalogs
 * follow (Czech no-break spaces after one-letter words, Marathi no-break space
 * between a Latin word and the case word after it). changes.test.ts checks the
 * mechanical ones.
 */
import type { Locale } from '../config.ts';

export interface ChangeItem {
  /**
   * A short, permanent name for the change: its anchor on /changes/ and its
   * address (guid) in the feeds. Set once and never changed or reused, even if
   * the wording is.
   */
  id: string;
  /**
   * Ids of items merged into this one. They stay anchors on the page, so a
   * link to a merged item still lands here, and are never reused.
   */
  aliases?: string[];
  text: Record<Locale, string>;
}

export interface ChangeDay {
  /** The day it shipped, as YYYY-MM-DD in UTC. At most one day per date. */
  date: string;
  items: ChangeItem[];
}

export const CHANGE_DAYS: ChangeDay[] = [
  {
    date: '2026-10-30',
    items: [
      {
        id: 'volunteer-permission',
        text: {
          en: 'If you volunteer to translate, I now ask for your written permission by email before your first contribution, so your work can be published while the copyright stays yours. The privacy notice says what is kept from your reply and for how long.',
          es: 'Si te ofreces para traducir, ahora pido tu permiso por escrito, por correo, antes de tu primera aportación, para poder publicar tu trabajo sin que dejes de tener sus derechos de autor. El aviso de privacidad explica qué se guarda de tu respuesta y durante cuánto tiempo.',
          cs: 'Pokud se přihlásíte k překládání, žádám teď před vaším prvním příspěvkem e-mailem o písemné svolení, aby vaše práce mohla vyjít a autorská práva k ní zůstala vám. V oznámení o ochraně soukromí je uvedeno, co se z vaší odpovědi uchovává a jak dlouho.',
          mr: 'तुम्ही भाषांतरासाठी स्वयंसेवक झालात, तर पहिल्या योगदानाआधी आता ईमेलवर तुमची लेखी परवानगी मागितली जाते, म्हणजे तुमचे काम प्रकाशित करता येईल आणि त्याचा कॉपीराइट तुमच्याकडेच राहील. तुमच्या उत्तरातून काय आणि किती काळ ठेवले जाते, हे प्रायव्हसी नोटिसमध्ये सांगितले आहे.',
          hi: 'अगर आप अनुवाद के लिए स्वयंसेवक बनें, तो पहले योगदान से पहले अब ईमेल पर आपकी लिखित अनुमति माँगी जाती है, ताकि आपका काम प्रकाशित हो सके और उसका कॉपीराइट आपके पास ही रहे। आपके जवाब में से क्या और कितने समय तक रखा जाता है, यह प्राइवेसी नोटिस में बताया गया है।',
        },
      },
    ],
  },
  {
    date: '2026-10-29',
    items: [
      {
        id: 'planner-beta-page',
        text: {
          en: "A new page explains the planner beta: it's free and planned to open in January 2027. Beta testers get the paid features free for 12 months after launch, then a founding price, billed yearly, locked for as long as they stay subscribed. The site menu and the planner section on the home page link to it, and so does the waitlist box, which now also sits at the end of every lesson. On tablets, Free tools and Learn have moved into the menu.",
          es: "Una página nueva explica la beta del planificador: es gratuita y está previsto que se abra en enero de 2027. Quienes la prueben reciben las funciones de pago gratis durante 12 meses tras el lanzamiento y, después, un precio de fundador, con facturación anual, fijo mientras mantengan la suscripción. El menú del sitio y la sección del planificador en la página de inicio enlazan a ella, igual que el recuadro de la lista de espera, que ahora aparece también al final de cada lección. En tabletas, Herramientas gratuitas y Aprende han pasado al menú.",
          cs: "Nová stránka vysvětluje betu plánovače: je zdarma a otevřít se má v lednu 2027. Kdo se do ní zapojí, má placené funkce 12 měsíců po spuštění zdarma a potom zakladatelskou cenu s ročním účtováním, pevnou po celou dobu, kdy předplatné trvá. Odkazují na ni nabídka webu, sekce o plánovači na úvodní stránce i rámeček s čekací listinou, který je teď i na konci každé lekce. Na tabletech se Nástroje zdarma a Lekce přesunuly do nabídky.",
          mr: "एक नवीन पान प्लॅनर बीटाबद्दल सांगते: तो मोफत आहे आणि जानेवारी 2027 मध्ये तो सुरू करण्याचे नियोजन आहे. बीटा टेस्टर्सना लाँचनंतर 12 महिने पेड फीचर्स मोफत मिळतील, त्यानंतर सुरुवातीच्या सदस्यांची किंमत, वार्षिक बिलिंगवर, सदस्यत्व चालू असेपर्यंत निश्चित. साइटच्या मेनूमधून, मुख्य पानावरील प्लॅनरच्या भागातून आणि प्रतीक्षा यादीच्या चौकटीतून त्याची लिंक आहे, आणि ही चौकट आता प्रत्येक धड्याच्या शेवटीही आहे. टॅबलेटवर मोफत साधने आणि शिका आता मेनूमध्ये आहेत.",
          hi: "एक नया पेज प्लानर बीटा के बारे में बताता है: यह मुफ़्त है और इसे जनवरी 2027 में खोलने की योजना है। बीटा टेस्टर्स को लॉन्च के बाद 12 महीने तक पेड फ़ीचर्स मुफ़्त मिलेंगे, फिर शुरुआती सदस्यों की दर, सालाना बिलिंग पर, जो सब्सक्रिप्शन चालू रहने तक तय रहेगी। साइट के मेन्यू, होम पेज पर प्लानर वाले हिस्से और वेटलिस्ट बॉक्स, तीनों से इसका लिंक है, और यह बॉक्स अब हर पाठ के आख़िर में भी है। टैबलेट पर मुफ़्त टूल और सीखें अब मेन्यू में हैं।",
        },
      },
      {
        id: 'inclusive-collection',
        text: {
          en: 'Inclusive Finances is now a collection: on the home page it comes after the starting routes, and on the learning path after the levels. Its description now says who it is for and where its guides sit: each one is optional and comes right after the lesson it builds on. The lesson count on the home page now counts lessons only.',
          es: 'Finanzas inclusivas es ahora una colección: en la página de inicio aparece después de los puntos de partida y, en la ruta de aprendizaje, después de los niveles. Su descripción dice ahora para quién es y dónde están sus guías: cada una es opcional y va justo después de la lección en la que se apoya. El número de lecciones de la página de inicio cuenta ahora solo las lecciones.',
          cs: 'Inkluzivní finance jsou teď sbírka: na úvodní stránce následují po výchozích cestách a ve vzdělávací cestě po úrovních. Jejich popis teď říká, pro koho jsou a kde se jejich průvodci nacházejí: každý je volitelný a následuje hned po lekci, na kterou navazuje. Počet lekcí na úvodní stránce teď zahrnuje jen lekce.',
          mr: 'सर्वसमावेशक वित्त आता एक संग्रह आहे: मुख्य पानावर ते सुरुवातीच्या मार्गांनंतर येते, आणि शिकण्याच्या मार्गावर पातळ्यांनंतर. त्याचे वर्णन आता सांगते की ते कोणासाठी आहे आणि त्याच्या मार्गदर्शिका कुठे आहेत: प्रत्येक मार्गदर्शिका ऐच्छिक आहे आणि ती ज्या धड्यावर आधारित आहे त्या धड्यानंतर लगेच येते. मुख्य पानावरील धड्यांच्या संख्येत आता फक्त धडे मोजले जातात.',
          hi: 'सबके लिए वित्त अब एक संग्रह है: होम पेज पर यह शुरुआती रास्तों के बाद आता है, और सीखने के रास्ते पर स्तरों के बाद। इसका विवरण अब बताता है कि यह किनके लिए है और इसकी मार्गदर्शिकाएँ कहाँ हैं: हर मार्गदर्शिका वैकल्पिक है और उस पाठ के ठीक बाद आती है जिस पर वह आधारित है। होम पेज पर पाठों की संख्या में अब सिर्फ़ पाठ गिने जाते हैं।',
        },
      },
    ],
  },
  {
    date: '2026-10-28',
    items: [
      {
        id: 'tool-results-copy',
        text: {
          en: 'Every free tool now has a box right under its result where you can copy a link, download a spreadsheet that opens in Excel, LibreOffice or Google Sheets, or make a short PDF report of your results. The files are made in your browser, so your figures still never reach me.',
          es: 'Cada herramienta gratuita tiene ahora, justo debajo del resultado, un recuadro para copiar un enlace para compartir, descargar una hoja de cálculo que se abre en Excel, LibreOffice o Google Sheets, o crear un informe breve en PDF con tus resultados. Los archivos se crean en tu navegador, así que tus cifras siguen sin llegarme.',
          cs: 'Každý nástroj zdarma má teď hned pod výsledkem rámeček, kde můžete zkopírovat odkaz ke sdílení, stáhnout tabulku, která se otevře v Excelu, LibreOffice nebo Google Sheets, nebo vytvořit krátkou zprávu v PDF s vašimi výsledky. Soubory vznikají ve vašem prohlížeči, takže se vaše čísla ke mně nikdy nedostanou.',
          mr: 'प्रत्येक मोफत साधनात आता निकालाच्या अगदी खाली एक चौकट आहे: तिथे शेअर लिंक कॉपी करता येते, Excel, LibreOffice किंवा Google Sheets मध्ये उघडणारी स्प्रेडशीट डाउनलोड करता येते, किंवा तुमच्या निकालांचा छोटा PDF अहवाल तयार करता येतो. फाइल्स तुमच्या ब्राउझरमध्येच तयार होतात, त्यामुळे तुमचे आकडे माझ्यापर्यंत कधीच पोहोचत नाहीत.',
          hi: 'हर मुफ़्त टूल में अब नतीजे के ठीक नीचे एक बॉक्स है: वहाँ से शेयर लिंक कॉपी कर सकते हैं, Excel, LibreOffice या Google Sheets में खुलने वाली स्प्रेडशीट डाउनलोड कर सकते हैं, या अपने नतीजों की छोटी PDF रिपोर्ट बना सकते हैं। फ़ाइलें आपके ब्राउज़र में ही बनती हैं, इसलिए आपके आँकड़े अब भी मुझ तक कभी नहीं पहुँचते।',
        },
      },
      {
        id: 'click-data-labels-only',
        text: {
          en: 'I found that, for visitors who had accepted the cookie banner, a click on the loan comparison could carry an offer’s name or a chart’s amounts along with it. A check of every click recorded since October 8 found none that did. Even so, it is fixed: a click is now recorded only by the label the site gives a button, and the privacy notice says what happened.',
          es: 'Descubrí que, para quienes habían aceptado el aviso de cookies, un clic en el comparador de préstamos podía llevar consigo el nombre de una oferta o los importes de un gráfico. Revisé todos los clics registrados desde el 8 de octubre y ninguno lo hizo. Aun así, ya está corregido: ahora un clic se registra solo con la etiqueta que el sitio da a cada botón, y el aviso de privacidad explica lo que pasó.',
          cs: 'Došlo mi, že u návštěvníků, kteří přijali lištu s cookies, se spolu s kliknutím ve srovnání úvěrů mohl odeslat název nabídky nebo částky z grafu. Kontrola všech kliknutí zaznamenaných od 8. října nenašla ani jeden takový případ. Přesto je to opraveno: kliknutí se teď zaznamenává pouze pod označením, které web přiřadil tlačítku, a zásady ochrany soukromí popisují, co se stalo.',
          mr: 'मला आढळले की कुकी बॅनर स्वीकारलेल्या भेट देणाऱ्यांसाठी, कर्जांच्या तुलनेवर केलेल्या क्लिकसोबत एखाद्या ऑफरचे नाव किंवा आलेखातील रकमा जाऊ शकत होत्या. 8 ऑक्टोबरपासून नोंदलेले सगळे क्लिक तपासले, आणि त्यांपैकी एकाही क्लिकसोबत असे काही गेले नव्हते. तरीही हे दुरुस्त केले आहे: आता क्लिकची नोंद फक्त साइटने बटणाला दिलेल्या लेबलने होते, आणि गोपनीयता सूचनेत काय घडले ते सांगितले आहे.',
          hi: 'मुझे पता चला कि जिन्होंने कुकी बैनर स्वीकार किया था, उनके लिए लोन तुलना पर किए गए क्लिक के साथ किसी ऑफ़र का नाम या चार्ट की रकमें जैसी जानकारी भी जा सकती थी। मैंने 8 अक्टूबर से दर्ज सभी क्लिक जाँचे, और किसी के साथ ऐसा कुछ नहीं गया था। फिर भी मैंने इसे ठीक कर दिया है: अब क्लिक सिर्फ़ उस लेबल से दर्ज होता है जो साइट किसी बटन को देती है, और प्राइवेसी नोटिस बताता है कि क्या हुआ।',
        },
      },
      {
        id: 'lessons-more-countries',
        text: {
          en: 'Seven lessons already published, from financial projections to shared households, now have notes on how things work in more countries, such as Japan, Brazil, Indonesia and the Philippines.',
          es: 'Siete lecciones ya publicadas, desde las proyecciones financieras hasta los hogares compartidos, tienen ahora notas sobre cómo funcionan las cosas en más países, como Japón, Brasil, Indonesia y Filipinas.',
          cs: 'Sedm už zveřejněných lekcí, od finančních projekcí po sdílené domácnosti, teď obsahuje poznámky o tom, jak věci fungují ve více zemích, například v Japonsku, Brazílii, Indonésii a na Filipínách.',
          mr: 'आधीच प्रकाशित झालेल्या सात धड्यांमध्ये, आर्थिक अंदाजांपासून सामायिक घरांपर्यंत, आता जपान, ब्राझील, इंडोनेशिया आणि फिलिपिन्स यांसारख्या आणखी देशांमध्ये गोष्टी कशा चालतात याच्या नोंदी आहेत.',
          hi: 'पहले से प्रकाशित सात पाठों में, वित्तीय अनुमानों से लेकर साझा घरों तक, अब यह भी लिखा है कि जापान, ब्राज़ील, इंडोनेशिया और फ़िलीपींस जैसे और देशों में चीज़ें कैसे काम करती हैं।',
        },
      },
      {
        id: 'ai-assistant-visits',
        text: {
          en: 'The analytics that note when a visit comes from an AI assistant or tool now recognise more of them, such as Mistral Vibe, Meta AI, NotebookLM, Duck.ai, Poe, Qwen Chat and Kimi. No new kind of information is recorded, and the privacy notice lists them all.',
          es: 'La analítica que registra las visitas que llegan desde un asistente o una herramienta de IA ahora reconoce más, como Mistral Vibe, Meta AI, NotebookLM, Duck.ai, Poe, Qwen Chat y Kimi. No se registra ningún tipo de información nuevo, y el aviso de privacidad los enumera todos.',
          cs: 'Webová analytika, která zaznamenává návštěvy přicházející z AI asistenta nebo nástroje, teď rozpoznává více z nich, například Mistral Vibe, Meta AI, NotebookLM, Duck.ai, Poe, Qwen Chat a Kimi. Nezaznamenává se žádný nový druh údajů a zásady ochrany soukromí je všechny vyjmenovávají.',
          mr: 'भेट AI सहाय्यकाकडून किंवा साधनाकडून आली आहे हे नोंदवणारे वापराचे विश्लेषण (analytics) आता त्यांपैकी आणखी काही ओळखते, जसे Mistral Vibe, Meta AI, NotebookLM, Duck.ai, Poe, Qwen Chat आणि Kimi. कोणत्याही नव्या प्रकारची माहिती नोंदवली जात नाही, आणि गोपनीयता सूचनेत त्या सर्वांची नावे आहेत.',
          hi: 'जो एनालिटिक्स यह दर्ज करता है कि कोई विज़िट किसी AI असिस्टेंट या टूल से आई है, वह अब इनमें से और भी कई को पहचानता है, जैसे Mistral Vibe, Meta AI, NotebookLM, Duck.ai, Poe, Qwen Chat और Kimi। किसी भी नई तरह की जानकारी दर्ज नहीं होती, और प्राइवेसी नोटिस में इन सबके नाम हैं।',
        },
      },
    ],
  },
  {
    date: '2026-10-25',
    items: [
      {
        id: 'glossary-terms-in-place',
        text: {
          en: 'Words from a lesson’s glossary now show their meaning right where you read them: hover over one or reach it with the keyboard on a computer, or tap it on a phone. A small question mark beside each one sets it apart from links to other pages.',
          es: 'Las palabras del glosario de una lección ahora muestran su significado justo donde las lees: en el ordenador, al pasar el ratón por encima o al llegar a ellas con el teclado; en el móvil, al tocarlas. Un pequeño signo de interrogación junto a cada una las distingue de los enlaces a otras páginas.',
          cs: 'Slova ze slovníčku pojmů lekce teď ukazují svůj význam přímo tam, kde je čtete: na počítači po najetí myší nebo když na ně přejdete klávesnicí, na telefonu klepnutím. Malý otazník u každého z nich je odlišuje od odkazů na jiné stránky.',
          mr: 'धड्याच्या शब्दसूचीतील शब्द आता तुम्ही वाचत असलेल्या ठिकाणीच त्यांचा अर्थ दाखवतात: संगणकावर त्यांच्यावर माउस नेल्यावर किंवा कीबोर्डने तिथे पोहोचल्यावर, आणि फोनवर त्यांना स्पर्श केल्यावर. प्रत्येक शब्दाशेजारी असलेले छोटे प्रश्नचिन्ह त्याला इतर पानांच्या लिंकपेक्षा वेगळे दाखवते.',
          hi: 'पाठ की शब्दावली के शब्द अब वहीं अपना अर्थ दिखाते हैं जहाँ आप उन्हें पढ़ रहे हैं: कंप्यूटर पर उन पर माउस ले जाने या कीबोर्ड से वहाँ पहुँचने पर, और फ़ोन पर उन्हें छूने पर। हर शब्द के पास एक छोटा प्रश्नचिह्न उसे दूसरे पेजों के लिंक से अलग पहचान देता है।',
        },
      },
    ],
  },
  {
    date: '2026-10-23',
    items: [
      {
        id: 'volunteer-translators',
        text: {
          en: 'I added a volunteers page for native or near native speakers who want to improve nidhi’s translations, help translate the lessons, or hear from me when their language opens. The home page and the footer point to it, and the privacy notice says what its form collects and how long it is kept.',
          es: 'He añadido una página de voluntariado para quien hable un idioma de forma nativa o casi nativa y quiera mejorar las traducciones de nidhi, ayudar a traducir las lecciones o saber cuándo se abre su idioma. La página de inicio y el pie de página llevan a ella, y el aviso de privacidad explica qué recoge su formulario y cuánto tiempo se guarda.',
          cs: 'Přibyla stránka pro dobrovolnou pomoc pro ty, kdo jazyk ovládají jako rodný nebo skoro stejně dobře a chtějí zlepšit překlady nidhi, pomoct s překladem lekcí nebo dostat zprávu, až se jejich jazyk otevře. Odkazuje na ni úvodní stránka i patička a zásady ochrany soukromí uvádějí, co její formulář sbírá a jak dlouho se to uchovává.',
          mr: 'भाषा मातृभाषेसारखी येणाऱ्या आणि nidhi ची भाषांतरे सुधारायला, धड्यांचे भाषांतर करायला मदत करायला, किंवा आपली भाषा सुरू झाल्यावर कळवले जावे असे वाटणाऱ्या लोकांसाठी आता स्वयंसेवकांचे पान आहे. मुख्य पान आणि तळटीप त्याकडे नेतात, आणि त्याचा फॉर्म काय गोळा करतो व ते किती काळ साठवले जाते ते गोपनीयता सूचनेत लिहिले आहे.',
          hi: 'अब उन लोगों के लिए एक स्वयंसेवक (volunteer) पेज है जो किसी भाषा को मातृभाषा की तरह या लगभग उतनी ही अच्छी तरह जानते हैं और nidhi के अनुवाद सुधारना, पाठों के अनुवाद में मदद करना, या अपनी भाषा शुरू होने पर ख़बर पाना चाहते हैं। होम पेज और फ़ुटर उस तक ले जाते हैं, और उसका फ़ॉर्म क्या लेता है और उसे कितने समय तक रखा जाता है, यह प्राइवेसी नोटिस में लिखा है।',
        },
      },
    ],
  },
  {
    date: '2026-10-22',
    items: [
      {
        id: 'newsletter-total',
        text: {
          en: 'The newsletter box now shows how many readers get new lessons by email, rounded down in steps of 20, once there are 20. It never shows anything about any one person.',
          hi: 'न्यूज़लेटर बॉक्स अब दिखाता है कि कितने पाठक नए पाठ ईमेल से पाते हैं, 20 पाठक होने के बाद, 20-20 के अंतर पर नीचे की ओर पूर्णांकित करके। यह किसी एक व्यक्ति के बारे में कभी कुछ नहीं दिखाता।',
          es: 'El recuadro del boletín muestra ahora cuántos lectores reciben las lecciones nuevas por correo, a partir de 20, con el total redondeado a la baja de 20 en 20. Nunca muestra nada sobre una persona concreta.',
          cs: 'Rámeček s newsletterem teď od 20 odběratelů ukazuje, kolik čtenářů dostává nové lekce e-mailem, zaokrouhleno dolů po dvacítkách. Nikdy neukazuje nic o konkrétním člověku.',
          mr: 'न्यूजलेटर बॉक्स आता 20 वाचक झाल्यावर किती वाचक नवे धडे ईमेलवर मिळवतात ते दाखवतो, 20-20 च्या टप्प्यांत खालच्या बाजूला पूर्णांक करून. तो कोणत्याही एका व्यक्तीबद्दल कधीच काही दाखवत नाही.',
        },
      },
      {
        id: 'changes-by-day',
        aliases: ['changes-dated-lines'],
        text: {
          en: 'This page now groups changes by day, and folds older months so the latest stay easy to find.',
          hi: 'यह पेज अब बदलावों को दिन के हिसाब से दिखाता है, और पुराने महीने समेटकर रखता है, ताकि नए बदलाव आसानी से मिलें।',
          es: 'Esta página agrupa ahora los cambios por día y pliega los meses anteriores, para que los más recientes se encuentren fácilmente.',
          cs: 'Tato stránka teď řadí změny podle dnů a starší měsíce sbaluje, aby ty nejnovější šly snadno najít.',
          mr: 'हे पान आता बदल दिवसानुसार दाखवते आणि जुने महिने घडी करून ठेवते, म्हणजे नवे बदल सहज सापडतात.',
        },
      },
      {
        id: 'waitlist-total-from-20',
        aliases: ['waitlist-total-notice'],
        text: {
          en: 'The waitlist box now shows how many people have joined, rounded down in steps of 20, once there are 20. It never shows anything about any one person, and the privacy notice says so.',
          hi: 'वेटलिस्ट बॉक्स अब दिखाता है कि कितने लोग जुड़ चुके हैं, 20 लोग होने के बाद, 20-20 के अंतर पर नीचे की ओर पूर्णांकित करके। यह किसी एक व्यक्ति के बारे में कभी कुछ नहीं दिखाता, और प्राइवेसी नोटिस में यह लिखा है।',
          es: 'La lista de espera muestra ahora cuántas personas se han apuntado, a partir de 20, con el total redondeado a la baja de 20 en 20. Nunca muestra nada sobre una persona concreta, y el aviso de privacidad lo dice.',
          cs: 'Čekací listina teď od 20 registrací ukazuje, kolik lidí se přihlásilo, zaokrouhleno dolů po dvacítkách. Nikdy neukazuje nic o konkrétním člověku a zásady ochrany soukromí to uvádějí.',
          mr: 'प्रतीक्षा यादीचा बॉक्स आता 20 नोंदणी झाल्यावर किती लोक सामील झाले ते दाखवतो, 20-20 च्या टप्प्यांत खालच्या बाजूला पूर्णांक करून. तो कोणत्याही एका व्यक्तीबद्दल कधीच काही दाखवत नाही, आणि गोपनीयता सूचनेत तसे लिहिले आहे.',
        },
      },
      {
        id: 'changes-rss',
        text: {
          en: 'You can follow this page by RSS now, in your own language.',
          hi: 'अब आप इस पेज को RSS से, अपनी भाषा में फ़ॉलो कर सकते हैं।',
          es: 'Ahora puedes seguir esta página por RSS, en tu idioma.',
          cs: 'Tuto stránku teď můžete sledovat přes RSS, ve svém jazyce.',
          mr: 'आता तुम्ही हे पान RSS द्वारे, तुमच्या भाषेत फॉलो करू शकता.',
        },
      },
      {
        id: 'about-sources-count',
        text: {
          en: 'The About page now says how many distinct sources the lessons point to, counted from the lessons themselves.',
          hi: '"nidhi के बारे में" पेज पर अब लिखा है कि पाठ कितने अलग-अलग स्रोतों की ओर ले जाते हैं, और यह गिनती सीधे पाठों से होती है।',
          es: 'La página Sobre nidhi indica ahora a cuántas fuentes distintas remiten las lecciones, contadas a partir de las propias lecciones.',
          cs: 'Stránka O nidhi teď uvádí, na kolik různých zdrojů lekce odkazují, spočítáno přímo z lekcí.',
          mr: '“nidhi विषयी” पानावर आता लिहिले आहे की धडे किती वेगवेगळ्या स्रोतांकडे नेतात, आणि ही संख्या थेट धड्यांमधून मोजली जाते.',
        },
      },
      {
        id: 'mastery-not-yet-available',
        aliases: ['mastery-in-progress'],
        text: {
          en: 'The Mastery level now says "Not yet available" instead of "Being written", which is more honest: its lessons are not out yet.',
          hi: 'निपुणता वाले स्तर पर अब "लिखा जा रहा है" की जगह "अभी उपलब्ध नहीं" लिखा है, जो ज़्यादा सच्चा है: इसके पाठ अभी प्रकाशित नहीं हुए हैं।',
          es: 'El nivel Dominio dice ahora «Aún no disponible» en vez de «En preparación», que es más honesto: sus lecciones todavía no están publicadas.',
          cs: 'Úroveň Mistrovství teď místo „Připravuje se“ ukazuje „Zatím není k dispozici“, což je poctivější: její lekce zatím nevyšly.',
          mr: 'प्रभुत्व स्तरावर आता “लिहिले जात आहे” ऐवजी “अजून उपलब्ध नाही” असे लिहिले आहे, जे जास्त प्रामाणिक आहे: त्याचे धडे अजून प्रसिद्ध झालेले नाहीत.',
        },
      },
      {
        id: 'tools-same-waitlist',
        aliases: ['loan-inflation-waitlist'],
        text: {
          en: 'All four free tools now have the planner waitlist box, and all ask the same way, each with one line on what the planner adds.',
          hi: 'चारों मुफ़्त टूल पर अब प्लानर की वेटलिस्ट है, और चारों टूल एक ही तरह से पूछते हैं, हर एक के साथ एक पंक्ति कि प्लानर उसमें क्या जोड़ता है।',
          es: 'Las cuatro herramientas gratuitas tienen ahora la lista de espera del planificador, y todas la ofrecen igual, cada una con una línea sobre lo que el planificador añade.',
          cs: 'Všechny čtyři bezplatné nástroje teď mají čekací listinu na plánovač a všechny ji nabízejí stejně, každý s jednou větou o tom, co plánovač přidá.',
          mr: 'चारही मोफत साधनांवर आता प्लॅनरची प्रतीक्षा यादी आहे, आणि चारही साधने ती एकाच पद्धतीने दाखवतात, प्रत्येकासोबत प्लॅनर काय भर घालतो याची एक ओळ.',
        },
      },
      {
        id: 'home-one-lesson-count',
        text: {
          en: 'The home page now gives one lesson count, at the top and in the FAQ alike. The two had disagreed by one.',
          hi: 'होम पेज पर अब पाठों की एक ही गिनती है, ऊपर भी और अक्सर पूछे जाने वाले सवालों में भी। पहले दोनों जगह एक का फ़र्क था।',
          es: 'La página de inicio da ahora un solo número de lecciones, arriba y en las preguntas frecuentes. Antes los dos diferían en una.',
          cs: 'Úvodní stránka teď uvádí jeden počet lekcí, nahoře i v častých otázkách. Předtím se ta dvě čísla lišila o jednu.',
          mr: 'मुख्यपृष्ठावर आता धड्यांची एकच संख्या आहे, वरच्या भागात आणि नेहमीच्या प्रश्नांमध्येही. आधी या दोन्हींमध्ये एकाचा फरक होता.',
        },
      },
      {
        id: 'changes-page',
        text: {
          en: "There's now this page: a short list of what changed on the site, newest first.",
          hi: 'अब यह पेज है: साइट पर क्या बदला, उसकी एक छोटी सूची, सबसे नया सबसे ऊपर।',
          es: 'Ahora existe esta página: una lista breve de lo que ha cambiado en el sitio, lo más reciente primero.',
          cs: 'Teď existuje tahle stránka: krátký seznam toho, co se na webu změnilo, od nejnovějšího.',
          mr: 'आता हे पान आहे: साइटवर काय बदलले त्याची छोटी यादी, सगळ्यात नवीन सगळ्यात वर.',
        },
      },
      {
        id: 'founder-voice',
        text: {
          en: 'The beliefs page and my story are in my own voice now. They say "I", because it is one person: me.',
          hi: 'सिद्धांतों वाला पेज और मेरी कहानी अब मेरी अपनी आवाज़ में हैं। इनमें "मैं" लिखा है, क्योंकि इसके पीछे एक ही व्यक्ति है: मैं।',
          es: 'La página de principios y mi historia ya están con mi propia voz. Dicen «yo», porque es una sola persona: yo.',
          cs: 'Stránka o tom, čemu věřím, i můj příběh teď mluví mým vlastním hlasem. Píšou „já“, protože za tím stojí jeden člověk: já.',
          mr: 'तत्त्वांचे पान आणि माझी गोष्ट आता माझ्याच आवाजात आहेत. त्यांत “मी” लिहिले आहे, कारण यामागे एकच व्यक्ती आहे: मी.',
        },
      },
      {
        id: 'corrections-shown',
        text: {
          en: 'When I correct a lesson, the fix is now shown at the top of that lesson and listed on the editorial policy page.',
          hi: 'जब किसी पाठ में सुधार होता है, तो वह अब उसी पाठ में सबसे ऊपर दिखता है और संपादकीय नीति वाले पेज पर भी दर्ज होता है।',
          es: 'Cuando corrijo una lección, la corrección aparece ahora al principio de esa lección y en la lista de la página de política editorial.',
          cs: 'Když opravím lekci, oprava se teď ukáže nahoře v té lekci a objeví se i v seznamu na stránce redakčních zásad.',
          mr: 'एखाद्या धड्यात दुरुस्ती झाली की ती आता त्या धड्याच्या सुरुवातीला दिसते आणि संपादकीय धोरणाच्या पानावरच्या यादीतही येते.',
        },
      },
      {
        id: 'about-ai-use',
        text: {
          en: 'The About page now says how AI tools are used here: they help research, draft and check, and I read and approve every lesson before it goes out.',
          hi: '"nidhi के बारे में" पेज पर अब लिखा है कि यहाँ AI टूल किस काम आते हैं: रिसर्च, मसौदे और जाँच में मदद, और हर पाठ मेरे पढ़ने और मंज़ूर करने के बाद ही प्रकाशित होता है।',
          es: 'La página Sobre nidhi explica ahora cómo se usan aquí las herramientas de IA: ayudan a investigar, redactar y revisar, y leo y apruebo cada lección antes de publicarla.',
          cs: 'Stránka O nidhi teď popisuje, k čemu tu slouží nástroje AI: pomáhají zkoumat, psát a kontrolovat, a každou lekci před zveřejněním čtu a schvaluji.',
          mr: '“nidhi विषयी” पानावर आता लिहिले आहे की इथे AI साधने कशासाठी वापरली जातात: संशोधन, मसुदा आणि तपासणीसाठी मदत, आणि प्रत्येक धडा प्रसिद्ध होण्यापूर्वी माझ्याकडून वाचून मंजूर होतो.',
        },
      },
      {
        id: 'home-free-and-private',
        text: {
          en: 'The home page now says what free and private mean, right under the buttons: no account, no ads, and what you type in the tools stays on your device.',
          hi: 'होम पेज पर बटनों के ठीक नीचे अब साफ़ लिखा है कि मुफ़्त और निजी का मतलब क्या है: न अकाउंट, न विज्ञापन, और टूल में आप जो लिखते हैं, वह आपके ही डिवाइस पर रहता है।',
          es: 'La página de inicio explica ahora, justo debajo de los botones, qué significan gratis y privado: sin cuenta, sin anuncios, y lo que escribes en las herramientas se queda en tu dispositivo.',
          cs: 'Úvodní stránka teď hned pod tlačítky říká, co znamená zdarma a soukromě: bez účtu, bez reklam a to, co zadáte do nástrojů, zůstává ve vašem zařízení.',
          mr: 'मुख्यपृष्ठावर बटणांच्या अगदी खाली आता लिहिले आहे की मोफत आणि खासगी म्हणजे काय: खाते नाही, जाहिराती नाहीत, आणि साधनांमध्ये तुम्ही जे लिहिता ते तुमच्या डिव्हाइसवरच राहते.',
        },
      },
      {
        id: 'home-inclusive-route-first',
        text: {
          en: "The lesson routes on the home page now start with the one for lives the standard plan doesn't fit.",
          hi: 'होम पेज पर पाठों के रास्ते अब उस रास्ते से शुरू होते हैं जो उन ज़िंदगियों के लिए है जिनमें मानक योजना नहीं बैठती।',
          es: 'Las rutas de lecciones de la página de inicio empiezan ahora por la de las vidas que no encajan con el plan estándar.',
          cs: 'Cesty k lekcím na úvodní stránce teď začínají tou pro životy, na které standardní plán nesedí.',
          mr: 'मुख्यपृष्ठावरचे धड्यांचे मार्ग आता सर्वसाधारण योजना ज्या आयुष्यांना बसत नाही, त्यांच्यासाठीच्या मार्गाने सुरू होतात.',
        },
      },
      {
        id: 'home-phone-card',
        text: {
          en: 'On phones, the card at the top of the home page is simpler now: just the three steps.',
          hi: 'फ़ोन पर होम पेज के ऊपर वाला कार्ड अब सादा है: बस तीन कदम।',
          es: 'En el móvil, la tarjeta de arriba de la página de inicio es ahora más sencilla: solo los tres pasos.',
          cs: 'Na telefonu je karta nahoře na úvodní stránce teď jednodušší: jen tři kroky.',
          mr: 'फोनवर मुख्यपृष्ठाच्या वरचे कार्ड आता सोपे आहे: फक्त तीन टप्पे.',
        },
      },
      {
        id: 'lesson-titles',
        text: {
          en: 'Lesson titles now say the same thing in search results as on the page, and lessons for particular lives name who they are for.',
          hi: 'पाठों के शीर्षक अब सर्च नतीजों में भी वही कहते हैं जो पेज पर, और ख़ास ज़िंदगियों के लिए लिखे पाठ अब बताते हैं कि वे किसके लिए हैं।',
          es: 'Los títulos de las lecciones dicen ahora lo mismo en los resultados de búsqueda que en la página, y las lecciones para vidas concretas dicen para quién son.',
          cs: 'Názvy lekcí teď ve výsledcích vyhledávání říkají totéž co na stránce a lekce pro konkrétní životní situace říkají, pro koho jsou.',
          mr: 'धड्यांची शीर्षके आता शोध निकालांमध्ये आणि पानावर एकच गोष्ट सांगतात, आणि विशिष्ट आयुष्यांसाठीचे धडे ते कोणासाठी आहेत हे सांगतात.',
        },
      },
      {
        id: 'lesson-index-button',
        text: {
          en: 'Lessons now have an "In this lesson" button: once the list at the top scrolls away, it opens that list again, so you can jump to any part without scrolling back up.',
          hi: 'पाठों में अब "In this lesson" बटन है: ऊपर की सूची स्क्रॉल होकर ओझल हो जाए, तो यह उसे फिर खोल देता है, ताकि आप बिना वापस ऊपर गए किसी भी हिस्से पर जा सकें।',
          es: 'Las lecciones tienen ahora un botón «In this lesson»: cuando la lista de arriba queda atrás, la vuelve a abrir para saltar a cualquier parte sin volver a subir.',
          cs: 'Lekce teď mají tlačítko „In this lesson“: když seznam nahoře zmizí z obrazovky, znovu ho otevře, takže můžete skočit na kteroukoli část bez posouvání zpět nahoru.',
          mr: 'धड्यांमध्ये आता “In this lesson” बटण आहे: वरची यादी स्क्रोल होऊन दिसेनाशी झाली की ते ती पुन्हा उघडते, म्हणजे परत वर न जाता कोणत्याही भागावर जाता येते.',
        },
      },
    ],
  },
];

/**
 * Items that appear with a launch rather than on a fixed day. Each is merged
 * into the page and the feeds on the day its release gate opens, dated with
 * that day (src/utils/liveChanges.ts), so a tool that launches with a lesson
 * is announced on the day readers can use it, and not before. changes.test.ts
 * holds them to the same rules as every other item.
 */
export const LAUNCH_ITEMS: { investOrPayOff: ChangeItem } = {
  // Launches with lesson 49 (src/utils/invest-or-pay-off/release.ts).
  investOrPayOff: {
    id: 'invest-or-pay-off-tool',
    text: {
      en: "A new free tool compares paying a debt off early with investing the same money, on the same date and after your country's inflation. It shows a range of outcomes rather than one answer, and if a return you type is above what world stocks have returned over the long run, it says so and shows the historical range beside it. The lesson on investing or paying off debt first links to it.",
      es: 'Una herramienta gratuita nueva compara pagar antes una deuda con invertir el mismo dinero, en la misma fecha y descontada la inflación de tu país. Muestra un abanico de resultados en lugar de una sola respuesta y, si la rentabilidad que escribes supera la que han dado las bolsas mundiales a largo plazo, lo dice y muestra el rango histórico al lado. La lección sobre invertir o pagar primero la deuda enlaza con ella.',
      cs: 'Nový nástroj zdarma porovnává předčasné splacení dluhu s investováním stejných peněz, ke stejnému datu a očištěně o inflaci ve vaší zemi. Ukazuje rozpětí výsledků místo jedné odpovědi, a když zadaný výnos přesahuje to, co světové akcie vynášely dlouhodobě, upozorní na to a vedle ukáže historické rozpětí. Odkazuje na něj lekce o tom, zda nejdřív investovat, nebo splatit dluh.',
      mr: 'एक नवीन मोफत साधन कर्ज लवकर फेडणे आणि तेवढीच रक्कम गुंतवणे यांची तुलना करते, एकाच तारखेला आणि तुमच्या देशाच्या महागाईनंतर. ते एका उत्तराऐवजी निकालांचा पल्ला दाखवते, आणि तुम्ही लिहिलेला परतावा जागतिक शेअरनी दीर्घकाळात दिलेल्या परताव्यापेक्षा जास्त असेल तर ते तसे सांगते आणि शेजारी ऐतिहासिक पल्ला दाखवते. आधी गुंतवणूक की आधी कर्जफेड या धड्यातून त्याची लिंक आहे.',
      hi: 'एक नया मुफ़्त टूल कर्ज़ जल्दी चुकाने और उतनी ही रकम निवेश करने की तुलना करता है, एक ही तारीख़ पर और आपके देश की महँगाई के बाद। यह एक जवाब के बजाय नतीजों की एक रेंज दिखाता है, और अगर लिखा गया रिटर्न लंबे समय में दुनिया के शेयरों के रिटर्न से ऊपर हो, तो यह बताता है और बगल में ऐतिहासिक सीमा दिखाता है। पहले निवेश या पहले कर्ज़ चुकाने वाला लेख इससे जुड़ता है।',
    },
  },
};

/** Every item with its day, newest first: what the feeds list, one entry per item. */
export const CHANGES: Array<ChangeItem & { date: string }> = CHANGE_DAYS.flatMap((d) =>
  d.items.map((item) => ({ ...item, date: d.date })),
);
