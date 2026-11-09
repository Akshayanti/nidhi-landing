# Vietnamese glossary

**Working material, not a published edition.** There is no Vietnamese edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions a Vietnamese edition
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

### 1. How the site addresses the reader: *bạn*, *quý vị*, or no pronoun

Vietnamese pronouns carry age and relationship. *Bạn* is the usual neutral choice for websites and apps; *quý vị* is respectful and formal, common in official notices, but can read as stiff. Many sentences can drop the pronoun.

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | *bạn* | *quý vị* | No pronoun |
| --- | --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | Tài sản ròng của bạn là những gì bạn sở hữu trừ đi những gì bạn nợ. | Tài sản ròng của quý vị là những gì quý vị sở hữu trừ đi những gì quý vị nợ. | Tài sản ròng là tổng tài sản sở hữu trừ đi tổng các khoản nợ. |
| A tool instruction | Enter the amount you borrowed. | Nhập số tiền bạn đã vay. | Xin quý vị nhập số tiền đã vay. | Nhập số tiền đã vay. |
| An error message | The rate you entered must be between 0% and 100%. | Lãi suất bạn nhập phải nằm trong khoảng từ 0% đến 100%. | Lãi suất quý vị nhập phải nằm trong khoảng từ 0% đến 100%. | Lãi suất phải nằm trong khoảng từ 0% đến 100%. |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | Nếu bạn đang chậm trả nợ, bạn không đơn độc, và có những cách để được giúp đỡ. | Nếu quý vị đang chậm trả nợ, quý vị không đơn độc, và có những cách để được giúp đỡ. | Chậm trả nợ là chuyện nhiều người gặp phải, và có những cách để được giúp đỡ. |

The other editions split: Spanish uses the informal *tú*, while Hindi (आप),
Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a reference, not
a rule for this language.

**Status:** open. The volunteer advises; the owner decides after the council.
One person's view is not proof of what readers prefer, so a point the
volunteer is unsure about stays open.

### 2. Other open questions

- **Sino-Vietnamese or everyday words:** *tài sản ròng* or a plainer phrase; which reads more natural to a general reader?
- **North and South:** some money words differ by region; the draft uses the forms most common in national media and notes others.
- **Before any tool strings:** the Vietnamese dong (VND) is not supported in the tools yet (roadmap), and the fonts need their Vietnamese ranges.

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries; to be confirmed with the
register decision.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it, the cited evidence with its limits, where it breaks, what depends on the reader's situation. Describe common practice rather than instructing. Imperatives are fine for neutral actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the cited sources and the country-neutral "where to check locally" wording stay as the English has them. No local product or brand name is introduced where the English has none.
4. **Amounts are written the Vietnamese way:** a period groups thousands and a comma marks decimals: `1.058.721 ₫`, `4,5%`. VND has no decimals. This matches `Intl.NumberFormat('vi')`.
5. **Short forms on charts:** *N* (*nghìn*), *Tr* (*triệu*), *T* (*tỷ*), as in Unicode CLDR. An English `B` would be misread.
6. **No plural forms.** A counted noun stays as it is: *1 khoản vay*, *3 khoản vay*.
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub, Instagram, people's names, and each language's own name.

## Vocabulary

The terms the review sheets ask about, in the order of the batches' groups.
Every row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | Vietnamese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | tài sản ròng |  |  | Draft |
| debt | nợ | *khoản nợ* |  | Draft |
| loan | khoản vay |  |  | Draft |
| assets | tài sản |  |  | Draft |
| liabilities | nợ phải trả | *các khoản nợ* |  | Draft |
| income | thu nhập |  |  | Draft |
| savings | tiền tiết kiệm |  | *Tiết kiệm* for the act. | Draft |
| expenses | chi tiêu | *chi phí* |  | Draft |
| budget | ngân sách |  |  | Draft |
| emergency fund | quỹ dự phòng khẩn cấp | *quỹ khẩn cấp* |  | Draft |
| mortgage | khoản vay thế chấp | *vay mua nhà* | *Vay mua nhà* where the English means a home loan. | Draft |
| insurance | bảo hiểm |  | Premium: *phí bảo hiểm*. | Draft |

### Borrowing (the loan comparison)

| English | Vietnamese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | tiền lãi | *lãi* |  | Draft |
| interest rate | lãi suất |  |  | Draft |
| fee, fees | phí |  |  | Draft |
| principal | tiền gốc | *nợ gốc* |  | Draft |
| refinance, refinancing | vay khoản mới để trả khoản vay cũ |  | Not *tái cấp vốn*, which is the central bank's lending to banks. *Đảo nợ* is heard in everyday speech but can suggest rolling over a debt one cannot pay, so it is not used unqualified. | Draft |
| monthly payment | khoản trả hằng tháng | *tiền trả góp hằng tháng* |  | Draft |
| prepayment | trả nợ trước hạn |  |  | Draft |
| lender | bên cho vay |  | Not always a bank. | Draft |
| lump sum | khoản trả một lần | *một khoản tiền* | *Một khoản tiền* for an amount paid or received together. | Draft |
| exchange rate | tỷ giá |  |  | Draft |
| currency | tiền tệ | *đồng tiền* |  | Draft |

### Growing money

| English | Vietnamese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | đầu tư |  |  | Draft |
| investment | khoản đầu tư |  |  | Draft |
| inflation | lạm phát |  |  | Draft |
| return | tỷ suất sinh lời | *lợi nhuận* | *Tỷ suất sinh lời* for a percentage (the tools' annual return); *lợi nhuận* for an amount. | Draft |
| stock, shares | cổ phiếu |  |  | Draft |
| bond | trái phiếu |  |  | Draft |
| fund | quỹ | *quỹ đầu tư* |  | Draft |
| risk | rủi ro |  |  | Draft |
| compound interest | lãi kép |  |  | Draft |
| diversification | đa dạng hóa |  |  | Draft |
| portfolio | danh mục đầu tư |  |  | Draft |
| volatility | mức biến động |  |  | Draft |
| purchasing power | sức mua |  |  | Draft |
| tax | thuế |  |  | Draft |

### Planning

| English | Vietnamese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | trung vị |  |  | Draft |
| scenario | kịch bản |  |  | Draft |
| horizon | thời gian đầu tư | *kỳ hạn* | *Kỳ hạn* for a loan. | Draft |
| goal | mục tiêu |  |  | Draft |
| retirement | nghỉ hưu |  |  | Draft |
| financial independence | độc lập tài chính |  |  | Draft |

### The site

| English | Vietnamese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | bài học |  |  | Draft |
| learning path | lộ trình học |  |  | Draft |
| free tools | công cụ miễn phí |  |  | Draft |
| planner (the product) | công cụ lập kế hoạch tài chính |  | Descriptive. Where *planner* is used as the product's name, it stays in English. | Draft |
| waitlist | danh sách chờ |  |  | Draft |
| newsletter | bản tin |  |  | Draft |
| consent | sự đồng ý |  |  | Draft |
| privacy notice | thông báo về quyền riêng tư | *chính sách quyền riêng tư* | *Chính sách* only where the English says "policy". | Draft |
