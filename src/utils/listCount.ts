/**
 * The size of one of the site's sign-up lists (the planner waitlist, the
 * newsletter), for a line like "20+ people have joined my waitlist.".
 *
 * Read once per build, never in a visitor's browser: the build posts a secret
 * token to the list's Apps Script `count` action, which answers with one whole
 * number and nothing else. The token is not a PUBLIC_ variable, so it stays in
 * the build and out of every page.
 *
 * It switches itself on: with no token, no endpoint, a failed request or an
 * answer that is not a whole number, the count is unknown and the line does
 * not appear. Below the threshold it does not appear either, and above it the
 * number is rounded down, so the page never claims more people than there are.
 */

/** No line until this many people have joined. */
export const LIST_COUNT_THRESHOLD = 20;
/** The shown number is rounded down to a multiple of this. */
export const LIST_COUNT_STEP = 20;

/** The number the page may show, or null for no line. */
export function shownListCount(count: number | null): number | null {
  if (count === null || count < LIST_COUNT_THRESHOLD) return null;
  return Math.floor(count / LIST_COUNT_STEP) * LIST_COUNT_STEP;
}

/** The script's answer, if it is one: `{ ok: true, count: <whole number ≥ 0> }`. */
export function parseCountAnswer(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const { ok, count } = body as { ok?: unknown; count?: unknown };
  return ok === true && typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : null;
}

/**
 * A token, never through import.meta.env: Vite writes import.meta.env values
 * into the compiled code, and a secret has no business in any file. A build
 * reads it from its environment (deploy.yml); the dev server also reads the
 * local, gitignored .env, which Vite does not put in process.env on its own.
 */
async function token(name: string): Promise<string | undefined> {
  if (process.env[name]) return process.env[name];
  if (!import.meta.env.DEV) return undefined;
  const { loadEnv } = await import('vite');
  return loadEnv('development', process.cwd(), '')[name] || undefined;
}

/** Ask a list's script for its size; null when anything is missing or fails. */
export async function askListCount(endpoint: string | undefined, tokenName: string, label: string): Promise<number | null> {
  try {
    const secret = await token(tokenName);
    if (!endpoint || !secret) return null;
    const res = await fetch(endpoint, {
      method: 'POST',
      body: new URLSearchParams({ action: 'count', token: secret }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? parseCountAnswer(await res.json()) : null;
  } catch {
    // Whatever failed (reading the token, the request, the answer), the build
    // goes on without the line. Nothing about the request is logged: the token
    // is in its body.
    console.warn(`[${label} count] unavailable this build; the line is left out.`);
    return null;
  }
}
