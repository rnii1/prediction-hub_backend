// src/middleware/errorHandler.js
const { UpstreamError } = require("../footballDataClient");

function errorHandler(err, req, res, _next) {
  if (err instanceof UpstreamError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  console.error("Unhandled proxy error:", err);
  res.status(500).json({ error: "Unexpected server error.", code: "INTERNAL_ERROR" });
}

module.exports = errorHandler;
