import { openai } from "../config/openai.js";
import { embedTexts } from "../ingestion/embedder.js";
import { search } from "../vector/vectorStore.js";
export async function ask(question: string) {
	const [queryEmbedding] = await embedTexts([question]);
	const results = search(queryEmbedding);
	const context = results.map((r) => r.content).join("\n---\n");
	const completion = await openai.chat.completions.create({
		model: "gpt-4.1-mini",
		messages: [
			{
				role: "system",
				content: "Answer using the provided product documentation only.",
			},
			{
				role: "user",
				content: `Context:\n${context}\n\nQuestion:\n${question}`,
			},
		],
	});
	return completion.choices[0].message.content;
}
