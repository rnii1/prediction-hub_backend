// src/cache.js
const store = new Map();

const TTL = {
  fixtures: 60 * 1000,
  finished: 60 * 60 * 1000,
  standings: 5 * 60 * 1000,
  live: 0,
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
  if (!ttlMs) return;
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

module.exports = { get, set, TTL };
