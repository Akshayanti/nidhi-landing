import type { Locale } from '../../i18n/config.ts';

/**
 * Worked examples behind the homepage hero charts. Every value a visitor can
 * read off those charts (by hovering) comes from these calculations and the
 * assumptions stated beside them, so the examples stay internally consistent.
 *
 * Amounts are in today's money, in the edition's example currency (see
 * `EXAMPLES`); growth is a steady 5% a year
 * after inflation, the middle of the long-run range used across the site,
 * applied monthly, with savings added at the start of each month.
 */

export const EXAMPLE_RETURN = 0.05;
const MONTHLY_GROWTH = Math.pow(1 + EXAMPLE_RETURN, 1 / 12);

/** Balance after each month: index 0 is the start. */
export function monthlyPath(start: number, monthly: number, months: number): number[] {
  const out = [start];
  let b = start;
  for (let m = 0; m < months; m++) {
    b = (b + monthly) * MONTHLY_GROWTH;
    out.push(b);
  }
  return out;
}

/** Year-end balances: index 0 is the start. */
export function yearlyPath(start: number, monthly: number, years: number): number[] {
  const months = monthlyPath(start, monthly, years * 12);
  return months.filter((_, i) => i % 12 === 0);
}

/**
 * The hero's worked example, at the scale of someone starting out: a little
 * saved, an old car, a small pension, a student loan. It walks one idea
 * through the arc the homepage describes: learn what net worth is, see one
 * person's, then look ahead at what steady saving could do.
 *
 * The look-ahead grows an invested balance, not the whole net worth: a net
 * worth made of a car, cash, a pension and a loan does not earn one return
 * (the car loses value, the loan is paid down). The invested balance starts
 * at the same €3,400 so the step reads on from the table.
 */
export const STARTER = {
  owns: [
    { name: 'Savings account', amount: 4_200 },
    { name: 'Car, if sold today', amount: 3_400 },
    { name: 'Workplace pension', amount: 1_000 },
  ],
  owes: [{ name: 'Student loan', amount: 5_200 }],
  monthly: 150,
  years: 10,
};

export type Starter = typeof STARTER;

/**
 * One worked example per example currency. Each edition shows its readers an
 * example in a currency they live with: English and Spanish in euros, Hindi in
 * rupees. The rupee figures are chosen at Indian scale, not converted at an
 * exchange rate (a converted used car would read ₹3,77,000), and keep the
 * euro example's shape: the invested balance again starts at the vehicle's
 * value, the higher saving is again double the lower, and the two people
 * again earn the same and hold roughly the same multiples of that income.
 */
export const EXAMPLES = {
  EUR: {
    starter: STARTER,
    higherMonthly: 300,
    sameIncome: 3_000,
    people: { alex: { owns: 22_000, owes: 31_000 }, sam: { owns: 16_500, owes: 4_000 } },
  },
  INR: {
    starter: {
      owns: [
        { name: 'Savings account', amount: 75_000 },
        { name: 'Vehicle, if sold today', amount: 60_000 },
        { name: 'Provident fund', amount: 45_000 },
      ],
      owes: [{ name: 'Education loan', amount: 1_20_000 }],
      monthly: 3_000,
      years: 10,
    } satisfies Starter,
    higherMonthly: 6_000,
    sameIncome: 50_000,
    people: { alex: { owns: 4_40_000, owes: 6_20_000 }, sam: { owns: 3_30_000, owes: 80_000 } },
  },
};

export type ExampleCurrency = keyof typeof EXAMPLES;

/** The currency each edition's home page example is written in. */
export const EXAMPLE_CURRENCY: Record<Locale, ExampleCurrency> = {
  en: 'EUR',
  hi: 'INR',
  es: 'EUR',
};

export function starterExample(starter: Starter = STARTER) {
  const owned = starter.owns.reduce((s, i) => s + i.amount, 0);
  const owed = starter.owes.reduce((s, i) => s + i.amount, 0);
  const netWorth = owned - owed;
  const invested = netWorth;
  const values = yearlyPath(invested, starter.monthly, starter.years);
  const end = values[starter.years];
  const added = starter.monthly * 12 * starter.years;
  const putIn = invested + added;
  return { owned, owed, netWorth, invested, values, end, added, putIn, growth: end - putIn };
}
