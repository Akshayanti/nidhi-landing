/**
 * When a lesson was last changed, as the site tells the outside world.
 *
 * `updatedDate` in a lesson's frontmatter records its last edit. A lesson
 * is often edited while it is still scheduled, so that date can be earlier
 * than the day the lesson was published. Given out as it stands, it says
 * the page was modified before it existed: structured data with
 * `dateModified` before `datePublished`, and a sitemap `lastmod` older than
 * the crawler's last visit for a URL that is new. So what is given out is
 * never earlier than the publication date.
 */

/** The later of the publication date and the last edit; the publication date when there was no edit. */
export function lastChanged(pubDate: Date, updatedDate?: Date | null): Date {
  return updatedDate && updatedDate.getTime() > pubDate.getTime() ? updatedDate : pubDate;
}

/** The date to state as "modified", or undefined when the lesson has not changed since it was published. */
export function modifiedAfterPublication(pubDate: Date, updatedDate?: Date | null): Date | undefined {
  return updatedDate && updatedDate.getTime() > pubDate.getTime() ? updatedDate : undefined;
}
