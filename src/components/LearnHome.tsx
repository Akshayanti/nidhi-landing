import { useState, useEffect, useMemo, useRef } from 'react';
import { conceptsFor, goalsFor, suggestLevel, type Suggestion } from '../utils/levelHelper';

/**
 * The learning path's front page (/blog/): where to start or continue, an
 * optional two-question helper that suggests a level (src/utils/levelHelper.ts), the five levels and
 * Inclusive Finances as one list, and a search across every lesson. The
 * lessons themselves live on one page per level (/blog/<level>/).
 *
 * Privacy (see the privacy notice):
 * - Reading progress comes from the existing nidhi-reading-progress key and
 *   never leaves the browser. Nothing new is stored.
 * - Search terms stay in memory. A ?q= that arrives from a search engine is
 *   read once and removed from the address; typing never writes to it.
 * - The helper's answers stay in component state. Its panel is marked
 *   ph-no-capture and heatmaps are paused while it is open, so no click
 *   event or click position records which answer was picked.
 */

export interface LearnLesson {
  id: string;
  title: string;
  description: string;
  level: string;
  readingTime: number;
  tags: string[];
}

export interface LearnLevel {
  id: string;
  label: string;
  summary: string;
  /** Published lessons in the level; 0 means it is still being written. */
  total: number;
}

interface LearnHomeProps {
  levels: LearnLevel[];
  /** Every published lesson, ladder lessons in reading order first. */
  lessons: LearnLesson[];
  inclusiveCount: number;
  /** Levels the helper may suggest: fully published (src/utils/levelHelper.ts). */
  helperLevels: string[];
}

const STORAGE_KEY = 'nidhi-reading-progress';
const INCLUSIVE = 'inclusive-finances';
const RESULT_LIMIT = 8;

declare global {
  interface Window {
    posthog?: { __loaded?: boolean; set_config?: (config: Record<string, unknown>) => void };
    nidhiHeatmapsPaused?: boolean;
  }
}

/**
 * Heatmaps record where every click lands and ignore ph-no-capture, so the
 * helper switches them off while it is open. Analytics.astro reads the same
 * flag when PostHog finishes loading later.
 */
function pauseHeatmaps(paused: boolean) {
  window.nidhiHeatmapsPaused = paused;
  const ph = window.posthog;
  if (!ph || !ph.__loaded || typeof ph.set_config !== 'function') return;
  if (paused) {
    ph.set_config({ enable_heatmaps: false });
  } else {
    let consented = false;
    try { consented = localStorage.getItem('nidhi-cookie-consent') === 'accepted'; } catch { /* ignore */ }
    if (consented) ph.set_config({ enable_heatmaps: true });
  }
}

function Chevron() {
  return (
    <svg className="learn-chevron" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 4l6 6-6 6" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

interface HelperResultProps {
  suggestion: Suggestion;
  goalTopic?: string;
  label: (level: string) => string;
  title: (slug: string) => string | undefined;
  firstLesson: LearnLesson | null;
  onRestart: () => void;
}

/** Why the level was suggested, in terms of the reader's own answers. */
function reasonFor(s: Suggestion, name: string, goalTopic?: string): string {
  switch (s.reason) {
    case 'foundation':
      return `You ticked ${s.ticked} of the ${s.total} ${name} ideas, and the levels after it build on them.`;
    case 'goal':
      return s.level === 'psychology'
        ? `It is where the lessons on ${goalTopic} are, and they work alongside any level.`
        : `It is where the lessons on ${goalTopic} are, and you ticked enough of the ideas it builds on.`;
    case 'goal-known':
      return `It is where the lessons on ${goalTopic} are. You ticked ${s.ticked} of its ${s.total} ideas, so parts may feel familiar.`;
    case 'all-known':
      return s.level === 'psychology'
        ? 'You ticked most of the ideas in every level so far. Psychology looks at the gap between knowing what to do and doing it.'
        : 'You ticked most of the ideas in every level so far.';
  }
}

function HelperResult({ suggestion, goalTopic, label, title, firstLesson, onRestart }: HelperResultProps) {
  const name = label(suggestion.level);
  const gaps = suggestion.gapSlugs
    .map((slug) => ({ slug, title: title(slug) }))
    .filter((g): g is { slug: string; title: string } => Boolean(g.title));
  return (
    <div className="learn-helperResult" aria-live="polite">
      <h3 tabIndex={-1} data-helper-focus style={{ color: `var(--level-${suggestion.level})` }}>
        {name} may be a useful place to begin
      </h3>
      <p className="learn-sub">{reasonFor(suggestion, name, goalTopic)} This is only a reading suggestion: every level stays open.</p>
      {gaps.length > 0 ? (
        <div className="learn-helperLessons">
          <p className="learn-note">Lessons on the ideas you did not tick:</p>
          <ul>
            {gaps.map((g) => <li key={g.slug}><a href={`/blog/${g.slug}/`}>{g.title}</a></li>)}
          </ul>
        </div>
      ) : firstLesson && (
        <div className="learn-helperLessons">
          <p className="learn-note">Its first lesson:</p>
          <ul><li><a href={`/blog/${firstLesson.id}/`}>{firstLesson.title}</a></li></ul>
        </div>
      )}
      {suggestion.also && (
        <p className="learn-sub">
          After that, or alongside it: <a href={`/blog/${suggestion.also}/`}>{label(suggestion.also)}</a>.
        </p>
      )}
      <div className="learn-actions">
        <a className="learn-btn learn-btnPrimary" href={`/blog/${suggestion.level}/`}>See all {name} lessons</a>
        <button type="button" className="learn-btn learn-btnText learn-btnQuiet" onClick={onRestart}>Start over</button>
      </div>
    </div>
  );
}

export function LearnHome({ levels, lessons, inclusiveCount, helperLevels }: LearnHomeProps) {
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState<string | null>(null);
  const helperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setReadPosts(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
    // The homepage links to /blog/#level-helper: open the helper on arrival.
    if (window.location.hash === '#level-helper') setHelperOpen(true);
    // A search engine's sitelinks box sends people to /blog/?q=...: apply
    // the query, then take it out of the address.
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get('q');
      if (q) {
        setQuery(q);
        url.searchParams.delete('q');
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    pauseHeatmaps(helperOpen);
    return () => { if (helperOpen) pauseHeatmaps(false); };
  }, [helperOpen]);

  const levelById = useMemo(() => new Map(levels.map((l) => [l.id, l])), [levels]);
  const core = useMemo(() => lessons.filter((l) => l.level !== INCLUSIVE), [lessons]);

  const progress = useMemo(() => {
    const read = core.filter((l) => readPosts.has(l.id));
    const next = core.find((l) => !readPosts.has(l.id)) ?? null;
    const perLevel = new Map<string, number>();
    for (const l of read) perLevel.set(l.level, (perLevel.get(l.level) ?? 0) + 1);
    return { readCount: read.length, next, perLevel };
  }, [core, readPosts]);

  const returning = progress.readCount > 0;
  const finished = returning && progress.next === null;
  const currentLevel = returning && progress.next ? progress.next.level : null;

  const nextInfo = useMemo(() => {
    const next = progress.next ?? core[0];
    if (!next) return null;
    const inLevel = core.filter((l) => l.level === next.level);
    return {
      lesson: next,
      index: inLevel.findIndex((l) => l.id === next.id) + 1,
      total: inLevel.length,
      levelLabel: levelById.get(next.level)?.label ?? '',
      levelRead: progress.perLevel.get(next.level) ?? 0,
    };
  }, [progress, core, levelById]);

  // Level helper: step 0 asks which ideas the reader could explain, step 1
  // what would help most, step 2 shows the suggestion.
  const concepts = useMemo(() => conceptsFor(helperLevels), [helperLevels]);
  const goals = useMemo(() => goalsFor(helperLevels), [helperLevels]);
  const titleById = useMemo(() => new Map(lessons.map((l) => [l.id, l.title])), [lessons]);
  const suggestion = useMemo(
    () => (step === 2 ? suggestLevel(ticked, goal, helperLevels) : null),
    [step, ticked, goal, helperLevels],
  );

  // Moves focus to the new question or the suggestion after each step, so
  // keyboard and screen reader users follow along.
  useEffect(() => {
    if (!helperOpen) return;
    helperRef.current?.querySelector<HTMLElement>('[data-helper-focus]')?.focus();
  }, [helperOpen, step]);

  const toggleTick = (id: string) => {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const restart = () => {
    setStep(0);
    setTicked(new Set());
    setGoal(null);
  };

  const toggleHelper = () => {
    setHelperOpen((open) => !open);
    restart();
  };

  const trimmed = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!trimmed) return [];
    return lessons.filter((l) =>
      l.title.toLowerCase().includes(trimmed) ||
      l.description.toLowerCase().includes(trimmed) ||
      l.tags.some((t) => t.toLowerCase().includes(trimmed)),
    );
  }, [lessons, trimmed]);
  const shown = showAll ? matches : matches.slice(0, RESULT_LIMIT);

  useEffect(() => { setShowAll(false); }, [trimmed]);

  const lessonHref = (id: string) => `/blog/${id}/`;

  return (
    <div className="learn-home">
      <section className="learn-card" aria-labelledby="learn-start-h">
        {finished ? (
          <div className="learn-startText">
            <p className="learn-eyebrow">Every lesson read</p>
            <h2 id="learn-start-h">You have read all {core.length} lessons on the path so far</h2>
            <p className="learn-sub">New lessons appear here as they are published. Inclusive Finances and the topic list are other ways back in.</p>
          </div>
        ) : returning && nextInfo ? (
          <div className="learn-startText">
            <p className="learn-eyebrow">Continue where you left off</p>
            <h2 id="learn-start-h">{nextInfo.lesson.title}</h2>
            <p className="learn-sub">
              {nextInfo.levelLabel}, lesson {nextInfo.index} of {nextInfo.total} <span className="learn-muted">· {nextInfo.lesson.readingTime} min read</span>
            </p>
            <div className="learn-bar" aria-hidden="true">
              <i style={{ width: `${(nextInfo.levelRead / nextInfo.total) * 100}%`, background: `var(--level-${nextInfo.lesson.level})` }} />
            </div>
            <p className="learn-note">{nextInfo.levelRead} of {nextInfo.total} {nextInfo.levelLabel} lessons read on this device</p>
          </div>
        ) : nextInfo ? (
          <div className="learn-startText">
            <p className="learn-eyebrow">New here?</p>
            <h2 id="learn-start-h">A common starting point is {nextInfo.levelLabel}, the basic language of money</h2>
            <p className="learn-sub">
              Lesson 1: {nextInfo.lesson.title} <span className="learn-muted">{nextInfo.lesson.readingTime} min read</span>
            </p>
          </div>
        ) : null}
        <div className="learn-actions">
          {!finished && nextInfo && (
            <a
              className="learn-btn learn-btnPrimary"
              href={lessonHref(nextInfo.lesson.id)}
              data-attr={returning ? 'blog-start-continue' : 'blog-start-first-lesson'}
            >
              {returning ? 'Continue reading' : 'Read lesson 1'}
            </a>
          )}
          {finished ? (
            <a className="learn-btn learn-btnPrimary" href="/blog/inclusive-finances/" data-attr="blog-start-inclusive">Explore Inclusive Finances</a>
          ) : (
            <button
              type="button"
              className="learn-btn learn-btnSecondary"
              aria-expanded={helperOpen}
              aria-controls="learn-helper"
              onClick={toggleHelper}
              data-attr="blog-level-helper"
            >
              {helperOpen ? 'Close the level helper' : 'Help me choose a level'}
            </button>
          )}
        </div>

        {helperOpen && (
          <div id="learn-helper" className="learn-helper ph-no-capture" ref={helperRef}>
            {step === 0 && (
              <fieldset className="learn-helperQuestion">
                <legend tabIndex={-1} data-helper-focus>
                  <span className="learn-note">Question 1 of 2</span>
                  <span className="learn-helperText">Which of these could you explain to a friend?</span>
                  <span className="learn-note">Tick any that apply. Leaving them all blank is fine too.</span>
                </legend>
                <div className="learn-checks">
                  {concepts.map((c) => (
                    <label key={c.id} className="learn-check">
                      <input type="checkbox" checked={ticked.has(c.id)} onChange={() => toggleTick(c.id)} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
                <div className="learn-actions learn-helperNav">
                  <button type="button" className="learn-btn learn-btnPrimary" onClick={() => setStep(1)}>Next</button>
                </div>
              </fieldset>
            )}
            {step === 1 && (
              <fieldset className="learn-helperQuestion">
                <legend tabIndex={-1} data-helper-focus>
                  <span className="learn-note">Question 2 of 2</span>
                  <span className="learn-helperText">What would help most right now?</span>
                </legend>
                <div className="learn-options">
                  {goals.map((g) => (
                    <button key={g.id} type="button" className="learn-option" onClick={() => { setGoal(g.id); setStep(2); }}>
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="learn-actions learn-helperNav">
                  <button type="button" className="learn-btn learn-btnText learn-btnQuiet" onClick={() => setStep(0)}>Back</button>
                </div>
              </fieldset>
            )}
            {suggestion && (
              <HelperResult
                suggestion={suggestion}
                goalTopic={goals.find((g) => g.id === goal)?.topic}
                label={(id) => levelById.get(id)?.label ?? id}
                title={(id) => titleById.get(id)}
                firstLesson={core.find((l) => l.level === suggestion.level) ?? null}
                onRestart={restart}
              />
            )}
            <p className="learn-note">Your answers are not saved, and no analytics record which ones you pick.</p>
          </div>
        )}
      </section>

      <section className="learn-path" id="learn-path" aria-labelledby="learn-path-h">
        <div className="learn-head">
          <h2 id="learn-path-h">The learning path</h2>
          <span className="learn-note">
            {returning ? `${progress.readCount} of ${core.length} read on this device` : 'Read in order, or open any level'}
          </span>
        </div>
        <ol className="learn-levels">
          {levels.map((level, i) => {
            const style = { '--lc': `var(--level-${level.id})` } as React.CSSProperties;
            if (level.total === 0) {
              return (
                <li key={level.id}>
                  <div className="learn-level learn-levelSoon">
                    <span className="learn-num" aria-hidden="true">{i + 1}</span>
                    <span className="learn-levelText">
                      <span className="learn-levelName">{level.label}</span>
                      <span className="learn-levelSummary">{level.summary}</span>
                    </span>
                    <span className="learn-levelCount">Being written</span>
                  </div>
                </li>
              );
            }
            const read = progress.perLevel.get(level.id) ?? 0;
            const here = level.id === currentLevel;
            return (
              <li key={level.id}>
                <a
                  className={`learn-level${here ? ' learn-levelHere' : ''}`}
                  href={`/blog/${level.id}/`}
                  style={style}
                  data-attr={`blog-level-${level.id}`}
                  aria-current={here ? 'step' : undefined}
                >
                  <span className="learn-num" aria-hidden="true">{i + 1}</span>
                  <span className="learn-levelText">
                    <span className="learn-levelName">
                      {level.label}
                      {here && <em> You are here</em>}
                    </span>
                    <span className="learn-levelSummary">{level.summary}</span>
                  </span>
                  <span className="learn-levelCount">
                    {returning ? <>{read} / {level.total}<span className="lp-srOnly"> read</span></> : `${level.total} lessons`}
                  </span>
                  <Chevron />
                </a>
              </li>
            );
          })}
        </ol>
        {inclusiveCount > 0 && (
          <>
            <p className="learn-alongside" aria-hidden="true">Alongside every level</p>
            <a
              className="learn-level"
              href="/blog/inclusive-finances/"
              style={{ '--lc': 'var(--level-inclusive-finances)' } as React.CSSProperties}
              data-attr="blog-index-inclusive-hub"
            >
              <span className="learn-num learn-numRoute" aria-hidden="true"><CompassIcon /></span>
              <span className="learn-levelText">
                <span className="learn-levelName">Inclusive Finances <span className="lp-srOnly">, alongside every level</span></span>
                <span className="learn-levelSummary">When the standard plan does not fit: couples, shared homes, moving countries, disability and more</span>
              </span>
              <span className="learn-levelCount">{inclusiveCount} {inclusiveCount === 1 ? 'guide' : 'guides'}</span>
              <Chevron />
            </a>
          </>
        )}
      </section>

      <section className="learn-find" aria-labelledby="learn-find-h">
        <div className="learn-head">
          <h2 id="learn-find-h">Find a lesson</h2>
          <a className="learn-topics" href="/blog/tag/" data-attr="blog-index-browse-topics">Browse by topic</a>
        </div>
        <label className="lp-srOnly" htmlFor="learn-search">Search lessons</label>
        <input
          id="learn-search"
          className="learn-search"
          type="search"
          placeholder="Search all lessons, for example debt, renting, couples"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="learn-results" aria-live="polite">
          {trimmed && (
            <p className="learn-note">
              {matches.length === 0
                ? 'No lessons match. A broader word, or the topic list, may help.'
                : `${matches.length} ${matches.length === 1 ? 'lesson' : 'lessons'}`}
            </p>
          )}
          {shown.map((l) => {
            const inclusive = l.level === INCLUSIVE;
            return (
              <a key={l.id} className="learn-result" href={lessonHref(l.id)} data-attr="blog-search-result">
                <span>{l.title}</span>
                <span className="learn-pill" style={{ '--lc': `var(--level-${l.level})` } as React.CSSProperties}>
                  {inclusive ? 'Inclusive' : levelById.get(l.level)?.label}
                </span>
              </a>
            );
          })}
          {matches.length > shown.length && (
            <button type="button" className="learn-btn learn-btnText" onClick={() => setShowAll(true)} data-attr="blog-search-show-all">
              Show all {matches.length}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
