import rss from '@astrojs/rss';
import { LOCALE_META, dict, localizedPath, type Locale } from '../i18n';
import type { ChangeItem } from '../i18n/strings/changes.ts';
import { feedTitle } from './feedTitle.ts';
import { liveChanges } from './liveChanges.ts';

/**
 * One feed item per change, dated the day it shipped (UTC), linking to its
 * anchor. The whole line in this language is the item's description, which a
 * feed reader shows as the body; the title is its first sentence, short enough
 * to be read as a headline (src/utils/feedTitle.ts). The link doubles as the
 * guid, so it rests on the permanent id alone and never on the wording.
 */
export function feedItems(locale: Locale, items: Array<ChangeItem & { date: string }>) {
  const page = localizedPath(locale, '/changes/');
  return items.map((c) => ({
    title: feedTitle(c.text[locale]),
    description: c.text[locale],
    pubDate: new Date(`${c.date}T00:00:00Z`),
    link: `${page}#${c.id}`,
  }));
}

/**
 * The "What's changed" lines as an RSS feed, one per language, so someone can
 * follow the site's upkeep without visiting it. Each item is one change, dated
 * the day it shipped, linking to its anchor on the language's /changes/ page;
 * that link, built from the entry's permanent id, is also the item's guid.
 * Like the lesson feed, a feed file loads no analytics.
 *
 * The channel links to this language's /changes/ page, not the home page. The
 * library writes the channel link from `site`, so `site` is that page, and each
 * item's link is made a full address here: the library passes a full address
 * through as written (it would otherwise add a slash after the #anchor), which
 * keeps every guid the string it has always been. The feed also names its own
 * address (`atom:link rel="self"`), which readers and validators use to tell
 * where a copy of it came from.
 */
export async function changesFeed(locale: Locale, site: URL) {
  const { changes } = dict(locale);
  const items = await liveChanges();
  const page = new URL(localizedPath(locale, '/changes/'), site).href;
  const self = new URL(localizedPath(locale, '/changes/rss.xml'), site).href;
  return rss({
    title: changes.feedTitle,
    description: changes.meta.description,
    site: page,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    items: feedItems(locale, items).map((item) => ({ ...item, link: new URL(item.link, site).href })),
    customData:
      `<language>${LOCALE_META[locale].htmlLang}</language>` +
      `<atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
  });
}
