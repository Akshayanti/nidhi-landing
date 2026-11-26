/**
 * When a tool's results can be shown, shared and saved (#789, #793).
 *
 * `invalid`: a box cannot be used. `current`: the result on screen was worked
 * out from the form as it stands. `held`: the results have been withheld
 * since an invalid form. Such a form's stand-in stays hidden until a result
 * of the corrected form is there; ordinary typing hides nothing, but Copy
 * and the exports wait for it.
 */
export function resultGate({ invalid, held, current }: { invalid: boolean; held: boolean; current: boolean }): {
  withheld: boolean;
  waiting: boolean;
} {
  return { withheld: invalid || (held && !current), waiting: invalid || !current };
}
