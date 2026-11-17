// Data layer for make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Performance: every answer is kept in memory with its ETag and revalidated with
// If-None-Match on the next visit. The API's tags turn over each minute, so a repeat
// view inside the minute is answered 304 with no body, and a later one refreshes in
// one round trip. Nothing here signs, posts or writes.

const API = 'https://make.fun/api';

const cache = new Map(); // url -> { etag, data }

export async function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  const res = await fetch(url, { headers: hit && hit.etag ? { 'If-None-Match': hit.etag } : {} });
  if (res.status === 304 && hit) return hit.data;
  if (!res.ok) throw new Error(`make.fun answered ${res.status} for ${path}`);
  const data = await res.json();
  cache.set(url, { etag: res.headers.get('etag'), data });
  return data;
}

/** The open bounties (activity=times leaves out the activity feed a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty in full: summary, description, rules, rewards with the live pot split. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: ranked entries with the judge's win rates. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: record and past entries. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
