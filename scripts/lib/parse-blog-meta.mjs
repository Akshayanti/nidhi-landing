import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const BLOG_ROOT = join(import.meta.dirname, "../../src/content/blog");
const LEVEL_DIRS = {
  discovery: "1. discovery",
  building: "2. building",
  optimizing: "4. optimizing",
  "inclusive-finances": "inclusive-finances",
};

/**
 * Extract frontmatter and body from raw markdown.
 * @param {string} raw - Raw markdown content
 * @returns {{ meta: Record<string, unknown>, body: string }}
 */
export function parseMarkdown(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta = parseFrontmatterBlock(match[1]);
  const body = match[2].trim();
  return { meta, body };
}

/**
 * Parse just the frontmatter block from raw markdown.
 * @param {string} raw - Raw markdown content
 * @returns {Record<string, unknown>}
 */
export function parseFrontmatter(raw) {
  return parseMarkdown(raw).meta;
}

/**
 * @param {string} frontmatterBlock - Content between --- delimiters
 * @returns {Record<string, unknown>}
 */
/**
 * Frontmatter keys that contain a nested object literal:
 *   relatedTool:
 *     url: "/free/loan-comparison"
 *     label: "Loan comparison calculator"
 *     cta: "Compare any two offers"
 * Add to this set when introducing a new nested-object frontmatter field that
 * the reel pipeline needs to read. (Schema validation lives in
 * src/content.config.ts; this parser is a lightweight subset for Node tooling.)
 */
const NESTED_OBJECT_KEYS = new Set(["relatedTool"]);

function parseFrontmatterBlock(frontmatterBlock) {
  const fields = {};
  let currentArray = null;
  let currentObject = null;

  for (const line of frontmatterBlock.split("\n")) {
    // Object key continuation: "  subkey: value" (indented)
    if (currentObject && /^\s+\w+:\s*/.test(line)) {
      const sub = line.match(/^\s+(\w+):\s*(.*)$/);
      if (sub) {
        const subKey = sub[1];
        const subVal = sub[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
        fields[currentObject][subKey] = subVal;
        continue;
      }
    }

    // Array item continuation: "  - value"
    if (currentArray && /^\s+-\s/.test(line)) {
      const val = line.replace(/^\s+-\s*/, "").replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      if (Array.isArray(fields[currentArray])) {
        fields[currentArray].push(val);
      }
      continue;
    }

    currentArray = null;
    currentObject = null;

    // Key: value
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (!kv) continue;

    const [, key, rawValue] = kv;
    const value = rawValue.trim();

    // Nested object start: "relatedTool:" with empty value
    if (value === "" && NESTED_OBJECT_KEYS.has(key)) {
      fields[key] = {};
      currentObject = key;
      continue;
    }

    // Array start: "tags:" (empty value means list follows on next lines)
    if (value === "" && (key === "tags" || key === "personas")) {
      fields[key] = [];
      currentArray = key;
      continue;
    }

    if (value === "") continue;

    // Quoted string
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      fields[key] = value.slice(1, -1);
      continue;
    }

    // Number
    if (/^\d+$/.test(value)) {
      fields[key] = Number.parseInt(value, 10);
      continue;
    }

    // Boolean
    if (value === "true") { fields[key] = true; continue; }
    if (value === "false") { fields[key] = false; continue; }

    // Array syntax: "[a, b, c]"
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1);
      fields[key] = inner.split(",").map(s => s.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"));
      currentArray = null;
      continue;
    }

    // Plain string
    fields[key] = value;
  }

  return fields;
}

/**
 * Read all blog posts at a given level.
 * @param {"discovery"|"building"} level
 * @returns {Promise<Array<{ meta: Record<string, unknown>, body: string }>>}
 */
export async function loadPostsAtLevel(level) {
  const posts = await readLevel(level);
  const launch = await monteCarloLaunch();
  for (const p of posts) {
    if (!isMonteCarloUrl(p.meta.relatedTool?.url)) continue;
    const pub = toDate(p.meta.pubDate);
    if (!launch || !pub || pub < launch) delete p.meta.relatedTool;
  }
  return posts;
}

// Mirrors src/utils/monte-carlo/release.ts: the simulator launches with the
// financial-projections post. A post that goes live before then may name it
// as its relatedTool (the site hides the link until launch), but its reel
// script and captions must not point at it. Posts scheduled on or after the
// launch keep the plug, so their reels can be rendered ahead of time.
const MONTE_CARLO_HOST_SLUG = "financial-projections";

function isMonteCarloUrl(url) {
  return typeof url === "string" && url.replace(/\/?$/, "/").endsWith("/free/monte-carlo-simulator/");
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

let monteCarloLaunchDate;
async function monteCarloLaunch() {
  if (monteCarloLaunchDate === undefined) {
    const host = (await readLevel("optimizing")).find((p) => p.meta.slug === MONTE_CARLO_HOST_SLUG);
    monteCarloLaunchDate = toDate(host?.meta.pubDate);
  }
  return monteCarloLaunchDate;
}

async function readLevel(level) {
  const dirName = LEVEL_DIRS[level];
  if (!dirName) throw new Error(`Unknown level: ${level}`);
  const dir = join(BLOG_ROOT, dirName);

  const entries = await readdir(dir, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== ".md") continue;

    const raw = await readFile(join(dir, entry.name), "utf-8");
    const { meta, body } = parseMarkdown(raw);

    if (meta.slug) {
      posts.push({ meta, body });
    }
  }

  posts.sort((a, b) => (a.meta.order || 99) - (b.meta.order || 99));
  return posts;
}

/**
 * Read all building-level posts (legacy alias).
 * @returns {Promise<Array<{ meta: Record<string, unknown>, body: string }>>}
 */
export async function loadBuildingPosts() {
  return loadPostsAtLevel("building");
}

/**
 * Load posts across one or both levels.
 * @param {"discovery"|"building"|"all"} levels
 */
export async function loadPosts(levels) {
  if (levels === "all") {
    const [d, b] = await Promise.all([
      loadPostsAtLevel("discovery"),
      loadPostsAtLevel("building"),
    ]);
    return [...d, ...b];
  }
  return loadPostsAtLevel(levels);
}
