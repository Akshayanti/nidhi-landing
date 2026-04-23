import { useState, useEffect, useCallback, useMemo } from 'react';

interface PostData {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  level: 'discovery' | 'building' | 'optimizing' | 'mastery';
  readingTime: number;
  tags: string[];
}

interface LevelMeta {
  label: string;
  description: string;
  covered: string;
  prerequisite: string;
  color: string;
}

const LEVELS: Record<string, LevelMeta> = {
  discovery: {
    label: 'Discovery',
    description: 'The fundamentals. If you\'re new to personal finance, start here.',
    covered: 'Net worth, assets, liabilities, cash flow, debt, compound interest, liquidity, emergency funds, purchasing power, time value of money, saving vs investing, credit, insurance',
    prerequisite: 'For beginners',
    color: '#00897B',
  },
  building: {
    label: 'Building',
    description: 'Putting the pieces together. Budgets, savings systems, and first investments.',
    covered: 'Budgeting, risk, asset classes, investment accounts, diversification, financial independence intro, multi-currency, real estate, loan terms, passive income, goals, dashboard, health metrics, taxes',
    prerequisite: 'For those comfortable with the basics',
    color: '#1565C0',
  },
  optimizing: {
    label: 'Optimizing',
    description: 'Fine-tuning what works. Tax efficiency, portfolio rebalancing, and advanced strategies.',
    covered: 'Tax-loss harvesting, portfolio rebalancing, asset location, diversification',
    prerequisite: 'For those with a budget and investment plan',
    color: '#E65100',
  },
  mastery: {
    label: 'Mastery',
    description: 'The long game. Generational wealth, estate planning, and financial independence.',
    covered: 'Estate planning, FIRE, generational wealth, withdrawal strategies',
    prerequisite: 'For experienced planners',
    color: '#7B1FA2',
  },
};

const LEVEL_ORDER = ['discovery', 'building', 'optimizing', 'mastery'] as const;
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
  onToggleRead: (id: string) => void;
  onTagClick: (tag: string) => void;
}

function PostNode({ post, isRead, isStartHere, levelColor, selectedTag, onToggleRead, onTagClick }: PostNodeProps) {
  const d = new Date(post.pubDate);
  const dateStr = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
  const cardClasses = [
    'lp-nodeCard',
    isRead ? 'lp-nodeCardRead' : '',
    isStartHere ? 'lp-nodeCardStartHere' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="lp-postNode">
      <div className="lp-nodeDotWrapper">
        <div
          className="lp-nodeDot"
          style={{
            borderColor: levelColor,
            background: isRead ? levelColor : undefined,
          }}
        />
      </div>
      <div className="lp-nodeConnector" />
      <div className={cardClasses} style={!isRead && !isStartHere ? { borderLeftColor: levelColor } : undefined}>
        {isStartHere && <span className="lp-startHereLabel">Start here</span>}
        <div className="lp-cardTop">
          <div className="lp-cardMeta">
            <span className="lp-cardReadingTime">{post.readingTime} min read</span>
            <span className="lp-cardDate">{dateStr}</span>
          </div>
          <ReadToggle isRead={isRead} onToggle={() => onToggleRead(post.id)} />
        </div>
        <a href={`/blog/${post.id}`} className={`lp-cardTitle ${isRead ? 'lp-cardTitleRead' : ''}`}>
          {post.title}
        </a>
        <p className="lp-cardDesc">{post.description}</p>
        {post.tags.length > 0 && (
          <div className="lp-cardTags">
            {post.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                className={`lp-cardTag ${selectedTag === tag ? 'lp-cardTagActive' : ''}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick(tag); }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface LearningPathProps {
  posts: PostData[];
}

export function LearningPath({ posts }: LearningPathProps) {
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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
  }, []);

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
      posts: filteredPosts.filter((p) => p.level === level),
    }));
  }, [filteredPosts]);

  const firstUnreadId = useMemo(() => {
    for (const group of levelGroups) {
      for (const post of group.posts) {
        if (!readPosts.has(post.id)) return post.id;
      }
    }
    return null;
  }, [levelGroups, readPosts]);

  const totalPosts = filteredPosts.length;
  const totalRead = filteredPosts.filter((p) => readPosts.has(p.id)).length;
  const overallPercent = totalPosts > 0 ? (totalRead / totalPosts) * 100 : 0;

  return (
    <div className="lp-pathContainer">
      <div className="lp-pathLine" />

      <nav className="lp-levelNav">
        {LEVEL_ORDER.map((level) => {
          const meta = LEVELS[level];
          const group = levelGroups.find((g) => g.level === level);
          const count = group ? group.posts.length : 0;
          if (count === 0) return null;
          const readCount = group ? group.posts.filter((p) => readPosts.has(p.id)).length : 0;
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
      </nav>

      {allTags.length > 0 && (
        <div className="lp-filterBar">
          <div className="lp-searchWrapper">
            <svg className="lp-searchIcon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="9" r="6" />
              <line x1="13.5" y1="13.5" x2="18" y2="18" />
            </svg>
            <input
              type="text"
              className="lp-searchInput"
              placeholder="Search posts..."
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
              <button
                key={tag}
                className={`lp-tagFilterBtn ${selectedTag === tag ? 'lp-tagFilterBtnActive' : ''}`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </button>
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
        const levelRead = group.posts.filter((p) => readPosts.has(p.id)).length;
        const levelPercent = (levelRead / group.posts.length) * 100;
        const isCompleted = levelRead === group.posts.length;
        const isCollapsed = collapsedSections.has(group.level);

        return (
          <div key={group.level} id={`level-${group.level}`} className={`lp-levelSection ${isCollapsed ? 'lp-levelSectionCollapsed' : ''}`}>
            <div
              className="lp-levelWaypoint"
              style={{ background: group.meta.color }}
            >
              {index + 1}
            </div>

            <div
              className={`lp-levelHeader ${isCompleted ? 'lp-levelHeaderToggle' : ''}`}
              onClick={isCompleted ? () => toggleSection(group.level) : undefined}
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
              <span className="lp-levelProgress">{levelRead}/{group.posts.length} read</span>
              <div className="lp-levelProgressBar">
                <div
                  className="lp-levelProgressFill"
                  style={{ width: `${levelPercent}%`, background: group.meta.color }}
                />
              </div>
            </div>

            {!isCollapsed && group.posts.map((post) => (
              <PostNode
                key={post.id}
                post={post}
                isRead={readPosts.has(post.id)}
                isStartHere={post.id === firstUnreadId}
                levelColor={group.meta.color}
                selectedTag={selectedTag}
                onToggleRead={toggleRead}
                onTagClick={setSelectedTag}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}