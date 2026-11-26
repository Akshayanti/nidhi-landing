/**
 * Unit tests for src/utils/shared/parseLocaleNumber.ts.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalNumber,
  completeNumber,
  displayNumber,
  formatForInput,
  latinDigits,
  numberSeparators,
  parseLocaleNumber,
  plainDigits,
} from './parseLocaleNumber.ts';

const EN = 'en';
const HI = 'en-IN';
const ES = 'es';

describe('numberSeparators', () => {
  it('reads each page locale\'s marks from Intl', () => {
    assert.deepEqual(numberSeparators(EN), { group: ',', decimal: '.' });
    assert.deepEqual(numberSeparators(HI), { group: ',', decimal: '.' });
    assert.deepEqual(numberSeparators(ES), { group: '.', decimal: ',' });
  });
});

describe('English and Hindi pages: comma groups, point is the decimal', () => {
  for (const locale of [EN, HI]) {
    it(`reads plain, grouped and decimal numbers (${locale})`, () => {
      assert.equal(parseLocaleNumber('10000', locale), 10_000);
      assert.equal(parseLocaleNumber('10,000', locale), 10_000);
      assert.equal(parseLocaleNumber('1,234,567.89', locale), 1_234_567.89);
      assert.equal(parseLocaleNumber('2.5', locale), 2.5);
      assert.equal(parseLocaleNumber('0.75', locale), 0.75);
    });
  }

  it('reads Indian lakh grouping', () => {
    assert.equal(parseLocaleNumber('10,00,000', HI), 1_000_000);
    assert.equal(parseLocaleNumber('1,25,00,000.50', HI), 12_500_000.5);
    // No western number groups in twos, so an Indian reader on the English page is read too.
    assert.equal(parseLocaleNumber('10,00,000', EN), 1_000_000);
    assert.equal(parseLocaleNumber('10,00,000', ES), 1_000_000);
    assert.equal(parseLocaleNumber('10.00.000', ES), null, 'lakh grouping is written with commas');
  });

  it('reads "10.000" as ten, since the point is the decimal mark here', () => {
    assert.equal(parseLocaleNumber('10.000', EN), 10);
    assert.equal(parseLocaleNumber('10.000', EN, { maxDecimals: 2 }), null, 'three decimals are refused where two are allowed');
  });

  it('takes the only possible reading when the input cannot be grouping', () => {
    assert.equal(parseLocaleNumber('2,5', EN), 2.5, 'a comma before one digit can only be a decimal');
    assert.equal(parseLocaleNumber('12,34', EN), 12.34, 'nor before two');
    assert.equal(parseLocaleNumber('1.234.567', EN), 1_234_567, 'several points can only be grouping');
    assert.equal(parseLocaleNumber('10.000,50', EN), 10_000.5, 'with both marks, the rightmost is the decimal');
  });
});

describe('Spanish pages: point groups, comma is the decimal', () => {
  it('reads plain, grouped and decimal numbers', () => {
    assert.equal(parseLocaleNumber('10000', ES), 10_000);
    assert.equal(parseLocaleNumber('10.000', ES), 10_000);
    assert.equal(parseLocaleNumber('2,5', ES), 2.5);
    assert.equal(parseLocaleNumber('10.000,50', ES), 10_000.5);
    assert.equal(parseLocaleNumber('1.234.567,8', ES), 1_234_567.8);
    assert.equal(parseLocaleNumber('2,500', ES), 2.5, 'the comma is the decimal mark here, whatever follows it');
  });

  it('takes a point before fewer or more than three digits as a decimal', () => {
    assert.equal(parseLocaleNumber('2.5', ES), 2.5);
    assert.equal(parseLocaleNumber('3.25', ES), 3.25);
    assert.equal(parseLocaleNumber('2.500', ES), 2_500, 'three digits after a point is grouping on a Spanish page');
  });
});

describe('Czech pages: space groups, comma is the decimal', () => {
  it('reads plain, grouped and decimal numbers', () => {
    assert.equal(parseLocaleNumber('10000', 'cs'), 10_000);
    assert.equal(parseLocaleNumber('10 000', 'cs'), 10_000);
    assert.equal(parseLocaleNumber('10\u00a0000,50', 'cs'), 10_000.5);
    assert.equal(parseLocaleNumber('2,5', 'cs'), 2.5);
  });

  it('reads a point as many Czech readers type it', () => {
    assert.equal(parseLocaleNumber('2.5', 'cs'), 2.5, 'a point before one digit can only be a decimal');
    assert.equal(parseLocaleNumber('10.000', 'cs'), 10_000, 'three digits after a point is grouping, as on a Spanish page');
  });
});

describe('spaces as grouping, in every locale', () => {
  it('accepts spaces, no-break spaces and thin spaces between groups', () => {
    assert.equal(parseLocaleNumber('10 000', EN), 10_000);
    assert.equal(parseLocaleNumber('10 000,50', ES), 10_000.5);
    assert.equal(parseLocaleNumber('1 234 567', ES), 1_234_567);
    assert.equal(parseLocaleNumber('  42  ', EN), 42);
  });

  it('rejects spaces that do not separate groups of three', () => {
    assert.equal(parseLocaleNumber('1 2', EN), null);
    assert.equal(parseLocaleNumber('10  000', EN), null);
  });
});

describe('what is rejected rather than guessed', () => {
  for (const [raw, locale] of [
    ['', EN],
    ['abc', EN],
    ['1,23,4', EN],
    ['1,2,3', EN],
    ['1.2.3', ES],
    ['12.34.567', ES],
    ['1,234.5.6', EN],
    ['.5', EN],
    ['5.', EN],
    ['5,', ES],
    ['1e3', EN],
    ['10.000.5', EN],
    ['1 000.000,5', ES],
    ['12,34.5', EN],
  ] as const) {
    it(`"${raw}" on ${locale}`, () => assert.equal(parseLocaleNumber(raw, locale), null));
  }

  it('refuses a minus sign unless negatives are allowed', () => {
    assert.equal(parseLocaleNumber('-2,5', ES), null);
    assert.equal(parseLocaleNumber('-2,5', ES, { allowNegative: true }), -2.5);
    assert.equal(parseLocaleNumber('−2.5', EN, { allowNegative: true }), -2.5);
    assert.equal(parseLocaleNumber('-0', EN, { allowNegative: true }), 0);
    assert.ok(!Object.is(parseLocaleNumber('-0', EN, { allowNegative: true }), -0));
  });

  it('refuses more decimals than allowed', () => {
    assert.equal(parseLocaleNumber('3.14', EN, { maxDecimals: 2 }), 3.14);
    assert.equal(parseLocaleNumber('3.145', EN, { maxDecimals: 2 }), null);
    assert.equal(parseLocaleNumber('3,145', ES, { maxDecimals: 2 }), null);
  });
});

describe('formatForInput', () => {
  it('writes a number back in the page\'s style, without grouping', () => {
    assert.equal(formatForInput(2.5, EN), '2.5');
    assert.equal(formatForInput(2.5, ES), '2,5');
    assert.equal(formatForInput(10_000, ES), '10000');
    assert.equal(formatForInput(1_000_000, HI), '1000000');
    assert.equal(formatForInput(3.14159, EN), '3.14');
  });

  it('round-trips through the parser in every locale', () => {
    for (const locale of [EN, HI, ES]) {
      for (const n of [0, 2.5, 3.25, 10_000, 1_234_567.89, 10_000.5]) {
        assert.equal(parseLocaleNumber(formatForInput(n, locale), locale), n, `${n} in ${locale}`);
      }
    }
  });
});

describe('grouping is one system or the other, never a mix', () => {
  it('rejects western and Indian groups mixed in one number', () => {
    assert.equal(parseLocaleNumber('1,234,56,789', 'hi'), null);
    assert.equal(parseLocaleNumber('123,45,678', 'hi'), null);
  });

  it('still reads each system on its own', () => {
    assert.equal(parseLocaleNumber('1,00,00,000', 'hi'), 10_000_000);
    assert.equal(parseLocaleNumber('1,234,567', 'hi'), 1_234_567);
    assert.equal(parseLocaleNumber('1.234.567', 'es'), 1_234_567);
  });
});

describe('canonicalNumber and displayNumber: the input box and plain-number state', () => {
  it('turns what a reader types into JavaScript\'s own spelling', () => {
    assert.equal(canonicalNumber('10.000', ES), '10000');
    assert.equal(canonicalNumber('2,5', ES), '2.5');
    assert.equal(canonicalNumber('1.234,56', ES), '1234.56');
    assert.equal(canonicalNumber('10,000', EN), '10000');
    assert.equal(canonicalNumber('10,00,000', HI), '1000000');
    assert.equal(canonicalNumber('6.5', EN), '6.5');
    assert.equal(canonicalNumber('  ', ES), '');
    assert.equal(canonicalNumber('2,', ES), '2', 'a decimal mark still being typed');
    assert.equal(canonicalNumber('2.', EN), '2');
    assert.equal(canonicalNumber('.5', EN), '0.5', 'a leading decimal mark, as the tools always read it');
    assert.equal(canonicalNumber(',5', ES), '0.5');
  });

  it('completes a half-typed number the same way for every tool (#520)', () => {
    assert.equal(completeNumber('2.', EN), '2');
    assert.equal(completeNumber('.5', EN), '0.5');
    assert.equal(completeNumber(',5', ES), '0,5');
    assert.equal(completeNumber('2,', ES), '2');
    assert.equal(completeNumber('-.5', EN), '-0.5');
    assert.equal(completeNumber('.', EN), '.', 'a mark alone is not a number');
    assert.equal(completeNumber('2.5', EN), '2.5');
    // Not the page's decimal mark: left for the parser to judge.
    assert.equal(completeNumber('.5', ES), '.5');
  });

  it('marks text that is not a number as NaN rather than reading it another way', () => {
    assert.equal(canonicalNumber('1,23,4', EN), 'NaN');
    assert.equal(canonicalNumber('abc', ES), 'NaN');
    assert.equal(Number(canonicalNumber('1.2.3', ES)), NaN);
  });

  it('shows plain numbers in the page\'s style', () => {
    assert.equal(displayNumber('2.5', ES), '2,5');
    assert.equal(displayNumber('5.125', ES), '5,125');
    assert.equal(displayNumber('250000', ES), '250000');
    assert.equal(displayNumber('2.5', EN), '2.5');
    assert.equal(displayNumber('', ES), '');
    assert.equal(displayNumber('1.123456789012', ES), '1,123456789012', 'every digit kept');
    assert.equal(displayNumber('007', EN), '007', 'shown as stored');
  });

  it('shows an older link\'s comma-grouped value as the number those tools read', () => {
    assert.equal(displayNumber('250,000', ES), '250000');
    assert.equal(displayNumber('250,000', EN), '250000');
  });

  it('round-trips: what is shown reads back as the same number', () => {
    for (const locale of [EN, HI, ES]) {
      for (const v of ['0', '6.5', '5.125', '250000', '1234.56', '0.01']) {
        assert.equal(canonicalNumber(displayNumber(v, locale), locale), v, `${v} on ${locale}`);
      }
    }
  });
});

describe('a decimal below one is never read as a grouped whole number (issue 338)', () => {
  it('reads "0.125" and "0,125" as one eighth on every page', () => {
    for (const locale of ['en', 'en-IN', 'es', 'cs']) {
      assert.equal(parseLocaleNumber('0.125', locale), 0.125, locale);
      assert.equal(parseLocaleNumber('0,125', locale), 0.125, locale);
      assert.equal(parseLocaleNumber('0.500', locale), 0.5, locale);
      assert.equal(parseLocaleNumber('0,500', locale), 0.5, locale);
      assert.equal(parseLocaleNumber('0.005', locale), 0.005, locale);
    }
  });

  it('a group cannot start with a zero, so such text is a decimal or nothing', () => {
    assert.equal(parseLocaleNumber('012,345', 'en'), null);
    assert.equal(parseLocaleNumber('0,12,345', 'en-IN'), null);
    assert.equal(parseLocaleNumber('0.125.000', 'es'), null);
  });

  it('real grouped numbers are read as before', () => {
    assert.equal(parseLocaleNumber('1,125', 'en'), 1125);
    assert.equal(parseLocaleNumber('1.125', 'es'), 1125);
    assert.equal(parseLocaleNumber('10,00,000', 'en-IN'), 1000000);
    assert.equal(parseLocaleNumber('100.000', 'es'), 100000);
    assert.equal(parseLocaleNumber('1.125', 'en'), 1.125);
    assert.equal(parseLocaleNumber('1,125', 'es'), 1.125);
  });
});

describe('digits from other keyboards, and very large and very small numbers (#354)', () => {
  it('reads Devanagari, Arabic-Indic and Persian digits as the same number on every page', async () => {
    const m = await import('./parseLocaleNumber.ts');
    for (const locale of ['en', 'hi', 'mr', 'es', 'cs']) {
      assert.equal(m.parseLocaleNumber('१२३', locale), 123, locale);
      assert.equal(m.parseLocaleNumber('١٢٣', locale), 123, locale);
      assert.equal(m.parseLocaleNumber('۱۲۳', locale), 123, locale);
    }
    assert.equal(m.parseLocaleNumber('१०,००,०००', 'hi'), 1_000_000);
    assert.equal(m.parseLocaleNumber('२.५', 'mr'), 2.5);
    assert.equal(m.parseLocaleNumber('१2३', 'en'), 123);
    assert.equal(m.canonicalNumber('७.२५', 'hi'), '7.25');
    assert.equal(m.latinDigits('१२३ ٤٥٦ ۷۸۹ abc'), '123 456 789 abc');
    // Other scripts' digits are not guessed at.
    assert.equal(m.parseLocaleNumber('１２３', 'en'), null);
    assert.equal(m.parseLocaleNumber('௧௨௩', 'en'), null);
  });

  it('a very large number is shown in full, never in exponent form', async () => {
    const m = await import('./parseLocaleNumber.ts');
    assert.equal(m.displayNumber('1e21', 'en'), '1' + '0'.repeat(21));
    assert.equal(m.displayNumber('1e21', 'es'), '1' + '0'.repeat(21));
  });

  it('a number smaller than the box shows rounds to 0, and keeps its digits when asked', async () => {
    const m = await import('./parseLocaleNumber.ts');
    assert.equal(m.formatForInput(0.000001, 'en'), '0');
    assert.equal(m.formatForInput(0.000001, 'en', 6), '0.000001');
    assert.equal(m.formatForInput(0.000001, 'es', 6), '0,000001');
    assert.equal(m.formatForInput(0.004, 'en'), '0');
    assert.equal(m.formatForInput(0.005, 'en'), '0.01');
  });
});

describe('a number too long to print in digits by default (#520)', () => {
  it('is still handed on in plain digits, never as an exponent', () => {
    assert.equal(canonicalNumber('999999999999999999999', 'en'), '1000000000000000000000');
    assert.match(canonicalNumber('2500099999999999999999999', 'en'), /^\d{25}$/);
    assert.equal(canonicalNumber('99999999999999999999', 'en'), '100000000000000000000');
  });

  it('reads a number past what a number can hold as the largest there is, not as no number', () => {
    const huge = '9'.repeat(400);
    assert.equal(parseLocaleNumber(huge, 'en'), Number.MAX_VALUE);
    assert.equal(parseLocaleNumber(`-${huge}`, 'en', { allowNegative: true }), -Number.MAX_VALUE);
    assert.match(canonicalNumber(huge, 'en'), /^\d{309}$/);
    assert.equal(parseLocaleNumber(`${huge}x`, 'en'), null, 'still not a number when it is not one');
  });
});

/**
 * The Arabic decimal mark "٫" (U+066B) and thousands mark "٬" (U+066C), #625.
 * The rule: "٫" is always a decimal and "٬" always grouping, on every page,
 * whatever the page's own marks are; a number that mixes either of them with
 * a Latin point or comma is rejected rather than guessed at.
 */
describe('the Arabic decimal and thousands marks (#625)', () => {
  const PAGES = ['en', 'hi', 'mr', 'en-IN', 'es', 'cs'];

  it('reads "٫" as the decimal mark on every page, comma-decimal pages included', () => {
    for (const locale of PAGES) {
      assert.equal(parseLocaleNumber('٢٫٥', locale), 2.5, locale);
      assert.equal(parseLocaleNumber('۲٫۵', locale), 2.5, `${locale}, Persian digits`);
      assert.equal(parseLocaleNumber('2٫5', locale), 2.5, `${locale}, Latin digits`);
      assert.equal(parseLocaleNumber('٠٫١٢٥', locale), 0.125, locale);
      // Three digits after "٫" are still decimals, never a group.
      assert.equal(parseLocaleNumber('١٫٢٣٤', locale), 1.234, locale);
      assert.equal(canonicalNumber('٧٫٢٥', locale), '7.25', locale);
    }
  });

  it('reads "٬" as grouping on every page, point-grouping pages included', () => {
    for (const locale of PAGES) {
      assert.equal(parseLocaleNumber('١٬٢٣٤', locale), 1234, locale);
      assert.equal(parseLocaleNumber('١٬٢٣٤٬٥٦٧', locale), 1_234_567, locale);
      assert.equal(parseLocaleNumber('١٬٢٣٤٫٥', locale), 1234.5, locale);
      assert.equal(parseLocaleNumber('١٠٬٠٠٬٠٠٠', locale), 1_000_000, `${locale}, Indian grouping`);
      assert.equal(parseLocaleNumber('١ ٢٣٤٫٥', locale), 1234.5, `${locale}, a space groups with "٫" as the decimal`);
    }
  });

  it('never reads "٬" as a decimal mark, even where only that reading would fit', () => {
    for (const locale of PAGES) {
      for (const raw of ['٢٬٥', '١٢٬٣٤', '٠٬١٢٥', '١٬٢٣٤٬٥']) {
        assert.equal(parseLocaleNumber(raw, locale), null, `"${raw}" on ${locale}`);
      }
    }
  });

  it('rejects a number that mixes Arabic marks with Latin ones, rather than guessing', () => {
    for (const locale of PAGES) {
      for (const raw of ['١٬٢٣٤.٥', '١٬٢٣٤,٥', '1.234٫5', '1,234٫5', '١.٢٣٤٫٥', '٢٫٥,', '١٬٢٣٤ ٥٦٧']) {
        assert.equal(parseLocaleNumber(raw, locale), null, `"${raw}" on ${locale}`);
      }
    }
  });

  it('rejects misplaced Arabic marks', () => {
    for (const locale of PAGES) {
      for (const raw of ['٢٫٥٫٠', '١٫٢٣٤٬٥٦٧', '٫', '٬', '١٬', '٬١٢٣']) {
        assert.equal(parseLocaleNumber(raw, locale), null, `"${raw}" on ${locale}`);
      }
    }
    assert.equal(parseLocaleNumber('١٫٢٣٤', 'en', { maxDecimals: 2 }), null, 'more decimals than allowed');
  });

  it('completes a half-typed number with "٫" as with the page\'s own mark', () => {
    for (const locale of PAGES) {
      assert.equal(canonicalNumber('٢٫', locale), '2', locale);
      assert.equal(canonicalNumber('٫٥', locale), '0.5', locale);
      assert.equal(completeNumber('-٫٥', locale), '-0٫٥', locale);
    }
  });

  it('completing a number never hides a mixture of Arabic and Latin marks', () => {
    for (const [raw, locale] of [['٢٫٥,', 'es'], ['150.000٫', 'en'], ['1,234٫', 'en'], [',5٬000', 'es']]) {
      assert.equal(canonicalNumber(raw, locale), 'NaN', `${raw} on ${locale}`);
    }
  });
});

describe('a number in a link keeps every digit (#789)', () => {
  it('displayNumber changes only the mark, below zero too', () => {
    assert.equal(displayNumber('-99.99000000001', EN), '-99.99000000001');
    assert.equal(displayNumber('-99.99000000001', ES), '-99,99000000001');
  });
  it('canonicalNumber writes a tiny number in plain digits', () => {
    assert.equal(canonicalNumber('0.0000001', EN), '0.0000001');
    assert.equal(canonicalNumber('0,00000000012', ES), '0.00000000012');
    assert.equal(canonicalNumber(`0.${'0'.repeat(24)}5`, EN), `0.${'0'.repeat(24)}5`);
  });
});

describe('the marks of a page', () => {
  it('takes a space-like grouping mark as a plain space', () => {
    assert.deepEqual(numberSeparators('cs'), { group: ' ', decimal: ',' });
  });

  it('works a locale\'s marks out once', () => {
    assert.equal(numberSeparators('es'), numberSeparators('es'));
  });

  it('falls back to a comma and a point when Intl names no marks', () => {
    const real = Intl.NumberFormat;
    // A stand-in for a locale whose formatted number has neither part.
    Intl.NumberFormat = function () {
      return { formatToParts: () => [{ type: 'integer', value: '1234567' }] };
    } as unknown as typeof Intl.NumberFormat;
    try {
      assert.deepEqual(numberSeparators('x-no-marks'), { group: ',', decimal: '.' });
    } finally {
      Intl.NumberFormat = real;
    }
  });
});

describe('each check, at its edge', () => {
  it('refuses text that is not digits, marks and spaces from a digit on', () => {
    for (const raw of ['abc', 'a1', '1a', 'x', '-', '1-2', '5-', '1.5a', ',', '.', ' ']) {
      assert.equal(parseLocaleNumber(raw, EN), null, JSON.stringify(raw));
      assert.equal(parseLocaleNumber(raw, EN, { allowNegative: true }), null, JSON.stringify(raw));
    }
    assert.equal(parseLocaleNumber('7', EN), 7, 'one digit is a number');
  });

  it('reads the Persian and Arabic-Indic zero, and the last digit of each script', () => {
    assert.equal(latinDigits('۰۹ ٠٩ ०९'), '09 09 09');
  });

  it('refuses a space, of any kind, that is not between groups of three', () => {
    assert.equal(parseLocaleNumber('1 2', EN), null);
    assert.equal(parseLocaleNumber('1 2', EN), null);
    assert.equal(parseLocaleNumber('1 2', EN), null);
    assert.equal(parseLocaleNumber('1 000', EN), 1000);
    assert.equal(parseLocaleNumber('1 000', EN), 1000);
    assert.equal(parseLocaleNumber('1.5 0', EN), null, 'nor one among the decimals');
    assert.equal(parseLocaleNumber('1.50 ', EN), 1.5, 'spaces around the number are not part of it');
  });

  it('reads a minus sign set off by a space', () => {
    assert.equal(parseLocaleNumber('- 5', EN, { allowNegative: true }), -5);
    assert.equal(parseLocaleNumber('− 2,5', ES, { allowNegative: true }), -2.5);
  });

  it('reads a point with more than three digits after it as a decimal on a page that groups with points', () => {
    assert.equal(parseLocaleNumber('1.2345678', ES), 1.2345678);
    assert.equal(parseLocaleNumber('1,2345', EN), 1.2345);
  });

  it('refuses three digits after the grouping mark when the whole part is no group', () => {
    assert.equal(parseLocaleNumber('1230,125', EN), null);
    assert.equal(parseLocaleNumber('1234.567', ES), null);
  });

  it('reads a whole part of several zeros as zero', () => {
    assert.equal(parseLocaleNumber('00,125', EN), 0.125);
    assert.equal(parseLocaleNumber('00.125', ES), 0.125);
  });

  it('refuses two kinds of grouping in one number', () => {
    assert.equal(parseLocaleNumber('1 234,567', EN), null);
    assert.equal(parseLocaleNumber('1.234 567', ES), null);
  });
});

describe('plainDigits, completeNumber and displayNumber at their edges', () => {
  it('writes a tiny number below zero with its sign', () => {
    assert.equal(plainDigits(-0.0000001), '-0.0000001');
    assert.equal(plainDigits(-1.5e-9), '-0.0000000015');
    assert.equal(plainDigits(1.5e-9), '0.0000000015');
    assert.equal(plainDigits(0), '0');
    assert.equal(plainDigits(-2.5), '-2.5');
    assert.equal(plainDigits(-1e21), '-1' + '0'.repeat(21));
  });

  it('completes a number with spaces around it or after its sign', () => {
    assert.equal(completeNumber('2. ', EN), '2');
    assert.equal(completeNumber('25.', EN), '25', 'only the mark is dropped');
    assert.equal(completeNumber('1.250,', ES), '1.250');
    assert.equal(completeNumber(' .5', EN), '0.5');
    assert.equal(completeNumber('- .5', EN), '-0.5');
    assert.equal(completeNumber('−,5', ES), '−0,5');
  });

  it('leaves text that is not a number as it was typed', () => {
    assert.equal(completeNumber('2.5-3', EN), '2.5-3');
    assert.equal(completeNumber('2 -', EN), '2 -');
  });

  it('shows a box of nothing but spaces as empty, and an unreadable one as a question mark', () => {
    assert.equal(displayNumber('   ', ES), '');
    assert.equal(displayNumber(' NaN ', ES), '?');
    assert.equal(displayNumber('abc', ES), 'abc');
    assert.equal(displayNumber(' 2.5 ', ES), '2,5');
  });
});
