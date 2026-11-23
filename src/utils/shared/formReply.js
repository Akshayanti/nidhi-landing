/*
 * What an Apps Script form endpoint answered, as one word.
 *
 * The waitlist form, the newsletter form, /confirm/ and /unsubscribe/ inline
 * this classic script (set:html, like tokenGuard.js) and hand it the promise
 * their own fetch returned. The scripts answer JSON, and Apps Script sends it
 * with Access-Control-Allow-Origin: *, so a normal (CORS) request can read
 * it. Only a readable { ok: true } counts as done: a page that is not JSON,
 * an HTTP error, a quota page, a network failure or a timeout is 'failed',
 * so a form never says "you're on the list" for a request the script did not
 * take (#342).
 *
 * window.nidhiFormReply(fetchPromise) resolves, never rejects, to one of:
 *   'ok'             the script did it
 *   'invalid_email'  the script refused the address
 *   'invalid_token'  the link's token is unknown or already used
 *   'busy'           the day's limit is reached; nothing was written
 *   'failed'         anything else: the outcome is not known
 *
 * A retry after 'failed' is safe: a second sign-up, confirmation or
 * unsubscribe for the same address or token changes nothing.
 */
(function () {
  var KNOWN = { invalid_email: true, invalid_token: true, busy: true };

  function fromBody(text) {
    var data;
    try { data = JSON.parse(text); } catch (_) { /* not JSON: data stays undefined, which is 'failed' below */ }
    if (data && data.ok === true) return 'ok';
    return data && KNOWN[data.error] === true ? data.error : 'failed';
  }

  function fromResponse(response) {
    // An opaque reply (a no-cors request) has ok false: unknown, not done.
    if (!response || response.ok !== true) return 'failed';
    // A reply with no readable body throws here, which the last handler below turns into 'failed'.
    return response.text().then(fromBody, function () { return 'failed'; });
  }

  window.nidhiFormReply = function (pending) {
    return Promise.resolve(pending).then(fromResponse, function () { return 'failed'; })
      .then(null, function () { return 'failed'; });
  };
})();
