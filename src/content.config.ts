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
    /**
     * Two or three short plain bullets, with no glossary term from any lesson.
     * src/utils/tldrRules.ts holds the limits and checks them at build time.
     */
    tldr: z.array(z.string()),
    /**
     * Two to five short topic phrases ("Why ...", "How to ..."), listed under
     * the TL;DR as "In this lesson". Each one names something the lesson
     * itself explains; no new claims. A phrase can carry `href`, a `#` link to
     * the heading, glossary card (`#glossary`) or term (`#term-...`) that
     * delivers it, so the list doubles as the lesson's index on every screen.
     * The build fails if the target is not on the page.
     */
    takeaways: z.array(z.union([
      z.string(),
      z.object({ text: z.string(), href: z.string().regex(/^#[a-z0-9-]+$/) }),
    ])).min(2).max(5).optional(),
    /**
     * Terms this lesson defines. The lesson page shows them in a "Glossary"
     * card under "In this lesson" (`#glossary`), as pills, with the
     * definitions folded under a summary; each term has the anchor
     * `#term-<slug>`, and /blog/glossary/ collects them across published
     * lessons. Plain text, one or two sentences each.
     */
    glossary: z.array(z.object({
      term: z.string().min(1),
      definition: z.string().min(1),
    })).optional(),
    order: z.number().default(99),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /**
     * Substantive corrections: the date and one plain sentence saying what was
     * wrong and what the lesson says now. Shown above the lesson's title and
     * listed on the editorial policy page (src/utils/corrections.ts). Each one
     * also moves `updatedDate`, which the build checks. Typos get no entry.
     */
    corrections: z.array(z.object({
      date: z.coerce.date(),
      note: z.string().min(1),
    })).optional(),
    level: z.enum(['discovery', 'building', 'psychology', 'optimizing', 'mastery', 'inclusive-finances']),
    primaryPersona: z.enum(['eva', 'petra', 'jiri', 'marcus', 'tomas']),
    personas: z.array(z.enum(['eva', 'petra', 'jiri', 'marcus', 'tomas'])),
    tags: z.array(z.string()),
    referentialReading: z.array(z.object({
      title: z.string(),
      author: z.string().optional(),
      // Every suggested read links to the work itself, checked by hand to
      // point at that exact work (Goodreads for books, the issuing body or
      // a DOI for papers). A title with nowhere to go is not a suggestion.
      url: z.string().url().startsWith('https://'),
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

/**
 * How-to guides (/how-to/<slug>/): short, standalone answers to one problem a
 * reader recognises, useful without opening a lesson. Written once, in English,
 * like the lessons. The design and its rules were agreed by the council on
 * Nov 10, 2026 and are recorded in docs/plans/how-to-guides.md.
 *
 * Everything a guide shows lives in fields rather than free markdown, so every
 * guide keeps the agreed order (answer, scope, what you need, steps or a worked
 * example, a stopping point, what depends on you, deeper study) and its example
 * values are written once, in the visual that shows them.
 */
const visual = z.discriminatedUnion('kind', [
  // A run of dated events from today to a target day, with the balance after each.
  z.object({
    kind: z.literal('timeline'),
    caption: z.string().min(1),
    currency: z.string().min(1),
    start: z.object({ label: z.string().min(1), balance: z.number() }),
    events: z.array(z.object({
      day: z.string().min(1),
      label: z.string().min(1),
      amount: z.number(),
    })).min(2).max(8),
    end: z.object({ label: z.string().min(1) }),
  }),
  // A filled table: a header row and rows of cells, with an optional total row.
  z.object({
    kind: z.literal('table'),
    caption: z.string().min(1),
    columns: z.array(z.string().min(1)).min(2).max(6),
    rows: z.array(z.array(z.string())).min(1).max(8),
    total: z.array(z.string()).optional(),
  }),
  // A document (a statement, a quote) with numbered notes pointing at its lines.
  z.object({
    kind: z.literal('annotated'),
    caption: z.string().min(1),
    title: z.string().min(1),
    lines: z.array(z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      note: z.string().optional(),
    })).min(2).max(8),
  }),
  // A message with its warning signs marked.
  z.object({
    kind: z.literal('message'),
    caption: z.string().min(1),
    from: z.string().min(1),
    parts: z.array(z.object({
      text: z.string().min(1),
      sign: z.string().optional(),
    })).min(2).max(8),
  }),
]);

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    /** The reader's question, as they would ask it. */
    title: z.string().min(1),
    seoTitle: z.string().max(57).optional(),
    /** The meta description: it states the answer, not a teaser. */
    description: z.string().min(1).max(170),
    /** One line under the title: what the reader will have at the end. */
    outcome: z.string().min(1),
    /** Which hub group it sits in (src/utils/guides.ts). */
    group: z.enum(['month', 'owe', 'stock', 'borders', 'safe']),
    /** The answer, in two or three plain sentences, before anything else. */
    answer: z.array(z.string().min(1)).min(1).max(3),
    /** What this page can and cannot solve, side by side under the answer. */
    scope: z.object({ can: z.string().min(1), cannot: z.string().min(1) }),
    /** What to have at hand; empty means nothing at all. */
    needs: z.array(z.string().min(1)),
    /** Shown only when an honest estimate exists; otherwise `taskTimeNote` says what it depends on. */
    taskTime: z.string().optional(),
    taskTimeNote: z.string().optional(),
    /**
     * Where safety matters: what to do now and what can wait, shown as a calm
     * strip inside the guide. No universal deadlines; help routes are scoped.
     */
    protective: z.object({
      heading: z.string().min(1),
      now: z.array(z.string().min(1)).min(1).max(5),
      canWait: z.array(z.string().min(1)).min(1).max(4),
      note: z.string().optional(),
    }).optional(),
    /** `steps` for a procedure; `example` for "See it, try it", a worked example explained in parts. */
    form: z.enum(['steps', 'example']),
    stepsHeading: z.string().optional(),
    steps: z.array(z.object({
      action: z.string().min(1),
      why: z.string().min(1),
      example: z.string().optional(),
      caution: z.string().optional(),
    })).min(3).max(5),
    /** The guide's one visual, from the reusable set. */
    visual,
    /** "You have enough to...": the result the reader now holds. */
    stopHere: z.string().min(1),
    /** A checklist the reader can print and fill in on paper. */
    template: z.object({
      title: z.string().min(1),
      columns: z.array(z.string().min(1)).min(2).max(6),
      rows: z.number().int().min(3).max(12),
    }).optional(),
    /** The decision this page leaves to the reader, then what it depends on. */
    leftToYou: z.string().min(1),
    dependsOn: z.array(z.string().min(1)).min(2).max(5),
    /** Lesson slugs for deeper study, main one first. Unpublished ones are skipped until they go live. */
    lessons: z.array(z.string()).min(1).max(3),
    /**
     * Two or three other guides a reader of this one may need next, chosen by
     * hand (any group). Shown as "Related questions"; one not live yet is
     * skipped. The build fails on a slug that is no guide, or on this guide.
     */
    related: z.array(z.string()).min(2).max(3),
    tool: z.object({ url: z.string().startsWith('/free/'), label: z.string().min(1) }).optional(),
    /** Two or three global references for further reading. */
    references: z.array(z.object({
      title: z.string().min(1),
      publisher: z.string().min(1),
      url: z.string().url().startsWith('https://'),
    })).min(1).max(3),
    /** Where the guide's facts come from; shown folded. */
    sources: z.array(z.object({
      title: z.string().min(1),
      url: z.string().url().startsWith('https://'),
    })).optional(),
    /** Words readers use for this problem, for site search. */
    searchTerms: z.array(z.string().min(1)).min(2),
    /**
     * Upkeep: figures this guide shares with a lesson. The build fails if the
     * lesson no longer contains `value`, so a lesson edit cannot leave the
     * guide saying something else.
     */
    sharedFigures: z.array(z.object({ lesson: z.string(), value: z.string().min(1) })).optional(),
    /** What would make this guide need a review (a rule, a figure, a lesson). */
    reviewTrigger: z.string().min(1),
    pubDate: z.coerce.date(),
    lastChecked: z.coerce.date(),
    corrections: z.array(z.object({
      date: z.coerce.date(),
      note: z.string().min(1),
    })).optional(),
  }),
});

/**
 * How-to situation pages (/how-to/situation/<slug>/): a recognisable moment
 * ("Something arrived in the post", "Moving to a new country") and the guides
 * that help with it, in order. English, like the guides.
 *
 * Built and switched off (src/utils/guideLayers.ts): no page is made until the
 * council has reviewed the layer, and a page needs at least three live guides.
 * None is written in advance: each one starts from a real cluster of guides.
 * Files starting with an underscore are notes, not pages.
 */
const situations = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/situations' }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    /** In the reader's words: "Something arrived in the post". */
    title: z.string().min(1),
    description: z.string().max(170),
    /** Two or three plain sentences: what the guides below help with, and what they don't. */
    intro: z.string().min(1),
    /** Guide slugs, in the order that usually helps; not a sequence everyone must follow. */
    guides: z.array(z.string()).min(3).max(8),
    lessons: z.array(z.string()).max(3).default([]),
    pubDate: z.coerce.date(),
    lastChecked: z.coerce.date(),
  }),
});

export const collections = { blog, guides, situations };