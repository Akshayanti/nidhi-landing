import { useState, useEffect, useCallback, useMemo } from 'react';

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

const LEVEL_ORDER = ['discovery', 'building', 'psychology', 'optimizing', 'mastery'] as const;
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
 * The learning path for one topic (/blog/tag/<tag>/): that topic's posts,
 * grouped by level on a timeline, with search and links to other topics.
 */
export function LearningPath({ posts }: { posts: PostData[] }) {
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReadPosts(new Set(JSON.parse(stored)));
      }
    } catch { /* ignore */ }
    const qParam = new URLSearchParams(window.location.search).get('q');
    if (qParam) {
      setSearchQuery(qParam);
    }
  }, []);

  // Reflect the current search query into the URL via replaceState, so a
  // search can be bookmarked. No history entries are pushed (back-button
  // stays useful), and no navigation occurs. Empty queries clean the param
  // off the URL so shared links don't carry a stale `?q=`.
  //
  // Privacy note: Analytics.astro removes ?q= from every /blog/ URL before
  // any event is sent (see the privacy notice).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const trimmed = searchQuery.trim();
      const current = url.searchParams.get('q') ?? '';
      if (trimmed === current) return;
      if (trimmed) {
        url.searchParams.set('q', trimmed);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState(null, '', url.toString());
    } catch { /* ignore: URL constructor failure or replaceState block */ }
  }, [searchQuery]);

  // Auto-collapse sections when all posts are read
  useEffect(() => {
    const newlyCompleted = LEVEL_ORDER.filter((level) => {
      const levelPosts = posts.filter((p) => p.level === level);
      return levelPosts.length > 0 && levelPosts.every((p) => readPosts.has(p.id));
    });
    if (newlyCompleted.length > 0) {
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        for (const level of newlyCompleted) {
          next.add(level);
        }
        return next;
      });
    }
  }, [readPosts, posts]);

  const toggleSection = useCallback((level: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  const saveProgress = useCallback((newSet: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet]));
    } catch { /* ignore */ }
  }, []);

  const toggleRead = useCallback((id: string) => {
    setReadPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveProgress(next);
      return next;
    });
  }, [saveProgress]);

  // Marks every post of the level itself as read or unread, whatever filter
  // is active. Optional follow-ups placed in the section are left alone.
  const setLevelRead = useCallback((level: string, read: boolean) => {
    setReadPosts((prev) => {
      const next = new Set(prev);
      posts.filter((p) => p.level === level).forEach((p) => (read ? next.add(p.id) : next.delete(p.id)));
      saveProgress(next);
      return next;
    });
    // Reading a level collapses it (see the auto-collapse effect); undoing
    // that should bring the posts back into view.
    if (!read) {
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        next.delete(level);
        return next;
      });
    }
  }, [posts, saveProgress]);

  const scrollToLevel = useCallback((level: string) => {
    const el = document.getElementById(`level-${level}`);
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return posts;
    return posts.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [posts, searchQuery]);

  const levelGroups = useMemo(() => {
    return LEVEL_ORDER.map((level) => ({
      level,
      meta: LEVELS[level],
      posts: filteredPosts.filter((p) => (p.pathLevel ?? p.level) === level),
      // The level's own posts: what progress, completion, and "Start here"
      // count. Optional follow-ups are shown in the section but never count.
      core: filteredPosts.filter((p) => p.level === level),
    }));
  }, [filteredPosts]);

  const hasInclusive = posts.some(isOptional);

  const firstUnreadId = useMemo(() => {
    for (const group of levelGroups) {
      for (const post of group.core) {
        if (!readPosts.has(post.id)) return post.id;
      }
    }
    return null;
  }, [levelGroups, readPosts]);

  const shownLevels = levelGroups.filter((g) => g.posts.length > 0).map((g) => g.level);

  const corePosts = filteredPosts.filter((p) => !isOptional(p));
  const totalPosts = corePosts.length;
  const totalRead = corePosts.filter((p) => readPosts.has(p.id)).length;
  const overallPercent = totalPosts > 0 ? (totalRead / totalPosts) * 100 : 0;

  return (
    <div className="lp-pathContainer">
      <div className="lp-pathLine" />

      <nav className="lp-levelNav" aria-label="Learning path levels and routes">
        {LEVEL_ORDER.map((level) => {
          const meta = LEVELS[level];
          const group = levelGroups.find((g) => g.level === level);
          const count = group ? group.core.length : 0;
          if (count === 0) return null;
          const readCount = group ? group.core.filter((p) => readPosts.has(p.id)).length : 0;
          return (
            <a
              key={level}
              href={`#level-${level}`}
              className="lp-levelNavLink"
              style={{ '--level-color': meta.color } as React.CSSProperties}
            >
              <span className="lp-levelNavLinkNum">{LEVEL_ORDER.indexOf(level) + 1}</span>
              <div className="lp-levelNavLinkText">
                <span className="lp-levelNavLinkLabel">{meta.label}</span>
                <span className="lp-levelNavLinkPrereq">{meta.prerequisite}</span>
              </div>
              <span className="lp-levelNavLinkCount">{readCount}/{count}</span>
            </a>
          );
        })}
        {/* Inclusive Finances is a route beside the ladder, not a step on it:
            unnumbered, full width, and leading to the hub that groups every
            guide by situation. On the path itself the guides stay next to the
            lessons they follow up on. */}
        {hasInclusive && (
          <a
            href="/blog/inclusive-finances/"
            className="lp-levelNavLink lp-levelNavRoute"
            data-attr="blog-index-inclusive-hub"
            style={{ '--level-color': INCLUSIVE.color } as React.CSSProperties}
          >
            <span className="lp-levelNavLinkNum"><CompassIcon size={14} /></span>
            <div className="lp-levelNavLinkText">
              <span className="lp-levelNavLinkLabel">{INCLUSIVE.label}</span>
              <span className="lp-levelNavLinkPrereq">
                Relevant at any stage. Relationships, work, countries, abilities and life changes the standard path does not account for.
              </span>
            </div>
            <span className="lp-levelNavLinkCount">All guides</span>
          </a>
        )}
      </nav>

      {allTags.length > 0 && (
        <div className="lp-filterBar">
          <div className="lp-searchWrapper">
            <svg className="lp-searchIcon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="9" r="6" />
              <line x1="13.5" y1="13.5" x2="18" y2="18" />
            </svg>
            <input
              type="text"
              className="lp-searchInput"
              placeholder="Search posts..."
              aria-label="Search posts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="lp-searchClear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
          <span className="lp-tagFilterLabel">Filter by topic:</span>
          <div className="lp-tagList">
            {allTags.map((tag) => (
              <a key={tag} href={`/blog/tag/${encodeURIComponent(tag)}/`} className="lp-tagFilterBtn">
                {tag}
              </a>
            ))}
          </div>
        </div>
      )}

      {totalPosts > 0 && (
        <div className="lp-overallProgress">
          <div className="lp-overallProgressLabel">
            <span>Your progress</span>
            <span>{totalRead} of {totalPosts} read</span>
          </div>
          <div className="lp-overallProgressTrack">
            <div className="lp-overallProgressFill" style={{ width: `${overallPercent}%` }} />
          </div>
        </div>
      )}

      {filteredPosts.length === 0 && searchQuery.trim() && (
        <div className="lp-noResults">
          <p>No posts found matching "{searchQuery.trim()}".</p>
          <button className="lp-noResultsClear" onClick={() => setSearchQuery('')}>
            Clear search
          </button>
        </div>
      )}

      {levelGroups.map((group, index) => {
        if (group.posts.length === 0) return null;
        const levelRead = group.core.filter((p) => readPosts.has(p.id)).length;
        const levelPercent = group.core.length > 0 ? (levelRead / group.core.length) * 100 : 0;
        const isCompleted = group.core.length > 0 && levelRead === group.core.length;
        const isCollapsed = collapsedSections.has(group.level);
        const shownIndex = shownLevels.indexOf(group.level);
        const prevLevel = shownLevels[shownIndex - 1];
        const nextLevel = shownLevels[shownIndex + 1];
        const allLevelPostsRead = posts
          .filter((p) => p.level === group.level)
          .every((p) => readPosts.has(p.id));

        return (
          <div
            key={group.level}
            id={`level-${group.level}`}
            tabIndex={-1}
            className={`lp-levelSection ${isCollapsed ? 'lp-levelSectionCollapsed' : ''}`}
          >
            <div
              className="lp-levelWaypoint"
              style={{ background: group.meta.color }}
            >
              {index + 1}
            </div>

            <div
              className={`lp-levelHeader ${isCompleted ? 'lp-levelHeaderToggle' : ''}`}
              onClick={isCompleted ? () => toggleSection(group.level) : undefined}
              onKeyDown={isCompleted ? (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection(group.level);
                }
              } : undefined}
              role={isCompleted ? 'button' : undefined}
              tabIndex={isCompleted ? 0 : undefined}
              aria-expanded={isCompleted ? !isCollapsed : undefined}
              aria-label={isCompleted ? `${isCollapsed ? 'Expand' : 'Collapse'} ${group.meta.label}` : undefined}
            >
              <div className="lp-levelLabelRow">
                <div className="lp-levelLabel" style={{ color: group.meta.color }}>
                  {group.meta.label}
                  <span className="lp-levelPrereq">{group.meta.prerequisite}</span>
                </div>
                {isCompleted && (
                  <div className="lp-levelHeaderRight">
                    <span className="lp-levelCompletedBadge" style={{ color: group.meta.color, borderColor: group.meta.color }}>Completed</span>
                    <svg
                      className={`lp-levelCollapseChevron ${isCollapsed ? 'lp-levelCollapseChevronDown' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      width="16"
                      height="16"
                    >
                      <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
                    </svg>
                  </div>
                )}
              </div>
              {!(isCompleted && isCollapsed) && (
                <>
                  <p className="lp-levelDesc">{group.meta.description}</p>
                  <div className="lp-levelMeta">
                    <span className="lp-levelCovered"><strong>What's covered:</strong> {group.meta.covered}</span>
                  </div>
                </>
              )}
              {group.core.length > 0 && (
                <>
                  <span className="lp-levelProgress">{levelRead}/{group.core.length} read</span>
                  <div className="lp-levelProgressBar">
                    <div
                      className="lp-levelProgressFill"
                      style={{ width: `${levelPercent}%`, background: group.meta.color }}
                    />
                  </div>
                </>
              )}
            </div>

            {(group.core.length > 0 || nextLevel || prevLevel) && (
              <div className="lp-levelActions" style={{ '--level-color': group.meta.color } as React.CSSProperties}>
                {group.core.length === 0 ? null : allLevelPostsRead ? (
                  <button type="button" className="lp-levelAction" onClick={() => setLevelRead(group.level, false)} data-attr={`lp-mark-level-unread-${group.level}`}>
                    Mark the level as unread
                  </button>
                ) : (
                  <button type="button" className="lp-levelAction" onClick={() => setLevelRead(group.level, true)} data-attr={`lp-mark-level-read-${group.level}`}>
                    Mark the level as read
                  </button>
                )}
                {nextLevel && (
                  <button type="button" className="lp-levelAction" onClick={() => scrollToLevel(nextLevel)} data-attr={`lp-skip-next-${group.level}`}>
                    Skip to next <span aria-hidden="true">↓</span>
                  </button>
                )}
                {prevLevel && (
                  <button type="button" className="lp-levelAction" onClick={() => scrollToLevel(prevLevel)} data-attr={`lp-go-previous-${group.level}`}>
                    Go to previous <span aria-hidden="true">↑</span>
                  </button>
                )}
              </div>
            )}

            {!isCollapsed && (
              <div className="lp-levelPosts">
                {group.posts.map((post) => (
                  <PostNode
                    key={post.id}
                    post={post}
                    isRead={readPosts.has(post.id)}
                    isStartHere={post.id === firstUnreadId}
                    levelColor={post.level === 'inclusive-finances' ? INCLUSIVE.color : group.meta.color}
                    onToggleRead={toggleRead}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
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
