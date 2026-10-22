/**
 * The waitlist's size, for the line under the box's heading ("20+ people have
 * joined my waitlist.").
 *
 * Read once per build, never in a visitor's browser: the build posts the
 * WAITLIST_COUNT_TOKEN secret to the waitlist script's `count` action
 * (scripts/waitlist.gs), which answers with the number of distinct valid
 * addresses and nothing else. The token is not a PUBLIC_ variable, so it
 * stays in the build and out of every page.
 *
 * It switches itself on: with no token, no endpoint, a failed request or an
 * answer that is not a whole number, the count is unknown and the line does
 * not appear. Below the threshold it does not appear either, and above it the
 * number is rounded down, so the page never claims more people than there are.
 *
 * The dev server shows the exact count, ungated, so the founder can see it
 * locally (WaitlistSection.astro); only the published site holds to the rule.
 */

/** No line until this many people have joined. */
export const WAITLIST_COUNT_THRESHOLD = 20;
/** The shown number is rounded down to a multiple of this. */
export const WAITLIST_COUNT_STEP = 20;

/** The number the page may show, or null for no line. */
export function shownWaitlistCount(count: number | null): number | null {
  if (count === null || count < WAITLIST_COUNT_THRESHOLD) return null;
  return Math.floor(count / WAITLIST_COUNT_STEP) * WAITLIST_COUNT_STEP;
}

/** The script's answer, if it is one: `{ ok: true, count: <whole number ≥ 0> }`. */
export function parseCountAnswer(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const { ok, count } = body as { ok?: unknown; count?: unknown };
  return ok === true && typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : null;
}

let once: Promise<number | null> | undefined;

/** The waitlist's size, asked for once per build; null when unknown. */
export function waitlistCount(): Promise<number | null> {
  once ??= ask();
  return once;
}

/**
 * The token, never through import.meta.env: Vite writes import.meta.env values
 * into the compiled code, and a secret has no business in any file. A build
 * reads it from its environment (deploy.yml); the dev server also reads the
 * local, gitignored .env, which Vite does not put in process.env on its own.
 */
async function countToken(): Promise<string | undefined> {
  if (process.env.WAITLIST_COUNT_TOKEN) return process.env.WAITLIST_COUNT_TOKEN;
  if (!import.meta.env.DEV) return undefined;
  const { loadEnv } = await import('vite');
  return loadEnv('development', process.cwd(), '').WAITLIST_COUNT_TOKEN || undefined;
}

async function ask(): Promise<number | null> {
  try {
    const endpoint = import.meta.env.PUBLIC_WAITLIST_ENDPOINT;
    const token = await countToken();
    if (!endpoint || !token) return null;
    const res = await fetch(endpoint, {
      method: 'POST',
      body: new URLSearchParams({ action: 'count', token }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? parseCountAnswer(await res.json()) : null;
  } catch {
    // Whatever failed (reading the token, the request, the answer), the build
    // goes on without the line. Nothing about the request is logged: the token
    // is in its body.
    console.warn('[waitlist count] unavailable this build; the line is left out.');
    return null;
  }
}
