# Marathi glossary

One approved Marathi rendering per recurring term, so the chrome, the learning
path and the tools keep agreeing. Change a term here first, then everywhere it
appears. The chrome's and the path's copy lives in `src/i18n/strings/mr.ts`, the
path's shared vocabulary in `learn.ts`, and the tools' copy in
`src/i18n/strings/tools/`.

The lessons are the one part of the site that is not translated: they are
written once, in English, and every language lists those same lessons and links
to them at their one address. So this glossary governs the Marathi the site
itself writes, and a term below is listed because the chrome or a tool needs it.

Marathi shares the Devanagari script with Hindi, but not its vocabulary or its
grammar. The Hindi glossary (`hi-glossary.md`) was a reference when this list
was drawn up, never a source: a Hindi word is used only where it is also the
everyday Marathi one.

Status: fixed when the first Marathi strings were written (Oct 2026). Each of
the three council members proposed a rendering for every term without seeing
the others' lists; where the three differed, the choice and its reason are in
the Notes column. Terms are added as the site's own Marathi copy needs them,
and a term already listed is not re-decided per page.

## Rules that apply to every string

These come from `CLAUDE.md`, from the owner's decisions for this edition, and
from the rules the Hindi edition was planned around. A reviewer treats a breach
as a defect.

1. **No em dashes and no double dashes.** Use a colon, a comma, or reword. This
   applies to Devanagari text as much as to Latin, in prose and code comments.
2. **Marathi punctuation.** A sentence ends with a full stop (`.`), as modern
   Marathi writes it, never with the Hindi danda (`।`). Commas, colons, question
   marks and the typographic quotes `“...”` and `‘...’` are as in English; no
   straight quotes in prose.
3. **Teach, do not prescribe.** The order is: the concept, why people use it,
   the cited evidence with its limits, where it breaks, what depends on the
   reader's situation. Describe common practice ("अनेक जण सुरुवात अशी
   करतात...", "एक सामान्य सुरुवात म्हणजे...") rather than instructing.
   Imperatives are fine for neutral actions (तुमची खाती लिहा, स्टेटमेंट तपासा),
   not for allocation, product, debt or tax decisions.
4. **The reader is तुम्ही** (owner's decision, Oct 20 2026): warm and polite,
   with its plural verb forms (तुम्ही पाहू शकता, तुम्ही ठरवा, तुम्ही वाचले आहे).
   Never आपण for the reader, which also means "we" and would blur who is
   speaking; आपण is fine where the sentence means "we all" or "one".
5. **Do not mark the reader's gender, or the founder's.** तुम्ही's plural verb
   forms are gender-neutral (तुम्ही गेलात, तुम्ही केलेत); avoid a construction
   that forces a masculine or feminine form for the reader (not जिथे थांबला
   होतात, but मागच्या वेळी जिथे वाचन थांबले). The person who started nidhi is
   never given a gender either: write impersonally (लेखन कोणाचे आहे, साधने
   इथेच बनवली जातात) or let the verb agree with व्यक्ती, and treat nidhi, the
   project, as neuter.
6. **Translate, do not localise.** Euro amounts, US and EU data caveats, the
   cited sources and the country-neutral "where to check locally" wording stay
   as the English has them. **One exception, owner's decision of Oct 20 2026:**
   the home page's worked example and its chart are in rupees, reusing the
   Hindi edition's figures (`EXAMPLES.INR` in `src/utils/home/heroExamples.ts`).
   Where Marathi copy names several currencies, the order is rupees, then
   dollars, then euros, as on the Hindi edition.
7. **Digits stay Latin.** `₹`, `€`, `$`, `4%`, `1,00,000` and `2026` are written
   with Latin digits, as Marathi financial writing and the Hindi edition do.
   Never Devanagari numerals. Dates come from `Intl` with
   `mr-IN-u-nu-latn` (`20 ऑक्टोबर, 2026`).
8. **An amount keeps the spelling the English gives it** in prose: the symbol
   first, a comma between thousands, no space (`€10,000`, `$250,000`). The free
   tools format amounts by the currency the reader picked (`₹10,58,721` in lakh
   grouping for rupees), as on the Hindi edition.
9. **The brand stays Latin.** `nidhi` is never transliterated or inflected with
   a joined suffix: write `nidhi चे`, `nidhi विषयी`, with a space. Product names
   (PostHog, Frankfurter), source names and person names stay as they are.
10. **English in parentheses on first use**, as the Hindi edition's rule 6
    (council, 2026-10-20). The English sits in the bracket in Latin letters,
    `निव्वळ संपत्ती (net worth)`, because it is the word the reader meets next:
    in the English lessons, on a bank statement, in a search box. It goes:
    - **once per page**, at the term's first use in visible prose, including an
      FAQ answer that explains the term, and on every translated term of the
      learning path's level "covered" lists and helper concepts (loanwords
      such as बजेट and डॅशबोर्ड, and English like FIRE, need none).
      Later uses on that page drop it.
    - **in a tool's H1 and `<title>`**, for that tool's own term only:
      `निव्वळ संपत्ती (Net Worth) कॅल्क्युलेटर`, `महागाई कॅल्क्युलेटर
      (Inflation Calculator)`, as the Hindi edition has them.
    - **never** in meta descriptions, other headings, nav labels, buttons,
      form labels, chart legends, cards, tag descriptions, or a tool's result
      lines. The one exception is an FAQ question that asks what a term means
      (`“खर्चाचे चलन” (functional currency) म्हणजे काय?`), as on the Hindi page.
    - **only on a bookish, opaque or English-first term**: net worth,
      liabilities, cash flow, emergency fund, exchange rate, purchasing power,
      diversification, rebalancing, compounding, volatility, rule of thumb,
      tax residency, risk tolerance, tax-advantaged account, percentage point,
      geometric average, scenario, functional currency, nominal balance, net
      debt, ongoing charge, recast, spread, margin, hedging, glide path,
      balloon payment, secondary (source), and the behavioural terms of the
      psychology level. Everyday Marathi (व्याज, बचत, कर्ज, महागाई, मुद्दल,
      हप्ता) and loanwords (पोर्टफोलिओ, इंडेक्स फंड) never get one outside the
      covered lists.
    - **as one unit**: the words inside a short English bracket are joined
      with a no-break space, written `\u00a0` in the catalog (`(net\u00a0worth)`),
      so a bracket never splits across lines; a catalog test checks it.
    The privacy notice and the subscribe and waitlist boxes stay exempt, as
    on the Hindi edition.
11. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
    Marathi attaches case endings to the noun, so a placeholder that stands for
    a number takes its noun after it (`{count} धडे`), and a sentence is built
    so a suffix never has to join a placeholder.
12. **Plurals.** Marathi has one form for 1 and another for every other number,
    including 0 (`1 धडा`, `0 धडे`, `5 धडे`). Each catalog's `Few` key is the
    same as its `Many` key; `plural()` picks the form.
13. **Short meta descriptions.** Every Marathi meta description is at most 160
    characters, so search results show it whole; a catalog test enforces it.
14. **No new browser storage and no keys renamed.** The keys are the same in
    every language.
15. **A detached case word stays on its line.** Marathi joins most case
    endings to the noun, but writes them apart after a Latin word, a number or
    a placeholder (`nidhi चे`, `₹5,000 पासून`, `{gap} चा`, `2025 मधील`). That
    space is a no-break space (U+00A0), so a line never starts with चे, चा,
    मध्ये, पासून, वर, साठी and the like; a string that begins with one (it
    follows a link or a bold label) begins with a no-break space. Type it as
    U+00A0 in the catalog; `catalog.test.ts` fails on an ordinary space there.
    This is the Marathi counterpart of the Czech rule for one-letter
    prepositions.

### English that is allowed on a Marathi page

An audit of the built `/mr/` pages treats any Latin-script text as a finding,
except: the brand `nidhi`; product, company, source and person names; language
names in their own script (the language picker); English lesson titles and
descriptions, marked `lang="en"`; the privacy changelog, which stays English in
every edition (CLAUDE.md); an English term in parentheses on first use (rule
10); acronyms Marathi writing keeps in Latin (FIRE, EMI, SIP, APR, APRC, ECB, GDPR,
CPI, AI, ADHD, DM, IP, OS, ID, URL, CSV, API, utm_*);
currency codes and symbols; URLs, code terms (`localStorage`, storage keys) and
data-attr labels.

## Vocabulary

Terms marked "contested" had different proposals from the three members; the
note records why this one won.

### Money and the balance sheet

| English | Marathi | Notes |
| --- | --- | --- |
| net worth | निव्वळ संपत्ती | All three agreed. निव्वळ is the Marathi word for net; not the Hindi शुद्ध संपत्ति. |
| assets | मालमत्ता | In plain lists: तुमच्याकडे काय आहे. |
| what you owe | तुमची देणी | Contested. A noun reads better in lists (मालमत्ता, देणी, उत्पन्न, खर्च) than a relative clause. |
| liabilities | देणी | Not दायित्व, which is bookish. कर्जे आणि देणी where the sentence lists both. |
| debt | कर्ज | Contested: Codex proposed कर्जबोजा, which means a debt burden and is kept for that sense only. |
| loan | कर्ज | |
| EMI | EMI | Latin, as borrowers say it; मासिक हप्ता where the text defines it. |
| mortgage | गहाण कर्ज | Contested. A mortgage can be on any real estate, so not गृहकर्ज (a home loan), which is used where the text means a home loan specifically. |
| principal | मुद्दल | The Marathi banking word. |
| interest | व्याज | |
| interest rate | व्याजदर | |
| income | उत्पन्न | |
| expenses | खर्च | |
| savings | बचत | बचतीचा दर for the savings rate. |
| budget | बजेट | अंदाजपत्रक is the government's budget. |
| emergency fund | आपत्कालीन निधी | |
| cash flow | रोख प्रवाह | Contested (रोकड प्रवाह, पैशांचा ओघ). रोख is the commoner spelling in finance writing; (cash flow) on first use. |
| net pay | हातात येणारा पगार | Contested (निव्वळ पगार). The gross-to-take-home difference is the point, so it is spelled out. |
| credit card | क्रेडिट कार्ड | |
| real estate | स्थावर मालमत्ता | The topic name. |
| car | कार | Contested (गाडी, which also means any vehicle or a train). |

### Growing money

| English | Marathi | Notes |
| --- | --- | --- |
| investing, investment | गुंतवणूक | गुंतवणूक करणे for the act where the sentence needs a verb. |
| return | परतावा | The Marathi press word; not the Hindi रिटर्न. |
| real return | वास्तविक परतावा | |
| compound interest | चक्रवाढ व्याज | |
| compounding | चक्रवाढ | |
| inflation | महागाई | चलनवाढ, the economics term, only beside a cited figure that names it. |
| purchasing power | क्रयशक्ती | Contested (खरेदी क्षमता). |
| risk | जोखीम | Not धोका, which is danger. |
| volatility | चढ-उतार | Contested (अस्थिरता). Plain and exact for price swings; (volatility) on first use. |
| diversification | विविधीकरण | |
| asset allocation | मालमत्ता वाटप | Contested (विभागणी). वाटप is the usual word for an allocation. |
| rebalancing | पुनर्संतुलन | (rebalancing) on first use. |
| portfolio | पोर्टफोलिओ | |
| index fund | इंडेक्स फंड | |
| mutual fund | म्युच्युअल फंड | |
| SIP | SIP | Latin, as investors say it. |
| share, stock | शेअर | |
| equities | इक्विटी | |
| bond | रोखे | Contested (बाँड). The standard Marathi financial term, generic as well as government (सरकारी रोखे, कर्जरोखे). (bond) on first use. |
| fixed income | निश्चित उत्पन्न | |
| expense ratio | खर्चाचे प्रमाण | Contested (गुणोत्तर). (expense ratio) on first use. |
| fees | शुल्क | |
| tax | कर | प्राप्तिकर for income tax. |
| tax-advantaged account | करसवलतीचे खाते | |
| asset classes | मालमत्ता प्रकार | |
| leverage | कर्ज घेऊन गुंतवणूक | Contested (लिव्हरेज). The explanation is the term; (leverage) on first use. |
| currency risk | चलन जोखीम | |
| exposure | हिस्सा | Contested. "Exposure to a currency" is the share of the net worth held in it: त्या चलनातील हिस्सा. |
| concentration | एकवटलेली गुंतवणूक; a percentage: हिस्सा | Contested (केंद्रीकरण, एकाग्रता). एकवटलेली गुंतवणूक for the idea and its risk (चलनात एकवटलेल्या गुंतवणुकीची जोखीम). Where the net worth calculator means a currency's percentage of net worth (concentration %, concentration bands, the concentration chart), हिस्सा: the tool's own explainer defines concentration as that share, and चलननिहाय हिस्सा reads at once where a percentage follows. |
| hedging | जोखीम-बचाव | Contested (हेजिंग). (hedging) on first use. |
| broker | ब्रोकर | Not दलाल, which can read as a middleman taking a cut. |
| spread (FX) | खरेदी-विक्री दरातील फरक | Contested. (spread) on first use. |
| margin (over an index rate) | वाढीव दर | Contested. (margin) on first use. |
| asset location | खात्यांमधील मालमत्तांची मांडणी | Contested. (asset location) on first use. |
| glide path | कालानुसार बदलणारे वाटप | Contested (ग्लाइड पाथ). (glide path) on first use. |
| standard deviation | प्रमाण विचलन | |
| inflation-adjusted, real | महागाई-समायोजित, वास्तविक | |
| mix (stocks/bonds) | मिश्रण | |
| monthly contribution | मासिक गुंतवणूक | Contested (योगदान, which reads as a donation). |
| withdrawal (a single one) | काढलेली रक्कम | Contested. |
| intergenerational wealth | पिढ्यान्पिढ्यांची संपत्ती | |

### Planning and behaviour

| English | Marathi | Notes |
| --- | --- | --- |
| financial independence | आर्थिक स्वातंत्र्य | Contested (स्वावलंबन, self-reliance, a different idea). |
| FIRE | FIRE | |
| retirement | निवृत्ती | |
| withdrawal rate | पैसे काढण्याचा दर | Contested (काढणी दर, which reads as a harvest rate). |
| safe withdrawal rate | पैसे काढण्याचा सुरक्षित दर | Contested. The rate is what is safe, not the money. |
| the 4% rule | 4% नियम | |
| horizon | कालावधी | |
| goal | उद्दिष्ट | Contested (ध्येय, more an aspiration than a financial target). |
| credit score | क्रेडिट स्कोअर | |
| insurance | विमा | |
| premium | विमा प्रीमियम | Contested. A premium can be paid at once, so not हप्ता (an instalment). |
| deductible | स्वतः भरायची रक्कम | Contested. वजावट reads as a tax deduction. (deductible) on first use. |
| liquidity | तरलता | Contested (रोकडसुलभता). |
| risk tolerance | जोखीम सहनशीलता | Contested. Tolerance is willingness, not capacity (क्षमता). |
| tax residency | कर-निवासाचा दर्जा | Contested. A status, so दर्जा. |
| opportunity cost | संधी खर्च | |
| rule of thumb | ढोबळ नियम | |
| sunk cost | बुडीत खर्च | |
| loss aversion | तोटा टाळण्याची प्रवृत्ती | Contested (तोट्याची भीती, which is fear rather than a tendency). |
| bias | पूर्वग्रह | |
| behavioural finance | वर्तनविषयक वित्त | Contested. Finance, not economics. |
| mental accounting | मानसिक हिशेब | Contested (हिशोब). हिशेब is the spelling the Marathi dictionaries give; हिशोब is a spoken variant. |
| overconfidence | अतिआत्मविश्वास | |
| anchoring | पहिल्या आकड्याला चिकटून राहणे | Contested (अँकरिंग). (anchoring) on first use. |
| herd behaviour | कळपवृत्ती | Contested. |
| default (assumption, setting) | पूर्वनिश्चित | Contested (डीफॉल्ट). पूर्वनिश्चित मूल्य for a setting. |
| financial fragility | आर्थिक नाजूकपणा | Contested. Fragility is vulnerability to a shock, not general insecurity (असुरक्षितता). |
| estate planning | वारसा नियोजन | |
| means-tested benefits | उत्पन्न व मालमत्ता तपासून मिळणारे लाभ | Contested. |
| no prerequisite | पूर्वज्ञानाची गरज नाही | |
| qualified professional | पात्र तज्ज्ञ | |
| licensed (financial adviser) | परवानाधारक | |
| money scripts | पैशांबद्दलच्या धारणा | Contested. (money scripts) on first use. |
| framing | चौकट | Contested (मांडणी, which is generic and is used for asset location). (framing) on first use. |
| blended families | मिश्र कुटुंबे | |
| gig work | गिग काम | |
| person of colour | गोरेतर व्यक्ती | Contested. A person of colour is not a minority everywhere, so not वांशिक अल्पसंख्याक. |
| queer | क्वीअर | |
| neurodivergent | न्यूरोडायव्हर्जंट | With a short gloss on first use. |
| colour blind | रंगांधळे | रंगांधळेपणा for the condition. |

### The site

| English | Marathi | Notes |
| --- | --- | --- |
| lesson | धडा | Plural धडे. |
| learning path | शिकण्याचा मार्ग | |
| level | पातळी | Contested (टप्पा, स्तर). |
| Discovery | ओळख | |
| Building | उभारणी | |
| Psychology | मानसशास्त्र | |
| Optimizing | सुधारणा | Contested (अनुकूलन is jargon; a phrase is too long for a level name). |
| Mastery | प्रभुत्व | Contested (प्रावीण्य, निपुणता). |
| Inclusive Finances | सर्वसमावेशक वित्त | Contested. |
| topic (tag) | विषय | |
| guide (Inclusive Finances) | मार्गदर्शिका | |
| free tools | मोफत साधने | |
| net worth calculator | निव्वळ संपत्ती कॅल्क्युलेटर | |
| loan comparison | कर्जांची तुलना | Contested (कर्ज तुलना). The genitive is the natural Marathi phrase. |
| Monte Carlo simulator | मॉन्टे कार्लो सिम्युलेटर | Contested (Latin). A method's name, written in Devanagari as the Hindi edition does. |
| inflation calculator | महागाई कॅल्क्युलेटर | |
| waitlist | प्रतीक्षा यादी | |
| newsletter | न्यूजलेटर | |
| share link | शेअर लिंक | |
| beliefs (page) | आमची तत्त्वे | Contested (मूल्ये, श्रद्धा). The page states principles. |
| editorial policy | संपादकीय धोरण | |
| personal finance | वैयक्तिक वित्त | Contested. |
| financial literacy | आर्थिक साक्षरता | |
| further reading | पुढील वाचन | |
| planner (the product) | प्लॅनर | |
| Learn, Take stock, Plan ahead | शिका, आढावा घ्या, पुढचे नियोजन करा | |
| Learn (nav, footer, breadcrumb) | शिका | |
| Home | मुख्यपृष्ठ | |
| About (group) / About nidhi (page) | माहिती / nidhi विषयी | |
| Browse topics | विषय पाहा | पाहा is the standard imperative. |
| breadcrumb (landmark label) | पानाचा मार्ग | |
| FAQ | वारंवार विचारले जाणारे प्रश्न | Contested. वारंवार is "frequently". |
| paywall | पेवॉल | |
| illustrative amounts | उदाहरणादाखल रकमा | |
| dashboard | डॅशबोर्ड | |

### The privacy notice

| English | Marathi | Notes |
| --- | --- | --- |
| privacy notice | गोपनीयता सूचना | |
| analytics | वापराचे विश्लेषण | Contested. (analytics) on first use. |
| processor | डेटा प्रक्रिया करणारी संस्था | Contested. |
| consent | संमती | |
| retention | डेटा ठेवण्याचा कालावधी | Contested. |
| material (change) | महत्त्वाचा | |
| changelog | बदलांची नोंद | |
| Earlier changes | आधीचे बदल | |
| anonymous | निनावी | Contested (अनामिक). The everyday word. |
| localStorage | localStorage | Code term. |
| cookie banner | कुकी सूचना | |
| GDPR | GDPR | |
| timestamp | वेळेची नोंद | |
| double opt-in | दुहेरी पुष्टी | (double opt-in) on first use. |
| single opt-in | एकेरी पुष्टी | |
| unsubscribe | सदस्यत्व रद्द करा | |
| waitlist signups | प्रतीक्षा यादीतील नोंदणी | |
| Cookie settings | कुकी सेटिंग्ज | |
| bookmark (a page) | बुकमार्क करा | |

### The free tools

| English | Marathi | Notes |
| --- | --- | --- |
| monthly payment | मासिक हप्ता | (EMI) where the context is an Indian loan. |
| loan amount | कर्जाची रक्कम | |
| annual interest rate | वार्षिक व्याजदर | |
| term (months) | मुदत (महिने) | Contested. |
| amortisation schedule | कर्जफेडीचे वेळापत्रक | Contested. |
| balance (of a loan) | बाकी कर्ज | Contested. |
| balance (of a portfolio) | पोर्टफोलिओचे मूल्य | Contested. |
| lender | कर्जदाता | |
| recast | हप्त्यांची पुनर्गणना | Contested. (recast) on first use. |
| apply to principal | मुद्दलात जमा करा | |
| total cost | एकूण खर्च | |
| origination fee | कर्जप्रक्रिया शुल्क | |
| closing costs | व्यवहार खर्च | |
| discount points | डिस्काउंट पॉइंट्स | With a gloss on first use: व्याजदर कमी करण्यासाठी आगाऊ भरलेले शुल्क. |
| break-even | खर्च वसूल होण्याचा टप्पा | Contested (ना नफा ना तोटा is the accounting phrase for a business). |
| refinance | कर्जाचे पुनर्वित्त | Contested. (refinance) on first use. |
| prepayment | मुदतपूर्व परतफेड | |
| prepayment penalty | मुदतपूर्व परतफेडीवरील दंड | |
| exchange rate | विनिमय दर | |
| spending currency (home currency) | खर्चाचे चलन | |
| percentile | शतमक | Contested. (percentile) on first use. |
| median | मध्यक | |
| APR | APR | |
| APRC (EU) | APRC | |
| ECB | ECB | युरोपियन सेंट्रल बँक where the text spells it out. |
| business day | कामकाजाचा दिवस | |
| row (of the net worth table) | ओळ | |
| donut chart | डोनट आलेख | Contested. |
| fan chart | फॅन आलेख | Contested. |
| Full / Redacted (share options) | पूर्ण / रकमा लपवलेल्या | Contested. |
| Cautious / Historical / Optimistic | सावध / ऐतिहासिक / आशावादी | |
| lump sums | एकरकमी रकमा | |
| months to payoff | परतफेडीपर्यंतचे महिने | Contested. |
| advertised (headline) rate | जाहिरातीतील दर | |
| present value | वर्तमान मूल्य | Contested. |
| percentage point(s) | टक्के बिंदू | Contested. टक्केवारी अंक reads as a percentage figure, not the unit of difference between two percentages. |
| refinancing scenario | पुनर्वित्त परिदृश्य | Contested. |
| n/a | लागू नाही | |
| input prompt (Enter...) | ... भरा | Contested. |
| Add (button) | जोडा | |
| simulation, path | सिम्युलेशन, संभाव्य मार्ग | Contested. |
| raise (in pay) | पगारवाढ | |
| real rate | वास्तविक दर | |
| geometric average | भूमितीय सरासरी | |
| scenario, forecast | परिदृश्य, अंदाज | Contested. A modelled case, not a situation (परिस्थिती). |
| basket (CPI) | वस्तू व सेवांची टोपली | Contested. |
| hyperinflation | अतिमहागाई | |
| about (an approximate amount) | सुमारे | |
| euro area | युरो क्षेत्र | |
