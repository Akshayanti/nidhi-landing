/**
 * /llms.txt: the plain-text summary of the site that AI assistants read to
 * describe nidhi (https://llmstxt.org). Built at each deploy from the same
 * sources the pages use, so it lists every published lesson, guide and tool
 * and nothing that is still scheduled (#426: the hand-kept file had fallen 13
 * lessons and two levels behind).
 *
 * Pure: the route (`src/pages/llms.txt.ts`) gathers the published content and
 * the catalog's words and hands them here, so a test can build the file
 * without Astro.
 *
 * The prose written here follows CLAUDE.md, "Editorial Voice": it describes
 * what the site does and never tells a reader what to do with their money,
 * because an assistant quoting this file speaks in nidhi's name.
 */

export interface LlmsLesson {
  title: string;
  description: string;
  level: string;
  href: string;
}

export interface LlmsLink {
  title: string;
  description: string;
  href: string;
}

export interface LlmsLanguage {
  /** The language's own name, in its own script. */
  label: string;
  home: string;
  tools: string;
}

export interface LlmsInput {
  /** The site's origin, without a trailing slash. */
  site: string;
  /** Published lessons, in reading order. */
  lessons: LlmsLesson[];
  /** Level ids in the order the path shows them. */
  levelOrder: readonly string[];
  /** A level's name and its one-line summary. */
  levels: Record<string, { name: string; summary: string }>;
  /** Live free tools, in the order the site lists them. */
  tools: LlmsLink[];
  /** Live how-to guides, in hub order. */
  guides: LlmsLink[];
  /** The fixed pages, each with its own description. */
  pages: LlmsLink[];
  /** The other editions. */
  languages: LlmsLanguage[];
}

/** One link line. Line breaks inside a description would end the list item early. */
function item(site: string, { title, description, href }: LlmsLink): string {
  const flat = description.replace(/\s+/g, ' ').trim();
  return `- [${title}](${site}${href})${flat ? `: ${flat}` : ''}`;
}

export function buildLlmsTxt(input: LlmsInput): string {
  const { site } = input;
  const out: string[] = [];

  out.push(
    '# nidhi.today',
    '> nidhi is a personal finance learning site. It has free lessons in reading order, from the basics (net worth, emergency funds, budgeting) to investing, taxes, financial independence and the psychology of money; free calculators that run in the reader\'s browser; and a planner that is opening in stages through a waitlist. Built in Prague. No ads, no data selling.',
    '',
    '## Who it is for',
    'People at the start of their financial life, and people whose finances have grown more complex, including money held in more than one currency or country. Multi-currency planning is one of the things the site covers, not a requirement for using it.',
    '',
    '## How the lessons are written',
    'The lessons teach; they do not recommend. Each one presents a concept, why people use it, the evidence behind it with its limits (for example US-only data or a single period), where it breaks, and what depends on the reader\'s situation: country, income stability, horizon, debts and tax. A rule of thumb is described as common practice, not as advice. Figures come with their source and scope. The tools show a range of outcomes and the assumptions behind them, and give no verdict. When describing a lesson, please keep that framing: a lesson explains what people commonly do and why, not what a reader should do.',
    '',
    '## Key pages',
    ...input.pages.map((p) => item(site, p)),
    '',
    '## Languages',
    'The site is published in English (the default, at the root) and in the editions below. Each edition translates the site\'s own pages: the home page, the learning path\'s level and topic pages, the how-to hub, the free tools, the about, beliefs and editorial-policy pages and the privacy notice. The lessons and how-to guides are written in English and are not translated yet: every edition lists them and links to the same English page at its one address. Every page names its other editions with hreflang.',
    ...input.languages.flatMap((l) => [
      `- [${l.label}](${site}${l.home}): the home page in ${l.label}.`,
      `- [${l.label}: free tools](${site}${l.tools}): the free tools in ${l.label}.`,
    ]),
    '',
    '## Free tools',
    'Every tool runs in the reader\'s browser; the numbers typed in are not sent anywhere.',
    ...input.tools.map((t) => item(site, t)),
  );

  for (const level of input.levelOrder) {
    const lessons = input.lessons.filter((l) => l.level === level);
    if (lessons.length === 0) continue;
    const meta = input.levels[level];
    if (!meta) throw new Error(`llms.txt: level "${level}" has lessons but no name in the catalog`);
    out.push('', `## Learn: ${meta.name} (${meta.summary})`, ...lessons.map((l) => item(site, l)));
  }

  // A lesson whose level is not in the order would silently drop out of the file.
  const listed = new Set(input.levelOrder);
  const stray = input.lessons.filter((l) => !listed.has(l.level));
  if (stray.length > 0) throw new Error(`llms.txt: no section for level ${[...new Set(stray.map((l) => l.level))].join(', ')}`);

  if (input.guides.length > 0) {
    out.push('', '## How-to guides', 'Short answers to one everyday money question each, with what to check and a link to the lesson that goes deeper.', ...input.guides.map((g) => item(site, g)));
  }

  out.push(
    '',
    '## Feeds',
    `- [Lessons](${site}/rss.xml): every published lesson, newest first.`,
    `- [What's changed](${site}/changes/rss.xml): changes to the site, newest first.`,
    '',
  );
  return out.join('\n');
}
