// The TL;DR rule (PLAYBOOK "Blog lessons", blog-content-plan.md): two or three
// short plain bullets, in words a newcomer already has. Checked over every
// lesson at build time whatever its publish date, so a timed deploy can never
// fail because a lesson went live.

export const TLDR_MIN_BULLETS = 2;
export const TLDR_MAX_BULLETS = 3;
export const TLDR_MAX_WORDS = 25;

export interface TldrException {
  slug: string;
  /** The exact words allowed in this lesson's TL;DR, holding the term. */
  phrase: string;
  /** Why these words stay. */
  reason: string;
  /**
   * `different-sense`: an ordinary use, not the glossary's meaning.
   * `published-term`: no plain wording works. The term must be defined by a
   * lesson published before this one, so a reader can look it up.
   */
  kind: 'different-sense' | 'published-term';
}

/** Empty is the goal: a term stays only where plain words cannot do the job. */
export const TLDR_EXCEPTIONS: TldrException[] = [];

export interface TldrLesson {
  slug: string;
  pubDate: Date;
  tldr: string[];
  glossary?: { term: string }[];
}

function termMatcher(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(s|es)?(?=$|[^\\p{L}\\p{N}])`, 'iu');
}

/** Everything wrong with every lesson's TL;DR; empty when all meet the rule. */
export function tldrProblems(lessons: TldrLesson[], exceptions: TldrException[] = TLDR_EXCEPTIONS): string[] {
  const problems: string[] = [];
  const firstDefined = new Map<string, number>();
  for (const lesson of lessons) {
    for (const { term } of lesson.glossary ?? []) {
      const key = term.toLowerCase();
      const at = lesson.pubDate.getTime();
      if (!firstDefined.has(key) || at < firstDefined.get(key)!) firstDefined.set(key, at);
    }
  }

  for (const lesson of lessons) {
    const { slug, tldr } = lesson;
    if (tldr.length < TLDR_MIN_BULLETS || tldr.length > TLDR_MAX_BULLETS) {
      problems.push(`${slug}: TL;DR has ${tldr.length} bullets, needs ${TLDR_MIN_BULLETS} to ${TLDR_MAX_BULLETS}`);
    }
    const own = new Set((lesson.glossary ?? []).map((g) => g.term.toLowerCase()));
    for (const bullet of tldr) {
      const words = bullet.trim().split(/\s+/).filter(Boolean).length;
      if (words === 0) problems.push(`${slug}: TL;DR has an empty bullet`);
      if (words > TLDR_MAX_WORDS) problems.push(`${slug}: TL;DR bullet has ${words} words, over ${TLDR_MAX_WORDS}: "${bullet}"`);
      if (/[\n<>*`[\]]/.test(bullet)) problems.push(`${slug}: TL;DR bullet has a line break or markup: "${bullet}"`);

      for (const key of firstDefined.keys()) {
        const matcher = termMatcher(key);
        if (!matcher.test(bullet)) continue;
        const allowed = exceptions.find((e) => e.slug === slug && bullet.toLowerCase().includes(e.phrase.toLowerCase()) && matcher.test(e.phrase));
        if (!allowed) {
          problems.push(`${slug}: TL;DR uses the glossary term "${key}": "${bullet}"`);
        } else if (allowed.kind === 'published-term' && (own.has(key) || firstDefined.get(key)! >= lesson.pubDate.getTime())) {
          problems.push(`${slug}: TL;DR term "${key}" must be defined by an earlier lesson, not this one or a later one`);
        }
      }
    }
  }
  return problems;
}

export function assertTldrRules(lessons: TldrLesson[]): void {
  const problems = tldrProblems(lessons);
  if (problems.length) throw new Error(`TL;DR rule (PLAYBOOK "Blog lessons"):\n${problems.join('\n')}`);
}
