/**
 * Checks over the built site in dist/ (#361): what the pages say about
 * themselves to search engines and feed readers, read from the files a reader
 * is served, after the build has written them.
 *
 *   1. Every indexable page states one canonical address, its own.
 *   2. Its hreflang links name exactly the editions the page exists in (as an
 *      indexable page), each pointing at that edition's own address, and every
 *      edition names the same set back. x-default is the English address
 *      when English is among them.
 *   3. The sitemap lists no noindexed page and no address dist lacks, leaves
 *      out no indexable page, and pairs each address with the same editions
 *      as its page head.
 *   4. Every internal href and src in a page, and every link in a feed,
 *      resolves to a file in dist.
 *   5. No page shows a literal `{placeholder}`, `undefined` or
 *      `[object Object]` in its text or in the attributes a reader is given.
 *   6. Every XML file (feeds, sitemaps) is well-formed.
 *
 * Plain text parsing, no browser and no dependency: the build's HTML is
 * regular enough (quoted attributes, one tag per element) for it. The pure
 * functions here take a `site` object, so scripts/lib/check-dist.test.mjs runs
 * them on small hand-made fixtures; scripts/check-dist.mjs loads dist/.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const ORIGIN = 'https://nidhi.today';

// ---------------------------------------------------------------------------
// Reading HTML
// ---------------------------------------------------------------------------

/** The page with the bodies of scripts, styles and comments emptied, so their contents are never read as tags. */
export function stripRaw(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2')
    .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/gi, '$1$2');
}

/** Attributes of one opening tag, names lower-cased, entities in values decoded. */
export function attributes(tag) {
  const out = {};
  const body = tag.replace(/^<[a-zA-Z][\w:-]*/, '').replace(/\/?>$/, '');
  for (const m of body.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

export function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Every opening tag of the given names in a page whose raw bodies are stripped. */
export function tags(stripped, ...names) {
  const re = new RegExp(`<(?:${names.join('|')})\\b[^>]*>`, 'gi');
  return [...stripped.matchAll(re)].map((m) => ({ tag: m[0], name: /^<([a-zA-Z][\w:-]*)/.exec(m[0])[1].toLowerCase(), attrs: attributes(m[0]) }));
}

/** What a page tells search engines about itself. */
export function readHead(html) {
  const stripped = stripRaw(html);
  const head = stripped.split(/<\/head>/i)[0];
  const links = tags(head, 'link');
  const robots = tags(head, 'meta').find((t) => (t.attrs.name ?? '').toLowerCase() === 'robots')?.attrs.content ?? '';
  const refresh = tags(head, 'meta').some((t) => (t.attrs['http-equiv'] ?? '').toLowerCase() === 'refresh');
  return {
    canonicals: links.filter((t) => relList(t).includes('canonical')).map((t) => t.attrs.href),
    alternates: links
      .filter((t) => relList(t).includes('alternate') && t.attrs.hreflang)
      .map((t) => ({ lang: t.attrs.hreflang, href: t.attrs.href })),
    noindex: /noindex/i.test(robots),
    redirect: refresh,
  };
}

function relList(t) {
  return (t.attrs.rel ?? '').toLowerCase().split(/\s+/);
}

// ---------------------------------------------------------------------------
// The site model
// ---------------------------------------------------------------------------

/**
 * The address a dist file is served at: `about/index.html` → `/about/`,
 * `404.html` → `/404.html`, `rss.xml` → `/rss.xml`.
 */
export function urlPathOf(file) {
  const p = `/${file.split(sep).join('/')}`;
  if (p === '/index.html') return '/';
  if (p.endsWith('/index.html')) return p.slice(0, -'index.html'.length);
  return p;
}

/**
 * The model the checks read: `files` is every served path (`/about/index.html`
 * and `/about/` both), `pages` maps an HTML page's address to its text, `xml`
 * maps an XML file's address to its text.
 */
export function siteFrom(entries) {
  const files = new Set();
  const pages = new Map();
  const xml = new Map();
  for (const [file, text] of entries) {
    const path = `/${file.split(sep).join('/')}`;
    files.add(path);
    const url = urlPathOf(file);
    files.add(url);
    if (path.endsWith('.html')) pages.set(url, text);
    else if (path.endsWith('.xml')) xml.set(url, text);
  }
  return { files, pages, xml };
}

/** Read dist/ into the model. Text is read only for HTML and XML files. */
export function loadDist(dir) {
  const entries = [];
  const walk = (folder) => {
    for (const name of readdirSync(folder)) {
      const full = join(folder, name);
      if (statSync(full).isDirectory()) walk(full);
      else entries.push([relative(dir, full), /\.(html|xml)$/.test(name) ? readFileSync(full, 'utf8') : '']);
    }
  };
  walk(dir);
  return siteFrom(entries);
}

/** Whether an address within the site is served by a file in dist. */
export function resolves(site, pathname) {
  let p = pathname;
  try { p = decodeURI(p); } catch { /* keep it as written */ }
  if (site.files.has(p)) return true;
  // GitHub Pages serves /about as /about/ (a redirect) when the folder has an index.
  if (!p.endsWith('/') && site.files.has(`${p}/`)) return true;
  return false;
}

/**
 * The editions of the site, from the home page's own hreflang links:
 * hreflang tag → address prefix ('' for English).
 */
export function editionsOf(site) {
  const home = site.pages.get('/');
  if (!home) return new Map();
  const out = new Map();
  for (const { lang, href } of readHead(home).alternates) {
    if (lang === 'x-default') continue;
    out.set(lang, new URL(href, ORIGIN).pathname.replace(/\/$/, ''));
  }
  return out;
}

/** The path inside an edition, and which edition: `/hi/about/` → { prefix: '/hi', rest: '/about/' }. */
function splitEdition(path, prefixes) {
  for (const prefix of prefixes) {
    if (prefix && (path === `${prefix}/` || path.startsWith(`${prefix}/`))) return { prefix, rest: path.slice(prefix.length) };
  }
  return { prefix: '', rest: path };
}

/** Indexable pages: HTML, not a redirect, not noindex, not the 404. */
export function indexablePages(site) {
  const out = new Map();
  for (const [path, html] of site.pages) {
    if (path === '/404.html' || path === '/404/') continue;
    const head = readHead(html);
    if (head.noindex || head.redirect) continue;
    out.set(path, head);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The checks. Each returns a list of messages, empty when the site passes.
// ---------------------------------------------------------------------------

export function checkCanonicals(site) {
  const problems = [];
  for (const [path, head] of indexablePages(site)) {
    if (head.canonicals.length !== 1) {
      problems.push(`${path}: ${head.canonicals.length} canonical links; an indexable page states exactly one.`);
      continue;
    }
    const want = ORIGIN + path;
    if (head.canonicals[0] !== want) problems.push(`${path}: canonical is ${head.canonicals[0]}, not the page's own address ${want}.`);
  }
  return problems;
}

export function checkHreflang(site) {
  const problems = [];
  const editions = editionsOf(site);
  if (editions.size === 0) return ['/: the home page names no editions in its hreflang links, so none can be checked.'];
  const prefixes = [...editions.values()];
  const langOf = new Map([...editions].map(([lang, prefix]) => [prefix, lang]));
  const indexable = indexablePages(site);
  for (const [path, head] of indexable) {
    const { rest } = splitEdition(path, prefixes);
    // Where this page exists as an indexable page.
    const expected = new Map();
    for (const [lang, prefix] of editions) {
      if (indexable.has(prefix + rest)) expected.set(lang, ORIGIN + prefix + rest);
    }
    const stated = new Map();
    for (const { lang, href } of head.alternates) {
      if (stated.has(lang)) problems.push(`${path}: hreflang="${lang}" appears twice.`);
      stated.set(lang, href);
    }
    for (const [lang, href] of expected) {
      if (!stated.has(lang)) problems.push(`${path}: no hreflang="${lang}", though ${new URL(href).pathname} is an indexable page in that edition.`);
      else if (stated.get(lang) !== href) problems.push(`${path}: hreflang="${lang}" points at ${stated.get(lang)}, not ${href}.`);
    }
    for (const [lang, href] of stated) {
      if (lang === 'x-default') continue;
      if (!expected.has(lang)) problems.push(`${path}: hreflang="${lang}" names ${href}, which is not an indexable page.`);
    }
    // x-default: English when English is in the set, else the page itself.
    const english = langOf.get('');
    const xWant = expected.has(english) ? expected.get(english) : ORIGIN + path;
    if (stated.size > 0 && stated.get('x-default') !== xWant) {
      problems.push(`${path}: x-default is ${stated.get('x-default') ?? 'missing'}, not ${xWant}.`);
    }
  }
  return problems;
}

/** `<loc>` and the `<xhtml:link>` pairs of each `<url>` in a sitemap. */
export function sitemapEntries(xmlText) {
  return [...xmlText.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: decodeEntities(/<loc>([^<]*)<\/loc>/.exec(m[1])?.[1] ?? ''),
    links: [...m[1].matchAll(/<xhtml:link\b[^>]*>/g)].map((l) => {
      const a = attributes(l[0]);
      return { lang: a.hreflang, href: a.href };
    }),
  }));
}

export function checkSitemap(site) {
  const problems = [];
  const index = site.xml.get('/sitemap-index.xml');
  if (!index) return ['/sitemap-index.xml: missing.'];
  const parts = [...index.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(decodeEntities(m[1])).pathname);
  const listed = new Map();
  for (const part of parts) {
    const text = site.xml.get(part);
    if (!text) { problems.push(`/sitemap-index.xml: lists ${part}, which dist does not have.`); continue; }
    for (const entry of sitemapEntries(text)) {
      if (!entry.loc.startsWith(`${ORIGIN}/`)) { problems.push(`${part}: ${entry.loc} is not an address on ${ORIGIN}.`); continue; }
      const path = new URL(entry.loc).pathname;
      if (listed.has(path)) problems.push(`${part}: ${path} is listed twice.`);
      listed.set(path, entry);
    }
  }
  const indexable = indexablePages(site);
  for (const [path, entry] of listed) {
    if (!site.pages.has(path)) { problems.push(`sitemap: ${path} is listed, but dist has no page there.`); continue; }
    const head = indexable.get(path);
    if (!head) { problems.push(`sitemap: ${path} is listed, but the page is noindex or a redirect.`); continue; }
    // The sitemap's pairs and the page head's pairs are the same set.
    const fromHead = head.alternates.map((a) => `${a.lang} ${a.href}`).sort();
    const fromMap = entry.links.map((a) => `${a.lang} ${a.href}`).sort();
    const headPairs = fromHead.filter((p) => !p.startsWith('x-default ')).length;
    // A page alone in its language states itself and x-default in its head;
    // the sitemap gives such an address no pairs at all.
    const alone = headPairs <= 1 && fromMap.length === 0;
    if (!alone && fromHead.join('\n') !== fromMap.join('\n')) {
      problems.push(`sitemap: ${path} is paired with [${fromMap.join(', ')}], its page head with [${fromHead.join(', ')}].`);
    }
  }
  for (const path of indexable.keys()) {
    if (!listed.has(path)) problems.push(`sitemap: ${path} is an indexable page, but the sitemap leaves it out.`);
  }
  return problems;
}

const SKIP_SCHEME = /^(?:mailto|tel|sms|javascript|data|blob|about):/i;

/** Every internal address a page or feed points at, as [address, where] pairs. */
export function internalRefs(site) {
  const refs = [];
  const add = (raw, base, where) => {
    if (!raw || raw.startsWith('#') || SKIP_SCHEME.test(raw.trim())) return;
    let url;
    try { url = new URL(raw.trim(), ORIGIN + base); } catch { refs.push([raw, where, 'unparseable']); return; }
    if (url.origin !== ORIGIN) return;
    refs.push([url.pathname, where]);
  };
  for (const [path, html] of site.pages) {
    for (const t of tags(stripRaw(html), 'a', 'link', 'img', 'script', 'source', 'iframe', 'video', 'audio', 'form')) {
      for (const name of ['href', 'src', 'action']) {
        if (name in t.attrs) add(t.attrs[name], path, `${path} <${t.name} ${name}>`);
      }
      if (t.attrs.srcset) for (const part of t.attrs.srcset.split(',')) add(part.trim().split(/\s+/)[0], path, `${path} <${t.name} srcset>`);
    }
  }
  for (const [path, text] of site.xml) {
    if (path.startsWith('/sitemap')) continue;
    for (const m of text.matchAll(/<link>([^<]*)<\/link>/g)) add(decodeEntities(m[1]), path, `${path} <link>`);
    for (const m of text.matchAll(/<(?:atom:link|enclosure)\b[^>]*>/g)) {
      const a = attributes(m[0]);
      add(a.href ?? a.url, path, `${path} <${/^<([\w:]+)/.exec(m[0])[1]}>`);
    }
  }
  return refs;
}

export function checkInternalLinks(site) {
  const problems = [];
  const seen = new Set();
  for (const [target, where, note] of internalRefs(site)) {
    const key = `${target}\n${where}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (note === 'unparseable') problems.push(`${where}: "${target}" is not an address.`);
    else if (!resolves(site, target)) problems.push(`${where}: ${target} is not in dist.`);
  }
  return problems;
}

/** The text nodes a reader sees: no scripts, styles, code samples or tags. */
export function textNodes(html) {
  const body = html.split(/<body\b[^>]*>/i).slice(1).join(' ') || html;
  return body
    .replace(/<!--[\s\S]*?-->/g, '<>')
    .replace(/<(script|style|template|pre|code|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '<>')
    .split(/<[^>]*>/)
    .map((t) => decodeEntities(t).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * What a template that lost its value leaves on the page: a `{name}` the
 * catalog meant to fill, `[object Object]`, or `undefined` where a value
 * belonged. "undefined" is also an English word ("the recast is undefined"),
 * so it counts only on its own (the whole text of an element or attribute) or
 * glued to a number, a currency sign, a percent sign or `=`/`:`.
 */
export function leftovers(text) {
  const out = [];
  for (const m of text.matchAll(/\{[a-zA-Z_][\w.]*\}|\[object Object\]/g)) out.push(m[0]);
  const t = text.trim();
  if (/^undefined$/.test(t) || /[\d%$€£₹¥:=]\s?undefined|undefined\s?[\d%$€£₹¥]/.test(t)) out.push('undefined');
  return out;
}

/** Attributes a reader is given as words: tooltips, labels, alternative text. */
const READ_ATTRIBUTES = ['alt', 'title', 'aria-label', 'aria-description', 'placeholder'];

export function checkLeftovers(site) {
  const problems = [];
  for (const [path, html] of site.pages) {
    const found = new Set();
    for (const node of textNodes(html)) for (const l of leftovers(node)) found.add(`text "${l}" (in "${node.slice(0, 60)}")`);
    const stripped = stripRaw(html);
    for (const t of tags(stripped, '[a-zA-Z][\\w-]*')) {
      for (const name of READ_ATTRIBUTES) {
        for (const l of leftovers(t.attrs[name] ?? '')) found.add(`${name}="…${l}…"`);
      }
      const meta = t.attrs.name ?? t.attrs.property ?? '';
      if (t.name === 'meta' && /^(description|og:|twitter:)/.test(meta)) {
        for (const l of leftovers(t.attrs.content ?? '')) found.add(`meta ${meta} "${l}"`);
      }
    }
    const title = /<title>([\s\S]*?)<\/title>/i.exec(stripped)?.[1] ?? '';
    for (const l of leftovers(decodeEntities(title))) found.add(`<title> "${l}"`);
    for (const f of found) problems.push(`${path}: ${f} is left on the page.`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// XML well-formedness
// ---------------------------------------------------------------------------

const NAME = /^[A-Za-z_:][\w.:-]*$/;
const PREDEFINED = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);

function checkText(text, at) {
  if (/</.test(text)) return `a bare "<" at ${at}`;
  for (const m of text.matchAll(/&([^;\s&]*);?/g)) {
    const ref = m[0];
    if (!ref.endsWith(';')) return `a bare "&" at ${at + m.index}`;
    const name = m[1];
    if (/^#x[0-9a-fA-F]+$/.test(name) || /^#\d+$/.test(name) || PREDEFINED.has(name)) continue;
    return `the entity "${ref}" XML does not define, at ${at + m.index}`;
  }
  return null;
}

/**
 * Whether a document is well-formed XML: one root element, every element
 * closed in order, attributes quoted and not repeated, only XML's own
 * entities. Returns the first problem, or null. Not a validating parser: it
 * does not read a DTD (the site's feeds have none) or check namespaces.
 */
export function xmlProblem(text) {
  let i = 0;
  const stack = [];
  let roots = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1;
  if (text.startsWith('<?xml', i)) {
    const end = text.indexOf('?>', i);
    if (end < 0) return 'the XML declaration is not closed';
    i = end + 2;
  }
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    const chunk = text.slice(i, lt < 0 ? text.length : lt);
    if (stack.length === 0 && chunk.trim()) return `text outside the root element at ${i}`;
    const bad = checkText(chunk, i);
    if (bad) return bad;
    if (lt < 0) break;
    i = lt;
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      if (end < 0) return `a comment at ${i} is not closed`;
      i = end + 3;
    } else if (text.startsWith('<![CDATA[', i)) {
      if (stack.length === 0) return `CDATA outside the root element at ${i}`;
      const end = text.indexOf(']]>', i);
      if (end < 0) return `CDATA at ${i} is not closed`;
      i = end + 3;
    } else if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i);
      if (end < 0) return `a processing instruction at ${i} is not closed`;
      i = end + 2;
    } else if (text.startsWith('<!DOCTYPE', i)) {
      if (roots > 0 || stack.length) return `a DOCTYPE after the root element at ${i}`;
      const end = text.indexOf('>', i);
      if (end < 0) return `the DOCTYPE at ${i} is not closed`;
      i = end + 1;
    } else if (text.startsWith('</', i)) {
      const end = text.indexOf('>', i);
      if (end < 0) return `a closing tag at ${i} is not closed`;
      const name = text.slice(i + 2, end).trim();
      const open = stack.pop();
      if (open !== name) return `</${name}> at ${i} closes <${open ?? 'nothing'}>`;
      i = end + 1;
    } else {
      // An opening tag. Quoted values may hold ">".
      let j = i + 1;
      let quote = null;
      for (; j < text.length; j++) {
        const c = text[j];
        if (quote) { if (c === quote) quote = null; } else if (c === '"' || c === "'") quote = c;
        else if (c === '>') break;
      }
      if (j >= text.length) return `a tag at ${i} is not closed`;
      const inner = text.slice(i + 1, j);
      const selfClosing = inner.endsWith('/');
      const body = selfClosing ? inner.slice(0, -1) : inner;
      const name = /^[^\s/>]+/.exec(body)?.[0] ?? '';
      if (!NAME.test(name)) return `"<${name}" at ${i} is not an element name`;
      let rest = body.slice(name.length);
      const seen = new Set();
      while (rest.trim()) {
        const m = /^\s+([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/.exec(rest);
        if (!m) return `<${name}> at ${i} has an attribute that is not name="value"`;
        if (!NAME.test(m[1])) return `<${name}> at ${i} has an attribute named "${m[1]}"`;
        if (seen.has(m[1])) return `<${name}> at ${i} repeats the attribute ${m[1]}`;
        seen.add(m[1]);
        const value = m[3] ?? m[4];
        const badValue = checkText(value, i);
        if (badValue) return `<${name} ${m[1]}>: ${badValue}`;
        rest = rest.slice(m[0].length);
      }
      if (stack.length === 0) {
        roots += 1;
        if (roots > 1) return `a second root element <${name}> at ${i}`;
      }
      if (!selfClosing) stack.push(name);
      i = j + 1;
    }
  }
  if (stack.length) return `<${stack[stack.length - 1]}> is never closed`;
  if (roots === 0) return 'no root element';
  return null;
}

export function checkXml(site) {
  const problems = [];
  for (const [path, text] of site.xml) {
    const problem = xmlProblem(text);
    if (problem) problems.push(`${path}: not well-formed XML: ${problem}.`);
  }
  for (const feed of ['/rss.xml']) {
    if (!site.xml.has(feed)) problems.push(`${feed}: missing.`);
  }
  return problems;
}

/** Every check, by name. */
export const CHECKS = {
  canonical: checkCanonicals,
  hreflang: checkHreflang,
  sitemap: checkSitemap,
  links: checkInternalLinks,
  leftovers: checkLeftovers,
  xml: checkXml,
};
