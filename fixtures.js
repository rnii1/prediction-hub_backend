// src/routes/fixtures.js
const express = require("express");
const { getLeague, codeToId } = require("../leagueMap");
const { upstreamFetch } = require("../footballDataClient");
const { mapMatch, buildStandingsMap } = require("../transform");
const cache = require("../cache");

const router = express.Router();

function dateWindow() {
  const from = new Date();
  from.setDate(from.getDate() - 3);
  const to = new Date();
  to.setDate(to.getDate() + 10);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { dateFrom: iso(from), dateTo: iso(to) };
}

/** Fetches (and caches) the standings map for one competition code. */
async function getStandingsMapFor(code) {
  const cacheKey = `standingsmap:${code}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const raw = await upstreamFetch(`/competitions/${code}/standings`);
  const map = buildStandingsMap(raw);
  cache.set(cacheKey, map, cache.TTL.standings);
  return map;
}

router.get("/", async (req, res, next) => {
  try {
    const leagueId = req.query.league && req.query.league !== "All" ? req.query.league : null;
    const statusFilter = req.query.status || null; // our vocabulary: LIVE | SCHEDULED | FINISHED
    const { dateFrom, dateTo } = dateWindow();

    let path;
    let cacheKey;
    if (leagueId) {
      const league = getLeague(leagueId);
      if (!league) return res.status(404).json({ error: "Unknown league id", leagueId });
      if (!league.code) {
        return res
          .status(501)
          .json({ error: `${league.name} is not available on football-data.org's free tier.`, leagueId, supported: false });
      }
      path = `/competitions/${league.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      cacheKey = `fixtures:${league.code}:${dateFrom}:${dateTo}`;
    } else {
      // All supported leagues in one upstream call, rather than looping
      // per-competition and burning through the free-tier rate limit.
      path = `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      cacheKey = `fixtures:ALL:${dateFrom}:${dateTo}`;
    }

    let raw = cache.get(cacheKey);
    if (!raw) {
      raw = await upstreamFetch(path);
      cache.set(cacheKey, raw, cache.TTL.fixtures);
    }

    const apiMatches = raw.matches || [];

    // Only fetch standings for competitions actually present in this batch,
    // and only once each (cached across requests too).
    const uniqueCodes = [...new Set(apiMatches.map((m) => m.competition?.code).filter(Boolean))];
    const standingsByCode = {};
    for (const code of uniqueCodes) {
      try {
        standingsByCode[code] = await getStandingsMapFor(code);
      } catch {
        // If a single competition's standings fail (e.g. not started yet),
        // fall back to neutral per-team defaults rather than failing the
        // whole fixtures list.
        standingsByCode[code] = {};
      }
    }

    let mapped = apiMatches.map((m) => {
      const id = leagueId || codeToId(m.competition?.code) || (m.competition?.code || "").toLowerCase();
      const standingsMap = standingsByCode[m.competition?.code] || {};
      return mapMatch(m, id, standingsMap);
    });

    if (statusFilter) mapped = mapped.filter((m) => m.status === statusFilter);

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const cacheKey = `match:${req.params.id}`;
    let raw = cache.get(cacheKey);
    if (!raw) {
      raw = await upstreamFetch(`/matches/${req.params.id}`);
      cache.set(cacheKey, raw, cache.TTL.fixtures);
    }
    const leagueId = codeToId(raw.competition?.code) || (raw.competition?.code || "").toLowerCase();
    let standingsMap = {};
    if (raw.competition?.code) {
      try {
        standingsMap = await getStandingsMapFor(raw.competition.code);
      } catch {
        standingsMap = {};
      }
    }
    res.json(mapMatch(raw, leagueId, standingsMap));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
