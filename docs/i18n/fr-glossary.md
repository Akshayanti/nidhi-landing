# French glossary

**Working material, not a published edition.** There is no French edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions a French edition
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

### 1. How the site addresses the reader: *vous*, *tu*, or no pronoun

The English says "you" throughout. French has to choose. *Vous* is the expected form when a site or a bank addresses a stranger. *Tu* is common in consumer apps aimed at younger readers, but can read as overfamiliar. Many interface strings avoid the question with an infinitive (*Saisir le montant*) or an impersonal sentence.

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | *vous* | *tu* | No pronoun |
| --- | --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | Votre patrimoine net, c’est ce que vous possédez moins ce que vous devez. | Ton patrimoine net, c’est ce que tu possèdes moins ce que tu dois. | Le patrimoine net, c’est ce que l’on possède moins ce que l’on doit. |
| A tool instruction | Enter the amount you borrowed. | Saisissez le montant que vous avez emprunté. | Saisis le montant que tu as emprunté. | Saisir le montant emprunté. |
| An error message | The rate you entered must be between 0% and 100%. | Le taux que vous avez saisi doit être compris entre 0 % et 100 %. | Le taux que tu as saisi doit être compris entre 0 % et 100 %. | Le taux doit être compris entre 0 % et 100 %. |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | Si vous avez du retard dans vos remboursements, vous n’êtes pas la seule personne dans ce cas, et il existe des moyens d’obtenir de l’aide. | Si tu as du retard dans tes remboursements, tu n’es pas la seule personne dans ce cas, et il existe des moyens d’obtenir de l’aide. | Un retard de remboursement arrive à beaucoup de monde, et il existe des moyens d’obtenir de l’aide. |

The examples avoid *seul* or *seule*, which would give the reader a gender.

The other editions split: Spanish uses the informal *tú*, while Hindi (आप),
Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a reference, not
a rule for this language.

**Status:** open. The volunteer advises; the owner decides after the council.
One person's view is not proof of what readers prefer, so a point the
volunteer is unsure about stays open.

### 2. Other open questions

- **Which French:** readers in France, Belgium, Switzerland, Canada and West and Central Africa use different words for some money terms (*hypothèque* is the loan itself in Quebec, only the security in France). The draft follows France where they differ and notes the others; the volunteer says whether a neutral word exists.
- **Not giving the reader a gender:** inclusive spellings (*lecteur·rice*) or neutral rewording? The other editions reword.
- **English loanwords:** *newsletter*, *planning*, *budget* are common in French. Where a French word exists, which reads more natural?

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries; to be confirmed with the
register decision.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it, the cited evidence with its limits, where it breaks, what depends on the reader's situation. Describe common practice rather than instructing. Imperatives are fine for neutral actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the cited sources and the country-neutral "where to check locally" wording stay as the English has them. No local product or brand name is introduced where the English has none.
4. **Amounts are written the French way:** a narrow no-break space groups thousands and a comma marks decimals: `1 058 721,50 €`, `4,5 %`, as `Intl.NumberFormat('fr')` writes them. Punctuation is typography, not `Intl`: a no-break space before `:`, and a narrow no-break space before `;`, `?` and `!`.
5. **Short forms on charts:** *k* (thousand), *M* (million), *Md* (*milliard*, a thousand million). French *billion* is a million millions, so an English `B` would be read a thousand times too large.
6. **Plural categories** (Unicode CLDR): *one* for 0 and 1 (*0 prêt*, *1 prêt*), *many* for round millions and above (*1 million de prêts*), *other* for the rest (*2 prêts*). Every counted string handles all three; wording may coincide.
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub, Instagram, people's names, and each language's own name.

## Vocabulary

The terms the review sheets ask about, in the order of the batches' groups.
Every row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | French (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | patrimoine net | *valeur nette* | *Valeur nette* is common in Canadian French; this draft follows France. Not *patrimoine* alone, which can mean what you own before debts. | Draft |
| debt | dette | *dettes* | Plural where the English means debts in general. | Draft |
| loan | prêt | *crédit* | *Crédit* is common for bank products; *prêt* is the plain word. | Draft |
| assets | actifs | *ce que vous possédez* | The plain phrase in lists of what you own, owe and earn (wording follows the register decision). | Draft |
| liabilities | passifs | *dettes* | *Dettes* in plain prose. | Draft |
| income | revenus |  | Plural for personal income. | Draft |
| savings | épargne | *économies* | *Économies* for money put aside, in everyday speech. | Draft |
| expenses | dépenses |  |  | Draft |
| budget | budget |  |  | Draft |
| emergency fund | épargne de précaution | *fonds d’urgence* | The usual term in France; *fonds d’urgence* is understood, especially in Canada. | Draft |
| mortgage | prêt immobilier | *crédit immobilier*, *hypothèque* | *Hypothèque* is the security in France but the loan itself in Quebec. | Draft |
| insurance | assurance |  | Premium: *prime* or *cotisation*. | Draft |

### Borrowing (the loan comparison)

| English | French (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | intérêts | *intérêt* | Plural for amounts paid; singular for the concept. | Draft |
| interest rate | taux d’intérêt |  |  | Draft |
| fee, fees | frais |  | Always plural. | Draft |
| principal | capital | *capital restant dû* | *Capital restant dû* for the outstanding principal. | Draft |
| refinance, refinancing | refinancer | *refinancement* | Replacing the loan with a new one. *Renégocier* amends the existing loan; *rachat de crédit* is used for both a single loan and several (*regroupement de crédits*), so it is not the default. | Draft |
| monthly payment | mensualité |  |  | Draft |
| prepayment | remboursement anticipé |  | Partial or total; *remboursement anticipé partiel* where the English means part of the loan. | Draft |
| lender | prêteur | *organisme prêteur* | Not always an institution. | Draft |
| lump sum | versement unique | *somme forfaitaire* | *Versement* for a payment; *somme* for an amount received or held. | Draft |
| exchange rate | taux de change |  |  | Draft |
| currency | devise | *monnaie* | *Monnaie* where the English means your own currency. | Draft |

### Growing money

| English | French (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | investir |  | The act. | Draft |
| investment | investissement | *placement* | *Placement* is the everyday word for a financial investment. | Draft |
| inflation | inflation |  |  | Draft |
| return | rendement | *performance* |  | Draft |
| stock, shares | actions |  |  | Draft |
| bond | obligation |  |  | Draft |
| fund | fonds | *fonds de placement* | Same form in singular and plural. | Draft |
| risk | risque |  |  | Draft |
| compound interest | intérêts composés |  |  | Draft |
| diversification | diversification |  |  | Draft |
| portfolio | portefeuille |  |  | Draft |
| volatility | volatilité |  |  | Draft |
| purchasing power | pouvoir d’achat |  |  | Draft |
| tax | impôt | *taxe* | *Impôt* on income and gains; *taxe* on consumption. | Draft |

### Planning

| English | French (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | médiane |  |  | Draft |
| scenario | scénario |  |  | Draft |
| horizon | horizon de placement | *horizon d’investissement* | *Durée* where the sentence is about a loan. | Draft |
| goal | objectif |  |  | Draft |
| retirement | retraite |  |  | Draft |
| financial independence | indépendance financière |  |  | Draft |

### The site

| English | French (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | leçon | *cours* |  | Draft |
| learning path | parcours d’apprentissage |  |  | Draft |
| free tools | outils gratuits |  |  | Draft |
| planner (the product) | outil de planification financière |  | Descriptive. Where *planner* is used as the product's name, it stays in English. | Draft |
| waitlist | liste d’attente |  |  | Draft |
| newsletter | lettre d’information | *newsletter* | *Newsletter* is widely used in France. | Draft |
| consent | consentement |  |  | Draft |
| privacy notice | avis de confidentialité | *politique de confidentialité* | *Politique* only where the English says "policy". | Draft |
