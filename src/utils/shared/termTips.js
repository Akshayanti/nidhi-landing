/**
 * Glossary term tips in a lesson body (BlogPost.astro inlines this file, as a
 * classic script). Each tip's ids are opaque (`term-tip-<n>`), never built
 * from the term, so a click on one puts no lesson content into analytics.
 * Tested in termTips.test.ts.
 */
// Glossary terms in the lesson body. The markdown links a term's first use
// to its card entry ([term](#term-...)); here each such link becomes the term
// itself, marked with a small question mark, with its definition (read from
// the glossary card) shown on hover or keyboard focus through CSS and on tap
// or click. A second tap, a tap elsewhere or Escape closes it. Each bubble is
// nudged to stay inside the screen, and flips above the term when there is
// no room below. Without this script the link still opens the card.
(function() {
  var body = document.getElementById('post-content');
  if (!body) return;
  var defs = {};
  document.querySelectorAll('[data-glossary-card] .post-glossary-item').forEach(function(item) {
    var dt = item.querySelector('dt'), dd = item.querySelector('dd');
    if (item.id && dt && dd) defs[item.id] = { term: dt.textContent, definition: dd.textContent };
  });
  body.querySelectorAll('a[href^="#term-"]').forEach(function(link, i) {
    var id = link.getAttribute('href').slice(1);
    var entry = defs[id];
    if (!entry) return;
    var tip = document.createElement('span');
    tip.className = 'term-tip';
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'term-tip-trigger';
    // Opaque ids: an id built from the term would put the term clicked into
    // autocaptured click events (privacy notice: clicks carry no content).
    var defId = 'term-tip-' + (i + 1);
    trigger.setAttribute('aria-describedby', defId);
    while (link.firstChild) trigger.appendChild(link.firstChild);
    var bubble = document.createElement('span');
    bubble.className = 'term-tip-bubble';
    bubble.setAttribute('role', 'tooltip');
    // The button already names the term, so screen readers get only the
    // definition as its description; the bold heading is for sighted readers.
    var strong = document.createElement('strong');
    strong.setAttribute('aria-hidden', 'true');
    strong.textContent = entry.term + ' ';
    var def = document.createElement('span');
    def.id = defId;
    def.textContent = entry.definition;
    bubble.appendChild(strong);
    bubble.appendChild(def);
    tip.appendChild(trigger);
    tip.appendChild(bubble);
    link.replaceWith(tip);
  });
  var open = null;
  function place(tip) {
    var bubble = tip && tip.querySelector('.term-tip-bubble');
    if (!bubble) return;
    bubble.style.setProperty('--tip-shift', '0px');
    tip.removeAttribute('data-above');
    var hidden = getComputedStyle(bubble).display === 'none';
    if (hidden) { bubble.style.visibility = 'hidden'; bubble.style.display = 'block'; }
    var r = bubble.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = window.innerHeight, edge = 12;
    var shift = 0;
    if (r.right > vw - edge) shift = vw - edge - r.right;
    if (r.left + shift < edge) shift = edge - r.left;
    bubble.style.setProperty('--tip-shift', shift + 'px');
    var termTop = tip.getBoundingClientRect().top;
    if (r.bottom > vh - edge && termTop - r.height - 16 > edge) tip.setAttribute('data-above', '');
    if (hidden) { bubble.style.visibility = ''; bubble.style.display = ''; }
  }
  function close() {
    if (!open) return;
    open.removeAttribute('data-open');
    open = null;
  }
  document.addEventListener('click', function(e) {
    var trigger = e.target.closest && e.target.closest('.term-tip-trigger');
    if (trigger) {
      var tip = trigger.parentElement;
      if (open === tip) { close(); return; }
      close();
      tip.removeAttribute('data-dismissed');
      place(tip);
      tip.setAttribute('data-open', '');
      open = tip;
      return;
    }
    if (open && !(e.target.closest && e.target.closest('.term-tip-bubble'))) close();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('.term-tip');
    document.querySelectorAll('.term-tip:hover').forEach(function(tip) { tip.setAttribute('data-dismissed', ''); });
    if (focused) focused.setAttribute('data-dismissed', '');
    if (open) {
      var trigger = open.querySelector('.term-tip-trigger');
      close();
      if (trigger) trigger.focus();
    }
  });
  document.addEventListener('mouseover', function(e) {
    var tip = e.target.closest && e.target.closest('.term-tip');
    if (tip && !tip.hasAttribute('data-open')) place(tip);
  });
  document.addEventListener('mouseout', function(e) {
    var tip = e.target.closest && e.target.closest('.term-tip');
    if (tip && !tip.contains(e.relatedTarget)) tip.removeAttribute('data-dismissed');
  });
  document.addEventListener('focusin', function(e) {
    var trigger = e.target.closest && e.target.closest('.term-tip-trigger');
    if (trigger) place(trigger.parentElement);
  });
  document.addEventListener('focusout', function(e) {
    var tip = e.target.closest && e.target.closest('.term-tip');
    if (tip && !tip.contains(e.relatedTarget)) tip.removeAttribute('data-dismissed');
  });
})();
