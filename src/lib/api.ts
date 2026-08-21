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
