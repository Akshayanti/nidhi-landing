// The version an Apps Script file reports in its health answer (#443): the
// first 12 hexadecimal characters of the SHA-256 of the file, read with its
// own VERSION literal left empty and line endings as LF. The literal is
// written by `npm run gs:version` and checked by scripts/gs-version.test.mjs,
// so the number in the file always says which source it is, and a live
// script's answer can be compared with main (.github/workflows/apps-script-versions.yml).
import { createHash } from 'node:crypto';

/** The web-app scripts that carry a VERSION. The other two have no web app (docs/operations.md). */
export const VERSIONED_SCRIPTS = ['scripts/newsletter.gs', 'scripts/waitlist.gs', 'scripts/volunteer-list.gs'];

export const VERSION_LINE = /^var VERSION = '([0-9a-f]*)';/m;

export function gsVersion(source) {
  const text = source.replace(/\r\n/g, '\n');
  if (!VERSION_LINE.test(text)) throw new Error('no "var VERSION = \'...\';" line');
  const blank = text.replace(VERSION_LINE, "var VERSION = '';");
  return createHash('sha256').update(blank, 'utf8').digest('hex').slice(0, 12);
}

export function writtenVersion(source) {
  return source.match(VERSION_LINE)?.[1] ?? null;
}

export function withVersion(source) {
  return source.replace(VERSION_LINE, `var VERSION = '${gsVersion(source)}';`);
}
