# Indonesian glossary

**Working material, not a published edition.** There is no Indonesian edition
of the site, no date for one, and gathering this material does not change the
order editions are built (`locale-roadmap.md`, "Gathering material ahead of an
edition"). This file collects the terms and decisions an Indonesian edition
would need, so the work a volunteer puts in is kept and not repeated.

- **Source:** the English catalogs at commit `3a5363b` (main, November 9, 2026).
- **Last checked against the English:** November 9, 2026.
- **Status of every term below:** an AI draft, not yet reviewed by a native
  speaker or decided by the owner. A term becomes **Agreed** only after the
  volunteer's review, the council and the owner's decision, and the Status
  column says so. Until then nothing here is a decision.

The structure follows the other glossaries (`es-glossary.md`, `cs-glossary.md`):
rules that apply to every string, then proposed renderings for recurring
terms, all drafts until their Status says Agreed. Like them, it governs the site's own words; lessons are written once, in
English, and are not translated.

Volunteer identities and raw discussion are never recorded here, only the
outcome and, where it helps, the reason.

## Open questions

These are settled first, because every string depends on them.

### 1. How the site addresses the reader: *kamu*, *Anda*, or no pronoun

The English says "you" throughout. Indonesian has to choose. *Anda* is the
standard polite form, used by banks, government and most formal writing.
*Kamu* is warmer and common in consumer apps and social media, but can read as
too casual, or as talking down, to some older readers. Many sentences can
also leave the pronoun out.

The question for the volunteer is a **default and any exceptions by context**,
not one switch for everything. The four examples below are written for this
question; they are not site strings yet.

| Context | English | *Anda* | *kamu* | No pronoun |
| --- | --- | --- | --- | --- |
| An explanation | Your net worth is what you own minus what you owe. | Kekayaan bersih Anda adalah total nilai aset Anda dikurangi total utang Anda. | Kekayaan bersihmu adalah total nilai asetmu dikurangi total utangmu. | Kekayaan bersih adalah total nilai aset dikurangi total utang. |
| A tool instruction | Enter the amount you borrowed. | Masukkan jumlah yang Anda pinjam. | Masukkan jumlah yang kamu pinjam. | Masukkan jumlah pinjaman. |
| An error message | The rate you entered must be between 0% and 100%. | Suku bunga yang Anda masukkan harus berada di antara 0% dan 100%. | Suku bunga yang kamu masukkan harus berada di antara 0% dan 100%. | Suku bunga yang dimasukkan harus berada di antara 0% dan 100%. |
| A sensitive money topic | If you are behind on payments, you are not alone, and there are ways to get help. | Jika Anda terlambat membayar, Anda tidak sendirian, dan ada cara untuk mendapatkan bantuan. | Jika kamu terlambat membayar, kamu tidak sendirian, dan ada cara untuk mendapatkan bantuan. | Terlambat membayar bukan hal yang harus dihadapi sendirian, dan ada cara untuk mendapatkan bantuan. (A reworded sentence, since the English has no pronoun-free form.) |

Who the site is for and how it speaks are in [`../brand-identity.md`](../brand-identity.md): the same page has to work for someone in their first job and for a retired reader who would send it to their family. Things to weigh: warmth against respect; whether one form reads well across
ages and regions; consistency, since a page that switches forms reads as
careless; and whether leaving the pronoun out sounds natural or stiff in each
context. The other editions split: Spanish uses the informal *tú*, while Hindi
(आप), Czech (*vy*) and Marathi (तुम्ही) use the polite form. That is a
reference, not a rule for Indonesian.

**Decided: *kamu*** (owner, 2026-11-10, on the volunteer's advice). The
warmth the site's tone asks for (`../brand-identity.md`) comes through *kamu*;
the respect an older reader expects is carried by sentence style: complete,
polite sentences, no slang, nothing that talks down.

### 2. Other open questions

- **Headings and buttons:** sentence case (*Cara memulai*), as the other
  editions use, or the title case common in Indonesian headings (*Cara
  Memulai*)?
- **English loanwords:** finance writing in Indonesian often keeps English
  words (*refinancing*, *rebalancing*, *return*, *budget*). Where both exist,
  which reads more natural to a general reader: the Indonesian word or the
  loanword?
- **Formats to settle before any tool strings:** how typed decimals are read
  (a comma, as Indonesian writes them, or a period too), rounding of amounts
  in rupiah, and the date format.

## Rules that apply to every string

Drafted from `CLAUDE.md` and the other glossaries.

**The reader is *kamu*** (owner's decision, 2026-11-10). Possessives agree
(*asetmu* or *aset kamu*; the volunteer says which reads more natural where).
Never *Anda* for the reader, and never a mix on one page.

1. **No em dashes and no double dashes.** Use a colon, a comma, parentheses,
   or reword.
2. **Teach, do not prescribe.** The order is: the concept, why people use it,
   the cited evidence with its limits, where it breaks, what depends on the
   reader's situation. Describe common practice ("titik awal yang umum
   adalah...", "banyak orang memulai dengan...") rather than instructing
   ("mulailah dengan...", "kamu harus..."). Imperatives are fine for neutral
   actions (the examples follow the register question: catat pengeluaran,
   periksa mutasi rekening), not for
   allocation, product, debt or tax decisions.
3. **Translate, do not localise.** Euro amounts, US and EU data caveats, the
   cited sources and the country-neutral "where to check locally" wording stay
   as the English has them. No Indonesian product or brand name (BPJS, KPR,
   the name of a particular fund) is introduced where the English has none.
4. **Amounts are written the Indonesian way:** a period groups thousands and a
   comma marks decimals: `Rp 1.058.721`, `4,5%`. The percent sign follows the
   number without a space. This matches `Intl.NumberFormat('id')` with the
   currency style for IDR and `minimumFractionDigits: 0`,
   `maximumFractionDigits: 0` (without them IDR gets two decimals; `Rp` is
   followed by a no-break space), and the percent style. Formal Indonesian spelling (EYD) attaches `Rp` to the number
   (`Rp1.058.721`); which of the two the site's own copy uses is settled with
   the first strings, and the tools use the `Intl` form.
5. **Short forms on charts:** Indonesian writes *rb* (*ribu*, thousand), *jt*
   (*juta*, million), *M* (*miliar*, a thousand million) and *T* (*triliun*),
   lower case for *rb* and *jt*, with a space after the number (`1 jt`,
   `2,5 M`), as in Unicode CLDR.
   An English `M` meaning million would be read as a thousand times too large,
   so the charts need Indonesian short forms before an edition.
6. **No grammatical number inflection.** A counted noun stays as it is:
   *1 pinjaman*, *3 pinjaman*. Indonesian can mark plurality by reduplication
   (*pinjaman-pinjaman*), but not after a number.
7. **Placeholders stay exactly as written**: `{amount}`, `{count}`, `{name}`.
8. **Names stay as they are**: nidhi, PostHog, Google Workspace, GitHub,
   Instagram, people's names, and each language's own name.

## Vocabulary

Ordered within each group by how often the English copy uses the term. Every
row is an AI draft until its Status says Agreed.

### Money and the balance sheet

| English | Indonesian (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| net worth | kekayaan bersih | nilai kekayaan bersih | The net worth calculator's main term; used about 80 times. | Draft |
| debt | utang | | Standard spelling per KBBI is *utang*, not *hutang*. | Draft |
| loan | pinjaman | kredit | *Kredit* is the bank product name; *pinjaman* is the plain word. | Draft |
| assets | aset | harta | *Harta* in plain-language lists (what you own). | Draft |
| liabilities | liabilitas | | Explained as *kewajiban keuangan* where needed. *Utang* only where the English actually means debts. | Draft |
| income | penghasilan | pendapatan | Both are standard. *Penghasilan* is natural for personal earnings; *pendapatan* also covers personal or household income and business revenue. | Draft |
| savings | tabungan | | *Menabung* for the act of saving. | Draft |
| expenses | pengeluaran | biaya | | Draft |
| budget | anggaran | budget | | Draft |
| emergency fund | dana darurat | | | Draft |
| mortgage | pinjaman rumah | kredit rumah | A loan secured against the home. Where the English means any property, *pinjaman dengan agunan properti*. Not *KPR*, which names an Indonesian product (rule 3). | Draft |
| insurance | asuransi | | Premium: *premi*. | Draft |

### Borrowing (the loan comparison)

| English | Indonesian (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| interest | bunga | | | Draft |
| interest rate | suku bunga | tingkat bunga | | Draft |
| fee, fees | biaya | | | Draft |
| principal | pokok pinjaman | pokok | | Draft |
| refinance, refinancing | pembiayaan ulang | refinancing | See open question 2 on loanwords. | Draft |
| monthly payment | cicilan bulanan | angsuran bulanan | *Cicilan* is the everyday word; *angsuran* is more formal. | Draft |
| prepayment | pembayaran lebih awal | | The umbrella term. A partial prepayment is *pelunasan sebagian lebih awal*; paying off the whole loan early is *pelunasan dipercepat*. Not *pembayaran di muka*, which means an advance payment. | Draft |
| lender | pemberi pinjaman | | Not *lembaga keuangan*: a lender is not always a financial institution. | Draft |
| lump sum | pembayaran sekaligus | jumlah sekaligus, dana sekaligus | *Pembayaran sekaligus* for a payment; *jumlah* or *dana sekaligus* for an amount received, held or invested. | Draft |
| exchange rate | nilai tukar | kurs | *Kurs* is common in everyday speech. | Draft |
| currency | mata uang | | | Draft |

### Growing money

| English | Indonesian (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| investing | berinvestasi | | The act. | Draft |
| investment | investasi | | The thing invested in, or investing as a topic. | Draft |
| inflation | inflasi | | | Draft |
| return | imbal hasil | return | | Draft |
| stock, shares | saham | | | Draft |
| bond | obligasi | | | Draft |
| fund | dana | reksa dana | *Dana* in general (as in *dana darurat*); *reksa dana* only where the English means a mutual fund. Other investment funds are decided by context. | Draft |
| risk | risiko | | Standard spelling per KBBI is *risiko*, not *resiko*. | Draft |
| compound interest | bunga majemuk | | | Draft |
| diversification | diversifikasi | | | Draft |
| portfolio | portofolio | | | Draft |
| volatility | volatilitas | | | Draft |
| purchasing power | daya beli | | | Draft |
| tax | pajak | | | Draft |

### Planning

| English | Indonesian (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| median | median | | Explained once as *nilai di posisi tengah setelah data diurutkan* (with an even count, the average of the two middle values). *Nilai tengah* alone can be read as the midpoint between the extremes. | Draft |
| scenario | skenario | | | Draft |
| horizon | horizon investasi | jangka waktu investasi | Plain *jangka waktu* is any period, not an investment horizon. | Draft |
| goal | tujuan | target | *Tujuan keuangan* for a financial goal. | Draft |
| retirement | pensiun | masa pensiun | | Draft |
| financial independence | kemandirian finansial | kebebasan finansial | *Kemandirian* fits the defined concept; *kebebasan finansial* is familiar but broader and can sound promotional. | Draft |

### The site

| English | Indonesian (draft) | Alternatives | Notes | Status |
| --- | --- | --- | --- | --- |
| lesson | pelajaran | materi | | Draft |
| learning path | jalur belajar | | | Draft |
| free tools | alat gratis | | | Draft |
| planner (the product) | alat perencanaan keuangan | | Descriptive; bare *perencana* can read as a person. A shorter product label is settled in context. | Draft |
| waitlist | daftar tunggu | | | Draft |
| newsletter | buletin | newsletter | | Draft |
| consent | persetujuan | | | Draft |
| privacy notice | pemberitahuan privasi | kebijakan privasi | *Kebijakan privasi* only where the English says "policy". | Draft |
