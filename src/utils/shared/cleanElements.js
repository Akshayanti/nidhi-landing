/**
 * Click events keep only what the site wrote: rebuilt, never edited.
 *
 * PostHog's autocapture, rage clicks and dead clicks describe the element that
 * was clicked and each of its ancestors up to <body>, with every attribute on
 * each one. Text is masked (`mask_all_text`), but attributes are not, and
 * attributes can hold what a reader typed or what a tool worked out: a remove
 * button's label names the loan offer, a chart's label lists its amounts. The
 * privacy notice promises that those values are never sent.
 *
 * So every element description is rebuilt from a closed vocabulary before an
 * event leaves the page: a tag name from a fixed list, the `data-attr` label
 * if the site's label registry knows it, and the element's position among its
 * siblings as a small number. Nothing else survives: no classes, ids, links,
 * text, accessibility labels, titles or styles. A new attribute added anywhere
 * on the site, or by a future version of the SDK, is dropped by default.
 *
 * PostHog sends the description as a string (`$elements_chain`, the project's
 * setting), and that string cannot be split back into attributes with
 * certainty: it escapes quotes but not backslashes. That is why the output is
 * built from the closed vocabulary rather than cut out of the input: a value
 * that throws the reading off can at worst place a known label wrongly, never
 * pass on what was typed. If the string cannot be read at all, the event keeps
 * no element description.
 *
 * A classic script, not a module: Analytics.astro inlines this file before
 * PostHog starts, and the tests run the same file. It defines one global,
 * `nidhiCleanElements(properties, labels)`, which edits the properties in
 * place.
 */
(function (root) {
  // Tags a click on this site can land on or pass through, HTML and SVG.
  var TAGS = {};
  ('a abbr article aside b blockquote body button caption circle code dd details dialog div dl dt ' +
    'em fieldset figcaption figure footer form g h1 h2 h3 h4 h5 h6 header hr html i img input ins kbd ' +
    'label legend li line main mark nav ol optgroup option output p path picture polygon polyline pre ' +
    'rect s section select small source span strong sub summary sup svg table tbody td text textarea ' +
    'tfoot th thead time tr tspan u ul video').split(' ').forEach(function (t) { TAGS[t] = true; });

  var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var MAX_LABEL = 80;
  var MAX_POSITION = 999;

  function knownLabel(value, labels) {
    if (typeof value !== 'string' || value.length > MAX_LABEL || !SLUG.test(value)) return null;
    if (labels.exact.indexOf(value) !== -1) return value;
    for (var i = 0; i < labels.prefixes.length; i++) {
      var prefix = labels.prefixes[i];
      if (value.length > prefix.length && value.indexOf(prefix) === 0) return value;
    }
    return null;
  }

  function position(value) {
    var n = typeof value === 'number' ? value : /^[0-9]{1,3}$/.test(String(value)) ? Number(value) : NaN;
    return n >= 1 && n <= MAX_POSITION && Math.floor(n) === n ? n : null;
  }

  function tag(value) {
    var t = typeof value === 'string' ? value.toLowerCase() : '';
    return TAGS[t] ? t : null;
  }

  // One clean element, from whatever was read; null when nothing is known.
  function rebuild(tagName, label, nthChild, nthOfType, labels) {
    var t = tag(tagName);
    if (!t) return null;
    return {
      tag_name: t,
      label: knownLabel(label, labels),
      nth_child: position(nthChild),
      nth_of_type: position(nthOfType),
    };
  }

  // PostHog's own string form: keys in alphabetical order, as it writes them.
  function serialise(elements) {
    return elements
      .map(function (e) {
        var s = e.tag_name + ':';
        if (e.label) s += 'attr__data-attr="' + e.label + '"';
        if (e.nth_child) s += 'nth-child="' + e.nth_child + '"';
        if (e.nth_of_type) s += 'nth-of-type="' + e.nth_of_type + '"';
        return s;
      })
      .join(';');
  }

  /**
   * Read `tag.class.class:key="value"key="value";...` strictly. Returns the
   * elements read, or null when the string does not follow that shape.
   */
  function readChain(chain) {
    var out = [];
    var i = 0;
    var n = chain.length;
    while (i < n) {
      var tagStart = i;
      while (i < n && /[A-Za-z0-9-]/.test(chain[i])) i++;
      var tagName = chain.slice(tagStart, i);
      // Classes: skipped, never kept.
      while (i < n && chain[i] === '.') {
        i++;
        while (i < n && chain[i] !== '.' && chain[i] !== ':' && chain[i] !== ';') i++;
      }
      if (chain[i] !== ':') return null;
      i++;
      var attrs = {};
      while (i < n && chain[i] !== ';') {
        var keyStart = i;
        while (i < n && chain[i] !== '=' && chain[i] !== '"' && chain[i] !== ';') i++;
        if (chain[i] !== '=' || chain[i + 1] !== '"') return null;
        var key = chain.slice(keyStart, i);
        i += 2;
        var value = '';
        while (i < n && chain[i] !== '"') {
          if (chain[i] === '\\' && chain[i + 1] === '"') { value += '"'; i += 2; } else { value += chain[i]; i++; }
        }
        if (chain[i] !== '"') return null;
        i++;
        attrs[key] = value;
      }
      out.push({ tagName: tagName, attrs: attrs });
      if (chain[i] === ';') i++;
    }
    return out;
  }

  function cleanChain(chain, labels) {
    if (typeof chain !== 'string' || chain === '') return '';
    var read = readChain(chain);
    if (!read) return '';
    var clean = [];
    for (var k = 0; k < read.length; k++) {
      var a = read[k].attrs;
      var e = rebuild(read[k].tagName, a['attr__data-attr'], a['nth-child'], a['nth-of-type'], labels);
      if (e) clean.push(e);
    }
    return serialise(clean);
  }

  function cleanList(list, labels) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var k = 0; k < list.length; k++) {
      var el = list[k] || {};
      var e = rebuild(el.tag_name, el['attr__data-attr'], el.nth_child, el.nth_of_type, labels);
      if (!e) continue;
      var kept = { tag_name: e.tag_name };
      if (e.label) kept['attr__data-attr'] = e.label;
      if (e.nth_child) kept.nth_child = e.nth_child;
      if (e.nth_of_type) kept.nth_of_type = e.nth_of_type;
      out.push(kept);
    }
    return out;
  }

  // Properties that describe a clicked element other than through the chain.
  var DROP = ['$el_text', '$external_click_url', '$element_selectors', '$selected_content'];

  root.nidhiCleanElements = function (props, labels) {
    if (!props || typeof props !== 'object') return;
    var hasChain = Object.prototype.hasOwnProperty.call(props, '$elements_chain');
    var hasList = Object.prototype.hasOwnProperty.call(props, '$elements');
    if (!hasChain && !hasList) return;
    if (hasChain) props.$elements_chain = cleanChain(props.$elements_chain, labels);
    if (hasList) props.$elements = cleanList(props.$elements, labels);
    for (var d = 0; d < DROP.length; d++) delete props[DROP[d]];
  };
})(typeof window !== 'undefined' ? window : globalThis);
