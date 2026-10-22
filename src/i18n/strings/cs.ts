import { toolsCs } from './tools/index.ts';
import { learnCs } from './learn.ts';
import type { Dict } from './types.ts';

/**
 * Czech strings. Typed as `Dict`, so a missing or an extra key is a type error
 * and `catalog.test.ts` re-checks the key sets at build time.
 *
 * Addressed with vykání, lowercase *vy*. The vocabulary, the amount format
 * (`10 000 Kč`), the three plural forms and the other rules are fixed by
 * docs/i18n/cs-glossary.md; change a term there first, so the chrome, the path
 * and the tools keep agreeing.
 */
export const cs: Dict = {
  skipToContent: 'Přeskočit na obsah',
  // Czech ends a sentence with the same full stop as English.
  fullStop: '.',
  a11y: {
    breadcrumb: 'Drobečková navigace',
  },

  /**
   * The brand line, "Money, understood", is "Peníze srozumitelně" in Czech. It
   * must read the same wherever it appears: here, the footer tagline and the
   * keys under `home`.
   */
  meta: {
    defaultImageAlt: 'nidhi: peníze srozumitelně. Nástroje pro osobní finance a finanční gramotnost.',
  },

  languagePicker: {
    label: 'Jazyk',
    current: 'aktuální jazyk',
  },

  nav: {
    primaryLabel: 'Hlavní',
    menuLabel: 'Nabídka',
    menuCloseLabel: 'Zavřít nabídku',
    homeLabel: 'nidhi, úvodní stránka',
    newTabHint: ' (otevře se na nové kartě)',
    groups: { learn: 'Lekce', tools: 'Nástroje zdarma', about: 'O nás', language: 'Jazyk' },
    buttons: { tools: 'Nástroje zdarma', learn: 'Lekce' },
    items: {
      blog: 'Vzdělávací cesta',
      blogTopics: 'Procházet témata',
      glossary: 'Slovníček pojmů',
      learnEditorial: 'Jak lekce vznikají',
      multiCurrencyNetWorth: 'Kalkulačka čistého jmění',
      loanComparison: 'Srovnání úvěrů',
      monteCarloSimulator: 'Simulátor Monte Carlo',
      inflationCalculator: 'Inflační kalkulačka',
      allTools: 'Všechny nástroje zdarma',
      about: 'O nidhi',
      beliefs: 'Čemu věřím',
      editorialPolicy: 'Redakční zásady',
      contact: 'Kontakt',
      email: 'E-mail',
      instagram: 'Instagram',
    },
    // Sentence case in Czech, so the dropdown's tool names match the sheet's.
    // The keys stay because `Dict` requires them.
    menu: {
      multiCurrencyNetWorth: 'Kalkulačka čistého jmění',
      loanComparison: 'Srovnání úvěrů',
      monteCarloSimulator: 'Simulátor Monte Carlo',
      inflationCalculator: 'Inflační kalkulačka',
      allTools: 'Zobrazit všechny nástroje zdarma',
    },
  },

  footer: {
    tagline: 'Peníze srozumitelně',
    columns: {
      learn: 'Lekce',
      tools: 'Nástroje zdarma',
      about: 'O nás',
      connect: 'Kontakt',
    },
    links: {
      blog: 'Vzdělávací cesta',
      blogTopics: 'Procházet témata',
      glossary: 'Slovníček pojmů',
      multiCurrencyNetWorth: 'Kalkulačka čistého jmění',
      loanComparison: 'Srovnání úvěrů',
      monteCarloSimulator: 'Simulátor Monte Carlo',
      inflationCalculator: 'Inflační kalkulačka',
      allTools: 'Zobrazit vše',
      about: 'O nidhi',
      beliefs: 'Čemu věřím',
      editorialPolicy: 'Redakční zásady',
      privacy: 'Soukromí',
      cookieSettings: 'Nastavení cookies',
    },
    disclaimerShort:
      'nidhi nabízí vzdělávací informace a nástroje, které vám pomohou porozumět vlastním penězům. Nejde o finančního poradce s příslušným oprávněním.',
    disclaimerLong:
      'Obsah a nástroje slouží ke vzdělávání a nejsou odborným finančním, investičním ani daňovým poradenstvím. Minulá výkonnost žádné investice nezaručuje budoucí výsledky. U rozhodnutí, na kterých záleží, se poraďte s kvalifikovaným odborníkem.',
    copyright: '© {year} nidhi. Všechna práva vyhrazena.',
  },

  cookie: {
    dialogLabel: 'Souhlas s cookies',
    textBefore: 'Anonymní zobrazení stránek počítáme v každém případě, abychom viděli, co pomáhá. Můžeme zaznamenávat také ',
    textEmphasis: 'kliknutí',
    textAfter: ', abychom našli nefunkční odkazy a matoucí rozvržení? Žádné reklamy, žádný prodej dat.',
    privacyLink: 'Podívejte se, co skutečně sbíráme →',
    decline: 'Ne, děkuji',
    accept: 'Ano, souhlasím',
  },

  theme: {
    groupLabel: 'Motiv',
    light: 'Světlý',
    lightTitle: 'Světlý motiv',
    system: 'Systém',
    systemTitle: 'Podle systému',
    dark: 'Tmavý',
    darkTitle: 'Tmavý motiv',
  },

  // The feed is English, and every page names it in English (see `BaseHead`);
  // these values are what a Czech page would show if that ever changed.
  rss: {
    linkTitle: 'nidhi | Blog o osobních financích',
    feedTitle: 'nidhi: blog o osobních financích',
    feedDescription:
      'Vzdělávání v osobních financích zdarma: čisté jmění, rozpočet, spoření, investování a správa dluhů. Finanční gramotnost krok za krokem.',
  },

  about: {
    meta: {
      title: 'O nidhi: kdo to píše a proč tomu můžete věřit | nidhi',
      description:
        'Kdo píše nidhi, jaká kvalifikace stojí za texty a jak se každý článek o osobních financích zkoumá a dokládá zdroji.',
    },
    schema: {
      name: 'O nidhi',
      description:
        'Kdo píše nidhi, proč lze textům věřit a jak se každý článek zkoumá a dokládá zdroji.',
      organization:
        'Vzdělávání v osobních financích na nidhi.today, založené na praxi a výzkumu, se věnuje čistému jmění, správě peněz ve více měnách a finanční nezávislosti. nidhi staví nástroje, o kterých články píší, a každý článek opírá o citované zdroje.',
      knowsAbout: {
        personalFinance: 'Osobní finance',
        financialLiteracy: 'Finanční gramotnost',
        netWorthTracking: 'Sledování čistého jmění',
        multiCurrencyFinance: 'Finance ve více měnách',
        financialIndependence: 'Finanční nezávislost',
        moneyManagement: 'Správa peněz',
      },
      breadcrumbHome: 'Domů',
      breadcrumbAbout: 'O nás',
    },
    title: 'O nidhi',
    intro:
      'nidhi je jméno pod těmito texty i projekt, ke kterému patří. Stojím za ním já, jméno se ujalo, a když čtete lekce, čtete mě.',
    sections: {
      whoIsWriting: 'Kdo píše',
      whyYouCanTrustIt: 'Proč tomu můžete věřit',
      howPostsAreMade: 'Jak články vznikají',
      whatNidhiKnowsAbout: 'Čemu nidhi rozumí',
    },
    body: {
      whoIsWriting:
        'Každý článek na tomto webu vychází pod jedním jménem: nidhi. Projekt vznikl, protože žádný finanční nástroj nezvládal obyčejný život s penězi ve více než jedné měně, dluhy v jiné a budoucností, která překračuje hranice. Lekce vycházejí ze stejného místa: ze skutečných otázek, na které musím odpovídat i já, a vysvětluji je tak, jak by mi je kdysi měl někdo vysvětlit.',
      whyYouCanTrustIt1:
        'Důvěryhodnost tu vychází z praxe a výzkumu, ne z množství titulů za jménem. nidhi staví nástroje, o kterých články píší, takže texty stojí na skutečném počítání, ne na opakování frází. Kde článek něco tvrdí, odkazuje na zdroj: knihy, referenční stránky a primární materiály uvedené u každého článku v části „referential reading“.',
      whyYouCanTrustIt2:
        'Co to není: finanční poradenství s příslušným oprávněním. nidhi vysvětluje, jak peníze fungují, aby rozhodnutí zůstalo na vás. Neřekne vám, který fond koupit, a nikdy to dělat nebude. U rozhodnutí, která závisí na vaší daňové rezidenci, právní situaci nebo toleranci k riziku, je správnou volbou kvalifikovaný odborník. Tato hranice je záměrná a je stejná jako ta, kterou uvádí patička každé stránky.',
      howPostsAreMade: {
        before:
          'Každý článek začíná konkrétní otázkou, kterou rozebírá pomocí skutečných čísel a propočítaných příkladů, a před zveřejněním se ověřuje podle citovaných zdrojů. Nástroje AI pomáhají lekce zkoumat, psát, upravovat a kontrolovat, včetně zpochybňování jejich finančních úvah, a pomáhají stavět web a jeho nástroje zdarma. Výstup AI je koncept, nikdy zdroj: člověk je zapojený v každé fázi a každou lekci před zveřejněním čte a schvaluje. Celý postup, pravidla pro zdroje a způsob oprav najdete na stránce ',
        link: 'redakčních zásad',
        after: '.',
      },
      whatNidhiKnowsAbout: {
        before:
          'Texty se soustředí na čisté jmění a jeho měření, správu peněz ve více měnách, peněžní tok a spoření, dluhy a cestu k finanční nezávislosti. Pokud vás zajímá pohled na svět, který za tím vším stojí, přečtěte si, ',
        link: 'čemu věřím',
        after: '.',
      },
    },
    cta: {
      text: 'Otázky, opravy nebo jen chcete pozdravit?',
      email: 'Napište na hello@nidhi.today',
      instagram: 'Instagram @nidhi.today',
    },
  },

  beliefs: {
    meta: {
      title: 'Čemu věřím: poctivé nástroje pro osobní finance | nidhi',
      description:
        'Čemu při tvorbě nidhi věřím: poctivé nástroje pro osobní finance, vzdělávání ve finanční gramotnosti zdarma, žádné reklamy, žádný prodej dat a lekce zdarma navždy.',
    },
    schema: {
      name: 'Čemu věřím',
      description:
        'Čemu při tvorbě nidhi věřím: poctivé nástroje pro osobní finance, vzdělávání ve finanční gramotnosti zdarma, žádné reklamy, žádný prodej dat.',
      organization: 'Nástroje pro osobní finance a vzdělávání ve finanční gramotnosti.',
      foundingLocation: 'Praha',
      knowsAbout: {
        personalFinance: 'Osobní finance',
        financialLiteracy: 'Finanční gramotnost',
        moneyManagement: 'Správa peněz',
        multiCurrencyFinance: 'Finance ve více měnách',
      },
      breadcrumbHome: 'Domů',
      breadcrumbAbout: 'Čemu věřím',
    },
    title: 'Čemu věřím',
    intro:
      'nidhi vzniklo, protože žádný slušný finanční nástroj neexistoval a mě to naštvalo natolik, že ho teď stavím',
    items: {
      frustration: {
        heading: 'Celé to začalo z frustrace',
        body: 'Chybělo mi něco, co obyčejnému člověku pomůže naplánovat peníze, vidět, kam odcházejí, a rozhodovat se o nich lépe. Nic takového neexistovalo. Tak to stavím.',
      },
      noPlanner: {
        heading: 'Plánování financí by nemělo vyžadovat finančního plánovače',
        body: 'Ať začínáte v první práci, nebo vám do důchodu zbývá pět let, zasloužíte si nástroje a vysvětlení, které dávají smysl. Žádný žargon. Žádné nabídky k dokoupení. Jen přímé odpovědi.',
      },
      accessibility: {
        heading: 'Pro všechny, na které technologie zapomínají',
        body: 'Spousta aplikací pohodlně zapomíná, že nástroje na peníze by měly fungovat, ať máte poruchu barvocitu, používáte čtečku obrazovky, nebo informace vnímáte jinak, třeba kvůli ADHD nebo dyslexii. Jsem queer, neurodivergentní člověk jiné barvy pleti než bílé, takže tenhle luxus mi nikdy nebyl dopřán. Bránit komukoli v porozumění vlastním penězům je prostě laciné.',
      },
      freeForever: {
        heading: 'Lekce jsou zdarma, navždy',
        body: 'Žádný placený přístup, žádné „předplaťte si to nejlepší“. Pokud vám něco z mých textů pomohlo se lépe rozhodnout, i když můj produkt nikdy nepoužijete, přesně o to jde. Napište mi o tom. Takové zprávy mě drží v chodu.',
      },
      rulesOfThumb: {
        heading: 'Nejen orientační pravidla',
        body: 'Orientační pravidlo je výchozí bod, ne odpověď. Kde ho lekce uvádí, vysvětluje také, proč existuje, kde přestává platit a co závisí na vás: na zemi, příjmu, dluzích a na tom, jak daleko dopředu plánujete. Důležitější je porozumět úvaze než se řídit pravidlem, které nikdy nebylo napsané pro váš život.',
      },
      noAds: {
        heading: 'Žádné reklamy, žádný prodej dat, žádné hvězdičky',
        body: 'Nezobrazuji reklamy. Neprodávám vaše data. Nedělám tu děsivou věc, kdy si vyhledáte „rizikové životní pojištění“ a pak na něj týden vidíte reklamy všude. Vaše finance jsou vaše věc. Doslova.',
      },
      madeInPrague: {
        heading: 'Vytvořeno v Praze, šířeno doporučením',
        body: 'Žádné peníze od investorů. Žádný růstový tým. Žádný billboard u dálnice. Pokud je pro vás nidhi užitečné, řekněte o něm někomu. To je moje hlavní marketingová strategie.',
      },
    },
    cta: {
      text: 'Přesvědčilo vás to? Nebo si myslíte, že plácám nesmysly?',
      sub: 'Tak či tak se mi ozvěte, potěší mě to',
      email: 'Napište mi milostný dopis',
      instagram: 'Napište mi do zpráv',
    },
  },

  editorialPolicy: {
    meta: {
      title: 'Redakční zásady: jak nidhi píše své lekce | nidhi',
      description:
        'Jak nidhi tvoří a ověřuje lekce, jak vybírá zdroje, proč píše pro kteroukoli zemi, jak používá AI, odděluje vzdělávání od poradenství a opravuje chyby.',
    },
    schema: {
      name: 'Redakční zásady',
      description:
        'Jak nidhi tvoří a ověřuje každou lekci, jaká má pravidla pro zdroje, proč jsou lekce psané pro kteroukoli zemi, jak používá nástroje AI, kde je hranice poradenství a jak se řeší opravy.',
      breadcrumbHome: 'Domů',
      breadcrumbThis: 'Redakční zásady',
    },
    title: 'Redakční zásady',
    intro:
      'Texty o penězích by se měly dát snadno ověřit a měly by otevřeně přiznávat své meze. Tato stránka vysvětluje, jak každá lekce na webu nidhi vzniká, z jakých zdrojů čerpá, jak se ověřuje a opravuje, jak se při tom používají nástroje AI a kde vede hranice mezi vzděláváním a poradenstvím.',
    sections: {
      howALessonIsBuilt: 'Jak lekce vzniká',
      anyCountry: 'Psáno pro kteroukoli zemi',
      sourcesAndFigures: 'Zdroje a čísla',
      ai: 'Jak používáme AI',
      advice: 'Vzdělávání, ne poradenství',
      corrections: 'Opravy',
      whoIsBehind: 'Kdo za tím stojí',
    },
    body: {
      builtIntro:
        'Každá lekce začíná otázkou, kterou by položil skutečný člověk, a prochází ji se skutečnými čísly. Mnoho čtenářů s penězi teprve začíná a sebejistá věta může znít jako pokyn, proto lekce vysvětlují, místo aby říkaly, co dělat. Každá myšlenka, orientační pravidlo nebo běžná praxe prochází stejnými pěti kroky:',
      builtSteps: {
        idea: {
          lead: 'Myšlenka',
          rest: ': jednoduchými slovy, s odbornými výrazy vysvětlenými při prvním výskytu.',
        },
        why: {
          lead: 'Proč ji lidé používají',
          rest: ': jaký problém řeší a proč se ujala.',
        },
        evidence: {
          lead: 'Doklady',
          rest: ', citované, i s jejich mezemi: data z které země, z kterých let a co vynechávají.',
        },
        breaks: {
          lead: 'Kde přestává platit',
          rest: ': situace, pro které nevznikla.',
        },
        depends: {
          lead: 'Co závisí na vás',
          rest: ': země, jak stálý je váš příjem, kolik máte času, dluhy a daně.',
        },
      },
      builtOutro:
        'Orientační pravidlo je výchozí bod, ne odpověď, proto lekce popisují, co dělá mnoho lidí, a vyhýbají se slovům „vždy“ a „nikdy“, pokud je doklady neunesou. Před zveřejněním se každá lekce čte znovu kvůli dvěma věcem: zda jsou její tvrzení podložená a zda ji bez slovníku pochopí i někdo, kdo začíná. Pokud něco proklouzne, podívejte se níže do části Opravy.',
      anyCountry:
        'Lekce jsou psané pro čtenáře kdekoli, ne pro jednu zemi. Myšlenky, které učí, například čisté jmění, diverzifikace nebo to, jak inflace ukrajuje z úspor, fungují všude stejně. Pravidla kolem nich ne: daně, důchodové a daňově zvýhodněné účty, státní důchody a dávky, úvěrové skóre, pojištění vkladů a spotřebitelské právo se liší země od země a někdy i uvnitř jedné země. Lekce vysvětlují obecnou myšlenku záměrně. Kde něco na takových pravidlech závisí, řeknou to, a poznámka „Kde si to ověřit u vás“ na konci lekce jmenuje obvyklá místa, kde si je ověřit tam, kde žijete, například finanční úřad, regulátora finančního trhu nebo kvalifikovaného místního poradce. Příklady bývají v eurech; je to volba měny, ne znamení, že jde o evropské pravidlo. Kde doklady pocházejí z dat jedné země, například z historie amerického akciového trhu, lekce to také řekne, spolu s tím, co vám tato data nemusejí říct o jiných trzích.',
      sourcesAndFigures:
        'Tvrzení stojí na primárních a důvěryhodných sekundárních zdrojích: na uznávaných knihách, referenčních materiálech a veřejných datech. Kde lekce čerpá z konkrétních zdrojů, jsou uvedené přímo u ní v části „referential reading“, aby šlo stopu sledovat, místo věřit nám na slovo. U každého čísla je uvedeno, odkud pochází a co zahrnuje, a stejné číslo se shoduje napříč lekcemi. Propočítané příklady používají realistická čísla, a kde je číslo ukázkové, ne prognóza, lekce to řekne. Směnné kurzy v nástrojích zdarma jsou referenční kurzy centrálních bank a dalších oficiálních zdrojů, s datem na obrazovce.',
      aiUsed1:
        'nidhi při své práci používá nástroje AI, včetně Claude od společnosti Anthropic a dalších agentů AI. Pomáhají zkoumat, psát a upravovat lekce; kontrolovat lekce podle této stránky; zpochybňovat finanční úvahy v lekci nebo nástroji z pohledu zkušeného poradce; a stavět web a jeho nástroje zdarma. Výstupy různých agentů AI necháváme záměrně vzájemně kontrolovat, aby zachytili to, co některý z nich přehlédne.',
      aiUsed2: {
        before:
          'Výstup AI je koncept, nikdy zdroj. Člověk je zapojený v každé fázi a každou lekci před zveřejněním čte a schvaluje. Model AI, který má uvažovat jako finanční poradce, je kontrolou úvahy, ne radou od odborníka s příslušným oprávněním. Web sám neposílá nic z toho, co napíšete nebo uděláte, žádné službě AI; co sbíráme, popisují ',
        link: 'zásady ochrany soukromí',
        after: '.',
      },
      advice:
        'nidhi není finanční poradce s příslušným oprávněním a nic na tomto webu není osobní finanční, investiční ani daňové poradenství. Lekce nedoporučují konkrétní produkty, fondy ani cenné papíry. Minulá výkonnost žádné investice nezaručuje budoucí výsledky. U rozhodnutí, která závisí na vaší daňové rezidenci, právní situaci nebo toleranci k riziku, může tyto myšlenky na vaši situaci uplatnit kvalifikovaný odborník.',
      corrections: {
        before:
          'Pokud je něco špatně, chceme to opravit. Když narazíte na chybu, zastaralé číslo nebo tvrzení, které už neplatí, napište na ',
        after:
          '. Podstatné opravy se provádějí přímo v lekci a promítnou se do jejího data „last updated“, aby byla změna vidět, místo aby se tiše vyměnila. Drobnosti, jako jsou překlepy, se opravují bez změny data.',
      },
      correctionsList:
        'Když opravuji něco, co by mohlo změnit, jak věcem rozumíte nebo jak se rozhodnete, poznamenám to v lekci a uvedu to i tady. Překlepy opravuji potichu.',
      whoIsBehind: {
        before: 'Kdo nidhi píše a jaká zkušenost za texty stojí, najdete na ',
        aboutLink: 'stránce O nidhi',
        middle: '. Pohled na svět, který určuje, co se rozhoduji stavět a zveřejňovat, popisuje stránka ',
        beliefsLink: 'Čemu věřím',
        after: '.',
      },
    },
  },

  freeHub: {
    cta: 'Otevřít nástroj',
    meta: {
      title: 'Nástroje a kalkulačky pro osobní finance zdarma | nidhi',
      description:
        'Kalkulačky zdarma: čisté jmění v jedné či více měnách, srovnání úvěrů, inflace a důchodový simulátor Monte Carlo. Bez registrace a sledování, vše v prohlížeči.',
      descriptionWithoutSimulator:
        'Kalkulačky osobních financí zdarma: čisté jmění (v jedné i více měnách), srovnání úvěrů a inflace. Bez registrace, bez sledování, vše v prohlížeči.',
    },
    schema: {
      breadcrumbHome: 'Domů',
      breadcrumbThis: 'Nástroje zdarma',
      itemListName: 'Nástroje nidhi pro osobní finance zdarma',
      collectionName: 'Nástroje pro osobní finance zdarma',
    },
    breadcrumb: {
      home: 'Domů',
      this: 'Nástroje zdarma',
    },
    eyebrow: 'Nástroje zdarma',
    title: 'Nástroje pro osobní finance zdarma, které běží ve vašem prohlížeči.',
    lead: 'Bez registrace, bez účtu, žádná data se neposílají na server. Každá kalkulačka níže běží celá ve vašem prohlížeči, s nejnovějšími oficiálními směnnými kurzy tam, kde je potřeba převod měn. Pro lidi žijící v zahraničí, pro ty, kdo spoří přes hranice, a pro každého, komu už tabulka nestačí.',
    tools: {
      multiCurrencyNetWorth: {
        kicker: 'Jedna měna i více',
        title: 'Kalkulačka čistého jmění',
        desc: 'Zadejte, co vlastníte a co dlužíte, a uvidíte své čisté jmění. Funguje v jedné měně i napříč 38 měnami, s nejnovějšími oficiálními kurzy, a pokud jich držíte víc, ukáže, kolik máte v měnách, ve kterých neutrácíte.',
        itemName: 'Kalkulačka čistého jmění a analýza měnového rizika',
      },
      loanComparison: {
        kicker: 'Rozhodování o půjčkách',
        title: 'Srovnání úvěrů',
        desc: 'Porovnejte dvě nebo tři nabídky úvěru vedle sebe. APR (roční procentní sazba), celkové náklady úvěru, scénáře refinancování a splátkový kalendář pro každého poskytovatele, bez tabulky.',
        itemName: 'Kalkulačka pro srovnání úvěrů',
      },
      monteCarlo: {
        kicker: 'Projekce a důchod',
        title: 'Simulátor Monte Carlo',
        desc: 'Promítněte své úspory do budoucnosti v tisících simulací s výnosy z dlouhodobé historie světových trhů. Uvidíte nízký, mediánový a vysoký výsledek a jak často peníze vydrží, až z nich budete žít.',
        itemName: 'Důchodový simulátor Monte Carlo',
      },
      inflation: {
        kicker: 'Ceny v čase',
        title: 'Inflační kalkulačka',
        desc: 'Podívejte se, co si za částku koupíte po letech inflace, kolik může cena stát později a zda zvýšení platu drží krok, s ročními daty pro většinu zemí od Světové banky.',
        itemName: 'Inflační kalkulačka',
      },
    },
    how: {
      title: 'Jak tyto nástroje fungují',
      browser: {
        strong: 'Veškeré výpočty probíhají ve vašem prohlížeči.',
        rest: ' Čísla, která zadáte, hodnoty, které nahrajete, i všechny výsledky zůstávají ve vašem zařízení. Neposílají se nidhi ani nikomu třetímu.',
      },
      rates: {
        strong: 'Oficiální směnné kurzy tam, kde jsou potřeba.',
        before: ' Když nástroj potřebuje převod měn, váš prohlížeč stáhne referenční kurzy z API ',
        after: ' (bezplatné otevřené služby, která spojuje směnné kurzy zveřejňované centrálními bankami a dalšími oficiálními zdroji). Požadavek obsahuje jen zvolenou měnu vašich výdajů, ne údaje o vašem majetku.',
      },
      noSignup: {
        strong: 'Bez registrace, bez účtu, bez e-mailu.',
        rest: ' Nástroje můžete používat přímo na stránce. Při práci s nástrojem se do adresy stránky nic nezapisuje. Volitelný odkaz ke sdílení nese vaše údaje za znakem #, v části adresy, kterou prohlížeče nikdy neposílají na server, takže je na vás, zda a s kým sdílet.',
      },
      education: {
        strong: 'Vzdělávání, ne poradenství.',
        rest: ' Každý nástroj ukazuje výpočet za odpovědí i předpoklady, se kterými pracuje, aby šlo stejnou logiku použít na vaši situaci. U rozhodnutí, na kterých záleží, se poraďte s kvalifikovaným odborníkem.',
      },
    },
    footer: {
      before: 'Chcete delší úvahy, ze kterých tyto nástroje vycházejí? Přečtěte si ',
      blogLink: 'vzdělávací cestu nidhi',
      middle: ', osnovu, ze které vycházejí, nebo zjistěte, ',
      beliefsLink: 'čemu věřím v otázkách peněz a plánování',
      after: '.',
    },
  },

  privacy: {
    meta: {
      title: 'Zásady ochrany soukromí: jak nidhi zachází s vašimi daty | nidhi',
      description:
        'Zásady ochrany soukromí nidhi.today srozumitelně: co sbíráme, proč, kde to je uložené a jak se toho zbavit.',
    },
    schema: {
      name: 'Zásady ochrany soukromí: jak nidhi zachází s vašimi daty',
      description:
        'Zásady ochrany soukromí nidhi.today srozumitelně: co sbíráme, proč, kde to je uložené a jak se toho zbavit.',
      breadcrumbHome: 'Domů',
      breadcrumbThis: 'Soukromí',
    },
    title: 'Soukromí, upřímně',
    intro:
      'Krátce: sbíráme co nejméně, nic neprodáváme a to, co o vás máme, si můžete nechat kdykoli smazat.',
    updatedLabel: 'Naposledy upraveno: ',
    updatedLink: 'podívejte se, co se změnilo',
    englishIsAuthoritative:
      'Tyto zásady jsou napsané v angličtině a rozhodující je anglická verze. Překlad je tu proto, aby se daly číst ve vašem jazyce.',
    sections: {
      collect: 'Co sbíráme a kdy',
      why: 'Proč to sbíráme',
      whereItLives: 'Kde to je uložené',
      whatWeDontDo: 'Co neděláme',
      retention: 'Jak dlouho to uchováváme',
      rights: 'Vaše práva',
      children: 'Děti',
      whoWeAre: 'Kdo jsme',
    },

    lead: {
      always: 'Vždy, aby web fungoval a zlepšoval se:',
      withConsent: 'Jen pokud na cookie liště kliknete na „Ano, souhlasím“:',
      newsletter: 'Pokud se přihlásíte k odběru newsletteru blogu:',
      waitlist: 'Pokud se zapíšete na čekací listinu ke spuštění produktu:',
      browserOnly: 'Uloženo jen ve vašem prohlížeči, nikdy se nám neposílá:',
    },

    collect: {
      pageviews: {
        before: 'Anonymní události zobrazení a opuštění stránky, přes ',
        link: 'PostHog Cloud EU',
        after:
          '. Patří sem navštívená adresa URL, adresa URL, ze které návštěva přišla, přibližná poloha na úrovni země (odvozená z vaší IP adresy, kterou PostHog potom zahodí) a váš prohlížeč, operační systém a velikost zobrazovací oblasti. Žádné jméno, žádný e-mail, žádné ID uživatele.',
      },
      freeTools: {
        before:
          'Anonymní události interakce na stránkách nástrojů zdarma: kterou měnu zvolíte v kalkulačce pro srovnání úvěrů, zda přepnete mezi výpočtem doby splatnosti a výpočtem měsíční splátky, zda otevřete panel „Další možnosti“, zda zkopírujete odkaz ke sdílení a zda formulář vrátíte do výchozího stavu. ',
        strong: 'Finanční hodnoty, které zadáte, se nikdy neposílají',
        after:
          ': ani výše úvěru, ani úroková sazba, ani poplatky, ani název poskytovatele. Celý smysl kalkulačky je v tom, že se výpočet provádí ve vašem prohlížeči.',
      },
      toolAddresses:
        'U žádného nástroje zdarma adresa stránky nenese to, co zadáte, takže to nemůže nést ani adresa URL, kterou zaznamenává webová analytika. Nástroje vaše údaje při používání do adresy nezapisují. Odkaz ke sdílení je nese za znakem #, v části adresy, kterou prohlížeče nikdy neposílají na server, a stránka je z adresního řádku přesune dřív, než se spustí webová analytika. Jako pojistka skript webové analytiky před odesláním jakékoli události odstraní z adresy každého nástroje zdarma vše kromě parametrů kampaní (utm_source a podobně).',
      monteCarlo: {
        before:
          'Anonymní události interakce v simulátoru Monte Carlo: kterou měnu zvolíte, jaký předpoklad výnosu a počet simulovaných trajektorií vyberete, zda zapnete nebo vypnete výběry, zda otevřete tabulku výsledků, zda zkopírujete odkaz ke sdílení a zda formulář vrátíte do výchozího stavu. ',
        strong: 'Částky, roky, poplatky a poměr, které zadáte, se nikdy neposílají.',
      },
      inflation: {
        before:
          'Anonymní události interakce v inflační kalkulačce: kterou otázku zvolíte (kupní síla později, cena později, z minulosti do dneška, drží krok), kterou měnu a historii které země vyberete, zda jako sazbu použijete průměr země, zda zkopírujete odkaz ke sdílení a zda formulář vrátíte do výchozího stavu. Výběr země načte její historii přímo z nidhi.today, nikdy ze Světové banky. ',
        strong: 'Částky, sazby a roky, které zadáte, se nikdy neposílají.',
      },
      campaigns: {
        before: 'Parametry kampaní (',
        middle: ', ',
        after: ' atd.), pokud návštěva přišla z odkazu, který jsme označili my nebo někdo jiný.',
      },
      consentClicks:
        'Teplotní mapy kliknutí a automaticky zachycené události: v podstatě na které prvky stránky se kliká, včetně kliknutí na věci, které nereagují („mrtvá kliknutí“). Pomáhá nám to najít nefunkční odkazy a matoucí rozvržení. Měření rychlosti stránek ani chyby prohlížeče nezaznamenáváme vůbec.',
    },

    newsletter: {
      email: 'Vaše e-mailová adresa.',
      page: 'Stránka, ze které přihlášení proběhlo (abychom věděli, zda vás přivedl přehled blogu, nebo konkrétní článek).',
      timestamps: 'Datum a čas přihlášení, potvrzení a (pokud k tomu dojde) odhlášení.',
      status: 'Stav vašeho odběru: čekající na potvrzení, potvrzený nebo odhlášený.',
      from: {
        before: 'E-maily newsletteru chodí z adresy ',
        after: '. Přidejte si ji do kontaktů, aby upozornění na nové články došla do vaší schránky.',
      },
    },
    waitlist: {
      email: 'Vaše e-mailová adresa.',
      page: 'Stránka, ze které zápis proběhl.',
      timestamp: 'Datum a čas zápisu.',
      singleOptIn: 'Žádný potvrzovací krok, žádné sledování stavu. Přihlášení bez potvrzení (single opt-in).',
      from: {
        before: 'E-mail o spuštění přijde z adresy ',
        after: '. Přidejte si ji do kontaktů, aby neskončil ve spamu.',
      },
    },
    browserStorage: {
      consent: { before: 'Vaše volba ohledně cookies (', after: ').' },
      theme: { before: 'Vaše volba motivu: světlý, tmavý nebo podle systému (', after: ').' },
      internal: {
        before: 'Jen pro tým nidhi: příznak (',
        after:
          '), který se nastaví otevřením stránky ze zvláštního odkazu, aby se nepočítaly naše vlastní návštěvy. Dokud je nastavený, v daném prohlížeči neběží žádná webová analytika.',
      },
      reading: {
        before: 'Které lekce máte přečtené (',
        after:
          '), abychom příště mohli zobrazit nenápadné označení „přečteno“ a navrhnout vám další lekci na úvodní stránce a na vzdělávací cestě, včetně dalšího kroku na každé trase „Začněte tam, kde jste“.',
      },
      subscription: {
        before: 'Zda je váš odběr newsletteru potvrzený (',
        after:
          '), abychom vám přestali na každé stránce ukazovat formulář k odběru, jakmile dokončíte dvojí potvrzení. Nastaví se jen kliknutím na potvrzovací odkaz v e-mailu; nikdy neobsahuje vaši e-mailovou adresu.',
      },
      dismissed: {
        before: 'Zda je výzva k odběru newsletteru zavřená (',
        after:
          '), abychom respektovali vaše přání ji nějakou dobu nevidět. Obsahuje jen typ zavření a datum a čas, žádnou e-mailovou adresu ani osobní údaje.',
      },
      waitlistSignedUp: {
        before: 'Zda proběhl váš zápis na čekací listinu ke spuštění produktu (',
        after:
          '), abychom vám při dalších návštěvách přestali ukazovat formulář čekací listiny. Obsahuje jen příznak stavu a datum a čas, nikdy vaši e-mailovou adresu.',
      },
    },
    clearsEverything: 'Smazáním dat webu ve vašem prohlížeči okamžitě zmizí vše výše uvedené.',

    why: {
      analytics: {
        lead: 'Webová analytika:',
        rest: ' abychom zjistili, které články lidem opravdu pomáhají a u kterých lidé v polovině odpadnou. Co nevidíme, to neopravíme.',
      },
      newsletter: {
        lead: 'Newsletter:',
        rest:
          ' abychom vám poslali e-mail, když vyjde nový článek na blogu, a jednu připomínku, pokud odběr začnete, ale do 3 dnů ho nepotvrdíte (odesílá se mezi 9. a 12. hodinou pražského času). Žádné jiné e-maily. Žádné akce, žádné série „chybíte nám“, žádná propagace jiných produktů.',
      },
      waitlist: {
        lead: 'Čekací listina:',
        rest: ' abychom vám poslali přesně jeden e-mail, až se produkt nidhi spustí. Nic dalšího. Žádný newsletter, žádná série e-mailů, žádná propagace.',
      },
      localPreferences: {
        lead: 'Místní předvolby:',
        rest: ' aby se web choval konzistentně, aniž by se musel ptát serveru. Vše zůstává ve vašem zařízení.',
      },
    },

    where: {
      processors: {
        posthog: {
          name: 'PostHog Cloud EU',
          rest: ' (Frankfurt, Německo): náš zpracovatel pro webovou analytiku. Nahrávání relací je vypnuté. Používáme jejich standardní produkt bez vlastních vlastností osoby, které by vás identifikovaly, ledaže se přihlásíte k odběru; pak se stav vašeho odběru stane vlastností anonymního záznamu osoby pro analýzu konverzního trychtýře.',
        },
        google: {
          name: 'Google Workspace',
          before: ' (regiony Google Cloud v EU): naše e-mailové adresy (',
          middle: ' pro obecný kontakt a podporu, ',
          after:
            ' pro automatické e-maily o produktu, jako jsou pozvánky do bety a rozesílání newsletteru) a tabulka Google, ve které jsou uloženi odběratelé newsletteru a registrace na čekací listinu (na samostatných listech). Číst ji můžeme jen my.',
        },
        github: {
          name: 'GitHub Pages',
          rest: ' (služba GitHub / Microsoft): hostuje statické soubory tohoto webu. GitHub uchovává krátkodobé přístupové protokoly serveru kvůli prevenci zneužití. Nečteme je a nedostáváme jejich kopie.',
        },
        browser: {
          name: 'Váš prohlížeč',
          rest: ': pro místní předvolby uvedené výše.',
        },
      },
      thatIsAll:
        'To je úplný seznam služeb, které pro nás zpracovávají data. Žádný čtvrtý zpracovatel schovaný někde v poznámce pod čarou.',
      frankfurter: {
        lead: 'Jedna služba, kterou váš prohlížeč kontaktuje přímo: Frankfurter',
        rest: ', bezplatná otevřená služba, která spojuje směnné kurzy zveřejňované centrálními bankami a dalšími oficiálními zdroji. Váš prohlížeč ji požádá o nejnovější kurzy, když otevřete kalkulačku čistého jmění (a znovu, pokud tam změníte měnu svých výdajů). Požadavek obsahuje jen kódy měn, nikdy vaše částky ani nic z toho, co napíšete, a odpovědí je tabulka kurzů mnoha měn, ze které si kalkulačka ponechá ty, které nabízí. Jako každý požadavek z vašeho prohlížeče ukáže službě Frankfurter vaši IP adresu a typ prohlížeče. Jde přímo z vašeho prohlížeče do služby Frankfurter, takže ho nikdy nevidíme, a Frankfurter je na nás nezávislý: co uchovává, je jeho věc.',
      },
    },

    dontDo: {
      ads: 'Nezobrazujeme reklamy. Na tomto webu není žádná reklamní technologie.',
      sell: 'Vaše data nikomu neprodáváme, nepronajímáme, nelicencujeme ani neposkytujeme k dalšímu šíření.',
      crossSite:
        'Nesledujeme vás napříč weby. Žádný Facebook pixel, žádný tag Google Ads, žádný LinkedIn Insight, žádný TikTok pixel, žádný retargeting jakéhokoli druhu.',
      screen: 'Nenahráváme vaši obrazovku, stisky kláves, hodnoty formulářů ani průběžné posouvání stránky.',
      replies: 'Odpovědi na e-maily newsletteru dostane člověk na adrese hello@nidhi.today, který je čte. Nikdy je nevkládáme do žádného systému webové analytiky ani reklamního systému.',
      imports: 'Seznam odběratelů newsletteru ani čekací listinu neimportujeme do žádného jiného nástroje ani rozesílacího systému.',
    },

    retention: {
      analytics: {
        lead: 'Události webové analytiky:',
        rest: ' 12 měsíců (výchozí doba uchování ve službě PostHog; neprodloužili jsme ji), potom se automaticky smažou.',
      },
      newsletter: {
        lead: 'Odběratelé newsletteru:',
        rest: ' po dobu odběru a až 30 dní po odhlášení, abychom měli jistotu, že vám omylem nepřijde ještě jeden e-mail. Potom se řádek smaže.',
      },
      waitlist: {
        lead: 'Registrace na čekací listinu:',
        rest: ' dokud nepošleme e-mail o spuštění a nebudete mít čas na něj reagovat, nebo dokud nás nepožádáte o vyřazení. Napište nám kdykoli.',
      },
      bounced: {
        lead: 'Nedoručitelné nebo neplatné e-maily:',
        rest: ' smažeme, jakmile si jich všimneme, obvykle do týdne.',
      },
      localStorage: {
        lead: 'Váš localStorage:',
        rest: ' dokud nesmažete data prohlížeče. Znovu: nikdy ho nevidíme.',
      },
    },

    rights: {
      intro:
        'Podle obecného nařízení o ochraně osobních údajů (GDPR) a podobných předpisů máte právo se nás zeptat, co o vás máme, nechat to opravit, exportovat, omezit, jak to používáme, vznést proti tomu námitku nebo to nechat smazat.',
      unsubscribe:
        'U newsletteru je odhlášení odběru jedním kliknutím na odkaz v každém e-mailu, který posíláme, a tím se také naplánuje smazání popsané výše. U čekací listiny nám napište a vyřadíme vás. V obou případech to na požádání uděláme i ručně.',
      analytics: {
        before:
          'Události webové analytiky jsou anonymní; nemáme jak dohledat „vaše“ události, protože nevíme, kdo jste. Pokud vám to vadí, na cookie liště jednoduše odmítněte souhlas nebo použijte blokátor obsahu. Nic na webu se nerozbije. Odpověď můžete kdykoli změnit přes ',
        strong: 'Nastavení cookies',
        after: ' v dolní části každé stránky; když tam odmítnete, zaznamenávání kliknutí se okamžitě zastaví.',
      },
      contact: {
        before: 'V ostatních věcech napište na ',
        middle: ' a do předmětu uveďte slovo ',
        after: '. Odpovídáme do několika dní.',
      },
    },

    children:
      'Tento web je psaný pro dospělé, kteří se snaží porozumět vlastním penězům. Od dětí mladších 16 let vědomě nic nesbíráme. Pokud si myslíte, že ano, napište nám a smažeme to.',

    whoWeAre: {
      intro:
        'nidhi je malý nezávislý projekt. Žádní investoři, žádný růstový tým, žádný rozpočet na reklamu. V současnosti ho staví a provozuje jeden člověk v Praze.',
      contact: {
        hello: ': pro cokoli, ať už jde o soukromí, nebo o něco jiného',
        instagram: ': pokud dáváte přednost zprávám',
        beliefsLink: 'Čemu věříme',
        beliefsRest: ': pokud vás zajímají naše důvody',
      },
    },

    changelog: {
      eyebrow: 'Přehled změn',
      title: 'Změny těchto zásad',
      intro: {
        before:
          'Tuto stránku upravujeme na místě. Každá změna dostane záznam v přehledu níže, od nejnovější změny po nejstarší, ať je jakkoli malá. Několik nejnovějších je zobrazeno celých; starší jsou slovo od slova zachované v části „Starší změny“. Změny, které ovlivňují, jak zacházíme s osobními údaji (nový zpracovatel, nová kategorie údajů, změna doby uchování), jsou označené jako ',
        after: '.',
      },
      second:
        'Neposíláme e-maily typu „aktualizovali jsme zásady ochrany soukromí“. Pokud je chcete sledovat, přidejte si tuto stránku do záložek nebo si přehled níže přečtěte, kdykoli vás to bude zajímat. Pokud by vám některá změna někdy byla nepříjemná, odhlášení newsletteru je jedním kliknutím na odkaz v každém e-mailu a smazáním dat webu v prohlížeči zmizí vše uložené místně.',
      earlier: 'Starší změny',
      countOne: '{count} změna',
      countOther: '{count} změn',
      countFew: '{count} změny',
      materialTag: 'podstatná změna',
      materialLabel: 'Podstatná změna',
      entriesInEnglish:
        'Přehled níže je vedený v angličtině, slovy, kterými byl napsán, a nepřekládá se: je to záznam toho, co tyto zásady v daný den říkaly.',
    },
  },

  notFound: {
    meta: {
      title: 'Stránka nenalezena (404) | nidhi',
      description:
        'Tato stránka na webu nidhi neexistuje. Mohla být přesunutá, adresa URL může obsahovat překlep nebo je odkaz zastaralý. Pokračujte na úvodní stránce.',
    },
    heading: '404',
    body: 'Stránka, kterou hledáte, neexistuje.',
    cta: 'Na úvodní stránku',
  },

  subscribe: {
    region: 'Odběr newsletteru',
    title: 'Nové články přímo do vaší schránky',
    text: 'Jeden e-mail, když vyjde něco nového. Žádný spam, odhlásit se jde kdykoli.',
    inEnglish: 'Lekce i e-maily jsou v angličtině.',
    emailLabel: 'E-mailová adresa',
    button: 'Odebírat',
    privacyBefore: 'Dvojí potvrzení. Odhlásit se jde kdykoli. ',
    privacyLink: 'Zásady ochrany soukromí',
    privacyAfter: '.',
    rssFollow: 'Sledovat přes RSS',
    alreadySubscribed: 'Už odebírám',
    notNow: 'Teď ne',
    successTitle: 'Zkontrolujte svou schránku',
    successBefore: 'Poslali jsme potvrzovací odkaz na adresu ',
    successAfter: '. Odběr dokončíte kliknutím na tlačítko v tom e-mailu. Zabere to vteřinu.',
    yourEmail: 'váš e-mail',
    hintBefore: 'Ani po minutě nepřišel žádný e-mail? Pokud tato adresa už odběr má, nic se nemění a nový e-mail nepřijde. Jinak zkontrolujte spam, nebo ',
    hintRetry: 'zkuste jinou adresu',
    hintAfter: '.',
    compactSentBefore: 'Potvrzovací odkaz odeslán na ',
    compactSentAfter: '.',
    compactRetry: 'Použít jiný e-mail',
    confirmPrompt: 'Je tato adresa správná?',
    confirmYes: 'Ano, odebírat',
    confirmChange: 'Změnit',
    undo: 'Vrátit zpět',
    dismissedPermanent: 'Děkujeme za odběr! Na tomto zařízení už tento banner neukážeme.',
    dismissedLater: 'Vrátíme se k tomu později.',
    sending: 'Odesílání…',
    notConfigured: 'Odběr zatím není nastavený. Zkuste to brzy znovu, nebo použijte kanál RSS.',
    error: 'Něco se pokazilo. Zkuste to prosím za chvíli znovu.',
  },

  waitlist: {
    region: 'Čekací listina na přednostní přístup',
    heading: 'Chcete plánovač, až se otevře?',
    emailLabel: 'E-mailová adresa',
    cta: 'Dejte mi vědět',
    privacyBefore: 'Jeden e-mail, až se přístup otevře. ',
    privacyLink: 'Zásady ochrany soukromí',
    privacyAfter: '.',
    successTitle: 'Jste na seznamu',
    successBody: 'Až se přístup otevře, pošleme vám jeden e-mail. Nic víc. Pokud už adresa na seznamu je, zůstane na něm jen jednou.',
    confirmPrompt: 'Je tato adresa správná?',
    confirmYes: 'Ano, dejte mi vědět',
    confirmChange: 'Změnit',
    sending: 'Odesílání…',
    notConfigured: 'Zápis zatím není nastavený. Zkuste to brzy znovu.',
    error: 'Něco se pokazilo. Zkuste to prosím za chvíli znovu.',
  },
  home: {
    meta: {
      title: 'nidhi | Porozumějte svým penězům a plánujte, co přijde dál',
      description:
        'Lekce osobních financí zdarma a soukromé nástroje, které pomáhají porozumět penězům a plánovat budoucnost, od základů po finance ve více měnách.',
      imageAlt:
        'nidhi: peníze srozumitelně. Lekce osobních financí zdarma a soukromé nástroje, které pomáhají porozumět penězům a plánovat budoucnost.',
    },
    schema: {
      slogan: 'Peníze srozumitelně',
      organization:
        'nidhi pomáhá obyčejným lidem porozumět jejich penězům: strukturované lekce osobních financí zdarma, soukromé nástroje běžící v prohlížeči a plánovač finanční budoucnosti. Začíná u základů a funguje dál, i když se finance komplikují, včetně peněz rozložených mezi měny a země.',
      knowsAbout: [
        'Osobní finance',
        'Finanční gramotnost',
        'Čisté jmění',
        'Finanční rezerva',
        'Investování',
        'Finanční nezávislost',
        'Plánování důchodu',
        'Behaviorální finance',
        'Finance ve více měnách',
      ],
      site: 'Peníze srozumitelně. Učte se osobní finance, porozumějte vlastním penězům a plánujte budoucnost, od základů po finance rozložené mezi měny a země.',
    },
    hero: {
      heading: 'Porozumějte svým penězům.',
      subhead: ['Lekce zdarma.', 'Soukromé nástroje.', 'Plánovač na cestě.'],
      startLearning: 'Začít s lekcemi',
      tryTool: 'Vyzkoušet nástroj zdarma',
      promise: 'Lekce zdarma: {lessons}. Soukromé nástroje: {tools}. Bez účtu, bez reklam. Co do nástrojů zadáte, zůstává ve vašem zařízení.',
      welcomeBack: 'Vítejte zpět. Navažte tam, kde to máte rozečtené:',
    },
    journey: {
      label: 'Učte se, udělejte si přehled, plánujte dopředu · ukázkové částky',
      learnStep: '1 · Učte se',
      learnBig: 'Co je čisté jmění?',
      learnSmall: 'Co vlastníte, minus co dlužíte.',
      stockStep: '2 · Udělejte si přehled',
      stockBig: '{one} nebo {two}',
      stockSmall: 'Čisté jmění dvou lidí se stejným příjmem {amount} měsíčně.',
      planStep: '3 · Plánujte dopředu',
      planBig: '{gap} navíc po {years} letech',
      planSmall: 'Díky tomu, že každý měsíc spoříte a investujete o {extra} víc.',
    },
    steps: {
      learn: 'Učte se',
      stock: 'Udělejte si přehled',
      plan: 'Plánujte dopředu',
      mark: 'Krok {n}: ',
    },
    lessons: {
      heading: 'Lekce zdarma, navždy.',
      body: 'Krátké lekce pro jakoukoli domácnost v jakékoli zemi, a kde záleží na místních pravidlech, řeknou, co si ověřit. Bez placeného přístupu, bez účtu.',
      helperQuestion: 'Nevíte, co se pro vás hodí?',
      helperLink: 'Dvě otázky navrhnou, kde začít',
      foot: 'Zobrazit celou vzdělávací cestu',
      comingSoon: '{level} · lekce brzy',
      comingSoonNoLevel: 'Další lekce',
      levelCount: '{level} · počet lekcí: {count}',
      severalLevels: 'Lekce z několika úrovní',
      start: 'Začít',
      doorContinue: 'Pokračovat: ',
      doorRead: 'Trasa dokončena. ',
      doorPath: 'Pokračovat na vzdělávací cestě',
      inclusiveLead: 'Pro finanční životy, na které standardní plán nesedí.',
      inclusiveTitle: 'Standardní plán na můj život nesedí.',
      inclusiveMeta: 'Inkluzivní finance · {count} průvodců, pro jakoukoli fázi',
      inclusiveMetaFew: 'Inkluzivní finance · {count} průvodci, pro jakoukoli fázi',
      inclusiveMetaOne: 'Inkluzivní finance · 1 průvodce, pro jakoukoli fázi',
      inclusiveGo: 'Prozkoumat',
    },
    tools: {
      heading: 'Podívejte se, kde stojíte.',
      body: 'Nástroje zdarma, které běží ve vašem prohlížeči, takže to, co zadáte, zůstává ve vašem zařízení.',
    },
    compare: {
      label: 'Stejný příjem: {amount} měsíčně na osobu',
      owns: 'Vlastní',
      owes: 'Dluží',
      netWorth: 'čisté jmění',
      caption: 'Příjem je to, co přichází. Čisté jmění je to, co vlastníte, minus to, co dlužíte. Ukázkové částky.',
      people: {
        alex: { name: 'Alex', note: 'Auto a karta, obojí na dluh' },
        sam: { name: 'Sam', note: 'Úspory, penze, malá půjčka' },
      },
    },
    planner: {
      heading: 'Podívejte se, kam to může vést.',
      body: 'Stavím plánovač: co vlastníte, dlužíte, vyděláváte a utrácíte na jednom místě, v jedné měně i ve více měnách, aby šlo rozhodnutí, jako je toto, porovnat dřív, než je uděláte.',
    },
    example: {
      label: 'Jedno rozhodnutí, dvě cesty',
      text: 'Stejný začátek; mění se jen částka vkládaná každý měsíc.',
      currencyNote:
        'Koruny jsou jen měna, kterou tento příklad používá. Obě cesty mají stejný procentní výnos, takže rozdíl mezi nimi je také poměr: v eurech nebo dolarech by obě čáry měly stejný tvar, změnila by se jen osa.',
      gapLead: 'Po {years} letech je rozdíl zhruba {gap}.',
      gapRest: 'Většinu tvoří peníze vložené navíc; zbytek je růst.',
      fold: 'Jak tento příklad funguje',
      chartTitle: 'Příklad: porovnání jednoho rozhodnutí v průběhu deseti let',
      today: 'Dnes',
      year: 'Rok {n}',
      axisStart: 'dnes',
      axisEnd: '+{years} let',
      perMonth: '{amount}/měs.',
      description:
        'Dvě ukázkové cesty začínají stejnou dnes investovanou částkou {invested} a počítají s ukázkovým výnosem {pct} ročně po odečtení inflace. Při vkladu {monthly} měsíčně je výsledek po {years} letech zhruba {end}; při vkladu {higher} měsíčně zhruba {alternative}. Rozdíl zhruba {gap} tvoří {extra} vložených navíc a zhruba {growth} růstu navíc.',
      footnote:
        'Předpokládá ukázkový výnos {pct} ročně po odečtení inflace, s měsíční částkou přidanou na začátku každého měsíce. Skutečné výnosy se rok od roku liší a mohou být záporné. Celé čisté jmění neroste jedním tempem: auto ztrácí hodnotu a půjčka se splácí.',
      keysHint: 'Hodnoty přečtete šipkami doleva a doprava.',
    },
    faq: {
      heading: 'Časté dotazy',
      items: [
        {
          q: 'Je nidhi pro ty, kdo začínají?',
          a: 'Ano. Vzdělávací cesta začíná tím, co je čisté jmění, a nepředpokládá žádné předchozí znalosti. Každá lekce vysvětluje své pojmy průběžně a lekce (zatím jich je {total}) jdou po sobě v pořadí čtení, takže stačí začít nahoře a pokračovat.',
        },
        {
          q: 'Potřebuji k používání nidhi peníze ve více než jedné měně?',
          a: 'Ne. Vše funguje s jedinou měnou. Podpora více měn je tu pro chvíle, kdy ji život potřebuje: úspory v jedné zemi, důchod nebo nemovitost v jiné, nebo plány na stěhování.',
        },
        {
          q: 'Kolik nidhi stojí?',
          a: 'Lekce a nástroje zdarma nestojí nic a nepotřebují účet. Lekce zůstanou zdarma, bez placeného přístupu.',
        },
        {
          q: 'Je to finanční poradenství?',
          a: 'Ne. nidhi je vzdělávací: vysvětluje, jak peníze fungují, a umožňuje vymodelovat vlastní situaci. Není finančním poradcem s příslušným oprávněním. U rozhodnutí, na kterých záleží, se poraďte s kvalifikovaným odborníkem.',
        },
        {
          q: 'Co se stane s čísly, která zadám do nástrojů?',
          a: 'Zůstávají ve vašem zařízení a neposílají se nidhi. Nástroje zdarma počítají ve vašem prohlížeči a nikdy nezapisují, co zadáte, do adresy stránky. Když nástroj potřebuje vnější data, například denní směnné kurzy, váš prohlížeč se dané služby zeptá jen na kurzy, nikdy neposílá vaše částky; jako každý požadavek ukáže té službě vaši IP adresu. Podrobnosti najdete na stránce o soukromí.',
        },
        {
          q: 'Co je plánovač a kdy ho budu moct používat?',
          a: 'Plánovač spojuje vše dohromady: co vlastníte, dlužíte, vyděláváte a očekáváte, že utratíte, promítnuté do budoucnosti s viditelnými předpoklady, aby šlo rozhodnutí porovnat dřív, než je uděláte. Otevírá se postupně. Zapište se na seznam a až se otevře, dostanete jeden e-mail.',
        },
      ],
      why: 'nidhi vzniklo, protože neexistoval nástroj, který by seděl na obyčejný finanční život: peníze ve více než jedné zemi, dluhy v jiné, budoucnost přes hranice. Tak ho stavím a cestou vysvětluji, co se učím.',
      trustLine: 'Vyrobeno v Praze. Žádné reklamy, žádný prodej dat. Lekce citují své zdroje.',
      trustBeliefs: 'Čemu věřím',
      trustEditorial: 'Jak píšeme',
      trustPrivacy: 'Zásady ochrany soukromí',
    },
    levels: {
      discovery: 'Objevování',
      building: 'Budování',
      psychology: 'Psychologie',
      optimizing: 'Optimalizace',
      mastery: 'Mistrovství',
    },
    startingPoints: {
      basics: {
        audience: 'Úplný začátek',
        situation: 'Začínám úplně od začátku.',
        detail: 'Víte, že by bylo dobré svým penězům rozumět lépe, ale ne, kde začít. Začněte myšlenkami, na kterých stojí všechno ostatní.',
      },
      'no-plan': {
        audience: 'Nějaké zkušenosti',
        situation: 'Mám nějaké úspory, ale žádný plán.',
        detail: 'Peníze přibývají a nevíte jistě, co by měly dělat. Zjistěte, k čemu slouží spoření, investování a cíle.',
      },
      habits: {
        audience: 'Teorii znáte',
        situation: 'Vím, co dělat, ale ne vždy to dělám.',
        detail: 'Většina chyb s penězi není o znalostech. Podívejte se, jak pozornost, zvyk a emoce utvářejí vaše rozhodnutí.',
      },
      complex: {
        audience: 'Hodně zkušeností',
        situation: 'Moje finance se zkomplikovaly.',
        detail: 'Projekce, scénáře „co kdyby“, peněžní tok, poplatky a daně: stejné myšlenky, ale více proměnných.',
      },
    },
    toolCards: {
      netWorth: { name: 'Kalkulačka čistého jmění', desc: 'Jedna měna i více.' },
      loanComparison: { name: 'Srovnání úvěrů', desc: 'Nabídky úvěrů vedle sebe.' },
      monteCarlo: { name: 'Simulátor Monte Carlo', desc: 'Rozpětí výsledků, ne jedna čára.' },
      inflation: { name: 'Inflační kalkulačka', desc: 'Co si za peníze koupíte v průběhu let.' },
    },
  },

  ...learnCs,

  tools: toolsCs,
};
