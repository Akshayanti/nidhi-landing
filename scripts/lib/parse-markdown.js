import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const INSTAGRAM_DIR = join(import.meta.dirname, '..', '..', 'docs', 'instagram');

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
export function parseInstagramPost(content, filename) {
  const { frontmatter, body } = parseFrontmatter(content);

  // Extract caption section
  const captionMatch = body.match(/## Caption\n\n([\s\S]*?)(?=\n---\n)/);
  const caption = captionMatch ? captionMatch[1].trim() : '';

  // Extract slides
  const slides = [];
  const slideRegex = /## Slide (\d+)\n\n([\s\S]*?)(?=\n---\n|$)/g;
  let m;
  while ((m = slideRegex.exec(body)) !== null) {
    slides.push({
      number: parseInt(m[1], 10),
      text: m[2].trim(),
    });
  }

  const slug = basename(filename, '.md');

  return {
    slug,
    filename,
    title: frontmatter.title || '',
    blogUrl: frontmatter.blog_url || '',
    hashtags: frontmatter.hashtags || '',
    caption,
    slides,
    totalSlides: slides.length,
  };
}

/**
 * Load and parse all instagram markdown files.
 * Returns array sorted by filename (01-, 02-, etc.)
 */
export async function loadAllPosts() {
  const files = (await readdir(INSTAGRAM_DIR))
    .filter(f => f.endsWith('.md'))
    .sort();

  const posts = [];
  for (const file of files) {
    const content = await readFile(join(INSTAGRAM_DIR, file), 'utf-8');
    posts.push(parseInstagramPost(content, file));
  }

  return posts;
}

/**
 * Load and parse a single instagram markdown file by filename.
 */
export async function loadPost(filename) {
  const content = await readFile(join(INSTAGRAM_DIR, filename), 'utf-8');
  return parseInstagramPost(content, filename);
}
