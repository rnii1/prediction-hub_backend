// src/leagueMap.js
const LEAGUE_MAP = {
  epl: { code: "PL", name: "Premier League", country: "England", icon: "🏴" },
  laliga: { code: "PD", name: "La Liga", country: "Spain", icon: "🇪🇸" },
  seriea: { code: "SA", name: "Serie A", country: "Italy", icon: "🇮🇹" },
  bundesliga: { code: "BL1", name: "Bundesliga", country: "Germany", icon: "🇩🇪" },
  ligue1: { code: "FL1", name: "Ligue 1", country: "France", icon: "🇫🇷" },
  ucl: { code: "CL", name: "UEFA Champions League", country: "Europe", icon: "⭐" },
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
