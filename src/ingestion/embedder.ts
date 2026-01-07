import { openai } from "../config/openai.js";
export async function embedTexts(texts: string[]) {
	const response = await openai.embeddings.create({
		model: "text-embedding-3-large",
		input: texts,
	});
	return response.data.map((d) => d.embedding);
}
