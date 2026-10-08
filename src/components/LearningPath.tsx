import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface PostData {
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

const LEVELS: Record<string, LevelMeta> = {
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
  selectedTag: string | null;
  /**
   * When true, tag-chip clicks trigger the in-page React filter and
   * preventDefault() the navigation. The blog index renders chips this
   * way so a click filters the visible list rather than navigating
   * away. The per-tag pages render with `interceptTagClick=false`, so
   * a click on a chip there navigates to the new tag's page (no
   * filter context to preserve).
   */
  interceptTagClick: boolean;
  onToggleRead: (id: string) => void;
  onTagClick: (tag: string) => void;
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

function PostNode({ post, isRead, isStartHere, levelColor, selectedTag, interceptTagClick, onToggleRead, onTagClick, onPath = true, step, stepCount }: PostNodeProps) {
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
              <a
                key={tag}
                href={`/blog/tag/${encodeURIComponent(tag)}/`}
                className={`lp-cardTag ${selectedTag === tag ? 'lp-cardTagActive' : ''}`}
                onClick={(e) => {
                  // On the blog index we want a click to filter the
                  // visible learning path, not navigate. On a tag page
                  // we let the link navigate so the user can switch
                  // tags. Either way the rendered HTML is a real
                  // anchor with a real href, so crawlers see the link.
                  if (interceptTagClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    onTagClick(tag);
                  }
                }}
                aria-pressed={interceptTagClick ? selectedTag === tag : undefined}
              >
                {tag}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface LearningPathProps {
  posts: PostData[];
  /**
   * Show step numbers and the reading-order hint. Only for the blog index,
   * which receives every post; a per-tag page gets a subset, where the
   * numbers would not match the real learning-path positions.
   */
  showSteps?: boolean;
  /**
   * Controls tag-chip click behaviour. Defaults to true (the blog index
   * use case). Pass false when rendering inside a per-tag page where a
   * chip click should navigate to the new tag's page rather than apply
   * an in-page filter.
   */
  interceptTagClick?: boolean;
  /**
   * Size of the whole Inclusive Finances collection, for its card in the
   * level navigation. `posts` holds only the guides placed on this path,
   * which leaves out any whose host lesson is not visible yet.
   */
  inclusiveTotal?: number;
  /**
   * Phones only (the blog index): search and topics fold behind one
   * button, and only the level the reader is on starts open; the others
   * show as one row each. Wider screens are unaffected. Open and closed
   * state lives in memory only: every visit starts the same way.
   */
  compactOnPhones?: boolean;
}

const PHONE_QUERY = '(max-width: 640px)';
const isPhone = () => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches;

export function LearningPath({ posts, interceptTagClick = true, showSteps = false, inclusiveTotal, compactOnPhones = false }: LearningPathProps) {
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  // Phone layout (compactOnPhones): whether the search and topic panel is
  // open, and levels the reader opened or closed by hand. Neither is stored.
  const [filterOpen, setFilterOpen] = useState(false);
  const [levelOverrides, setLevelOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReadPosts(new Set(JSON.parse(stored)));
      }
    } catch { /* ignore */ }
    const params = new URLSearchParams(window.location.search);
    const tagParam = params.get('tag');
    if (tagParam) {
      setSelectedTag(tagParam);
    }
    // Honour `?q=` deep links. Wires up the WebSite.SearchAction
    // schema declared on `/`: a SERP that surfaces the sitelinks search
    // box submits to `/blog/?q={query}`, and now the page actually
    // applies that query on load instead of ignoring it. Closes
    // finding 17.
    const qParam = params.get('q');
    if (qParam) {
      setSearchQuery(qParam);
    }
    // A link that arrives with a filter shows the panel it came from.
    if (tagParam || qParam) setFilterOpen(true);
  }, []);

  // Reflect the current search query into the URL via replaceState.
  // No history entries are pushed (back-button stays useful), and no
  // navigation occurs. Empty queries clean the param off the URL so
  // shared links don't carry a stale `?q=`.
  //
  // Privacy note: query state lives entirely in the visitor's browser
  // history; we do not exfiltrate it. Server-side, GitHub Pages does
  // not log query strings in any way we control.
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

  // On phones, opens a folded level so a link or button that leads to it
  // lands on its lessons. Does nothing on wider screens, where every level
  // is already shown.
  const openLevelOnPhone = useCallback((level: string) => {
    if (!compactOnPhones || !isPhone()) return;
    setLevelOverrides((prev) => ({ ...prev, [level]: true }));
    setCollapsedSections((prev) => {
      if (!prev.has(level)) return prev;
      const next = new Set(prev);
      next.delete(level);
      return next;
    });
  }, [compactOnPhones]);

  const scrollToLevel = useCallback((level: string) => {
    openLevelOnPhone(level);
    // After the fold opens, so the level's top is where it will stay.
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`level-${level}`);
      if (!el) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      el.focus({ preventScroll: true });
    });
  }, [openLevelOnPhone]);

  // Level links such as /blog/#level-building, on arrival or in the page:
  // on phones the level opens and comes into view.
  useEffect(() => {
    if (!compactOnPhones) return;
    const fromHash = () => {
      const match = /^#level-([a-z-]+)$/.exec(window.location.hash);
      if (match && (LEVEL_ORDER as readonly string[]).includes(match[1]) && isPhone()) {
        scrollToLevel(match[1]);
      }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [compactOnPhones, scrollToLevel]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (selectedTag) {
      result = result.filter((p) => p.tags.includes(selectedTag));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [posts, selectedTag, searchQuery]);

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

  // Step numbers come from the full, unfiltered order, so a search or tag
  // filter never renumbers the posts.
  const steps = useMemo(() => {
    const map = new Map<string, { step: number; count: number }>();
    for (const level of LEVEL_ORDER) {
      const own = posts.filter((p) => p.level === level);
      own.forEach((p, i) => map.set(p.id, { step: i + 1, count: own.length }));
    }
    return map;
  }, [posts]);

  const inclusiveCount = inclusiveTotal ?? posts.filter(isOptional).length;
  const hasInclusive = inclusiveCount > 0;

  const firstUnreadId = useMemo(() => {
    for (const group of levelGroups) {
      for (const post of group.core) {
        if (!readPosts.has(post.id)) return post.id;
      }
    }
    return null;
  }, [levelGroups, readPosts]);

  // Phones: the level the reader is on (the first with an unread lesson,
  // whatever the filter) starts open; the rest start folded. While a search
  // or topic filter is active, every level with matches starts open.
  const currentLevel = useMemo(() => {
    for (const level of LEVEL_ORDER) {
      if (posts.some((p) => p.level === level && !readPosts.has(p.id))) return level;
    }
    return null;
  }, [posts, readPosts]);
  const filterActive = Boolean(selectedTag || searchQuery.trim());

  // A new search or topic starts from that default again, so a level closed
  // earlier never hides its matches.
  // Skips the first run, so a level opened from a #level- link on arrival
  // stays open.
  const filterSeen = useRef(false);
  useEffect(() => {
    if (!filterSeen.current) {
      filterSeen.current = true;
      return;
    }
    setLevelOverrides({});
  }, [selectedTag, searchQuery]);

  const isOpenOnPhone = (level: string) =>
    levelOverrides[level] ?? (filterActive || level === currentLevel);

  const togglePhoneLevel = (level: string) => {
    const open = !isOpenOnPhone(level);
    setLevelOverrides((prev) => ({ ...prev, [level]: open }));
    if (open) {
      setCollapsedSections((prev) => {
        if (!prev.has(level)) return prev;
        const next = new Set(prev);
        next.delete(level);
        return next;
      });
    }
  };

  const shownLevels = levelGroups.filter((g) => g.posts.length > 0).map((g) => g.level);

  const corePosts = filteredPosts.filter((p) => !isOptional(p));
  const totalPosts = corePosts.length;
  const totalRead = corePosts.filter((p) => readPosts.has(p.id)).length;
  const overallPercent = totalPosts > 0 ? (totalRead / totalPosts) * 100 : 0;

  return (
    <div className={`lp-pathContainer${compactOnPhones ? ' lp-compactOnPhones' : ''}`}>
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
              onClick={() => openLevelOnPhone(level)}
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
            <span className="lp-levelNavLinkCount">{inclusiveTotal !== undefined ? `${inclusiveCount} guides` : 'All guides'}</span>
          </a>
        )}
      </nav>

      {/* Phones only: one button for search and topics. It never repeats
          what was typed, so a recorded click cannot carry it. */}
      {compactOnPhones && allTags.length > 0 && (
        <button
          type="button"
          className="lp-filterToggle"
          aria-expanded={filterOpen}
          aria-controls="lp-filterBar"
          onClick={() => setFilterOpen((open) => !open)}
        >
          <svg className="lp-filterToggleIcon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="9" r="6" />
            <line x1="13.5" y1="13.5" x2="18" y2="18" />
          </svg>
          <span>Search and filter</span>
          {filterActive && <span className="lp-filterToggleActive">On</span>}
          <svg className="lp-filterToggleChevron" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
          </svg>
        </button>
      )}

      {allTags.length > 0 && (
        <div id="lp-filterBar" className={`lp-filterBar ${compactOnPhones && !filterOpen ? 'lp-filterBarPhoneClosed' : ''}`}>
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
              <a
                key={tag}
                href={`/blog/tag/${encodeURIComponent(tag)}/`}
                className={`lp-tagFilterBtn ${selectedTag === tag ? 'lp-tagFilterBtnActive' : ''}`}
                onClick={(e) => {
                  // Same dual-mode behaviour as the per-card chips: on the
                  // blog index, intercept and toggle the React filter; on
                  // a tag page, let the click navigate to the new tag.
                  if (interceptTagClick) {
                    e.preventDefault();
                    setSelectedTag(selectedTag === tag ? null : tag);
                  }
                }}
                aria-pressed={interceptTagClick ? selectedTag === tag : undefined}
              >
                {tag}
              </a>
            ))}
            {selectedTag && (
              <button className="lp-tagFilterClear" onClick={() => setSelectedTag(null)}>
                Clear filter
              </button>
            )}
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

      {filteredPosts.length === 0 && (selectedTag || searchQuery.trim()) && (
        <div className="lp-noResults">
          <p>No posts found{selectedTag ? ` for "${selectedTag}"` : ''}{searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ''}.</p>
          <button className="lp-noResultsClear" onClick={() => { setSelectedTag(null); setSearchQuery(''); }}>
            Clear all filters
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

        const phoneOpen = isOpenOnPhone(group.level);
        const sectionClasses = [
          'lp-levelSection',
          isCollapsed ? 'lp-levelSectionCollapsed' : '',
          compactOnPhones && !phoneOpen ? 'lp-phoneFolded' : '',
        ].filter(Boolean).join(' ');

        return (
          <div key={group.level} id={`level-${group.level}`} tabIndex={-1} className={sectionClasses}>
            <div
              className="lp-levelWaypoint"
              style={{ background: group.meta.color }}
            >
              {index + 1}
            </div>

            {/* Phones only: the level as one row that opens and closes it.
                Wider screens use the header below. */}
            {compactOnPhones && (
              <button
                type="button"
                className="lp-levelPhoneToggle"
                aria-expanded={phoneOpen}
                aria-controls={`level-${group.level}-body`}
                onClick={() => togglePhoneLevel(group.level)}
                style={{ '--level-color': group.meta.color } as React.CSSProperties}
              >
                <span className="lp-levelNavLinkNum" aria-hidden="true">{index + 1}</span>
                <span className="lp-levelPhoneToggleText">
                  <span className="lp-levelPhoneToggleLabel">{group.meta.label}</span>
                  <span className="lp-levelPhoneTogglePrereq">{group.meta.prerequisite}</span>
                </span>
                {group.core.length > 0 && (
                  <span className="lp-levelPhoneToggleCount">
                    {levelRead}/{group.core.length}
                    <span className="lp-srOnly"> read</span>
                  </span>
                )}
                <svg className="lp-levelPhoneToggleChevron" viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
                </svg>
              </button>
            )}

            <div className="lp-levelBody" id={`level-${group.level}-body`}>

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

            {/* A grid on wide screens (see .blog-index .lp-levelPosts), one
                column everywhere else. Step numbers and the hint make the
                reading order explicit: across, then down. */}
            {!isCollapsed && showSteps && (
              <p className="lp-orderHint" style={{ color: group.meta.color }}>
                Read left to right, then down.
              </p>
            )}
            {!isCollapsed && (
              <div className="lp-levelPosts">
                {group.posts.map((post) => (
                  <PostNode
                    key={post.id}
                    step={!showSteps || post.level === 'inclusive-finances' ? undefined : steps.get(post.id)?.step}
                    stepCount={steps.get(post.id)?.count}
                    post={post}
                    isRead={readPosts.has(post.id)}
                    isStartHere={post.id === firstUnreadId}
                    levelColor={post.level === 'inclusive-finances' ? INCLUSIVE.color : group.meta.color}
                    selectedTag={selectedTag}
                    interceptTagClick={interceptTagClick}
                    onToggleRead={toggleRead}
                    onTagClick={setSelectedTag}
                  />
                ))}
              </div>
            )}
            </div>
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
          selectedTag={null}
          interceptTagClick={false}
          onToggleRead={toggleRead}
          onTagClick={() => {}}
          onPath={false}
        />
      ))}
    </div>
  );
}
