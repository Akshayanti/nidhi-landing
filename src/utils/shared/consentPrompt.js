/**
 * The cookie prompt (CookieConsent.astro inlines this file after
 * consentRuntime.js, as a classic script). Tested in consentPrompt.test.ts.
 *
 * Since Nov 21 2026 it is a sheet at the bottom of the screen that leaves the
 * page alone (#399, the owner's decision and the council's design): no dark
 * overlay, nothing made inert, no focus trap, and the page scrolls and reads
 * as usual while it is open. Until an answer, pageviews are counted as always
 * and click recording stays off (Analytics.astro); only "Sure" turns it on.
 *
 * - It opens when no answer is saved, without moving focus: a reader who has
 *   just arrived keeps their place. Keyboard and screen-reader readers find it
 *   by the "Cookie choices" link right after "Skip to content" (shown only
 *   while the sheet is open, it moves focus to "No thanks"), by its landmark
 *   and by its heading.
 * - Its height is capped by CSS and by the room below the header, measured
 *   here (--cookie-room), so it never covers the header. While it is open the
 *   page keeps room for it at the bottom (--cookie-space), so the page's end
 *   scrolls into view above it and a focused element is not hidden behind it.
 * - "Cookie settings" in the footer reopens it and moves focus to "No thanks".
 * - An answer is saved through window.nidhiConsent and applied to the running
 *   analytics at once; the sheet and its link go away. Focus that was inside
 *   the sheet goes back to where it came from; focus elsewhere is left alone.
 */
(function() {
  var sheet = document.getElementById('cookie-sheet');
  var skip = document.getElementById('cookie-skip');
  var acceptBtn = document.getElementById('cookie-accept');
  var declineBtn = document.getElementById('cookie-decline');
  var root = document.documentElement;
  // The element to give focus back to: the "Cookie settings" button that
  // reopened the sheet, or else the last element focused outside the sheet.
  var opener = null;
  var lastOutside = null;
  var resizeObserver = null;
  var frame = 0;

  document.addEventListener('focusin', function(e) {
    var t = e.target;
    if (t && t !== skip && !sheet.contains(t)) lastOutside = t;
  });

  // Measures the room below the header and the room the sheet takes. Both
  // are written as custom properties on <html>, which the sheet's CSS reads.
  function layout() {
    frame = 0;
    if (sheet.hidden) return;
    var view = window.innerHeight;
    var header = document.querySelector('.site-header');
    var below = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    root.style.setProperty('--cookie-room', Math.max(0, Math.floor(view - below - 8)) + 'px');
    // From the sheet's top edge to the bottom of the screen, plus a gap: on
    // wide screens that includes the space under the card.
    var top = sheet.getBoundingClientRect().top;
    root.style.setProperty('--cookie-space', Math.max(0, Math.ceil(view - top + 8)) + 'px');
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(layout);
  }

  function watch(on) {
    var method = on ? 'addEventListener' : 'removeEventListener';
    window[method]('resize', schedule);
    // The header scrolls away on a short screen (a phone held sideways), and
    // the sheet may then grow into the room it leaves.
    window[method]('scroll', schedule, { passive: true });
    if (on && typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(schedule);
      resizeObserver.observe(sheet);
    } else if (!on && resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  // `byReader`: the reader asked for the sheet; `from`: the control they used.
  function openConsent(byReader, from) {
    var wasOpen = !sheet.hidden;
    if (!wasOpen) {
      sheet.hidden = false;
      skip.hidden = false;
      root.classList.add('cookie-open');
      sheet.scrollTop = 0;
      layout();
      watch(true);
    }
    // The reader asked for it (the footer button, or the "Cookie choices"
    // link): focus goes to the less-destructive button, which the sheet
    // scrolls to if it has to. On a first visit focus stays where it is.
    if (byReader) {
      if (from && from !== skip) opener = from;
      declineBtn.focus();
    }
  }

  function usable(el) {
    return el && el.isConnected !== false && !el.hidden && typeof el.focus === 'function' && !sheet.contains(el) && el !== skip;
  }

  function closeConsent(choice) {
    window.nidhiConsent.save(choice);
    var focusInside = sheet.contains(document.activeElement) || document.activeElement === skip;
    // Close first, so the sheet can never get stuck open.
    sheet.hidden = true;
    skip.hidden = true;
    root.classList.remove('cookie-open');
    root.style.removeProperty('--cookie-space');
    root.style.removeProperty('--cookie-room');
    watch(false);
    // Apply the choice to the running SDK straight away, both ways
    // (Analytics.astro): a "No thanks" after an earlier "Sure" switches click
    // recording off and stops storing the visitor ID for the rest of this
    // visit too.
    window.nidhiConsent.apply();
    if (focusInside) {
      var back = usable(opener) ? opener : usable(lastOutside) ? lastOutside : document.getElementById('main-content');
      if (back && back.id === 'main-content' && !back.hasAttribute('tabindex')) back.setAttribute('tabindex', '-1');
      if (back) { try { back.focus({ preventScroll: true }); } catch (_) {} }
    }
    opener = null;
  }

  acceptBtn.addEventListener('click', function() { closeConsent('accepted'); });
  declineBtn.addEventListener('click', function() { closeConsent('declined'); });
  skip.addEventListener('click', function(e) {
    e.preventDefault();
    openConsent(true, skip);
  });

  // "Cookie settings" in the footer reopens the sheet, so a choice can be
  // changed as easily as it was made.
  document.addEventListener('click', function(e) {
    var trigger = e.target && e.target.closest && e.target.closest('[data-cookie-settings]');
    if (!trigger) return;
    e.preventDefault();
    openConsent(true, trigger);
  });

  var consent = window.nidhiConsent.read();
  if (consent === 'accepted' || consent === 'declined') return;
  openConsent(false);
})();
