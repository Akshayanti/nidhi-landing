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
    date: '2026-11-28',
    items: [
      {
        id: 'search-finds-money-and-guides',
        text: {
          en: 'Searching the lessons for just “money” now finds them, where it used to find nothing, and the line above the results counts lessons and guides apart, such as “10 lessons, 1 guide”, so it agrees with the “Show all” button. When only guides match, the count says so too, for screen readers as well.',
          hi: 'पाठों में सिर्फ़ “money” खोजने पर अब पाठ मिलते हैं; पहले कुछ नहीं मिलता था। नतीजों के ऊपर की पंक्ति अब पाठ और गाइड अलग-अलग गिनती है, जैसे “10 पाठ, 1 गाइड”, इसलिए वह “सभी … दिखाएँ” बटन से मेल खाती है। जब सिर्फ़ गाइड मिलती हैं, तब भी गिनती यह बताती है, स्क्रीन रीडर के लिए भी।',
          es: 'Buscar solo «money» entre las lecciones ahora las encuentra, cuando antes no encontraba nada, y la línea sobre los resultados cuenta por separado lecciones y guías, como «10 lecciones, 1 guía», así que coincide con el botón «Mostrar las…». Cuando solo coinciden guías, el recuento también lo indica, incluso para lectores de pantalla.',
          cs: 'Hledání samotného slova „money“ v\u00a0lekcích teď lekce najde, dřív nenašlo nic, a\u00a0řádek nad výsledky počítá zvlášť lekce a\u00a0návody, například „10 lekcí, 1 návod“, takže souhlasí s\u00a0tlačítkem „Zobrazit vše (…)“. Když odpovídají jen návody, počet to řekne také, i\u00a0pro čtečky obrazovky.',
          mr: 'धड्यांमध्ये फक्त “money” शोधल्यावर आता धडे सापडतात; आधी काहीच सापडत नसे. निकालांच्या वरची ओळ आता धडे आणि मार्गदर्शिका वेगवेगळ्या मोजते, जसे “10 धडे, 1 मार्गदर्शिका”, त्यामुळे ती “सर्व … दाखवा” बटणाशी जुळते. फक्त मार्गदर्शिका जुळतात तेव्हाही मोजणी तसे सांगते, स्क्रीन रीडरसाठीही.',
        },
      },
      {
        id: 'email-fields-keep-their-name',
        text: {
          en: 'The newsletter and waitlist forms now show “Email address” above the box, so the box keeps its name once you start typing. It used to be named only by the grey word inside it, which disappears as you type.',
          hi: 'न्यूज़लेटर और वेटलिस्ट के फ़ॉर्म में अब बॉक्स के ऊपर “ईमेल पता” लिखा दिखता है, इसलिए टाइप करना शुरू करने के बाद भी बॉक्स का नाम दिखता रहता है। पहले उसका नाम सिर्फ़ उसके अंदर का धूसर शब्द था, जो टाइप करते ही ग़ायब हो जाता है।',
          es: 'Los formularios del boletín y de la lista de espera muestran ahora «Correo electrónico» sobre el recuadro, así que el recuadro conserva su nombre cuando empiezas a escribir. Antes solo lo nombraba la palabra gris de dentro, que desaparece al escribir.',
          cs: 'Formuláře newsletteru a\u00a0čekací listiny teď nad rámečkem ukazují „E-mailová adresa“, takže rámeček má název i\u00a0poté, co začnete psát. Dřív ho pojmenovávalo jen šedé slovo uvnitř, které při psaní zmizí.',
          mr: 'न्यूजलेटर आणि प्रतीक्षा यादीच्या फॉर्ममध्ये आता चौकटीच्या वर “ईमेल पत्ता” दिसतो, त्यामुळे टाइप करायला सुरुवात केल्यावरही चौकटीचे नाव दिसत राहते. आधी तिचे नाव फक्त आतला राखाडी शब्द होता, जो टाइप करताच नाहीसा होतो.',
        },
      },
      {
        id: 'lesson-drawings-readable',
        text: {
          en: 'The drawings in lessons now keep their smallest words readable on every screen and at every text size you set: a wide drawing reaches past the column of text, or scrolls sideways, instead of shrinking. Tables in lessons and guides no longer split a short figure such as “3%” across two lines.',
          hi: 'पाठों के चित्र अब हर स्क्रीन पर और आपके चुने हर अक्षर-आकार पर अपने सबसे छोटे शब्द भी पढ़ने लायक रखते हैं: चौड़ा चित्र छोटा होने की जगह लेख के कॉलम से बाहर तक फैलता है, या बग़ल में स्क्रॉल होता है। पाठों और गाइड की तालिकाएँ अब “3%” जैसे छोटे आँकड़े को दो पंक्तियों में नहीं तोड़तीं।',
          es: 'Los dibujos de las lecciones mantienen ahora legibles hasta sus palabras más pequeñas en cualquier pantalla y con cualquier tamaño de texto que elijas: un dibujo ancho se extiende más allá de la columna de texto, o se desplaza de lado, en lugar de encogerse. Las tablas de lecciones y guías ya no parten una cifra corta como «3\u00a0%» en dos líneas.',
          cs: 'Obrázky v\u00a0lekcích teď mají i\u00a0nejmenší slova čitelná na každé obrazovce a\u00a0při každé velikosti písma, kterou si nastavíte: široký obrázek se místo zmenšení roztáhne za sloupec textu, nebo se posouvá do strany. Tabulky v\u00a0lekcích a\u00a0návodech už nerozdělí krátké číslo jako „3\u00a0%“ na dva řádky.',
          mr: 'धड्यांमधील चित्रे आता प्रत्येक स्क्रीनवर आणि तुम्ही निवडलेल्या प्रत्येक अक्षर-आकारात आपले सर्वात लहान शब्दही वाचता येतील असे ठेवतात: रुंद चित्र लहान होण्याऐवजी मजकुराच्या स्तंभाबाहेर पसरते, किंवा बाजूला स्क्रोल होते. धडे आणि मार्गदर्शिकांमधील तक्ते आता “3%” सारखा लहान आकडा दोन ओळींत तोडत नाहीत.',
        },
      },
      {
        id: 'cookie-answers-first-large-text',
        text: {
          en: 'When the screen is short for its text, as with very large text on a phone, the cookie question now shows its two answers right after its title, before the explanation, so neither has to be found far down the sheet.',
          hi: 'जब स्क्रीन अपने अक्षरों के हिसाब से छोटी पड़ती है, जैसे फ़ोन पर बहुत बड़े अक्षरों में, तो कुकी वाला सवाल अब अपने शीर्षक के ठीक बाद, समझाने वाले हिस्से से पहले, अपने दोनों जवाब दिखाता है, ताकि दोनों में से किसी को भी नीचे दूर तक ढूँढना न पड़े।',
          es: 'Cuando la pantalla se queda corta para su texto, como con el texto muy grande en un teléfono, el aviso de cookies muestra ahora sus dos respuestas justo después del título, antes de la explicación, y no hace falta buscar ninguna muy abajo.',
          cs: 'Když je obrazovka na své písmo krátká, třeba při velmi velkém písmu na telefonu, cookie lišta teď ukazuje obě odpovědi hned pod nadpisem, před vysvětlením, takže ani jednu není třeba hledat hluboko dole.',
          mr: 'स्क्रीन तिच्या अक्षरांसाठी लहान पडते तेव्हा, जसे फोनवर खूप मोठ्या अक्षरांत, कुकी सूचना आता आपल्या शीर्षकानंतर लगेच, स्पष्टीकरणाच्या आधी, दोन्ही उत्तरे दाखवते, त्यामुळे कोणतेही उत्तर खाली दूरवर शोधावे लागत नाही.',
        },
      },
      {
        id: 'level-colours-easier-to-read',
        text: {
          en: 'Level names and numbers are easier to read: Discovery’s teal and Psychology’s amber are darker as text in light mode, Discovery’s is paler in dark mode, and the numbers sit on a plain background instead of a tint. On a topic page with large text on a phone, the “Start here” label no longer covers the first lesson’s title.',
          hi: 'स्तरों के नाम और नंबर अब पढ़ने में आसान हैं: हल्के मोड में ‘शुरुआत’ का हरा-नीला और ‘मनोविज्ञान’ का पीला-भूरा रंग लिखावट में गहरा है, गहरे मोड में ‘शुरुआत’ का रंग हल्का है, और नंबर रंगीन परत की जगह सादी पृष्ठभूमि पर हैं। फ़ोन पर बड़े अक्षरों में विषय वाले पेज पर “यहाँ से शुरू करें” लेबल अब पहले पाठ का शीर्षक नहीं ढकता।',
          es: 'Los nombres y números de los niveles se leen mejor: el turquesa de Descubrimiento y el ámbar de Psicología son más oscuros como texto en el modo claro, el de Descubrimiento es más claro en el modo oscuro, y los números están sobre un fondo liso en lugar de uno teñido. En una página de tema con el texto grande en un teléfono, la etiqueta «Empieza aquí» ya no tapa el título de la primera lección.',
          cs: 'Názvy a\u00a0čísla úrovní se čtou snáz: tyrkysová barva úrovně Objevování a\u00a0jantarová barva úrovně Psychologie jsou ve světlém režimu jako text tmavší, tyrkysová barva Objevování je v\u00a0tmavém režimu světlejší a\u00a0čísla stojí na čistém pozadí místo zabarveného. Na stránce tématu s\u00a0velkým písmem na telefonu už štítek „Začít tady“ nezakrývá název první lekce.',
          mr: 'पातळ्यांची नावे आणि क्रमांक आता वाचायला सोपे आहेत: फिकट मोडमध्ये ‘ओळख’चा निळसर हिरवा आणि ‘मानसशास्त्र’चा पिवळसर तपकिरी रंग अक्षरांत गडद आहे, गडद मोडमध्ये ‘ओळख’चा रंग फिकट आहे, आणि क्रमांक रंगीत छटेऐवजी साध्या पार्श्वभूमीवर आहेत. फोनवर मोठ्या अक्षरांत विषयाच्या पानावर “इथून सुरुवात करा” लेबल आता पहिल्या धड्याचे शीर्षक झाकत नाही.',
        },
      },
      {
        id: 'start-card-and-retry-keep-their-place',
        text: {
          en: 'On the lessons page, a returning reader’s “Continue where you left off” card now shows the next lesson’s title at once, where it was empty until its script loaded, and a reader of Inclusive Finances lessons alone is no longer shown it. If confirming or ending a subscription fails, the button now keeps keyboard focus, so you can try again from where you are.',
          hi: 'पाठों वाले पेज पर लौटकर आने वाले पाठक का “जहाँ छोड़ा था वहीं से जारी रखें” कार्ड अब अगले पाठ का शीर्षक तुरंत दिखाता है; पहले वह अपनी स्क्रिप्ट लोड होने तक ख़ाली रहता था। सिर्फ़ ‘सबके लिए वित्त’ के पाठ पढ़ने वाले को अब यह कार्ड नहीं दिखता। सदस्यता की पुष्टि करना या उसे ख़त्म करना विफल हो, तो बटन अब कीबोर्ड फ़ोकस नहीं खोता, ताकि आप वहीं से फिर कोशिश कर सकें।',
          es: 'En la página de lecciones, la tarjeta «Sigue donde lo dejaste» de quien vuelve muestra ahora enseguida el título de la siguiente lección, cuando antes estaba vacía hasta que cargaba su script, y ya no se muestra a quien solo ha leído lecciones de Finanzas inclusivas. Si falla la confirmación o la baja de una suscripción, el botón conserva ahora el foco del teclado, para que puedas volver a intentarlo desde donde estás.',
          cs: 'Na stránce lekcí teď karta „Pokračujte tam, kde to máte rozečtené“ vracejícímu se čtenáři hned ukazuje název další lekce, dřív byla prázdná, dokud se nenačetl její skript, a\u00a0čtenáři jen lekcí Inkluzivní finance se už neukazuje. Když se nepodaří potvrdit nebo zrušit odběr, tlačítko teď podrží fokus klávesnice, takže to můžete zkusit znovu tam, kde jste.',
          mr: 'धड्यांच्या पानावर परत आलेल्या वाचकाचे “मागच्या वेळी जिथे वाचन थांबले, तिथून पुढे वाचा” कार्ड आता पुढच्या धड्याचे शीर्षक लगेच दाखवते; आधी त्याची स्क्रिप्ट लोड होईपर्यंत ते रिकामे राहत असे. फक्त ‘सर्वसमावेशक वित्त’चे धडे वाचणाऱ्याला आता हे कार्ड दिसत नाही. सदस्यत्वाची पुष्टी करणे किंवा ते बंद करणे अयशस्वी झाले, तर बटण आता कीबोर्डचा फोकस गमावत नाही, त्यामुळे तुम्ही तिथूनच पुन्हा प्रयत्न करू शकता.',
        },
      },
      {
        id: 'loan-says-what-is-missing',
        text: {
          en: 'In the loan comparison, a loan amount or monthly payment that is not a number now says it could not be read and how to write it. A horizon, refinance month, rate or term left empty is marked and holds its results back until it is filled in; an empty box used to show results for a value you had not chosen.',
          hi: 'लोन की तुलना में, अगर लोन राशि या मासिक किस्त संख्या नहीं है, तो अब बताया जाता है कि उसे पढ़ा नहीं जा सका और उसे कैसे लिखें। हॉराइज़न, रीफ़ाइनेंस का महीना, दर या अवधि ख़ाली छोड़ने पर वह बॉक्स चिह्नित होता है और भरे जाने तक नतीजे रोके रखता है; पहले ख़ाली बॉक्स ऐसे मान के नतीजे दिखाता था जो आपने चुना ही नहीं था।',
          es: 'En la comparación de préstamos, una cantidad o una cuota mensual que no es un número dice ahora que no se pudo leer y cómo escribirla. Un horizonte, un mes de refinanciación, una tasa o un plazo que se dejan vacíos se marcan y retienen sus resultados hasta que se rellenan; antes, un recuadro vacío mostraba resultados para un valor que no habías elegido.',
          cs: 'V\u00a0porovnání úvěrů teď výše úvěru nebo měsíční splátka, která není číslo, řekne, že ji nešlo přečíst, a\u00a0jak ji napsat. Prázdný horizont, měsíc refinancování, sazba nebo doba splatnosti se označí a\u00a0zadrží své výsledky, dokud je nevyplníte; dřív prázdný rámeček ukazoval výsledky pro hodnotu, která nebyla vaší volbou.',
          mr: 'कर्जांच्या तुलनेत, कर्जाची रक्कम किंवा मासिक हप्ता संख्या नसेल तर आता ती वाचता आली नाही आणि ती कशी लिहायची हे सांगितले जाते. कालावधी, पुनर्वित्ताचा महिना, दर किंवा मुदत रिकामी ठेवल्यास ती चौकट चिन्हांकित होते आणि भरेपर्यंत निकाल थांबवून ठेवते; आधी रिकामी चौकट तुम्ही न निवडलेल्या मूल्याचे निकाल दाखवत असे.',
        },
      },
      {
        id: 'copied-link-stays-in-view',
        text: {
          en: 'The Monte Carlo simulator, the invest-or-pay-off calculator and the inflation calculator now keep a copied link in a box under the buttons, as the loan comparison does, and a screen reader hears that it was copied. Where the browser does not let the page copy, the link is there to copy by hand. In the net worth calculator, that box now comes into view in a short share window.',
          hi: 'मोंटे कार्लो सिम्युलेटर, निवेश या कर्ज़ चुकाना कैलकुलेटर और महँगाई कैलकुलेटर अब कॉपी किया गया लिंक बटनों के नीचे एक बॉक्स में रखते हैं, जैसे लोन की तुलना रखती है, और स्क्रीन रीडर को सुनाई देता है कि लिंक कॉपी हो गया। जहाँ ब्राउज़र पेज को कॉपी नहीं करने देता, वहाँ लिंक हाथ से कॉपी करने के लिए मौजूद रहता है। शुद्ध संपत्ति कैलकुलेटर में, छोटी शेयर विंडो में भी यह बॉक्स अब नज़र के सामने आ जाता है।',
          es: 'El simulador de Monte Carlo, la calculadora de invertir o pagar deuda y la calculadora de inflación guardan ahora el enlace copiado en un recuadro bajo los botones, como ya hace la comparación de préstamos, y un lector de pantalla oye que se ha copiado. Si el navegador no deja copiar a la página, el enlace queda ahí para copiarlo a mano. En la calculadora de patrimonio neto, ese recuadro aparece ahora a la vista aunque la ventana para compartir sea baja.',
          cs: 'Simulátor Monte Carlo, kalkulačka „Investovat, nebo splatit dluh“ a\u00a0inflační kalkulačka teď nechávají zkopírovaný odkaz v\u00a0rámečku pod tlačítky, jako to dělá porovnání úvěrů, a\u00a0čtečka obrazovky ohlásí, že byl zkopírován. Kde prohlížeč stránce kopírování nedovolí, je odkaz připravený ke zkopírování ručně. V\u00a0kalkulačce čistého jmění se ten rámeček teď posune do zobrazení i\u00a0v\u00a0nízkém okně pro sdílení.',
          mr: 'मॉन्टे कार्लो सिम्युलेटर, गुंतवणूक की कर्जफेड कॅल्क्युलेटर आणि महागाई कॅल्क्युलेटर आता कॉपी केलेली लिंक बटणांखालील चौकटीत ठेवतात, जसे कर्जांची तुलना ठेवते, आणि स्क्रीन रीडरला लिंक कॉपी झाल्याचे ऐकू येते. ब्राउझर पानाला कॉपी करू देत नाही तिथे लिंक हाताने कॉपी करण्यासाठी उपलब्ध राहते. निव्वळ संपत्ती कॅल्क्युलेटरमध्ये, कमी उंचीच्या शेअर खिडकीतही ही चौकट आता नजरेसमोर येते.',
        },
      },
      {
        id: 'screen-readers-hear-it-once',
        text: {
          en: 'With a screen reader, a box with a mistake in the invest-or-pay-off and inflation calculators now names the mistake once instead of twice, the note about your own return waits until you stop typing, and the Monte Carlo simulator now says when the results are back after you correct a box. The net worth chart’s legend no longer says an entry is pressed when a second tap could not release it.',
          hi: 'स्क्रीन रीडर के साथ, निवेश या कर्ज़ चुकाना कैलकुलेटर और महँगाई कैलकुलेटर में ग़लती वाला बॉक्स अब ग़लती दो बार की जगह एक बार बताता है, आपके अपने रिटर्न वाला नोट आपके टाइप करना रोकने तक इंतज़ार करता है, और मोंटे कार्लो सिम्युलेटर अब बताता है कि बॉक्स ठीक करने के बाद नतीजे वापस आ गए हैं। शुद्ध संपत्ति चार्ट की लेजेंड अब किसी हिस्से को दबा हुआ नहीं बताती, जब दूसरी बार टैप करने से वह छूट ही नहीं सकता था।',
          es: 'Con un lector de pantalla, un recuadro con un error en las calculadoras de invertir o pagar deuda y de inflación nombra ahora el error una vez en lugar de dos, la nota sobre tu propia rentabilidad espera a que dejes de escribir, y el simulador de Monte Carlo avisa de que los resultados han vuelto cuando corriges un recuadro. La leyenda del gráfico de patrimonio neto ya no dice que una entrada está pulsada cuando un segundo toque no podía soltarla.',
          cs: 'Se čtečkou obrazovky teď rámeček s\u00a0chybou v\u00a0kalkulačce „Investovat, nebo splatit dluh“ a\u00a0v\u00a0inflační kalkulačce pojmenuje chybu jednou místo dvakrát, poznámka o\u00a0vašem vlastním výnosu počká, až přestanete psát, a\u00a0simulátor Monte Carlo teď řekne, že jsou výsledky zpět, když rámeček opravíte. Legenda grafu čistého jmění už neříká, že je položka stisknutá, když ji druhé klepnutí nemohlo uvolnit.',
          mr: 'स्क्रीन रीडर वापरताना, गुंतवणूक की कर्जफेड कॅल्क्युलेटर आणि महागाई कॅल्क्युलेटरमधील चूक असलेली चौकट आता चूक दोनदा नव्हे तर एकदाच सांगते, तुमच्या स्वतःच्या परताव्याची टीप तुम्ही टाइप करणे थांबवेपर्यंत थांबते, आणि चौकट दुरुस्त केल्यावर निकाल परत आल्याचे मॉन्टे कार्लो सिम्युलेटर आता सांगतो. निव्वळ संपत्तीच्या आलेखाची सूची आता एखादी नोंद दाबलेली आहे असे सांगत नाही, जेव्हा दुसऱ्या टॅपने ती सोडवताच येत नव्हती.',
        },
      },
      {
        id: 'charts-on-small-screens',
        text: {
          en: 'On a phone, the loan comparison’s balance chart now keeps its amounts at the left while you scroll the chart sideways. The Monte Carlo chart always shows the last year of the plan, and its explanations of the return settings sit over the setting they describe, or at a large text size stay in the line under the switch. The inflation chart’s first year no longer touches its “0”.',
          hi: 'फ़ोन पर, लोन की तुलना का बकाया वाला चार्ट अब बग़ल में स्क्रॉल करते समय अपनी रकमें बाईं ओर रखता है। मोंटे कार्लो चार्ट अब हमेशा योजना का आख़िरी साल दिखाता है, और रिटर्न की सेटिंग्स की व्याख्याएँ उसी सेटिंग के ऊपर दिखती हैं जिसके बारे में हैं, या बड़े अक्षरों में स्विच के नीचे वाली पंक्ति में रहती हैं। महँगाई चार्ट का पहला साल अब उसके “0” से नहीं टकराता।',
          es: 'En un teléfono, el gráfico del saldo de la comparación de préstamos mantiene ahora sus cantidades a la izquierda mientras lo desplazas de lado. El gráfico de Monte Carlo muestra siempre el último año del plan, y las explicaciones de los ajustes de rentabilidad aparecen sobre el ajuste que describen o, con un texto grande, se quedan en la línea bajo las opciones. El primer año del gráfico de inflación ya no toca su «0».',
          cs: 'Na telefonu teď graf zůstatku v\u00a0porovnání úvěrů drží své částky vlevo, zatímco ho posouváte do strany. Graf Monte Carlo vždy ukazuje poslední rok plánu a\u00a0vysvětlení nastavení výnosů se objeví nad nastavením, které popisují, nebo při velkém písmu zůstanou v\u00a0řádku pod přepínačem. První rok v\u00a0inflačním grafu se už nedotýká jeho „0“.',
          mr: 'फोनवर, कर्जांच्या तुलनेतील शिल्लक दाखवणारा आलेख बाजूला स्क्रोल करताना आता आपल्या रकमा डावीकडे ठेवतो. मॉन्टे कार्लो आलेख आता नेहमी योजनेचे शेवटचे वर्ष दाखवतो, आणि परताव्याच्या सेटिंग्जची स्पष्टीकरणे ज्या सेटिंगबद्दल आहेत तिच्यावर दिसतात, किंवा मोठ्या अक्षरांत स्विचखालच्या ओळीत राहतात. महागाई आलेखाचे पहिले वर्ष आता त्याच्या “0” ला भिडत नाही.',
        },
      },
      {
        id: 'small-screens-large-text',
        text: {
          en: 'With large text, the spreadsheet, PDF and link buttons under a tool stack one under another on a wider screen too, amounts in the How-to guides’ drawings and examples stay whole on one line, and long amounts in the loan comparison’s table are drawn as large as they fit. A phone keyboard’s return key now says “done” in the tools and “send” in the email forms.',
          hi: 'बड़े अक्षरों में, टूल के नीचे स्प्रेडशीट, PDF और लिंक वाले बटन चौड़ी स्क्रीन पर भी एक के नीचे एक आते हैं, “कैसे करें” गाइड के चित्रों और उदाहरणों में रकमें एक पंक्ति में पूरी रहती हैं, और लोन की तुलना की तालिका में लंबी रकमें जितनी बड़ी समा सकें उतनी बड़ी दिखती हैं। फ़ोन के कीबोर्ड का रिटर्न बटन अब टूल में “हो गया” और ईमेल फ़ॉर्म में “भेजें” बताता है।',
          es: 'Con texto grande, los botones de hoja de cálculo, PDF y enlace bajo una herramienta se apilan uno debajo de otro también en una pantalla más ancha, las cantidades de los dibujos y ejemplos de las guías prácticas se quedan enteras en una línea y las cantidades largas de la tabla de la comparación de préstamos se muestran tan grandes como caben. La tecla de retorno del teclado del teléfono dice ahora «listo» en las herramientas y «enviar» en los formularios de correo.',
          cs: 'S\u00a0velkým písmem se tlačítka pro tabulku, PDF a\u00a0odkaz pod nástrojem skládají pod sebe i\u00a0na širší obrazovce, částky v\u00a0obrázcích a\u00a0příkladech návodů zůstávají celé na jednom řádku a\u00a0dlouhé částky v\u00a0tabulce porovnání úvěrů jsou tak velké, jak se vejdou. Klávesa Enter na klávesnici telefonu teď v\u00a0nástrojích říká „hotovo“ a\u00a0v\u00a0e-mailových formulářích „odeslat“.',
          mr: 'मोठ्या अक्षरांत, साधनाखालील स्प्रेडशीट, PDF आणि लिंकची बटणे रुंद स्क्रीनवरही एकाखाली एक येतात, “कसे करावे” मार्गदर्शिकांच्या चित्रांमधील आणि उदाहरणांमधील रकमा एका ओळीत पूर्ण राहतात, आणि कर्जांच्या तुलनेच्या तक्त्यातील लांब रकमा मावतील तितक्या मोठ्या दिसतात. फोनच्या कीबोर्डची रिटर्न की आता साधनांमध्ये “झाले” आणि ईमेल फॉर्ममध्ये “पाठवा” सांगते.',
        },
      },
    ],
  },
  {
    date: '2026-11-27',
    items: [
      {
        id: 'loan-link-carries-a-check',
        text: {
          en: 'A link to a loan comparison now carries a check. If a link you open is incomplete or has changed on the way, the tool says so and offers a new comparison, where it used to fill the gaps with example figures and show a full result. Links copied before today open as they always did, so a damaged one of those cannot always be caught.',
          hi: 'लोन तुलना के लिंक में अब एक जाँच जुड़ी रहती है। खोला गया लिंक अधूरा हो या रास्ते में बदल गया हो, तो टूल यह बताता है और नई तुलना शुरू करने का विकल्प देता है; पहले वह खाली जगहें उदाहरण के आँकड़ों से भरकर पूरा नतीजा दिखा देता था। आज से पहले कॉपी किए गए लिंक पहले की तरह ही खुलते हैं, इसलिए उनमें से कोई बिगड़ा हुआ लिंक हर बार पकड़ में नहीं आता।',
          es: 'Un enlace a una comparación de préstamos lleva ahora una comprobación. Si el enlace que abres está incompleto o ha cambiado por el camino, la herramienta lo dice y ofrece empezar una comparación nueva; antes rellenaba los huecos con cifras de ejemplo y mostraba un resultado completo. Los enlaces copiados antes de hoy se abren como siempre, así que uno de esos que llegue dañado no siempre se puede detectar.',
          cs: 'Odkaz na srovnání úvěrů teď obsahuje kontrolu. Když je otevřený odkaz neúplný nebo se cestou změnil, nástroj to řekne a\u00a0nabídne nové srovnání; dřív mezery doplnil ukázkovými čísly a\u00a0ukázal celý výsledek. Odkazy zkopírované před dneškem se otevírají jako dosud, takže poškozený starší odkaz nejde vždy poznat.',
          mr: 'कर्जांच्या तुलनेच्या लिंकमध्ये आता एक तपासणी असते. उघडलेली लिंक अपूर्ण असेल किंवा वाटेत बदलली असेल, तर साधन तसे सांगते आणि नवीन तुलना सुरू करण्याचा पर्याय देते; आधी ते रिकाम्या जागा उदाहरणाच्या आकड्यांनी भरून पूर्ण निकाल दाखवत असे. आजच्या आधी कॉपी केलेल्या लिंक पूर्वीसारख्याच उघडतात, त्यामुळे त्यांपैकी बिघडलेली लिंक दर वेळी ओळखता येत नाही.',
        },
      },
      {
        id: 'typing-box-stays-in-place',
        text: {
          en: 'When a figure you are typing turns out to be one a tool cannot use, the box you are typing in now stays where it is. A note or a result above it used to disappear or change size at that moment and push the box up or down the screen, by a long way at large text sizes.',
          hi: 'टाइप करते समय अगर कोई आँकड़ा ऐसा निकले जिसे टूल इस्तेमाल नहीं कर सकता, तो जिस बॉक्स में टाइप हो रहा है वह अब अपनी जगह पर ही रहता है। पहले उसी पल ऊपर की कोई टिप्पणी या नतीजा हट जाता या उसका आकार बदल जाता था, और बॉक्स स्क्रीन पर ऊपर या नीचे खिसक जाता था; बड़े अक्षरों में बहुत ज़्यादा।',
          es: 'Cuando una cifra que estás escribiendo resulta ser una que la herramienta no puede usar, el recuadro en el que escribes se queda ahora en su sitio. Antes, una nota o un resultado de más arriba desaparecía o cambiaba de tamaño en ese momento y movía el recuadro por la pantalla, mucho con el texto grande.',
          cs: 'Když se při psaní ukáže, že nástroj zadané číslo nemůže použít, rámeček, do kterého píšete, teď zůstává na místě. Dřív v\u00a0tu chvíli zmizela nebo změnila velikost poznámka či výsledek nad ním a\u00a0rámeček se na obrazovce posunul, při velkém písmu o\u00a0hodně.',
          mr: 'टाइप करताना एखादा आकडा साधनाला वापरता येत नाही असे दिसले, तर ज्या चौकटीत टाइप होत आहे ती आता जागची हलत नाही. आधी त्याच क्षणी वरची एखादी टीप किंवा निकाल नाहीसा होत असे किंवा त्याचा आकार बदलत असे, आणि चौकट स्क्रीनवर वर किंवा खाली सरकत असे; मोठ्या अक्षरांत खूपच.',
        },
      },
      {
        id: 'loan-says-what-is-not-used',
        text: {
          en: 'The loan comparison now tells you when something you entered is not used: a subsequent rate that would only start after the term ends, a lump sum dated after the loan is paid off, or the part of a lump sum beyond what is owed. The note is on the offer’s card, in the spreadsheet and in the report. An initial fixed period now has to be a whole number of months: 60.4 used to be rounded without a word.',
          hi: 'लोन तुलना अब बताती है कि भरी गई कौन-सी चीज़ इस्तेमाल नहीं हुई: बाद की वह दर जो अवधि ख़त्म होने के बाद ही शुरू होती, वह एकमुश्त राशि जिसकी तारीख़ लोन चुक जाने के बाद की है, या एकमुश्त राशि का वह हिस्सा जो बकाया से ज़्यादा है। यह टिप्पणी ऑफ़र के कार्ड, स्प्रेडशीट और रिपोर्ट में दिखती है। शुरुआत की तय अवधि अब पूरे महीनों में होनी चाहिए: पहले 60.4 को बिना बताए गोल कर दिया जाता था।',
          es: 'El comparador de préstamos avisa ahora cuando algo que has escrito no se usa: una tasa posterior que solo empezaría después de terminar el plazo, un pago extraordinario con fecha posterior a la liquidación del préstamo, o la parte de un pago extraordinario que supera el saldo pendiente. La nota aparece en la tarjeta de la oferta, en la hoja de cálculo y en el informe. El periodo fijo inicial tiene que ser ahora un número entero de meses: antes 60,4 se redondeaba sin avisar.',
          cs: 'Srovnání úvěrů teď řekne, když se něco ze zadaných údajů nepoužije: následná sazba, která by začala platit až po konci doby splatnosti, jednorázová mimořádná splátka s\u00a0datem po splacení úvěru, nebo ta část mimořádné splátky, která přesahuje zbývající jistinu. Poznámka je na kartě nabídky, v\u00a0tabulce i\u00a0ve zprávě. Počáteční období fixace teď musí být celý počet měsíců: dřív se 60,4 bez upozornění zaokrouhlilo.',
          mr: 'कर्जांची तुलना आता सांगते की भरलेली कोणती गोष्ट वापरली गेली नाही: मुदत संपल्यानंतरच सुरू झाला असता असा नंतरचा दर, कर्ज फिटल्यानंतरच्या तारखेची एकरकमी रक्कम, किंवा एकरकमी रकमेचा बाकी कर्जापेक्षा जास्त असलेला भाग. ही टीप ऑफरच्या कार्डवर, स्प्रेडशीटमध्ये आणि अहवालात दिसते. सुरुवातीचा ठरावीक कालावधी आता पूर्ण महिन्यांचा असावा लागतो: आधी 60.4 न सांगता जवळच्या पूर्ण आकड्यावर आणला जात असे.',
        },
      },
      {
        id: 'no-minus-zero-flat-prices',
        text: {
          en: 'The tools no longer show “−0%” for a figure too small to register, and the inflation calculator now says prices changed by less than 0.5% instead of “rose about 0%”. When amounts cancel out in the net worth calculator, the total is now a plain zero, with no shares of over 999%.',
          hi: 'टूल अब बहुत छोटे आँकड़े के लिए “−0%” नहीं दिखाते, और महँगाई कैलकुलेटर अब “लगभग 0% बढ़ीं” की जगह बताता है कि क़ीमतें 0.5% से कम बदलीं। शुद्ध संपत्ति कैलकुलेटर में जब रकमें आपस में कटकर शून्य हो जाती हैं, तो कुल अब सीधा शून्य दिखता है, और 999% से ज़्यादा के हिस्से नहीं दिखते।',
          es: 'Las herramientas ya no muestran «−0\u00a0%» cuando una cifra es demasiado pequeña para notarse, y la calculadora de inflación dice ahora que los precios variaron menos de un 0,5\u00a0% en lugar de «subieron alrededor de un 0\u00a0%». Cuando las cantidades se compensan en la calculadora de patrimonio neto, el total es ahora un cero sin más, sin porcentajes de más del 999\u00a0%.',
          cs: 'Nástroje už neukazují „−0\u00a0%“ u\u00a0čísla, které je příliš malé na to, aby se projevilo, a\u00a0inflační kalkulačka teď místo „vzrostly zhruba o\u00a00\u00a0%“ říká, že se ceny změnily o\u00a0méně než 0,5\u00a0%. Když se částky v\u00a0kalkulačce čistého jmění navzájem vyruší, je teď součet prostá nula, bez podílů přes 999\u00a0%.',
          mr: 'साधने आता अगदी लहान आकड्यासाठी “−0%” दाखवत नाहीत, आणि महागाई कॅल्क्युलेटर आता “सुमारे 0% वाढल्या” ऐवजी किमती 0.5%\u00a0पेक्षा कमी बदलल्या असे सांगतो. निव्वळ संपत्ती कॅल्क्युलेटरमध्ये रकमा एकमेकांना रद्द करतात तेव्हा एकूण आता साधे शून्य दिसते, आणि 999%\u00a0पेक्षा जास्त हिस्से दिसत नाहीत.',
        },
      },
      {
        id: 'inflation-small-amounts-two-figures',
        text: {
          en: 'The inflation calculator now keeps two figures for a result under 10: €1 at 3% for ten years reads “about €0.74”, where it used to read “about €1”.',
          hi: 'महँगाई कैलकुलेटर अब 10 से कम के नतीजे में दो अंक रखता है: 3% पर दस साल बाद €1 अब “लगभग €0.74” दिखता है, जहाँ पहले “लगभग €1” दिखता था।',
          es: 'La calculadora de inflación conserva ahora dos cifras en un resultado inferior a 10: 1\u00a0€ al 3\u00a0% durante diez años se lee «alrededor de 0,74\u00a0€», donde antes se leía «alrededor de 1\u00a0€».',
          cs: 'Inflační kalkulačka teď u\u00a0výsledku pod 10 ponechává dvě číslice: 1\u00a0€ při 3\u00a0% za deset let se čte „zhruba 0,74\u00a0€“, kde dřív stálo „zhruba 1\u00a0€“.',
          mr: 'महागाई कॅल्क्युलेटर आता 10\u00a0पेक्षा कमी निकालात दोन अंक ठेवतो: 3% दराने दहा वर्षांनी €1 आता “सुमारे €0.74” असे दिसते, जिथे आधी “सुमारे €1” दिसत होते.',
        },
      },
      {
        id: 'net-worth-share-rate-unavailable',
        text: {
          en: 'When the net worth calculator has no exchange rates, the spending currency’s share now reads “Share unknown: no exchange rates” on its card, in the spreadsheet and in the report, where it used to read 0%.',
          hi: 'जब शुद्ध संपत्ति कैलकुलेटर के पास विनिमय दरें नहीं होतीं, तो खर्च की मुद्रा का हिस्सा अब उसके कार्ड, स्प्रेडशीट और रिपोर्ट में “हिस्सा पता नहीं: विनिमय दरें नहीं मिलीं” दिखता है, जहाँ पहले 0% दिखता था।',
          es: 'Cuando la calculadora de patrimonio neto no tiene tipos de cambio, la parte de la moneda de gasto se lee ahora «Parte desconocida: sin tipos de cambio» en su tarjeta, en la hoja de cálculo y en el informe, donde antes se leía 0\u00a0%.',
          cs: 'Když kalkulačka čistého jmění nemá kurzy, podíl měny výdajů se teď na její kartě, v\u00a0tabulce i\u00a0ve zprávě čte „Podíl neznámý: chybí směnné kurzy“, kde dřív stálo 0\u00a0%.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटरकडे विनिमय दर नसतात तेव्हा खर्चाच्या चलनाचा हिस्सा आता त्याच्या कार्डवर, स्प्रेडशीटमध्ये आणि अहवालात “हिस्सा माहीत नाही: विनिमय दर मिळाले नाहीत” असा दिसतो, जिथे आधी 0% दिसत होते.',
        },
      },
      {
        id: 'loan-changing-rate-needs-both-boxes',
        text: {
          en: 'In the loan comparison, an offer with a “Fixed, then variable” rate now needs both its initial fixed period and its subsequent rate. If the subsequent rate was left empty, the offer used to be worked out at its starting rate for the whole term, without any warning, and could be named the lowest total. A lump sum now needs a whole month from 1 to 1,200: month 12.5 used to be moved to month 12, and a month past 1,200 was never paid. The spreadsheet also no longer cuts a very long list of lump sums short.',
          hi: 'लोन तुलना टूल में, “पहले तय, फिर बदलती” दर वाले ऑफ़र के लिए अब शुरुआत की तय अवधि और बाद की दर, दोनों ज़रूरी हैं। पहले बाद की दर खाली छोड़ने पर ऑफ़र का हिसाब बिना बताए पूरी अवधि के लिए शुरुआती दर पर ही लगा दिया जाता था, और वह सबसे कम कुल वाला ऑफ़र कहला सकता था। एकमुश्त राशि के लिए अब 1 से 1,200 तक का पूरा महीना चाहिए: पहले महीना 12.5 बिना बताए महीना 12 बन जाता था, और 1,200 के बाद के महीने की राशि कभी चुकाई ही नहीं जाती थी। साथ ही, स्प्रेडशीट अब एकमुश्त राशियों की बहुत लंबी सूची को बीच में नहीं काटती।',
          es: 'En el comparador de préstamos, una oferta con tasa «Fija y luego variable» necesita ahora tanto el periodo fijo inicial como la tasa posterior. Antes, si la tasa posterior quedaba vacía, la oferta se calculaba sin avisar con la tasa inicial durante todo el plazo, y podía aparecer como la de menor total. Un pago extraordinario necesita ahora un mes entero del 1 al 1200: antes, el mes 12,5 pasaba al mes 12 y un mes posterior al 1200 no se pagaba nunca. Además, la hoja de cálculo ya no corta una lista muy larga de pagos extraordinarios.',
          cs: 'Ve srovnání úvěrů teď nabídka se sazbou „Pevná, pak pohyblivá“ potřebuje počáteční období fixace i\u00a0následnou sazbu. Dřív se nabídka s\u00a0prázdnou následnou sazbou bez upozornění spočítala s\u00a0počáteční sazbou na celou dobu splatnosti a\u00a0mohla vyjít jako ta s\u00a0nejnižším součtem. Jednorázová splátka teď potřebuje celý měsíc od 1 do 1\u00a0200: dřív se měsíc 12,5 přesunul na měsíc 12 a\u00a0splátka v\u00a0měsíci po 1\u00a0200 se nezaplatila nikdy. Tabulka ke stažení už také nezkracuje velmi dlouhý seznam jednorázových splátek.',
          mr: 'कर्जांची तुलना या साधनात, “आधी ठरावीक, मग बदलता” दर असलेल्या ऑफरसाठी आता सुरुवातीचा ठरावीक कालावधी आणि नंतरचा दर, दोन्ही आवश्यक आहेत. आधी नंतरचा दर रिकामा ठेवल्यास ऑफरचा हिशेब न सांगता पूर्ण मुदतीसाठी सुरुवातीच्या दरानेच केला जात होता, आणि ती सर्वांत कमी एकूण रकमेची ऑफर ठरू शकत होती. एकरकमी रकमेसाठी आता 1 ते 1,200 मधला पूर्ण महिना लागतो: आधी महिना 12.5 न सांगता महिना 12 केला जात होता, आणि 1,200 नंतरच्या महिन्यातील रक्कम कधीच भरली जात नव्हती. तसेच, स्प्रेडशीट आता एकरकमी रकमांची खूप लांब यादी मध्येच तोडत नाही.',
        },
      },
      {
        id: 'lessons-say-lesson-and-match-tools',
        text: {
          en: 'The lessons and the privacy notice now call a lesson a lesson, where some still said “post”. The lessons speak to you directly where they used to say “we”, and use one set of words, such as maths and current account. Their figure for world stocks now matches the tools: about 5.3% a year after inflation, in US dollars, 1900 to 2025, with a dated correction on each lesson that changed.',
          hi: 'पाठ और प्राइवेसी नोटिस अब पाठ को पाठ ही कहते हैं, जहाँ कुछ जगह अब भी “post” लिखा था। जहाँ पाठ “we” कहते थे, वहाँ अब सीधे आपसे बात करते हैं, और हर जगह एक जैसे शब्द इस्तेमाल करते हैं। दुनिया के शेयरों का उनका आँकड़ा अब टूल से मेल खाता है: 1900 से 2025 तक महँगाई के बाद सालाना लगभग 5.3%, अमेरिकी डॉलर में, और जिस पाठ में यह बदला, उस पर तारीख़ के साथ सुधार दर्ज है।',
          es: 'Las lecciones y el aviso de privacidad llaman ahora lección a una lección, donde algunas aún decían «post». Las lecciones te hablan directamente donde antes decían «we», y usan las mismas palabras en todas partes. Su cifra para las acciones mundiales coincide ahora con la de las herramientas: alrededor de un 5,3\u00a0% anual descontada la inflación, en dólares estadounidenses, de 1900 a 2025, con una corrección fechada en cada lección que cambió.',
          cs: 'Lekce i\u00a0zásady ochrany soukromí teď lekci říkají lekce, kde ještě stálo „post“. Místo „we“ lekce oslovují přímo vás a\u00a0všude používají stejná slova. Jejich údaj o\u00a0světových akciích teď odpovídá nástrojům: zhruba 5,3\u00a0% ročně po očištění o\u00a0inflaci, v\u00a0amerických dolarech, v\u00a0letech 1900 až 2025, s\u00a0datovanou opravou u\u00a0každé lekce, které se to týká.',
          mr: 'धडे आणि गोपनीयता सूचना आता धड्याला धडाच म्हणतात, जिथे काही ठिकाणी अजून “post” लिहिले होते. जिथे धडे “we” म्हणत, तिथे आता थेट तुमच्याशी बोलतात, आणि सगळीकडे एकच शब्द वापरतात. जागतिक शेअरचा त्यांचा आकडा आता साधनांशी जुळतो: 1900 ते 2025 या काळात महागाईनंतर दरवर्षी सुमारे 5.3%, अमेरिकी डॉलरमध्ये, आणि जो धडा बदलला त्यावर तारखेसह दुरुस्ती नोंदवली आहे.',
        },
      },
      {
        id: 'loan-fixed-period-two-countries',
        text: {
          en: 'In the loan comparison, the help under “Initial fixed period” now gives the usual lengths in the UK and in the US, where it gave only the US ones, and a screen reader now reads the help under each box when you move to it. The page’s heading also calls the tool by its name.',
          hi: 'लोन तुलना टूल में, “शुरुआत की तय अवधि” के नीचे की मदद अब ब्रिटेन और अमेरिका दोनों की आम अवधियाँ बताती है, जहाँ पहले सिर्फ़ अमेरिका की थीं, और किसी खाने पर पहुँचने पर स्क्रीन रीडर अब उसके नीचे की मदद भी पढ़ता है। पेज का शीर्षक भी अब टूल को उसके नाम से बुलाता है।',
          es: 'En el comparador de préstamos, la ayuda bajo «Periodo fijo inicial» indica ahora las duraciones habituales en el Reino Unido y en EE.\u00a0UU., donde antes solo daba las de EE.\u00a0UU., y un lector de pantalla lee ahora la ayuda de cada campo al llegar a él.',
          cs: 'Ve srovnání úvěrů teď nápověda pod „Počáteční období fixace“ uvádí obvyklé délky ve Spojeném království i\u00a0v\u00a0USA; dřív jen ty z\u00a0USA. Čtečka obrazovky teď při přechodu na pole přečte i\u00a0nápovědu pod ním.',
          mr: 'कर्जांच्या तुलनेत, “सुरुवातीचा ठरावीक कालावधी” खालची मदत आता UK आणि अमेरिकेतील नेहमीचे कालावधी सांगते, जिथे आधी फक्त अमेरिकेचे होते, आणि एखाद्या रकान्यावर पोहोचल्यावर स्क्रीन रीडर आता त्याखालची मदतही वाचतो. पानाचे शीर्षकही आता साधनाला त्याच्या नावाने ओळखते.',
        },
      },
      {
        id: 'accessibility-page-current',
        text: {
          en: 'The accessibility page is up to date again. Three barriers it listed have been fixed and have left it: the refinance results that changed without a screen reader hearing it, the tool questions’ heading, and text smaller than the reading size on phones. Two more, the copied share link and the charts on a phone, are narrowed to what is still open.',
          hi: 'सुगम्यता वाला पेज फिर से ताज़ा है। उसमें दर्ज तीन रुकावटें ठीक हो गई हैं और सूची से हट गई हैं: रीफ़ाइनेंस के नतीजे जो स्क्रीन रीडर को बताए बिना बदल जाते थे, टूल के सवालों का शीर्षक, और फ़ोन पर पढ़ने के तय आकार से छोटा टेक्स्ट। दो और, कॉपी किया गया शेयर लिंक और फ़ोन पर चार्ट, अब सिर्फ़ उतनी बताती हैं जितनी बाक़ी है।',
          es: 'La página de accesibilidad vuelve a estar al día. Tres barreras que listaba se han corregido y han salido de ella: los resultados de la refinanciación que cambiaban sin que lo oyera un lector de pantalla, el título de las preguntas de las herramientas y el texto más pequeño que el tamaño de lectura en los teléfonos. Otras dos, el enlace copiado para compartir y los gráficos en el teléfono, se limitan ahora a lo que sigue abierto.',
          cs: 'Stránka o\u00a0přístupnosti je zase aktuální. Tři překážky, které uváděla, jsou opravené a\u00a0ze seznamu zmizely: výsledky refinancování, které se měnily, aniž by to čtečka obrazovky oznámila, nadpis otázek u\u00a0nástrojů a\u00a0text menší než velikost pro čtení na telefonech. Další dvě, zkopírovaný odkaz ke sdílení a\u00a0grafy na telefonu, teď popisují jen to, co zůstává otevřené.',
          mr: 'सुलभतेचे पान पुन्हा अद्ययावत आहे. त्यात नोंदलेले तीन अडथळे दुरुस्त झाले आणि यादीतून निघाले: स्क्रीन रीडरला न कळता बदलणारे पुनर्वित्ताचे निकाल, साधनांमधील प्रश्नांचे शीर्षक, आणि फोनवर वाचनाच्या आकारापेक्षा लहान मजकूर. आणखी दोन, कॉपी केलेली शेअर लिंक आणि फोनवरील आलेख, आता फक्त उरलेल्या भागापुरते आहेत.',
        },
      },
      {
        id: 'tools-small-fixes-question-box-links',
        text: {
          en: 'Small fixes in the free tools. In the loan comparison, a box that arrived from a link as “?” keeps saying it could not be read while you edit the rest of that offer, and the tool now names the kind of problem correctly in its anonymous count of offers that cannot be worked out. Share links holding a Unicode minus sign or the Arabic decimal and thousands marks now open with those values. In Invest or pay off, the note under your own return figure no longer says the results are shown while they are held back. And the text in the middle of the net worth chart is drawn at its size from the start.',
          hi: 'मुफ़्त टूल में कुछ छोटे सुधार। लोन तुलना टूल में, लिंक से “?” के साथ आया खाना अब उसी ऑफ़र का बाक़ी हिस्सा बदलते समय भी यही बताता है कि उसे पढ़ा नहीं जा सका, और जिन ऑफ़र का हिसाब नहीं निकल सकता, उनकी बिना नाम की गिनती अब समस्या की सही क़िस्म बताती है। जिन शेयर लिंक में यूनिकोड का माइनस चिह्न या अरबी दशमलव और हज़ार वाले चिह्न हों, वे अब उन्हीं मानों के साथ खुलते हैं। निवेश या कर्ज़ चुकाना टूल में आपके अपने रिटर्न के नीचे की टिप्पणी अब नतीजे रुके होने पर यह नहीं कहती कि वे दिख रहे हैं। और शुद्ध संपत्ति के चार्ट के बीच का टेक्स्ट शुरू से ही अपने आकार में दिखता है।',
          es: 'Pequeños arreglos en las herramientas gratuitas. En el comparador de préstamos, un campo que llegó en un enlace como «?» sigue diciendo que no se pudo leer mientras editas el resto de esa oferta, y el recuento anónimo de ofertas que no se pueden calcular ahora indica correctamente el tipo de problema. Los enlaces para compartir con un signo menos Unicode o con las marcas árabes de decimales y de miles se abren ahora con esos valores. En Invertir o pagar deuda, la nota bajo tu propia rentabilidad ya no dice que los resultados se muestran mientras están en espera. Y el texto del centro del gráfico de patrimonio neto se dibuja a su tamaño desde el principio.',
          cs: 'Drobné opravy v\u00a0nástrojích zdarma. Ve srovnání úvěrů pole, které přišlo v\u00a0odkazu jako „?“, dál hlásí, že ho nelze přečíst, i\u00a0když upravujete zbytek té nabídky, a\u00a0anonymní počet nabídek, které nelze spočítat, teď správně uvádí druh problému. Odkazy ke sdílení se znaménkem minus z\u00a0Unicode nebo s\u00a0arabskou desetinnou čárkou a\u00a0oddělovačem tisíců se teď otevřou s\u00a0těmito hodnotami. V\u00a0nástroji Investovat, nebo splatit dluh už poznámka pod vaším vlastním výnosem netvrdí, že se výsledky zobrazují, dokud jsou pozdržené. A\u00a0text uprostřed grafu čistého jmění má svou velikost od začátku.',
          mr: 'मोफत साधनांत काही छोट्या दुरुस्त्या. कर्जांच्या तुलनेत, लिंकमधून “?” म्हणून आलेला रकाना त्या ऑफरचा बाकी भाग बदलतानाही तो वाचता आला नाही असे सांगत राहतो, आणि ज्या ऑफरचा हिशेब होऊ शकत नाही त्यांची निनावी मोजणी आता समस्येचा प्रकार बरोबर सांगते. युनिकोडचे वजाबाकी चिन्ह किंवा अरबी दशांश आणि हजारांची चिन्हे असलेल्या शेअर लिंक आता त्याच मूल्यांसह उघडतात. गुंतवणूक की कर्जफेड या साधनात तुमच्या स्वतःच्या परताव्याखालची टीप निकाल थांबलेले असताना ते दिसत आहेत असे आता सांगत नाही. आणि निव्वळ संपत्तीच्या आलेखाच्या मध्यभागीचा मजकूर सुरुवातीपासूनच त्याच्या आकारात दिसतो.',
        },
      },
    ],
  },
  {
    date: '2026-11-26',
    items: [
      {
        id: 'tools-name-their-settings',
        text: {
          en: 'The invest or pay off tool and the Monte Carlo simulator now say plainly that their cautious and optimistic rates are settings, chosen either side of the long-run record of world markets (for stocks, about 5.3% a year after inflation from 1900 to 2025, Dimson, Marsh and Staunton), and not the record itself. The rates are the same as before.',
          hi: 'निवेश या कर्ज़ चुकाना टूल और मोंटे कार्लो सिम्युलेटर अब साफ़ बताते हैं कि उनकी सतर्क और आशावादी दरें सेटिंग हैं, जो दुनिया के बाज़ारों के लंबे रिकॉर्ड (शेयरों में 1900 से 2025 तक महँगाई के बाद सालाना लगभग 5.3%, Dimson, Marsh और Staunton) के दोनों ओर चुनी गई हैं, ख़ुद वह रिकॉर्ड नहीं। दरें पहले जैसी ही हैं।',
          es: 'La herramienta Invertir o pagar deuda y el simulador Monte Carlo dicen ahora con claridad que sus tasas prudente y optimista son opciones elegidas a uno y otro lado del historial a largo plazo de los mercados mundiales (en acciones, alrededor de un 5,3\u00a0% anual descontada la inflación de 1900 a 2025, Dimson, Marsh y Staunton), y no ese historial en sí. Las tasas son las mismas que antes.',
          cs: 'Nástroj Investovat, nebo splatit dluh a\u00a0simulátor Monte Carlo teď jasně říkají, že jejich opatrné a\u00a0optimistické hodnoty výnosu jsou nastavení zvolená pod dlouhodobým historickým výnosem světových trhů a\u00a0nad ním (u\u00a0akcií zhruba 5,3\u00a0% ročně po očištění o\u00a0inflaci v\u00a0letech 1900 až 2025, Dimson, Marsh a\u00a0Staunton), ne tento výnos sám. Hodnoty jsou stejné jako dřív.',
          mr: 'गुंतवणूक की कर्जफेड हे साधन आणि मॉन्टे कार्लो सिम्युलेटर आता स्पष्ट सांगतात की त्यांचे सावध आणि आशावादी दर म्हणजे जागतिक बाजारांच्या दीर्घकालीन नोंदीच्या (शेअरसाठी 1900 ते 2025 या काळात महागाईनंतर दरवर्षी सुमारे 5.3%, Dimson, Marsh आणि Staunton) दोन्ही बाजूंना निवडलेल्या सेटिंग्ज आहेत, ती नोंद स्वतः नव्हे. दर पूर्वीइतकेच आहेत.',
        },
      },
      {
        id: 'inflation-years-own-digits',
        text: {
          en: 'In the inflation calculator, the years box now reads Devanagari digits too, like every other box in the free tools: type १० and it counts ten years. Before, that box would not take them at all.',
          hi: 'महँगाई कैलकुलेटर में सालों वाला बॉक्स भी अब देवनागरी अंक पढ़ लेता है, जैसे मुफ़्त टूल के बाकी सभी बॉक्स पढ़ते हैं: १० लिखें तो यह दस साल गिनता है। पहले यह बॉक्स इन अंकों को लेता ही नहीं था।',
          es: 'En la calculadora de inflación, la casilla de los años ya lee también las cifras devanagari, como todas las demás casillas de las herramientas gratuitas: si escribes १०, cuenta diez años. Antes, esa casilla no las aceptaba.',
          cs: 'V\u00a0inflační kalkulačce teď i\u00a0pole s\u00a0počtem let čte dévanágarské číslice, stejně jako všechna ostatní pole v\u00a0nástrojích zdarma: když napíšete १०, počítá s\u00a0deseti lety. Dřív je toto pole vůbec nepřijímalo.',
          mr: 'महागाई कॅल्क्युलेटरमधील वर्षांचा रकानाही आता देवनागरी अंक वाचतो, मोफत साधनांमधील इतर सर्व रकान्यांसारखेच: १० लिहिले तर तो दहा वर्षे मोजतो. आधी हा रकाना हे अंक स्वीकारतच नव्हता.',
        },
      },
      {
        id: 'own-return-table-fits-large-text',
        text: {
          en: 'In the invest or pay off tool, the table that sets your own return figure beside the cautious and optimistic settings no longer pushes the page sideways at very large text sizes. Where its three columns would be cramped, each row now becomes a short list, with every value on its own line.',
          hi: 'निवेश या कर्ज़ चुकाना टूल में, आपके अपने रिटर्न के आँकड़े को सतर्क और आशावादी सेटिंग के बगल में रखने वाली तालिका अब बहुत बड़े अक्षरों में पेज को बाहर नहीं धकेलती, इसलिए दाएँ-बाएँ स्क्रोल नहीं करना पड़ता। जहाँ उसके तीन कॉलम के लिए जगह कम हो, वहाँ हर पंक्ति अब एक छोटी सूची बन जाती है, जिसमें हर आँकड़ा अपनी अलग पंक्ति में होता है।',
          es: 'En la herramienta Invertir o pagar deuda, la tabla que pone tu propia cifra de rentabilidad junto a las opciones prudente y optimista ya no obliga a desplazar la página de lado con el texto muy grande. Donde sus tres columnas quedarían apretadas, cada fila se convierte ahora en una lista corta, con cada valor en su propia línea.',
          cs: 'V nástroji Investovat, nebo splatit dluh už tabulka, která staví vaše vlastní číslo výnosu vedle opatrného a\u00a0optimistického nastavení, při velmi velkém písmu nenutí posouvat stránku do stran. Kde by se její tři sloupce tísnily, změní se teď každý řádek v krátký seznam a každá hodnota má vlastní řádek.',
          mr: 'गुंतवणूक की कर्जफेड या साधनात, तुमचा परताव्याचा आकडा सावध आणि आशावादी सेटिंग्जशेजारी ठेवणाऱ्या तक्त्यामुळे आता खूप मोठ्या अक्षरांत पान आडवे सरकवावे लागत नाही. जिथे त्याच्या तीन स्तंभांना जागा अपुरी पडते, तिथे प्रत्येक ओळ आता एक छोटी यादी बनते, आणि प्रत्येक आकडा स्वतःच्या वेगळ्या ओळीत दिसतो.',
        },
      },
      {
        id: 'inflation-answers-to-latest-month',
        text: {
          en: 'The inflation calculator no longer stops at the last full year for 123 countries. Where a monthly price index is published that matches the yearly figures, an answer from a country’s history now ends at the latest month with a figure, September 2026 for many and July 2026 for most of the rest, and says which figures it joins: the World Bank’s yearly ones up to the last full year, then a monthly index from the BIS or from the World Bank itself. Other countries still end at their last full year, and the answer now says so. Every such answer also says that the starting amount is taken as that year’s average.',
          hi: 'महँगाई कैलकुलेटर अब 123 देशों के लिए आख़िरी पूरे साल पर नहीं रुकता। जहाँ कोई ऐसा मासिक मूल्य सूचकांक प्रकाशित होता है जो सालाना आँकड़ों से मेल खाता है, वहाँ देश के इतिहास से निकला जवाब अब आँकड़े वाले सबसे नए महीने तक जाता है, कई देशों के लिए सितंबर 2026 तक और बाकी में से ज़्यादातर के लिए जुलाई 2026 तक, और बताता है कि इसमें कौन-से आँकड़े जोड़े गए हैं: आख़िरी पूरे साल तक World Bank के सालाना आँकड़े, और उसके बाद BIS का या ख़ुद World Bank का मासिक सूचकांक। बाकी देशों के जवाब अब भी आख़िरी पूरे साल पर रुकते हैं, और जवाब में अब यह लिखा होता है। ऐसे हर जवाब में यह भी लिखा होता है कि शुरुआती रकम को उस साल का औसत माना गया है।',
          es: 'La calculadora de inflación ya no se detiene en el último año completo para 123 países. Donde se publica un índice mensual de precios que coincide con las cifras anuales, la respuesta basada en el historial de un país llega ahora hasta el último mes con cifra, septiembre de 2026 para muchos y julio de 2026 para la mayoría de los demás, y dice qué cifras une: las anuales del Banco Mundial hasta el último año completo y, después, un índice mensual del BIS o del propio Banco Mundial. Los demás países siguen terminando en su último año completo, y la respuesta ahora lo dice. Cada una de estas respuestas dice también que la cantidad inicial se toma como la media de ese año.',
          cs: 'Inflační kalkulačka se u\u00a0123 zemí už nezastavuje u\u00a0posledního celého roku. Kde se zveřejňuje měsíční cenový index, který se shoduje s\u00a0ročními údaji, končí teď odpověď z\u00a0historie země posledním měsícem s\u00a0údajem, u\u00a0mnoha zemí zářím 2026 a\u00a0u\u00a0většiny ostatních červencem 2026, a\u00a0uvádí, které údaje spojuje: roční údaje Světové banky do posledního celého roku a\u00a0poté měsíční index BIS nebo samotné Světové banky. Ostatní země dál končí posledním celým rokem a\u00a0odpověď to teď říká. Každá taková odpověď také uvádí, že se výchozí částka bere jako průměr daného roku.',
          mr: 'महागाई कॅल्क्युलेटर आता 123 देशांसाठी शेवटच्या पूर्ण वर्षावर थांबत नाही. जिथे वार्षिक आकड्यांशी जुळणारा मासिक किंमत निर्देशांक प्रकाशित होतो, तिथे देशाच्या इतिहासावरून काढलेले उत्तर आता आकडा असलेल्या सर्वात अलीकडच्या महिन्यापर्यंत जाते, अनेक देशांसाठी सप्टेंबर 2026\u00a0पर्यंत आणि उरलेल्यांपैकी बहुतेकांसाठी जुलै 2026\u00a0पर्यंत, आणि कोणते आकडे जोडले आहेत ते सांगते: शेवटच्या पूर्ण वर्षापर्यंत World Bank\u00a0चे वार्षिक आकडे, आणि त्यानंतर BIS\u00a0चा किंवा खुद्द World Bank\u00a0चा मासिक निर्देशांक. इतर देशांची उत्तरे अजूनही शेवटच्या पूर्ण वर्षावर थांबतात, आणि उत्तरात आता तसे सांगितलेले असते. अशा प्रत्येक उत्तरात हेही सांगितलेले असते की सुरुवातीची रक्कम त्या वर्षाची सरासरी मानली आहे.',
        },
      },
      {
        id: 'home-planner-button-cookie-answers',
        text: {
          en: 'The home page gives the planner a button again, right after “Read lesson 1”, and both buttons now come before the introduction, so they are easier to find on a small phone. The cookie question’s two answers are easier to reach too: on most screens they stay at the bottom of the panel while its words scroll above them, and on a phone the panel is a little shorter.',
          hi: 'होम पेज पर प्लानर को फिर से अपना बटन मिला है, “पाठ 1 पढ़ें” के ठीक बाद, और दोनों बटन अब परिचय से पहले आते हैं, ताकि छोटे फोन पर वे आसानी से दिखें। कुकी वाले सवाल के दोनों जवाबों तक पहुँचना भी अब आसान है: ज़्यादातर स्क्रीन पर वे सवाल वाले हिस्से में सबसे नीचे टिके रहते हैं और उसके शब्द उनके ऊपर स्क्रॉल होते हैं, और फोन पर यह हिस्सा थोड़ा छोटा भी है।',
          es: 'La página de inicio vuelve a dar al planificador un botón propio, justo después de «Leer la lección 1», y los dos botones van ahora antes de la introducción, para que sea más fácil verlos en un teléfono pequeño. También es más fácil llegar a las dos respuestas de la pregunta sobre cookies: en la mayoría de las pantallas se quedan en la parte de abajo del panel mientras el texto se desplaza por encima, y en un teléfono el panel es un poco más bajo.',
          cs: 'Na úvodní stránce má plánovač znovu vlastní tlačítko, hned za „Přečíst lekci 1“, a\u00a0obě tlačítka jsou teď před úvodním textem, aby byla na malém telefonu lépe vidět. Snáz se teď dostanete i\u00a0k\u00a0oběma odpovědím na otázku na cookies: na většině obrazovek zůstávají u\u00a0spodního okraje panelu, zatímco se text posouvá nad nimi, a\u00a0na telefonu je panel o\u00a0něco nižší.',
          mr: 'मुख्यपृष्ठावर प्लॅनरला पुन्हा स्वतःचे बटण मिळाले आहे, “धडा 1 वाचा” नंतर लगेच, आणि दोन्ही बटणे आता प्रस्तावनेच्या आधी येतात, जेणेकरून लहान फोनवर ती सहज दिसतील. कुकीविषयीच्या प्रश्नाच्या दोन्ही उत्तरांपर्यंत पोहोचणेही आता सोपे झाले आहे: बहुतेक स्क्रीनवर ती प्रश्नाच्या भागात सर्वात खाली राहतात आणि त्याचा मजकूर त्यांच्या वर सरकतो, आणि फोनवर हा भाग थोडा लहान आहे.',
        },
      },
    ],
  },
  {
    date: '2026-11-25',
    items: [
      {
        id: 'swiss-franc-true-minus',
        text: {
          en: 'In the net worth calculator and Invest or pay off, a negative amount in Swiss francs now has a true minus sign, as other currencies already did: “CHF−1,650”, not “CHF-1,650”. A screen reader could skip the hyphen after the currency code, so an amount owed, or a gap in favour of paying off, could be heard as a positive amount.',
          hi: 'शुद्ध संपत्ति (net\u00a0worth) कैलकुलेटर और निवेश या कर्ज़ चुकाना टूल में स्विस फ़्रैंक की शून्य से कम (माइनस) राशि में अब असली माइनस चिह्न है, जैसा दूसरी मुद्राओं में पहले से था: “CHF−1,650”, न कि “CHF-1,650”। स्क्रीन रीडर मुद्रा कोड के बाद का हाइफ़न छोड़ सकता था, इसलिए बकाया राशि, या कर्ज़ चुकाने के पक्ष वाला अंतर, शून्य से ज़्यादा राशि की तरह सुनाई दे सकता था।',
          es: 'En la calculadora de patrimonio neto y en Invertir o pagar deuda, una cantidad negativa en francos suizos ahora lleva un signo menos de verdad, como ya pasaba con otras monedas: «CHF−1,650», no «CHF-1,650». Un lector de pantalla podía saltarse el guion que va tras el código de la moneda, así que una deuda, o una diferencia a favor de pagar la deuda, podía oírse como una cantidad positiva.',
          cs: 'V kalkulačce čistého jmění a v nástroji Investovat, nebo splatit dluh má teď záporná částka ve švýcarských francích skutečné znaménko minus, jako ho už měly ostatní měny: „CHF−1,650“, ne „CHF-1,650“. Čtečka obrazovky mohla spojovník za kódem měny přeskočit, takže dluh nebo rozdíl ve prospěch splacení mohl znít jako kladná částka.',
          mr: 'निव्वळ संपत्ती (net\u00a0worth) कॅल्क्युलेटर आणि गुंतवणूक की कर्जफेड या साधनांमध्ये स्विस फ्रँकमधील शून्यापेक्षा कमी (मायनस) रकमेला आता खरे मायनस चिन्ह आहे, जसे इतर चलनांना आधीपासून होते: “CHF−1,650”, “CHF-1,650” नाही. स्क्रीन रीडर चलन कोडनंतरचा हायफन वगळू शकत होता, त्यामुळे देणे असलेली रक्कम, किंवा कर्जफेडीच्या बाजूचा फरक, शून्यापेक्षा जास्त रकमेसारखा ऐकू येऊ शकत होता.',
        },
      },
      {
        id: 'tools-write-numbers-right',
        text: {
          en: 'The free tools now write numbers more carefully. When prices fell over the years you chose, the inflation calculator says they fell, instead of “rose about −28%”, and over a single year it no longer writes “those 1 year”. A short amount just under a million now reads 1M, not 1000K. A negative figure in a printed table, and a rate below zero in Invest or pay off, carry the same minus sign as the amounts beside them, and an amount just below zero shows as 0. The net worth calculator now marks an amount written as 1.5e5 or 0x10 as one it cannot read, instead of taking it for a number.',
          hi: 'मुफ़्त टूल अब संख्याएँ ज़्यादा सावधानी से लिखते हैं। चुने गए सालों में क़ीमतें घटी हों, तो महँगाई कैलकुलेटर अब “लगभग −28% बढ़ीं” की जगह यही बताता है कि वे घटीं, और एक साल के लिए “इन 1 साल” नहीं लिखता। दस लाख से ज़रा कम की छोटी लिखी रक़म अब 1000K नहीं, 1M पढ़ी जाती है। छपी तालिका में शून्य से कम संख्या पर, और निवेश या कर्ज़ चुकाना टूल में शून्य से कम दर पर, अब वही माइनस चिह्न लगता है जो पास की रक़मों पर, और शून्य से ज़रा कम रक़म 0 दिखती है। शुद्ध संपत्ति कैलकुलेटर अब 1.5e5 या 0x10 जैसी लिखी रक़म को संख्या नहीं मानता, बल्कि बताता है कि उसे पढ़ा नहीं जा सकता।',
          es: 'Las herramientas gratuitas ahora escriben los números con más cuidado. Cuando los precios bajaron en los años elegidos, la calculadora de inflación dice que bajaron, en lugar de «subieron alrededor de un −28\u00a0%», y para un solo año ya no escribe «esos 1 año». Una cantidad abreviada justo por debajo del millón ahora se lee 1M, no 1000K. Una cifra negativa en una tabla impresa, y una tasa por debajo de cero en Invertir o pagar deuda, llevan el mismo signo menos que las cantidades de al lado, y una cantidad apenas por debajo de cero se muestra como 0. La calculadora de patrimonio neto ahora marca una cantidad escrita como 1.5e5 o 0x10 como ilegible, en lugar de tomarla por un número.',
          cs: 'Nástroje zdarma teď píšou čísla pečlivěji. Když ceny ve zvolených letech klesly, inflační kalkulačka napíše, že klesly, a\u00a0ne „vzrostly zhruba o\u00a0−28\u00a0%“, a\u00a0pro jediný rok už nepíše „za 1 rok“ s\u00a0průměrem, který je stejný jako celek. Zkrácená částka těsně pod milionem se teď čte 1M, ne 1000K. Záporné číslo v\u00a0tištěné tabulce i\u00a0záporná sazba v\u00a0nástroji Investovat, nebo splatit dluh mají stejné znaménko minus jako částky vedle nich a\u00a0částka těsně pod nulou se ukáže jako 0. Kalkulačka čistého jmění teď částku zapsanou jako 1.5e5 nebo 0x10 označí jako nečitelnou, místo aby ji brala jako číslo.',
          mr: 'मोफत साधने आता संख्या अधिक काळजीपूर्वक लिहितात. निवडलेल्या वर्षांत किमती घटल्या असतील, तर महागाई कॅल्क्युलेटर आता “सुमारे −28% वाढल्या” ऐवजी त्या घटल्या असे सांगतो, आणि एका वर्षासाठी “1 वर्ष” असा कालावधी आणि तेवढीच सरासरी पुन्हा लिहीत नाही. दहा लाखांपेक्षा जरा कमी असलेली छोटी लिहिलेली रक्कम आता 1000K नव्हे, तर 1M वाचली जाते. छापलेल्या तक्त्यातील शून्यापेक्षा कमी आकड्यावर, आणि गुंतवणूक की कर्जफेड साधनातील शून्यापेक्षा कमी दरावर, आता शेजारच्या रकमांवर असते तेच उणे चिन्ह लागते, आणि शून्यापेक्षा जरा कमी रक्कम 0 दिसते. निव्वळ संपत्ती कॅल्क्युलेटर आता 1.5e5 किंवा 0x10 अशी लिहिलेली रक्कम संख्या म्हणून वाचत नाही, तर ती वाचता येत नाही असे सांगतो.',
        },
      },
      {
        id: 'charts-even-years-no-stray-zero',
        text: {
          en: 'Small fixes in the free tools. In printed and saved reports, the years under the chart are now evenly spaced. In Invest or pay off, the range chart no longer draws a zero line that no bar reaches. In the net worth calculator, your spending currency is no longer marked “Low” when exchange rates cannot be loaded, and an error in an imported CSV names the line as your spreadsheet or text editor numbers it, counting blank lines. A net worth link made by the calculator’s first version, in May, now says it can no longer be opened, instead of opening an empty form.',
          hi: 'मुफ़्त टूल में कुछ छोटे सुधार। छपी या सहेजी गई रिपोर्ट में चार्ट के नीचे के साल अब बराबर दूरी पर होते हैं। निवेश या कर्ज़ चुकाना टूल में दायरे वाला चार्ट अब ऐसी शून्य रेखा नहीं खींचता जिस तक कोई पट्टी नहीं पहुँचती। शुद्ध संपत्ति कैलकुलेटर में विनिमय दरें न मिल पाने पर आपकी खर्च की मुद्रा पर अब “कम” नहीं लिखा जाता, और आयात की गई CSV में ग़लती अब वही पंक्ति संख्या बताती है जो आपकी स्प्रेडशीट या टेक्स्ट एडिटर में दिखती है, खाली पंक्तियाँ गिनकर। कैलकुलेटर के पहले संस्करण से मई में बना शुद्ध संपत्ति का लिंक खाली फ़ॉर्म खोलने के बजाय बताता है कि उसे अब खोला नहीं जा सकता।',
          es: 'Pequeños arreglos en las herramientas gratuitas. En los informes impresos o guardados, los años bajo el gráfico están ahora igual de espaciados. En Invertir o pagar deuda, el gráfico de rangos ya no dibuja una línea de cero a la que no llega ninguna barra. En la calculadora de patrimonio neto, tu moneda de gasto ya no aparece como “Bajo” cuando no se pueden cargar los tipos de cambio, y un error en un CSV importado indica la línea tal como la numera tu hoja de cálculo o tu editor de texto, contando las líneas en blanco. Un enlace del patrimonio neto creado con la primera versión de la calculadora, en mayo, ahora avisa de que ya no se puede abrir, en lugar de abrir un formulario vacío.',
          cs: 'Drobné opravy v nástrojích zdarma. V tištěných a uložených zprávách jsou roky pod grafem teď rozmístěné rovnoměrně. V nástroji Investovat, nebo splatit dluh už graf rozpětí nekreslí nulovou čáru, ke které nedosahuje žádný pruh. V kalkulačce čistého jmění už vaše měna výdajů není označená jako „Nízká“, když se nepodaří načíst směnné kurzy, a chyba v importovaném CSV uvádí řádek tak, jak ho čísluje vaše tabulka nebo textový editor, včetně prázdných řádků. Odkaz na čisté jmění z\u00a0první verze kalkulačky z\u00a0května teď oznámí, že ho už nelze otevřít, místo aby otevřel prázdný formulář.',
          mr: 'मोफत साधनांत काही छोट्या दुरुस्त्या. छापील किंवा जतन केलेल्या अहवालात आलेखाखालची वर्षे आता समान अंतरावर असतात. गुंतवणूक की कर्जफेड या साधनात श्रेणीचा आलेख आता अशी शून्य रेषा काढत नाही जिथपर्यंत कोणतीही पट्टी पोहोचत नाही. निव्वळ संपत्ती कॅल्क्युलेटरमध्ये विनिमय दर मिळू शकले नाहीत तर तुमच्या खर्चाच्या चलनावर आता “कमी” असे लिहिले जात नाही, आणि आयात केलेल्या CSV मधील चूक आता तुमच्या स्प्रेडशीटमध्ये किंवा टेक्स्ट एडिटरमध्ये दिसणारा तोच ओळ क्रमांक सांगते, रिकाम्या ओळी मोजून. कॅल्क्युलेटरच्या पहिल्या आवृत्तीने मेमध्ये तयार झालेली निव्वळ संपत्तीची लिंक रिकामा फॉर्म उघडण्याऐवजी ती आता उघडता येत नाही असे सांगते.',
        },
      },
      {
        id: 'tools-timing-fixes',
        text: {
          en: 'In the inflation calculator and Invest or pay off, a country’s inflation history no longer says it could not load when you leave that country while it is loading and then come back. In the net worth calculator, the note that an amount cannot be read now waits until you stop typing. Invest or pay off no longer reads a shared link’s result aloud to a screen reader as the page opens, and its anonymous count of comparisons now leaves out the example it opens with.',
          hi: 'महँगाई कैलकुलेटर और निवेश या कर्ज़ चुकाना वाले टूल में, किसी देश का इतिहास लोड होते समय उस देश से हटकर वापस आने पर अब यह नहीं कहा जाता कि इतिहास लोड नहीं हो सका। शुद्ध संपत्ति कैलकुलेटर में, रकम पढ़ी न जा सकने की सूचना अब टाइप करना रुकने के बाद ही दिखती है। निवेश या कर्ज़ चुकाना वाला टूल अब पेज खुलते ही शेयर लिंक का नतीजा स्क्रीन रीडर पर नहीं पढ़ता, और तुलनाओं की उसकी बिना नाम की गिनती में अब पेज के साथ खुलने वाला उदाहरण शामिल नहीं होता।',
          es: 'En la calculadora de inflación y en Invertir o pagar deuda, la historia de inflación de un país ya no dice que no se pudo cargar si dejas ese país mientras carga y luego vuelves a él. En la calculadora de patrimonio neto, el aviso de que una cantidad no se puede leer ahora espera a que dejes de escribir. Invertir o pagar deuda ya no hace que el lector de pantalla lea el resultado de un enlace compartido al abrirse la página, y su recuento anónimo de comparaciones ya no incluye el ejemplo con el que se abre.',
          cs: 'V kalkulačce inflace a v nástroji Investovat, nebo splatit dluh už historie inflace země nehlásí, že se ji nepodařilo načíst, když zemi během načítání opustíte a pak se k ní vrátíte. V kalkulačce čistého jmění se upozornění, že částku nelze přečíst, teď objeví až ve chvíli, kdy přestanete psát. Nástroj Investovat, nebo splatit dluh už nenechá čtečku obrazovky při otevření stránky přečíst výsledek ze sdíleného odkazu a do jeho anonymního počtu srovnání se už nezapočítává příklad, se kterým se otevírá.',
          mr: 'महागाई कॅल्क्युलेटर आणि गुंतवणूक की कर्जफेड या साधनांमध्ये, एखाद्या देशाचा इतिहास लोड होत असताना तो देश सोडून परत आल्यावर आता इतिहास लोड होऊ शकला नाही असे सांगितले जात नाही. निव्वळ संपत्ती कॅल्क्युलेटरमध्ये रक्कम वाचता येत नसल्याची सूचना आता टाइप करणे थांबल्यानंतरच दिसते. गुंतवणूक की कर्जफेड हे साधन आता पान उघडताच शेअर लिंकचा निकाल स्क्रीन रीडरवर वाचून दाखवत नाही, आणि तुलनांच्या त्याच्या निनावी मोजणीत आता पानासोबत उघडणारे उदाहरण धरले जात नाही.',
        },
      },
    ],
  },
  {
    date: '2026-11-23',
    items: [
      {
        id: 'tools-flag-unreadable-values',
        text: {
          en: 'In all five free tools, a box with a value that cannot be read now says so, and the results that depend on it wait until it is fixed. A share link or a change of language keeps such a box marked with a question mark. Before, it could turn into another number, and the results still looked right.',
          hi: 'पाँचों मुफ़्त टूल में जो मान पढ़ा नहीं जा सकता, उसका खाना अब यह बताता है, और उस पर टिके नतीजे उसके ठीक होने तक नहीं दिखते। शेयर लिंक या भाषा बदलने पर वह खाना प्रश्नचिह्न के साथ ही पहुँचता है। पहले वह किसी दूसरी संख्या में बदल सकता था, और नतीजे फिर भी सही लगते थे।',
          es: 'En las cinco herramientas gratuitas, un campo con un valor que no se puede leer ahora lo indica, y los resultados que dependen de él esperan hasta que se corrija. Un enlace para compartir o un cambio de idioma mantiene ese campo marcado con un signo de interrogación. Antes podía convertirse en otro número, y los resultados seguían pareciendo correctos.',
          cs: 'Ve všech pěti nástrojích zdarma teď pole s\u00a0hodnotou, kterou nelze přečíst, na to upozorní a\u00a0výsledky, které na ní závisejí, počkají na opravu. Odkaz ke sdílení i\u00a0změna jazyka takové pole zachovají označené otazníkem. Dřív se mohlo změnit na jiné číslo a\u00a0výsledky přitom vypadaly správně.',
          mr: 'पाचही मोफत साधनांत वाचता न येणारे मूल्य असलेला रकाना आता तसे सांगतो, आणि त्यावर अवलंबून असलेले निकाल ते दुरुस्त होईपर्यंत दिसत नाहीत. शेअर लिंक किंवा भाषा बदलल्यावर तो रकाना प्रश्नचिन्हासहच पोहोचतो. आधी त्याचे दुसऱ्या संख्येत रूपांतर होऊ शकत होते, आणि निकाल तरीही बरोबर वाटत.',
        },
      },
      {
        id: 'language-switch-keeps-current-choices',
        text: {
          en: 'In the Monte Carlo simulator, the inflation calculator and Invest or pay off, changing the language now keeps the form as it stands, including choices you made while a box contained an error. Before, those choices were lost, so the other language could open with a different setup.',
          hi: 'Monte Carlo, महँगाई और निवेश या कर्ज़ चुकाना वाले टूल में भाषा बदलने पर अब फ़ॉर्म की मौजूदा स्थिति बनी रहती है, जिसमें किसी खाने में त्रुटि होने के दौरान किए गए चुनाव भी शामिल हैं। पहले ये चुनाव खो जाते थे, इसलिए दूसरी भाषा में अलग सेटिंग आ सकती थी।',
          es: 'En el simulador Monte Carlo, la calculadora de inflación e Invertir o pagar deuda, cambiar de idioma ahora conserva el formulario tal como está, incluidas las opciones elegidas mientras había un error en un campo. Antes, esas opciones se perdían, por lo que en el otro idioma podía aparecer una configuración distinta.',
          cs: 'V\u00a0nástrojích Monte Carlo, inflace a\u00a0Investovat, nebo splatit dluh nyní přepnutí jazyka zachovává aktuální stav formuláře včetně voleb provedených v\u00a0době, kdy některé pole obsahovalo chybu. Dříve se tyto volby ztrácely, takže se v\u00a0druhém jazyce mohlo zobrazit jiné nastavení.',
          mr: 'Monte Carlo, महागाई आणि गुंतवणूक की कर्जफेड या साधनांमध्ये भाषा बदलल्यावर आता फॉर्मची सध्याची स्थिती कायम राहते, एखाद्या रकान्यात त्रुटी असताना केलेल्या निवडींसह. आधी या निवडी हरवत होत्या, त्यामुळे दुसऱ्या भाषेत वेगळी मांडणी दिसू शकत होती.',
        },
      },
      {
        id: 'long-lists-have-clear-limits',
        text: {
          en: 'The net worth calculator used to silently drop rows after the 50th from links and language switches, and switching languages calculated the total from that shorter list. Now the form, CSV, links, and language switching share a limit of 500 rows; the form and CSV previously had no limit. A CSV with more than 500 rows is refused in full, as are links or lists detected as incomplete. In loan comparison, a list of more than 1,200 lump sums in one offer is invalid; previously, lists longer than 200 characters disappeared from links.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर पहले लिंक और भाषा बदलते समय 50वीं पंक्ति के बाद की पंक्तियाँ बिना बताए हटा देता था, और भाषा बदलने पर उसी छोटी सूची से कुल निकालता था। अब फ़ॉर्म, CSV, लिंक और भाषा बदलने के लिए 500 पंक्तियों की एक ही सीमा है; फ़ॉर्म और CSV पर पहले कोई सीमा नहीं थी। 500 से अधिक पंक्तियों वाली CSV पूरी तरह अस्वीकार होती है, और अधूरे पाए गए लिंक या सूचियाँ भी अस्वीकार होती हैं। लोन तुलना टूल में एक ऑफ़र के लिए 1,200 से अधिक एकमुश्त भुगतानों की सूची अमान्य है; पहले 200 से अधिक अक्षरों वाली सूची लिंक से गायब हो जाती थी।',
          es: 'La calculadora de patrimonio neto antes descartaba sin avisar las filas posteriores a la 50 en los enlaces y al cambiar de idioma, y calculaba el total de esa lista más corta tras el cambio. Ahora el formulario, los CSV, los enlaces y el cambio de idioma comparten un límite de 500 filas; antes, el formulario y los CSV no tenían límite. Un CSV con más de 500 filas se rechaza por completo, al igual que los enlaces o listas detectados como incompletos. En el comparador de préstamos, una lista de más de 1200 pagos extraordinarios en una oferta no es válida; antes, las listas de más de 200 caracteres desaparecían de los enlaces.',
          cs: 'Kalkulačka čistého jmění dříve v\u00a0odkazech a\u00a0při přepnutí jazyka bez upozornění vynechávala řádky po 50.\u00a0řádku a\u00a0po přepnutí počítala součet z\u00a0tohoto kratšího seznamu. Nyní platí jednotný limit 500 řádků pro formulář, CSV, odkazy i\u00a0přepnutí jazyka; formulář a\u00a0CSV dříve žádný limit neměly. CSV s\u00a0více než 500 řádky se odmítne celé, stejně jako odkazy nebo seznamy rozpoznané jako neúplné. Ve srovnání úvěrů je seznam s\u00a0více než 1\u00a0200 jednorázovými splátkami v\u00a0jedné nabídce neplatný; dříve seznamy delší než 200 znaků z\u00a0odkazů mizely.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटरमध्ये आधी लिंक तयार करताना आणि भाषा बदलताना 50व्या ओळीनंतरच्या ओळी न सांगता वगळल्या जात होत्या, आणि भाषा बदलल्यावर त्या लहान यादीवरून एकूण मोजले जात होते. आता फॉर्म, CSV, लिंक आणि भाषा बदलणे यांसाठी 500 ओळींची एकच मर्यादा आहे; फॉर्म आणि CSV यांना आधी मर्यादा नव्हती. 500\u00a0पेक्षा जास्त ओळी असलेली CSV पूर्णपणे नाकारली जाते, तसेच अपूर्ण आढळलेल्या लिंक किंवा याद्याही नाकारल्या जातात. कर्जांची तुलना करताना एका ऑफरमध्ये 1,200\u00a0पेक्षा जास्त एकरकमी भरण्यांची यादी अवैध ठरते; आधी 200\u00a0पेक्षा जास्त अक्षरांची यादी लिंकमधून गायब होत होती.',
        },
      },
      {
        id: 'missing-rates-show-a-subtotal',
        text: {
          en: 'When an exchange rate was missing, the net worth calculator used to show “Total net worth” and shares based only on the other currencies, and a share link presented that result as complete. If every rate is missing, it shows no total; otherwise it shows “Total excluding currencies with missing rates”, keeps the original amount on that currency’s card, and omits shares, bands, and the chart for sender and recipient, in the report, and in the spreadsheet. A redacted share link cannot be made while an exchange rate is missing or a row is unreadable. An older link that cannot confirm whether every currency was included shows no total or shares.',
          hi: 'विनिमय दर उपलब्ध न होने पर शुद्ध संपत्ति कैलकुलेटर पहले केवल बाकी मुद्राओं के आधार पर “कुल शुद्ध संपत्ति” और प्रतिशत हिस्से दिखाता था, और शेयर लिंक उस नतीजे को पूरा दिखाता था। अगर सभी विनिमय दरें अनुपलब्ध हैं, तो कोई कुल नहीं दिखता; अन्यथा “जिन मुद्राओं की विनिमय दरें उपलब्ध नहीं हैं, उन्हें छोड़कर कुल” दिखता है, उस मुद्रा के कार्ड पर मूल रकम बनी रहती है, और भेजने व पाने वाले दोनों के लिए, रिपोर्ट और स्प्रेडशीट में प्रतिशत हिस्से, स्तर और चार्ट नहीं दिखते। विनिमय दर उपलब्ध न होने या किसी पंक्ति को पढ़ा न जा सकने पर रकम और नाम छिपाकर शेयर लिंक नहीं बनाया जा सकता। अगर कोई पुराना लिंक यह पुष्टि नहीं कर सकता कि हर मुद्रा शामिल थी, तो उसमें कुल और प्रतिशत हिस्से नहीं दिखते।',
          es: 'Cuando faltaba un tipo de cambio, la calculadora de patrimonio neto antes mostraba «Patrimonio neto total» y porcentajes basados solo en las demás monedas, y el enlace para compartir presentaba ese resultado como completo. Si faltan todos los tipos de cambio, no muestra ningún total; en caso contrario, muestra «Total sin las monedas con tipos de cambio no disponibles», conserva la cantidad original en la tarjeta de esa moneda y omite los porcentajes, los niveles y el gráfico para quien envía y quien recibe, en el informe y en la hoja de cálculo. No se puede crear un enlace para compartir de la versión con datos ocultos si falta un tipo de cambio o no se puede leer una fila. Un enlace antiguo que no permita confirmar si se incluyeron todas las monedas no muestra el total ni los porcentajes.',
          cs: 'Když chyběl směnný kurz, kalkulačka čistého jmění dříve zobrazovala „Celkové čisté jmění“ a\u00a0procentní podíly pouze podle ostatních měn a\u00a0odkaz ke sdílení tento výsledek představoval jako úplný. Pokud chybějí všechny kurzy, nezobrazuje žádný součet; jinak zobrazuje „Součet bez měn s\u00a0chybějícími kurzy“, ponechává původní částku na kartě dané měny a\u00a0nezobrazuje procentní podíly, pásma ani graf odesílateli a\u00a0příjemci, v\u00a0sestavě ani v\u00a0tabulce. Odkaz ke sdílení verze se skrytými údaji nelze vytvořit, pokud chybí směnný kurz nebo je některý řádek nečitelný. Starší odkaz, u\u00a0kterého nelze potvrdit zahrnutí všech měn, nezobrazuje součet ani procentní podíly.',
          mr: 'विनिमय दर उपलब्ध नसताना निव्वळ संपत्ती कॅल्क्युलेटर आधी फक्त इतर चलनांवर आधारित “एकूण निव्वळ संपत्ती” आणि टक्केवारीतील हिस्से दाखवत होता, आणि शेअर लिंक तो निकाल पूर्ण असल्याप्रमाणे दाखवत होती. सर्व विनिमय दर उपलब्ध नसल्यास एकूण दिसत नाही; अन्यथा “विनिमय दर उपलब्ध नसलेल्या चलनांना वगळून एकूण” दिसते, त्या चलनाच्या कार्डवर मूळ रक्कम कायम राहते, आणि पाठवणाऱ्या व प्राप्त करणाऱ्या दोघांसाठी, अहवालात आणि स्प्रेडशीटमध्ये टक्केवारीतील हिस्से, पट्टे आणि आलेख दिसत नाहीत. विनिमय दर उपलब्ध नसताना किंवा एखादी ओळ वाचता येत नसताना रकमा लपवलेली आवृत्ती शेअर करण्यासाठी लिंक तयार करता येत नाही. सर्व चलनांचा समावेश होता का याची खात्री न देणाऱ्या जुन्या लिंकमध्ये एकूण किंवा टक्केवारीतील हिस्से दिसत नाहीत.',
        },
      },
      {
        id: 'edited-shared-net-worth-is-yours',
        text: {
          en: 'When you edit a net worth view someone shared, it becomes your own, worked out from what is in the form at the rates on your page. Before, the sender’s total could stay over your edits.',
          hi: 'किसी की साझा की हुई शुद्ध संपत्ति में बदलाव करने पर अब वह आपकी अपनी हो जाती है, और आपके पेज की दरों पर फ़ॉर्म में मौजूद जानकारी से गणना होती है। पहले बदलाव के बाद भी भेजने वाले का कुल दिखता रह सकता था।',
          es: 'Al editar un patrimonio neto compartido, ahora pasa a ser el tuyo y se calcula con lo que hay en el formulario y los tipos de tu página. Antes, el total de quien lo envió podía mantenerse sobre tus cambios.',
          cs: 'Když upravíte sdílené čisté jmění, stane se vaším a\u00a0počítá se z\u00a0toho, co je ve formuláři, podle kurzů na vaší stránce. Dřív mohl nad vašimi úpravami zůstat součet odesílatele.',
          mr: 'कोणी शेअर केलेल्या निव्वळ संपत्तीत बदल केल्यावर आता ती तुमची स्वतःची होते, आणि तुमच्या पानावरील दरांनुसार फॉर्ममधील माहितीवरून मोजली जाते. आधी बदलानंतरही पाठवणाऱ्याचे एकूण दिसत राहू शकत होते.',
        },
      },
      {
        id: 'one-wording-in-every-language',
        text: {
          en: 'The site’s wording is more consistent in all five languages. The same thing has the same name from page to page, I say “I” where I’m the one acting, English follows one spelling (British, with -ize endings), and more terms are explained where a lesson or guide first uses them. The email boxes now show a short “Email” hint, and an invalid confirmation link says why it may not work.',
          hi: 'साइट के शब्द अब पाँचों भाषाओं में ज़्यादा एक जैसे हैं। एक चीज़ का नाम हर पेज पर एक ही है, जहाँ बात मेरे अपने काम की है वहाँ अब “मैं” लिखा है, अंग्रेज़ी में एक ही वर्तनी चलती है (ब्रिटिश, -ize के साथ), और ज़्यादा शब्दों का मतलब पाठ या गाइड में उनके पहले इस्तेमाल पर ही बताया गया है। ईमेल के बॉक्स में अब छोटा सा “ईमेल” संकेत दिखता है, और पुष्टि का लिंक अमान्य हो तो पेज बताता है कि ऐसा क्यों हो सकता है।',
          es: 'Los textos del sitio son más coherentes en los cinco idiomas. Cada cosa se llama igual en todas las páginas, hablo en primera persona del singular cuando actúo yo, el inglés sigue una sola ortografía (británica, con -ize) y se explican más términos la primera vez que aparecen en una lección o guía. Los campos de correo muestran ahora una pista breve, «Correo», y un enlace de confirmación no válido explica por qué puede no funcionar.',
          cs: 'Texty webu jsou ve všech pěti jazycích jednotnější. Stejná věc se jmenuje stejně na každé stránce, kde něco dělám já, píšu „já“, angličtina má jeden pravopis (britský, s\u00a0koncovkou -ize) a\u00a0víc pojmů je vysvětlených tam, kde je lekce nebo návod používá poprvé. Pole pro e-mail teď mají krátkou nápovědu „E-mail“ a\u00a0neplatný potvrzovací odkaz říká, proč možná nefunguje.',
          mr: 'साइटवरील शब्द आता पाचही भाषांमध्ये अधिक एकसारखे आहेत. एकाच गोष्टीचे नाव प्रत्येक पानावर तेच आहे, जिथे काम माझे स्वतःचे आहे तिथे आता “मी” लिहिले आहे, इंग्रजीत एकच लेखनपद्धती वापरली जाते (ब्रिटिश, -ize सह), आणि अधिक शब्दांचा अर्थ धड्यात किंवा मार्गदर्शिकेत ते पहिल्यांदा येतात तिथेच सांगितला आहे. ईमेलच्या चौकटीत आता “ईमेल” अशी छोटी सूचना दिसते, आणि पुष्टीची लिंक अवैध असल्यास पान तसे का असू शकते ते सांगते.',
        },
      },
    ],
  },
  {
    date: '2026-11-22',
    items: [
      {
        id: 'learning-path-lists-every-lesson',
        text: {
          en: 'The learning path page now lists every lesson and how-to guide under “Find a lesson”, grouped by level in sections you can open and close, so you can see everything there is and go straight to any of it. The page is also lighter, and its links work even with JavaScript turned off. Search, your reading progress and the level helper work as before.',
          hi: 'सीखने के रास्ते वाला पेज अब “पाठ खोजें” के नीचे हर पाठ और हर गाइड की सूची दिखाता है, स्तर के हिसाब से ऐसे हिस्सों में जिन्हें आप खोल और बंद कर सकते हैं, ताकि सब कुछ एक साथ दिखे और आप सीधे किसी पर भी जा सकें। पेज अब हल्का भी है, और इसके लिंक JavaScript बंद होने पर भी काम करते हैं। खोज, आपकी पढ़ाई की प्रगति और स्तर चुनने में मदद पहले की तरह काम करते हैं।',
          es: 'La página de la ruta de aprendizaje muestra ahora todas las lecciones y guías bajo «Encuentra una lección», agrupadas por nivel en secciones que puedes abrir y cerrar, para que veas todo lo que hay y vayas directamente a lo que quieras. La página también es más ligera, y sus enlaces funcionan aunque JavaScript esté desactivado. La búsqueda, tu progreso de lectura y la ayuda para elegir nivel funcionan como antes.',
          cs: 'Stránka vzdělávací cesty teď pod nadpisem „Najít lekci“ uvádí všechny lekce a\u00a0návody, seřazené podle úrovní do oddílů, které můžete otevřít a\u00a0zavřít, takže vidíte všechno najednou a\u00a0můžete rovnou otevřít cokoli z\u00a0toho. Stránka je také lehčí a\u00a0její odkazy fungují i\u00a0s\u00a0vypnutým JavaScriptem. Vyhledávání, váš postup ve čtení a\u00a0pomocník s\u00a0výběrem úrovně fungují jako dosud.',
          mr: 'शिकण्याच्या मार्गाचे पान आता “धडा शोधा” खाली प्रत्येक धडा आणि प्रत्येक मार्गदर्शिका दाखवते, पातळीनुसार अशा विभागांत जे तुम्ही उघडू आणि बंद करू शकता, त्यामुळे सगळे एकत्र दिसते आणि हवे त्यावर थेट जाता येते. पान आता हलकेही आहे, आणि त्यातील लिंक JavaScript बंद असतानाही चालतात. शोध, तुमची वाचनाची प्रगती आणि पातळी निवडण्यासाठीची मदत पूर्वीप्रमाणेच चालतात.',
        },
      },
      {
        id: 'privacy-changelog-pages',
        text: {
          en: 'The privacy notice now shows its latest three changes, and the complete record of every change, kept word for word, has its own pages, one for each year. Each change there has a permanent link, so it can be shared or found again.',
          hi: 'प्राइवेसी नोटिस में अब उसके सबसे नए तीन बदलाव दिखते हैं, और हर बदलाव का पूरा रिकॉर्ड, शब्द-ब-शब्द, अब अपने पेजों पर है, हर साल का एक पेज। वहाँ हर बदलाव का एक स्थायी लिंक है, ताकि उसे शेयर किया जा सके या बाद में फिर ढूँढा जा सके।',
          es: 'El aviso de privacidad muestra ahora sus tres últimos cambios, y el registro completo de todos los cambios, palabra por palabra, tiene sus propias páginas, una por año. Cada cambio tiene allí un enlace permanente, para compartirlo o volver a encontrarlo.',
          cs: 'Zásady ochrany soukromí teď ukazují své tři nejnovější změny a\u00a0úplný přehled všech změn, slovo od slova, má vlastní stránky, jednu pro každý rok. Každá změna tam má trvalý odkaz, takže ji jde sdílet nebo znovu najít.',
          mr: 'गोपनीयता सूचनेत आता तिचे सर्वात अलीकडचे तीन बदल दिसतात, आणि प्रत्येक बदलाची संपूर्ण नोंद, जशी लिहिली तशीच, आता स्वतंत्र पानांवर आहे, प्रत्येक वर्षासाठी एक पान. तिथे प्रत्येक बदलाला एक कायमची लिंक आहे, त्यामुळे तो शेअर करता येतो किंवा नंतर पुन्हा शोधता येतो.',
        },
      },
    ],
  },
  {
    date: '2026-11-21',
    items: [
      {
        id: 'cookie-question-at-the-bottom',
        text: {
          en: 'The cookie question no longer covers the page on your first visit. It now sits at the bottom of the screen, or in a corner on a wider screen, and you can read and use the site before you answer. Until you do, clicks are not recorded, as before. With a keyboard or a screen reader, a “Cookie choices” link right after “Skip to content” leads to it.',
          hi: 'पहली बार आने पर कुकी वाला सवाल अब पूरे पेज को नहीं ढकता। यह अब स्क्रीन के नीचे रहता है, या चौड़ी स्क्रीन पर एक कोने में, और जवाब देने से पहले भी आप साइट पढ़ और इस्तेमाल कर सकते हैं। जब तक आप जवाब नहीं देते, क्लिक पहले की तरह दर्ज नहीं होते। कीबोर्ड या स्क्रीन रीडर से “मुख्य सामग्री पर जाएँ” के ठीक बाद वाला “कुकी के विकल्प” लिंक वहाँ ले जाता है।',
          es: 'La pregunta sobre cookies ya no tapa la página en tu primera visita. Ahora está en la parte de abajo de la pantalla, o en una esquina si la pantalla es ancha, y puedes leer y usar el sitio antes de responder. Mientras no respondas, los clics no se registran, como antes. Con teclado o lector de pantalla, el enlace «Opciones de cookies», justo después de «Saltar al contenido», lleva hasta ella.',
          cs: 'Otázka na cookies už při první návštěvě nezakrývá stránku. Je teď dole na obrazovce, na širší obrazovce v rohu, a web můžete číst a používat ještě před odpovědí. Dokud neodpovíte, kliknutí se jako dosud nezaznamenávají. Z klávesnice nebo se čtečkou obrazovky k ní vede odkaz „Volby cookies“ hned za odkazem „Přeskočit na obsah“.',
          mr: 'पहिल्यांदा आल्यावर कुकीविषयीचा प्रश्न आता संपूर्ण पान झाकत नाही. तो आता स्क्रीनच्या तळाशी असतो, किंवा रुंद स्क्रीनवर एका कोपऱ्यात, आणि उत्तर देण्याआधीही तुम्ही साइट वाचू आणि वापरू शकता. तुम्ही उत्तर देईपर्यंत क्लिक पूर्वीप्रमाणेच नोंदवले जात नाहीत. कीबोर्ड किंवा स्क्रीन रीडरने “मुख्य मजकुराकडे जा” नंतर लगेच येणारी “कुकीचे पर्याय” ही लिंक तिथे घेऊन जाते.',
        },
      },
      {
        id: 'tool-pages-heading-outline',
        text: {
          en: 'On every free tool, the questions section and the planner waitlist box now have headings at the right level, so a screen reader’s list of headings shows the parts of the page in order.',
          hi: 'हर मुफ़्त टूल पर सवालों वाले हिस्से और प्लानर की वेटलिस्ट वाले बॉक्स के शीर्षक अब सही स्तर पर हैं, ताकि स्क्रीन रीडर की शीर्षकों की सूची में पेज के हिस्से क्रम से दिखें।',
          es: 'En todas las herramientas gratuitas, la sección de preguntas y el recuadro de la lista de espera del planificador tienen ahora encabezados del nivel correcto, así que la lista de encabezados de un lector de pantalla muestra las partes de la página en orden.',
          cs: 'Ve všech nástrojích zdarma mají teď oddíl s dotazy a rámeček čekací listiny plánovače nadpisy správné úrovně, takže seznam nadpisů ve čtečce obrazovky ukazuje části stránky popořadě.',
          mr: 'प्रत्येक मोफत साधनावर प्रश्नांचा भाग आणि प्लॅनरच्या प्रतीक्षा यादीची चौकट यांची शीर्षके आता योग्य पातळीवर आहेत, त्यामुळे स्क्रीन रीडरच्या शीर्षकांच्या यादीत पानाचे भाग क्रमाने दिसतात.',
        },
      },
      {
        id: 'forms-say-what-happened',
        text: {
          en: 'The newsletter and waitlist forms now tell you what happened. They used to say you were signed up whatever the answer was; now they say so only when it worked, ask you to try again when they cannot tell (trying twice is safe), and say when sign-ups are paused for the day.',
          hi: 'न्यूज़लेटर और वेटलिस्ट के फ़ॉर्म अब बताते हैं कि असल में क्या हुआ। पहले जवाब कुछ भी हो, वे यही कहते थे कि आप जुड़ गए; अब वे यह तभी कहते हैं जब सच में ऐसा हुआ हो, पक्का पता न चलने पर फिर से कोशिश करने को कहते हैं (दो बार कोशिश करना सुरक्षित है), और बताते हैं जब उस दिन के लिए साइनअप रुके हों।',
          es: 'Los formularios del boletín y de la lista de espera ahora te dicen qué ha pasado. Antes decían que te habías apuntado fuera cual fuera la respuesta; ahora solo lo dicen cuando ha funcionado, te piden que lo intentes de nuevo cuando no pueden saberlo (probar dos veces no causa ningún problema) y avisan cuando las altas están en pausa por ese día.',
          cs: 'Formuláře newsletteru a\u00a0čekací listiny teď říkají, co se doopravdy stalo. Dřív hlásily přihlášení, ať byla odpověď jakákoli; teď ho hlásí, jen když se povedlo, když to nejde zjistit, požádají o\u00a0nový pokus (druhý pokus nic nepokazí), a\u00a0řeknou, když je zápis pro daný den pozastavený.',
          mr: 'न्यूजलेटर आणि प्रतीक्षा यादीचे फॉर्म आता नेमके काय झाले ते सांगतात. आधी उत्तर काहीही असले तरी ते तुम्ही सामील झालात असेच सांगायचे; आता ते खरोखर झाले तरच तसे सांगतात, खात्री न झाल्यास पुन्हा प्रयत्न करायला सांगतात (दोनदा प्रयत्न केल्याने काही बिघडत नाही), आणि त्या दिवसासाठी नोंदणी थांबवली असेल तर तसे सांगतात.',
        },
      },
      {
        id: 'confirm-link-works-twice',
        text: {
          en: 'The confirmation link in the email you get when you sign up for the newsletter now works if you open it twice. The second time, it used to say the link was invalid.',
          hi: 'न्यूज़लेटर के लिए साइनअप करने पर आने वाले ईमेल का पुष्टि लिंक अब दो बार खोलने पर भी काम करता है। पहले दूसरी बार खोलने पर वह बताता था कि लिंक ग़लत है।',
          es: 'El enlace de confirmación del correo que recibes al suscribirte al boletín ahora funciona aunque lo abras dos veces. Antes, la segunda vez decía que el enlace no era válido.',
          cs: 'Potvrzovací odkaz v\u00a0e-mailu, který přijde po přihlášení k\u00a0newsletteru, teď funguje, i\u00a0když ho otevřete dvakrát. Dřív při druhém otevření hlásil, že je neplatný.',
          mr: 'न्यूजलेटरसाठी नोंदणी केल्यावर येणाऱ्या ईमेलमधील पुष्टीची लिंक आता दोनदा उघडली तरी चालते. आधी दुसऱ्यांदा उघडल्यावर ती लिंक अवैध असल्याचे सांगायची.',
        },
      },
      {
        id: 'tools-say-what-stays-private',
        text: {
          en: 'The free tools now say exactly what stays private: what you type stays in your browser. Some previously said nothing was sent at all, which was too broad. The tools page now names all five tools in its search description.',
          hi: 'मुफ़्त टूल अब ठीक-ठीक बताते हैं कि क्या निजी रहता है: आप जो लिखते हैं, वह आपके ब्राउज़र में ही रहता है। कुछ टूल पहले कहते थे कि कुछ भी नहीं भेजा जाता; यह दावा ज़रूरत से ज़्यादा व्यापक था। टूल वाला पेज अब अपने सर्च विवरण में पाँचों टूल के नाम लेता है।',
          es: 'Las herramientas gratuitas dicen ahora exactamente qué queda en privado: lo que escribes se queda en tu navegador. Algunas decían que no se enviaba nada en absoluto, una afirmación demasiado amplia. La página de herramientas nombra ahora las cinco en su descripción para buscadores.',
          cs: 'Nástroje zdarma teď přesně říkají, co zůstává soukromé: co napíšete, zůstává ve vašem prohlížeči. Některé dřív tvrdily, že se neposílá vůbec nic; takové tvrzení bylo příliš obecné. Stránka s\u00a0nástroji teď ve svém popisu pro vyhledávače jmenuje všech pět nástrojů.',
          mr: 'मोफत साधने आता नेमके काय खाजगी राहते ते सांगतात: तुम्ही जे लिहिता ते तुमच्या ब्राउझरमध्येच राहते. काही साधने आधी काहीच पाठवले जात नाही असे सांगायची; हा दावा अतिशय व्यापक होता. साधनांचे पान आता शोधासाठीच्या वर्णनात पाचही साधनांची नावे देते.',
        },
      },
      {
        id: 'home-lesson-one-chart-text-size',
        text: {
          en: 'The home page now opens with a “Read lesson 1” button, and “Which sounds like you?” has a third answer, for anyone new to money. The call for translators has moved to the end of the page. In the free tools, the words and numbers inside the charts now grow with your text size, like the rest of the page; as they grow, a chart shows fewer gridlines and labels, so nothing overlaps or is cut off. In the Monte Carlo simulator, the choice of returns now wraps onto more lines instead of running past the edge when the text is large.',
          hi: 'होम पेज अब “पाठ 1 पढ़ें” बटन से शुरू होता है, और “इनमें से कौन-सी बात आप पर लागू होती है?” में तीसरा जवाब जुड़ा है, उन लोगों के लिए जिनके लिए पैसों की बातें नई हैं। अनुवाद में मदद की अपील अब पेज के आख़िर में है। मुफ़्त टूल के चार्ट में शब्द और अंक अब बाकी पेज की तरह आपके अक्षरों के आकार के साथ बड़े होते हैं; उनके बड़े होने पर चार्ट कम रेखाएँ और लेबल दिखाता है, ताकि कुछ भी एक-दूसरे पर न चढ़े और न कटे। मोंटे कार्लो सिम्युलेटर में रिटर्न के विकल्प अब अक्षर बड़े होने पर किनारे से बाहर जाने के बजाय अगली पंक्तियों में आ जाते हैं।',
          es: 'La página de inicio empieza ahora con un botón «Leer la lección 1», y «¿Cuál se parece a tu caso?» tiene una tercera respuesta, para quienes dan sus primeros pasos en las finanzas. La llamada a personas traductoras está ahora al final de la página. En las herramientas gratuitas, las palabras y los números de los gráficos crecen ahora con el tamaño del texto, como el resto de la página; al crecer, cada gráfico muestra menos líneas de cuadrícula y menos etiquetas, para que nada se solape ni se corte. En el simulador Monte Carlo, las opciones de rentabilidad pasan ahora a más líneas en vez de salirse por el borde cuando el texto es grande.',
          cs: 'Úvodní stránka teď začíná tlačítkem „Přečíst lekci 1“ a\u00a0otázka „Co z\u00a0toho se týká vás?“ má třetí odpověď, pro každého, kdo s\u00a0penězi začíná. Výzva pro překladatele se přesunula na konec stránky. V\u00a0nástrojích zdarma teď slova a\u00a0čísla v\u00a0grafech rostou s\u00a0velikostí písma jako zbytek stránky; když rostou, graf ukazuje méně čar mřížky a\u00a0popisků, aby se nic nepřekrývalo ani neořezávalo. V\u00a0simulátoru Monte Carlo se volba odhadu výnosu při velkém písmu teď zalomí na více řádků, místo aby přesahovala okraj.',
          mr: 'मुख्यपृष्ठ आता “धडा 1 वाचा” या बटणाने सुरू होते, आणि “यापैकी कोणती परिस्थिती तुम्हाला लागू होते?” मध्ये पैशांच्या बाबतीत नव्याने सुरुवात करणाऱ्यांसाठी तिसरे उत्तर आले आहे. भाषांतरासाठी मदतीचे आवाहन आता पानाच्या शेवटी आहे. मोफत साधनांमधील आलेखांतले शब्द आणि आकडे आता उर्वरित पानाप्रमाणे तुमच्या अक्षरांच्या आकारासोबत मोठे होतात; ते मोठे झाल्यावर आलेख कमी रेषा आणि लेबले दाखवतो, जेणेकरून काहीही एकमेकांवर येणार नाही किंवा कापले जाणार नाही. मॉन्टे कार्लो सिम्युलेटरमध्ये परताव्याचे पर्याय आता अक्षरे मोठी असताना कडेच्या बाहेर जाण्याऐवजी पुढच्या ओळींवर येतात.',
        },
      },
      {
        id: 'missing-page-in-your-language',
        text: {
          en: 'On a missing page at a Hindi, Spanish, Czech or Marathi address, the menu, the footer, the “Skip to content” link and the cookie question are now in that language too, not in English. On English lesson pages, the level badge now shows the level’s number in a circle instead of an emoji; Inclusive finances shows its name only. The email field and button of the newsletter and waitlist forms now use the site’s own fonts instead of a plain system font.',
          hi: 'हिन्दी, स्पैनिश, चेक या मराठी पते पर कोई पेज न मिलने पर अब मेन्यू, फ़ुटर, “मुख्य सामग्री पर जाएँ” लिंक और कुकी वाला सवाल भी उसी भाषा में दिखते हैं, अंग्रेज़ी में नहीं। अंग्रेज़ी पाठों के पेज पर स्तर वाले बैज में अब इमोजी की जगह गोले में स्तर का नंबर दिखता है; Inclusive finances में सिर्फ़ नाम दिखता है। न्यूज़लेटर और वेटलिस्ट के फ़ॉर्म में ईमेल वाला ख़ाना और बटन अब सिस्टम के सादे फ़ॉन्ट की जगह साइट के अपने फ़ॉन्ट में दिखते हैं।',
          es: 'En una página que no existe, en una dirección en hindi, español, checo o maratí, el menú, el pie de página, el enlace «Saltar al contenido» y la pregunta sobre cookies salen ahora también en ese idioma, no en inglés. En las páginas de las lecciones en inglés, la insignia del nivel muestra ahora el número del nivel dentro de un círculo en lugar de un emoji; Inclusive finances muestra solo su nombre. El campo del correo y el botón de los formularios del boletín y de la lista de espera usan ahora las fuentes del sitio en lugar de una fuente genérica del sistema.',
          cs: 'Na neexistující stránce s adresou v hindštině, španělštině, češtině nebo maráthštině jsou teď i nabídka, zápatí, odkaz „Přeskočit na obsah“ a otázka na cookies v tomto jazyce, ne anglicky. Na stránkách anglických lekcí teď odznak úrovně ukazuje místo emoji číslo úrovně v kroužku; Inclusive finances má jen název. Pole pro e-mail a tlačítko ve formulářích newsletteru a čekací listiny teď používají písmo webu místo obyčejného systémového písma.',
          mr: 'हिंदी, स्पॅनिश, चेक किंवा मराठी पत्त्यावर पान सापडत नाही तेव्हा आता मेन्यू, पानाचा तळाचा भाग, “मुख्य मजकुराकडे जा” ही लिंक आणि कुकीविषयीचा प्रश्नही त्याच भाषेत दिसतात, इंग्रजीत नाही. इंग्रजी धड्यांच्या पानांवर पातळीच्या बॅजवर आता इमोजीऐवजी वर्तुळात पातळीचा क्रमांक दिसतो; Inclusive finances चे फक्त नाव दिसते. न्यूजलेटर आणि प्रतीक्षा यादीच्या फॉर्ममधील ईमेलची जागा आणि बटण आता सिस्टमच्या साध्या फॉन्टऐवजी साइटचे स्वतःचे फॉन्ट वापरतात.',
        },
      },
    ],
  },
  {
    date: '2026-11-20',
    items: [
      {
        id: 'report-chart-names-its-unit',
        text: {
          en: 'Printed report charts now name the currency and unit above the amount axis, in the page’s language, and use plain numbers on the axis. On Hindi and Marathi pages they count in lakhs and crores, as the chart on the page does.',
          hi: 'छपी रिपोर्ट के चार्ट अब राशि वाले अक्ष के ऊपर पेज की भाषा में मुद्रा और इकाई बताते हैं, और अक्ष पर सिर्फ़ संख्याएँ दिखाते हैं। हिन्दी और मराठी पेजों पर वे पेज के चार्ट की तरह लाख और करोड़ में गिनते हैं।',
          es: 'Los gráficos de los informes impresos indican ahora la moneda y la unidad encima del eje de cantidades, en el idioma de la página, y muestran solo números en ese eje. En las páginas en hindi y en maratí cuentan en lakhs y crores, como el gráfico de la página.',
          cs: 'Grafy v\u00a0tištěných zprávách teď nad osou částek uvádějí měnu a\u00a0jednotku v\u00a0jazyce stránky a\u00a0na ose zobrazují jen čísla. Na stránkách v\u00a0hindštině a\u00a0maráthštině počítají v\u00a0jednotkách lakh a\u00a0crore jako graf na stránce.',
          mr: 'छापील अहवालातील आलेख आता रकमांच्या अक्षाच्या वर पानाच्या भाषेत चलन आणि एकक सांगतात, आणि अक्षावर फक्त आकडे दाखवतात. हिंदी आणि मराठी पानांवर ते पानावरील आलेखाप्रमाणे लाख आणि कोटींमध्ये मोजतात.',
        },
      },
      {
        id: 'loan-refinance-plain-labels',
        text: {
          en: 'In the loan comparison, the refinance results now spell out “Refinancing saves” and “Time to break even after refinancing”, where they used a short form and promised months for a value shown in years and months. The note under the break-even now says that a longer new term can break even and still cost more in total. Screen readers also hear the refinance result once typing stops.',
          hi: 'लोन तुलना टूल में रीफ़ाइनेंस के नतीजों के नाम अब ज़्यादा साफ़ हैं, जैसे “रीफ़ाइनेंस के बाद बराबरी का समय”; पहले नाम में महीनों की बात थी जबकि आँकड़ा सालों और महीनों में दिखता था। बराबरी के नीचे की टिप्पणी अब यह भी बताती है कि नई अवधि लंबी हो तो रीफ़ाइनेंस का खर्च निकल आने पर भी कुल खर्च ज़्यादा हो सकता है। स्क्रीन रीडर भी अब टाइपिंग रुकने पर रीफ़ाइनेंस का नतीजा सुनाते हैं।',
          es: 'En el comparador de préstamos, los resultados de la refinanciación tienen ahora nombres más claros, como «Tiempo hasta el punto de equilibrio tras refinanciar»; antes la etiqueta hablaba de meses y el valor se mostraba en años y meses. La nota bajo el punto de equilibrio dice ahora que un plazo nuevo más largo puede alcanzar el punto de equilibrio y aun así costar más en total. Los lectores de pantalla también anuncian el resultado de la refinanciación cuando se deja de escribir.',
          cs: 'Ve srovnání úvěrů mají teď výsledky refinancování jasnější názvy, například „Doba návratnosti po refinancování“; dřív popisek mluvil o\u00a0měsících, ale hodnota se zobrazovala v\u00a0letech a\u00a0měsících. Poznámka pod dobou návratnosti nově říká, že se refinancování s\u00a0delší dobou splatnosti může vrátit, a\u00a0přesto vyjít celkově dráž. Čtečky obrazovky teď také ohlásí výsledek refinancování, jakmile přestanete psát.',
          mr: 'कर्जांची तुलना या साधनात पुनर्वित्ताच्या निकालांची नावे आता अधिक स्पष्ट आहेत, उदाहरणार्थ “पुनर्वित्तानंतर खर्च वसूल होण्याचा टप्पा”; आधी नावात महिन्यांचा उल्लेख होता, पण आकडा वर्षे आणि महिन्यांत दिसत होता. त्याखालील टीप आता हेही सांगते की नवीन मुदत जास्त असेल तर पुनर्वित्ताचा खर्च वसूल होऊनही एकूण खर्च जास्त असू शकतो. स्क्रीन रीडरही आता टायपिंग थांबल्यावर पुनर्वित्ताचा निकाल सांगतात.',
        },
      },
      {
        id: 'copied-share-address-stays',
        text: {
          en: 'In the loan comparison and the net worth calculator, the copied share address now stays on screen until you change something, in larger and darker text. Before, the loan comparison removed it after two and a half seconds. A screen reader now hears the copy once, not twice.',
          hi: 'लोन तुलना और शुद्ध संपत्ति कैलकुलेटर में कॉपी किया गया शेयर पता अब तब तक स्क्रीन पर रहता है जब तक आप कुछ बदलते नहीं, और बड़े, गहरे अक्षरों में दिखता है। पहले लोन तुलना टूल में वह ढाई सेकंड बाद हट जाता था। स्क्रीन रीडर अब लिंक कॉपी होने की सूचना एक बार सुनाते हैं, दो बार नहीं।',
          es: 'En el comparador de préstamos y en la calculadora de patrimonio neto, la dirección copiada para compartir se queda ahora en pantalla hasta que cambies algo, con letra más grande y más oscura. Antes, el comparador de préstamos la quitaba a los dos segundos y medio. Un lector de pantalla anuncia ahora la copia una vez, no dos.',
          cs: 'Ve srovnání úvěrů a\u00a0v\u00a0kalkulačce čistého jmění teď zkopírovaná adresa ke sdílení zůstává na obrazovce, dokud něco nezměníte, a\u00a0je větším a\u00a0tmavším písmem. Dřív ji srovnání úvěrů po dvou a\u00a0půl sekundách skrylo. Čtečka obrazovky teď zkopírování ohlásí jednou, ne dvakrát.',
          mr: 'कर्जांची तुलना आणि निव्वळ संपत्ती कॅल्क्युलेटर या साधनांत कॉपी केलेला शेअर पत्ता आता तुम्ही काही बदलेपर्यंत स्क्रीनवर राहतो, आणि मोठ्या, गडद अक्षरांत दिसतो. आधी कर्जांची तुलना या साधनात तो अडीच सेकंदांनी नाहीसा व्हायचा. स्क्रीन रीडर आता लिंक कॉपी झाल्याची सूचना एकदाच सांगतात, दोनदा नाही.',
        },
      },
      {
        id: 'loan-apr-by-country',
        text: {
          en: 'A correction in the loan comparison: the answer about APR said that documents in Canada and Japan state it as the monthly rate times twelve. Neither country compounds the rate, but each uses its own formula, and the answer now says so; it also names Australia’s figure as its comparison rate. The note about Canadian mortgages now says half-yearly compounding is the usual way to state the rate, and that Canada’s Interest Act allows yearly or half-yearly. Lesson 27 carries the same correction in its own record.',
          hi: 'लोन तुलना टूल में एक सुधार: APR वाले जवाब में लिखा था कि कनाडा और जापान के काग़ज़ों में यह मासिक दर को बारह से गुणा करके बताया जाता है। ये दोनों देश चक्रवृद्धि नहीं जोड़ते, पर अपने-अपने सूत्र अपनाते हैं, और जवाब अब यही कहता है; ऑस्ट्रेलिया के आँकड़े को भी अब उसके सही नाम, तुलना दर (comparison rate), से बताया गया है। कनाडा के मॉर्गेज वाली टिप्पणी अब कहती है कि दर आम तौर पर छमाही चक्रवृद्धि के हिसाब से बताई जाती है, और कनाडा का Interest Act सालाना या छमाही, दोनों की इजाज़त देता है। पाठ 27 में यही सुधार उसके अपने रिकॉर्ड में दर्ज है।',
          es: 'Una corrección en el comparador de préstamos: la respuesta sobre el APR decía que los documentos de Canadá y Japón lo expresan como la tasa mensual multiplicada por doce. Ninguno de los dos países capitaliza, pero cada uno usa su propia fórmula, y la respuesta ahora lo dice; también llama por su nombre a la cifra de Australia, la tasa de comparación. La nota sobre las hipotecas canadienses dice ahora que la capitalización semestral es la forma habitual de expresar la tasa, y que la Interest Act de Canadá permite la anual o la semestral. La lección 27 recoge la misma corrección en su propio registro.',
          cs: 'Oprava ve srovnání úvěrů: odpověď o\u00a0APR uváděla, že dokumenty v\u00a0Kanadě a\u00a0Japonsku ho udávají jako měsíční sazbu krát dvanáct. Žádná z\u00a0těchto zemí nepočítá se složeným úročením, ale každá používá vlastní vzorec, a\u00a0odpověď to teď říká; australský údaj také nově nazývá jeho jménem, srovnávací sazba. Poznámka o\u00a0kanadských hypotékách teď říká, že pololetní úročení je obvyklý způsob uvádění sazby a\u00a0že kanadský Interest Act připouští roční nebo pololetní. Lekce 27 má stejnou opravu ve svém vlastním záznamu.',
          mr: 'कर्जांची तुलना या साधनात एक दुरुस्ती: APR\u00a0विषयीच्या उत्तरात लिहिले होते की कॅनडा आणि जपानमधील कागदपत्रांत तो मासिक दराला बाराने गुणून दिला जातो. हे दोन्ही देश चक्रवाढ धरत नाहीत, पण प्रत्येकाचे स्वतःचे सूत्र आहे, आणि उत्तर आता तसेच सांगते; ऑस्ट्रेलियाच्या आकड्यालाही आता त्याच्या योग्य नावाने, तुलना दर (comparison rate), संबोधले आहे. कॅनडातील गहाण कर्जांविषयीची टीप आता सांगते की दर सहसा सहामाही चक्रवाढीने सांगितला जातो, आणि कॅनडाचा Interest Act वार्षिक किंवा सहामाही, दोन्हींना परवानगी देतो. धडा 27\u00a0मध्ये हीच दुरुस्ती त्याच्या स्वतःच्या नोंदीत आहे.',
        },
      },
      {
        id: 'net-worth-foreign-loan-card',
        text: {
          en: 'In the net worth calculator, the card about foreign-currency loans now says what the calculator shows, the loan set against what you hold in that currency at the latest reference rate, and what it leaves out: the interest and future exchange-rate moves.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर में विदेशी मुद्रा के लोन वाला कार्ड अब बताता है कि कैलकुलेटर क्या दिखाता है, यानी उस मुद्रा में आपके पास जो है उसके सामने रखा गया लोन, ताज़ा संदर्भ दर पर, और क्या नहीं दिखाता: ब्याज और आगे विनिमय दर में होने वाले बदलाव।',
          es: 'En la calculadora de patrimonio neto, la tarjeta sobre préstamos en moneda extranjera dice ahora qué muestra la calculadora, el préstamo frente a lo que tienes en esa moneda al tipo de referencia más reciente, y qué deja fuera: los intereses y los movimientos futuros del tipo de cambio.',
          cs: 'V\u00a0kalkulačce čistého jmění teď karta o\u00a0úvěrech v\u00a0cizí měně říká, co kalkulačka ukazuje, tedy úvěr proti tomu, co v\u00a0té měně máte, přepočtený posledním referenčním kurzem, a\u00a0co vynechává: úrok a\u00a0budoucí pohyby kurzu.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटरमध्ये परकीय चलनातील कर्जाविषयीचे कार्ड आता सांगते की कॅल्क्युलेटर काय दाखवतो, म्हणजे त्या चलनात तुमच्याकडे जे आहे त्यासमोर ठेवलेले कर्ज, ताज्या संदर्भ दराने, आणि काय दाखवत नाही: व्याज आणि विनिमय दरातील पुढचे बदल.',
        },
      },
      {
        id: 'theme-when-site-data-blocked',
        text: {
          en: 'If your browser blocks site data, the site now follows your device’s light or dark setting, and the theme buttons work, though your choice lasts only on the page you are on. Before, such a browser always got the light theme and the buttons did nothing.',
          hi: 'अगर आपका ब्राउज़र साइट का डेटा रोकता है, तो साइट अब आपके डिवाइस की लाइट या डार्क सेटिंग के हिसाब से दिखती है, और थीम के बटन भी काम करते हैं, हालाँकि चुनी गई थीम सिर्फ़ उसी पेज पर रहती है जिस पर आप हैं। पहले ऐसे ब्राउज़र में हमेशा लाइट थीम आती थी और बटन दबाने पर कुछ नहीं होता था।',
          es: 'Si tu navegador bloquea los datos del sitio, el sitio sigue ahora el ajuste claro u oscuro de tu dispositivo, y los botones de tema funcionan, aunque lo que elijas solo se mantiene en la página en la que estás. Antes, en un navegador así siempre salía el tema claro y los botones no hacían nada.',
          cs: 'Pokud váš prohlížeč blokuje data webu, web se teď řídí světlým nebo tmavým nastavením vašeho zařízení a tlačítka motivu fungují, i když volba platí jen pro stránku, na které právě jste. Dřív se v takovém prohlížeči vždy zobrazoval světlý motiv a tlačítka nedělala nic.',
          mr: 'तुमचा ब्राउझर साइटचा डेटा अडवत असेल, तर साइट आता तुमच्या डिव्हाइसच्या फिकट किंवा गडद सेटिंगनुसार दिसते, आणि थीमची बटणे चालतात, मात्र निवडलेली थीम तुम्ही ज्या पानावर आहात त्या पानापुरतीच राहते. आधी अशा ब्राउझरमध्ये नेहमी फिकट थीमच दिसायची आणि बटणे दाबून काहीच होत नव्हते.',
        },
      },
      {
        id: 'changes-feed-short-titles',
        text: {
          en: 'The RSS feeds of this page now give each change a short title with the full text below it, and each feed links back to this page in its own language. Before, a feed reader showed the whole text as a cut-off headline with nothing under it.',
          hi: 'इस पेज की RSS फ़ीड में अब हर बदलाव का एक छोटा शीर्षक होता है और पूरा पाठ उसके नीचे आता है, और हर फ़ीड अपनी भाषा में इसी पेज से जुड़ती है। पहले फ़ीड रीडर पूरा पाठ एक कटे हुए शीर्षक की तरह दिखाता था और उसके नीचे कुछ नहीं होता था।',
          es: 'Los feeds RSS de esta página dan ahora a cada cambio un título corto con el texto completo debajo, y cada feed enlaza a esta página en su idioma. Antes, un lector de feeds mostraba todo el texto como un titular cortado, sin nada debajo.',
          cs: 'Kanály RSS této stránky teď dávají každé změně krátký titulek a celý text pod ním a každý kanál odkazuje na tuto stránku ve svém jazyce. Dřív čtečka RSS zobrazovala celý text jako useknutý titulek a pod ním nic.',
          mr: 'या पानाच्या RSS फीडमध्ये आता प्रत्येक बदलाला एक छोटे शीर्षक असते आणि पूर्ण मजकूर त्याखाली येतो, आणि प्रत्येक फीड तिच्या भाषेतील याच पानाशी जोडलेली असते. आधी फीड रीडर पूर्ण मजकूर एका तुटक शीर्षकासारखा दाखवायचा आणि त्याखाली काहीच नसायचे.',
        },
      },
      {
        id: 'short-links-carry-a-preview',
        text: {
          en: 'A short link to the site, such as nidhi.today/ig, now carries the site’s name, description and picture for the preview a chat app shows. Before, the preview could show a tracking address instead.',
          hi: 'साइट का छोटा लिंक, जैसे nidhi.today/ig, अब चैट ऐप में दिखने वाले प्रीव्यू के लिए साइट का नाम, विवरण और तस्वीर साथ लाता है। पहले प्रीव्यू में इनकी जगह ट्रैकिंग वाला पता दिख सकता था।',
          es: 'Un enlace corto al sitio, como nidhi.today/ig, lleva ahora el nombre, la descripción y la imagen del sitio para la vista previa que muestra una aplicación de chat. Antes, la vista previa podía mostrar en su lugar una dirección de seguimiento.',
          cs: 'Krátký odkaz na web, například nidhi.today/ig, teď nese název, popis a obrázek webu pro náhled, který zobrazí chatovací aplikace. Dřív mohl náhled místo toho ukázat sledovací adresu.',
          mr: 'साइटची छोटी लिंक, उदाहरणार्थ nidhi.today/ig, आता चॅट ॲपमध्ये दिसणाऱ्या पूर्वावलोकनासाठी साइटचे नाव, वर्णन आणि चित्र सोबत आणते. आधी पूर्वावलोकनात त्याऐवजी ट्रॅकिंगचा पत्ता दिसू शकत होता.',
        },
      },
    ],
  },
  {
    date: '2026-11-19',
    items: [
      {
        id: 'charts-lakh-crore-every-currency',
        text: {
          en: 'On Hindi and Marathi pages, chart labels and headings in the free tools now show every currency in lakhs and crores, not only rupees: a label that read “€1.87M” now reads “€18.7\u00a0लाख”. English, Spanish and Czech pages are unchanged.',
          hi: 'हिन्दी और मराठी पेजों पर मुफ़्त टूल के चार्ट लेबल और शीर्षक अब हर मुद्रा की राशि लाख और करोड़ में दिखाते हैं, सिर्फ़ रुपये की नहीं: जहाँ पहले “€1.87M” लिखा आता था, वहाँ अब “€18.7\u00a0लाख” आता है। अंग्रेज़ी, स्पैनिश और चेक पेज वैसे ही हैं।',
          es: 'En las páginas en hindi y en maratí, las etiquetas y los títulos de los gráficos de las herramientas gratuitas ahora muestran todas las monedas en lakhs y crores, no solo las rupias: donde antes se leía «€1.87M», ahora se lee «€18.7\u00a0लाख». Las páginas en inglés, español y checo no cambian.',
          cs: 'Na stránkách v\u00a0hindštině a\u00a0maráthštině teď popisky a\u00a0nadpisy grafů v\u00a0nástrojích zdarma zobrazují každou měnu v\u00a0jednotkách lakh a\u00a0crore, nejen rupie: místo „€1.87M“ je teď v\u00a0popisku „€18.7\u00a0लाख“. Anglické, španělské a\u00a0české stránky zůstávají stejné.',
          mr: 'हिंदी आणि मराठी पानांवर मोफत साधनांमधील आलेखांची लेबले आणि शीर्षके आता प्रत्येक चलनाच्या रकमा लाख आणि कोटींमध्ये दाखवतात, फक्त रुपयांच्या नाही: जिथे आधी “€1.87M” दिसत होते, तिथे आता “€18.7\u00a0लाख” दिसते. इंग्रजी, स्पॅनिश आणि चेक पाने तशीच आहेत.',
        },
      },
      {
        id: 'glossary-effective-annual-rate',
        text: {
          en: 'The glossary and lesson 27 now explain “Effective annual rate”, with an example of monthly compounding. The explanation also distinguishes compounding from whether a disclosed loan rate includes fees.',
          hi: 'शब्दावली और पाठ 27 में अब “Effective annual rate” की व्याख्या मासिक चक्रवृद्धि के उदाहरण के साथ दी गई है। इसमें यह भी स्पष्ट किया गया है कि चक्रवृद्धि की गणना और दर बताने के नियमों के अनुसार ऋण शुल्क शामिल करना अलग बातें हैं।',
          es: 'El glosario y la lección 27 explican ahora «Effective annual rate», con un ejemplo de capitalización mensual. La explicación también distingue la capitalización de la inclusión de comisiones del préstamo según las normas de información aplicables.',
          cs: 'Slovníček pojmů a\u00a0lekce 27 nyní vysvětlují pojem „Effective annual rate“ na příkladu měsíčního složeného úročení. Vysvětlení také rozlišuje složené úročení od zahrnutí úvěrových poplatků podle pravidel pro uvádění sazby.',
          mr: 'शब्दसूची आणि धडा 27\u00a0मध्ये आता मासिक चक्रवाढीच्या उदाहरणासह “Effective annual rate” या संज्ञेचे स्पष्टीकरण दिले आहे. चक्रवाढ मोजणे आणि दर जाहीर करण्याच्या नियमांनुसार कर्जाचे शुल्क समाविष्ट करणे या वेगळ्या गोष्टी आहेत, हेही स्पष्ट केले आहे.',
        },
      },
    ],
  },
  {
    date: '2026-11-18',
    items: [
      {
        id: 'amounts-stay-whole',
        text: {
          en: 'For readers who enlarge their text, and one fix for everyone. In the free tools, an amount of money now stays in one piece: its sign, its currency and its digits never split across two lines. Before, in the invest or pay off tool, a minus sign could be left at the end of a line with the figure on the next, even at the normal text size. With a very large text size on a narrow screen, the result boxes now stack to give amounts more room, and only when an amount still does not fit is that one amount drawn smaller, just enough to fit, so the tools no longer have to be scrolled sideways. All five tools were checked in Chrome, in all five languages, on screens from a small phone to a laptop, from the normal text size up to four times that.',
          hi: 'बड़े अक्षरों में पढ़ने वालों के लिए सुधार, और एक सुधार सबके लिए। मुफ़्त टूल में कोई भी रकम अब एक साथ रहती है: उसका चिह्न, उसकी मुद्रा और उसके अंक कभी दो पंक्तियों में नहीं बँटते। पहले, निवेश या कर्ज़ चुकाना टूल में ऋण चिह्न पंक्ति के अंत में छूट सकता था और रकम अगली पंक्ति में चली जाती थी, सामान्य आकार के अक्षरों में भी। संकरी स्क्रीन पर अक्षर बहुत बड़े करने पर नतीजों वाले खाने अब एक के नीचे एक आ जाते हैं ताकि रकम को ज़्यादा जगह मिले, और जब कोई रकम तब भी न समाए, तभी सिर्फ़ वही रकम उतनी छोटी दिखाई जाती है जितने में वह समा जाए; टूल को अब दाएँ-बाएँ स्क्रॉल नहीं करना पड़ता। पाँचों टूल Chrome में, पाँचों भाषाओं में जाँचे गए हैं: छोटे फ़ोन से लैपटॉप तक की स्क्रीन पर, सामान्य आकार से लेकर उससे चार गुना बड़े अक्षरों तक।',
          es: 'Para quienes amplían el texto, y un arreglo para todo el mundo. En las herramientas gratuitas, una cantidad se mantiene ahora entera: su signo, su moneda y sus cifras nunca se reparten en dos líneas. Antes, en la herramienta Invertir o pagar deuda, el signo menos podía quedarse al final de una línea y la cifra pasar a la siguiente, incluso con el tamaño de texto normal. Con un texto muy grande en una pantalla estrecha, los recuadros de resultados se apilan ahora para dar más sitio a las cantidades, y solo si una cantidad aun así no cabe se muestra más pequeña, lo justo para que quepa; las herramientas ya no obligan a desplazarse hacia los lados. Las cinco herramientas se han comprobado en Chrome, en los cinco idiomas, en pantallas desde un teléfono pequeño hasta un portátil, y desde el tamaño de texto normal hasta cuatro veces ese tamaño.',
          cs: 'Pro čtenáře, kteří si zvětšují písmo, a\u00a0jedna oprava pro všechny. V\u00a0nástrojích zdarma teď částka drží pohromadě: znaménko, měna a\u00a0číslice se nikdy nerozdělí na dva řádky. Dřív mohlo v\u00a0nástroji Investovat, nebo splatit dluh zůstat znaménko minus na konci řádku a\u00a0číslo přejít na další, a\u00a0to i\u00a0při běžné velikosti písma. Při hodně zvětšeném písmu na úzké obrazovce se teď rámečky s\u00a0výsledky řadí pod sebe, aby částky měly víc místa, a\u00a0teprve když se některá ani tak nevejde, zobrazí se tato jedna částka menší, jen tak, aby se vešla; nástroje už není potřeba posouvat do strany. Všech pět nástrojů prošlo kontrolou v\u00a0Chromu, ve všech pěti jazycích, na obrazovkách od malého telefonu po notebook a\u00a0od běžné velikosti písma až po čtyřnásobnou.',
          mr: 'मोठ्या अक्षरांत वाचणाऱ्यांसाठी सुधारणा, आणि एक दुरुस्ती सर्वांसाठी. मोफत साधनांमध्ये कोणतीही रक्कम आता एकसंध राहते: तिचे चिन्ह, तिचे चलन आणि तिचे अंक कधीही दोन ओळींत विभागले जात नाहीत. आधी, गुंतवणूक की कर्जफेड या साधनात वजा चिन्ह ओळीच्या शेवटी राहून आकडा पुढच्या ओळीत जाऊ शकत होता, नेहमीच्या आकाराच्या अक्षरांतही. अरुंद स्क्रीनवर अक्षरे खूप मोठी केल्यावर निकालांच्या चौकटी आता एकाखाली एक येतात, जेणेकरून रकमांना जास्त जागा मिळेल, आणि तरीही एखादी रक्कम मावली नाही तरच फक्त तीच रक्कम मावेल इतकीच लहान दाखवली जाते; आता साधने वापरताना डावीकडे किंवा उजवीकडे स्क्रोल करावे लागत नाही. पाचही साधने Chrome\u00a0मध्ये, पाचही भाषांत तपासली आहेत: लहान फोनपासून लॅपटॉपपर्यंतच्या स्क्रीनवर, नेहमीच्या आकारापासून त्याच्या चौपट मोठ्या अक्षरांपर्यंत.',
        },
      },
      {
        id: 'charts-name-their-unit',
        text: {
          en: 'The charts in the free tools now say once, above the chart, what their amounts are counted in (“Amounts in thousands of €”), and the gridlines carry plain numbers. Before, on a phone, the Czech pages cut the front off amounts such as “1,5 mil. Kč”, so a gridline could read “mil. Kč”. On Hindi and Marathi pages, rupee amounts on a chart now read लाख and करोड़ (कोटी in Marathi) instead of L and Cr, and Spanish pages write “mil” instead of K, and the Monte Carlo simulator’s quick result gives its range in full amounts. A few rough edges are fixed too: a page reopened with the back button now uses the theme chosen since then, “.5” and “5.” are now read as numbers in the inflation calculator and the invest or pay off tool, as the loan comparison already did, and when a calculated monthly payment only covers the interest, the loan comparison now says so and names the amount, rate and term that can change it.',
          hi: 'मुफ़्त टूल के चार्ट अब एक बार, चार्ट के ऊपर, बताते हैं कि उनकी राशियाँ किस इकाई में हैं (“राशियाँ (लाख ₹\u00a0में)”), और रेखाओं पर सादी संख्याएँ रहती हैं। पहले, फ़ोन पर चेक भाषा के पेजों में “1,5 mil. Kč” जैसी राशियों का शुरुआती हिस्सा कट जाता था, और रेखा पर सिर्फ़ “mil. Kč” दिखता था। हिन्दी और मराठी पेजों पर चार्ट की रुपये वाली राशियाँ अब L और Cr की जगह लाख और करोड़ (मराठी में कोटी) में लिखी जाती हैं, स्पैनिश पेजों पर K की जगह “mil” आता है, और मोंटे कार्लो सिम्युलेटर का झटपट नतीजा अपना दायरा पूरी राशियों में देता है। कुछ छोटी खामियाँ भी ठीक हुई हैं: बैक बटन से दोबारा खुला पेज अब बाद में चुनी गई थीम लेता है, महँगाई कैलकुलेटर और निवेश या कर्ज़ चुकाना टूल अब “.5” और “5.” को संख्या की तरह पढ़ते हैं, जैसे लोन तुलना टूल पहले से पढ़ता था, और जब गणना से निकली मासिक किस्त सिर्फ़ ब्याज भर पाती है, तो लोन तुलना टूल अब यही बताता है और राशि, ब्याज दर और अवधि का नाम लेता है जिन्हें बदला जा सकता है।',
          es: 'Los gráficos de las herramientas gratuitas dicen ahora una sola vez, encima del gráfico, en qué se cuentan sus cantidades («Cantidades en miles de €»), y las líneas de la cuadrícula llevan solo números. Antes, en un teléfono, las páginas en checo cortaban el principio de cantidades como «1,5 mil. Kč», y una línea podía leerse «mil. Kč». En las páginas en hindi y en maratí, las cantidades en rupias de un gráfico se escriben ahora con लाख y करोड़ (कोटी en maratí) en lugar de L y Cr, y las páginas en español escriben «mil» en lugar de K, y el resultado rápido del simulador de Monte Carlo da su intervalo en cantidades completas. También quedan corregidos algunos detalles: una página reabierta con el botón Atrás toma el tema elegido después, «,5» y «5,» se leen ahora como números en la calculadora de inflación y en la herramienta Invertir o pagar deuda, como ya hacía el comparador de préstamos, y cuando la cuota mensual calculada solo cubre los intereses, el comparador de préstamos ahora lo dice y nombra la cantidad, la tasa y el plazo que pueden cambiarlo.',
          cs: 'Grafy v\u00a0nástrojích zdarma teď jednou, nad grafem, říkají, v\u00a0čem jsou jejich částky počítány („Částky v\u00a0tisících Kč“), a\u00a0u\u00a0čar mřížky stojí jen čísla. Dřív se na telefonu na českých stránkách ořezával začátek částek, jako je „1,5 mil. Kč“, takže u\u00a0čáry mohlo stát jen „mil. Kč“. Na stránkách v\u00a0hindštině a\u00a0maráthštině se částky v\u00a0rupiích v\u00a0grafu teď píšou jako लाख a\u00a0करोड़ (v\u00a0maráthštině कोटी) místo L a\u00a0Cr, na španělských stránkách se místo K\u00a0píše „mil“, a\u00a0rychlý výsledek simulátoru Monte Carlo uvádí rozpětí v\u00a0celých částkách. Opraveno je i\u00a0pár drobností: stránka znovu otevřená tlačítkem Zpět převezme motiv zvolený mezitím, „,5“ a\u00a0„5,“ se teď čtou jako čísla v\u00a0inflační kalkulačce a\u00a0v\u00a0nástroji Investovat, nebo splatit dluh, jak to už dělalo srovnání úvěrů, a\u00a0když vypočtená měsíční splátka pokryje jen úrok, srovnání úvěrů to teď řekne a\u00a0jmenuje částku, sazbu a\u00a0dobu splatnosti, kterými to lze změnit.',
          mr: 'मोफत साधनांमधील आलेख आता एकदाच, आलेखाच्या वर, सांगतात की त्यांच्या रकमा कोणत्या एककात आहेत (“रकमा (लाख ₹\u00a0मध्ये)”), आणि रेषांवर साध्या संख्या असतात. आधी, फोनवर चेक भाषेतील पानांवर “1,5 mil. Kč” सारख्या रकमांचा सुरुवातीचा भाग कापला जात होता, आणि रेषेवर फक्त “mil. Kč” दिसत होते. हिंदी आणि मराठी पानांवर आलेखातील रुपयांच्या रकमा आता L आणि Cr ऐवजी लाख आणि कोटी (हिंदीत करोड़) अशा लिहिल्या जातात, स्पॅनिश पानांवर K ऐवजी “mil” येते, आणि मॉन्टे कार्लो सिम्युलेटरचा झटपट निकाल आपला पल्ला पूर्ण रकमांमध्ये देतो. काही लहान त्रुटीही दुरुस्त झाल्या आहेत: मागे जाण्याच्या बटणाने पुन्हा उघडलेले पान नंतर निवडलेली थीम घेते, महागाई कॅल्क्युलेटर आणि गुंतवणूक की कर्जफेड हे साधन आता “.5” आणि “5.” संख्या म्हणून वाचतात, जसे कर्जांची तुलना हे साधन आधीपासून वाचत होते, आणि मोजलेला मासिक हप्ता फक्त व्याजच भागवत असेल, तेव्हा कर्जांची तुलना हे साधन आता तसे सांगते आणि बदलता येतील अशी रक्कम, व्याजदर आणि मुदत यांची नावे घेते.',
        },
      },
      {
        id: 'amounts-in-page-marks',
        text: {
          en: 'On English, Hindi and Marathi pages, amounts in the free tools now use the same commas and decimal points as the rest of the page: Turkish lira read “₺10,000”, not “₺10.000”, so a figure can no longer be taken for one a thousand times smaller. Rupees are still grouped in lakhs and crores. The inflation calculator also says so now when the year you start from is the year a country changed its money, and gives the answer for the other money too; and for the euro area before 2002, it explains what the euro was then and points you to the member country.',
          hi: 'अंग्रेज़ी, हिन्दी और मराठी पेजों पर मुफ़्त टूल की रकमें अब पेज के बाकी हिस्से जैसे ही कॉमा और दशमलव बिंदु इस्तेमाल करती हैं: तुर्की लीरा अब “₺10.000” की जगह “₺10,000” दिखता है, इसलिए कोई रकम अब हज़ार गुना छोटी रकम जैसी नहीं पढ़ी जा सकती। रुपये पहले की तरह लाख और करोड़ में ही बँटे रहते हैं। जब आपका चुना हुआ शुरुआती साल वही साल हो जिसमें किसी देश ने अपनी मुद्रा बदली, तो महँगाई कैलकुलेटर अब यह बताता है और दूसरी मुद्रा के हिसाब से जवाब भी देता है; और 2002 से पहले के यूरो क्षेत्र के लिए यह समझाता है कि तब यूरो क्या था, और सदस्य देश चुनने की ओर इशारा करता है।',
          es: 'En las páginas en inglés, hindi y maratí, las cantidades de las herramientas gratuitas usan ahora las mismas comas y los mismos puntos que el resto de la página: la lira turca se lee «₺10,000» y no «₺10.000», así que una cifra ya no puede tomarse por otra mil veces menor. Las rupias siguen agrupándose en lakhs y crores. La calculadora de inflación también lo indica ahora cuando el año de partida es el año en que un país cambió de moneda, y da además la respuesta con la otra moneda; y, para la zona del euro antes de 2002, explica qué era entonces el euro y remite al país miembro.',
          cs: 'Na anglických, hindských a maráthských stránkách teď částky v nástrojích zdarma používají stejné čárky a desetinné tečky jako zbytek stránky: turecká lira se píše „₺10,000“, ne „₺10.000“, takže číslo už nejde splést s tisíckrát menším. Rupie zůstávají v indickém seskupení (lakh a crore). Inflační kalkulačka teď také upozorní, když je zvolený počáteční rok zároveň rokem, kdy země změnila měnu, a uvede i odpověď pro druhou měnu; u eurozóny před rokem 2002 vysvětlí, čím tehdy euro bylo, a odkáže na členskou zemi.',
          mr: 'इंग्रजी, हिंदी आणि मराठी पानांवर मोफत साधनांमधील रकमा आता पानाच्या उरलेल्या भागासारखेच स्वल्पविराम आणि दशांश चिन्ह वापरतात: तुर्की लिरा आता “₺10.000” ऐवजी “₺10,000” असा दिसतो, त्यामुळे एखादा आकडा हजारपट लहान आकड्यासारखा वाचला जाऊ शकत नाही. रुपये आधीसारखेच लाख आणि कोटींमध्ये गटवलेले राहतात. तुम्ही निवडलेले सुरुवातीचे वर्ष हेच एखाद्या देशाने चलन बदलले ते वर्ष असेल, तेव्हा महागाई कॅल्क्युलेटर आता तसे सांगतो आणि दुसऱ्या चलनानुसार उत्तरही देतो; आणि 2002 पूर्वीच्या युरो क्षेत्रासाठी तेव्हा युरो काय होता ते समजावून सदस्य देशाकडे निर्देश करतो.',
        },
      },
    ],
  },
  {
    date: '2026-11-17',
    items: [
      {
        id: 'policy-says-what-is-sourced',
        text: {
          en: 'The editorial policy now says which figures carry a source and which are rules of thumb, and a few explanations in the free tools describe rather than advise.',
          hi: 'संपादकीय नीति अब बताती है कि किन आँकड़ों के साथ स्रोत दिया जाता है और कौन से मोटे-मोटे नियम (rules\u00a0of\u00a0thumb) हैं, और मुफ़्त टूल की कुछ व्याख्याएँ अब सलाह देने के बजाय बताती हैं कि चीज़ें कैसे काम करती हैं।',
          es: 'La política editorial ahora dice qué cifras llevan fuente y cuáles son reglas generales, y algunas explicaciones de las herramientas gratuitas describen en lugar de aconsejar.',
          cs: 'Redakční zásady teď říkají, u\u00a0kterých čísel je uveden zdroj a\u00a0která jsou orientační pravidla, a\u00a0několik vysvětlení v\u00a0nástrojích zdarma popisuje, místo aby radilo.',
          mr: 'संपादकीय धोरण आता सांगते की कोणत्या आकड्यांसोबत स्रोत दिलेला असतो आणि कोणते ढोबळ नियम आहेत, आणि मोफत साधनांमधील काही स्पष्टीकरणे आता सल्ला देण्याऐवजी वर्णन करतात.',
        },
      },
    ],
  },
  {
    date: '2026-11-14',
    items: [
      {
        id: 'charts-by-touch-current-page',
        text: {
          en: 'Several fixes for phones and for readers who cannot rely on colour alone. On a phone, a scroll that starts on a chart in the loan comparison or the Monte Carlo simulator no longer opens its card of values. A tap opens the card, and on the Monte Carlo chart, dragging a finger sideways moves the card from year to year. The header menu now underlines the link to the page you are on; before, only its colour changed. In the dark theme, the email field in the blue sign-up box has a visible border. And some very small text is larger: the smallest labels in lesson figures, the hints beside the loan fields and two small labels on the home page.',
          hi: 'फ़ोन के लिए और उन पाठकों के लिए कुछ सुधार जो सिर्फ़ रंग पर निर्भर नहीं रह सकते। फ़ोन पर, लोन की तुलना या मोंटे कार्लो सिम्युलेटर के चार्ट पर उँगली रखकर स्क्रॉल शुरू करने से अब उसके आँकड़ों का कार्ड नहीं खुलता। कार्ड टैप करने पर खुलता है, और मोंटे कार्लो चार्ट पर उँगली दाएँ-बाएँ सरकाने से अब कार्ड एक साल से दूसरे साल पर जाता है। ऊपर के मेन्यू में अब उस पन्ने के लिंक के नीचे रेखा दिखती है जिस पर आप हैं; पहले सिर्फ़ लिंक का रंग बदलता था। डार्क थीम में, नीले साइन-अप बॉक्स के ईमेल वाले खाने का किनारा अब दिखता है। और कुछ बहुत छोटे अक्षर बड़े हुए हैं: पाठों के चित्रों के सबसे छोटे लेबल, लोन के खानों के पास के संकेत और होम पेज के दो छोटे लेबल।',
          es: 'Varios ajustes para usar la web en el teléfono y para quienes no pueden guiarse solo por el color. En un teléfono, si empiezas a desplazar la página con el dedo sobre un gráfico del comparador de préstamos o del simulador de Monte Carlo, ya no se abre su recuadro de valores. Un toque abre el recuadro y, en el gráfico de Monte Carlo, arrastrar el dedo de lado a lado ahora mueve el recuadro de un año a otro. El menú de la cabecera ahora subraya el enlace a la página en la que estás; antes solo cambiaba el color del enlace. En el tema oscuro, el campo de correo electrónico del recuadro azul de registro tiene un borde visible. Y algunos textos muy pequeños son más grandes: las etiquetas más pequeñas de las figuras de las lecciones, las indicaciones junto a los campos del préstamo y dos etiquetas pequeñas de la página de inicio.',
          cs: 'Několik oprav pro používání na telefonu a\u00a0pro čtenáře, kteří se nemohou řídit jen barvou. Na telefonu už posouvání stránky, které začne dotykem na grafu ve srovnání úvěrů nebo v\u00a0simulátoru Monte Carlo, neotevře kartu s\u00a0hodnotami. Kartu otevřete klepnutím a\u00a0v\u00a0grafu Monte Carlo ji teď tažením prstu do stran posunete z\u00a0roku na rok. Nabídka v\u00a0záhlaví teď podtrhává odkaz na stránku, na které jste; dřív se měnila jen barva odkazu. V\u00a0tmavém motivu má pole pro e-mail v\u00a0modrém registračním rámečku viditelný okraj. A\u00a0některé velmi drobné texty jsou větší: nejmenší popisky v\u00a0obrázcích lekcí, nápovědy u\u00a0polí úvěru a\u00a0dva malé popisky na úvodní stránce.',
          mr: 'फोनसाठी आणि केवळ रंगावर अवलंबून राहू न शकणाऱ्या वाचकांसाठी काही सुधारणा. फोनवर, कर्जांची तुलना किंवा मॉन्टे कार्लो सिम्युलेटरमधील आलेखावर बोट ठेवून स्क्रोल सुरू केल्यावर आता त्याची आकड्यांची चौकट उघडत नाही. चौकट टॅप केल्यावर उघडते, आणि मॉन्टे कार्लो आलेखावर बोट डावीकडे-उजवीकडे सरकवल्यावर आता चौकट एका वर्षावरून दुसऱ्या वर्षावर जाते. वरच्या मेनूमध्ये आता तुम्ही ज्या पानावर आहात त्या पानाच्या लिंकखाली रेघ दिसते; आधी फक्त लिंकचा रंग बदलत होता. गडद थीममध्ये, निळ्या साइन-अप चौकटीतील ईमेलच्या रकान्याची कड आता दिसते. आणि काही अगदी लहान अक्षरे मोठी झाली आहेत: धड्यांमधील आकृत्यांची सर्वांत लहान लेबले, कर्जाच्या रकान्यांजवळच्या सूचना आणि मुख्यपृष्ठावरील दोन छोटी लेबले.',
        },
      },
      {
        id: 'printed-tables-and-path-names',
        text: {
          en: 'Two small things in the free tools. In a printed report, a table is now only as wide as it needs to be, so each label sits beside its figure, and a column of numbers lines up under its heading. On small paper such as A5, a table that is too wide now prints each row as a short list, instead of the whole report shrinking to fit. A report saved as a PDF now keeps its headings and tables, so a screen reader can move through it. And in English, Hindi and Marathi, the invest or pay off tool now gives its two paths names (“Paying off first”, “Investing the extra”) where the wording used to read like an instruction: the tool compares; it does not say which to choose.',
          hi: 'मुफ़्त टूल में दो छोटे बदलाव। छपी रिपोर्ट में तालिका अब उतनी ही चौड़ी होती है जितनी ज़रूरी है, इसलिए हर नाम अपने आँकड़े के पास रहता है, और संख्याओं का कॉलम अपने शीर्षक के नीचे सीध में आता है। A5 जैसे छोटे काग़ज़ पर, जो तालिका ज़्यादा चौड़ी होती है उसकी हर पंक्ति अब एक छोटी सूची की तरह छपती है; पहले पूरी रिपोर्ट छोटी होकर छपती थी। PDF के रूप में सहेजी गई रिपोर्ट अब अपने शीर्षक और तालिकाएँ बनाए रखती है, इसलिए स्क्रीन रीडर उसके एक हिस्से से दूसरे हिस्से तक जा सकता है। और अंग्रेज़ी, हिन्दी और मराठी में, निवेश या कर्ज़ चुकाना टूल अब अपने दो रास्तों को नाम देता है (“पहले कर्ज़ चुकाना”, “अतिरिक्त पैसे का निवेश”), जहाँ पहले ये शब्द निर्देश जैसे पढ़े जाते थे: टूल तुलना करता है, यह नहीं बताता कि कौन सा चुनना है।',
          es: 'Dos detalles en las herramientas gratuitas. En un informe impreso, cada tabla ocupa ahora solo el ancho que necesita, así que cada etiqueta queda junto a su cifra, y una columna de números se alinea bajo su encabezado. En papel pequeño, como A5, cada fila de una tabla demasiado ancha se imprime ahora como una lista corta, en lugar de que todo el informe se encoja para caber. Un informe guardado como PDF conserva ahora sus encabezados y tablas, así que un lector de pantalla puede recorrerlo. Y en inglés, hindi y maratí, la herramienta Invertir o pagar deuda ahora da nombre a sus dos caminos donde antes el texto sonaba a instrucción: la herramienta compara; no dice cuál elegir.',
          cs: 'Dvě drobnosti v\u00a0nástrojích zdarma. V\u00a0tištěné zprávě je teď tabulka jen tak široká, jak potřebuje, takže každý popisek stojí vedle svého čísla a\u00a0sloupec čísel je zarovnaný pod svým záhlavím. Na malém papíru, třeba A5, se teď každý řádek příliš široké tabulky vytiskne jako krátký seznam, místo aby se celá zpráva zmenšila. Zpráva uložená jako PDF si teď zachovává nadpisy a\u00a0tabulky, takže se v\u00a0ní čtečka obrazovky může pohybovat. A\u00a0v\u00a0angličtině, hindštině a\u00a0maráthštině teď nástroj Investovat, nebo splatit dluh své dvě cesty pojmenovává tam, kde text dřív zněl jako pokyn: nástroj porovnává; neříká, kterou zvolit.',
          mr: 'मोफत साधनांमध्ये दोन छोटे बदल. छापील अहवालात तक्ता आता गरजेइतकाच रुंद असतो, त्यामुळे प्रत्येक नाव त्याच्या आकड्याशेजारी राहते, आणि आकड्यांचा स्तंभ त्याच्या शीर्षकाखाली एका रेषेत येतो. A5 सारख्या लहान कागदावर, फार रुंद तक्त्याची प्रत्येक ओळ आता छोट्या यादीसारखी छापली जाते; आधी संपूर्ण अहवाल लहान होऊन छापला जात होता. PDF म्हणून जतन केलेल्या अहवालात आता शीर्षके आणि तक्ते टिकून राहतात, त्यामुळे स्क्रीन रीडरला त्यात एका भागातून दुसऱ्या भागात जाता येते. आणि इंग्रजी, हिंदी व मराठीत, गुंतवणूक की कर्जफेड हे साधन आता आपल्या दोन मार्गांना नावे देते (“आधी कर्जफेड”, “जादा पैशांची गुंतवणूक”); आधी हा मजकूर निर्देशासारखा वाटत होता: साधन तुलना करते, कोणता मार्ग निवडावा हे सांगत नाही.',
        },
      },
      {
        id: 'high-contrast-settings',
        text: {
          en: 'The site now follows high-contrast settings. In a high-contrast mode, such as a Windows contrast theme, the chosen theme, tab and option are marked again, and charts keep colours that can be read. And when a device asks for more contrast, grey text takes the main text colour, edges are stronger and the focus ring is thicker.',
          hi: 'साइट अब हाई-कंट्रास्ट सेटिंग के हिसाब से चलती है। हाई-कंट्रास्ट मोड में, जैसे Windows की कंट्रास्ट थीम में, चुनी हुई थीम, टैब और विकल्प की पहचान फिर से दिखती है, और चार्ट ऐसे रंगों में रहते हैं जो पढ़े जा सकें। और जब डिवाइस ज़्यादा कंट्रास्ट माँगता है, तो धूसर टेक्स्ट मुख्य टेक्स्ट के रंग में आ जाता है, किनारे गहरे हो जाते हैं और फ़ोकस का घेरा मोटा हो जाता है।',
          es: 'El sitio ahora sigue los ajustes de alto contraste. En un modo de alto contraste, como un tema de contraste de Windows, el tema, la pestaña y la opción elegidos vuelven a estar marcados, y los gráficos conservan colores que se pueden leer. Y cuando el dispositivo pide más contraste, el texto gris toma el color del texto principal, los bordes se marcan más y el anillo de foco es más grueso.',
          cs: 'Web se teď řídí nastavením vysokého kontrastu. V\u00a0režimu vysokého kontrastu, třeba v\u00a0kontrastním motivu Windows, je vybraný motiv, záložka i\u00a0volba zase označená a\u00a0grafy si drží barvy, které jdou přečíst. A\u00a0když zařízení žádá vyšší kontrast, šedý text dostane barvu hlavního textu, okraje jsou výraznější a\u00a0rámeček fokusu je silnější.',
          mr: 'साइट आता हाय-कॉन्ट्रास्ट सेटिंगनुसार चालते. हाय-कॉन्ट्रास्ट मोडमध्ये, उदाहरणार्थ Windows\u00a0च्या कॉन्ट्रास्ट थीममध्ये, निवडलेली थीम, टॅब आणि पर्याय यांची खूण पुन्हा दिसते, आणि आलेख वाचता येतील अशा रंगांत राहतात. आणि डिव्हाइस जास्त कॉन्ट्रास्ट मागते तेव्हा राखाडी मजकूर मुख्य मजकुराच्या रंगात येतो, कडा ठळक होतात आणि फोकसची कड जाड होते.',
        },
      },
      {
        id: 'phone-links-without-scripts',
        text: {
          en: 'On a phone where scripts do not run, the menu button used to open nothing. Now the button is gone there and the site’s links are listed at the foot of every page. The footer’s links are also a proper list for screen readers, which now say how many there are.',
          hi: 'जिस फ़ोन में स्क्रिप्ट नहीं चलतीं, वहाँ मेन्यू का बटन दबाने पर कुछ नहीं खुलता था। अब वहाँ बटन नहीं दिखता और साइट के लिंक हर पन्ने के नीचे सूची में मिलते हैं। फ़ुटर के लिंक अब स्क्रीन रीडर के लिए भी बाक़ायदा सूची हैं, जो बताता है कि कितने लिंक हैं।',
          es: 'En un teléfono donde no se ejecutan scripts, el botón del menú no abría nada. Ahora ese botón no aparece allí y los enlaces del sitio están al pie de cada página. Los enlaces del pie son además una lista de verdad para los lectores de pantalla, que ahora dicen cuántos hay.',
          cs: 'Na telefonu, kde neběží skripty, tlačítko nabídky nic neotevíralo. Teď tam tlačítko není a\u00a0odkazy webu jsou v\u00a0zápatí každé stránky. Odkazy v\u00a0zápatí jsou navíc pro čtečky obrazovky opravdový seznam, takže čtečka řekne, kolik jich je.',
          mr: 'ज्या फोनवर स्क्रिप्ट चालत नाहीत, तिथे मेनूचे बटण दाबल्यावर काहीच उघडत नव्हते. आता तिथे ते बटण दिसत नाही आणि साइटच्या लिंक प्रत्येक पानाच्या तळाशी यादीत मिळतात. फूटरमधील लिंक आता स्क्रीन रीडरसाठीही नीट यादी आहेत, त्यामुळे किती लिंक आहेत ते तो सांगतो.',
        },
      },
      {
        id: 'share-window-keyboard',
        text: {
          en: 'In the net worth calculator’s share window, pressing Shift and Tab from the second option moved keyboard focus out of the window to the page behind, and Escape then stopped closing it. Keyboard focus now stays inside the window until you close it.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर की शेयर विंडो में दूसरे विकल्प से Shift और Tab दबाने पर कीबोर्ड फ़ोकस विंडो से बाहर पीछे के पन्ने पर चला जाता था, और फिर Escape से विंडो बंद नहीं होती थी। अब विंडो बंद करने तक कीबोर्ड फ़ोकस उसके अंदर ही रहता है।',
          es: 'En la ventana para compartir de la calculadora de patrimonio neto, pulsar Mayús y Tab desde la segunda opción sacaba el foco del teclado de la ventana a la página que hay detrás, y después Escape ya no la cerraba. Ahora el foco del teclado se queda dentro de la ventana hasta que la cierras.',
          cs: 'V\u00a0okně pro sdílení v\u00a0kalkulačce čistého jmění se po stisku Shift a\u00a0Tab na druhé možnosti přesunul fokus klávesnice mimo okno na stránku za ním a\u00a0Escape ho pak už nezavíral. Teď fokus klávesnice zůstává v\u00a0okně, dokud ho nezavřete.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटरच्या शेअर विंडोमध्ये दुसऱ्या पर्यायावरून Shift आणि Tab दाबल्यावर कीबोर्ड फोकस विंडोच्या बाहेर मागील पानावर जात असे, आणि मग Escape दाबून विंडो बंद होत नसे. आता विंडो बंद करेपर्यंत कीबोर्ड फोकस तिच्या आतच राहतो.',
        },
      },
      {
        id: 'sideways-phone-large-text',
        text: {
          en: 'Three fixes for small screens and large text. In the net worth calculator, the share window now fits a phone held sideways: the whole window scrolls, so Cancel and Copy link can be reached. The Monte Carlo chart can now be zoomed with two fingers. And with a much larger text size, the lesson lists, the how-to guides, the free tools and the privacy page no longer grow wider than a phone screen: long words and addresses wrap instead.',
          hi: 'छोटी स्क्रीन और बड़े अक्षरों के लिए तीन सुधार। शुद्ध संपत्ति कैलकुलेटर में शेयर विंडो अब आड़े पकड़े फ़ोन में भी काम करती है: पूरी विंडो स्क्रॉल होती है, इसलिए “रद्द करें” और “लिंक कॉपी करें” तक पहुँचा जा सकता है। मोंटे कार्लो चार्ट को अब दो उँगलियों से बड़ा किया जा सकता है। और अक्षर बहुत बड़े करने पर पाठों की सूचियाँ, कैसे करें गाइड, मुफ़्त टूल और प्राइवेसी वाला पन्ना अब फ़ोन की स्क्रीन से चौड़े नहीं होते: लंबे शब्द और पते अब अगली पंक्ति में मुड़ जाते हैं।',
          es: 'Tres arreglos para pantallas pequeñas y texto grande. En la calculadora de patrimonio neto, la ventana para compartir cabe ahora en un teléfono en horizontal: toda la ventana se desplaza, así que se puede llegar a «Cancelar» y «Copiar enlace». El gráfico de Monte Carlo ya se puede ampliar con dos dedos. Y con un tamaño de texto mucho mayor, las listas de lecciones, las guías Cómo hacerlo, las herramientas gratuitas y la página de privacidad ya no se hacen más anchas que la pantalla de un teléfono: las palabras y direcciones largas pasan a la línea siguiente.',
          cs: 'Tři opravy pro malé obrazovky a\u00a0velké písmo. V\u00a0kalkulačce čistého jmění se okno pro sdílení teď vejde i\u00a0na telefon držený naležato: posouvá se celé okno, takže se dá dojít k\u00a0tlačítkům „Zrušit“ a\u00a0„Kopírovat odkaz“. Graf Monte Carlo teď jde zvětšit dvěma prsty. A\u00a0při hodně zvětšeném písmu už seznamy lekcí, návody Jak na to, nástroje zdarma ani stránka o\u00a0soukromí nejsou širší než obrazovka telefonu: dlouhá slova a\u00a0adresy se zalomí na další řádek.',
          mr: 'लहान स्क्रीन आणि मोठ्या अक्षरांसाठी तीन दुरुस्त्या. निव्वळ संपत्ती कॅल्क्युलेटरमध्ये शेअर विंडो आता आडव्या धरलेल्या फोनवरही मावते: संपूर्ण विंडो स्क्रोल होते, त्यामुळे “रद्द करा” आणि “लिंक कॉपी करा” पर्यंत पोहोचता येते. मॉन्टे कार्लो आलेख आता दोन बोटांनी मोठा करता येतो. आणि अक्षरे खूप मोठी केल्यावर धड्यांच्या याद्या, ‘कसे करायचे’ मार्गदर्शिका, मोफत साधने आणि गोपनीयतेचे पान आता फोनच्या स्क्रीनपेक्षा रुंद होत नाहीत: लांब शब्द आणि पत्ते पुढच्या ओळीत जातात.',
        },
      },
      {
        id: 'lessons-keyboard-tips-print',
        text: {
          en: 'Three fixes. A chart or table that scrolls sideways on a narrow screen, in a lesson or a how-to guide, can now be reached with the Tab key and scrolled with the arrow keys. In lessons on a phone, opening the explanation of a term no longer makes the page slide sideways. And any page printed from the dark theme now comes out in dark text on white, without the site’s menus around it; before, only lessons did.',
          hi: 'तीन सुधार। किसी पाठ या कैसे करें गाइड में छोटी स्क्रीन पर जो चार्ट या तालिका आड़ी स्क्रॉल होती है, उस तक अब Tab कुंजी से पहुँचा जा सकता है और तीर वाली कुंजियों से उसे स्क्रॉल किया जा सकता है। पाठों में, फ़ोन पर किसी शब्द की व्याख्या खोलने से पन्ना अब आड़ा नहीं सरकता। और डार्क थीम से छापा गया कोई भी पन्ना अब सफ़ेद पर गहरे टेक्स्ट में छपता है, साइट के मेन्यू के बिना; पहले ऐसा सिर्फ़ पाठों में होता था।',
          es: 'Tres arreglos. Un gráfico o una tabla que se desplaza hacia los lados en una pantalla estrecha, en una lección o en una guía Cómo hacerlo, ya se puede alcanzar con la tecla Tab y desplazar con las flechas. En las lecciones, en un teléfono, abrir la explicación de un término ya no hace que la página se deslice hacia un lado. Y cualquier página impresa desde el tema oscuro sale ahora con texto oscuro sobre blanco, sin los menús del sitio alrededor; antes solo pasaba con las lecciones.',
          cs: 'Tři opravy. Ke grafu nebo tabulce, které se na úzké obrazovce posouvají do strany, ať už v\u00a0lekci, nebo v\u00a0návodu Jak na to, se teď dá dostat klávesou Tab a\u00a0posouvat je šipkami. V\u00a0lekcích na telefonu už otevření vysvětlení pojmu neposune stránku do strany. A\u00a0jakákoli stránka vytištěná z\u00a0tmavého motivu teď vyjde tmavým textem na bílé, bez nabídek webu kolem; dřív to platilo jen pro lekce.',
          mr: 'तीन दुरुस्त्या. धड्यात किंवा ‘कसे करायचे’ मार्गदर्शिकेत अरुंद स्क्रीनवर आडवा स्क्रोल होणारा आलेख किंवा तक्ता आता Tab कळीने गाठता येतो आणि बाणांच्या कळांनी स्क्रोल करता येतो. धड्यांमध्ये, फोनवर एखाद्या शब्दाचे स्पष्टीकरण उघडल्यावर पान आता आडवे सरकत नाही. आणि गडद थीममधून छापलेले कोणतेही पान आता पांढऱ्यावर गडद मजकुरात छापले जाते, साइटच्या मेनूशिवाय; आधी असे फक्त धड्यांमध्ये होत असे.',
        },
      },
      {
        id: 'emails-fit-a-phone',
        text: {
          en: 'The emails now fit a phone screen: a lesson no longer needs sideways panning or zooming, and a wide table scrolls inside its own box. The small grey text, the links and the buttons are darker and easier to read, the unsubscribe link sits on a line of its own, and the plain-text version keeps sentences and table rows together.',
          hi: 'ईमेल अब फ़ोन की स्क्रीन में पूरे आते हैं: पाठ पढ़ने के लिए अब आड़ा खिसकाना या ज़ूम करना नहीं पड़ता, और चौड़ी तालिका अपने ही खाने के भीतर स्क्रॉल होती है। छोटा धूसर टेक्स्ट, लिंक और बटन अब गहरे रंग के हैं और आसानी से पढ़े जाते हैं, अनसब्सक्राइब का लिंक अपनी अलग पंक्ति में है, और सादे टेक्स्ट वाले रूप में वाक्य और तालिका की पंक्तियाँ साथ बनी रहती हैं।',
          es: 'Los correos ya caben en la pantalla de un teléfono: una lección ya no obliga a desplazarse hacia los lados ni a ampliar, y una tabla ancha se desplaza dentro de su propio recuadro. El texto gris pequeño, los enlaces y los botones son más oscuros y se leen mejor, el enlace para cancelar la suscripción va en una línea aparte, y la versión de texto sin formato mantiene juntas las frases y las filas de las tablas.',
          cs: 'E-maily se teď vejdou na obrazovku telefonu: lekci už není potřeba posouvat do strany ani zvětšovat a\u00a0široká tabulka se posouvá ve vlastním rámečku. Drobný šedý text, odkazy a\u00a0tlačítka jsou tmavší a\u00a0lépe čitelné, odkaz pro odhlášení odběru má vlastní řádek a\u00a0čistě textová verze drží věty i\u00a0řádky tabulek pohromadě.',
          mr: 'ईमेल आता फोनच्या स्क्रीनमध्ये बसतात: धडा वाचताना आता आडवे सरकवावे किंवा झूम करावे लागत नाही, आणि रुंद तक्ता स्वतःच्या चौकटीतच स्क्रोल होतो. लहान राखाडी मजकूर, लिंक आणि बटणे आता गडद आहेत आणि सहज वाचता येतात, सदस्यत्व रद्द करण्याची लिंक स्वतंत्र ओळीत आहे, आणि साध्या मजकुराच्या आवृत्तीत वाक्ये आणि तक्त्याच्या ओळी एकत्र राहतात.',
        },
      },
      {
        id: 'page-stays-put-behind-menu',
        text: {
          en: 'The phone menu and the cookie prompt now hold the page still. While either is open, the page behind it no longer scrolls, so closing the menu leaves you where you were. With a screen reader, the cookie prompt is now the only thing in reach until you answer it.',
          hi: 'फ़ोन का मेन्यू और कुकी वाला संदेश अब पन्ने को अपनी जगह रोके रखते हैं। दोनों में से कोई खुला हो, तो पीछे का पन्ना अब स्क्रॉल नहीं होता, इसलिए मेन्यू बंद करने पर आप वहीं रहते हैं जहाँ थे। स्क्रीन रीडर के साथ, जवाब देने तक अब सिर्फ़ कुकी वाला संदेश ही पहुँच में रहता है।',
          es: 'El menú del teléfono y el aviso de cookies ahora dejan quieta la página. Mientras uno de los dos está abierto, la página de detrás ya no se desplaza, así que al cerrar el menú sigues donde estabas. Con un lector de pantalla, el aviso de cookies es ahora lo único al alcance hasta que lo respondes.',
          cs: 'Nabídka v\u00a0telefonu a\u00a0výzva k\u00a0cookies teď drží stránku na místě. Dokud je jedna z\u00a0nich otevřená, stránka za ní se už neposouvá, takže po zavření nabídky zůstanete na stejném místě. Se čtečkou obrazovky je teď výzva k\u00a0cookies jediné, co je v\u00a0dosahu, dokud na ni neodpovíte.',
          mr: 'फोनचा मेनू आणि कुकीची सूचना आता पान जागेवर धरून ठेवतात. दोन्हींपैकी एक उघडे असताना मागचे पान आता स्क्रोल होत नाही, त्यामुळे मेनू बंद केल्यावर तुम्ही जिथे होता तिथेच राहता. स्क्रीन रीडर वापरताना, उत्तर देईपर्यंत आता फक्त कुकीची सूचनाच आवाक्यात असते.',
        },
      },
      {
        id: 'forms-keep-your-place',
        text: {
          en: 'The waitlist and newsletter forms now keep your place. With a keyboard, focus used to jump to the top of the page while the form was sending and after a failure; it now stays on the button. A screen reader now reads out the question “Is this the right address?” with the address you typed, one character at a time, and says when the form is sending. A request that gets no answer in 20 seconds now stops and tells you, so you can try again. On the waitlist card, the ring that shows where the keyboard is can now be seen.',
          hi: 'वेटलिस्ट और न्यूज़लेटर के फ़ॉर्म में अब आपकी जगह बनी रहती है। कीबोर्ड से चलाने पर, फ़ॉर्म भेजे जाते समय और गड़बड़ी के बाद फ़ोकस पेज के ऊपर चला जाता था; अब वह बटन पर ही रहता है। स्क्रीन रीडर अब “क्या यह पता सही है?” वाला सवाल आपके लिखे पते के साथ, एक-एक अक्षर करके, पढ़ता है, और बताता है कि फ़ॉर्म भेजा जा रहा है। जिस अनुरोध का 20 सेकंड में जवाब नहीं आता, वह अब रुक जाता है और यह बता देता है, ताकि आप दोबारा कोशिश कर सकें। वेटलिस्ट कार्ड पर कीबोर्ड कहाँ है यह दिखाने वाला घेरा अब साफ़ दिखता है।',
          es: 'Los formularios de la lista de espera y del boletín ya no te hacen perder tu lugar. Con el teclado, el foco saltaba al principio de la página mientras el formulario se enviaba y después de un fallo; ahora se queda en el botón. El lector de pantalla lee ahora la pregunta «¿Es correcta esta dirección?» junto con la dirección que escribiste, carácter por carácter, y avisa cuando el formulario se está enviando. Una solicitud que no recibe respuesta en 20 segundos ahora se detiene y lo dice, para que puedas volver a intentarlo. En la tarjeta de la lista de espera, el contorno que muestra dónde está el teclado ahora se ve.',
          cs: 'Formuláře čekací listiny a\u00a0newsletteru si teď pamatují, kde jste. Při ovládání klávesnicí fokus během odesílání a\u00a0po chybě přeskakoval na začátek stránky; teď zůstává na tlačítku. Čtečka obrazovky teď přečte otázku „Je tato adresa správná?“ i\u00a0se zadanou adresou, znak po znaku, a\u00a0oznámí, že se formulář odesílá. Požadavek, na který do 20\u00a0sekund nepřijde odpověď, se teď zastaví a\u00a0oznámí to, takže to můžete zkusit znovu. Na kartě čekací listiny je teď vidět rámeček, který ukazuje, kde je klávesnice.',
          mr: 'प्रतीक्षा यादी आणि न्यूजलेटरच्या फॉर्ममध्ये आता तुमची जागा कायम राहते. कीबोर्ड वापरताना, फॉर्म पाठवला जात असताना आणि बिघाड झाल्यानंतर फोकस पानाच्या वर जात असे; आता तो बटणावरच राहतो. स्क्रीन रीडर आता “हा पत्ता बरोबर आहे का?” हा प्रश्न तुम्ही लिहिलेल्या पत्त्यासह, एकेक अक्षर करून, वाचतो, आणि फॉर्म पाठवला जात आहे हे सांगतो. ज्या विनंतीला 20 सेकंदांत उत्तर येत नाही, ती आता थांबते आणि तसे सांगते, म्हणजे तुम्ही पुन्हा प्रयत्न करू शकता. प्रतीक्षा यादीच्या कार्डवर कीबोर्ड कुठे आहे हे दाखवणारी रेघ आता स्पष्ट दिसते.',
        },
      },
      {
        id: 'easier-to-read-and-find',
        text: {
          en: 'A few small things are easier to read or find. On the lesson pages, the search hint now sits under the search box and stays there after you start typing; in Hindi, Spanish, Czech and Marathi it says the search reads English words, and the Czech and Marathi “no lesson matches” lines say why. On the newsletter box, “I already subscribed” and “Not now” are now white like the rest of the box, and the ring that shows where the keyboard is can be seen on every control there. Across the site, the grey hints inside empty form fields are darker. The volunteers page says the form is in English before the button that opens it. And the logo link is now named by the words it shows, so a voice control tool finds it when you say them.',
          hi: 'कुछ छोटी चीज़ें अब पढ़ने या ढूँढने में आसान हैं। पाठ वाले पेजों पर खोज का संकेत अब खोज बॉक्स के नीचे रहता है और लिखना शुरू करने के बाद भी बना रहता है; हिन्दी, स्पैनिश, चेक और मराठी में वह बताता है कि खोज अंग्रेज़ी शब्दों में होती है, और चेक और मराठी की “कोई पाठ नहीं मिला” वाली पंक्तियाँ अब वजह भी बताती हैं। न्यूज़लेटर बॉक्स पर “मैं पहले से सदस्य हूँ” और “अभी नहीं” अब बॉक्स के बाक़ी शब्दों की तरह सफ़ेद हैं, और कीबोर्ड कहाँ है यह दिखाने वाला घेरा वहाँ हर बटन और लिंक पर साफ़ दिखता है। पूरी साइट पर ख़ाली फ़ॉर्म फ़ील्ड के अंदर के धूसर संकेत अब गहरे हैं। स्वयंसेवक पेज अब फ़ॉर्म खोलने वाले बटन से पहले बताता है कि फ़ॉर्म अंग्रेज़ी में है। और लोगो वाले लिंक का नाम अब वही है जो उस पर लिखा दिखता है, इसलिए आवाज़ से चलने वाला टूल वे शब्द बोलने पर उसे ढूँढ लेता है।',
          es: 'Algunas cosas pequeñas son ahora más fáciles de leer o de encontrar. En las páginas de lecciones, la indicación de la búsqueda está ahora bajo el recuadro de búsqueda y se queda ahí cuando empiezas a escribir; en hindi, español, checo y maratí avisa de que la búsqueda lee palabras en inglés, y los mensajes en checo y maratí de «ninguna lección coincide» explican el motivo. En el recuadro del boletín, «Ya me suscribí» y «Ahora no» son ahora blancos como el resto del recuadro, y el contorno que muestra dónde está el teclado se ve en todos sus controles. En todo el sitio, las indicaciones grises dentro de los campos vacíos son más oscuras. La página de voluntariado dice que el formulario está en inglés antes del botón que lo abre. Y el enlace del logotipo se llama ahora como las palabras que muestra, así que una herramienta de control por voz lo encuentra cuando las dices.',
          cs: 'Několik drobností se teď lépe čte nebo hledá. Na stránkách lekcí je nápověda k\u00a0hledání nově pod vyhledávacím polem a\u00a0zůstává tam i\u00a0poté, co začnete psát; v\u00a0hindštině, španělštině, češtině a\u00a0maráthštině říká, že hledání čte anglická slova, a\u00a0česká a\u00a0maráthská hláška „žádná lekce neodpovídá“ říká proč. V\u00a0rámečku newsletteru jsou „Už odebírám“ a\u00a0„Teď ne“ nově bílé jako ostatní text v\u00a0něm a\u00a0obrys, který ukazuje, kde je klávesnice, je tam vidět na každém prvku. Na celém webu jsou šedé nápovědy v\u00a0prázdných polích formulářů tmavší. Stránka pro dobrovolníky říká, že formulář je v\u00a0angličtině, ještě před tlačítkem, které ho otevírá. A\u00a0odkaz s\u00a0logem se teď jmenuje podle slov, která ukazuje, takže ho hlasové ovládání najde, když je vyslovíte.',
          mr: 'काही लहान गोष्टी आता वाचायला किंवा शोधायला सोप्या झाल्या आहेत. धड्यांच्या पानांवर शोधाची सूचना आता शोध चौकटीखाली असते आणि टाइप करायला सुरुवात केल्यानंतरही तिथेच राहते; हिंदी, स्पॅनिश, चेक आणि मराठीत ती सांगते की शोध इंग्रजी शब्दांत घेतला जातो, आणि चेक व मराठीतील “कोणताही धडा जुळत नाही” या ओळी आता कारणही सांगतात. न्यूजलेटरच्या चौकटीत “मी आधीच सदस्य आहे” आणि “आता नको” आता चौकटीतील इतर मजकुराप्रमाणे पांढरे आहेत, आणि कीबोर्ड कुठे आहे हे दाखवणारी रेघ तिथल्या प्रत्येक बटणावर आणि लिंकवर स्पष्ट दिसते. संपूर्ण साइटवर रिकाम्या फॉर्म फील्डमधील राखाडी सूचना आता गडद आहेत. स्वयंसेवकांचे पान फॉर्म उघडणाऱ्या बटणाआधीच सांगते की फॉर्म इंग्रजीत आहे. आणि लोगोच्या लिंकचे नाव आता त्यावर दिसणाऱ्या शब्दांप्रमाणेच आहे, त्यामुळे ते शब्द बोलल्यावर आवाजाने चालणाऱ्या साधनाला ती सापडते.',
        },
      },
      {
        id: 'simulated-amounts-rounded',
        text: {
          en: 'The Monte Carlo simulator and the invest or pay off tool no longer show simulated amounts to the last unit. A median of 1,058,721 read as exact, but a different set of random draws would move it by about 1%. The page now shows 1,060,000: as fine as the runs can tell apart. The spreadsheet keeps every digit.',
          hi: 'मोंटे कार्लो सिम्युलेटर और निवेश या कर्ज़ चुकाना टूल अब सिम्युलेशन की रकमें आख़िरी इकाई तक नहीं दिखाते। 10,58,721 का बीच का नतीजा एकदम सटीक लगता था, जबकि दूसरे रैंडम आँकड़ों के साथ वह लगभग 1% इधर-उधर हो जाता। पेज अब 10,60,000 दिखाता है: उतना ही बारीक जितना फ़र्क़ सिम्युलेशन भरोसे के साथ बता सकता है। स्प्रेडशीट में पूरे अंक रहते हैं।',
          es: 'El simulador Monte Carlo y la herramienta Invertir o pagar deuda ya no muestran las cantidades simuladas hasta la última unidad. Una mediana de 1.058.721 parecía exacta, pero con otros sorteos aleatorios se movería en torno a un 1\u00a0%. La página muestra ahora 1.060.000: tan fino como la simulación permite distinguir. La hoja de cálculo conserva todas las cifras.',
          cs: 'Simulátor Monte Carlo a\u00a0nástroj Investovat, nebo splatit dluh už neukazují simulované částky na poslední jednotku. Medián 1\u00a0058\u00a0721 vypadal přesně, ale s\u00a0jinými náhodnými čísly by se posunul zhruba o\u00a01\u00a0%. Stránka teď ukazuje 1\u00a0060\u00a0000: tak jemně, jak to simulace dokáže rozlišit. V\u00a0tabulce zůstávají všechny číslice.',
          mr: 'मॉन्टे कार्लो सिम्युलेटर आणि गुंतवणूक की कर्जफेड हे टूल आता सिम्युलेशनच्या रकमा शेवटच्या एककापर्यंत दाखवत नाहीत. 10,58,721 हा मध्यक अगदी नेमका वाटायचा, पण वेगळ्या आकड्यांसह तो सुमारे 1% इकडेतिकडे झाला असता. पान आता 10,60,000 दाखवते: सिम्युलेशनला जितका फरक खात्रीने सांगता येतो तितकेच बारीक. स्प्रेडशीटमध्ये सर्व अंक राहतात.',
        },
      },
      {
        id: 'links-underlined',
        text: {
          en: 'Links inside a sentence are now underlined everywhere on the site. On the volunteers page, at the foot of each lesson and on two of the free tools, some links differed from the words around them by colour alone, which is easy to miss if you do not see colours well or are reading on a phone in sunlight.',
          hi: 'वाक्य के अंदर के लिंक अब पूरी साइट पर रेखांकित दिखते हैं। स्वयंसेवक पेज पर, हर पाठ के अंत में और दो मुफ़्त टूल पर कुछ लिंक आसपास के शब्दों से सिर्फ़ रंग से अलग दिखते थे। जिन्हें रंगों का फ़र्क ठीक से नहीं दिखता, या जो धूप में फ़ोन पर पढ़ रहे हों, उनसे ऐसे लिंक आसानी से छूट जाते हैं।',
          es: 'Los enlaces dentro de una frase aparecen ahora subrayados en todo el sitio. En la página de voluntariado, al final de cada lección y en dos de las herramientas gratuitas, algunos enlaces se distinguían de las palabras que los rodean solo por el color, algo fácil de pasar por alto si no distingues bien los colores o lees en el teléfono a pleno sol.',
          cs: 'Odkazy uvnitř věty jsou teď podtržené na celém webu. Na stránce pro dobrovolníky, na konci každé lekce a\u00a0u\u00a0dvou nástrojů zdarma se některé odkazy lišily od okolních slov jen barvou, což se snadno přehlédne, když špatně rozlišujete barvy nebo čtete na telefonu na slunci.',
          mr: 'वाक्यातील लिंक आता संपूर्ण साइटवर अधोरेखित दिसतात. स्वयंसेवकांच्या पानावर, प्रत्येक धड्याच्या शेवटी आणि दोन मोफत साधनांवर काही लिंक आजूबाजूच्या शब्दांपासून फक्त रंगाने वेगळ्या दिसत होत्या. रंगांमधला फरक नीट दिसत नसेल, किंवा उन्हात फोनवर वाचत असाल, तर अशा लिंक सहज नजरेतून सुटतात.',
        },
      },
      {
        id: 'tools-read-other-digits',
        text: {
          en: 'The free tools now read numbers typed with Devanagari (१२३), Eastern Arabic (١٢٣) or Persian (۱۲۳) digits. If your keyboard writes १२३, the tools take it as 123 and no longer ask you for a number.',
          hi: 'मुफ़्त टूल अब देवनागरी (१२३), पूर्वी अरबी (١٢٣) या फ़ारसी (۱۲۳) अंकों में लिखी संख्याएँ भी पढ़ लेते हैं। अगर आपका कीबोर्ड १२३ लिखता है, तो टूल उसे 123 मानते हैं और अब संख्या भरने को नहीं कहते।',
          es: 'Las herramientas gratuitas ya leen los números escritos con cifras devanagari (१२३), árabes orientales (١٢٣) o persas (۱۲۳). Si tu teclado escribe १२३, las herramientas lo toman como 123 y ya no te piden un número.',
          cs: 'Nástroje zdarma teď přečtou i\u00a0čísla napsaná dévanágarskými (१२३), východoarabskými (١٢٣) nebo perskými (۱۲۳) číslicemi. Když vaše klávesnice píše १२३, nástroje to berou jako 123 a\u00a0už po vás nechtějí číslo.',
          mr: 'मोफत साधने आता देवनागरी (१२३), पूर्व अरबी (١٢٣) किंवा फारसी (۱۲۳) अंकांत लिहिलेल्या संख्याही वाचतात. तुमचा कीबोर्ड १२३ लिहीत असेल, तर साधने ते 123 असे वाचतात आणि आता संख्या भरायला सांगत नाहीत.',
        },
      },
      {
        id: 'sign-up-sends-less',
        text: {
          en: 'The waitlist and newsletter forms now send less to my analytics. Signing up used to send the part of your email address after the @, and on a personal or small company domain that part can point to one person. It is no longer sent, and a waitlist sign-up is now counted under a random code, not one made from your address.',
          hi: 'वेटलिस्ट और न्यूज़लेटर के फ़ॉर्म अब एनालिटिक्स को कम भेजते हैं। पहले साइन अप करने पर आपके ईमेल पते का @ के बाद वाला हिस्सा भी भेजा जाता था, और निजी या छोटी कंपनी के डोमेन में वह हिस्सा किसी एक व्यक्ति की ओर इशारा कर सकता है। अब वह नहीं भेजा जाता, और वेटलिस्ट का साइन अप अब एक रैंडम कोड के तहत गिना जाता है, आपके पते से बने कोड के तहत नहीं।',
          es: 'Los formularios de la lista de espera y del boletín envían ahora menos a la analítica. Antes, al apuntarte, se enviaba la parte de tu correo que va después de la @, y en un dominio personal o de una empresa pequeña esa parte puede señalar a una sola persona. Ya no se envía, y cada alta en la lista de espera se cuenta ahora con un código aleatorio, no con uno creado a partir de tu dirección.',
          cs: 'Formuláře pro čekací listinu a\u00a0newsletter teď posílají webové analytice méně. Při přihlášení se dříve odesílala část vaší e-mailové adresy za znakem @ a\u00a0u\u00a0osobní domény nebo domény malé firmy může tato část ukazovat na jednoho člověka. Už se neodesílá a\u00a0přihlášení na čekací listinu se teď počítá pod náhodným kódem, ne pod kódem vytvořeným z\u00a0vaší adresy.',
          mr: 'प्रतीक्षा यादी आणि न्यूजलेटरचे फॉर्म आता वापराच्या विश्लेषणासाठी (analytics) कमी माहिती पाठवतात. आधी नोंदणी करताना तुमच्या ईमेल पत्त्यातील @ चिन्हानंतरचा भागही पाठवला जायचा, आणि वैयक्तिक किंवा लहान कंपनीच्या डोमेनमध्ये तो भाग एकाच व्यक्तीकडे निर्देश करू शकतो. आता तो पाठवला जात नाही, आणि प्रतीक्षा यादीतील नोंदणी आता तुमच्या पत्त्यापासून बनवलेल्या कोडऐवजी प्रत्येक वेळी नव्याने तयार होणाऱ्या कोडखाली मोजली जाते.',
        },
      },
      {
        id: 'invest-or-pay-off-says-what-it-assumes',
        text: {
          en: 'The invest or pay off tool is plainer about three things. The debt\'s rate is now shown as what it costs over a year when interest is charged monthly (6.5% comes to 6.70%), so it sits fairly beside the investment\'s yearly return. If you type your own return, the tool says its ups and downs stay those of world stocks, far wider than a savings account\'s. And this tool and the Monte Carlo simulator both say their return history is measured in US dollars.',
          hi: 'निवेश या कर्ज़ चुकाना टूल अब तीन बातें ज़्यादा साफ़ कहता है। कर्ज़ की दर अब वह दिखती है जो ब्याज हर महीने लगने पर साल भर में बनती है (6.5% का मतलब 6.70%), ताकि वह निवेश के सालाना रिटर्न के सामने बराबरी से रखी जाए। अगर आप अपना रिटर्न भरते हैं, तो टूल बताता है कि उतार-चढ़ाव दुनिया भर के शेयरों वाला ही रहता है, जो बचत खाते से कहीं ज़्यादा है। और यह टूल और मोंटे कार्लो सिम्युलेटर, दोनों बताते हैं कि उनके रिटर्न का इतिहास अमेरिकी डॉलर में नापा गया है।',
          es: 'La herramienta Invertir o pagar deuda es más clara en tres cosas. El tipo de la deuda se muestra ahora como lo que cuesta en un año cuando los intereses se cobran cada mes (un 6,5\u00a0% equivale a un 6,70\u00a0%), para compararlo en igualdad con la rentabilidad anual de la inversión. Si escribes tu propia rentabilidad, la herramienta avisa de que los altibajos siguen siendo los de la bolsa mundial, mucho mayores que los de una cuenta de ahorro. Y tanto esta herramienta como el simulador Monte Carlo dicen que su historia de rentabilidades está medida en dólares estadounidenses.',
          cs: 'Nástroj Investovat, nebo splatit dluh je ve třech věcech srozumitelnější. Úrok dluhu se teď ukazuje jako to, co dluh stojí za rok, když se úrok připisuje měsíčně (6,5\u00a0% odpovídá 6,70\u00a0%), aby šel poctivě srovnat s\u00a0ročním výnosem investice. Když zadáte vlastní výnos, nástroj řekne, že výkyvy zůstávají stejné jako u\u00a0světových akcií, tedy mnohem větší než u\u00a0spořicího účtu. A\u00a0tento nástroj i\u00a0simulátor Monte Carlo uvádějí, že jejich historie výnosů je měřená v\u00a0amerických dolarech.',
          mr: 'गुंतवणूक की कर्जफेड हे टूल आता तीन गोष्टी अधिक स्पष्ट सांगते. कर्जाचा दर आता व्याज दर महिन्याला लागल्यावर वर्षभरात जेवढा होतो तेवढा दाखवला जातो (6.5% म्हणजे 6.70%), म्हणजे तो गुंतवणुकीच्या वार्षिक परताव्याशी नीट तुलना करता येतो. तुम्ही स्वतःचा परतावा भरला, तर टूल सांगते की चढ-उतार जागतिक शेअर्सचेच राहतात, जे बचत खात्यापेक्षा खूप जास्त असतात. आणि हे टूल आणि मॉन्टे कार्लो सिम्युलेटर, दोघेही सांगतात की त्यांच्या परताव्यांचा इतिहास अमेरिकी डॉलरमध्ये मोजलेला आहे.',
        },
      },
      {
        id: 'simulator-reads-numbers-your-way',
        text: {
          en: 'The Monte Carlo simulator now reads the numbers you type the way your page\'s language writes them, as the other tools already do: on the Spanish page “50.000” is fifty thousand and “0,5” is a half, and on the Hindi page you can type “10,00,000”. The number of simulated paths follows the same style, so the Hindi and Marathi pages show 1,00,000 paths.',
          hi: 'मोंटे कार्लो सिम्युलेटर अब आपके लिखे अंक उसी तरह पढ़ता है जैसे आपके पेज की भाषा उन्हें लिखती है, जैसा बाकी टूल पहले से करते हैं: स्पैनिश पेज पर “50.000” पचास हज़ार है और “0,5” आधा, और हिन्दी पेज पर आप “10,00,000” लिख सकते हैं। सिम्युलेटेड रास्तों की गिनती भी इसी ढंग से दिखती है, इसलिए हिन्दी और मराठी पेज 1,00,000 रास्ते दिखाते हैं।',
          es: 'El simulador Monte Carlo lee ahora los números que escribes como los escribe el idioma de tu página, igual que las demás herramientas: en la página en español «50.000» es cincuenta mil y «0,5» es un medio, y en la página en hindi se puede escribir «10,00,000». El número de trayectorias simuladas sigue el mismo estilo, así que las páginas en hindi y maratí muestran 1,00,000 trayectorias.',
          cs: 'Simulátor Monte Carlo teď čte zadaná čísla tak, jak je píše jazyk vaší stránky, stejně jako ostatní nástroje: na české stránce je „50\u00a0000“ padesát tisíc a\u00a0„0,5“ polovina, na hindské stránce lze napsat „10,00,000“. Počty simulovaných trajektorií se píšou stejně, takže hindská a\u00a0maráthská stránka ukazují 1,00,000 trajektorií.',
          mr: 'मॉन्टे कार्लो सिम्युलेटर आता तुम्ही भरलेले आकडे तुमच्या पानाच्या भाषेत ते जसे लिहिले जातात तसेच वाचतो, इतर साधनांप्रमाणेच: स्पॅनिश पानावर “50.000” म्हणजे पन्नास हजार आणि “0,5” म्हणजे अर्धा, आणि मराठी पानावर तुम्ही “10,00,000” लिहू शकता. संभाव्य मार्गांची संख्याही त्याच पद्धतीने दिसते, त्यामुळे हिंदी आणि मराठी पानावर 1,00,000 मार्ग दिसतात.',
        },
      },
      {
        id: 'net-worth-share-bands',
        text: {
          en: 'The net worth calculator no longer speaks of a “risk level”. The cards are now headed “Share of net worth by currency”, and the page says plainly that its low, moderate and elevated bands are the tool\'s own way of grouping shares: not a standard, and not a judgement of you.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर अब “जोखिम का स्तर” नहीं कहता। कार्डों का शीर्षक अब “मुद्रा के हिसाब से शुद्ध संपत्ति का हिस्सा” है, और पेज साफ़ कहता है कि कम, मध्यम और ज़्यादा वाले स्तर इस टूल का अपना बाँटने का तरीक़ा हैं: न कोई मानक, न आप पर कोई फ़ैसला।',
          es: 'La calculadora de patrimonio neto ya no habla de un «nivel de riesgo». Las tarjetas se titulan ahora «Parte del patrimonio neto por moneda», y la página dice con claridad que sus niveles bajo, moderado y elevado son la forma en que la herramienta agrupa las partes: no son un estándar ni una valoración sobre ti.',
          cs: 'Kalkulačka čistého jmění už nemluví o\u00a0„úrovni rizika“. Karty teď mají nadpis „Podíl na čistém jmění podle měn“ a\u00a0stránka říká jasně, že nízké, střední a\u00a0zvýšené pásmo je vlastní členění tohoto nástroje: není to standard ani hodnocení vaší situace.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटर आता “जोखमीची पातळी” असे म्हणत नाही. कार्डांचे शीर्षक आता “चलनानुसार निव्वळ संपत्तीचा हिस्सा” आहे, आणि पान स्पष्ट सांगते की कमी, मध्यम आणि जास्त हे पट्टे म्हणजे या साधनाची हिस्से गटांत मांडण्याची स्वतःची पद्धत आहे: ते मानक नाही, आणि तुमच्याबद्दलचा निवाडाही नाही.',
        },
      },
      {
        id: 'inflation-currency-changes',
        text: {
          en: 'The inflation calculator now says when a country changed its currency inside the years you pick. Türkiye struck six zeros off the lira in 2005, so 10,000 lira of 1990 used to come out as about 249 million: right as a measure of prices, and a million times too large as today\'s lira. The answer now comes in today\'s money and says which change it allowed for, in 38 countries, from Brazil\'s reforms to the euro changeovers.',
          hi: 'महँगाई कैलकुलेटर अब बताता है कि आपके चुने हुए सालों के बीच किसी देश ने अपनी मुद्रा कब बदली। तुर्किये ने 2005 में लीरा से छह शून्य हटाए थे, इसलिए 1990 के 10,000 लीरा का जवाब लगभग 24.9 करोड़ आता था: क़ीमतों के पैमाने के तौर पर सही, पर आज के लीरा में दस लाख गुना ज़्यादा। अब जवाब आज की मुद्रा में आता है और साथ में लिखा होता है कि कौन-सा बदलाव गिना गया। यह 38 देशों के लिए है, ब्राज़ील के मुद्रा सुधारों से लेकर यूरो अपनाने तक।',
          es: 'La calculadora de inflación indica ahora cuándo un país cambió de moneda dentro de los años que eliges. Turquía le quitó seis ceros a la lira en 2005, así que 10.000 liras de 1990 daban unos 249\u00a0millones: correcto como medida de los precios, y un millón de veces de más como liras de hoy. La respuesta sale ahora en la moneda actual e indica qué cambio tuvo en cuenta, en 38\u00a0países, desde las reformas de Brasil hasta los cambios al euro.',
          cs: 'Inflační kalkulačka teď upozorní, když země ve zvolených letech změnila měnu. Turecko v\u00a0roce 2005 škrtlo z\u00a0liry šest nul, takže 10\u00a0000 lir z\u00a0roku 1990 vycházelo zhruba na 249\u00a0milionů: jako měřítko cen správně, ale v\u00a0dnešních lirách milionkrát víc. Odpověď teď vychází v\u00a0dnešní měně a\u00a0uvádí, se kterou změnou počítá, a\u00a0to u\u00a038\u00a0zemí, od brazilských reforem po přechody na euro.',
          mr: 'महागाई कॅल्क्युलेटर आता सांगतो की तुम्ही निवडलेल्या वर्षांदरम्यान एखाद्या देशाने आपले चलन कधी बदलले. तुर्कियेने 2005 साली लिरामधून सहा शून्ये काढली, त्यामुळे 1990\u00a0च्या 10,000 लिरांचे उत्तर सुमारे 24.9 कोटी येत होते: किमतींचे माप म्हणून बरोबर, पण आजच्या लिरांत दहा लाख पट जास्त. आता उत्तर आजच्या चलनात येते आणि कोणता बदल धरला आहे तेही सांगते. हे 38 देशांसाठी आहे, ब्राझीलच्या चलन सुधारणांपासून युरो स्वीकारण्यापर्यंत.',
        },
      },
      {
        id: 'exports-keep-what-you-typed',
        text: {
          en: 'The spreadsheets and printed reports from the free tools now show a rate exactly as you typed it: 4.875% stays 4.875, where some of them rounded it to 4.88. In the loan comparison\'s report, lump-sum prepayments are written out for reading (“Month 12: 5,000.00”), with amounts in the same number format as the rest of the page.',
          hi: 'मुफ़्त टूल्स की स्प्रेडशीट और छपी रिपोर्ट अब दर को ठीक वैसे ही दिखाती हैं जैसे आपने भरी थी: 4.875% अब 4.875 ही रहता है, जबकि पहले कुछ जगह यह 4.88 हो जाता था। लोन तुलना की रिपोर्ट में एकमुश्त राशियाँ अब पढ़ने लायक़ ढंग से लिखी जाती हैं (“महीना 12: 5,000.00”), और रकमें उसी अंक-शैली में होती हैं जो बाक़ी पेज पर है।',
          es: 'Las hojas de cálculo y los informes impresos de las herramientas gratuitas muestran ahora cada tasa tal como la escribiste: 4,875 % sigue siendo 4,875, cuando algunas la redondeaban a 4,88. En el informe del comparador de préstamos, los pagos extraordinarios aparecen escritos para leerse («Mes 12: 5000,00»), con las cantidades en el mismo formato numérico que el resto de la página.',
          cs: 'Tabulky a\u00a0tištěné přehledy z\u00a0nástrojů zdarma teď ukazují sazbu přesně tak, jak byla zadána: 4,875 % zůstává 4,875, zatímco dřív ji některé zaokrouhlovaly na 4,88. V\u00a0přehledu ze srovnání úvěrů jsou jednorázové mimořádné splátky vypsané čitelně („Měsíc 12: 5 000,00“), s\u00a0částkami ve stejném číselném formátu jako zbytek stránky.',
          mr: 'मोफत साधनांच्या स्प्रेडशीट आणि छापील अहवालांत आता दर तुम्ही भरला तसाच दिसतो: 4.875% हा 4.875 च राहतो, आधी काही ठिकाणी तो 4.88 होत होता. कर्जांच्या तुलनेच्या अहवालात एकरकमी भरणे आता वाचता येतील असे लिहिले जातात (“महिना 12: 5,000.00”), आणि रकमा पानावरील इतर आकड्यांच्याच स्वरूपात असतात.',
        },
      },
      {
        id: 'break-even-says-what-it-means',
        text: {
          en: 'The loan comparison\'s refinance scenario no longer answers “n/a” for break-even. When nothing is paid to refinance, it says so, and says “from the first month” if the payment is lower. When closing costs are added to the new loan, break-even now counts the larger balance you owe. And an offer whose points cost is more than its fee now says the two boxes disagree, where it used to show a break-even worked out on the wrong cost.',
          hi: 'लोन तुलना का रीफ़ाइनेंस वाला हिस्सा अब बराबरी के समय के लिए “लागू नहीं” नहीं कहता। जब रीफ़ाइनेंस के लिए कुछ नहीं चुकाना पड़ता, तो यह वही बताता है, और किस्त कम हो तो “पहले महीने से” कहता है। जब कागज़ी खर्च नए लोन में जोड़ा जाता है, तो बराबरी का समय अब बढ़े हुए बकाए को भी गिनता है। और जिस लोन ऑफ़र में पॉइंट्स की लागत उसके शुल्क से ज़्यादा है, वहाँ अब बताया जाता है कि दोनों खाने आपस में मेल नहीं खाते; पहले वहाँ ग़लत लागत पर निकला बराबरी का समय दिखता था।',
          es: 'El escenario de refinanciación del comparador de préstamos ya no responde «n. d.» en el punto de equilibrio. Cuando no se paga nada por refinanciar, lo dice, y dice «desde el primer mes» si la cuota es más baja. Cuando los gastos iniciales se suman al préstamo nuevo, el punto de equilibrio cuenta ahora el saldo mayor que se debe. Y una oferta cuyo costo de puntos es mayor que su comisión indica ahora que las dos casillas no concuerdan; antes mostraba un punto de equilibrio calculado sobre un costo equivocado.',
          cs: 'Scénář refinancování ve srovnání úvěrů už u\u00a0doby návratnosti neodpovídá „není k\u00a0dispozici“. Když se za refinancování nic neplatí, řekne to, a\u00a0je-li splátka nižší, uvede „od prvního měsíce“. Když se náklady na uzavření přičtou k\u00a0novému úvěru, počítá teď doba návratnosti i\u00a0s\u00a0vyšší dlužnou jistinou. A\u00a0nabídka, u\u00a0které je cena bodů vyšší než poplatek, teď upozorní, že si obě pole odporují; dřív ukazovala dobu návratnosti spočítanou ze špatné částky.',
          mr: 'कर्जांच्या तुलनेतील पुनर्वित्त परिदृश्य आता खर्च वसूल होण्याच्या टप्प्यासाठी “लागू नाही” असे उत्तर देत नाही. पुनर्वित्तासाठी काहीही भरावे लागत नसेल, तर ते तसे सांगते, आणि हप्ता कमी असेल तर “पहिल्या महिन्यापासून” असे सांगते. व्यवहार खर्च नवीन कर्जात जोडला असेल, तर हा टप्पा आता वाढलेली बाकीही धरतो. आणि ज्या कर्जाच्या प्रस्तावात पॉइंट्सचा खर्च शुल्कापेक्षा जास्त आहे, तिथे आता दोन्ही रकाने एकमेकांशी जुळत नाहीत असे सांगितले जाते; आधी तिथे चुकीच्या खर्चावर काढलेला टप्पा दिसत होता.',
        },
      },
      {
        id: 'loan-monthly-premium-not-a-fee',
        text: {
          en: 'The loan comparison used to suggest adding the lifetime cost of bundled insurance to the fee box. That treats years of monthly premiums as paid on the first day, which makes the APR look higher than it is. Its questions and small print now say so: a cost paid once goes in the fee box, a cost paid every month is not modelled, and the totals are the check.',
          hi: 'लोन तुलना पहले यह सुझाती थी कि लोन के साथ जुड़े बीमे की पूरी अवधि की लागत शुल्क वाले फ़ील्ड में जोड़ दी जाए। इससे बरसों के मासिक प्रीमियम पहले ही दिन चुकाए हुए मान लिए जाते हैं, और APR असल से ज़्यादा दिखता है। अब इसके सवाल-जवाब और नीचे की टिप्पणी यही बताते हैं: एक बार चुकाई जाने वाली लागत शुल्क वाले फ़ील्ड में जाती है, हर महीने चुकाई जाने वाली लागत इसमें शामिल नहीं है, और कुल रकमों से इसकी जाँच होती है।',
          es: 'El comparador de préstamos sugería sumar al campo de la comisión el costo de un seguro vinculado durante toda la vida del préstamo. Eso trata años de primas mensuales como si se pagaran el primer día, y el APR parece más alto de lo que es. Sus preguntas y su letra pequeña ahora lo dicen: un costo que se paga una sola vez va en el campo de la comisión, un costo que se paga cada mes no se incluye en el cálculo, y los totales sirven de comprobación.',
          cs: 'Srovnání úvěrů dřív radilo přičíst celkové náklady na povinné pojištění do pole poplatku. Tím se roky měsíčního pojistného počítají, jako by byly zaplaceny první den, a\u00a0APR pak vypadá vyšší, než je. Otázky a\u00a0poznámka pod čarou to teď říkají: jednorázový náklad patří do pole poplatku, náklad placený každý měsíc výpočet nezahrnuje a\u00a0kontrolou jsou celkové částky.',
          mr: 'कर्जांची तुलना आधी असे सुचवत होती की कर्जासोबत जोडलेल्या विम्याचा संपूर्ण काळातील खर्च शुल्काच्या रकान्यात जोडावा. त्यामुळे विम्याचे वर्षानुवर्षांचे मासिक हप्ते पहिल्याच दिवशी भरल्यासारखे धरले जातात, आणि APR प्रत्यक्षापेक्षा जास्त दिसतो. आता त्यातील प्रश्नोत्तरे आणि खालील टीप हेच सांगतात: एकदाच भरला जाणारा खर्च शुल्काच्या रकान्यात जातो, दर महिन्याला भरला जाणारा खर्च यात धरलेला नाही, आणि एकूण रकमा हा त्याचा पडताळा आहे.',
        },
      },
      {
        id: 'refinance-counts-penalty',
        text: {
          en: 'The refinance scenario in the loan comparison now counts an early repayment penalty on the loan being refinanced: it has its own line, and it is part of the total and of the break-even. Extra payments you entered now continue on the new loan, so both sides are paid down the same way, and the break-even compares only the payments due. Before, a refinance could look better or worse than it was.',
          hi: 'लोन तुलना का रीफ़ाइनेंस वाला हिस्सा अब उस लोन पर जल्दी चुकाने का जुर्माना भी गिनता है जिसे रीफ़ाइनेंस किया जा रहा है: उसकी अपनी पंक्ति है, और वह कुल में तथा बराबरी के समय में शामिल है। आपकी भरी हुई अतिरिक्त किस्तें अब नए लोन पर भी जारी रहती हैं, ताकि दोनों पक्ष एक ही तरह चुकाए जाएँ, और बराबरी का समय केवल देय किस्तों की तुलना करता है। पहले रीफ़ाइनेंस असल से बेहतर या बदतर दिख सकता था।',
          es: 'El escenario de refinanciación del comparador de préstamos cuenta ahora la penalización por pago anticipado del préstamo que se refinancia: tiene su propia línea y forma parte del total y del punto de equilibrio. Los pagos extra que escribiste continúan ahora en el préstamo nuevo, de modo que ambos lados se amortizan igual, y el punto de equilibrio compara solo las cuotas exigidas. Antes, una refinanciación podía parecer mejor o peor de lo que era.',
          cs: 'Scénář refinancování ve srovnání úvěrů teď počítá i\u00a0s\u00a0poplatkem za předčasné splacení refinancovaného úvěru: má vlastní řádek a\u00a0je součástí celkové částky i\u00a0doby návratnosti. Zadané mimořádné splátky teď pokračují i\u00a0u\u00a0nového úvěru, takže se obě varianty splácejí stejně, a\u00a0doba návratnosti porovnává jen předepsané splátky. Dřív mohlo refinancování vypadat lépe nebo hůř, než jaké bylo.',
          mr: 'कर्जांच्या तुलनेतील पुनर्वित्त परिदृश्य आता पुनर्वित्त होणाऱ्या कर्जावरील मुदतपूर्व परतफेडीचा दंडही धरते: त्याची स्वतंत्र ओळ आहे, आणि तो एकूण रकमेत तसेच खर्च वसूल होण्याच्या टप्प्यात धरलेला आहे. तुम्ही भरलेले अतिरिक्त हप्ते आता नवीन कर्जावरही चालू राहतात, त्यामुळे दोन्ही बाजू एकाच पद्धतीने फेडल्या जातात, आणि खर्च वसूल होण्याचा टप्पा फक्त देय हप्त्यांची तुलना करतो. आधी पुनर्वित्त प्रत्यक्षापेक्षा चांगले किंवा वाईट दिसू शकत होते.',
        },
      },
      {
        id: 'share-window-keeps-focus',
        text: {
          en: 'In the net worth calculator\'s share window, pressing Copy link with the keyboard no longer throws you back to the first option: focus stays on the button. If copying fails and the address is shown instead, the Tab key now reaches it.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर की शेयर विंडो में कीबोर्ड से “लिंक कॉपी करें” दबाने पर अब आप पहले विकल्प पर वापस नहीं पहुँचते: फ़ोकस बटन पर ही रहता है। अगर कॉपी न हो पाए और उसकी जगह पता दिखे, तो Tab कुंजी अब उस तक पहुँचती है।',
          es: 'En la ventana para compartir de la calculadora de patrimonio neto, pulsar «Copiar enlace» con el teclado ya no te devuelve a la primera opción: el foco se queda en el botón. Si la copia falla y en su lugar se muestra la dirección, la tecla Tab ahora llega hasta ella.',
          cs: 'V\u00a0okně pro sdílení v\u00a0kalkulačce čistého jmění vás stisk tlačítka pro kopírování odkazu na klávesnici už nevrací na první volbu: fokus zůstává na tlačítku. Když se kopírování nepodaří a\u00a0místo toho se zobrazí adresa, klávesa Tab se k\u00a0ní teď dostane.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटरच्या शेअर विंडोमध्ये कीबोर्डने “लिंक कॉपी करा” दाबल्यावर आता तुम्ही पहिल्या पर्यायावर परत फेकले जात नाही: फोकस बटणावरच राहतो. कॉपी झाली नाही आणि त्याऐवजी पत्ता दिसला, तर Tab कळ आता त्याच्यापर्यंत पोहोचते.',
        },
      },
      {
        id: 'loan-interest-exact-cent',
        text: {
          en: 'The loan comparison now rounds each month\'s interest exactly. When a month\'s interest landed precisely on half a cent, the tool could round it down by mistake, one cent short in that row. It was rare, and it is fixed. A number written as 1e5 or 0x10 is also no longer read as an amount: the tool asks for plain digits.',
          hi: 'लोन तुलना टूल में अब हर महीने का ब्याज बिल्कुल सही पूर्णांकित होता है। जब किसी महीने का ब्याज ठीक आधे पैसे पर आता था, तो टूल ग़लती से उसे नीचे की ओर पूर्णांकित कर सकता था, यानी उस पंक्ति में एक पैसा कम। ऐसा कम ही होता था, और अब ठीक कर दिया गया है। 1e5 या 0x10 की तरह लिखी संख्या भी अब राशि नहीं मानी जाती: टूल सादे अंक माँगता है।',
          es: 'El comparador de préstamos redondea ahora con exactitud los intereses de cada mes. Cuando los intereses de un mes caían justo en medio céntimo, la herramienta podía redondearlos hacia abajo por error, un céntimo menos en esa fila. Ocurría pocas veces, y ya está corregido. Además, un número escrito como 1e5 o 0x10 ya no se lee como una cantidad: la herramienta pide cifras simples.',
          cs: 'Srovnání úvěrů teď zaokrouhluje úrok za každý měsíc přesně. Když úrok za měsíc vyšel přesně na půl haléře, mohl ho nástroj omylem zaokrouhlit dolů, tedy o\u00a0haléř méně v\u00a0daném řádku. Stávalo se to zřídka a\u00a0je to opraveno. Číslo zapsané jako 1e5 nebo 0x10 se už také nečte jako částka: nástroj žádá obyčejné číslice.',
          mr: 'कर्जांची तुलना आता प्रत्येक महिन्याचे व्याज अचूक पूर्णांकित करते. एखाद्या महिन्याचे व्याज नेमके अर्ध्या पैशावर आले, तर साधन चुकून ते खालच्या बाजूला पूर्णांकित करू शकत होते, म्हणजे त्या ओळीत एक पैसा कमी. असे क्वचितच घडत होते, आणि आता ते दुरुस्त झाले आहे. 1e5 किंवा 0x10 असे लिहिलेला आकडाही आता रक्कम म्हणून वाचला जात नाही: साधन साधे अंक मागते.',
        },
      },
      {
        id: 'share-link-fits-phone',
        text: {
          en: 'Copying a share link on a phone no longer makes the page wider than the screen in the loan comparison and the net worth calculator: the copied address now fits inside its box. The net worth share window also fits small screens, so its options and buttons are no longer cut off. In all five tools the buttons under the copy button stay where they are when it changes to say the link was copied.',
          hi: 'फ़ोन पर शेयर लिंक कॉपी करने से लोन तुलना और शुद्ध संपत्ति कैलकुलेटर में पन्ना अब स्क्रीन से चौड़ा नहीं होता: कॉपी किया गया पता अब अपने खाने के अंदर ही रहता है। शुद्ध संपत्ति की शेयर विंडो भी अब छोटी स्क्रीन में पूरी आती है, इसलिए उसके विकल्प और बटन कटते नहीं। पाँचों टूल में, कॉपी बटन पर लिंक कॉपी होने की सूचना आने पर उसके नीचे के बटन अपनी जगह से नहीं हिलते।',
          es: 'Copiar un enlace para compartir desde el teléfono ya no hace que la página sea más ancha que la pantalla en el comparador de préstamos ni en la calculadora de patrimonio neto: la dirección copiada cabe ahora dentro de su recuadro. La ventana para compartir de la calculadora de patrimonio neto también cabe en pantallas pequeñas, así que sus opciones y botones ya no quedan cortados. En las cinco herramientas, los botones que están debajo del botón de copiar se quedan en su sitio cuando este cambia para indicar que el enlace se copió.',
          cs: 'Zkopírování odkazu ke sdílení na telefonu už nerozšíří stránku přes okraj obrazovky ve srovnání úvěrů ani v\u00a0kalkulačce čistého jmění: zkopírovaná adresa se teď vejde do svého rámečku. Okno pro sdílení v\u00a0kalkulačce čistého jmění se vejde i\u00a0na malé obrazovky, takže jeho volby a\u00a0tlačítka už nejsou oříznuté. Ve všech pěti nástrojích zůstávají tlačítka pod tlačítkem pro kopírování na svém místě, když se na něm objeví, že je odkaz zkopírovaný.',
          mr: 'फोनवर शेअर लिंक कॉपी केल्यावर कर्जांची तुलना आणि निव्वळ संपत्ती कॅल्क्युलेटर या साधनांत पान आता स्क्रीनपेक्षा रुंद होत नाही: कॉपी केलेला पत्ता आता त्याच्या चौकटीतच मावतो. निव्वळ संपत्तीची शेअर विंडोही आता लहान स्क्रीनवर पूर्ण मावते, त्यामुळे तिचे पर्याय आणि बटणे कापली जात नाहीत. पाचही साधनांत, कॉपी बटणावर लिंक कॉपी झाल्याचे दिसते तेव्हा त्याखालची बटणे जागची हलत नाहीत.',
        },
      },
      {
        id: 'beliefs-in-practice',
        text: {
          en: 'The beliefs page now says, under five of the beliefs, what I do about each one in practice, with a link to where you can check. There is also a new Accessibility page: what works today, the barriers I know are still open, and how to tell me about one. You do not need to share a diagnosis. It is linked at the bottom of every page.',
          hi: 'सिद्धांतों वाले पन्ने पर अब पाँच सिद्धांतों के नीचे लिखा है कि व्यवहार में उनके लिए क्या किया जाता है, साथ में वह लिंक जहाँ आप इसे जाँच सकते हैं। एक नया सुगम्यता (accessibility) पन्ना भी है: आज क्या काम करता है, कौन-सी रुकावटें अब भी खुली हैं और मुझे पता हैं, और रुकावट के बारे में मुझे कैसे बताएँ। आपको अपना कोई निदान बताने की ज़रूरत नहीं है। इसका लिंक हर पन्ने के सबसे नीचे है।',
          es: 'La página de creencias dice ahora, debajo de cinco de ellas, qué hago en la práctica con cada una, con un enlace a donde puedes comprobarlo. También hay una página nueva de Accesibilidad: qué funciona hoy, qué barreras sé que siguen abiertas y cómo contarme una. No hace falta que compartas ningún diagnóstico. Está enlazada al final de todas las páginas.',
          cs: 'Stránka Čemu věřím teď pod pěti zásadami říká, co pro každou z\u00a0nich v\u00a0praxi dělám, s\u00a0odkazem na místo, kde si to můžete ověřit. Přibyla také stránka Přístupnost: co dnes funguje, o\u00a0kterých otevřených překážkách vím a\u00a0jak mi dát vědět o\u00a0další. Diagnózu sdílet nemusíte. Odkaz na ni je dole na každé stránce.',
          mr: 'तत्त्वांच्या पानावर आता पाच तत्त्वांखाली, प्रत्यक्षात त्यासाठी काय केले जाते ते लिहिले आहे, आणि ते कुठे तपासता येईल त्याची लिंक आहे. सुलभता (accessibility) हे नवे पानही आहे: आज काय चालते, कोणते अडथळे अजून खुले आहेत हे मला माहीत आहे, आणि अडथळ्याबद्दल मला कसे कळवायचे. तुम्हाला कोणतेही निदान सांगण्याची गरज नाही. त्याची लिंक प्रत्येक पानाच्या तळाशी आहे.',
        },
      },
      {
        id: 'tools-one-frame',
        text: {
          en: 'The five free tools now share one page frame: the same header, questions and related lessons on every tool, so a new tool cannot drift from the others. On the net worth calculator, the note on net against gross exposure (a large debt in a currency can hide how much you hold in it) is now always visible, where before it sat inside the folded “How the calculation works”. The one-line introductions above the related lessons on the loan and net worth pages are gone, since they added nothing the cards do not say.',
          hi: 'पाँचों मुफ़्त टूल के पन्नों का ढाँचा अब एक ही है: हर टूल पर वही शीर्ष भाग, वही सवाल-जवाब और वही संबंधित पाठ, ताकि कोई नया टूल बाकियों से अलग न दिखने लगे। शुद्ध संपत्ति कैलकुलेटर में शुद्ध और सकल एक्सपोज़र वाली टिप्पणी (किसी मुद्रा में बड़ा कर्ज़ यह छिपा सकता है कि उस मुद्रा में आपके पास कितना है) अब हमेशा दिखती है; पहले वह बंद रहने वाले “हिसाब कैसे लगता है” हिस्से के अंदर थी। लोन और शुद्ध संपत्ति वाले पन्नों पर संबंधित पाठों के ऊपर की एक पंक्ति की भूमिका हटा दी गई है, क्योंकि उसमें ऐसा कुछ नहीं था जो कार्ड न बताते हों।',
          es: 'Las cinco herramientas gratuitas comparten ahora un mismo marco de página: el mismo encabezado, las mismas preguntas y las mismas lecciones relacionadas en todas, para que una herramienta nueva no se aparte de las demás. En la calculadora de patrimonio neto, la nota sobre exposición neta frente a bruta (una deuda grande en una moneda puede ocultar cuánto tienes en ella) está ahora siempre visible; antes estaba dentro del bloque plegado «Cómo se hace el cálculo». Las frases de una línea sobre las lecciones relacionadas en las páginas de préstamos y de patrimonio neto ya no están, porque no añadían nada que las tarjetas no digan.',
          cs: 'Pět nástrojů zdarma teď sdílí jeden rámec stránky: stejné záhlaví, otázky a\u00a0související lekce u\u00a0každého nástroje, aby se nový nástroj nezačal od ostatních lišit. V\u00a0kalkulačce čistého jmění je poznámka o\u00a0čisté a\u00a0hrubé expozici (velký dluh v\u00a0některé měně může zakrýt, kolik v\u00a0ní držíte) teď vidět vždy; dřív byla uvnitř sbalené části „Jak výpočet funguje“. Jednořádkové úvody nad souvisejícími lekcemi na stránkách úvěrů a\u00a0čistého jmění zmizely, protože nepřidávaly nic, co by neříkaly karty.',
          mr: 'पाचही मोफत साधनांच्या पानांची चौकट आता एकच आहे: प्रत्येक साधनावर तोच वरचा भाग, तेच प्रश्न आणि तेच संबंधित धडे, म्हणजे नवे साधन इतरांपेक्षा वेगळे दिसू लागणार नाही. निव्वळ संपत्ती कॅल्क्युलेटरमध्ये निव्वळ विरुद्ध एकूण हिश्श्याबद्दलची टीप (एखाद्या चलनातील मोठे कर्ज त्या चलनात तुमच्याकडे किती आहे हे झाकू शकते) आता नेहमी दिसते; आधी ती बंद असलेल्या “हिशेब कसा होतो” या भागात होती. कर्ज आणि निव्वळ संपत्तीच्या पानांवरील संबंधित धड्यांवरच्या एका ओळीच्या प्रस्तावना काढल्या आहेत, कारण कार्डे सांगत नाहीत असे त्यांत काही नव्हते.',
        },
      },
      {
        id: 'tools-one-announcement',
        text: {
          en: 'With a screen reader, the free tools now tell you a result in the same way: one short sentence, once you stop typing. Before, the loan comparison read out every half-typed figure, the net worth calculator said nothing when the total changed, and the invest or pay off debt calculator did not say when an entry was not accepted. The lesson search now reads out only how many lessons it found.',
          hi: 'स्क्रीन रीडर के साथ मुफ़्त टूल अब नतीजा एक ही तरह से बताते हैं: लिखना रुकने पर एक छोटा वाक्य। पहले लोन तुलना हर अधूरी लिखी संख्या पढ़ देती थी, शुद्ध संपत्ति कैलकुलेटर कुल रकम बदलने पर कुछ नहीं कहता था, और निवेश या कर्ज़ चुकाना कैलकुलेटर यह नहीं बताता था कि भरी गई कोई संख्या मानी नहीं गई। पाठों की खोज अब सिर्फ़ यह पढ़ती है कि कितने पाठ मिले।',
          es: 'Con un lector de pantalla, las herramientas gratuitas dicen ahora el resultado de la misma manera: una frase corta cuando dejas de escribir. Antes, el comparador de préstamos leía cada cifra a medio escribir, la calculadora de patrimonio neto no decía nada cuando cambiaba el total, y la calculadora de invertir o pagar deuda no avisaba cuando no aceptaba un dato. El buscador de lecciones lee ahora solo cuántas lecciones encontró.',
          cs: 'Se čtečkou obrazovky teď nástroje zdarma oznamují výsledek stejným způsobem: jednou krátkou větou, jakmile přestanete psát. Dřív srovnání úvěrů četlo každé nedopsané číslo, kalkulačka čistého jmění při změně součtu neřekla nic a\u00a0kalkulačka Investovat, nebo splatit dluh neoznámila, že některý údaj nepřijala. Hledání v\u00a0lekcích teď čte jen to, kolik lekcí našlo.',
          mr: 'स्क्रीन रीडर वापरताना मोफत साधने आता निकाल एकाच पद्धतीने सांगतात: लिहिणे थांबल्यावर एक छोटे वाक्य. आधी कर्जांची तुलना प्रत्येक अर्धवट लिहिलेला आकडा वाचत असे, निव्वळ संपत्ती कॅल्क्युलेटर एकूण रक्कम बदलल्यावर काहीच सांगत नसे, आणि गुंतवणूक की कर्जफेड कॅल्क्युलेटर भरलेली एखादी संख्या स्वीकारली नाही हे सांगत नसे. धड्यांचा शोध आता फक्त किती धडे सापडले तेवढेच वाचतो.',
        },
      },
    ],
  },
  {
    date: '2026-11-12',
    items: [
      {
        id: 'tools-wait-until-ready',
        text: {
          en: 'On a slow phone, a free tool\'s boxes appeared a few seconds before the tool was working, and anything typed in that gap was thrown away. The boxes now wait until the tool is ready. The Monte Carlo simulator also says what to type when a number is out of range, and an error under a box now starts with the word “Error” in every tool, so it is told apart by more than its colour.',
          hi: 'धीमे फ़ोन पर मुफ़्त टूल के बॉक्स टूल के चालू होने से कुछ सेकंड पहले दिख जाते थे, और उस बीच जो भी लिखा जाता, वह मिट जाता था। अब बॉक्स तब तक रुके रहते हैं जब तक टूल तैयार न हो जाए। मोंटे कार्लो सिम्युलेटर अब यह भी बताता है कि कोई संख्या सीमा से बाहर हो तो क्या लिखना है, और हर टूल में बॉक्स के नीचे की गड़बड़ी अब “त्रुटि” शब्द से शुरू होती है, ताकि वह सिर्फ़ रंग से न पहचाननी पड़े।',
          es: 'En un teléfono lento, las casillas de una herramienta gratuita aparecían unos segundos antes de que la herramienta funcionara, y lo que se escribía en ese intervalo se perdía. Ahora las casillas esperan hasta que la herramienta está lista. El simulador Monte Carlo dice además qué escribir cuando un número está fuera de rango, y un error bajo una casilla empieza ahora con la palabra «Error» en todas las herramientas, para que se distinga por algo más que el color.',
          cs: 'Na pomalém telefonu se pole nástroje zdarma objevila pár sekund předtím, než nástroj začal fungovat, a\u00a0co se do nich mezitím napsalo, se ztratilo. Pole teď počkají, až je nástroj připravený. Simulátor Monte Carlo navíc říká, co zadat, když je číslo mimo rozsah, a\u00a0chyba pod polem teď ve všech nástrojích začíná slovem „Chyba“, aby se nepoznala jen podle barvy.',
          mr: 'संथ फोनवर मोफत साधनाचे रकाने साधन सुरू होण्याच्या काही सेकंद आधीच दिसत, आणि त्या वेळेत लिहिलेले सगळे पुसले जाई. आता साधन तयार होईपर्यंत रकाने थांबतात. मॉन्टे कार्लो सिम्युलेटर आता संख्या मर्यादेबाहेर असेल तर काय भरायचे तेही सांगतो, आणि प्रत्येक साधनात रकान्याखालची चूक आता “त्रुटी” या शब्दाने सुरू होते, म्हणजे ती फक्त रंगावरून ओळखावी लागत नाही.',
        },
      },
      {
        id: 'tools-one-look',
        text: {
          en: 'The five free tools now look like one family. Dropdowns match the boxes beside them, section titles and questions are the same size everywhere, the views in the loan comparison and the inflation calculator are plain tabs with a line under the one you are on, and the Monte Carlo simulator\'s Reset sits at the top of its form like the others. Nothing about the sums has changed.',
          hi: 'पाँचों मुफ़्त टूल अब एक ही परिवार जैसे दिखते हैं। ड्रॉपडाउन अब बगल के बॉक्स जैसे हैं, हिस्सों के शीर्षक और सवाल हर टूल में एक ही आकार के हैं, लोन की तुलना और महँगाई कैलकुलेटर के व्यू अब सादे टैब हैं जिनमें चुने हुए टैब के नीचे एक रेखा रहती है, और मोंटे कार्लो सिम्युलेटर का रीसेट बटन बाकी टूल की तरह फ़ॉर्म के ऊपर है। हिसाब में कुछ नहीं बदला है।',
          es: 'Las cinco herramientas gratuitas se ven ahora como una sola familia. Los desplegables son iguales a las casillas de al lado, los títulos de sección y las preguntas tienen el mismo tamaño en todas, las vistas del comparador de préstamos y de la calculadora de inflación son pestañas sencillas con una línea bajo la que tienes abierta, y el botón de restablecer del simulador Monte Carlo está arriba en su formulario, como en las demás. Los cálculos no han cambiado.',
          cs: 'Pět nástrojů zdarma teď vypadá jako jedna rodina. Rozbalovací seznamy vypadají stejně jako pole vedle nich, nadpisy částí a\u00a0otázky mají všude stejnou velikost, pohledy ve srovnání úvěrů a\u00a0v\u00a0inflační kalkulačce jsou obyčejné záložky s\u00a0linkou pod tou, na které jste, a\u00a0tlačítko pro obnovení v\u00a0simulátoru Monte Carlo je nahoře ve formuláři jako u\u00a0ostatních. Výpočty se nezměnily.',
          mr: 'पाचही मोफत साधने आता एकाच कुटुंबातली दिसतात. ड्रॉपडाउन आता शेजारच्या रकान्यांसारखेच दिसतात, विभागांची शीर्षके आणि प्रश्न सगळीकडे एकाच आकाराचे आहेत, कर्जांची तुलना आणि महागाई कॅल्क्युलेटरमधील दृश्ये आता साधे टॅब आहेत ज्यांत निवडलेल्या टॅबखाली एक रेघ असते, आणि मॉन्टे कार्लो सिम्युलेटरचे रीसेट बटण इतर साधनांप्रमाणे फॉर्मच्या वर आहे. हिशेबात काहीही बदललेले नाही.',
        },
      },
      {
        id: 'loan-report-typed-rate',
        text: {
          en: 'The loan comparison\'s printed report and spreadsheet now show an interest rate with three decimals, such as 4.875%, as it was typed, where they used to round it to 4.88. The Monte Carlo simulator also words a one-year withdrawal properly.',
          hi: 'लोन तुलना की छपी रिपोर्ट और स्प्रेडशीट अब तीन दशमलव वाली ब्याज दर, जैसे 4.875%, वैसी ही दिखाती हैं जैसी लिखी गई थी; पहले वे उसे 4.88 कर देती थीं। मोंटे कार्लो सिम्युलेटर में एक साल की निकासी का वाक्य भी अब ठीक पढ़ा जाता है।',
          es: 'El informe impreso y la hoja de cálculo del comparador de préstamos muestran ahora una tasa de interés con tres decimales, como 4,875\u00a0%, tal como se escribió; antes la redondeaban a 4,88. El simulador Monte Carlo también redacta bien un retiro de un solo año.',
          cs: 'Tištěná zpráva a\u00a0tabulka ze srovnání úvěrů teď ukazují úrokovou sazbu se třemi desetinnými místy, například 4,875\u00a0%, tak, jak byla zadaná; dřív ji zaokrouhlovaly na 4,88. Simulátor Monte Carlo také správně formuluje výběr na jediný rok.',
          mr: 'कर्जांच्या तुलनेचा छापील अहवाल आणि स्प्रेडशीट आता तीन दशांश स्थळांचा व्याजदर, उदा. 4.875%, जसा लिहिला तसाच दाखवतात; आधी ते तो 4.88 असा करत होते. माँटे कार्लो सिम्युलेटरमध्ये एका वर्षाच्या रक्कम काढण्याचे वाक्यही आता बरोबर वाचले जाते.',
        },
      },
      {
        id: 'tools-small-fixes-nov12',
        text: {
          en: 'Five small fixes in the free tools. The line under the loan comparison\'s payment chart no longer quotes a 25-year loan\'s figures for every loan. An error about a loan whose rate changes now names the control to use. When a browser will not copy a share link, the loan and net worth tools show the link to copy by hand and no longer say it was copied. Currency lists read the same way in all five tools. The net worth calculator calls its exchange rates the latest official ones, not live.',
          hi: 'मुफ़्त टूल में पाँच छोटे सुधार। लोन तुलना के किस्त वाले चार्ट के नीचे की पंक्ति अब हर लोन के लिए 25 साल के लोन के आँकड़े नहीं बताती। बदलती दर वाले लोन की एक गड़बड़ी का संदेश अब बताता है कि कौन सा विकल्प चुनना है। जब ब्राउज़र शेयर लिंक कॉपी नहीं करता, तब लोन और शुद्ध संपत्ति वाले टूल लिंक दिखाते हैं ताकि उसे हाथ से कॉपी किया जा सके, और यह नहीं कहते कि वह कॉपी हो गया। मुद्राओं की सूची पाँचों टूल में एक ही तरह से दिखती है। शुद्ध संपत्ति कैलकुलेटर अपनी विनिमय दरों को ताज़ा आधिकारिक दरें कहता है, लाइव नहीं।',
          es: 'Cinco pequeñas correcciones en las herramientas gratuitas. La línea bajo el gráfico de cuotas del comparador de préstamos ya no cita las cifras de un préstamo a 25 años para cualquier préstamo. Un mensaje de error sobre un préstamo cuya tasa cambia indica ahora qué opción usar. Cuando el navegador no copia un enlace para compartir, las herramientas de préstamos y de patrimonio neto muestran el enlace para copiarlo a mano y ya no dicen que se copió. Las listas de monedas se leen igual en las cinco herramientas. La calculadora de patrimonio neto llama a sus tipos de cambio los oficiales más recientes, no en vivo.',
          cs: 'Pět drobných oprav v\u00a0nástrojích zdarma. Řádek pod grafem splátek ve srovnání úvěrů už neuvádí čísla 25letého úvěru u\u00a0každého úvěru. Chybová hláška u\u00a0úvěru, jehož sazba se mění, teď říká, kterou volbu použít. Když prohlížeč odkaz ke sdílení nezkopíruje, nástroje pro úvěry a\u00a0čisté jmění odkaz ukážou k\u00a0ručnímu zkopírování a\u00a0už netvrdí, že je zkopírovaný. Seznamy měn vypadají ve všech pěti nástrojích stejně. Kalkulačka čistého jmění označuje své kurzy jako nejnovější oficiální, ne jako živé.',
          mr: 'मोफत साधनांमध्ये पाच लहान दुरुस्त्या. कर्जांच्या तुलनेतील हप्त्यांच्या आलेखाखालची ओळ आता प्रत्येक कर्जासाठी 25 वर्षांच्या कर्जाचे आकडे सांगत नाही. दर बदलणाऱ्या कर्जाबद्दलचा एक त्रुटी संदेश आता कोणता पर्याय निवडायचा ते सांगतो. ब्राउझर शेअर लिंक कॉपी करत नाही, तेव्हा कर्ज आणि निव्वळ संपत्तीची साधने लिंक हाताने कॉपी करण्यासाठी दाखवतात आणि ती कॉपी झाली असे म्हणत नाहीत. चलनांच्या याद्या पाचही साधनांमध्ये एकसारख्या दिसतात. निव्वळ संपत्ती कॅल्क्युलेटर आपल्या विनिमय दरांना ताजे अधिकृत दर म्हणतो, लाइव्ह नाही.',
        },
      },
      {
        id: 'net-worth-no-band-when-negative',
        text: {
          en: 'In the net worth calculator, when debts leave your total at zero or below, a holding in another currency used to be labelled low exposure at 0%. It now carries no band, says why, and shows what a 10% move in that currency would change.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर में, जब कर्ज़ों के बाद कुल शून्य या उससे नीचे रह जाता था, तब दूसरी मुद्रा की रकम पर 0% के साथ कम एक्सपोज़र लिखा आता था। अब उस पर कोई श्रेणी नहीं लगती, कारण बताया जाता है, और दिखाया जाता है कि उस मुद्रा में 10% के बदलाव से कितना फ़र्क़ पड़ेगा।',
          es: 'En la calculadora de patrimonio neto, cuando las deudas dejan el total en cero o por debajo, un saldo en otra moneda aparecía como exposición baja al 0\u00a0%. Ahora no lleva ninguna franja, explica por qué y muestra cuánto cambiaría con un movimiento del 10\u00a0% de esa moneda.',
          cs: 'Když v\u00a0kalkulačce čistého jmění dluhy stáhly součet na nulu nebo pod ni, částka v\u00a0jiné měně se označila jako nízká expozice s\u00a00\u00a0%. Teď žádné pásmo nedostane, kalkulačka řekne proč a\u00a0ukáže, co by změnil pohyb té měny o\u00a010\u00a0%.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटरमध्ये, कर्जांमुळे एकूण रक्कम शून्य किंवा त्याखाली जात असे, तेव्हा दुसऱ्या चलनातील रकमेवर 0% सह कमी हिस्सा असे लिहिले जात होते. आता तिला कोणतीही श्रेणी दिली जात नाही, कारण सांगितले जाते, आणि त्या चलनात 10% बदल झाल्यास किती फरक पडेल ते दाखवले जाते.',
        },
      },
      {
        id: 'review-fixes-large-text-jumps',
        text: {
          en: 'A few small fixes after a review. With large text on a phone, a link that jumps within a page now lands below the header and not under it, and the cookie question opens at its first line. In the invest or pay off tool, the two lines that explain how today\'s money is counted now say what each one does. And a confirm or unsubscribe link that has lost its code no longer shows a button that could do nothing. The cookie question now gives its two answers the same look, so neither is pushed. And on a phone held sideways the header scrolls away with the page and leaves the screen to what you are reading.',
          hi: 'समीक्षा के बाद कुछ छोटे सुधार। फ़ोन में बड़े अक्षरों के साथ, पेज के भीतर ले जाने वाला लिंक अब ऊपरी पट्टी के नीचे पहुँचाता है, उसके पीछे नहीं, और कुकी वाला सवाल अपनी पहली पंक्ति से खुलता है। निवेश या कर्ज़ चुकाना टूल में आज का पैसा कैसे गिना जाता है, यह समझाने वाली दो पंक्तियाँ अब बताती हैं कि हर तरीक़ा क्या करता है। और जिस पुष्टि या सदस्यता छोड़ने वाले लिंक का कोड खो गया हो, वह अब ऐसा बटन नहीं दिखाता जो कुछ कर ही नहीं सकता था। कुकी वाले सवाल के दोनों जवाब अब एक जैसे दिखते हैं, ताकि किसी एक की ओर धकेला न जाए। और आड़े पकड़े फ़ोन में ऊपरी पट्टी पेज के साथ ऊपर चली जाती है, ताकि स्क्रीन पढ़ने के लिए बची रहे।',
          es: 'Algunas correcciones pequeñas tras una revisión. Con texto grande en el teléfono, un enlace que salta dentro de la página llega ahora debajo de la cabecera y no detrás de ella, y la pregunta de las cookies se abre por su primera línea. En la herramienta Invertir o pagar deuda, las dos líneas que explican cómo se cuenta el dinero de hoy dicen ahora lo que hace cada una. Y un enlace de confirmación o de baja que ha perdido su código ya no muestra un botón que no podía hacer nada. La pregunta de las cookies da ahora el mismo aspecto a sus dos respuestas, para no empujar hacia ninguna. Y con el teléfono en horizontal la cabecera se va con la página y deja la pantalla a lo que estás leyendo.',
          cs: 'Několik drobných oprav po revizi. Při velkém písmu v\u00a0telefonu teď odkaz, který skáče v\u00a0rámci stránky, skončí pod záhlavím, ne za ním, a\u00a0dotaz na cookies se otevře od prvního řádku. V\u00a0nástroji Investovat, nebo splatit dluh teď dva řádky, které vysvětlují, jak se počítají dnešní peníze, říkají, co každý způsob dělá. A\u00a0odkaz k\u00a0potvrzení nebo odhlášení, kterému chybí kód, už neukazuje tlačítko, které by nic neudělalo. Dotaz na cookies teď dává oběma odpovědím stejný vzhled, aby žádná neměla navrch. A\u00a0v\u00a0telefonu drženém naležato záhlaví odjíždí se stránkou a\u00a0nechává obrazovku tomu, co čtete.',
          mr: 'पुनरावलोकनानंतर काही छोट्या दुरुस्त्या. फोनवर मोठ्या अक्षरांसह, पानातच उडी मारणारी लिंक आता वरच्या पट्टीच्या खाली पोहोचवते, तिच्या मागे नाही, आणि कुकीचा प्रश्न पहिल्या ओळीपासून उघडतो. गुंतवणूक की कर्जफेड या टूलमध्ये आजचा पैसा कसा मोजला जातो हे सांगणाऱ्या दोन ओळी आता प्रत्येक पद्धत काय करते ते सांगतात. आणि ज्या पुष्टीच्या किंवा सदस्यत्व सोडण्याच्या लिंकचा कोड हरवला आहे, ती आता काहीच करू न शकणारे बटण दाखवत नाही. कुकीच्या प्रश्नाची दोन्ही उत्तरे आता एकसारखी दिसतात, त्यामुळे कोणत्याही एकाकडे ढकलले जात नाही. आणि आडव्या धरलेल्या फोनवर वरची पट्टी पानाबरोबर वर सरकते, त्यामुळे स्क्रीन वाचनासाठी मोकळी राहते.',
        },
      },
      {
        id: 'tool-breadcrumbs-free-tools',
        text: {
          en: 'The loan comparison and the net worth calculator now show Free tools in the trail at the top of the page, as the other three tools do, so the full list of tools is one tap away.',
          hi: 'लोन तुलना और शुद्ध संपत्ति कैलकुलेटर के ऊपर की राह में अब बाक़ी तीन टूल की तरह मुफ़्त टूल भी दिखता है, ताकि सभी टूल की सूची एक टैप दूर रहे।',
          es: 'El comparador de préstamos y la calculadora de patrimonio neto muestran ahora Herramientas gratuitas en la ruta de la parte superior de la página, como las otras tres herramientas, para que la lista completa quede a un toque.',
          cs: 'Srovnání úvěrů a\u00a0kalkulačka čistého jmění teď v\u00a0cestě nahoře na stránce ukazují Nástroje zdarma, stejně jako ostatní tři nástroje, takže celý seznam nástrojů je na jedno klepnutí.',
          mr: 'कर्जांची तुलना आणि निव्वळ संपत्ती कॅल्क्युलेटर यांच्या वरच्या वाटेत आता इतर तीन साधनांप्रमाणे मोफत साधने हेही दिसते, त्यामुळे सर्व साधनांची यादी एका टॅपवर आहे.',
        },
      },
      {
        id: 'loan-keep-payment-at-rate-change',
        text: {
          en: 'The loan comparison can now keep the payment the same when a rate changes. Many lenders do that: the payment stays and the loan ends earlier or later. Under Rate structure you can choose which happens for each offer, and the offer then shows the month it is paid off, or says plainly that at that payment it never is.',
          hi: 'लोन तुलना टूल में अब दर बदलने पर किस्त वही रखी जा सकती है। कई बैंक ऐसा ही करते हैं: किस्त वही रहती है और लोन पहले या बाद में ख़त्म होता है। दर का ढाँचा के नीचे हर ऑफ़र के लिए चुना जा सकता है कि क्या होगा, और फिर ऑफ़र वह महीना दिखाता है जब लोन चुकेगा, या साफ़ बताता है कि उस किस्त पर वह कभी नहीं चुकता।',
          es: 'El comparador de préstamos puede ahora mantener la cuota cuando cambia la tasa. Muchas entidades lo hacen así: la cuota se mantiene y el préstamo termina antes o después. En Estructura de la tasa se puede elegir qué ocurre en cada oferta, y la oferta muestra entonces el mes en que se liquida, o dice con claridad que con esa cuota no se liquida nunca.',
          cs: 'Srovnání úvěrů teď umí při změně sazby ponechat splátku stejnou. Mnoho bank to tak dělá: splátka zůstane a\u00a0úvěr skončí dříve nebo později. V\u00a0části Struktura sazby lze u\u00a0každé nabídky zvolit, co se stane, a\u00a0nabídka pak ukáže měsíc splacení, nebo jasně řekne, že při této splátce splacena nebude nikdy.',
          mr: 'कर्जांच्या तुलनेत आता दर बदलल्यावर हप्ता तोच ठेवता येतो. अनेक बँका असेच करतात: हप्ता तोच राहतो आणि कर्ज लवकर किंवा उशिरा संपते. व्याजदराची रचना या भागात प्रत्येक ऑफरसाठी काय घडेल ते निवडता येते, आणि मग ऑफर कर्ज फिटण्याचा महिना दाखवते, किंवा त्या हप्त्यात ते कधीच फिटत नाही हे स्पष्ट सांगते.',
        },
      },
      {
        id: 'loan-apr-one-basis',
        aliases: ['loan-apr-captions-plain', 'loan-apr-default-aud-jpy'],
        text: {
          en: 'The loan comparison now shows APR one way, on the same basis as the rate you type, so with no fees the two are equal. I took away the switch between two ways of working it out: it asked a question most people had no way to answer, and it never changed which offer came out cheaper. A line above the offers says why a loan document in the EU, the UK and some other countries shows a higher figure for the same loan (6.50% here is 6.70% there), and the questions below explain the arithmetic. Links shared earlier still open; one that asked for the other figure now shows this one. On a phone, a long name on one offer\'s tab no longer stretches the tab next to it.',
          hi: 'लोन तुलना अब APR एक ही तरीक़े से दिखाती है: उसी आधार पर जिस पर आपकी भरी हुई दर है, इसलिए शुल्क न हो तो दोनों बराबर होते हैं। इसे निकालने के दो तरीक़ों के बीच का विकल्प अब हटा दिया गया है: वह ऐसा सवाल पूछता था जिसका जवाब ज़्यादातर लोगों के पास नहीं था, और उससे यह कभी नहीं बदलता था कि कौन-सा ऑफ़र सस्ता है। ऑफ़रों के ऊपर की एक पंक्ति बताती है कि यूरोपीय संघ, ब्रिटेन और कुछ दूसरे देशों के लोन के काग़ज़ उसी लोन के लिए ऊँचा आँकड़ा क्यों दिखाते हैं (यहाँ का 6.50% वहाँ 6.70% होता है), और नीचे के सवाल-जवाब हिसाब समझाते हैं। पहले साझा किए गए लिंक अब भी खुलते हैं; जो लिंक दूसरा आँकड़ा माँगता था, वह अब यही दिखाता है। फ़ोन पर किसी ऑफ़र के टैब का लंबा नाम अब बगल वाले टैब को नहीं खींचता।',
          es: 'La comparación de préstamos muestra ahora el APR de una sola manera, con la misma base que la tasa que escribes, así que sin comisiones las dos cifras son iguales. Quité el selector entre dos formas de calcularlo: hacía una pregunta que la mayoría no tenía cómo responder, y nunca cambiaba qué oferta salía más barata. Una línea encima de las ofertas explica por qué un documento de préstamo de la UE, el Reino Unido y algunos otros países muestra una cifra más alta para el mismo préstamo (un 6,50\u00a0% aquí es un 6,70\u00a0% allí), y las preguntas de más abajo explican el cálculo. Los enlaces compartidos antes siguen abriéndose; uno que pedía la otra cifra muestra ahora esta. En el teléfono, un nombre largo en la pestaña de una oferta ya no estira la pestaña de al lado.',
          cs: 'Srovnání úvěrů teď ukazuje APR jedním způsobem, na stejném základě jako sazba, kterou zadáváte, takže bez poplatků se obě čísla rovnají. Přepínač mezi dvěma způsoby výpočtu je pryč: ptal se na něco, na co většina lidí neměla jak odpovědět, a\u00a0nikdy neměnil, která nabídka vyjde levněji. Řádek nad nabídkami říká, proč úvěrový dokument v\u00a0EU, ve Spojeném království a\u00a0v\u00a0některých dalších zemích uvádí u\u00a0stejného úvěru vyšší číslo (6,50\u00a0% tady je 6,70\u00a0% tam), a\u00a0otázky níže vysvětlují výpočet. Dříve sdílené odkazy se dál otevírají; odkaz, který žádal druhé číslo, teď ukazuje toto. Na telefonu už dlouhý název na záložce jedné nabídky nenatahuje záložku vedle.',
          mr: 'कर्जांची तुलना आता APR एकाच पद्धतीने दाखवते: तुम्ही भरलेल्या दराच्याच आधारावर, त्यामुळे शुल्क नसेल तर दोन्ही आकडे सारखेच असतात. तो काढण्याच्या दोन पद्धतींमधला पर्याय आता काढून टाकला आहे: तो असा प्रश्न विचारत असे ज्याचे उत्तर बहुतेकांकडे नसे, आणि कोणती ऑफर स्वस्त पडते हे त्याने कधीच बदलत नसे. ऑफरच्या वरची एक ओळ सांगते की युरोपियन युनियन, UK आणि इतर काही देशांतील कर्जाची कागदपत्रे त्याच कर्जासाठी जास्त आकडा का दाखवतात (इथला 6.50% तिथे 6.70% होतो), आणि खालची प्रश्नोत्तरे हिशेब समजावतात. आधी शेअर केलेल्या लिंक अजूनही उघडतात; जी लिंक दुसरा आकडा मागत असे, ती आता हाच दाखवते. फोनवर एका ऑफरच्या टॅबवरील लांब नाव आता शेजारच्या टॅबला ताणत नाही.',
        },
      },
      {
        id: 'net-worth-concentration-exposure',
        text: {
          en: 'The net worth calculator used one word, concentration, for two different numbers. With a debt in another currency, the chart could say 63.5% while the cards and the spreadsheet said 234.9% for the same currency. Now concentration is each currency\'s share of everything you hold and owe, and always adds to 100%. The other number is called what it is, the share of your net worth, on the cards and as its own column in the spreadsheet and the PDF.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर दो अलग आँकड़ों के लिए एक ही शब्द, जमाव, इस्तेमाल करता था। किसी दूसरी मुद्रा में कर्ज़ हो, तो चार्ट एक ही मुद्रा के लिए 63.5% दिखा सकता था और कार्ड व स्प्रेडशीट 234.9%। अब जमाव का मतलब है आपके पास जो है और जो बकाया है, उस सब में हर मुद्रा का हिस्सा, और इसका जोड़ हमेशा 100% होता है। दूसरे आँकड़े को उसके असली नाम से बताया जाता है, यानी आपकी शुद्ध संपत्ति का हिस्सा: कार्ड पर, और स्प्रेडशीट व PDF में अलग कॉलम में।',
          es: 'La calculadora de patrimonio neto usaba una sola palabra, concentración, para dos cifras distintas. Con una deuda en otra moneda, el gráfico podía decir 63,5\u00a0% mientras las tarjetas y la hoja de cálculo decían 234,9\u00a0% para la misma moneda. Ahora la concentración es la parte que cada moneda representa de todo lo que tienes y debes, y siempre suma 100\u00a0%. La otra cifra se llama por lo que es, la parte de tu patrimonio neto, en las tarjetas y en una columna propia de la hoja de cálculo y del PDF.',
          cs: 'Kalkulačka čistého jmění používala jedno slovo, koncentrace, pro dvě různá čísla. S\u00a0dluhem v\u00a0jiné měně mohl graf u\u00a0stejné měny ukazovat 63,5\u00a0%, zatímco karty a\u00a0tabulka uváděly 234,9\u00a0%. Teď je koncentrace podíl každé měny na všem, co máte a\u00a0dlužíte, a\u00a0vždy dává dohromady 100\u00a0%. Druhé číslo se jmenuje tak, jak mu odpovídá, tedy podíl na vašem čistém jmění: na kartách a\u00a0ve vlastním sloupci v\u00a0tabulce i\u00a0v\u00a0PDF.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटर दोन वेगळ्या आकड्यांसाठी एकच शब्द वापरत असे. दुसऱ्या चलनात कर्ज असेल, तर त्याच चलनासाठी आलेख 63.5% दाखवू शकत असे आणि कार्डे व स्प्रेडशीट 234.9%. आता आलेखातील हिस्सा म्हणजे तुमच्याकडे जे आहे आणि जे देणे आहे त्या सगळ्यातील प्रत्येक चलनाचा वाटा, आणि त्याची बेरीज नेहमी 100% होते. दुसरा आकडा त्याच्या खऱ्या नावाने दिसतो, म्हणजे तुमच्या निव्वळ संपत्तीचा हिस्सा: कार्डांवर, आणि स्प्रेडशीट व PDF\u00a0मध्ये स्वतंत्र स्तंभात.',
        },
      },
      {
        id: 'monte-carlo-average-line',
        text: {
          en: 'Two changes in the Monte Carlo simulator. The single line on the chart now uses the average return every year, the line a simple calculator draws and the one the lesson describes, so it sits higher and more than half the simulated paths end below it. And the sentence about how often the money lasted no longer rounds up to every path: between 95% and 100% it says “more than 9 in 10”, and it says every path only when that is so.',
          hi: 'मोंटे कार्लो सिम्युलेटर में दो बदलाव। चार्ट की सीधी लकीर अब हर साल औसत रिटर्न लेती है, यानी वही लकीर जो कोई साधारण कैलकुलेटर खींचता है और जिसकी बात पाठ में है; इसलिए वह ऊपर रहती है और आधे से ज़्यादा सिम्युलेटेड रास्ते उसके नीचे ख़त्म होते हैं। और पैसा कितनी बार टिका, यह बताने वाला वाक्य अब ऊपर की ओर गोल होकर “हर रास्ता” नहीं कहता: 95% और 100% के बीच वह “10 में से 9 से ज़्यादा” कहता है, और हर रास्ता तभी कहता है जब सचमुच ऐसा हो।',
          es: 'Dos cambios en el simulador Monte Carlo. La línea única del gráfico usa ahora la rentabilidad media todos los años, la línea que traza una calculadora sencilla y la que describe la lección, así que queda más alta y más de la mitad de las trayectorias simuladas terminan por debajo. Y la frase que dice con qué frecuencia alcanzó el dinero ya no redondea hacia arriba hasta todas las trayectorias: entre el 95\u00a0% y el 100\u00a0% dice «más de 9 de cada 10», y dice todas solo cuando es así.',
          cs: 'Dvě změny v\u00a0simulátoru Monte Carlo. Jedna čára v\u00a0grafu teď počítá každý rok s\u00a0průměrným výnosem, tedy čára, kterou kreslí jednoduchá kalkulačka a\u00a0kterou popisuje lekce; leží proto výš a\u00a0více než polovina simulovaných trajektorií končí pod ní. A\u00a0věta o\u00a0tom, jak často peníze vydržely, už se nezaokrouhluje nahoru na všechny trajektorie: mezi 95\u00a0% a\u00a0100\u00a0% říká „ve více než 9 z\u00a010“ a\u00a0všechny uvádí jen tehdy, když to tak opravdu je.',
          mr: 'मॉन्टे कार्लो सिम्युलेटरमध्ये दोन बदल. आलेखातील एकच रेषा आता दरवर्षी सरासरी परतावा धरते, म्हणजे साधा कॅल्क्युलेटर काढतो तीच रेषा आणि धड्यात वर्णन केलेली रेषा; त्यामुळे ती वर राहते आणि अर्ध्याहून अधिक संभाव्य मार्ग तिच्या खाली संपतात. आणि पैसा किती वेळा पुरला हे सांगणारे वाक्य आता वर गोल करून “प्रत्येक मार्ग” म्हणत नाही: 95% ते 100% दरम्यान ते “10\u00a0पैकी 9\u00a0पेक्षा जास्त” म्हणते, आणि प्रत्येक मार्ग तेव्हाच म्हणते जेव्हा खरोखर तसे असते.',
        },
      },
    ],
  },
  {
    date: '2026-11-11',
    items: [
      {
        id: 'monte-carlo-two-corrections',
        text: {
          en: 'Two corrections in the Monte Carlo simulator. A plan with nothing invested and withdrawals switched on used to say the money lasted on every path; it now says it ran out. And a share that is nearly, but not quite, every path now shows one decimal, 99.5% and not 100%.',
          hi: 'मोंटे कार्लो सिम्युलेटर में दो सुधार। बिना किसी निवेश के निकासी चालू करने पर टूल पहले कहता था कि पैसा हर रास्ते में टिका रहा; अब वह बताता है कि पैसा ख़त्म हो गया। और जो हिस्सा लगभग सभी रास्तों का है, पर पूरा नहीं, वह अब एक दशमलव के साथ दिखता है: 99.5%, 100% नहीं।',
          es: 'Dos correcciones en el simulador Monte Carlo. Un plan sin nada invertido y con retiros activados decía antes que el dinero alcanzaba en todas las trayectorias; ahora dice que se agotó. Y una proporción que es casi, pero no del todo, todas las trayectorias se muestra ahora con un decimal: 99,5\u00a0% y no 100\u00a0%.',
          cs: 'Dvě opravy v\u00a0simulátoru Monte Carlo. Plán bez jakékoli investice a\u00a0se zapnutými výběry dříve tvrdil, že peníze vydržely ve všech trajektoriích; teď říká, že došly. A\u00a0podíl, který je skoro, ale ne úplně všemi trajektoriemi, se teď ukazuje s\u00a0jedním desetinným místem: 99,5\u00a0%, ne 100\u00a0%.',
          mr: 'मॉन्टे कार्लो सिम्युलेटरमध्ये दोन दुरुस्त्या. काहीही गुंतवलेले नसताना पैसे काढणे सुरू केले, तर साधन आधी सांगत असे की पैसा प्रत्येक मार्गात पुरला; आता ते सांगते की पैसा संपला. आणि जो वाटा जवळजवळ सर्व मार्गांचा आहे, पण पूर्ण नाही, तो आता एका दशांश स्थानासह दिसतो: 99.5%, 100% नाही.',
        },
      },
      {
        id: 'header-large-text',
        text: {
          en: 'The site header now fits when your phone\'s text size is set large. At double size the menu button used to sit past the edge of the screen; the controls now move to a second row. A few links on the home page wrap the same way.',
          hi: 'फ़ोन में अक्षरों का आकार बड़ा रखने पर भी साइट का ऊपरी हिस्सा अब स्क्रीन में समा जाता है। दोगुने आकार पर मेन्यू का बटन पहले स्क्रीन के किनारे से बाहर चला जाता था; अब ये बटन दूसरी पंक्ति में आ जाते हैं। होम पेज के कुछ लिंक भी इसी तरह अगली पंक्ति में आते हैं।',
          es: 'La cabecera del sitio cabe ahora cuando el tamaño del texto de tu teléfono es grande. Al doble de tamaño, el botón del menú quedaba fuera del borde de la pantalla; ahora los controles pasan a una segunda fila. Algunos enlaces de la página de inicio se ajustan de la misma manera.',
          cs: 'Záhlaví webu se teď vejde na obrazovku i\u00a0při velkém písmu v\u00a0telefonu. Při dvojnásobné velikosti bývalo tlačítko nabídky až za okrajem obrazovky; ovládací prvky se teď přesunou na druhý řádek. Stejně se zalomí i\u00a0několik odkazů na úvodní stránce.',
          mr: 'फोनमधील अक्षरांचा आकार मोठा ठेवला तरी साइटचा वरचा भाग आता स्क्रीनमध्ये मावतो. दुप्पट आकारात मेनूचे बटण आधी स्क्रीनच्या कडेबाहेर जात असे; आता ही बटणे दुसऱ्या ओळीत येतात. मुख्यपृष्ठावरील काही लिंकही अशाच पुढच्या ओळीत येतात.',
        },
      },
      {
        id: 'loan-offer-names',
        text: {
          en: 'The loan comparison calls an offer by the name you give it. Type a name and it now shows on the offer\'s card, on the phone tabs and in a short key above the phone table, beside the letter the table uses. The option for a rate that changes is now called “Fixed, then variable” instead of the US term “Hybrid (ARM)”. Loans in rupees start with APR as the monthly rate times 12, the way India\'s loan fact sheets state it. The example offers also start with their optional boxes empty.',
          hi: 'लोन तुलना अब ऑफ़र को उसी नाम से बुलाती है जो आप उसे देते हैं। नाम लिखते ही वह ऑफ़र के कार्ड पर, फ़ोन के टैब पर और फ़ोन की तालिका के ऊपर एक छोटी सूची में दिखता है, उसी अक्षर के साथ जो तालिका में आता है। बदलने वाली दर का विकल्प अब “पहले तय, फिर बदलती” कहलाता है, अमेरिकी शब्द “हाइब्रिड (ARM)” की जगह। रुपये वाले लोन में APR अब शुरू में मासिक दर गुणा 12 से दिखता है, जैसा भारत के लोन के मुख्य तथ्य विवरण में लिखा जाता है। उदाहरण के ऑफ़र भी अब ख़ाली वैकल्पिक खानों के साथ शुरू होते हैं।',
          es: 'La comparación de préstamos llama ahora a cada oferta por el nombre que le pones. Escribe un nombre y aparece en la tarjeta de la oferta, en las pestañas del teléfono y en una pequeña leyenda encima de la tabla del teléfono, junto a la letra que usa la tabla. La opción para una tasa que cambia se llama ahora «Fija y luego variable», en lugar del término estadounidense «Híbrida (ARM)». Los préstamos en rupias empiezan con el APR como la tasa mensual por 12, como lo indican las hojas informativas de préstamos en la India. Las ofertas de ejemplo también empiezan con las casillas opcionales vacías.',
          cs: 'Srovnání úvěrů teď nabídku nazývá jménem, které jí dáte. Napište název a\u00a0ukáže se na kartě nabídky, na záložkách v\u00a0telefonu a\u00a0v\u00a0krátké legendě nad tabulkou v\u00a0telefonu, vedle písmene, které tabulka používá. Volba pro sazbu, která se mění, se teď jmenuje „Pevná, pak pohyblivá“ místo amerického výrazu „Hybridní (ARM)“. Úvěry v\u00a0rupiích začínají s\u00a0APR jako měsíční sazbou krát 12, jak ji uvádějí indické přehledy klíčových údajů o\u00a0úvěru. Ukázkové nabídky také začínají s\u00a0prázdnými volitelnými poli.',
          mr: 'कर्जांची तुलना आता ऑफरला तुम्ही दिलेल्या नावाने ओळखते. नाव लिहिले की ते ऑफरच्या कार्डावर, फोनवरील टॅबवर आणि फोनवरील तक्त्याच्या वरच्या छोट्या सूचीत दिसते, तक्त्यात वापरल्या जाणाऱ्या अक्षराशेजारी. बदलणाऱ्या दराच्या पर्यायाला आता “आधी ठरावीक, मग बदलता” म्हटले आहे, अमेरिकी शब्द “हायब्रिड (ARM)” ऐवजी. रुपयांतील कर्जांसाठी APR आता सुरुवातीला मासिक दर गुणिले 12\u00a0असा दिसतो, जसा भारतातील कर्जाच्या मुख्य तथ्य विवरणात दिला जातो. उदाहरणाच्या ऑफरही आता रिकाम्या ऐच्छिक रकान्यांसह सुरू होतात.',
        },
      },
      {
        id: 'invest-payoff-interest-monthly',
        text: {
          en: 'The invest or pay off tool now works out the interest avoided, in today\'s money, month by month. Each month\'s saving is counted at that month\'s prices. Before, the whole sum was treated as if it arrived on the comparison date, which made it look smaller than it is, by about a tenth in a typical case. The figure before inflation is unchanged. A row under that line lets you pick the earlier way of counting if you prefer it.',
          hi: 'निवेश या कर्ज़ चुकाना टूल अब आज के पैसे में बचा हुआ ब्याज महीने-दर-महीने निकालता है। हर महीने की बचत उसी महीने की क़ीमतों पर गिनी जाती है। पहले पूरी रकम ऐसे गिनी जाती थी मानो वह तुलना की तारीख़ पर ही मिली हो, जिससे वह असल से छोटी दिखती थी, आम तौर पर क़रीब दसवाँ हिस्सा कम। महँगाई से पहले का आँकड़ा नहीं बदला है। उस पंक्ति के नीचे की एक पंक्ति से आप चाहें तो गिनती का पहले वाला तरीक़ा चुन सकते हैं।',
          es: 'La herramienta Invertir o pagar deuda calcula ahora mes a mes los intereses evitados en dinero de hoy. El ahorro de cada mes se cuenta a los precios de ese mes. Antes, toda la suma se trataba como si llegara en la fecha de comparación, lo que la hacía parecer más pequeña de lo que es, alrededor de una décima parte en un caso típico. La cifra antes de la inflación no cambia. Una fila debajo de esa línea te deja elegir la forma anterior de contar, si la prefieres.',
          cs: 'Nástroj Investovat, nebo splatit dluh teď počítá ušetřené úroky v\u00a0dnešních penězích měsíc po měsíci. Úspora každého měsíce se počítá v\u00a0cenách toho měsíce. Dříve se s\u00a0celou částkou počítalo, jako by přišla až k\u00a0datu srovnání, takže vypadala menší, než je, v\u00a0běžném případě asi o\u00a0desetinu. Částka před inflací se nemění. Řádek pod tímto údajem umožňuje zvolit dřívější způsob počítání, pokud vám vyhovuje víc.',
          mr: 'गुंतवणूक की कर्जफेड हे टूल आता आजच्या पैशात वाचलेले व्याज महिन्यागणिक काढते. प्रत्येक महिन्याची बचत त्या महिन्याच्या किमतींनुसार मोजली जाते. आधी संपूर्ण रक्कम तुलनेच्या तारखेलाच मिळाल्यासारखी धरली जात असे, त्यामुळे ती प्रत्यक्षापेक्षा लहान दिसत असे, साधारण दहावा भाग कमी. महागाईपूर्वीचा आकडा बदललेला नाही. त्या ओळीखालच्या एका ओळीतून तुम्हाला हवे असल्यास मोजण्याची आधीची पद्धत निवडता येते.',
        },
      },
      {
        id: 'loan-both-payments',
        text: {
          en: 'The loan comparison now shows both payments when an offer\'s rate changes. A loan that starts at one rate and moves to another has two monthly payments, and the tool used to show only the first, so two offers that part ways after five years could look the same. Each such offer now shows its payment for the first months and the one that follows, on its card, in the side-by-side table, in the spreadsheet and in the PDF report. An offer you add also starts with its optional boxes empty: an example fee used to sit in a folded row.',
          hi: 'लोन तुलना अब दोनों किस्तें दिखाती है, जब किसी ऑफ़र की दर बदलती है। जो लोन एक दर से शुरू होकर दूसरी दर पर जाता है, उसकी दो मासिक किस्तें होती हैं, और टूल पहले सिर्फ़ पहली दिखाता था, इसलिए पाँच साल बाद अलग राह लेने वाले दो ऑफ़र एक जैसे दिख सकते थे। अब ऐसा हर ऑफ़र शुरुआती महीनों की किस्त और उसके बाद की किस्त दिखाता है: अपने कार्ड पर, आमने-सामने वाली तालिका में, स्प्रेडशीट में और PDF रिपोर्ट में। नया जोड़ा गया ऑफ़र भी अब ख़ाली वैकल्पिक खानों के साथ शुरू होता है: पहले एक बंद पंक्ति में उदाहरण का शुल्क भरा रहता था।',
          es: 'La comparación de préstamos muestra ahora las dos cuotas cuando la tasa de una oferta cambia. Un préstamo que empieza con una tasa y pasa a otra tiene dos cuotas mensuales, y la herramienta solo mostraba la primera, así que dos ofertas que se separan a los cinco años podían parecer iguales. Ahora cada oferta de este tipo muestra la cuota de los primeros meses y la que viene después, en su tarjeta, en la tabla lado a lado, en la hoja de cálculo y en el informe en PDF. Una oferta que añades empieza además con las casillas opcionales vacías: antes quedaba una comisión de ejemplo en una fila plegada.',
          cs: 'Srovnání úvěrů teď ukazuje obě splátky, když se sazba nabídky mění. Úvěr, který začíná s\u00a0jednou sazbou a\u00a0přechází na jinou, má dvě měsíční splátky, a\u00a0nástroj dříve ukazoval jen tu první, takže dvě nabídky, které se po pěti letech rozcházejí, mohly vypadat stejně. Každá taková nabídka teď ukazuje splátku pro první měsíce i\u00a0tu, která následuje: na své kartě, v\u00a0tabulce vedle sebe, ve stažené tabulce i\u00a0ve zprávě v\u00a0PDF. Nabídka, kterou přidáte, také začíná s\u00a0prázdnými volitelnými poli: dříve ve sbaleném řádku zůstával ukázkový poplatek.',
          mr: 'कर्जांची तुलना आता दोन्ही हप्ते दाखवते, जेव्हा एखाद्या ऑफरचा दर बदलतो. जे कर्ज एका दराने सुरू होऊन दुसऱ्या दरावर जाते, त्याचे दोन मासिक हप्ते असतात, आणि साधन आधी फक्त पहिला दाखवत असे, त्यामुळे पाच वर्षांनंतर वेगळ्या वाटेने जाणाऱ्या दोन ऑफर सारख्याच दिसू शकत. आता अशी प्रत्येक ऑफर सुरुवातीच्या महिन्यांचा हप्ता आणि त्यानंतरचा हप्ता दाखवते: तिच्या कार्डावर, शेजारी-शेजारी तुलनेच्या तक्त्यात, स्प्रेडशीटमध्ये आणि PDF अहवालात. नवीन जोडलेली ऑफरही आता रिकाम्या ऐच्छिक रकान्यांसह सुरू होते: आधी एका बंद ओळीत उदाहरणाचे शुल्क भरलेले असे.',
        },
      },
      {
        id: 'loan-apr-two-conventions',
        text: {
          en: 'The loan comparison can now show APR either of the two ways lenders write it. There are two ways to turn a monthly rate into a yearly one: multiply it by 12, as documents in the US and Canada do, or compound it over the year, as documents in the EU and the UK do. The tool used to show only the first, so the same loan with no fee read 6.50% where the second way gives 6.70%. A switch above the offers now picks the way, its starting choice follows the currency, and every card says which one it shows. The guide on comparing loan offers and the lesson on loan terms say which one they use too.',
          hi: 'लोन तुलना अब APR उन दोनों तरीक़ों से दिखा सकती है जिनसे लोन देने वाले उसे लिखते हैं। मासिक दर से सालाना दर दो तरीक़ों से बनती है: उसे 12 से गुणा करके, जैसा अमेरिका और कनाडा के काग़ज़ों में होता है, या साल भर की चक्रवृद्धि (compounding) से, जैसा यूरोपीय संघ और ब्रिटेन के काग़ज़ों में होता है। पहले टूल सिर्फ़ पहला तरीक़ा दिखाता था, इसलिए बिना शुल्क वाला एक ही लोन 6.50% दिखता था, जबकि दूसरे तरीक़े से वह 6.70% बनता है। अब ऑफ़रों के ऊपर का एक विकल्प तरीक़ा चुनता है, शुरुआती चुनाव मुद्रा के हिसाब से होता है, और हर कार्ड पर लिखा है कि वह कौन-सा तरीक़ा दिखा रहा है। लोन ऑफ़रों की तुलना वाली गाइड और लोन की शर्तों वाला पाठ भी अब बताते हैं कि वे कौन-सा तरीक़ा इस्तेमाल करते हैं।',
          es: 'El comparador de préstamos puede mostrar ahora el APR de las dos maneras en que lo escriben las entidades financieras. Hay dos maneras de pasar una tasa mensual a una anual: multiplicarla por 12, como hacen los documentos en EE. UU. y Canadá, o capitalizarla durante el año, como hacen los documentos en la UE y el Reino Unido. Antes la herramienta solo mostraba la primera, así que el mismo préstamo sin comisión daba un 6,50\u00a0% donde la segunda manera da un 6,70\u00a0%. Ahora puedes elegir la manera con un selector encima de las ofertas; la opción inicial depende de la moneda, y cada tarjeta dice cuál muestra. La guía para comparar ofertas de préstamo y la lección sobre las condiciones de los préstamos también dicen cuál usan.',
          cs: 'Srovnání úvěrů teď umí ukázat APR oběma způsoby, kterými ji poskytovatelé úvěrů píší. Měsíční sazbu lze převést na roční dvěma způsoby: vynásobit ji dvanácti, jak to dělají dokumenty v\u00a0USA a\u00a0Kanadě, nebo ji za rok složeně úročit, jak to dělají dokumenty v\u00a0EU a\u00a0ve Spojeném království. Nástroj dříve ukazoval jen první způsob, takže stejný úvěr bez poplatku vycházel na 6,50\u00a0%, zatímco druhým způsobem je to 6,70\u00a0%. Přepínač nad nabídkami teď způsob vybírá, výchozí volba závisí na měně a\u00a0každá karta říká, který způsob ukazuje. Návod na porovnání nabídek úvěrů a\u00a0lekce o\u00a0podmínkách úvěrů teď také říkají, který způsob používají.',
          mr: 'कर्जांची तुलना आता APR त्या दोन्ही पद्धतींनी दाखवू शकते ज्यांनी कर्जदाते तो लिहितात. मासिक दरावरून वार्षिक दर दोन पद्धतींनी काढता येतो: त्याला 12\u00a0ने गुणून, जसे अमेरिका आणि कॅनडातील कागदपत्रांत असते, किंवा वर्षभर चक्रवाढ करून, जसे युरोपियन युनियन आणि UK\u00a0मधील कागदपत्रांत असते. आधी साधन फक्त पहिली पद्धत दाखवत असे, त्यामुळे शुल्क नसलेले एकच कर्ज 6.50% दिसत असे, तर दुसऱ्या पद्धतीने ते 6.70% येते. आता ऑफरच्या वरचा एक पर्याय पद्धत निवडतो, सुरुवातीची निवड चलनानुसार होते, आणि प्रत्येक कार्डावर कोणती पद्धत वापरली आहे ते लिहिलेले असते. कर्जाच्या ऑफरची तुलना करण्याची मार्गदर्शिका आणि कर्जाच्या अटींवरचा धडाही आता कोणती पद्धत वापरतात ते सांगतात.',
        },
      },
      {
        id: 'loan-comparison-short-cards',
        text: {
          en: 'The loan comparison shows each offer\'s result right under its five main boxes, on every screen size. The optional details (rate structure, costs and fees, prepayments, prepayment penalty) are now four rows that say what they hold and open when you want them, so the side-by-side table is no longer two screens down. The starting offers are marked as an example, and the assumptions start folded.',
          hi: 'लोन तुलना टूल में हर ऑफ़र का नतीजा अब उसके पाँच मुख्य खानों के ठीक नीचे दिखता है, हर स्क्रीन पर। वैकल्पिक जानकारी (दर का ढाँचा, लागत और शुल्क, समय से पहले भुगतान, समय से पहले भुगतान पर जुर्माना) अब चार पंक्तियाँ हैं, जो बताती हैं कि उनमें क्या भरा है और ज़रूरत पड़ने पर खुलती हैं, इसलिए आमने-सामने वाली तालिका अब दो स्क्रीन नीचे नहीं है। शुरुआती ऑफ़रों पर लिखा है कि वे उदाहरण हैं, और मान्यताएँ शुरू में बंद रहती हैं।',
          es: 'La comparación de préstamos muestra el resultado de cada oferta justo debajo de sus cinco casillas principales, en cualquier tamaño de pantalla. Los datos opcionales (estructura de la tasa, costos y comisiones, pagos anticipados, penalización por pago anticipado) son ahora cuatro filas que dicen lo que contienen y se abren cuando las necesitas, así que la tabla comparativa ya no queda dos pantallas más abajo. Las ofertas iniciales llevan la indicación de que son un ejemplo, y los supuestos empiezan plegados.',
          cs: 'Srovnání úvěrů ukazuje výsledek každé nabídky hned pod jejími pěti hlavními poli, na každé velikosti obrazovky. Volitelné podrobnosti (struktura sazby, náklady a\u00a0poplatky, mimořádné splátky, poplatek za předčasné splacení) jsou teď čtyři řádky, které říkají, co obsahují, a\u00a0otevřou se, až je budete potřebovat, takže srovnávací tabulka už není o\u00a0dvě obrazovky níž. Výchozí nabídky jsou označené jako ukázka a\u00a0předpoklady jsou na začátku sbalené.',
          mr: 'कर्जांच्या तुलनेत प्रत्येक ऑफरचा निकाल आता तिच्या पाच मुख्य रकान्यांच्या लगेच खाली दिसतो, प्रत्येक स्क्रीनवर. ऐच्छिक तपशील (व्याजदराची रचना, खर्च आणि शुल्क, मुदतपूर्व परतफेड, मुदतपूर्व परतफेडीवरील दंड) आता चार ओळी आहेत; त्यांत काय भरले आहे ते त्या सांगतात आणि हवे तेव्हा उघडतात, त्यामुळे शेजारी-शेजारी तुलनेचा तक्ता आता दोन स्क्रीन खाली नाही. सुरुवातीच्या ऑफरवर त्या उदाहरण असल्याचे लिहिले आहे, आणि गृहीतके सुरुवातीला मिटलेली असतात.',
        },
      },
      {
        id: 'invest-pay-off-shorter-form',
        text: {
          en: 'The invest or pay off tool has a shorter form. The three optional percentages (tax relief, fund fee and tax on gains) now sit behind one row called Taxes and fees, which says which of them are in use and opens by itself when a shared link sets one. The starting figures are marked as an example, and Start again is at the top.',
          hi: 'निवेश या कर्ज़ चुकाना टूल का फ़ॉर्म अब छोटा है। तीन वैकल्पिक प्रतिशत (कर छूट, फंड शुल्क और मुनाफ़े पर कर) अब कर और शुल्क नाम की एक पंक्ति के पीछे हैं, जो बताती है कि इनमें से कौन-से लागू हैं और शेयर किए गए लिंक में कोई भरा हो तो अपने आप खुल जाती है। शुरुआती आँकड़ों पर लिखा है कि वे उदाहरण हैं, और फिर से शुरू करें अब सबसे ऊपर है।',
          es: 'La herramienta Invertir o pagar deuda tiene ahora un formulario más corto. Los tres porcentajes opcionales (desgravación fiscal, comisión del fondo e impuesto sobre la ganancia) quedan tras una sola fila, Impuestos y comisiones, que dice cuáles están en uso y se abre sola cuando un enlace compartido trae alguno. Las cifras iniciales llevan la indicación de que son un ejemplo, y Empezar de nuevo está arriba.',
          cs: 'Nástroj Investovat, nebo splatit dluh má teď kratší formulář. Tři volitelná procenta (daňová úleva, poplatek fondu a\u00a0daň ze zisku) jsou nově schovaná za jedním řádkem Daně a\u00a0poplatky, který říká, která z\u00a0nich se používají, a\u00a0sám se otevře, když některé nastaví sdílený odkaz. Výchozí čísla jsou označená jako ukázka a\u00a0tlačítko Začít znovu je nahoře.',
          mr: 'गुंतवणूक की कर्जफेड या टूलचा फॉर्म आता लहान आहे. तीन ऐच्छिक टक्केवाऱ्या (कर सवलत, फंड शुल्क आणि नफ्यावरील कर) आता कर आणि शुल्क या एका ओळीमागे आहेत; त्यांपैकी कोणत्या लागू आहेत ते ती ओळ सांगते आणि शेअर केलेल्या लिंकमध्ये एखादी भरलेली असेल तर आपोआप उघडते. सुरुवातीच्या आकड्यांवर ते उदाहरण असल्याचे लिहिले आहे, आणि पुन्हा सुरू करा आता सर्वात वर आहे.',
        },
      },
      {
        id: 'monte-carlo-chart-first',
        text: {
          en: 'The Monte Carlo simulator now shows the chart right under the three figures, with the save and share buttons after it. Yearly fees and the number of simulated paths sit behind one row that says what they are set to, on every screen size. The starting figures are marked as an example, and the 80% stock mix says it is not a suggestion.',
          hi: 'मोंटे कार्लो सिम्युलेटर में चार्ट अब तीनों आँकड़ों के ठीक नीचे दिखता है, और सेव और शेयर के बटन उसके बाद आते हैं। सालाना शुल्क और सिम्युलेटेड रास्तों की गिनती अब हर स्क्रीन पर एक पंक्ति के पीछे हैं, जो बताती है कि वे किस पर सेट हैं। शुरुआती आँकड़ों पर लिखा है कि वे उदाहरण हैं, और 80% शेयर वाले मिश्रण पर लिखा है कि वह सुझाव नहीं है।',
          es: 'El simulador Monte Carlo muestra ahora el gráfico justo debajo de las tres cifras, y los botones de guardar y compartir van después. Las comisiones anuales y el número de trayectorias simuladas quedan tras una sola fila que dice cómo están ajustadas, en cualquier tamaño de pantalla. Las cifras iniciales llevan la indicación de que son un ejemplo, y la combinación con un 80\u00a0% en acciones dice que no es una sugerencia.',
          cs: 'Simulátor Monte Carlo teď ukazuje graf hned pod třemi čísly a\u00a0tlačítka pro uložení a\u00a0sdílení následují až za ním. Roční poplatky a\u00a0počet simulovaných trajektorií jsou na každé velikosti obrazovky schované za jedním řádkem, který říká, jak jsou nastavené. Výchozí čísla jsou označená jako ukázka a\u00a0u\u00a0poměru s\u00a080\u00a0% akcií je napsáno, že nejde o\u00a0doporučení.',
          mr: 'मॉन्टे कार्लो सिम्युलेटरमध्ये आलेख आता तीन आकड्यांच्या लगेच खाली दिसतो, आणि सेव्ह व शेअरची बटणे त्यानंतर येतात. वार्षिक शुल्क आणि संभाव्य मार्गांची संख्या आता प्रत्येक स्क्रीनवर एका ओळीमागे आहेत; ते कशावर सेट आहेत ते ती ओळ सांगते. सुरुवातीच्या आकड्यांवर ते उदाहरण असल्याचे लिहिले आहे, आणि 80% शेअर्सच्या मिश्रणावर ते सुचवलेले मिश्रण नसल्याचे लिहिले आहे.',
        },
      },
      {
        id: 'inflation-history-folded',
        text: {
          en: 'The inflation calculator puts the answer closer to the figures you type. A country\'s inflation history is optional in three of the four questions, so there it now sits behind one row that names the country you picked; in Past to today, which needs it, it stays in view. The starting figures are marked as an example, Reset is at the top, and the chart is shorter on a phone.',
          hi: 'महँगाई कैलकुलेटर में जवाब अब आपके भरे आँकड़ों के ज़्यादा पास दिखता है। चार में से तीन सवालों में किसी देश की महँगाई का इतिहास वैकल्पिक है, इसलिए वहाँ वह अब एक पंक्ति के पीछे है, जिस पर चुने हुए देश का नाम रहता है; बीते साल से आज तक वाले सवाल में, जहाँ उसकी ज़रूरत है, वह सामने ही रहता है। शुरुआती आँकड़ों पर लिखा है कि वे उदाहरण हैं, रीसेट करें अब सबसे ऊपर है, और फ़ोन पर चार्ट छोटा है।',
          es: 'La calculadora de inflación acerca la respuesta a las cifras que escribes. El historial de inflación de un país es opcional en tres de las cuatro preguntas, así que ahí queda tras una sola fila que nombra el país elegido; en Del pasado a hoy, que lo necesita, sigue a la vista. Las cifras iniciales llevan la indicación de que son un ejemplo, Restablecer está arriba y el gráfico es más bajo en el teléfono.',
          cs: 'Inflační kalkulačka teď ukazuje odpověď blíž k\u00a0číslům, která zadáváte. Historie inflace v\u00a0dané zemi je u\u00a0tří ze čtyř otázek volitelná, takže je tam nově schovaná za jedním řádkem se jménem vybrané země; u\u00a0otázky Z\u00a0minulosti do dneška, která ji potřebuje, zůstává na očích. Výchozí čísla jsou označená jako ukázka, tlačítko Obnovit výchozí je nahoře a\u00a0graf je na telefonu nižší.',
          mr: 'महागाई कॅल्क्युलेटरमध्ये उत्तर आता तुम्ही भरलेल्या आकड्यांच्या अधिक जवळ दिसते. चारपैकी तीन प्रश्नांमध्ये देशाचा महागाईचा इतिहास ऐच्छिक आहे, म्हणून तिथे तो आता एका ओळीमागे आहे आणि त्या ओळीवर निवडलेल्या देशाचे नाव असते; भूतकाळापासून आजपर्यंत या प्रश्नात, जिथे त्याची गरज असते, तो समोरच राहतो. सुरुवातीच्या आकड्यांवर ते उदाहरण असल्याचे लिहिले आहे, रीसेट करा हे बटण आता सर्वात वर आहे, आणि फोनवर आलेख लहान आहे.',
        },
      },
      {
        id: 'net-worth-example-and-labels',
        text: {
          en: 'The net worth calculator starts with one row instead of two, and on a phone every box in a row has its name above it. Before you type anything, it says what the result will show, and “See an example” fills in sample rows you can clear in one tap. The save and share buttons appear once there is a result, and the two CSV buttons sit together under “Import or save rows”.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर अब दो की जगह एक पंक्ति से शुरू होता है, और फ़ोन पर पंक्ति के हर खाने के ऊपर उसका नाम लिखा है। कुछ भी भरने से पहले यह बताता है कि नतीजे में क्या दिखेगा, और “एक उदाहरण देखें” से नमूने की पंक्तियाँ भर जाती हैं, जो एक टैप में हट जाती हैं। सेव और शेयर के बटन नतीजा आने पर दिखते हैं, और CSV के दोनों बटन “पंक्तियाँ इंपोर्ट या सेव करें” के नीचे साथ रखे हैं।',
          es: 'La calculadora de patrimonio neto empieza con una fila en lugar de dos, y en el teléfono cada casilla de una fila lleva su nombre encima. Antes de que escribas nada, dice qué mostrará el resultado, y «Ver un ejemplo» rellena filas de muestra que se quitan con un toque. Los botones para guardar y compartir aparecen cuando hay un resultado, y los dos botones de CSV están juntos en «Importar o guardar filas».',
          cs: 'Kalkulačka čistého jmění začíná jedním řádkem místo dvou a\u00a0na telefonu má každé pole v\u00a0řádku nad sebou svůj název. Než cokoli zadáte, říká, co výsledek ukáže, a\u00a0„Zobrazit ukázku“ vyplní ukázkové řádky, které jedním klepnutím smažete. Tlačítka pro uložení a\u00a0sdílení se objeví, až se zobrazí výsledek, a\u00a0obě tlačítka CSV jsou spolu pod „Nahrát nebo uložit řádky“.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटर आता दोनऐवजी एका ओळीने सुरू होतो, आणि फोनवर ओळीतील प्रत्येक रकान्याच्या वर त्याचे नाव दिसते. काहीही भरण्यापूर्वी निकालात काय दिसेल ते तो सांगतो, आणि ‘एक उदाहरण पाहा’ दाबल्यावर नमुन्याच्या ओळी भरल्या जातात, ज्या एका टॅपमध्ये काढता येतात. सेव्ह आणि शेअरची बटणे निकाल आल्यावर दिसतात, आणि CSV\u00a0ची दोन्ही बटणे ‘ओळी इंपोर्ट किंवा सेव्ह करा’ खाली एकत्र आहेत.',
        },
      },
      {
        id: 'tool-buttons-one-style',
        text: {
          en: 'The buttons in the five free tools now look and behave the same: one size, one shape, labels that wrap instead of being cut, and a clear ring when you reach them with the keyboard. Sharing, exporting, adding a row and uploading are all outlined in blue, and resetting is a quiet text button. Before, the same action was blue in one tool and teal in the next. The rest of the site uses the same buttons now: the main button on a page is filled blue, where it used to be teal.',
          hi: 'पाँचों मुफ़्त टूल के बटन अब एक जैसे दिखते और चलते हैं: एक ही आकार, एक ही आकृति, लंबे लेबल कटने की जगह अगली पंक्ति में आते हैं, और कीबोर्ड से पहुँचने पर साफ़ घेरा दिखता है। शेयर करना, एक्सपोर्ट करना, पंक्ति जोड़ना और अपलोड करना, सब नीली रेखा वाले बटन हैं, और रीसेट एक सादा टेक्स्ट बटन है। पहले वही काम एक टूल में नीला था और दूसरे में हरा-नीला। बाक़ी साइट पर भी अब यही बटन हैं: पेज का मुख्य बटन भरा हुआ नीला है, जो पहले हरा-नीला था।',
          es: 'Los botones de las cinco herramientas gratuitas ahora se ven y se comportan igual: un tamaño, una forma, etiquetas que pasan a otra línea en vez de cortarse y un anillo claro cuando llegas a ellos con el teclado. Compartir, exportar, añadir una fila y subir un archivo van con contorno azul, y restablecer es un botón de texto discreto. Antes, la misma acción era azul en una herramienta y verde azulada en la siguiente. El resto del sitio usa ahora los mismos botones: el botón principal de una página va relleno de azul, donde antes era verde azulado.',
          cs: 'Tlačítka v\u00a0pěti nástrojích zdarma teď vypadají a\u00a0chovají se stejně: jedna velikost, jeden tvar, popisky, které se zalomí, místo aby se uřízly, a\u00a0zřetelný rámeček, když se na ně dostanete klávesnicí. Sdílení, export, přidání řádku a\u00a0nahrání souboru mají modrý obrys a\u00a0obnovení je nenápadné textové tlačítko. Dříve byla stejná akce v\u00a0jednom nástroji modrá a\u00a0v\u00a0dalším tyrkysová. Stejná tlačítka teď používá i\u00a0zbytek webu: hlavní tlačítko stránky je vyplněné modře, dříve bylo tyrkysové.',
          mr: 'पाचही मोफत साधनांमधील बटणे आता सारखी दिसतात आणि सारखी चालतात: एकच आकार, एकच घडण, लांब लेबले कापली न जाता पुढच्या ओळीत येतात, आणि कीबोर्डने पोहोचल्यावर स्पष्ट वलय दिसते. शेअर करणे, एक्सपोर्ट करणे, ओळ जोडणे आणि अपलोड करणे ही सगळी निळ्या रेषेची बटणे आहेत, आणि रीसेट हे साधे मजकूर बटण आहे. आधी तीच कृती एका साधनात निळी होती आणि दुसऱ्यात निळसर हिरवी. उरलेल्या साइटवरही आता हीच बटणे आहेत: पानावरील मुख्य बटण भरीव निळे आहे, जे आधी निळसर हिरवे होते.',
        },
      },
      {
        id: 'charts-readable-in-dark',
        text: {
          en: 'Charts and figures can now be read in dark mode. In the loan comparison and the net worth calculator, the fourth offer or currency onward used to keep a dark colour on the dark card and nearly vanish; every colour now has a light partner. Each offer and currency also has a shape of its own (a circle, a square, a triangle and so on) on the chart, in the legend and beside its name, so nobody has to tell them apart by colour alone. In lessons, the numbers inside coloured bars, which were white on pale bars in dark mode, are now dark and clear.',
          hi: 'चार्ट और चित्र अब डार्क मोड में पढ़े जा सकते हैं। लोन तुलना और शुद्ध संपत्ति कैलकुलेटर में चौथे ऑफ़र या मुद्रा से आगे के रंग गहरे कार्ड पर गहरे ही रहते थे और लगभग दिखते नहीं थे; अब हर रंग का एक हल्का जोड़ीदार है। हर ऑफ़र और मुद्रा का अब अपना एक आकार भी है (गोला, चौकोर, त्रिकोण वगैरह), चार्ट पर, उसकी सूची में और नाम के साथ, ताकि किसी को सिर्फ़ रंग से पहचानना न पड़े। पाठों में रंगीन पट्टियों के अंदर की संख्याएँ, जो डार्क मोड में हल्की पट्टियों पर सफ़ेद थीं, अब गहरी और साफ़ हैं।',
          es: 'Los gráficos y las figuras ya se leen en modo oscuro. En el comparador de préstamos y en la calculadora de patrimonio neto, a partir de la cuarta oferta o moneda el color seguía siendo oscuro sobre la tarjeta oscura y casi desaparecía; ahora cada color tiene su pareja clara. Cada oferta y cada moneda tiene además una forma propia (un círculo, un cuadrado, un triángulo y así) en el gráfico, en la leyenda y junto a su nombre, para que nadie tenga que distinguirlas solo por el color. En las lecciones, los números dentro de las barras de color, que en modo oscuro eran blancos sobre barras pálidas, ahora son oscuros y claros de leer.',
          cs: 'Grafy a\u00a0obrázky se teď dají číst i\u00a0v\u00a0tmavém režimu. Ve srovnání úvěrů a\u00a0v\u00a0kalkulačce čistého jmění zůstávala od čtvrté nabídky nebo měny dál tmavá barva na tmavé kartě a\u00a0téměř mizela; každá barva má teď světlý protějšek. Každá nabídka a\u00a0měna má navíc vlastní tvar (kruh, čtverec, trojúhelník a\u00a0tak dále) v\u00a0grafu, v\u00a0legendě i\u00a0u\u00a0svého názvu, takže je nikdo nemusí rozlišovat jen podle barvy. V\u00a0lekcích jsou čísla uvnitř barevných sloupců, která byla v\u00a0tmavém režimu bílá na světlých sloupcích, teď tmavá a\u00a0čitelná.',
          mr: 'आलेख आणि आकृत्या आता गडद मोडमध्ये वाचता येतात. कर्जांची तुलना आणि निव्वळ संपत्ती कॅल्क्युलेटरमध्ये चौथ्या ऑफर किंवा चलनापासून पुढचे रंग गडद कार्डावर गडदच राहत आणि जवळजवळ दिसत नसत; आता प्रत्येक रंगाला एक फिकट जोडीदार आहे. प्रत्येक ऑफर आणि चलनाला आता स्वतःचा एक आकारही आहे (वर्तुळ, चौरस, त्रिकोण वगैरे), आलेखावर, सूचीत आणि नावाशेजारी, म्हणजे कोणालाही फक्त रंगावरून ओळखावे लागत नाही. धड्यांमध्ये रंगीत पट्ट्यांमधील आकडे, जे गडद मोडमध्ये फिकट पट्ट्यांवर पांढरे होते, आता गडद आणि स्पष्ट आहेत.',
        },
      },
      {
        id: 'forms-without-javascript',
        text: {
          en: 'If JavaScript is off or blocked in your browser, the waitlist and newsletter forms now say that signing up needs it and give an address to write to. Pressing the button used to reload the page with your email in the address and sign nobody up; the email is no longer put there. When JavaScript is off, the five free tools now say that their example figures will not change as you type.',
          hi: 'अगर आपके ब्राउज़र में JavaScript बंद या ब्लॉक है, तो वेटलिस्ट और न्यूज़लेटर के फ़ॉर्म अब बताते हैं कि साइन अप के लिए वह ज़रूरी है, और लिखने के लिए एक पता देते हैं। पहले बटन दबाने पर पेज दोबारा खुलता था, आपका ईमेल पेज के पते में आ जाता था और साइन अप नहीं होता था; अब ईमेल वहाँ नहीं जाता। JavaScript बंद होने पर पाँचों मुफ़्त टूल अब बताते हैं कि उदाहरण के आँकड़े आपके कुछ भरने पर नहीं बदलेंगे।',
          es: 'Si JavaScript está desactivado o bloqueado en tu navegador, los formularios de la lista de espera y del boletín dicen ahora que hace falta para apuntarse y dan una dirección a la que escribir. Antes, al pulsar el botón la página se recargaba con tu correo en la dirección y nadie quedaba apuntado; el correo ya no se pone ahí. Cuando JavaScript está desactivado, las cinco herramientas gratuitas explican ahora que las cifras de ejemplo no cambiarán al escribir.',
          cs: 'Pokud je ve vašem prohlížeči JavaScript vypnutý nebo blokovaný, formuláře pro čekací listinu a\u00a0newsletter teď říkají, že je k\u00a0přihlášení potřeba, a\u00a0uvádějí adresu, na kterou lze napsat. Dříve se po stisku tlačítka stránka načetla znovu s\u00a0vaším e-mailem v\u00a0adrese a\u00a0nikdo přihlášen nebyl; e-mail se tam už nedostane. Když je JavaScript vypnutý, pět nástrojů zdarma teď vysvětluje, že se ukázková čísla při zadávání nezmění.',
          mr: 'तुमच्या ब्राउझरमध्ये JavaScript बंद किंवा ब्लॉक असेल, तर प्रतीक्षा यादी आणि न्यूजलेटरचे फॉर्म आता सांगतात की नोंदणीसाठी ते आवश्यक आहे, आणि लिहिण्यासाठी एक पत्ता देतात. आधी बटण दाबल्यावर पान पुन्हा उघडायचे, तुमचा ईमेल पानाच्या पत्त्यात यायचा आणि नोंदणी होत नसे; आता ईमेल तिथे जात नाही. JavaScript बंद असताना उदाहरणाचे आकडे तुम्ही काही भरल्यावर बदलणार नाहीत, हे पाचही मोफत साधने आता सांगतात.',
        },
      },
      {
        id: 'how-to-feed',
        text: {
          en: 'The how-to guides now have a feed of their own, at nidhi.today/how-to/rss.xml, for anyone who follows the site in a feed reader. The lesson feed also lists the newest lesson first now; it used to start with the oldest.',
          hi: 'कैसे करें गाइडों की अब अपनी फ़ीड है, nidhi.today/how-to/rss.xml पर, उन लोगों के लिए जो साइट को फ़ीड रीडर में पढ़ते हैं। पाठों की फ़ीड में भी अब सबसे नया पाठ सबसे ऊपर रहता है; पहले वह सबसे पुराने पाठ से शुरू होती थी।',
          es: 'Las guías Cómo hacerlo tienen ahora su propio canal, en nidhi.today/how-to/rss.xml, para quien sigue el sitio con un lector de feeds. El canal de las lecciones también muestra ahora primero la lección más reciente; antes empezaba por la más antigua.',
          cs: 'Návody Jak na to teď mají vlastní kanál na adrese nidhi.today/how-to/rss.xml, pro ty, kdo web sledují ve čtečce. I\u00a0kanál lekcí teď uvádí nejnovější lekci jako první; dříve začínal tou nejstarší.',
          mr: '‘कसे करायचे’ मार्गदर्शिकांची आता स्वतंत्र फीड आहे, nidhi.today/how-to/rss.xml येथे, जे लोक साइट फीड रीडरमध्ये वाचतात त्यांच्यासाठी. धड्यांच्या फीडमध्येही आता सर्वात नवा धडा सर्वात आधी येतो; आधी ती सर्वात जुन्या धड्याने सुरू व्हायची.',
        },
      },
      {
        id: 'planner-lines-and-log-dates',
        text: {
          en: 'Two corrections to what the site says about itself. The Monte Carlo and invest or pay off pages said the planner already runs these calculations on your whole picture; the planner is still being built, and the lines now say what it is being built to do. And the privacy changelog had three entries dated a day off and no entry for the How-to section; the dates are corrected and the section is recorded.',
          hi: 'साइट अपने बारे में जो कहती है, उसमें दो सुधार हुए हैं। मोंटे कार्लो और निवेश या कर्ज़ चुकाना वाले पेज कहते थे कि प्लानर आपकी पूरी तस्वीर पर ये हिसाब पहले से करता है; प्लानर अभी बन रहा है, और अब वे पंक्तियाँ बताती हैं कि वह किस काम के लिए बनाया जा रहा है। और प्राइवेसी नोटिस के बदलावों के रिकॉर्ड की तीन एंट्री की तारीख़ एक दिन आगे-पीछे थी और कैसे करें सेक्शन की कोई एंट्री नहीं थी; तारीख़ें ठीक कर दी गई हैं और सेक्शन दर्ज हो गया है।',
          es: 'Dos correcciones en lo que el sitio dice de sí mismo. Las páginas del simulador Monte Carlo y de Invertir o pagar deuda decían que el planificador ya hace estos cálculos con tu situación completa; el planificador todavía se está construyendo, y ahora esas líneas dicen para qué se está construyendo. Y el registro de cambios de privacidad tenía tres entradas con un día de diferencia y ninguna para la sección Cómo hacerlo; las fechas están corregidas y la sección queda registrada.',
          cs: 'Dvě opravy toho, co web říká sám o\u00a0sobě. Stránky simulátoru Monte Carlo a\u00a0nástroje Investovat, nebo splatit dluh tvrdily, že plánovač tyto výpočty už dělá pro celou vaši finanční situaci; plánovač teprve vzniká a\u00a0ty řádky teď říkají, k\u00a0čemu vzniká. A\u00a0přehled změn v\u00a0zásadách ochrany soukromí měl tři záznamy s\u00a0datem posunutým o\u00a0den a\u00a0žádný záznam pro sekci Jak na to; data jsou opravená a\u00a0sekce je zaznamenaná.',
          mr: 'साइट स्वतःबद्दल जे सांगते त्यात दोन दुरुस्त्या झाल्या आहेत. मॉन्टे कार्लो आणि गुंतवणूक की कर्जफेड या पानांवर लिहिले होते की प्लॅनर तुमच्या संपूर्ण चित्रावर हे हिशेब आधीच करतो; प्लॅनर अजून बनवला जात आहे, आणि आता त्या ओळी तो कशासाठी बनवला जात आहे ते सांगतात. आणि गोपनीयता बदलांच्या नोंदीत तीन नोंदींची तारीख एका दिवसाने चुकली होती आणि ‘कसे करायचे’ विभागाची नोंदच नव्हती; तारखा दुरुस्त केल्या आहेत आणि विभाग नोंदवला आहे.',
        },
      },
      {
        id: 'loan-link-cleared-boxes',
        text: {
          en: 'A loan comparison you share now arrives as you left it. If you emptied a box, such as an offer’s fee, the link used to put the starting figure back, so the person opening it saw a different comparison; the same happened to your own screen when you switched language. An emptied box now stays empty.',
          hi: 'आपकी शेयर की हुई लोन तुलना अब वैसी ही पहुँचती है जैसी आपने छोड़ी थी। अगर आपने कोई बॉक्स खाली किया था, जैसे किसी ऑफ़र का शुल्क, तो लिंक पहले शुरुआती आँकड़ा वापस रख देता था, और लिंक खोलने वाले को अलग तुलना दिखती थी; भाषा बदलने पर आपकी अपनी स्क्रीन पर भी यही होता था। खाली किया हुआ बॉक्स अब खाली ही रहता है।',
          es: 'Una comparación de préstamos que compartes llega ahora tal como la dejaste. Si habías vaciado una casilla, como la comisión de una oferta, el enlace volvía a poner la cifra inicial, y quien lo abría veía otra comparación; lo mismo pasaba en tu propia pantalla al cambiar de idioma. Una casilla vaciada ahora se queda vacía.',
          cs: 'Srovnání úvěrů, které sdílíte, teď dorazí beze změny. Když bylo některé pole vymazané, například poplatek u\u00a0nabídky, odkaz do něj dříve vrátil výchozí hodnotu, takže ten, kdo ho otevřel, viděl jiné srovnání; totéž se stalo na vaší obrazovce při přepnutí jazyka. Vymazané pole teď zůstane prázdné.',
          mr: 'तुम्ही शेअर केलेली कर्जांची तुलना आता तुम्ही ठेवली होती तशीच पोहोचते. तुम्ही एखादी चौकट रिकामी केली असेल, उदा. एखाद्या ऑफरचे शुल्क, तर लिंक आधी सुरुवातीचा आकडा परत भरायची, आणि लिंक उघडणाऱ्याला वेगळी तुलना दिसायची; भाषा बदलल्यावर तुमच्या स्वतःच्या स्क्रीनवरही तेच व्हायचे. रिकामी केलेली चौकट आता रिकामीच राहते.',
        },
      },
      {
        id: 'tools-send-less',
        text: {
          en: 'The free tools now send a little less. The loan comparison no longer reports how many months you chose for the time horizon, only that you changed it, and when exchange rates fail to load, the net worth calculator reports one of a few fixed reasons instead of the browser’s own error text. A link someone shares with you can now only set a currency the tools offer, a number, or a name of ordinary length. The privacy notice now lists every event the loan comparison and the net worth calculator send. And when a lesson email cannot be sent, the record of that now holds one of a few fixed reasons instead of the mail service’s own message, which could quote an address.',
          hi: 'मुफ़्त टूल अब थोड़ी कम जानकारी भेजते हैं। लोन तुलना अब यह नहीं बताती कि समय-सीमा के लिए कितने महीने चुने गए, सिर्फ़ यह कि उसे बदला गया। विनिमय दरें लोड न हो पाएँ, तो शुद्ध संपत्ति कैलकुलेटर ब्राउज़र के अपने एरर संदेश की जगह कुछ तय कारणों में से एक बताता है। किसी के भेजे लिंक से अब सिर्फ़ वही मुद्रा चुनी जा सकती है जो टूल में मौजूद है, और उसमें सिर्फ़ संख्या या सामान्य लंबाई का नाम आ सकता है। प्राइवेसी नोटिस में अब लोन तुलना और शुद्ध संपत्ति कैलकुलेटर की भेजी हर घटना की सूची है। और जब पाठ का ईमेल भेजा नहीं जा पाता, तो उसके रिकॉर्ड में अब मेल सेवा के अपने संदेश की जगह कुछ तय कारणों में से एक रहता है; उस संदेश में ईमेल पता आ सकता था।',
          es: 'Las herramientas gratuitas envían ahora un poco menos. El comparador de préstamos ya no informa de cuántos meses elegiste como horizonte, solo de que lo cambiaste, y cuando los tipos de cambio no se cargan, la calculadora de patrimonio neto informa de uno de unos pocos motivos fijos en lugar del texto de error del navegador. Un enlace que alguien comparta contigo solo puede fijar una moneda que las herramientas ofrecen, un número o un nombre de longitud normal. El aviso de privacidad enumera ahora todos los eventos que envían el comparador de préstamos y la calculadora de patrimonio neto. Y cuando un correo con una lección no puede enviarse, el registro de ese fallo guarda ahora uno de unos pocos motivos fijos en lugar del mensaje del servicio de correo, que podía citar una dirección.',
          cs: 'Nástroje zdarma teď odesílají o\u00a0něco méně. Srovnání úvěrů už nehlásí, kolik měsíců zvolíte jako časový horizont, jen to, že ho změníte. Když se nepodaří načíst kurzy, kalkulačka čistého jmění hlásí jeden z\u00a0několika pevných důvodů místo chybového textu prohlížeče. Odkaz, který vám někdo pošle, může nastavit jen měnu, kterou nástroje nabízejí, číslo nebo název běžné délky. Zásady ochrany soukromí teď vyjmenovávají všechny události, které srovnání úvěrů a\u00a0kalkulačka čistého jmění odesílají. A\u00a0když se e-mail s\u00a0lekcí nepodaří odeslat, záznam o\u00a0tom teď obsahuje jeden z\u00a0několika pevných důvodů místo vlastní zprávy poštovní služby, která mohla citovat adresu.',
          mr: 'मोफत साधने आता थोडी कमी माहिती पाठवतात. कर्जांची तुलना आता कालावधीसाठी किती महिने निवडले ते कळवत नाही, फक्त तो बदलला एवढेच. विनिमय दर लोड झाले नाहीत, तर निव्वळ संपत्ती कॅल्क्युलेटर ब्राउझरच्या स्वतःच्या एरर संदेशाऐवजी काही ठरावीक कारणांपैकी एक कळवतो. कोणी पाठवलेल्या लिंकमधून आता फक्त साधनांत उपलब्ध असलेले चलन, संख्या किंवा नेहमीच्या लांबीचे नाव येऊ शकते. गोपनीयता सूचनेत आता कर्जांची तुलना आणि निव्वळ संपत्ती कॅल्क्युलेटर पाठवत असलेल्या प्रत्येक घटनेची यादी आहे. आणि धड्याचा ईमेल पाठवता आला नाही, तर त्याच्या नोंदीत आता मेल सेवेच्या स्वतःच्या संदेशाऐवजी काही ठरावीक कारणांपैकी एक राहते; त्या संदेशात ईमेल पत्ता येऊ शकत होता.',
        },
      },
      {
        id: 'loan-points-row',
        text: {
          en: 'In the loan comparison, the line about discount points now tells a saving from a loss. When a loan ends before the points have paid for themselves it says how much more they cost, where it used to print that amount as a saving. And for a loan entered by its monthly payment, where points shorten the loan and do not lower the payment, it now gives the month they pay for themselves, not “never”.',
          hi: 'लोन की तुलना में डिस्काउंट पॉइंट्स वाली पंक्ति अब बचत और नुकसान में फ़र्क बताती है। जब लोन पॉइंट्स की लागत निकलने से पहले ख़त्म हो जाता है, तो वह बताती है कि वे कितने ज़्यादा महँगे पड़े; पहले वही रकम बचत के रूप में दिखती थी। और मासिक किस्त से भरे गए लोन में, जहाँ पॉइंट्स किस्त नहीं घटाते बल्कि लोन छोटा करते हैं, अब वह महीना दिखता है जब उनकी लागत निकल जाती है, “कभी नहीं” की जगह।',
          es: 'En el comparador de préstamos, la línea sobre los puntos de descuento distingue ahora un ahorro de una pérdida. Cuando el préstamo termina antes de que los puntos se recuperen, dice cuánto más cuestan; antes mostraba esa cantidad como un ahorro. Y en un préstamo definido por su cuota mensual, donde los puntos acortan el préstamo y no bajan la cuota, ahora da el mes en que se recuperan, no «nunca».',
          cs: 'Ve srovnání úvěrů teď řádek o\u00a0slevových bodech rozliší úsporu od ztráty. Když úvěr skončí dřív, než se body vrátí, řekne, o\u00a0kolik víc stojí; dříve tu částku ukazoval jako úsporu. A\u00a0u\u00a0úvěru zadaného měsíční splátkou, kde body úvěr zkracují a\u00a0splátku nesnižují, teď uvede měsíc, kdy se vrátí, ne „nikdy“.',
          mr: 'कर्जांच्या तुलनेत डिस्काउंट पॉइंट्सची ओळ आता बचत आणि तोटा यांत फरक करते. पॉइंट्सचा खर्च वसूल होण्याआधीच कर्ज संपले, तर ते किती जास्त महाग पडले हे ती सांगते; आधी तीच रक्कम बचत म्हणून दिसायची. आणि मासिक हप्त्याने भरलेल्या कर्जात, जिथे पॉइंट्स हप्ता कमी न करता कर्जाची मुदत कमी करतात, तिथे आता खर्च वसूल होण्याचा महिना दिसतो, “कधीच नाही” नाही.',
        },
      },
      {
        id: 'net-worth-rates-and-csv-amounts',
        text: {
          en: 'Two more fixes to the net worth calculator. After you change your spending currency it no longer shows a total worked out with the previous currency’s exchange rates: it waits for the new rates, and says so if they cannot be loaded. And amounts in an uploaded CSV file are read the way the file writes numbers, so “2500,50” is two thousand five hundred and a half, not a quarter of a million.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर में दो और सुधार हुए हैं। खर्च की मुद्रा बदलने के बाद वह अब पिछली मुद्रा की विनिमय दरों से निकला कुल जोड़ नहीं दिखाता: नई दरों का इंतज़ार करता है, और वे लोड न हो सकें तो यह बताता है। और अपलोड की गई CSV फ़ाइल की रकमें वैसे ही पढ़ी जाती हैं जैसे फ़ाइल में संख्याएँ लिखी हैं, इसलिए “2500,50” का मतलब ढाई हज़ार और पचास पैसे है, ढाई लाख नहीं।',
          es: 'Dos correcciones más en la calculadora de patrimonio neto. Después de cambiar la moneda de tus gastos ya no muestra un total calculado con los tipos de cambio de la moneda anterior: espera a los nuevos y avisa si no se pueden cargar. Y las cantidades de un archivo CSV subido se leen como el archivo escribe los números, así que «2500,50» son dos mil quinientos con cincuenta, no un cuarto de millón.',
          cs: 'Další dvě opravy v\u00a0kalkulačce čistého jmění. Po změně měny výdajů už neukazuje součet spočítaný s\u00a0kurzy předchozí měny: čeká na nové kurzy a\u00a0řekne, když se je nepodaří načíst. A\u00a0částky v\u00a0nahraném souboru CSV se čtou tak, jak soubor čísla zapisuje, takže „2500,50“ je dva tisíce pět set a\u00a0půl, ne čtvrt milionu.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटरमध्ये आणखी दोन दुरुस्त्या झाल्या आहेत. खर्चाचे चलन बदलल्यानंतर तो आता आधीच्या चलनाच्या विनिमय दरांनी काढलेली एकूण बेरीज दाखवत नाही: नव्या दरांची वाट पाहतो, आणि ते लोड झाले नाहीत तर तसे सांगतो. आणि अपलोड केलेल्या CSV\u00a0फाइलमधील रकमा फाइलमध्ये संख्या जशा लिहिल्या आहेत तशाच वाचल्या जातात, त्यामुळे “2500,50” म्हणजे अडीच हजार आणि अर्धा, अडीच लाख नाही.',
        },
      },
      {
        id: 'numbers-read-right',
        text: {
          en: 'Two fixes to how the tools read numbers. A decimal below one with three decimals, such as 0.125, was read as 125 on some pages; it is now read as written, in every language. And the Monte Carlo simulator now asks for whole years: half a year used to give a result line that read “NaN”.',
          hi: 'टूल संख्याएँ कैसे पढ़ते हैं, उसमें दो सुधार हुए हैं। एक से छोटा तीन दशमलव वाला अंक, जैसे 0.125, कुछ पेजों पर 125 पढ़ा जाता था; अब वह हर भाषा में वैसा ही पढ़ा जाता है जैसा लिखा गया है। और मोंटे कार्लो सिम्युलेटर अब पूरे साल ही लेता है: आधे साल पर नतीजे की एक पंक्ति में “NaN” दिखता था।',
          es: 'Dos correcciones en cómo las herramientas leen los números. Un decimal menor que uno con tres decimales, como 0.125, se leía como 125 en algunas páginas; ahora se lee tal como está escrito, en todos los idiomas. Y el simulador Monte Carlo pide ahora años enteros: con medio año, una línea del resultado mostraba «NaN».',
          cs: 'Dvě opravy toho, jak nástroje čtou čísla. Desetinné číslo menší než jedna se třemi desetinnými místy, například 0.125, se na některých stránkách četlo jako 125; teď se čte tak, jak je napsané, ve všech jazycích. A\u00a0simulátor Monte Carlo teď chce celé roky: u\u00a0půl roku se v\u00a0jednom řádku výsledku objevilo „NaN“.',
          mr: 'साधने संख्या कशा वाचतात यात दोन दुरुस्त्या झाल्या आहेत. एकापेक्षा लहान, तीन दशांश स्थाने असलेली संख्या, उदा. 0.125, काही पानांवर 125 अशी वाचली जायची; आता ती प्रत्येक भाषेत लिहिल्याप्रमाणेच वाचली जाते. आणि मॉन्टे कार्लो सिम्युलेटर आता पूर्ण वर्षेच घेतो: अर्ध्या वर्षासाठी निकालाच्या एका ओळीत “NaN” दिसायचे.',
        },
      },
    ],
  },
  {
    date: '2026-11-10',
    items: [
      {
        id: 'net-worth-unreadable-amounts',
        text: {
          en: 'The net worth calculator now tells you when it cannot read an amount. An amount typed with a currency sign, a minus or words used to be left out of the total without a word; now the box is marked, a line says how many rows are not counted, and a CSV file that was only partly read keeps its list of the lines that failed. CSV files with semicolons or tabs, as spreadsheets save them in Spanish or Czech, now load, and a type the tool does not know is an error, not an asset.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर अब बताता है कि कौन सी रकम वह पढ़ नहीं सका। मुद्रा के चिह्न, ऋण चिह्न या शब्दों के साथ लिखी रकम पहले बिना कुछ कहे कुल जोड़ से बाहर रह जाती थी; अब उस बॉक्स पर निशान लगता है, एक पंक्ति बताती है कि कितनी पंक्तियाँ नहीं गिनी गईं, और जो CSV फ़ाइल पूरी नहीं पढ़ी जा सकी, उसकी न पढ़ी गई लाइनों की सूची बनी रहती है। सेमीकोलन या टैब वाली CSV फ़ाइलें अब लोड होती हैं, और जिस क़िस्म को टूल नहीं जानता वह अब ग़लती मानी जाती है, संपत्ति नहीं।',
          es: 'La calculadora de patrimonio neto avisa ahora cuando no puede leer una cantidad. Una cantidad escrita con un símbolo de moneda, un signo menos o palabras quedaba antes fuera del total sin aviso; ahora la casilla se marca, una línea dice cuántas filas no se cuentan, y un archivo CSV que solo se leyó en parte conserva la lista de las líneas que fallaron. Los archivos CSV con punto y coma o tabuladores, como los guarda una hoja de cálculo en español o en checo, ya se cargan, y un tipo que la herramienta no conoce es un error, no un activo.',
          cs: 'Kalkulačka čistého jmění teď řekne, když částku nedokáže přečíst. Částka napsaná se znakem měny, s\u00a0minusem nebo se slovy dříve bez upozornění vypadla ze součtu; teď se pole označí, řádek nad tabulkou říká, kolik řádků se nezapočítává, a\u00a0u\u00a0souboru CSV, který se přečetl jen zčásti, zůstane seznam řádků, které se nepovedly. Soubory CSV se středníky nebo tabulátory, jak je ukládá tabulkový procesor ve španělštině nebo češtině, se teď načtou a\u00a0typ, který nástroj nezná, je chyba, ne aktivum.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटर आता एखादी रक्कम वाचता आली नाही तर तसे सांगतो. चलनाचे चिन्ह, वजा चिन्ह किंवा शब्दांसह लिहिलेली रक्कम आधी काहीही न सांगता एकूण बेरजेतून वगळली जायची; आता त्या चौकटीवर खूण येते, किती ओळी मोजलेल्या नाहीत हे एक ओळ सांगते, आणि जी CSV\u00a0फाइल अर्धवट वाचली गेली तिच्या न वाचलेल्या ओळींची यादी तशीच राहते. अर्धविराम किंवा टॅब असलेल्या CSV\u00a0फाइल्स आता लोड होतात, आणि साधनाला माहीत नसलेला प्रकार आता चूक मानला जातो, मालमत्ता नाही.',
        },
      },
      {
        id: 'loan-optional-boxes-errors',
        text: {
          en: 'In the loan comparison, an optional box that cannot be read is now an error. A fee typed as “€2,500”, an extra payment typed with words or a lump sum in the wrong form used to count as zero without a word, which could make an offer look free of fees; now the box is marked and the offer shows no result until it is fixed or cleared.',
          hi: 'लोन की तुलना में अब वह वैकल्पिक बॉक्स ग़लती माना जाता है जिसे पढ़ा नहीं जा सकता। “€2,500” की तरह लिखा शुल्क, शब्दों के साथ लिखी अतिरिक्त किस्त या ग़लत रूप में लिखी एकमुश्त रकम पहले बिना कुछ कहे शून्य गिनी जाती थी, जिससे कोई ऑफ़र बिना शुल्क का दिख सकता था; अब उस बॉक्स पर निशान लगता है और उसे ठीक या खाली करने तक ऑफ़र का नतीजा नहीं दिखता।',
          es: 'En el comparador de préstamos, una casilla opcional que no se puede leer es ahora un error. Una comisión escrita como «€2,500», un pago extra escrito con palabras o un pago único con un formato incorrecto contaban antes como cero sin aviso, y una oferta podía parecer libre de comisiones; ahora la casilla se marca y la oferta no muestra resultado hasta que se corrige o se vacía.',
          cs: 'Ve srovnání úvěrů je teď nepovinné pole, které nejde přečíst, chybou. Poplatek zapsaný jako „€2,500“, mimořádná splátka zapsaná slovy nebo jednorázová splátka ve špatném tvaru se dříve bez upozornění počítaly jako nula, takže nabídka mohla vypadat jako bez poplatků; teď se pole označí a\u00a0nabídka neukáže výsledek, dokud pole neopravíte nebo nevymažete.',
          mr: 'कर्जांच्या तुलनेत आता वाचता न येणारी पर्यायी चौकट ही चूक मानली जाते. “€2,500” असे लिहिलेले शुल्क, शब्दांसह लिहिलेला अतिरिक्त हप्ता किंवा चुकीच्या स्वरूपात लिहिलेली एकरकमी रक्कम आधी काहीही न सांगता शून्य धरली जायची, त्यामुळे एखादी ऑफर शुल्काशिवाय असल्यासारखी दिसू शकायची; आता त्या चौकटीवर खूण येते आणि ती दुरुस्त किंवा रिकामी करेपर्यंत ऑफरचा निकाल दिसत नाही.',
        },
      },
      {
        id: 'header-menus-keyboard',
        text: {
          en: 'The menus at the top of the page are easier to use from a keyboard: a bar now shows which link you are on, in light and dark, Tab moves on past the last link without getting lost, and screen readers are told what the menus and the theme buttons are, with no keys promised that do nothing.',
          hi: 'पेज के ऊपर वाले मेन्यू अब कीबोर्ड से इस्तेमाल करना आसान है: एक पट्टी दिखाती है कि आप किस लिंक पर हैं, लाइट और डार्क दोनों में, आखिरी लिंक के बाद Tab बिना भटके आगे बढ़ता है, और स्क्रीन रीडर को बताया जाता है कि मेन्यू और थीम के बटन क्या हैं, बिना ऐसी कुंजियों का वादा किए जो कुछ नहीं करतीं।',
          es: 'Los menús de la parte superior de la página son más fáciles de usar con el teclado: una barra muestra ahora en qué enlace estás, en modo claro y oscuro, Tab sigue adelante después del último enlace sin perderse, y los lectores de pantalla reciben lo que son los menús y los botones del tema, sin prometer teclas que no hacen nada.',
          cs: 'Nabídky v\u00a0horní části stránky se teď lépe ovládají z\u00a0klávesnice: proužek ukazuje, na kterém odkazu jste, ve světlém i\u00a0tmavém režimu, Tab za posledním odkazem pokračuje dál a\u00a0neztratí se, a\u00a0čtečky obrazovky se dozvědí, co nabídky a\u00a0tlačítka motivu jsou, bez slibovaných kláves, které nic nedělají.',
          mr: 'पानाच्या वरच्या भागातील मेनू आता कीबोर्डने वापरणे सोपे आहे: तुम्ही कोणत्या लिंकवर आहात हे एक पट्टी दाखवते, लाइट आणि डार्क दोन्हींमध्ये, शेवटच्या लिंकनंतर Tab न भरकटता पुढे जाते, आणि मेनू व थीमची बटणे काय आहेत हे स्क्रीन रीडरला सांगितले जाते, काहीही न करणाऱ्या कळांचे आश्वासन न देता.',
        },
      },
      {
        id: 'loan-ends-on-its-term',
        text: {
          en: 'The loan comparison now ends a loan on the term you type. A 30-year loan used to show as 30 years and 1 month, with a 361st payment of a few cents, in about half of all cases; those cents are now part of the last payment, as a lender would do it.',
          hi: 'लोन की तुलना में अब लोन उसी अवधि पर ख़त्म होता है जो आप लिखते हैं। पहले लगभग आधे मामलों में 30 साल का लोन 30 साल 1 महीने का दिखता था, कुछ पैसों की 361वीं किस्त के साथ; अब वे पैसे आखिरी किस्त में जुड़ते हैं, जैसा लोन देने वाले करते हैं।',
          es: 'El comparador de préstamos termina ahora el préstamo en el plazo que escribes. Antes, en cerca de la mitad de los casos, un préstamo a 30 años aparecía como de 30 años y 1 mes, con una cuota número 361 de unos céntimos; ahora esos céntimos forman parte de la última cuota, como haría una entidad financiera.',
          cs: 'Srovnání úvěrů teď úvěr ukončí přesně po době, kterou zadáte. Dříve se zhruba v\u00a0polovině případů třicetiletý úvěr zobrazil jako 30 let a\u00a01 měsíc, s\u00a0361. splátkou ve výši několika haléřů; ty jsou teď součástí poslední splátky, jak to dělají poskytovatelé.',
          mr: 'कर्जांची तुलना आता तुम्ही लिहिलेल्या मुदतीवरच कर्ज संपवते. आधी साधारण निम्म्या वेळा 30 वर्षांचे कर्ज 30 वर्षे 1 महिना असे दिसायचे, काही पैशांच्या 361 व्या हप्त्यासह; आता ते पैसे शेवटच्या हप्त्यात धरले जातात, जसे कर्जदाते करतात.',
        },
      },
      {
        id: 'privacy-notice-wording-nov-10',
        text: {
          en: 'A few corrections to the privacy notice’s wording: it quoted a home page heading that has since been renamed, and some sentences in Hindi, Spanish and Czech had drifted from the English. The net worth calculator’s page now says, as the notice does, that exchange rates are fetched when the page opens and again if you change your spending currency. Nothing about what is collected changes.',
          hi: 'प्राइवेसी नोटिस के शब्दों में कुछ सुधार हुए हैं: उसमें होम पेज के एक शीर्षक का ज़िक्र था जिसका नाम बदल चुका है, और हिन्दी, स्पैनिश और चेक के कुछ वाक्य अंग्रेज़ी से थोड़े अलग हो गए थे। शुद्ध संपत्ति कैलकुलेटर का पेज अब वही कहता है जो नोटिस कहती है: विनिमय दरें पेज खुलने पर लाई जाती हैं, और खर्च की मुद्रा बदलने पर दोबारा। जो जानकारी इकट्ठा होती है, उसमें कोई बदलाव नहीं है।',
          es: 'Algunas correcciones en la redacción del aviso de privacidad: citaba un título de la página de inicio que ya tiene otro nombre, y algunas frases en hindi, español y checo se habían apartado del inglés. La página de la calculadora de patrimonio neto dice ahora, como el aviso, que los tipos de cambio se consultan al abrir la página y otra vez si cambias la moneda de tus gastos. No cambia nada de lo que se recoge.',
          cs: 'Několik oprav ve znění zásad ochrany soukromí: citovaly nadpis z\u00a0úvodní stránky, který se mezitím přejmenoval, a\u00a0některé věty v\u00a0hindštině, španělštině a\u00a0češtině se odchýlily od angličtiny. Stránka kalkulačky čistého jmění teď říká totéž co zásady: kurzy se stahují při otevření stránky a\u00a0znovu, pokud změníte měnu svých výdajů. Na tom, co se sbírá, se nic nemění.',
          mr: 'गोपनीयता सूचनेच्या शब्दांत काही दुरुस्त्या झाल्या आहेत: तिच्यात मुख्यपृष्ठावरील एका शीर्षकाचा उल्लेख होता, ज्याचे नाव आता बदलले आहे, आणि हिंदी, स्पॅनिश आणि चेकमधील काही वाक्ये इंग्रजीपासून थोडी वेगळी झाली होती. निव्वळ संपत्ती कॅल्क्युलेटरचे पान आता सूचनेप्रमाणेच सांगते: विनिमय दर पान उघडल्यावर आणले जातात, आणि खर्चाचे चलन बदलल्यावर पुन्हा. जी माहिती गोळा होते, त्यात काहीही बदल नाही.',
        },
      },
      {
        id: 'how-to-guides',
        text: {
          en: 'There’s a new How-to section: short guides that each answer one everyday money question, with the answer first, then what to check, and a link to the full lesson. The first ones cover getting through the month, debts and loans, taking stock of your accounts and net worth, sending money abroad, and checking whether a message or a website is genuine. At the top of the learning path you can now choose between starting from the first lesson and a guide for one question. The How-to page has its own search, which also understands some everyday words in Hindi, Spanish, Czech and Marathi. Search on the learning path now also understands whole questions and everyday words like “credit card”, and finds the guides too.',
          hi: 'अब कैसे करें नाम का एक नया सेक्शन है: छोटी गाइडें, जिनमें से हर एक पैसों से जुड़े रोज़ के एक सवाल का जवाब देती है। पहले जवाब, फिर यह कि क्या जाँचना है, और पूरे पाठ का लिंक। पहली गाइडें महीना निकालने, कर्ज़ और लोन, अपने खातों और शुद्ध संपत्ति का हिसाब, विदेश पैसे भेजने, और किसी मैसेज या वेबसाइट के असली होने की जाँच के बारे में हैं। सीखने के रास्ते में सबसे ऊपर अब आप चुन सकते हैं: पहले पाठ से शुरुआत, या एक सवाल के लिए गाइड। कैसे करें पेज की अपनी खोज है, जो हिन्दी के रोज़ के कुछ शब्द भी समझती है। गाइडें अंग्रेज़ी में हैं। सीखने के रास्ते की खोज, जो अंग्रेज़ी में काम करती है, अब पूरे सवाल और रोज़ के शब्द भी समझती है, और गाइडें भी ढूँढ़ती है।',
          es: 'Hay una nueva sección, Cómo hacerlo: guías breves que responden cada una a una pregunta de dinero de todos los días, con la respuesta primero, luego qué comprobar y un enlace a la lección completa. Las primeras tratan de llegar a fin de mes, deudas y préstamos, hacer balance de tus cuentas y tu patrimonio neto, enviar dinero al extranjero y comprobar si un mensaje o una web son auténticos. Al principio de la ruta de aprendizaje ahora puedes elegir entre empezar por la primera lección o buscar una guía para una sola pregunta. La página Cómo hacerlo tiene su propio buscador, que también entiende algunas palabras cotidianas en español. Las guías están en inglés. La búsqueda de la ruta de aprendizaje, que funciona en inglés, entiende ahora preguntas completas y palabras cotidianas, y también encuentra las guías.',
          cs: 'Přibyla nová sekce Jak na to: krátké návody, z\u00a0nichž každý odpovídá na jednu běžnou otázku o\u00a0penězích. Nejdřív odpověď, pak co si ověřit a\u00a0odkaz na celou lekci. První návody se týkají toho, jak vyjít do výplaty, dluhů a\u00a0půjček, přehledu o\u00a0účtech a\u00a0čistém jmění, posílání peněz do zahraničí a\u00a0ověření pravosti zprávy nebo webu. Na začátku vzdělávací cesty si teď můžete vybrat: začít první lekcí, nebo návodem na jednu otázku. Stránka Jak na to má vlastní vyhledávání, které rozumí i\u00a0některým běžným českým slovům. Návody jsou v\u00a0angličtině. Vyhledávání na vzdělávací cestě, které funguje v\u00a0angličtině, teď rozumí i\u00a0celým otázkám a\u00a0běžným slovům a\u00a0najde i\u00a0návody.',
          mr: 'आता कसे करायचे नावाचा नवा विभाग आहे: छोट्या मार्गदर्शिका, ज्यांतील प्रत्येक पैशांशी संबंधित रोजच्या एका प्रश्नाचे उत्तर देते. आधी उत्तर, मग काय तपासायचे, आणि पूर्ण धड्याची लिंक. पहिल्या मार्गदर्शिका महिना निभवणे, देणी आणि कर्जे, तुमची खाती आणि निव्वळ संपत्ती यांचा आढावा, परदेशात पैसे पाठवणे, आणि एखादा संदेश खरा आहे का किंवा एखादी वेबसाइट खरी आहे का हे तपासणे यांबद्दल आहेत. शिकण्याच्या मार्गाच्या सुरुवातीला आता तुम्ही निवडू शकता: पहिल्या धड्यापासून सुरुवात, किंवा एका प्रश्नासाठी मार्गदर्शिका. ‘कसे करायचे’ या पानावर स्वतंत्र शोधाची सोय आहे, ज्यात मराठीतील रोजचे काही शब्द लिहूनही मार्गदर्शिका शोधता येतात. मार्गदर्शिका इंग्रजीत आहेत. शिकण्याच्या मार्गावरील शोध, जो इंग्रजीत चालतो, आता पूर्ण प्रश्न आणि रोजचे शब्दही समजतो, आणि मार्गदर्शिकाही शोधतो.',
        },
      },
    ],
  },
  {
    date: '2026-11-09',
    items: [
      {
        id: 'volunteer-review-sheets',
        text: {
          en: 'The privacy notice now explains the review sheets that translation volunteers will work in: what they hold, who can see what, and how long it is kept.',
          hi: 'प्राइवेसी नोटिस अब उन समीक्षा शीटों के बारे में बताती है जिनमें अनुवाद करने वाले स्वयंसेवक काम करेंगे: उनमें क्या रहता है, कौन क्या देख सकता है, और वह कितने समय तक रखा जाता है।',
          es: 'El aviso de privacidad explica ahora las hojas de revisión en las que trabajarán las personas voluntarias de traducción: qué contienen, quién puede ver qué y cuánto tiempo se conservan.',
          cs: 'Zásady ochrany soukromí teď vysvětlují revizní tabulky, ve kterých budou pracovat dobrovolníci pro překlady: co obsahují, kdo co může vidět a jak dlouho se uchovávají.',
          mr: 'भाषांतरासाठी मदत करणारे स्वयंसेवक ज्या पुनरावलोकन शीट्समध्ये काम करतील, त्यांच्याबद्दल गोपनीयता सूचनेत आता सांगितले आहे: त्यांत काय असते, कोण काय पाहू शकते, आणि ते किती काळ ठेवले जाते.',
        },
      },
      {
        id: 'funds-currencies-goals',
        text: {
          en: 'Three lessons go a step further. Investing 101 now explains what a fund is and what funds are called where you live, from mutual funds to Indonesia’s reksa dana. The lesson on money across currencies now shows why higher inflation tends to weaken a currency, with seven currencies against the US dollar from 2005 to 2024, and where that pattern breaks. The lesson on setting goals now has a section, near its start, on what earning money costs and what it is for.',
          es: 'Tres lecciones van un paso más allá. La lección de introducción a la inversión explica ahora qué es un fondo y cómo se llaman los fondos según el país, desde los fondos de inversión hasta los reksa dana de Indonesia. La lección sobre el dinero en varias monedas muestra ahora por qué una inflación más alta suele debilitar una moneda, con siete monedas frente al dólar estadounidense entre 2005 y 2024, y dónde falla ese patrón. La lección sobre cómo fijar objetivos tiene ahora, cerca del principio, una sección sobre lo que cuesta ganar el dinero y cuál es su propósito.',
          cs: 'Tři lekce jdou o kus dál. Lekce o základech investování teď vysvětluje, co je fond a jak se fondům říká v různých zemích, od podílových fondů po indonéské reksa dana. Lekce o penězích ve více měnách teď ukazuje, proč vyšší inflace obvykle oslabuje měnu, na sedmi měnách vůči americkému dolaru v letech 2005 až 2024, a kde tento vzorec neplatí. Lekce o stanovení cílů má teď blízko začátku oddíl o tom, co stojí peníze vydělat a k čemu mají sloužit.',
          mr: 'तीन धडे आता एक पाऊल पुढे जातात. गुंतवणुकीच्या मूलभूत धड्यात आता फंड म्हणजे काय आणि वेगवेगळ्या देशांत फंडांना काय म्हणतात हे सांगितले आहे, म्युच्युअल फंडांपासून इंडोनेशियातील रेक्सा दानापर्यंत. अनेक चलनांतील पैशावरील धडा आता दाखवतो की जास्त महागाईमुळे चलन सहसा कमकुवत का होते, 2005 ते 2024 या काळात अमेरिकन डॉलरच्या तुलनेत सात चलनांच्या उदाहरणांसह, आणि हा कल कुठे लागू पडत नाही. उद्दिष्टे ठरवण्यावरील धड्यात आता सुरुवातीच्या जवळ एक भाग आहे: पैसा कमावण्याची किंमत काय असते आणि तो कशासाठी आहे.',
          hi: 'तीन पाठ अब एक कदम आगे जाते हैं। निवेश की बुनियादी बातों वाला पाठ अब बताता है कि फंड क्या होता है और अलग-अलग देशों में फंड को क्या कहते हैं, म्यूचुअल फंड से लेकर इंडोनेशिया के रेक्सा दाना तक। कई मुद्राओं में पैसे वाला पाठ अब दिखाता है कि ज़्यादा महँगाई से मुद्रा अक्सर कमज़ोर क्यों होती है, 2005 से 2024 तक अमेरिकी डॉलर के मुकाबले सात मुद्राओं के उदाहरण के साथ, और यह रुझान कहाँ लागू नहीं होता। लक्ष्य तय करने वाले पाठ में अब शुरुआत के पास एक हिस्सा है कि पैसा कमाने की क्या क़ीमत चुकानी पड़ती है और वह किसलिए है।',
        },
      },
    ],
  },
  {
    date: '2026-11-08',
    items: [
      {
        id: 'pages-without-analytics',
        text: {
          en: 'The privacy notice now says which pages send no analytics at all: the short links that forward you to another page, and an unlisted page I use to make QR codes for events.',
          hi: 'प्राइवेसी नोटिस अब बताती है कि कौन-से पेज कोई एनालिटिक्स नहीं भेजते: छोटे लिंक, जो आपको किसी दूसरे पेज पर भेज देते हैं, और कार्यक्रमों के लिए QR कोड बनाने का एक अंदरूनी पेज, जो कहीं सूचीबद्ध नहीं है।',
          es: 'El aviso de privacidad dice ahora qué páginas no envían ninguna analítica: los enlaces cortos que te llevan a otra página y una página interna, sin enlaces desde el sitio, que uso para crear códigos QR para eventos.',
          cs: 'Zásady ochrany soukromí teď uvádějí, které stránky neodesílají žádnou webovou analytiku: krátké odkazy, které vás přesměrují na jinou stránku, a neveřejná stránka pro tvorbu QR kódů na akce.',
          mr: 'गोपनीयता सूचनेत आता सांगितले आहे की कोणती पाने वापराचे विश्लेषण अजिबात पाठवत नाहीत: तुम्हाला दुसऱ्या पानावर पाठवणाऱ्या छोट्या लिंक, आणि कार्यक्रमांसाठी QR कोड बनवण्याचे, कुठेही न दाखवलेले एक अंतर्गत पान.',
        },
      },
      {
        id: 'building-lessons-more-countries',
        text: {
          en: 'The sixteen lessons on building your finances now say more about how the rules differ by country, such as public pensions, fees for repaying a loan early, minimum down payments on a home and crypto taxes. A few figures are corrected too, including the table of historical stock returns in the lesson on risk.',
          es: 'Las dieciséis lecciones para construir tus finanzas explican ahora mejor cómo cambian las reglas de un país a otro, por ejemplo las pensiones públicas, las penalizaciones por pago anticipado de un préstamo, la entrada mínima para una vivienda y los impuestos sobre las criptomonedas. También se han corregido algunas cifras, entre ellas la tabla de rentabilidades históricas de las acciones en la lección sobre el riesgo.',
          cs: 'Šestnáct lekcí o budování vlastních financí teď víc vysvětluje, jak se pravidla liší podle země, například státní důchody, poplatky za předčasné splacení úvěru, minimální vlastní zdroje na hypotéku a daně z kryptoměn. Opraveno je také několik čísel, mimo jiné tabulka historických výnosů akcií v lekci o riziku.',
          mr: 'आर्थिक पाया घडवण्यावरील सोळा धडे आता नियम देशानुसार कसे बदलतात हे अधिक सांगतात, जसे सरकारी पेन्शन, कर्जाच्या मुदतपूर्व परतफेडीवरील दंड, घरासाठी किमान डाउन पेमेंट आणि क्रिप्टोवरील कर. काही आकडेही दुरुस्त केले आहेत, त्यात जोखमीवरील धड्यातील शेअर्सच्या ऐतिहासिक परताव्याची तालिकाही आहे.',
          hi: 'अपनी वित्तीय नींव बनाने वाले सोलह पाठ अब ज़्यादा बताते हैं कि नियम देश के हिसाब से कैसे बदलते हैं, जैसे सरकारी पेंशन, कर्ज़ के समय से पहले भुगतान पर लगने वाला शुल्क, घर के लिए न्यूनतम डाउन पेमेंट और क्रिप्टो पर कर। कुछ आँकड़े भी सुधारे गए हैं, जिनमें जोखिम वाले पाठ में शेयरों के ऐतिहासिक रिटर्न की तालिका भी है।',
        },
      },
      {
        id: 'psychology-lessons-evidence',
        text: {
          en: 'The ten psychology lessons now say more about the evidence behind their claims and where it stops, and less about what you should do. The lesson on building an anti-bias financial life now notes where the law already makes retirement saving automatic or compulsory, as in the UK, New Zealand and Australia.',
          es: 'Las diez lecciones de psicología dicen ahora más sobre las pruebas en las que se basan y sus límites, y menos sobre lo que deberías hacer. La lección sobre cómo construir una vida financiera a prueba de sesgos indica ahora dónde la ley ya hace automático u obligatorio el ahorro para la jubilación, como en el Reino Unido, Nueva Zelanda y Australia.',
          cs: 'Deset lekcí o psychologii teď víc říká o tom, o jaké důkazy se opírají a kde tyto důkazy končí, a méně o tom, co dělat. Lekce o tom, jak si zařídit finance odolné vůči zkreslením, teď zmiňuje, kde už zákon dělá spoření na důchod automatickým nebo povinným, například ve Spojeném království, na Novém Zélandu a v Austrálii.',
          mr: 'मानसशास्त्रावरील दहा धडे आता त्यांच्या दाव्यांमागील पुराव्यांबद्दल आणि त्या पुराव्यांच्या मर्यादांबद्दल अधिक सांगतात, आणि तुम्ही काय करावे हे कमी सांगतात. पूर्वग्रहांपासून सुरक्षित आर्थिक आयुष्य घडवण्याच्या धड्यात आता हेही नमूद केले आहे की कुठे कायद्यानेच निवृत्तीची बचत आपोआप किंवा सक्तीची होते, जसे युनायटेड किंगडम, न्यूझीलंड आणि ऑस्ट्रेलियामध्ये.',
          hi: 'मनोविज्ञान के दस पाठ अब अपने दावों के पीछे के सबूतों और उनकी सीमाओं के बारे में ज़्यादा बताते हैं, और यह कम कहते हैं कि आपको क्या करना चाहिए। पूर्वाग्रहों (bias) से बचाने वाली वित्तीय ज़िंदगी बनाने वाले पाठ में अब यह भी लिखा है कि कहाँ क़ानून ही रिटायरमेंट की बचत को अपने-आप होने वाली या अनिवार्य बना देता है, जैसे यूनाइटेड किंगडम, न्यूज़ीलैंड और ऑस्ट्रेलिया में।',
        },
      },
      {
        id: 'beginner-lessons-more-countries',
        text: {
          en: 'The 16 beginner lessons now explain how things differ between countries where the rules change the answer: when retirement savings can be reached early, how unemployment benefits change the size of an emergency fund, how student loans are repaid, how health cover works, and what inflation far above 2% does to cash. I also fixed a chart in the snowball and avalanche lesson that showed the wrong months.',
          es: 'Las 16 lecciones para quien empieza explican ahora en qué se diferencian los países cuando las normas cambian la respuesta: cuándo se puede sacar antes el ahorro para la jubilación, cómo el subsidio de desempleo cambia el tamaño del fondo de emergencia, cómo se devuelven los préstamos de estudios, cómo funciona la cobertura sanitaria y qué le hace al efectivo una inflación muy por encima del 2 %. También corregí un gráfico de la lección sobre los métodos bola de nieve y avalancha que mostraba meses equivocados.',
          cs: 'Šestnáct lekcí pro ty, kdo začínají teď vysvětluje, v čem se země liší tam, kde pravidla mění odpověď: kdy se dá k penězům na důchod dostat dřív, jak podpora v nezaměstnanosti mění velikost finanční rezervy, jak se splácejí studentské půjčky, jak funguje zdravotní pojištění a co s hotovostí udělá inflace vysoko nad 2 %. Opravený je také graf v lekci o metodách sněhové koule a laviny, který ukazoval špatné měsíce.',
          mr: 'नवशिक्यांसाठीच्या 16 धड्यांमध्ये आता, जिथे नियमांमुळे उत्तर बदलते तिथे देशांनुसार गोष्टी कशा वेगळ्या असतात हे सांगितले आहे: निवृत्तीची बचत लवकर काढता येते की नाही, बेरोजगारी भत्त्यामुळे आपत्कालीन निधीचा आकार कसा बदलतो, विद्यार्थी कर्ज कसे फेडले जाते, आरोग्य विमा कसा चालतो, आणि 2 टक्क्यांपेक्षा खूप जास्त महागाई रोख रकमेचे काय करते. स्नोबॉल आणि ॲव्हलांच पद्धतींच्या धड्यातील एका आलेखात चुकीचे महिने दाखवले होते; तोही दुरुस्त केला आहे.',
          hi: 'शुरुआती 16 पाठों में अब यह भी बताया गया है कि जहाँ नियम जवाब बदल देते हैं, वहाँ अलग-अलग देशों में चीज़ें कैसे अलग होती हैं: रिटायरमेंट की बचत जल्दी निकाली जा सकती है या नहीं, बेरोज़गारी भत्ता आपातकालीन कोष (emergency fund) का आकार कैसे बदलता है, स्टूडेंट लोन कैसे चुकाया जाता है, स्वास्थ्य बीमा कैसे काम करता है, और 2% से कहीं ज़्यादा महँगाई नकदी के साथ क्या करती है। स्नोबॉल और एवलांच वाले पाठ का एक चार्ट ग़लत महीने दिखा रहा था; उसे भी ठीक कर दिया गया है।',
        },
      },
    ],
  },
  {
    date: '2026-11-06',
    items: [
      {
        id: 'header-tagline',
        text: {
          en: 'The header now shows nidhi’s tagline under the name, in the language of the page: “Money, understood” in English. On phones it has its own line just below the header. Hindi and Marathi have new taglines: “पैसे की समझ, एकदम सहज” and “पैशाची समज, एकदम सहज”.',
          hi: 'पेज के सबसे ऊपर, nidhi नाम के नीचे, अब पेज की भाषा में टैगलाइन दिखती है। फ़ोन पर यह पेज के ऊपरी हिस्से के ठीक नीचे अलग पंक्ति में आती है। हिन्दी की टैगलाइन नई है: “पैसे की समझ, एकदम सहज”।',
          es: 'La cabecera muestra ahora el lema de nidhi debajo del nombre, en el idioma de la página: «El dinero, entendido». En el teléfono va en su propia línea, justo debajo de la cabecera.',
          cs: 'V záhlaví je teď pod jménem nidhi heslo v jazyce stránky: „Peníze srozumitelně“. Na telefonu má vlastní řádek hned pod záhlavím.',
          mr: 'पानाच्या सर्वात वर, nidhi या नावाखाली, आता पानाच्या भाषेत टॅगलाइन दिसते. फोनवर ती पानाच्या वरच्या भागाच्या अगदी खाली वेगळ्या ओळीत येते. मराठी टॅगलाइन नवीन आहे: “पैशाची समज, एकदम सहज”.',
        },
      },
      {
        id: 'shared-cookie-answer',
        text: {
          en: 'Your cookie-banner answer now covers the planner at app.nidhi.today too, unless your browser blocks cookies. While checking this, I found two mistakes of my own: the site kept a random visitor ID in your browser even after “No thanks”, and subscribing to the newsletter linked your pageviews to a code made from your email, whatever you had answered. Both are fixed. Without your yes, no analytics ID is stored in your browser, and your pageviews aren’t linked to each other or to your email code. The privacy notice explains the details.',
          hi: 'कुकी बैनर पर आपका जवाब अब app.nidhi.today पर प्लानर में भी लागू होता है, बशर्ते आपका ब्राउज़र कुकी ब्लॉक न करे। इसे जाँचते हुए मुझे अपनी दो ग़लतियाँ मिलीं: “नहीं, धन्यवाद” के बाद भी साइट आपके ब्राउज़र में एक रैंडम विज़िटर ID रखती थी, और न्यूज़लेटर सब्सक्राइब करने पर आपके पेज-व्यू आपके ईमेल से बने एक कोड से जुड़ जाते थे, चाहे आपका जवाब कुछ भी रहा हो। दोनों ठीक कर दी गई हैं। आपकी हाँ के बिना आपके ब्राउज़र में कोई एनालिटिक्स ID जमा नहीं होती और आपके पेज-व्यू न आपस में जुड़ते हैं, न आपके ईमेल वाले कोड से। प्राइवेसी नोटिस में पूरी जानकारी है।',
          es: 'Tu respuesta en el aviso de cookies ahora vale también en el planificador de app.nidhi.today, salvo que tu navegador bloquee las cookies. Al revisarlo encontré dos errores míos: el sitio guardaba un ID de visitante aleatorio en tu navegador incluso después de «No, gracias», y suscribirte al boletín enlazaba tus páginas vistas con un código creado a partir de tu correo, respondieras lo que respondieras. Los dos están corregidos. Sin tu sí, no se guarda ningún ID de analítica en tu navegador y tus páginas vistas no se enlazan entre sí ni con el código de tu correo. El aviso de privacidad lo explica en detalle.',
          cs: 'Vaše odpověď na cookie liště teď platí i v plánovači na app.nidhi.today, pokud váš prohlížeč neblokuje cookies. Při kontrole se ukázaly dvě moje vlastní chyby: web ukládal do vašeho prohlížeče náhodné ID návštěvníka i po „Ne, děkuji“ a přihlášení k newsletteru propojilo zobrazení stránek s kódem vytvořeným z vašeho e-mailu bez ohledu na vaši odpověď. Obojí je opravené. Bez vašeho souhlasu se do prohlížeče neukládá žádné analytické ID a zobrazení stránek se nepropojují mezi sebou ani s kódem z vašeho e-mailu. Podrobnosti vysvětlují zásady ochrany soukromí.',
          mr: 'कुकी सूचनेवरील तुमचे उत्तर आता app.nidhi.today वरील प्लॅनरमध्येही लागू होते, जोपर्यंत तुमचा ब्राउझर कुकी ब्लॉक करत नाही. हे तपासताना माझ्या स्वतःच्या दोन चुका सापडल्या: “नको, धन्यवाद” नंतरही साइट तुमच्या ब्राउझरमध्ये एक यादृच्छिक व्हिजिटर ID ठेवत होती, आणि न्यूजलेटरचे सदस्य झाल्यावर तुमचे पेजव्ह्यू तुमच्या ईमेलपासून बनवलेल्या एका कोडशी जोडले जात होते, तुमचे उत्तर काहीही असले तरी. दोन्ही दुरुस्त केल्या आहेत. तुमच्या होकाराशिवाय तुमच्या ब्राउझरमध्ये कोणताही ॲनालिटिक्स ID साठवला जात नाही आणि तुमचे पेजव्ह्यू एकमेकांशी किंवा तुमच्या ईमेलच्या कोडशी जोडले जात नाहीत. गोपनीयता सूचनेत सविस्तर माहिती आहे.',
        },
      },
      {
        id: 'beta-waiting-count',
        text: {
          en: 'The waitlist box now says how many people are waiting for a beta invite, from the very first person, and the number includes volunteers who asked for a beta invite on the volunteer form. Small numbers are exact; larger ones are rounded down, like “25+”.',
          hi: 'वेटलिस्ट बॉक्स अब पहले व्यक्ति से ही बताता है कि कितने लोग बीटा निमंत्रण का इंतज़ार कर रहे हैं, और इस संख्या में वे स्वयंसेवक भी गिने जाते हैं जिन्होंने स्वयंसेवक फ़ॉर्म पर बीटा निमंत्रण माँगा है। छोटी संख्याएँ बिल्कुल सही दिखती हैं; बड़ी संख्याएँ नीचे की ओर पूर्णांकित होती हैं, जैसे “25+”।',
          es: 'El recuadro de la lista de espera ahora dice cuántas personas esperan una invitación a la beta, desde la primera, y el número incluye a quienes pidieron una invitación a la beta en el formulario de voluntariado. Los números pequeños son exactos; los mayores se redondean hacia abajo, como «25+».',
          cs: 'Rámeček čekací listiny teď ukazuje, kolik lidí čeká na pozvánku do bety, už od prvního člověka, a do čísla se počítají i dobrovolníci, kteří si o pozvánku do bety řekli ve formuláři pro dobrovolníky. Malá čísla jsou přesná, větší se zaokrouhlují dolů, třeba „25+“.',
          mr: 'प्रतीक्षा यादीची चौकट आता पहिल्या व्यक्तीपासूनच सांगते की किती लोक बीटा आमंत्रणाची वाट पाहत आहेत, आणि स्वयंसेवक फॉर्मवर बीटा आमंत्रण मागणारे स्वयंसेवकही या संख्येत मोजले जातात. लहान संख्या अचूक असतात; मोठ्या संख्या खालच्या बाजूला पूर्णांक केल्या जातात, जसे “25+”.',
        },
      },
      {
        id: 'beta-invites-notice',
        text: {
          en: 'The privacy notice now explains how people are chosen for planner beta invitations. An admin requests the lists and chooses whom to invite. The planner reads email addresses and signup times, plus the signup page for waitlist entries. Only invited addresses are saved in its database, with invitation records. Joining either list does not automatically send an invitation. The waitlist still sends one email: your invite.',
          hi: 'प्राइवेसी नोटिस में अब बताया गया है कि प्लानर बीटा के निमंत्रण के लिए लोग कैसे चुने जाते हैं। सूचियाँ एडमिन की ओर से माँगी जाती हैं और तय किया जाता है कि किसे बुलाना है। प्लानर ईमेल पते और साइनअप का समय पढ़ता है, और वेटलिस्ट की प्रविष्टियों के लिए साइनअप वाला पेज भी। इसके डेटाबेस में सिर्फ़ निमंत्रित पते सहेजे जाते हैं, निमंत्रण के रिकॉर्ड के साथ। किसी सूची में जुड़ने भर से निमंत्रण अपने आप नहीं जाता। वेटलिस्ट से आपको सिर्फ़ एक ईमेल मिलेगा: आपका निमंत्रण।',
          es: 'El aviso de privacidad ahora explica cómo se elige a quién invitar a la beta del planificador. Desde la administración se piden las listas y se elige a quién invitar. El planificador lee los correos y la hora de alta, y además la página de alta en el caso de la lista de espera. En su base de datos solo se guardan las direcciones invitadas, con los registros de invitación. Apuntarse a una lista no envía ninguna invitación automáticamente. La lista de espera sigue enviándote un solo correo: tu invitación.',
          cs: 'Zásady ochrany soukromí teď vysvětlují, jak se vybírá, kdo dostane pozvánku do bety plánovače. Seznamy si vyžádá člověk s\u00a0administrátorským přístupem a vybere, koho pozvat. Plánovač čte e-mailové adresy a časy přihlášení, u čekací listiny i stránku, ze které se lidé přihlásili. V jeho databázi se ukládají jen pozvané adresy, spolu se záznamy o pozvánkách. Zapsání na seznam automaticky pozvánku nepošle. Z čekací listiny vám stále přijde jen jeden e-mail: pozvánka.',
          mr: 'प्लॅनर बीटाच्या आमंत्रणांसाठी लोक कसे निवडले जातात, ते आता गोपनीयता सूचनेत सांगितले आहे. ॲडमिनकडून याद्या मागवल्या जातात आणि कोणाला बोलवायचे ते ठरवले जाते. प्लॅनर ईमेल पत्ते आणि नोंदणीच्या वेळा वाचतो, तसेच प्रतीक्षा यादीतील नोंदींसाठी नोंदणी केलेले पान. त्याच्या डेटाबेसमध्ये फक्त आमंत्रित पत्ते, आमंत्रणाच्या रेकॉर्डसह, साठवले जातात. कोणत्याही यादीत सामील होण्याने आपोआप आमंत्रण जात नाही. प्रतीक्षा यादीतून तुम्हाला एकच ईमेल येईल: तुमचे आमंत्रण.',
        },
      },
    ],
  },
  {
    date: '2026-11-04',
    items: [
      {
        id: 'invest-or-pay-off-tool',
        text: {
          en: "A new free tool compares paying a debt off early with investing the same money, on the same date and after your country's inflation. It shows a range of outcomes rather than one answer, and if a return you type is above what world stocks have returned over the long run, it says so and shows the historical range beside it. The lesson on investing or paying off debt first links to it.",
          es: 'Una herramienta gratuita nueva compara pagar antes una deuda con invertir el mismo dinero, en la misma fecha y descontada la inflación de tu país. Muestra un rango de resultados en lugar de una sola respuesta y, si la rentabilidad que escribes supera la que han dado las bolsas mundiales a largo plazo, lo dice y muestra el rango histórico al lado. La lección sobre invertir o pagar primero la deuda enlaza con ella.',
          cs: 'Nový nástroj zdarma porovnává předčasné splacení dluhu s investováním stejných peněz, ke stejnému datu a očištěně o inflaci ve vaší zemi. Ukazuje rozpětí výsledků místo jedné odpovědi, a když zadaný výnos přesahuje to, co světové akcie vynášely dlouhodobě, upozorní na to a vedle ukáže historické rozpětí. Odkazuje na něj lekce o tom, zda nejdřív investovat, nebo splatit dluh.',
          mr: 'एक नवीन मोफत साधन कर्ज लवकर फेडणे आणि तेवढीच रक्कम गुंतवणे यांची तुलना करते, एकाच तारखेला आणि तुमच्या देशाच्या महागाईनंतर. ते एका उत्तराऐवजी निकालांचा पल्ला दाखवते, आणि तुम्ही लिहिलेला परतावा जागतिक शेअरनी दीर्घकाळात दिलेल्या परताव्यापेक्षा जास्त असेल तर ते तसे सांगते आणि शेजारी ऐतिहासिक पल्ला दाखवते. आधी गुंतवणूक की आधी कर्जफेड या धड्यातून त्याची लिंक आहे.',
          hi: 'एक नया मुफ़्त टूल कर्ज़ जल्दी चुकाने और उतनी ही रकम निवेश करने की तुलना करता है, एक ही तारीख़ पर और आपके देश की महँगाई के बाद। यह एक जवाब के बजाय नतीजों का एक दायरा दिखाता है, और अगर लिखा गया रिटर्न लंबे समय में दुनिया के शेयरों के रिटर्न से ऊपर हो, तो यह बताता है और बगल में ऐतिहासिक सीमा दिखाता है। पहले निवेश या पहले कर्ज़ चुकाने वाला लेख इससे जुड़ता है।',
        },
      },
      {
        id: 'inflation-describes-all',
        text: {
          en: 'The home page and the free tools page now describe the questions the inflation calculator answers: what money will buy later, what things may cost, what an old amount is worth today, and whether a raise keeps up.',
          es: 'La página de inicio y la de herramientas gratuitas ahora describen las preguntas que responde la calculadora de inflación: qué podrá comprar el dinero más adelante, cuánto podrían costar las cosas, cuánto vale hoy una cantidad de antes y si una subida salarial sigue el ritmo.',
          cs: 'Úvodní stránka i stránka nástrojů zdarma teď popisují otázky, na které inflační kalkulačka odpovídá: co si za peníze koupíte později, kolik mohou věci stát, jakou hodnotu má dnes dřívější částka a zda zvýšení platu drží krok.',
          mr: 'महागाई कॅल्क्युलेटर ज्या प्रश्नांची उत्तरे देते, ते आता मुख्यपृष्ठावर आणि मोफत साधनांच्या पानावर सांगितले आहेत: पुढे पैशांतून काय विकत घेता येईल, वस्तू किती महाग होऊ शकतात, जुन्या रकमेची आज किंमत किती, आणि पगारवाढ महागाईच्या बरोबरीने जाते का.',
          hi: 'महँगाई कैलकुलेटर जिन सवालों के जवाब देता है, वे अब होम पेज और मुफ़्त टूल वाले पेज पर बताए गए हैं: आगे पैसे से कितना ख़रीदा जा सकेगा, चीज़ें कितने की हो सकती हैं, पुरानी कोई रकम आज कितने के बराबर है, और वेतन वृद्धि महँगाई के बराबर चल रही है या नहीं।',
        },
      },
      {
        id: 'founder-note',
        text: {
          en: 'The home page now has a short note from me on why nidhi exists, with a promise that the lessons stay free, forever.',
          es: 'La página de inicio tiene ahora una breve nota mía sobre por qué existe nidhi, con la promesa de que las lecciones seguirán siendo gratuitas para siempre.',
          cs: 'Na úvodní stránce je teď krátká poznámka ode mě o tom, proč nidhi existuje, se slibem, že lekce zůstanou navždy zdarma.',
          mr: 'मुख्यपृष्ठावर आता nidhi का आहे याबद्दल माझे थोडेसे मनोगत आहे. धडे कायम मोफत राहतील, असे वचनही त्यात आहे.',
          hi: 'होम पेज पर अब मेरी ओर से एक छोटी-सी बात है कि nidhi क्यों बना है। साथ में यह वादा भी है कि पाठ हमेशा मुफ़्त रहेंगे।',
        },
      },
      {
        id: 'waitlist-remembered',
        text: {
          en: 'If you have already joined the planner waitlist, the home page now says so where the sign-up box was, and explains that only this browser remembers it.',
          es: 'Si ya te apuntaste a la lista de espera del planificador, la página de inicio ahora lo indica donde estaba el formulario, y explica que solo este navegador lo recuerda.',
          cs: 'Pokud už jste na čekací listině plánovače, úvodní stránka to teď ukáže místo přihlašovacího formuláře a vysvětlí, že si to pamatuje jen tento prohlížeč.',
          mr: 'प्लॅनरच्या प्रतीक्षा यादीत तुमचे नाव आधीच असेल, तर मुख्यपृष्ठावर नोंदणीच्या चौकटीच्या जागी आता तसे दिसते, आणि हे फक्त याच ब्राउझरला लक्षात असते असेही सांगितले जाते.',
          hi: 'अगर प्लानर की वेटलिस्ट में आपका नाम पहले से है, तो होम पेज पर साइन-अप बॉक्स की जगह अब यही दिखता है, और यह भी बताया जाता है कि यह बात सिर्फ़ इसी ब्राउज़र को याद रहती है।',
        },
      },
      {
        id: 'footer-columns',
        text: {
          en: 'The footer at the bottom of every page is tidier: four even columns on wider screens, and Privacy and Cookie settings on its last line, where they are easy to find on a phone too.',
          es: 'El pie de cada página está más ordenado: cuatro columnas iguales en pantallas anchas, y «Privacidad» y «Configuración de cookies» en la última línea, donde también es fácil encontrarlas en el teléfono.',
          cs: 'Zápatí na konci každé stránky je přehlednější: na širších obrazovkách čtyři stejné sloupce a „Soukromí“ a „Nastavení cookies“ na posledním řádku, kde je snadno najdete i v telefonu.',
          mr: 'प्रत्येक पानाच्या तळाशी असलेला फूटर आता अधिक नीटनेटका आहे: मोठ्या स्क्रीनवर चार समान स्तंभ, आणि गोपनीयता व कुकी सेटिंग्ज शेवटच्या ओळीत, जिथे ती फोनवरही सहज सापडतात.',
          hi: 'हर पेज के नीचे का फ़ुटर अब ज़्यादा व्यवस्थित है: बड़ी स्क्रीन पर चार बराबर कॉलम, और प्राइवेसी व कुकी सेटिंग आख़िरी पंक्ति में, जहाँ ये फ़ोन पर भी आसानी से मिल जाती हैं।',
        },
      },
      {
        id: 'home-situations',
        text: {
          en: 'The home page is simpler: two common situations show how a lesson, a free tool and the planner fit together, and the call for translators now sits right at the top.',
          es: 'La página de inicio es más sencilla: dos situaciones frecuentes muestran cómo encajan una lección, una herramienta gratuita y el planificador, y la invitación a ayudar con las traducciones aparece ahora al principio de la página.',
          cs: 'Úvodní stránka je jednodušší: dvě běžné situace ukazují, jak do sebe zapadá lekce, nástroj zdarma a plánovač, a výzva k pomoci s překladem je teď hned nahoře.',
          mr: 'मुख्यपृष्ठ आता अधिक सोपे आहे: दोन नेहमीच्या परिस्थितींच्या उदाहरणांतून धडा, मोफत साधन आणि प्लॅनर एकत्र कसे उपयोगी पडतात हे दिसते. भाषांतरात मदतीचे आवाहन आता पानाच्या अगदी वर आहे.',
          hi: 'होम पेज अब सरल है: दो आम स्थितियाँ दिखाती हैं कि एक पाठ, एक मुफ़्त टूल और प्लानर कैसे एक साथ जुड़ते हैं, और अनुवादकों के लिए अपील अब सबसे ऊपर है।',
        },
      },
    ],
  },
  {
    date: '2026-11-02',
    items: [
      {
        id: 'lesson-tldr-plain',
        text: {
          en: 'The short summary at the top of every lesson is now two or three plain bullets, written without the glossary’s special terms, so you can get the idea before you meet the vocabulary.',
          es: 'El resumen breve al inicio de cada lección ahora son dos o tres puntos sencillos, escritos sin los términos especiales del glosario, para que captes la idea antes de encontrarte con el vocabulario.',
          cs: 'Krátké shrnutí na začátku každé lekce má teď dvě nebo tři jednoduché odrážky bez odborných pojmů ze slovníčku, takže pochopíte myšlenku dřív, než narazíte na slovní zásobu.',
          mr: 'प्रत्येक धड्याच्या सुरुवातीचा छोटा सारांश आता दोन किंवा तीन सोप्या मुद्द्यांत आहे, शब्दसूचीतील खास संज्ञा न वापरता लिहिलेला, म्हणजे शब्दांशी ओळख होण्याआधीच मूळ कल्पना समजते.',
          hi: 'हर पाठ की शुरुआत का छोटा सार अब दो या तीन आसान बिंदुओं में है, शब्दावली के ख़ास शब्दों के बिना लिखा हुआ, ताकि शब्दों से सामना होने से पहले ही बात समझ में आ जाए।',
        },
      },
      {
        id: 'lesson-share-save',
        text: {
          en: 'You can now send any lesson to a friend, copy its link or keep it as a PDF to read offline, with buttons just above the lesson and again at its end. The privacy notice says what each one sends.',
          es: 'Ahora puedes enviar cualquier lección a alguien, copiar su enlace o guardarla en PDF para leerla sin conexión, con botones justo antes de la lección y otra vez al final. El aviso de privacidad explica qué envía cada uno.',
          cs: 'Každou lekci teď můžete poslat známému, zkopírovat její odkaz nebo si ji uložit jako PDF ke čtení bez připojení, a to tlačítky přímo nad lekcí i na jejím konci. V oznámení o ochraně soukromí je uvedeno, co které z nich odesílá.',
          mr: 'आता कोणताही धडा मित्राला पाठवता येतो, त्याची लिंक कॉपी करता येते किंवा ऑफलाइन वाचण्यासाठी PDF म्हणून ठेवता येतो. त्यासाठी धड्याच्या अगदी वर आणि शेवटीही बटणे आहेत. त्यातील प्रत्येक बटण काय पाठवते ते गोपनीयता सूचनेत दिले आहे.',
          hi: 'अब किसी भी पाठ को दोस्त को भेजा जा सकता है, उसका लिंक कॉपी किया जा सकता है या ऑफ़लाइन पढ़ने के लिए PDF के रूप में रखा जा सकता है। इसके लिए पाठ के ठीक ऊपर और उसके अंत में भी बटन हैं। हर बटन क्या भेजता है, यह प्राइवेसी नोटिस में लिखा है।',
        },
      },
    ],
  },
  {
    date: '2026-10-30',
    items: [
      {
        id: 'volunteer-permission',
        text: {
          en: 'If you volunteer to translate, I now ask for your written permission by email before your first contribution, so your work can be published while the copyright stays yours. The privacy notice says what is kept from your reply and for how long.',
          es: 'Si te ofreces para traducir, ahora pido tu permiso por escrito, por correo, antes de tu primera aportación, para poder publicar tu trabajo sin que dejes de tener sus derechos de autor. El aviso de privacidad explica qué se guarda de tu respuesta y durante cuánto tiempo.',
          cs: 'Pokud se přihlásíte k překládání, žádám teď před vaším prvním příspěvkem e-mailem o písemné svolení, aby vaše práce mohla vyjít a autorská práva k ní zůstala vám. V oznámení o ochraně soukromí je uvedeno, co se z vaší odpovědi uchovává a jak dlouho.',
          mr: 'तुम्ही भाषांतरासाठी स्वयंसेवक झालात, तर पहिल्या योगदानाआधी आता ईमेलवर तुमची लेखी परवानगी मागितली जाते, म्हणजे तुमचे काम प्रकाशित करता येईल आणि त्याचा कॉपीराइट तुमच्याकडेच राहील. तुमच्या उत्तरातून काय आणि किती काळ ठेवले जाते, हे गोपनीयता सूचनेत सांगितले आहे.',
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
          mr: "एक नवीन पान प्लॅनर बीटाबद्दल सांगते: तो मोफत आहे आणि जानेवारी 2027 मध्ये तो सुरू करण्याचे नियोजन आहे. बीटा टेस्टर्सना लाँचनंतर 12 महिने पेड फीचर्स मोफत मिळतील, त्यानंतर सुरुवातीच्या सदस्यांची किंमत, वार्षिक बिलिंगवर, सदस्यत्व चालू असेपर्यंत निश्चित. साइटच्या मेनूमधून, मुख्यपृष्ठावरील प्लॅनरच्या भागातून आणि प्रतीक्षा यादीच्या चौकटीतून त्याची लिंक आहे, आणि ही चौकट आता प्रत्येक धड्याच्या शेवटीही आहे. टॅबलेटवर मोफत साधने आणि शिका आता मेनूमध्ये आहेत.",
          hi: "एक नया पेज प्लानर बीटा के बारे में बताता है: यह मुफ़्त है और इसे जनवरी 2027 में खोलने की योजना है। बीटा टेस्टर्स को लॉन्च के बाद 12 महीने तक पेड फ़ीचर्स मुफ़्त मिलेंगे, फिर शुरुआती सदस्यों की दर, सालाना बिलिंग पर, जो सब्सक्रिप्शन चालू रहने तक तय रहेगी। साइट के मेन्यू, होम पेज पर प्लानर वाले हिस्से और वेटलिस्ट बॉक्स, तीनों से इसका लिंक है, और यह बॉक्स अब हर पाठ के आख़िर में भी है। टैबलेट पर मुफ़्त टूल और सीखें अब मेन्यू में हैं।",
        },
      },
      {
        id: 'inclusive-collection',
        text: {
          en: 'Inclusive Finances is now a collection: on the home page it comes after the starting routes, and on the learning path after the levels. Its description now says who it is for and where its guides sit: each one is optional and comes right after the lesson it builds on. The lesson count on the home page now counts lessons only.',
          es: 'Finanzas inclusivas es ahora una colección: en la página de inicio aparece después de las rutas iniciales y, en la ruta de aprendizaje, después de los niveles. Su descripción dice ahora para quién es y dónde están sus guías: cada una es opcional y va justo después de la lección en la que se apoya. El número de lecciones de la página de inicio cuenta ahora solo las lecciones.',
          cs: 'Inkluzivní finance jsou teď sbírka: na úvodní stránce následují po výchozích cestách a ve vzdělávací cestě po úrovních. Jejich popis teď říká, pro koho jsou a kde se jejich průvodci nacházejí: každý je volitelný a následuje hned po lekci, na kterou navazuje. Počet lekcí na úvodní stránce teď zahrnuje jen lekce.',
          mr: 'सर्वसमावेशक वित्त आता एक संग्रह आहे: मुख्यपृष्ठावर ते सुरुवातीच्या मार्गांनंतर येते, आणि शिकण्याच्या मार्गावर पातळ्यांनंतर. त्याचे वर्णन आता सांगते की ते कोणासाठी आहे आणि त्याच्या मार्गदर्शिका कुठे आहेत: प्रत्येक मार्गदर्शिका ऐच्छिक आहे आणि ती ज्या धड्यावर आधारित आहे त्या धड्यानंतर लगेच येते. मुख्यपृष्ठावरील धड्यांच्या संख्येत आता फक्त धडे मोजले जातात.',
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
          es: 'Descubrí que, para quienes habían aceptado el aviso de cookies, un clic en el comparador de préstamos podía llevar consigo el nombre de una oferta o las cantidades de un gráfico. Revisé todos los clics registrados desde el 8 de octubre y ninguno lo hizo. Aun así, ya está corregido: ahora un clic se registra solo con la etiqueta que el sitio da a cada botón, y el aviso de privacidad explica lo que pasó.',
          cs: 'Došlo mi, že u návštěvníků, kteří přijali lištu s cookies, se spolu s kliknutím ve srovnání úvěrů mohl odeslat název nabídky nebo částky z grafu. Kontrola všech kliknutí zaznamenaných od 8. října nenašla ani jeden takový případ. Přesto je to opraveno: kliknutí se teď zaznamenává pouze pod označením, které web přiřadil tlačítku, a zásady ochrany soukromí popisují, co se stalo.',
          mr: 'मला आढळले की कुकी बॅनर स्वीकारलेल्या भेट देणाऱ्यांसाठी, कर्जांच्या तुलनेवर केलेल्या क्लिकसोबत एखाद्या ऑफरचे नाव किंवा आलेखातील रकमा जाऊ शकत होत्या. 8 ऑक्टोबरपासून नोंदलेले सगळे क्लिक तपासले, आणि त्यांपैकी एकाही क्लिकसोबत असे काही गेले नव्हते. तरीही हे दुरुस्त केले आहे: आता क्लिकची नोंद फक्त साइटने बटणाला दिलेल्या लेबलने होते, आणि गोपनीयता सूचनेत काय घडले ते सांगितले आहे.',
          hi: 'मुझे पता चला कि जिन्होंने कुकी बैनर स्वीकार किया था, उनके लिए लोन तुलना पर किए गए क्लिक के साथ किसी ऑफ़र का नाम या चार्ट की रकमें जैसी जानकारी भी जा सकती थी। मैंने 8 अक्टूबर से दर्ज सभी क्लिक जाँचे, और किसी के साथ ऐसा कुछ नहीं गया था। फिर भी मैंने इसे ठीक कर दिया है: अब क्लिक सिर्फ़ उस लेबल से दर्ज होता है जो साइट किसी बटन को देती है, और प्राइवेसी नोटिस बताती है कि क्या हुआ।',
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
          en: 'The analytics that note when a visit comes from an AI assistant or tool now recognize more of them, such as Mistral Vibe, Meta AI, NotebookLM, Duck.ai, Poe, Qwen Chat and Kimi. No new kind of information is recorded, and the privacy notice lists them all.',
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
          es: 'Las palabras del glosario de una lección ahora muestran su significado justo donde las lees: al pasar el ratón por encima o al llegar a ellas con el teclado; en el teléfono, al tocarlas. Un pequeño signo de interrogación junto a cada una las distingue de los enlaces a otras páginas.',
          cs: 'Slova ze slovníčku pojmů lekce teď ukazují svůj význam přímo tam, kde je čtete: na počítači po najetí myší nebo když na ně přejdete klávesnicí, na telefonu klepnutím. Malý otazník u každého z nich je odlišuje od odkazů na jiné stránky.',
          mr: 'धड्याच्या शब्दसूचीतील शब्द आता तुम्ही वाचत असलेल्या ठिकाणीच त्यांचा अर्थ दाखवतात: संगणकावर त्यांच्यावर माउस नेल्यावर किंवा कीबोर्डने तिथे पोहोचल्यावर, आणि फोनवर त्यांना स्पर्श केल्यावर. प्रत्येक शब्दाशेजारी असलेले छोटे प्रश्नचिन्ह त्याला इतर पानांच्या लिंकपेक्षा वेगळे दाखवते.',
          hi: 'पाठ की शब्दावली के शब्द अब वहीं अपना अर्थ दिखाते हैं जहाँ आप उन्हें पढ़ रहे हैं: कंप्यूटर पर उन पर माउस ले जाने या कीबोर्ड से वहाँ पहुँचने पर, और फ़ोन पर उन्हें छूने पर। हर शब्द के पास एक छोटा प्रश्नचिह्न उसे दूसरे पेजों के लिंक से अलग पहचान देता है।',
        },
      },
    ],
  },
  {
    date: '2026-10-24',
    items: [
      {
        id: 'volunteer-translators',
        text: {
          en: 'I added a volunteers page for native or near native speakers who want to improve nidhi’s translations, help translate the lessons, or hear from me when their language opens. The home page and the footer point to it, and the privacy notice says what its form collects and how long it is kept.',
          es: 'He añadido una página de voluntariado para quien hable un idioma de forma nativa o casi nativa y quiera mejorar las traducciones de nidhi, ayudar a traducir las lecciones o saber cuándo se abre su idioma. La página de inicio y el pie de página llevan a ella, y el aviso de privacidad explica qué recoge su formulario y cuánto tiempo se guarda.',
          cs: 'Přibyla stránka pro dobrovolnou pomoc pro ty, kdo jazyk ovládají jako rodný nebo skoro stejně dobře a chtějí zlepšit překlady nidhi, pomoct s překladem lekcí nebo dostat zprávu, až se jejich jazyk otevře. Odkazuje na ni úvodní stránka i\u00a0zápatí a zásady ochrany soukromí uvádějí, co její formulář sbírá a jak dlouho se to uchovává.',
          mr: 'भाषा मातृभाषेसारखी येणाऱ्या आणि nidhi ची भाषांतरे सुधारायला, धड्यांचे भाषांतर करायला मदत करायला, किंवा आपली भाषा सुरू झाल्यावर कळवले जावे असे वाटणाऱ्या लोकांसाठी आता स्वयंसेवकांचे पान आहे. मुख्यपृष्ठ आणि फूटर त्याकडे नेतात, आणि त्याचा फॉर्म काय गोळा करतो व ते किती काळ साठवले जाते ते गोपनीयता सूचनेत लिहिले आहे.',
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
          es: 'El recuadro del boletín muestra ahora cuántas personas reciben las lecciones nuevas por correo, a partir de 20, con el total redondeado a la baja de 20 en 20. Nunca muestra nada sobre una persona concreta.',
          cs: 'Rámeček s newsletterem teď od 20 odběrů ukazuje, kolik lidí dostává nové lekce e-mailem, zaokrouhleno dolů po dvacítkách. Nikdy neukazuje nic o konkrétním člověku.',
          mr: 'न्यूजलेटरची चौकट आता 20 वाचक झाल्यावर किती वाचक नवे धडे ईमेलवर मिळवतात ते दाखवते, 20-20 च्या टप्प्यांत खालच्या बाजूला पूर्णांक करून. ती कोणत्याही एका व्यक्तीबद्दल कधीच काही दाखवत नाही.',
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
          mr: 'प्रतीक्षा यादीची चौकट आता 20 नोंदणी झाल्यावर किती लोक सामील झाले ते दाखवते, 20-20 च्या टप्प्यांत खालच्या बाजूला पूर्णांक करून. ती कोणत्याही एका व्यक्तीबद्दल कधीच काही दाखवत नाही, आणि गोपनीयता सूचनेत तसे लिहिले आहे.',
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
          hi: '“nidhi के बारे में” पेज पर अब लिखा है कि पाठ कितने अलग-अलग स्रोतों की ओर ले जाते हैं, और यह गिनती सीधे पाठों से होती है।',
          es: 'La página Sobre nidhi indica ahora a cuántas fuentes distintas remiten las lecciones, contadas a partir de las propias lecciones.',
          cs: 'Stránka O nidhi teď uvádí, na kolik různých zdrojů lekce odkazují, spočítáno přímo z lekcí.',
          mr: '“nidhi विषयी” पानावर आता लिहिले आहे की धडे किती वेगवेगळ्या स्रोतांकडे नेतात, आणि ही संख्या थेट धड्यांमधून मोजली जाते.',
        },
      },
      {
        id: 'mastery-not-yet-available',
        aliases: ['mastery-in-progress'],
        text: {
          en: 'The Mastery level now says “Not yet available” instead of “Being written”, which is more honest: its lessons are not out yet.',
          hi: 'निपुणता वाले स्तर पर अब “लिखा जा रहा है” की जगह “अभी उपलब्ध नहीं” लिखा है, जो ज़्यादा सच्चा है: इसके पाठ अभी प्रकाशित नहीं हुए हैं।',
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
          cs: 'Všechny čtyři nástroje zdarma teď mají čekací listinu na plánovač a všechny ji nabízejí stejně, každý s jednou větou o tom, co plánovač přidá.',
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
          en: 'The beliefs page and my story are in my own voice now. They say “I”, because it is one person: me.',
          hi: 'सिद्धांतों वाला पेज और मेरी कहानी अब मेरी अपनी आवाज़ में हैं। इनमें “मैं” लिखा है, क्योंकि इसके पीछे एक ही व्यक्ति है: मैं।',
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
          hi: '“nidhi के बारे में” पेज पर अब लिखा है कि यहाँ AI टूल किस काम आते हैं: रिसर्च, मसौदे और जाँच में मदद, और हर पाठ मेरे पढ़ने और मंज़ूर करने के बाद ही प्रकाशित होता है।',
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
          es: 'En el teléfono, la tarjeta de arriba de la página de inicio es ahora más sencilla: solo los tres pasos.',
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
          en: 'Lessons now have an “In this lesson” button: once the list at the top scrolls away, it opens that list again, so you can jump to any part without scrolling back up.',
          hi: 'पाठों में अब “In this lesson” बटन है: ऊपर की सूची स्क्रॉल होकर ओझल हो जाए, तो यह उसे फिर खोल देता है, ताकि आप बिना वापस ऊपर गए किसी भी हिस्से पर जा सकें।',
          es: 'Las lecciones tienen ahora un botón «In this lesson»: cuando la lista de arriba queda atrás, la vuelve a abrir para saltar a cualquier parte sin volver a subir.',
          cs: 'Lekce teď mají tlačítko „In this lesson“: když seznam nahoře zmizí z obrazovky, znovu ho otevře, takže můžete skočit na kteroukoli část bez posouvání zpět nahoru.',
          mr: 'धड्यांमध्ये आता “In this lesson” बटण आहे: वरची यादी स्क्रोल होऊन दिसेनाशी झाली की ते ती पुन्हा उघडते, म्हणजे परत वर न जाता कोणत्याही भागावर जाता येते.',
        },
      },
    ],
  },
];

/** Every item with its day, newest first: what the feeds list, one entry per item. */
export const CHANGES: Array<ChangeItem & { date: string }> = CHANGE_DAYS.flatMap((d) =>
  d.items.map((item) => ({ ...item, date: d.date })),
);
