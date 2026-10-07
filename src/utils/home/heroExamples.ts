/**
 * Worked examples behind the homepage hero charts. Every value a visitor can
 * read off those charts (by hovering) comes from these calculations and the
 * assumptions stated beside them, so the examples stay internally consistent.
 *
 * All amounts are in euros of today's money; growth is a steady 5% a year
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

export function starterExample() {
  const owned = STARTER.owns.reduce((s, i) => s + i.amount, 0);
  const owed = STARTER.owes.reduce((s, i) => s + i.amount, 0);
  const netWorth = owned - owed;
  const invested = netWorth;
  const values = yearlyPath(invested, STARTER.monthly, STARTER.years);
  const end = values[STARTER.years];
  const added = STARTER.monthly * 12 * STARTER.years;
  const putIn = invested + added;
  return { owned, owed, netWorth, invested, values, end, added, putIn, growth: end - putIn };
}
