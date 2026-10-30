/**
 * The invest or pay off calculator's copy, in every language.
 *
 * Two halves, as for the other tools. `page` is what
 * `src/components/pages/InvestOrPayOffPage.astro` renders: the heading, what
 * the model leaves out, how it works, the sources, the FAQ and the related
 * reading. `island` is what `src/components/InvestOrPayOff.tsx` renders: the
 * fields, the inflation panel, the result and the side-by-side range. The
 * island is handed one locale's `island` slice as a prop and never imports a
 * catalog.
 *
 * Neutral by design (council, Oct 30, 2026): no sentence here says which path
 * is better, wins or should be chosen. Results say what happened in the
 * modelled scenarios ("ended with higher modelled net wealth in {n} of 100"),
 * and both paths are described in the same words.
 *
 * Figures are never typed here. A sentence that quotes one carries a `{name}`
 * and the component fills it: the return range from
 * `src/utils/invest-or-pay-off/math.ts`, the World Bank's update date from the
 * data file, and amounts and rates from what the reader typed.
 *
 * Not here: the analytics labels, the addresses, the source names "World
 * Bank" and "Dimson, Marsh and Staunton", and the English lesson title, which
 * read the same in every language and so live in the component.
 */
import { currenciesCs, currenciesEn, currenciesEs, currenciesHi, currenciesMr } from './currencies.ts';

export const investOrPayOffEn = {
  meta: {
    title: 'Invest or Pay Off Debt Calculator, After Inflation | nidhi',
    description:
      'Free calculator: compare paying off a debt early with investing the same money, on the same date, after your country\'s inflation. Runs in your browser.',
  },
  schema: {
    name: 'nidhi Invest or Pay Off Debt Calculator',
    alternateNames: ['nidhi Pay Off Debt or Invest Calculator', 'nidhi Debt vs Investing Comparison'],
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript. Modern browser.',
    featureList: [
      'Compares paying a debt off early with investing the same money each month, on the same date',
      'Net wealth on that date: investments, less tax on gains, less any debt still owed',
      "Results in today's money, using a country's recent inflation from the World Bank or your own figure",
      '{paths} paired simulations of world stock returns, so the gap comes from the choice, not from luck',
      'A note when your own return is above the {top}% a year after inflation the model uses, with results shown beside the historical range',
      'Optional tax relief on the interest, a yearly fund fee and tax on gains',
      'Runs in your browser: nothing you type is sent anywhere',
    ],
  },
  page: {
    breadcrumb: { home: 'Home', freeTools: 'Free tools', this: 'Invest or pay off' },
    eyebrow: 'Free tool',
    title: 'Invest or pay off debt?',
    lead: {
      before: 'Compare paying a debt off early with investing the same money, on the same date and after inflation.',
      wide: ' Both paths run on the same simulated market years, so the difference comes from the choice.',
      after: ' Nothing you type leaves your browser.',
    },
    leavesOut: {
      heading: 'What this leaves out',
      intro: 'The comparison covers one debt and one investment. Things it does not model, any of which can matter more than the numbers here:',
      items: {
        match: { lead: 'An employer match. ', rest: 'Money an employer adds to a pension when you contribute can outweigh everything on this page; the lesson below covers it.' },
        several: { lead: 'Several debts. ', rest: 'With more than one, the order they are paid in matters too.' },
        variable: { lead: 'A variable rate. ', rest: 'The debt is charged the rate you enter for its whole life.' },
        prepayment: { lead: 'Fees for paying early. ', rest: 'Some loans charge to pay ahead of schedule, which lowers what paying off earns.' },
        incomeBased: { lead: 'Income-based and written-off loans. ', rest: 'Some student loans are repaid by income and written off after a period, which changes the case for paying them early.' },
        access: { lead: 'Getting the money back. ', rest: 'Money used to repay a debt cannot be taken back out quickly; an investment can be sold, at whatever price the market offers that day.' },
        buffer: { lead: 'An emergency fund. ', rest: 'Many people keep one before sending spare money to either path.' },
        investCosts: { lead: 'Other investment costs and taxes. ', rest: 'Only a yearly fund fee and an optional tax on final gains are modelled; platform and transaction fees, dividend and withholding taxes, and when tax is paid are left out. If you enter relief on the debt and leave the tax on gains at 0, the comparison can favour investing.' },
        feelings: { lead: 'Peace of mind. ', rest: 'Being free of a debt has a value for many people that no calculation shows.' },
        inflation: { lead: 'Changing inflation. ', rest: 'The inflation figure is held the same every year; it is a planning assumption, not a forecast.' },
      },
      notAdvice: 'This is a model for learning, not advice: it shows what happened in simulated scenarios with the figures you chose.',
    },
    method: {
      heading: 'How it works',
      items: {
        paths: { lead: 'Two paths. ', rest: 'In one, the extra money goes to the debt until it is paid, then the old payment and the extra are invested every month. In the other, the debt runs its normal course and the extra money is invested; once the debt ends, its payment is invested too.' },
        date: { lead: 'The same date. ', rest: 'Both are compared on the date you choose. Net wealth is what has been invested, less any tax on gains, less any debt still owed.' },
        returns: { lead: 'The investment. ', rest: 'A diversified world stock portfolio. Its yearly returns are drawn from the history of world stocks since 1900 (Dimson, Marsh and Staunton): about {low}% to {top}% a year after inflation, with large swings from year to year.' },
        paired: { lead: 'Paired scenarios. ', rest: 'Each of {paths} scenarios runs both paths through the same market years, so the difference between them comes from the choice, not from luck.' },
        money: { lead: "Today's money. ", rest: 'The debt is charged at its own rate; the investment returns are turned into returns before inflation with your inflation figure; every result is then shown in today\'s money.' },
        timing: { lead: 'Timing. ', rest: 'Interest is charged and payments made at the end of each month. Relief on the interest is counted as money back each month and invested in the same path.' },
      },
      limits: 'Limits of the model: yearly returns are drawn independently, so long runs of bad years are no more likely than chance, and the extremes are milder than history\'s worst years. The return history comes mostly from developed markets.',
    },
    lesson: {
      before: 'The lesson behind this tool, with the employer match, tax relief and a common order for several debts: ',
      after: '.',
    },
    source: {
      heading: 'Sources',
      inflationBefore: 'Inflation: the ',
      inflationLink: 'World Bank, consumer prices (annual %)',
      inflationAfter: ', yearly figures for {countries} countries and the euro area, last updated {updated}. They are a year or more behind, and past inflation does not predict future inflation.',
      returns: 'Stock returns: Dimson, Marsh and Staunton world equities, 1900 to 2025, as reprinted in Exponential Wealth: Centuries of Stock and Bond Returns (CFA Institute Research Foundation, 2026); the same model as the Monte Carlo simulator.',
    },
    plannerLine: 'The planner will run this for every debt you have, together.',
    faq: {
      heading: 'Questions',
      items: [
        {
          q: 'Does this tell me whether to invest or pay off my debt?',
          a: 'No. It shows how the two paths compared in simulated scenarios, with the figures you chose. Which one suits you also depends on things it does not model: an employer match, your emergency fund, how secure your income is, other debts and how you feel about owing money.',
        },
        {
          q: 'Why is the result a range and not one number?',
          a: 'Because investing has good and bad years. Each scenario draws a different run of market years; the range shows the 10th, middle and 90th of them. The 10th is not a worst case: one scenario in ten did worse.',
        },
        {
          q: 'Why does inflation matter here?',
          a: 'A debt\'s rate and a fund\'s quoted return both include inflation. A 12% return is ordinary where inflation runs at 8% and high where it runs at 2%. The tool converts everything with the same inflation figure, so the two sides are compared like for like, and it shows the results in today\'s money.',
        },
        {
          q: 'What happens if I enter a high return?',
          a: 'Your figure is used as you entered it. If it is more than {top}% a year after inflation, the top of the long-run range used in this model and in the lessons, a note says so and the results are also shown with the historical range, side by side. Nothing is capped.',
        },
        {
          q: 'Where does the inflation figure come from?',
          a: 'From the World Bank\'s yearly consumer price figures for the country you pick: the average of its last ten years, used when at least five of them have a figure. You can type your own instead.',
        },
        {
          q: 'Is what I type sent anywhere?',
          a: 'No. Everything runs in your browser. A share link carries your numbers after the # in the address, which browsers never send to a server; anyone you send it to can see them.',
        },
      ],
    },
    related: {
      heading: 'Related reading',
      cards: {
        'invest-or-pay-off-debt': { kicker: 'Optimizing', title: 'Invest or pay off debt first?', desc: 'Why the rate sets a debt\'s cost, the employer match, and a common order for several debts.' },
        'how-to-get-out-of-debt': { kicker: 'Discovery', title: 'How to get out of debt', desc: 'The avalanche and snowball methods for paying several debts.' },
        'purchasing-power': { kicker: 'Discovery', title: 'Purchasing power', desc: 'Why the same amount buys less over time.' },
      },
    },
  },
  island: {
    formLabel: 'Invest or pay off debt calculator',
    sections: {
      debt: 'Your debt',
      extra: 'The extra money',
      inflation: 'Inflation',
      invest: 'If you invest',
      date: 'Compare on',
    },
    fields: {
      currency: 'Currency',
      balance: 'What you owe',
      debtRate: 'Interest rate',
      debtRateHint: 'Yearly rate, as your statement shows it',
      payment: 'Monthly payment',
      extra: 'Extra money each month',
      extraHint: 'The amount you are deciding about',
      relief: 'Tax relief on the interest (optional)',
      reliefHint: 'Your own estimate, as a share of the interest. Relief may be capped, may need itemising, may cover only part of the interest and may come once a year; it can change with tax rules or your income. The model holds it constant.',
      country: 'Country',
      countryNone: 'None (type a figure)',
      inflation: 'Inflation',
      inflationHint: 'Yearly, held the same every year',
      useCountry: 'Use the country\'s figure',
      ownReturn: 'Your return, before inflation',
      ownReturnHint: 'Yearly, as funds usually quote it',
      fee: 'Yearly fund fee (optional)',
      gainsTax: 'Tax on gains (optional)',
      gainsTaxHint: 'Taken once, on the gain at the comparison date. It depends on the account and the country.',
      amountError: 'Enter an amount from 0 to {max}.',
      percentError: 'Enter a percentage from {min} to {max}.',
    },
    country: {
      average: '{country}, {first} to {last}: {avg} a year on average (World Bank).',
      context: 'Last five years {five}; {last} alone {latest}.',
      contextNoFive: '{last} alone {latest}.',
      noDefault: 'Too few recent figures for {country} to give an average. Type a figure.',
      loading: 'Loading the history…',
      error: 'The history could not load. Type a figure.',
      euroArea: 'Euro area',
      needed: 'Enter an inflation figure to see the comparison: the results are shown in today\'s money and the return settings are after inflation.',
    },
    returns: {
      legend: 'Returns',
      cautious: { label: 'Cautious', desc: '{rate} a year after inflation' },
      historical: { label: 'Historical', desc: '{rate} a year after inflation, world stocks since 1900' },
      optimistic: { label: 'Optimistic', desc: '{rate} a year after inflation' },
      own: { label: 'My own figure', desc: 'Before inflation, as funds quote it' },
      above: 'This is {real} a year after inflation, above the top of the long-run range used in this model and in our lessons ({low}% to {top}% a year after inflation for world stocks since 1900, Dimson, Marsh and Staunton; mostly developed markets). The results below use your figure and also show the historical range beside it.',
      below: 'This is {real} a year after inflation: the investment would lose buying power.',
      realIs: 'After inflation: {real} a year.',
    },
    horizons: {
      legend: 'Compare on',
      payoff: 'The day the debt would be paid off early',
      plus5: 'Five years after that',
      plus10: 'Ten years after that',
    },
    problems: {
      'no-balance': 'Enter what you owe.',
      'payment-too-low': 'The monthly payment does not cover the interest, so the debt would never be paid. Enter a larger payment.',
      'too-long': 'At this payment the debt would take more than {years} years to pay. Enter a larger payment.',
      'impossible-rate': 'A rate of -100% or less is not possible.',
    },
    results: {
      heading: 'How the two paths compared',
      fix: 'Fix the highlighted fields to update the result.',
      on: 'Compared {when}.',
      when: {
        months: { one: 'in {n} month', few: 'in {n} months', other: 'in {n} months' },
        years: { one: 'in {n} year', few: 'in {n} years', other: 'in {n} years' },
        yearsMonths: 'in {years} and {months}',
        yearsPart: { one: '{n} year', few: '{n} years', other: '{n} years' },
        monthsPart: { one: '{n} month', few: '{n} months', other: '{n} months' },
      },
      share: 'Investing the extra money ended with higher modelled net wealth in {invest} of 100 scenarios; paying off the debt did in {payoff}.',
      shareEven: 'The two paths ended level in every scenario: there is no extra money to compare.',
      gap: 'The gap, investing minus paying off, in today\'s money: {p10} at the 10th scenario in 100, {p50} in the middle, {p90} at the 90th.',
      gapNote: 'A negative figure means paying off ended ahead in that scenario. The 10th is not a worst case: one scenario in ten did worse.',
      payoffPath: 'Pay off first',
      investPath: 'Invest the extra',
      netWealth: 'Net wealth on that date, today\'s money',
      range: '{p10} to {p90}',
      middle: 'Middle: {p50}',
      paidIn: 'Debt paid {when}',
      paidAfter: 'Debt paid {when}, after the comparison date',
      stillOwed: 'Still owed on the date: {amount}',
      interest: 'Interest charged up to the date: {amount}',
      avoided: 'Paying off early avoids {amount} of interest up to the date ({today} in today\'s money).',
      rates: 'The debt costs {debt} a year after relief and inflation; the investment\'s compound return in this setting is {invest} a year after inflation, before fees.',
      side: {
        heading: 'Your figure beside the historical range',
        caption: 'The same debt and extra money, with three return figures',
        figure: 'Return',
        invest: 'Investing ahead, of 100',
        gap: 'Middle gap',
        yours: 'Your figure ({rate} after inflation)',
        cautious: 'Cautious ({rate})',
        optimistic: 'Optimistic ({rate})',
      },
      chartTitle: 'Net wealth on the comparison date, 10th to 90th scenario in 100',
      chartLabel: '{path}: {p10} to {p90}, middle {p50}',
    },
    actions: {
      reset: 'Start again',
      copy: 'Copy a link to these results',
      copied: 'Link copied',
      copyPrompt: 'Copy this link:',
      shareNote: 'The link contains the numbers you entered, after the # in the address.',
    },
    export: {
      moneyLabel: 'Money',
      moneyText: "Net wealth and gaps are in today's money; the debt figures are as charged.",
      meaning: 'How the two paths compared in simulated scenarios with the figures entered. It does not say which to choose.',
      sheets: { result: 'Result', range: 'Range' },
      inflation: 'Inflation used',
      inflationSource: 'Inflation source',
      inflationTyped: 'Typed',
      returns: 'Return setting',
      horizon: 'Compared on',
      months: 'Months from today',
      paths: 'Scenarios',
      columns: { path: 'Path', p10: '10th in 100', p50: 'Middle', p90: '90th in 100' },
      gapRow: 'Gap, investing minus paying off',
      investAhead: 'Investing ahead, of 100',
      method: 'Paired simulations of world stock returns after inflation (Dimson, Marsh and Staunton world equities, 1900 to 2025), converted with the inflation figure; debt charged monthly at its own rate; results deflated to today\'s money.',
    },
    currencies: currenciesEn,
  },
};

type InvestOrPayOff = typeof investOrPayOffEn;

export const investOrPayOffHi: InvestOrPayOff = investOrPayOffEn;
export const investOrPayOffEs: InvestOrPayOff = investOrPayOffEn;
export const investOrPayOffCs: InvestOrPayOff = investOrPayOffEn;
export const investOrPayOffMr: InvestOrPayOff = investOrPayOffEn;
void currenciesHi;
void currenciesEs;
void currenciesCs;
void currenciesMr;
