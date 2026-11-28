/**
 * The engine's notes on a result, in the reader's language.
 *
 * `math.ts` computes schedules and knows nothing about languages: it writes
 * its notes (`LoanResult.warnings`) in English. The card shows them under the
 * result, and the spreadsheet and the printed report carry the same sentences,
 * so all three read them through here. A note is not an error: the result
 * beside it stands.
 *
 * The match is on the sentence as the engine wrote it. One the engine grows
 * later matches nothing and comes through unchanged: a visible English
 * sentence, which is what to show rather than nothing.
 *
 * Pure: no DOM, no analytics.
 */
import type { Dict } from '../../i18n/strings/types.ts';
import type { LoanResult } from './math.ts';

type Notes = Dict['tools']['loanComparison']['island']['engine']['warnings'];

/** The month of a lump sum that was more than was owed. */
const LUMP_PART = /lump sum(s)? in month (\d+) (?:is|are) more than is owed/;

/** The two months of a lump-sum note: the first lump sum left unused, and the payoff. */
const LUMP_MONTHS = /month (\d+) (on )?comes? after this loan is paid off in month (\d+)/;

export function engineNote(raw: string, notes: Notes): string {
  if (/precision check/i.test(raw)) {
    // The sums are whole numbers of the smallest unit: the full stop after the second ends the sentence.
    const m = /principal sum (\S+) ≠ (\d+)/.exec(raw);
    return notes.precision.replace('{sum}', m?.[1] ?? '').replace('{expected}', m?.[2] ?? '');
  }
  if (/recast payment barely covers/i.test(raw)) return notes.subsequentRate;
  if (/rate does not change within this term/i.test(raw)) return notes.rateNeverChanges;
  const part = LUMP_PART.exec(raw);
  if (part) return (part[1] ? notes.lumpsPartUsed : notes.lumpPartUsed).replace('{month}', part[2]);
  const lump = LUMP_MONTHS.exec(raw);
  if (lump) return (lump[2] ? notes.lumpsUnused : notes.lumpUnused).replace('{month}', lump[1]).replace('{payoffMonth}', lump[3]);
  return raw;
}

/** A result's notes as the card lists them, one sentence each. None for an offer that was not worked out. */
export function resultNotes(result: LoanResult, notes: Notes): string[] {
  return result.error ? [] : result.warnings.map((raw) => engineNote(raw, notes));
}
