/**
 * "What's changed": one line per change a reader could notice, newest first.
 *
 * Every pull request that changes something a reader sees adds its line here,
 * in all five languages, in the same pull request (CLAUDE.md, "What's
 * Changed Grows With Every Visible Change"). The lines speak in the founder's
 * voice, plainly, and never give the founder a gender: Hindi and Marathi use
 * dative, ergative or impersonal sentences, Czech the present tense or a
 * participle that agrees with something else.
 *
 * Each language follows its glossary in docs/i18n/, and the rules the catalogs
 * follow (Czech no-break spaces after one-letter words, Marathi no-break space
 * between a Latin word and the case word after it). changes.test.ts checks the
 * mechanical ones.
 */
import type { Locale } from '../config.ts';

export interface ChangeEntry {
  /** The day it shipped, as YYYY-MM-DD. */
  date: string;
  text: Record<Locale, string>;
}

export const CHANGES: ChangeEntry[] = [
  {
    date: '2026-10-22',
    text: {
      en: 'The About page now says how many distinct sources the lessons point to, counted from the lessons themselves.',
      hi: '"nidhi के बारे में" पेज पर अब लिखा है कि पाठ कितने अलग-अलग स्रोतों की ओर ले जाते हैं, और यह गिनती सीधे पाठों से होती है।',
      es: 'La página Sobre nidhi indica ahora a cuántas fuentes distintas remiten las lecciones, contadas a partir de las propias lecciones.',
      cs: 'Stránka O nidhi teď uvádí, na kolik různých zdrojů lekce odkazují, spočítáno přímo z lekcí.',
      mr: '“nidhi विषयी” पानावर आता लिहिले आहे की धडे किती वेगवेगळ्या स्रोतांकडे नेतात, आणि ही संख्या थेट धड्यांमधून मोजली जाते.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'The Mastery level now says "Not yet available", which is more honest than "In progress".',
      hi: 'निपुणता वाले स्तर पर अब "अभी उपलब्ध नहीं" लिखा है, जो "जारी है" से ज़्यादा सच्चा है।',
      es: 'El nivel Dominio dice ahora «Aún no disponible», que es más honesto que «En curso».',
      cs: 'Úroveň Mistrovství teď ukazuje „Zatím není k dispozici“, což je poctivější než „Probíhá“.',
      mr: 'प्रभुत्व स्तरावर आता “अजून उपलब्ध नाही” असे लिहिले आहे, जे “सुरू आहे” पेक्षा जास्त प्रामाणिक आहे.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'The Monte Carlo simulator now has the planner waitlist box too, and all four tools ask the same way, each with one line on what the planner adds.',
      hi: 'मोंटे कार्लो सिम्युलेटर पर भी अब प्लानर की वेटलिस्ट है, और चारों टूल एक ही तरह से पूछते हैं, हर एक के साथ एक पंक्ति कि प्लानर उसमें क्या जोड़ता है।',
      es: 'El simulador Monte Carlo tiene ahora también la lista de espera del planificador, y las cuatro herramientas la ofrecen igual, cada una con una línea sobre lo que el planificador añade.',
      cs: 'Simulátor Monte Carlo teď má také čekací listinu na plánovač a všechny čtyři nástroje ji nabízejí stejně, každý s jednou větou o tom, co plánovač přidá.',
      mr: 'मॉन्टे कार्लो सिम्युलेटरवरही आता प्लॅनरची प्रतीक्षा यादी आहे, आणि चारही साधने ती एकाच पद्धतीने दाखवतात, प्रत्येकासोबत प्लॅनर काय भर घालतो याची एक ओळ.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'The home page now gives one lesson count, at the top and in the FAQ alike. The two had disagreed by one.',
      hi: 'होम पेज पर अब पाठों की एक ही गिनती है, ऊपर भी और अक्सर पूछे जाने वाले सवालों में भी। पहले दोनों जगह एक का फ़र्क था।',
      es: 'La página de inicio da ahora un solo número de lecciones, arriba y en las preguntas frecuentes. Antes los dos diferían en una.',
      cs: 'Úvodní stránka teď uvádí jeden počet lekcí, nahoře i v častých otázkách. Předtím se ta dvě čísla lišila o jednu.',
      mr: 'मुख्यपृष्ठावर आता धड्यांची एकच संख्या आहे, वरच्या भागात आणि नेहमीच्या प्रश्नांमध्येही. आधी या दोन्हींमध्ये एकाचा फरक होता.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'Every line on this page now shows its date.',
      hi: 'इस पेज की हर पंक्ति पर अब उसकी तारीख़ दिखती है।',
      es: 'Cada línea de esta página muestra ahora su fecha.',
      cs: 'Každý řádek na této stránce teď ukazuje své datum.',
      mr: 'या पानावरच्या प्रत्येक ओळीसोबत आता तिची तारीख दिसते.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: "There's now this page: a short list of what changed on the site, newest first.",
      hi: 'अब यह पेज है: साइट पर क्या बदला, उसकी एक छोटी सूची, सबसे नया सबसे ऊपर।',
      es: 'Ahora existe esta página: una lista breve de lo que ha cambiado en el sitio, lo más reciente primero.',
      cs: 'Teď existuje tahle stránka: krátký seznam toho, co se na webu změnilo, od nejnovějšího.',
      mr: 'आता हे पान आहे: साइटवर काय बदलले त्याची छोटी यादी, सगळ्यात नवीन सगळ्यात वर.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'The beliefs page and my story are in my own voice now. They say "I", because it is one person: me.',
      hi: 'सिद्धांतों वाला पेज और मेरी कहानी अब मेरी अपनी आवाज़ में हैं। इनमें "मैं" लिखा है, क्योंकि इसके पीछे एक ही व्यक्ति है: मैं।',
      es: 'La página de principios y mi historia ya están con mi propia voz. Dicen «yo», porque es una sola persona: yo.',
      cs: 'Stránka o tom, čemu věřím, i můj příběh teď mluví mým vlastním hlasem. Píšou „já“, protože za tím stojí jeden člověk: já.',
      mr: 'तत्त्वांचे पान आणि माझी गोष्ट आता माझ्याच आवाजात आहेत. त्यांत “मी” लिहिले आहे, कारण यामागे एकच व्यक्ती आहे: मी.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'When I correct a lesson, the fix is now shown at the top of that lesson and listed on the editorial policy page.',
      hi: 'जब किसी पाठ में सुधार होता है, तो वह अब उसी पाठ में सबसे ऊपर दिखता है और संपादकीय नीति वाले पेज पर भी दर्ज होता है।',
      es: 'Cuando corrijo una lección, la corrección aparece ahora al principio de esa lección y en la lista de la página de política editorial.',
      cs: 'Když opravím lekci, oprava se teď ukáže nahoře v té lekci a objeví se i v seznamu na stránce redakčních zásad.',
      mr: 'एखाद्या धड्यात दुरुस्ती झाली की ती आता त्या धड्याच्या सुरुवातीला दिसते आणि संपादकीय धोरणाच्या पानावरच्या यादीतही येते.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'The About page now says how AI tools are used here: they help research, draft and check, and I read and approve every lesson before it goes out.',
      hi: '"nidhi के बारे में" पेज पर अब लिखा है कि यहाँ AI टूल किस काम आते हैं: रिसर्च, मसौदे और जाँच में मदद, और हर पाठ मेरे पढ़ने और मंज़ूर करने के बाद ही प्रकाशित होता है।',
      es: 'La página Sobre nidhi explica ahora cómo se usan aquí las herramientas de IA: ayudan a investigar, redactar y revisar, y leo y apruebo cada lección antes de publicarla.',
      cs: 'Stránka O nidhi teď popisuje, k čemu tu slouží nástroje AI: pomáhají zkoumat, psát a kontrolovat, a každou lekci před zveřejněním čtu a schvaluji.',
      mr: '“nidhi विषयी” पानावर आता लिहिले आहे की इथे AI साधने कशासाठी वापरली जातात: संशोधन, मसुदा आणि तपासणीसाठी मदत, आणि प्रत्येक धडा प्रसिद्ध होण्यापूर्वी माझ्याकडून वाचून मंजूर होतो.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'The home page now says what free and private mean, right under the buttons: no account, no ads, and what you type in the tools stays on your device.',
      hi: 'होम पेज पर बटनों के ठीक नीचे अब साफ़ लिखा है कि मुफ़्त और निजी का मतलब क्या है: न अकाउंट, न विज्ञापन, और टूल में आप जो लिखते हैं, वह आपके ही डिवाइस पर रहता है।',
      es: 'La página de inicio explica ahora, justo debajo de los botones, qué significan gratis y privado: sin cuenta, sin anuncios, y lo que escribes en las herramientas se queda en tu dispositivo.',
      cs: 'Úvodní stránka teď hned pod tlačítky říká, co znamená zdarma a soukromě: bez účtu, bez reklam a to, co zadáte do nástrojů, zůstává ve vašem zařízení.',
      mr: 'मुख्यपृष्ठावर बटणांच्या अगदी खाली आता लिहिले आहे की मोफत आणि खासगी म्हणजे काय: खाते नाही, जाहिराती नाहीत, आणि साधनांमध्ये तुम्ही जे लिहिता ते तुमच्या डिव्हाइसवरच राहते.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: "The lesson routes on the home page now start with the one for lives the standard plan doesn't fit.",
      hi: 'होम पेज पर पाठों के रास्ते अब उस रास्ते से शुरू होते हैं जो उन ज़िंदगियों के लिए है जिनमें मानक योजना नहीं बैठती।',
      es: 'Las rutas de lecciones de la página de inicio empiezan ahora por la de las vidas que no encajan con el plan estándar.',
      cs: 'Cesty k lekcím na úvodní stránce teď začínají tou pro životy, na které standardní plán nesedí.',
      mr: 'मुख्यपृष्ठावरचे धड्यांचे मार्ग आता सर्वसाधारण योजना ज्या आयुष्यांना बसत नाही, त्यांच्यासाठीच्या मार्गाने सुरू होतात.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'On phones, the card at the top of the home page is simpler now: just the three steps.',
      hi: 'फ़ोन पर होम पेज के ऊपर वाला कार्ड अब सादा है: बस तीन कदम।',
      es: 'En el móvil, la tarjeta de arriba de la página de inicio es ahora más sencilla: solo los tres pasos.',
      cs: 'Na telefonu je karta nahoře na úvodní stránce teď jednodušší: jen tři kroky.',
      mr: 'फोनवर मुख्यपृष्ठाच्या वरचे कार्ड आता सोपे आहे: फक्त तीन टप्पे.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'The loan comparison and the inflation calculator now have the planner waitlist too, like the net worth calculator.',
      hi: 'लोन की तुलना और महँगाई कैलकुलेटर पर भी अब प्लानर की वेटलिस्ट है, शुद्ध संपत्ति कैलकुलेटर की तरह।',
      es: 'El comparador de préstamos y la calculadora de inflación tienen ahora también la lista de espera del planificador, como la calculadora de patrimonio neto.',
      cs: 'Srovnání úvěrů a inflační kalkulačka teď mají také čekací listinu na plánovač, stejně jako kalkulačka čistého jmění.',
      mr: 'कर्जांची तुलना आणि महागाई कॅल्क्युलेटरवरही आता प्लॅनरची प्रतीक्षा यादी आहे, निव्वळ संपत्ती कॅल्क्युलेटरसारखी.',
    },
  },
  {
    date: '2026-10-22',
    text: {
      en: 'The Mastery level now says "In progress" instead of "Being written": its lessons are on the way.',
      hi: 'निपुणता वाले स्तर पर अब "लिखा जा रहा है" की जगह "जारी है" लिखा है: इसके पाठ आने वाले हैं।',
      es: 'El nivel Dominio dice ahora «En curso» en vez de «En preparación»: sus lecciones están en camino.',
      cs: 'Úroveň Mistrovství teď místo „Připravuje se“ ukazuje „Probíhá“: její lekce jsou na cestě.',
      mr: 'प्रभुत्व स्तरावर आता “लिहिले जात आहे” ऐवजी “सुरू आहे” असे लिहिले आहे: त्याचे धडे येत आहेत.',
    },
  },
];
