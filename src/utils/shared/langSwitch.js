/**
 * The language switch: links rebuilt from the live address, tool state added
 * only as the browser leaves.
 *
 * The switch links were rendered with the path the page was built at. A
 * campaign tag is not in that path and has to survive a switch, so the hrefs
 * are rebuilt from the live address before anything else reads it. Nothing is
 * written to the address: this only reads it and rewrites the links. A target
 * locale the map does not know is left as it was rendered, so a stale map can
 * cost the query and the fragment but can never send anyone to the wrong path.
 *
 * A free tool keeps its current inputs, encoded, in a window property:
 * ToolStateGuard puts a shared link's state there before the tool mounts, and
 * the tool then keeps it in step with what is on screen
 * (src/utils/shared/toolState.ts). The state is put back after the # when a
 * switch link is clicked, which is what carries the inputs across: the encoded
 * state names no language, so the same string means the same plan on either
 * side. Only a tool page passes `toolStateGlobal`, and the path is preserved,
 * so the state always belongs to the tool the reader is about to land on.
 *
 * The state is never written into an href: PostHog autocapture records a
 * clicked link's href, so it is added only at click time, after autocapture
 * has read the clean link. A click that opens a new tab or window (Cmd, Ctrl,
 * Shift, or the middle button) gets the values too, through window.open; Alt,
 * which saves the link, keeps the clean href.
 *
 * A classic script, not a module: Header.astro inlines this file and the tests
 * run the same file. It defines one global,
 * `nidhiLangSwitch(prefixes, toolStateGlobal)`: the locale to path prefix map,
 * and the name of the window property holding the tool's state ('' elsewhere).
 */
(function (root) {
  root.nidhiLangSwitch = function (prefixes, toolStateGlobal) {
    var document = root.document;
    var location = root.location;
    var links = document.querySelectorAll('[data-lang-switch]');
    if (!links.length) return;

    // Move the path out of this page's locale prefix, the same way
    // src/i18n/url.ts does at build time. Only prefixes the site serves are
    // stripped: never a bare two letter segment, which a page path could be.
    var path = location.pathname;
    if (path.charAt(0) !== '/') path = '/' + path;
    for (var locale in prefixes) {
      var prefix = prefixes[locale];
      if (!prefix) continue;
      if (path === prefix || path === prefix + '/') { path = '/'; break; }
      if (path.indexOf(prefix + '/') === 0) { path = path.slice(prefix.length); break; }
    }

    var keep = new URLSearchParams();
    new URLSearchParams(location.search).forEach(function (value, key) {
      if (key.indexOf('utm_') === 0) keep.append(key, value);
    });
    var query = keep.toString();
    var suffix = (query ? '?' + query : '') + location.hash;

    for (var i = 0; i < links.length; i++) {
      var target = links[i].getAttribute('data-lang-switch');
      if (!Object.prototype.hasOwnProperty.call(prefixes, target)) continue;
      links[i].setAttribute('href', prefixes[target] + path + suffix);
    }

    if (!toolStateGlobal) return;
    function carry(e) {
      var state = root[toolStateGlobal];
      if (!state || e.defaultPrevented || e.altKey) return;
      var link = e.target instanceof root.Element ? e.target.closest('[data-lang-switch]') : null;
      if (!link) return;
      var url = link.getAttribute('href').split('#')[0] + '#' + state;
      var newTab = e.button === 1 || e.metaKey || e.ctrlKey || e.shiftKey;
      if (e.button !== 0 && e.button !== 1) return;
      e.preventDefault();
      if (newTab) root.open(url, '_blank', 'noopener');
      else location.assign(url);
    }
    document.addEventListener('click', carry);
    // The middle button fires auxclick, not click.
    document.addEventListener('auxclick', function (e) { if (e.button === 1) carry(e); });
  };
})(typeof window !== 'undefined' ? window : globalThis);
