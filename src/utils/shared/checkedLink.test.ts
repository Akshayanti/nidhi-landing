/**
 * A share link's state with a check on it (checkedLink.ts, #820): what is
 * summed, how a state is sealed, and each way a sealed state can arrive
 * damaged, one at a time.
 *
 * The expected checks are CRC-32 values worked out outside the code under
 * test: the literals with Python's zlib, the rest with Node's.
 *
 * Run with:  npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { CHECK_KEY, FORMAT_KEY, checkOf, openState, pairsOf, sealState, type Pair } from './checkedLink.ts';

/** The check of a text as it is defined: CRC-32 of its UTF-8 bytes, eight lower-case hex digits. */
const sum = (text: string): string => crc32(Buffer.from(text, 'utf8')).toString(16).padStart(8, '0');

/** A state written pair by pair, as a link carries it. */
const written = (pairs: Pair[]): string => pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

/** These pairs with a check that is right for them, the check last. */
const checked = (pairs: Pair[]): Pair[] => [...pairs, ['z', checkOf(pairs)]];

describe('the two keys of the envelope', () => {
  it('are f and z', () => {
    assert.equal(FORMAT_KEY, 'f');
    assert.equal(CHECK_KEY, 'z');
  });
});

describe('the pairs a state holds', () => {
  it('are read decoded, in the order written, duplicates kept', () => {
    assert.deepEqual(pairsOf('f=2&v1=Bank+A~250000&n=3&n=4&v2=caf%C3%A9%7E1'), [['f', '2'], ['v1', 'Bank A~250000'], ['n', '3'], ['n', '4'], ['v2', 'café~1']]);
    assert.deepEqual(pairsOf(''), []);
    assert.deepEqual(pairsOf('f'), [['f', '']]);
  });
});

describe('the check of a list of pairs', () => {
  it('is the CRC-32 of each key and value written as its length, a colon and its text', () => {
    assert.equal(checkOf([['f', '2']]), '43ef7d0d');
    assert.equal(checkOf([['f', '2'], ['n', '3']]), 'b0403023');
    assert.equal(checkOf([['f', '2'], ['n', '3']]), sum('1:f1:21:n1:3'));
    // A value with a letter outside ASCII, 13 characters long: 1:f1:22:v113:Bank é~250000, summed as UTF-8.
    assert.equal(checkOf([['f', '2'], ['v1', 'Bank é~250000']]), '58cbc815');
    assert.equal(checkOf([['v10_ls', '12:5000;24:2500']]), sum('6:v10_ls15:12:5000;24:2500'));
  });

  it('is eight digits whatever the sum: nothing summed is eight zeros', () => {
    assert.equal(checkOf([]), '00000000');
    for (const pairs of [[['a', '1']], [['f', '2'], ['c', 'INR']], [['', '']]] as Pair[][]) assert.match(checkOf(pairs), /^[0-9a-f]{8}$/);
  });

  it('tells apart lists that would run together without the lengths', () => {
    const lists: Pair[][] = [
      [['a', 'bc']],
      [['ab', 'c']],
      [['a', 'b'], ['c', '']],
      [['a', ''], ['b', 'c']],
      [['a', 'b1:c0:']],
      [['c', ''], ['a', 'b']],
    ];
    const checks = lists.map(checkOf);
    assert.equal(new Set(checks).size, lists.length, checks.join(' '));
  });

  it('changes with the order of the pairs, with a value and with a key', () => {
    const base = checkOf([['f', '2'], ['n', '3'], ['c', 'INR']]);
    assert.notEqual(checkOf([['f', '2'], ['c', 'INR'], ['n', '3']]), base);
    assert.notEqual(checkOf([['f', '2'], ['n', '4'], ['c', 'INR']]), base);
    assert.notEqual(checkOf([['f', '2'], ['t', '3'], ['c', 'INR']]), base);
    assert.notEqual(checkOf([['f', '2'], ['n', '3']]), base);
  });
});

describe('sealing a state', () => {
  it('puts f first and the check last, and leaves the state between them as it was written', () => {
    assert.equal(sealState('n=3', '2'), 'f=2&n=3&z=b0403023');
    const state = 'c=INR&v1=Bank+A~250000~6.5~~360~~0~0&v1_ls=12%3A5000';
    const sealed = sealState(state, '2');
    assert.equal(sealed, `f=2&${state}&z=${sum('1:f1:21:c3:INR2:v127:Bank A~250000~6.5~~360~~0~05:v1_ls7:12:5000')}`);
  });

  it('seals an empty state as the format and its check alone, with no empty pair between', () => {
    assert.equal(sealState('', '2'), 'f=2&z=43ef7d0d');
    assert.deepEqual(pairsOf(sealState('', '2')), [['f', '2'], ['z', '43ef7d0d']]);
  });

  it('names the format it was given, which is part of what is summed', () => {
    assert.equal(sealState('n=3', '7'), `f=7&n=3&z=${sum('1:f1:71:n1:3')}`);
    assert.notEqual(sealState('n=3', '7').slice(-8), sealState('n=3', '2').slice(-8));
  });

  it('sums the state as it will be read, so either spelling of a space opens', () => {
    assert.equal(sealState('v1=Bank+A', '2').slice(-8), sealState('v1=Bank%20A', '2').slice(-8));
    assert.equal(openState(sealState('v1=Bank%20A', '2'), '2'), 'whole');
  });
});

describe('opening a state that arrived', () => {
  const PAIRS: Pair[] = [['f', '2'], ['c', 'INR'], ['v1', 'Bank A~250000~6.5'], ['v1_ls', '12:5000;24:2500']];
  const WHOLE = written(checked(PAIRS));

  it('a sealed state is whole, and so is one with nothing inside', () => {
    assert.equal(openState(WHOLE, '2'), 'whole');
    assert.equal(openState(sealState('n=3&c=INR', '2'), '2'), 'whole');
    assert.equal(openState(sealState('', '2'), '2'), 'whole');
    assert.equal(openState('f=2&z=43ef7d0d', '2'), 'whole');
  });

  it('a state with no f is plain: an older link, whatever else it holds', () => {
    assert.equal(openState('', '2'), 'plain');
    assert.equal(openState('n=3&c=INR', '2'), 'plain');
    assert.equal(openState('v1=Bank+A~250000', '2'), 'plain');
    // A check with no format is not an envelope.
    assert.equal(openState('n=3&z=b0403023', '2'), 'plain');
    // A key that only contains the letter is not the format key.
    assert.equal(openState('rf=2&v1_if=60', '2'), 'plain');
  });

  it('cut anywhere after its first pair, it is damaged', () => {
    for (let end = 'f=2'.length; end < WHOLE.length; end++) {
      assert.equal(openState(WHOLE.slice(0, end), '2'), 'damaged', WHOLE.slice(0, end));
    }
    // Cut inside the first pair, the format's value is gone.
    assert.equal(openState('f=', '2'), 'damaged');
    assert.equal(openState('f', '2'), 'damaged');
  });

  it('with its start lost, no f survives and it reads as an older link: the accepted limit', () => {
    assert.equal(openState(WHOLE.slice('f=2&'.length), '2'), 'plain');
  });

  it('damaged when f is not the first pair, though it is there once and the check is right', () => {
    const moved: Pair[] = [['c', 'INR'], ['f', '2'], ['v1', 'x']];
    assert.equal(openState(written(checked(moved)), '2'), 'damaged');
    // Nor when the pair that stands first holds the format's value under another key.
    assert.equal(openState(written(checked([['c', '2'], ['f', '2'], ['v1', 'x']])), '2'), 'damaged');
    assert.equal(openState(written(checked([['n', '2'], ['f', '2']])), '2'), 'damaged');
    // The same pairs with f first are whole: only the place differs.
    assert.equal(openState(written(checked([['f', '2'], ['c', 'INR'], ['v1', 'x']])), '2'), 'whole');
  });

  it('damaged when f is there twice, though the first is first and the check is right', () => {
    assert.equal(openState(written(checked([['f', '2'], ['c', 'INR'], ['f', '2']])), '2'), 'damaged');
    assert.equal(openState(written(checked([['f', '2'], ['f', '2']])), '2'), 'damaged');
  });

  it('damaged when the format is another one, though the check is right for it', () => {
    for (const format of ['1', '3', '22', '', '2 ', '02']) {
      assert.equal(openState(written(checked([['f', format], ['c', 'INR']])), '2'), 'damaged', JSON.stringify(format));
    }
    // And whole for the reader that expects that format.
    assert.equal(openState(written(checked([['f', '3'], ['c', 'INR']])), '3'), 'whole');
    assert.equal(openState(sealState('c=INR', '2'), '3'), 'damaged');
  });

  it('damaged when the check is missing', () => {
    assert.equal(openState(written(PAIRS), '2'), 'damaged');
    assert.equal(openState('f=2', '2'), 'damaged');
    // The last value being a right check under another key is not a check.
    assert.equal(openState(written([...PAIRS, ['y', checkOf(PAIRS)]]), '2'), 'damaged');
  });

  it('damaged when the check is not the last pair, though it is right for the rest', () => {
    const z: Pair = ['z', checkOf(PAIRS)];
    assert.equal(openState(written([PAIRS[0], z, ...PAIRS.slice(1)]), '2'), 'damaged');
    assert.equal(openState(written([PAIRS[0], PAIRS[1], z, ...PAIRS.slice(2)]), '2'), 'damaged');
    // Something added after a whole link.
    assert.equal(openState(`${WHOLE}&n=3`, '2'), 'damaged');
    assert.equal(openState(`${WHOLE}&utm=x`, '2'), 'damaged');
  });

  it('damaged when the check is there twice, though both are right and one is last', () => {
    const z: Pair = ['z', checkOf(PAIRS)];
    assert.equal(openState(written([...PAIRS, z, z]), '2'), 'damaged');
    assert.equal(openState(written([PAIRS[0], z, ...PAIRS.slice(1), z]), '2'), 'damaged');
  });

  it('damaged when the check is not the check of the rest', () => {
    const right = checkOf(PAIRS);
    const wrong = right === '00000000' ? '00000001' : '00000000';
    assert.equal(openState(written([...PAIRS, ['z', wrong]]), '2'), 'damaged');
    assert.equal(openState(written([...PAIRS, ['z', '']]), '2'), 'damaged');
    assert.equal(openState(written([...PAIRS, ['z', right.toUpperCase() === right ? `${right}0` : right.toUpperCase()]]), '2'), 'damaged');
    assert.equal(openState(written([...PAIRS, ['z', right.slice(0, 7)]]), '2'), 'damaged');
    // The check of the pairs with z itself summed in is not it either.
    assert.equal(openState(written([...PAIRS, ['z', checkOf([...PAIRS, ['z', right]])]]), '2'), 'damaged');
  });

  it('damaged when a value changed on the way, a pair was dropped, or two changed places', () => {
    const z: Pair = ['z', checkOf(PAIRS)];
    assert.equal(openState(written([PAIRS[0], ['c', 'USD'], ...PAIRS.slice(2), z]), '2'), 'damaged');
    assert.equal(openState(written([PAIRS[0], ...PAIRS.slice(2), z]), '2'), 'damaged');
    assert.equal(openState(written([PAIRS[0], PAIRS[2], PAIRS[1], PAIRS[3], z]), '2'), 'damaged');
    assert.equal(openState(WHOLE.replace('250000', '25000'), '2'), 'damaged');
  });

  it('damaged when any other key is there twice, though the check is right for both', () => {
    assert.equal(openState(written(checked([['f', '2'], ['n', '3'], ['n', '3']])), '2'), 'damaged');
    assert.equal(openState(written(checked([['f', '2'], ['v1', 'a'], ['c', 'INR'], ['v1', 'b']])), '2'), 'damaged');
  });
});
