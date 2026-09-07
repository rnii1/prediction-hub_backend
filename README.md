# Prediction Hub — Backend Proxy

A small Express server that sits between the Prediction Hub frontend and
[football-data.org](https://www.football-data.org), so the API key lives as
a **server-side environment variable** and never ships to the browser.

```
Browser (prediction-hub/)  →  this proxy  →  api.football-data.org
```

## Why this exists

The frontend is a static site (GitHub Pages). Any value in its JavaScript is
public. A real API key can only be used safely from something that runs
server-side — this proxy is that piece. See
`prediction-hub/js/api/apiConfig.js` in the frontend project for the full
explanation and the two-line change needed to point the frontend at this
once it's deployed.

## Endpoints

| Method | Path                        | Notes |
|--------|-----------------------------|-------|
| GET    | `/health`                   | `{ ok, apiKeyConfigured }` — quick check the key is set |
| GET    | `/leagues`                  | All leagues the frontend knows about, each flagged `supported` |
| GET    | `/leagues/:id`               | One league's metadata |
| GET    | `/leagues/:id/standings`     | Standings table, shaped for `league.html` |
| GET    | `/fixtures?league=&status=`  | Fixtures in a ~2-week window; `league` omitted/`All` = every supported competition in one upstream call; `status` filters to `LIVE`/`SCHEDULED`/`FINISHED` after mapping |
| GET    | `/fixtures/:id`              | Single match, enriched with form/scoring-rate data for the prediction engine |

`league` ids match `prediction-hub/js/data/leagues.js`: `epl`, `laliga`,
`seriea`, `bundesliga`, `ligue1`, `ucl`, `gpl`, `mls`.

**Coverage limit:** football-data.org's free tier covers the six European
competitions above but not `gpl` (Ghana Premier League) or `mls`. Requests
for those return `501` with `{ error, supported: false }` instead of faking
numbers — swap in a different/paid provider for those if you need them live.

## Local setup

```bash
cd prediction-hub-backend
npm install
cp .env.example .env
# edit .env: paste your free key from
# https://www.football-data.org/client/register
npm start
```

Then check `http://localhost:8787/health` — `apiKeyConfigured` should be
`true`. Without a key set, every data route responds `503` with a clear
"not configured" message rather than hanging or returning empty silently.

## Connecting the frontend

In `prediction-hub/js/api/apiConfig.js`:

```js
export const API_CONFIG = {
  USE_LIVE_API: true,
  PROXY_BASE_URL: "https://your-deployed-proxy.example.com",
  ...
};
```

During local development, serve both projects and set `PROXY_BASE_URL` to
`http://localhost:8787`.

## Deploying

Any Node host works (`npm start`, listens on `process.env.PORT`). Render,
Railway, and Fly.io all have simple free/low-cost tiers:

1. Push `prediction-hub-backend/` to its own GitHub repo (or a subfolder,
   with the host's root directory set accordingly).
2. Create a new Web Service pointing at it; build command `npm install`,
   start command `npm start`.
3. Set environment variables in the host's dashboard — **not** in code:
   - `FOOTBALL_DATA_API_KEY` — your football-data.org key
   - `ALLOWED_ORIGINS` — your GitHub Pages URL, e.g.
     `https://rnii1.github.io`
4. Once deployed, update `PROXY_BASE_URL` in the frontend as above.

If you'd rather use Vercel/Netlify serverless functions instead of a
standalone server, the route logic in `src/routes/` and `src/` is
platform-agnostic (plain functions returning JSON) — only `server.js`'s
Express wiring would need to become individual handler files.

## Reliability & rate-limit handling

- **Caching** (`src/cache.js`): fixtures ~1 min, standings ~5 min — tuned so
  a burst of frontend page loads doesn't multiply upstream calls.
- **Upstream request queue** (`src/footballDataClient.js`): serializes calls
  to football-data.org with ~6s spacing, keeping this proxy under its
  free-tier limit of 10 requests/minute even under concurrent traffic.
- **Own rate limit** (`src/middleware/rateLimit.js`): a light per-IP cap on
  this proxy's public surface, independent of the upstream queue.
- **Error handling** (`src/middleware/errorHandler.js` +
  `UpstreamError`): network failures, invalid/missing key, upstream rate
  limiting, and malformed responses are all caught and turned into
  consistent `{ error, code }` JSON rather than a raw 500 or a hang.

## Project structure

```
prediction-hub-backend/
├── server.js                  Express app, CORS, routing, error handling
├── src/
│   ├── config.js               Reads env vars; warns loudly if key is unset
│   ├── leagueMap.js             Internal league id ↔ football-data.org code
│   ├── cache.js                 Tiny in-memory TTL cache
│   ├── footballDataClient.js    The only module that calls upstream / holds the key
│   ├── transform.js             Upstream response shapes → frontend's expected shapes
│   ├── routes/
│   │   ├── leagues.js
│   │   └── fixtures.js
│   └── middleware/
│       ├── rateLimit.js
│       └── errorHandler.js
├── .env.example
└── package.json
```

## Limitations

- In-memory cache is per-process — fine on a standalone server, less useful
  on a platform that spins up a fresh instance per request.
- No authentication on the proxy itself beyond CORS + rate limiting; it's
  designed to serve one known frontend, not as a general public API.
- Team "strength" is a simple points-per-game-derived proxy for the
  prediction engine, not an official rating.
