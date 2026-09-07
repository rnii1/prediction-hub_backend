// src/middleware/rateLimit.js
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 60;

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
