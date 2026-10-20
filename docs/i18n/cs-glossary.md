# Czech glossary

One approved Czech rendering per recurring term, so the chrome, the learning
path and the tools keep agreeing. Change a term here first, then everywhere it
appears. The chrome's and the path's copy lives in `src/i18n/strings/cs.ts`, the
path's shared vocabulary in `learn.ts`, and the tools' copy in
`src/i18n/strings/tools/`.

The lessons are not translated: they are written once, in English, and every
language lists those same lessons and links to them at their one address. This
glossary governs the Czech the site itself writes.

Status: written before the first Czech strings and agreed by Claude, Codex
and DeepSeek after one review round. A native speaker reviews the Czech
edition before it is merged; their changes are recorded here. Terms are added as the site's own Czech copy needs them, and a
term already listed is not re-decided per page.

## Rules that apply to every string

1. **No em dashes, no en dashes as punctuation, no double dashes.** Czech uses
   the *pomlčka* (`–`) for asides and ranges; on this site it is out, as is a
   doubled hyphen. Use a colon, a comma, parentheses, or reword. Ranges are
   written with *až*: `2 až 4 roky`, `1990 až 2024`.
2. **Teach, do not prescribe.** The order is: the concept, why people use it,
   the cited evidence with its limits, where it breaks, what depends on the
   reader's situation. Describe common practice (*běžným výchozím bodem
   je...*, *mnoho lidí začíná...*) rather than instructing (*začněte...*,
   *měli byste...*). Imperatives are fine for neutral actions (*sepište si
   účty*, *zkontrolujte výpis*), not for allocation, product, debt or tax
   decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the
   cited sources and the country-neutral "where to check locally" wording stay
   as the English has them. No Czech products (stavební spoření, DIP,
   penzijní spoření) are introduced where the English has none. The one
   deliberate exception is the home page's worked example, which is in Czech
   koruna at Czech scale (see `EXAMPLES.CZK`), as the Hindi edition's is in
   rupees.
4. **Vykání, with lowercase *vy*.** The reader is addressed in the polite
   plural: *vaše peníze*, *můžete*, *zadejte*. *Vy*, *váš* are lowercase,
   the usual style on Czech websites; the capital *Vy* belongs mainly to
   formal correspondence. Possessives and imperatives agree (*vyberte*, not
   *vyber*).
5. **Do not mark the reader's gender.** Czech past participles and many
   adjectives agree with the reader (*byl jste* / *byla jste*). Reword so the
   reader is not given a gender: write *pokud už máte účet* or *pokud máte
   účet založený*; never a participle such as *založil* or *založila* about
   the reader; *kdo začíná*, not *začátečník*. No slash forms (*založil/a*).
6. **Amounts are written the Czech way:** `10 000 Kč`, `1 500 €`,
   `250 000 US$`, with a no-break space (U+00A0) as the thousands separator
   and before the symbol, and the symbol after the number. Dollars in prose
   are `US$` (or the code, `USD`), since `$` alone is ambiguous. Decimals take
   a comma: `4,5 %`, `0,25 %`. A percentage takes a no-break space before the
   sign (`5 %`); written together (`5%`) it is an adjective
   (*pětiprocentní*). Whole amounts are what `formatProseAmount(..., 'cs')`
   produces (whole units, `cs` grouping), so a catalog figure and a computed
   one beside it agree; the tests check each currency rather than trusting
   `Intl` defaults. The tools write their amounts the same way on a Czech
   page, in every currency (see `TOOL_AMOUNT_LOCALE`). A lesson's figures are
   never touched.
7. **Short forms on charts:** `tis.` (thousand), `mil.` (million), `mld.`
   (thousand million): `150 tis. Kč`, `1,5 mil. Kč`, `2,3 mld. Kč`. Never
   `K`, `M` or `B`, and never *bilion* for a thousand million: Czech *bilion*
   is a million millions.
8. **Plurals have three forms for whole numbers:** 1 (*1 lekce*, *1 rok*),
   2 to 4 (*2 lekce*, *3 roky*), 0 and 5 or more (*5 lekcí*, *5 let*). Every
   plural key has a `One`, a `Few` and a `Many` form (`one`, `few`, `other`
   in the tools), and the code picks one with `Intl.PluralRules('cs')`, whose
   categories are `one` (1), `few` (2 to 4), `other` (0, 5 and more) and
   `many` (decimals, *1,5 roku*). No plural placeholder on the site carries a
   decimal; the helper falls back to the `Many`/`other` form for `many`, and
   a test fails if a decimal count is passed. Copy never puts a decimal
   before a counted noun.
9. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
   Keep the same set of placeholders in every string; their order may change.
   A placeholder that stands for a number decides the case of the noun after
   it, so check each string with 0, 1, 3 and 5.
10. **Quotation marks**: Czech copy quotes with `„...“` (low, then high) for
    every quoted word, label, button name, title or phrase (*klikněte na
    „Kopírovat odkaz“*). A quote inside a quote takes `‚...‘`. Straight
    `"..."` is never used as a quotation mark in a Czech value; quotes that
    belong to code or an HTML attribute inside a string are left alone.
11. **Capitalisation**: sentence case for headings and buttons (*Jak začít*,
    not *Jak Začít*). Month and day names, languages and nationalities as
    adjectives are lower case (*říjen*, *čeština*, *anglické lekce*).
12. **Dates** are `19. 10. 2026` or `19. října 2026`, as `Intl` writes them
    for `cs-CZ`.
13. **Brand and product names stay as they are, undeclined**: nidhi (*v
    nidhi*, *o nidhi*, never *nidhiho*), PostHog, Google Workspace, GitHub,
    Instagram, and each language's own name in `LOCALE_META`. Where a
    sentence needs a case the name cannot show, add a noun: *na webu nidhi*,
    *ve službě PostHog*. **People's names** (Alex, Sam) are written so they
    stand in the nominative (*Alex vlastní...*, *Sam dluží...*): declining
    them (*Alexovi*, *Samovi*) would give them a gender the English leaves
    open, and leaving them undeclined in an oblique case reads wrong.
14. **One-letter prepositions** (*v*, *k*, *s*, *z*, *o*, *u*) and the
    conjunctions *a*, *i* never end a line: every Czech value joins them to
    the next word with a no-break space (U+00A0), which is invisible in the
    source. A catalog test fails on a plain space after one, so a new string
    that types an ordinary space is caught.

## Vocabulary

### Money and the balance sheet

| English | Czech | Notes |
| --- | --- | --- |
| net worth | čisté jmění | Not *čistá hodnota* (a calque) and not *majetek* alone, which is only what you own. |
| assets | aktiva | *Co vlastníte* in plain-language lists (what you own, owe, earn). |
| what you owe | co dlužíte | |
| liabilities | závazky | *Dluhy* where the sentence is plain-language. Not *pasiva*, an accounting term. |
| debt | dluh | |
| loan | úvěr | *Půjčka* in plain prose where *úvěr* reads stiff. The tool is *srovnání úvěrů*. |
| mortgage | hypotéka | |
| principal | jistina | *Zbývající jistina* for the outstanding principal. |
| interest | úrok, úroky | *Úrok* for the concept; *úroky* for amounts paid (*zaplacené úroky*). |
| interest rate | úroková sazba | *Sazba* alone where the sentence is already about interest. |
| income | příjem, příjmy | |
| expenses | výdaje | |
| savings | úspory | *Spoření* for the act; *míra úspor* for the savings rate. |
| budget | rozpočet | |
| emergency fund | finanční rezerva | The everyday Czech term. Not *nouzový fond*. |
| cash flow | peněžní tok | |
| net pay | čistá mzda | |
| credit card | kreditní karta | |
| real estate | nemovitosti | The topic name. |
| car | auto | |

### Growing money

| English | Czech | Notes |
| --- | --- | --- |
| investing, investment | investování, investice | |
| return | výnos | *Zhodnocení* where *výnos* repeats awkwardly. Not *návratnost*. |
| real return | reálný výnos | |
| compound interest | složené úročení | |
| compounding | složené úročení | *Efekt složeného úročení* only in explanatory prose. |
| inflation | inflace | |
| purchasing power | kupní síla | |
| risk | riziko | |
| volatility | volatilita | *Kolísání* in plain prose. |
| diversification | diverzifikace | *Rozložení rizika* in plain prose. |
| asset allocation | alokace aktiv | *Rozložení mezi akcie a dluhopisy* in plain prose. |
| rebalancing | rebalancování | |
| portfolio | portfolio | |
| index fund | indexový fond | |
| mutual fund | podílový fond | |
| share, stock | akcie | Same form in singular and plural. |
| equities | akcie | |
| bond | dluhopis | |
| fixed income | investice s pevným výnosem | *Dluhopisy* only where the English means bonds. |
| expense ratio | celková nákladovost fondu (TER) | A percentage of what you hold, said so on first use. |
| fees | poplatky | |
| tax | daň, daně | |
| tax-advantaged account | daňově zvýhodněný účet | |
| asset classes | třídy aktiv | |
| leverage | finanční páka | |
| currency risk | měnové riziko | Always. |
| exposure | expozice | *Vysoká expozice*, *čistá expozice*. |
| concentration | koncentrace | A currency's share of net worth. |
| hedging | zajištění | *Měnové zajištění*. |
| broker | broker | |
| spread (FX) | kurzové rozpětí | The bank's or broker's exchange-rate spread. |
| margin (over an index rate) | marže | On a variable-rate loan. |
| asset location | rozložení investic mezi účty | Which assets are held in which kind of account, said so on first use. |
| glide path | postupné snižování rizika portfolia | *(glide path)* in brackets on first use. |
| standard deviation | směrodatná odchylka | |
| inflation-adjusted, real | očištěný o inflaci | *V dnešních penězích* for amounts. |
| mix (stocks/bonds) | poměr | *Poměr akcií a dluhopisů*. |
| monthly contribution | měsíční vklad | |
| withdrawal (a single one) | výběr | *Roční výběr*. |
| intergenerational wealth | mezigenerační bohatství | |

### Planning and behaviour

| English | Czech | Notes |
| --- | --- | --- |
| financial independence | finanční nezávislost | |
| FIRE | FIRE | The English acronym, kept and glossed on first use: *finanční nezávislost a předčasný odchod do důchodu*. |
| retirement | důchod, odchod do důchodu | |
| withdrawal rate | míra čerpání (portfolia) | Glossed on first use: *kolik procent portfolia ročně vyberete*. |
| safe withdrawal rate | takzvaná bezpečná míra čerpání | *Takzvaná* on first use, so "safe" does not read as a guarantee. |
| the 4% rule | pravidlo 4 % | |
| horizon | investiční horizont | *Doba splatnosti* where the sentence is about a loan. |
| goal | cíl | |
| credit score | úvěrové skóre | *Skóre úvěruschopnosti* on first use. |
| insurance | pojištění | |
| premium | pojistné | |
| deductible | spoluúčast | |
| liquidity | likvidita | |
| risk tolerance | tolerance k riziku | |
| tax residency | daňová rezidence | |
| opportunity cost | náklady obětované příležitosti | |
| rule of thumb | orientační pravidlo | Not *zlaté pravidlo*, which overstates it. |
| sunk cost | utopené náklady | |
| loss aversion | averze ke ztrátě | |
| bias | zkreslení | *Kognitivní zkreslení*; present bias is *upřednostňování přítomnosti*. |
| behavioural finance | behaviorální finance | |
| mental accounting | mentální účetnictví | |
| overconfidence | přehnaná sebedůvěra | |
| anchoring | ukotvení | |
| herd behaviour | stádní chování | |
| default (assumption, setting) | výchozí hodnota, výchozí předpoklad | Never *default* beside debt, where it means a missed payment (*nesplácení*). |
| financial fragility | finanční zranitelnost | |
| estate planning | plánování pozůstalosti | |
| means-tested benefits | dávky závislé na příjmu a majetku | |
| no prerequisite | bez předchozích znalostí | *Nejsou potřeba předchozí lekce* where the English is about lessons. |
| qualified professional | kvalifikovaný odborník | Always. |
| licensed (financial adviser) | s příslušným oprávněním | *Finanční poradce s příslušným oprávněním*, unless the English names one jurisdiction's licence. |
| money scripts | finanční přesvědčení (money scripts) | English kept in brackets on first use. |
| framing | rámování | *Rámování a ukotvení*. |
| blended families | rodiny s dětmi z předchozích vztahů | |
| gig work | příležitostná práce na zakázku | Platforms only where the English names them. |
| person of colour | člověk jiné barvy pleti než bílé | For the native-speaker review to confirm, with the About page sentence around it. |
| queer | queer | Used as is in Czech writing. |
| neurodivergent | neurodivergentní | |
| colour blind | mít poruchu barvocitu | A condition the person has, not an adjective for them. |

### The site

| English | Czech | Notes |
| --- | --- | --- |
| lesson | lekce | 1 lekce, 2 lekce, 5 lekcí. |
| learning path | vzdělávací cesta | |
| level | úroveň | |
| Discovery | Objevování | Level names. |
| Building | Budování | |
| Psychology | Psychologie | |
| Optimizing | Optimalizace | |
| Mastery | Mistrovství | |
| Inclusive Finances | Inkluzivní finance | Never *inkluzivní* alone. |
| topic (tag) | téma | |
| guide (Inclusive Finances) | průvodce | 1 průvodce, 2 průvodci, 5 průvodců. |
| free tools | nástroje zdarma | |
| net worth calculator | kalkulačka čistého jmění | |
| loan comparison | srovnání úvěrů | |
| Monte Carlo simulator | simulátor Monte Carlo | |
| inflation calculator | inflační kalkulačka | |
| waitlist | čekací listina | |
| newsletter | newsletter | |
| share link | odkaz ke sdílení | |
| beliefs (page) | čemu věříme | |
| editorial policy | redakční zásady | |
| personal finance | osobní finance | |
| financial literacy | finanční gramotnost | |
| further reading | k dalšímu čtení | |
| planner (the product) | plánovač | *Plánovač nidhi*. |
| Learn, Take stock, Plan ahead (step names) | Učte se, Udělejte si přehled, Plánujte dopředu | Imperatives as labels, as in English. |
| Learn (nav, footer, breadcrumb) | Lekce | The same word in the menu, the footer and the breadcrumb. A deliberate exception to one-term-one-rendering: the nav names the section, the step name above is an imperative. |
| Home | Domů | |
| About (group) / About nidhi (page) | O nás / O nidhi | |
| Browse topics | Procházet témata | |
| breadcrumb (landmark label) | Drobečková navigace | |
| FAQ | Časté dotazy | |
| paywall | placený přístup | |
| illustrative amounts | ukázkové částky | |
| dashboard | přehled | |

### The privacy notice

| English | Czech | Notes |
| --- | --- | --- |
| privacy notice | zásady ochrany soukromí | |
| analytics | webová analytika | *Analytické údaje* where the text means the data collected. |
| processor | zpracovatel | The GDPR's Czech term. |
| consent | souhlas | |
| retention | doba uchování | |
| material (change) | podstatná změna | The badge on a changelog entry. |
| changelog | přehled změn | |
| Earlier changes | Starší změny | |
| anonymous | anonymní | |
| localStorage | localStorage | Latin, like the key names. |
| cookie banner | cookie lišta | |
| GDPR | GDPR | The usual Czech name; *obecné nařízení o ochraně osobních údajů* on first use. |
| timestamp | datum a čas | |
| double opt-in | dvojí potvrzení | |
| single opt-in | přihlášení bez potvrzení (single opt-in) | Says there is no confirmation step. |
| unsubscribe | odhlásit odběr | |
| waitlist signups | registrace na čekací listinu | |
| Cookie settings | Nastavení cookies | The footer link, quoted with the same words in the notice. |
| bookmark (a page) | přidat do záložek | |

#### The English governs, and the changelog is never translated

The Czech privacy notice says that the English notice is the governing
version, and the changelog stays in English in every edition (see `CLAUDE.md`).

### The free tools

| English | Czech | Notes |
| --- | --- | --- |
| monthly payment | měsíční splátka | |
| loan amount | výše úvěru | |
| annual interest rate | roční úroková sazba | |
| term (months) | doba splatnosti (měsíce) | |
| amortisation schedule | splátkový kalendář | |
| balance (of a loan) | zbývající jistina | |
| balance (of a portfolio) | hodnota portfolia | Not *zůstatek*, which reads as money owed or on account. |
| lender | poskytovatel úvěru | Not *věřitel* in labels; fine in prose. |
| recast | přepočet splátky | Where the tool defines it: on the remaining principal, keeping the rate and the end date. |
| apply to principal | snížit jistinu | |
| total cost | celkové náklady | |
| origination fee, closing costs | poplatek za sjednání úvěru a náklady na jeho uzavření | |
| discount points | body na snížení sazby (discount points) | Glossed on first use: *platba předem za nižší sazbu*. |
| break-even | doba návratnosti | The months until refinancing pays for itself. |
| refinance | refinancovat | |
| prepayment | mimořádná splátka | |
| prepayment penalty | poplatek za předčasné splacení | |
| exchange rate | směnný kurz | |
| spending currency (home currency) | měna vašich výdajů | The currency your bills are priced in. Not *referenční měna* (a benchmark) and not *domácí měna*, which may not be where you live. |
| percentile | percentil | |
| median | medián | |
| APR | APR (roční procentní sazba) | Folds the fee into one yearly rate, US-style; glossed once as not identical to the Czech and EU RPSN. Never labelled RPSN. |
| APRC (EU) | RPSN | Its name in Czech law (*roční procentní sazba nákladů*). |
| ECB | ECB | *Sazby ECB*. |
| business day | pracovní den | |
| row (of the net worth table) | položka | *{count} položek*; *řádek* where the sentence is about the table itself. |
| donut chart | prstencový graf | |
| fan chart | vějířový graf | |
| Full / Redacted (share options) | Úplná verze / Verze se skrytými údaji | Not *anonymní*, which promises more than hiding amounts and names. |
| Cautious / Historical / Optimistic | opatrný / historický / optimistický | The return settings; the adjectives agree with the label's head noun (*odhad výnosu*: opatrný; *nastavení*: opatrné). |
| lump sums | jednorázové mimořádné splátky | |
| months to payoff | měsíce do splacení | |
| advertised (headline) rate | nabízená sazba | |
| present value | současná hodnota | |
| percentage points | p. b. | In tight labels; spelled out (*procentní body*) in prose. |
| refinancing scenario | scénář refinancování | |
| n/a | není k dispozici | *Nevztahuje se* where the value does not apply; *neuvedeno* only where it was not entered. |
| input prompt (Enter...) | Zadejte... | *Zadejte částku*. |
| Add (button) | Přidat | *Přidat poskytovatele*, *+ Přidat aktivum*. |
| simulation, path | simulace, trajektorie | *Simulovaný průběh* in plain prose. |
| raise (in pay) | zvýšení platu | |
| real rate | reálná sazba | |
| geometric average | geometrický průměr | |
| percentage point | procentní bod | |
| scenario, forecast | scénář, prognóza | |
| basket (CPI) | spotřební koš | The Czech Statistical Office's own term. |
| hyperinflation | hyperinflace | |
| about (an approximate amount) | zhruba | *Zhruba 7 440 €*; *více než* and *méně než* for the capped forms. |
| euro area | eurozóna | |
