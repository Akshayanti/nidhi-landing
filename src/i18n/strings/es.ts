import { toolsEs } from './tools/index.ts';
import { learnEs } from './learn.ts';
import type { Dict } from './types.ts';

/**
 * Spanish strings. Typed as `Dict`, so a missing or an extra key is a type error
 * and `catalog.test.ts` re-checks the key sets at build time.
 *
 * Neutral international Spanish, addressed with tú. The vocabulary, the amount
 * format (`10.000 €`) and the other rules are fixed by docs/i18n/es-glossary.md;
 * change a term there first, so the chrome, the path and the tools keep agreeing.
 */
export const es: Dict = {
  skipToContent: 'Saltar al contenido',
  // Spanish ends a sentence with the same full stop as English.
  fullStop: '.',
  a11y: {
    breadcrumb: 'Ruta de navegación',
  },

  /**
   * The brand line, "Money, understood", is "El dinero, entendido" in Spanish
   * (lower case after the colon here, per the RAE). It must read the same
   * wherever it appears: here, the footer tagline and the keys under `home`.
   */
  meta: {
    defaultImageAlt: 'nidhi: el dinero, entendido. Herramientas de finanzas personales y educación financiera.',
  },

  languagePicker: {
    label: 'Idioma',
    current: 'idioma actual',
  },

  nav: {
    primaryLabel: 'Principal',
    menuLabel: 'Menú',
    menuCloseLabel: 'Cerrar menú',
    homeLabel: 'Inicio de nidhi',
    newTabHint: ' (se abre en una pestaña nueva)',
    groups: { learn: 'Aprende', tools: 'Herramientas gratuitas', about: 'Acerca de', language: 'Idioma' },
    buttons: { tools: 'Herramientas gratuitas', learn: 'Aprende' },
    items: {
      blog: 'Ruta de aprendizaje',
      blogTopics: 'Explorar temas',
      glossary: 'Glosario',
      learnEditorial: 'Cómo se escriben las lecciones',
      multiCurrencyNetWorth: 'Calculadora de patrimonio neto',
      loanComparison: 'Comparador de préstamos',
      monteCarloSimulator: 'Simulador Monte Carlo',
      inflationCalculator: 'Calculadora de inflación',
      allTools: 'Todas las herramientas gratuitas',
      about: 'Sobre nidhi',
      beliefs: 'En qué creo',
      editorialPolicy: 'Política editorial',
      contact: 'Contáctanos',
      email: 'Correo electrónico',
      instagram: 'Instagram',
    },
    // Sentence case in Spanish, so the dropdown's tool names match the sheet's.
    // The keys stay because `Dict` requires them.
    menu: {
      multiCurrencyNetWorth: 'Calculadora de patrimonio neto',
      loanComparison: 'Comparador de préstamos',
      monteCarloSimulator: 'Simulador Monte Carlo',
      inflationCalculator: 'Calculadora de inflación',
      allTools: 'Ver todas las herramientas gratuitas',
    },
  },

  footer: {
    tagline: 'El dinero, entendido',
    columns: {
      learn: 'Aprende',
      tools: 'Herramientas gratuitas',
      about: 'Acerca de',
      connect: 'Contacto',
    },
    links: {
      blog: 'Ruta de aprendizaje',
      blogTopics: 'Explorar temas',
      glossary: 'Glosario',
      multiCurrencyNetWorth: 'Calculadora de patrimonio neto',
      loanComparison: 'Comparador de préstamos',
      monteCarloSimulator: 'Simulador Monte Carlo',
      inflationCalculator: 'Calculadora de inflación',
      allTools: 'Ver todas',
      about: 'Sobre nidhi',
      beliefs: 'En qué creo',
      volunteers: 'Voluntariado',
      beta: "Beta del planificador",
      editorialPolicy: 'Política editorial',
      changes: 'Qué ha cambiado',
      privacy: 'Privacidad',
      cookieSettings: 'Configuración de cookies',
    },
    disclaimerShort:
      'nidhi ofrece información y herramientas educativas para ayudarte a entender tu dinero. No es un profesional acreditado de las finanzas.',
    disclaimerLong:
      'El contenido y las herramientas son educativos y no deben tomarse como asesoramiento profesional financiero, de inversión ni fiscal. La rentabilidad pasada de cualquier inversión no es indicativa de resultados futuros. Para las decisiones importantes, consulta a un profesional acreditado.',
    copyright: '© {year} nidhi. Todos los derechos reservados.',
  },

  cookie: {
    dialogLabel: 'Consentimiento de cookies',
    // The space at the end of `textBefore` and the one at the start of
    // `textAfter` are part of the sentence. The opening ¿ sits in `textBefore`.
    textBefore:
      'Contamos visitas anónimas a las páginas en cualquier caso, para ver qué resulta útil. ¿Podemos registrar también los ',
    textEmphasis: 'clics',
    textAfter:
      ' para detectar enlaces rotos y diseños que confunden a la gente? Sin anuncios y sin vender datos.',
    privacyLink: 'Mira lo que recogemos de verdad →',
    decline: 'No, gracias',
    accept: 'Sí, me parece bien',
  },

  theme: {
    groupLabel: 'Tema',
    light: 'Claro',
    lightTitle: 'Tema claro',
    system: 'Sistema',
    systemTitle: 'Seguir el tema del sistema',
    dark: 'Oscuro',
    darkTitle: 'Tema oscuro',
  },

  // There is no Spanish feed (the lessons are English); translated anyway
  // because the catalog mirrors `en` key for key.
  rss: {
    linkTitle: 'nidhi | Blog de finanzas personales',
    feedTitle: 'nidhi: blog de finanzas personales',
    feedDescription:
      'Educación gratuita en finanzas personales: patrimonio neto, presupuesto, ahorro, inversión y gestión de deudas. Mejora tu educación financiera paso a paso.',
  },

  // Page copy, one namespace per page, with the same split-around-the-link
  // shape as the English catalog.

  about: {
    meta: {
      title: 'Sobre nidhi: quién escribe y por qué confiar | nidhi',
      description:
        'Quién escribe nidhi, la formación que hay detrás de los textos y cómo se investiga y documenta cada artículo de finanzas personales.',
    },
    schema: {
      name: 'Sobre nidhi',
      description:
        'Quién escribe nidhi, por qué puedes confiar en lo que escribe y cómo se investiga y documenta cada artículo.',
      organization:
        'Educación en finanzas personales basada en la práctica y la investigación, en nidhi.today, sobre patrimonio neto, gestión del dinero en varias monedas e independencia financiera. Construye las herramientas descritas en los artículos y respalda cada uno con referencias citadas.',
      knowsAbout: {
        personalFinance: 'Finanzas personales',
        financialLiteracy: 'Educación financiera',
        netWorthTracking: 'Seguimiento del patrimonio neto',
        multiCurrencyFinance: 'Finanzas en varias monedas',
        financialIndependence: 'Independencia financiera',
        moneyManagement: 'Gestión del dinero',
      },
      breadcrumbHome: 'Inicio',
      breadcrumbAbout: 'Acerca de',
    },
    title: 'Sobre nidhi',
    intro:
      'nidhi es el nombre que firma estos textos y el del proyecto al que pertenecen. Lo empecé yo, el nombre se quedó, y cuando lees las lecciones, me lees a mí.',
    sections: {
      whoIsWriting: 'Quién escribe',
      whyYouCanTrustIt: 'Por qué puedes confiar en ello',
      howPostsAreMade: 'Cómo se hacen los artículos',
      whatNidhiKnowsAbout: 'De qué sabe nidhi',
    },
    body: {
      // No gendered subject for the one person behind the site, as in the English.
      whoIsWriting:
        'Cada artículo de este sitio sale bajo un solo nombre: nidhi. Lo empecé porque no encontraba una herramienta financiera que sirviera para una vida corriente, con dinero en más de una moneda, deudas en otra y un futuro que cruzaba fronteras. Las lecciones salen de ese mismo lugar: preguntas reales que he tenido que responder, explicadas como me habría gustado que me las explicaran.',
      // "referential reading" is the lessons' own English heading, so it is
      // quoted as it appears there and glossed in Spanish.
      whyYouCanTrustIt1:
        'La autoridad aquí viene de la práctica y de la investigación, no de una lista de títulos detrás de un nombre. nidhi construye las herramientas descritas en los artículos, así que lo escrito se apoya en hacer los números, no en repetir frases hechas. Cuando un artículo afirma algo, señala la fuente: los libros, las páginas de referencia y el material primario que aparecen en cada artículo bajo «referential reading» (lecturas de referencia).',
      sourcesCount:
        'En las {lessons} lecciones publicadas, las listas de lecturas recomendadas remiten a {sources} libros, artículos y páginas de referencia distintos. Las fuentes citadas solo dentro del texto de una lección no se cuentan aquí.',
      correctionsCount: {
        one: 'También he publicado 1 corrección en una lección, que se ve en la propia lección y aparece en ',
        few: 'También he publicado {count} correcciones en lecciones, cada una visible en la propia lección y recogida en ',
        other: 'También he publicado {count} correcciones en lecciones, cada una visible en la propia lección y recogida en ',
        link: 'la política editorial',
        after: '.',
      },
      whyYouCanTrustIt2:
        'Lo que esto no es: asesoramiento financiero con licencia. nidhi explica cómo funciona el dinero para que puedas tomar tus propias decisiones. No te dice qué fondo comprar, ni lo hará nunca. Para las decisiones que dependen de tu residencia fiscal concreta, tu situación legal o tu tolerancia al riesgo, lo adecuado es acudir a un profesional acreditado. Ese límite es deliberado, y es el mismo que figura en el pie de cada página.',
      howPostsAreMade: {
        before:
          'Cada artículo parte de una pregunta concreta, se elabora con números reales y ejemplos resueltos, y se contrasta con referencias citadas antes de publicarse. Las herramientas de IA ayudan a investigar, redactar, editar y revisar las lecciones, lo que incluye cuestionar su razonamiento financiero, y a construir el sitio y sus herramientas gratuitas. Lo que produce la IA es un borrador, nunca una fuente: una persona interviene en cada etapa y lee y aprueba cada lección antes de publicarla. El proceso completo, los criterios sobre fuentes y cómo se gestionan las correcciones están en la ',
        link: 'página de política editorial',
        after: '.',
      },
      whatNidhiKnowsAbout: {
        before:
          'Los textos se centran en el patrimonio neto y cómo medirlo, la gestión del dinero entre monedas, el flujo de efectivo y el ahorro, las deudas y el camino hacia la independencia financiera. Si quieres conocer la visión del mundo que hay detrás de todo esto, lee ',
        link: 'en qué creo',
        after: '.',
      },
    },
    cta: {
      text: '¿Tienes preguntas, correcciones o simplemente quieres saludar?',
      email: 'Escribe a hello@nidhi.today',
      instagram: 'Instagram @nidhi.today',
    },
  },

  /**
   * The beliefs page keeps the English's warm, blunt first person plural.
   * The identity terms are "queer" (used as is in Spanish writing),
   * "neurodivergentes" and "racializadas" for "person of colour", which reads
   * as respectful and current across regions where "de color" can read as
   * dated. "Personas" carries them so no gender is marked.
   */
  beliefs: {
    meta: {
      title: 'En qué creo: herramientas financieras honestas | nidhi',
      description:
        'En qué creo al hacer nidhi: herramientas financieras honestas, educación financiera gratuita, sin anuncios ni venta de datos y lecciones gratis para siempre.',
    },
    schema: {
      name: 'En qué creo',
      description:
        'En qué creo al hacer nidhi: herramientas honestas de finanzas personales, educación financiera gratuita, sin anuncios y sin venta de datos.',
      organization: 'Herramientas de finanzas personales y educación financiera.',
      foundingLocation: 'Praga',
      knowsAbout: {
        personalFinance: 'Finanzas personales',
        financialLiteracy: 'Educación financiera',
        moneyManagement: 'Gestión del dinero',
        multiCurrencyFinance: 'Finanzas en varias monedas',
      },
      breadcrumbHome: 'Inicio',
      breadcrumbAbout: 'En qué creo',
    },
    title: 'En qué creo',
    intro:
      'Empecé nidhi porque no encontraba una herramienta financiera decente y me harté lo suficiente como para construir una',
    items: {
      frustration: {
        heading: 'Todo esto empezó por pura frustración',
        body: 'Quería algo que ayudara a cualquier persona a planificar su dinero, ver adónde va y tomar mejores decisiones con él. No existía nada así. Así que aquí estoy, construyéndolo por mi cuenta.',
      },
      noPlanner: {
        heading: 'Planificar tus finanzas no debería exigir un planificador financiero',
        body: 'Tanto si acabas de conseguir tu primer trabajo como si te faltan cinco años para jubilarte, mereces herramientas y orientación que de verdad tengan sentido. Sin jerga. Sin intentos de venderte más. Solo respuestas claras.',
      },
      accessibility: {
        heading: 'Hecho para todas las personas que la tecnología sigue olvidando',
        body: 'Muchas aplicaciones olvidan, muy oportunamente, que las herramientas de dinero deberían funcionar tanto si tienes daltonismo como si usas un lector de pantalla o procesas la información de otra manera, por ejemplo por TDAH o dislexia. Soy una persona queer, neurodivergente y racializada, así que nunca tuve ese lujo. Dejar a alguien fuera de su propio dinero me parece mezquino.',
      },
      freeForever: {
        heading: 'Las lecciones son gratis, para siempre',
        body: 'Sin muros de pago, sin tonterías de «suscríbete para ver lo bueno». Si algo que escribí te ayudó a tomar una mejor decisión, aunque nunca llegues a usar mi producto, de eso se trata. Cuéntamelo. Eso es lo que me mantiene en marcha.',
      },
      rulesOfThumb: {
        heading: 'No solo las reglas generales',
        body: 'Una regla general es un punto de partida, no una respuesta. Cuando una lección da una, también explica por qué existe, dónde falla y qué depende de ti: tu país, tus ingresos, tus deudas, con cuánta antelación planificas. Prefiero que entiendas el razonamiento a que sigas una regla que nunca se escribió para tu vida.',
      },
      noAds: {
        heading: 'Sin anuncios, sin venta de datos, sin letra pequeña',
        body: 'No pongo anuncios. No vendo tus datos. No hago eso tan inquietante de que busques «seguro de vida temporal» y luego te persigan anuncios de eso por todas partes durante una semana. Tus finanzas son asunto tuyo. Literalmente.',
      },
      madeInPrague: {
        heading: 'Hecho en Praga, impulsado por el boca a boca',
        body: 'Sin dinero de capital de riesgo. Sin equipo de crecimiento. Sin carteles en la autopista. Si nidhi te parece útil, cuéntaselo a alguien. Esa es mi principal estrategia de marketing.',
      },
    },
    cta: {
      text: '¿Te he convencido? ¿O crees que solo digo tonterías?',
      sub: 'Sea como sea, me encantará saber de ti',
      email: 'Mándame una carta de amor',
      instagram: 'Escríbeme por mensaje privado',
    },
  },

  /**
   * The editorial policy. The five step names match the lessons' own order:
   * the idea, why people use it, the evidence, where it breaks, what depends
   * on you. Headings quoted from English lessons ("Where to check locally",
   * "referential reading", "last updated") stay in English with a gloss,
   * because that is what the reader will see on the lesson.
   */
  editorialPolicy: {
    meta: {
      title: 'Política editorial: cómo escribe nidhi sus lecciones | nidhi',
      description:
        'Cómo se escribe y revisa cada lección de nidhi: de dónde salen sus cifras, por qué sirve en cualquier país, cómo se usa la IA y dónde acaba la educación.',
    },
    schema: {
      name: 'Política editorial',
      description:
        'Cómo construye y revisa nidhi cada lección, sus criterios sobre fuentes, por qué las lecciones se escriben para cualquier país, cómo se usan las herramientas de IA, el límite con el asesoramiento y cómo se gestionan las correcciones.',
      breadcrumbHome: 'Inicio',
      breadcrumbThis: 'Política editorial',
    },
    title: 'Política editorial',
    intro:
      'Lo que se escribe sobre dinero debería ser fácil de comprobar y honesto sobre sus límites. Esta página explica cómo se construye, documenta, revisa y corrige cada lección de nidhi, cómo se usan las herramientas de IA en el proceso y dónde está la línea entre educación y asesoramiento.',
    sections: {
      howALessonIsBuilt: 'Cómo se construye una lección',
      anyCountry: 'Escrito para cualquier país',
      sourcesAndFigures: 'Fuentes y cifras',
      ai: 'Cómo se usa la IA',
      advice: 'Educación, no asesoramiento',
      corrections: 'Correcciones',
      whoIsBehind: 'Quién está detrás',
    },
    body: {
      builtIntro:
        'Cada lección parte de una pregunta que haría una persona real y la trabaja con números de verdad. Muchas personas que leen esto se acercan al dinero por primera vez, y una frase dicha con seguridad puede sonar a instrucción, así que las lecciones explican en lugar de decirte qué hacer. Cada idea, regla general o práctica habitual pasa por los mismos cinco pasos:',
      builtSteps: {
        idea: {
          lead: 'La idea',
          rest: ', en palabras sencillas, con la jerga definida la primera vez que aparece.',
        },
        why: {
          lead: 'Por qué se usa',
          rest: ': el problema que resuelve y por qué se extendió.',
        },
        evidence: {
          lead: 'La evidencia',
          rest: ', citada y con sus límites: de qué país son los datos, de qué años y qué deja fuera.',
        },
        breaks: {
          lead: 'Dónde falla',
          rest: ': las situaciones para las que no se pensó.',
        },
        depends: {
          lead: 'Qué depende de ti',
          rest: ': el país, lo estables que son tus ingresos, cuánto tiempo tienes, las deudas y los impuestos.',
        },
      },
      builtOutro:
        'Una regla general es un punto de partida, no una respuesta, así que las lecciones describen lo que hace mucha gente y evitan «siempre» y «nunca» salvo que la evidencia lo respalde. Antes de publicar una lección, se relee buscando dos cosas: si sus afirmaciones están respaldadas y si alguien que empieza podría seguirla sin un glosario. Si algo se escapa, consulta Correcciones más abajo.',
      anyCountry:
        'Las lecciones están escritas para quien lea desde cualquier lugar, no para un solo país. Las ideas que enseñan, como el patrimonio neto, la diversificación o cómo la inflación reduce el valor de los ahorros, funcionan igual en todas partes. Las reglas en torno a esas ideas no: los impuestos, la jubilación y las cuentas con ventajas fiscales, las pensiones y ayudas públicas, la puntuación de crédito, la protección de los depósitos y la legislación de protección al consumidor cambian de un país a otro, y a veces dentro de un mismo país. Las lecciones explican la idea general a propósito. Cuando una lección depende de reglas como estas, lo dice, y una nota «Where to check locally» (dónde consultarlo en tu país) al final de la lección indica los lugares habituales para comprobarlas allí donde vives, como tu autoridad fiscal, tu regulador financiero o un asesor local acreditado. Los ejemplos suelen estar en euros; es una elección de moneda, no una señal de que una regla sea europea. Cuando la evidencia viene de los datos de un solo país, como el historial de la bolsa de EE. UU., la lección también lo dice, junto con lo que quizá no te diga sobre otros mercados.',
      sourcesAndFigures:
        'Las afirmaciones se apoyan en fuentes primarias y en fuentes secundarias de prestigio: libros reconocidos, material de referencia acreditado y datos públicos. Cuando una lección se basa en fuentes concretas, aparecen en la propia lección bajo «referential reading» (lecturas de referencia), para que puedas seguir la pista en lugar de fiarte de nuestra palabra. Cada cifra indica de dónde sale y qué abarca, y la misma cifra coincide en todas las lecciones. Los ejemplos resueltos usan números realistas, y cuando un número es ilustrativo y no una previsión, la lección lo dice. Los tipos de cambio de las herramientas gratuitas son tipos de referencia de bancos centrales y otras fuentes oficiales, con su fecha en pantalla.',
      aiUsed1:
        'nidhi usa herramientas de IA en su trabajo, entre ellas Claude, de Anthropic, y otros agentes de IA. Ayudan a investigar, redactar y editar las lecciones; a revisar las lecciones frente a esta página; a cuestionar el razonamiento financiero de una lección o de una herramienta desde el punto de vista de un asesor con experiencia; y a construir el sitio y sus herramientas gratuitas. Distintos agentes de IA se enfrentan a propósito al trabajo de los demás, para detectar lo que a uno se le escapa.',
      aiUsed2: {
        // Spanish keeps the space before the link; the English's missing
        // space is a known bug in that page only.
        before:
          'Lo que produce la IA es un borrador, nunca una fuente. Una persona interviene en cada etapa y lee y aprueba cada lección antes de publicarla. Un modelo de IA al que se le pide pensar como un asesor financiero sirve para comprobar el razonamiento, no ofrece el asesoramiento de un profesional acreditado. El propio sitio no envía a ningún servicio de IA nada de lo que escribes o haces; lo que recogemos se describe en el ',
        link: 'aviso de privacidad',
        after: '.',
      },
      advice:
        'nidhi no es un profesional acreditado de las finanzas, y nada de lo que hay en el sitio es asesoramiento financiero personal, de inversión ni fiscal. Las lecciones no recomiendan productos, fondos ni valores concretos. La rentabilidad pasada de cualquier inversión no es indicativa de resultados futuros. Para las decisiones que dependen de tu residencia fiscal, tu situación legal o tu tolerancia al riesgo, un profesional acreditado puede aplicar estas ideas a tus circunstancias.',
      corrections: {
        before:
          'Si algo está mal, queremos corregirlo. Si ves un error, una cifra desactualizada o una afirmación que ya no se sostiene, escribe a ',
        after:
          '. Las correcciones de fondo se hacen en la lección y se reflejan en su fecha de «last updated» (última actualización), para que el cambio se vea en lugar de colarse en silencio. Los arreglos menores, como las erratas, se hacen sin cambiar la fecha.',
      },
      correctionsList:
        'Cuando corrijo algo que podría cambiar lo que entiendes o lo que decides, lo anoto en la lección y lo recojo aquí. Las erratas se corrigen sin aviso.',
      whoIsBehind: {
        before: 'Para saber quién escribe nidhi y la experiencia que hay detrás de los textos, consulta la ',
        aboutLink: 'página Sobre nidhi',
        middle: '. Para conocer la visión del mundo que guía lo que decido construir y publicar, lee ',
        beliefsLink: 'en qué creo',
        after: '.',
      },
    },
  },

  /**
   * The volunteers page (/volunteers/), the call for translators. Language names
   * are not here: they are names, in their own script, from LOCALE_META and the
   * page's list of upcoming editions.
   */
  volunteers: {
    meta: {
      title: 'Ayuda a traducir nidhi: voluntariado | nidhi',
      description:
        'Si hablas español, checo, maratí o uno de los próximos idiomas de forma nativa o casi nativa, ayuda a aclarar las palabras de nidhi y a traducir las lecciones.',
    },
    title: 'Ayuda a traducir nidhi',
    lead:
      'nidhi se puede leer en cinco idiomas, con traducciones hechas con ayuda de IA. Busco personas que hablen su idioma de forma nativa o casi nativa, para que las palabras sean claras, naturales y precisas, y para ayudar a traducir las lecciones, que por ahora solo están en inglés. Si además sabes de finanzas, mejor aún.',
    nowHeading: 'Se necesita ayuda ya',
    nowNote: 'El hindi ya está cubierto.',
    cta: 'Abrir el formulario de voluntariado',
    note: { before: 'El formulario se abre en Google Forms. Qué recoge y cuánto tiempo se guarda: ', link: 'aviso de privacidad', after: '.' },
    nextHeading: 'Próximos idiomas',
    nextNote:
      '¿Hablas alguno de estos? Deja tu contacto en el mismo formulario y te escribiré cuando empiece el trabajo en tu idioma.',
    doHeading: 'Qué harías',
    do: {
      review: 'Revisar las páginas y herramientas del sitio en tu idioma.',
      words: 'Señalar palabras que suenen raras, poco claras o inexactas.',
      lessons: 'Ayudar a traducir las lecciones, para que puedan empezar a aparecer en tu idioma.',
    },
    getHeading: 'Qué recibes',
    get: {
      say: { lead: 'Voz en las palabras:', rest: ' ayuda a decidir cómo explica nidhi el dinero en tu idioma.' },
      credit: {
        lead: 'Crédito, si lo quieres:',
        rest: ' elige el nombre que aparece en el sitio. Varias personas pueden recibir crédito por un mismo idioma, y puedes pedir que lo quitemos en cualquier momento.',
      },
      beta: {
        lead: "Invitación a la beta del planificador, si la quieres:",
        rest: " una opción aparte y opcional en el formulario. Si creas tu cuenta mientras la beta está abierta, recibes, como quienes prueban la beta, las funciones de pago gratis durante 12 meses tras el lanzamiento. ",
        link: "Cómo funciona la beta",
        after: ".",
      },
      brag: { lead: 'Motivo de orgullo:', rest: ' alguien puede leer sobre dinero en su idioma gracias a ti.' },
    },
  },
  beta: {
    meta: {
      title: "Beta gratuita del planificador financiero personal | nidhi",
      description: "Beta gratuita del planificador de nidhi, solo por invitación. Las funciones de pago siguen gratis 12 meses tras el lanzamiento.",
    },
    title: "La beta del planificador",
    lead: "Estoy creando un planificador para vidas reales: lo que tienes, debes, ganas y prevés gastar en un solo lugar, en una moneda o en varias, proyectado hacia el futuro con los supuestos a la vista. La beta es gratuita y está previsto que se abra en enero de 2027. El acceso puede abrirse antes, por etapas.",
    getHeading: "Qué reciben quienes prueban la beta",
    get: {
      during: "Las funciones de pago son gratuitas durante la beta.",
      freeYear: "Tras el lanzamiento, las funciones de pago siguen siendo gratuitas durante 12 meses.",
      founding: "Después de ese año, puedes conservarlas a un precio de fundador, con facturación anual, fijo mientras mantengas la suscripción.",
      noCard: "No se pide tarjeta durante la beta ni durante el año gratuito. No se cobra nada automáticamente.",
    },
    whoHeading: "Quién forma parte de la beta",
    who: "Cualquier persona que cree una cuenta mientras la beta está abierta. Durante la beta, las cuentas son solo por invitación y las invitaciones se envían por etapas, así que no todo el mundo podrá crear una enseguida.",
    afterHeading: "Después del año gratuito",
    after: {
      take: "Puedes elegir el precio de fundador hasta 30 días después de que termine tu año gratuito.",
      free: "O pasar al plan gratuito. Tus datos se conservan y puedes exportarlos cuando quieras.",
      remind: "Una vez que tengas cuenta, te lo recordaré en el planificador y por correo 30 días, 14 días y 1 día antes de que termine tu año gratuito.",
      cancel: "Si cancelas más adelante, el precio de fundador termina. Si vuelves, pagas el precio normal.",
    },
    undecidedHeading: "Aún sin decidir",
    undecided: "Los precios y la fecha de lanzamiento no están fijados. Los anunciaré antes del lanzamiento.",
    whyHeading: "Por qué unirte",
    why: {
      early: "Ves el planificador antes de que se abra a todo el mundo. Durante la beta es solo por invitación, y las invitaciones van a quienes están en la lista de espera.",
      shape: "Lo que me cuentes da forma a lo que llegue a ser.",
      whole: "Las herramientas gratuitas responden a una pregunta cada vez. El planificador se está creando para reunir todo el panorama, para que puedas comparar decisiones antes de tomarlas.",
    },
    howHeading: "Cómo funciona",
    how: {
      join: "Apúntate a la lista de espera de abajo.",
      email: "Mientras estés en la lista de espera, recibirás un solo correo cuando se abra tu acceso. Ese correo es tu invitación.",
      account: "Crea tu cuenta. Desde ese momento, formas parte de la beta.",
      use: "Úsalo y cuéntame qué le falta.",
    },
  },
  changes: {
    meta: {
      title: 'Qué ha cambiado: pequeñas novedades de nidhi | nidhi',
      description:
        'Qué ha cambiado en nidhi y cuándo: páginas nuevas, correcciones y pequeñas mejoras, lo más reciente primero, en todos los idiomas.',
    },
    title: 'Qué ha cambiado',
    intro:
      'Los pequeños cambios que hago en este sitio, a medida que salen, lo más reciente primero. Sin hoja de ruta ni cuenta atrás: solo lo que ha cambiado de verdad. Las lecciones nuevas están en la ruta de aprendizaje; esta página es para todo lo demás.',
    feedTitle: 'Qué ha cambiado en nidhi',
    followRss: 'Sigue estos cambios por RSS',
    countOne: '{count} cambio',
    countFew: '{count} cambios',
    countOther: '{count} cambios',
  },

  /**
   * The free tools hub. The two bullets a reader would check against the
   * privacy notice (where the network call goes, what the address carries)
   * are worded to match it.
   */
  freeHub: {
    cta: 'Abrir la herramienta',
    meta: {
      title: 'Calculadoras y herramientas financieras gratuitas | nidhi',
      description:
        'Calculadoras gratuitas: patrimonio neto, préstamos, inflación y simulador Monte Carlo de jubilación. Sin registro ni rastreo, todo en tu navegador.',
      descriptionWithoutSimulator:
        'Calculadoras gratuitas de patrimonio neto, préstamos e inflación. Sin registro ni rastreo; todos los cálculos se hacen en tu navegador.',
    },
    schema: {
      breadcrumbHome: 'Inicio',
      breadcrumbThis: 'Herramientas gratuitas',
      itemListName: 'Herramientas gratuitas de finanzas personales de nidhi',
      collectionName: 'Herramientas gratuitas de finanzas personales',
    },
    breadcrumb: {
      home: 'Inicio',
      this: 'Herramientas gratuitas',
    },
    eyebrow: 'Herramientas gratuitas',
    title: 'Herramientas gratuitas de finanzas personales que funcionan en tu navegador.',
    lead: 'Sin registro, sin cuenta y sin datos enviados a un servidor. Cada calculadora de esta página funciona por completo en tu navegador, con tipos de cambio oficiales actualizados cuando hace falta convertir monedas. Pensadas para quien vive fuera de su país, ahorra entre fronteras o ya se quedó corto con una hoja de cálculo.',
    tools: {
      multiCurrencyNetWorth: {
        kicker: 'Una moneda o varias',
        title: 'Calculadora de patrimonio neto',
        desc: 'Añade lo que tienes y lo que debes para ver tu patrimonio neto. Funciona en una moneda o en 38, con tipos de cambio oficiales actualizados, y si tienes varias, muestra qué parte de tu patrimonio está en monedas en las que no gastas.',
        itemName: 'Calculadora de patrimonio neto y analizador de riesgo cambiario',
      },
      loanComparison: {
        kicker: 'Decisiones de endeudamiento',
        title: 'Comparador de préstamos',
        desc: 'Compara dos o tres ofertas de préstamo una al lado de otra. Tasa porcentual anual (APR), costo total del préstamo, escenarios de refinanciación y tabla de amortización por entidad financiera, sin hoja de cálculo.',
        itemName: 'Calculadora para comparar préstamos',
      },
      monteCarlo: {
        kicker: 'Proyecciones y jubilación',
        title: 'Simulador Monte Carlo',
        desc: 'Proyecta tus ahorros miles de veces con rentabilidades tomadas del historial a largo plazo de los mercados mundiales. Mira un resultado bajo, uno mediano y uno alto, y con qué frecuencia el dinero dura una vez que vives de él.',
        itemName: 'Simulador Monte Carlo para la jubilación',
      },
      inflation: {
        kicker: 'Los precios con el tiempo',
        title: 'Calculadora de inflación',
        desc: 'Mira qué compra una cantidad tras años de inflación, cuánto podría costar algo más adelante y si una subida salarial sigue el ritmo, con la historia anual de casi todos los países, del Banco Mundial.',
        itemName: 'Calculadora de inflación',
      },
    },
    how: {
      title: 'Cómo funcionan estas herramientas',
      browser: {
        strong: 'Todos los cálculos se hacen en tu navegador.',
        rest: ' Los números que escribes, los valores que subes y cualquier resultado se quedan en tu dispositivo. No se envían a nidhi ni a ningún tercero.',
      },
      // The link between `before` and `after` is a product name held by the
      // component; the spaces live at the ends of the two fragments.
      rates: {
        strong: 'Tipos de cambio oficiales actualizados cuando hacen falta.',
        before: ' Cuando una herramienta necesita convertir monedas, tu navegador obtiene los tipos de referencia de la API de ',
        after: ' (un servicio gratuito y abierto que reúne los tipos de cambio que publican bancos centrales y otras fuentes oficiales). La solicitud solo incluye la moneda funcional que eliges, no los datos de tus activos.',
      },
      noSignup: {
        strong: 'Sin registro, sin cuenta y sin correo electrónico.',
        rest: ' Puedes usar las herramientas directamente desde la página. Mientras usas una herramienta, no se escribe nada en la dirección de la página. Un enlace para compartir opcional lleva tus datos después del signo #, una parte de la dirección que los navegadores nunca envían a un servidor, así que tú decides si compartes y con quién.',
      },
      education: {
        strong: 'Educativas, no asesoramiento.',
        rest: ' Cada herramienta te muestra los cálculos que hay detrás del resultado y los supuestos que usa, para que puedas aplicar la misma lógica a tu situación. Para las decisiones importantes, consulta a un profesional acreditado.',
      },
    },
    footer: {
      before: '¿Quieres el razonamiento completo detrás de estas herramientas? Lee la ',
      blogLink: 'ruta de aprendizaje de nidhi',
      middle: ', el temario en el que se basan, o descubre ',
      beliefsLink: 'lo que creo sobre el dinero y la planificación',
      after: '.',
    },
  },

  privacy: {
    meta: {
      title: 'Aviso de privacidad: cómo trata nidhi tus datos | nidhi',
      description:
        'Aviso de privacidad de nidhi.today en lenguaje claro: qué recopilamos, por qué, dónde se guarda y cómo deshacerte de ello.',
    },
    schema: {
      name: 'Aviso de privacidad: cómo trata nidhi tus datos',
      description:
        'Aviso de privacidad de nidhi.today en lenguaje claro: qué recopilamos, por qué, dónde se guarda y cómo deshacerte de ello.',
      breadcrumbHome: 'Inicio',
      breadcrumbThis: 'Privacidad',
    },
    title: 'Privacidad, con franqueza',
    intro:
      'En pocas palabras: recopilamos lo menos posible, no vendemos nada y puedes deshacerte de lo que tenemos cuando quieras.',
    // The trailing space is the one before the date.
    updatedLabel: 'Última actualización: ',
    updatedLink: 'ver qué cambió',
    englishIsAuthoritative:
      'Este aviso está redactado en inglés, y la versión en inglés es la que prevalece. La traducción está aquí para que puedas leerlo en tu idioma.',
    sections: {
      collect: 'Qué recopilamos y cuándo',
      why: 'Por qué lo recopilamos',
      whereItLives: 'Dónde se guarda',
      whatWeDontDo: 'Lo que no hacemos',
      retention: 'Cuánto tiempo lo conservamos',
      rights: 'Tus derechos',
      children: 'Menores',
      whoWeAre: 'Quiénes somos',
    },

    lead: {
      always: 'Siempre, para que el sitio funcione y siga mejorando:',
      // Quotes the Spanish cookie banner's accept button (cookie.accept).
      withConsent: 'Solo si haces clic en «Sí, me parece bien» en el aviso de cookies:',
      newsletter: 'Si te suscribes al boletín del blog:',
      waitlist: 'Si te apuntas a la lista de espera del planificador:',
      volunteers: 'Si te ofreces para ayudar a traducir el sitio:',
      browserOnly: 'Guardado solo en tu navegador, nunca se nos envía:',
    },

    collect: {
      pageviews: {
        before: 'Eventos anónimos de visita y de salida de página, a través de ',
        link: 'PostHog Cloud EU',
        after:
          '. Eso incluye la URL que visitaste, la URL desde la que llegaste, tu país aproximado (deducido de tu dirección IP, que PostHog descarta después) y tu navegador, sistema operativo y tamaño de ventana. Sin nombre, sin correo electrónico, sin ID de usuario.',
      },
      freeTools: {
        before:
          'Eventos anónimos de interacción en las páginas de herramientas gratuitas: qué moneda eliges en el comparador de préstamos, si cambias entre calcular el plazo y la cuota mensual, si abres el panel «Más opciones», si copias el enlace para compartir y si restableces el formulario. ',
        strong: 'Los valores financieros que escribes nunca se envían',
        after:
          ': ni la cantidad del préstamo, ni la tasa de interés, ni las comisiones, ni el nombre de la entidad financiera. La razón de ser de la calculadora es que los cálculos se hacen en tu navegador.',
      },
      toolAddresses:
        'En todas las herramientas gratuitas, la dirección de la página nunca lleva lo que escribes, así que la URL de la página que queda registrada en la analítica tampoco puede llevarlo. Las herramientas no escriben tus datos en la dirección mientras las usas. Un enlace para compartir los lleva después del signo #, una parte de la dirección que los navegadores nunca envían a un servidor, y la página los saca de la barra de direcciones antes de que empiece la analítica. Como medida de respaldo, el script de analítica elimina todo salvo los parámetros de campaña (utm_source y similares) de cualquier dirección de una herramienta gratuita antes de enviar un evento.',
      toolExports:
        'Todas las herramientas gratuitas pueden descargar una hoja de cálculo con sus resultados o crear un informe en PDF: un resumen breve de los resultados que el cuadro de impresión de tu navegador imprime o guarda como PDF. Las dos cosas se crean en tu navegador y nunca se suben. El archivo o la copia impresa contiene los valores que introdujiste y, una vez guardado, queda fuera de nuestro alcance (tu carpeta de descargas, carpetas sincronizadas, copias de seguridad, otras apps), así que no podemos verlo ni borrarlo. Tu navegador puede añadir la dirección de la página y la fecha en el encabezado o el pie de una copia impresa; puedes desactivarlo en el cuadro de impresión. Usar cualquiera de las dos envía un evento anónimo que dice cuál de las dos usaste, y nada más.',
      monteCarlo: {
        before:
          'Eventos anónimos de interacción en el simulador Monte Carlo: qué moneda eliges, qué ajuste de rentabilidad y qué número de trayectorias simuladas escoges, si activas o desactivas los retiros, si abres la tabla de resultados, si copias el enlace para compartir y si restableces el formulario. ',
        strong: 'Las cantidades, los años, las comisiones y la combinación de activos que introduces nunca se envían.',
      },
      inflation: {
        before:
          'Eventos anónimos de interacción en la calculadora de inflación: qué pregunta eliges («Poder de compra futuro», «Costo futuro», «Del pasado a hoy», «¿Sigue el ritmo?»), qué moneda eliges y de qué país quieres ver la historia, si usas la media de un país como tasa, si copias el enlace para compartir y si restableces el formulario. Elegir un país carga su historia desde el propio nidhi.today, nunca desde el Banco Mundial. ',
        strong: 'Las cantidades, las tasas y los años que introduces nunca se envían.',
      },
      campaigns: {
        before: 'Parámetros de campaña (',
        middle: ', ',
        after: ', etc.) si llegaste desde un enlace etiquetado por nosotros o por otra persona.',
      },
      consentClicks:
        'Mapas de calor de clics y eventos capturados automáticamente: básicamente, en qué elementos de una página se hace clic, incluidos los clics en cosas que no responden («clics muertos»). Lo usamos para detectar enlaces rotos y diseños que confunden a la gente. No registramos en absoluto mediciones de velocidad de página ni errores del navegador. Un clic se describe solo con la etiqueta que el sitio da al elemento (su data-attr), el tipo de elemento y su posición en la página: nunca con su texto, su etiqueta de accesibilidad ni ningún otro atributo, que podría contener lo que escribiste.',
    },

    newsletter: {
      email: 'Tu dirección de correo electrónico.',
      page: 'La página desde la que te suscribiste (para saber si te trajo el índice del blog o una entrada concreta).',
      timestamps: 'La fecha y hora en que te suscribiste, confirmaste y (si lo haces) cancelaste la suscripción.',
      status: 'El estado de tu suscripción: pendiente, confirmada o cancelada.',
      total:
        'Si se suscribe y confirma suficiente gente, el sitio puede mostrar el total de suscriptores confirmados, redondeado hacia abajo. Nunca muestra ninguna dirección de correo ni si una persona concreta se ha suscrito.',
      from: {
        before: 'Los correos del boletín llegan desde ',
        after: '. Añádela a tus contactos para que los avisos de nuevas entradas lleguen a tu bandeja de entrada.',
      },
    },
    waitlist: {
      email: 'Tu dirección de correo electrónico.',
      page: 'La página desde la que te apuntaste.',
      timestamp: 'La fecha y hora en que te apuntaste.',
      singleOptIn: 'Sin paso de confirmación ni seguimiento de estado. Alta directa (single opt-in).',
      total:
        'Si se une suficiente gente a la lista de espera, el sitio puede mostrar el total de inscripciones, redondeado hacia abajo. Nunca muestra ninguna dirección de correo ni si una persona concreta se ha apuntado.',
      from: {
        before: 'El correo de invitación llegará desde ',
        after: '. Añádela a tus contactos para que no acabe en spam.',
      },
    },
    volunteers: {
      form:
        'La página de voluntariado en nidhi.today/volunteers/ forma parte de este sitio. Como todas las páginas, envía un evento anónimo de visita y de salida de la página. Su botón abre un formulario de Google gestionado por nuestra cuenta de Google Workspace; si aceptas el aviso de cookies, el clic en ese botón se registra por su etiqueta, volunteers-form. Tus respuestas solo llegan a Google cuando envías el formulario. No necesitas iniciar sesión, y tu cuenta de Google no forma parte de las respuestas que recibimos.',
      answers:
        'Tu dirección de correo electrónico y lo que decidas contarnos: el nombre para el crédito, qué idiomas, si tienes formación en finanzas (y una nota sobre ella, si la añades), cómo quieres ayudar, si quieres crédito en el sitio y tu nivel en cada idioma.',
      consent:
        'Tu consentimiento para que te contactemos por correo electrónico sobre la traducción, si además pediste que te invitemos a la beta del planificador (una opción aparte y opcional) y la hora a la que enviaste el formulario.',
      credit:
        'Si pides crédito, el nombre que nos diste puede aparecer en el sitio, junto a las demás personas que ayudaron con ese idioma. Puedes cambiarlo o pedir que lo quitemos en cualquier momento.',
      followUp:
        'En esa hoja privada también anotamos el estado del seguimiento y la fecha de nuestro último contacto contigo, para gestionar las respuestas y aplicar el plazo de conservación indicado más abajo. Cada respuesta nueva nos envía un aviso que no incluye ninguna de tus respuestas. Una persona lee cada respuesta, y nada ocurre de forma automática: ni respuestas, ni decisiones, ni créditos, ni altas en la beta.',
      google:
        'La página del formulario es de Google, así que mientras lo rellenas se aplican las condiciones y la política de privacidad de Google.',
    },
    browserStorage: {
      consent: { before: 'Tu elección sobre las cookies (', after: ').' },
      theme: { before: 'Tu preferencia de tema claro, oscuro o del sistema (', after: ').' },
      internal: {
        before: 'Solo para el equipo de nidhi: un indicador (',
        after:
          ') que se activa al abrir una página desde un enlace especial, para que no se cuenten nuestras propias visitas. Mientras está activo, no se ejecuta ninguna analítica en ese navegador.',
      },
      reading: {
        before: 'Qué lecciones has leído (',
        after:
          '), para mostrarte un discreto indicador de «leída» la próxima vez y sugerirte tu siguiente lección en la página de inicio y en la ruta de aprendizaje, incluido el siguiente paso de cada recorrido de «Empieza donde estés».',
      },
      subscription: {
        before: 'Si has confirmado tu suscripción al boletín (',
        after:
          '), para dejar de mostrarte el formulario de suscripción en cada página una vez completada la doble confirmación. Solo se guarda cuando haces clic en el enlace de confirmación de tu correo; nunca contiene tu dirección de correo electrónico.',
      },
      dismissed: {
        before: 'Si has cerrado el aviso de suscripción al boletín (',
        after:
          '), para respetar tu decisión de no volver a verlo durante un tiempo. Solo contiene un tipo de cierre y una fecha y hora, sin dirección de correo ni datos personales.',
      },
      waitlistSignedUp: {
        before: 'Si te has apuntado a la lista de espera del planificador (',
        after:
          '), para dejar de mostrarte el formulario de la lista de espera en futuras visitas. Solo contiene un indicador de estado y una fecha y hora, nunca tu dirección de correo electrónico.',
      },
    },
    clearsEverything: 'Si borras los datos del sitio en tu navegador, todo lo anterior desaparece al instante.',

    why: {
      analytics: {
        lead: 'Analítica:',
        rest: ' para averiguar qué entradas ayudan de verdad a la gente y en cuáles se pierde a mitad de camino. No podemos arreglar lo que no vemos.',
      },
      newsletter: {
        lead: 'Boletín:',
        rest:
          ' para enviarte un correo cuando se publica una nueva entrada del blog, más un recordatorio si empiezas a suscribirte pero no confirmas en 3 días (enviado entre las 9:00 y las 12:00, hora de Praga). Ningún otro correo. Sin promociones, sin secuencias de «te echamos de menos», sin promoción cruzada de otros productos.',
      },
      waitlist: {
        lead: 'Lista de espera:',
        rest: ' para enviarte exactamente un correo cuando se abra tu acceso al planificador de nidhi: tu invitación a la beta. Nada más. Ni un boletín, ni una secuencia automática de correos, ni promoción cruzada.',
      },
      volunteers: {
        lead: 'Voluntariado:',
        rest: ' para entender qué idiomas hablas, tu nivel y tu formación en finanzas, contactarte sobre la traducción, darte crédito en el sitio si lo pediste y, si lo pediste, invitarte a la beta del planificador cuando abra. Nada más.',
      },
      localPreferences: {
        lead: 'Preferencias locales:',
        rest: ' para que el sitio te resulte coherente sin tener que consultar a un servidor. Todo eso se queda en tu dispositivo.',
      },
    },

    where: {
      processors: {
        posthog: {
          name: 'PostHog Cloud EU',
          rest: ' (Fráncfort, Alemania): nuestro encargado del tratamiento para la analítica. La grabación de sesiones está desactivada. Usamos su producto estándar, sin propiedades personalizadas de persona que te identifiquen, salvo si te suscribes: en ese caso, el estado de tu suscripción pasa a ser una propiedad del registro anónimo de persona para el análisis del embudo.',
        },
        google: {
          name: 'Google Workspace',
          before: ' (regiones de Google Cloud en la UE): nuestras direcciones de correo (',
          middle: ' para contacto general y soporte, ',
          after:
            ' para correos automáticos del producto, como invitaciones a la beta y envíos del boletín) y la hoja de Google Sheets que guarda las suscripciones al boletín y las altas en la lista de espera (en pestañas separadas), y el formulario de Google para quienes se ofrecen a traducir, con la hoja donde se guardan sus respuestas. Solo nosotros podemos leer las hojas y las respuestas guardadas en ellas.',
        },
        github: {
          name: 'GitHub Pages',
          rest: ' (un servicio de GitHub / Microsoft): aloja los archivos estáticos de este sitio web. GitHub conserva durante poco tiempo registros de acceso al servidor para prevenir abusos. No los leemos ni recibimos copias.',
        },
        browser: {
          name: 'Tu navegador',
          rest: ': para las preferencias locales indicadas arriba.',
        },
      },
      thatIsAll:
        'Esa es la lista completa de servicios que tratan datos por nosotros. No hay un cuarto encargado del tratamiento escondido en una nota al pie.',
      frankfurter: {
        lead: 'Un servicio al que tu navegador se conecta directamente: Frankfurter',
        rest: ', un servicio gratuito y abierto que reúne los tipos de cambio que publican bancos centrales y otras fuentes oficiales. Tu navegador le pide los tipos más recientes cuando abres la calculadora de patrimonio neto (y otra vez si cambias allí la moneda de tus gastos). La solicitud solo incluye códigos de moneda, nunca tus cantidades ni nada que hayas escrito, y la respuesta es una tabla con los tipos de muchas monedas, de la que la calculadora conserva las que ofrece. Como cualquier solicitud que hace tu navegador, le muestra a Frankfurter tu dirección IP y el tipo de navegador. Va directamente de tu navegador a Frankfurter, así que nosotros nunca la vemos, y Frankfurter es independiente de nosotros: lo que conserve depende de ellos.',
      },
    },

    dontDo: {
      ads: 'No mostramos anuncios. Ninguna tecnología publicitaria en este sitio.',
      sell: 'No vendemos, alquilamos, licenciamos ni redistribuimos tus datos a nadie.',
      crossSite:
        'No te rastreamos entre sitios. Sin píxel de Facebook, sin etiqueta de Google Ads, sin LinkedIn Insight, sin píxel de TikTok, sin retargeting de ningún tipo.',
      screen: 'No grabamos tu pantalla, tus pulsaciones de teclado, los valores de los formularios ni un registro continuo de tu desplazamiento.',
      replies: 'Las respuestas a los correos del boletín llegan a una persona en hello@nidhi.today, que las lee. Nunca las introducimos en ningún sistema de analítica ni de publicidad.',
      imports: 'No importamos las listas del boletín ni de la lista de espera, ni las respuestas del formulario de voluntariado, a ninguna otra herramienta ni sistema de envío de correos.',
    },

    retention: {
      analytics: {
        lead: 'Eventos de analítica:',
        rest: ' 12 meses (el plazo de conservación predeterminado de PostHog; no lo hemos ampliado), y después se eliminan automáticamente.',
      },
      newsletter: {
        lead: 'Suscriptores del boletín:',
        rest: ' mientras mantengas la suscripción, y hasta 30 días después de que canceles la suscripción, para asegurarnos de que no te llegue ni un correo más por error. Pasado ese tiempo, se elimina la fila.',
      },
      waitlist: {
        lead: 'Altas en la lista de espera:',
        rest: ' hasta que enviemos el correo de invitación y hayas tenido tiempo de actuar, o hasta que nos pidas que te eliminemos. Escríbenos cuando quieras.',
      },
      volunteers: {
        lead: 'Respuestas del formulario de voluntariado:',
        rest: ' hasta que nos pidas que las eliminemos, o dos años después de nuestro último contacto contigo, lo que ocurra antes. El crédito en el sitio se mantiene hasta que nos pidas quitarlo.',
      },
      bounced: {
        lead: 'Correos rebotados o no válidos:',
        rest: ' se eliminan en cuanto los detectamos, normalmente en una semana.',
      },
      localStorage: {
        lead: 'Tu localStorage:',
        rest: ' hasta que borres los datos de tu navegador. Una vez más: nosotros nunca lo vemos.',
      },
    },

    rights: {
      intro:
        'Según el RGPD (y normativas similares), tienes derecho a preguntarnos qué datos tenemos sobre ti, a rectificarlos, a exportarlos, a limitar cómo los usamos, a oponerte a su uso o a suprimirlos.',
      unsubscribe:
        'En el caso del boletín, puedes cancelar la suscripción con un enlace de un clic en cada correo que enviamos, y eso también programa la eliminación descrita arriba. En el caso de la lista de espera y del formulario de voluntariado, escríbenos y te eliminaremos, junto con el crédito en el sitio si lo hay. En cualquiera de estos casos, lo haremos a mano si nos lo pides.',
      analytics: {
        before:
          'En cuanto a la analítica, los eventos son anónimos; no tenemos forma de buscar «tus» eventos porque no sabemos quién eres. Si eso te molesta, simplemente rechaza el aviso de cookies o usa un bloqueador de contenido. No se rompe nada en el sitio. Puedes cambiar tu respuesta en cualquier momento con ',
        strong: 'Configuración de cookies',
        after: ', al pie de cada página; si ahí respondes que no, el registro de clics se detiene de inmediato.',
      },
      // The address and the subject word are the component's: one inbox reads
      // every edition.
      contact: {
        before: 'Para cualquier otra cosa, escribe a ',
        middle: ' con la palabra ',
        after: ' en el asunto. Respondemos en unos pocos días.',
      },
    },

    children:
      'Este sitio está escrito para personas adultas que intentan entender su propio dinero. No recopilamos a sabiendas nada de menores de 16 años. Si crees que lo hemos hecho, escríbenos y lo eliminaremos.',

    whoWeAre: {
      intro:
        'nidhi es un pequeño proyecto independiente. Sin inversores, sin equipo de crecimiento, sin presupuesto publicitario. Ahora mismo lo crea y lo gestiona una sola persona en Praga.',
      contact: {
        hello: ': para cualquier cosa, de privacidad o no',
        instagram: ': si prefieres los mensajes directos',
        beliefsLink: 'En qué creemos',
        beliefsRest: ': si quieres saber el porqué',
      },
    },

    changelog: {
      eyebrow: 'Registro de cambios',
      title: 'Cambios en este aviso',
      intro: {
        before:
          'Actualizamos esta misma página. Cada cambio, por pequeño que sea, tiene una entrada en el registro de abajo, empezando por el más reciente. Los últimos se muestran completos; los anteriores se conservan palabra por palabra en «Cambios anteriores». Los cambios que afectan a cómo tratamos los datos personales (un nuevo encargado del tratamiento, una nueva categoría de datos, un cambio en la conservación) se marcan como ',
        after: '.',
      },
      second:
        'No enviamos correos de «hemos actualizado nuestra política de privacidad». Si quieres seguirla de cerca, guarda esta página en favoritos o lee el registro de abajo cuando tengas curiosidad. Si algún cambio te incomoda, puedes cancelar la suscripción al boletín con un enlace de un clic en cada correo, y borrar los datos del sitio en tu navegador elimina todo lo guardado localmente.',
      earlier: 'Cambios anteriores',
      countOne: '{count} cambio',
      countOther: '{count} cambios',
      countFew: '{count} cambios',
      materialTag: 'relevante',
      materialLabel: 'Cambio relevante',
      entriesInEnglish:
        'El registro de abajo se mantiene en inglés, con las palabras con que se escribió, y no se traduce: es la constancia de lo que decía este aviso en una fecha concreta.',
    },
  },

  notFound: {
    meta: {
      title: 'Página no encontrada (404) | nidhi',
      description:
        'Esa página no existe en nidhi. Puede que se haya movido, que la URL esté mal escrita o que el enlace esté desactualizado. Vuelve al inicio para continuar.',
    },
    heading: '404',
    body: 'La página que buscas no existe.',
    cta: 'Ir al inicio',
  },

  /** The newsletter box. See the English catalog for what it promises. */
  subscribe: {
    region: 'Suscripción al boletín',
    title: 'Recibe las nuevas entradas directamente en tu correo',
    text: 'Un correo cuando hay algo nuevo. Sin spam, cancela cuando quieras.',
    inEnglish: 'Las lecciones y los correos están en inglés.',
    readers: '{n}+ lectores reciben las lecciones nuevas por correo.',
    emailLabel: 'Correo electrónico',
    button: 'Suscribirme',
    privacyBefore: 'Doble confirmación. Cancela cuando quieras. ',
    privacyLink: 'Política de privacidad',
    privacyAfter: '.',
    rssFollow: 'Seguir por RSS',
    alreadySubscribed: 'Ya me suscribí',
    notNow: 'Ahora no',
    successTitle: 'Revisa tu correo',
    successBefore: 'Hemos enviado un enlace de confirmación a ',
    successAfter: '. Haz clic en el botón de ese correo para completar la suscripción. Es un momento.',
    yourEmail: 'tu correo',
    hintBefore: '¿No te ha llegado nada en un minuto? Si esta dirección ya estaba suscrita, no cambia nada y no llega ningún correo nuevo. Si no, revisa el spam o ',
    hintRetry: 'prueba con otra dirección',
    hintAfter: '.',
    compactSentBefore: 'Enlace de confirmación enviado a ',
    compactSentAfter: '.',
    compactRetry: 'Usar otro correo',
    confirmPrompt: '¿Es correcta esta dirección?',
    confirmYes: 'Sí, suscribirme',
    confirmChange: 'Cambiarla',
    undo: 'Deshacer',
    dismissedPermanent: '¡Gracias por suscribirte! No volveremos a mostrar este aviso en este dispositivo.',
    dismissedLater: 'Volveremos a preguntar más adelante.',
    sending: 'Enviando…',
    notConfigured: 'Las suscripciones aún no están configuradas. Vuelve pronto o suscríbete al feed RSS.',
    error: 'Algo ha fallado. Inténtalo de nuevo en un momento.',
  },

  /** The early-access waitlist box. See the English catalog for what it promises. */
  waitlist: {
    region: 'Lista de espera de acceso anticipado',
    heading: '¿Quieres el planificador cuando se abra el acceso?',
    joined: '{n}+ personas se han unido a mi lista de espera.',
    beta: { before: "Quienes prueben la beta reciben las funciones de pago gratis durante 12 meses tras el lanzamiento. ", link: "Cómo funciona la beta" },
    emailLabel: 'Correo electrónico',
    cta: 'Avísame',
    privacyBefore: 'Un correo cuando se abra el acceso. ',
    privacyLink: 'Política de privacidad',
    privacyAfter: '.',
    successTitle: 'Ya estás en la lista',
    successBody: 'Te enviaremos un correo cuando se abra el acceso. Nada más. Una dirección que ya estaba en la lista sigue en ella una sola vez.',
    confirmPrompt: '¿Es correcta esta dirección?',
    confirmYes: 'Sí, avísame',
    confirmChange: 'Cambiarla',
    sending: 'Enviando…',
    notConfigured: 'Las inscripciones aún no están configuradas. Vuelve pronto.',
    error: 'Algo ha fallado. Inténtalo de nuevo en un momento.',
  },

  home: {
    meta: {
      title: 'nidhi | Entiende tu dinero y planifica lo que viene',
      description:
        'Lecciones gratuitas de finanzas personales y herramientas privadas para entender tu dinero y planificar el futuro, de lo básico a las finanzas multimoneda.',
      // The brand line "Money, understood" is rendered "El dinero, entendido"
      // everywhere; lower case here only because it follows a colon.
      imageAlt:
        'nidhi: el dinero, entendido. Lecciones gratuitas de finanzas personales y herramientas privadas para entender tu dinero y planificar tu futuro.',
    },
    /** Structured data, not visible text. It still reads in the page's language. */
    schema: {
      slogan: 'El dinero, entendido',
      organization:
        'nidhi ayuda a personas corrientes a entender su dinero: lecciones gratuitas y estructuradas de finanzas personales, herramientas privadas que funcionan en el navegador y un planificador para su futuro financiero. Empieza por lo básico y sigue siendo útil a medida que las finanzas se complican, también cuando el dinero está repartido entre varias monedas y países.',
      knowsAbout: [
        'Finanzas personales',
        'Educación financiera',
        'Patrimonio neto',
        'Fondos de emergencia',
        'Inversión',
        'Independencia financiera',
        'Planificación de la jubilación',
        'Finanzas conductuales',
        'Finanzas en varias monedas',
      ],
      site: 'El dinero, entendido. Aprende finanzas personales, entiende tu propio dinero y planifica tu futuro, desde lo básico hasta las finanzas que abarcan varias monedas y países.',
    },
    /** The one line strip after the hero that points to /volunteers/ while the call runs. */
    volunteers: { text: 'Ayuda a traducir nidhi: se busca gente que hable de forma nativa o casi nativa.', link: 'Cómo participar' },
    hero: {
      heading: 'Entiende tu dinero.',
      subhead: ['Lecciones gratuitas.', 'Herramientas privadas.', 'Un planificador en camino.'],
      startLearning: 'Empieza a aprender',
      tryTool: 'Prueba una herramienta gratuita',
      promise: '{lessons} lecciones gratuitas. {tools} herramientas privadas. Sin cuenta y sin anuncios. Lo que escribes en las herramientas se queda en tu dispositivo.',
      welcomeBack: 'Hola de nuevo. Sigue donde lo dejaste:',
    },
    journey: {
      label: 'Aprende, haz balance, planifica · cifras ilustrativas',
      learnStep: '1 · Aprende',
      learnBig: '¿Qué es el patrimonio neto?',
      learnSmall: 'Lo que tienes, menos lo que debes.',
      stockStep: '2 · Haz balance',
      // Both values are signed (+/−), so "o" never needs to become "u".
      stockBig: '{one} o {two}',
      stockSmall: 'Patrimonio neto de dos personas que ganan {amount} al mes cada una.',
      planStep: '3 · Planifica',
      planBig: '{gap} más al cabo de {years} años',
      planSmall: 'Por ahorrar e invertir {extra} más cada mes.',
    },
    steps: {
      learn: 'Aprende',
      stock: 'Haz balance',
      plan: 'Planifica',
      /** Spoken before the heading, and hidden: "Paso 1: Aprende". */
      mark: 'Paso {n}: ',
    },
    lessons: {
      heading: 'Lecciones gratuitas, para siempre.',
      body: 'Lecciones breves para cualquier hogar, en cualquier país; cuando haya que tener en cuenta la normativa local, te indican qué comprobar. Sin muro de pago y sin crear una cuenta.',
      helperQuestion: '¿No sabes cuál es para ti?',
      helperLink: 'Dos preguntas te sugieren por dónde empezar',
      foot: 'Ver toda la ruta de aprendizaje',
      comingSoon: '{level} · lecciones próximamente',
      comingSoonNoLevel: 'Más lecciones',
      levelCount: '{level} · {count} lecciones',
      severalLevels: 'Lecciones de varios niveles',
      // Followed by the route's first lesson title, like doorContinue.
      start: 'Empieza',
      doorContinue: 'Continúa con ',
      doorRead: 'Has leído la ruta. ',
      doorPath: 'Sigue en la ruta de aprendizaje',
      inclusiveLead: 'Pensado para vidas financieras que no encajan con el plan estándar.',
      inclusiveTitle: 'El plan estándar no encaja con mi vida.',
      inclusiveMeta: 'Finanzas inclusivas · {count} guías, para cualquier etapa',
      inclusiveMetaFew: 'Finanzas inclusivas · {count} guías, para cualquier etapa',
      inclusiveMetaOne: 'Finanzas inclusivas · 1 guía, para cualquier etapa',
      inclusiveGo: 'Explorar',
    },
    tools: {
      heading: 'Mira dónde estás.',
      body: 'Herramientas gratuitas que funcionan en tu navegador, así que lo que escribes se queda en tu dispositivo.',
    },
    compare: {
      label: 'Mismos ingresos: {amount} al mes por persona',
      owns: 'Tiene',
      owes: 'Debe',
      netWorth: 'patrimonio neto',
      caption: 'Los ingresos son lo que entra. El patrimonio neto es lo que tienes menos lo que debes. Cifras ilustrativas.',
      people: {
        // "Vehículo" for "car": neither coche nor carro (glossary rule 4).
        alex: { name: 'Alex', note: 'Un vehículo y una tarjeta, ambos a crédito' },
        sam: { name: 'Sam', note: 'Ahorros, una pensión y un pequeño préstamo' },
      },
    },
    planner: {
      heading: 'Mira adónde podría llegar.',
      body: 'Estoy creando un planificador: lo que tienes, debes, ganas y gastas en un solo lugar, en una moneda o en varias, para que puedas comparar decisiones como esta antes de tomarlas.',
    },
    example: {
      label: 'Una decisión, comparada',
      text: 'El mismo punto de partida; solo cambia lo que se añade cada mes.',
      currencyNote:
        'Los euros son solo la moneda que usa este ejemplo. Los dos caminos obtienen la misma rentabilidad porcentual, así que la diferencia entre ellos también es proporcional: en rupias o en dólares, las dos líneas dibujarían la misma forma; solo cambiaría el eje.',
      gapLead: 'Unos {gap} de diferencia al cabo de {years} años.',
      gapRest: 'La mayor parte es el dinero extra aportado; el resto es crecimiento.',
      fold: 'Cómo funciona este ejemplo',
      chartTitle: 'Ejemplo: una decisión comparada a lo largo de diez años',
      today: 'Hoy',
      year: 'Año {n}',
      axisStart: 'hoy',
      axisEnd: '+{years} años',
      perMonth: '{amount}/mes',
      description:
        'Dos trayectorias de ejemplo a partir de los mismos {invested} invertidos hoy, con una rentabilidad ilustrativa del {pct} anual descontada la inflación. Añadiendo {monthly} al mes se llega a unos {end} al cabo de {years} años; añadiendo {higher} al mes, a unos {alternative}. La diferencia, de unos {gap}, se debe a {extra} más aportados y a unos {growth} más de crecimiento.',
      footnote:
        'Supone una rentabilidad ilustrativa del {pct} anual descontada la inflación, y que la cantidad de cada mes se añade al principio del mes. La rentabilidad real varía de un año a otro y puede ser negativa. Un patrimonio neto completo no crece a un solo ritmo: un vehículo pierde valor y un préstamo se va pagando.',
      keysHint: 'Usa las flechas izquierda y derecha del teclado para leer sus valores.',
    },
    faq: {
      heading: 'Preguntas frecuentes',
      items: [
        {
          q: '¿nidhi es para quien empieza de cero?',
          a: 'Sí. La ruta de aprendizaje empieza por explicar qué es el patrimonio neto y no da nada por sabido. Cada lección explica sus términos sobre la marcha. Hay {total} lecciones publicadas hasta ahora, y la ruta principal está en orden de lectura, así que puedes empezar por la primera y seguir adelante.',
        },
        {
          q: '¿Necesito tener dinero en más de una moneda para usar nidhi?',
          a: 'No. Todo funciona con una sola moneda. La opción de varias monedas está ahí para cuando tu vida lo requiera: ahorros en un país, una pensión o una vivienda en otro, o planes de mudarte.',
        },
        {
          q: '¿Cuánto cuesta nidhi?',
          a: 'Las lecciones y las herramientas gratuitas no cuestan nada y no necesitan cuenta. Las lecciones seguirán siendo gratuitas, sin muro de pago.',
        },
        {
          q: '¿Esto es asesoramiento financiero?',
          a: 'No. nidhi es educativo: explica cómo funciona el dinero y te permite modelar tu propia situación. No es un profesional acreditado de las finanzas. Para las decisiones importantes, consulta a un profesional acreditado.',
        },
        {
          q: '¿Qué pasa con los números que escribo en las herramientas?',
          a: 'Se quedan en tu dispositivo y no se envían a nidhi. Las herramientas gratuitas calculan en tu navegador y nunca ponen lo que escribes en la dirección de la página. Cuando una herramienta necesita datos externos, como los tipos de cambio del día, tu navegador le pide a ese servicio solo los tipos, nunca tus cantidades; como cualquier solicitud, eso le muestra tu dirección IP. La página de privacidad tiene los detalles.',
        },
        {
          q: '¿Qué es el planificador y cuándo podré usarlo?',
          a: 'El planificador lo reúne todo: lo que tienes, debes, ganas y prevés gastar, proyectado hacia el futuro con los supuestos a la vista, para que puedas comparar decisiones antes de tomarlas. Está previsto que su beta gratuita se abra en enero de 2027, y quienes estén en la lista de espera reciben un solo correo cuando se abre su acceso.',
          more: "Qué reciben quienes prueban la beta",
        },
      ],
      why: 'nidhi nació porque no encontraba una herramienta que encajara con una vida financiera corriente: dinero en más de un país, deudas en otro, un futuro que cruza fronteras. Así que la estoy construyendo, y contando lo que aprendo por el camino.',
      trustLine: 'Hecho en Praga. Sin anuncios y sin venta de datos. Las lecciones citan sus fuentes.',
      trustBeliefs: 'En qué creo',
      trustEditorial: 'Cómo escribimos',
      trustPrivacy: 'Política de privacidad',
    },
    levels: {
      discovery: 'Descubrimiento',
      building: 'Construcción',
      psychology: 'Psicología',
      optimizing: 'Optimización',
      mastery: 'Dominio',
    },
    startingPoints: {
      basics: {
        audience: 'Desde cero',
        situation: 'Empiezo desde el principio.',
        detail: 'Sabes que te convendría entender mejor tu dinero, pero no por dónde empezar. Empieza por las ideas sobre las que se construye todo lo demás.',
      },
      'no-plan': {
        audience: 'Algo de experiencia',
        situation: 'Tengo algunos ahorros, pero ningún plan.',
        detail: 'El dinero se va acumulando y no tienes claro qué debería estar haciendo ese dinero. Aprende para qué sirve cada cosa: el ahorro, la inversión y los objetivos.',
      },
      habits: {
        audience: 'Conoces la teoría',
        situation: 'Sé lo que tengo que hacer, pero no siempre lo hago.',
        detail: 'La mayoría de los errores con el dinero no tienen que ver con el conocimiento. Mira cómo la atención, los hábitos y las emociones moldean las decisiones que tomas.',
      },
      complex: {
        audience: 'Con experiencia',
        situation: 'Mis finanzas se han complicado.',
        detail: 'Proyecciones, escenarios hipotéticos, flujo de efectivo, comisiones e impuestos: las mismas ideas, con más piezas en juego.',
      },
    },
    toolCards: {
      netWorth: { name: 'Calculadora de patrimonio neto', desc: 'Una moneda o varias.' },
      loanComparison: { name: 'Comparador de préstamos', desc: 'Ofertas de préstamo, una al lado de otra.' },
      monteCarlo: { name: 'Simulador Monte Carlo', desc: 'Un abanico de resultados, no una sola línea.' },
      inflation: { name: 'Calculadora de inflación', desc: 'Lo que compra el dinero con los años.' },
    },
  },

  ...learnEs,
  tools: toolsEs,
};
