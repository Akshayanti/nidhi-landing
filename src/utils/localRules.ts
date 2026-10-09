/**
 * "Where to check locally": the rule areas a lesson can depend on, and the
 * usual places to check each one where the reader lives. A lesson lists the
 * areas it touches in its `localRules` frontmatter, and the lesson page shows
 * one line per area (src/components/LocalRules.astro). This keeps the
 * editorial policy's promise ("Written for any country": a lesson that
 * depends on local rules names what to check) in one place, with the same
 * wording everywhere, instead of a pointer sentence in every paragraph.
 *
 * Wording follows CLAUDE.md: describes where people check, never tells the
 * reader what to do, and no em dashes.
 */
export const LOCAL_RULE_AREAS = [
  'tax',
  'pensions',
  'deposit-protection',
  'credit',
  'borrowing',
  'investments',
  'property',
  'inheritance',
  'insurance',
  'benefits',
] as const;

export type LocalRuleArea = (typeof LOCAL_RULE_AREAS)[number];

export const LOCAL_RULE_SOURCES: Record<LocalRuleArea, { label: string; short: string; where: string }> = {
  tax: { label: 'Tax', short: 'tax', where: "your tax authority's published guidance, or a local tax adviser" },
  pensions: { label: 'Pensions and retirement accounts', short: 'pensions', where: 'your pension provider, and the national pension or social security authority' },
  'deposit-protection': { label: 'Bank deposits', short: 'bank deposits', where: 'your national deposit guarantee scheme or banking regulator, which publishes the protection limit' },
  credit: { label: 'Credit reports and scores', short: 'credit scores', where: 'your national credit bureau, or the financial or consumer-protection regulator' },
  borrowing: { label: 'Loans and mortgages', short: 'loans', where: "the lender's written terms, and the consumer-credit rules your financial or consumer-protection regulator publishes" },
  investments: { label: 'Investment firms and products', short: 'investment firms', where: "your financial regulator's register of authorised firms" },
  property: { label: 'Buying property', short: 'buying property', where: 'a local notary, solicitor or conveyancer' },
  inheritance: { label: 'Wills and inheritance', short: 'inheritance', where: 'a local notary or estate lawyer' },
  insurance: { label: 'Insurance', short: 'insurance', where: 'your national insurance regulator or ombudsman, or an independent local broker' },
  benefits: { label: 'Public benefits and health cover', short: 'public benefits', where: 'your national health, social insurance or benefits authority' },
};

/**
 * The short line at the top of a lesson that points down to the note:
 * "Rules on tax and bank deposits differ where you live." Areas keep the
 * lesson's own order.
 */
export function localRulesSummary(areas: readonly LocalRuleArea[]): string {
  const names = areas.map((area) => LOCAL_RULE_SOURCES[area].short);
  if (names.length === 0) return '';
  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Rules on ${list} differ where you live.`;
}
