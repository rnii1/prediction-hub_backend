// src/config.js
require("dotenv").config();

const config = {
  port: process.env.PORT || 8787,
  apiKey: process.env.FOOTBALL_DATA_API_KEY || "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  upstreamBaseUrl: "https://api.football-data.org/v4",
};

// Fail loudly at startup rather than serving silent empty responses forever
// — a missing key is a setup mistake, not a normal runtime state.
if (!config.apiKey) {
  console.warn(
    "\n⚠️  FOOTBALL_DATA_API_KEY is not set.\n" +
      "   The proxy will start, but every upstream request will fail with a\n" +
      "   clear 'not configured' error until you set it in .env (see .env.example).\n" +
      "   Get a free key at https://www.football-data.org/client/register\n"
  );
}

module.exports = config;
