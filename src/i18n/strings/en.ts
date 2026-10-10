/**
 * English strings, the source of truth for every catalog key.
 *
 * Namespaces are added as the components that need them are localized, so this
 * file grows one section per PR rather than arriving in one piece. `langSwitch`
 * is first because it is the one piece of copy that exists only because of the
 * language work.
 *
 * Values are plain strings. Long-form prose (the privacy notice body, the about
 * page) lives here as HTML and is rendered with `set:html`; that content is
 * ours, never reader input.
 */
export const en = {
  langSwitch: {
    /**
     * The language names are native names and therefore identical in both
     * catalogs: a switcher shows the language it leads to, not the one it is
     * on.
     */
    toHindi: 'हिन्दी',
    toEnglish: 'English',
    ariaToHindi: 'Read this page in Hindi',
    ariaToEnglish: 'Read this page in English',
  },
};
