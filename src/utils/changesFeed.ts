import rss from '@astrojs/rss';
import { LOCALE_META, dict, localizedPath, type Locale } from '../i18n';
import type { ChangeItem } from '../i18n/strings/changes.ts';
import { liveChanges } from './liveChanges.ts';

/**
 * One feed item per change: its line in this language, dated the day it
 * shipped (UTC), linking to its anchor. The link doubles as the guid, so it
 * rests on the permanent id alone.
 */
export function feedItems(locale: Locale, items: Array<ChangeItem & { date: string }>) {
  const page = localizedPath(locale, '/changes/');
  return items.map((c) => ({
    title: c.text[locale],
    pubDate: new Date(`${c.date}T00:00:00Z`),
    link: `${page}#${c.id}`,
  }));
}

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
  return rss({
    title: changes.feedTitle,
    description: changes.meta.description,
    site,
    // The links end in #<id>; a slash after it would break the anchor.
    trailingSlash: false,
    items: feedItems(locale, items),
    customData: `<language>${LOCALE_META[locale].htmlLang}</language>`,
  });
}
