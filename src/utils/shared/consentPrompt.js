/**
 * The cookie prompt (CookieConsent.astro inlines this file after
 * consentRuntime.js, as a classic script): it opens when no answer is saved,
 * keeps focus inside and the page behind it inert while open, saves the
 * answer through window.nidhiConsent and applies it to the running analytics
 * at once, and reopens from "Cookie settings". Tested in consentPrompt.test.ts.
 */
(function() {
  var overlay = document.getElementById('cookie-overlay');
  var acceptBtn = document.getElementById('cookie-accept');
  var declineBtn = document.getElementById('cookie-decline');
  var focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  var previousFocus = null;

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var focusable = overlay.querySelectorAll(focusableSelector);
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // While the prompt is open the page behind it is out of reach: it does
  // not scroll, and everything outside the prompt is inert, so a screen
  // reader or a swipe cannot wander into a page the prompt still covers
  // (#481). Nothing about the choice or what is stored changes.
  var madeInert = [];
  function setBehind(blocked) {
    var root = document.documentElement;
    if (blocked) {
      root.classList.add('consent-open');
      for (var node = overlay; node && node !== document.body; node = node.parentElement) {
        var siblings = node.parentElement ? node.parentElement.children : [];
        for (var i = 0; i < siblings.length; i++) {
          var el = siblings[i];
          if (el === node || el.inert || /^(SCRIPT|STYLE|LINK)$/.test(el.tagName)) continue;
          el.inert = true;
          madeInert.push(el);
        }
      }
    } else {
      root.classList.remove('consent-open');
      while (madeInert.length) madeInert.pop().inert = false;
    }
  }

  function openConsent() {
    previousFocus = document.activeElement;
    overlay.style.display = 'flex';
    setBehind(true);
    requestAnimationFrame(function() { overlay.classList.add('cookie-overlay--visible'); });
    document.addEventListener('keydown', trapFocus);
    // Focus the less-destructive button first, without scrolling: at large
    // text sizes the prompt scrolls inside, and it must open at its first line.
    declineBtn.focus({ preventScroll: true });
    var modal = overlay.querySelector('.cookie-modal');
    if (modal) modal.scrollTop = 0;
  }

  function closeConsent(choice) {
    window.nidhiConsent.save(choice);
    // Close first, so the prompt can never get stuck open.
    overlay.style.display = 'none';
    overlay.classList.remove('cookie-overlay--visible');
    setBehind(false);
    // Apply the choice to the running SDK straight away, both ways
    // (Analytics.astro): a "No thanks" after an earlier "Sure" switches click
    // recording off and stops storing the visitor ID for the rest of this
    // visit too.
    window.nidhiConsent.apply();
    document.removeEventListener('keydown', trapFocus);
    // Return focus to the element that was focused before the overlay opened
    if (previousFocus) { try { previousFocus.focus(); } catch (_) {} }
  }

  acceptBtn.addEventListener('click', function() { closeConsent('accepted'); });
  declineBtn.addEventListener('click', function() { closeConsent('declined'); });

  // "Cookie settings" in the footer reopens this prompt, so a choice can be
  // changed as easily as it was made.
  document.addEventListener('click', function(e) {
    var trigger = e.target && e.target.closest && e.target.closest('[data-cookie-settings]');
    if (!trigger) return;
    e.preventDefault();
    openConsent();
  });

  var consent = window.nidhiConsent.read();
  if (consent === 'accepted' || consent === 'declined') {
    overlay.style.display = 'none';
    return;
  }
  openConsent();
})();
