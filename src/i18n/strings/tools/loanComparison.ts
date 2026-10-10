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
import { currenciesEn, currenciesHi } from './currencies.ts';

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
      'Multi-currency support across 29 currencies, including USD, EUR, GBP, CHF, JPY, INR, CNY, CAD, AUD, SGD',
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
              a: 'Twenty-nine currencies are supported, including the Euro (EUR), US Dollar (USD), British Pound (GBP), Swiss Franc (CHF), Japanese Yen (JPY), Indian Rupee (INR), Chinese Yuan (CNY), Canadian Dollar (CAD), Australian Dollar (AUD), Singapore Dollar (SGD), and the Nordic, Central European, Latin American, and South-East Asian majors. Each currency is displayed using its own locale conventions. For example, INR uses Indian-style lakh/crore grouping (1,23,45,678) and JPY uses no decimals.',
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
    /** The 29 currency names, shared by the three tools: see `./currencies.ts`. */
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
 * ऋणदाता, बची हुई रकम.
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
      '29 मुद्राओं का सपोर्ट, जिनमें USD, EUR, GBP, CHF, JPY, INR, CNY, CAD, AUD, SGD शामिल हैं',
      'तय अवधि देकर मासिक किस्त निकालें, या तय किस्त देकर चुकाने का समय निकालें',
      'लोन शुल्क और हर महीने का अतिरिक्त मूलधन जोड़कर देखें',
      'एडवांस्ड मोड: दर बदलने पर किस्त नए सिरे से निकाली जाने वाले हाइब्रिड (ARM) लोन, डिस्काउंट पॉइंट्स की बराबरी, एकमुश्त राशि, और समय से पहले भुगतान पर जुर्माना',
      'हॉराइज़न विश्लेषण ("अगर मैं महीने N पर बेच दूँ") हर ऋणदाता के लिए: चुकाया गया मूलधन, दिया गया ब्याज, बची हुई रकम और अब तक गई कुल नकदी',
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
        'दो से पाँच ऋणदाता भर दें। मासिक किस्त, चुकाने का समय, कुल चुकाई जाने वाली राशि और APR देखें: वह एक आँकड़ा जो शुल्क को भी दर में जोड़ देता है।',
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
              a: 'जिन ऋणदाताओं की तुलना करनी है, उनमें से हर एक के लिए लोन राशि, सालाना ब्याज दर, और अवधि महीनों में या मासिक किस्त भर दें। आप दो से पाँच लोन ऑफ़र की साथ-साथ तुलना कर सकते हैं। कैलकुलेटर हर लोन का पूरा किस्तों का शेड्यूल बनाता है और मासिक किस्त, चुकाने के महीने, कुल ब्याज, APR (जो शुल्क को दर में जोड़ देता है) और कुल चुकाई जाने वाली राशि दिखाता है।',
            },
            {
              q: 'किस तरह के लोन की तुलना की जा सकती है?',
              a: 'मॉर्गेज, कार लोन, पर्सनल लोन, और आम चुकौती योजनाओं वाले एजुकेशन लोन। कैलकुलेटर तय ब्याज वाले लोन और हाइब्रिड (ARM जैसे) लोन दोनों संभालता है, जिनमें शुरुआत में एक तय दर रहती है और उसके बाद दूसरी दर लागू होती है। केवल ब्याज वाली अवधि और बैलून भुगतान इसमें शामिल नहीं हैं।',
            },
            {
              q: 'एक बार में कितने लोन की तुलना हो सकती है?',
              a: 'दो से पाँच। पेज दो कार्ड से शुरू होता है और उनके बगल में "ऋणदाता जोड़ें" वाला साफ़ बटन रहता है, जिससे तुलना पाँच लोन ऑफ़र तक बढ़ाई जा सकती है। हर कार्ड पर हटाने का बटन है, ताकि जो ऋणदाता अब काम का न हो उसे हटाया जा सके।',
            },
            {
              q: 'अलग-अलग अवधि या दर वाले लोन की तुलना हो सकती है?',
              a: 'हाँ। तुलना किए जाने वाले सभी लोन में अवधि, दर, शुल्क और मासिक किस्त तक अलग-अलग रखी जा सकती है। हर ऋणदाता के कार्ड पर चुना जा सकता है कि मासिक किस्त निकालनी है (तय अवधि से) या चुकाने का समय (तय मासिक किस्त से)।',
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
              a: 'नहीं। APR इस बात का माप है कि ऋणदाता अनुबंध में कितनी लागत वसूल रहा है, न कि आपकी अपनी मर्ज़ी से किए गए भुगतानों का। अतिरिक्त मूलधन देना वैकल्पिक है, और उसे जोड़ने से बताया गया APR कम दिखने लगेगा। "हर किस्त कहाँ जाती है" चार्ट और APR की पंक्ति, दोनों अनुबंध वाला शेड्यूल इस्तेमाल करते हैं (बिना अतिरिक्त मूलधन); मासिक किस्त, चुकाने का समय और कुल चुकाई गई राशि वाले आँकड़े उस शेड्यूल को दिखाते हैं जिसमें आपका अतिरिक्त भुगतान शामिल है।',
            },
            {
              q: 'क्या ज़रूरी बीमा या साथ में बिकने वाले प्रोडक्ट शुल्क में जोड़ने चाहिए?',
              a: 'अगर ऋणदाता लोन के साथ कोई प्रोडक्ट खरीदने को कहता है (जीवन बीमा, कोई खाता, कोई निवेश प्रोडक्ट), तो उस प्रोडक्ट की लागत भी आपकी असली उधार लागत का हिस्सा है। APR के नियम इस बात पर अलग-अलग देशों में अलग हैं कि ऐसे प्रोडक्ट आधिकारिक APR प्रकटीकरण में शामिल करने ही होंगे या नहीं। ईमानदार तुलना के लिए ऐसे किसी भी ज़रूरी प्रोडक्ट की पूरी अवधि की लागत शुल्क वाले फ़ील्ड में जोड़ दें। तब दिखाया गया APR सब कुछ जोड़कर बनी लागत बताएगा।',
            },
            {
              q: 'क्या कैलकुलेटर लोन शुल्क और कागज़ी खर्च संभालता है?',
              a: 'हाँ। हर ऋणदाता के कार्ड पर "लागत और शुल्क" के नीचे "लोन शुल्क और कागज़ी खर्च" वाले फ़ील्ड में इन्हें भर दें। ये शुल्क कुल चुकाई जाने वाली राशि में जुड़ जाते हैं, इसलिए साथ-साथ वाली तुलना लोन की असली लागत दिखाती है, और ये दिखाए गए APR में भी जुड़ जाते हैं।',
            },
          ],
        },
        {
          title: 'समय से पहले भुगतान, पॉइंट्स और जुर्माना',
          items: [
            {
              q: 'क्या हर महीने अतिरिक्त मूलधन चुकाने का हिसाब लगाया जा सकता है?',
              a: 'हाँ। हर ऋणदाता के कार्ड पर "समय से पहले भुगतान" वाले हिस्से में "हर महीने अतिरिक्त मूलधन" के नीचे राशि भर दें। कैलकुलेटर हर महीने उतनी राशि से सीधे मूलधन घटा देता है, जिससे चुकाने का समय छोटा हो जाता है और कुल ब्याज घट जाता है।',
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
              a: '"दर का ढाँचा" वाले हिस्से में दर का प्रकार हाइब्रिड पर बदल दें, फिर शुरुआत की तय अवधि (जैसे 5/1 ARM के लिए 60 महीने) और उसके बाद लागू होने वाली दर भर दें। किस्तों का शेड्यूल पहले शुरुआती दर पर, दर बदलने वाले महीने तक बनता है, और उसके बाद किस्त नए सिरे से निकाली जाती है: बची हुई रकम बाद की दर पर, अनुबंध की बाकी अवधि में बाँट दी जाती है, इसलिए लोन फिर भी तय की गई अवधि में चुक जाता है। दिखाया गया APR इसी शेड्यूल पर बनता है, जो उस तरीक़े से मेल खाता है जिससे ऋणदाता असली ARM प्रोडक्ट पर APR बताते हैं।',
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
              a: 'महीने 36 और महीने 360 पर लोन बहुत अलग दिखते हैं। हॉराइज़न टैब पूछता है: जो महीना आप चुनें, उस तक आपने असल में कितना मूलधन चुकाया, कितना ब्याज दिया, कितना बकाया बचा, और अब तक कुल कितनी नकदी खर्च हुई (किस्तें और लोन शुल्क मिलाकर)? यह नज़रिया तब सही है जब आप लोन की अनुबंध अवधि ख़त्म होने से काफ़ी पहले बेचने, शहर बदलने या रीफ़ाइनेंस करने की सोच रहे हों, क्योंकि जो ऋणदाता 360 महीनों में सबसे कम कुल लागत पर आता है, ज़रूरी नहीं कि वही महीने 60 पर निकलने पर भी सबसे सस्ता हो।',
            },
            {
              q: 'रीफ़ाइनेंस परिदृश्य बनाने वाला हिस्सा कैसे काम करता है?',
              a: 'चुनें कि किस ऋणदाता का लोन रीफ़ाइनेंस करना है, किस महीने में, नई दर, नई अवधि और कागज़ी खर्च। कैलकुलेटर "पुराना लोन आखिर तक चलाते रहने" में कुल खर्च की तुलना "रीफ़ाइनेंस वाले महीने तक पुरानी किस्तें देकर, बची हुई रकम नए लोन से चुकाकर, वह लोन अपनी अनुबंध अवधि तक चलाने" से करता है। यह बराबरी का समय भी बताता है: रीफ़ाइनेंस के कागज़ी खर्च निकलने में कितने महीनों की कम किस्तें लगेंगी। अगर नई मासिक किस्त कम नहीं है, तो बराबरी का समय "कभी नहीं" बताया जाता है।',
            },
          ],
        },
        {
          title: 'शेयर करना और सटीकता',
          items: [
            {
              q: 'क्या शेयर लिंक अपने आप में पूरे होते हैं?',
              a: 'हाँ। शेयर लिंक में वह सब कुछ भरा होता है जो दूसरे इंसान को चाहिए: हर ऋणदाता का हर फ़ील्ड (दर का प्रकार, हाइब्रिड शेड्यूल, पॉइंट्स, एकमुश्त राशि, समय से पहले भुगतान पर जुर्माना), मुद्रा, खुला हुआ विश्लेषण टैब, और हॉराइज़न तथा रीफ़ाइनेंस के आँकड़े। लिंक खोलने वाला उसी नज़रिये पर पहुँचता है जो आप देख रहे थे, आपके सारे आँकड़ों के साथ। लिंक में केवल वही मान जाते हैं जो शुरुआती मानों से अलग हैं, इसलिए नई तुलना का लिंक छोटा ही रहता है।',
            },
            {
              q: 'गणना कितनी सटीक है?',
              a: 'पूरा किस्तों का शेड्यूल मुद्रा की सबसे छोटी इकाई (जैसे सेंट या पैसा) के पूर्णांकों में बनाया जाता है, ताकि दशमलव की गोलाई से गलती न हो। सूत्र से निकली मासिक किस्त सबसे नज़दीकी इकाई तक गोल की जाती है, और हर शेड्यूल की आखिरी किस्त ऐसे मिलाई जाती है कि मूलधन की सारी किस्तों का जोड़ लोन राशि के ठीक बराबर हो। APR उसी पूर्णांकों वाले शेड्यूल पर वर्तमान मूल्य के समीकरण को द्विभाजन से हल करके निकाला जाता है, इतनी सटीकता से कि किसी असली ऋणदाता का प्रकटीकरण उस तक नहीं पहुँचता।',
            },
          ],
        },
        {
          title: 'कई मुद्राओं का सपोर्ट',
          items: [
            {
              q: 'कौन-सी मुद्राएँ शामिल हैं?',
              a: '29 मुद्राएँ शामिल हैं, जिनमें यूरो (EUR), अमेरिकी डॉलर (USD), ब्रिटिश पाउंड (GBP), स्विस फ़्रैंक (CHF), जापानी येन (JPY), भारतीय रुपया (INR), चीनी युआन (CNY), कनाडाई डॉलर (CAD), ऑस्ट्रेलियाई डॉलर (AUD), सिंगापुर डॉलर (SGD), और नॉर्डिक, मध्य यूरोपीय, लैटिन अमेरिकी तथा दक्षिण-पूर्व एशियाई प्रमुख मुद्राएँ हैं। हर मुद्रा अपनी ही परंपरा से दिखाई जाती है। उदाहरण के लिए, INR में भारतीय लाख/करोड़ वाला समूहन (1,23,45,678) होता है और JPY में दशमलव नहीं लिखा जाता।',
            },
            {
              q: 'यहाँ "कई मुद्राओं" का क्या मतलब है?',
              a: 'इसका मतलब है कि कैलकुलेटर इनपुट और नतीजे उसी मुद्रा की परंपरा से लिखता है जो आप चुनते हैं। चिह्न, दशमलव के स्थान और अंकों का समूहन, सब उसी मुद्रा के हिसाब से बदल जाते हैं। गणित वही रहता है: तय दर वाला किस्तों में चुकने वाला लोन एक जैसा ही चलता है, चाहे उसकी इकाई को डॉलर कहें, रुपया या येन। एक ही तुलना में सारे लोन एक ही मुद्रा में रहते हैं, क्योंकि अलग-अलग मुद्राओं की नाममात्र किस्तों की तुलना (बिना ताज़ा विनिमय दर के) भ्रम में डालती है।',
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
      groupAria: 'कौन-सा ऋणदाता दिखाना है',
      tabName: 'ऋणदाता {label}',
      add: 'जोड़ें',
      addAria: 'तुलना के लिए एक और ऋणदाता जोड़ें ({max} में से {n})',
      addCard: 'ऋणदाता जोड़ें',
      addCardHint: 'ज़्यादा से ज़्यादा {max} की तुलना',
    },
    card: {
      badge: 'ऋणदाता {label}',
      removeAria: 'ऋणदाता {label} को तुलना से हटाएँ',
      removeTitle: 'तुलना से हटाएँ',
      name: 'ऋणदाता का नाम',
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
      pointsReductionHelp: 'जैसे 0.25 का मतलब है कि पॉइंट्स ने आपकी दर 0.25 प्रतिशत अंक घटा दी।',
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
      paymentsOne: '1 किस्त',
      paymentsMany: '{n} किस्तें',
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
      empty: 'तुलना देखने के लिए कम से कम दो ऋणदाताओं के सही आँकड़े भरें।',
      sameBefore: 'सभी ऋणदाताओं की कुल लागत एक ही निकलती है: ',
      sameAfter: '।',
      rangeBefore: 'नीचे दिए ऋणदाताओं में कुल लागत ',
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
        'हर लकीर एक ऋणदाता का बकाया है, महीने दर महीने। अक्ष पर लगी बिंदी बताती है कि वह कब चुक गया।',
      splitHeading: 'हर किस्त कहाँ जाती है',
      splitLead:
        'हर महीने किस्त एक ही है। शुरुआत में उसका लगभग पूरा हिस्सा ब्याज होता है; आखिर में लगभग पूरा मूलधन।',
      vendorLabel: 'ऋणदाता',
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
        'हर ऋणदाता के लिए कैलकुलेटर किस्तों में पूरा चुकने वाले लोन के मानक सूत्र से पूरा किस्तों का शेड्यूल बनाता है:',
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
      empty: 'बचत देखने के लिए कोई सही ऋणदाता चुनें और रीफ़ाइनेंस का महीना, दर तथा अवधि भरें।',
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
