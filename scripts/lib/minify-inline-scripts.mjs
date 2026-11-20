/**
 * Minifies the inline scripts of a built page (#450).
 *
 * An `is:inline` script is copied into every document as it is written in the
 * source: comments, indentation and all. Those scripts were close to half of
 * all the HTML the site shipped. Astro minifies the scripts it bundles and
 * leaves these alone, so the build does it here, once every page is written
 * (astro.config.mjs, `minifiedInlineScripts`).
 *
 * Only classic inline scripts are touched: no `src`, and no `type` other than
 * JavaScript's own. JSON-LD and JSON data blocks are data, and a module script
 * Astro inlined is already minified. Top-level names are kept, because in a
 * classic script they are globals other scripts on the page call
 * (`nidhiConsent`, `nidhiCleanUrlProps` and so on).
 *
 * Kept free of Astro and of the minifier itself (it is passed in), so the
 * unit test runs the same code the build does.
 */

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const CLASSIC_TYPE = /^(?:text\/javascript|application\/javascript)$/i;

/** Whether a script tag's attributes describe a classic inline script. */
export function isClassicInline(attributes) {
  if (/(?:^|\s)src\s*=/i.test(attributes)) return false;
  const type = /(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);
  if (!type) return true;
  return CLASSIC_TYPE.test((type[1] ?? type[2] ?? type[3] ?? '').trim());
}

/**
 * Returns the page with each classic inline script minified.
 *
 * `minify(code)` returns the minified code and throws on code it cannot read:
 * a script that does not parse is a broken page, and the build should say so
 * rather than ship it. `cache` (a Map) is shared across pages, since the same
 * few scripts are on every one of them.
 */
export function minifyInlineScripts(html, minify, cache = new Map()) {
  return html.replace(SCRIPT, (whole, attributes, code) => {
    if (!isClassicInline(attributes) || !code.trim()) return whole;
    let small = cache.get(code);
    if (small === undefined) {
      small = minify(code);
      // A minifier that left a closing tag inside the script would end it
      // early. Keep the source, which the browser already read correctly.
      if (/<\/script/i.test(small) || /<!--/.test(small) !== /<!--/.test(code)) small = code;
      cache.set(code, small);
    }
    return `<script${attributes}>${small}</script>`;
  });
}
