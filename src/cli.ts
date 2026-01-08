import "dotenv/config";
import { loadPdf } from "./ingestion/pdfLoader.js";
import { chunkText } from "./ingestion/chunker.js";
import { embedTexts } from "./ingestion/embedder.js";
import { addVectors } from "./vector/vectorStore.js";
import { ask } from "./rag/query.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const question = process.argv[2];

  if (!question) {
    console.log("Usage: npm run ask \"your question here\"");
    process.exit(1);
  }

  console.log("Loading and processing PDF...");
  const pdfPath = join(__dirname, "manuals", "manual_drone.pdf");
  const text = await loadPdf(pdfPath);
  const chunks = chunkText(text);

  console.log(`Created ${chunks.length} chunks, generating embeddings...`);
  const embeddings = await embedTexts(chunks);

  addVectors(
    embeddings.map((embedding, i) => ({
      id: `manual_drone.pdf#chunk-${i}`,
      source: "manual_drone.pdf",
      embedding,
      content: chunks[i],
    }))
  );

  console.log("Querying...\n");
  const result = await ask(question);
  console.log("Answer:", result.answer);
  if (result.citations.length) {
    console.log("\nCitations:");
    for (const c of result.citations) {
      console.log(`- ${c.id} (score: ${c.score.toFixed(3)})`);
    }
  }
}

main();
