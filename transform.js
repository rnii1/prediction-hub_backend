// src/transform.js
//
// football-data.org's response shapes don't match what the frontend was
// built against (js/data/matches.js / js/data/leagues.js demo shape). This
// module is the single place that translation happens, so routes stay thin
// and the frontend never has to know the upstream provider changed.

function mapStatus(apiStatus) {
  if (["SCHEDULED", "TIMED"].includes(apiStatus)) return "SCHEDULED";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(apiStatus)) return "LIVE";
  if (apiStatus === "FINISHED") return "FINISHED";
  // POSTPONED / SUSPENDED / CANCELLED — surfaced as-is rather than forced
  // into one of the three UI buckets, so nothing pretends a called-off
  // match is still on.
  return apiStatus;
}

/** Builds { teamName -> { total, home, away } } from a standings response. */
function buildStandingsMap(standingsResponse) {
  const map = {};
  const groups = standingsResponse?.standings || [];
  for (const group of groups) {
    const kind = group.type === "HOME" ? "home" : group.type === "AWAY" ? "away" : "total";
    for (const row of group.table || []) {
      const name = row.team?.name;
      if (!name) continue;
      map[name] = map[name] || {};
      map[name][kind] = row;
    }
  }
  return map;
}

function safeDiv(a, b) {
  return b > 0 ? a / b : 0;
}

/** Derives a 0-100 "strength" proxy from points-per-game — used only by the
 *  prediction engine's home-advantage/strength-gap terms, never displayed
 *  as an official rating. */
function strengthFromPoints(row) {
  if (!row || !row.playedGames) return 65;
  const ppg = row.points / row.playedGames;
  return Math.round(Math.min(95, Math.max(30, 50 + (ppg - 1.4) * 22)));
}

function recentForm(row) {
  if (!row?.form) return [];
  return row.form
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => ["W", "D", "L"].includes(s))
    .slice(-5);
}

/** Shapes a single team, using standings data when available for form and
 *  home/away scoring rates. Falls back to neutral values if the team isn't
 *  found in the standings map (e.g. cup fixtures, newly promoted sides). */
function shapeTeam(name, standingsMap, side) {
  const rows = standingsMap[name];
  const total = rows?.total;
  const homeRow = rows?.home;
  const awayRow = rows?.away;

  return {
    name,
    strength: strengthFromPoints(total),
    form: recentForm(total),
    gfAvgHome: round1(safeDiv(homeRow?.goalsFor ?? 0, homeRow?.playedGames ?? 0)) || 1.3,
    gaAvgHome: round1(safeDiv(homeRow?.goalsAgainst ?? 0, homeRow?.playedGames ?? 0)) || 1.1,
    gfAvgAway: round1(safeDiv(awayRow?.goalsFor ?? 0, awayRow?.playedGames ?? 0)) || 1.0,
    gaAvgAway: round1(safeDiv(awayRow?.goalsAgainst ?? 0, awayRow?.playedGames ?? 0)) || 1.3,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Maps one football-data.org match into the shape js/components/matchCard.js
 *  and js/predictions/predictionEngine.js expect. */
function mapMatch(apiMatch, leagueId, standingsMap) {
  const status = mapStatus(apiMatch.status);
  const score =
    status === "FINISHED" || status === "LIVE"
      ? { home: apiMatch.score?.fullTime?.home ?? 0, away: apiMatch.score?.fullTime?.away ?? 0 }
      : null;

  return {
    id: String(apiMatch.id),
    league: leagueId,
    kickoff: apiMatch.utcDate,
    status,
    venue: apiMatch.venue || `${apiMatch.homeTeam?.name} Stadium`,
    home: shapeTeam(apiMatch.homeTeam?.name, standingsMap, "home"),
    away: shapeTeam(apiMatch.awayTeam?.name, standingsMap, "away"),
    score,
    isDemo: false,
  };
}

/** Maps a standings response into the flat row shape league.html expects. */
function mapStandingsTable(standingsResponse) {
  const totalGroup = (standingsResponse?.standings || []).find((g) => g.type === "TOTAL");
  const table = totalGroup?.table || [];
  return table.map((row) => ({
    pos: row.position,
    team: row.team?.name,
    p: row.playedGames,
    w: row.won,
    d: row.draw,
    l: row.lost,
    gf: row.goalsFor,
    ga: row.goalsAgainst,
    form: recentForm(row),
  }));
}

module.exports = { mapStatus, buildStandingsMap, mapMatch, mapStandingsTable, shapeTeam };
