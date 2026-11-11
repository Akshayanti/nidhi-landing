/**
 * JSON that is safe to write inside a `<script>` element.
 *
 * `JSON.stringify` leaves `<` as it is, so a string holding `</script>` (a
 * lesson title, say) would end the element early and the rest would be read
 * as markup. Written as `<` it means the same to a JSON parser and
 * cannot end anything. The two line separators JSON allows but older script
 * parsers do not are escaped the same way.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
