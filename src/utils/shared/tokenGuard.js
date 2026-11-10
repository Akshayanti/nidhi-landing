/**
 * Takes a newsletter token out of the address before anything else runs.
 *
 * The confirm and unsubscribe pages are opened from an email with a token in
 * ?t=. Every analytics event carries the page address, and an unsubscribe
 * token never expires, so the token must be gone before analytics load.
 * This runs in the page's head, which comes before the analytics script at
 * the end of the body: it keeps the token in a window property for the page
 * to use, and removes the query from the address (and so from the
 * address bar, the history and a screenshot).
 *
 * A classic script, not a module: the two pages inline this file, and the
 * tests run the same file. It defines one global, `nidhiTakeToken()`, which
 * the inlined call runs at once; the page then reads `window.nidhiToken`.
 */
(function (root) {
  root.nidhiTakeToken = function () {
    var token = '';
    try {
      token = new URLSearchParams(root.location.search).get('t') || '';
    } catch (e) { /* no token */ }
    root.nidhiToken = token;
    if (token) {
      try {
        root.history.replaceState(null, '', root.location.pathname);
      } catch (e) { /* the analytics backstop (cleanUrls.js) still removes it */ }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
