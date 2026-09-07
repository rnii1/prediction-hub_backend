// src/footballDataClient.js
//
// The ONLY module in this codebase that talks to football-data.org, and the
// ONLY module that ever reads config.apiKey. Every route goes through here.

const config = require("./config");

class UpstreamError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "UpstreamError";
    this.status = status; // HTTP status to send back to our own client
    this.code = code; // machine-readable reason
  }
}

// --- simple request queue -------------------------------------------------
// football-data.org's free tier allows 10 requests/minute. Rather than let
// bursts of frontend traffic get rate-limited and fail, we serialize
// upstream calls with a minimum spacing between them.
const MIN_SPACING_MS = 6100; // ~10/min with a small safety margin
let queue = Promise.resolve();
let lastCallAt = 0;

function schedule(task) {
  queue = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_SPACING_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return task();
  });
  return queue;
}

async function upstreamFetch(path) {
  if (!config.apiKey) {
    throw new UpstreamError(
      "This proxy is not configured with a football-data.org API key yet (FOOTBALL_DATA_API_KEY is unset).",
      503,
      "NOT_CONFIGURED"
    );
  }

  return schedule(async () => {
    let res;
    try {
      res = await fetch(`${config.upstreamBaseUrl}${path}`, {
        headers: { "X-Auth-Token": config.apiKey },
      });
    } catch (networkErr) {
      throw new UpstreamError("Could not reach football-data.org (network error).", 502, "NETWORK_ERROR");
    }

    if (res.status === 401 || res.status === 403) {
      throw new UpstreamError("football-data.org rejected the configured API key.", 502, "INVALID_CREDENTIALS");
    }
    if (res.status === 429) {
      throw new UpstreamError("football-data.org rate limit exceeded. Please try again shortly.", 429, "RATE_LIMITED");
    }
    if (res.status === 404) {
      throw new UpstreamError("The requested resource was not found upstream.", 404, "NOT_FOUND");
    }
    if (!res.ok) {
      throw new UpstreamError(`Upstream request failed (${res.status}).`, 502, "UPSTREAM_ERROR");
    }

    try {
      return await res.json();
    } catch {
      throw new UpstreamError("Upstream returned an invalid/unexpected response.", 502, "INVALID_RESPONSE");
    }
  });
}

module.exports = { upstreamFetch, UpstreamError };
