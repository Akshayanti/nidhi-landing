import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { LOCAL_RULE_AREAS } from './utils/localRules';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    /**
     * Shorter title for search results and link previews (<title>, og:title,
     * twitter:title), used when "<title> | nidhi" would run past about 60
     * characters and get cut off. The page heading, schema headline, RSS and
     * cards keep `title`. Keep it to 57 characters or fewer.
     */
    seoTitle: z.string().max(57).optional(),
    description: z.string(),
    tldr: z.string(),
    /**
     * Two to four short statements of what a reader now understands, shown
     * after the article as "What you now understand". Each one restates
     * something the lesson itself explains; no new claims.
     */
    takeaways: z.array(z.string()).min(2).max(4).optional(),
    order: z.number().default(99),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    level: z.enum(['discovery', 'building', 'psychology', 'optimizing', 'mastery', 'inclusive-finances']),
    primaryPersona: z.enum(['eva', 'petra', 'jiri', 'marcus', 'tomas']),
    personas: z.array(z.enum(['eva', 'petra', 'jiri', 'marcus', 'tomas'])),
    tags: z.array(z.string()),
    referentialReading: z.array(z.object({
      title: z.string(),
      author: z.string().optional(),
      url: z.string().optional(),
      type: z.enum(['book', 'blog', 'paper', 'tool']),
    })).optional(),
    regulatoryNote: z.enum(['safe', 'caution', 'danger']).optional(),
    /**
     * Rule areas the lesson depends on (tax, pensions, deposit protection
     * and so on). Each shows a line in "Where to check locally" after the
     * lesson, naming the usual places to check it (src/utils/localRules.ts).
     */
    localRules: z.array(z.enum(LOCAL_RULE_AREAS)).optional(),
    heroImage: z.string().optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    howTo: z.object({
      name: z.string(),
      totalTime: z.string().optional(),
      steps: z.array(z.object({
        name: z.string(),
        text: z.string(),
      })),
    }).optional(),
    /**
     * If this post has a paired free tool on /free/*, declare it here. The
     * blog template renders a callout block; the reel caption writer auto-
     * appends the URL line; the LLM script writer is told the tool exists
     * (so it CAN — not must — reference it in onscreenText if natural).
     *
     * `idea` is the one-line takeaway the tool puts into practice. When set,
     * the callout shows it as the "Understand" step between the lesson and
     * the tool (Learn, Understand, Apply).
     */
    relatedTool: z.object({
      url: z.string(),
      label: z.string(),
      cta: z.string(),
      idea: z.string().optional(),
    }).optional(),
    /**
     * One-line concrete promise of what the blog adds beyond the 60-second
     * reel — worked example, country-specific table, depth chart, etc.
     * Surfaces in the reel caption as the "why click through" line. MUST
     * reflect content that actually exists in the post body; do not write
     * promises the reader cannot find on the page.
     */
    reelPromise: z.string().optional(),
    /**
     * Ordered list of post slugs to feature as "Keep reading" suggestions.
     * Slugs that aren't published yet are silently skipped — they auto-promote
     * once their pubDate passes. If fewer than 3 published candidates match,
     * the remaining slots are filled by tag-based matching against all posts.
     */
    relatedSlugs: z.array(z.string()).optional(),
    /**
     * Inclusive Finances only: slug of the curriculum post this one follows
     * up on (the post whose default assumption it breaks). The learning path
     * places the companion right after its host and shows it only once the
     * host is visible. Omit for a post that only shares a slot (it is then
     * placed by `order` alone).
     */
    companionOf: z.string().optional(),
  }),
});

export const collections = { blog };