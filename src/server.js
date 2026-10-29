
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


const TRANSFORMER_PAGE_SIZE = 20;

// GET /api/transformers?page=1&search=Malviya
app.get("/api/transformers", async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        error: "page must be a positive integer",
      });
    }

    const upstream = await portalGet(
      `/portal/dts?page=${page}`
    );

    if (!Array.isArray(upstream.data)) {
      return res.status(502).json({
        error: "Invalid transformer data from upstream portal",
      });
    }

    const search = String(req.query.search ?? "")
      .trim()
      .toLowerCase();

    let transformers = upstream.data;

    if (search) {
      transformers = transformers.filter((transformer) =>
        [
          transformer.code,
          transformer.name,
          transformer.feederCode,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(search)
        )
      );
    }

    res.json({
      data: transformers,
      total: upstream.total,
      page: upstream.page,
      pageSize: upstream.pageSize ?? TRANSFORMER_PAGE_SIZE,
      count: transformers.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/transformers/DT-001
app.get("/api/transformers/:transformerId", async (req, res, next) => {
  try {
    const transformerId = req.params.transformerId;
    const pageSize = TRANSFORMER_PAGE_SIZE;

    // Search the available pages for this transformer.
    const firstPage = await portalGet("/portal/dts?page=1");

    if (!Array.isArray(firstPage.data)) {
      return res.status(502).json({
        error: "Invalid transformer data from upstream portal",
      });
    }

    const total = Number(firstPage.total ?? firstPage.data.length);
    const totalPages = Math.ceil(
      total / (firstPage.pageSize || pageSize)
    );

    let transformer = firstPage.data.find(
      (item) => item.code === transformerId
    );

    for (
      let page = 2;
      !transformer && page <= totalPages;
      page++
    ) {
      const upstream = await portalGet(`/portal/dts?page=${page}`);

      if (!Array.isArray(upstream.data)) {
        return res.status(502).json({
          error: "Invalid transformer data from upstream portal",
        });
      }

      transformer = upstream.data.find(
        (item) => item.code === transformerId
      );
    }

    if (!transformer) {
      return res.status(404).json({
        error: "Transformer not found",
      });
    }

    res.json(transformer);
  } catch (error) {
    next(error);
  }
});

app.get("/api/transformers/:transformerId/meters", (req, res) => {
  const transformerId = req.params.transformerId;

  const metersForTransformer = meters.filter(
    (meter) => meter.dtCode === transformerId
  );

  res.json({
    transformerId,
    count: metersForTransformer.length,
    data: metersForTransformer,
  });
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
