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
  'net-worth': {
    title: 'Net Worth: Personal Finance Literacy | nidhi',
    description: 'Everything about net worth: what it is, how to calculate it, and why it matters more than your salary. Free personal finance education from nidhi.',
  },
  'fundamentals': {
    title: 'Financial Fundamentals: Personal Finance Literacy | nidhi',
    description: 'Core personal finance concepts every adult should know: assets, liabilities, cash flow, compound interest, and more. Free financial literacy from nidhi.',
  },
  'getting-started': {
    title: 'Getting Started with Personal Finance | nidhi',
    description: 'New to personal finance? Start here. Beginner-friendly guides to net worth, budgeting, saving, and building financial literacy from the ground up.',
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
  'budgeting': {
    title: 'Budgeting: Personal Finance Planning | nidhi',
    description: 'Practical budgeting methods: 50/30/20, zero-based, and pay-yourself-first. Take control of your cash flow with nidhi\'s financial literacy guides.',
  },
  'cash-flow': {
    title: 'Cash Flow: Understanding Your Money Movement | nidhi',
    description: 'Track where your money goes each month. Cash flow is the engine behind wealth building. Free personal finance education from nidhi.',
  },
  'liquidity': {
    title: 'Liquidity: Why Access to Your Money Matters | nidhi',
    description: 'What liquidity means for your finances and why being asset-rich but cash-poor is dangerous. Personal finance literacy from nidhi.',
  },
  'risk': {
    title: 'Understanding Financial Risk: Investing Literacy | nidhi',
    description: 'Risk isn\'t danger, it\'s uncertainty. Learn the difference between volatility and permanent loss, and how time transforms risk. Financial literacy from nidhi.',
  },
  'insurance': {
    title: 'Insurance Basics: Protecting Your Finances | nidhi',
    description: 'How insurance protects your net worth from catastrophic loss. Health, life, property, disability, and liability explained. Personal finance literacy from nidhi.',
  },
  'credit': {
    title: 'Credit and Credit Scores: Finance Literacy | nidhi',
    description: 'How credit scores work, why they affect your borrowing costs, and how to build good credit. Personal finance education from nidhi.',
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
