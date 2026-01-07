type VectorRecord = {
  embedding: number[];
  content: string;
};

const store: VectorRecord[] = [];

export function addVectors(vectors: VectorRecord[]) {
  store.push(...vectors);
}

function cosineSimilarity(a: number[], b: number[]) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB);
}

export function search(queryEmbedding: number[], topK = 5) {
  return store
    .map(item => ({
      ...item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
