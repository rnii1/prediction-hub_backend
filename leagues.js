// src/routes/leagues.js
const express = require("express");
const { LEAGUE_MAP, getLeague } = require("../leagueMap");
const { upstreamFetch } = require("../footballDataClient");
const { mapStandingsTable } = require("../transform");
const cache = require("../cache");

const router = express.Router();

// GET /leagues — list of leagues the frontend can offer, whether or not
// they're actually available on the current upstream plan (the frontend
// still shows them; only the standings/fixtures calls for them differ).
router.get("/", (req, res) => {
  const leagues = Object.entries(LEAGUE_MAP).map(([id, l]) => ({
    id,
    name: l.name,
    country: l.country,
    icon: l.icon,
    supported: Boolean(l.code),
  }));
  res.json(leagues);
});

router.get("/:id", (req, res) => {
  const league = getLeague(req.params.id);
  if (!league) return res.status(404).json({ error: "Unknown league id", leagueId: req.params.id });
  res.json({ id: req.params.id, name: league.name, country: league.country, icon: league.icon, supported: Boolean(league.code) });
});

router.get("/:id/standings", async (req, res, next) => {
  const leagueId = req.params.id;
  const league = getLeague(leagueId);
  if (!league) return res.status(404).json({ error: "Unknown league id", leagueId });

  if (!league.code) {
    // Per the "Do Not Fake Data" rule: no substituted numbers, just an
    // honest, structured "not available" response the frontend can show.
    return res.status(501).json({
      error: `${league.name} is not available on football-data.org's free tier.`,
      leagueId,
      supported: false,
    });
  }

  const cacheKey = `standings:${league.code}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const raw = await upstreamFetch(`/competitions/${league.code}/standings`);
    const table = mapStandingsTable(raw);
    cache.set(cacheKey, table, cache.TTL.standings);
    res.json(table);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
