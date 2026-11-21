/**
 * /llms.txt, built from the published lessons, guides and tools and from the
 * catalog's own descriptions of each page. The text itself is assembled in
 * `src/utils/llmsTxt.ts`, which says why.
 */
import type { APIContext } from 'astro';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, localizedPath } from '../i18n/config.ts';
import { dict } from '../i18n/index.ts';
import { getPathPosts } from '../utils/learnPosts.ts';
import { getGuides, guidePath, GUIDE_HUB } from '../utils/guides.ts';
import { LADDER_LEVELS, liveTools, type ToolKey } from '../utils/home/startingPoints.ts';
import { isMonteCarloReleased, MONTE_CARLO_URL } from '../utils/monte-carlo/release.ts';
import { isInvestOrPayOffReleased, INVEST_OR_PAY_OFF_URL } from '../utils/invest-or-pay-off/release.ts';
import { buildLlmsTxt } from '../utils/llmsTxt.ts';

/** Each tool card's key, against the tool's own catalog module. */
const TOOL_CATALOG: Record<ToolKey, 'multiCurrencyNetWorth' | 'loanComparison' | 'monteCarlo' | 'inflation' | 'investOrPayOff'> = {
  netWorth: 'multiCurrencyNetWorth',
  loanComparison: 'loanComparison',
  monteCarlo: 'monteCarlo',
  inflation: 'inflation',
  investOrPayOff: 'investOrPayOff',
};

const INCLUSIVE = 'inclusive-finances';

export async function GET(context: APIContext) {
  const t = dict(DEFAULT_LOCALE);
  const site = new URL(context.site!).origin;

  const [posts, guides, showMonteCarlo, showInvestOrPayOff] = await Promise.all([
    getPathPosts(),
    getGuides(),
    isMonteCarloReleased(),
    isInvestOrPayOffReleased(),
  ]);
  const isToolLive = (href: string) =>
    (href !== MONTE_CARLO_URL || showMonteCarlo) && (href !== INVEST_OR_PAY_OFF_URL || showInvestOrPayOff);

  const levels: Record<string, { name: string; summary: string }> = {};
  for (const level of LADDER_LEVELS) {
    levels[level] = { name: t.learn.levels[level], summary: t.learn.summaries[level] };
  }
  // Inclusive Finances has no ladder summary; its description's first sentence says who it is for.
  levels[INCLUSIVE] = {
    name: t.learn.levels[INCLUSIVE],
    summary: t.learn.levelMeta[INCLUSIVE].description.split('. ')[0].replace(/\.$/, ''),
  };

  const body = buildLlmsTxt({
    site,
    lessons: posts.map((p) => ({ title: p.title, description: p.description, level: p.level, href: p.href })),
    levelOrder: [...LADDER_LEVELS, INCLUSIVE],
    levels,
    tools: liveTools(isToolLive).map(({ href, key }) => ({
      title: t.home.toolCards[key].name,
      description: t.tools[TOOL_CATALOG[key]].meta.description,
      href,
    })),
    guides: guides.map((g) => ({ title: g.data.title, description: g.data.description, href: guidePath(g.data.slug) })),
    pages: [
      { title: 'Home', description: 'What nidhi is, where a reader in a given situation might begin, which lesson goes with which free tool, and the planner waitlist.', href: '/' },
      { title: 'Learning path', description: 'Every published lesson in reading order, grouped by level, with a two-question helper that suggests a level.', href: '/blog/' },
      { title: 'Glossary', description: t.glossaryPage.description, href: '/blog/glossary/' },
      { title: 'How-to guides', description: t.howTo.meta.description, href: GUIDE_HUB },
      { title: 'Free tools', description: 'The free calculators listed below, on one page.', href: '/free/' },
      { title: 'Beliefs', description: t.beliefs.meta.description, href: '/beliefs/' },
      { title: 'Editorial policy', description: t.editorialPolicy.meta.description, href: '/editorial-policy/' },
      { title: 'About', description: t.about.meta.description, href: '/about/' },
      { title: 'Accessibility', description: t.accessibility.meta.description, href: '/accessibility/' },
      { title: 'Planner beta', description: t.beta.meta.description, href: '/beta/' },
      { title: "What's changed", description: t.changes.meta.description, href: '/changes/' },
      { title: 'Volunteers', description: t.volunteers.meta.description, href: '/volunteers/' },
      { title: 'Privacy notice', description: t.privacy.meta.description, href: '/privacy/' },
    ],
    languages: LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => ({
      label: LOCALE_META[l].label,
      home: localizedPath(l, '/'),
      tools: localizedPath(l, '/free/'),
    })),
  });

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
