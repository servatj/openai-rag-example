export function chunkText(
	text: string,
	chunkSize = 800,
	overlap = 100
): string[] {
	const words = text.split(" ");
	const chunks: string[] = [];
	for (let i = 0; i < words.length; i += chunkSize - overlap) {
		chunks.push(words.slice(i, i + chunkSize).join(" "));
	}
	return chunks;
}
