// src/leagueMap.js
//
// Prediction Hub's frontend refers to leagues by short internal ids (see
// prediction-hub/js/data/leagues.js). football-data.org uses its own
// 2-4 letter competition codes. This module is the only place that
// translation happens.
//
// IMPORTANT — free-tier coverage: football-data.org's free plan covers the
// major European leagues/cups below. It does NOT include the Ghana Premier
// League or MLS on the free tier. Per the project's "Do Not Fake Data"
// rule, this proxy does not silently substitute demo numbers for those —
// it returns a clear "not available on the current plan" response instead
// (see routes/leagues.js and routes/fixtures.js). Swap in a different/paid
// provider for those competitions if you need them live.

const LEAGUE_MAP = {
  epl: { code: "PL", name: "Premier League", country: "England", icon: "🏴" },
  laliga: { code: "PD", name: "La Liga", country: "Spain", icon: "🇪🇸" },
  seriea: { code: "SA", name: "Serie A", country: "Italy", icon: "🇮🇹" },
  bundesliga: { code: "BL1", name: "Bundesliga", country: "Germany", icon: "🇩🇪" },
  ligue1: { code: "FL1", name: "Ligue 1", country: "France", icon: "🇫🇷" },
  ucl: { code: "CL", name: "UEFA Champions League", country: "Europe", icon: "⭐" },

  // Not on football-data.org's free tier — kept in the map (with code: null)
  // so the frontend's league list still renders, but requests for these
  // return a clear "unsupported on current plan" response rather than
  // silently failing or faking numbers.
  gpl: { code: null, name: "Ghana Premier League", country: "Ghana", icon: "🇬🇭" },
  mls: { code: null, name: "MLS", country: "USA/Canada", icon: "🇺🇸" },
};

function getLeague(id) {
  return LEAGUE_MAP[id] || null;
}

function codeToId(code) {
  return Object.keys(LEAGUE_MAP).find((id) => LEAGUE_MAP[id].code === code) || null;
}

module.exports = { LEAGUE_MAP, getLeague, codeToId };
