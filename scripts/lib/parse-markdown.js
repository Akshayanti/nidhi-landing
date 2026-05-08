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

  // Extract slides
  const slides = [];
  const slideRegex = /## Slide (\d+)\n\n([\s\S]*?)(?=\n---\n|$)/g;
  let m;
  while ((m = slideRegex.exec(body)) !== null) {
    const raw = m[2].trim();
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

    slides.push({
      number: parseInt(m[1], 10),
      text: contentLines.join('\n').trim(),
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
    caption,
    slides,
    totalSlides: slides.length,
    story: {
      // Quiz stickers were removed by Instagram; story_quiz_* fields in
      // legacy frontmatter are intentionally not surfaced here. Multi-option
      // polls (up to 4 options) cover the former quiz use case.
      //
      // story_answer is the optional reveal-frame text for quiz-style polls:
      // when set, the stat frame renders the answer-reveal variant instead
      // of the stat, pairing with the link sticker to route to the blog.
      hook: frontmatter.story_hook || '',
      stat: frontmatter.story_stat || '',
      answer: frontmatter.story_answer || '',
      pollQ: frontmatter.story_poll_q || '',
      pollOpts: splitPipe(frontmatter.story_poll_opts),
      prompt: frontmatter.story_prompt || '',
      hashtag: frontmatter.story_hashtag || '',
      // Day 2 (optional, milestone posts only). Mirrors the Day 1 shape.
      // Renderer emits day2-frame-*.png when any day2.* field is present.
      day2: {
        hook: frontmatter.story_day2_hook || '',
        stat: frontmatter.story_day2_stat || '',
        answer: frontmatter.story_day2_answer || '',
        pollQ: frontmatter.story_day2_poll_q || '',
        pollOpts: splitPipe(frontmatter.story_day2_poll_opts),
        prompt: frontmatter.story_day2_prompt || '',
        hashtag: frontmatter.story_day2_hashtag || '',
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
