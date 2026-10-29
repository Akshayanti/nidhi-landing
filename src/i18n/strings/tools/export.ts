/**
 * What every free tool says about keeping a copy of its results, in every
 * language: the "Save or share" block, the parts of the spreadsheet every tool
 * shares, and the frame of the printed report.
 *
 * Each tool's own sheet and column names live in that tool's module, under
 * `island.export`; this module holds only what the four have in common, so the
 * buttons read the same on every tool.
 *
 * The spreadsheet's sheet names are kept short (a sheet name holds at most 31
 * characters, and `xlsx.ts` cuts anything longer), and they are names, not
 * sentences.
 *
 * What is not here: the file name, which is `nidhi-<tool>-<date>.xlsx` in every
 * language because it names the file and not the reader's words; the
 * extensions `.xlsx` and `PDF`, which are the same everywhere and sit inside the
 * button labels; and the analytics labels on the buttons.
 */

export const exportEn = {
  heading: 'Save or share these results',
  spreadsheet: 'Download as a spreadsheet (Excel, Google Sheets)',
  print: 'Make a PDF report',
  note: 'Made on your device. Nothing is uploaded.',
  /** Shown only in Instagram's or Facebook's in-app browser, which may not save files or print. */
  inApp: 'Inside an app? Open this page in your phone’s browser first (••• menu), then save.',
  /** Announced after a spreadsheet download, since some phones save without a sign. */
  downloaded: 'Spreadsheet made. Check your downloads.',
  /** Why the two buttons do nothing yet. */
  notReady: 'These work once the results are showing.',
  /** The printed report (ToolReport.tsx). `{date}` is YYYY-MM-DD. */
  report: {
    heading: 'Your results',
    made: 'Made on {date}',
    answer: 'Your answer',
    meaning: 'What this means',
    entered: 'What you entered',
    assumptions: 'Assumptions and limits',
    sampled: 'Every fifth year is shown, and the last. The spreadsheet has every year.',
    footer: 'Made with nidhi.today on {date}. An educational estimate, not financial advice. This report holds the values you typed. It was made on your device, and nothing was uploaded.',
    beta: "The nidhi planner is in development. Its free beta is planned to open in January 2027: nidhi.today/beta/",
  },
  sheets: {
    about: 'About',
    inputs: 'Inputs',
  },
  columns: {
    item: 'Item',
    value: 'Value',
  },
  about: {
    tool: 'Tool',
    made: 'Made on',
    currency: 'Currency',
    page: 'Page',
    privacy: 'Privacy',
    privacyText: 'Made in your browser. nidhi never received these figures, and cannot see or delete this file.',
    note: 'Note',
    noteText:
      'An educational estimate from a free tool, not financial advice. The page explains how it is worked out and what it leaves out.',
    beta: "Planner beta",
    betaText: "The nidhi planner is in development. Its free beta is planned to open in January 2027: nidhi.today/beta/",
  },
  yes: 'Yes',
  no: 'No',
};

/**
 * Hindi. The register is the tools': आप, plain verbs, the glossary's
 * ब्राउज़र. "Spreadsheet" stays स्प्रेडशीट, as Indian office software calls it.
 */
export const exportHi: typeof exportEn = {
  heading: 'इन नतीजों को सेव या शेयर करें',
  spreadsheet: 'स्प्रेडशीट के रूप में डाउनलोड करें (Excel, Google Sheets)',
  print: 'PDF रिपोर्ट बनाएँ',
  note: 'आपके डिवाइस पर बनता है। कुछ भी अपलोड नहीं होता।',
  inApp: 'किसी ऐप के अंदर हैं? पहले यह पेज अपने फ़ोन के ब्राउज़र में खोलें (••• मेन्यू), फिर सेव करें।',
  downloaded: 'स्प्रेडशीट बन गई। अपने डाउनलोड देखें।',
  notReady: 'नतीजे दिखने के बाद ये बटन काम करते हैं।',
  report: {
    heading: 'आपके नतीजे',
    made: '{date} को बनाई गई',
    answer: 'आपका जवाब',
    meaning: 'इसका मतलब',
    entered: 'आपने क्या भरा',
    assumptions: 'धारणाएँ और सीमाएँ',
    sampled: 'हर पाँचवाँ साल और आख़िरी साल दिखाया गया है। स्प्रेडशीट में हर साल की जानकारी है।',
    footer: 'nidhi.today पर {date} को बनाई गई। यह शैक्षिक अनुमान है, वित्तीय सलाह नहीं। इस रिपोर्ट में आपके भरे आँकड़े हैं। यह आपके डिवाइस पर बनी, और कुछ भी अपलोड नहीं हुआ।',
    beta: "nidhi का प्लानर बन रहा है। इसके मुफ़्त बीटा को जनवरी 2027 में खोलने की योजना है: nidhi.today/hi/beta/",
  },
  sheets: {
    about: 'जानकारी',
    inputs: 'आपकी भरी जानकारी',
  },
  columns: {
    item: 'विवरण',
    value: 'मान',
  },
  about: {
    tool: 'टूल',
    made: 'बनाने की तारीख',
    currency: 'मुद्रा',
    page: 'पेज',
    privacy: 'प्राइवेसी',
    privacyText: 'आपके ब्राउज़र में बनी। ये आँकड़े nidhi तक कभी नहीं पहुँचे, और nidhi के पास यह फ़ाइल देखने या मिटाने का कोई तरीका नहीं है।',
    note: 'ध्यान दें',
    noteText:
      'यह एक मुफ़्त टूल का शैक्षिक अनुमान है, वित्तीय सलाह नहीं। पेज बताता है कि इसकी गणना कैसे होती है और यह किन बातों को शामिल नहीं करता।',
    beta: "प्लानर बीटा",
    betaText: "nidhi का प्लानर बन रहा है। इसके मुफ़्त बीटा को जनवरी 2027 में खोलने की योजना है: nidhi.today/hi/beta/",
  },
  yes: 'हाँ',
  no: 'नहीं',
};

/** Spanish: tú, as the tools address the reader. */
export const exportEs: typeof exportEn = {
  heading: 'Guarda o comparte estos resultados',
  spreadsheet: 'Descargar como hoja de cálculo (Excel, Google Sheets)',
  print: 'Crear un informe en PDF',
  note: 'Se crea en tu dispositivo. No se sube nada.',
  inApp: '¿Estás dentro de una app? Abre primero esta página en el navegador de tu móvil (menú •••) y luego guarda.',
  downloaded: 'Hoja de cálculo creada. Mírala en tus descargas.',
  notReady: 'Funcionan cuando se muestran los resultados.',
  report: {
    heading: 'Tus resultados',
    made: 'Creado el {date}',
    answer: 'Tu respuesta',
    meaning: 'Qué significa',
    entered: 'Lo que introdujiste',
    assumptions: 'Supuestos y límites',
    sampled: 'Se muestra un año de cada cinco, además del último. La hoja de cálculo contiene todos los años.',
    footer: 'Creado en nidhi.today el {date}. Una estimación con fines educativos, no asesoramiento financiero. Este informe contiene las cifras que escribiste. Se creó en tu dispositivo y no se subió nada.',
    beta: "El planificador de nidhi está en desarrollo. Está previsto que su beta gratuita se abra en enero de 2027: nidhi.today/es/beta/",
  },
  sheets: {
    about: 'Información',
    inputs: 'Datos introducidos',
  },
  columns: {
    item: 'Concepto',
    value: 'Valor',
  },
  about: {
    tool: 'Herramienta',
    made: 'Creado el',
    currency: 'Moneda',
    page: 'Página',
    privacy: 'Privacidad',
    privacyText: 'Creado en tu navegador. nidhi nunca recibió estas cifras y no puede ver ni borrar este archivo.',
    note: 'Nota',
    noteText:
      'Una estimación educativa de una herramienta gratuita, no asesoramiento financiero. La página explica cómo se calcula y qué deja fuera.',
    beta: "Beta del planificador",
    betaText: "El planificador de nidhi está en desarrollo. Está previsto que su beta gratuita se abra en enero de 2027: nidhi.today/es/beta/",
  },
  yes: 'Sí',
  no: 'No',
};

/** Czech: vy, as the tools address the reader; imperatives in the plural. */
export const exportCs: typeof exportEn = {
  heading: 'Uložte nebo sdílejte tyto výsledky',
  spreadsheet: 'Stáhnout jako tabulku (Excel, Google Sheets)',
  print: 'Vytvořit zprávu v PDF',
  note: 'Vzniká ve vašem zařízení. Nic se nenahrává.',
  inApp: 'Máte stránku otevřenou v aplikaci? Nejdřív ji otevřete v prohlížeči telefonu přes nabídku ••• a potom ji uložte.',
  downloaded: 'Tabulka je hotová. Najdete ji ve stažených souborech.',
  notReady: 'Fungují, jakmile se zobrazí výsledky.',
  report: {
    heading: 'Vaše výsledky',
    made: 'Vytvořeno {date}',
    answer: 'Vaše odpověď',
    meaning: 'Co to znamená',
    entered: 'Zadané údaje',
    assumptions: 'Předpoklady a omezení',
    sampled: 'Zobrazen je každý pátý rok a poslední rok. Tabulka obsahuje všechny roky.',
    footer: 'Vytvořeno na nidhi.today dne {date}. Vzdělávací odhad, ne finanční poradenství. Tato zpráva obsahuje zadaná čísla. Vznikla ve vašem zařízení a nic se nenahrálo.',
    beta: "Plánovač nidhi se připravuje. Jeho beta zdarma se má otevřít v lednu 2027: nidhi.today/cs/beta/",
  },
  sheets: {
    about: 'O souboru',
    inputs: 'Zadané údaje',
  },
  columns: {
    item: 'Položka',
    value: 'Hodnota',
  },
  about: {
    tool: 'Nástroj',
    made: 'Vytvořeno',
    currency: 'Měna',
    page: 'Stránka',
    privacy: 'Soukromí',
    privacyText: 'Vytvořeno ve vašem prohlížeči. nidhi tato čísla nikdy nedostalo a tento soubor nevidí ani nemůže smazat.',
    note: 'Poznámka',
    noteText:
      'Vzdělávací odhad z bezplatného nástroje, ne finanční poradenství. Stránka vysvětluje, jak se počítá a co do výpočtu nezahrnuje.',
    beta: "Beta plánovače",
    betaText: "Plánovač nidhi se připravuje. Jeho beta zdarma se má otevřít v lednu 2027: nidhi.today/cs/beta/",
  },
  yes: 'Ano',
  no: 'Ne',
};

/** Marathi: तुम्ही, as the tools address the reader. */
export const exportMr: typeof exportEn = {
  heading: 'हे निकाल सेव्ह किंवा शेअर करा',
  spreadsheet: 'स्प्रेडशीट म्हणून डाउनलोड करा (Excel, Google Sheets)',
  print: 'PDF अहवाल तयार करा',
  note: 'तुमच्या डिव्हाइसवर तयार होते. काहीही अपलोड होत नाही.',
  inApp: 'एखाद्या ॲपच्या आत आहात? आधी हे पेज तुमच्या फोनच्या ब्राउझरमध्ये उघडा (••• मेन्यू), मग सेव्ह करा.',
  downloaded: 'स्प्रेडशीट तयार झाली. तुमचे डाउनलोड पाहा.',
  notReady: 'निकाल दिसल्यावर ही बटणे काम करतात.',
  report: {
    heading: 'तुमचे निकाल',
    made: '{date} रोजी तयार केला',
    answer: 'तुमचे उत्तर',
    meaning: 'याचा अर्थ',
    entered: 'तुम्ही काय भरले',
    assumptions: 'गृहीतके आणि मर्यादा',
    sampled: 'दर पाचवे वर्ष आणि शेवटचे वर्ष दाखवले आहे. स्प्रेडशीटमध्ये प्रत्येक वर्षाचा समावेश आहे.',
    footer: 'nidhi.today वर {date} रोजी तयार केला. हा शैक्षणिक अंदाज आहे, आर्थिक सल्ला नाही. या अहवालात तुम्ही भरलेले आकडे आहेत. तो तुमच्या डिव्हाइसवर तयार झाला, आणि काहीही अपलोड झाले नाही.',
    beta: "nidhi चा प्लॅनर तयार होत आहे. त्याचा मोफत बीटा जानेवारी 2027 मध्ये सुरू करण्याची योजना आहे: nidhi.today/mr/beta/",
  },
  sheets: {
    about: 'माहिती',
    inputs: 'तुम्ही भरलेली माहिती',
  },
  columns: {
    item: 'तपशील',
    value: 'मूल्य',
  },
  about: {
    tool: 'साधन',
    made: 'तयार केल्याची तारीख',
    currency: 'चलन',
    page: 'पेज',
    privacy: 'गोपनीयता',
    privacyText: 'तुमच्या ब्राउझरमध्ये तयार झाली. हे आकडे nidhi पर्यंत कधीच पोहोचले नाहीत, आणि nidhi ही फाइल पाहू किंवा हटवू शकत नाही.',
    note: 'टीप',
    noteText:
      'हा एका मोफत साधनाचा शैक्षणिक अंदाज आहे, आर्थिक सल्ला नाही. पेजवर याची गणना कशी होते आणि यात कोणत्या गोष्टी धरलेल्या नाहीत हे सांगितले आहे.',
    beta: "प्लॅनर बीटा",
    betaText: "nidhi चा प्लॅनर तयार होत आहे. त्याचा मोफत बीटा जानेवारी 2027 मध्ये सुरू करण्याची योजना आहे: nidhi.today/mr/beta/",
  },
  yes: 'हो',
  no: 'नाही',
};
