/**
 * The single place the UI talks to data.
 *
 * For a normal session this is just `fetch`. For a demo session the request is
 * served from the in-browser sandbox and never leaves the machine, so a demo
 * user physically cannot read or write the production database.
 *
 * Every `/api/...` call in the app must go through this, not raw `fetch`.
 */
import { isDemoSession } from './auth';
import { handleDemoRequest } from './demo-store';

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!isDemoSession()) return fetch(input, init);

  const method = (init?.method ?? 'GET').toUpperCase();
  let body: unknown = undefined;
  if (typeof init?.body === 'string') {
    try { body = JSON.parse(init.body); } catch { body = undefined; }
  }

  const result = handleDemoRequest(input, method, body);
  const failed = !!(result && typeof result === 'object' && 'error' in result);

  // A real Response, so callers can use res.ok / res.json() unchanged.
  return new Response(JSON.stringify(result), {
    status: failed ? 400 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * A message worth showing the user from a failed response.
 *
 * Route handlers answer with `{ error }`; an unhandled exception answers with
 * an HTML error page that `res.json()` would throw on. Both end up here as a
 * sentence rather than as a silent no-op, because a till that fails quietly is
 * worse than one that fails loudly.
 */
export async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
      return (body as { error: string }).error;
    }
  } catch {
    // Not JSON — fall through to the status line.
  }
  return `The server rejected this (${res.status}). Nothing was saved.`;
}
