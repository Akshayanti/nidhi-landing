import type { APIContext } from 'astro';
import { changesFeed } from '../../utils/changesFeed.ts';

/** The English "What's changed" feed, at /changes/rss.xml. */
export function GET(context: APIContext) {
  return changesFeed('en', context.site!);
}
