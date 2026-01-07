import "dotenv/config";
import { loadPdf } from "./ingestion/pdfLoader.js";
import { chunkText } from "./ingestion/chunker.js";
import { embedTexts } from "./ingestion/embedder.js";
import { addVectors } from "./vector/vectorStore.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function ingest() {
  const pdfPath = join(__dirname, "manuals", "manual_drone.pdf");
  const text = await loadPdf(pdfPath);
  const chunks = chunkText(text);
  const embeddings = await embedTexts(chunks);

  addVectors(
    embeddings.map((embedding, i) => ({
      embedding,
      content: chunks[i],
    }))
  );

  console.log(`PDF ingested: ${chunks.length} chunks created`);
}

ingest();
