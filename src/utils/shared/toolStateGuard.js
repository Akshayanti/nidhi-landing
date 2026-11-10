/**
 * Moves a free tool's shared state out of the address before anything reads it.
 *
 * A shared link carries the tool's state after the #, which browsers never
 * send to a server. ToolStateGuard.astro runs this in <head>, before analytics
 * load at the end of <body>: the state is copied into a window property for
 * the tool to read, then removed from the address bar, so the pageview and
 * every later event record an address with no inputs in it.
 *
 * Older links carried the state in the query string (?...); those parameters
 * are moved the same way. Campaign parameters (utm_*) and anything else that
 * is not a state key stay in the address, and a plain in-page anchor such as
 * #faq is left alone. When both parts carry state, the part after the # wins
 * and both are removed.
 *
 * A classic script, not a module: the page inlines this file and the tests run
 * the same file. It defines one global,
 * `nidhiGuardToolState(globalName, keyPattern)`: the window property to write,
 * and the source of a regular expression matching one state parameter name.
 */
(function (root) {
  root.nidhiGuardToolState = function (globalName, keyPattern) {
    var isKey = new RegExp('^(?:' + keyPattern + ')$');
    function split(raw) {
      var all = new URLSearchParams(raw);
      var state = new URLSearchParams();
      var rest = new URLSearchParams();
      var found = false;
      all.forEach(function (value, key) {
        if (isKey.test(key)) { state.append(key, value); found = true; }
        else rest.append(key, value);
      });
      return { found: found, state: state.toString(), rest: rest.toString() };
    }
    var location = root.location;
    var fromHash = split(location.hash.slice(1));
    var fromQuery = split(location.search.slice(1));
    if (!fromHash.found && !fromQuery.found) return;
    root[globalName] = fromHash.found ? fromHash.state : fromQuery.state;
    var query = fromQuery.found ? fromQuery.rest : location.search.slice(1);
    var hash = fromHash.found ? '' : location.hash;
    root.history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + hash);
  };
})(typeof window !== 'undefined' ? window : globalThis);
