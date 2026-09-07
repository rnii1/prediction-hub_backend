// src/middleware/rateLimit.js
//
// A minimal in-memory per-IP limiter for THIS proxy's own public surface
// (separate from the upstream-facing queue in footballDataClient.js, which
// protects football-data.org's limit). Deliberately dependency-free.

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 60; // generous — the frontend never needs this many

const hits = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (hits.get(ip) || []).filter((t) => t > windowStart);
  timestamps.push(now);
  hits.set(ip, timestamps);

  if (timestamps.length > MAX_PER_WINDOW) {
    return res.status(429).json({ error: "Too many requests — please slow down.", code: "CLIENT_RATE_LIMITED" });
  }
  next();
}

module.exports = rateLimit;
