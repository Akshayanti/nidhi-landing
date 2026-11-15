/**
 * Country names for the tools' country select, written in the page's language
 * from ISO codes with `Intl.DisplayNames`.
 *
 * Those names come from the ICU data of whichever Node builds the site, and
 * for a few territories ICU writes a qualifier after a spaced dash
 * ("Kongo – Kinshasa", "Hongkong – ZAO Číny"). No catalog or glossary governs
 * that text and the site does not use a dash that way, so the qualifier goes in
 * brackets instead: "Kongo (Kinshasa)". `countryNames.test.ts` runs every
 * country in every language, so a Node upgrade cannot bring a dash back unseen.
 */

/** A dash standing between two parts of a name, with a space on each side. */
const SPACED_DASH = /\s+[‒–—―-]\s+/;

/** "Kongo – Kinshasa" becomes "Kongo (Kinshasa)"; any other name is unchanged. */
export function tidyCountryName(name: string): string {
  const at = name.search(SPACED_DASH);
  if (at === -1) return name;
  const rest = name.slice(at).replace(SPACED_DASH, '');
  return `${name.slice(0, at)} (${rest})`;
}

/**
 * A function that names a country by its two-letter code in one language, or
 * returns undefined when the language's data has no name for it.
 */
export function countryNamer(htmlLang: string): (iso2: string) => string | undefined {
  const names = new Intl.DisplayNames([htmlLang], { type: 'region' });
  return (iso2) => {
    const named = names.of(iso2);
    return named && named !== iso2 ? tidyCountryName(named) : undefined;
  };
}
