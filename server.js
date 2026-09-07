// server.js
const express = require("express");
const cors = require("cors");
const config = require("./src/config");
const rateLimit = require("./src/middleware/rateLimit");
const errorHandler = require("./src/middleware/errorHandler");
const leaguesRouter = require("./src/routes/leagues");
const fixturesRouter = require("./src/routes/fixtures");

const app = express();

// Only the origins you list in ALLOWED_ORIGINS may call this proxy. With no
// origins configured, CORS is left open (fine for local dev) — set
// ALLOWED_ORIGINS before deploying publicly.
app.use(
  cors({
    origin: config.allowedOrigins.length ? config.allowedOrigins : true,
  })
);

app.use(rateLimit);

app.get("/health", (req, res) => {
  res.json({ ok: true, apiKeyConfigured: Boolean(config.apiKey) });
});

app.use("/leagues", leaguesRouter);
app.use("/fixtures", fixturesRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Prediction Hub proxy listening on port ${config.port}`);
  console.log(`Try: http://localhost:${config.port}/health`);
});
