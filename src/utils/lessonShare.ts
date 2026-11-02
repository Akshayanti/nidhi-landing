/**
 * The address a lesson's share buttons hand out.
 *
 * Always the lesson's canonical address plus fixed campaign parameters, never
 * the address the reader is on, so nothing from their visit travels with the
 * link. The parameters say only that the link was shared and how; when someone
 * opens it, their anonymous pageview is how shared lessons are counted.
 */
export type LessonShareMethod = 'native' | 'copy' | 'whatsapp' | 'email';

const SITE = 'https://nidhi.today';

export function lessonShareUrl(slug: string, method: LessonShareMethod): string {
  return `${SITE}/blog/${slug}/?utm_source=share&utm_medium=referral&utm_campaign=lesson_share&utm_content=${method}`;
}

export function whatsAppHref(slug: string, title: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title} ${lessonShareUrl(slug, 'whatsapp')}`)}`;
}

export function emailHref(slug: string, title: string): string {
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(lessonShareUrl(slug, 'email'))}`;
}
