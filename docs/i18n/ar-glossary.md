# Arabic glossary

**Working material, not a published edition.** There is no Arabic edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions an Arabic edition
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

### 1. How the site addresses the reader: singular, plural, or impersonal address

Arabic verbs and pronouns mark gender, so addressing "you" in the singular gives the reader a gender (the masculine form is the traditional default). The plural (*أنتم*) is used by some sites as a respectful general address but is also grammatically masculine. Passive and impersonal forms avoid the question, as the review sheets themselves do, at some cost in warmth.

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | المفرد | الجمع | صيغة غير شخصية |
| --- | --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | صافي ثروتك هو ما تملكه مطروحًا منه ما عليك من ديون. | صافي ثروتكم هو ما تملكونه مطروحًا منه ما عليكم من ديون. | صافي الثروة هو مجموع ما يُملك مطروحًا منه مجموع الديون. |
| A tool instruction | Enter the amount you borrowed. | أدخل المبلغ الذي اقترضته. | أدخلوا المبلغ الذي اقترضتموه. | يُرجى إدخال المبلغ المقترَض. |
| An error message | The rate you entered must be between 0% and 100%. | يجب أن يكون سعر الفائدة الذي أدخلته بين 0% و100%. | يجب أن يكون سعر الفائدة الذي أدخلتموه بين 0% و100%. | يجب أن يكون سعر الفائدة بين 0% و100%. |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | إذا كنت متأخرًا في السداد فلست وحدك، وهناك طرق للحصول على المساعدة. | إذا كنتم متأخرين في السداد فلستم وحدكم، وهناك طرق للحصول على المساعدة. | التأخر في السداد يحدث لكثيرين، وهناك طرق للحصول على المساعدة. |

The singular and plural columns are labelled demonstrations of the problem, not defaults the site could ship: the site does not give the reader a gender (`CLAUDE.md`). The impersonal column is the option that avoids it.

The other editions split: Spanish uses the informal *tú*, while Hindi (आप),
Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a reference, not
a rule for this language.

**Status:** open. The volunteer advises; the owner decides after the council.
One person's view is not proof of what readers prefer, so a point the
volunteer is unsure about stays open.

### 2. Other open questions

- **Digits:** Western digits (0 to 9) or Eastern Arabic digits (٠ to ٩)? Usage differs between the Maghreb and the Gulf and Levant.
- **Modern Standard Arabic:** the draft is MSA, read across the region; whether any term reads too formal is a question for the volunteer.
- **Interest and religion:** some readers avoid interest-bearing products; the site describes how they work and does not judge. Whether to mention Islamic finance terms (*مرابحة*) is a content decision for the owner, not a translation one.
- **Layout:** right-to-left layout is not built yet (roadmap: Arabic comes after it).

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries; to be confirmed with the
register decision.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it, the cited evidence with its limits, where it breaks, what depends on the reader's situation. Describe common practice rather than instructing. Imperatives are fine for neutral actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the cited sources and the country-neutral "where to check locally" wording stay as the English has them. No local product or brand name is introduced where the English has none.
4. **Amounts:** settled with the digits question. `Intl.NumberFormat('ar')` writes Eastern Arabic digits with Arabic separators; `ar-u-nu-latn` writes Western digits. The percent sign follows the number.
5. **Short forms on charts:** *ألف*, *مليون*, *مليار*; Latin `K`, `M` and `B` are not used.
6. **Six plural categories** (zero, one, two, few, many, other), the most of any language on the form: every variable-count message handles all six; wording may coincide.
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub, Instagram, people's names, and each language's own name.

## Vocabulary

The terms the review sheets ask about, in the order of the batches' groups.
Every row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | Arabic (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | صافي الثروة | *صافي القيمة* |  | Draft |
| debt | الدَّين | *الديون* |  | Draft |
| loan | القرض |  |  | Draft |
| assets | الأصول |  |  | Draft |
| liabilities | الالتزامات | *الخصوم* | *الخصوم* is the accounting term. | Draft |
| income | الدخل |  |  | Draft |
| savings | المدخرات |  | *الادخار* for the act. | Draft |
| expenses | النفقات | *المصروفات* |  | Draft |
| budget | الميزانية |  |  | Draft |
| emergency fund | صندوق الطوارئ | *مدخرات الطوارئ* |  | Draft |
| mortgage | القرض العقاري | *الرهن العقاري* | *الرهن* is the security. | Draft |
| insurance | التأمين |  | Premium: *قسط التأمين*. | Draft |

### Borrowing (the loan comparison)

| English | Arabic (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | الفائدة |  | Some readers avoid interest for religious reasons; the site describes, it does not judge. | Draft |
| interest rate | سعر الفائدة |  |  | Draft |
| fee, fees | الرسوم |  |  | Draft |
| principal | أصل القرض | *المبلغ الأصلي* |  | Draft |
| refinance, refinancing | إعادة التمويل |  |  | Draft |
| monthly payment | القسط الشهري |  |  | Draft |
| prepayment | السداد المبكر |  |  | Draft |
| lender | المُقرِض | *الجهة المُقرِضة* | Not always a bank. | Draft |
| lump sum | دفعة واحدة | *مبلغ مقطوع* |  | Draft |
| exchange rate | سعر الصرف |  |  | Draft |
| currency | العملة |  |  | Draft |

### Growing money

| English | Arabic (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | الاستثمار |  |  | Draft |
| investment | الاستثمار | *أداة استثمارية* | *أداة استثمارية* for the thing invested in. | Draft |
| inflation | التضخم |  |  | Draft |
| return | العائد |  |  | Draft |
| stock, shares | الأسهم |  |  | Draft |
| bond | السندات | *سند* |  | Draft |
| fund | صندوق استثماري | *صندوق* | *صندوق* alone in *صندوق الطوارئ*. | Draft |
| risk | المخاطر | *المخاطرة* |  | Draft |
| compound interest | الفائدة المركبة |  |  | Draft |
| diversification | التنويع |  |  | Draft |
| portfolio | المحفظة الاستثمارية | *المحفظة* |  | Draft |
| volatility | التقلب | *التذبذب* |  | Draft |
| purchasing power | القوة الشرائية |  |  | Draft |
| tax | الضريبة | *الضرائب* |  | Draft |

### Planning

| English | Arabic (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | الوسيط | *القيمة الوسطى* |  | Draft |
| scenario | سيناريو |  |  | Draft |
| horizon | الأفق الاستثماري | *المدة* | *مدة القرض* for a loan. | Draft |
| goal | الهدف |  |  | Draft |
| retirement | التقاعد |  |  | Draft |
| financial independence | الاستقلال المالي |  |  | Draft |

### The site

| English | Arabic (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | درس |  |  | Draft |
| learning path | مسار التعلّم |  |  | Draft |
| free tools | أدوات مجانية |  |  | Draft |
| planner (the product) | أداة التخطيط المالي |  | Descriptive. Where *planner* is used as the product's name, it stays in English. | Draft |
| waitlist | قائمة الانتظار |  |  | Draft |
| newsletter | النشرة البريدية |  |  | Draft |
| consent | الموافقة |  |  | Draft |
| privacy notice | إشعار الخصوصية | *سياسة الخصوصية* | *سياسة* only where the English says "policy". | Draft |
