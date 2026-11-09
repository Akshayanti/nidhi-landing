# Portuguese glossary

**Working material, not a published edition.** There is no Portuguese edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions a Portuguese edition
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

### 1. How the site addresses the reader: *você* or no pronoun

The roadmap chose Brazilian Portuguese. Brazilian sites and apps address the reader as *você*; the formal *o senhor* / *a senhora* gives the reader a gender and reads as distant in writing, and *tu* is regional. Many sentences can also leave the pronoun out.

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | *você* | No pronoun |
| --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | Seu patrimônio líquido é o que você tem menos o que você deve. | Patrimônio líquido é o que se tem menos o que se deve. |
| A tool instruction | Enter the amount you borrowed. | Digite o valor que você pegou emprestado. | Digite o valor do empréstimo. |
| An error message | The rate you entered must be between 0% and 100%. | A taxa que você digitou deve estar entre 0% e 100%. | A taxa deve estar entre 0% e 100%. |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | Se você está com pagamentos atrasados, você não está só, e existem formas de conseguir ajuda. | Atrasos nos pagamentos acontecem com muita gente, e existem formas de conseguir ajuda. |

The examples use *só*, which does not change with gender, not *sozinho* or *sozinha*.

The other editions split: Spanish uses the informal *tú*, while Hindi (आप),
Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a reference, not
a rule for this language.

**Status:** open. The volunteer advises; the owner decides after the council.
One person's view is not proof of what readers prefer, so a point the
volunteer is unsure about stays open.

### 2. Other open questions

- **Readers outside Brazil:** Angolan and Mozambican readers are expected too (the tools support AOA and MZN). Where Brazil and Portugal differ (*ações* everywhere, but *poupança* is also a Brazilian account type), the draft follows Brazil and notes it.
- **Not giving the reader a gender:** neutral rewording, as the other editions do, rather than *todes* or *x*.
- **English loanwords:** *newsletter*, *portfólio*, *app* are common. Which reads more natural?

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries; to be confirmed with the
register decision.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it, the cited evidence with its limits, where it breaks, what depends on the reader's situation. Describe common practice rather than instructing. Imperatives are fine for neutral actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the cited sources and the country-neutral "where to check locally" wording stay as the English has them. No local product or brand name is introduced where the English has none.
4. **Amounts are written the Brazilian way:** a period groups thousands and a comma marks decimals: `R$ 1.058.721,50`, `€ 1.058.721,50`, `4,5%`, as `Intl.NumberFormat('pt-BR')` writes them (with a no-break space after the symbol). Euro amounts in the English stay in euros (rule 3).
5. **Short forms on charts:** *mil*, *mi* (million), *bi* (*bilhão*, a thousand million in Brazil). In Portugal *bilião* is a million millions, a reason to keep the Brazilian forms explicit.
6. **Plural categories** (Unicode CLDR): *one* covers 0 and 1, *many* round millions, *other* the rest. In writing, zero usually takes the plural (*0 empréstimos*), so the *one* text is worded to read well for 0 too, or zero is phrased as *nenhum empréstimo*.
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub, Instagram, people's names, and each language's own name.

## Vocabulary

The terms the review sheets ask about, in the order of the batches' groups.
Every row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | Portuguese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | patrimônio líquido |  |  | Draft |
| debt | dívida | *dívidas* |  | Draft |
| loan | empréstimo | *financiamento* | *Financiamento* for a loan tied to a purchase (a home, a car). | Draft |
| assets | ativos | *bens* | *Bens* in plain-language lists. | Draft |
| liabilities | passivos | *dívidas* | *Dívidas* in plain prose. | Draft |
| income | renda | *rendimentos* |  | Draft |
| savings | economias | *poupança* | *Poupança* is also the name of a Brazilian savings account; use it only for the act of saving or where no confusion is possible. | Draft |
| expenses | despesas | *gastos* |  | Draft |
| budget | orçamento |  |  | Draft |
| emergency fund | reserva de emergência |  | The usual Brazilian term. | Draft |
| mortgage | financiamento imobiliário | *hipoteca* | *Hipoteca* is the security; Brazilians say *financiamento imobiliário* for the loan. | Draft |
| insurance | seguro |  | Premium: *prêmio*. | Draft |

### Borrowing (the loan comparison)

| English | Portuguese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | juros |  | Always plural in Brazilian usage. | Draft |
| interest rate | taxa de juros |  |  | Draft |
| fee, fees | tarifa | *encargos* | Not *taxa*, which would clash with *taxa de juros*. | Draft |
| principal | valor principal | *saldo devedor* | *Saldo devedor* for the outstanding amount. | Draft |
| refinance, refinancing | refinanciar | *refinanciamento* | Not *portabilidade*, a Brazilian product for moving a loan to another bank, where the English has none. | Draft |
| monthly payment | parcela mensal | *prestação* |  | Draft |
| prepayment | amortização antecipada | *quitação antecipada* | *Quitação* for paying off the whole loan. | Draft |
| lender | credor |  | Not always an institution, so not *instituição financeira*. | Draft |
| lump sum | pagamento único | *valor único* |  | Draft |
| exchange rate | taxa de câmbio | *câmbio* |  | Draft |
| currency | moeda |  |  | Draft |

### Growing money

| English | Portuguese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | investir |  | The act. | Draft |
| investment | investimento |  |  | Draft |
| inflation | inflação |  |  | Draft |
| return | rentabilidade | *retorno*, *rendimento* | *Rentabilidade* is the usual term in Brazilian finance. | Draft |
| stock, shares | ações |  |  | Draft |
| bond | título de dívida | *título de renda fixa* | Not *bônus*. *Título de renda fixa* is familiar but broader (it includes bank deposits). Government bonds are *títulos públicos*. | Draft |
| fund | fundo | *fundo de investimento* |  | Draft |
| risk | risco |  |  | Draft |
| compound interest | juros compostos |  |  | Draft |
| diversification | diversificação |  |  | Draft |
| portfolio | carteira | *portfólio* |  | Draft |
| volatility | volatilidade |  |  | Draft |
| purchasing power | poder de compra |  |  | Draft |
| tax | imposto | *tributo* |  | Draft |

### Planning

| English | Portuguese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | mediana |  |  | Draft |
| scenario | cenário |  |  | Draft |
| horizon | horizonte de investimento | *prazo* | *Prazo* for a loan's term. | Draft |
| goal | objetivo | *meta* |  | Draft |
| retirement | aposentadoria |  |  | Draft |
| financial independence | independência financeira |  |  | Draft |

### The site

| English | Portuguese (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | lição | *aula* |  | Draft |
| learning path | trilha de aprendizagem |  |  | Draft |
| free tools | ferramentas gratuitas |  |  | Draft |
| planner (the product) | ferramenta de planejamento financeiro |  | Descriptive. Where *planner* is used as the product's name, it stays in English. | Draft |
| waitlist | lista de espera |  |  | Draft |
| newsletter | newsletter | *boletim* |  | Draft |
| consent | consentimento |  |  | Draft |
| privacy notice | aviso de privacidade | *política de privacidade* | *Política* only where the English says "policy". | Draft |
