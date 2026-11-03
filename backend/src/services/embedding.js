import { config } from '../config.js';

export async function createEmbedding(input) {
  if (!config.embeddingBaseUrl || !config.embeddingModel) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.embeddingTimeoutMs);
  try {
    const response = await fetch(`${config.embeddingBaseUrl.replace(/\/$/, '')}/embeddings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.embeddingApiKey ? { authorization: `Bearer ${config.embeddingApiKey}` } : {}),
      },
      body: JSON.stringify({ model: config.embeddingModel, input }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`EMBEDDING_HTTP_${response.status}`);
    const payload = await response.json();
    const vector = payload?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length !== config.embeddingDimensions ||
        vector.some((value) => !Number.isFinite(value))) {
      throw new Error('EMBEDDING_DIMENSION_MISMATCH');
    }
    return vector;
  } finally {
    clearTimeout(timeout);
  }
}

export function toVectorLiteral(vector) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(',')}]`;
}
