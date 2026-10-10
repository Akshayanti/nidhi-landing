import { useState, useEffect, useCallback } from 'react';
import { format } from '../i18n/format.ts';
import type { Dict } from '../i18n/strings/types.ts';

/**
 * The learning path's lesson cards and read toggles. Three exports share them:
 * `LevelLessons` for one level's page, `TopicLessons` for a topic's page, and
 * `CollectionList` for a list outside the ladder (the Inclusive Finances hub).
 *
 * Copy reaches this island as props, never as an import of the catalog.
 * `dict()` reads a runtime registry holding every language, so importing it
 * here would put both catalogs in the client bundle; `Dict` above is imported
 * as a *type*, which is erased at compile time. The same goes for links: the
 * pages build them with `localizedPath` and pass them in, so this module never
 * names a locale.
 *
 * Privacy (see the privacy notice): reading progress still comes from the
 * existing nidhi-reading-progress key and never leaves the browser. Nothing new
 * is stored.
 */

/**
 * One locale's slice of `learn.island`. Imported as a type only.
 */
type Strings = Dict['learn']['island'];

export interface PostData {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  level: 'discovery' | 'building' | 'psychology' | 'optimizing' | 'mastery' | 'inclusive-finances';
  readingTime: number;
  tags: string[];
  /** Locale-aware link to the lesson, built by the page with localizedPath. */
  href: string;
  /** Ladder level whose section shows this post (see utils/companions.ts). */
  pathLevel?: string;
  /** Host post title, for Inclusive Finances companions. */
  companionTitle?: string;
}

/**
 * The level colours. CSS custom properties, not copy: the same six names in
 * every language, so they stay here rather than travelling through the
 * catalog. Defined in global.css, per theme, so a level stays legible in light
 * and dark mode.
 */
const LEVEL_COLORS: Record<string, string> = {
  discovery: 'var(--level-discovery)',
  building: 'var(--level-building)',
  psychology: 'var(--level-psychology)',
  optimizing: 'var(--level-optimizing)',
  mastery: 'var(--level-mastery)',
  'inclusive-finances': 'var(--level-inclusive-finances)',
};

/** Inclusive Finances is not a step of the ladder: its posts sit inside the levels. */
const INCLUSIVE = 'inclusive-finances';
/** Inclusive posts are optional follow-ups: shown on the path, never counted toward progress. */
const isOptional = (p: PostData) => p.level === INCLUSIVE;

/** Props every card needs beyond the post itself. */
interface CardContext {
  strings: Strings;
  /** Tag slug to its locale-aware link, built by the page. */
  tagHrefs: Record<string, string>;
  /** Tag slug to the chip's text in the page's language, built by the page. */
  tagLabels: Record<string, string>;
  /** The Inclusive Finances level name, for a companion with no host line. */
  inclusiveLabel: string;
  /** BCP-47 tag for the card's short date, so a month reads in the page's language. */
  dateLocale: string;
}

function companionLine(post: PostData, onPath: boolean, { strings, inclusiveLabel }: CardContext): React.ReactNode {
  if (!post.companionTitle) {
    return onPath ? format(strings.companionOptionalLabel, { label: inclusiveLabel }) : inclusiveLabel;
  }
  // The host is an English lesson's title, so it gets its own `lang` inside a
  // line in the page's language.
  const [before, after = ''] = (onPath ? strings.companionOptionalFollows : strings.companionFollows).split('{host}');
  return <>{before}<span lang="en">{post.companionTitle}</span>{after}</>;
}

function CompassIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="lp-checkIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const STORAGE_KEY = 'nidhi-reading-progress';

interface ReadToggleProps {
  isRead: boolean;
  onToggle: () => void;
  label: string;
}

function ReadToggle({ isRead, onToggle, label }: ReadToggleProps) {
  return (
    <button
      className={`lp-readToggle ${isRead ? 'lp-readToggleActive' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      aria-pressed={isRead}
      aria-label={label}
      title={label}
    >
      {isRead && <CheckIcon />}
    </button>
  );
}

interface PostNodeProps extends CardContext {
  post: PostData;
  isRead: boolean;
  isStartHere: boolean;
  levelColor: string;
  onToggleRead: (id: string) => void;
  /**
   * Position of the post in its level's reading order (1-based) and the
   * level's count, shown as a step number so the order is unambiguous when
   * posts sit in two columns. Undefined for optional companion posts and
   * off-path lists.
   */
  step?: number;
  stepCount?: number;
  /** On the learning path an inclusive card is marked optional; on its own hub it is not. */
  onPath?: boolean;
}

function PostNode({ post, isRead, isStartHere, levelColor, onToggleRead, onPath = true, step, stepCount, strings, tagHrefs, tagLabels, inclusiveLabel, dateLocale }: PostNodeProps) {
  const ctx: CardContext = { strings, tagHrefs, tagLabels, inclusiveLabel, dateLocale };
  const d = new Date(post.pubDate);
  // One Intl call, so each language puts the day and month in its own order
  // ("Apr 19", "19 अप्रैल"). UTC, because a pubDate is a UTC midnight: a local
  // time zone west of UTC would show the day before.
  const dateStr = d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const isNew = !isRead && (Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000);
  const isInclusive = post.level === INCLUSIVE;
  const cardClasses = [
    'lp-nodeCard',
    isRead ? 'lp-nodeCardRead' : '',
    isStartHere ? 'lp-nodeCardStartHere' : '',
    isInclusive ? 'lp-nodeCardCompanion' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="lp-postNode">
      <div className="lp-nodeDotWrapper">
        <div
          className={`lp-nodeDot ${isInclusive ? 'lp-nodeDotCompanion' : ''}`}
          style={{
            borderColor: levelColor,
            background: isRead ? levelColor : undefined,
          }}
        />
      </div>
      <div className="lp-nodeConnector" aria-hidden="true" />
      <div className={cardClasses} style={!isRead && !isStartHere ? { borderLeftColor: levelColor } : undefined}>
        {(isStartHere || isNew) && (
          <div className="lp-cardBadges">
            {isStartHere && <span className="lp-startHereLabel">{strings.startHere}</span>}
            {isNew && <span className="lp-newLabel">{strings.new}</span>}
          </div>
        )}
        <div className="lp-cardTop">
          <div className="lp-cardMeta">
            {step !== undefined && (
              <span className="lp-cardStep" style={{ color: levelColor, borderColor: levelColor }} aria-label={format(strings.step, { step, count: stepCount ?? '' })}>
                {step}
              </span>
            )}
            <span className="lp-cardReadingTime">{post.readingTime} {strings.minRead}</span>
            <span className="lp-cardDate">{dateStr}</span>
          </div>
          <ReadToggle isRead={isRead} onToggle={() => onToggleRead(post.id)} label={isRead ? strings.markUnread : strings.markRead} />
        </div>
        {isInclusive && (
          <p className="lp-cardCompanion" style={{ color: levelColor }}>
            <CompassIcon size={13} />
            <span>{companionLine(post, onPath, ctx)}</span>
          </p>
        )}
        {/* Lessons are English on every edition, so their words carry their own
            language for a screen reader on a Hindi page. */}
        <a href={post.href} lang="en" hrefLang="en" className={`lp-cardTitle ${isRead ? 'lp-cardTitleRead' : ''}`} data-attr={`blog-card-${post.id}`}>
          {post.title}
        </a>
        <p className="lp-cardDesc" lang="en">{post.description}</p>
        {post.tags.length > 0 && (
          <div className="lp-cardTags">
            {post.tags.slice(0, 3).map((tag) => (
              <a key={tag} href={tagHrefs[tag]} className="lp-cardTag">
                {tagLabels[tag] ?? tag}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Flat list of post cards with the same read toggles as the learning path,
 * for pages that list a collection outside the ladder (the Inclusive
 * Finances hub). Reads and writes the same reading-progress key, so a post
 * marked read here shows as read on the learning path and the other way
 * round.
 */
export function CollectionList({ posts, ...ctx }: { posts: PostData[] } & CardContext) {
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setReadPosts(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  const toggleRead = useCallback((id: string) => {
    setReadPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <div className="lp-pathContainer">
      <div className="lp-pathLine" />
      {posts.map((post) => (
        <PostNode
          key={post.id}
          post={post}
          {...ctx}
          isRead={readPosts.has(post.id)}
          isStartHere={false}
          levelColor={LEVEL_COLORS[post.level]}
          onToggleRead={toggleRead}
          onPath={false}
        />
      ))}
    </div>
  );
}

/**
 * One level's lessons, for its own page (/blog/<level>/): progress for the
 * level, the mark-as-read buttons, and the lesson cards in reading order,
 * with Inclusive Finances follow-ups after the lesson they build on. Reads
 * and writes the same reading-progress key as everywhere else.
 */
export function LevelLessons({ level, posts, ...ctx }: { level: string; posts: PostData[] } & CardContext) {
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());
  const color = LEVEL_COLORS[level];

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setReadPosts(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((next: Set<string>) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  }, []);

  const toggleRead = useCallback((id: string) => {
    setReadPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      save(next);
      return next;
    });
  }, [save]);

  const core = posts.filter((p) => p.level === level);
  const setLevelRead = (read: boolean) => {
    setReadPosts((prev) => {
      const next = new Set(prev);
      core.forEach((p) => (read ? next.add(p.id) : next.delete(p.id)));
      save(next);
      return next;
    });
  };

  const readCount = core.filter((p) => readPosts.has(p.id)).length;
  const allRead = core.length > 0 && readCount === core.length;
  const firstUnreadId = core.find((p) => !readPosts.has(p.id))?.id ?? null;
  const steps = new Map(core.map((p, i) => [p.id, i + 1]));

  return (
    <div className="lp-pathContainer lp-levelPage" style={{ '--level-color': color } as React.CSSProperties}>
      <div className="lp-levelPageProgress">
        <span>{format(ctx.strings.readCount, { read: readCount, total: core.length })}</span>
        <div className="lp-levelPageBar">
          <div style={{ width: `${core.length ? (readCount / core.length) * 100 : 0}%`, background: color }} />
        </div>
      </div>
      <div className="lp-levelActions">
        {allRead ? (
          <button type="button" className="lp-levelAction" onClick={() => setLevelRead(false)} data-attr={`lp-mark-level-unread-${level}`}>
            {ctx.strings.markLevelUnread}
          </button>
        ) : (
          <button type="button" className="lp-levelAction" onClick={() => setLevelRead(true)} data-attr={`lp-mark-level-read-${level}`}>
            {ctx.strings.markLevelRead}
          </button>
        )}
      </div>
      <p className="lp-orderHint" style={{ color }}>{ctx.strings.orderHint}</p>
      <div className="lp-levelPosts">
        {posts.map((post) => (
          <PostNode
            key={post.id}
            post={post}
            {...ctx}
            step={steps.get(post.id)}
            stepCount={core.length}
            isRead={readPosts.has(post.id)}
            isStartHere={post.id === firstUnreadId}
            levelColor={post.level === INCLUSIVE ? LEVEL_COLORS[INCLUSIVE] : color}
            onToggleRead={toggleRead}
          />
        ))}
      </div>
    </div>
  );
}

export interface TopicGroup {
  /** A ladder level, or 'inclusive-finances' for the guides beside it. */
  level: string;
  /** The level's name in the page's language. */
  label: string;
  /** Locale-aware link to that level's own page, built by the page. */
  href: string;
  /** Posts of this topic in reading order; `step` is the post's place in its whole level. */
  posts: (PostData & { step?: number; stepCount?: number })[];
  /** How many lessons the whole level has, for "All Discovery lessons (16)". */
  levelTotal: number;
}

/**
 * One topic's lessons (/blog/tag/<tag>/), grouped by level in reading order,
 * with the same cards and read toggles as the level pages. Each group links
 * to its full level; step numbers show where a lesson sits in that level.
 */
export function TopicLessons({ groups, ...ctx }: { groups: TopicGroup[] } & CardContext) {
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setReadPosts(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  const toggleRead = useCallback((id: string) => {
    setReadPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const firstUnreadId = groups
    .flatMap((g) => g.posts)
    .find((p) => !isOptional(p) && !readPosts.has(p.id))?.id ?? null;

  return (
    <div className="lp-pathContainer lp-levelPage lp-topicPage">
      {groups.map((group) => {
        const color = LEVEL_COLORS[group.level];
        const inclusive = group.level === INCLUSIVE;
        return (
          <section
            key={group.level}
            className="lp-topicGroup"
            aria-labelledby={`topic-${group.level}`}
            style={{ '--level-color': color } as React.CSSProperties}
          >
            <div className="lp-topicGroupHead">
              <h2 id={`topic-${group.level}`} style={{ color }}>{group.label}</h2>
              <a href={group.href} data-attr={`topic-level-${group.level}`}>
                {format(inclusive ? ctx.strings.allGuides : ctx.strings.allLessons, { level: group.label })} ({group.levelTotal})
              </a>
            </div>
            <div className="lp-levelPosts">
              {group.posts.map((post) => (
                <PostNode
                  key={post.id}
                  post={post}
                  {...ctx}
                  step={inclusive ? undefined : post.step}
                  stepCount={post.stepCount}
                  isRead={readPosts.has(post.id)}
                  isStartHere={post.id === firstUnreadId}
                  levelColor={color}
                  onToggleRead={toggleRead}
                  onPath={!inclusive}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
