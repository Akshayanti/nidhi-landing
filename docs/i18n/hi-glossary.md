# Hindi glossary

One approved Hindi rendering per recurring term, so the chrome, the learning
path and the tools keep agreeing. Change a term here first, then everywhere it
appears. The chrome's and the path's copy lives in `src/i18n/strings/hi.ts`, the
path's shared vocabulary alongside it in `learn.ts`, and the tools' copy in
`src/i18n/strings/tools/`.

The lessons are the one part of the site that is not translated: they are
written once, in English, and every language lists those same lessons and links
to them at their one address. So this glossary governs the Hindi the site
itself writes, not a Hindi lesson corpus, and a term below is listed because
the chrome or a tool needs it (the net worth calculator, the loan comparison),
not because a lesson does.

Status: a starter list, fixed when the first Hindi strings were written. Terms
are added as the site's own Hindi copy needs them, and a term already listed is
not re-decided per page.

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
   exactly as the English has them, in a tool's Hindi as much as in the English
   next to it. This keeps the promise in `src/pages/editorial-policy.astro` that
   the writing is for readers anywhere true in both editions, and keeps figures
   agreeing between the two languages.
4. **Digits stay Latin.** `₹`, `€`, `$`, `4%`, `1,00,000` and `2026` are written
   with Latin digits, the way Indian financial writing does. Do not use
   Devanagari numerals.
5. **The brand stays Latin.** `nidhi` is never transliterated. Product names
   (PostHog, Frankfurter) and source names (the cited papers, institutions and
   data sets) stay as they are.
6. **English in parentheses on first use.** The first time a Hindi string uses a
   translated term, the English term follows it in parentheses, which is
   standard practice in Indian financial writing. Later uses drop it. On the
   learning path this applies to the level "covered" lists and the level
   helper's concepts, not to tag descriptions and cards, where it would crowd a
   two-line summary.
7. **No new browser storage and no keys renamed.** The keys are the same in
   every language, and `nidhi-reading-progress` is deliberately shared, so a
   lesson opened from either language counts once.
8. **An amount keeps the spelling the English gives it**: the symbol
   first, a comma between thousands, no space (`€10,000`, `$250,000`,
   `£120,000`). Never a dot between thousands and never a space-grouped form,
   because the same figure appears twice on a page, in the prose and in the
   figure or chart beside it, and `9.000 €` reads to an Indian reader as nine
   point zero zero zero. This
   applies to the chrome as well: the homepage's illustrative figures go
   through `formatProseAmount`, which follows this rule, while the free tools
   go through `formatAmount`, which formats by the currency the reader picked
   there. Above a lakh the English lesson writes the number in words
   (`₹1.25 lakh`), so the `₹10,58,721` lakh-grouped form of rule 4 is the
   tools' alone.

## Vocabulary

Terms marked "decided" had more than one plausible candidate; the note records
why this one won, so it is not re-argued in a later lesson.

### Money and the balance sheet

| English | Hindi | Notes |
| --- | --- | --- |
| net worth | शुद्ध संपत्ति | Decided against कुल संपत्ति, which reads as total assets and would let a reader add up what they own without subtracting what they owe. शुद्ध is the word for net. नेट वर्थ was the other candidate and is common in Hindi business writing; शुद्ध संपत्ति won because the term a reader meets first should teach the subtraction rather than hide it behind a loanword, and rule 6 puts नेट वर्थ in parentheses on first use anyway. |
| assets | संपत्तियाँ | Singular संपत्ति where the sentence needs it. |
| what you owe | जो आप पर बकाया है | Never the bare जो आप पर है, which is "what is on you" and reads as unfinished. In a list (what you own, owe, earn and spend) use nouns instead: आपकी संपत्ति, आपका कर्ज़, आपकी कमाई और आपका खर्च. |
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
| rule of thumb | अंगूठे का नियम | The Hindi calque is what Indian financial writing uses, and it is the term a reader meets hardest (the 4% rule is the first one). Decided against सामान्य नियम, which loses that the rule is a shortcut rather than a fact. |
| sunk cost | डूबी लागत | |
| loss aversion | हानि से बचने की प्रवृत्ति | Not हानि से बचाव, which reads as protection from loss and turns a bias into a strategy. |
| bias | पूर्वाग्रह | Not पक्षपात, which is favouritism. Present bias is वर्तमान पूर्वाग्रह. |
| behavioural (finance, biases) | व्यवहारगत | Not व्यवहारिक, one matra from व्यावहारिक (practical), which many readers take it for. |
| mental models | मानसिक मॉडल | Not मानसिक नमूने: नमूना is a sample. |
| default (assumption, plan, setting) | आम धारणा, आम योजना; plural आम धारणाएँ | Not डिफ़ॉल्ट, which on a finance site reads as a loan default. A tool's default setting is पहले से तय, its default values शुरुआती मान, and a vendor's default retention its "अपनी तय की हुई" period. |
| asset classes | परिसंपत्ति वर्ग | |
| asset location | एसेट लोकेशन (कौन-सा निवेश किस खाते में) | The gloss on first use; the literal परिसंपत्ति स्थान is opaque. |
| leverage | लीवरेज (उधार से निवेश) | Not उत्तोलन, a physics word Indian financial writing does not use. |
| real return | असली रिटर्न | Elsewhere the tools say महँगाई के बाद, which is the same thing. |
| estate planning | एस्टेट योजना (वसीयत और उत्तराधिकार) | |
| means-tested benefits | आय और संपत्ति की जाँच पर मिलने वाले सरकारी लाभ | Not माध्यम-परीक्षित लाभ, which no reader can decode. A heading may shorten it to आय-संपत्ति की जाँच वाले सरकारी लाभ. |
| financial health metrics | वित्तीय सेहत के पैमाने | Not स्वास्थ्य मापदंड, which reads as medical. |
| unmarried, cohabiting couples | अविवाहित, लिव-इन जोड़े | Not विवाहित न रहने वाले, which reads as couples who did not stay married. |
| widowhood | जीवनसाथी को खोना | Not विधवापन, which covers widows only. |
| survivor benefits | जीवनसाथी की मृत्यु के बाद मिलने वाले लाभ | Not उत्तरजीवी लाभ, which a beginner cannot decode. |
| no prerequisite | पहले कुछ पढ़ना ज़रूरी नहीं | Not पूर्व शर्त, which reads as an eligibility condition. |
| follow-up (a companion lesson) | के आगे का पाठ | Not अनुवर्ती. |
| tracking (progress) | नज़र रखना, प्रगति पर नज़र | Not ट्रैक करना or निगरानी, which were mixed in one tag. |
| Inclusive Finances (the search pill) | सबके लिए वित्त | Never सबके लिए alone, which on a search result says the other lessons are not for everyone. |
| mental accounting | मानसिक लेखांकन | |
| overconfidence | अति आत्मविश्वास | |
| anchors, anchoring | एंकर, एंकरिंग | |
| herd behaviour | भेड़चाल | |
| financial fragility | आर्थिक कमज़ोरी | आर्थिक here, not वित्तीय: the phrase is about a household's circumstances, not about money as a subject. |
| FIRE | FIRE | Kept in Latin, defined in words on first use as वित्तीय स्वतंत्रता और जल्दी रिटायरमेंट. A tight kicker may use FIRE (जल्दी रिटायरमेंट); a bare FIRE fails the catalog test's identical-value check. |

### Reading and sources

Introduced by the about page, and kept here because the chrome and the tools
use the same words.

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
| word of mouth | लोगों की ज़ुबानी | Not मुँह-ज़बानी, which means "orally, by heart" rather than spreading by recommendation. |
| colour blind | रंग न पहचान पाना | Spelled out. वर्णांध is the clinical word and reads as a form. |

### The privacy notice

The notice is the one document on the site whose job is to be precise, so its
Hindi is the least free of the four prose pages: a word that shifts the meaning
of a promise is a defect, not a wording choice. There is no rule 6 here either,
for the same reason: a parenthesis full of English inside a sentence that makes
a promise costs the reader more than it teaches.

| English | Hindi | Notes |
| --- | --- | --- |
| privacy notice | प्राइवेसी नोटिस | Decided against प्राइवेसी नीति, which the Hindi page reserves for the sentence about "हमने अपनी प्राइवेसी नीति बदली है" emails: a notice is what this page is, a policy is what such an email says the site has. The "Privacy policy" links in the subscribe box, the waitlist box and the home page's trust line also say प्राइवेसी नोटिस, because they open this page; नीति stays only in that email sentence. |
| analytics | एनालिटिक्स | |
| processor | प्रोसेसर | The GDPR's own word, and the one `privacyChangelog.ts` uses in English. |
| consent | सहमति | "Cookie consent" is कुकी सहमति. |
| retention | रिटेंशन | |
| material (change) | महत्वपूर्ण | The badge on a log entry, and the word the log's own intro explains. Hindi has no adjective that carries "affects how your data is handled" on its own, so the intro sentence is built around it: जिन बदलावों का असर इस पर पड़ता है कि हम निजी डेटा कैसे संभालते हैं (...) उन पर **महत्वपूर्ण** का निशान लगाया जाता है। An earlier wording, जिन बदलावों से पता चलता है, said "reveal" where the English says "affect". |
| changelog | बदलावों का रिकॉर्ड | Not चेंजलॉग, which is a developer's word. रिकॉर्ड is what Hindi calls a record kept of something. |
| Earlier changes | पहले के बदलाव | The label on the collapsed group. The log's intro quotes it, so the two must match word for word; changing one means changing the other. |
| anonymous | बिना नाम का | Spelled out. गुमनाम is what a form says about a respondent, and is the right word there; here the notice keeps repeating "no name, no email, no user ID", which is what बिना नाम का says. |
| localStorage | localStorage | Latin, like the six key names that follow it in the same list. A reader who wants to look up where those keys live needs the API's name, not a transliteration of it. |
| pending (a subscription) | लंबित | Not बाक़ी, which means what is left over. The newsletter's three states are लंबित, कन्फ़र्म and अनसब्सक्राइब. |
| viewport size | ब्राउज़र विंडो का आकार | Spelled out rather than व्यूपोर्ट, and deliberately not स्क्रीन का आकार: the screen and the window the page is drawn in are different measurements, and in a list of what is collected the wrong one is a worse error than a clunky phrase. |
| a flag (a stored setting) | एक फ़्लैग | Not झंडा, which is a flag on a pole. फ़्लैग is what Indian technical writing uses, and it sits beside six Latin key names in the same list. |

`नोटिस` is feminine here, so the page says `यह नोटिस अंग्रेज़ी में लिखी गई है` and
`किसी दिन यह नोटिस क्या कहती थी`. Hindi newspapers write the loanword both ways
and its gender is genuinely unsettled; feminine is the commoner of the two in
print, and it is what every string on this page uses, including the meta
description. Keep it, and if it is ever changed, change all of them at once.

#### The English governs, and the changelog is never translated

The Hindi notice is a translation and says so, in Hindi, above everything else:
the English text is the one that binds. Two things follow from that, and both
are structural rather than editorial.

`PrivacyPage.astro` holds the changelog once, in English, and renders it into
every edition, so the Hindi page has no second copy of the record that could
drift from it. A translated log would be a second, slightly different account
of what the site did on a given day, and the record is worth more than the
convenience.

The notice's dates stay English in every edition: `Oct 10, 2026` at the top,
`2026-10-10` on each entry. They sit directly above a log that is English and
is read as one document with it, and Indian publishing writes dates with
English month names as a matter of course, so this costs the Hindi reader
nothing.

Both notes that say all this, the one under the intro and the one above the
log, are rendered only when the locale is not the default one. On the English
page they would be telling a reader something they already know.

### The free tools

The three calculators are the densest interface on the site: a reader meets
forty labels per screen, and the same word appears in the label, the tooltip
and the FAQ answer that explains it. So the rule here is stricter than the rest
of the chrome's: one rendering, everywhere, and the FAQ uses the label's word
rather than a synonym for it. A label is also short: it has to fit a form column and
match what the label above it says, which is why several of these are the
everyday phrase rather than the precise one.

The tools' own output is not translated at all: `formatAmount` writes amounts
by the chosen currency's conventions, and the currency codes, `APR`, `CSV` and
`ECB` stay in Latin, as rule 5 says. The chart legends and axis words are prose
and do translate.

| English | Hindi | Notes |
| --- | --- | --- |
| monthly payment | मासिक किस्त | The glossary's EMI entry spelled out, because the tools are not about EMI as a product; a form column and a chart legend both carry it. |
| loan amount | लोन राशि | |
| annual interest rate | सालाना ब्याज दर | |
| term (months) | अवधि (महीने) | अवधि is the glossary's horizon word; the parenthesis is what tells a reader the field counts months, which the label has to do because the field is a number box. |
| payoff months | चुकाने के महीने | The count of months until the loan is paid off. |
| amortisation | किस्तों का शेड्यूल | The word is kept out of the prose: a Hindi reader meets the schedule, not the term. `amortisation schedule` is किस्तों का शेड्यूल. |
| principal | मूलधन | |
| interest | ब्याज | |
| balance (of a loan) | बकाया | `remaining balance` is बची हुई रकम; a chart legend uses the short form. |
| balance (of a portfolio) | पोर्टफ़ोलियो की रकम | Not बकाया, which reads as money owed and made an investment look like a debt, and not जमा रकम, which can read as the amount originally put in rather than what it is worth now. A chart legend shortens it to रकम. |
| lender, vendor | ऋणदाता | Decided against विक्रेता, which means seller: beside the horizon question ("अगर मैं बेच दूँ") it read as the person selling the house. ऋणदाता is the word Indian banking writing uses for a lender, so it is the exception to the debt entry's avoidance of ऋण. The English says vendor in the interface and lender in prose; the Hindi uses one word for both. |
| recast (the payment) | किस्त नए सिरे से निकालना | What a hybrid loan does when its fixed period ends. Not दोबारा जोड़ना, which says re-add. |
| apply to principal | मूलधन घटाना | A prepayment or lump sum reduces the principal. Never मूलधन में जोड़ना, which says the debt grows; that phrase is right only for a fee rolled into a new loan. |
| total cost | कुल लागत | |
| origination fee, closing costs | लोन शुल्क और कागज़ी खर्च | कागज़ी खर्च is what Indian writing calls closing costs; the two are one field in the tool, so they are one phrase. |
| discount points | डिस्काउंट पॉइंट्स | Latin `points` stays in the break-even row, which reports a count of months. |
| break-even | बराबरी का समय | Not a loanword: the row answers "after how long does this pay for itself", which बराबरी says and ब्रेक-ईवन does not to a general reader. |
| refinance | रीफ़ाइनेंस | |
| prepayment, extra principal | समय से पहले भुगतान | |
| lump sum | एकमुश्त राशि | |
| penalty | जुर्माना | |
| net worth | शुद्ध संपत्ति | Glossary. |
| assets, liabilities | संपत्तियाँ, देनदारियाँ | Glossary. The row toggle reads संपत्ति and देनदारी, which is what fits the switch. |
| functional currency | जिस मुद्रा में आप खर्च करते हैं | Spelled out rather than transliterated, and used as the field label the first time, because the whole risk feature turns on the difference between this currency and the others. A short form, मुख्य मुद्रा, is used in table headings where the phrase does not fit. In prose the short form is खर्च की मुद्रा; मुख्य मुद्रा is kept for the badge alone, because मुख्य can read as "the currency I hold most of", which is exactly the distinction the tool draws. |
| currency concentration | पैसे का किसी एक मुद्रा में जमाव | Spelled out: एकाग्रता is a chemistry word. Prose and the table caption say जमाव; the chart itself (its heading, aria label, legend and the feature list naming it) keeps मुद्रा मिश्रण. |
| exchange rate | विनिमय दर | The privacy notice's rendering, reused. |
| ECB reference rates | ECB की संदर्भ दरें | `ECB` stays Latin. |
| low, moderate, elevated | कम, मध्यम, ज़्यादा | The band labels. ज़्यादा rather than उच्च, which reads as a grade. |
| share link, share | शेयर लिंक, शेयर करें | |
| net debt (a currency position) | शुद्ध देनदारी | Pairs with देनदारी on the row toggle, so not शुद्ध कर्ज़. |
| subsequent rate | बाद की दर | The field label; not अगली दर. |
| cent-precise | मुद्रा की सबसे छोटी इकाई तक सटीक | Not पैसे तक, which reads as "to the money". |
| stress-test guess | दर बढ़ने की स्थिति का अनुमान | |
| about (an approximate figure) | लगभग | One word across the tools. |
| fixed and one-off charges | तय और एकबारगी शुल्क | |
| loan comparison (before a noun) | लोन तुलना | लोन तुलना कैलकुलेटर. The standalone nav label stays लोन की तुलना, which cannot stand before a noun. |
| horizon (the loan tool's tab) | हॉराइज़न | Glossed हॉराइज़न (किस महीने तक का हिसाब) on first use in the FAQ. Not अवधि, which the same tool uses for the term. |
| middle half (25th to 75th percentile) | बीच के आधे रास्ते | Never बीच का आधा: beside the median label बीच का it reads as half of the median. |
| everything runs in your browser | सारी गणना आपके ब्राउज़र में होती है | Not पूरा हिसाब, which is the full share mode's label. |
| redacted | रकम और नाम छिपाकर | The share mode that leaves the amounts and the names out; its other half is पूरा हिसाब, and the FAQ quotes both labels as the modal shows them. Decided against आँकड़ों के बिना, which was the first rendering: the redacted share still carries percentages, which are आँकड़े too, and the names go as well. Not गोपनीय, which promises a protected link, nor संशोधित, which reads as a revised version. |
| upload a CSV | CSV अपलोड करें | |
| simulation | सिम्युलेशन | |
| simulated path | सिम्युलेटेड रास्ता | The unit the simulator counts: one run of the plan through the years. |
| withdrawal | निकासी | Glossary: withdrawal rate is निकासी दर. |
| after inflation | महँगाई के बाद | The simulator's returns are real returns, so the phrase recurs on every result. |
| median | बीच का | Never औसत: the tool is careful that the middle of a spread is not an average, and the Hindi has to keep that. |
| portfolio mix | पोर्टफ़ोलियो का मिश्रण | The stock and bond split. |
| rebalanced yearly | हर साल पुनर्संतुलित | Glossary: rebalancing is पुनर्संतुलन. |
| run the simulation | सिम्युलेशन चलाएँ | |

#### The currency names

All 29 names live in one list, `src/i18n/strings/tools/currencies.ts`, because
the three tools share one dropdown and one engine table: a currency renamed
there is renamed in all three. A code stays Latin in every language, in the key
and in the bracket the name ends with, because it is what a reader looks up and
what the tool writes into its own address. Only the name is Hindi. A test in
`src/i18n/strings/catalog.test.ts` holds that list to `RAW_CURRENCIES` in
`src/utils/loan/math.ts`, so a currency added to the engine fails the build
rather than arriving as a bare code in a dropdown, and the English half is
asserted to be the engine's own label so the two cannot drift apart.

`Intl.DisplayNames` was tried and rejected. It returns `यूएस डॉलर`,
`ब्रिटिश पाउंड स्टर्लिंग` and `चेक गणराज्य कोरुना`, and the FAQ answers beside
the dropdown already say `अमेरिकी डॉलर` and `ब्रिटिश पाउंड`. Two spellings of one
currency on one screen read as two currencies, so every name here is written by
hand, from what the tools' own prose already calls it.

One name is written to avoid a misreading: the Czech koruna is `चेक गणराज्य
का कोरुना`, not `चेक कोरुना`, because on a finance site `चेक` alone reads as a
cheque. The other adjectives (हंगेरियन, मैक्सिकन, नॉर्वेजियन) keep the forms Hindi
news uses rather than being forced into -ई, and the Brazilian real stays
`ब्राज़ीली रियाल`, as settled below.

Two words the FAQ answers had split were settled with this list: `सिंगापुर
डॉलर`, not `सिंगापुरी`, which is how Indian dailies write it and what the Hindi
Wikipedia article is titled; and `लैटिन अमेरिकी`, not `लातिन`. Both had drifted
between `loanComparison.ts` and `multiCurrencyNetWorth.ts`, which is the kind of
split this list exists to stop.

Two more were settled against Hindi Wikipedia and RBI's Hindi publications, both
in the direction of the form a reader will actually type: `ब्राज़ीली रियाल` and
not `रियल`, which is the article's own title, and `थाई बाट` and not `बात`, which
is a different Hindi word entirely and reads as "Thai talk".

### Site vocabulary already in use

These are fixed by `src/i18n/strings/hi.ts` and appear in the chrome.

| English | Hindi |
| --- | --- |
| learning path | सीखने का रास्ता |
| lesson | पाठ |
| topic | विषय |
| level | स्तर |
| About (the nav and footer group) | हमारे बारे में | Distinct from its first link, nidhi के बारे में, so the menu does not say the same thing twice. |
| a level named in a template | {level} स्तर | A template writes the word स्तर after the name and keeps the verb शुरू away from it, because the first level is called शुरुआत. |
| the six level names | शुरुआत, निर्माण, मनोविज्ञान, निखार, निपुणता, सबके लिए वित्त. Building was बनाना, which reads as a verb (and as "banana"); Optimizing was अनुकूलन, which reads as adaptation. |
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
| Money, understood (brand tagline) | पैसा, समझ आ गया। | |

#### The brand tagline

"Money, understood" appears five times in `src/i18n/strings/hi.ts` as
`meta.defaultImageAlt`, `footer.tagline`, `home.schema.slogan`,
`home.meta.imageAlt` and `home.schema.site`, and it has to read identically in
all five. It got translated twice before this line existed (`पैसे की समझ` in the
footer, `पैसा, समझ के साथ` on the home page), which is the failure this entry
prevents.

`पैसा, समझ आ गया।` was chosen over the two obvious candidates for two reasons.
`पैसे की समझ` is a noun phrase with no beat to it: it names a topic where the
English makes a claim. `पैसा, समझा` keeps the two-beat shape and the participle
does agree with masculine `पैसा`, but a bare `समझा` stranded by a comma is read
first as a transitive clause with a dropped subject, "understood the money",
rather than as the appositive the English has. `समझ आ गया` is the idiom Hindi
actually uses for something clicking, and its perfective aspect says what the
English past participle says. It ends in a danda, unlike the English, which
drops its full stop: a Hindi line that ends on a finite verb reads as truncated
without one.

## Transliteration style

Sanskrit-origin terms that are everyday Hindi (ब्याज, बचत) are written in their
Hindi spelling. Recent loanwords from English keep their spoken form in
Devanagari (बजट, क्रेडिट, पोर्टफ़ोलियो) rather than a Sanskritised coinage,
because a reader who meets them in the newspaper meets them that way. Where a
word is an abbreviation or a product (EMI, FIRE, ETF, SIP), it stays in Latin
script.

Verbs addressed to the reader take the plain polite form, -ें or -एँ (देखें,
करें, चुनें, बताएँ), everywhere: never the more formal -िए or -इए (देखिए,
कीजिए, बताइए). The two had been mixed inside a single tool. A lesson is पाठ in
every string, never लेख. A sentence that a template ends after a catalog phrase
takes its full stop from the catalog's `fullStop` key, which is the danda in
Hindi, so no Hindi line ends in a Latin full stop.

Spelling follows one convention across every catalog: the chandrabindu in आँकड़े,
and the nukta in ख़त्म, क़रीब, फ़ैसला, तरीक़ा, ख़ास and क़ीमत. Two everyday words
stay without it, कानून and कदम, because that is how the chrome has always
written them. Write the nukta as the decomposed pair (letter plus ़), which is
what the catalogs already use, so a search for one spelling finds every use.
