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
 * Handles simple key: "value" and key: value pairs.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (m) frontmatter[m[1]] = m[2];
  }

  const body = content.slice(match[0].length).trim();
  return { frontmatter, body };
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
    caption,
    slides,
    totalSlides: slides.length,
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
