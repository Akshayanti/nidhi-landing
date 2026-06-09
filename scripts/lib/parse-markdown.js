import { readFile, readdir, stat } from 'node:fs/promises';
import { join, basename, relative } from 'node:path';

const INSTAGRAM_DIR = join(import.meta.dirname, '..', '..', 'docs', 'instagram');

/**
 * Recursively find all .md files under a directory, returning relative paths.
 */
async function findMarkdownFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath, base));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative(base, fullPath));
    }
  }
  return files.sort();
}

/**
 * Parse YAML-like frontmatter from a markdown string.
 *
 * Supports:
 *  - Simple single-line:  key: "value"  or  key: value
 *  - Block scalar:        key: |           (preserves newlines)
 *                           line one
 *                           line two
 *  - Folded scalar:       key: >           (joins wrapped lines with spaces)
 *                           line one
 *                           line two
 *  - Comments (# ...) are skipped.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter = {};
  const lines = match[1].split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip comments
    if (line.trimStart().startsWith('#')) { i++; continue; }

    // Block scalar: key: |   or   key: >
    const blockMatch = line.match(/^(\w+):\s*([|>])\s*$/);
    if (blockMatch) {
      const [, key, marker] = blockMatch;
      i++;
      const blockLines = [];
      let indent = null;

      while (i < lines.length) {
        const cur = lines[i];
        if (cur === '') {
          blockLines.push('');
          i++;
          continue;
        }
        const leadingSpaces = cur.match(/^ */)[0].length;
        if (indent === null) indent = leadingSpaces;
        if (leadingSpaces < indent) break; // dedent ends the block
        blockLines.push(cur.slice(indent));
        i++;
      }

      // Trim trailing blank lines
      while (blockLines.length && blockLines[blockLines.length - 1] === '') {
        blockLines.pop();
      }

      frontmatter[key] = marker === '|'
        ? blockLines.join('\n')                                    // preserve newlines
        : blockLines.join(' ').replace(/\s+/g, ' ').trim();        // fold to single line
      continue;
    }

    // Simple key: "value" or key: value
    const m = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (m) frontmatter[m[1]] = m[2];
    i++;
  }

  const body = content.slice(match[0].length).trim();
  return { frontmatter, body };
}

/**
 * Split a pipe-delimited string into a trimmed, non-empty array.
 * Example: "Yes, easily | No, I'd panic" -> ["Yes, easily", "No, I'd panic"]
 */
function splitPipe(s) {
  return (s || '').split('|').map(x => x.trim()).filter(Boolean);
}

/**
 * Parse an instagram markdown file into structured data.
 * Returns: { slug, title, blogUrl, hashtags, caption, slides: [{ number, text }] }
 */
export function parseInstagramPost(content, relPath) {
  const { frontmatter, body } = parseFrontmatter(content);

  // Extract caption section
  const captionMatch = body.match(/## Caption\n\n([\s\S]*?)(?=\n---\n)/);
  const caption = captionMatch ? captionMatch[1].trim() : '';

  // Extract slides. Header may include an optional layout directive:
  //   ## Slide 1 (hook)
  //   ## Slide 4 (stat)
  // Default layout is `prose`; slide 1 defaults to `hook` if unspecified;
  // slide N defaults to `closer` only when explicitly tagged.
  const slides = [];
  // Layout directive is lenient on whitespace: `(hook)`, `( hook )`, `(  hook  )` all valid.
  const slideRegex = /## Slide (\d+)(?:\s*\(\s*([a-z]+)\s*\))?\n\n([\s\S]*?)(?=\n---\n|$)/g;
  let m;
  // Recognized field keys for structured layouts. Anything else stays in body.
  const FIELD_KEYS = new Set([
    'eyebrow', 'label', 'hero', 'caption', 'note', 'sub',
    'title', 'left', 'right', 'left_title', 'right_title',
    'next', 'save', 'share', 'follow', 'read', 'kicker',
    'source',
    'icon', 'left_icon', 'right_icon',
  ]);

  while ((m = slideRegex.exec(body)) !== null) {
    const number = parseInt(m[1], 10);
    const layoutHint = m[2] || null;
    const raw = m[3].trim();

    // Split handle annotation lines (!! prefix) from regular content
    const lines = raw.split('\n');
    const handleLines = [];
    const contentLines = [];
    for (const line of lines) {
      if (line.trimStart().startsWith('!! ')) {
        handleLines.push(line.trimStart().slice(3));
      } else {
        contentLines.push(line);
      }
    }

    // Pull `key: value` lines as structured fields wherever they appear in
    // the slide block; the rest becomes free-form body. A `key: value` line
    // counts only when the key is in FIELD_KEYS, so legitimate prose like
    // "Method: do X" stays in body.
    const fields = {};
    const bodyLines = [];
    for (const ln of contentLines) {
      const fm = ln.match(/^([a-z_]+):\s+(.+)$/);
      if (fm && FIELD_KEYS.has(fm[1])) {
        fields[fm[1]] = fm[2].trim();
      } else {
        bodyLines.push(ln);
      }
    }
    // Trim leading/trailing blank lines from body.
    while (bodyLines.length && bodyLines[0].trim() === '') bodyLines.shift();
    while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();
    const bodyText = bodyLines.join('\n');

    // Default layout: slide 1 → hook unless overridden.
    const layout = layoutHint || (number === 1 ? 'hook' : 'prose');

    slides.push({
      number,
      layout,
      fields,
      text: bodyText,                  // remaining markdown body
      handle: handleLines,
    });
  }

  // Slug preserves subdirectory structure: "samples/variant-a" instead of just "variant-a"
  const slug = basename(relPath, '.md');
  const dir = relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/')) : '';

  return {
    slug,
    relPath,
    subDir: dir,
    title: frontmatter.title || '',
    blogUrl: frontmatter.blog_url || '',
    hashtags: frontmatter.hashtags || '',
    postTime: frontmatter.post_time || '',
    // Eyebrow chip rendered on every non-hook slide.
    // e.g. category="BUDGETING", series="Basics of Money · 14/16"
    category: frontmatter.category || '',
    series: frontmatter.series || '',
    byline: frontmatter.byline || '',
    caption,
    slides,
    totalSlides: slides.length,
    story: {
      // Active fields (decision #38, May 2026 cascade redesign):
      //
      //   hook         → overlay text typed in IG composer over a tap-to-post
      //                  share of the carousel feed post (frame 1, no PNG by
      //                  default; frame-1-hook.png still emits as legacy
      //                  fallback for posts that genuinely need a standalone
      //                  first frame, e.g. milestone teasers).
      //   pollQ +
      //   pollOpts     → typed into the native IG poll sticker on frame 2.
      //                  PNG backdrop is the brand-chrome-only frame-2-poll.png
      //                  (no body text, just chrome).
      //   insightSlide → carousel slide number (1..N) to re-share via tap-to-
      //                  post on frame 3. NOT rendered as a PNG — the carousel
      //                  slide is the visual.
      //   insight      → overlay text typed in IG composer over the re-shared
      //                  carousel slide on frame 3.
      //   blogExtra    → body content for frame 4 (rendered as
      //                  frame-4-extra.png with a designed canvas; this is the
      //                  blog content that the carousel didn't cover, paired
      //                  with the link sticker pointing to the full post).
      //   hashtag      → small hashtag sticker text, frame 1 only.
      //
      // Deprecated (still parsed for backward compat with Series 1 posts):
      //   stat / answer / prompt — superseded by the new cascade. New posts
      //   must omit these. Renderer continues to honor them on Series 1 so
      //   already-shipped posts re-render unchanged.
      hook: frontmatter.story_hook || '',
      pollQ: frontmatter.story_poll_q || '',
      pollOpts: splitPipe(frontmatter.story_poll_opts),
      insightSlide: parseInt(frontmatter.story_insight_slide || '0', 10) || 0,
      insight: frontmatter.story_insight || '',
      blogExtra: frontmatter.story_blog_extra || '',
      hashtag: frontmatter.story_hashtag || '',
      // Opt-in: emit frame-1-hook.png for milestone posts that genuinely
      // need a standalone first frame. Default cascade does NOT emit a
      // PNG for frame 1; story_hook is overlay text typed in IG composer
      // over a tap-to-post share of the carousel. See PLAYBOOK §7, #39.
      renderHookPng: frontmatter.story_render_hook_png === 'true',

      // Deprecated.
      stat: frontmatter.story_stat || '',
      answer: frontmatter.story_answer || '',
      prompt: frontmatter.story_prompt || '',

      // Day 2 (optional, milestone posts only). Mirrors the Day 1 shape.
      // Renderer emits day2-frame-*.png when any day2.* field is present.
      day2: {
        hook: frontmatter.story_day2_hook || '',
        pollQ: frontmatter.story_day2_poll_q || '',
        pollOpts: splitPipe(frontmatter.story_day2_poll_opts),
        insightSlide: parseInt(frontmatter.story_day2_insight_slide || '0', 10) || 0,
        insight: frontmatter.story_day2_insight || '',
        blogExtra: frontmatter.story_day2_blog_extra || '',
        hashtag: frontmatter.story_day2_hashtag || '',
        renderHookPng: frontmatter.story_day2_render_hook_png === 'true',

        // Deprecated.
        stat: frontmatter.story_day2_stat || '',
        answer: frontmatter.story_day2_answer || '',
        prompt: frontmatter.story_day2_prompt || '',
      },
    },
  };
}

/**
 * Load and parse all instagram markdown files (recursive).
 * Returns array sorted by relative path (01-, 02-, etc.)
 */
export async function loadAllPosts() {
  const relPaths = await findMarkdownFiles(INSTAGRAM_DIR);

  const posts = [];
  for (const relPath of relPaths) {
    const content = await readFile(join(INSTAGRAM_DIR, relPath), 'utf-8');
    posts.push(parseInstagramPost(content, relPath));
  }

  return posts;
}

/**
 * Load and parse a single instagram markdown file by relative path.
 */
export async function loadPost(relPath) {
  const content = await readFile(join(INSTAGRAM_DIR, relPath), 'utf-8');
  return parseInstagramPost(content, relPath);
}
