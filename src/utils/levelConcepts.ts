/**
 * The level helper's ideas: four per ladder level, each taught by one lesson.
 *
 * This list is build-time only. It names lessons in every level, including
 * levels whose lessons are still held back, so it must never be imported by
 * the island (`src/components/LearnHome.tsx`): whatever an island imports is
 * shipped to every reader in its script, published or not (#464). The page
 * (`src/layouts/BlogIndex.astro`) picks the ideas of the levels that are fully
 * published with `conceptsFor` and hands only those to the island as a prop.
 * `levelHelper.test.ts` fails if the island imports this module.
 *
 * The words a reader sees for each idea are in the catalog under
 * `blogIndex.island.concepts`; only structure lives here.
 */
import type { Concept } from './levelHelper.ts';

export const CONCEPTS: Concept[] = [
  { id: 'net-worth', level: 'discovery', slug: 'what-is-net-worth' },
  { id: 'interest', level: 'discovery', slug: 'liabilities' },
  { id: 'emergency-fund', level: 'discovery', slug: 'emergency-fund' },
  { id: 'inflation', level: 'discovery', slug: 'purchasing-power' },
  { id: 'asset-classes', level: 'building', slug: 'investing-101-asset-classes' },
  { id: 'diversification', level: 'building', slug: 'diversification' },
  { id: 'tax-accounts', level: 'building', slug: 'tax-advantaged-accounts' },
  { id: 'rebalancing', level: 'building', slug: 'rebalancing-your-portfolio' },
  { id: 'fees', level: 'optimizing', slug: 'fee-optimization' },
  { id: 'real-returns', level: 'optimizing', slug: 'real-returns-and-benchmarking' },
  { id: 'tax-loss', level: 'optimizing', slug: 'tax-loss-harvesting-and-asset-location' },
  { id: 'glide-path', level: 'optimizing', slug: 'advanced-rebalancing' },
];

/** The ideas of the levels the helper may suggest, in order. */
export function conceptsFor(eligible: readonly string[]): Concept[] {
  return CONCEPTS.filter((c) => eligible.includes(c.level));
}

/** Fails the build when a concept names a lesson that does not exist. */
export function assertConceptSlugs(slugs: ReadonlySet<string>): void {
  const missing = CONCEPTS.filter((c) => !slugs.has(c.slug)).map((c) => `${c.id} -> ${c.slug}`);
  if (missing.length > 0) {
    throw new Error(`Level helper ideas name lessons that do not exist: ${missing.join(', ')}. Fix CONCEPTS in src/utils/levelConcepts.ts.`);
  }
}
