import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export async function loadPdf(path: string): Promise<string> {
  const buffer = fs.readFileSync(path);
  const data = await pdf(buffer);
  return data.text;
}
