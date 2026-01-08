import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { loadPdf } from "./ingestion/pdfLoader.js";
import { chunkText } from "./ingestion/chunker.js";
import { embedTexts } from "./ingestion/embedder.js";
import { addVectors, clearVectors, getVectorCount } from "./vector/vectorStore.js";
import { ask } from "./rag/query.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CachedManual = {
  source: string;
  chunks: string[];
  embeddings: number[][];
};

function getDataDir() {
  return join(__dirname, "..", "data");
}

function getCachePath() {
  return join(getDataDir(), "manual_drone.cache.json");
}

async function buildOrLoadCache(): Promise<CachedManual> {
  const cachePath = getCachePath();
  if (fs.existsSync(cachePath)) {
    const raw = fs.readFileSync(cachePath, "utf8");
    return JSON.parse(raw) as CachedManual;
  }

  const pdfPath = join(__dirname, "manuals", "manual_drone.pdf");
  const text = await loadPdf(pdfPath);
  const chunks = chunkText(text);
  const embeddings = await embedTexts(chunks);

  const cache: CachedManual = {
    source: "manual_drone.pdf",
    chunks,
    embeddings,
  };

  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache), "utf8");
  return cache;
}

let initPromise: Promise<void> | null = null;
async function ensureIngested() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const cache = await buildOrLoadCache();
    clearVectors();
    addVectors(
      cache.embeddings.map((embedding, i) => ({
        id: `${cache.source}#chunk-${i}`,
        source: cache.source,
        embedding,
        content: cache.chunks[i],
      }))
    );
  })();
  return initPromise;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  await ensureIngested();
  res.json({ ok: true, vectors: getVectorCount() });
});

app.post("/api/ask", async (req, res) => {
  try {
    const question = String(req.body?.question ?? "").trim();
    if (!question) {
      res.status(400).json({ error: "Missing question" });
      return;
    }

    await ensureIngested();
    const result = await ask(question);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
