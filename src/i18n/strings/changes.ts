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
    date: '2026-11-14',
    items: [
      {
        id: 'share-window-keeps-focus',
        text: {
          en: 'In the net worth calculator\'s share window, pressing Copy link with the keyboard no longer throws you back to the first option: focus stays on the button. If copying fails and the address is shown instead, the Tab key now reaches it.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर की शेयर विंडो में कीबोर्ड से "लिंक कॉपी करें" दबाने पर अब आप पहले विकल्प पर वापस नहीं पहुँचते: फ़ोकस बटन पर ही रहता है। अगर कॉपी न हो पाए और उसकी जगह पता दिखे, तो Tab कुंजी अब उस तक पहुँचती है।',
          es: 'En la ventana para compartir de la calculadora de patrimonio neto, pulsar «Copiar enlace» con el teclado ya no te devuelve a la primera opción: el foco se queda en el botón. Si la copia falla y en su lugar se muestra la dirección, la tecla Tab ahora llega hasta ella.',
          cs: 'V\u00a0okně pro sdílení v\u00a0kalkulačce čistého jmění vás stisk tlačítka pro kopírování odkazu na klávesnici už nevrací na první volbu: fokus zůstává na tlačítku. Když se kopírování nepodaří a\u00a0místo toho se zobrazí adresa, klávesa Tab se k\u00a0ní teď dostane.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटरच्या शेअर विंडोमध्ये कीबोर्डने “लिंक कॉपी करा” दाबल्यावर आता तुम्ही पहिल्या पर्यायावर परत फेकले जात नाही: फोकस बटणावरच राहतो. कॉपी झाली नाही आणि त्याऐवजी पत्ता दिसला, तर Tab कळ आता त्याच्यापर्यंत पोहोचते.',
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
        id: 'tools-one-frame',
        text: {
          en: 'The five free tools now share one page frame: the same header, questions and related lessons on every tool, so a new tool cannot drift from the others. On the net worth calculator, the note on net against gross exposure (a large debt in a currency can hide how much you hold in it) is now always visible, where before it sat inside the folded “How the calculation works”. The one-line introductions above the related lessons on the loan and net worth pages are gone, since they added nothing the cards do not say.',
          hi: 'पाँचों मुफ़्त टूल के पन्नों का ढाँचा अब एक ही है: हर टूल पर वही शीर्ष भाग, वही सवाल-जवाब और वही संबंधित पाठ, ताकि कोई नया टूल बाकियों से अलग न दिखने लगे। शुद्ध संपत्ति कैलकुलेटर में शुद्ध और सकल एक्सपोज़र वाली टिप्पणी (किसी मुद्रा में बड़ा कर्ज़ यह छिपा सकता है कि उस मुद्रा में आपके पास कितना है) अब हमेशा दिखती है; पहले वह बंद रहने वाले “हिसाब कैसे लगता है” हिस्से के अंदर थी। लोन और शुद्ध संपत्ति वाले पन्नों पर संबंधित पाठों के ऊपर की एक पंक्ति की भूमिका हटा दी गई है, क्योंकि उसमें ऐसा कुछ नहीं था जो कार्ड न बताते हों।',
          es: 'Las cinco herramientas gratuitas comparten ahora un mismo marco de página: el mismo encabezado, las mismas preguntas y las mismas lecciones relacionadas en todas, para que una herramienta nueva no se aparte de las demás. En la calculadora de patrimonio neto, la nota sobre exposición neta frente a bruta (una deuda grande en una moneda puede ocultar cuánto tienes en ella) está ahora siempre visible; antes estaba dentro del bloque plegado «Cómo se hace el cálculo». Las frases de una línea sobre las lecciones relacionadas en las páginas de préstamos y de patrimonio neto ya no están, porque no añadían nada que las tarjetas no digan.',
          cs: 'Pět bezplatných nástrojů teď sdílí jeden rámec stránky: stejné záhlaví, otázky a\u00a0související lekce u\u00a0každého nástroje, aby se nový nástroj nezačal od ostatních lišit. V\u00a0kalkulačce čistého jmění je poznámka o\u00a0čisté a\u00a0hrubé expozici (velký dluh v\u00a0některé měně může zakrýt, kolik v\u00a0ní držíte) teď vidět vždy; dřív byla uvnitř sbalené části „Jak výpočet funguje“. Jednořádkové úvody nad souvisejícími lekcemi na stránkách úvěrů a\u00a0čistého jmění zmizely, protože nepřidávaly nic, co by neříkaly karty.',
          mr: 'पाचही मोफत साधनांच्या पानांची चौकट आता एकच आहे: प्रत्येक साधनावर तोच वरचा भाग, तेच प्रश्न आणि तेच संबंधित धडे, म्हणजे नवे साधन इतरांपेक्षा वेगळे दिसू लागणार नाही. निव्वळ संपत्ती कॅल्क्युलेटरमध्ये निव्वळ विरुद्ध एकूण हिश्श्याबद्दलची टीप (एखाद्या चलनातील मोठे कर्ज त्या चलनात तुमच्याकडे किती आहे हे झाकू शकते) आता नेहमी दिसते; आधी ती बंद असलेल्या “हिशेब कसा होतो” या भागात होती. कर्ज आणि निव्वळ संपत्तीच्या पानांवरील संबंधित धड्यांवरच्या एका ओळीच्या प्रस्तावना काढल्या आहेत, कारण कार्डे सांगत नाहीत असे त्यांत काही नव्हते.',
        },
      },
      {
        id: 'tools-one-announcement',
        text: {
          en: 'With a screen reader, the free tools now tell you a result in the same way: one short sentence, once you stop typing. Before, the loan comparison read out every half-typed figure, the net worth calculator said nothing when the total changed, and the invest or pay off debt calculator did not say when an entry was not accepted. The lesson search now reads out only how many lessons it found.',
          hi: 'स्क्रीन रीडर के साथ मुफ़्त टूल अब नतीजा एक ही तरह से बताते हैं: लिखना रुकने पर एक छोटा वाक्य। पहले लोन तुलना हर अधूरी लिखी संख्या पढ़ देती थी, शुद्ध संपत्ति कैलकुलेटर कुल रकम बदलने पर कुछ नहीं कहता था, और निवेश या कर्ज़ चुकाना कैलकुलेटर यह नहीं बताता था कि भरी गई कोई संख्या मानी नहीं गई। पाठों की खोज अब सिर्फ़ यह पढ़ती है कि कितने पाठ मिले।',
          es: 'Con un lector de pantalla, las herramientas gratuitas dicen ahora el resultado de la misma manera: una frase corta cuando dejas de escribir. Antes, el comparador de préstamos leía cada cifra a medio escribir, la calculadora de patrimonio neto no decía nada cuando cambiaba el total, y la calculadora de invertir o pagar deuda no avisaba cuando no aceptaba un dato. El buscador de lecciones lee ahora solo cuántas lecciones encontró.',
          cs: 'Se čtečkou obrazovky teď bezplatné nástroje oznamují výsledek stejným způsobem: jednou krátkou větou, jakmile přestanete psát. Dřív srovnání úvěrů četlo každé nedopsané číslo, kalkulačka čistého jmění při změně součtu neřekla nic a\u00a0kalkulačka Investovat, nebo splatit dluh neoznámila, že některý údaj nepřijala. Hledání v\u00a0lekcích teď čte jen to, kolik lekcí našlo.',
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
          cs: 'Na pomalém telefonu se pole bezplatného nástroje objevila pár sekund předtím, než nástroj začal fungovat, a\u00a0co se do nich mezitím napsalo, se ztratilo. Pole teď počkají, až je nástroj připravený. Simulátor Monte Carlo navíc říká, co zadat, když je číslo mimo rozsah, a\u00a0chyba pod polem teď ve všech nástrojích začíná slovem „Chyba“, aby se nepoznala jen podle barvy.',
          mr: 'संथ फोनवर मोफत साधनाचे रकाने साधन सुरू होण्याच्या काही सेकंद आधीच दिसत, आणि त्या वेळेत लिहिलेले सगळे पुसले जाई. आता साधन तयार होईपर्यंत रकाने थांबतात. मॉन्टे कार्लो सिम्युलेटर आता संख्या मर्यादेबाहेर असेल तर काय भरायचे तेही सांगतो, आणि प्रत्येक साधनात रकान्याखालची चूक आता “त्रुटी” या शब्दाने सुरू होते, म्हणजे ती फक्त रंगावरून ओळखावी लागत नाही.',
        },
      },
      {
        id: 'tools-one-look',
        text: {
          en: 'The five free tools now look like one family. Dropdowns match the boxes beside them, section titles and questions are the same size everywhere, the views in the loan comparison and the inflation calculator are plain tabs with a line under the one you are on, and the Monte Carlo simulator\'s Reset sits at the top of its form like the others. Nothing about the sums has changed.',
          hi: 'पाँचों मुफ़्त टूल अब एक ही परिवार जैसे दिखते हैं। ड्रॉपडाउन अब बगल के बॉक्स जैसे हैं, हिस्सों के शीर्षक और सवाल हर टूल में एक ही आकार के हैं, लोन की तुलना और महँगाई कैलकुलेटर के व्यू अब सादे टैब हैं जिनमें चुने हुए टैब के नीचे एक रेखा रहती है, और मोंटे कार्लो सिम्युलेटर का रीसेट बटन बाकी टूल की तरह फ़ॉर्म के ऊपर है। हिसाब में कुछ नहीं बदला है।',
          es: 'Las cinco herramientas gratuitas se ven ahora como una sola familia. Los desplegables son iguales a las casillas de al lado, los títulos de sección y las preguntas tienen el mismo tamaño en todas, las vistas del comparador de préstamos y de la calculadora de inflación son pestañas sencillas con una línea bajo la que tienes abierta, y el botón de restablecer del simulador Monte Carlo está arriba en su formulario, como en las demás. Los cálculos no han cambiado.',
          cs: 'Pět bezplatných nástrojů teď vypadá jako jedna rodina. Rozbalovací seznamy vypadají stejně jako pole vedle nich, nadpisy částí a\u00a0otázky mají všude stejnou velikost, pohledy ve srovnání úvěrů a\u00a0v\u00a0inflační kalkulačce jsou obyčejné záložky s\u00a0linkou pod tou, na které jste, a\u00a0tlačítko pro obnovení v\u00a0simulátoru Monte Carlo je nahoře ve formuláři jako u\u00a0ostatních. Výpočty se nezměnily.',
          mr: 'पाचही मोफत साधने आता एकाच कुटुंबातली दिसतात. ड्रॉपडाउन आता शेजारच्या रकान्यांसारखेच दिसतात, विभागांची शीर्षके आणि प्रश्न सगळीकडे एकाच आकाराचे आहेत, कर्जांची तुलना आणि महागाई कॅल्क्युलेटरमधील दृश्ये आता साधे टॅब आहेत ज्यांत निवडलेल्या टॅबखाली एक रेघ असते, आणि मॉन्टे कार्लो सिम्युलेटरचे रीसेट बटण इतर साधनांप्रमाणे फॉर्मच्या वर आहे. हिशेबात काहीही बदललेले नाही.',
        },
      },
      {
        id: 'loan-report-typed-rate',
        text: {
          en: 'The loan comparison\'s printed report and spreadsheet now show an interest rate with three decimals, such as 4.875%, as it was typed, where they used to round it to 4.88. The Monte Carlo simulator also words a one-year withdrawal properly.',
          hi: 'लोन तुलना की छपी रिपोर्ट और स्प्रेडशीट अब तीन दशमलव वाली ब्याज दर, जैसे 4.875%, वैसी ही दिखाती हैं जैसी लिखी गई थी; पहले वे उसे 4.88 कर देती थीं। मोंटे कार्लो सिम्युलेटर में एक साल की निकासी का वाक्य भी अब ठीक पढ़ा जाता है।',
          es: 'El informe impreso y la hoja de cálculo del comparador de préstamos muestran ahora una tasa de interés con tres decimales, como 4,875 %, tal como se escribió; antes la redondeaban a 4,88. El simulador Monte Carlo también redacta bien un retiro de un solo año.',
          cs: 'Tištěná zpráva a\u00a0tabulka ze srovnání úvěrů teď ukazují úrokovou sazbu se třemi desetinnými místy, například 4,875 %, tak, jak byla zadaná; dřív ji zaokrouhlovaly na 4,88. Simulátor Monte Carlo také správně formuluje výběr na jediný rok.',
          mr: 'कर्जांच्या तुलनेचा छापील अहवाल आणि स्प्रेडशीट आता तीन दशांश स्थळांचा व्याजदर, उदा. 4.875%, जसा लिहिला तसाच दाखवतात; आधी ते तो 4.88 असा करत होते. माँटे कार्लो सिम्युलेटरमध्ये एका वर्षाच्या रक्कम काढण्याचे वाक्यही आता बरोबर वाचले जाते.',
        },
      },
      {
        id: 'tools-small-fixes-nov12',
        text: {
          en: 'Five small fixes in the free tools. The line under the loan comparison\'s payment chart no longer quotes a 25-year loan\'s figures for every loan. An error about a loan whose rate changes now names the control to use. When a browser will not copy a share link, the loan and net worth tools show the link to copy by hand and no longer say it was copied. Currency lists read the same way in all five tools. The net worth calculator calls its exchange rates the latest official ones, not live.',
          hi: 'मुफ़्त टूल में पाँच छोटे सुधार। लोन तुलना के किस्त वाले चार्ट के नीचे की पंक्ति अब हर लोन के लिए 25 साल के लोन के आँकड़े नहीं बताती। बदलती दर वाले लोन की एक गड़बड़ी का संदेश अब बताता है कि कौन सा विकल्प चुनना है। जब ब्राउज़र शेयर लिंक कॉपी नहीं करता, तब लोन और शुद्ध संपत्ति वाले टूल लिंक दिखाते हैं ताकि उसे हाथ से कॉपी किया जा सके, और यह नहीं कहते कि वह कॉपी हो गया। मुद्राओं की सूची पाँचों टूल में एक ही तरह से दिखती है। शुद्ध संपत्ति कैलकुलेटर अपनी विनिमय दरों को ताज़ा आधिकारिक दरें कहता है, लाइव नहीं।',
          es: 'Cinco pequeñas correcciones en las herramientas gratuitas. La línea bajo el gráfico de cuotas del comparador de préstamos ya no cita las cifras de un préstamo a 25 años para cualquier préstamo. Un mensaje de error sobre un préstamo cuya tasa cambia indica ahora qué opción usar. Cuando el navegador no copia un enlace para compartir, las herramientas de préstamos y de patrimonio neto muestran el enlace para copiarlo a mano y ya no dicen que se copió. Las listas de monedas se leen igual en las cinco herramientas. La calculadora de patrimonio neto llama a sus tipos de cambio los oficiales más recientes, no en vivo.',
          cs: 'Pět drobných oprav v\u00a0bezplatných nástrojích. Řádek pod grafem splátek ve srovnání úvěrů už neuvádí čísla 25letého úvěru u\u00a0každého úvěru. Chybová hláška u\u00a0úvěru, jehož sazba se mění, teď říká, kterou volbu použít. Když prohlížeč odkaz ke sdílení nezkopíruje, nástroje pro úvěry a\u00a0čisté jmění odkaz ukážou k\u00a0ručnímu zkopírování a\u00a0už netvrdí, že je zkopírovaný. Seznamy měn vypadají ve všech pěti nástrojích stejně. Kalkulačka čistého jmění označuje své kurzy jako nejnovější oficiální, ne jako živé.',
          mr: 'मोफत साधनांमध्ये पाच लहान दुरुस्त्या. कर्जांच्या तुलनेतील हप्त्यांच्या आलेखाखालची ओळ आता प्रत्येक कर्जासाठी 25 वर्षांच्या कर्जाचे आकडे सांगत नाही. दर बदलणाऱ्या कर्जाबद्दलचा एक त्रुटी संदेश आता कोणता पर्याय निवडायचा ते सांगतो. ब्राउझर शेअर लिंक कॉपी करत नाही, तेव्हा कर्ज आणि निव्वळ संपत्तीची साधने लिंक हाताने कॉपी करण्यासाठी दाखवतात आणि ती कॉपी झाली असे म्हणत नाहीत. चलनांच्या याद्या पाचही साधनांमध्ये एकसारख्या दिसतात. निव्वळ संपत्ती कॅल्क्युलेटर आपल्या विनिमय दरांना ताजे अधिकृत दर म्हणतो, लाइव्ह नाही.',
        },
      },
      {
        id: 'net-worth-no-band-when-negative',
        text: {
          en: 'In the net worth calculator, when debts leave your total at zero or below, a holding in another currency used to be labelled low exposure at 0%. It now carries no band, says why, and shows what a 10% move in that currency would change.',
          hi: 'शुद्ध संपत्ति कैलकुलेटर में, जब कर्ज़ों के बाद कुल शून्य या उससे नीचे रह जाता था, तब दूसरी मुद्रा की रकम पर 0% के साथ कम एक्सपोज़र लिखा आता था। अब उस पर कोई श्रेणी नहीं लगती, कारण बताया जाता है, और दिखाया जाता है कि उस मुद्रा में 10% के बदलाव से कितना फ़र्क़ पड़ेगा।',
          es: 'En la calculadora de patrimonio neto, cuando las deudas dejan el total en cero o por debajo, un saldo en otra moneda aparecía como exposición baja al 0 %. Ahora no lleva ninguna franja, explica por qué y muestra cuánto cambiaría con un movimiento del 10 % de esa moneda.',
          cs: 'Když v\u00a0kalkulačce čistého jmění dluhy stáhly součet na nulu nebo pod ni, částka v\u00a0jiné měně se označila jako nízká expozice s\u00a00 %. Teď žádné pásmo nedostane, kalkulačka řekne proč a\u00a0ukáže, co by změnil pohyb té měny o\u00a010 %.',
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
          hi: 'लोन तुलना में अब दर बदलने पर किस्त वही रखी जा सकती है। कई बैंक ऐसा ही करते हैं: किस्त वही रहती है और लोन पहले या बाद में ख़त्म होता है। दर का ढाँचा के नीचे हर ऑफ़र के लिए चुना जा सकता है कि क्या होगा, और फिर ऑफ़र वह महीना दिखाता है जब लोन चुकेगा, या साफ़ बताता है कि उस किस्त पर वह कभी नहीं चुकता।',
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
          hi: 'नेट वर्थ कैलकुलेटर दो अलग आँकड़ों के लिए एक ही शब्द, जमाव, इस्तेमाल करता था। किसी दूसरी मुद्रा में कर्ज़ हो, तो चार्ट एक ही मुद्रा के लिए 63.5% दिखा सकता था और कार्ड व स्प्रेडशीट 234.9%। अब जमाव का मतलब है आपके पास जो है और जो बकाया है, उस सब में हर मुद्रा का हिस्सा, और इसका जोड़ हमेशा 100% होता है। दूसरे आँकड़े को उसके असली नाम से बताया जाता है, यानी आपकी शुद्ध संपत्ति का हिस्सा: कार्ड पर, और स्प्रेडशीट व PDF में अलग कॉलम में।',
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
          es: 'Dos correcciones en el simulador Monte Carlo. Un plan sin nada invertido y con retiros activados decía antes que el dinero alcanzaba en todas las trayectorias; ahora dice que se agotó. Y una proporción que es casi, pero no del todo, todas las trayectorias se muestra ahora con un decimal: 99,5% y no 100%.',
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
          mr: 'फोनमधील अक्षरांचा आकार मोठा ठेवला तरी साइटचा वरचा भाग आता स्क्रीनमध्ये मावतो. दुप्पट आकारात मेनूचे बटण आधी स्क्रीनच्या कडेबाहेर जात असे; आता ही बटणे दुसऱ्या ओळीत येतात. मुख्य पानावरील काही लिंकही अशाच पुढच्या ओळीत येतात.',
        },
      },
      {
        id: 'loan-offer-names',
        text: {
          en: 'The loan comparison calls an offer by the name you give it. Type a name and it now shows on the offer\'s card, on the phone tabs and in a short key above the phone table, beside the letter the table uses. The option for a rate that changes is now called "Fixed, then variable" instead of the US term "Hybrid (ARM)". Loans in rupees start with APR as the monthly rate times 12, the way India\'s loan fact sheets state it. The example offers also start with their optional boxes empty.',
          hi: 'लोन तुलना अब ऑफ़र को उसी नाम से बुलाती है जो आप उसे देते हैं। नाम लिखते ही वह ऑफ़र के कार्ड पर, फ़ोन के टैब पर और फ़ोन की तालिका के ऊपर एक छोटी सूची में दिखता है, उसी अक्षर के साथ जो तालिका में आता है। बदलने वाली दर का विकल्प अब "पहले तय, फिर बदलती" कहलाता है, अमेरिकी शब्द "हाइब्रिड (ARM)" की जगह। रुपये वाले लोन में APR अब शुरू में मासिक दर गुणा 12 से दिखता है, जैसा भारत के लोन के मुख्य तथ्य विवरण में लिखा जाता है। उदाहरण के ऑफ़र भी अब ख़ाली वैकल्पिक खानों के साथ शुरू होते हैं।',
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
          es: 'El comparador de préstamos puede mostrar ahora el APR de las dos maneras en que lo escriben los prestamistas. Hay dos maneras de pasar una tasa mensual a una anual: multiplicarla por 12, como hacen los documentos en EE. UU. y Canadá, o capitalizarla durante el año, como hacen los documentos en la UE y el Reino Unido. Antes la herramienta solo mostraba la primera, así que el mismo préstamo sin comisión daba un 6,50% donde la segunda manera da un 6,70%. Ahora puedes elegir la manera con un selector encima de las ofertas; la opción inicial depende de la moneda, y cada tarjeta dice cuál muestra. La guía para comparar ofertas de préstamo y la lección sobre las condiciones de los préstamos también dicen cuál usan.',
          cs: 'Srovnání úvěrů teď umí ukázat APR oběma způsoby, kterými ji poskytovatelé úvěrů píší. Měsíční sazbu lze převést na roční dvěma způsoby: vynásobit ji dvanácti, jak to dělají dokumenty v\u00a0USA a\u00a0Kanadě, nebo ji za rok složeně úročit, jak to dělají dokumenty v\u00a0EU a\u00a0ve Spojeném království. Nástroj dříve ukazoval jen první způsob, takže stejný úvěr bez poplatku vycházel na 6,50\u00a0%, zatímco druhým způsobem je to 6,70\u00a0%. Přepínač nad nabídkami teď způsob vybírá, výchozí volba závisí na měně a\u00a0každá karta říká, který způsob ukazuje. Návod na porovnání nabídek úvěrů a\u00a0lekce o\u00a0podmínkách úvěrů teď také říkají, který způsob používají.',
          mr: 'कर्जांची तुलना आता APR त्या दोन्ही पद्धतींनी दाखवू शकते ज्यांनी कर्जदाते तो लिहितात. मासिक दरावरून वार्षिक दर दोन पद्धतींनी काढता येतो: त्याला 12\u00a0ने गुणून, जसे अमेरिका आणि कॅनडातील कागदपत्रांत असते, किंवा वर्षभर चक्रवाढ करून, जसे युरोपियन युनियन आणि UK\u00a0मधील कागदपत्रांत असते. आधी साधन फक्त पहिली पद्धत दाखवत असे, त्यामुळे शुल्क नसलेले एकच कर्ज 6.50% दिसत असे, तर दुसऱ्या पद्धतीने ते 6.70% येते. आता ऑफरच्या वरचा एक पर्याय पद्धत निवडतो, सुरुवातीची निवड चलनानुसार होते, आणि प्रत्येक कार्डावर कोणती पद्धत वापरली आहे ते लिहिलेले असते. कर्जाच्या ऑफरची तुलना करण्याची मार्गदर्शिका आणि कर्जाच्या अटींवरचा धडाही आता कोणती पद्धत वापरतात ते सांगतात.',
        },
      },
      {
        id: 'loan-comparison-short-cards',
        text: {
          en: 'The loan comparison shows each offer\'s result right under its five main boxes, on every screen size. The optional details (rate structure, costs and fees, prepayments, prepayment penalty) are now four rows that say what they hold and open when you want them, so the side-by-side table is no longer two screens down. The starting offers are marked as an example, and the assumptions start folded.',
          hi: 'लोन तुलना में हर ऑफ़र का नतीजा अब उसके पाँच मुख्य खानों के ठीक नीचे दिखता है, हर स्क्रीन पर। वैकल्पिक जानकारी (दर का ढाँचा, लागत और शुल्क, समय से पहले भुगतान, समय से पहले भुगतान पर जुर्माना) अब चार पंक्तियाँ हैं, जो बताती हैं कि उनमें क्या भरा है और ज़रूरत पड़ने पर खुलती हैं, इसलिए आमने-सामने वाली तालिका अब दो स्क्रीन नीचे नहीं है। शुरुआती ऑफ़रों पर लिखा है कि वे उदाहरण हैं, और मान्यताएँ शुरू में बंद रहती हैं।',
          es: 'La comparación de préstamos muestra el resultado de cada oferta justo debajo de sus cinco casillas principales, en cualquier tamaño de pantalla. Los datos opcionales (estructura de la tasa, costos y comisiones, pagos anticipados, penalización por pago anticipado) son ahora cuatro filas que dicen lo que contienen y se abren cuando las necesitas, así que la tabla comparativa ya no queda dos pantallas más abajo. Las ofertas iniciales llevan la indicación de que son un ejemplo, y los supuestos empiezan plegados.',
          cs: 'Srovnání úvěrů ukazuje výsledek každé nabídky hned pod jejími pěti hlavními poli, na každé velikosti obrazovky. Volitelné podrobnosti (struktura sazby, náklady a\u00a0poplatky, mimořádné splátky, poplatek za předčasné splacení) jsou teď čtyři řádky, které říkají, co obsahují, a\u00a0otevřou se, až je budete potřebovat, takže srovnávací tabulka už není o\u00a0dvě obrazovky níž. Výchozí nabídky jsou označené jako ukázka a\u00a0předpoklady jsou na začátku sbalené.',
          mr: 'कर्जांच्या तुलनेत प्रत्येक ऑफरचा निकाल आता तिच्या पाच मुख्य रकान्यांच्या लगेच खाली दिसतो, प्रत्येक स्क्रीनवर. ऐच्छिक तपशील (व्याजदराची रचना, खर्च आणि शुल्क, मुदतपूर्व परतफेड, मुदतपूर्व परतफेडीवरील दंड) आता चार ओळी आहेत; त्यांत काय भरले आहे ते त्या सांगतात आणि हवे तेव्हा उघडतात, त्यामुळे शेजारी-शेजारी तुलनेचा तक्ता आता दोन स्क्रीन खाली नाही. सुरुवातीच्या ऑफरवर त्या उदाहरण असल्याचे लिहिले आहे, आणि गृहीतके सुरुवातीला मिटलेली असतात.',
        },
      },
      {
        id: 'invest-pay-off-shorter-form',
        text: {
          en: 'The invest or pay off tool has a shorter form. The three optional percentages (tax relief, fund fee and tax on gains) now sit behind one row called Taxes and fees, which says which of them are in use and opens by itself when a shared link sets one. The starting figures are marked as an example, and Start again is at the top.',
          hi: 'निवेश या कर्ज़ चुकाना टूल का फ़ॉर्म अब छोटा है। तीन वैकल्पिक प्रतिशत (टैक्स छूट, फंड शुल्क और मुनाफ़े पर टैक्स) अब टैक्स और शुल्क नाम की एक पंक्ति के पीछे हैं, जो बताती है कि इनमें से कौन-से लागू हैं और शेयर किए गए लिंक में कोई भरा हो तो अपने आप खुल जाती है। शुरुआती आँकड़ों पर लिखा है कि वे उदाहरण हैं, और फिर से शुरू करें अब सबसे ऊपर है।',
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
          es: 'El simulador Monte Carlo muestra ahora el gráfico justo debajo de las tres cifras, y los botones de guardar y compartir van después. Las comisiones anuales y el número de trayectorias simuladas quedan tras una sola fila que dice cómo están ajustadas, en cualquier tamaño de pantalla. Las cifras iniciales llevan la indicación de que son un ejemplo, y la combinación con un 80 % en acciones dice que no es una sugerencia.',
          cs: 'Simulátor Monte Carlo teď ukazuje graf hned pod třemi čísly a\u00a0tlačítka pro uložení a\u00a0sdílení následují až za ním. Roční poplatky a\u00a0počet simulovaných trajektorií jsou na každé velikosti obrazovky schované za jedním řádkem, který říká, jak jsou nastavené. Výchozí čísla jsou označená jako ukázka a\u00a0u\u00a0poměru s\u00a080 % akcií je napsáno, že nejde o\u00a0doporučení.',
          mr: 'मॉन्टे कार्लो सिम्युलेटरमध्ये आलेख आता तीन आकड्यांच्या लगेच खाली दिसतो, आणि सेव्ह व शेअरची बटणे त्यानंतर येतात. वार्षिक शुल्क आणि संभाव्य मार्गांची संख्या आता प्रत्येक स्क्रीनवर एका ओळीमागे आहेत; ते कशावर सेट आहेत ते ती ओळ सांगते. सुरुवातीच्या आकड्यांवर ते उदाहरण असल्याचे लिहिले आहे, आणि 80% शेअर्सच्या मिश्रणावर ते सुचवलेले मिश्रण नसल्याचे लिहिले आहे.',
        },
      },
      {
        id: 'inflation-history-folded',
        text: {
          en: 'The inflation calculator puts the answer closer to the figures you type. A country\'s inflation history is optional in three of the four questions, so there it now sits behind one row that names the country you picked; in Past to today, which needs it, it stays in view. The starting figures are marked as an example, Reset is at the top, and the chart is shorter on a phone.',
          hi: 'महँगाई कैलकुलेटर में जवाब अब आपके भरे आँकड़ों के ज़्यादा पास दिखता है। चार में से तीन सवालों में किसी देश की महँगाई का इतिहास वैकल्पिक है, इसलिए वहाँ वह अब एक पंक्ति के पीछे है, जिस पर चुने हुए देश का नाम रहता है; बीते साल से आज तक वाले सवाल में, जहाँ उसकी ज़रूरत है, वह सामने ही रहता है। शुरुआती आँकड़ों पर लिखा है कि वे उदाहरण हैं, रीसेट करें अब सबसे ऊपर है, और फ़ोन पर चार्ट छोटा है।',
          es: 'La calculadora de inflación acerca la respuesta a las cifras que escribes. El historial de inflación de un país es opcional en tres de las cuatro preguntas, así que ahí queda tras una sola fila que nombra el país elegido; en Del pasado a hoy, que lo necesita, sigue a la vista. Las cifras iniciales llevan la indicación de que son un ejemplo, Restablecer está arriba y el gráfico es más bajo en el móvil.',
          cs: 'Inflační kalkulačka teď ukazuje odpověď blíž k\u00a0číslům, která zadáváte. Historie inflace v\u00a0dané zemi je u\u00a0tří ze čtyř otázek volitelná, takže je tam nově schovaná za jedním řádkem se jménem vybrané země; u\u00a0otázky Z\u00a0minulosti do dneška, která ji potřebuje, zůstává na očích. Výchozí čísla jsou označená jako ukázka, tlačítko Obnovit výchozí je nahoře a\u00a0graf je na telefonu nižší.',
          mr: 'महागाई कॅल्क्युलेटरमध्ये उत्तर आता तुम्ही भरलेल्या आकड्यांच्या अधिक जवळ दिसते. चारपैकी तीन प्रश्नांमध्ये देशाचा महागाईचा इतिहास ऐच्छिक आहे, म्हणून तिथे तो आता एका ओळीमागे आहे आणि त्या ओळीवर निवडलेल्या देशाचे नाव असते; भूतकाळापासून आजपर्यंत या प्रश्नात, जिथे त्याची गरज असते, तो समोरच राहतो. सुरुवातीच्या आकड्यांवर ते उदाहरण असल्याचे लिहिले आहे, पूर्वनिश्चित मूल्ये परत आणा हे बटण आता सर्वात वर आहे, आणि फोनवर आलेख लहान आहे.',
        },
      },
      {
        id: 'net-worth-example-and-labels',
        text: {
          en: 'The net worth calculator starts with one row instead of two, and on a phone every box in a row has its name above it. Before you type anything, it says what the result will show, and "See an example" fills in sample rows you can clear in one tap. The save and share buttons appear once there is a result, and the two CSV buttons sit together under "Import or save rows".',
          hi: 'शुद्ध संपत्ति कैलकुलेटर अब दो की जगह एक पंक्ति से शुरू होता है, और फ़ोन पर पंक्ति के हर खाने के ऊपर उसका नाम लिखा है। कुछ भी भरने से पहले यह बताता है कि नतीजे में क्या दिखेगा, और "एक उदाहरण देखें" से नमूने की पंक्तियाँ भर जाती हैं, जो एक टैप में हट जाती हैं। सेव और शेयर के बटन नतीजा आने पर दिखते हैं, और CSV के दोनों बटन "पंक्तियाँ इंपोर्ट या सेव करें" के नीचे साथ रखे हैं।',
          es: 'La calculadora de patrimonio neto empieza con una fila en lugar de dos, y en el móvil cada casilla de una fila lleva su nombre encima. Antes de que escribas nada, dice qué mostrará el resultado, y «Ver un ejemplo» rellena filas de muestra que se quitan con un toque. Los botones para guardar y compartir aparecen cuando hay un resultado, y los dos botones de CSV están juntos en «Importar o guardar filas».',
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
          cs: 'Tlačítka v\u00a0pěti bezplatných nástrojích teď vypadají a\u00a0chovají se stejně: jedna velikost, jeden tvar, popisky, které se zalomí, místo aby se uřízly, a\u00a0zřetelný rámeček, když se na ně dostanete klávesnicí. Sdílení, export, přidání řádku a\u00a0nahrání souboru mají modrý obrys a\u00a0obnovení je nenápadné textové tlačítko. Dříve byla stejná akce v\u00a0jednom nástroji modrá a\u00a0v\u00a0dalším tyrkysová. Stejná tlačítka teď používá i\u00a0zbytek webu: hlavní tlačítko stránky je vyplněné modře, dříve bylo tyrkysové.',
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
          cs: 'Pokud je ve vašem prohlížeči JavaScript vypnutý nebo blokovaný, formuláře pro čekací listinu a\u00a0newsletter teď říkají, že je k\u00a0přihlášení potřeba, a\u00a0uvádějí adresu, na kterou lze napsat. Dříve se po stisku tlačítka stránka načetla znovu s\u00a0vaším e-mailem v\u00a0adrese a\u00a0nikdo přihlášen nebyl; e-mail se tam už nedostane. Když je JavaScript vypnutý, pět bezplatných nástrojů teď vysvětluje, že se ukázková čísla při zadávání nezmění.',
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
          hi: 'साइट अपने बारे में जो कहती है, उसमें दो सुधार हुए हैं। मोंटे कार्लो और निवेश या कर्ज़ चुकाना वाले पेज कहते थे कि प्लानर आपकी पूरी तस्वीर पर ये हिसाब पहले से करता है; प्लानर अभी बन रहा है, और अब वे पंक्तियाँ बताती हैं कि वह किस काम के लिए बनाया जा रहा है। और प्राइवेसी चेंजलॉग की तीन एंट्री की तारीख एक दिन आगे-पीछे थी और कैसे करें सेक्शन की कोई एंट्री नहीं थी; तारीखें ठीक कर दी गई हैं और सेक्शन दर्ज हो गया है।',
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
          cs: 'Srovnání úvěrů, které sdílíte, teď dorazí tak, jak jste ho nechali. Když jste nějaké pole vymazali, například poplatek u\u00a0nabídky, odkaz do něj dříve vrátil výchozí hodnotu, takže ten, kdo ho otevřel, viděl jiné srovnání; totéž se stalo na vaší obrazovce při přepnutí jazyka. Vymazané pole teď zůstane prázdné.',
          mr: 'तुम्ही शेअर केलेली कर्जांची तुलना आता तुम्ही ठेवली होती तशीच पोहोचते. तुम्ही एखादी चौकट रिकामी केली असेल, उदा. एखाद्या ऑफरचे शुल्क, तर लिंक आधी सुरुवातीचा आकडा परत भरायची, आणि लिंक उघडणाऱ्याला वेगळी तुलना दिसायची; भाषा बदलल्यावर तुमच्या स्वतःच्या स्क्रीनवरही तेच व्हायचे. रिकामी केलेली चौकट आता रिकामीच राहते.',
        },
      },
      {
        id: 'tools-send-less',
        text: {
          en: 'The free tools now send a little less. The loan comparison no longer reports how many months you chose for the time horizon, only that you changed it, and when exchange rates fail to load, the net worth calculator reports one of a few fixed reasons instead of the browser’s own error text. A link someone shares with you can now only set a currency the tools offer, a number, or a name of ordinary length. The privacy notice now lists every event the loan comparison and the net worth calculator send. And when a lesson email cannot be sent, the record of that now holds one of a few fixed reasons instead of the mail service’s own message, which could quote an address.',
          hi: 'मुफ़्त टूल अब थोड़ी कम जानकारी भेजते हैं। लोन तुलना अब यह नहीं बताती कि समय-सीमा के लिए कितने महीने चुने गए, सिर्फ़ यह कि उसे बदला गया। विनिमय दरें लोड न हो पाएँ, तो शुद्ध संपत्ति कैलकुलेटर ब्राउज़र के अपने एरर संदेश की जगह कुछ तय कारणों में से एक बताता है। किसी के भेजे लिंक से अब सिर्फ़ वही मुद्रा चुनी जा सकती है जो टूल में मौजूद है, और उसमें सिर्फ़ संख्या या सामान्य लंबाई का नाम आ सकता है। प्राइवेसी नोटिस में अब लोन तुलना और शुद्ध संपत्ति कैलकुलेटर की भेजी हर घटना की सूची है। और जब पाठ का ईमेल भेजा नहीं जा पाता, तो उसके रिकॉर्ड में अब मेल सेवा के अपने संदेश की जगह कुछ तय कारणों में से एक रहता है; उस संदेश में ईमेल पता आ सकता था।',
          es: 'Las herramientas gratuitas envían ahora un poco menos. El comparador de préstamos ya no informa de cuántos meses elegiste como horizonte, solo de que lo cambiaste, y cuando los tipos de cambio no se cargan, la calculadora de patrimonio neto informa de uno de unos pocos motivos fijos en lugar del texto de error del navegador. Un enlace que alguien comparta contigo solo puede fijar una moneda que las herramientas ofrecen, un número o un nombre de longitud normal. El aviso de privacidad enumera ahora todos los eventos que envían el comparador de préstamos y la calculadora de patrimonio neto. Y cuando un correo con una lección no puede enviarse, el registro de ese fallo guarda ahora uno de unos pocos motivos fijos en lugar del mensaje del servicio de correo, que podía citar una dirección.',
          cs: 'Bezplatné nástroje teď odesílají o\u00a0něco méně. Srovnání úvěrů už nehlásí, kolik měsíců jste zvolili jako časový horizont, jen to, že jste ho změnili. Když se nepodaří načíst kurzy, kalkulačka čistého jmění hlásí jeden z\u00a0několika pevných důvodů místo chybového textu prohlížeče. Odkaz, který vám někdo pošle, může nastavit jen měnu, kterou nástroje nabízejí, číslo nebo název běžné délky. Zásady ochrany soukromí teď vyjmenovávají všechny události, které srovnání úvěrů a\u00a0kalkulačka čistého jmění odesílají. A\u00a0když se e-mail s\u00a0lekcí nepodaří odeslat, záznam o\u00a0tom teď obsahuje jeden z\u00a0několika pevných důvodů místo vlastní zprávy poštovní služby, která mohla citovat adresu.',
          mr: 'मोफत साधने आता थोडी कमी माहिती पाठवतात. कर्जांची तुलना आता कालावधीसाठी किती महिने निवडले ते कळवत नाही, फक्त तो बदलला एवढेच. विनिमय दर लोड झाले नाहीत, तर निव्वळ संपत्ती कॅल्क्युलेटर ब्राउझरच्या स्वतःच्या एरर संदेशाऐवजी काही ठरावीक कारणांपैकी एक कळवतो. कोणी पाठवलेल्या लिंकमधून आता फक्त साधनांत उपलब्ध असलेले चलन, संख्या किंवा नेहमीच्या लांबीचे नाव येऊ शकते. गोपनीयता सूचनेत आता कर्जांची तुलना आणि निव्वळ संपत्ती कॅल्क्युलेटर पाठवत असलेल्या प्रत्येक घटनेची यादी आहे. आणि धड्याचा ईमेल पाठवता आला नाही, तर त्याच्या नोंदीत आता मेल सेवेच्या स्वतःच्या संदेशाऐवजी काही ठरावीक कारणांपैकी एक राहते; त्या संदेशात ईमेल पत्ता येऊ शकत होता.',
        },
      },
      {
        id: 'loan-points-row',
        text: {
          en: 'In the loan comparison, the line about discount points now tells a saving from a loss. When a loan ends before the points have paid for themselves it says how much more they cost, where it used to print that amount as a saving. And for a loan entered by its monthly payment, where points shorten the loan and do not lower the payment, it now gives the month they pay for themselves, not “never”.',
          hi: 'लोन की तुलना में डिस्काउंट पॉइंट्स वाली पंक्ति अब बचत और नुकसान में फ़र्क बताती है। जब लोन पॉइंट्स की लागत निकलने से पहले खत्म हो जाता है, तो वह बताती है कि वे कितने ज़्यादा महँगे पड़े; पहले वही रकम बचत के रूप में दिखती थी। और मासिक किस्त से भरे गए लोन में, जहाँ पॉइंट्स किस्त नहीं घटाते बल्कि लोन छोटा करते हैं, अब वह महीना दिखता है जब उनकी लागत निकल जाती है, “कभी नहीं” की जगह।',
          es: 'En el comparador de préstamos, la línea sobre los puntos de descuento distingue ahora un ahorro de una pérdida. Cuando el préstamo termina antes de que los puntos se recuperen, dice cuánto más cuestan; antes mostraba esa cantidad como un ahorro. Y en un préstamo introducido por su cuota mensual, donde los puntos acortan el préstamo y no bajan la cuota, ahora da el mes en que se recuperan, no «nunca».',
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
          hi: 'शुद्ध संपत्ति कैलकुलेटर अब बताता है कि कौन सी रकम वह पढ़ नहीं सका। मुद्रा के चिह्न, ऋण चिह्न या शब्दों के साथ लिखी रकम पहले बिना कुछ कहे कुल जोड़ से बाहर रह जाती थी; अब उस बॉक्स पर निशान लगता है, एक पंक्ति बताती है कि कितनी पंक्तियाँ नहीं गिनी गईं, और जो CSV फ़ाइल पूरी नहीं पढ़ी जा सकी, उसकी न पढ़ी गई लाइनों की सूची बनी रहती है। सेमीकोलन या टैब वाली CSV फ़ाइलें अब लोड होती हैं, और जिस किस्म को टूल नहीं जानता वह अब गलती मानी जाती है, संपत्ति नहीं।',
          es: 'La calculadora de patrimonio neto avisa ahora cuando no puede leer una cantidad. Una cantidad escrita con un símbolo de moneda, un signo menos o palabras quedaba antes fuera del total sin aviso; ahora la casilla se marca, una línea dice cuántas filas no se cuentan, y un archivo CSV que solo se leyó en parte conserva la lista de las líneas que fallaron. Los archivos CSV con punto y coma o tabuladores, como los guarda una hoja de cálculo en español o en checo, ya se cargan, y un tipo que la herramienta no conoce es un error, no un activo.',
          cs: 'Kalkulačka čistého jmění teď řekne, když částku nedokáže přečíst. Částka napsaná se znakem měny, s\u00a0minusem nebo se slovy dříve bez upozornění vypadla ze součtu; teď se pole označí, řádek nad tabulkou říká, kolik řádků se nezapočítává, a\u00a0u\u00a0souboru CSV, který se přečetl jen zčásti, zůstane seznam řádků, které se nepovedly. Soubory CSV se středníky nebo tabulátory, jak je ukládá tabulkový procesor ve španělštině nebo češtině, se teď načtou a\u00a0typ, který nástroj nezná, je chyba, ne aktivum.',
          mr: 'निव्वळ संपत्ती कॅल्क्युलेटर आता एखादी रक्कम वाचता आली नाही तर तसे सांगतो. चलनाचे चिन्ह, वजा चिन्ह किंवा शब्दांसह लिहिलेली रक्कम आधी काहीही न सांगता एकूण बेरजेतून वगळली जायची; आता त्या चौकटीवर खूण येते, किती ओळी मोजलेल्या नाहीत हे एक ओळ सांगते, आणि जी CSV\u00a0फाइल अर्धवट वाचली गेली तिच्या न वाचलेल्या ओळींची यादी तशीच राहते. अर्धविराम किंवा टॅब असलेल्या CSV\u00a0फाइल्स आता लोड होतात, आणि साधनाला माहीत नसलेला प्रकार आता चूक मानला जातो, मालमत्ता नाही.',
        },
      },
      {
        id: 'loan-optional-boxes-errors',
        text: {
          en: 'In the loan comparison, an optional box that cannot be read is now an error. A fee typed as “€2,500”, an extra payment typed with words or a lump sum in the wrong form used to count as zero without a word, which could make an offer look free of fees; now the box is marked and the offer shows no result until it is fixed or cleared.',
          hi: 'लोन की तुलना में अब वह वैकल्पिक बॉक्स गलती माना जाता है जिसे पढ़ा नहीं जा सकता। “€2,500” की तरह लिखा शुल्क, शब्दों के साथ लिखी अतिरिक्त किस्त या गलत रूप में लिखी एकमुश्त रकम पहले बिना कुछ कहे शून्य गिनी जाती थी, जिससे कोई ऑफ़र बिना शुल्क का दिख सकता था; अब उस बॉक्स पर निशान लगता है और उसे ठीक या खाली करने तक ऑफ़र का नतीजा नहीं दिखता।',
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
          hi: 'लोन की तुलना में अब लोन उसी अवधि पर खत्म होता है जो आप लिखते हैं। पहले लगभग आधे मामलों में 30 साल का लोन 30 साल 1 महीने का दिखता था, कुछ पैसों की 361वीं किस्त के साथ; अब वे पैसे आखिरी किस्त में जुड़ते हैं, जैसा लोन देने वाले करते हैं।',
          es: 'El comparador de préstamos termina ahora el préstamo en el plazo que escribes. Antes, en cerca de la mitad de los casos, un préstamo a 30 años aparecía como de 30 años y 1 mes, con una cuota número 361 de unos céntimos; ahora esos céntimos forman parte de la última cuota, como haría una entidad financiera.',
          cs: 'Srovnání úvěrů teď úvěr ukončí přesně po době, kterou zadáte. Dříve se zhruba v\u00a0polovině případů třicetiletý úvěr zobrazil jako 30 let a\u00a01 měsíc, s\u00a0361. splátkou ve výši několika haléřů; ty jsou teď součástí poslední splátky, jak to dělají poskytovatelé.',
          mr: 'कर्जांची तुलना आता तुम्ही लिहिलेल्या मुदतीवरच कर्ज संपवते. आधी साधारण निम्म्या वेळा 30 वर्षांचे कर्ज 30 वर्षे 1 महिना असे दिसायचे, काही पैशांच्या 361 व्या हप्त्यासह; आता ते पैसे शेवटच्या हप्त्यात धरले जातात, जसे कर्जदाते करतात.',
        },
      },
      {
        id: 'privacy-notice-wording-nov-10',
        text: {
          en: 'A few corrections to the privacy notice’s wording: it quoted a home page heading that has since been renamed, and some sentences in Hindi, Spanish and Czech had drifted from the English. The net worth calculator’s page now says, as the notice does, that exchange rates are fetched when the page opens and again if you change your spending currency. Nothing about what is collected changes.',
          hi: 'प्राइवेसी नोटिस के शब्दों में कुछ सुधार हुए हैं: उसमें होम पेज के एक शीर्षक का ज़िक्र था जिसका नाम बदल चुका है, और हिंदी, स्पैनिश और चेक के कुछ वाक्य अंग्रेज़ी से थोड़े अलग हो गए थे। शुद्ध संपत्ति कैलकुलेटर का पेज अब वही कहता है जो नोटिस कहता है: विनिमय दरें पेज खुलने पर लाई जाती हैं, और खर्च की मुद्रा बदलने पर दोबारा। जो जानकारी इकट्ठा होती है, उसमें कोई बदलाव नहीं है।',
          es: 'Algunas correcciones en la redacción del aviso de privacidad: citaba un título de la página de inicio que ya tiene otro nombre, y algunas frases en hindi, español y checo se habían apartado del inglés. La página de la calculadora de patrimonio neto dice ahora, como el aviso, que los tipos de cambio se consultan al abrir la página y otra vez si cambias la moneda de tus gastos. No cambia nada de lo que se recoge.',
          cs: 'Několik oprav ve znění zásad ochrany soukromí: citovaly nadpis z\u00a0úvodní stránky, který se mezitím přejmenoval, a\u00a0některé věty v\u00a0hindštině, španělštině a\u00a0češtině se odchýlily od angličtiny. Stránka kalkulačky čistého jmění teď říká totéž co zásady: kurzy se stahují při otevření stránky a\u00a0znovu, pokud změníte měnu svých výdajů. Na tom, co se sbírá, se nic nemění.',
          mr: 'गोपनीयता सूचनेच्या शब्दांत काही दुरुस्त्या झाल्या आहेत: तिच्यात मुख्यपृष्ठावरील एका शीर्षकाचा उल्लेख होता, ज्याचे नाव आता बदलले आहे, आणि हिंदी, स्पॅनिश आणि चेकमधील काही वाक्ये इंग्रजीपासून थोडी वेगळी झाली होती. निव्वळ संपत्ती कॅल्क्युलेटरचे पान आता सूचनेप्रमाणेच सांगते: विनिमय दर पान उघडल्यावर आणले जातात, आणि खर्चाचे चलन बदलल्यावर पुन्हा. जी माहिती गोळा होते, त्यात काहीही बदल नाही.',
        },
      },
      {
        id: 'how-to-guides',
        text: {
          en: 'There’s a new How-to section: short guides that each answer one everyday money question, with the answer first, then what to check, and a link to the full lesson. The first ones cover getting through the month, debts and loans, taking stock of your accounts and net worth, sending money abroad, and checking whether a message or a website is genuine. At the top of the learning path you can now choose between starting from the first lesson and a guide for one question. The How-to page has its own search, which also understands some everyday words in Hindi, Spanish, Czech and Marathi. Search on the learning path now also understands whole questions and everyday words like “credit card”, and finds the guides too.',
          hi: 'अब कैसे करें नाम का एक नया सेक्शन है: छोटी गाइडें, जिनमें से हर एक पैसों से जुड़े रोज़ के एक सवाल का जवाब देती है। पहले जवाब, फिर यह कि क्या जाँचना है, और पूरे पाठ का लिंक। पहली गाइडें महीना निकालने, कर्ज़ और लोन, अपने खातों और नेट वर्थ का हिसाब, विदेश पैसे भेजने, और किसी मैसेज या वेबसाइट के असली होने की जाँच के बारे में हैं। सीखने के रास्ते में सबसे ऊपर अब आप चुन सकते हैं: पहले पाठ से शुरुआत, या एक सवाल के लिए गाइड। कैसे करें पेज की अपनी खोज है, जो हिंदी के रोज़ के कुछ शब्द भी समझती है। गाइडें अंग्रेज़ी में हैं। सीखने के रास्ते की खोज, जो अंग्रेज़ी में काम करती है, अब पूरे सवाल और रोज़ के शब्द भी समझती है, और गाइडें भी ढूँढ़ती है।',
          es: 'Hay una nueva sección, Cómo hacerlo: guías breves que responden cada una a una pregunta de dinero de todos los días, con la respuesta primero, luego qué comprobar y un enlace a la lección completa. Las primeras tratan de llegar a fin de mes, deudas y préstamos, hacer balance de tus cuentas y tu patrimonio neto, enviar dinero al extranjero y comprobar si un mensaje o una web son auténticos. Al principio de la ruta de aprendizaje ahora puedes elegir entre empezar por la primera lección o buscar una guía para una sola pregunta. La página Cómo hacerlo tiene su propio buscador, que también entiende algunas palabras cotidianas en español. Las guías están en inglés. La búsqueda de la ruta de aprendizaje, que funciona en inglés, entiende ahora preguntas completas y palabras cotidianas, y también encuentra las guías.',
          cs: 'Přibyla nová sekce Jak na to: krátké návody, z\u00a0nichž každý odpovídá na jednu běžnou otázku o\u00a0penězích. Nejdřív odpověď, pak co si ověřit a\u00a0odkaz na celou lekci. První návody se týkají toho, jak vyjít do výplaty, dluhů a\u00a0půjček, přehledu o\u00a0účtech a\u00a0čistém jmění, posílání peněz do zahraničí a\u00a0ověření pravosti zprávy nebo webu. Na začátku vzdělávací cesty si teď můžete vybrat: začít první lekcí, nebo návodem na jednu otázku. Stránka Jak na to má vlastní vyhledávání, které rozumí i\u00a0některým běžným českým slovům. Návody jsou v\u00a0angličtině. Vyhledávání na vzdělávací cestě, které funguje v\u00a0angličtině, teď rozumí i\u00a0celým otázkám a\u00a0běžným slovům a\u00a0najde i\u00a0návody.',
          mr: 'आता कसे करायचे नावाचा नवा विभाग आहे: छोट्या मार्गदर्शिका, ज्यांतील प्रत्येक पैशांशी संबंधित रोजच्या एका प्रश्नाचे उत्तर देते. आधी उत्तर, मग काय तपासायचे, आणि पूर्ण धड्याची लिंक. पहिल्या मार्गदर्शिका महिना निभवणे, कर्जे आणि लोन, तुमची खाती आणि निव्वळ संपत्ती यांचा आढावा, परदेशात पैसे पाठवणे, आणि एखादा संदेश खरा आहे का किंवा एखादी वेबसाइट खरी आहे का हे तपासणे यांबद्दल आहेत. शिकण्याच्या मार्गाच्या सुरुवातीला आता तुम्ही निवडू शकता: पहिल्या धड्यापासून सुरुवात, किंवा एका प्रश्नासाठी मार्गदर्शिका. ‘कसे करायचे’ या पानावर स्वतंत्र शोधाची सोय आहे, ज्यात मराठीतील रोजचे काही शब्द लिहूनही मार्गदर्शिका शोधता येतात. मार्गदर्शिका इंग्रजीत आहेत. शिकण्याच्या मार्गावरील शोध, जो इंग्रजीत चालतो, आता पूर्ण प्रश्न आणि रोजचे शब्दही समजतो, आणि मार्गदर्शिकाही शोधतो.',
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
          hi: 'प्राइवेसी नोटिस अब उन समीक्षा शीटों के बारे में बताता है जिनमें अनुवाद करने वाले स्वयंसेवक काम करेंगे: उनमें क्या रहता है, कौन क्या देख सकता है, और वह कितने समय तक रखा जाता है।',
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
          hi: 'तीन पाठ अब एक कदम आगे जाते हैं। निवेश की बुनियादी बातों वाला पाठ अब बताता है कि फंड क्या होता है और अलग-अलग देशों में फंड को क्या कहते हैं, म्यूचुअल फंड से लेकर इंडोनेशिया के रेक्सा दाना तक। कई मुद्राओं में पैसे वाला पाठ अब दिखाता है कि ज़्यादा महँगाई से मुद्रा अक्सर कमज़ोर क्यों होती है, 2005 से 2024 तक अमेरिकी डॉलर के मुकाबले सात मुद्राओं के उदाहरण के साथ, और यह रुझान कहाँ लागू नहीं होता। लक्ष्य तय करने वाले पाठ में अब शुरुआत के पास एक हिस्सा है कि पैसा कमाने की क्या कीमत चुकानी पड़ती है और वह किसलिए है।',
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
          hi: 'प्राइवेसी नोटिस अब बताता है कि कौन-से पेज कोई एनालिटिक्स नहीं भेजते: छोटे लिंक, जो आपको किसी दूसरे पेज पर भेज देते हैं, और कार्यक्रमों के लिए QR कोड बनाने का एक अंदरूनी पेज, जो कहीं सूचीबद्ध नहीं है।',
          es: 'El aviso de privacidad dice ahora qué páginas no envían ninguna analítica: los enlaces cortos que te llevan a otra página y una página interna, sin enlaces desde el sitio, que uso para crear códigos QR para eventos.',
          cs: 'Zásady ochrany soukromí teď uvádějí, které stránky neodesílají žádnou webovou analytiku: krátké odkazy, které vás přesměrují na jinou stránku, a neveřejná stránka pro tvorbu QR kódů na akce.',
          mr: 'गोपनीयता सूचनेत आता सांगितले आहे की कोणती पाने वापराचे विश्लेषण अजिबात पाठवत नाहीत: तुम्हाला दुसऱ्या पानावर पाठवणाऱ्या छोट्या लिंक, आणि कार्यक्रमांसाठी QR कोड बनवण्याचे, कुठेही न दाखवलेले एक अंतर्गत पान.',
        },
      },
      {
        id: 'building-lessons-more-countries',
        text: {
          en: 'The sixteen lessons on building your finances now say more about how the rules differ by country, such as public pensions, fees for repaying a loan early, minimum deposits and crypto taxes. A few figures are corrected too, including the table of historical stock returns in the lesson on risk.',
          es: 'Las dieciséis lecciones para construir tus finanzas explican ahora mejor cómo cambian las reglas de un país a otro, por ejemplo las pensiones públicas, las penalizaciones por pago anticipado de un préstamo, la entrada mínima para una vivienda y los impuestos sobre las criptomonedas. También se han corregido algunas cifras, entre ellas la tabla de rentabilidades históricas de las acciones en la lección sobre el riesgo.',
          cs: 'Šestnáct lekcí o budování vlastních financí teď víc vysvětluje, jak se pravidla liší podle země, například státní důchody, poplatky za předčasné splacení úvěru, minimální vlastní zdroje na hypotéku a daně z kryptoměn. Opravena je také řada čísel, mimo jiné tabulka historických výnosů akcií v lekci o riziku.',
          mr: 'आर्थिक पाया घडवण्यावरील सोळा धडे आता नियम देशानुसार कसे बदलतात हे अधिक सांगतात, जसे सरकारी पेन्शन, कर्जाच्या मुदतपूर्व परतफेडीवरील दंड, घरासाठी किमान डाउन पेमेंट आणि क्रिप्टोवरील कर. काही आकडेही दुरुस्त केले आहेत, त्यात जोखमीवरील धड्यातील शेअर्सच्या ऐतिहासिक परताव्याची तालिकाही आहे.',
          hi: 'अपनी वित्तीय नींव बनाने वाले सोलह पाठ अब ज़्यादा बताते हैं कि नियम देश के हिसाब से कैसे बदलते हैं, जैसे सरकारी पेंशन, कर्ज़ के समय से पहले भुगतान पर लगने वाली फ़ीस, घर के लिए न्यूनतम डाउन पेमेंट और क्रिप्टो पर टैक्स। कुछ आँकड़े भी सुधारे गए हैं, जिनमें जोखिम वाले पाठ में शेयरों के ऐतिहासिक रिटर्न की तालिका भी है।',
        },
      },
      {
        id: 'psychology-lessons-evidence',
        text: {
          en: 'The ten psychology lessons now say more about the evidence behind their claims and where it stops, and less about what you should do. The lesson on building an anti-bias financial life now notes where the law already makes retirement saving automatic or compulsory, as in the UK, New Zealand and Australia.',
          es: 'Las diez lecciones de psicología dicen ahora más sobre las pruebas en las que se basan y sus límites, y menos sobre lo que deberías hacer. La lección sobre cómo construir una vida financiera a prueba de sesgos indica ahora dónde la ley ya hace automático u obligatorio el ahorro para la jubilación, como en el Reino Unido, Nueva Zelanda y Australia.',
          cs: 'Deset lekcí o psychologii teď víc říká o tom, o jaké důkazy se opírají a kde tyto důkazy končí, a méně o tom, co byste měli dělat. Lekce o tom, jak si zařídit finance odolné vůči zkreslením, teď zmiňuje, kde už zákon dělá spoření na důchod automatickým nebo povinným, například ve Spojeném království, na Novém Zélandu a v Austrálii.',
          mr: 'मानसशास्त्रावरील दहा धडे आता त्यांच्या दाव्यांमागील पुराव्यांबद्दल आणि त्या पुराव्यांच्या मर्यादांबद्दल अधिक सांगतात, आणि तुम्ही काय करावे हे कमी सांगतात. पूर्वग्रहांपासून सुरक्षित आर्थिक आयुष्य घडवण्याच्या धड्यात आता हेही नमूद केले आहे की कुठे कायद्यानेच निवृत्तीची बचत आपोआप किंवा सक्तीची होते, जसे युनायटेड किंगडम, न्यूझीलंड आणि ऑस्ट्रेलियामध्ये.',
          hi: 'मनोविज्ञान के दस पाठ अब अपने दावों के पीछे के सबूतों और उनकी सीमाओं के बारे में ज़्यादा बताते हैं, और यह कम कहते हैं कि आपको क्या करना चाहिए। पूर्वाग्रहों (bias) से बचाने वाली वित्तीय ज़िंदगी बनाने वाले पाठ में अब यह भी लिखा है कि कहाँ क़ानून ही रिटायरमेंट की बचत को अपने-आप होने वाली या अनिवार्य बना देता है, जैसे यूनाइटेड किंगडम, न्यूज़ीलैंड और ऑस्ट्रेलिया में।',
        },
      },
      {
        id: 'beginner-lessons-more-countries',
        text: {
          en: 'The 16 beginner lessons now explain how things differ between countries where the rules change the answer: when retirement savings can be reached early, how unemployment benefits change the size of an emergency fund, how student loans are repaid, how health cover works, and what inflation far above 2% does to cash. I also fixed a chart in the snowball and avalanche lesson that showed the wrong months.',
          es: 'Las 16 lecciones para principiantes explican ahora en qué se diferencian los países cuando las normas cambian la respuesta: cuándo se puede sacar antes el ahorro para la jubilación, cómo el subsidio de desempleo cambia el tamaño del fondo de emergencia, cómo se devuelven los préstamos de estudios, cómo funciona la cobertura sanitaria y qué le hace al efectivo una inflación muy por encima del 2 %. También corregí un gráfico de la lección sobre los métodos bola de nieve y avalancha que mostraba meses equivocados.',
          cs: 'Šestnáct lekcí pro začátečníky teď vysvětluje, v čem se země liší tam, kde pravidla mění odpověď: kdy se dá k penězům na důchod dostat dřív, jak podpora v nezaměstnanosti mění velikost finanční rezervy, jak se splácejí studentské půjčky, jak funguje zdravotní pojištění a co s hotovostí udělá inflace vysoko nad 2 %. Opravený je také graf v lekci o metodách sněhové koule a laviny, který ukazoval špatné měsíce.',
          mr: 'नवशिक्यांसाठीच्या 16 धड्यांमध्ये आता, जिथे नियमांमुळे उत्तर बदलते तिथे देशांनुसार गोष्टी कशा वेगळ्या असतात हे सांगितले आहे: निवृत्तीची बचत लवकर काढता येते की नाही, बेरोजगारी भत्त्यामुळे आपत्कालीन निधीचा आकार कसा बदलतो, विद्यार्थी कर्ज कसे फेडले जाते, आरोग्य विमा कसा चालतो, आणि 2 टक्क्यांपेक्षा खूप जास्त महागाई रोख रकमेचे काय करते. स्नोबॉल आणि ॲव्हलांच पद्धतींच्या धड्यातील एका आलेखात चुकीचे महिने दाखवले होते; तोही दुरुस्त केला आहे.',
          hi: 'शुरुआती 16 पाठों में अब यह भी बताया गया है कि जहाँ नियम जवाब बदल देते हैं, वहाँ अलग-अलग देशों में चीज़ें कैसे अलग होती हैं: रिटायरमेंट की बचत जल्दी निकाली जा सकती है या नहीं, बेरोज़गारी भत्ता आपातकालीन कोष (emergency fund) का आकार कैसे बदलता है, स्टूडेंट लोन कैसे चुकाया जाता है, स्वास्थ्य बीमा कैसे काम करता है, और 2% से कहीं ज़्यादा महँगाई नकदी के साथ क्या करती है। स्नोबॉल और एवलांच वाले पाठ का एक चार्ट गलत महीने दिखा रहा था; उसे भी ठीक कर दिया गया है।',
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
          hi: 'पेज के सबसे ऊपर, nidhi नाम के नीचे, अब पेज की भाषा में टैगलाइन दिखती है। फ़ोन पर यह पेज के ऊपरी हिस्से के ठीक नीचे अलग पंक्ति में आती है। हिंदी की टैगलाइन नई है: “पैसे की समझ, एकदम सहज”।',
          es: 'La cabecera muestra ahora el lema de nidhi debajo del nombre, en el idioma de la página: «El dinero, entendido». En el móvil va en su propia línea, justo debajo de la cabecera.',
          cs: 'V záhlaví je teď pod jménem nidhi heslo v jazyce stránky: „Peníze srozumitelně“. Na telefonu má vlastní řádek hned pod záhlavím.',
          mr: 'पानाच्या सर्वात वर, nidhi या नावाखाली, आता पानाच्या भाषेत टॅगलाइन दिसते. फोनवर ती पानाच्या वरच्या भागाच्या अगदी खाली वेगळ्या ओळीत येते. मराठी टॅगलाइन नवीन आहे: “पैशाची समज, एकदम सहज”.',
        },
      },
      {
        id: 'shared-cookie-answer',
        text: {
          en: 'Your cookie-banner answer now covers the planner at app.nidhi.today too, unless your browser blocks cookies. While checking this, I found two mistakes of my own: the site kept a random visitor ID in your browser even after "No thanks", and subscribing to the newsletter linked your pageviews to a code made from your email, whatever you had answered. Both are fixed. Without your yes, no analytics ID is stored in your browser, and your pageviews aren’t linked to each other or to your email code. The privacy notice explains the details.',
          hi: 'कुकी बैनर पर आपका जवाब अब app.nidhi.today पर प्लानर में भी लागू होता है, बशर्ते आपका ब्राउज़र कुकी ब्लॉक न करे। इसे जाँचते हुए मुझे अपनी दो गलतियाँ मिलीं: “नहीं, धन्यवाद” के बाद भी साइट आपके ब्राउज़र में एक रैंडम विज़िटर ID रखती थी, और न्यूज़लेटर सब्सक्राइब करने पर आपके पेज-व्यू आपके ईमेल से बने एक कोड से जुड़ जाते थे, चाहे आपका जवाब कुछ भी रहा हो। दोनों ठीक कर दी गई हैं। आपकी हाँ के बिना आपके ब्राउज़र में कोई एनालिटिक्स ID जमा नहीं होती और आपके पेज-व्यू न आपस में जुड़ते हैं, न आपके ईमेल वाले कोड से। प्राइवेसी नोटिस में पूरी जानकारी है।',
          es: 'Tu respuesta en el aviso de cookies ahora vale también en el planificador de app.nidhi.today, salvo que tu navegador bloquee las cookies. Al revisarlo encontré dos errores míos: el sitio guardaba un ID de visitante aleatorio en tu navegador incluso después de «No, gracias», y suscribirte al boletín enlazaba tus páginas vistas con un código creado a partir de tu correo, respondieras lo que respondieras. Los dos están corregidos. Sin tu sí, no se guarda ningún ID de analítica en tu navegador y tus páginas vistas no se enlazan entre sí ni con el código de tu correo. El aviso de privacidad lo explica en detalle.',
          cs: 'Vaše odpověď na cookie liště teď platí i v plánovači na app.nidhi.today, pokud váš prohlížeč neblokuje cookies. Při kontrole se ukázaly dvě moje vlastní chyby: web ukládal do vašeho prohlížeče náhodné ID návštěvníka i po „Ne, děkuji“ a přihlášení k newsletteru propojilo zobrazení stránek s kódem vytvořeným z vašeho e-mailu bez ohledu na vaši odpověď. Obojí je opravené. Bez vašeho souhlasu se do prohlížeče neukládá žádné analytické ID a zobrazení stránek se nepropojují mezi sebou ani s kódem z vašeho e-mailu. Podrobnosti vysvětlují zásady ochrany soukromí.',
          mr: 'कुकी सूचनेवरील तुमचे उत्तर आता app.nidhi.today वरील प्लॅनरमध्येही लागू होते, जोपर्यंत तुमचा ब्राउझर कुकी ब्लॉक करत नाही. हे तपासताना माझ्या स्वतःच्या दोन चुका सापडल्या: “नको, धन्यवाद” नंतरही साइट तुमच्या ब्राउझरमध्ये एक यादृच्छिक व्हिजिटर ID ठेवत होती, आणि न्यूजलेटरचे सदस्य झाल्यावर तुमचे पेजव्ह्यू तुमच्या ईमेलपासून बनवलेल्या एका कोडशी जोडले जात होते, तुमचे उत्तर काहीही असले तरी. दोन्ही दुरुस्त केल्या आहेत. तुमच्या होकाराशिवाय तुमच्या ब्राउझरमध्ये कोणताही ॲनालिटिक्स ID साठवला जात नाही आणि तुमचे पेजव्ह्यू एकमेकांशी किंवा तुमच्या ईमेलच्या कोडशी जोडले जात नाहीत. गोपनीयता सूचनेत सविस्तर माहिती आहे.',
        },
      },
      {
        id: 'beta-waiting-count',
        text: {
          en: 'The waitlist box now says how many people are waiting for a beta invite, from the very first person, and the number includes volunteers who asked for a beta invite on the volunteer form. Small numbers are exact; larger ones are rounded down, like "25+".',
          hi: 'वेटलिस्ट बॉक्स अब पहले व्यक्ति से ही बताता है कि कितने लोग बीटा निमंत्रण का इंतज़ार कर रहे हैं, और इस संख्या में वे स्वयंसेवक भी गिने जाते हैं जिन्होंने स्वयंसेवक फ़ॉर्म पर बीटा निमंत्रण माँगा है। छोटी संख्याएँ बिल्कुल सही दिखती हैं; बड़ी संख्याएँ नीचे की ओर पूर्णांकित होती हैं, जैसे "25+"।',
          es: 'El cuadro de la lista de espera ahora dice cuántas personas esperan una invitación a la beta, desde la primera, y el número incluye a quienes pidieron una invitación a la beta en el formulario de voluntariado. Los números pequeños son exactos; los mayores se redondean hacia abajo, como «25+».',
          cs: 'Okénko čekací listiny teď ukazuje, kolik lidí čeká na pozvánku do bety, už od prvního člověka, a do čísla se počítají i dobrovolníci, kteří si o pozvánku do bety řekli ve formuláři pro dobrovolníky. Malá čísla jsou přesná, větší se zaokrouhlují dolů, třeba „25+“.',
          mr: 'प्रतीक्षा यादीचा बॉक्स आता पहिल्या व्यक्तीपासूनच सांगतो की किती लोक बीटा आमंत्रणाची वाट पाहत आहेत, आणि स्वयंसेवक फॉर्मवर बीटा आमंत्रण मागणारे स्वयंसेवकही या संख्येत मोजले जातात. लहान संख्या अचूक असतात; मोठ्या संख्या खालच्या बाजूला पूर्णांक केल्या जातात, जसे “25+”.',
        },
      },
      {
        id: 'beta-invites-notice',
        text: {
          en: 'The privacy notice now explains how people are chosen for planner beta invitations. An admin requests the lists and chooses whom to invite. The planner reads email addresses and signup times, plus the signup page for waitlist entries. Only invited addresses are saved in its database, with invitation records. Joining either list does not automatically send an invitation. The waitlist still sends one email: your invite.',
          hi: 'प्राइवेसी नोटिस में अब बताया गया है कि प्लानर बीटा के निमंत्रण के लिए लोग कैसे चुने जाते हैं। एडमिन सूचियाँ माँगता है और तय करता है कि किसे बुलाना है। प्लानर ईमेल पते और साइनअप का समय पढ़ता है, और वेटलिस्ट की प्रविष्टियों के लिए साइनअप वाला पेज भी। इसके डेटाबेस में सिर्फ़ निमंत्रित पते सहेजे जाते हैं, निमंत्रण के रिकॉर्ड के साथ। किसी सूची में जुड़ने भर से निमंत्रण अपने आप नहीं जाता। वेटलिस्ट से आपको सिर्फ़ एक ईमेल मिलेगा: आपका निमंत्रण।',
          es: 'El aviso de privacidad ahora explica cómo se elige a quién invitar a la beta del planificador. Un administrador pide las listas y elige a quién invitar. El planificador lee los correos y la hora de alta, y además la página de alta en el caso de la lista de espera. En su base de datos solo se guardan las direcciones invitadas, con los registros de invitación. Apuntarse a una lista no envía ninguna invitación automáticamente. La lista de espera sigue enviándote un solo correo: tu invitación.',
          cs: 'Zásady ochrany soukromí teď vysvětlují, jak se vybírá, kdo dostane pozvánku do bety plánovače. Správce si vyžádá seznamy a vybere, koho pozvat. Plánovač čte e-mailové adresy a časy přihlášení, u čekací listiny i stránku, ze které se lidé přihlásili. V jeho databázi se ukládají jen pozvané adresy, spolu se záznamy o pozvánkách. Zapsání na seznam automaticky pozvánku nepošle. Z čekací listiny vám stále přijde jen jeden e-mail: pozvánka.',
          mr: 'प्लॅनर बीटाच्या आमंत्रणांसाठी लोक कसे निवडले जातात, ते आता गोपनीयता सूचनेत सांगितले आहे. अॅडमिन याद्या मागवतो आणि कोणाला बोलवायचे ते ठरवतो. प्लॅनर ईमेल पत्ते आणि नोंदणीच्या वेळा वाचतो, तसेच प्रतीक्षा यादीतील नोंदींसाठी नोंदणी केलेले पान. त्याच्या डेटाबेसमध्ये फक्त आमंत्रित पत्ते, आमंत्रणाच्या रेकॉर्डसह, साठवले जातात. कोणत्याही यादीत सामील होण्याने आपोआप आमंत्रण जात नाही. प्रतीक्षा यादीतून तुम्हाला एकच ईमेल येईल: तुमचे आमंत्रण.',
        },
      },
    ],
  },
  {
    date: '2026-11-04',
    items: [
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
          es: 'El pie de cada página está más ordenado: cuatro columnas iguales en pantallas anchas, y «Privacidad» y «Configuración de cookies» en la última línea, donde también es fácil encontrarlas en el móvil.',
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
          hi: 'हर पाठ की शुरुआत का छोटा सार अब दो या तीन आसान बिंदुओं में है, शब्दावली के खास शब्दों के बिना लिखा हुआ, ताकि शब्दों से सामना होने से पहले ही बात समझ में आ जाए।',
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
    date: '2026-10-24',
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
