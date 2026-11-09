# Turkish glossary

**Working material, not a published edition.** There is no Turkish edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions a Turkish edition
would need, so a volunteer can start reviewing the day they agree, and the
work they put in is kept and not repeated.

- **Source:** the English catalogs at commit `e9c73dc` (November 10, 2026).
- **Last checked against the English:** November 10, 2026.
- **Status of every term below:** an AI draft, not yet reviewed by a native
  speaker or decided by the owner. A term becomes **Agreed** only after a
  volunteer's review, the council and the owner's decision, and the Status
  column says so. Until then nothing here is a decision.

The structure follows `id-glossary.md`: open questions, rules that apply to
every string, then proposed renderings for the terms the review sheets ask
about, all drafts until their Status says Agreed. It governs the site's own
words; lessons are written once, in English, and are not translated.

Volunteer identities and raw discussion are never recorded here, only the
outcome and, where it helps, the reason.

## Open questions

These are settled first, because every string depends on them.

### 1. How the site addresses the reader: *siz*, *sen*, or no pronoun

Turkish marks the reader in the verb, so the choice shows in almost every sentence. *Siz* is expected from banks and official sites; *sen* is common in apps and advertising aimed at younger readers, and can read as overfamiliar. Many interface strings use an impersonal form.

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | *siz* | *sen* | No pronoun |
| --- | --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | Net varlığınız, sahip olduklarınızdan borçlarınızın çıkarılmasıyla bulunur. | Net varlığın, sahip olduklarından borçlarının çıkarılmasıyla bulunur. | Net varlık, sahip olunanlardan borçların çıkarılmasıyla bulunur. |
| A tool instruction | Enter the amount you borrowed. | Borç aldığınız tutarı girin. | Borç aldığın tutarı gir. | Borç alınan tutar girilmelidir. |
| An error message | The rate you entered must be between 0% and 100%. | Girdiğiniz faiz oranı %0 ile %100 arasında olmalıdır. | Girdiğin faiz oranı %0 ile %100 arasında olmalı. | Faiz oranı %0 ile %100 arasında olmalıdır. |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | Ödemelerinizde gecikme varsa yalnız değilsiniz ve yardım almanın yolları var. | Ödemelerinde gecikme varsa yalnız değilsin ve yardım almanın yolları var. | Ödemelerde gecikme pek çok kişinin başına gelir ve yardım almanın yolları var. |

Turkish verbs do not mark gender, so none of the forms gives the reader one.

The other editions split: Spanish uses the informal *tú*, while Hindi (आप),
Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a reference, not
a rule for this language.

**Status:** open. The volunteer advises; the owner decides after the council.
One person's view is not proof of what readers prefer, so a point the
volunteer is unsure about stays open.

### 2. Other open questions

- **Loanwords or Turkish words:** *portföy* or *varlık sepeti*, *volatilite* or *oynaklık*. Which reads more natural?
- **Legal terms:** Turkish privacy law (KVKK) has its own terms (*aydınlatma metni*, *açık rıza*); the site's notice follows the English, so whether those terms fit is a question for the volunteer.
- **Capital letters:** uppercasing must follow Turkish rules (*i* to *İ*, *ı* to *I*), so any uppercase styling on Turkish pages is checked (roadmap).

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries; to be confirmed with the
register decision.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it, the cited evidence with its limits, where it breaks, what depends on the reader's situation. Describe common practice rather than instructing. Imperatives are fine for neutral actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the cited sources and the country-neutral "where to check locally" wording stay as the English has them. No local product or brand name is introduced where the English has none.
4. **Amounts are written the Turkish way:** a period groups thousands, a comma marks decimals, and the percent sign comes first: `₺1.058.721,50`, `%4,5`. This matches `Intl.NumberFormat('tr')`.
5. **Short forms on charts:** *B* (*bin*), *Mn* (*milyon*), *Mr* (*milyar*), as in Unicode CLDR. An English `B` meaning billion would be read as thousand.
6. **No plural after a number:** a counted noun stays singular (*1 kredi*, *3 kredi*). Software still has two CLDR categories, *one* and *other*; both are provided even when the wording is the same.
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub, Instagram, people's names, and each language's own name.

## Vocabulary

The terms the review sheets ask about, in the order of the batches' groups.
Every row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | Turkish (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | net varlık | *net servet* |  | Draft |
| debt | borç |  |  | Draft |
| loan | kredi | *borç* | *Kredi* is the usual word for a loan from a lender. | Draft |
| assets | varlıklar |  |  | Draft |
| liabilities | yükümlülükler | *borçlar* | *Borçlar* in plain prose. | Draft |
| income | gelir |  |  | Draft |
| savings | birikim | *tasarruf* | *Tasarruf* for the act of saving. | Draft |
| expenses | giderler | *harcamalar* |  | Draft |
| budget | bütçe |  |  | Draft |
| emergency fund | acil durum fonu | *acil durum birikimi* |  | Draft |
| mortgage | konut kredisi | *ipotekli kredi* | *İpotek* is the security; *ipotekli kredi* where the English means any property. | Draft |
| insurance | sigorta |  | Premium: *prim*. | Draft |

### Borrowing (the loan comparison)

| English | Turkish (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | faiz |  | Some readers avoid interest for religious reasons; the site describes, it does not judge. | Draft |
| interest rate | faiz oranı |  |  | Draft |
| fee, fees | masraf | *ücret* | *Dosya masrafı* for a loan setup fee. | Draft |
| principal | anapara |  |  | Draft |
| refinance, refinancing | yeniden finansman | *kredi yapılandırma* | *Yapılandırma* is restructuring, close but not the same. | Draft |
| monthly payment | aylık taksit | *aylık ödeme* |  | Draft |
| prepayment | erken ödeme | *erken kapama* | *Erken kapama* for paying off the whole loan. | Draft |
| lender | borç veren | *kredi veren* | Not always a bank. | Draft |
| lump sum | toplu ödeme | *toplu tutar* |  | Draft |
| exchange rate | döviz kuru | *kur* |  | Draft |
| currency | para birimi | *döviz* | *Döviz* is foreign currency. | Draft |

### Growing money

| English | Turkish (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | yatırım yapmak |  | The act. | Draft |
| investment | yatırım |  |  | Draft |
| inflation | enflasyon |  |  | Draft |
| return | getiri |  |  | Draft |
| stock, shares | hisse senedi | *hisse* |  | Draft |
| bond | tahvil |  |  | Draft |
| fund | fon | *yatırım fonu* |  | Draft |
| risk | risk |  |  | Draft |
| compound interest | bileşik faiz |  |  | Draft |
| diversification | çeşitlendirme |  |  | Draft |
| portfolio | portföy |  |  | Draft |
| volatility | oynaklık | *volatilite* |  | Draft |
| purchasing power | satın alma gücü |  |  | Draft |
| tax | vergi |  |  | Draft |

### Planning

| English | Turkish (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | medyan | *ortanca* |  | Draft |
| scenario | senaryo |  |  | Draft |
| horizon | yatırım süresi | *vade* | *Vade* for a loan. | Draft |
| goal | hedef |  |  | Draft |
| retirement | emeklilik |  |  | Draft |
| financial independence | finansal bağımsızlık |  |  | Draft |

### The site

| English | Turkish (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | ders |  |  | Draft |
| learning path | öğrenme yolu |  |  | Draft |
| free tools | ücretsiz araçlar |  |  | Draft |
| planner (the product) | finansal planlama aracı |  | Descriptive. Where *planner* is used as the product's name, it stays in English. | Draft |
| waitlist | bekleme listesi |  |  | Draft |
| newsletter | bülten | *e-bülten* |  | Draft |
| consent | onay | *rıza* | *Açık rıza* is the KVKK legal term. | Draft |
| privacy notice | gizlilik bildirimi | *aydınlatma metni*, *gizlilik politikası* | *Aydınlatma metni* is the KVKK legal term. | Draft |
