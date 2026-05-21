import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    tldr: z.string(),
    order: z.number().default(99),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    level: z.enum(['discovery', 'building', 'optimizing', 'mastery']),
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
     */
    relatedTool: z.object({
      url: z.string(),
      label: z.string(),
      cta: z.string(),
    }).optional(),
    /**
     * One-line concrete promise of what the blog adds beyond the 60-second
     * reel — worked example, country-specific table, depth chart, etc.
     * Surfaces in the reel caption as the "why click through" line. MUST
     * reflect content that actually exists in the post body; do not write
     * promises the reader cannot find on the page.
     */
    reelPromise: z.string().optional(),
  }),
});

export const collections = { blog };