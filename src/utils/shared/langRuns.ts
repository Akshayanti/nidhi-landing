/**
 * English terms in brackets inside Hindi and Marathi copy.
 *
 * The Hindi and Marathi glossaries keep some terms' English in brackets
 * ("महागाई कॅल्क्युलेटर (Inflation Calculator)"). On a page whose lang is hi or
 * mr, the browser treats those words as Hindi or Marathi: it cannot hyphenate
 * them, so a heading that has to wrap breaks them bare ("Calculato / r"), and
 * a screen reader reads them with a Hindi or Marathi voice. Marking the run
 * as English fixes both (WCAG 3.1.2, Language of Parts).
 *
 * `langRuns` splits a string into plain text and bracketed English runs. A
 * run counts as English only when everything inside the brackets is Latin
 * letters, digits, spaces (no-break spaces included) and basic punctuation.
 * The run keeps its brackets and any punctuation straight after them, so a
 * renderer can hold them together ("(Inflation Calculator):"). In a
 * Latin-script locale the whole string comes back as one plain segment.
 */

export interface LangRun {
  text: string;
  /** Set for a bracketed English run (brackets and trailing punctuation included). */
  lang?: 'en';
}

/** Locales written in a script other than Latin, where English needs marking. */
const NON_LATIN_LOCALES = new Set(['hi', 'mr']);

const BRACKETED_LATIN = /\([A-Za-z][A-Za-z0-9\u00A0 .,'&/-]*\)[:;,.!?]*/g;

export function langRuns(text: string, locale: string): LangRun[] {
  if (!NON_LATIN_LOCALES.has(locale)) return [{ text }];
  const runs: LangRun[] = [];
  let last = 0;
  for (const match of text.matchAll(BRACKETED_LATIN)) {
    runs.push({ text: text.slice(last, match.index) });
    runs.push({ text: match[0], lang: 'en' });
    last = match.index! + match[0].length;
  }
  runs.push({ text: text.slice(last) });
  return runs.filter((r) => r.text !== '');
}
