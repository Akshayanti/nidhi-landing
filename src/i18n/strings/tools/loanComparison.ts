/**
 * The loan comparison calculator's copy, in both languages.
 *
 * Two halves. `page` is what `src/components/pages/LoanComparisonPage.astro`
 * renders: the heading, the seven FAQ groups, and the related-reading cards.
 * `island` is what `src/components/LoanCompare.tsx` renders: the toolbar, up to
 * five vendor cards of eight fields each, the two charts, the three analysis
 * tabs and every word the tool puts on screen or reads out.
 *
 * What is not here. The `data-attr` labels, which analytics reads and the
 * privacy notice's changelog names; the lesson slugs, which have to match real
 * entries in `src/content/blog`; the FAQ group ids, which are anchors in the
 * page; the lump-sum example (`12:5000;36:3000`), which is what a reader types
 * in any language (the format's name, `island.card.lumpsHelp.format`, is copy);
 * the formula, which is notation; and the tool's `SHARED_STATE_GLOBAL`,
 * which the island, the head guard and the layout all have to agree on. All of
 * those live in the two components, and the two lists that pair them with copy
 * (the FAQ groups, the related cards) are the same length and the same order as
 * the ones here, indexed by this file.
 *
 * The currency names are not here either. The three tools' currency dropdowns
 * read their names from `./currencies.ts`, beside this file, so a currency
 * renamed once is renamed in all three; what arrives in `island.currencies` is
 * that list spread in, because a prop is how the island is handed its copy.
 * Currency codes stay Latin in every language, as does `APR`.
 *
 * `island` reaches the tool as a prop, one locale's slice and not the whole
 * catalog: `dict(locale)` reads a runtime-indexed table holding every language
 * and every tool, so nothing tree-shakes and the client chunk would carry all of
 * it to render one calculator.
 *
 * Two of the tool's sentences are not its own. The months it prints come from
 * `formatMonths` in the engine, and so do the messages it shows when a loan
 * cannot be priced; neither knows about languages. The first is reassembled
 * here (`island.months`), and the second is matched and replaced (`island.engine`).
 */
import { currenciesCs, currenciesEn, currenciesEs, currenciesHi, currenciesMr } from './currencies.ts';

export const loanComparisonEn = {
  meta: {
    title: 'Loan Comparison Calculator: Side-by-Side, Multi-Currency | nidhi',
    description:
      'Free loan comparison calculator. Compare two to five offers side by side: monthly payment, payoff time, total interest, APR, and total cost. Multi-currency.',
  },
  /**
   * Structured data. The schema.org enumerations, the price and its currency
   * are machine values and stay in the component; everything a search result
   * shows a reader is here.
   */
  schema: {
    name: 'nidhi Loan Comparison Calculator',
    alternateNames: [
      'nidhi Loan Comparator',
      'nidhi Loan Calculator',
      'nidhi Multi-Currency Loan Comparator',
      'nidhi Multi-Currency Loan Calculator',
      'nidhi Side-by-Side Loan Comparison',
    ],
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript. Modern browser.',
    featureList: [
      'Compare 2 to 5 loan offers side by side',
      'APR (Annual Percentage Rate) for each offer, folding fees into a single comparable rate',
      'Interest vs. principal split chart for each loan, showing where each payment goes across the life of the loan',
      'Multi-currency support across 38 currencies, including USD, EUR, GBP, CHF, JPY, INR, CNY, CAD, AUD, SGD',
      'Solve for monthly payment given a fixed term, or for payoff time given a fixed payment',
      'Model origination fees and extra monthly principal',
      'Advanced mode: hybrid (ARM) loans with payment recast at the transition, discount-points break-even, lump-sum prepayments, prepayment penalty modeling',
      'Horizon analysis ("if I sell at month N") showing principal repaid, interest paid, balance remaining, and total cash out per vendor',
      'Refinance scenario builder comparing "keep" vs. "refinance" with closing costs and break-even horizon',
      'Cent-precise integer amortization schedule',
      'Shareable URL for any comparison state, including all advanced fields',
    ],
  },
  page: {
    breadcrumb: {
      home: 'Home',
      this: 'Loan comparison calculator',
    },
    eyebrow: 'Free tools',
    /** Split around the `<span class="lc-wideOnly">`, which phones hide. */
    title: {
      lead: 'Loan comparison calculator',
      wide: ': compare loan offers side by side',
    },
    /** Three parts, for the same phone-only span. The spaces are the markup's. */
    lead: {
      before:
        'Plug in two to five lenders. See the monthly payment, payoff time, total amount paid, and APR; the one-number cost that folds the fee into the rate.',
      wide: 'Watch where each payment splits between interest and principal. Multi-currency support for USD, EUR, GBP, INR, JPY, and more.',
      after: 'Everything runs in your browser; nothing is sent to a server.',
    },
    faq: {
      heading: 'Frequently asked questions',
      /** Seven groups, in the order `FAQ_GROUP_IDS` names them. */
      groups: [
        {
          title: 'Getting started',
          items: [
            {
              q: 'How does this loan comparison calculator work?',
              a: 'Enter the loan amount, annual interest rate, and either the term in months or the monthly payment for each lender you want to compare. You can compare two to five loan offers side by side. The calculator builds a full amortization schedule for each loan and shows the monthly payment, total months to payoff, total interest, APR (which folds the fee into the rate), and total amount paid.',
            },
            {
              q: 'What kinds of loans can I compare?',
              a: 'Mortgages, auto loans, personal loans, and student loans on standard repayment plans. The calculator handles fixed-rate loans and hybrid (ARM-style) loans where an initial fixed rate is followed by a different rate. Interest-only periods and balloon payments are not modeled.',
            },
            {
              q: 'How many loans can I compare at once?',
              a: 'Two to five. The page starts with two side-by-side cards and an obvious "Add vendor" tile that lets you grow the comparison up to a maximum of five loan offers. Each card has a remove button so you can drop a vendor that no longer fits.',
            },
            {
              q: 'Can I compare loans with different terms or rates?',
              a: 'Yes. You can mix and match terms, rates, fees, and even monthly payments across all of the loans you compare. Each vendor card lets you choose whether to solve for monthly payment (fixed term) or for payoff time (fixed monthly payment).',
            },
            {
              q: 'Which fields are required?',
              a: 'Loan amount, annual interest rate, and either the term in months or the monthly payment (depending on which you want to solve for). These are marked with a red asterisk. Every other field on the card (origination fee, extra principal, points, lump sums, prepayment penalty, hybrid rate spec) is optional and you can leave it at its default.',
            },
            {
              q: 'Is my data sent anywhere?',
              a: 'No. Everything runs in your browser; no inputs are sent to any server. Nothing goes into the page address while you use the tool. When you copy a share link, your values go into the link after the # sign, a part of the address browsers never send to a server, and the page removes them from the address bar before analytics start.',
            },
          ],
        },
        {
          title: 'APR and fees',
          items: [
            {
              q: 'What is APR and how is it calculated here?',
              a: 'APR (Annual Percentage Rate) folds the upfront fee into the cost of borrowing as a single annualized rate, so two offers with different fees can be compared on one number. This calculator computes APR by treating the fee as an upfront deduction from the principal disbursed to the borrower, then solving for the monthly rate at which the present value of the contractual payment stream equals that net amount. APR is reported as a nominal annual rate (monthly rate × 12), which matches the convention on US loan disclosures and is directionally consistent with the EU APRC. When the fee is zero, APR equals the nominal rate.',
            },
            {
              q: 'Why is APR usually higher than the headline rate?',
              a: 'The headline rate prices only the cost of the principal itself. APR also prices in the fee, which the borrower pays but does not get to use, so the effective rate the borrower pays on the money they actually receive is higher. Two loans with identical headline rates can have very different APRs, and a loan with a lower headline rate can have a higher APR than one with a higher headline rate but no fee. For an in-depth treatment, see the post on understanding loan terms.',
            },
            {
              q: 'Does APR include the extra principal I plan to pay each month?',
              a: 'No. APR is a measure of the contractual cost the lender is charging, not of any voluntary actions you take. Extra principal payments are optional, and including them would understate the disclosed APR. The "Where each payment goes" chart and the APR row both use the contract schedule (without extra principal); the monthly payment, time-to-payoff, and total-paid figures all reflect the schedule that includes your extra payments.',
            },
            {
              q: 'Should I include mandatory insurance or bundled products in the fee?',
              a: 'If a lender requires you to buy a product alongside the loan (life insurance, an account, an investment product), the cost of that product is part of your real cost of borrowing. APR rules differ by jurisdiction on whether such products must be included in the official APR disclosure. To compare honestly, add the lifetime cost of any mandatory bundled product to the fee field. The APR shown will then reflect the all-in cost.',
            },
            {
              q: 'Does the calculator handle origination fees and closing costs?',
              a: 'Yes. Enter them in the "Origination / closing fee" field under "Costs and fees" on each vendor card. Fees are added to the total amount paid, so the side-by-side comparison reflects the true cost of the loan, and they are folded into the displayed APR.',
            },
          ],
        },
        {
          title: 'Prepayments, points, and penalties',
          items: [
            {
              q: 'Can I model paying extra principal each month?',
              a: 'Yes. Enter an amount under "Extra principal per month" in the Prepayments group on each vendor card. The calculator applies it directly to the principal each month, shortening the payoff timeline and reducing total interest.',
            },
            {
              q: 'How are lump-sum prepayments entered?',
              a: 'Use the format month:amount, separated by semicolons. For example, 12:5000;36:3000;60:10000 means a 5,000 prepayment in month 12, 3,000 in month 36, and 10,000 in month 60. Each lump is applied to principal AFTER the regular monthly payment for that month, so it does not earn interest the same month. The loan typically pays off earlier than the contractual term and the total interest drops accordingly.',
            },
            {
              q: 'How does the points break-even work?',
              a: 'Discount points are an upfront cost that buys a lower interest rate. Whether they pay off depends on how long you keep the loan. Enter the cost of points and the rate reduction they purchased, and the calculator builds a hypothetical "no points paid" baseline (same loan, fee minus points cost, rate plus reduction) and compares the two. The "Points break-even" row shows how many months of lower payments are needed to recoup the upfront cost. If the new monthly payment is not actually lower, the break-even is reported as "never".',
            },
            {
              q: 'How does the prepayment penalty work?',
              a: 'Some loans charge a penalty if you pay them off early. Enter the penalty as a percent of the remaining balance and the last month at which it applies. The penalty is charged only when the loan is fully paid off (via lumps, extra principal, or a refinance) on or before that month. Penalties are added to the total amount paid, so the side-by-side comparison reflects the true cost of an early payoff under penalty.',
            },
          ],
        },
        {
          title: 'Hybrid (ARM) loans',
          items: [
            {
              q: 'How does the calculator handle hybrid (5/1, 7/1, 10/1 ARM) loans?',
              a: 'Switch the rate type to Hybrid in the "Rate structure" group, then enter the initial fixed period (e.g. 60 months for a 5/1 ARM) and the rate that takes effect after the fixed window. The amortization schedule is built at the initial rate up to the transition month and then recast: the remaining balance is re-amortized over the remaining contractual months at the subsequent rate, so the loan still pays off in the original term. The displayed APR uses this as-disclosed schedule, which matches how lenders quote APR on real ARM products.',
            },
            {
              q: 'Why is the hybrid option disabled when I picked "Payoff months"?',
              a: 'Hybrid loans need a fixed contractual term so the calculator can recast the payment at the rate transition. When you solve for "Payoff months" you are not providing a contractual term (you are providing a fixed monthly payment instead), so the recast is undefined. Switch "Solve for" to "Monthly payment" to enable the hybrid radio.',
            },
          ],
        },
        {
          title: 'Analysis tabs',
          items: [
            {
              q: 'What does the "Where each payment goes" chart show?',
              a: 'It splits a representative monthly payment from each year of the loan into its interest and principal portions, stacked on a single bar. Every bar has the same total height (the same monthly payment), but the split shifts dramatically: in the early years almost all of the payment is interest, while in the final years almost all of it is principal. This is why prepayments in the first few years of a long loan are disproportionately powerful; every euro you knock off the principal early avoids interest for the entire remaining term.',
            },
            {
              q: 'What is the horizon analysis ("if I sell or refinance at...")?',
              a: 'Loans look very different at month 36 vs. month 360. The horizon tab asks: at the month you select, how much principal have you actually repaid, how much interest have you paid, what is the remaining balance, and what is the total cash you have spent so far (payments plus origination fees)? This is the right view if you expect to sell, move, or refinance well before the contractual end of the loan, because the vendor with the lowest total cost over 360 months may not be the lowest-cost one if you exit at month 60.',
            },
            {
              q: 'How does the refinance scenario builder work?',
              a: 'Pick which vendor to refinance, the month at which the refinance happens, the new rate, the new term, and any closing costs. The calculator compares the total cash spent under "keep the original loan to its end" against "make the original payments through the refinance month, then pay off the remaining balance with a new loan that runs to its own contractual end". It also reports a break-even horizon: how many months of lower monthly payments are needed before the closing costs of the refinance are recouped. If the new monthly is not lower, the break-even is "never".',
            },
          ],
        },
        {
          title: 'Sharing and accuracy',
          items: [
            {
              q: 'Are share links self-contained?',
              a: 'Yes. The share link encodes every input the recipient needs: every per-vendor field (rate type, hybrid schedule, points, lump sums, prepayment penalty), the currency, the active analysis tab, and the horizon and refinance scenario inputs. The recipient lands on the same view you were looking at with all of your inputs reproduced. The URL only contains values that differ from defaults, so a fresh comparison still produces a compact link.',
            },
            {
              q: 'How accurate are the calculations?',
              a: 'All amortization is computed in integer cents to avoid floating-point rounding error. The closed-form monthly-payment formula is rounded to the nearest cent, and the final payment in each schedule is reconciled so that the sum of principal payments matches the original loan amount exactly. APR is solved by bisection on the present-value equation against the same integer-cent schedule, to a precision well below any real lender disclosure.',
            },
          ],
        },
        {
          title: 'Multi-currency support',
          items: [
            {
              q: 'Which currencies are supported?',
              a: 'Thirty-eight currencies are supported, including the Euro (EUR), US Dollar (USD), British Pound (GBP), Swiss Franc (CHF), Japanese Yen (JPY), Indian Rupee (INR), Chinese Yuan (CNY), Canadian Dollar (CAD), Australian Dollar (AUD), Singapore Dollar (SGD), Bangladeshi Taka (BDT), Kenyan Shilling (KES), the West and Central African CFA francs (XOF, XAF), and the main Nordic, Central European, Latin American, South Asian, South-East Asian and African currencies. Each currency is displayed using its own locale conventions. For example, INR uses Indian-style lakh/crore grouping (1,23,45,678) and JPY uses no decimals.',
            },
            {
              q: 'What does "multi-currency" mean here?',
              a: 'It means the calculator formats inputs and outputs using the conventions of whichever currency you pick. The symbol, decimal places, and digit grouping all change with the locale. The math itself is identical: a fixed-rate amortising loan behaves the same whether you call the units dollars, rupees, or yen. All loans in a single comparison share one currency, because comparing nominal payments across different currencies (without a live FX rate) would be misleading.',
            },
          ],
        },
      ],
    },
    related: {
      heading: 'Before you sign anything',
      lead: 'Make a choice that still feels right in five years.',
      /** Three cards, in the order `RELATED_CANDIDATES` lists the slugs. */
      items: [
        {
          kicker: 'How to compare',
          title: 'Understanding loan terms',
          desc: 'APR, amortisation, fixed vs variable, prepayment penalties: the fine print that decides which offer has the lowest total cost.',
        },
        {
          kicker: 'Before you borrow',
          title: 'Emergency fund first',
          desc: 'If one bad month would force you to skip a payment, the loan is too big. Build a buffer before you take it on.',
        },
        {
          kicker: 'Mental model',
          title: 'Appreciation vs depreciation',
          desc: 'A house can gain value while you pay it off. A car usually loses it. The same monthly payment is not the same deal.',
        },
        {
          kicker: 'After you sign',
          title: 'How to get out of debt',
          desc: 'A practical method for paying down what you owe without burning out halfway through.',
        },
        {
          kicker: 'Fundamentals',
          title: 'What counts as a liability',
          desc: 'The difference between debt that builds something and debt that just drains the household.',
        },
      ],
      footerTag: 'Read more on debt and loans',
      footerAll: 'Or browse every article',
    },
  },
  island: {
    /** The 38 currency names, shared by the three tools: see `./currencies.ts`. */
    currencies: currenciesEn,
    /** The bar above the cards: currency, share and reset. */
    toolbar: {
      aria: 'Loan comparison actions',
      currencyLabel: 'Display currency',
      currencyHelp: 'All loans in this comparison use this format.',
      sample: 'Sample:',
      share: 'Copy shareable link',
      shareCopied: 'Link copied',
      shareTitle: 'Copy a link that includes all your loan details',
      reset: 'Reset to defaults',
      resetTitle: 'Clear all data and start fresh',
      copiedBar: 'Link copied to clipboard',
      shareUrlAria: 'Shareable link URL',
      shareStatus: 'Shareable link copied to clipboard.',
      /** The fallback prompt when the clipboard is unavailable. */
      copyPrompt: 'Copy this link:',
    },
    /**
     * Phones show one card at a time behind these buttons. The labels are
     * slot letters only ("A", "Vendor A"), so nothing typed can reach
     * click capture through a button's text.
     */
    phoneTabs: {
      groupAria: 'Vendor to show',
      tabName: 'Vendor {label}',
      add: 'Add',
      addAria: 'Add another vendor to compare ({n} of {max})',
      addCard: 'Add vendor',
      addCardHint: 'Compare up to {max}',
    },
    card: {
      badge: 'Vendor {label}',
      removeAria: 'Remove vendor {label} from comparison',
      removeTitle: 'Remove from comparison',
      name: 'Vendor name',
      principal: 'Loan amount',
      rate: 'Annual interest rate (%)',
      solveFor: 'Solve for',
      modeTerm: 'Monthly payment',
      modePayment: 'Payoff months',
      term: 'Term (months)',
      monthly: 'Monthly payment',
      requiredTitle: 'Required',
      optionalTitle: 'Optional loan details',
      /**
       * What the folded optional fields hold, said in words. One status reads
       * as a whole sentence on its own; two or more read as a list.
       */
      optionalSingle: '{status}, no fees or prepayments',
      optionalMulti: '{status} with {rest}',
      statusHybrid: 'Hybrid (ARM)',
      statusFixed: 'Fixed rate',
      statusFees: 'fees',
      statusPrepayments: 'prepayments',
      statusPenalty: 'penalty',
      rateStructure: {
        title: 'Rate structure',
        hint: 'Fixed or fixed-then-variable (ARM)',
      },
      rateTypeAria: 'Rate type',
      fixed: 'Fixed',
      hybrid: 'Hybrid (ARM)',
      /** Split around the two `<em>`s, which repeat two labels above. */
      hybridHint: {
        before: 'Hybrid (ARM) loans need a fixed term. Switch ',
        solveFor: 'Solve for',
        mid: ' above to ',
        modeTerm: 'Monthly payment',
        after: ' to enable the ARM fields.',
      },
      initialFixed: 'Initial fixed period (months)',
      initialFixedHelp: 'Common: 60 (5/1 ARM), 84 (7/1), 120 (10/1).',
      subsequentRate: 'Subsequent rate (%)',
      subsequentRateHelp:
        'Rate after the fixed window ends. Real ARMs track an index; this is your stress-test guess.',
      costs: {
        title: 'Costs and fees',
        hint: 'Origination, closing, and discount points',
      },
      fee: 'Origination / closing fee',
      pointsCost: 'Discount points cost',
      pointsCostHelp:
        'Already counted in the fee above. Entering it again here lets the calculator show the points break-even.',
      pointsReduction: 'Rate reduction from points (pp)',
      pointsReductionHelp: 'e.g. 0.25 means the points cut your rate by 0.25 pp.',
      prepayments: {
        title: 'Prepayments',
        hint: 'Pay extra each month or in lump sums',
      },
      extra: 'Extra principal per month',
      lumps: 'Lump-sum prepayments',
      /** Split around the two `<code>`s, which hold the entry format itself. */
      lumpsHelp: {
        before: 'Format: ',
        /** The format's name as a reader sees it; what is typed is the digits. */
        format: 'month:amount',
        mid: ', semicolon-separated. e.g. ',
        after: ' means 5,000 in month 12 and 3,000 in month 36.',
      },
      penalty: {
        title: 'Prepayment penalty',
        hint: 'Some loans charge a fee for paying off early',
      },
      penaltyPct: 'Penalty (% of balance)',
      penaltyUntil: 'Penalty applies through (month)',
      penaltyUntilHelp:
        'Leave at 0 if there is no penalty. Charged only when the loan is paid off on or before this month.',
    },
    /** The three numbers on the face of a card, and the detail under it. */
    results: {
      monthly: 'Monthly',
      monthlyExtra: '{base} + {extra} extra',
      apr: 'APR',
      /** An APR that cannot be computed, as when the fee swallows the loan. */
      aprNa: 'n/a',
      aprFees: 'Includes fees',
      aprNoFees: 'No fees',
      totalPaid: 'Total paid',
      showDetails: 'Show details',
      timeToPayoff: 'Time to payoff',
      paymentsOne: '1 payment',
      paymentsMany: '{n} payments',
      paymentsFew: '{n} payments',
      totalInterest: 'Total interest',
      fees: 'Fees',
      penalty: 'Prepayment penalty',
      penaltyHint: 'Charged because the loan paid off early within the penalty window',
      breakEven: 'Points break-even',
      /** Where a break-even does not exist, in the tool's own voice. */
      never: 'never',
      breakEvenSaves: 'Saves {amount} over the term',
      breakEvenNever: 'Points do not lower the monthly enough to recoup',
    },
    /**
     * The side-by-side table. It describes the spread and never names a
     * winner: naming one among real offers is credit intermediation under the
     * EU Consumer Credit Directive, which is why the wording is neutral in both
     * languages rather than merely translated.
     */
    delta: {
      heading: 'Side-by-side',
      empty: 'Enter valid inputs for at least two vendors to see how they compare.',
      /** Both sentences emphasize their money figures, so both split around them. */
      sameBefore: 'All vendors come out at the same total cost of ',
      sameAfter: '.',
      rangeBefore: 'Total cost ranges from ',
      rangeTo: ' to ',
      rangeAcross: ' across the vendors below: a spread of ',
      rangeAfter: '.',
      /** The table's own column heading, for screen readers only. */
      metricAria: 'Metric',
      monthlyPayment: 'Monthly payment',
      monthsToPayoff: 'Months to payoff',
      aprInclFees: 'APR (incl. fees)',
      totalInterest: 'Total interest',
      totalPaid: 'Total paid',
      diffRow: 'Difference vs. lowest total cost',
      baseline: 'baseline',
      baselineAria: 'baseline (lowest total cost)',
    },
    /** The four analysis views, named by the ids the tab strip owns. */
    tabs: {
      aria: 'Analysis',
      listAria: 'Analysis views',
      charts: {
        label: 'Charts',
        hint: 'Balance over time and how each payment splits',
      },
      horizon: {
        label: 'Horizon',
        hint: 'Where you stand if you sell or refinance early',
      },
      refi: {
        label: 'Refinance',
        hint: 'Compare keep vs. refinance with break-even',
      },
      how: {
        label: 'How it works',
        hint: 'Formula and methodology',
      },
    },
    charts: {
      balanceHeading: 'Balance over time',
      balanceLead:
        "Each line is one vendor's outstanding balance, month by month. The dot on the axis marks when it is paid off.",
      splitHeading: 'Where each payment goes',
      splitLead:
        'Same monthly payment every month. Early on, almost all of it is interest; near the end, almost all of it is principal.',
      vendorLabel: 'Vendor',
      autoOption: 'Auto (lowest total cost)',
      incomplete: ' (incomplete)',
      splitEmpty:
        'Enter valid inputs above to see how each payment splits between interest and principal.',
      /**
       * The sentence under the split chart, split around the `<strong>` that
       * holds the vendor's name and the two `<em>`s that hold the years. The
       * clause about extra principal appears only when one is set.
       */
      caption: {
        before: 'Showing ',
        afterName: "'s contract schedule",
        noExtras: ' (without optional extra principal; APR-equivalent view)',
        extraBefore: '. An extra payment in ',
        yearEarly: 'year 1',
        extraMid: ' cancels 25 years of interest on that amount; the same payment in ',
        yearLate: 'year 24',
        extraAfter: ' saves almost nothing.',
      },
    },
    /** Every word the balance chart can put on screen or read out. */
    balance: {
      empty: 'Enter valid inputs above to see a payoff chart.',
      ariaPrefix: 'Loan balance over time. ',
      seriesLine: '{name}: starts at {amount}, paid off in {months}.',
      start: 'Start',
      year: 'Year {y}',
      month: 'Month {m}',
      yearMonth: 'Year {y}, month {m}',
      paidOff: 'Paid off, {interest} interest',
      left: '{balance} left, {interest} interest',
      legendNote: 'paid off in {months}',
      swipe: 'Swipe to see the whole chart →',
      groupAria:
        'Balance chart. Use the left and right arrow keys to read each year, with Shift for single months.',
      title: 'Loan balance over time',
      axisYears: 'Years',
      hint: 'Point at the chart, tap it, or use the arrow keys to read the balances in any year.',
      tableCaption: 'Loan balance over time, sampled by month',
    },
    /** Every word the interest/principal chart can put on screen or read out. */
    split: {
      ariaPrefix: 'Where each monthly payment goes for {vendor}. ',
      ariaRow: '{when}: interest {interest} ({pct}%), principal {principal}.',
      title: 'Where each payment goes',
      /** The two eyebrows, which the chart writes in capitals in English. */
      eyebrowInterest: 'INTEREST',
      eyebrowPrincipal: 'PRINCIPAL',
      footnote: 'Same payment every month, the split changes',
      tableCaption: 'Interest and principal split for {vendor}, sampled across the loan',
    },
    /** Column headings the two charts' screen-reader tables share. */
    words: {
      month: 'Month',
      payment: 'Payment',
      interest: 'Interest',
      principal: 'Principal',
    },
    how: {
      heading: 'How the comparison works',
      intro:
        'For each lender, the calculator builds a full amortization schedule using the standard fully-amortizing formula:',
      /** The first bullet, split around the three symbols the formula names. */
      symbols: {
        p: ' is the loan principal, ',
        r: ' is the monthly interest rate (annual rate ÷ 12), and ',
        n: ' is the number of monthly payments.',
      },
      monthly:
        "Each month's interest is computed on the outstanding balance, the payment is split between interest and principal, and the balance is reduced. The loop runs to the cent.",
      /** Split around the `<strong>` lead, as the rest of these bullets are. */
      apr: {
        strong: 'APR',
        rest: ' folds the origination/closing fee into the rate by treating the fee as an upfront deduction from what you actually receive, then solving for the monthly rate at which the present value of the contractual payments equals that net amount. Reported as the nominal annual rate (monthly rate × 12), matching US loan disclosures.',
      },
      hybrid: {
        strong: 'Hybrid (ARM) loans',
        rest: ' use the initial rate for the fixed window, then recast the payment at the transition month so the loan still amortizes within the original term at the subsequent rate.',
      },
      lumps: {
        strong: 'Lump-sum prepayments',
        rest: " are applied as principal AFTER the regular monthly payment, so they don't accrue interest the same month.",
      },
      penalties: {
        strong: 'Prepayment penalties',
        rest: " fire only when the loan is fully paid off on or before the penalty's expiration month.",
      },
      note: 'Everything runs in your browser. Nothing is sent to a server. Use the "Copy shareable link" button to encode every input into a URL you can hand to someone else.',
    },
    horizon: {
      heading: 'If I sell or refinance at...',
      lead: 'Loans look very different at month 36 vs. month 360. Each row shows where the borrower actually stands on that date.',
      /** Precedes the horizon, which the slider renders beside it. */
      label: 'Horizon: ',
      inputAria: 'Horizon in months (text)',
      empty: 'Enter valid inputs to see horizon snapshots.',
      principalRepaid: 'Principal repaid',
      interestPaid: 'Interest paid',
      balanceRemaining: 'Balance remaining',
      totalCashOut: 'Total cash out',
    },
    refi: {
      heading: 'Refinance scenario',
      lead: "Compare keeping a loan to refinancing it at a future month. Useful when rates drop or you're considering buying out an ARM before it resets.",
      whichLoan: 'Refinance which loan?',
      atMonth: 'Refinance at month',
      newRate: 'New rate (%)',
      newTerm: 'New term (months)',
      newFee: 'New closing costs',
      rollFee: 'Roll closing costs into new principal',
      empty: 'Pick a valid vendor and enter a refinance month, rate, and term to see savings.',
      keepTotal: 'Keep current loan: total',
      refiTotal: 'Refinance: total (over both legs)',
      saves: 'Refi saves',
      costsMore: 'Refi costs more',
      breakEven: 'Break-even (months after refi)',
      breakEvenHint: 'How long the new loan must run for closing costs to pay back',
      breakEvenNever: 'New monthly is not lower; closing costs do not recoup',
    },
    disclaimer: {
      summary: 'Assumptions and disclaimers',
      body: 'Calculations assume monthly compounding and on-time payments. APR is shown as a nominal annualized rate (monthly rate × 12) computed against the contractual schedule (without voluntary extras), folding the origination/closing fee into the effective cost of borrowing; jurisdictions differ on which other costs (mandatory insurance, account products, taxes) must be included in their official APR/APRC disclosure, so add those into the fee field if you want them reflected. Canadian residential mortgages compound semi-annually by law and Brazilian and some UK products use other compounding conventions; on those products the monthly-compounding figures here will be slightly off. Real adjustable-rate loans track an index plus a margin and may have rate caps that this calculator does not enforce; the subsequent rate you enter is your best stress-test guess. Property taxes, building or community service charges, home insurance, and the tax treatment of loan interest in your jurisdiction are not modeled. Educational comparison only; not financial advice. For a binding loan comparison or personalized advice, consult a licensed mortgage broker or financial advisor.',
    },
    /**
     * A count of months, as this tool writes it. The engine's own
     * `formatMonths` returns English ("3 yr 6 mo"), and it is shared with the
     * tests that pin those counts, so the tool reassembles it here from these
     * four forms plus the singular. Hindi marks the singular on the month only:
     * साल does not change with the count.
     */
    months: {
      na: 'n/a',
      one: '1 mo',
      some: '{m} mo',
      years: '{y} yr',
      yearsOne: '{y} yr 1 mo',
      yearsSome: '{y} yr {m} mo',
    },
    /**
     * The messages the engine can hand back, addressed by what they say.
     *
     * `src/utils/loan/math.ts` writes them in English because it computes
     * schedules and knows nothing about languages. The tool matches each one by
     * a phrase only it contains (`ENGINE_PHRASES` in `LoanCompare.tsx`) and shows
     * this instead, so a Hindi reader is not handed an English sentence in the
     * one place the tool has to be understood rather than read. A message the
     * engine grows later matches nothing and falls through unchanged, which is
     * a visible English sentence rather than a blank one.
     */
    engine: {
      errors: {
        principal: 'Principal must be greater than zero.',
        payment: 'Monthly payment must be greater than zero.',
        belowInterest:
          "Monthly payment is too low to ever pay off the loan; it does not even cover the first month's interest.",
        notAmortizing: 'Loan does not amortize within {months} months. Increase the monthly payment.',
        term: 'Term must be at least one month.',
        /** `computeLoan`'s checks on what the reader typed, before any schedule is built. */
        amount: 'Enter a loan amount greater than zero.',
        rate: 'Enter a non-negative interest rate.',
        initialFixed: 'Initial fixed period must be a positive number of months.',
        termMin: 'Enter a term of at least one month.',
        termMax: 'Term cannot exceed {months} months.',
        paymentEnter: 'Enter a monthly payment greater than zero.',
        hybridMode: 'Hybrid-rate loans must be entered in term mode (monthly payment is computed).',
        refiOriginal: 'Original loan is invalid; cannot compute refinance.',
        refiMonth: 'Refinance month must be at least 1.',
        refiMonthEnd: 'Refinance month must be before the original loan ends.',
        refiRate: 'New rate must be non-negative.',
        refiTerm: 'New term must be at least 1 month.',
        refiBalance: 'Original loan has no remaining balance at the refinance month.',
        newLoan: 'New loan is not valid.',
      },
      warnings: {
        precision:
          'Internal precision check: principal sum {sum} ≠ {expected}. Please report this.',
        subsequentRate:
          'After the initial fixed period, the subsequent rate is so high that the recast payment barely covers interest.',
      },
    },
  },
};

/**
 * The Hindi edition. Same shape by construction, and the same figures: nothing
 * here spells an amount or a month out by hand, so the two editions cannot
 * disagree about what the calculator computed.
 *
 * The words follow `docs/i18n/hi-glossary.md`, section "The free tools": मासिक
 * किस्त, लोन राशि, सालाना ब्याज दर, अवधि (महीने), चुकाने के महीने, किस्तों का
 * शेड्यूल, मूलधन, ब्याज, बकाया, कुल लागत, लोन शुल्क और कागज़ी खर्च, डिस्काउंट
 * पॉइंट्स, बराबरी का समय, रीफ़ाइनेंस, समय से पहले भुगतान, एकमुश्त राशि, जुर्माना,
 * लोन देने वाला (prose) and लोन ऑफ़र (a card), बची हुई रकम.
 * `बराबरी का समय` is a phrase rather than the loanword ब्रेक-ईवन because the row
 * answers "after how long does this pay for itself".
 *
 * What stays Latin: the currency codes, `APR`, `ARM`, `nidhi`, and the two
 * numbers in the formula. Currency amounts are not translated at all:
 * `formatAmount` and `formatMoney` write them by the chosen currency's own
 * conventions, and the currency names in the dropdown are `currenciesHi` from
 * `./currencies.ts`, the one list all three tools share.
 *
 * Register: the lessons'. Each answer says what the calculator does and where
 * it stops, and none of them tells the reader which loan to take: the tool is
 * careful not to crown a winner even by implication, and the Hindi keeps that
 * care rather than translating it away.
 */
export const loanComparisonHi: typeof loanComparisonEn = {
  meta: {
    title: 'लोन तुलना कैलकुलेटर: साथ-साथ तुलना, कई मुद्राओं में | nidhi',
    description:
      'मुफ़्त लोन तुलना कैलकुलेटर। दो से पाँच ऑफ़र साथ-साथ रखें: मासिक किस्त, चुकाने का समय, कुल ब्याज, APR और कुल लागत। कई मुद्राओं में।',
  },
  schema: {
    name: 'nidhi लोन तुलना कैलकुलेटर',
    alternateNames: [
      'nidhi लोन तुलना टूल',
      'nidhi लोन कैलकुलेटर',
      'nidhi कई मुद्राओं वाला लोन तुलना टूल',
      'nidhi कई मुद्राओं वाला लोन कैलकुलेटर',
      'nidhi साथ-साथ लोन की तुलना',
    ],
    operatingSystem: 'कोई भी (वेब ब्राउज़र)',
    browserRequirements: 'JavaScript चाहिए। आधुनिक ब्राउज़र।',
    featureList: [
      'दो से पाँच लोन ऑफ़र की साथ-साथ तुलना',
      'हर ऑफ़र का APR (सालाना प्रतिशत दर), जो शुल्क को भी एक ही तुलनीय दर में जोड़ देता है',
      'हर लोन के लिए ब्याज और मूलधन के बँटवारे का चार्ट, जो दिखाता है कि पूरी अवधि में हर किस्त कहाँ जाती है',
      '38 मुद्राओं का सपोर्ट, जिनमें USD, EUR, GBP, CHF, JPY, INR, CNY, CAD, AUD, SGD शामिल हैं',
      'तय अवधि देकर मासिक किस्त निकालें, या तय किस्त देकर चुकाने का समय निकालें',
      'लोन शुल्क और हर महीने का अतिरिक्त मूलधन जोड़कर देखें',
      'एडवांस्ड मोड: दर बदलने पर किस्त नए सिरे से निकाली जाने वाले हाइब्रिड (ARM) लोन, डिस्काउंट पॉइंट्स की बराबरी, एकमुश्त राशि, और समय से पहले भुगतान पर जुर्माना',
      'हॉराइज़न विश्लेषण ("अगर मैं महीने N पर बेच दूँ") हर लोन ऑफ़र के लिए: चुकाया गया मूलधन, दिया गया ब्याज, बची हुई रकम और अब तक गई कुल नकदी',
      'रीफ़ाइनेंस परिदृश्य, जो "पुराना लोन चलाते रहें" और "रीफ़ाइनेंस" की तुलना कागज़ी खर्च और बराबरी के समय के साथ करता है',
      'मुद्रा की सबसे छोटी इकाई (जैसे सेंट या पैसा) तक सटीक, पूर्णांकों में बना किस्तों का शेड्यूल',
      'किसी भी तुलना का शेयर करने योग्य लिंक, एडवांस्ड फ़ील्ड समेत',
    ],
  },
  page: {
    breadcrumb: {
      home: 'होम',
      this: 'लोन तुलना कैलकुलेटर',
    },
    eyebrow: 'मुफ़्त टूल',
    title: {
      lead: 'लोन तुलना कैलकुलेटर',
      wide: ': लोन के ऑफ़र साथ-साथ रखकर देखें',
    },
    lead: {
      before:
        'दो से पाँच लोन ऑफ़र भर दें। मासिक किस्त, चुकाने का समय, कुल चुकाई जाने वाली राशि और APR देखें: वह एक आँकड़ा जो शुल्क को भी दर में जोड़ देता है।',
      wide: 'देखें कि हर किस्त ब्याज और मूलधन में कैसे बँटती है। USD, EUR, GBP, INR, JPY और अन्य मुद्राओं का सपोर्ट।',
      after: 'सब कुछ आपके ब्राउज़र में चलता है; कुछ भी किसी सर्वर पर नहीं भेजा जाता।',
    },
    faq: {
      heading: 'अक्सर पूछे जाने वाले सवाल',
      groups: [
        {
          title: 'शुरुआत कैसे करें',
          items: [
            {
              q: 'यह लोन तुलना कैलकुलेटर कैसे काम करता है?',
              a: 'जिन लोन ऑफ़र की तुलना करनी है, उनमें से हर एक के लिए लोन राशि, सालाना ब्याज दर, और अवधि महीनों में या मासिक किस्त भर दें। आप दो से पाँच लोन ऑफ़र की साथ-साथ तुलना कर सकते हैं। कैलकुलेटर हर लोन का पूरा किस्तों का शेड्यूल बनाता है और मासिक किस्त, चुकाने के महीने, कुल ब्याज, APR (जो शुल्क को दर में जोड़ देता है) और कुल चुकाई जाने वाली राशि दिखाता है।',
            },
            {
              q: 'किस तरह के लोन की तुलना की जा सकती है?',
              a: 'मॉर्गेज, कार लोन, पर्सनल लोन, और आम चुकौती योजनाओं वाले एजुकेशन लोन। कैलकुलेटर तय ब्याज वाले लोन और हाइब्रिड (ARM जैसे) लोन दोनों संभालता है, जिनमें शुरुआत में एक तय दर रहती है और उसके बाद दूसरी दर लागू होती है। केवल ब्याज वाली अवधि और बैलून भुगतान इसमें शामिल नहीं हैं।',
            },
            {
              q: 'एक बार में कितने लोन की तुलना हो सकती है?',
              a: 'दो से पाँच। पेज दो कार्ड से शुरू होता है और उनके बगल में "लोन ऑफ़र जोड़ें" वाला साफ़ बटन रहता है, जिससे तुलना पाँच लोन ऑफ़र तक बढ़ाई जा सकती है। हर कार्ड पर हटाने का बटन है, ताकि जो लोन ऑफ़र अब काम का न हो उसे हटाया जा सके।',
            },
            {
              q: 'अलग-अलग अवधि या दर वाले लोन की तुलना हो सकती है?',
              a: 'हाँ। तुलना किए जाने वाले सभी लोन में अवधि, दर, शुल्क और मासिक किस्त तक अलग-अलग रखी जा सकती है। हर लोन ऑफ़र के कार्ड पर चुना जा सकता है कि मासिक किस्त निकालनी है (तय अवधि से) या चुकाने का समय (तय मासिक किस्त से)।',
            },
            {
              q: 'कौन-से फ़ील्ड ज़रूरी हैं?',
              a: 'लोन राशि, सालाना ब्याज दर, और अवधि महीनों में या मासिक किस्त (इस पर निर्भर कि क्या निकालना है)। इनके आगे लाल तारा लगा है। कार्ड के बाकी सारे फ़ील्ड (लोन शुल्क, अतिरिक्त मूलधन, डिस्काउंट पॉइंट्स, एकमुश्त राशि, समय से पहले भुगतान पर जुर्माना, हाइब्रिड दर) वैकल्पिक हैं और उन्हें जैसा है वैसा छोड़ा जा सकता है।',
            },
            {
              q: 'क्या मेरा डेटा कहीं भेजा जाता है?',
              a: 'नहीं। सब कुछ आपके ब्राउज़र में चलता है; कोई भी भरा हुआ आँकड़ा किसी सर्वर पर नहीं भेजा जाता। टूल इस्तेमाल करते समय पेज के पते में कुछ भी नहीं जाता। जब आप शेयर लिंक कॉपी करते हैं, तो आपके आँकड़े लिंक में # चिह्न के बाद जाते हैं, और पते का वह हिस्सा ब्राउज़र कभी सर्वर पर नहीं भेजता; पेज उन्हें एनालिटिक्स शुरू होने से पहले पता-पट्टी से हटा देता है।',
            },
          ],
        },
        {
          title: 'APR और शुल्क',
          items: [
            {
              q: 'APR क्या है और यहाँ उसकी गणना कैसे होती है?',
              a: 'APR (सालाना प्रतिशत दर) शुरू में लगने वाले शुल्क को उधार लेने की लागत में जोड़कर एक ही सालाना दर बना देता है, जिससे अलग-अलग शुल्क वाले दो ऑफ़र एक ही आँकड़े पर तुलनीय हो जाते हैं। यह कैलकुलेटर APR ऐसे निकालता है: शुल्क को उस राशि से पहले ही काटा हुआ मानता है जो उधार लेने वाले को असल में मिलती है, और फिर वह मासिक दर निकालता है जिस पर अनुबंध की किस्तों का वर्तमान मूल्य उस शुद्ध राशि के बराबर हो जाए। APR नाममात्र सालाना दर (मासिक दर × 12) के रूप में बताया जाता है, जो अमेरिकी लोन प्रकटीकरण की परंपरा से मेल खाता है और यूरोपीय संघ के APRC से भी मोटे तौर पर मेल खाता है। जब शुल्क शून्य हो, तो APR नाममात्र दर के बराबर होता है।',
            },
            {
              q: 'APR आम तौर पर सामने लिखी दर से ऊँचा क्यों होता है?',
              a: 'सामने लिखी दर केवल मूलधन की लागत बताती है। APR शुल्क को भी जोड़ता है, जो उधार लेने वाला चुकाता तो है पर इस्तेमाल नहीं कर पाता, इसलिए जो पैसा उसे असल में मिलता है, उस पर उसकी असली दर ऊँची हो जाती है। एक जैसी सामने लिखी दर वाले दो लोन के APR बहुत अलग हो सकते हैं, और कम सामने लिखी दर वाले लोन का APR उस लोन से ऊँचा हो सकता है जिसकी दर ज़्यादा है पर कोई शुल्क नहीं। विस्तार से समझने के लिए लोन की शर्तों वाला पाठ देखें।',
            },
            {
              q: 'क्या APR में हर महीने चुकाया जाने वाला मेरा अतिरिक्त मूलधन शामिल है?',
              a: 'नहीं। APR इस बात का माप है कि लोन देने वाला अनुबंध में कितनी लागत वसूल रहा है, न कि आपकी अपनी मर्ज़ी से किए गए भुगतानों का। अतिरिक्त मूलधन देना वैकल्पिक है, और उसे जोड़ने से बताया गया APR कम दिखने लगेगा। "हर किस्त कहाँ जाती है" चार्ट और APR की पंक्ति, दोनों अनुबंध वाला शेड्यूल इस्तेमाल करते हैं (बिना अतिरिक्त मूलधन); मासिक किस्त, चुकाने का समय और कुल चुकाई गई राशि वाले आँकड़े उस शेड्यूल को दिखाते हैं जिसमें आपका अतिरिक्त भुगतान शामिल है।',
            },
            {
              q: 'क्या ज़रूरी बीमा या साथ में बिकने वाले प्रोडक्ट शुल्क में जोड़ने चाहिए?',
              a: 'अगर लोन देने वाला उसके साथ कोई प्रोडक्ट खरीदने को कहता है (जीवन बीमा, कोई खाता, कोई निवेश प्रोडक्ट), तो उस प्रोडक्ट की लागत भी आपकी असली उधार लागत का हिस्सा है। APR के नियम इस बात पर अलग-अलग देशों में अलग हैं कि ऐसे प्रोडक्ट आधिकारिक APR प्रकटीकरण में शामिल करने ही होंगे या नहीं। ईमानदार तुलना के लिए ऐसे किसी भी ज़रूरी प्रोडक्ट की पूरी अवधि की लागत शुल्क वाले फ़ील्ड में जोड़ दें। तब दिखाया गया APR सब कुछ जोड़कर बनी लागत बताएगा।',
            },
            {
              q: 'क्या कैलकुलेटर लोन शुल्क और कागज़ी खर्च संभालता है?',
              a: 'हाँ। हर लोन ऑफ़र के कार्ड पर "लागत और शुल्क" के नीचे "लोन शुल्क और कागज़ी खर्च" वाले फ़ील्ड में इन्हें भर दें। ये शुल्क कुल चुकाई जाने वाली राशि में जुड़ जाते हैं, इसलिए साथ-साथ वाली तुलना लोन की असली लागत दिखाती है, और ये दिखाए गए APR में भी जुड़ जाते हैं।',
            },
          ],
        },
        {
          title: 'समय से पहले भुगतान, पॉइंट्स और जुर्माना',
          items: [
            {
              q: 'क्या हर महीने अतिरिक्त मूलधन चुकाने का हिसाब लगाया जा सकता है?',
              a: 'हाँ। हर लोन ऑफ़र के कार्ड पर "समय से पहले भुगतान" वाले हिस्से में "हर महीने अतिरिक्त मूलधन" के नीचे राशि भर दें। कैलकुलेटर हर महीने उतनी राशि से सीधे मूलधन घटा देता है, जिससे चुकाने का समय छोटा हो जाता है और कुल ब्याज घट जाता है।',
            },
            {
              q: 'एकमुश्त राशि कैसे भरी जाती है?',
              a: 'महीना:राशि (month:amount) के रूप में, अर्धविराम से अलग करके। उदाहरण के लिए, 12:5000;36:3000;60:10000 का मतलब है महीने 12 में 5,000, महीने 36 में 3,000 और महीने 60 में 10,000 का भुगतान। हर एकमुश्त राशि उस महीने की आम मासिक किस्त के बाद सीधे मूलधन घटाती है, इसलिए उसी महीने उस पर ब्याज नहीं बनता। लोन आम तौर पर अनुबंध की अवधि से पहले चुक जाता है और कुल ब्याज उसी हिसाब से घट जाता है।',
            },
            {
              q: 'डिस्काउंट पॉइंट्स की बराबरी कैसे काम करती है?',
              a: 'डिस्काउंट पॉइंट्स शुरू में दिया जाने वाला खर्च है, जो कम ब्याज दर खरीदता है। यह फ़ायदे में आएगा या नहीं, यह इस पर निर्भर है कि लोन कितने समय तक चलेगा। पॉइंट्स की लागत और उनसे मिली दर में कमी भर दें, और कैलकुलेटर "पॉइंट्स नहीं दिए" वाला काल्पनिक आधार बनाकर (वही लोन, शुल्क में से पॉइंट्स की लागत घटाकर, दर में कमी जोड़कर) दोनों की तुलना करता है। "पॉइंट्स की बराबरी" वाली पंक्ति बताती है कि शुरू का यह खर्च निकलने में कितने महीनों की कम किस्तें लगेंगी। अगर नई मासिक किस्त असल में कम नहीं है, तो बराबरी का समय "कभी नहीं" बताया जाता है।',
            },
            {
              q: 'समय से पहले भुगतान पर जुर्माना कैसे काम करता है?',
              a: 'कुछ लोन जल्दी चुका देने पर जुर्माना लगाते हैं। जुर्माना बची हुई रकम का प्रतिशत बताकर भरें, और यह भी कि वह किस महीने तक लागू है। जुर्माना तभी लगता है जब लोन उस महीने या उससे पहले पूरी तरह चुक जाए (एकमुश्त राशि, अतिरिक्त मूलधन या रीफ़ाइनेंस से)। जुर्माना कुल चुकाई जाने वाली राशि में जुड़ जाता है, इसलिए साथ-साथ वाली तुलना जुर्माने के साथ जल्दी चुकाने की असली लागत दिखाती है।',
            },
          ],
        },
        {
          title: 'हाइब्रिड (ARM) लोन',
          items: [
            {
              q: 'कैलकुलेटर हाइब्रिड (5/1, 7/1, 10/1 ARM) लोन कैसे संभालता है?',
              a: '"दर का ढाँचा" वाले हिस्से में दर का प्रकार हाइब्रिड पर बदल दें, फिर शुरुआत की तय अवधि (जैसे 5/1 ARM के लिए 60 महीने) और उसके बाद लागू होने वाली दर भर दें। किस्तों का शेड्यूल पहले शुरुआती दर पर, दर बदलने वाले महीने तक बनता है, और उसके बाद किस्त नए सिरे से निकाली जाती है: बची हुई रकम बाद की दर पर, अनुबंध की बाकी अवधि में बाँट दी जाती है, इसलिए लोन फिर भी तय की गई अवधि में चुक जाता है। दिखाया गया APR इसी शेड्यूल पर बनता है, जो उस तरीक़े से मेल खाता है जिससे लोन देने वाले असली ARM प्रोडक्ट पर APR बताते हैं।',
            },
            {
              q: '"चुकाने के महीने" चुनने पर हाइब्रिड विकल्प बंद क्यों हो जाता है?',
              a: 'हाइब्रिड लोन में तय अनुबंध अवधि होनी चाहिए, तभी कैलकुलेटर दर बदलने पर किस्त नए सिरे से निकाल सकता है। "चुकाने के महीने" चुनने पर अनुबंध अवधि नहीं दी जाती (उसके बदले तय मासिक किस्त दी जाती है), इसलिए किस्त नए सिरे से निकालना संभव नहीं रहता। हाइब्रिड वाला विकल्प चालू करने के लिए "क्या निकालना है" को "मासिक किस्त" पर बदल दें।',
            },
          ],
        },
        {
          title: 'विश्लेषण के टैब',
          items: [
            {
              q: '"हर किस्त कहाँ जाती है" चार्ट क्या दिखाता है?',
              a: 'यह लोन के हर साल की एक प्रतिनिधि मासिक किस्त को ब्याज और मूलधन के हिस्सों में बाँटकर एक ही स्तंभ पर ऊपर-नीचे दिखाता है। हर स्तंभ की कुल ऊँचाई एक जैसी है (क्योंकि मासिक किस्त एक जैसी है), पर बँटवारा बहुत बदलता है: शुरुआती सालों में किस्त का लगभग पूरा हिस्सा ब्याज होता है, और आखिरी सालों में लगभग पूरा मूलधन। इसी वजह से लंबे लोन के पहले कुछ सालों में किया गया भुगतान बहुत ज़्यादा असर करता है; शुरू में मूलधन से हटाया गया हर यूरो बाकी पूरी अवधि का ब्याज बचा देता है।',
            },
            {
              q: 'हॉराइज़न (किस महीने तक का हिसाब) विश्लेषण ("अगर मैं बेचूँ या रीफ़ाइनेंस करूँ...") क्या है?',
              a: 'महीने 36 और महीने 360 पर लोन बहुत अलग दिखते हैं। हॉराइज़न टैब पूछता है: जो महीना आप चुनें, उस तक आपने असल में कितना मूलधन चुकाया, कितना ब्याज दिया, कितना बकाया बचा, और अब तक कुल कितनी नकदी खर्च हुई (किस्तें और लोन शुल्क मिलाकर)? यह नज़रिया तब सही है जब आप लोन की अनुबंध अवधि ख़त्म होने से काफ़ी पहले बेचने, शहर बदलने या रीफ़ाइनेंस करने की सोच रहे हों, क्योंकि जो लोन ऑफ़र 360 महीनों में सबसे कम कुल लागत पर आता है, ज़रूरी नहीं कि वही महीने 60 पर निकलने पर भी सबसे सस्ता हो।',
            },
            {
              q: 'रीफ़ाइनेंस परिदृश्य बनाने वाला हिस्सा कैसे काम करता है?',
              a: 'चुनें कि कौन-सा लोन रीफ़ाइनेंस करना है, किस महीने में, नई दर, नई अवधि और कागज़ी खर्च। कैलकुलेटर "पुराना लोन आखिर तक चलाते रहने" में कुल खर्च की तुलना "रीफ़ाइनेंस वाले महीने तक पुरानी किस्तें देकर, बची हुई रकम नए लोन से चुकाकर, वह लोन अपनी अनुबंध अवधि तक चलाने" से करता है। यह बराबरी का समय भी बताता है: रीफ़ाइनेंस के कागज़ी खर्च निकलने में कितने महीनों की कम किस्तें लगेंगी। अगर नई मासिक किस्त कम नहीं है, तो बराबरी का समय "कभी नहीं" बताया जाता है।',
            },
          ],
        },
        {
          title: 'शेयर करना और सटीकता',
          items: [
            {
              q: 'क्या शेयर लिंक अपने आप में पूरे होते हैं?',
              a: 'हाँ। शेयर लिंक में वह सब कुछ भरा होता है जो दूसरे इंसान को चाहिए: हर लोन ऑफ़र का हर फ़ील्ड (दर का प्रकार, हाइब्रिड शेड्यूल, पॉइंट्स, एकमुश्त राशि, समय से पहले भुगतान पर जुर्माना), मुद्रा, खुला हुआ विश्लेषण टैब, और हॉराइज़न तथा रीफ़ाइनेंस के आँकड़े। लिंक खोलने वाला उसी नज़रिये पर पहुँचता है जो आप देख रहे थे, आपके सारे आँकड़ों के साथ। लिंक में केवल वही मान जाते हैं जो शुरुआती मानों से अलग हैं, इसलिए नई तुलना का लिंक छोटा ही रहता है।',
            },
            {
              q: 'गणना कितनी सटीक है?',
              a: 'पूरा किस्तों का शेड्यूल मुद्रा की सबसे छोटी इकाई (जैसे सेंट या पैसा) के पूर्णांकों में बनाया जाता है, ताकि दशमलव की गोलाई से गलती न हो। सूत्र से निकली मासिक किस्त सबसे नज़दीकी इकाई तक गोल की जाती है, और हर शेड्यूल की आखिरी किस्त ऐसे मिलाई जाती है कि मूलधन की सारी किस्तों का जोड़ लोन राशि के ठीक बराबर हो। APR उसी पूर्णांकों वाले शेड्यूल पर वर्तमान मूल्य के समीकरण को द्विभाजन से हल करके निकाला जाता है, इतनी सटीकता से कि किसी असली लोन देने वाले का प्रकटीकरण उस तक नहीं पहुँचता।',
            },
          ],
        },
        {
          title: 'कई मुद्राओं का सपोर्ट',
          items: [
            {
              q: 'कौन-सी मुद्राएँ शामिल हैं?',
              a: '38 मुद्राएँ शामिल हैं, जिनमें यूरो (EUR), अमेरिकी डॉलर (USD), ब्रिटिश पाउंड (GBP), स्विस फ़्रैंक (CHF), जापानी येन (JPY), भारतीय रुपया (INR), चीनी युआन (CNY), कनाडाई डॉलर (CAD), ऑस्ट्रेलियाई डॉलर (AUD), सिंगापुर डॉलर (SGD), बांग्लादेशी टका (BDT), केन्याई शिलिंग (KES), पश्चिम और मध्य अफ़्रीकी CFA फ़्रैंक (XOF, XAF), और नॉर्डिक, मध्य यूरोपीय, लैटिन अमेरिकी, दक्षिण एशियाई, दक्षिण-पूर्व एशियाई तथा अफ़्रीकी प्रमुख मुद्राएँ हैं। हर मुद्रा अपनी ही परंपरा से दिखाई जाती है। उदाहरण के लिए, INR में भारतीय लाख/करोड़ वाला समूहन (1,23,45,678) होता है और JPY में दशमलव नहीं लिखा जाता।',
            },
            {
              q: 'यहाँ "कई मुद्राओं" का क्या मतलब है?',
              a: 'इसका मतलब है कि कैलकुलेटर इनपुट और नतीजे उसी मुद्रा की परंपरा से लिखता है जो आप चुनते हैं। चिह्न, दशमलव के स्थान और अंकों का समूहन, सब उसी मुद्रा के हिसाब से बदल जाते हैं। गणित वही रहता है: तय दर वाला किस्तों में चुकने वाला लोन एक जैसा ही चलता है, चाहे उसकी इकाई को डॉलर कहें, रुपया या येन। एक ही तुलना में सारे लोन एक ही मुद्रा में रहते हैं, क्योंकि अलग-अलग मुद्राओं की नाममात्र किस्तों की तुलना, ताज़ा विनिमय दर (exchange\u00A0rate) के बिना, भ्रम में डालती है।',
            },
          ],
        },
      ],
    },
    related: {
      heading: 'कुछ भी साइन करने से पहले',
      lead: 'ऐसा चुनाव करें जो पाँच साल बाद भी सही लगे।',
      items: [
        {
          kicker: 'तुलना कैसे करें',
          title: 'लोन की शर्तें समझें',
          desc: 'APR, किस्तों का शेड्यूल, तय बनाम बदलती दर, समय से पहले भुगतान पर जुर्माना: वही बारीक शर्तें तय करती हैं कि किस ऑफ़र की कुल लागत सबसे कम है।',
        },
        {
          kicker: 'उधार लेने से पहले',
          title: 'पहले आपातकालीन कोष',
          desc: 'अगर एक खराब महीना आपको किस्त चुकाने से चूकने पर मजबूर कर दे, तो लोन बहुत बड़ा है। उठाने से पहले थोड़ा बचा हुआ पैसा जोड़ लें।',
        },
        {
          kicker: 'सोचने का तरीक़ा',
          title: 'क़ीमत बढ़ना और घटना',
          desc: 'जब तक आप घर का लोन चुकाते हैं, घर की क़ीमत बढ़ सकती है। कार की आम तौर पर घटती है। एक जैसी मासिक किस्त का मतलब एक जैसा सौदा नहीं।',
        },
        {
          kicker: 'साइन करने के बाद',
          title: 'कर्ज़ से कैसे निकलें',
          desc: 'जो चुकाना है उसे बीच में थककर छोड़ दिए बिना चुकाने का एक व्यावहारिक तरीक़ा।',
        },
        {
          kicker: 'बुनियादी बातें',
          title: 'देनदारी में क्या गिना जाता है',
          desc: 'कुछ बनाने वाले कर्ज़ और घर का पैसा बस बहा देने वाले कर्ज़ के बीच का फ़र्क़।',
        },
      ],
      footerTag: 'कर्ज़ और लोन पर और पढ़ें',
      footerAll: 'या सारे पाठ देखें',
    },
  },
  island: {
    currencies: currenciesHi,
    toolbar: {
      aria: 'लोन की तुलना के काम',
      currencyLabel: 'किस मुद्रा में दिखाना है',
      currencyHelp: 'इस तुलना के सारे लोन इसी तरीक़े में लिखे जाएँगे।',
      sample: 'नमूना:',
      share: 'शेयर करने योग्य लिंक कॉपी करें',
      shareCopied: 'लिंक कॉपी हो गया',
      shareTitle: 'ऐसा लिंक कॉपी करें जिसमें आपके लोन की सारी जानकारी हो',
      reset: 'शुरुआती हालत पर लौटें',
      resetTitle: 'सारा डेटा मिटाकर नए सिरे से शुरू करें',
      copiedBar: 'लिंक क्लिपबोर्ड पर कॉपी हो गया',
      shareUrlAria: 'शेयर करने योग्य लिंक का पता',
      shareStatus: 'शेयर करने योग्य लिंक क्लिपबोर्ड पर कॉपी हो गया।',
      copyPrompt: 'यह लिंक कॉपी करें:',
    },
    phoneTabs: {
      groupAria: 'कौन-सा लोन ऑफ़र दिखाना है',
      tabName: 'लोन ऑफ़र {label}',
      add: 'जोड़ें',
      addAria: 'तुलना के लिए एक और लोन ऑफ़र जोड़ें ({max} में से {n})',
      addCard: 'लोन ऑफ़र जोड़ें',
      addCardHint: 'ज़्यादा से ज़्यादा {max} की तुलना',
    },
    card: {
      badge: 'लोन ऑफ़र {label}',
      removeAria: 'लोन ऑफ़र {label} को तुलना से हटाएँ',
      removeTitle: 'तुलना से हटाएँ',
      name: 'लोन देने वाले का नाम',
      principal: 'लोन राशि',
      rate: 'सालाना ब्याज दर (%)',
      solveFor: 'क्या निकालना है',
      modeTerm: 'मासिक किस्त',
      modePayment: 'चुकाने के महीने',
      term: 'अवधि (महीने)',
      monthly: 'मासिक किस्त',
      requiredTitle: 'ज़रूरी',
      optionalTitle: 'लोन की बाकी जानकारी (वैकल्पिक)',
      optionalSingle: '{status}, न कोई शुल्क न समय से पहले भुगतान',
      optionalMulti: '{status}, साथ में {rest}',
      statusHybrid: 'हाइब्रिड (ARM)',
      statusFixed: 'तय दर',
      statusFees: 'शुल्क',
      statusPrepayments: 'समय से पहले भुगतान',
      statusPenalty: 'जुर्माना',
      rateStructure: {
        title: 'दर का ढाँचा',
        hint: 'तय, या पहले तय फिर बदलती (ARM)',
      },
      rateTypeAria: 'दर का प्रकार',
      fixed: 'तय',
      hybrid: 'हाइब्रिड (ARM)',
      hybridHint: {
        before: 'हाइब्रिड (ARM) लोन के लिए तय अवधि ज़रूरी है। ARM वाले फ़ील्ड चालू करने के लिए ऊपर ',
        solveFor: 'क्या निकालना है',
        mid: ' को ',
        modeTerm: 'मासिक किस्त',
        after: ' पर बदल दें।',
      },
      initialFixed: 'शुरुआत की तय अवधि (महीने)',
      initialFixedHelp: 'आम: 60 (5/1 ARM), 84 (7/1), 120 (10/1)।',
      subsequentRate: 'बाद की दर (%)',
      subsequentRateHelp:
        'तय अवधि ख़त्म होने के बाद की दर। असली ARM किसी इंडेक्स से जुड़े होते हैं; यहाँ दर बढ़ने की स्थिति का अपना अनुमान भरें।',
      costs: {
        title: 'लागत और शुल्क',
        hint: 'लोन शुल्क, कागज़ी खर्च और डिस्काउंट पॉइंट्स',
      },
      fee: 'लोन शुल्क और कागज़ी खर्च',
      pointsCost: 'डिस्काउंट पॉइंट्स की लागत',
      pointsCostHelp:
        'यह ऊपर के शुल्क में पहले ही जुड़ा है। यहाँ दोबारा भरने पर कैलकुलेटर पॉइंट्स की बराबरी दिखा पाता है।',
      pointsReduction: 'पॉइंट्स से दर में कमी (प्रतिशत अंक)',
      pointsReductionHelp: 'जैसे 0.25 का मतलब है कि पॉइंट्स ने आपकी दर 0.25 प्रतिशत अंक (percentage\u00A0point) घटा दी।',
      prepayments: {
        title: 'समय से पहले भुगतान',
        hint: 'हर महीने कुछ ज़्यादा, या एकमुश्त राशि',
      },
      extra: 'हर महीने अतिरिक्त मूलधन',
      lumps: 'एकमुश्त राशि',
      lumpsHelp: {
        before: 'ढाँचा: ',
        format: 'महीना:राशि',
        mid: ', अर्धविराम से अलग। जैसे ',
        after: ' का मतलब है महीने 12 में 5,000 और महीने 36 में 3,000।',
      },
      penalty: {
        title: 'समय से पहले भुगतान पर जुर्माना',
        hint: 'कुछ लोन जल्दी चुका देने पर शुल्क लगाते हैं',
      },
      penaltyPct: 'जुर्माना (बकाए का प्रतिशत)',
      penaltyUntil: 'जुर्माना किस महीने तक लागू है',
      penaltyUntilHelp:
        'जुर्माना न हो तो 0 छोड़ दें। यह तभी लगता है जब लोन इस महीने या इससे पहले पूरा चुक जाए।',
    },
    results: {
      monthly: 'मासिक',
      monthlyExtra: '{base} + {extra} अतिरिक्त',
      apr: 'APR',
      aprNa: 'लागू नहीं',
      aprFees: 'शुल्क जुड़ा हुआ',
      aprNoFees: 'कोई शुल्क नहीं',
      totalPaid: 'कुल चुकाया',
      showDetails: 'पूरा हिसाब देखें',
      timeToPayoff: 'चुकाने का समय',
      paymentsOne: '{n} किस्त',
      paymentsMany: '{n} किस्तें',
      paymentsFew: '{n} किस्तें',
      totalInterest: 'कुल ब्याज',
      fees: 'शुल्क',
      penalty: 'समय से पहले भुगतान पर जुर्माना',
      penaltyHint: 'यह इसलिए लगा कि लोन जुर्माने की अवधि के भीतर चुक गया',
      breakEven: 'पॉइंट्स की बराबरी',
      never: 'कभी नहीं',
      breakEvenSaves: 'पूरी अवधि में {amount} की बचत',
      breakEvenNever: 'पॉइंट्स मासिक किस्त इतनी नहीं घटाते कि लागत निकल जाए',
    },
    delta: {
      heading: 'साथ-साथ',
      empty: 'तुलना देखने के लिए कम से कम दो लोन ऑफ़र के सही आँकड़े भरें।',
      sameBefore: 'सभी लोन ऑफ़र की कुल लागत एक ही निकलती है: ',
      sameAfter: '।',
      rangeBefore: 'नीचे दिए लोन ऑफ़र में कुल लागत ',
      rangeTo: ' से ',
      rangeAcross: ' तक है: यानी ',
      rangeAfter: ' का फ़र्क़।',
      metricAria: 'मापदंड',
      monthlyPayment: 'मासिक किस्त',
      monthsToPayoff: 'चुकाने के महीने',
      aprInclFees: 'APR (शुल्क समेत)',
      totalInterest: 'कुल ब्याज',
      totalPaid: 'कुल चुकाया',
      diffRow: 'सबसे कम कुल लागत से फ़र्क़',
      baseline: 'आधार',
      baselineAria: 'आधार (सबसे कम कुल लागत)',
    },
    tabs: {
      aria: 'विश्लेषण',
      listAria: 'विश्लेषण के नज़रिए',
      charts: {
        label: 'चार्ट',
        hint: 'समय के साथ बकाया, और हर किस्त का बँटवारा',
      },
      horizon: {
        label: 'हॉराइज़न',
        hint: 'जल्दी बेचने या रीफ़ाइनेंस करने पर आप कहाँ होंगे',
      },
      refi: {
        label: 'रीफ़ाइनेंस',
        hint: 'जारी रखने और रीफ़ाइनेंस की तुलना, बराबरी के समय के साथ',
      },
      how: {
        label: 'यह कैसे काम करता है',
        hint: 'सूत्र और तरीक़ा',
      },
    },
    charts: {
      balanceHeading: 'समय के साथ बकाया',
      balanceLead:
        'हर लकीर एक लोन ऑफ़र का बकाया है, महीने दर महीने। अक्ष पर लगी बिंदी बताती है कि वह कब चुक गया।',
      splitHeading: 'हर किस्त कहाँ जाती है',
      splitLead:
        'हर महीने किस्त एक ही है। शुरुआत में उसका लगभग पूरा हिस्सा ब्याज होता है; आखिर में लगभग पूरा मूलधन।',
      vendorLabel: 'लोन ऑफ़र',
      autoOption: 'अपने आप (सबसे कम कुल लागत)',
      incomplete: ' (अधूरा)',
      splitEmpty:
        'ऊपर सही आँकड़े भरें, ताकि दिख सके कि हर किस्त ब्याज और मूलधन में कैसे बँटती है।',
      caption: {
        before: 'दिखाया गया है: ',
        afterName: ' का अनुबंध के हिसाब से किस्तों का शेड्यूल',
        noExtras: ' (वैकल्पिक अतिरिक्त मूलधन के बिना; APR जैसा नज़रिया)',
        extraBefore: '। ',
        yearEarly: 'साल 1',
        extraMid: ' में किया गया एक अतिरिक्त भुगतान उस रकम पर 25 साल का ब्याज बचा देता है; ',
        yearLate: 'साल 24',
        extraAfter: ' में वही भुगतान लगभग कुछ नहीं बचाता।',
      },
    },
    balance: {
      empty: 'ऊपर सही आँकड़े भरें, ताकि चुकौती का चार्ट दिख सके।',
      ariaPrefix: 'समय के साथ लोन का बकाया। ',
      seriesLine: '{name}: शुरुआत {amount} से, चुकने में लगा समय: {months}।',
      start: 'शुरुआत',
      year: 'साल {y}',
      month: 'महीना {m}',
      yearMonth: 'साल {y}, महीना {m}',
      paidOff: 'चुक गया, {interest} ब्याज',
      left: '{balance} बाकी, {interest} ब्याज',
      legendNote: 'चुकने का समय: {months}',
      swipe: 'पूरा चार्ट देखने के लिए साइड में स्वाइप करें →',
      groupAria:
        'बकाए का चार्ट। हर साल का आँकड़ा पढ़ने के लिए बाएँ और दाएँ तीर की कुंजियाँ इस्तेमाल करें, और एक-एक महीने के लिए Shift दबाएँ।',
      title: 'समय के साथ लोन का बकाया',
      axisYears: 'साल',
      hint: 'चार्ट पर पॉइंटर ले जाएँ, उस पर टैप करें, या तीर की कुंजियों से किसी भी साल का बकाया पढ़ें।',
      tableCaption: 'समय के साथ लोन का बकाया, महीने-महीने के नमूनों में',
    },
    split: {
      ariaPrefix: '{vendor} की हर मासिक किस्त कहाँ जाती है। ',
      ariaRow: '{when}: ब्याज {interest} ({pct}%), मूलधन {principal}।',
      title: 'हर किस्त कहाँ जाती है',
      eyebrowInterest: 'ब्याज',
      eyebrowPrincipal: 'मूलधन',
      footnote: 'किस्त हर महीने एक ही, बँटवारा बदलता रहता है',
      tableCaption: '{vendor} के ब्याज और मूलधन का बँटवारा, पूरे लोन से लिए नमूनों में',
    },
    words: {
      month: 'महीना',
      payment: 'किस्त',
      interest: 'ब्याज',
      principal: 'मूलधन',
    },
    how: {
      heading: 'तुलना कैसे होती है',
      intro:
        'हर लोन ऑफ़र के लिए कैलकुलेटर किस्तों में पूरा चुकने वाले लोन के मानक सूत्र से पूरा किस्तों का शेड्यूल बनाता है:',
      symbols: {
        p: ' लोन का मूलधन है, ',
        r: ' मासिक ब्याज दर है (सालाना दर ÷ 12), और ',
        n: ' मासिक किस्तों की संख्या है।',
      },
      monthly:
        'हर महीने का ब्याज उस समय के बकाए पर लगता है, किस्त ब्याज और मूलधन में बँटती है, और बकाया घट जाता है। यह गणना मुद्रा की सबसे छोटी इकाई तक सटीक चलती है।',
      apr: {
        strong: 'APR',
        rest: ' लोन शुल्क और कागज़ी खर्च को दर में इस तरह जोड़ता है: शुल्क को उस राशि से पहले ही काटा हुआ मानता है जो आपको असल में मिलती है, और फिर वह मासिक दर निकालता है जिस पर अनुबंध की किस्तों का वर्तमान मूल्य उस शुद्ध राशि के बराबर हो जाए। इसे नाममात्र सालाना दर (मासिक दर × 12) के रूप में बताया जाता है, जो अमेरिकी लोन प्रकटीकरण से मेल खाता है।',
      },
      hybrid: {
        strong: 'हाइब्रिड (ARM) लोन',
        rest: ' तय अवधि तक शुरुआती दर इस्तेमाल करते हैं, और फिर दर बदलने वाले महीने पर किस्त नए सिरे से निकालते हैं, ताकि लोन बाद की दर पर भी मूल अवधि के भीतर ही चुक जाए।',
      },
      lumps: {
        strong: 'एकमुश्त राशि',
        rest: ' आम मासिक किस्त के बाद सीधे मूलधन घटाती है, इसलिए उसी महीने उस पर ब्याज नहीं बनता।',
      },
      penalties: {
        strong: 'समय से पहले भुगतान पर जुर्माना',
        rest: ' तभी लगता है जब लोन जुर्माने की अवधि के आखिरी महीने या उससे पहले पूरा चुक जाए।',
      },
      note: 'सब कुछ आपके ब्राउज़र में चलता है। कुछ भी किसी सर्वर पर नहीं भेजा जाता। हर भरा हुआ आँकड़ा एक पते में बदलकर किसी और को देने के लिए "शेयर करने योग्य लिंक कॉपी करें" बटन इस्तेमाल करें।',
    },
    horizon: {
      heading: 'अगर मैं बेचूँ या रीफ़ाइनेंस करूँ...',
      lead: 'महीने 36 पर और महीने 360 पर लोन बहुत अलग दिखते हैं। हर पंक्ति बताती है कि उस तारीख तक उधार लेने वाला असल में कहाँ खड़ा है।',
      label: 'हॉराइज़न: ',
      inputAria: 'हॉराइज़न महीनों में (टेक्स्ट)',
      empty: 'हॉराइज़न के आँकड़े देखने के लिए सही इनपुट भरें।',
      principalRepaid: 'चुकाया गया मूलधन',
      interestPaid: 'दिया गया ब्याज',
      balanceRemaining: 'बची हुई रकम',
      totalCashOut: 'कुल खर्च हुई नकदी',
    },
    refi: {
      heading: 'रीफ़ाइनेंस परिदृश्य',
      lead: 'किसी लोन को चलाते रहने और आगे किसी महीने उसका रीफ़ाइनेंस कराने की तुलना करें। यह तब काम आता है जब दरें गिर जाएँ, या आप ARM के दर बदलने से पहले उसे चुका देने की सोच रहे हों।',
      whichLoan: 'किस लोन का रीफ़ाइनेंस?',
      atMonth: 'किस महीने में रीफ़ाइनेंस',
      newRate: 'नई दर (%)',
      newTerm: 'नई अवधि (महीने)',
      newFee: 'नया कागज़ी खर्च',
      rollFee: 'कागज़ी खर्च नए मूलधन में जोड़ दें',
      empty: 'बचत देखने के लिए कोई सही लोन ऑफ़र चुनें और रीफ़ाइनेंस का महीना, दर तथा अवधि भरें।',
      keepTotal: 'पुराना लोन चलाते रहें: कुल',
      refiTotal: 'रीफ़ाइनेंस: कुल (पुराना और नया लोन मिलाकर)',
      saves: 'रीफ़ाइनेंस से बचत',
      costsMore: 'रीफ़ाइनेंस में ज़्यादा खर्च',
      breakEven: 'बराबरी का समय (रीफ़ाइनेंस के कितने महीने बाद)',
      breakEvenHint: 'कागज़ी खर्च निकलने के लिए नया लोन कितने महीने चलना चाहिए',
      breakEvenNever: 'नई मासिक किस्त कम नहीं है; कागज़ी खर्च नहीं निकलता',
    },
    disclaimer: {
      summary: 'मान्यताएँ और ज़रूरी बातें',
      body: 'गणना में यह माना गया है कि ब्याज हर महीने जुड़ता है और किस्तें समय पर दी जाती हैं। APR को नाममात्र सालाना दर (मासिक दर × 12) के रूप में दिखाया जाता है, जो अनुबंध वाले शेड्यूल पर बनती है (बिना अपनी मर्ज़ी के अतिरिक्त भुगतान के) और लोन शुल्क तथा कागज़ी खर्च को उधार की असली लागत में जोड़ देती है; यह हर देश में अलग है कि आधिकारिक APR/APRC प्रकटीकरण में और कौन-सी लागतें (ज़रूरी बीमा, खाते से जुड़े प्रोडक्ट, कर) शामिल करनी होंगी, इसलिए अगर वे भी दिखानी हों तो उन्हें शुल्क वाले फ़ील्ड में जोड़ दें। कनाडा के आवासीय मॉर्गेज कानूनन छह महीने पर ब्याज जोड़ते हैं, और ब्राज़ील के तथा ब्रिटेन के कुछ प्रोडक्ट ब्याज जोड़ने के दूसरे तरीक़े अपनाते हैं; ऐसे प्रोडक्ट पर यहाँ की महीने-दर-महीने वाली गणना थोड़ी अलग पड़ेगी। असली बदलती दर वाले लोन किसी इंडेक्स और मार्जिन से चलते हैं और उन पर दर की ऊपरी सीमाएँ भी हो सकती हैं, जो यह कैलकुलेटर लागू नहीं करता; बाद की दर के लिए भरा गया आँकड़ा दर बढ़ने की स्थिति का आपका अपना अनुमान है। संपत्ति कर, इमारत या सोसाइटी का खर्च, घर का बीमा, और आपके देश में लोन के ब्याज पर कर का क्या असर होता है: ये सब इसमें शामिल नहीं हैं। यह केवल सीखने के लिए तुलना है; वित्तीय सलाह नहीं। किसी बाध्यकारी तुलना या अपने हाल के हिसाब से सलाह के लिए किसी लाइसेंस वाले मॉर्गेज ब्रोकर या वित्तीय सलाहकार से बात करें।',
    },
    months: {
      na: 'लागू नहीं',
      one: '1 महीना',
      some: '{m} महीने',
      years: '{y} साल',
      yearsOne: '{y} साल 1 महीना',
      yearsSome: '{y} साल {m} महीने',
    },
    engine: {
      errors: {
        principal: 'मूलधन शून्य से ज़्यादा होना चाहिए।',
        payment: 'मासिक किस्त शून्य से ज़्यादा होनी चाहिए।',
        belowInterest:
          'मासिक किस्त इतनी कम है कि लोन कभी चुक ही नहीं सकता; वह पहले महीने का ब्याज भी पूरा नहीं भरती।',
        notAmortizing:
          'लोन {months} महीनों में नहीं चुक पाता। मासिक किस्त बढ़ाएँ।',
        term: 'अवधि कम से कम एक महीने की होनी चाहिए।',
        amount: 'शून्य से ज़्यादा लोन राशि भरें।',
        rate: 'ब्याज दर शून्य या उससे ज़्यादा भरें।',
        initialFixed: 'शुरुआत की तय अवधि शून्य से ज़्यादा महीनों की होनी चाहिए।',
        termMin: 'कम से कम एक महीने की अवधि भरें।',
        termMax: 'अवधि {months} महीनों से ज़्यादा नहीं हो सकती।',
        paymentEnter: 'शून्य से ज़्यादा मासिक किस्त भरें।',
        hybridMode: 'हाइब्रिड (ARM) लोन के लिए तय अवधि चाहिए: "क्या निकालना है" में "मासिक किस्त" चुनें, किस्त अपने आप निकलेगी।',
        refiOriginal: 'पुराना लोन सही नहीं है; रीफ़ाइनेंस की गणना नहीं हो सकती।',
        refiMonth: 'रीफ़ाइनेंस का महीना कम से कम 1 होना चाहिए।',
        refiMonthEnd: 'रीफ़ाइनेंस का महीना पुराने लोन के ख़त्म होने से पहले होना चाहिए।',
        refiRate: 'नई दर शून्य या उससे ज़्यादा होनी चाहिए।',
        refiTerm: 'नई अवधि कम से कम 1 महीने की होनी चाहिए।',
        refiBalance: 'रीफ़ाइनेंस वाले महीने में पुराने लोन का कोई बकाया नहीं बचता।',
        newLoan: 'नया लोन सही नहीं है।',
      },
      warnings: {
        precision:
          'भीतरी सटीकता की जाँच: मूलधन की किस्तों का जोड़ {sum} है, जबकि {expected} होना चाहिए। कृपया हमें इसकी सूचना दें।',
        subsequentRate:
          'शुरुआती तय अवधि के बाद की दर इतनी ऊँची है कि नए सिरे से निकाली गई किस्त मुश्किल से ब्याज निकालती है।',
      },
    },
  },
};

/**
 * The Spanish edition. Same shape and the same figures as the other two.
 *
 * The words follow `docs/i18n/es-glossary.md`, "The free tools": cuota
 * mensual, cantidad del préstamo, tasa de interés anual, plazo, tabla de
 * amortización, saldo pendiente, capital, comisión de apertura y gastos
 * iniciales, puntos de descuento, punto de equilibrio, pago anticipado,
 * refinanciar. A "vendor" is the lender, `entidad financiera`, shortened to
 * `entidad` on the cards. Lump sums are `pagos extraordinarios`.
 *
 * `APR` and `ARM` stay Latin, as in every language; APR is glossed once as
 * the tasa de porcentaje anual (not *tasa anual equivalente*, which is what
 * TAE stands for), and the EU APRC is called the TAE, its name in the
 * directive's Spanish text. The tool's figure is the US nominal APR, so it is
 * never labelled TAE. The months use `a.` for años so that one
 * form serves 1 and many years, as `yr` does in English.
 */
export const loanComparisonEs: typeof loanComparisonEn = {
  meta: {
    title: 'Comparador de préstamos: lado a lado y multimoneda | nidhi',
    description:
      'Comparador de préstamos gratuito: de dos a cinco ofertas lado a lado, con cuota mensual, plazo, intereses totales, APR y costo total. En varias monedas.',
  },
  schema: {
    name: 'Comparador de préstamos de nidhi',
    alternateNames: [
      'Calculadora para comparar préstamos de nidhi',
      'Calculadora de préstamos de nidhi',
      'Comparador de préstamos en varias monedas de nidhi',
      'Calculadora de préstamos en varias monedas de nidhi',
      'Comparación de préstamos lado a lado de nidhi',
    ],
    operatingSystem: 'Cualquiera (navegador web)',
    browserRequirements: 'Requiere JavaScript. Navegador moderno.',
    featureList: [
      'Compara de 2 a 5 ofertas de préstamo lado a lado',
      'APR (tasa de porcentaje anual) de cada oferta, que incorpora las comisiones en una sola tasa comparable',
      'Gráfico del reparto entre intereses y capital de cada préstamo, que muestra adónde va cada cuota durante toda la vida del préstamo',
      'Compatible con 38 monedas, entre ellas USD, EUR, GBP, CHF, JPY, INR, CNY, CAD, AUD, SGD',
      'Calcula la cuota mensual a partir de un plazo fijo, o el tiempo hasta liquidar el préstamo a partir de una cuota fija',
      'Incluye la comisión de apertura y los pagos extra al capital cada mes',
      'Modo avanzado: préstamos híbridos (ARM) con la cuota recalculada en la transición, punto de equilibrio de los puntos de descuento, pagos extraordinarios y penalización por pago anticipado',
      'Análisis por horizonte («si vendo en el mes N») con el capital devuelto, los intereses pagados, el saldo pendiente y el desembolso total de cada entidad',
      'Escenario de refinanciación que compara «mantener» y «refinanciar» con gastos iniciales y punto de equilibrio',
      'Tabla de amortización exacta hasta la unidad monetaria más pequeña (como el céntimo o el centavo), calculada con números enteros',
      'Enlace para compartir cualquier comparación, con todos los campos avanzados',
    ],
  },
  page: {
    breadcrumb: {
      home: 'Inicio',
      this: 'Comparador de préstamos',
    },
    eyebrow: 'Herramientas gratuitas',
    title: {
      lead: 'Comparador de préstamos',
      wide: ': compara ofertas de préstamo lado a lado',
    },
    lead: {
      before:
        'Añade de dos a cinco entidades financieras. Verás la cuota mensual, el tiempo hasta liquidar el préstamo, el total pagado y el APR: la cifra única de costo que incorpora la comisión a la tasa.',
      wide: 'Observa cómo se reparte cada cuota entre intereses y capital. Compatible con USD, EUR, GBP, INR, JPY y más monedas.',
      after: 'Todo funciona en tu navegador; no se envía nada a ningún servidor.',
    },
    faq: {
      heading: 'Preguntas frecuentes',
      groups: [
        {
          title: 'Cómo empezar',
          items: [
            {
              q: '¿Cómo funciona este comparador de préstamos?',
              a: 'Escribe la cantidad del préstamo, la tasa de interés anual y el plazo en meses o la cuota mensual de cada entidad financiera que quieras comparar. Puedes comparar de dos a cinco ofertas de préstamo lado a lado. La calculadora construye la tabla de amortización completa de cada préstamo y muestra la cuota mensual, el total de meses hasta liquidarlo, los intereses totales, el APR (que incorpora la comisión a la tasa) y el total pagado.',
            },
            {
              q: '¿Qué tipos de préstamos puedo comparar?',
              a: 'Hipotecas, préstamos para vehículos, préstamos personales y préstamos de estudios con planes de pago estándar. La calculadora admite préstamos a tasa fija y préstamos híbridos (del tipo ARM), en los que una tasa fija inicial va seguida de otra tasa distinta. No modela periodos en los que solo se pagan intereses ni pagos finales abultados (cuota balón).',
            },
            {
              q: '¿Cuántos préstamos puedo comparar a la vez?',
              a: 'De dos a cinco. La página empieza con dos tarjetas lado a lado y un recuadro bien visible de «Añadir entidad» que permite ampliar la comparación hasta un máximo de cinco ofertas de préstamo. Cada tarjeta tiene un botón para quitarla, por si una entidad deja de encajar.',
            },
            {
              q: '¿Puedo comparar préstamos con plazos o tasas distintos?',
              a: 'Sí. Puedes combinar plazos, tasas, comisiones e incluso cuotas mensuales distintas entre todos los préstamos que compares. En la tarjeta de cada entidad eliges si calcular la cuota mensual (con plazo fijo) o el tiempo hasta liquidar el préstamo (con cuota mensual fija).',
            },
            {
              q: '¿Qué campos son obligatorios?',
              a: 'La cantidad del préstamo, la tasa de interés anual y el plazo en meses o la cuota mensual (según lo que quieras calcular). Están marcados con un asterisco rojo. Todos los demás campos de la tarjeta (comisión de apertura, capital extra, puntos, pagos extraordinarios, penalización por pago anticipado, tasa híbrida) son opcionales y puedes dejarlos con su valor predeterminado.',
            },
            {
              q: '¿Se envían mis datos a algún sitio?',
              a: 'No. Todo funciona en tu navegador; ningún dato que escribes se envía a ningún servidor. Mientras usas la herramienta, no se añade nada a la dirección de la página. Cuando copias un enlace para compartir, tus valores van en el enlace después del signo #, una parte de la dirección que los navegadores nunca envían a un servidor, y la página los quita de la barra de direcciones antes de que se inicie la analítica.',
            },
          ],
        },
        {
          title: 'APR y comisiones',
          items: [
            {
              q: '¿Qué es el APR y cómo se calcula aquí?',
              a: 'El APR (Annual Percentage Rate, la tasa de porcentaje anual) incorpora la comisión inicial al costo del préstamo en una sola tasa anualizada, de modo que dos ofertas con comisiones distintas se pueden comparar con una sola cifra. Esta calculadora obtiene el APR tratando la comisión como una deducción inicial del capital que recibe quien pide el préstamo y buscando después la tasa mensual con la que el valor actual de los pagos contractuales es igual a esa cantidad neta. El APR se expresa como tasa anual nominal (tasa mensual × 12), que coincide con la convención de la información obligatoria de los préstamos en EE. UU. y apunta en la misma dirección que la TAE de la UE. Cuando la comisión es cero, el APR es igual a la tasa nominal.',
            },
            {
              q: '¿Por qué el APR suele ser más alto que la tasa anunciada?',
              a: 'La tasa anunciada solo pone precio al capital en sí. El APR también incluye la comisión, que quien pide el préstamo paga pero no llega a usar, así que la tasa efectiva que paga sobre el dinero que realmente recibe es más alta. Dos préstamos con la misma tasa anunciada pueden tener APR muy distintos, y un préstamo con una tasa anunciada más baja puede tener un APR más alto que otro con una tasa anunciada más alta pero sin comisión. Para verlo a fondo, consulta la lección sobre las condiciones de los préstamos.',
            },
            {
              q: '¿El APR incluye el capital extra que pienso pagar cada mes?',
              a: 'No. El APR mide el costo contractual que cobra la entidad financiera, no lo que tú decidas hacer de forma voluntaria. Los pagos extra al capital son opcionales, e incluirlos haría que el APR informado pareciera más bajo de lo que es. El gráfico «Adónde va cada cuota» y la fila del APR usan la tabla contractual (sin capital extra); la cuota mensual, el tiempo hasta liquidar el préstamo y el total pagado reflejan la tabla que incluye tus pagos extra.',
            },
            {
              q: '¿Hay que incluir en la comisión los seguros obligatorios o los productos vinculados?',
              a: 'Si una entidad te exige contratar un producto junto con el préstamo (un seguro de vida, una cuenta, un producto de inversión), el costo de ese producto forma parte de tu costo real del préstamo. Las normas sobre el APR varían según la jurisdicción en cuanto a si esos productos deben incluirse en la cifra oficial. Para comparar con honestidad, suma al campo de la comisión el costo de cualquier producto vinculado obligatorio durante toda la vida del préstamo. El APR mostrado reflejará entonces el costo completo.',
            },
            {
              q: '¿La calculadora tiene en cuenta la comisión de apertura y los gastos iniciales?',
              a: 'Sí. Escríbelos en el campo «Comisión de apertura y gastos iniciales», dentro de «Costos y comisiones», en la tarjeta de cada entidad. Las comisiones se suman al total pagado, así que la comparación lado a lado refleja el costo real del préstamo, y se incorporan al APR mostrado.',
            },
          ],
        },
        {
          title: 'Pagos anticipados, puntos y penalizaciones',
          items: [
            {
              q: '¿Puedo simular un pago extra al capital cada mes?',
              a: 'Sí. Escribe una cantidad en «Capital extra al mes», dentro del grupo «Pagos anticipados» de la tarjeta de cada entidad. La calculadora la aplica directamente al capital cada mes, lo que acorta el tiempo hasta liquidar el préstamo y reduce los intereses totales.',
            },
            {
              q: '¿Cómo se introducen los pagos extraordinarios?',
              a: 'Con el formato mes:cantidad, separados por punto y coma. Por ejemplo, 12:5000;36:3000;60:10000 significa un pago anticipado de 5000 en el mes 12, de 3000 en el mes 36 y de 10.000 en el mes 60. Cada pago extraordinario se aplica al capital DESPUÉS de la cuota mensual ordinaria de ese mes, así que no genera intereses ese mismo mes. Normalmente el préstamo se liquida antes del plazo contractual y los intereses totales bajan en consecuencia.',
            },
            {
              q: '¿Cómo funciona el punto de equilibrio de los puntos de descuento?',
              a: 'Los puntos de descuento (pagos por adelantado para bajar la tasa) son un costo inicial que compra una tasa de interés más baja. Que compensen o no depende de cuánto tiempo mantengas el préstamo. Escribe el costo de los puntos y la rebaja de tasa que compraron, y la calculadora construye una referencia hipotética «sin puntos» (el mismo préstamo, con la comisión menos el costo de los puntos y la tasa más la rebaja) y compara ambas. La fila «Punto de equilibrio de los puntos» muestra cuántos meses de cuotas más bajas hacen falta para recuperar el costo inicial. Si la nueva cuota mensual no es realmente más baja, el punto de equilibrio figura como «nunca».',
            },
            {
              q: '¿Cómo funciona la penalización por pago anticipado?',
              a: 'Algunos préstamos cobran una penalización si los liquidas antes de tiempo. Escribe la penalización como porcentaje del saldo pendiente y el último mes en que se aplica. La penalización solo se cobra cuando el préstamo se liquida por completo (con pagos extraordinarios, capital extra o una refinanciación) en ese mes o antes. Las penalizaciones se suman al total pagado, así que la comparación lado a lado refleja el costo real de liquidar antes de tiempo con penalización.',
            },
          ],
        },
        {
          title: 'Préstamos híbridos (ARM)',
          items: [
            {
              q: '¿Cómo trata la calculadora los préstamos híbridos (ARM 5/1, 7/1, 10/1)?',
              a: 'Cambia el tipo de tasa a Híbrida en el grupo «Estructura de la tasa» y escribe el periodo fijo inicial (por ejemplo, 60 meses para un ARM 5/1) y la tasa que se aplica cuando termina ese periodo fijo. La tabla de amortización se construye con la tasa inicial hasta el mes de transición y después se recalcula la cuota: el saldo pendiente se vuelve a amortizar durante los meses contractuales que quedan a la tasa posterior, de modo que el préstamo se sigue liquidando en el plazo original. El APR mostrado usa esta tabla tal como se informa, que es como las entidades financieras indican el APR en productos ARM reales.',
            },
            {
              q: '¿Por qué la opción híbrida está desactivada cuando elijo «Meses hasta liquidar»?',
              a: 'Los préstamos híbridos necesitan un plazo contractual fijo para que la calculadora pueda recalcular la cuota en el cambio de tasa. Cuando calculas «Meses hasta liquidar» no indicas un plazo contractual (indicas una cuota mensual fija), así que el recálculo no está definido. Cambia «Calcular» a «Cuota mensual» para activar la opción híbrida.',
            },
          ],
        },
        {
          title: 'Pestañas de análisis',
          items: [
            {
              q: '¿Qué muestra el gráfico «Adónde va cada cuota»?',
              a: 'Divide una cuota mensual representativa de cada año del préstamo en su parte de intereses y su parte de capital, apiladas en una sola barra. Todas las barras tienen la misma altura total (la misma cuota mensual), pero el reparto cambia mucho: en los primeros años casi toda la cuota son intereses, y en los últimos casi toda es capital. Por eso los pagos anticipados en los primeros años de un préstamo largo tienen un efecto desproporcionado: cada euro que se resta pronto al capital evita intereses durante todo el plazo restante.',
            },
            {
              q: '¿Qué es el análisis por horizonte («si vendo o refinancio en...»)?',
              a: 'Un préstamo se ve muy distinto en el mes 36 que en el mes 360. La pestaña Horizonte pregunta: en el mes que elijas, ¿cuánto capital has devuelto realmente, cuántos intereses has pagado, cuál es el saldo pendiente y cuánto dinero has desembolsado en total hasta ese momento (cuotas más comisión de apertura)? Es la vista adecuada si prevés vender, mudarte o refinanciar bastante antes del final contractual del préstamo, porque la entidad con el menor costo total a 360 meses puede no ser la de menor costo si sales en el mes 60.',
            },
            {
              q: '¿Cómo funciona el escenario de refinanciación?',
              a: 'Elige qué entidad refinanciar, el mes en que se refinancia, la nueva tasa, el nuevo plazo y los gastos iniciales. La calculadora compara el dinero total desembolsado si «mantienes el préstamo original hasta el final» con el de «pagar las cuotas originales hasta el mes de la refinanciación y luego liquidar el saldo pendiente con un préstamo nuevo que dura hasta su propio final contractual». También indica un punto de equilibrio: cuántos meses de cuotas más bajas hacen falta para recuperar los gastos iniciales de la refinanciación. Si la nueva cuota mensual no es más baja, el punto de equilibrio es «nunca».',
            },
          ],
        },
        {
          title: 'Compartir y precisión',
          items: [
            {
              q: '¿Los enlaces para compartir están completos por sí solos?',
              a: 'Sí. El enlace para compartir codifica todo lo que necesita quien lo recibe: todos los campos de cada entidad (tipo de tasa, calendario híbrido, puntos, pagos extraordinarios, penalización por pago anticipado), la moneda, la pestaña de análisis activa y los datos del horizonte y del escenario de refinanciación. Quien lo abre llega a la misma vista que estabas viendo, con todos tus datos. La dirección solo contiene los valores que difieren de los predeterminados, así que una comparación nueva sigue produciendo un enlace corto.',
            },
            {
              q: '¿Qué precisión tienen los cálculos?',
              a: 'Toda la amortización se calcula en números enteros de la unidad monetaria más pequeña (como céntimos o centavos) para evitar errores de redondeo de coma flotante. La fórmula cerrada de la cuota mensual se redondea a la unidad más cercana, y la última cuota de cada tabla se ajusta para que la suma de los pagos de capital coincida exactamente con la cantidad del préstamo original. El APR se resuelve por bisección sobre la ecuación del valor actual con la misma tabla en enteros, con una precisión muy superior a la de cualquier información oficial de una entidad financiera.',
            },
          ],
        },
        {
          title: 'Varias monedas',
          items: [
            {
              q: '¿Qué monedas se admiten?',
              a: 'Se admiten treinta y ocho monedas, entre ellas el euro (EUR), el dólar estadounidense (USD), la libra esterlina (GBP), el franco suizo (CHF), el yen japonés (JPY), la rupia india (INR), el yuan chino (CNY), el dólar canadiense (CAD), el dólar australiano (AUD), el dólar de Singapur (SGD), el taka bangladesí (BDT), el chelín keniano (KES), los francos CFA de África Occidental y Central (XOF, XAF) y las principales monedas nórdicas, centroeuropeas, latinoamericanas, del sur y el sudeste de Asia y africanas. Todas las cantidades se escriben como se escriben las cifras en español, con el símbolo o el código detrás (1.234.567,80 €, 1.234.567,80 ₹), y cada moneda conserva sus decimales: el JPY, por ejemplo, no usa decimales.',
            },
            {
              q: '¿Qué significa aquí «varias monedas»?',
              a: 'Significa que la calculadora trabaja en la moneda que elijas: los resultados llevan su símbolo y sus decimales, escritos como se escriben las cifras en español. Los cálculos son idénticos: un préstamo a tasa fija que se amortiza se comporta igual tanto si llamas a las unidades dólares como rupias o yenes. Todos los préstamos de una misma comparación comparten una moneda, porque comparar cuotas nominales en monedas distintas (sin un tipo de cambio actualizado) sería engañoso.',
            },
          ],
        },
      ],
    },
    related: {
      heading: 'Antes de firmar nada',
      lead: 'Una decisión que te siga pareciendo acertada dentro de cinco años.',
      items: [
        {
          kicker: 'Cómo comparar',
          title: 'Entender las condiciones de un préstamo',
          desc: 'APR, amortización, tasa fija o variable, penalizaciones por pago anticipado: la letra pequeña que decide qué oferta tiene el menor costo total.',
        },
        {
          kicker: 'Antes de pedir prestado',
          title: 'Primero, el fondo de emergencia',
          desc: 'Si un mal mes te obligaría a saltarte una cuota, el préstamo es demasiado grande. Crea un colchón antes de asumirlo.',
        },
        {
          kicker: 'Modelo mental',
          title: 'Revalorización y depreciación',
          desc: 'Una casa puede ganar valor mientras la pagas. Un vehículo normalmente lo pierde. La misma cuota mensual no significa el mismo trato.',
        },
        {
          kicker: 'Después de firmar',
          title: 'Cómo salir de las deudas',
          desc: 'Un método práctico para reducir lo que debes sin agotarte a mitad de camino.',
        },
        {
          kicker: 'Fundamentos',
          title: 'Qué cuenta como pasivo',
          desc: 'La diferencia entre la deuda que construye algo y la que solo le quita dinero al hogar.',
        },
      ],
      footerTag: 'Más sobre deudas y préstamos',
      footerAll: 'O explora todos los artículos',
    },
  },
  island: {
    currencies: currenciesEs,
    toolbar: {
      aria: 'Acciones del comparador de préstamos',
      currencyLabel: 'Moneda en pantalla',
      currencyHelp: 'Todos los préstamos de esta comparación usan este formato.',
      sample: 'Ejemplo:',
      share: 'Copiar enlace para compartir',
      shareCopied: 'Enlace copiado',
      shareTitle: 'Copia un enlace que incluye todos los datos de tus préstamos',
      reset: 'Restablecer valores predeterminados',
      resetTitle: 'Borra todos los datos y empieza de cero',
      copiedBar: 'Enlace copiado al portapapeles',
      shareUrlAria: 'Dirección del enlace para compartir',
      shareStatus: 'Enlace para compartir copiado al portapapeles.',
      copyPrompt: 'Copia este enlace:',
    },
    phoneTabs: {
      groupAria: 'Entidad que se muestra',
      tabName: 'Entidad {label}',
      add: 'Añadir',
      addAria: 'Añadir otra entidad para comparar ({n} de {max})',
      addCard: 'Añadir entidad',
      addCardHint: 'Compara hasta {max}',
    },
    card: {
      badge: 'Entidad {label}',
      removeAria: 'Quitar la entidad {label} de la comparación',
      removeTitle: 'Quitar de la comparación',
      name: 'Nombre de la entidad',
      principal: 'Cantidad del préstamo',
      rate: 'Tasa de interés anual (%)',
      solveFor: 'Calcular',
      modeTerm: 'Cuota mensual',
      modePayment: 'Meses hasta liquidar',
      term: 'Plazo (meses)',
      monthly: 'Cuota mensual',
      requiredTitle: 'Obligatorio',
      optionalTitle: 'Datos opcionales del préstamo',
      optionalSingle: '{status}, sin comisiones ni pagos anticipados',
      optionalMulti: '{status} con {rest}',
      statusHybrid: 'Tasa híbrida (ARM)',
      statusFixed: 'Tasa fija',
      statusFees: 'comisiones',
      statusPrepayments: 'pagos anticipados',
      statusPenalty: 'penalización',
      rateStructure: {
        title: 'Estructura de la tasa',
        hint: 'Fija, o fija y luego variable (ARM)',
      },
      rateTypeAria: 'Tipo de tasa',
      fixed: 'Fija',
      hybrid: 'Híbrida (ARM)',
      hybridHint: {
        before: 'Los préstamos híbridos (ARM) necesitan un plazo fijo. Cambia ',
        solveFor: 'Calcular',
        mid: ' arriba a ',
        modeTerm: 'Cuota mensual',
        after: ' para activar los campos ARM.',
      },
      initialFixed: 'Periodo fijo inicial (meses)',
      initialFixedHelp: 'Habituales: 60 (ARM 5/1), 84 (7/1), 120 (10/1).',
      subsequentRate: 'Tasa posterior (%)',
      subsequentRateHelp:
        'Tasa cuando termina el periodo fijo. Los ARM reales siguen un índice; esta es tu estimación para una prueba de estrés.',
      costs: {
        title: 'Costos y comisiones',
        hint: 'Comisión de apertura, gastos iniciales y puntos de descuento',
      },
      fee: 'Comisión de apertura y gastos iniciales',
      pointsCost: 'Costo de los puntos de descuento',
      pointsCostHelp:
        'Ya está incluido en la comisión de arriba. Escribirlo de nuevo aquí permite que la calculadora muestre el punto de equilibrio de los puntos.',
      pointsReduction: 'Rebaja de tasa por los puntos (p. p.)',
      pointsReductionHelp: 'Por ejemplo, 0,25 significa que los puntos bajan tu tasa 0,25 puntos porcentuales.',
      prepayments: {
        title: 'Pagos anticipados',
        hint: 'Pagos extra cada mes o pagos extraordinarios',
      },
      extra: 'Capital extra al mes',
      lumps: 'Pagos extraordinarios',
      lumpsHelp: {
        before: 'Formato: ',
        format: 'mes:cantidad',
        mid: ', separados por punto y coma. Por ejemplo, ',
        after: ' significa 5000 en el mes 12 y 3000 en el mes 36.',
      },
      penalty: {
        title: 'Penalización por pago anticipado',
        hint: 'Algunos préstamos cobran una comisión por liquidarlos antes de tiempo',
      },
      penaltyPct: 'Penalización (% del saldo)',
      penaltyUntil: 'La penalización se aplica hasta el mes',
      penaltyUntilHelp:
        'Déjalo en 0 si no hay penalización. Solo se cobra cuando el préstamo se liquida en este mes o antes.',
    },
    results: {
      monthly: 'Mensual',
      monthlyExtra: '{base} + {extra} de pago extra',
      apr: 'APR',
      aprNa: 'n. d.',
      aprFees: 'Incluye comisiones',
      aprNoFees: 'Sin comisiones',
      totalPaid: 'Total pagado',
      showDetails: 'Ver detalles',
      timeToPayoff: 'Tiempo hasta liquidarlo',
      paymentsOne: '1 cuota',
      paymentsMany: '{n} cuotas',
      paymentsFew: '{n} cuotas',
      totalInterest: 'Intereses totales',
      fees: 'Comisiones',
      penalty: 'Penalización por pago anticipado',
      penaltyHint: 'Se cobra porque el préstamo se liquidó antes de tiempo dentro del periodo de penalización',
      breakEven: 'Punto de equilibrio de los puntos',
      never: 'nunca',
      breakEvenSaves: 'Ahorra {amount} durante el plazo',
      breakEvenNever: 'Los puntos no bajan la cuota mensual lo suficiente para recuperar su costo',
    },
    delta: {
      heading: 'Lado a lado',
      empty: 'Escribe datos válidos de al menos dos entidades para ver cómo se comparan.',
      sameBefore: 'Todas las entidades salen con el mismo costo total: ',
      sameAfter: '.',
      rangeBefore: 'El costo total va de ',
      rangeTo: ' a ',
      rangeAcross: ' entre las entidades de abajo: una diferencia de ',
      rangeAfter: '.',
      metricAria: 'Métrica',
      monthlyPayment: 'Cuota mensual',
      monthsToPayoff: 'Meses hasta liquidar',
      aprInclFees: 'APR (con comisiones)',
      totalInterest: 'Intereses totales',
      totalPaid: 'Total pagado',
      diffRow: 'Diferencia frente al menor costo total',
      baseline: 'referencia',
      baselineAria: 'referencia (menor costo total)',
    },
    tabs: {
      aria: 'Análisis',
      listAria: 'Vistas de análisis',
      charts: {
        label: 'Gráficos',
        hint: 'Saldo pendiente a lo largo del tiempo y reparto de cada cuota',
      },
      horizon: {
        label: 'Horizonte',
        hint: 'Tu situación si vendes o refinancias antes',
      },
      refi: {
        label: 'Refinanciar',
        hint: 'Compara mantener y refinanciar, con punto de equilibrio',
      },
      how: {
        label: 'Cómo funciona',
        hint: 'Fórmula y metodología',
      },
    },
    charts: {
      balanceHeading: 'Saldo pendiente a lo largo del tiempo',
      balanceLead:
        'Cada línea es el saldo pendiente de una entidad, mes a mes. El punto sobre el eje marca cuándo queda liquidado.',
      splitHeading: 'Adónde va cada cuota',
      splitLead:
        'La misma cuota mensual cada mes. Al principio, casi toda son intereses; hacia el final, casi toda es capital.',
      vendorLabel: 'Entidad',
      autoOption: 'Automático (menor costo total)',
      incomplete: ' (incompleta)',
      splitEmpty:
        'Escribe datos válidos arriba para ver cómo se reparte cada cuota entre intereses y capital.',
      caption: {
        before: 'Se muestra la tabla de amortización de ',
        afterName: ' según el contrato',
        noExtras: ' (sin el capital extra opcional; la misma vista que el APR)',
        extraBefore: '. Un pago extra en el ',
        yearEarly: 'año 1',
        extraMid: ' evita 25 años de intereses sobre esa cantidad; el mismo pago en el ',
        yearLate: 'año 24',
        extraAfter: ' casi no ahorra nada.',
      },
    },
    balance: {
      empty: 'Escribe datos válidos arriba para ver un gráfico de amortización.',
      ariaPrefix: 'Saldo pendiente del préstamo a lo largo del tiempo. ',
      seriesLine: '{name}: empieza en {amount} y se liquida en {months}.',
      start: 'Inicio',
      year: 'Año {y}',
      month: 'Mes {m}',
      yearMonth: 'Año {y}, mes {m}',
      paidOff: 'Liquidado, {interest} de intereses',
      left: 'Quedan {balance}, {interest} de intereses',
      legendNote: 'liquidado en {months}',
      swipe: 'Desliza para ver todo el gráfico →',
      groupAria:
        'Gráfico del saldo pendiente. Usa las flechas izquierda y derecha para leer cada año, y Shift para meses sueltos.',
      title: 'Saldo pendiente del préstamo a lo largo del tiempo',
      axisYears: 'Años',
      hint: 'Pasa el puntero por el gráfico, tócalo o usa las flechas para leer el saldo pendiente de cualquier año.',
      tableCaption: 'Saldo pendiente del préstamo a lo largo del tiempo, con meses de muestra',
    },
    split: {
      ariaPrefix: 'Adónde va cada cuota mensual de {vendor}. ',
      ariaRow: '{when}: intereses {interest} ({pct} %), capital {principal}.',
      title: 'Adónde va cada cuota',
      eyebrowInterest: 'INTERESES',
      eyebrowPrincipal: 'CAPITAL',
      footnote: 'La misma cuota cada mes, el reparto cambia',
      tableCaption: 'Reparto entre intereses y capital de {vendor}, con muestras a lo largo del préstamo',
    },
    words: {
      month: 'Mes',
      payment: 'Cuota',
      interest: 'Intereses',
      principal: 'Capital',
    },
    how: {
      heading: 'Cómo funciona la comparación',
      intro:
        'Para cada entidad financiera, la calculadora construye la tabla de amortización completa con la fórmula estándar de un préstamo que se amortiza por completo:',
      symbols: {
        p: ' es el capital del préstamo, ',
        r: ' es la tasa de interés mensual (tasa anual ÷ 12) y ',
        n: ' es el número de cuotas mensuales.',
      },
      monthly:
        'Los intereses de cada mes se calculan sobre el saldo pendiente, la cuota se reparte entre intereses y capital, y el saldo se reduce. El cálculo es exacto hasta la unidad monetaria más pequeña.',
      apr: {
        strong: 'APR',
        rest: ' incorpora la comisión de apertura y los gastos iniciales a la tasa: trata la comisión como una deducción inicial de lo que realmente recibes y busca la tasa mensual con la que el valor actual de los pagos contractuales es igual a esa cantidad neta. Se expresa como tasa anual nominal (tasa mensual × 12), como en la información obligatoria de los préstamos en EE. UU.',
      },
      hybrid: {
        strong: 'Los préstamos híbridos (ARM)',
        rest: ' usan la tasa inicial durante el periodo fijo y después recalculan la cuota en el mes de transición, para que el préstamo se siga amortizando dentro del plazo original a la tasa posterior.',
      },
      lumps: {
        strong: 'Los pagos extraordinarios',
        rest: ' se aplican al capital DESPUÉS de la cuota mensual ordinaria, así que no generan intereses ese mismo mes.',
      },
      penalties: {
        strong: 'Las penalizaciones por pago anticipado',
        rest: ' solo se aplican cuando el préstamo se liquida por completo en el último mes de la penalización o antes.',
      },
      note: 'Todo funciona en tu navegador. No se envía nada a ningún servidor. Usa el botón «Copiar enlace para compartir» para codificar todos los datos en una dirección que puedes pasar a otra persona.',
    },
    horizon: {
      heading: 'Si vendo o refinancio en...',
      lead: 'Un préstamo se ve muy distinto en el mes 36 que en el mes 360. Cada fila muestra la situación real de quien pidió el préstamo en esa fecha.',
      label: 'Horizonte: ',
      inputAria: 'Horizonte en meses (texto)',
      empty: 'Escribe datos válidos para ver la situación en cada horizonte.',
      principalRepaid: 'Capital devuelto',
      interestPaid: 'Intereses pagados',
      balanceRemaining: 'Saldo pendiente',
      totalCashOut: 'Desembolso total',
    },
    refi: {
      heading: 'Escenario de refinanciación',
      lead: 'Compara mantener un préstamo con refinanciarlo en un mes futuro. Es útil cuando bajan las tasas o cuando te planteas liquidar un ARM antes de que cambie su tasa.',
      whichLoan: '¿Qué préstamo refinanciar?',
      atMonth: 'Refinanciar en el mes',
      newRate: 'Nueva tasa (%)',
      newTerm: 'Nuevo plazo (meses)',
      newFee: 'Nuevos gastos iniciales',
      rollFee: 'Financiar los gastos iniciales dentro del nuevo préstamo',
      empty: 'Elige una entidad válida y escribe el mes, la tasa y el plazo de la refinanciación para ver el ahorro.',
      keepTotal: 'Mantener el préstamo actual: total',
      refiTotal: 'Refinanciar: total (de ambos tramos)',
      saves: 'La refinanciación ahorra',
      costsMore: 'La refinanciación cuesta más',
      breakEven: 'Punto de equilibrio (meses tras refinanciar)',
      breakEvenHint: 'Cuánto tiempo debe durar el nuevo préstamo para recuperar los gastos iniciales',
      breakEvenNever: 'La nueva cuota mensual no es más baja; los gastos iniciales no se recuperan',
    },
    disclaimer: {
      summary: 'Supuestos y advertencias',
      body: 'Los cálculos suponen capitalización mensual y pagos en su fecha. El APR se muestra como tasa anual nominal (tasa mensual × 12) calculada sobre la tabla contractual (sin pagos extra voluntarios), e incorpora la comisión de apertura y los gastos iniciales al costo efectivo del préstamo; cada jurisdicción decide qué otros costos (seguros obligatorios, cuentas vinculadas, impuestos) deben incluirse en su cifra oficial de APR/TAE, así que súmalos al campo de la comisión si quieres que se reflejen. Las hipotecas residenciales canadienses capitalizan semestralmente por ley, y los productos brasileños y algunos británicos usan otras convenciones de capitalización; en esos productos, las cifras con capitalización mensual de esta calculadora se desviarán ligeramente. Los préstamos a tasa variable reales siguen un índice más un margen y pueden tener topes de tasa que esta calculadora no aplica; la tasa posterior que escribes es tu mejor estimación para una prueba de estrés. No se modelan los impuestos sobre la propiedad, las cuotas de mantenimiento del edificio o de las zonas comunes, el seguro del hogar ni el tratamiento fiscal de los intereses del préstamo en tu jurisdicción. Es una comparación solo educativa; no es asesoramiento financiero. Para una comparación vinculante o asesoramiento personalizado, consulta a un intermediario hipotecario o a un asesor financiero con licencia.',
    },
    months: {
      na: 'n. d.',
      one: '1 mes',
      some: '{m} meses',
      years: '{y} a.',
      yearsOne: '{y} a. y 1 mes',
      yearsSome: '{y} a. y {m} meses',
    },
    engine: {
      errors: {
        principal: 'El capital debe ser mayor que cero.',
        payment: 'La cuota mensual debe ser mayor que cero.',
        belowInterest:
          'La cuota mensual es demasiado baja para liquidar el préstamo; ni siquiera cubre los intereses del primer mes.',
        notAmortizing: 'El préstamo no se amortiza en {months} meses. Aumenta la cuota mensual.',
        term: 'El plazo debe ser de al menos un mes.',
        amount: 'Escribe una cantidad del préstamo mayor que cero.',
        rate: 'Escribe una tasa de interés que no sea negativa.',
        initialFixed: 'El periodo fijo inicial debe ser un número positivo de meses.',
        termMin: 'Escribe un plazo de al menos un mes.',
        termMax: 'El plazo no puede superar los {months} meses.',
        paymentEnter: 'Escribe una cuota mensual mayor que cero.',
        hybridMode:
          'Los préstamos de tasa híbrida deben introducirse en modo de plazo (la cuota mensual se calcula).',
        refiOriginal: 'El préstamo original no es válido; no se puede calcular la refinanciación.',
        refiMonth: 'El mes de refinanciación debe ser al menos 1.',
        refiMonthEnd: 'El mes de refinanciación debe ser anterior al final del préstamo original.',
        refiRate: 'La nueva tasa no puede ser negativa.',
        refiTerm: 'El nuevo plazo debe ser de al menos 1 mes.',
        refiBalance: 'El préstamo original no tiene saldo pendiente en el mes de refinanciación.',
        newLoan: 'El préstamo nuevo no es válido.',
      },
      warnings: {
        precision:
          'Comprobación interna de precisión: la suma del capital es {sum} ≠ {expected}. Avísanos, por favor.',
        subsequentRate:
          'Tras el periodo fijo inicial, la tasa posterior es tan alta que la cuota recalculada apenas cubre los intereses.',
      },
    },
  },
};

/**
 * The Czech edition. Same shape and the same figures; vykání and „...“ quotes,
 * per `docs/i18n/cs-glossary.md`: úvěr, měsíční splátka, jistina, splátkový
 * kalendář, poskytovatel (the tool's "vendor"), mimořádná splátka, poplatek za
 * předčasné splacení, doba návratnosti, refinancování, marže.
 *
 * APR stays APR and is never called RPSN: the tool's figure is the US nominal
 * rate with the fee folded in, which agrees with the Czech and EU RPSN in
 * direction but not in method, and the answers say so. Month counts are
 * abbreviated (*3 r. 2 měs.*), which keeps them free of plural forms. Like the
 * Spanish page, a Czech page writes every amount the Czech way, in every
 * currency (`TOOL_AMOUNT_LOCALE`), and the two currency answers describe that.
 *
 * Register: the lessons'. The tool never names a winner among real offers, and
 * the Czech keeps that care: *rozpětí*, *výchozí hodnota*, never *nejlepší*.
 */
export const loanComparisonCs: typeof loanComparisonEn = {
  meta: {
    title: 'Srovnání úvěrů: nabídky vedle sebe, ve více měnách | nidhi',
    description:
      'Kalkulačka pro srovnání úvěrů zdarma. Porovnejte dvě až pět nabídek vedle sebe: měsíční splátka, doba splácení, úroky celkem, APR a celkové náklady. Více měn.',
  },
  schema: {
    name: 'Kalkulačka pro srovnání úvěrů nidhi',
    alternateNames: [
      'Srovnávač úvěrů nidhi',
      'Úvěrová kalkulačka nidhi',
      'Srovnávač úvěrů ve více měnách nidhi',
      'Úvěrová kalkulačka ve více měnách nidhi',
      'Srovnání úvěrů vedle sebe nidhi',
    ],
    operatingSystem: 'Libovolný operační systém (webový prohlížeč)',
    browserRequirements: 'Vyžaduje JavaScript. Moderní prohlížeč.',
    featureList: [
      'Porovnání 2 až 5 nabídek úvěru vedle sebe',
      'APR (roční procentní sazba) pro každou nabídku, zahrnující poplatky do jedné srovnatelné sazby',
      'Graf rozdělení splátky na úrok a jistinu u každého úvěru: kam jde každá splátka po celou dobu úvěru',
      'Podpora 38 měn, včetně USD, EUR, GBP, CHF, JPY, INR, CNY, CAD, AUD, SGD',
      'Výpočet měsíční splátky při pevné době splatnosti, nebo doby splácení při pevné splátce',
      'Modelování poplatku za sjednání a mimořádné měsíční splátky jistiny',
      'Pokročilý režim: hybridní úvěry (ARM) s přepočtem splátky při změně sazby, doba návratnosti bodů na snížení sazby, jednorázové mimořádné splátky, modelování poplatku za předčasné splacení',
      'Analýza horizontu („pokud prodám v měsíci N“): splacená jistina, zaplacené úroky, zbývající jistina a celkem vydané peníze u každého poskytovatele',
      'Scénář refinancování, který porovná „ponechat“ a „refinancovat“ včetně nákladů na uzavření a doby návratnosti',
      'Splátkový kalendář přesný na haléře, počítaný v celých číslech',
      'Odkaz ke sdílení na jakékoli srovnání, včetně všech pokročilých polí',
    ],
  },
  page: {
    breadcrumb: {
      home: 'Domů',
      this: 'Srovnání úvěrů',
    },
    eyebrow: 'Nástroje zdarma',
    title: {
      lead: 'Srovnání úvěrů',
      wide: ': porovnejte nabídky úvěrů vedle sebe',
    },
    lead: {
      before:
        'Zadejte dva až pět poskytovatelů. Uvidíte měsíční splátku, dobu splácení, celkem zaplacenou částku a APR, tedy jedno číslo nákladů, které zahrnuje poplatek do sazby.',
      wide: 'Podívejte se, jak se každá splátka dělí mezi úrok a jistinu. Podpora více měn: USD, EUR, GBP, INR, JPY a další.',
      after: 'Vše běží ve vašem prohlížeči; nic se neposílá na server.',
    },
    faq: {
      heading: 'Časté dotazy',
      groups: [
        {
          title: 'Začínáme',
          items: [
            {
              q: 'Jak tato kalkulačka pro srovnání úvěrů funguje?',
              a: 'U každého poskytovatele, kterého chcete porovnat, zadejte výši úvěru, roční úrokovou sazbu a buď dobu splatnosti v měsících, nebo měsíční splátku. Vedle sebe můžete porovnat dvě až pět nabídek. Kalkulačka pro každý úvěr sestaví celý splátkový kalendář a ukáže měsíční splátku, počet měsíců do splacení, úroky celkem, APR (které zahrnuje poplatek do sazby) a celkem zaplacenou částku.',
            },
            {
              q: 'Jaké úvěry můžu porovnat?',
              a: 'Hypotéky, úvěry na auto, spotřebitelské úvěry a studentské půjčky se standardním splácením. Kalkulačka zvládá úvěry s pevnou sazbou i hybridní úvěry (typu ARM), kde po počáteční pevné sazbě následuje jiná sazba. Období, kdy se splácí jen úrok, a velká závěrečná splátka (balónová) se nemodelují.',
            },
            {
              q: 'Kolik úvěrů můžu porovnat najednou?',
              a: 'Dva až pět. Stránka začíná dvěma kartami vedle sebe a jasně viditelnou dlaždicí „Přidat poskytovatele“, kterou můžete srovnání rozšířit až na pět nabídek. Každá karta má tlačítko pro odebrání, takže poskytovatele, který už nesedí, můžete vyřadit.',
            },
            {
              q: 'Můžu porovnat úvěry s různou dobou splatnosti nebo sazbou?',
              a: 'Ano. U všech porovnávaných úvěrů můžete libovolně kombinovat doby splatnosti, sazby, poplatky i měsíční splátky. Na každé kartě poskytovatele si zvolíte, zda se počítá měsíční splátka (pevná doba splatnosti), nebo doba splácení (pevná měsíční splátka).',
            },
            {
              q: 'Která pole jsou povinná?',
              a: 'Výše úvěru, roční úroková sazba a buď doba splatnosti v měsících, nebo měsíční splátka (podle toho, co chcete spočítat). Jsou označené červenou hvězdičkou. Všechna ostatní pole na kartě (poplatek za sjednání, mimořádná splátka jistiny, body, jednorázové splátky, poplatek za předčasné splacení, nastavení hybridní sazby) jsou volitelná a mohou zůstat na výchozí hodnotě.',
            },
            {
              q: 'Posílají se moje data někam?',
              a: 'Ne. Vše běží ve vašem prohlížeči; žádné údaje se neposílají na server. Při používání nástroje se do adresy stránky nic nezapisuje. Když zkopírujete odkaz ke sdílení, vaše hodnoty se vloží do odkazu za znak #, do části adresy, kterou prohlížeče nikdy neposílají na server, a stránka je odstraní z adresního řádku dřív, než se spustí analytika.',
            },
          ],
        },
        {
          title: 'APR a poplatky',
          items: [
            {
              q: 'Co je APR a jak se tady počítá?',
              a: 'APR (roční procentní sazba) zahrnuje počáteční poplatek do nákladů úvěru jako jednu roční sazbu, takže dvě nabídky s různými poplatky lze porovnat jedním číslem. Tato kalkulačka počítá APR tak, že poplatek bere jako srážku z jistiny vyplacené dlužníkovi předem a pak hledá měsíční sazbu, při které se současná hodnota smluvních splátek rovná této čisté částce. APR se uvádí jako nominální roční sazba (měsíční sazba × 12), což odpovídá zvyklosti v amerických informacích o úvěrech a směrem se shoduje s RPSN v EU, není však s ní totožné. Když je poplatek nulový, rovná se APR nominální sazbě.',
            },
            {
              q: 'Proč je APR obvykle vyšší než nabízená sazba?',
              a: 'Nabízená sazba oceňuje jen náklady samotné jistiny. APR oceňuje i poplatek, který dlužník platí, ale nemůže ho použít, takže efektivní sazba z peněz, které dlužník skutečně dostane, je vyšší. Dva úvěry se stejnou nabízenou sazbou mohou mít velmi odlišné APR a úvěr s nižší nabízenou sazbou může mít vyšší APR než úvěr s vyšší nabízenou sazbou bez poplatku. Podrobněji to rozebírá článek o podmínkách úvěrů.',
            },
            {
              q: 'Zahrnuje APR mimořádnou splátku jistiny, kterou plánuji platit každý měsíc?',
              a: 'Ne. APR měří smluvní náklady, které účtuje poskytovatel, ne dobrovolné kroky, které uděláte vy. Mimořádné splátky jistiny jsou volitelné a jejich zahrnutí by uváděné APR podhodnotilo. Graf „Kam jde každá splátka“ i řádek APR používají smluvní kalendář (bez mimořádných splátek); měsíční splátka, doba do splacení a celkem zaplacená částka odrážejí kalendář včetně vašich mimořádných splátek.',
            },
            {
              q: 'Mám do poplatku zahrnout povinné pojištění nebo produkty v balíčku?',
              a: 'Pokud poskytovatel k úvěru vyžaduje koupi dalšího produktu (životní pojištění, účet, investiční produkt), jsou náklady na tento produkt součástí skutečných nákladů úvěru. Pravidla pro to, zda se takové produkty musí započítat do oficiálně uváděné sazby, se liší podle země. Pro poctivé srovnání přičtěte celkové náklady povinného produktu v balíčku do pole poplatku. Zobrazené APR pak odráží náklady se vším všudy.',
            },
            {
              q: 'Zvládá kalkulačka poplatek za sjednání a náklady na uzavření?',
              a: 'Ano. Zadejte je do pole „Poplatek za sjednání a uzavření“ ve skupině „Náklady a poplatky“ na každé kartě poskytovatele. Poplatky se přičítají k celkové zaplacené částce, takže srovnání vedle sebe odráží skutečné náklady úvěru, a jsou zahrnuty do zobrazeného APR.',
            },
          ],
        },
        {
          title: 'Mimořádné splátky, body a poplatky za předčasné splacení',
          items: [
            {
              q: 'Můžu modelovat mimořádnou splátku jistiny každý měsíc?',
              a: 'Ano. Zadejte částku do pole „Mimořádná splátka jistiny měsíčně“ ve skupině „Mimořádné splátky“ na každé kartě poskytovatele. Kalkulačka ji každý měsíc použije přímo na jistinu, čímž zkrátí dobu splácení a sníží úroky celkem.',
            },
            {
              q: 'Jak se zadávají jednorázové mimořádné splátky?',
              a: 'Formát je měsíc:částka, položky oddělujte středníky. Například 12:5000;36:3000;60:10000 znamená mimořádnou splátku 5 000 v 12. měsíci, 3 000 v 36. měsíci a 10 000 v 60. měsíci. Každá jednorázová splátka se použije na jistinu AŽ PO běžné měsíční splátce za daný měsíc, takže ve stejném měsíci nenese úrok. Úvěr se obvykle splatí dřív než za smluvní dobu a úroky celkem odpovídajícím způsobem klesnou.',
            },
            {
              q: 'Jak funguje doba návratnosti bodů?',
              a: 'Body na snížení sazby (discount points) představují platbu předem, za kterou získáte nižší úrokovou sazbu. Zda se vyplatí, závisí na tom, jak dlouho úvěr ponecháte. Zadejte cenu bodů a snížení sazby, které za ně dostanete, a kalkulačka sestaví srovnávací variantu „bez bodů“ (stejný úvěr, poplatek bez ceny bodů, sazba vyšší o snížení) a obě porovná. Řádek „Doba návratnosti bodů“ ukazuje, kolik měsíců nižších splátek je potřeba, aby se platba předem vrátila. Pokud nová měsíční splátka ve skutečnosti nižší není, je doba návratnosti uvedena jako „nikdy“.',
            },
            {
              q: 'Jak funguje poplatek za předčasné splacení?',
              a: 'Některé úvěry účtují poplatek, pokud je splatíte předčasně. Zadejte poplatek jako procento ze zbývající jistiny a poslední měsíc, kdy platí. Poplatek se účtuje jen tehdy, když je úvěr celý splacen (jednorázovými splátkami, mimořádnými splátkami jistiny nebo refinancováním) v daném měsíci nebo dřív. Poplatky se přičítají k celkové zaplacené částce, takže srovnání vedle sebe odráží skutečné náklady předčasného splacení s poplatkem.',
            },
          ],
        },
        {
          title: 'Hybridní úvěry (ARM)',
          items: [
            {
              q: 'Jak kalkulačka zvládá hybridní úvěry (ARM 5/1, 7/1, 10/1)?',
              a: 'Ve skupině „Struktura sazby“ přepněte typ sazby na „Hybridní (ARM)“ a zadejte počáteční období fixace (například 60 měsíců u ARM 5/1) a sazbu, která platí po jeho skončení. Splátkový kalendář se až do měsíce změny počítá s počáteční sazbou a potom se splátka přepočítá: zbývající jistina se rozloží do zbývajících smluvních měsíců při následné sazbě, takže se úvěr i tak splatí v původní době. Zobrazené APR používá tento kalendář tak, jak by byl uveden, což odpovídá tomu, jak poskytovatelé uvádějí APR u skutečných produktů ARM.',
            },
            {
              q: 'Proč je hybridní možnost nedostupná, když je zvoleno „Měsíce do splacení“?',
              a: 'Hybridní úvěry potřebují pevnou smluvní dobu, aby kalkulačka mohla při změně sazby splátku přepočítat. Při výpočtu „Měsíce do splacení“ smluvní dobu nezadáváte (zadáváte místo ní pevnou měsíční splátku), takže přepočet není definovaný. Přepněte „Počítat“ na „Měsíční splátka“ a hybridní volba bude dostupná.',
            },
          ],
        },
        {
          title: 'Záložky analýzy',
          items: [
            {
              q: 'Co ukazuje graf „Kam jde každá splátka“?',
              a: 'Rozdělí typickou měsíční splátku z každého roku úvěru na úrokovou část a část jistiny, naskládané do jednoho sloupce. Každý sloupec má stejnou celkovou výšku (stejnou měsíční splátku), ale poměr se výrazně posouvá: v prvních letech tvoří skoro celou splátku úrok, v posledních letech skoro celou jistina. Proto mají mimořádné splátky v prvních letech dlouhého úvěru nepoměrně velký účinek; každé euro, o které jistinu snížíte brzy, nenese úrok po celou zbývající dobu.',
            },
            {
              q: 'Co je analýza horizontu („pokud prodám nebo refinancuji v...“)?',
              a: 'Úvěry vypadají v 36. měsíci úplně jinak než ve 360. měsíci. Záložka „Horizont“ se ptá: ve zvoleném měsíci, kolik jistiny je skutečně splaceno, kolik úroků zaplaceno, jaká je zbývající jistina a kolik peněz celkem už odešlo (splátky plus poplatky za sjednání)? To je správný pohled, pokud čekáte, že prodáte, přestěhujete se nebo budete refinancovat dlouho před smluvním koncem úvěru, protože poskytovatel s nejnižšími celkovými náklady za 360 měsíců nemusí být nejlevnější, pokud úvěr ukončíte v 60. měsíci.',
            },
            {
              q: 'Jak funguje scénář refinancování?',
              a: 'Vyberte, který úvěr refinancovat, měsíc refinancování, novou sazbu, novou dobu splatnosti a případné náklady na uzavření. Kalkulačka porovná celkem vydané peníze u varianty „ponechat původní úvěr až do konce“ a varianty „platit původní splátky do měsíce refinancování a pak zbývající jistinu splatit novým úvěrem, který poběží do svého smluvního konce“. Uvádí také dobu návratnosti: kolik měsíců nižších splátek je potřeba, než se náklady na uzavření refinancování vrátí. Pokud nová měsíční splátka nižší není, je doba návratnosti „nikdy“.',
            },
          ],
        },
        {
          title: 'Sdílení a přesnost',
          items: [
            {
              q: 'Obsahují odkazy ke sdílení vše potřebné?',
              a: 'Ano. Odkaz ke sdílení obsahuje každý údaj, který příjemce potřebuje: každé pole u každého poskytovatele (typ sazby, hybridní kalendář, body, jednorázové splátky, poplatek za předčasné splacení), měnu, aktivní záložku analýzy a údaje pro horizont a scénář refinancování. Příjemce uvidí stejný pohled jako vy, se všemi vašimi údaji. Adresa obsahuje jen hodnoty, které se liší od výchozích, takže nové srovnání dá krátký odkaz.',
            },
            {
              q: 'Jak přesné jsou výpočty?',
              a: 'Celý splátkový kalendář se počítá v celých haléřích (centech), aby nevznikaly chyby zaokrouhlování v plovoucí čárce. Vzorec pro měsíční splátku se zaokrouhlí na nejbližší haléř a poslední splátka každého kalendáře se dorovná tak, aby součet splátek jistiny přesně odpovídal původní výši úvěru. APR se hledá metodou půlení intervalu v rovnici současné hodnoty nad stejným kalendářem v celých haléřích, s přesností výrazně vyšší, než vyžadují skutečně uváděné údaje poskytovatelů.',
            },
          ],
        },
        {
          title: 'Podpora více měn',
          items: [
            {
              q: 'Které měny jsou podporované?',
              a: 'Podporovaných měn je třicet osm, mezi nimi euro (EUR), americký dolar (USD), britská libra (GBP), švýcarský frank (CHF), japonský jen (JPY), indická rupie (INR), čínský jüan (CNY), kanadský dolar (CAD), australský dolar (AUD), singapurský dolar (SGD), bangladéšská taka (BDT), keňský šilink (KES), západoafrický a středoafrický frank CFA (XOF, XAF) a hlavní severské, středoevropské, latinskoamerické, jihoasijské, jihovýchodoasijské a africké měny. Všechny částky se píšou tak, jak se v češtině píšou čísla, se symbolem nebo kódem za číslem (1 234 567,80 €, 1 234 567,80 ₹), a každá měna si ponechává svá desetinná místa: JPY například desetinná místa nepoužívá.',
            },
            {
              q: 'Co tu znamená „více měn“?',
              a: 'Znamená to, že kalkulačka pracuje ve zvolené měně: výsledky nesou její symbol a desetinná místa, zapsané tak, jak se v češtině píšou čísla. Výpočty jsou totožné: anuitní úvěr s pevnou sazbou se chová stejně, ať jednotkám říkáte dolary, rupie, nebo jeny. Všechny úvěry v jednom srovnání sdílejí jednu měnu, protože porovnávat nominální splátky v různých měnách (bez aktuálního kurzu) by bylo zavádějící.',
            },
          ],
        },
      ],
    },
    related: {
      heading: 'Než cokoli podepíšete',
      lead: 'Volba, která bude dávat smysl i za pět let.',
      items: [
        {
          kicker: 'Jak porovnávat',
          title: 'Podmínky úvěrů srozumitelně',
          desc: 'APR, splácení, pevná a pohyblivá sazba, poplatky za předčasné splacení: drobné písmo, které rozhoduje o tom, která nabídka má nejnižší celkové náklady.',
        },
        {
          kicker: 'Než si půjčíte',
          title: 'Nejdřív finanční rezerva',
          desc: 'Pokud by vás jeden špatný měsíc donutil vynechat splátku, je úvěr příliš velký. Mnoho lidí si proto před půjčkou vytváří rezervu.',
        },
        {
          kicker: 'Myšlenkový model',
          title: 'Zhodnocení a znehodnocení',
          desc: 'Dům může během splácení získat na hodnotě. Auto ji obvykle ztrácí. Stejná měsíční splátka neznamená stejný obchod.',
        },
        {
          kicker: 'Po podpisu',
          title: 'Jak se dostat z dluhů',
          desc: 'Praktický postup, jak splácet, co dlužíte, bez vyhoření v polovině cesty.',
        },
        {
          kicker: 'Základy',
          title: 'Co se počítá jako závazek',
          desc: 'Rozdíl mezi dluhem, který něco buduje, a dluhem, který domácnost jen vysává.',
        },
      ],
      footerTag: 'Další články o dluzích a úvěrech',
      footerAll: 'Nebo procházejte všechny články',
    },
  },
  island: {
    currencies: currenciesCs,
    toolbar: {
      aria: 'Akce srovnání úvěrů',
      currencyLabel: 'Měna zobrazení',
      currencyHelp: 'Všechny úvěry v tomto srovnání používají tento formát.',
      sample: 'Ukázka:',
      share: 'Kopírovat odkaz ke sdílení',
      shareCopied: 'Odkaz zkopírován',
      shareTitle: 'Zkopírovat odkaz, který obsahuje všechny údaje o úvěrech',
      reset: 'Obnovit výchozí hodnoty',
      resetTitle: 'Smazat všechna data a začít znovu',
      copiedBar: 'Odkaz zkopírován do schránky',
      shareUrlAria: 'Adresa odkazu ke sdílení',
      shareStatus: 'Odkaz ke sdílení zkopírován do schránky.',
      copyPrompt: 'Zkopírujte tento odkaz:',
    },
    phoneTabs: {
      groupAria: 'Zobrazený poskytovatel',
      tabName: 'Poskytovatel {label}',
      add: 'Přidat',
      addAria: 'Přidat dalšího poskytovatele ke srovnání ({n} z {max})',
      addCard: 'Přidat poskytovatele',
      addCardHint: 'Porovnejte nabídky (max. {max})',
    },
    card: {
      badge: 'Poskytovatel {label}',
      removeAria: 'Odebrat poskytovatele {label} ze srovnání',
      removeTitle: 'Odebrat ze srovnání',
      name: 'Název poskytovatele',
      principal: 'Výše úvěru',
      rate: 'Roční úroková sazba (%)',
      solveFor: 'Počítat',
      modeTerm: 'Měsíční splátka',
      modePayment: 'Měsíce do splacení',
      term: 'Doba splatnosti (měsíce)',
      monthly: 'Měsíční splátka',
      requiredTitle: 'Povinné',
      optionalTitle: 'Volitelné podrobnosti úvěru',
      optionalSingle: '{status}, bez poplatků a mimořádných splátek',
      optionalMulti: '{status}: {rest}',
      statusHybrid: 'Hybridní (ARM)',
      statusFixed: 'Pevná sazba',
      statusFees: 'poplatky',
      statusPrepayments: 'mimořádné splátky',
      statusPenalty: 'poplatek za předčasné splacení',
      rateStructure: {
        title: 'Struktura sazby',
        hint: 'Pevná, nebo nejdřív pevná a pak pohyblivá (ARM)',
      },
      rateTypeAria: 'Typ sazby',
      fixed: 'Pevná',
      hybrid: 'Hybridní (ARM)',
      hybridHint: {
        before: 'Hybridní úvěry (ARM) potřebují pevnou dobu splatnosti. Přepněte výše volbu ',
        solveFor: 'Počítat',
        mid: ' na hodnotu ',
        modeTerm: 'Měsíční splátka',
        after: ' a pole ARM budou dostupná.',
      },
      initialFixed: 'Počáteční období fixace (měsíce)',
      initialFixedHelp: 'Obvykle: 60 (ARM 5/1), 84 (7/1), 120 (10/1).',
      subsequentRate: 'Následná sazba (%)',
      subsequentRateHelp:
        'Sazba po skončení fixace. Skutečné úvěry ARM sledují referenční sazbu; tohle je váš odhad pro zátěžový test.',
      costs: {
        title: 'Náklady a poplatky',
        hint: 'Sjednání, uzavření a body na snížení sazby',
      },
      fee: 'Poplatek za sjednání a uzavření',
      pointsCost: 'Cena bodů na snížení sazby',
      pointsCostHelp:
        'Už započítaná v poplatku výše. Když ji zadáte ještě sem, kalkulačka ukáže dobu návratnosti bodů.',
      pointsReduction: 'Snížení sazby díky bodům (p. b.)',
      pointsReductionHelp: 'Např. 0,25 znamená, že body sníží sazbu o 0,25 procentního bodu.',
      prepayments: {
        title: 'Mimořádné splátky',
        hint: 'Splácet navíc každý měsíc nebo jednorázově',
      },
      extra: 'Mimořádná splátka jistiny měsíčně',
      lumps: 'Jednorázové mimořádné splátky',
      lumpsHelp: {
        before: 'Formát: ',
        format: 'měsíc:částka',
        mid: ', oddělené středníkem. Např. ',
        after: ' znamená 5 000 ve 12. měsíci a 3 000 ve 36. měsíci.',
      },
      penalty: {
        title: 'Poplatek za předčasné splacení',
        hint: 'Některé úvěry účtují poplatek za splacení před koncem',
      },
      penaltyPct: 'Poplatek (% ze zbývající jistiny)',
      penaltyUntil: 'Poplatek platí do (měsíce)',
      penaltyUntilHelp:
        'Pokud poplatek není, nechte 0. Účtuje se jen tehdy, když je úvěr splacen v tomto měsíci nebo dřív.',
    },
    results: {
      monthly: 'Měsíčně',
      monthlyExtra: '{base} + {extra} navíc',
      apr: 'APR',
      aprNa: 'není k dispozici',
      aprFees: 'Včetně poplatků',
      aprNoFees: 'Bez poplatků',
      totalPaid: 'Zaplaceno celkem',
      showDetails: 'Zobrazit podrobnosti',
      timeToPayoff: 'Doba do splacení',
      paymentsOne: '1 splátka',
      paymentsMany: '{n} splátek',
      paymentsFew: '{n} splátky',
      totalInterest: 'Úroky celkem',
      fees: 'Poplatky',
      penalty: 'Poplatek za předčasné splacení',
      penaltyHint: 'Účtováno, protože úvěr byl splacen předčasně v době, kdy poplatek platí',
      breakEven: 'Doba návratnosti bodů',
      never: 'nikdy',
      breakEvenSaves: 'Za celou dobu ušetří {amount}',
      breakEvenNever: 'Body nesníží měsíční splátku natolik, aby se vrátily',
    },
    delta: {
      heading: 'Vedle sebe',
      empty: 'Zadejte platné údaje alespoň u dvou poskytovatelů a uvidíte, jak si stojí.',
      sameBefore: 'Všichni poskytovatelé vycházejí na stejné celkové náklady ',
      sameAfter: '.',
      rangeBefore: 'Celkové náklady se u poskytovatelů níže pohybují od ',
      rangeTo: ' do ',
      rangeAcross: ': rozpětí ',
      rangeAfter: '.',
      metricAria: 'Ukazatel',
      monthlyPayment: 'Měsíční splátka',
      monthsToPayoff: 'Měsíce do splacení',
      aprInclFees: 'APR (vč. poplatků)',
      totalInterest: 'Úroky celkem',
      totalPaid: 'Zaplaceno celkem',
      diffRow: 'Rozdíl oproti nejnižším celkovým nákladům',
      baseline: 'výchozí',
      baselineAria: 'výchozí hodnota (nejnižší celkové náklady)',
    },
    tabs: {
      aria: 'Analýza',
      listAria: 'Pohledy analýzy',
      charts: {
        label: 'Grafy',
        hint: 'Zbývající jistina v čase a rozdělení každé splátky',
      },
      horizon: {
        label: 'Horizont',
        hint: 'Kde stojíte, pokud prodáte nebo refinancujete dřív',
      },
      refi: {
        label: 'Refinancování',
        hint: 'Porovnání ponechání a refinancování s dobou návratnosti',
      },
      how: {
        label: 'Jak to funguje',
        hint: 'Vzorec a metodika',
      },
    },
    charts: {
      balanceHeading: 'Zbývající jistina v čase',
      balanceLead:
        'Každá čára je zbývající jistina jednoho poskytovatele, měsíc po měsíci. Tečka na ose označuje, kdy je úvěr splacen.',
      splitHeading: 'Kam jde každá splátka',
      splitLead:
        'Každý měsíc stejná splátka. Na začátku tvoří skoro celou splátku úrok; ke konci skoro celou splátku jistina.',
      vendorLabel: 'Poskytovatel',
      autoOption: 'Automaticky (nejnižší celkové náklady)',
      incomplete: ' (neúplná data)',
      splitEmpty:
        'Zadejte výše platné údaje a uvidíte, jak se každá splátka dělí mezi úrok a jistinu.',
      caption: {
        before: 'Zobrazeno: ',
        afterName: ', smluvní splátkový kalendář',
        noExtras: ' (bez volitelných mimořádných splátek jistiny; pohled odpovídající APR)',
        extraBefore: '. Mimořádná splátka v ',
        yearEarly: '1. roce',
        extraMid: ' ušetří úroky z této částky na 25 let; stejná splátka ve ',
        yearLate: '24. roce',
        extraAfter: ' neušetří skoro nic.',
      },
    },
    balance: {
      empty: 'Zadejte výše platné údaje a uvidíte graf splácení.',
      ariaPrefix: 'Zbývající jistina úvěru v čase. ',
      seriesLine: '{name}: začíná na {amount}, splaceno za {months}.',
      start: 'Začátek',
      year: 'Rok {y}',
      month: 'Měsíc {m}',
      yearMonth: 'Rok {y}, měsíc {m}',
      paidOff: 'Splaceno, úroky {interest}',
      left: 'Zbývá {balance}, úroky {interest}',
      legendNote: 'splaceno za {months}',
      swipe: 'Přejeďte prstem a uvidíte celý graf →',
      groupAria:
        'Graf zbývající jistiny. Jednotlivé roky přečtete šipkami doleva a doprava, s klávesou Shift po měsících.',
      title: 'Zbývající jistina úvěru v čase',
      axisYears: 'Roky',
      hint: 'Ukažte na graf, klepněte na něj nebo použijte šipky a přečtěte zbývající jistinu v kterémkoli roce.',
      tableCaption: 'Zbývající jistina úvěru v čase, vybrané měsíce',
    },
    split: {
      ariaPrefix: 'Kam jde každá měsíční splátka, poskytovatel {vendor}. ',
      ariaRow: '{when}: úrok {interest} ({pct} %), jistina {principal}.',
      title: 'Kam jde každá splátka',
      eyebrowInterest: 'ÚROK',
      eyebrowPrincipal: 'JISTINA',
      footnote: 'Každý měsíc stejná splátka, mění se poměr',
      tableCaption: 'Rozdělení na úrok a jistinu pro poskytovatele {vendor}, vybrané okamžiky během splácení úvěru',
    },
    words: {
      month: 'Měsíc',
      payment: 'Splátka',
      interest: 'Úrok',
      principal: 'Jistina',
    },
    how: {
      heading: 'Jak srovnání funguje',
      intro:
        'Pro každého poskytovatele kalkulačka sestaví celý splátkový kalendář podle standardního anuitního vzorce:',
      symbols: {
        p: ' je jistina úvěru, ',
        r: ' je měsíční úroková sazba (roční sazba ÷ 12) a ',
        n: ' je počet měsíčních splátek.',
      },
      monthly:
        'Úrok každého měsíce se počítá ze zbývající jistiny, splátka se rozdělí mezi úrok a jistinu a jistina se sníží. Výpočet běží na haléře přesně.',
      apr: {
        strong: 'APR',
        rest: ' zahrnuje poplatek za sjednání a uzavření do sazby tak, že ho bere jako srážku předem z toho, co skutečně dostanete, a pak hledá měsíční sazbu, při které se současná hodnota smluvních splátek rovná této čisté částce. Uvádí se jako nominální roční sazba (měsíční sazba × 12), podle zvyklosti amerických informací o úvěrech.',
      },
      hybrid: {
        strong: 'Hybridní úvěry (ARM)',
        rest: ' používají po dobu fixace počáteční sazbu a v měsíci změny splátku přepočítají, aby se úvěr při následné sazbě i tak splatil v původní době.',
      },
      lumps: {
        strong: 'Jednorázové mimořádné splátky',
        rest: ' se použijí na jistinu AŽ PO běžné měsíční splátce, takže ve stejném měsíci nenesou úrok.',
      },
      penalties: {
        strong: 'Poplatky za předčasné splacení',
        rest: ' se uplatní jen tehdy, když je úvěr celý splacen v posledním měsíci platnosti poplatku nebo dřív.',
      },
      note: 'Vše běží ve vašem prohlížeči. Nic se neposílá na server. Tlačítkem „Kopírovat odkaz ke sdílení“ uložíte všechny údaje do adresy, kterou můžete předat někomu dalšímu.',
    },
    horizon: {
      heading: 'Pokud prodám nebo refinancuji v...',
      lead: 'Úvěry vypadají v 36. měsíci úplně jinak než ve 360. měsíci. Každý řádek ukazuje, kde dlužník k tomuto datu skutečně stojí.',
      label: 'Horizont: ',
      inputAria: 'Horizont v měsících (text)',
      empty: 'Zadejte platné údaje a uvidíte stav k danému horizontu.',
      principalRepaid: 'Splacená jistina',
      interestPaid: 'Zaplacené úroky',
      balanceRemaining: 'Zbývající jistina',
      totalCashOut: 'Celkem vydáno',
    },
    refi: {
      heading: 'Scénář refinancování',
      lead: 'Porovnejte ponechání úvěru s jeho refinancováním v budoucím měsíci. Hodí se, když sazby klesnou nebo zvažujete splacení úvěru ARM před změnou sazby.',
      whichLoan: 'Který úvěr refinancovat?',
      atMonth: 'Refinancovat v měsíci',
      newRate: 'Nová sazba (%)',
      newTerm: 'Nová doba splatnosti (měsíce)',
      newFee: 'Nové náklady na uzavření',
      rollFee: 'Přičíst náklady na uzavření k nové jistině',
      empty: 'Vyberte platného poskytovatele a zadejte měsíc refinancování, sazbu a dobu splatnosti a uvidíte úsporu.',
      keepTotal: 'Ponechat současný úvěr: celkem',
      refiTotal: 'Refinancovat: celkem (obě části)',
      saves: 'Refinancování ušetří',
      costsMore: 'Refinancování stojí víc',
      breakEven: 'Doba návratnosti (měsíce po refinancování)',
      breakEvenHint: 'Jak dlouho musí nový úvěr běžet, aby se náklady na uzavření vrátily',
      breakEvenNever: 'Nová měsíční splátka není nižší; náklady na uzavření se nevrátí',
    },
    disclaimer: {
      summary: 'Předpoklady a upozornění',
      body: 'Výpočty předpokládají měsíční úročení a včasné splátky. APR se zobrazuje jako nominální roční sazba (měsíční sazba × 12), počítaná ze smluvního kalendáře (bez dobrovolných splátek navíc), a zahrnuje poplatek za sjednání a uzavření do efektivních nákladů úvěru; země se liší v tom, které další náklady (povinné pojištění, účty, daně) se musí započítat do oficiálně uváděné sazby (v EU RPSN), takže pokud je chcete zohlednit, přičtěte je do pole poplatku. Kanadské hypotéky na bydlení se ze zákona úročí pololetně a brazilské a některé britské produkty používají jiné zvyklosti úročení; u takových produktů budou zdejší čísla s měsíčním úročením mírně odlišná. Skutečné úvěry s pohyblivou sazbou sledují referenční sazbu plus marži a mohou mít stropy sazby, které tato kalkulačka neuplatňuje; zadaná následná sazba je váš nejlepší odhad pro zátěžový test. Daň z nemovitostí, poplatky za správu domu, pojištění nemovitosti a daňové zacházení s úroky z úvěru ve vaší zemi se nemodelují. Jen vzdělávací srovnání; nejde o finanční poradenství. Pro závazné srovnání úvěrů nebo osobní radu se obraťte na hypotečního zprostředkovatele s příslušným oprávněním nebo finančního poradce s příslušným oprávněním.',
    },
    months: {
      na: 'není k dispozici',
      one: '1 měs.',
      some: '{m} měs.',
      years: '{y} r.',
      yearsOne: '{y} r. 1 měs.',
      yearsSome: '{y} r. {m} měs.',
    },
    engine: {
      errors: {
        principal: 'Jistina musí být větší než nula.',
        payment: 'Měsíční splátka musí být větší než nula.',
        belowInterest:
          'Měsíční splátka je příliš nízká na to, aby úvěr kdy splatila; nepokryje ani úrok za první měsíc.',
        notAmortizing: 'Úvěr se během {months} měs. nesplatí. Zvyšte měsíční splátku.',
        term: 'Doba splatnosti musí být alespoň jeden měsíc.',
        amount: 'Zadejte výši úvěru větší než nula.',
        rate: 'Zadejte nezápornou úrokovou sazbu.',
        initialFixed: 'Počáteční období fixace musí být kladný počet měsíců.',
        termMin: 'Zadejte dobu splatnosti alespoň jeden měsíc.',
        termMax: 'Doba splatnosti nesmí přesáhnout {months} měs.',
        paymentEnter: 'Zadejte měsíční splátku větší než nula.',
        hybridMode: 'Úvěry s hybridní sazbou se musí zadávat v režimu doby splatnosti (měsíční splátka se dopočítá).',
        refiOriginal: 'Původní úvěr je neplatný; refinancování nelze spočítat.',
        refiMonth: 'Měsíc refinancování musí být alespoň 1.',
        refiMonthEnd: 'Měsíc refinancování musí být před koncem původního úvěru.',
        refiRate: 'Nová sazba nesmí být záporná.',
        refiTerm: 'Nová doba splatnosti musí být alespoň 1 měsíc.',
        refiBalance: 'Původní úvěr nemá v měsíci refinancování žádnou zbývající jistinu.',
        newLoan: 'Nový úvěr není platný.',
      },
      warnings: {
        precision:
          'Interní kontrola přesnosti: součet jistiny {sum} ≠ {expected}. Nahlaste nám to prosím.',
        subsequentRate:
          'Po počátečním období fixace je následná sazba tak vysoká, že přepočtená splátka sotva pokryje úrok.',
      },
    },
  },
};

/** Marathi. Vocabulary from docs/i18n/mr-glossary.md. */
export const loanComparisonMr: typeof loanComparisonEn = {
  meta: {
    title: 'कर्जांची तुलना करणारा कॅल्क्युलेटर: शेजारी शेजारी, अनेक चलनांत | nidhi',
    description: 'मोफत कॅल्क्युलेटर: कर्जाच्या दोन ते पाच ऑफरची शेजारी शेजारी तुलना करा: मासिक हप्ता, परतफेडीचा काळ, एकूण व्याज, APR आणि एकूण खर्च. अनेक चलनांमध्ये.',
  },
  schema: {
    name: 'nidhi कर्जांची तुलना करणारा कॅल्क्युलेटर',
    alternateNames: [
      'nidhi कर्ज तुलना साधन',
      'nidhi कर्ज कॅल्क्युलेटर',
      'nidhi अनेक चलनांतील कर्ज तुलना साधन',
      'nidhi अनेक चलनांतील कर्ज कॅल्क्युलेटर',
      'nidhi कर्जांची शेजारी शेजारी तुलना',
    ],
    operatingSystem: 'कोणतेही (वेब ब्राउझर)',
    browserRequirements: 'JavaScript आवश्यक. आधुनिक ब्राउझर.',
    featureList: [
      'कर्जाच्या 2 ते 5 ऑफरची शेजारी शेजारी तुलना',
      'प्रत्येक ऑफरसाठी APR (वार्षिक टक्केवारी दर), ज्यात शुल्क एकाच, तुलना करता येणाऱ्या दरात सामावलेले असते',
      'प्रत्येक कर्जासाठी व्याज आणि मुद्दल यांच्या विभागणीचा आलेख, कर्जाच्या संपूर्ण काळात प्रत्येक हप्ता कुठे जातो हे दाखवणारा',
      '38 चलनांची सोय, ज्यात INR, USD, EUR, GBP, CHF, JPY, CNY, CAD, AUD, SGD',
      'ठरावीक मुदतीसाठी मासिक हप्ता काढा, किंवा ठरावीक हप्त्यासाठी परतफेडीचा काळ काढा',
      'कर्जप्रक्रिया शुल्क आणि दरमहा अतिरिक्त मुद्दल यांचे गणित',
      'प्रगत पर्याय: बदलाच्या वेळी हप्त्यांची पुनर्गणना असलेली हायब्रिड (ARM) कर्जे, डिस्काउंट पॉइंट्सचा खर्च वसूल होण्याचा टप्पा, एकरकमी मुदतपूर्व परतफेड, मुदतपूर्व परतफेडीवरील दंड',
      'कालावधीचे विश्लेषण (“N व्या महिन्यात विक्री केली तर”): प्रत्येक कर्जदात्यासाठी फेडलेले मुद्दल, भरलेले व्याज, बाकी कर्ज आणि खर्च झालेली एकूण रक्कम',
      'पुनर्वित्त परिदृश्य: “तसेच ठेवा” विरुद्ध “पुनर्वित्त करा”, व्यवहार खर्च आणि खर्च वसूल होण्याच्या टप्प्यासह',
      'पैशापर्यंत अचूक, पूर्णांकांवर आधारित कर्जफेडीचे वेळापत्रक',
      'कोणत्याही तुलनेची शेअर करता येणारी URL, सर्व प्रगत रकान्यांसह',
    ],
  },
  page: {
    breadcrumb: {
      home: 'मुख्यपृष्ठ',
      this: 'कर्जांची तुलना करणारा कॅल्क्युलेटर',
    },
    eyebrow: 'मोफत साधने',
    title: {
      lead: 'कर्जांची तुलना करणारा कॅल्क्युलेटर',
      wide: ': कर्जाच्या ऑफरची शेजारी शेजारी तुलना करा',
    },
    lead: {
      before: 'दोन ते पाच कर्जदात्यांची माहिती भरा. मासिक हप्ता, परतफेडीचा काळ, भरलेली एकूण रक्कम आणि APR पाहा; APR म्हणजे शुल्क व्याजदरात सामावून घेणारा एकाच आकड्यातील खर्च.',
      wide: 'प्रत्येक हप्ता व्याज आणि मुद्दल यांच्यात कसा विभागला जातो ते पाहा. INR, USD, EUR, GBP, JPY आणि आणखी चलनांची सोय.',
      after: 'सगळे तुमच्या ब्राउझरमध्ये चालते; सर्व्हरकडे काहीही पाठवले जात नाही.',
    },
    faq: {
      heading: 'वारंवार विचारले जाणारे प्रश्न',
      groups: [
        {
          title: 'सुरुवात',
          items: [
            {
              q: 'हा कर्जांची तुलना करणारा कॅल्क्युलेटर कसा काम करतो?',
              a: 'तुम्हाला ज्या प्रत्येक कर्जदात्याची तुलना करायची आहे त्याच्यासाठी कर्जाची रक्कम, वार्षिक व्याजदर, आणि महिन्यांतील मुदत किंवा मासिक हप्ता यांपैकी एक भरा. कर्जाच्या दोन ते पाच ऑफरची शेजारी शेजारी तुलना करता येते. कॅल्क्युलेटर प्रत्येक कर्जासाठी कर्जफेडीचे संपूर्ण वेळापत्रक तयार करतो आणि मासिक हप्ता, परतफेडीपर्यंतचे एकूण महिने, एकूण व्याज, APR (जो शुल्क व्याजदरात सामावून घेतो) आणि भरलेली एकूण रक्कम दाखवतो.',
            },
            {
              q: 'कोणत्या प्रकारच्या कर्जांची तुलना करता येते?',
              a: 'नेहमीच्या परतफेड योजनांवरील गहाण कर्जे, वाहन कर्जे, वैयक्तिक कर्जे आणि शैक्षणिक कर्जे. कॅल्क्युलेटर ठरावीक दराची कर्जे आणि हायब्रिड (ARM प्रकारची) कर्जे हाताळतो, ज्यात सुरुवातीच्या ठरावीक दरानंतर वेगळा दर लागू होतो. फक्त व्याज भरण्याचे कालावधी आणि शेवटी एकरकमी मोठा हप्ता (balloon payment) यांचे गणित यात नाही.',
            },
            {
              q: 'एका वेळी किती कर्जांची तुलना करता येते?',
              a: 'दोन ते पाच. पान दोन शेजारी शेजारी कार्डांनी सुरू होते, आणि स्पष्ट दिसणाऱ्या “कर्जदाता जोडा” या टाइलने तुलना जास्तीत जास्त पाच ऑफरपर्यंत वाढवता येते. प्रत्येक कार्डवर काढून टाकण्याचे बटण असते, त्यामुळे तुलनेत नको असलेला कर्जदाता तुम्ही वगळू शकता.',
            },
            {
              q: 'वेगवेगळ्या मुदती किंवा दरांच्या कर्जांची तुलना करता येते का?',
              a: 'हो. तुम्ही तुलना करत असलेल्या प्रत्येक कर्जासाठी वेगवेगळ्या मुदती, दर, शुल्क आणि मासिक हप्ते वापरू शकता. प्रत्येक कर्जदात्याच्या कार्डवर मासिक हप्ता (ठरावीक मुदत) काढायचा की परतफेडीचा काळ (ठरावीक मासिक हप्ता), हे निवडता येते.',
            },
            {
              q: 'कोणते रकाने आवश्यक आहेत?',
              a: 'कर्जाची रक्कम, वार्षिक व्याजदर, आणि महिन्यांतील मुदत किंवा मासिक हप्ता (तुम्हाला काय काढायचे आहे त्यानुसार). यांच्यावर लाल तारका असते. कार्डवरील इतर प्रत्येक रकाना (कर्जप्रक्रिया शुल्क, अतिरिक्त मुद्दल, पॉइंट्स, एकरकमी रकमा, मुदतपूर्व परतफेडीवरील दंड, हायब्रिड दराचा तपशील) ऐच्छिक आहे आणि तो पूर्वनिश्चित मूल्यावर ठेवता येतो.',
            },
            {
              q: 'माझा डेटा कुठे पाठवला जातो का?',
              a: 'नाही. सगळे तुमच्या ब्राउझरमध्ये चालते; कोणतीही माहिती कोणत्याही सर्व्हरकडे पाठवली जात नाही. साधन वापरताना पानाच्या पत्त्यात काहीही जात नाही. तुम्ही शेअर लिंक कॉपी करता तेव्हा तुमची मूल्ये लिंकमध्ये # चिन्हानंतर जातात, पत्त्याचा हा भाग ब्राउझर कधीच सर्व्हरकडे पाठवत नाहीत, आणि वापराचे विश्लेषण सुरू होण्यापूर्वी पान ती पत्त्याच्या पट्टीतून काढून टाकते.',
            },
          ],
        },
        {
          title: 'APR आणि शुल्क',
          items: [
            {
              q: 'APR म्हणजे काय आणि इथे तो कसा काढला जातो?',
              a: 'APR (वार्षिक टक्केवारी दर) सुरुवातीचे शुल्क कर्जाच्या खर्चात एकाच वार्षिक दराच्या रूपात सामावून घेतो, म्हणजे वेगवेगळ्या शुल्कांच्या दोन ऑफरची एकाच आकड्यावर तुलना करता येते. हा कॅल्क्युलेटर शुल्क हे कर्जदाराला दिलेल्या मुद्दलातून सुरुवातीलाच झालेली वजावट मानतो, आणि मग असा मासिक दर काढतो ज्यावर कराराप्रमाणेच्या हप्त्यांचे वर्तमान मूल्य त्या निव्वळ रकमेइतके होते. APR नाममात्र वार्षिक दर म्हणून (मासिक दर × 12) दाखवला जातो, जो अमेरिकेतील कर्जाच्या माहितीपत्रकांच्या पद्धतीशी जुळतो आणि युरोपियन युनियनच्या APRC शी साधारण सुसंगत आहे. शुल्क शून्य असेल तर APR नाममात्र दराइतकाच असतो.',
            },
            {
              q: 'APR सहसा जाहिरातीतील दरापेक्षा जास्त का असतो?',
              a: 'जाहिरातीतील दर फक्त मुद्दलाचा खर्च धरतो. APR शुल्कही धरतो, जे कर्जदार भरतो पण वापरू शकत नाही, त्यामुळे कर्जदाराला प्रत्यक्ष मिळालेल्या पैशांवर तो भरत असलेला परिणामकारक दर जास्त असतो. सारखाच जाहिरातीतील दर असलेल्या दोन कर्जांचे APR खूप वेगळे असू शकतात, आणि कमी जाहिरातीतील दर असलेल्या कर्जाचा APR, जास्त जाहिरातीतील दर असलेल्या पण शुल्क नसलेल्या कर्जापेक्षा जास्त असू शकतो. सविस्तर माहितीसाठी कर्जाच्या अटी समजून घेण्यावरचा लेख पाहा.',
            },
            {
              q: 'मी दरमहा भरणार असलेले अतिरिक्त मुद्दल APR मध्ये धरले जाते का?',
              a: 'नाही. APR हे कर्जदाता आकारत असलेल्या कराराप्रमाणेच्या खर्चाचे मोजमाप आहे, तुम्ही स्वेच्छेने करत असलेल्या कृतींचे नाही. अतिरिक्त मुद्दल भरणे ऐच्छिक आहे, आणि ते धरल्यास जाहीर APR प्रत्यक्षापेक्षा कमी दिसेल. “प्रत्येक हप्ता कुठे जातो” हा आलेख आणि APR ची ओळ दोन्ही कराराचे वेळापत्रक (अतिरिक्त मुद्दलाशिवाय) वापरतात; मासिक हप्ता, परतफेडीचा काळ आणि भरलेली एकूण रक्कम हे आकडे तुमच्या अतिरिक्त भरण्यांसह असलेल्या वेळापत्रकावर आधारित असतात.',
            },
            {
              q: 'सक्तीचा विमा किंवा सोबत जोडलेली उत्पादने शुल्कात धरावीत का?',
              a: 'एखादा कर्जदाता कर्जासोबत एखादे उत्पादन घेणे बंधनकारक करत असेल (जीवन विमा, खाते, गुंतवणूक उत्पादन), तर त्या उत्पादनाचा खर्च तुमच्या कर्जाच्या खऱ्या खर्चाचा भाग आहे. अशी उत्पादने अधिकृत APR मध्ये धरावीत की नाहीत याचे नियम देशानुसार वेगळे आहेत. प्रामाणिक तुलना करण्यासाठी, सोबत सक्तीने जोडलेल्या कोणत्याही उत्पादनाचा संपूर्ण काळातील खर्च शुल्काच्या रकान्यात जोडा. मग दाखवलेला APR सर्व खर्च धरून असेल.',
            },
            {
              q: 'कॅल्क्युलेटर कर्जप्रक्रिया शुल्क आणि व्यवहार खर्च हाताळतो का?',
              a: 'हो. प्रत्येक कर्जदात्याच्या कार्डवर “खर्च आणि शुल्क” खाली “कर्जप्रक्रिया / व्यवहार शुल्क” या रकान्यात ते भरा. शुल्क भरलेल्या एकूण रकमेत जोडले जाते, त्यामुळे शेजारी शेजारी तुलना कर्जाचा खरा खर्च दाखवते, आणि ते दाखवलेल्या APR मध्ये सामावलेले असते.',
            },
          ],
        },
        {
          title: 'मुदतपूर्व परतफेड, पॉइंट्स आणि दंड',
          items: [
            {
              q: 'दरमहा अतिरिक्त मुद्दल भरण्याचे गणित करता येते का?',
              a: 'हो. प्रत्येक कर्जदात्याच्या कार्डवरील मुदतपूर्व परतफेडीच्या गटात “दरमहा अतिरिक्त मुद्दल” खाली रक्कम भरा. कॅल्क्युलेटर ती दर महिन्याला थेट मुद्दलात जमा करतो, त्यामुळे परतफेडीचा काळ कमी होतो आणि एकूण व्याज घटते.',
            },
            {
              q: 'एकरकमी मुदतपूर्व परतफेड कशी भरायची?',
              a: 'महिना:रक्कम असे स्वरूप वापरा, अर्धविरामाने वेगळे करून. उदाहरणार्थ, 12:5000;36:3000;60:10000 म्हणजे 12 व्या महिन्यात 5,000, 36 व्या महिन्यात 3,000 आणि 60 व्या महिन्यात 10,000 ची मुदतपूर्व परतफेड. प्रत्येक एकरकमी रक्कम त्या महिन्याच्या नेहमीच्या हप्त्यानंतर मुद्दलात जमा होते, त्यामुळे त्याच महिन्यात तिच्यावर व्याज लागत नाही. कर्ज सहसा कराराच्या मुदतीपेक्षा लवकर फिटते आणि एकूण व्याज त्या प्रमाणात कमी होते.',
            },
            {
              q: 'पॉइंट्सचा खर्च वसूल होण्याचा टप्पा कसा काम करतो?',
              a: 'डिस्काउंट पॉइंट्स म्हणजे कमी व्याजदरासाठी सुरुवातीला भरलेला खर्च. ते फायदेशीर ठरतात की नाही हे तुम्ही कर्ज किती काळ ठेवता यावर अवलंबून असते. पॉइंट्सचा खर्च आणि त्यांनी व्याजदरात केलेली कपात भरा, आणि कॅल्क्युलेटर “पॉइंट्स न भरलेले” असे काल्पनिक मूळ कर्ज (तेच कर्ज, शुल्कातून पॉइंट्सचा खर्च वजा आणि दरात कपातीएवढी वाढ) तयार करून दोन्हींची तुलना करतो. “पॉइंट्सचा खर्च वसूल होण्याचा टप्पा” ही ओळ सुरुवातीचा खर्च भरून निघण्यासाठी कमी हप्त्यांचे किती महिने लागतात ते दाखवते. नवीन मासिक हप्ता प्रत्यक्षात कमी नसेल, तर हा टप्पा “कधीच नाही” असा दाखवला जातो.',
            },
            {
              q: 'मुदतपूर्व परतफेडीवरील दंड कसा काम करतो?',
              a: 'काही कर्जांवर लवकर फेड केल्यास दंड आकारला जातो. दंड बाकी कर्जाची टक्केवारी म्हणून आणि तो लागू असलेला शेवटचा महिना भरा. कर्ज (एकरकमी रकमा, अतिरिक्त मुद्दल किंवा पुनर्वित्तामुळे) त्या महिन्यात किंवा त्याआधी पूर्ण फिटले तरच दंड आकारला जातो. दंड भरलेल्या एकूण रकमेत जोडला जातो, त्यामुळे शेजारी शेजारी तुलना दंडासह लवकर फेडीचा खरा खर्च दाखवते.',
            },
          ],
        },
        {
          title: 'हायब्रिड (ARM) कर्जे',
          items: [
            {
              q: 'कॅल्क्युलेटर हायब्रिड (5/1, 7/1, 10/1 ARM) कर्जे कशी हाताळतो?',
              a: '“व्याजदराची रचना” या गटात दराचा प्रकार हायब्रिड करा, मग सुरुवातीचा ठरावीक कालावधी (उदा. 5/1 ARM साठी 60 महिने) आणि ठरावीक कालावधीनंतर लागू होणारा दर भरा. कर्जफेडीचे वेळापत्रक बदलाच्या महिन्यापर्यंत सुरुवातीच्या दराने तयार होते आणि मग हप्त्यांची पुनर्गणना (recast) होते: बाकी कर्ज कराराच्या उरलेल्या महिन्यांवर पुढच्या दराने पुन्हा विभागले जाते, त्यामुळे कर्ज मूळ मुदतीतच फिटते. दाखवलेला APR हे जाहीर वेळापत्रक वापरून काढला जातो, जे कर्जदाते प्रत्यक्ष ARM उत्पादनांवर APR जसा सांगतात त्याच्याशी जुळते.',
            },
            {
              q: 'मी “परतफेडीचे महिने” निवडल्यावर हायब्रिड पर्याय बंद का होतो?',
              a: 'हायब्रिड कर्जांसाठी कराराची ठरावीक मुदत लागते, म्हणजे दर बदलताना कॅल्क्युलेटर हप्त्यांची पुनर्गणना करू शकतो. तुम्ही “परतफेडीचे महिने” काढता तेव्हा तुम्ही कराराची मुदत देत नाही (त्याऐवजी ठरावीक मासिक हप्ता देता), त्यामुळे पुनर्गणना ठरत नाही. हायब्रिडचा पर्याय सुरू करण्यासाठी “काय काढायचे” हा पर्याय “मासिक हप्ता” वर बदला.',
            },
          ],
        },
        {
          title: 'विश्लेषणाचे टॅब',
          items: [
            {
              q: '“प्रत्येक हप्ता कुठे जातो” हा आलेख काय दाखवतो?',
              a: 'तो कर्जाच्या प्रत्येक वर्षातील एक प्रातिनिधिक मासिक हप्ता त्याच्या व्याज आणि मुद्दल या भागांमध्ये विभागून एकाच स्तंभावर रचून दाखवतो. प्रत्येक स्तंभाची एकूण उंची सारखीच असते (तोच मासिक हप्ता), पण विभागणी नाट्यमयरीत्या बदलते: सुरुवातीच्या वर्षांत जवळपास संपूर्ण हप्ता व्याज असतो, तर शेवटच्या वर्षांत जवळपास संपूर्ण हप्ता मुद्दल असतो. म्हणूनच दीर्घ कर्जाच्या पहिल्या काही वर्षांतील मुदतपूर्व परतफेडीचा परिणाम प्रमाणाबाहेर मोठा असतो; मुद्दलातून लवकर कमी केलेला प्रत्येक युरो उरलेल्या संपूर्ण मुदतीचे व्याज वाचवतो.',
            },
            {
              q: 'कालावधीचे विश्लेषण (“तुम्ही … महिन्याला विकले किंवा पुनर्वित्त केले तर”) म्हणजे काय?',
              a: 'कर्जे 36 व्या महिन्यात आणि 360 व्या महिन्यात खूप वेगळी दिसतात. कालावधीचा टॅब विचारतो: तुम्ही निवडलेल्या महिन्यात तुम्ही प्रत्यक्षात किती मुद्दल फेडले आहे, किती व्याज भरले आहे, बाकी कर्ज किती आहे, आणि आत्तापर्यंत एकूण किती पैसे खर्च झाले आहेत (हप्ते आणि कर्जप्रक्रिया शुल्क)? कराराची मुदत संपण्याच्या खूप आधी तुम्ही विक्री करण्याची, स्थलांतराची किंवा पुनर्वित्ताची शक्यता असेल, तर हाच योग्य दृष्टिकोन आहे, कारण 360 महिन्यांत सर्वात कमी एकूण खर्च असलेला कर्जदाता 60 व्या महिन्यात बाहेर पडल्यास सर्वात कमी खर्चाचा असेलच असे नाही.',
            },
            {
              q: 'पुनर्वित्त परिदृश्य कसे काम करते?',
              a: 'कोणत्या कर्जदात्याचे कर्ज पुनर्वित्त करायचे, पुनर्वित्त कोणत्या महिन्यात होते, नवीन दर, नवीन मुदत आणि व्यवहार खर्च असल्यास ते निवडा. कॅल्क्युलेटर “मूळ कर्ज शेवटपर्यंत तसेच ठेवा” आणि “पुनर्वित्ताच्या महिन्यापर्यंत मूळ हप्ते भरा, मग बाकी कर्ज स्वतःच्या कराराच्या शेवटापर्यंत चालणाऱ्या नवीन कर्जाने फेडा” या दोन्हींमध्ये खर्च झालेल्या एकूण पैशांची तुलना करतो. तो खर्च वसूल होण्याचा टप्पाही सांगतो: पुनर्वित्ताचा व्यवहार खर्च भरून निघण्यासाठी कमी मासिक हप्त्यांचे किती महिने लागतात. नवीन मासिक हप्ता कमी नसेल, तर हा टप्पा “कधीच नाही” असतो.',
            },
          ],
        },
        {
          title: 'शेअर करणे आणि अचूकता',
          items: [
            {
              q: 'शेअर लिंक स्वयंपूर्ण असतात का?',
              a: 'हो. शेअर लिंकमध्ये पाहणाऱ्याला लागणारी प्रत्येक माहिती असते: प्रत्येक कर्जदात्याचा प्रत्येक रकाना (दराचा प्रकार, हायब्रिडचे वेळापत्रक, पॉइंट्स, एकरकमी रकमा, मुदतपूर्व परतफेडीवरील दंड), चलन, उघडा असलेला विश्लेषणाचा टॅब, आणि कालावधी व पुनर्वित्त परिदृश्याची माहिती. तुम्ही पाहत असलेल्या त्याच दृश्यावर पाहणारी व्यक्ती तुमच्या सर्व माहितीसह पोहोचते. URL मध्ये फक्त पूर्वनिश्चित मूल्यांपेक्षा वेगळी मूल्ये असतात, त्यामुळे नवीन तुलनेची लिंकही छोटी राहते.',
            },
            {
              q: 'हिशेब किती अचूक असतात?',
              a: 'दशांश पूर्णांकनाच्या चुका टाळण्यासाठी कर्जफेडीचे सर्व हिशेब पैशांच्या पूर्णांकांमध्ये होतात. मासिक हप्त्याचे सूत्र सर्वात जवळच्या पैशापर्यंत पूर्णांकित केले जाते, आणि प्रत्येक वेळापत्रकातील शेवटचा हप्ता असा जुळवला जातो की मुद्दलाच्या भरण्यांची बेरीज मूळ कर्जाच्या रकमेइतकीच होते. APR त्याच पूर्णांक वेळापत्रकावरील वर्तमान मूल्याच्या समीकरणातून द्विभाजन पद्धतीने काढला जातो, कोणत्याही प्रत्यक्ष कर्जदात्याच्या माहितीपत्रकापेक्षा खूप जास्त अचूकतेने.',
            },
          ],
        },
        {
          title: 'अनेक चलनांची सोय',
          items: [
            {
              q: 'कोणती चलने उपलब्ध आहेत?',
              a: '38 चलने उपलब्ध आहेत, ज्यात भारतीय रुपया (INR), अमेरिकी डॉलर (USD), युरो (EUR), ब्रिटिश पाउंड (GBP), स्विस फ्रँक (CHF), जपानी येन (JPY), चिनी युआन (CNY), कॅनेडियन डॉलर (CAD), ऑस्ट्रेलियन डॉलर (AUD), सिंगापूर डॉलर (SGD), बांगलादेशी टका (BDT), केनियन शिलिंग (KES), पश्चिम आणि मध्य आफ्रिकन CFA फ्रँक (XOF, XAF), आणि नॉर्डिक, मध्य युरोपियन, लॅटिन अमेरिकन, दक्षिण आशियाई, आग्नेय आशियाई आणि आफ्रिकन प्रमुख चलने आहेत. प्रत्येक चलन त्याच्या स्वतःच्या पद्धतीने दाखवले जाते. उदाहरणार्थ, INR भारतीय लाख/कोटी पद्धतीचे गट वापरते (1,23,45,678) आणि JPY मध्ये दशांश नसतात.',
            },
            {
              q: 'इथे “अनेक चलने” याचा अर्थ काय?',
              a: 'याचा अर्थ कॅल्क्युलेटर तुम्ही निवडलेल्या चलनाच्या पद्धतीने माहिती आणि निकाल लिहितो. चिन्ह, दशांश स्थाने आणि अंकांचे गट हे सगळे त्या चलनानुसार बदलतात. गणित मात्र तेच राहते: ठरावीक दराचे, हप्त्यांनी फिटणारे कर्ज एककांना डॉलर, रुपये किंवा येन काहीही म्हटले तरी सारखेच वागते. एका तुलनेतील सर्व कर्जांचे चलन एकच असते, कारण चालू विनिमय दराशिवाय (exchange rate) वेगवेगळ्या चलनांमधील नाममात्र हप्त्यांची तुलना दिशाभूल करणारी ठरेल.',
            },
          ],
        },
      ],
    },
    related: {
      heading: 'कशावरही सही करण्यापूर्वी',
      lead: 'पाच वर्षांनंतरही योग्य वाटणारा निर्णय हा एक उपयोगी निकष ठरू शकतो.',
      items: [
        {
          kicker: 'तुलना कशी करायची',
          title: 'कर्जाच्या अटी समजून घेणे',
          desc: 'APR, कर्जफेड, ठरावीक विरुद्ध बदलता दर, मुदतपूर्व परतफेडीवरील दंड: कोणत्या ऑफरचा एकूण खर्च सर्वात कमी आहे हे ठरवणारा बारीक मजकूर.',
        },
        {
          kicker: 'कर्ज घेण्यापूर्वी',
          title: 'आधी आपत्कालीन निधी',
          desc: 'एखाद्या वाईट महिन्यामुळे हप्ता चुकवावा लागणार असेल, तर कर्ज खूप मोठे आहे. ते घेण्यापूर्वी एक राखीव रक्कम उभी करण्याची अनेकांची पद्धत आहे.',
        },
        {
          kicker: 'विचाराचा आराखडा',
          title: 'मूल्यवाढ विरुद्ध घसारा',
          desc: 'घराचे कर्ज फेडत असतानाच घराचे मूल्य वाढू शकते. कारचे मूल्य सहसा कमी होते. तोच मासिक हप्ता म्हणजे तोच सौदा नाही.',
        },
        {
          kicker: 'सही केल्यानंतर',
          title: 'कर्जातून बाहेर कसे पडायचे',
          desc: 'अर्ध्या वाटेत थकून न जाता देणी फेडण्याची एक व्यावहारिक पद्धत.',
        },
        {
          kicker: 'मूलतत्त्वे',
          title: 'देणी म्हणून काय मोजले जाते',
          desc: 'काहीतरी उभे करणारे कर्ज आणि फक्त घराचा पैसा शोषून घेणारे कर्ज यांतील फरक.',
        },
      ],
      footerTag: 'कर्जांविषयी आणखी वाचा',
      footerAll: 'किंवा सर्व लेख पाहा',
    },
  },
  island: {
    currencies: currenciesMr,
    toolbar: {
      aria: 'कर्जांच्या तुलनेच्या क्रिया',
      currencyLabel: 'दाखवायचे चलन',
      currencyHelp: 'या तुलनेतील सर्व कर्जे हे स्वरूप वापरतात.',
      sample: 'नमुना:',
      share: 'शेअर करण्याची लिंक कॉपी करा',
      shareCopied: 'लिंक कॉपी झाली',
      shareTitle: 'तुमच्या कर्जांचा सर्व तपशील असलेली लिंक कॉपी करा',
      reset: 'पूर्वनिश्चित मूल्ये परत आणा',
      resetTitle: 'सगळा डेटा पुसून नव्याने सुरुवात करा',
      copiedBar: 'लिंक क्लिपबोर्डवर कॉपी झाली',
      shareUrlAria: 'शेअर करता येणाऱ्या लिंकचा URL',
      shareStatus: 'शेअर करण्याची लिंक क्लिपबोर्डवर कॉपी झाली.',
      copyPrompt: 'ही लिंक कॉपी करा:',
    },
    phoneTabs: {
      groupAria: 'दाखवायचा कर्जदाता',
      tabName: 'कर्जदाता {label}',
      add: 'जोडा',
      addAria: 'तुलनेसाठी आणखी एक कर्जदाता जोडा ({max} पैकी {n})',
      addCard: 'कर्जदाता जोडा',
      addCardHint: '{max} पर्यंत तुलना करा',
    },
    card: {
      badge: 'कर्जदाता {label}',
      removeAria: 'कर्जदाता {label} तुलनेतून काढा',
      removeTitle: 'तुलनेतून काढा',
      name: 'कर्जदात्याचे नाव',
      principal: 'कर्जाची रक्कम',
      rate: 'वार्षिक व्याजदर (%)',
      solveFor: 'काय काढायचे',
      modeTerm: 'मासिक हप्ता',
      modePayment: 'परतफेडीचे महिने',
      term: 'मुदत (महिने)',
      monthly: 'मासिक हप्ता',
      requiredTitle: 'आवश्यक',
      optionalTitle: 'कर्जाचा ऐच्छिक तपशील',
      optionalSingle: '{status}, शुल्क किंवा मुदतपूर्व परतफेड नाही',
      optionalMulti: '{status}. इतर तपशील: {rest}',
      statusHybrid: 'हायब्रिड (ARM)',
      statusFixed: 'ठरावीक दर',
      statusFees: 'शुल्क',
      statusPrepayments: 'मुदतपूर्व परतफेड',
      statusPenalty: 'दंड',
      rateStructure: {
        title: 'व्याजदराची रचना',
        hint: 'ठरावीक, किंवा आधी ठरावीक मग बदलता (ARM)',
      },
      rateTypeAria: 'दराचा प्रकार',
      fixed: 'ठरावीक',
      hybrid: 'हायब्रिड (ARM)',
      hybridHint: {
        before: 'हायब्रिड (ARM) कर्जांसाठी ठरावीक मुदत लागते. वरील ',
        solveFor: 'काय काढायचे',
        mid: ' हा पर्याय ',
        modeTerm: 'मासिक हप्ता',
        after: ' वर बदला, म्हणजे ARM चे रकाने वापरता येतील.',
      },
      initialFixed: 'सुरुवातीचा ठरावीक कालावधी (महिने)',
      initialFixedHelp: 'नेहमीचे: 60 (5/1 ARM), 84 (7/1), 120 (10/1).',
      subsequentRate: 'नंतरचा दर (%)',
      subsequentRateHelp: 'ठरावीक कालावधी संपल्यानंतरचा दर. प्रत्यक्ष ARM एखाद्या निर्देशांकानुसार बदलतात; हा तुमचा ताण-चाचणीसाठीचा अंदाज आहे.',
      costs: {
        title: 'खर्च आणि शुल्क',
        hint: 'कर्जप्रक्रिया, व्यवहार खर्च आणि डिस्काउंट पॉइंट्स',
      },
      fee: 'कर्जप्रक्रिया / व्यवहार शुल्क',
      pointsCost: 'डिस्काउंट पॉइंट्सचा खर्च',
      pointsCostHelp: 'वरील शुल्कात आधीच धरलेला. तो इथे पुन्हा भरल्यावर कॅल्क्युलेटर पॉइंट्सचा खर्च वसूल होण्याचा टप्पा दाखवू शकतो.',
      pointsReduction: 'पॉइंट्समुळे दरात कपात (टक्के बिंदू)',
      pointsReductionHelp: 'उदा. 0.25 म्हणजे पॉइंट्समुळे तुमचा दर 0.25 टक्के बिंदूंनी (percentage point) कमी होतो.',
      prepayments: {
        title: 'मुदतपूर्व परतफेड',
        hint: 'दरमहा किंवा एकरकमी जास्तीची रक्कम भरण्याचा पर्याय',
      },
      extra: 'दरमहा अतिरिक्त मुद्दल',
      lumps: 'एकरकमी मुदतपूर्व परतफेड',
      lumpsHelp: {
        before: 'स्वरूप: ',
        format: 'महिना:रक्कम',
        mid: ', अर्धविरामाने वेगळे. उदा. ',
        after: ' म्हणजे 12 व्या महिन्यात 5,000 आणि 36 व्या महिन्यात 3,000.',
      },
      penalty: {
        title: 'मुदतपूर्व परतफेडीवरील दंड',
        hint: 'काही कर्जांवर लवकर फेड केल्यास शुल्क लागते',
      },
      penaltyPct: 'दंड (बाकी कर्जाचा %)',
      penaltyUntil: 'दंड या महिन्यापर्यंत लागू',
      penaltyUntilHelp: 'दंड नसेल तर 0 ठेवा. कर्ज या महिन्यात किंवा त्याआधी फिटले तरच आकारला जातो.',
    },
    results: {
      monthly: 'मासिक',
      monthlyExtra: '{base} + {extra} अतिरिक्त',
      apr: 'APR',
      aprNa: 'लागू नाही',
      aprFees: 'शुल्कासह',
      aprNoFees: 'शुल्क नाही',
      totalPaid: 'एकूण भरलेले',
      showDetails: 'तपशील दाखवा',
      timeToPayoff: 'परतफेडीचा काळ',
      paymentsOne: '1 हप्ता',
      paymentsMany: '{n} हप्ते',
      paymentsFew: '{n} हप्ते',
      totalInterest: 'एकूण व्याज',
      fees: 'शुल्क',
      penalty: 'मुदतपूर्व परतफेडीवरील दंड',
      penaltyHint: 'दंडाच्या कालावधीत कर्ज लवकर फिटल्यामुळे आकारलेला',
      breakEven: 'पॉइंट्सचा खर्च वसूल होण्याचा टप्पा',
      never: 'कधीच नाही',
      breakEvenSaves: 'मुदतीत {amount} वाचतात',
      breakEvenNever: 'खर्च भरून निघण्याइतका पॉइंट्समुळे मासिक हप्ता कमी होत नाही',
    },
    delta: {
      heading: 'शेजारी शेजारी',
      empty: 'त्यांची तुलना पाहण्यासाठी किमान दोन कर्जदात्यांसाठी वैध माहिती भरा.',
      sameBefore: 'सर्व कर्जदात्यांचा एकूण खर्च सारखाच येतो: ',
      sameAfter: '.',
      rangeBefore: 'खालील कर्जदात्यांमध्ये एकूण खर्च ',
      rangeTo: ' पासून ',
      rangeAcross: ' पर्यंत आहे: फरक ',
      rangeAfter: '.',
      metricAria: 'निकष',
      monthlyPayment: 'मासिक हप्ता',
      monthsToPayoff: 'परतफेडीपर्यंतचे महिने',
      aprInclFees: 'APR (शुल्कासह)',
      totalInterest: 'एकूण व्याज',
      totalPaid: 'एकूण भरलेले',
      diffRow: 'सर्वात कमी एकूण खर्चाच्या तुलनेत फरक',
      baseline: 'आधाररेषा',
      baselineAria: 'आधाररेषा (सर्वात कमी एकूण खर्च)',
    },
    tabs: {
      aria: 'विश्लेषण',
      listAria: 'विश्लेषणाची दृश्ये',
      charts: {
        label: 'आलेख',
        hint: 'काळानुसार बाकी कर्ज आणि प्रत्येक हप्त्याची विभागणी',
      },
      horizon: {
        label: 'कालावधी',
        hint: 'लवकर विकले किंवा पुनर्वित्त केले तर तुमची स्थिती काय',
      },
      refi: {
        label: 'पुनर्वित्त',
        hint: 'तसेच ठेवणे विरुद्ध पुनर्वित्त, खर्च वसूल होण्याच्या टप्प्यासह',
      },
      how: {
        label: 'हे कसे काम करते',
        hint: 'सूत्र आणि पद्धत',
      },
    },
    charts: {
      balanceHeading: 'काळानुसार बाकी कर्ज',
      balanceLead: 'प्रत्येक रेषा म्हणजे एका कर्जदात्याचे बाकी कर्ज, महिन्यागणिक. अक्षावरील ठिपका ते कधी फिटते ते दाखवतो.',
      splitHeading: 'प्रत्येक हप्ता कुठे जातो',
      splitLead: 'दर महिन्याला तोच मासिक हप्ता. सुरुवातीला हप्त्याचा जवळपास सगळा भाग व्याज असतो; शेवटी जवळपास सगळा भाग मुद्दल असतो.',
      vendorLabel: 'कर्जदाता',
      autoOption: 'आपोआप (सर्वात कमी एकूण खर्च)',
      incomplete: ' (अपूर्ण)',
      splitEmpty: 'प्रत्येक हप्ता व्याज आणि मुद्दल यांच्यात कसा विभागला जातो हे पाहण्यासाठी वर वैध माहिती भरा.',
      caption: {
        before: 'दाखवत आहे: ',
        afterName: ' यांचे करारानुसार वेळापत्रक',
        noExtras: ' (ऐच्छिक अतिरिक्त मुद्दलाशिवाय; APR च्या समतुल्य दृश्य)',
        extraBefore: '. ',
        yearEarly: 'वर्ष 1',
        extraMid: ' मधील अतिरिक्त भरणा त्या रकमेवरचे 25 वर्षांचे व्याज रद्द करतो; तोच भरणा ',
        yearLate: 'वर्ष 24',
        extraAfter: ' मध्ये केल्यास जवळपास काहीच वाचत नाही.',
      },
    },
    balance: {
      empty: 'परतफेडीचा आलेख पाहण्यासाठी वर वैध माहिती भरा.',
      ariaPrefix: 'काळानुसार बाकी कर्ज. ',
      seriesLine: '{name}: {amount} पासून सुरू; फिटायला लागणारा काळ: {months}.',
      start: 'सुरुवात',
      year: 'वर्ष {y}',
      month: 'महिना {m}',
      yearMonth: 'वर्ष {y}, महिना {m}',
      paidOff: 'फिटले, {interest} व्याज',
      left: '{balance} बाकी, {interest} व्याज',
      legendNote: 'फिटायला लागणारा काळ: {months}',
      swipe: 'संपूर्ण आलेख पाहण्यासाठी सरकवा →',
      groupAria: 'बाकी कर्जाचा आलेख. प्रत्येक वर्ष वाचण्यासाठी डाव्या आणि उजव्या बाणांच्या कळा वापरा; एकेक महिन्यासाठी Shift दाबून ठेवा.',
      title: 'काळानुसार बाकी कर्ज',
      axisYears: 'वर्षे',
      hint: 'कोणत्याही वर्षातील बाकी कर्ज वाचण्यासाठी आलेखावर पॉइंटर ठेवा, त्यावर टॅप करा, किंवा डाव्या आणि उजव्या बाणांच्या कळा वापरा.',
      tableCaption: 'काळानुसार बाकी कर्ज, महिन्यांनुसार नमुने',
    },
    split: {
      ariaPrefix: '{vendor} साठी प्रत्येक मासिक हप्ता कुठे जातो. ',
      ariaRow: '{when}: व्याज {interest} ({pct}%), मुद्दल {principal}.',
      title: 'प्रत्येक हप्ता कुठे जातो',
      eyebrowInterest: 'व्याज',
      eyebrowPrincipal: 'मुद्दल',
      footnote: 'दर महिन्याला तोच हप्ता, विभागणी बदलते',
      tableCaption: '{vendor} साठी व्याज आणि मुद्दल यांची विभागणी, कर्जाच्या काळातील नमुने',
    },
    words: {
      month: 'महिना',
      payment: 'हप्ता',
      interest: 'व्याज',
      principal: 'मुद्दल',
    },
    how: {
      heading: 'तुलना कशी होते',
      intro: 'प्रत्येक कर्जदात्यासाठी कॅल्क्युलेटर हप्त्यांनी पूर्ण फिटणाऱ्या कर्जाच्या नेहमीच्या सूत्राने कर्जफेडीचे संपूर्ण वेळापत्रक तयार करतो:',
      symbols: {
        p: ' म्हणजे कर्जाचे मुद्दल, ',
        r: ' म्हणजे मासिक व्याजदर (वार्षिक दर ÷ 12), आणि ',
        n: ' म्हणजे मासिक हप्त्यांची संख्या.',
      },
      monthly: 'प्रत्येक महिन्याचे व्याज बाकी कर्जावर मोजले जाते, हप्ता व्याज आणि मुद्दल यांच्यात विभागला जातो, आणि बाकी कर्ज कमी होते. हे चक्र पैशापर्यंत अचूक चालते.',
      apr: {
        strong: 'APR',
        rest: ' कर्जप्रक्रिया/व्यवहार शुल्क व्याजदरात सामावून घेतो: शुल्क हे तुम्हाला प्रत्यक्ष मिळणाऱ्या रकमेतून सुरुवातीलाच झालेली वजावट मानले जाते, आणि मग असा मासिक दर काढला जातो ज्यावर कराराप्रमाणेच्या हप्त्यांचे वर्तमान मूल्य त्या निव्वळ रकमेइतके होते. नाममात्र वार्षिक दर म्हणून (मासिक दर × 12) दाखवला जातो, अमेरिकेतील कर्जाच्या माहितीपत्रकांप्रमाणे.',
      },
      hybrid: {
        strong: 'हायब्रिड (ARM) कर्जे',
        rest: ' ठरावीक कालावधीसाठी सुरुवातीचा दर वापरतात, आणि मग बदलाच्या महिन्यात हप्त्यांची पुनर्गणना (recast) करतात, म्हणजे पुढच्या दराने कर्ज मूळ मुदतीतच फिटते.',
      },
      lumps: {
        strong: 'एकरकमी मुदतपूर्व परतफेडीच्या रकमा',
        rest: ' नेहमीच्या मासिक हप्त्यानंतर मुद्दलात जमा केल्या जातात, त्यामुळे त्याच महिन्यात त्यांच्यावर व्याज लागत नाही.',
      },
      penalties: {
        strong: 'मुदतपूर्व परतफेडीवरील दंड',
        rest: ' फक्त दंडाच्या शेवटच्या महिन्यात किंवा त्याआधी कर्ज पूर्ण फिटले तरच लागतो.',
      },
      note: 'सगळे तुमच्या ब्राउझरमध्ये चालते. सर्व्हरकडे काहीही पाठवले जात नाही. सगळी माहिती दुसऱ्याला देता येईल अशा URL मध्ये भरण्यासाठी “शेअर करण्याची लिंक कॉपी करा” हे बटण वापरा.',
    },
    horizon: {
      heading: 'तुम्ही … महिन्याला विकले किंवा पुनर्वित्त केले तर',
      lead: 'कर्जे 36 व्या महिन्यात आणि 360 व्या महिन्यात खूप वेगळी दिसतात. प्रत्येक ओळ त्या तारखेला कर्जदाराची प्रत्यक्ष स्थिती दाखवते.',
      label: 'कालावधी: ',
      inputAria: 'महिन्यांतील कालावधी (मजकूर)',
      empty: 'कालावधीनुसार स्थिती पाहण्यासाठी वैध माहिती भरा.',
      principalRepaid: 'फेडलेले मुद्दल',
      interestPaid: 'भरलेले व्याज',
      balanceRemaining: 'बाकी कर्ज',
      totalCashOut: 'एकूण खर्च झालेले पैसे',
    },
    refi: {
      heading: 'पुनर्वित्त परिदृश्य',
      lead: 'कर्ज तसेच ठेवणे आणि भविष्यातील एखाद्या महिन्यात त्याचे पुनर्वित्त करणे यांची तुलना करा. दर कमी झाल्यावर, किंवा ARM चा दर बदलण्यापूर्वीच ते फेडण्याचा विचार करत असाल तेव्हा उपयोगी.',
      whichLoan: 'कोणत्या कर्जाचे पुनर्वित्त?',
      atMonth: 'पुनर्वित्ताचा महिना',
      newRate: 'नवीन दर (%)',
      newTerm: 'नवीन मुदत (महिने)',
      newFee: 'नवीन व्यवहार खर्च',
      rollFee: 'व्यवहार खर्च नवीन मुद्दलात जोडा',
      empty: 'बचत पाहण्यासाठी वैध कर्जदाता निवडा आणि पुनर्वित्ताचा महिना, दर आणि मुदत भरा.',
      keepTotal: 'सध्याचे कर्ज तसेच ठेवल्यास: एकूण',
      refiTotal: 'पुनर्वित्त केल्यास: एकूण (दोन्ही टप्पे मिळून)',
      saves: 'पुनर्वित्ताने बचत',
      costsMore: 'पुनर्वित्ताचा खर्च जास्त',
      breakEven: 'खर्च वसूल होण्याचा टप्पा (पुनर्वित्तानंतरचे महिने)',
      breakEvenHint: 'व्यवहार खर्च भरून निघण्यासाठी नवीन कर्ज किती काळ चालावे लागेल',
      breakEvenNever: 'नवीन मासिक हप्ता कमी नाही; व्यवहार खर्च भरून निघत नाही',
    },
    disclaimer: {
      summary: 'गृहीतके आणि अस्वीकरण',
      body: 'हिशेब मासिक चक्रवाढ आणि वेळेवर हप्ते गृहीत धरतात. APR नाममात्र वार्षिक दर म्हणून (मासिक दर × 12) कराराच्या वेळापत्रकावर (स्वेच्छेने केलेल्या अतिरिक्त भरण्यांशिवाय) काढला जातो, आणि त्यात कर्जप्रक्रिया/व्यवहार शुल्क कर्जाच्या परिणामकारक खर्चात सामावलेले असते; अधिकृत APR/APRC मध्ये इतर कोणते खर्च (सक्तीचा विमा, खात्याशी जोडलेली उत्पादने, कर) धरावेत याचे नियम देशानुसार वेगळे आहेत, त्यामुळे ते दिसावेत असे वाटत असेल तर ते शुल्काच्या रकान्यात जोडा. कॅनडातील निवासी गहाण कर्जांवर कायद्याने सहामाही चक्रवाढ होते, आणि ब्राझीलमधील व काही UK मधील उत्पादने चक्रवाढीच्या इतर पद्धती वापरतात; अशा उत्पादनांवर इथले मासिक चक्रवाढीचे आकडे थोडे वेगळे येतील. प्रत्यक्ष बदलत्या दराची कर्जे एखाद्या निर्देशांकाचा दर अधिक वाढीव दर (margin) यानुसार चालतात आणि त्यांच्या दरावर मर्यादा असू शकतात, ज्या हा कॅल्क्युलेटर लागू करत नाही; तुम्ही भरलेला नंतरचा दर हा तुमचा ताण-चाचणीसाठीचा सर्वोत्तम अंदाज आहे. मालमत्ता कर, इमारत किंवा सोसायटीचे शुल्क, घराचा विमा, आणि तुमच्या देशात कर्जावरील व्याजाची कर आकारणी यांचे गणित यात नाही. केवळ शैक्षणिक तुलना; आर्थिक सल्ला नाही. बंधनकारक तुलना किंवा वैयक्तिक सल्ल्यासाठी परवानाधारक गहाण कर्ज ब्रोकर किंवा आर्थिक सल्लागाराशी बोला.',
    },
    months: {
      na: 'लागू नाही',
      one: '1 महिना',
      some: '{m} महिने',
      years: '{y} वर्ष',
      yearsOne: '{y} वर्ष 1 महिना',
      yearsSome: '{y} वर्ष {m} महिने',
    },
    engine: {
      errors: {
        principal: 'मुद्दल शून्यापेक्षा जास्त असायला हवे.',
        payment: 'मासिक हप्ता शून्यापेक्षा जास्त असायला हवा.',
        belowInterest: 'कर्ज कधीही फिटण्यासाठी मासिक हप्ता खूप कमी आहे; त्यात पहिल्या महिन्याचे व्याजही भागत नाही.',
        notAmortizing: '{months} महिन्यांत कर्ज फिटत नाही. मासिक हप्ता वाढवा.',
        term: 'मुदत किमान एक महिना असायला हवी.',
        amount: 'शून्यापेक्षा जास्त कर्जाची रक्कम भरा.',
        rate: 'उणे नसलेला व्याजदर भरा.',
        initialFixed: 'सुरुवातीचा ठरावीक कालावधी शून्यापेक्षा जास्त महिन्यांचा असायला हवा.',
        termMin: 'किमान एक महिन्याची मुदत भरा.',
        termMax: 'मुदत {months} महिन्यांपेक्षा जास्त असू शकत नाही.',
        paymentEnter: 'शून्यापेक्षा जास्त मासिक हप्ता भरा.',
        hybridMode: 'हायब्रिड दराची कर्जे मुदतीच्या पर्यायात भरायला हवीत (मासिक हप्ता काढला जातो).',
        refiOriginal: 'मूळ कर्ज अवैध आहे; पुनर्वित्ताचा हिशेब करता येत नाही.',
        refiMonth: 'पुनर्वित्ताचा महिना किमान 1 असायला हवा.',
        refiMonthEnd: 'पुनर्वित्ताचा महिना मूळ कर्ज संपण्यापूर्वीचा असायला हवा.',
        refiRate: 'नवीन दर उणे असू शकत नाही.',
        refiTerm: 'नवीन मुदत किमान 1 महिना असायला हवी.',
        refiBalance: 'पुनर्वित्ताच्या महिन्यात मूळ कर्जावर काहीच बाकी नाही.',
        newLoan: 'नवीन कर्ज वैध नाही.',
      },
      warnings: {
        precision: 'अंतर्गत अचूकता तपासणी: मुद्दलाची बेरीज {sum} ≠ {expected}. कृपया हे आम्हाला कळवा.',
        subsequentRate: 'सुरुवातीच्या ठरावीक कालावधीनंतरचा दर इतका जास्त आहे की पुनर्गणना केलेल्या हप्त्यात व्याजही कसेबसे भागते.',
      },
    },
  },
};
