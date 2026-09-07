// src/cache.js
//
// A deliberately simple in-memory cache (per project spec, section 35 "Data
// Caching"): fixtures get a short TTL, finished results a longer one,
// standings a moderate one, and live matches are never cached. This also
// reduces load against football-data.org's free-tier rate limit (10
// requests/minute) — see rateLimitedFetch in footballDataClient.js for the
// other half of that protection.
//
// NOTE: this cache is per-process memory. On a serverless platform that
// spins up fresh instances per request (e.g. some Vercel deployments), it
// won't persist between invocations — the app still works correctly, it
// just won't benefit as much from caching there. A standalone Node process
// (Render/Railway/Fly, or this repo's default server.js) keeps it warm.

const store = new Map();

const TTL = {
  fixtures: 60 * 1000, // 1 minute — upcoming/scheduled fixtures change rarely
  finished: 60 * 60 * 1000, // 1 hour — results don't change once played
  standings: 5 * 60 * 1000, // 5 minutes
  live: 0, // never cached — always fetch fresh
};

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  if (!ttlMs) return; // ttl 0/undefined => don't cache
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

module.exports = { get, set, TTL };
