/**
 * The loan comparison's small wording helpers (the top of LoanCompare.tsx):
 * a count of months as the tool writes it, what stands in the payoff row and
 * in place of a total, an APR, an offer's name, and the engine's English
 * messages put into the reader's language.
 *
 * No browser. The loans are small ones run through the real engine, each
 * worked out by hand in its comment, and the words are the real catalog's:
 * what is pinned is the exact text a reader sees.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loanComparisonEn, loanComparisonHi, loanComparisonEs } from '../i18n/strings/tools/loanComparison.ts';
import { computeLoan, type LoanResult, type RateSpec } from '../utils/loan/math.ts';
import {
  ENGINE_PHRASES,
  aprText,
  engineError,
  engineErrorKey,
  engineWarning,
  isTypedName,
  months,
  noTotalText,
  payoffText,
  shownName,
} from './LoanCompare.tsx';

// This tool's own strings, from the modules that define them: not the whole catalog,
// which would tie this file to every tool's strings (#904).
const TOOL_STRINGS = {
  en: { loanComparison: loanComparisonEn },
  hi: { loanComparison: loanComparisonHi },
  es: { loanComparison: loanComparisonEs },
};

const s = TOOL_STRINGS.en.loanComparison.island;
const es = TOOL_STRINGS.es.loanComparison.island;
const hi = TOOL_STRINGS.hi.loanComparison.island;

const over12 = { kind: 'term' as const, months: 12 };
/** A rate that changes after `initialMonths`, the payment kept. */
const kept = (initialMonths: number, later: number, first = 0): RateSpec => ({
  kind: 'hybrid',
  initialAnnualRate: first,
  initialMonths,
  subsequentAnnualRate: later,
  keeps: 'payment',
});

/** 1,200.00 at 0% over 12 months: 100.00 a month, paid off in month 12. */
const plain = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0 }, over12);

/**
 * 0% for 6 months, then 12% with the payment kept at 100.00. From the 600.00
 * left the interest is about 6, 5, 4, 3, 2 and 1: the last month of the term
 * clears what is left, so the loan ends on its term, in month 12.
 */
const onTerm = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: kept(6, 0.12) }, over12);

/**
 * The same with the rate going to 60% (5% a month). The interest is 30.00,
 * 26.50, 22.83, 18.97, 14.92 and 10.66, leaving 123.88 at the end of the
 * term; month 13 leaves 30.07 and month 14 pays it off: 2 months late.
 */
const later = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: kept(6, 0.6) }, over12);

/**
 * 120% a year (10% a month) for one month, then 0%, the payment kept at
 * 1,200 x 0.1 / (1 - 1.1^-12) = 176.12. Month 1 leaves 1,143.88; at 0% that
 * is six payments of 176.12 and a seventh of 87.16: month 8, 4 months early.
 */
const earlier = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 1.2, rateSpec: kept(1, 0, 1.2) }, over12);

/**
 * The payment kept at 100.00 while the rate goes to 120% after one month:
 * the 1,100.00 left costs 110.00 a month, more than the payment, from month 2.
 */
const neverLess = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: kept(1, 1.2) }, over12);

/**
 * 12,000.00 with the payment kept at 1,000.00 while the rate goes to 120%
 * after two months: the 10,000.00 left costs exactly 1,000.00 a month from
 * month 3, so the balance stands still.
 */
const neverEqual = (): LoanResult => computeLoan({ principalMinor: 1_200_000, annualRate: 0, rateSpec: kept(2, 1.2) }, over12);

/**
 * `neverLess` with 10.00 paid off in month 4. The rate still changes in month
 * 2, but only after the last lump sum can the balance be said never to fall
 * again: from month 5.
 */
const neverAfterLump = (): LoanResult =>
  computeLoan({ principalMinor: 120_000, annualRate: 0, rateSpec: kept(1, 1.2), lumpSums: [{ month: 4, amountMinor: 1_000 }] }, over12);

/**
 * The engine's own example of a balance still falling when the calculation
 * stops at 1,200 months: 1,000,000.00 over 360 months, 8.45% for 60 months,
 * then 9.622% with the payment kept.
 */
const beyondLimit = (): LoanResult =>
  computeLoan({ principalMinor: 100_000_000, annualRate: 0.0845, rateSpec: kept(60, 0.09622, 0.0845) }, { kind: 'term', months: 360 });

/** `plain` with a fee as large as the loan: nothing is received, so there is no APR. */
const allFee = (): LoanResult => computeLoan({ principalMinor: 120_000, annualRate: 0, feeMinor: 120_000 }, over12);

describe('a count of months, as the tool writes it', () => {
  it('writes months alone below a year', () => {
    assert.equal(months(1, s.months), '1 mo');
    assert.equal(months(2, s.months), '2 mo');
    assert.equal(months(11, s.months), '11 mo');
  });

  it('writes whole years without months', () => {
    assert.equal(months(12, s.months), '1 yr');
    assert.equal(months(24, s.months), '2 yr');
    assert.equal(months(1200, s.months), '100 yr');
  });

  it('writes years and the months left over', () => {
    assert.equal(months(13, s.months), '1 yr 1 mo');
    assert.equal(months(18, s.months), '1 yr 6 mo');
    assert.equal(months(25, s.months), '2 yr 1 mo');
    assert.equal(months(42, s.months), '3 yr 6 mo');
  });

  it('says there is no count for nothing, less than nothing and what is not a number', () => {
    assert.equal(months(0, s.months), 'n/a');
    assert.equal(months(-5, s.months), 'n/a');
    assert.equal(months(-12, s.months), 'n/a');
    assert.equal(months(NaN, s.months), 'n/a');
    assert.equal(months(Infinity, s.months), 'n/a');
  });

  it('uses the words of the language it is given, singular and plural', () => {
    // English writes "1 yr" and "2 yr", "1 mo" and "2 mo" alike; Spanish does not.
    assert.equal(months(1, es.months), '1 mes');
    assert.equal(months(5, es.months), '5 meses');
    assert.equal(months(12, es.months), '1 año');
    assert.equal(months(13, es.months), '1 año y 1 mes');
    assert.equal(months(14, es.months), '1 año y 2 meses');
    assert.equal(months(24, es.months), '2 años');
    assert.equal(months(25, es.months), '2 años y 1 mes');
    assert.equal(months(30, es.months), '2 años y 6 meses');
    assert.equal(months(0, es.months), 'n. d.');
    assert.equal(months(1, hi.months), hi.months.one);
  });
});

describe('the payoff row', () => {
  it('is the count of months for a loan with no payment kept, with no note', () => {
    assert.deepEqual(payoffText(plain(), s), { value: '1 yr' });
  });

  it('names the month and says it matches the term when the kept payment ends on it', () => {
    assert.deepEqual(payoffText(onTerm(), s), { value: 'Month 12', hint: 'Matches the entered term of 1 yr.' });
  });

  it('says how much later than the term the loan is paid off', () => {
    assert.deepEqual(payoffText(later(), s), { value: 'Month 14', hint: '2 mo later than the entered term of 1 yr.' });
  });

  it('says how much earlier than the term the loan is paid off', () => {
    assert.deepEqual(payoffText(earlier(), s), { value: 'Month 8', hint: '4 mo earlier than the entered term of 1 yr.' });
  });

  it('says a loan is not paid off, and that the balance grows, when the payment is less than the interest', () => {
    assert.deepEqual(payoffText(neverLess(), s), {
      value: 'Not paid off',
      hint: 'From month 2, the payment is less than the monthly interest. The balance grows.',
    });
  });

  it('says the balance does not decrease when the payment only equals the interest', () => {
    assert.deepEqual(payoffText(neverEqual(), s), {
      value: 'Not paid off',
      hint: 'From month 3, the payment only covers the monthly interest. The balance does not decrease.',
    });
  });

  it('names the month the balance stops falling, not the month the rate changed', () => {
    const r = neverAfterLump();
    assert.equal(r.rateChange?.month, 2);
    assert.equal(payoffText(r, s).hint, 'From month 5, the payment is less than the monthly interest. The balance grows.');
  });

  it('falls back to the month of the rate change, then to 0, when no month is given', () => {
    const real = neverLess();
    const noMonth: LoanResult = { ...real, keptPayment: { outcome: 'never', termMonths: 12, covers: 'less' } };
    assert.equal(payoffText(noMonth, s).hint, 'From month 2, the payment is less than the monthly interest. The balance grows.');
    const { rateChange: _dropped, ...withoutChange } = noMonth;
    assert.equal(payoffText(withoutChange, s).hint, 'From month 0, the payment is less than the monthly interest. The balance grows.');
  });

  it('says the calculation stopped at its limit of a hundred years', () => {
    assert.deepEqual(payoffText(beyondLimit(), s), {
      value: 'Beyond the calculation limit',
      hint: 'The loan is not paid off within 100 yr. Its final payoff and totals have not been calculated.',
    });
  });
});

describe('what stands where a total would', () => {
  it('is "No finite total" for a loan that is never paid off', () => {
    assert.equal(noTotalText(neverLess(), s), 'No finite total');
    assert.equal(noTotalText(neverEqual(), s), 'No finite total');
  });

  it('is "Not available" when the calculation stopped at its limit, or no payment was kept', () => {
    assert.equal(noTotalText(beyondLimit(), s), 'Not available');
    assert.equal(noTotalText(onTerm(), s), 'Not available');
    assert.equal(noTotalText(plain(), s), 'Not available');
  });
});

describe('an APR as the tool prints it', () => {
  it('has two decimals and a per cent sign', () => {
    assert.equal(aprText(0.065, 'EUR', s, null), '6.50%');
    assert.equal(aprText(0, 'EUR', s, null), '0.00%');
    assert.equal(aprText(0.12345, 'INR', s, null), '12.35%');
  });

  it('is written the page\'s way when the page has one', () => {
    assert.equal(aprText(0.065, 'EUR', es, 'es').replace(/\s/g, ' '), '6,50 %');
  });

  it('says in the reader\'s language that a fee as large as the loan leaves no APR', () => {
    const apr = allFee().aprNominal;
    assert.ok(Number.isNaN(apr));
    assert.equal(aprText(apr, 'EUR', s, null), 'n/a');
    assert.equal(aprText(apr, 'EUR', hi, null), hi.results.aprNa);
    assert.notEqual(hi.results.aprNa, 'n/a');
    assert.equal(aprText(Infinity, 'EUR', hi, null), hi.results.aprNa);
  });
});

describe('an offer\'s name', () => {
  it('counts as typed only when it is not empty and not an untouched default', () => {
    assert.equal(isTypedName('My bank'), true);
    assert.equal(isTypedName('vendor a'), true);
    assert.equal(isTypedName('Vendor F'), true);
    assert.equal(isTypedName(''), false);
    assert.equal(isTypedName('   '), false);
    for (const letter of ['A', 'B', 'C', 'D', 'E']) assert.equal(isTypedName(`Vendor ${letter}`), false, letter);
  });

  it('is shown as typed', () => {
    assert.equal(shownName('My bank', 0, s), 'My bank');
    assert.equal(shownName('Vendor F', 1, s), 'Vendor F');
  });

  it('is shown in the reader\'s language while it is an untouched default, by its own letter and not its place', () => {
    assert.equal(shownName('Vendor A', 0, s), 'Offer A');
    assert.equal(shownName('Vendor C', 1, s), 'Offer C');
    assert.equal(shownName('Vendor E', 0, s), 'Offer E');
    assert.equal(shownName('Vendor B', 0, es), es.card.badge.replace('{label}', 'B'));
    assert.notEqual(es.card.badge, s.card.badge);
  });

  it('falls back to the letter of its place when empty, and to A past the last place', () => {
    assert.equal(shownName('', 0, s), 'Offer A');
    assert.equal(shownName('', 1, s), 'Offer B');
    assert.equal(shownName('', 4, s), 'Offer E');
    assert.equal(shownName('', 7, s), 'Offer A');
  });
});

/** Every message the engine writes, as it writes it, with the catalog key that holds its translation. */
const ENGINE_MESSAGES: [raw: string, key: keyof typeof s.engine.errors][] = [
  ['Principal must be greater than zero.', 'principal'],
  ['Monthly payment must be greater than zero.', 'payment'],
  ["Monthly payment is too low to ever pay off the loan; it does not even cover the first month's interest.", 'belowInterest'],
  ['Term must be at least one month.', 'term'],
  ['Enter a loan amount greater than zero.', 'amount'],
  ['This loan amount is too large for the tool. Enter a smaller amount.', 'amountMax'],
  ['The loan is too small for this term. Enter a larger amount or a shorter term.', 'tooSmall'],
  ['With this amount, rate and term, the monthly payment only covers the interest, so the loan is never paid off. Enter a lower rate, a shorter term or a larger amount.', 'interestOnly'],
  ['Enter a non-negative interest rate.', 'rate'],
  ['Initial fixed period must be a whole number of months, from 1 up.', 'initialFixed'],
  ['Enter a term of at least one month.', 'termMin'],
  ['Enter a monthly payment greater than zero.', 'paymentEnter'],
  ['Fixed-then-variable loans need a fixed term: under “Solve for”, choose “Monthly payment”.', 'hybridMode'],
  ['Refinance month must be at least 1.', 'refiMonth'],
  ['Refinance month must be before the original loan ends.', 'refiMonthEnd'],
  ['New rate must be non-negative.', 'refiRate'],
  ['New term must be at least 1 month.', 'refiTerm'],
  ['Original loan has no remaining balance at the refinance month.', 'refiBalance'],
  ['New loan is not valid.', 'newLoan'],
  ['Original loan is invalid; cannot compute refinance.', 'refiOriginal'],
  ['One of the optional boxes cannot be read. Use digits only, or clear the box.', 'optionalUnreadable'],
  ['The points cost is more than the fee above. The fee includes the points, so it cannot be smaller. Enter a larger fee or a smaller points cost.', 'pointsAboveFee'],
  ['A changing offer needs both of its boxes: the months before the change and the percentage after it. Fill in both, or choose the fixed kind.', 'rateChangeIncomplete'],
  ['A lump sum needs a whole month from 1 to 1200, written as month:amount. Correct it, or clear the box.', 'lumpMonth'],
];

describe('the engine\'s messages, in the reader\'s language', () => {
  it('shows each message as the catalog of the page\'s language has it', () => {
    for (const [raw, key] of ENGINE_MESSAGES) {
      assert.equal(engineError(raw, es), es.engine.errors[key], raw);
      assert.notEqual(es.engine.errors[key], raw, `${key} is not translated, so this proves nothing`);
      assert.equal(engineError(raw, s), s.engine.errors[key], raw);
    }
  });

  it('names the two boxes of a changing rate by their labels, and the other choice by its own', () => {
    // The sentence the tool works with names no box (the tool's analytics would file "rate" as a missing rate); the reader's does.
    const shown = engineError('A changing offer needs both of its boxes: the months before the change and the percentage after it. Fill in both, or choose the fixed kind.', s);
    assert.equal(shown, 'This offer’s rate is fixed, then variable, so it needs an initial fixed period of at least one month and a subsequent rate. Fill in what is missing, or choose “Fixed” under “Rate structure”.');
    for (const label of [s.card.hybrid.toLowerCase(), 'initial fixed period', 'subsequent rate', `“${s.card.fixed}”`, `“${s.card.rateStructure.title}”`]) assert.ok(shown.includes(label), label);
    assert.ok(s.card.initialFixed.toLowerCase().startsWith('initial fixed period'));
    assert.ok(s.card.subsequentRate.toLowerCase().startsWith('subsequent rate'));
    assert.equal(engineError('A changing offer needs both of its boxes: the months before the change and the percentage after it. Fill in both, or choose the fixed kind.', hi), hi.engine.errors.rateChangeIncomplete);
  });

  it('says what the month of a rate change has to be, naming its box and the other choice by their labels (issue 914)', () => {
    // What the engine writes for 60.4 months, which used to be worked out as 60.
    const raw = computeLoan(
      { principalMinor: 120_000, annualRate: 0, rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 60.4, subsequentAnnualRate: 0.12 } },
      { kind: 'term', months: 120 },
    ).error ?? '';
    const shown = engineError(raw, s);
    assert.equal(shown, 'The initial fixed period is a whole number of months, from 1 up. Correct it, or choose “Fixed” under “Rate structure”.');
    for (const label of ['initial fixed period', `“${s.card.fixed}”`, `“${s.card.rateStructure.title}”`]) assert.ok(shown.includes(label), label);
    assert.equal(engineErrorKey(raw), 'initialFixed');
    for (const island of [es, hi]) {
      assert.equal(engineError(raw, island), island.engine.errors.initialFixed);
      for (const label of [island.card.fixed, island.card.rateStructure.title]) assert.ok(island.engine.errors.initialFixed.includes(label), label);
    }
    // The sentence it replaced is no longer one the engine writes.
    assert.equal(engineErrorKey('Initial fixed period must be a positive number of months.'), undefined);
  });

  it('says how a lump sum is written, in the words of the box: the format as its help names it', () => {
    const raw = 'A lump sum needs a whole month from 1 to 1200, written as month:amount. Correct it, or clear the box.';
    assert.equal(engineError(raw, s), 'A lump sum is written as month:amount, with a whole month from 1 to 1,200. Correct it, or clear the box.');
    for (const island of [s, es, hi]) assert.ok(engineError(raw, island).includes(island.card.lumpsHelp.format), island.card.lumpsHelp.format);
    assert.equal(engineError(raw, es), es.engine.errors.lumpMonth);
  });

  it('names a message by the key of its translation, and a message it does not know by none', () => {
    assert.equal(engineErrorKey('Fixed-then-variable loans need a fixed term: under “Solve for”, choose “Monthly payment”.'), 'hybridMode');
    assert.equal(engineErrorKey('ENTER A LOAN AMOUNT GREATER THAN ZERO.'), 'amount');
    assert.equal(engineErrorKey('Something the engine grew later.'), undefined);
  });

  it('shows the message of a real loan with no amount', () => {
    const r = computeLoan({ principalMinor: 0, annualRate: 0 }, over12);
    assert.equal(engineError(r.error ?? '', s), 'Enter a loan amount greater than zero.');
    assert.equal(engineError(r.error ?? '', es), es.engine.errors.amount);
  });

  it('puts the count of months back into the two messages that carry one', () => {
    assert.equal(
      engineError('Loan does not amortize within 1200 months. Increase the monthly payment.', s),
      'Loan does not amortize within 1200 months. Increase the monthly payment.',
    );
    assert.equal(engineError('Term cannot exceed 1200 months.', s), 'Term cannot exceed 1200 months.');
    assert.equal(engineError('Term cannot exceed 1200 months.', es), es.engine.errors.termMax.replace('{months}', '1200'));
    assert.equal(
      engineError('Loan does not amortize within 1200 months. Increase the monthly payment.', es),
      es.engine.errors.notAmortizing.replace('{months}', '1200'),
    );
    // The term a real loan is refused for.
    const tooLong = computeLoan({ principalMinor: 120_000, annualRate: 0 }, { kind: 'term', months: 1201 });
    assert.equal(engineError(tooLong.error ?? '', s), 'Term cannot exceed 1200 months.');
  });

  it('leaves the count empty when such a message carries none', () => {
    assert.equal(engineError('Term cannot exceed the limit.', s), 'Term cannot exceed  months.');
  });

  it('recognises a message whatever its capitals', () => {
    assert.equal(engineError('ENTER A NON-NEGATIVE INTEREST RATE.', es), es.engine.errors.rate);
  });

  it('passes a message it does not know through unchanged', () => {
    assert.equal(engineError('Something the engine grew later.', es), 'Something the engine grew later.');
    assert.equal(engineError('', es), '');
  });

  it('knows a phrase for every message, and one message per phrase', () => {
    const all = [...ENGINE_MESSAGES.map(([raw]) => raw), 'Loan does not amortize within 1200 months.', 'Term cannot exceed 1200 months.'];
    for (const [phrase, key] of ENGINE_PHRASES) {
      const claimed = all.filter((raw) => raw.toLowerCase().includes(phrase));
      assert.equal(claimed.length, 1, `"${phrase}" (${key}) claims ${claimed.length} messages`);
    }
    assert.equal(ENGINE_PHRASES.length, all.length);
  });
});

describe('the engine\'s warnings, in the reader\'s language', () => {
  it('puts the two sums back into the precision warning', () => {
    // As the code reads it today, the second sum takes the engine's full stop
    // with it, so the sentence ends "120000.. Please": reported with #790, and
    // to be corrected here when the reading is.
    assert.equal(
      engineWarning('Internal precision check: principal sum 119999 ≠ 120000. Please report this.', s),
      'Internal precision check: principal sum 119999 ≠ 120000.. Please report this.',
    );
    assert.equal(
      engineWarning('Internal precision check: principal sum 119999 ≠ 120000. Please report this.', es),
      es.engine.warnings.precision.replace('{sum}', '119999').replace('{expected}', '120000.'),
    );
    assert.notEqual(es.engine.warnings.precision, s.engine.warnings.precision);
  });

  it('leaves the sums empty when the precision warning carries none', () => {
    assert.equal(engineWarning('PRECISION CHECK failed', s), 'Internal precision check: principal sum  ≠ . Please report this.');
  });

  it('shows the warning of a real loan whose later rate swallows the payment', () => {
    // 100,000.00 over 1,200 months at 0%, then 100,000% a year after one month.
    const r = computeLoan(
      { principalMinor: 10_000_000, annualRate: 0, rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 1, subsequentAnnualRate: 1000 } },
      { kind: 'term', months: 1200 },
    );
    assert.equal(r.warnings.length, 1);
    assert.equal(engineWarning(r.warnings[0], es), es.engine.warnings.subsequentRate);
    assert.notEqual(es.engine.warnings.subsequentRate, r.warnings[0]);
    assert.equal(engineWarning(r.warnings[0].toUpperCase(), es), es.engine.warnings.subsequentRate);
  });

  it('passes a warning it does not know through unchanged', () => {
    assert.equal(engineWarning('Something else to know.', es), 'Something else to know.');
  });

  it('shows the two notes of a real loan in the reader\'s language: a rate that never changes, a lump sum after the payoff', () => {
    // 1,200.00 at 0% over 12 months, the rate to change after 12, a lump sum in month 13.
    const r = computeLoan(
      { principalMinor: 120_000, annualRate: 0, rateSpec: { kind: 'hybrid', initialAnnualRate: 0, initialMonths: 12, subsequentAnnualRate: 0.12 }, lumpSums: [{ month: 13, amountMinor: 5000 }] },
      over12,
    );
    assert.deepEqual(r.warnings.map((w) => engineWarning(w, s)), [
      'The rate does not change within this term, so the subsequent rate is not used.',
      'The lump sum in month 13 comes after this loan is paid off in month 12, so it is not used.',
    ]);
    assert.deepEqual(r.warnings.map((w) => engineWarning(w, es)), [
      es.engine.warnings.rateNeverChanges,
      es.engine.warnings.lumpUnused.replace('{month}', '13').replace('{payoffMonth}', '12'),
    ]);
  });
});
