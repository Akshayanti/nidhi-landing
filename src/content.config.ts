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
  }),
});

export const collections = { blog };