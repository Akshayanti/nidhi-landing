# Hindi glossary

One approved Hindi rendering per recurring term, so the chrome, the lessons and
the tools keep agreeing. Change a term here first, then everywhere it appears.
The chrome's own copy lives in `src/i18n/strings/hi.ts`; the lessons live in
`src/content/blog-hi/`.

Status: a starter list, fixed when the first Hindi lesson was written. Terms
are added as lessons need them, and a term already listed is not re-decided
per lesson.

## Rules that apply to every string

These come from `CLAUDE.md` and from the decisions the Hindi edition was
planned around. They are not style preferences; a reviewer should treat a
breach as a defect.

1. **No em dashes and no double dashes.** Devanagari uses the danda `।` as a
   full stop; inside a sentence use a colon, a comma, or reword. This applies
   to Devanagari text as much as to Latin, so a long dash and a doubled hyphen
   are both out, in prose and in code comments alike.
2. **Teach, do not prescribe.** The order is: the concept, why people use it,
   the cited evidence with its limits, where it breaks, what depends on the
   reader's situation. Describe common practice ("एक आम शुरुआत यह है कि...")
   rather than instructing. Imperatives are fine for neutral actions (अपने
   खाते लिख लें, अपना स्टेटमेंट देखें), not for allocation, product, debt or tax
   decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the
   cited sources and the country-neutral "where to check locally" wording stay
   exactly as the English lesson has them. This keeps the promise in
   `src/pages/editorial-policy.astro` that the lessons are written for readers
   anywhere true in both editions, and keeps figures agreeing across lessons.
4. **Digits stay Latin.** `₹`, `€`, `$`, `4%`, `1,00,000` and `2026` are written
   with Latin digits, the way Indian financial writing does. Do not use
   Devanagari numerals.
5. **The brand stays Latin.** `nidhi` is never transliterated. Product names
   (PostHog, Frankfurter) and source names (the cited papers, institutions and
   data sets) stay as they are.
6. **English in parentheses on first use.** The first time a lesson uses a
   translated term, the English term follows it in parentheses, which is
   standard practice in Indian financial writing. Later uses drop it.
7. **No new browser storage and no keys renamed.** The keys are the same in
   every language, and `nidhi-reading-progress` is deliberately shared, so a
   lesson read in either language counts once.

## Vocabulary

Terms marked "decided" had more than one plausible candidate; the note records
why this one won, so it is not re-argued in a later lesson.

### Money and the balance sheet

| English | Hindi | Notes |
| --- | --- | --- |
| net worth | शुद्ध संपत्ति | Decided against कुल संपत्ति, which reads as total assets and would let a reader add up what they own without subtracting what they owe. शुद्ध is the word for net. नेट वर्थ was the other candidate and is common in Hindi business writing; शुद्ध संपत्ति won because the term a reader meets first should teach the subtraction rather than hide it behind a loanword, and rule 6 puts नेट वर्थ in parentheses on first use anyway. |
| assets | संपत्तियाँ | Singular संपत्ति where the sentence needs it. |
| liabilities | देनदारियाँ | Not ऋण: देनदारियाँ covers mortgages, card balances and informal debt alike. |
| debt | कर्ज़ | The everyday word. ऋण is formal and is avoided outside quoted material. |
| loan | लोन | ऋण avoided for readability, see above. |
| principal | मूलधन | |
| interest | ब्याज | |
| interest rate | ब्याज दर | |
| EMI | EMI | Latin, as borrowers say it. Spelled out as मासिक किस्त only where the lesson defines the term. |
| mortgage | मॉर्गेज | Kept as a loanword, as Indian financial writing does. Home loan (होम लोन) where the lesson means that specifically. |
| cash flow | कैश फ़्लो | |
| income | आय | |
| expenses | खर्च | |
| savings | बचत | The act and the stock. "Savings rate" is बचत दर. |
| budget | बजट | |
| emergency fund | आपातकालीन कोष | Decided against इमरजेंसी फंड, which reads as a product rather than a purpose. |
| net income | शुद्ध आय | |

### Growing money

| English | Hindi | Notes |
| --- | --- | --- |
| investing | निवेश | |
| investment | निवेश | Same word; the sentence carries the difference. |
| return | रिटर्न | प्रतिफल is accurate but rare in the writing a general reader meets. |
| compounding | चक्रवृद्धि | चक्रवृद्धि ब्याज for compound interest. |
| inflation | महँगाई | Decided: महँगाई is what a reader actually uses; मुद्रास्फीति is the official term and appears only beside a cited figure that names it. |
| purchasing power | क्रय शक्ति | |
| risk | जोखिम | |
| volatility | अस्थिरता | |
| diversification | विविधीकरण | |
| asset allocation | परिसंपत्ति आवंटन | |
| rebalancing | पुनर्संतुलन | |
| portfolio | पोर्टफ़ोलियो | |
| index fund | इंडेक्स फंड | |
| mutual fund | म्यूचुअल फंड | |
| equity | इक्विटी | शेयर where the lesson means shares a person holds. |
| share, stock | शेयर | |
| bond | बॉन्ड | |
| fixed income | फिक्स्ड इनकम | |
| expense ratio | व्यय अनुपात | |
| tax | कर | आयकर for income tax. |
| tax-advantaged account | कर-बचत खाता | |
| fees, charges | शुल्क | |

### Planning and behaviour

| English | Hindi | Notes |
| --- | --- | --- |
| financial independence | वित्तीय स्वतंत्रता | Reversed after the about page: it was आर्थिक स्वतंत्रता, which is the commoner phrase. वित्तीय wins on the rule that one English term gets one Hindi rendering: this list already has वित्तीय साक्षरता for financial literacy and वित्तीय सलाह for financial advice, and आर्थिक means economic, which is a different word. |
| retirement | रिटायरमेंट | सेवानिवृत्ति is the official word and reads as a form. |
| withdrawal rate | निकासी दर | |
| safe withdrawal rate | सुरक्षित निकासी दर | |
| horizon | अवधि | The time the money is invested for, spelled out where अवधि alone is ambiguous. |
| goal | लक्ष्य | |
| net pay | हाथ में आने वाला वेतन | The gross-to-take-home difference is the point of the phrase, so it is spelled out rather than shortened to वेतन. |
| credit score | क्रेडिट स्कोर | |
| insurance | बीमा | |
| premium | प्रीमियम | |
| cover, sum insured | बीमा राशि | |
| deductible | कटौती योग्य राशि | |
| liquidity | तरलता | |
| risk tolerance | जोखिम लेने की क्षमता | Not जोखिम उठाने की क्षमता: उठाना is what a person does with loss, and the phrase is about capacity, which is what लेने की क्षमता names. Reused by the about page. |
| tax residency | कर निवास | The noun: कर निवासी is the person. कर निवास स्थिति is the same thing with a word bolted on. |
| opportunity cost | अवसर लागत | |
| rule of thumb | अंगूठे का नियम | The Hindi calque is what Indian financial writing uses, and it is the term the lessons lean on hardest (the 4% rule is the first one a reader meets). Decided against सामान्य नियम, which loses that the rule is a shortcut rather than a fact. |
| sunk cost | डूबी लागत | |
| loss aversion | हानि से बचने की प्रवृत्ति | |
| mental accounting | मानसिक लेखांकन | |
| overconfidence | अति आत्मविश्वास | |
| anchors, anchoring | एंकर, एंकरिंग | |
| herd behaviour | भेड़चाल | |
| financial fragility | आर्थिक कमज़ोरी | आर्थिक here, not वित्तीय: the phrase is about a household's circumstances, not about money as a subject. |
| FIRE | FIRE | Kept in Latin, defined in words on first use as वित्तीय स्वतंत्रता और जल्दी रिटायरमेंट. |

### Reading and sources

Introduced by the about page, and kept here because the lessons use the same
words.

| English | Hindi | Notes |
| --- | --- | --- |
| financial literacy | वित्तीय साक्षरता | |
| personal finance | पर्सनल फाइनेंस | Matches the RSS feed title already in `src/i18n/strings/hi.ts`. वैयक्तिक वित्त is the official phrasing and reads as a form. |
| money management | पैसे का प्रबंधन | |
| multi-currency | एक से ज़्यादा मुद्राओं में | Spelled out rather than बहुमुद्रा, which a general reader meets far less often. कई मुद्राओं में is shorter and just as good in flow, so the about page's `knowsAbout` label uses it; the lesson prose keeps एक से ज़्यादा, which is the precise one, since two currencies qualify. |
| referential reading | आगे पढ़ने के लिए | The heading over the sources listed under an article. Decided against संदर्भ सामग्री: it reads as a bibliography, and hides that the list is there to be read rather than cited. |
| sourcing standards | स्रोत चुनने और उद्धृत करने के मानक | Not स्रोतों के मानक, which reads as standards belonging to the sources rather than the standards for choosing and crediting them. |

### The beliefs page

The page describes the people who write here. A reviewer should read these as
identity statements, not as vocabulary: the Hindi has to say the same thing at
the same strength, and the only reason each row needs a note is that the
obvious rendering is weaker or wrong.

| English | Hindi | Notes |
| --- | --- | --- |
| person of colour | गैर-श्वेत | Decided against रंगीन, which means colourful, and against अश्वेत, which is narrower than the English. The sentence lists identities rather than counting them, so it reads "हम क्वीयर हैं, न्यूरोडाइवर्जेंट हैं, और गैर-श्वेत हैं". |
| queer | क्वीयर | Transliterated, as Indian LGBTQ+ writing does. Do not reach for a Sanskritised coinage. |
| neurodivergent | न्यूरोडाइवर्जेंट | As above. |
| dyslexia | डिस्लेक्सिया | Devanagari, because it is a condition rather than a product or a source name. ADHD stays in Latin, being an abbreviation. |
| word of mouth | मुँह-ज़बानी | |
| colour blind | रंग न पहचान पाना | Spelled out. वर्णांध is the clinical word and reads as a form. |

### Site vocabulary already in use

These are fixed by `src/i18n/strings/hi.ts` and appear in the chrome.

| English | Hindi |
| --- | --- |
| learning path | सीखने का रास्ता |
| lesson | पाठ |
| topic | विषय |
| level | स्तर |
| free tools | मुफ़्त टूल |
| net worth calculator | शुद्ध संपत्ति कैलकुलेटर |
| loan comparison | लोन की तुलना |
| Monte Carlo simulator | मोंटे कार्लो सिम्युलेटर |
| our beliefs | हमारे सिद्धांत |
| editorial policy | संपादकीय नीति |
| privacy | प्राइवेसी |
| cookie settings | कुकी सेटिंग |
| theme | थीम |
| language | भाषा |
| about nidhi | nidhi के बारे में |
| contact us | हमसे संपर्क करें |
| page | पेज | पृष्ठ is the purer word and was the other candidate. पेज wins because होम पेज is already fixed in the chrome and because the list above is full of loanwords a reader meets in the newspaper; a reader who says होम पेज does not then say संपादकीय नीति वाले पृष्ठ. |
| Prague | प्राग | Devanagari, as Indian Hindi writing has it. It appears once, in the beliefs page's `foundingLocation`. |

## Transliteration style

Sanskrit-origin terms that are everyday Hindi (ब्याज, बचत) are written in their
Hindi spelling. Recent loanwords from English keep their spoken form in
Devanagari (बजट, क्रेडिट, पोर्टफ़ोलियो) rather than a Sanskritised coinage,
because a reader who meets them in the newspaper meets them that way. Where a
word is an abbreviation or a product (EMI, FIRE, ETF, SIP), it stays in Latin
script.
