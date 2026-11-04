/**
 * The founder's note on the home page: the founder's own words, so they are
 * not written by anyone else.
 *
 * PLACEHOLDER. This English text stands in until the owner approves or
 * rewrites it (docs/plans/homepage-variant-c.md, section 7). Until then:
 *   - it is English only, kept outside the catalogs, and every edition shows it
 *     with lang="en";
 *   - the home page renders the note on the dev server only, so the owner can
 *     review it, and leaves it out of production builds, so a merge by mistake
 *     publishes none of it.
 * Once approved, move `quote` and `signOff` into `home.note` in all five
 * catalogs, translate them (the founder is never given a gender), and delete
 * this file.
 */
export const FOUNDER_NOTE = {
  placeholder: true,
  quote:
    '“I couldn’t find a money tool for a life split across countries, so I’m building one. The lessons are what I learn on the way, written up for free. It’s one person, with volunteers helping on translation.”',
  signOff: 'Founder of nidhi, Prague',
} as const;
