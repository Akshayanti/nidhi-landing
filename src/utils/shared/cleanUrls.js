/**
 * No analytics event carries what a free tool was given: the address backstop.
 *
 * Every PostHog event carries addresses: the current page, the referrer, the
 * session's first page, and the same again as person properties. The free
 * tools never write inputs into the address, and ToolStateGuard moves a shared
 * link's state out of it before analytics load. Should a tool address carry
 * state all the same, no event may send it: every property that points at a
 * /free/ page keeps only its utm_* parameters and loses its # part (CLAUDE.md,
 * "Free tools keep inputs out of URLs", rule 4).
 *
 * No page writes what is typed into the address either: /blog/ only reads ?q=
 * when a search engine sends someone there, then removes it. Should a /blog/
 * address still carry ?q= (an old bookmark, a hand-typed link), that parameter
 * is removed from any property pointing at it.
 *
 * A locale prefix sits in front of the page path in every edition but the
 * English one, so the /free/ and /blog tests read the path with a known prefix
 * removed. Only prefixes from the locale registry are stripped: a pattern like
 * /^\/[a-z]{2}\// would swallow a real two-letter page segment and start
 * rewriting an address that is not a tool.
 *
 * A classic script, not a module: Analytics.astro inlines this file before
 * PostHog starts, and the tests run the same file. It defines two globals:
 * `nidhiCleanUrl(value, localePrefixes)`, which returns the value to send, and
 * `nidhiCleanUrlProps(object, localePrefixes)`, which cleans every own
 * property of an object in place.
 */
(function (root) {
  function withoutLocale(pathname, localePrefixes) {
    for (var i = 0; i < localePrefixes.length; i++) {
      var prefix = localePrefixes[i];
      if (pathname === prefix || pathname.indexOf(prefix + '/') === 0) {
        return pathname.slice(prefix.length) || '/';
      }
    }
    return pathname;
  }

  function cleanUrl(value, localePrefixes) {
    if (typeof value !== 'string') return value;
    var isTool = value.indexOf('/free/') !== -1;
    var isBlog = value.indexOf('/blog') !== -1 && value.indexOf('q=') !== -1;
    if (!isTool && !isBlog) return value;
    var u;
    try { u = new URL(value, root.location.origin); } catch (e) { return value; }
    if (u.host !== root.location.host) return value;
    var path = withoutLocale(u.pathname, localePrefixes || []);
    if (path.indexOf('/free/') === 0) {
      var keep = new URLSearchParams();
      u.searchParams.forEach(function (v, k) { if (k.indexOf('utm_') === 0) keep.append(k, v); });
      u.search = keep.toString();
      u.hash = '';
    } else if (path.indexOf('/blog') === 0 && u.searchParams.has('q')) {
      u.searchParams.delete('q');
    } else {
      return value;
    }
    return /^https?:/i.test(value) ? u.toString() : u.pathname + u.search;
  }

  root.nidhiCleanUrl = cleanUrl;
  root.nidhiCleanUrlProps = function (obj, localePrefixes) {
    if (!obj) return;
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = cleanUrl(obj[key], localePrefixes);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
