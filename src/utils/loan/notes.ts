/**
 * The engine's notes on a result, in the reader's language.
 *
 * `math.ts` computes schedules and knows nothing about languages: it writes
 * its notes (`LoanResult.warnings`) in English. The card shows them under the
 * result, read through here. A note is not an error: the result beside it
 * stands.
 *
 * The match is on the sentence as the engine wrote it. One the engine grows
 * later matches nothing and comes through unchanged: a visible English
 * sentence, which is what to show rather than nothing.
 *
 * Pure: no DOM, no analytics.
 */
import type { Dict } from '../../i18n/strings/types.ts';

type Notes = Dict['tools']['loanComparison']['island']['engine']['warnings'];

export function engineNote(raw: string, notes: Notes): string {
  if (/precision check/i.test(raw)) {
    const m = /principal sum (\S+) ≠ (\S+)/.exec(raw);
    return notes.precision.replace('{sum}', m?.[1] ?? '').replace('{expected}', m?.[2] ?? '');
  }
  if (/recast payment barely covers/i.test(raw)) return notes.subsequentRate;
  if (/rate does not change within this term/i.test(raw)) return notes.rateNeverChanges;
  return raw;
}
