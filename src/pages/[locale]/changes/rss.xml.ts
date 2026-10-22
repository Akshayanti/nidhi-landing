import type { APIContext } from 'astro';
import { localizedStaticPaths, routeLocale } from '../../../i18n/routes.ts';
import { changesFeed } from '../../../utils/changesFeed.ts';

/** The "What's changed" feed in each other language, at /<locale>/changes/rss.xml. */
export function getStaticPaths() {
  return localizedStaticPaths();
}

export function GET(context: APIContext) {
  return changesFeed(routeLocale(context.params), context.site!);
}
