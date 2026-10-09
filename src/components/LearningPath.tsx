import { useState, useEffect, useCallback } from 'react';

export interface PostData {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  level: 'discovery' | 'building' | 'psychology' | 'optimizing' | 'mastery' | 'inclusive-finances';
  readingTime: number;
  tags: string[];
  /** Ladder level whose section shows this post (see utils/companions.ts). */
  pathLevel?: string;
  /** Host post title, for Inclusive Finances companions. */
  companionTitle?: string;
}

interface LevelMeta {
  label: string;
  description: string;
  covered: string;
  prerequisite: string;
  // CSS color resolved at runtime. References per-theme variables defined
  // in global.css so the same level identity stays legible in light and
  // dark mode.
  color: string;
}

export const LEVELS: Record<string, LevelMeta> = {
  discovery: {
    label: 'Discovery',
    description: 'The fundamentals. If you\'re new to personal finance, start here.',
    covered: 'Net worth, assets, liabilities, cash flow, debt, compound interest, liquidity, emergency funds, purchasing power, time value of money, saving vs investing, credit, insurance',
    prerequisite: 'For beginners',
    color: 'var(--level-discovery)',
  },
  building: {
    label: 'Building',
    description: 'Putting the pieces together. Budgets, savings systems, and first investments.',
    covered: 'Budgeting, risk, asset classes, investment accounts, diversification, financial independence intro, multi-currency, real estate, loan terms, passive income, goals, dashboard, health metrics, taxes',
    prerequisite: 'For those comfortable with the basics',
    color: 'var(--level-building)',
  },
  psychology: {
    label: 'Psychology',
    description: 'How your mind helps and hurts your money. Behavioural biases, mental models, and building better money habits.',
    covered: 'Loss aversion, mental accounting, present bias, overconfidence, framing and anchoring, herd behaviour, narrative economics, money scripts, anti-bias systems',
    prerequisite: 'For those ready to understand behavioural patterns',
    color: 'var(--level-psychology)',
  },
  optimizing: {
    label: 'Optimizing',
    description: 'Fine-tuning what works. Tax efficiency, portfolio rebalancing, and advanced strategies.',
    covered: 'Tax-loss harvesting, portfolio rebalancing, asset location, diversification',
    prerequisite: 'For those with a budget and investment plan',
    color: 'var(--level-optimizing)',
  },
  mastery: {
    label: 'Mastery',
    description: 'The long game. Generational wealth, estate planning, and financial independence.',
    covered: 'Estate planning, FIRE, generational wealth, withdrawal strategies',
    prerequisite: 'For experienced planners',
    color: 'var(--level-mastery)',
  },
  'inclusive-finances': {
    label: 'Inclusive Finances',
    description: 'For households the standard advice was not written for. Each guide takes one default assumption, shows what breaks when it does not hold, and rebuilds it deliberately.',
    covered: 'Unmarried and cohabiting couples, shared households, gig work, interest-free finance, cross-border households, solo agers, divorce, caregiving, disability, chosen family, blended families, widowhood',
    prerequisite: 'No prerequisite, relevant at any stage',
    color: 'var(--level-inclusive-finances)',
  },
};

// Inclusive Finances is not a step of the ladder: its posts appear inside
// the ladder levels, each right after the post it follows up on.
const INCLUSIVE = LEVELS['inclusive-finances'];
// Inclusive posts are optional follow-ups: shown on the path, never counted
// toward level or overall progress.
const isOptional = (p: PostData) => p.level === 'inclusive-finances';

function companionLine(post: PostData, onPath: boolean): string {
  if (!post.companionTitle) return onPath ? `Optional · ${INCLUSIVE.label}` : INCLUSIVE.label;
  return onPath ? `Optional follow-up to ${post.companionTitle}` : `Follows up on ${post.companionTitle}`;
}

function CompassIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
const STORAGE_KEY = 'nidhi-reading-progress';

function CheckIcon() {
  return (
    <svg className="lp-checkIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface ReadToggleProps {
  isRead: boolean;
  onToggle: () => void;
}

function ReadToggle({ isRead, onToggle }: ReadToggleProps) {
  return (
    <button
      className={`lp-readToggle ${isRead ? 'lp-readToggleActive' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      aria-pressed={isRead}
      aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
      title={isRead ? 'Mark as unread' : 'Mark as read'}
    >
      {isRead && <CheckIcon />}
    </button>
  );
}

interface PostNodeProps {
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

function PostNode({ post, isRead, isStartHere, levelColor, onToggleRead, onPath = true, step, stepCount }: PostNodeProps) {
  const d = new Date(post.pubDate);
  const dateStr = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
  const isNew = !isRead && (Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000);
  const isInclusive = post.level === 'inclusive-finances';
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
            {isStartHere && <span className="lp-startHereLabel">Start here</span>}
            {isNew && <span className="lp-newLabel">New</span>}
          </div>
        )}
        <div className="lp-cardTop">
          <div className="lp-cardMeta">
            {step !== undefined && (
              <span className="lp-cardStep" style={{ color: levelColor, borderColor: levelColor }} aria-label={`Step ${step} of ${stepCount}`}>
                {step}
              </span>
            )}
            <span className="lp-cardReadingTime">{post.readingTime} min read</span>
            <span className="lp-cardDate">{dateStr}</span>
          </div>
          <ReadToggle isRead={isRead} onToggle={() => onToggleRead(post.id)} />
        </div>
        {isInclusive && (
          <p className="lp-cardCompanion" style={{ color: levelColor }}>
            <CompassIcon size={13} />
            <span>{companionLine(post, onPath)}</span>
          </p>
        )}
        <a href={`/blog/${post.id}/`} className={`lp-cardTitle ${isRead ? 'lp-cardTitleRead' : ''}`} data-attr={`blog-card-${post.id}`}>
          {post.title}
        </a>
        <p className="lp-cardDesc">{post.description}</p>
        {post.tags.length > 0 && (
          <div className="lp-cardTags">
            {post.tags.slice(0, 3).map((tag) => (
              <a key={tag} href={`/blog/tag/${encodeURIComponent(tag)}/`} className="lp-cardTag">
                {tag}
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
export function CollectionList({ posts }: { posts: PostData[] }) {
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
          isRead={readPosts.has(post.id)}
          isStartHere={false}
          levelColor={LEVELS[post.level].color}
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
export function LevelLessons({ level, posts }: { level: string; posts: PostData[] }) {
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());
  const meta = LEVELS[level];

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
    <div className="lp-pathContainer lp-levelPage" style={{ '--level-color': meta.color } as React.CSSProperties}>
      <div className="lp-levelPageProgress">
        <span>{readCount} of {core.length} read on this device</span>
        <div className="lp-levelPageBar">
          <div style={{ width: `${core.length ? (readCount / core.length) * 100 : 0}%`, background: meta.color }} />
        </div>
      </div>
      <div className="lp-levelActions">
        {allRead ? (
          <button type="button" className="lp-levelAction" onClick={() => setLevelRead(false)} data-attr={`lp-mark-level-unread-${level}`}>
            Mark the level as unread
          </button>
        ) : (
          <button type="button" className="lp-levelAction" onClick={() => setLevelRead(true)} data-attr={`lp-mark-level-read-${level}`}>
            Mark the level as read
          </button>
        )}
      </div>
      <p className="lp-orderHint" style={{ color: meta.color }}>Read left to right, then down.</p>
      <div className="lp-levelPosts">
        {posts.map((post) => (
          <PostNode
            key={post.id}
            post={post}
            step={steps.get(post.id)}
            stepCount={core.length}
            isRead={readPosts.has(post.id)}
            isStartHere={post.id === firstUnreadId}
            levelColor={post.level === 'inclusive-finances' ? INCLUSIVE.color : meta.color}
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
export function TopicLessons({ groups }: { groups: TopicGroup[] }) {
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
        const meta = LEVELS[group.level];
        const inclusive = group.level === 'inclusive-finances';
        const href = inclusive ? '/blog/inclusive-finances/' : `/blog/${group.level}/`;
        return (
          <section
            key={group.level}
            className="lp-topicGroup"
            aria-labelledby={`topic-${group.level}`}
            style={{ '--level-color': meta.color } as React.CSSProperties}
          >
            <div className="lp-topicGroupHead">
              <h2 id={`topic-${group.level}`} style={{ color: meta.color }}>{meta.label}</h2>
              <a href={href} data-attr={`topic-level-${group.level}`}>
                {inclusive ? `All ${meta.label} guides` : `All ${meta.label} lessons`} ({group.levelTotal})
              </a>
            </div>
            <div className="lp-levelPosts">
              {group.posts.map((post) => (
                <PostNode
                  key={post.id}
                  post={post}
                  step={inclusive ? undefined : post.step}
                  stepCount={post.stepCount}
                  isRead={readPosts.has(post.id)}
                  isStartHere={post.id === firstUnreadId}
                  levelColor={meta.color}
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
