# German glossary

**Working material, not a published edition.** There is no German edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions a German edition
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

### 1. How the site addresses the reader: *Sie*, *du*, or no form of address

The roadmap names this the first German decision. *Sie* is expected from banks and most financial sites; *du* is common in newer apps and reads friendlier, but can feel presumptuous to older readers. Interface strings often avoid both (*Betrag eingeben*).

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | *Sie* | *du* | No form of address |
| --- | --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | Ihr Nettovermögen ist das, was Sie besitzen, minus das, was Sie schulden. | Dein Nettovermögen ist das, was du besitzt, minus das, was du schuldest. | Nettovermögen ist das, was man besitzt, minus das, was man schuldet. |
| A tool instruction | Enter the amount you borrowed. | Geben Sie den Betrag ein, den Sie sich geliehen haben. | Gib den Betrag ein, den du dir geliehen hast. | Aufgenommenen Kreditbetrag eingeben. |
| An error message | The rate you entered must be between 0% and 100%. | Der Zinssatz, den Sie eingegeben haben, muss zwischen 0 % und 100 % liegen. | Der Zinssatz, den du eingegeben hast, muss zwischen 0 % und 100 % liegen. | Der Zinssatz muss zwischen 0 % und 100 % liegen. |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | Wenn Sie mit Zahlungen im Rückstand sind, sind Sie damit nicht allein, und es gibt Wege, Hilfe zu bekommen. | Wenn du mit Zahlungen im Rückstand bist, bist du damit nicht allein, und es gibt Wege, Hilfe zu bekommen. | Zahlungsrückstände betreffen viele Menschen, und es gibt Wege, Hilfe zu bekommen. |

The other editions split: Spanish uses the informal *tú*, while Hindi (आप),
Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a reference, not
a rule for this language.

**Status:** open. The volunteer advises; the owner decides after the council.
One person's view is not proof of what readers prefer, so a point the
volunteer is unsure about stays open.

### 2. Other open questions

- **Not giving the reader a gender:** neutral wording (*Lesende*, *wer liest*) rather than the gender star (*Leser\*innen*)? The other editions reword.
- **Long compounds:** *Vermögensaufstellung*, *Kreditvergleichsrechner* risk overflowing a 320 px screen in headings and buttons; shorter words or soft hyphens are settled with the first strings.
- **Germany, Austria and Switzerland:** Swiss German writes *ss* for *ß* and uses CHF; the draft follows Germany and notes differences.

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries; to be confirmed with the
register decision.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses, or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it, the cited evidence with its limits, where it breaks, what depends on the reader's situation. Describe common practice rather than instructing. Imperatives are fine for neutral actions (list your accounts, check your statement), not for allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the cited sources and the country-neutral "where to check locally" wording stay as the English has them. No local product or brand name is introduced where the English has none.
4. **Amounts are written the German way:** a period groups thousands and a comma marks decimals: `1.058.721,50 €`, `4,5 %`. This matches `Intl.NumberFormat('de')`. Swiss amounts in CHF group with an apostrophe (`de-CH`).
5. **Short forms on charts:** *Tsd.*, *Mio.*, *Mrd.* German *Billion* is a million millions, so an English `B` would be read a thousand times too large.
6. **Two plural forms**, and 0 takes the plural: *0 Kredite*, *1 Kredit*, *2 Kredite*.
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub, Instagram, people's names, and each language's own name.

## Vocabulary

The terms the review sheets ask about, in the order of the batches' groups.
Every row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | German (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | Nettovermögen | *Reinvermögen* |  | Draft |
| debt | Schulden |  | Usually plural in German. | Draft |
| loan | Kredit | *Darlehen* | *Darlehen* is the legal term and common for home loans. | Draft |
| assets | Vermögenswerte | *Vermögen* |  | Draft |
| liabilities | Verbindlichkeiten | *Schulden* | *Schulden* in plain prose. | Draft |
| income | Einkommen | *Einkünfte* | *Einkünfte* is the tax term. | Draft |
| savings | Ersparnisse | *Erspartes* | *Sparen* for the act. | Draft |
| expenses | Ausgaben |  |  | Draft |
| budget | Budget | *Haushaltsplan* |  | Draft |
| emergency fund | Notgroschen | *Notfallreserve* | *Notgroschen* is the everyday word; *Notfallreserve* in plainer, more formal prose. | Draft |
| mortgage | Immobilienkredit | *Baufinanzierung*, *Hypothek* | *Baufinanzierung* is the whole financing arrangement; *Hypothek* is strictly the security, though often used for the loan. | Draft |
| insurance | Versicherung |  | Premium: *Beitrag* or *Prämie*. | Draft |

### Borrowing (the loan comparison)

| English | German (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | Zinsen |  |  | Draft |
| interest rate | Zinssatz |  |  | Draft |
| fee, fees | Gebühr, Gebühren |  |  | Draft |
| principal | Darlehensbetrag | *Restschuld* | *Restschuld* for the outstanding principal. | Draft |
| refinance, refinancing | umschulden | *Umschuldung*, *Anschlussfinanzierung* | *Anschlussfinanzierung* where a fixed-rate period ends. | Draft |
| monthly payment | Monatsrate | *monatliche Rate* |  | Draft |
| prepayment | Sondertilgung | *vorzeitige Rückzahlung* | *Sondertilgung* for an extra payment; *vorzeitige Rückzahlung* for paying off early. | Draft |
| lender | Kreditgeber | *Darlehensgeber* | Not always a bank. | Draft |
| lump sum | Einmalzahlung | *Einmalbetrag* |  | Draft |
| exchange rate | Wechselkurs |  |  | Draft |
| currency | Währung |  |  | Draft |

### Growing money

| English | German (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | Geld anlegen | *investieren* | The act; *Geld anlegen* is the everyday phrase. | Draft |
| investment | Geldanlage | *Investition* | *Investition* is mostly business investment. | Draft |
| inflation | Inflation |  |  | Draft |
| return | Rendite |  |  | Draft |
| stock, shares | Aktien |  |  | Draft |
| bond | Anleihe |  |  | Draft |
| fund | Fonds |  |  | Draft |
| risk | Risiko |  |  | Draft |
| compound interest | Zinseszins |  |  | Draft |
| diversification | Diversifikation | *Streuung* | *Streuung* in plain prose. | Draft |
| portfolio | Portfolio | *Depot* | *Depot* is the account that holds it. | Draft |
| volatility | Volatilität | *Schwankung* | *Schwankung* in plain prose. | Draft |
| purchasing power | Kaufkraft |  |  | Draft |
| tax | Steuer | *Steuern* |  | Draft |

### Planning

| English | German (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | Median |  |  | Draft |
| scenario | Szenario |  |  | Draft |
| horizon | Anlagehorizont | *Laufzeit* | *Laufzeit* for a loan. | Draft |
| goal | Ziel | *Finanzziel* |  | Draft |
| retirement | Ruhestand | *Rente* | *Rente* is the pension itself. | Draft |
| financial independence | finanzielle Unabhängigkeit |  |  | Draft |

### The site

| English | German (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | Lektion |  |  | Draft |
| learning path | Lernpfad |  |  | Draft |
| free tools | kostenlose Tools | *kostenlose Rechner* |  | Draft |
| planner (the product) | Finanzplanungs-Tool |  | Descriptive. Where *planner* is used as the product's name, it stays in English. | Draft |
| waitlist | Warteliste |  |  | Draft |
| newsletter | Newsletter |  |  | Draft |
| consent | Einwilligung | *Zustimmung* | *Einwilligung* is the GDPR term. | Draft |
| privacy notice | Datenschutzhinweise | *Datenschutzerklärung* | *Datenschutzerklärung* is the usual name of the page on German sites. | Draft |
