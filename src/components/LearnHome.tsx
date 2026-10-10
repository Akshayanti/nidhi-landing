import { useState, useEffect, useMemo, useRef } from 'react';
import { conceptsFor, goalsFor, suggestLevel, type Suggestion } from '../utils/levelHelper';
import { format } from '../i18n/format.ts';
import type { Dict } from '../i18n/strings/types.ts';

/**
 * The learning path's front page (/blog/): where to start or continue, an
 * optional two-question helper that suggests a level (src/utils/levelHelper.ts), the five levels and
 * Inclusive Finances as one list, and a search across every lesson. The
 * lessons themselves live on one page per level (/blog/<level>/).
 *
 * Copy reaches this island as props, never as an import of the catalog.
 * `dict()` reads a runtime registry holding every language, so importing it
 * here would put both catalogs in the client bundle; `Dict` above is imported
 * as a *type*, which is erased at compile time. Every link is likewise a prop
 * the page built with `localizedPath`, so this module names no locale.
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

/** This page's slice of the catalog, imported as a type only. */
type Strings = Dict['blogIndex']['island'];

export interface LearnLesson {
  id: string;
  title: string;
  description: string;
  level: string;
  readingTime: number;
  tags: string[];
  /** Locale-aware link to the lesson, built by the page with localizedPath. */
  href: string;
}

export interface LearnLevel {
  id: string;
  label: string;
  summary: string;
  /** Published lessons in the level; 0 means it is still being written. */
  total: number;
  /** Locale-aware link to the level's own page, built by the page. */
  href: string;
}

interface LearnHomeProps {
  levels: LearnLevel[];
  /** Every published lesson, ladder lessons in reading order first. */
  lessons: LearnLesson[];
  inclusiveCount: number;
  /** Levels the helper may suggest: fully published (src/utils/levelHelper.ts). */
  helperLevels: string[];
  strings: Strings;
  /** The Inclusive Finances hub, locale-aware. */
  inclusiveHref: string;
  /** The topic hub, locale-aware. */
  topicsHref: string;
}

const STORAGE_KEY = 'nidhi-reading-progress';
const INCLUSIVE = 'inclusive-finances';
const RESULT_LIMIT = 8;

declare global {
  interface Window {
    // `posthog` is declared once, in src/types/posthog.d.ts.
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
  strings: Strings;
  goalTopic?: string;
  levelById: Map<string, LearnLevel>;
  lessonById: Map<string, LearnLesson>;
  firstLesson: LearnLesson | null;
  onRestart: () => void;
}

/** Why the level was suggested, in terms of the reader's own answers. */
function reasonFor(s: Suggestion, name: string, strings: Strings, goalTopic?: string): string {
  switch (s.reason) {
    case 'foundation':
      return format(strings.resultReasonFoundation, { ticked: s.ticked, total: s.total, level: name });
    case 'goal':
      return s.level === 'psychology'
        ? format(strings.resultReasonGoalPsych, { topic: goalTopic ?? '' })
        : format(strings.resultReasonGoal, { topic: goalTopic ?? '' });
    case 'goal-known':
      return format(strings.resultReasonGoalKnown, { topic: goalTopic ?? '', ticked: s.ticked, total: s.total });
    case 'all-known':
      return s.level === 'psychology' ? strings.resultReasonAllKnownPsych : strings.resultReasonAllKnown;
  }
}

function HelperResult({ suggestion, strings, goalTopic, levelById, lessonById, firstLesson, onRestart }: HelperResultProps) {
  const name = levelById.get(suggestion.level)?.label ?? suggestion.level;
  const gaps = suggestion.gapSlugs
    .map((slug) => lessonById.get(slug))
    .filter((l): l is LearnLesson => Boolean(l));
  const also = suggestion.also ? levelById.get(suggestion.also) : undefined;
  return (
    <div className="learn-helperResult" aria-live="polite">
      <h3 tabIndex={-1} data-helper-focus style={{ color: `var(--level-${suggestion.level})` }}>
        {format(strings.resultHeading, { level: name })}
      </h3>
      <p className="learn-sub">{reasonFor(suggestion, name, strings, goalTopic)} {strings.resultSuffix}</p>
      {gaps.length > 0 ? (
        <div className="learn-helperLessons">
          <p className="learn-note">{strings.gapsNote}</p>
          <ul>
            {gaps.map((g) => <li key={g.id}><a href={g.href} lang="en" hrefLang="en">{g.title}</a></li>)}
          </ul>
        </div>
      ) : firstLesson && (
        <div className="learn-helperLessons">
          <p className="learn-note">{strings.firstLessonNote}</p>
          <ul><li><a href={firstLesson.href} lang="en" hrefLang="en">{firstLesson.title}</a></li></ul>
        </div>
      )}
      {also && (
        <p className="learn-sub">
          {strings.alsoLead}<a href={also.href}>{also.label}</a>{strings.alsoEnd}
        </p>
      )}
      <div className="learn-actions">
        <a className="learn-btn learn-btnPrimary" href={levelById.get(suggestion.level)?.href}>{format(strings.seeAll, { level: name })}</a>
        <button type="button" className="learn-btn learn-btnText learn-btnQuiet" onClick={onRestart}>{strings.startOver}</button>
      </div>
    </div>
  );
}

export function LearnHome({ levels, lessons, inclusiveCount, helperLevels, strings, inclusiveHref, topicsHref }: LearnHomeProps) {
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
  const lessonById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
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

  return (
    <div className="learn-home">
      {/* Without a lesson to start, this card has no heading of its own: the
          label is left off rather than pointing at an id that is not there.
          A language whose lessons are still being written is the case. */}
      <section className="learn-card" aria-labelledby={nextInfo ? 'learn-start-h' : undefined}>
        {finished ? (
          <div className="learn-startText">
            <p className="learn-eyebrow">{strings.finishedEyebrow}</p>
            <h2 id="learn-start-h">{format(strings.finishedHeading, { count: core.length })}</h2>
            <p className="learn-sub">{strings.finishedSub}</p>
          </div>
        ) : returning && nextInfo ? (
          <div className="learn-startText">
            <p className="learn-eyebrow">{strings.returningEyebrow}</p>
            <h2 id="learn-start-h" lang="en">{nextInfo.lesson.title}</h2>
            <p className="learn-sub">
              {format(strings.returningSub, { level: nextInfo.levelLabel, index: nextInfo.index, total: nextInfo.total })} <span className="learn-muted">· {nextInfo.lesson.readingTime} {strings.minRead}</span>
            </p>
            <div className="learn-bar" aria-hidden="true">
              <i style={{ width: `${(nextInfo.levelRead / nextInfo.total) * 100}%`, background: `var(--level-${nextInfo.lesson.level})` }} />
            </div>
            <p className="learn-note">{format(strings.returningNote, { read: nextInfo.levelRead, total: nextInfo.total, level: nextInfo.levelLabel })}</p>
          </div>
        ) : nextInfo ? (
          <div className="learn-startText">
            <p className="learn-eyebrow">{strings.newEyebrow}</p>
            <h2 id="learn-start-h">{format(strings.newHeading, { level: nextInfo.levelLabel })}</h2>
            <p className="learn-sub">
              {/* The title is an English lesson's, so it gets its own `lang` inside a line in the page's language. */}
              {strings.newSub.split('{title}')[0]}<span lang="en">{nextInfo.lesson.title}</span>{strings.newSub.split('{title}')[1] ?? ''}{' '}<span className="learn-muted">{nextInfo.lesson.readingTime} {strings.minRead}</span>
            </p>
          </div>
        ) : null}
        <div className="learn-actions">
          {!finished && nextInfo && (
            <a
              className="learn-btn learn-btnPrimary"
              href={nextInfo.lesson.href}
              data-attr={returning ? 'blog-start-continue' : 'blog-start-first-lesson'}
            >
              {returning ? strings.continueReading : strings.readLesson1}
            </a>
          )}
          {finished ? (
            <a className="learn-btn learn-btnPrimary" href={inclusiveHref} data-attr="blog-start-inclusive">{strings.exploreInclusive}</a>
          ) : (
            <button
              type="button"
              className="learn-btn learn-btnSecondary"
              aria-expanded={helperOpen}
              aria-controls="learn-helper"
              onClick={toggleHelper}
              data-attr="blog-level-helper"
            >
              {helperOpen ? strings.helperClose : strings.helperOpen}
            </button>
          )}
        </div>

        {helperOpen && (
          <div id="learn-helper" className="learn-helper ph-no-capture" ref={helperRef}>
            {step === 0 && (
              <fieldset className="learn-helperQuestion">
                <legend tabIndex={-1} data-helper-focus>
                  <span className="learn-note">{strings.q1Note}</span>
                  <span className="learn-helperText">{strings.q1Text}</span>
                  <span className="learn-note">{strings.q1Hint}</span>
                </legend>
                <div className="learn-checks">
                  {concepts.map((c) => (
                    <label key={c.id} className="learn-check">
                      <input type="checkbox" checked={ticked.has(c.id)} onChange={() => toggleTick(c.id)} />
                      <span>{strings.concepts[c.id]}</span>
                    </label>
                  ))}
                </div>
                <div className="learn-actions learn-helperNav">
                  <button type="button" className="learn-btn learn-btnPrimary" onClick={() => setStep(1)}>{strings.next}</button>
                </div>
              </fieldset>
            )}
            {step === 1 && (
              <fieldset className="learn-helperQuestion">
                <legend tabIndex={-1} data-helper-focus>
                  <span className="learn-note">{strings.q2Note}</span>
                  <span className="learn-helperText">{strings.q2Text}</span>
                </legend>
                <div className="learn-options">
                  {goals.map((g) => (
                    <button key={g.id} type="button" className="learn-option" onClick={() => { setGoal(g.id); setStep(2); }}>
                      {strings.goals[g.id].label}
                    </button>
                  ))}
                </div>
                <div className="learn-actions learn-helperNav">
                  <button type="button" className="learn-btn learn-btnText learn-btnQuiet" onClick={() => setStep(0)}>{strings.back}</button>
                </div>
              </fieldset>
            )}
            {suggestion && (
              <HelperResult
                suggestion={suggestion}
                strings={strings}
                goalTopic={goal ? strings.goals[goal]?.topic : undefined}
                levelById={levelById}
                lessonById={lessonById}
                firstLesson={core.find((l) => l.level === suggestion.level) ?? null}
                onRestart={restart}
              />
            )}
            <p className="learn-note">{strings.answersNote}</p>
          </div>
        )}
      </section>

      <section className="learn-path" id="learn-path" aria-labelledby="learn-path-h">
        <div className="learn-head">
          <h2 id="learn-path-h">{strings.pathHeading}</h2>
          <span className="learn-note">
            {returning ? format(strings.pathProgress, { read: progress.readCount, total: core.length }) : strings.pathHint}
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
                    <span className="learn-levelCount">{strings.beingWritten}</span>
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
                  href={level.href}
                  style={style}
                  data-attr={`blog-level-${level.id}`}
                  aria-current={here ? 'step' : undefined}
                >
                  <span className="learn-num" aria-hidden="true">{i + 1}</span>
                  <span className="learn-levelText">
                    <span className="learn-levelName">
                      {level.label}
                      {here && <em> {strings.youAreHere}</em>}
                    </span>
                    <span className="learn-levelSummary">{level.summary}</span>
                  </span>
                  <span className="learn-levelCount">
                    {returning ? <>{read} / {level.total}<span className="lp-srOnly"> {strings.srRead}</span></> : format(strings.lessonsCount, { count: level.total })}
                  </span>
                  <Chevron />
                </a>
              </li>
            );
          })}
        </ol>
        {inclusiveCount > 0 && (
          <>
            <p className="learn-alongside" aria-hidden="true">{strings.alongside}</p>
            <a
              className="learn-level"
              href={inclusiveHref}
              style={{ '--lc': 'var(--level-inclusive-finances)' } as React.CSSProperties}
              data-attr="blog-index-inclusive-hub"
            >
              <span className="learn-num learn-numRoute" aria-hidden="true"><CompassIcon /></span>
              <span className="learn-levelText">
                <span className="learn-levelName">{strings.inclusiveName} <span className="lp-srOnly">{strings.inclusiveSr}</span></span>
                <span className="learn-levelSummary">{strings.inclusiveSummary}</span>
              </span>
              <span className="learn-levelCount">{inclusiveCount} {inclusiveCount === 1 ? strings.guideOne : strings.guideMany}</span>
              <Chevron />
            </a>
          </>
        )}
      </section>

      <section className="learn-find" aria-labelledby="learn-find-h">
        <div className="learn-head">
          <h2 id="learn-find-h">{strings.findHeading}</h2>
          <a className="learn-topics" href={topicsHref} data-attr="blog-index-browse-topics">{strings.browseByTopic}</a>
        </div>
        <label className="lp-srOnly" htmlFor="learn-search">{strings.searchLabel}</label>
        <input
          id="learn-search"
          className="learn-search"
          type="search"
          placeholder={strings.searchPlaceholder}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="learn-results" aria-live="polite">
          {trimmed && (
            <p className="learn-note">
              {matches.length === 0
                ? strings.noMatches
                : `${matches.length} ${matches.length === 1 ? strings.lessonOne : strings.lessonMany}`}
            </p>
          )}
          {shown.map((l) => {
            const inclusive = l.level === INCLUSIVE;
            return (
              <a key={l.id} className="learn-result" href={l.href} data-attr="blog-search-result">
                <span lang="en">{l.title}</span>
                <span className="learn-pill" style={{ '--lc': `var(--level-${l.level})` } as React.CSSProperties}>
                  {inclusive ? strings.inclusivePill : levelById.get(l.level)?.label}
                </span>
              </a>
            );
          })}
          {matches.length > shown.length && (
            <button type="button" className="learn-btn learn-btnText" onClick={() => setShowAll(true)} data-attr="blog-search-show-all">
              {format(strings.showAll, { count: matches.length })}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
