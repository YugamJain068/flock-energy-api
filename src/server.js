
import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { portalGet } from "./portalClient.js";

const app = express();
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exportPath = path.join(__dirname, "../data/meter-export.json");

// Load the meter export (top-level JSON array)
let meters;

try {
  meters = JSON.parse(fs.readFileSync(exportPath, "utf8"));

  if (!Array.isArray(meters)) {
    throw new Error("meter-export.json must contain a JSON array");
  }
} catch (error) {
  console.error("Failed to load meter-export.json:", error.message);
  process.exit(1);
}

const meterById = new Map(
  meters.map((meter) => [meter.meterId, meter])
);

// List meters, optionally filtered by status and search term
app.get("/api/meters", (req, res) => {
  const { status, search } = req.query;
  let result = meters;

  if (status) {
    result = result.filter(
      (meter) =>
        String(meter.installStatus ?? "").toLowerCase() ===
        String(status).toLowerCase()
    );
  }

  if (search) {
    const term = String(search).toLowerCase();

    result = result.filter((meter) =>
      [
        meter.meterId,
        meter.serialNo,
        meter.make,
        meter.dtCode,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }

  res.json({
    count: result.length,
    data: result,
  });
});

// Get a meter from the local export
app.get("/api/meters/:meterId", (req, res) => {
  const meter = meterById.get(req.params.meterId);

  if (!meter) {
    return res.status(404).json({ error: "Meter not found" });
  }

  res.json(meter);
});

// Get meter geographic information from the upstream portal
app.get("/api/meters/:meterId/geo", async (req, res, next) => {
  try {
    const meterId = req.params.meterId;

    if (!meterById.has(meterId)) {
      return res.status(404).json({ error: "Meter not found" });
    }

    const data = await portalGet(
      `/portal/meters/${encodeURIComponent(meterId)}/geo`
    );

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Get meter energy/consumption information from the upstream portal
app.get("/api/meters/:meterId/consumption", async (req, res, next) => {
  try {
    const meterId = req.params.meterId;

    if (!meterById.has(meterId)) {
      return res.status(404).json({ error: "Meter not found" });
    }

    const data = await portalGet(
      `/portal/meters/${encodeURIComponent(meterId)}/energy`
    );

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Centralized error handler
app.use((error, req, res, next) => {
  console.error("API request failed:", {
    method: req.method,
    path: req.originalUrl,
    message: error.message,
    upstreamStatus: error.response?.status ?? null,
    upstreamData: error.response?.data ?? null,
    upstreamUrl: error.config?.url ?? null,
  });

  res.status(error.response?.status === 401 ? 502 : 502).json({
    error: "Upstream portal request failed",
    details: error.response?.data || error.message,
    upstreamStatus: error.response?.status ?? null,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Loaded ${meters.length} meters`);
  console.log(`API running at http://localhost:${PORT}`);
});
