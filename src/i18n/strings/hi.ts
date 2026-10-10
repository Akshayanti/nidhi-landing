import type { Dict } from './types.ts';

/**
 * Hindi strings. Typed as `Dict` so a missing or extra key fails the build.
 *
 * Two things that come from CLAUDE.md and apply throughout:
 *   - No em dashes and no double dashes. Devanagari uses the danda `।` as a
 *     full stop; inside a sentence, use a colon or a comma.
 *   - A note on tone: describe common practice, never instruct. Imperatives are
 *     fine for neutral actions (list your accounts, check your statement), not
 *     for allocation, product or tax decisions.
 */
export const hi: Dict = {
  langSwitch: {
    toHindi: 'हिन्दी',
    toEnglish: 'English',
    ariaToHindi: 'यह पेज हिन्दी में पढ़ें',
    ariaToEnglish: 'यह पेज अंग्रेज़ी में पढ़ें',
  },
};
