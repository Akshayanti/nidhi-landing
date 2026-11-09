# Korean glossary

**Working material, not a published edition.** There is no Korean edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions a Korean edition
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

### 1. How the site addresses the reader: formal *합니다* or polite *해요* style

Korean rarely says "you" (*당신* can sound cold or confrontational); the choice is the speech level of the sentence endings. Formal *합니다체* is usual for banks and official notices; polite *해요체* is common in apps and reads warmer. Interface labels often end on a noun.

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | 합니다체 | 해요체 |
| --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | 순자산은 가진 것에서 갚아야 할 것을 뺀 금액입니다. | 순자산은 가진 것에서 갚아야 할 것을 뺀 금액이에요. |
| A tool instruction | Enter the amount you borrowed. | 빌린 금액을 입력하십시오. | 빌린 금액을 입력하세요. |
| An error message | The rate you entered must be between 0% and 100%. | 입력한 금리는 0%에서 100% 사이여야 합니다. | 입력한 금리는 0%에서 100% 사이여야 해요. |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | 상환이 밀려 있어도 혼자가 아닙니다. 도움을 받을 방법이 있습니다. | 상환이 밀려 있어도 혼자가 아니에요. 도움을 받을 방법이 있어요. |

Neither column uses *당신*.

The other editions split: Spanish uses the informal *tú*, while Hindi (आप),
Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a reference, not
a rule for this language.

**Status:** open. The volunteer advises; the owner decides after the council.
One person's view is not proof of what readers prefer, so a point the
volunteer is unsure about stays open.

### 2. Other open questions

- **Sino-Korean words or English loanwords:** *포트폴리오* or *자산 구성*, *리스크* or *위험*. Which reads more natural?
- **Charts:** large numbers group by ten thousand (*만*, *억*), so chart short forms follow that.
- **Fonts:** Hangul needs its own font, loaded only on Korean pages (roadmap).

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries; to be confirmed with the
register decision.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it, the cited evidence with its limits, where it breaks, what depends on the reader's situation. Describe common practice rather than instructing. Imperatives are fine for neutral actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the cited sources and the country-neutral "where to check locally" wording stay as the English has them. No local product or brand name is introduced where the English has none.
4. **Amounts:** won have no decimals: `₩1,058,721` from `Intl.NumberFormat('ko')`, or `1,058,721원` in prose; which the site's copy uses is settled with the first strings. Euro amounts in the English stay in euros with their decimals (rule 3). Percentages: `4.5%`.
5. **Short forms on charts:** *만* (ten thousand), *억* (a hundred million), *조*. An English `M` or `B` would be misread.
6. **No plural forms.** A counter follows the number (*대출 2건*).
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub, Instagram, people's names, and each language's own name.

## Vocabulary

The terms the review sheets ask about, in the order of the batches' groups.
Every row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | Korean (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | 순자산 |  |  | Draft |
| debt | 빚 | *부채* | *부채* is more formal. | Draft |
| loan | 대출 |  |  | Draft |
| assets | 자산 |  |  | Draft |
| liabilities | 부채 |  |  | Draft |
| income | 소득 | *수입* |  | Draft |
| savings | 저축 | *저축액* | *저축액* for the amount saved. | Draft |
| expenses | 지출 |  |  | Draft |
| budget | 예산 |  |  | Draft |
| emergency fund | 비상금 | *비상 자금* |  | Draft |
| mortgage | 주택담보대출 | *부동산 담보대출* | *부동산 담보대출* where the English means any property. | Draft |
| insurance | 보험 |  | Premium: *보험료*. | Draft |

### Borrowing (the loan comparison)

| English | Korean (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | 이자 |  |  | Draft |
| interest rate | 금리 | *이자율* |  | Draft |
| fee, fees | 수수료 |  |  | Draft |
| principal | 원금 |  |  | Draft |
| refinance, refinancing | 대환대출 | *재융자* | *대환* is the everyday Korean term. | Draft |
| monthly payment | 월 상환액 | *월 납입액* |  | Draft |
| prepayment | 중도상환 | *조기 상환* |  | Draft |
| lender | 돈을 빌려주는 사람이나 기관 | *대출 기관* | *대출 기관* only where the English means an institution. | Draft |
| lump sum | 일시금 | *일시불* | *일시불* for a payment. | Draft |
| exchange rate | 환율 |  |  | Draft |
| currency | 통화 | *화폐* |  | Draft |

### Growing money

| English | Korean (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | 투자 |  | The act and the topic are the same word. | Draft |
| investment | 투자 | *투자 상품* | *투자 상품* for the thing invested in. | Draft |
| inflation | 인플레이션 | *물가 상승* |  | Draft |
| return | 수익률 | *수익* |  | Draft |
| stock, shares | 주식 |  |  | Draft |
| bond | 채권 |  |  | Draft |
| fund | 펀드 |  |  | Draft |
| risk | 위험 | *리스크* |  | Draft |
| compound interest | 복리 |  |  | Draft |
| diversification | 분산 투자 | *분산* |  | Draft |
| portfolio | 포트폴리오 |  |  | Draft |
| volatility | 변동성 |  |  | Draft |
| purchasing power | 구매력 |  |  | Draft |
| tax | 세금 |  |  | Draft |

### Planning

| English | Korean (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | 중앙값 |  |  | Draft |
| scenario | 시나리오 |  |  | Draft |
| horizon | 투자 기간 |  | *상환 기간* for a loan. | Draft |
| goal | 목표 |  |  | Draft |
| retirement | 은퇴 | *노후* | *노후* for life after retirement. | Draft |
| financial independence | 경제적 자립 | *경제적 자유* | Defined on first use: enough assets or investment income that paid work becomes optional; *경제적 자립* alone also means supporting oneself through work. *경제적 자유* is familiar but broader and can sound promotional. | Draft |

### The site

| English | Korean (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | 학습 글 | *레슨* | The lessons are written articles; *강의* suggests a lecture. | Draft |
| learning path | 학습 경로 |  |  | Draft |
| free tools | 무료 도구 |  |  | Draft |
| planner (the product) | 재무 계획 도구 |  | Descriptive. Where *planner* is used as the product's name, it stays in English. | Draft |
| waitlist | 대기자 명단 |  |  | Draft |
| newsletter | 뉴스레터 |  |  | Draft |
| consent | 동의 |  |  | Draft |
| privacy notice | 개인정보 안내 | *개인정보 처리방침* | *처리방침* is the legal name of the document in Korea. | Draft |
