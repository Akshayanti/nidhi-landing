/**
 * The words a volunteer sees in a review sheet, per language.
 *
 * Every language the volunteer form offers has a pack here, so the menu in
 * the volunteer sheet builds the same sheet for any of them: the language's
 * own words with the English after them in brackets. The packs follow
 * `SHEET_TEXT_.en`, key for key. `{draft}`, `{register}`, `{progress}` and
 * `{batch}` are filled in when a sheet is built.
 *
 * The values a volunteer picks (verdicts, tools, register choices) are read
 * back by their position in these lists, so their order never changes.
 *
 * Keys of FORM_LANGUAGES_ are the English names in brackets in the form's
 * "Which languages?" choices (scripts/volunteer-form.gs).
 */
var FORM_LANGUAGES_ = {
  Spanish: 'es', Czech: 'cs', Marathi: 'mr', French: 'fr', Portuguese: 'pt', Indonesian: 'id',
  German: 'de', Japanese: 'ja', Vietnamese: 'vi', Turkish: 'tr', Korean: 'ko', Arabic: 'ar',
};

/** Languages the site already publishes: their draft column is the current wording. */
var PUBLISHED_ = { es: true, cs: true, mr: true };

var SHEET_TEXT_ = {
  en: {
    name: 'English',
    tabs: { start: 'Start here', progress: 'Progress', register: 'Register', terms: 'Terms' },
    cols: {
      meaning: 'Meaning', example: 'Example on the site', where: 'Where', draft: 'AI draft', current: 'Current wording',
      alternatives: 'Alternatives', notes: 'Notes', verdict: 'Verdict', suggestion: 'Your suggestion', why: 'Why', tool: 'Tool used',
      batch: 'Batch', title: 'Title', required: 'Required: for this batch I used', context: 'Context', choice: 'Your choice',
    },
    verdicts: ['Fine', 'Better option', 'Wrong', 'Not sure'],
    tools: ['None', 'AI', 'Translation tool', 'Both'],
    notSure: 'Not sure',
    defaultRow: 'Default for the whole site',
    registerIntro: 'The site has to choose how to address the reader. Pick what fits each context best, then a default for the whole site. It may differ by context.',
    start: {
      thanks: 'Thank you for helping nidhi.',
      aboutNew: 'This sheet holds money terms the nidhi site would use in your language. The "{draft}" column is an AI draft, not a decision. There is no edition in this language yet and no date for one.',
      aboutPublished: 'This sheet holds the money terms the nidhi site uses in your language. The "{draft}" column is the current wording, drafted with AI.',
      stop: 'You can stop at any time; leave rows you have not reviewed empty. A batch takes about 30 to 60 minutes.',
      register: 'Start with the "{register}" tab: how the site addresses the reader. Then open the terms tab.',
      grey: 'Grey columns are reference; please do not change them. Fill in the white columns: verdict, your suggestion, reason and tool used. Suggestion and reason are optional.',
      required: 'Required: in the "{progress}" tab, say whether you used AI or a translation tool for this batch (the yellow cell). A batch cannot be sent without this answer. If a row differs, say so on that row too.',
      done: 'When you are done, reply to our email with "batch {batch} done". Please do not change the batch after that email; later changes go in the next batch or a new email.',
      share: 'Please do not share this sheet\'s link: anyone who has it can open and change it.',
      questions: 'Questions? Write to hello@nidhi.today. A reply usually comes within a day.',
      age: 'The volunteer agreement is for people aged 18 or over.',
      code: 'Copy code',
      source: 'Source',
    },
  },

  id: {
    name: 'Bahasa Indonesia',
    tabs: { start: 'Mulai di sini', progress: 'Progres', register: 'Sapaan', terms: 'Istilah' },
    cols: {
      meaning: 'Arti', example: 'Contoh di situs', where: 'Di mana', draft: 'Draf AI', current: 'Kata yang dipakai sekarang',
      alternatives: 'Alternatif', notes: 'Catatan', verdict: 'Penilaian', suggestion: 'Usulan Anda', why: 'Alasan', tool: 'Alat yang dipakai',
      batch: 'Batch', title: 'Judul', required: 'Wajib: untuk batch ini saya memakai', context: 'Konteks', choice: 'Pilihan Anda',
    },
    verdicts: ['Sudah tepat', 'Ada pilihan lebih baik', 'Salah', 'Tidak yakin'],
    tools: ['Tidak ada', 'AI', 'Alat terjemahan', 'Keduanya'],
    notSure: 'Tidak yakin',
    defaultRow: 'Bawaan untuk seluruh situs',
    registerIntro: 'Situs harus memilih cara menyapa pembaca. Pilih yang paling cocok untuk setiap konteks, lalu pilih bawaan untuk seluruh situs. Boleh berbeda per konteks.',
    start: {
      thanks: 'Terima kasih sudah membantu nidhi.',
      aboutNew: 'Lembar ini berisi istilah keuangan yang akan dipakai situs nidhi dalam bahasa Indonesia. Kolom "{draft}" adalah draf dari AI, bukan keputusan. Belum ada edisi bahasa Indonesia dan belum ada tanggalnya.',
      aboutPublished: 'Lembar ini berisi istilah keuangan yang dipakai situs nidhi dalam bahasa Indonesia. Kolom "{draft}" adalah kata yang dipakai sekarang, disusun dengan bantuan AI.',
      stop: 'Anda boleh berhenti kapan saja; baris yang belum diisi biarkan kosong. Satu batch memerlukan sekitar 30 sampai 60 menit.',
      register: 'Mulailah dari tab "{register}": cara situs menyapa pembaca. Lalu buka tab istilah.',
      grey: 'Kolom abu-abu adalah bahan rujukan; mohon jangan diubah. Isi kolom putih: Penilaian, Usulan Anda, Alasan, dan Alat yang dipakai. Usulan dan alasan boleh dikosongkan.',
      required: 'Wajib: di tab "{progress}", pilih apakah Anda memakai AI atau alat terjemahan untuk batch ini (sel kuning). Batch tidak bisa dikirim tanpa jawaban ini. Jika berbeda untuk baris tertentu, pilih juga di baris itu.',
      done: 'Setelah selesai, balas email kami dengan "batch {batch} selesai". Mohon jangan mengubah batch setelah email itu; perubahan berikutnya masuk ke batch berikutnya atau email baru.',
      share: 'Jangan bagikan tautan lembar ini: siapa pun yang punya tautan bisa membuka dan mengubahnya.',
      questions: 'Ada pertanyaan? Tulis ke hello@nidhi.today. Biasanya dibalas dalam satu hari.',
      age: 'Kesepakatan sukarelawan berlaku untuk usia 18 tahun ke atas.',
      code: 'Kode salinan',
      source: 'Sumber',
    },
  },

  es: {
    name: 'Español',
    tabs: { start: 'Empieza aquí', progress: 'Progreso', register: 'Tratamiento', terms: 'Términos' },
    cols: {
      meaning: 'Significado', example: 'Ejemplo en el sitio', where: 'Dónde', draft: 'Borrador de IA', current: 'Texto actual',
      alternatives: 'Alternativas', notes: 'Notas', verdict: 'Valoración', suggestion: 'Tu sugerencia', why: 'Motivo', tool: 'Herramienta usada',
      batch: 'Lote', title: 'Título', required: 'Obligatorio: para este lote usé', context: 'Contexto', choice: 'Tu elección',
    },
    verdicts: ['Está bien', 'Hay una opción mejor', 'Es incorrecto', 'No lo sé'],
    tools: ['Ninguna', 'IA', 'Herramienta de traducción', 'Ambas'],
    notSure: 'No lo sé',
    defaultRow: 'Opción por defecto para todo el sitio',
    registerIntro: 'El sitio tiene que elegir cómo dirigirse a quien lee. Elige lo que mejor encaje en cada contexto y luego una opción por defecto para todo el sitio. Puede cambiar según el contexto.',
    start: {
      thanks: 'Gracias por ayudar a nidhi.',
      aboutNew: 'Esta hoja contiene términos de dinero que el sitio nidhi usaría en español. La columna «{draft}» es un borrador hecho con IA, no una decisión.',
      aboutPublished: 'Esta hoja contiene los términos de dinero que el sitio nidhi usa en español. La columna «{draft}» es el texto actual, redactado con ayuda de IA.',
      stop: 'Puedes dejarlo cuando quieras; deja vacías las filas que no hayas revisado. Un lote lleva unos 30 a 60 minutos.',
      register: 'Empieza por la pestaña «{register}»: cómo se dirige el sitio a quien lee. Luego abre la pestaña de términos.',
      grey: 'Las columnas grises son de referencia; por favor, no las cambies. Rellena las columnas blancas: valoración, tu sugerencia, motivo y herramienta usada. La sugerencia y el motivo son opcionales.',
      required: 'Obligatorio: en la pestaña «{progress}», indica si usaste IA o una herramienta de traducción en este lote (la celda amarilla). Sin esta respuesta no se puede enviar el lote. Si alguna fila es distinta, indícalo también en esa fila.',
      done: 'Cuando termines, responde a nuestro correo con «lote {batch} terminado». Después de ese correo, por favor no cambies el lote; los cambios posteriores van en el lote siguiente o en un correo nuevo.',
      share: 'Por favor, no compartas el enlace de esta hoja: cualquiera que lo tenga puede abrirla y cambiarla.',
      questions: '¿Preguntas? Escribe a hello@nidhi.today. Normalmente respondemos en un día.',
      age: 'El acuerdo de voluntariado es para personas de 18 años o más.',
      code: 'Código de la copia',
      source: 'Origen',
    },
  },

  cs: {
    name: 'Čeština',
    tabs: { start: 'Začněte zde', progress: 'Postup', register: 'Oslovení', terms: 'Pojmy' },
    cols: {
      meaning: 'Význam', example: 'Příklad z webu', where: 'Kde', draft: 'Návrh od AI', current: 'Současné znění',
      alternatives: 'Alternativy', notes: 'Poznámky', verdict: 'Hodnocení', suggestion: 'Váš návrh', why: 'Proč', tool: 'Použitý nástroj',
      batch: 'Dávka', title: 'Název', required: 'Povinné: nástroj použitý u této dávky', context: 'Kontext', choice: 'Vaše volba',
    },
    verdicts: ['V pořádku', 'Existuje lepší možnost', 'Špatně', 'Nevím jistě'],
    tools: ['Žádný', 'AI', 'Překladový nástroj', 'Obojí'],
    notSure: 'Nevím jistě',
    defaultRow: 'Výchozí pro celý web',
    registerIntro: 'Web musí zvolit, jak čtenáře oslovovat. Vyberte, co se nejlépe hodí ke každému kontextu, a pak výchozí volbu pro celý web. Podle kontextu se může lišit.',
    start: {
      thanks: 'Děkujeme, že pomáháte nidhi.',
      aboutNew: 'Tato tabulka obsahuje finanční pojmy, které by web nidhi používal v češtině. Sloupec „{draft}“ je návrh od AI, ne rozhodnutí.',
      aboutPublished: 'Tato tabulka obsahuje finanční pojmy, které web nidhi používá v češtině. Sloupec „{draft}“ je současné znění, připravené s pomocí AI.',
      stop: 'Skončit můžete kdykoli; dosud nezkontrolované řádky nechte prázdné. Jedna dávka zabere asi 30 až 60 minut.',
      register: 'Začněte kartou „{register}“: jak web oslovuje čtenáře. Potom otevřete kartu s pojmy.',
      grey: 'Šedé sloupce slouží jako podklad; prosím neměňte je. Vyplňte bílé sloupce: hodnocení, váš návrh, důvod a použitý nástroj. Návrh a důvod jsou nepovinné.',
      required: 'Povinné: na kartě „{progress}“ uveďte, zda jste u této dávky použili AI nebo překladový nástroj (žlutá buňka). Bez této odpovědi nelze dávku odeslat. Pokud se některý řádek liší, uveďte to i u něj.',
      done: 'Až budete hotovi, odpovězte na náš e-mail zprávou „dávka {batch} hotová“. Po tomto e-mailu prosím dávku neměňte; pozdější změny patří do další dávky nebo do nového e-mailu.',
      share: 'Odkaz na tuto tabulku prosím nesdílejte: kdokoli, kdo ho má, ji může otevřít a změnit.',
      questions: 'Máte otázku? Napište na hello@nidhi.today. Odpověď obvykle přijde do jednoho dne.',
      age: 'Dohoda s dobrovolníky platí pro lidi od 18 let.',
      code: 'Kód kopie',
      source: 'Zdroj',
    },
  },

  mr: {
    name: 'मराठी',
    tabs: { start: 'इथून सुरुवात करा', progress: 'प्रगती', register: 'संबोधन', terms: 'शब्द' },
    cols: {
      meaning: 'अर्थ', example: 'साइटवरील उदाहरण', where: 'कुठे', draft: 'AI चा मसुदा', current: 'सध्याचा मजकूर',
      alternatives: 'पर्याय', notes: 'नोंदी', verdict: 'मूल्यमापन', suggestion: 'तुमची सूचना', why: 'कारण', tool: 'वापरलेले साधन',
      batch: 'बॅच', title: 'शीर्षक', required: 'आवश्यक: या बॅचसाठी मी वापरले', context: 'संदर्भ', choice: 'तुमची निवड',
    },
    verdicts: ['योग्य आहे', 'यापेक्षा चांगला पर्याय आहे', 'चुकीचे आहे', 'खात्री नाही'],
    tools: ['काहीही नाही', 'AI', 'भाषांतराचे साधन', 'दोन्ही'],
    notSure: 'खात्री नाही',
    defaultRow: 'संपूर्ण साइटसाठी मूळ निवड',
    registerIntro: 'वाचकाला कसे संबोधायचे हे साइटला ठरवावे लागते. प्रत्येक संदर्भाला जे सर्वात योग्य वाटते ते निवडा, मग संपूर्ण साइटसाठी एक मूळ निवड. संदर्भानुसार ती वेगळी असू शकते.',
    start: {
      thanks: 'nidhi ला मदत केल्याबद्दल धन्यवाद.',
      aboutNew: 'या शीटमध्ये nidhi साइट मराठीत वापरू शकेल असे पैशांविषयीचे शब्द आहेत. “{draft}” स्तंभ AI ने केलेला मसुदा आहे, निर्णय नाही.',
      aboutPublished: 'या शीटमध्ये nidhi साइट मराठीत वापरत असलेले पैशांविषयीचे शब्द आहेत. “{draft}” स्तंभ हा सध्याचा मजकूर आहे, AI च्या मदतीने तयार केलेला.',
      stop: 'तुम्ही कधीही थांबू शकता; न पाहिलेल्या ओळी रिकाम्या ठेवा. एका बॅचला साधारण 30 ते 60 मिनिटे लागतात.',
      register: '“{register}” टॅबपासून सुरुवात करा: साइट वाचकाला कसे संबोधते. मग शब्दांचा टॅब उघडा.',
      grey: 'करड्या रंगाचे स्तंभ संदर्भासाठी आहेत; कृपया ते बदलू नका. पांढरे स्तंभ भरा: मूल्यमापन, तुमची सूचना, कारण आणि वापरलेले साधन. सूचना आणि कारण ऐच्छिक आहेत.',
      required: 'आवश्यक: “{progress}” टॅबमध्ये, या बॅचसाठी तुम्ही AI किंवा भाषांतराचे साधन वापरले का ते निवडा (पिवळा कक्ष). या उत्तराशिवाय बॅच पाठवता येत नाही. एखाद्या ओळीसाठी वेगळे असेल, तर त्या ओळीतही नोंदवा.',
      done: 'काम पूर्ण झाल्यावर आमच्या ईमेलला “बॅच {batch} पूर्ण” असे उत्तर द्या. त्या ईमेलनंतर कृपया बॅच बदलू नका; नंतरचे बदल पुढच्या बॅचमध्ये किंवा नव्या ईमेलमध्ये पाठवा.',
      share: 'कृपया या शीटचा दुवा कोणालाही देऊ नका: तो ज्याच्याकडे आहे ती व्यक्ती शीट उघडू आणि बदलू शकते.',
      questions: 'काही प्रश्न? hello@nidhi.today वर लिहा. उत्तर साधारण एका दिवसात येते.',
      age: 'स्वयंसेवक करार 18 किंवा त्याहून अधिक वयाच्या व्यक्तींसाठी आहे.',
      code: 'प्रतीचा कोड',
      source: 'स्रोत',
    },
  },

  fr: {
    name: 'Français',
    tabs: { start: 'Commencer ici', progress: 'Avancement', register: 'Tutoiement ou vouvoiement', terms: 'Termes' },
    cols: {
      meaning: 'Sens', example: 'Exemple sur le site', where: 'Où', draft: 'Proposition de l’IA', current: 'Formulation actuelle',
      alternatives: 'Autres possibilités', notes: 'Notes', verdict: 'Avis', suggestion: 'Votre proposition', why: 'Pourquoi', tool: 'Outil utilisé',
      batch: 'Lot', title: 'Titre', required: 'Obligatoire : pour ce lot, j’ai utilisé', context: 'Contexte', choice: 'Votre choix',
    },
    verdicts: ['Convient', 'Il y a mieux', 'Incorrect', 'Je ne sais pas'],
    tools: ['Aucun', 'IA', 'Outil de traduction', 'Les deux'],
    notSure: 'Je ne sais pas',
    defaultRow: 'Choix par défaut pour tout le site',
    registerIntro: 'Le site doit choisir comment s’adresser au lecteur ou à la lectrice. Choisissez ce qui convient le mieux à chaque contexte, puis un choix par défaut pour tout le site. Il peut varier selon le contexte.',
    start: {
      thanks: 'Merci d’aider nidhi.',
      aboutNew: 'Cette feuille contient des termes financiers que le site nidhi utiliserait en français. La colonne « {draft} » est une proposition faite avec l’IA, pas une décision. Il n’existe pas encore d’édition française, ni de date prévue.',
      aboutPublished: 'Cette feuille contient les termes financiers que le site nidhi utilise en français. La colonne « {draft} » est la formulation actuelle, rédigée avec l’IA.',
      stop: 'Vous pouvez arrêter à tout moment ; laissez vides les lignes que vous n’avez pas relues. Un lot prend environ 30 à 60 minutes.',
      register: 'Commencez par l’onglet « {register} » : la façon dont le site s’adresse au lecteur. Ouvrez ensuite l’onglet des termes.',
      grey: 'Les colonnes grises servent de référence ; merci de ne pas les modifier. Remplissez les colonnes blanches : avis, votre proposition, raison et outil utilisé. La proposition et la raison sont facultatives.',
      required: 'Obligatoire : dans l’onglet « {progress} », indiquez si vous avez utilisé l’IA ou un outil de traduction pour ce lot (la cellule jaune). Sans cette réponse, le lot ne peut pas être envoyé. Si une ligne fait exception, indiquez-le aussi sur cette ligne.',
      done: 'Quand vous avez terminé, répondez à notre e-mail par « lot {batch} terminé ». Merci de ne plus modifier le lot après cet e-mail ; les changements suivants vont dans le lot suivant ou dans un nouvel e-mail.',
      share: 'Merci de ne pas partager le lien de cette feuille : toute personne qui l’a peut l’ouvrir et la modifier.',
      questions: 'Une question ? Écrivez à hello@nidhi.today. La réponse arrive en général dans la journée.',
      age: 'L’accord de bénévolat s’adresse aux personnes de 18 ans ou plus.',
      code: 'Code de la copie',
      source: 'Source',
    },
  },

  pt: {
    name: 'Português',
    tabs: { start: 'Comece aqui', progress: 'Progresso', register: 'Tratamento', terms: 'Termos' },
    cols: {
      meaning: 'Significado', example: 'Exemplo no site', where: 'Onde', draft: 'Rascunho da IA', current: 'Texto atual',
      alternatives: 'Alternativas', notes: 'Notas', verdict: 'Avaliação', suggestion: 'A sua sugestão', why: 'Motivo', tool: 'Ferramenta usada',
      batch: 'Lote', title: 'Título', required: 'Obrigatório: neste lote usei', context: 'Contexto', choice: 'A sua escolha',
    },
    verdicts: ['Está bem', 'Há uma opção melhor', 'Está errado', 'Não tenho certeza'],
    tools: ['Nenhuma', 'IA', 'Ferramenta de tradução', 'Ambas'],
    notSure: 'Não sei',
    defaultRow: 'Padrão para todo o site',
    registerIntro: 'O site precisa escolher como se dirigir a quem lê. Escolha o que funciona melhor em cada contexto e depois um padrão para todo o site. Pode variar conforme o contexto.',
    start: {
      thanks: 'Agradecemos a sua ajuda à nidhi.',
      aboutNew: 'Esta planilha contém termos de finanças que o site nidhi usaria em português. A coluna “{draft}” é um rascunho feito com IA, não uma decisão. Ainda não há edição em português nem data prevista.',
      aboutPublished: 'Esta planilha contém os termos de finanças que o site nidhi usa em português. A coluna “{draft}” é o texto atual, redigido com IA.',
      stop: 'Pode parar quando quiser; deixe em branco as linhas que não revisou. Um lote leva cerca de 30 a 60 minutos.',
      register: 'Comece pela aba “{register}”: como o site se dirige a quem lê. Depois abra a aba de termos.',
      grey: 'As colunas cinzentas são de referência; por favor, não as altere. Preencha as colunas brancas: avaliação, a sua sugestão, motivo e ferramenta usada. Sugestão e motivo são opcionais.',
      required: 'Obrigatório: na aba “{progress}”, indique se usou IA ou uma ferramenta de tradução neste lote (a célula amarela). Sem esta resposta o lote não pode ser enviado. Se alguma linha for diferente, indique também nessa linha.',
      done: 'Quando terminar, responda ao nosso e-mail com “lote {batch} concluído”. Depois desse e-mail, por favor não altere o lote; mudanças posteriores vão no lote seguinte ou num novo e-mail.',
      share: 'Por favor, não partilhe o link desta planilha: qualquer pessoa que o tenha pode abri-la e alterá-la.',
      questions: 'Dúvidas? Escreva para hello@nidhi.today. A resposta costuma chegar em um dia.',
      age: 'O acordo de voluntariado é para pessoas com 18 anos ou mais.',
      code: 'Código da cópia',
      source: 'Origem',
    },
  },

  de: {
    name: 'Deutsch',
    tabs: { start: 'Hier beginnen', progress: 'Fortschritt', register: 'Anrede', terms: 'Begriffe' },
    cols: {
      meaning: 'Bedeutung', example: 'Beispiel auf der Website', where: 'Wo', draft: 'KI-Entwurf', current: 'Aktueller Wortlaut',
      alternatives: 'Alternativen', notes: 'Hinweise', verdict: 'Bewertung', suggestion: 'Ihr Vorschlag', why: 'Begründung', tool: 'Verwendetes Werkzeug',
      batch: 'Paket', title: 'Titel', required: 'Pflicht: für dieses Paket habe ich verwendet', context: 'Kontext', choice: 'Ihre Wahl',
    },
    verdicts: ['Passt', 'Es gibt etwas Besseres', 'Falsch', 'Nicht sicher'],
    tools: ['Keins', 'KI', 'Übersetzungswerkzeug', 'Beides'],
    notSure: 'Nicht sicher',
    defaultRow: 'Standard für die ganze Website',
    registerIntro: 'Die Website muss entscheiden, wie sie Lesende anspricht. Wählen Sie, was zu jedem Kontext am besten passt, und dann einen Standard für die ganze Website. Er kann je nach Kontext abweichen.',
    start: {
      thanks: 'Danke, dass Sie nidhi helfen.',
      aboutNew: 'Diese Tabelle enthält Geldbegriffe, die die Website nidhi auf Deutsch verwenden würde. Die Spalte „{draft}“ ist ein Entwurf mit KI, keine Entscheidung. Eine deutsche Ausgabe gibt es noch nicht, auch keinen Termin dafür.',
      aboutPublished: 'Diese Tabelle enthält die Geldbegriffe, die die Website nidhi auf Deutsch verwendet. Die Spalte „{draft}“ ist der aktuelle Wortlaut, mit KI verfasst.',
      stop: 'Sie können jederzeit aufhören; lassen Sie Zeilen, die Sie nicht geprüft haben, leer. Ein Paket dauert etwa 30 bis 60 Minuten.',
      register: 'Beginnen Sie mit dem Tab „{register}“: wie die Website Lesende anspricht. Öffnen Sie danach den Tab mit den Begriffen.',
      grey: 'Graue Spalten dienen als Vorlage; bitte nicht ändern. Füllen Sie die weißen Spalten aus: Bewertung, Ihr Vorschlag, Begründung und verwendetes Werkzeug. Vorschlag und Begründung sind freiwillig.',
      required: 'Pflicht: Geben Sie im Tab „{progress}“ an, ob Sie für dieses Paket KI oder ein Übersetzungswerkzeug verwendet haben (die gelbe Zelle). Ohne diese Antwort kann das Paket nicht abgegeben werden. Weicht eine Zeile ab, vermerken Sie es auch dort.',
      done: 'Wenn Sie fertig sind, antworten Sie auf unsere E-Mail mit „Paket {batch} fertig“. Bitte ändern Sie das Paket danach nicht mehr; spätere Änderungen gehören ins nächste Paket oder in eine neue E-Mail.',
      share: 'Bitte geben Sie den Link zu dieser Tabelle nicht weiter: Wer ihn hat, kann sie öffnen und ändern.',
      questions: 'Fragen? Schreiben Sie an hello@nidhi.today. Die Antwort kommt meist innerhalb eines Tages.',
      age: 'Die Freiwilligenvereinbarung gilt für Personen ab 18 Jahren.',
      code: 'Code der Kopie',
      source: 'Quelle',
    },
  },

  ja: {
    name: '日本語',
    tabs: { start: '最初にお読みください', progress: '進捗', register: '呼びかけ方', terms: '用語' },
    cols: {
      meaning: '意味', example: 'サイトでの使用例', where: '場所', draft: 'AI の訳案', current: '現在の表現',
      alternatives: '別の候補', notes: 'メモ', verdict: '評価', suggestion: 'あなたの提案', why: '理由', tool: '使ったツール',
      batch: 'バッチ', title: 'タイトル', required: '必須：このバッチで使ったもの', context: '場面', choice: 'あなたの選択',
    },
    verdicts: ['適切', 'より良い候補がある', '誤り', 'わからない'],
    tools: ['なし', 'AI', '翻訳ツール', '両方'],
    notSure: 'わからない',
    defaultRow: 'サイト全体の基本',
    registerIntro: 'サイトは読者への呼びかけ方を決める必要があります。場面ごとに最も合うものを選び、最後にサイト全体の基本を選んでください。場面によって変えても構いません。',
    start: {
      thanks: 'nidhi へのご協力ありがとうございます。',
      aboutNew: 'このシートには、nidhi のサイトが日本語で使う予定のお金の用語が入っています。「{draft}」の列は AI による訳案で、決定ではありません。日本語版はまだなく、公開時期も決まっていません。',
      aboutPublished: 'このシートには、nidhi のサイトが日本語で使っているお金の用語が入っています。「{draft}」の列は現在の表現で、AI を使って作成したものです。',
      stop: 'いつやめても構いません。確認していない行は空欄のままにしてください。1 バッチの目安は 30〜60 分です。',
      register: 'まず「{register}」タブから始めてください。サイトが読者にどう呼びかけるかの質問です。その後、用語のタブを開いてください。',
      grey: 'グレーの列は参考情報です。変更しないでください。白い列に記入してください：評価、あなたの提案、理由、使ったツール。提案と理由は任意です。',
      required: '必須：「{progress}」タブで、このバッチで AI や翻訳ツールを使ったかを選んでください（黄色のセル）。この回答がないとバッチを提出できません。行によって異なる場合は、その行にも記入してください。',
      done: '終わったら、私たちのメールに「バッチ {batch} 完了」と返信してください。返信後はバッチを変更しないでください。その後の変更は次のバッチか新しいメールでお願いします。',
      share: 'このシートのリンクは共有しないでください。リンクを持つ人は誰でも開いて変更できます。',
      questions: 'ご質問は hello@nidhi.today まで。通常 1 日以内に返信します。',
      age: 'ボランティア契約は 18 歳以上の方が対象です。',
      code: 'コピーのコード',
      source: '出典',
    },
  },

  vi: {
    name: 'Tiếng Việt',
    tabs: { start: 'Bắt đầu ở đây', progress: 'Tiến độ', register: 'Cách xưng hô', terms: 'Thuật ngữ' },
    cols: {
      meaning: 'Nghĩa', example: 'Ví dụ trên trang', where: 'Ở đâu', draft: 'Bản nháp của AI', current: 'Cách viết hiện tại',
      alternatives: 'Phương án khác', notes: 'Ghi chú', verdict: 'Đánh giá', suggestion: 'Đề xuất của bạn', why: 'Lý do', tool: 'Công cụ đã dùng',
      batch: 'Đợt', title: 'Tiêu đề', required: 'Bắt buộc: với đợt này tôi đã dùng', context: 'Ngữ cảnh', choice: 'Lựa chọn của bạn',
    },
    verdicts: ['Ổn', 'Có lựa chọn tốt hơn', 'Sai', 'Không chắc'],
    tools: ['Không dùng', 'AI', 'Công cụ dịch', 'Cả hai'],
    notSure: 'Không chắc',
    defaultRow: 'Mặc định cho toàn trang',
    registerIntro: 'Trang cần chọn cách xưng hô với người đọc. Hãy chọn cách hợp nhất cho từng ngữ cảnh, rồi chọn một cách mặc định cho toàn trang. Có thể khác nhau tùy ngữ cảnh.',
    start: {
      thanks: 'Cảm ơn bạn đã giúp nidhi.',
      aboutNew: 'Bảng này chứa các thuật ngữ tài chính mà trang nidhi sẽ dùng bằng tiếng Việt. Cột “{draft}” là bản nháp do AI soạn, chưa phải quyết định. Hiện chưa có bản tiếng Việt và cũng chưa có ngày ra mắt.',
      aboutPublished: 'Bảng này chứa các thuật ngữ tài chính mà trang nidhi đang dùng bằng tiếng Việt. Cột “{draft}” là cách viết hiện tại, soạn với sự hỗ trợ của AI.',
      stop: 'Bạn có thể dừng bất cứ lúc nào; hãy để trống những dòng bạn chưa xem. Mỗi đợt mất khoảng 30 đến 60 phút.',
      register: 'Hãy bắt đầu với thẻ “{register}”: cách trang xưng hô với người đọc. Sau đó mở thẻ thuật ngữ.',
      grey: 'Các cột màu xám là tài liệu tham khảo; vui lòng không sửa. Hãy điền các cột màu trắng: đánh giá, đề xuất của bạn, lý do và công cụ đã dùng. Đề xuất và lý do không bắt buộc.',
      required: 'Bắt buộc: trong thẻ “{progress}”, hãy cho biết bạn có dùng AI hoặc công cụ dịch cho đợt này không (ô màu vàng). Thiếu câu trả lời này thì không gửi được đợt. Nếu một dòng khác đi, hãy ghi ở cả dòng đó.',
      done: 'Khi xong, hãy trả lời email của chúng tôi với nội dung “đợt {batch} xong”. Sau email đó vui lòng không sửa đợt nữa; thay đổi sau này đưa vào đợt tiếp theo hoặc một email mới.',
      share: 'Vui lòng không chia sẻ đường liên kết của bảng này: ai có liên kết đều có thể mở và sửa.',
      questions: 'Có câu hỏi? Viết cho hello@nidhi.today. Thường có trả lời trong một ngày.',
      age: 'Thỏa thuận tình nguyện dành cho người từ 18 tuổi trở lên.',
      code: 'Mã bản sao',
      source: 'Nguồn',
    },
  },

  tr: {
    name: 'Türkçe',
    tabs: { start: 'Buradan başlayın', progress: 'İlerleme', register: 'Hitap', terms: 'Terimler' },
    cols: {
      meaning: 'Anlamı', example: 'Sitedeki örnek', where: 'Nerede', draft: 'YZ taslağı', current: 'Şu anki ifade',
      alternatives: 'Alternatifler', notes: 'Notlar', verdict: 'Değerlendirme', suggestion: 'Öneriniz', why: 'Neden', tool: 'Kullanılan araç',
      batch: 'Grup', title: 'Başlık', required: 'Zorunlu: bu grupta kullandığım', context: 'Bağlam', choice: 'Seçiminiz',
    },
    verdicts: ['Uygun', 'Daha iyi bir seçenek var', 'Yanlış', 'Emin değilim'],
    tools: ['Hiçbiri', 'YZ', 'Çeviri aracı', 'İkisi de'],
    notSure: 'Emin değilim',
    defaultRow: 'Sitenin tamamı için varsayılan',
    registerIntro: 'Sitenin okura nasıl hitap edeceğini seçmesi gerekiyor. Her bağlama en uygun olanı, sonra sitenin tamamı için bir varsayılanı seçin. Bağlama göre değişebilir.',
    start: {
      thanks: 'nidhi’ye yardım ettiğiniz için teşekkürler.',
      aboutNew: 'Bu tablo, nidhi sitesinin Türkçede kullanacağı para terimlerini içerir. “{draft}” sütunu yapay zekâyla hazırlanmış bir taslaktır, karar değildir. Henüz Türkçe sürüm yok ve bir tarih de belirlenmedi.',
      aboutPublished: 'Bu tablo, nidhi sitesinin Türkçede kullandığı para terimlerini içerir. “{draft}” sütunu, yapay zekâyla hazırlanmış şu anki ifadedir.',
      stop: 'İstediğiniz zaman bırakabilirsiniz; bakmadığınız satırları boş bırakın. Bir grup yaklaşık 30 ila 60 dakika sürer.',
      register: 'İşe “{register}” sekmesiyle başlayın: sitenin okura nasıl hitap ettiği. Sonra terimler sekmesini açın.',
      grey: 'Gri sütunlar başvuru içindir; lütfen değiştirmeyin. Beyaz sütunları doldurun: değerlendirme, öneriniz, neden ve kullanılan araç. Öneri ve neden isteğe bağlıdır.',
      required: 'Zorunlu: “{progress}” sekmesinde bu grup için yapay zekâ ya da çeviri aracı kullanıp kullanmadığınızı seçin (sarı hücre). Bu yanıt olmadan grup gönderilemez. Bir satır farklıysa onu o satırda da belirtin.',
      done: 'Bitirdiğinizde e-postamıza “grup {batch} tamam” diye yanıt verin. Bu e-postadan sonra lütfen grubu değiştirmeyin; sonraki değişiklikler bir sonraki gruba ya da yeni bir e-postaya gider.',
      share: 'Lütfen bu tablonun bağlantısını kimseyle paylaşmayın: bağlantıya sahip olan herkes tabloyu açıp değiştirebilir.',
      questions: 'Sorunuz mu var? hello@nidhi.today adresine yazın. Yanıt genellikle bir gün içinde gelir.',
      age: 'Gönüllü sözleşmesi 18 yaş ve üzeri kişiler içindir.',
      code: 'Kopya kodu',
      source: 'Kaynak',
    },
  },

  ko: {
    name: '한국어',
    tabs: { start: '여기서 시작', progress: '진행 상황', register: '호칭과 말투', terms: '용어' },
    cols: {
      meaning: '뜻', example: '사이트 속 예문', where: '위치', draft: 'AI 초안', current: '현재 표현',
      alternatives: '다른 후보', notes: '메모', verdict: '평가', suggestion: '제안', why: '이유', tool: '사용한 도구',
      batch: '묶음', title: '제목', required: '필수: 이 묶음에서 사용한 것', context: '상황', choice: '선택',
    },
    verdicts: ['적절함', '더 나은 표현이 있음', '틀림', '잘 모르겠음'],
    tools: ['없음', 'AI', '번역 도구', '둘 다'],
    notSure: '잘 모르겠음',
    defaultRow: '사이트 전체 기본값',
    registerIntro: '사이트는 독자에게 어떤 말투로 말할지 정해야 합니다. 상황마다 가장 잘 맞는 것을 고르고, 마지막으로 사이트 전체의 기본값을 골라 주세요. 상황에 따라 달라도 괜찮습니다.',
    start: {
      thanks: 'nidhi를 도와주셔서 감사합니다.',
      aboutNew: '이 시트에는 nidhi 사이트가 한국어로 쓸 돈 관련 용어가 들어 있습니다. ‘{draft}’ 열은 AI가 만든 초안이며 결정된 것이 아닙니다. 한국어판은 아직 없고 일정도 정해지지 않았습니다.',
      aboutPublished: '이 시트에는 nidhi 사이트가 한국어로 쓰고 있는 돈 관련 용어가 들어 있습니다. ‘{draft}’ 열은 AI의 도움으로 작성한 현재 표현입니다.',
      stop: '언제든 그만두셔도 됩니다. 검토하지 않은 행은 비워 두세요. 한 묶음은 30~60분 정도 걸립니다.',
      register: '‘{register}’ 탭부터 시작하세요. 사이트가 독자에게 어떻게 말하는지에 관한 질문입니다. 그다음 용어 탭을 여세요.',
      grey: '회색 열은 참고용이니 바꾸지 말아 주세요. 흰색 열을 채워 주세요: 평가, 제안, 이유, 사용한 도구. 제안과 이유는 선택 사항입니다.',
      required: '필수: ‘{progress}’ 탭에서 이 묶음에 AI나 번역 도구를 썼는지 골라 주세요(노란 칸). 이 답이 없으면 묶음을 제출할 수 없습니다. 어떤 행이 다르다면 그 행에도 적어 주세요.',
      done: '다 마치면 저희 이메일에 ‘묶음 {batch} 완료’라고 답장해 주세요. 그 뒤에는 묶음을 바꾸지 말아 주세요. 이후 수정은 다음 묶음이나 새 이메일로 보내 주세요.',
      share: '이 시트의 링크를 공유하지 말아 주세요. 링크가 있는 사람은 누구나 열고 수정할 수 있습니다.',
      questions: '궁금한 점은 hello@nidhi.today로 보내 주세요. 보통 하루 안에 답장합니다.',
      age: '자원봉사 약정은 만 18세 이상을 대상으로 합니다.',
      code: '사본 코드',
      source: '출처',
    },
  },

  ar: {
    name: 'العربية',
    tabs: { start: 'البداية من هنا', progress: 'التقدّم', register: 'صيغة المخاطبة', terms: 'المصطلحات' },
    cols: {
      meaning: 'المعنى', example: 'مثال من الموقع', where: 'أين', draft: 'مسودة الذكاء الاصطناعي', current: 'الصياغة الحالية',
      alternatives: 'بدائل', notes: 'ملاحظات', verdict: 'التقييم', suggestion: 'الاقتراح', why: 'السبب', tool: 'الأداة المستخدمة',
      batch: 'الدفعة', title: 'العنوان', required: 'إلزامي: ما استُخدم في هذه الدفعة', context: 'السياق', choice: 'الاختيار',
    },
    verdicts: ['مناسب', 'يوجد خيار أفضل', 'خطأ', 'لا أعرف'],
    tools: ['لا شيء', 'ذكاء اصطناعي', 'أداة ترجمة', 'كلاهما'],
    notSure: 'لا أعرف',
    defaultRow: 'الخيار الافتراضي للموقع كله',
    registerIntro: 'على الموقع أن يختار طريقة مخاطبة القارئ. المطلوب اختيار الأنسب لكل سياق، ثم خيار افتراضي للموقع كله. يمكن أن يختلف حسب السياق.',
    start: {
      thanks: 'شكرًا على مساعدة nidhi.',
      aboutNew: 'تحتوي هذه الورقة على مصطلحات مالية سيستخدمها موقع nidhi بالعربية. عمود «{draft}» مسودة أعدّها الذكاء الاصطناعي، وليس قرارًا. لا توجد نسخة عربية بعد ولا موعد لها.',
      aboutPublished: 'تحتوي هذه الورقة على المصطلحات المالية التي يستخدمها موقع nidhi بالعربية. عمود «{draft}» هو الصياغة الحالية، وقد أُعدّت بمساعدة الذكاء الاصطناعي.',
      stop: 'يمكن التوقف في أي وقت؛ وتُترك الصفوف التي لم تُراجَع فارغة. تستغرق الدفعة الواحدة نحو 30 إلى 60 دقيقة.',
      register: 'يُبدأ بتبويب «{register}»: كيف يخاطب الموقع القارئ. ثم يُفتح تبويب المصطلحات.',
      grey: 'الأعمدة الرمادية للمرجع؛ يُرجى عدم تغييرها. تُملأ الأعمدة البيضاء: التقييم والاقتراح والسبب والأداة المستخدمة. الاقتراح والسبب اختياريان.',
      required: 'إلزامي: في تبويب «{progress}»، يُذكر ما إذا استُخدم الذكاء الاصطناعي أو أداة ترجمة في هذه الدفعة (الخلية الصفراء). لا يمكن إرسال الدفعة دون هذه الإجابة. وإذا اختلف صفّ ما، يُذكر ذلك في الصف نفسه أيضًا.',
      done: 'عند الانتهاء، يُرجى الرد على رسالتنا بعبارة «الدفعة {batch} انتهت». ويُرجى عدم تغيير الدفعة بعد تلك الرسالة؛ التغييرات اللاحقة تذهب إلى الدفعة التالية أو إلى رسالة جديدة.',
      share: 'يُرجى عدم مشاركة رابط هذه الورقة: كل من لديه الرابط يستطيع فتحها وتعديلها.',
      questions: 'للأسئلة، يُرجى الكتابة إلى hello@nidhi.today. يصل الرد عادةً خلال يوم.',
      age: 'اتفاقية التطوع مخصّصة لمن هم في الثامنة عشرة أو أكبر.',
      code: 'رمز النسخة',
      source: 'المصدر',
    },
  },
};

/** The pack for a language, or English when it has none. */
function text_(lang) {
  return SHEET_TEXT_[lang] || SHEET_TEXT_.en;
}

/** "Penilaian (Verdict)": the language's word, then the English in brackets. */
function bi_(local, english) {
  return local === english ? english : local + ' (' + english + ')';
}

/** Every key of the English pack exists, non-empty, in every other pack. */
function checkTextPacks_() {
  var problems = [];
  function walk(en, other, path) {
    Object.keys(en).forEach(function (k) {
      var p = path ? path + '.' + k : k;
      if (Array.isArray(en[k])) {
        if (!Array.isArray(other[k]) || other[k].length !== en[k].length) problems.push(p);
      } else if (typeof en[k] === 'object') {
        if (!other[k]) problems.push(p);
        else walk(en[k], other[k], p);
      } else if (!other[k]) problems.push(p);
    });
  }
  Object.keys(SHEET_TEXT_).forEach(function (lang) { walk(SHEET_TEXT_.en, SHEET_TEXT_[lang], lang); });
  return problems;
}
