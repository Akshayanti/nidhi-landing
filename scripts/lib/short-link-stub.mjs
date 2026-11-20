/**
 * The page behind a social short link (nidhi.today/ig, /hi/beta/wa and so on).
 *
 * Astro writes a redirect as a bare page whose title is "Redirecting to:
 * /?utm_source=..." and whose canonical carries the campaign parameters. These
 * addresses are made to be pasted into bios and chats, and an app that builds a
 * link preview without following the refresh has only that page to read, so it
 * showed a tracking address instead of the site's card (#459).
 *
 * The stub built here says what the destination says about itself: its
 * language, title, description and social card, read from the destination page
 * the same build has just written. Three things stay exactly as they were:
 *
 * - the refresh goes to the same address, campaign parameters included (the
 *   pageview on the destination is how a visit from a bio is counted);
 * - the page is `noindex` and loads no script, no stylesheet and no analytics;
 * - the destination is still the one written in `redirects` in
 *   astro.config.mjs, which stays the only list of short links.
 *
 * The canonical and `og:url` are the destination without its parameters.
 */

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** A short link for a social profile, as opposed to a renamed page or a code printed on a poster. */
export function isSocialShortLink(destination) {
  return new URL(destination, 'https://nidhi.today').searchParams.get('utm_medium') === 'social';
}

/** The destination's address without its campaign parameters: `/hi/beta/`. */
export function cleanPath(destination) {
  return new URL(destination, 'https://nidhi.today').pathname;
}

/**
 * What a built page says about itself in its head, as the tags it wrote: they
 * are reused as written, so nothing is unescaped and escaped again.
 */
export function readHead(html) {
  const head = html.slice(0, html.indexOf('</head>') === -1 ? html.length : html.indexOf('</head>'));
  const one = (pattern) => head.match(pattern)?.[0] ?? null;
  return {
    lang: head.match(/<html[^>]*\slang="([^"]+)"/)?.[1] ?? null,
    title: head.match(/<title>([^<]*)<\/title>/)?.[1] ?? null,
    description: one(/<meta name="description"[^>]*>/),
    // The card, without the page's own address: the stub states its own.
    social: [...head.matchAll(/<meta (?:property="og:|name="twitter:)[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => !tag.startsWith('<meta property="og:url"')),
  };
}

/**
 * The stub's HTML. `destination` is the address from `redirects`, parameters
 * and all; `head` is `readHead` of the page it leads to; `site` is the origin.
 */
export function shortLinkStub({ destination, head, site }) {
  const missing = ['lang', 'title', 'description'].filter((key) => !head[key]);
  if (missing.length > 0 || !head.social.some((tag) => tag.startsWith('<meta property="og:image"'))) {
    throw new Error(`Short link to ${destination}: the destination page states no ${[...missing, 'og:image'].join(', ')}.`);
  }
  const target = escapeAttr(destination);
  const canonical = escapeAttr(new URL(cleanPath(destination), site).href);
  return [
    '<!doctype html>',
    `<html lang="${escapeAttr(head.lang)}">`,
    '<head>',
    '<meta charset="utf-8">',
    `<title>${head.title}</title>`,
    head.description,
    `<meta http-equiv="refresh" content="0;url=${target}">`,
    '<meta name="robots" content="noindex">',
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:url" content="${canonical}">`,
    ...head.social,
    '</head>',
    `<body><a href="${target}">${head.title}</a></body>`,
    '</html>',
    '',
  ].join('\n');
}

/** Where a page's refresh sends the browser, unescaped; null when it has none. */
export function refreshTarget(html) {
  const raw = html.match(/<meta http-equiv="refresh" content="0;\s*url=([^"]*)"/)?.[1];
  return raw === undefined ? null : raw.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}
