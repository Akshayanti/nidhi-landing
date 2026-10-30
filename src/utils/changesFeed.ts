import rss from '@astrojs/rss';
import { LOCALE_META, dict, localizedPath, type Locale } from '../i18n';
import { liveChanges } from './liveChanges.ts';

/**
 * The "What's changed" lines as an RSS feed, one per language, so someone can
 * follow the site's upkeep without visiting it. Each item is one line, dated
 * the day it shipped, linking to its anchor on the language's /changes/ page;
 * that link, built from the entry's permanent id, is also the item's guid.
 * Like the lesson feed, a feed file loads no analytics.
 */
export async function changesFeed(locale: Locale, site: URL) {
  const { changes } = dict(locale);
  const items = await liveChanges();
  const page = localizedPath(locale, '/changes/');
  return rss({
    title: changes.feedTitle,
    description: changes.meta.description,
    site,
    // The links end in #<id>; a slash after it would break the anchor.
    trailingSlash: false,
    items: items.map((c) => ({
      title: c.text[locale],
      pubDate: new Date(`${c.date}T00:00:00Z`),
      link: `${page}#${c.id}`,
    })),
    customData: `<language>${LOCALE_META[locale].htmlLang}</language>`,
  });
}
