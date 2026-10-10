/**
 * Fills `{placeholders}` in a catalog string.
 *
 * Catalog values are plain strings, so the few that carry a value at render
 * time spell it out as `{name}`. A name with no value leaves the placeholder
 * visible rather than printing "undefined": a sentence that reads wrong is
 * easier to spot than one that reads plausibly.
 */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}
