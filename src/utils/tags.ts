/**
 * Shared tag metadata for blog tag pages.
 *
 * Used by:
 *  - `src/pages/blog/tag/[tag].astro` to render per-tag SEO title and intro.
 *  - `src/pages/blog/tag/index.astro` to render the "Browse by topic" hub.
 *
 * Add a new entry here when introducing a new tag with editorial weight. Tags
 * not present in this table still get a generated tag page via `[tag].astro`'s
 * fallback path; they just lack the curated description.
 */
export interface TagMetaEntry {
  /** Page <title> for the tag listing. Already includes the brand suffix. */
  title: string;
  /** Page meta description and intro paragraph copy. */
  description: string;
}

export const TAG_META: Record<string, TagMetaEntry> = {
  // Level tags. Every post carries exactly one; they mirror the `level`
  // frontmatter field and the sections of the learning path.
  'discovery': {
    title: 'Discovery Series: Personal Finance Fundamentals | nidhi',
    description: 'The first level of the nidhi learning path: net worth, assets, debt, cash flow, budgeting, and saving. Beginner guides meant to be read in order.',
  },
  'building': {
    title: 'Building Series: Investing, Taxes, and Planning | nidhi',
    description: 'The second level of the nidhi learning path: risk, investing, taxes, financial independence, loans, and goals. Guides for putting the basics to work.',
  },
  'psychology': {
    title: 'Psychology of Money: Behavioural Finance Basics | nidhi',
    description: 'Why knowing the right money move is not the same as making it: loss aversion, mental accounting, present bias, herd behaviour. Behavioural finance, explained.',
  },
  'optimizing': {
    title: 'Optimizing Series: Projections, Fees, and Taxes | nidhi',
    description: 'The fourth level of the nidhi learning path: projections, cash management, refinancing, fees, and tax efficiency. Guides for tuning a plan that already works.',
  },
  // Topic tags.
  'fundamentals': {
    title: 'Financial Fundamentals: Personal Finance Literacy | nidhi',
    description: 'Core personal finance concepts every adult should know: assets, liabilities, cash flow, compound interest, and more. Free financial literacy from nidhi.',
  },
  'debt': {
    title: 'Understanding and Managing Debt: Finance Literacy | nidhi',
    description: 'How debt works, why interest rates matter, and proven strategies to get out of debt. Practical personal finance literacy from nidhi.',
  },
  'saving': {
    title: 'Saving Money: Personal Finance Basics | nidhi',
    description: 'How to save effectively: emergency funds, savings rates, and when saving beats investing. Personal finance literacy guides from nidhi.',
  },
  'investing': {
    title: 'Investing Basics: Financial Literacy | nidhi',
    description: 'Learn to invest: asset classes, risk, compound interest, and when to start. Beginner-friendly investing guides for personal finance literacy.',
  },
  'risk': {
    title: 'Understanding Financial Risk: Investing Literacy | nidhi',
    description: 'Risk isn\'t danger, it\'s uncertainty. Learn the difference between volatility and permanent loss, and how time transforms risk. Financial literacy from nidhi.',
  },
  'planning': {
    title: 'Financial Planning: Accounts, Taxes, and Tracking | nidhi',
    description: 'How to turn financial knowledge into a plan: accounts, taxes, rebalancing, goals, and what to track. Practical financial planning guides from nidhi.',
  },
  'goals': {
    title: 'Financial Goals and Tracking Your Progress | nidhi',
    description: 'How to set concrete financial goals and know if you are on track: target amounts, health metrics, and a simple dashboard. Planning guides from nidhi.',
  },
  'fire': {
    title: 'Financial Independence (FIRE): The Basics | nidhi',
    description: 'What financial independence means, how the FIRE number and safe withdrawal rates work, and what passive income really takes. Honest guides from nidhi.',
  },
  'taxes': {
    title: 'Taxes and Investing: Personal Finance Literacy | nidhi',
    description: 'How taxes shape every financial decision, and where tax-advantaged accounts fit. Educational guides with a country-by-country reference table.',
  },
  'currency': {
    title: 'Multi-Currency Money: Exchange Rates and Risk | nidhi',
    description: 'Managing money across currencies: exchange rates, purchasing power, and currency risk when your finances cross borders. Guides for a cross-border life.',
  },
  'real-estate': {
    title: 'Real Estate as an Investment: The Basics | nidhi',
    description: 'Real estate beyond owning a home: returns, leverage, illiquidity, and the rent-versus-buy math. Personal finance literacy from nidhi.',
  },
};

/**
 * Convert a kebab-case tag like "net-worth" to a display-friendly
 * "Net Worth". Used as a fallback when a tag is not in TAG_META and as the
 * heading text on the tag listing page.
 */
export function formatTag(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
