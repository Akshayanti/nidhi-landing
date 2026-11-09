# Japanese glossary

**Working material, not a published edition.** There is no Japanese edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions a Japanese edition
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

### 1. How the site addresses the reader: polite *desu/masu* or plain style

Japanese rarely says "you"; the question is the politeness of the sentence endings. Polite *です・ます* is usual on consumer sites; the plain *だ・である* style reads as a textbook or an article. Interface labels often end on a noun (*借入額を入力*). *あなた* is best avoided: it can sound distant or pointed.

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | です・ます | だ・である |
| --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | 純資産とは、保有する資産の総額から負債の総額を差し引いた金額です。 | 純資産とは、保有する資産の総額から負債の総額を差し引いた金額である。 |
| A tool instruction | Enter the amount you borrowed. | 借りた金額を入力してください。 | 借入額を入力。 |
| An error message | The rate you entered must be between 0% and 100%. | 金利は0%から100%の間で入力してください。 | 金利は0%から100%の間で入力する。 |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | 返済が遅れていても、一人ではありません。助けを得る方法があります。 | 返済が遅れていても、一人ではない。助けを得る方法がある。 |

Neither column uses *あなた*.

The other editions split: Spanish uses the informal *tú*, while Hindi (आप),
Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a reference, not
a rule for this language.

**Status:** open. The volunteer advises; the owner decides after the council.
One person's view is not proof of what readers prefer, so a point the
volunteer is unsure about stays open.

### 2. Other open questions

- **Kanji terms or katakana loanwords:** *リターン* or *利回り*, *ボラティリティ* or *変動性*. Which reads more natural to a general reader?
- **Charts:** large numbers group by ten thousand (*万*, *億*), so chart short forms follow that, not thousands.
- **Line breaking and fonts:** Japanese breaks lines without spaces, and the font is loaded only on Japanese pages (roadmap).

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries; to be confirmed with the
register decision.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it, the cited evidence with its limits, where it breaks, what depends on the reader's situation. Describe common practice rather than instructing. Imperatives are fine for neutral actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the cited sources and the country-neutral "where to check locally" wording stay as the English has them. No local product or brand name is introduced where the English has none.
4. **Amounts:** yen have no decimals: `￥1,058,721` from `Intl.NumberFormat('ja')`, or `1,058,721円` in prose; which the site's copy uses is settled with the first strings. Euro amounts in the English stay in euros with their decimals (rule 3). Percentages: `4.5%`.
5. **Short forms on charts:** *万* (ten thousand), *億* (a hundred million), *兆*. An English `M` or `B` would be misread.
6. **No plural forms.** A counter follows the number (*ローン2件*).
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub, Instagram, people's names, and each language's own name.

## Vocabulary

The terms the review sheets ask about, in the order of the batches' groups.
Every row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | Japanese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | 純資産 |  |  | Draft |
| debt | 借金 | *負債* | *負債* is more formal and used with *資産*. | Draft |
| loan | ローン | *借入れ* |  | Draft |
| assets | 資産 |  |  | Draft |
| liabilities | 負債 |  |  | Draft |
| income | 収入 | *所得* | *所得* is income after deductions, the tax term. | Draft |
| savings | 貯金 | *貯蓄* | *貯蓄* is broader and more formal. | Draft |
| expenses | 支出 | *出費* |  | Draft |
| budget | 予算 |  |  | Draft |
| emergency fund | 生活防衛資金 | *緊急資金* | The common term in Japanese personal finance. | Draft |
| mortgage | 住宅ローン | *不動産担保ローン* | *不動産担保ローン* where the English means any property. | Draft |
| insurance | 保険 |  | Premium: *保険料*. | Draft |

### Borrowing (the loan comparison)

| English | Japanese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | 利息 | *金利* | *利息* for the amount; *金利* for the rate. | Draft |
| interest rate | 金利 | *利率* |  | Draft |
| fee, fees | 手数料 |  |  | Draft |
| principal | 元金 | *元本* | *元本* for investments. | Draft |
| refinance, refinancing | 借り換え |  |  | Draft |
| monthly payment | 毎月の返済額 | *月々の返済額* |  | Draft |
| prepayment | 繰り上げ返済 |  |  | Draft |
| lender | 貸し手 | *金融機関* | Not always an institution. | Draft |
| lump sum | 一括 | *一括払い*, *一時金* | *一時金* for an amount received. | Draft |
| exchange rate | 為替レート |  |  | Draft |
| currency | 通貨 |  |  | Draft |

### Growing money

| English | Japanese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | 投資 |  | The act and the topic are the same word. | Draft |
| investment | 投資 | *投資先* | *投資先* for the thing invested in. | Draft |
| inflation | インフレ | *インフレーション* |  | Draft |
| return | リターン | *利回り*, *収益率* |  | Draft |
| stock, shares | 株式 | *株* |  | Draft |
| bond | 債券 |  |  | Draft |
| fund | ファンド | *投資信託* | *投資信託* where the English means a mutual fund. | Draft |
| risk | リスク |  |  | Draft |
| compound interest | 複利 |  |  | Draft |
| diversification | 分散投資 | *分散* |  | Draft |
| portfolio | ポートフォリオ |  |  | Draft |
| volatility | 価格変動 | *ボラティリティ* | The loanword is common in finance writing. | Draft |
| purchasing power | 購買力 |  |  | Draft |
| tax | 税金 | *税* |  | Draft |

### Planning

| English | Japanese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | 中央値 |  |  | Draft |
| scenario | シナリオ |  |  | Draft |
| horizon | 投資期間 | *運用期間* | *返済期間* for a loan. | Draft |
| goal | 目標 |  |  | Draft |
| retirement | リタイア | *老後*, *退職* | Stopping work and living mainly on savings or a pension (*仕事を辞め、主に貯蓄や年金で暮らすこと*). *退職* can mean leaving one job; *老後* is life after retirement. | Draft |
| financial independence | 経済的自立 |  | Defined on first use: enough assets or investment income that paid work becomes optional. Without it, *経済的自立* also means supporting oneself through work. | Draft |

### The site

| English | Japanese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | レッスン | *講座* |  | Draft |
| learning path | 学習コース | *学習パス* |  | Draft |
| free tools | 無料ツール |  |  | Draft |
| planner (the product) | 資産計画ツール |  | Descriptive. Where *planner* is used as the product's name, it stays in English. | Draft |
| waitlist | 順番待ちリスト | *ウェイティングリスト* |  | Draft |
| newsletter | ニュースレター |  |  | Draft |
| consent | 同意 |  |  | Draft |
| privacy notice | プライバシーに関するお知らせ | *プライバシーポリシー* | *ポリシー* only where the English says "policy". | Draft |
