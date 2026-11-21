/**
 * The id the newsletter knows a lesson by (#438): its `newsletterId`, or else
 * its slug. The feed carries it as <nidhi:id> in this namespace, and the
 * newsletter scripts (scripts/send_newsletter.py, scripts/newsletter.gs)
 * record a lesson as sent under it. An id never changes and is never given to
 * another lesson: src/utils/newsletterIds.test.ts checks both against main.
 */
export const NEWSLETTER_NS = 'https://nidhi.today/ns/newsletter';

export function newsletterId(lesson: { slug: string; newsletterId?: string }): string {
  return lesson.newsletterId ?? lesson.slug;
}
