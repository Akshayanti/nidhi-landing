/**
 * Whether any situation page has been written yet.
 *
 * The situations collection (src/content.config.ts) and its route were built
 * ahead of their content, and an empty collection made Astro warn seven times
 * in every build and type check: once from the file loader, which found no
 * file, and once for each page that asked for the collection. Standing
 * warnings teach everyone to skip the channel a real content error would use
 * (#322). So the folder is looked at first, and nothing is loaded or asked
 * for while it holds no page. The route stays; the first file turns the
 * collection on with no other change.
 *
 * Read from the project root, where `npm run build`, `dev` and `typecheck`
 * all start, as the collection's own `base` is.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** The folder, as the collection's loader names it. */
export const SITUATIONS_BASE = './src/content/situations';

/** A page is a Markdown file whose name does not start with an underscore (those are notes). */
export function isSituationFile(name: string): boolean {
  return /^[^_].*\.md$/.test(name);
}

export function hasSituationFiles(root: string = process.cwd()): boolean {
  const dir = join(root, SITUATIONS_BASE);
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .some((entry) => entry.isFile() && isSituationFile(entry.name));
}
