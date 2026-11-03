const NEGATION = /\b(tidak|bukan|belum|jangan|never|no|not|cannot|can't|without)\b/i;
const WORDS = new Set(['yang', 'dan', 'atau', 'dengan', 'untuk', 'pada', 'dari', 'adalah', 'ini', 'itu', 'the', 'and', 'for', 'with', 'from', 'that', 'this']);

function normalizedTokens(value) {
  return String(value).toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu)?.filter((word) => word.length > 2 && !WORDS.has(word)) ?? [];
}

function lexicalOverlap(left, right) {
  const a = new Set(normalizedTokens(left));
  const b = new Set(normalizedTokens(right));
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const word of a) if (b.has(word)) common += 1;
  return common / Math.min(a.size, b.size);
}

export function detectPotentialConflicts(items, { overlapThreshold = 0.65 } = {}) {
  const conflicts = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const left = items[i];
      const right = items[j];
      const oppositePolarity = NEGATION.test(left.content) !== NEGATION.test(right.content);
      if (oppositePolarity && lexicalOverlap(left.content, right.content) >= overlapThreshold) {
        conflicts.push({ left, right, reason: 'opposite_polarity_with_shared_terms' });
      }
    }
  }
  return conflicts;
}

export async function retrieveContext({ userId, query, embedding, memories: memoryRepository, sharedKnowledgeSearch } ) {
  if (!memoryRepository) {
    const repository = await import('../repositories/memory-repository.js');
    memoryRepository = { search: repository.searchMemories };
  }
  if (!sharedKnowledgeSearch) {
    const repository = await import('../repositories/knowledge-retrieval-repository.js');
    sharedKnowledgeSearch = repository.searchSharedKnowledge;
  }
  const [privateRows, sharedRows] = await Promise.all([
    embedding ? memoryRepository.search({ userId, embedding, limit: 8 }) : [],
    sharedKnowledgeSearch({ embedding, query, limit: 8 }),
  ]);

  const memories = privateRows
    .map((item) => ({ ...item, sourceType: 'private_memory', rankScore: Number(item.similarity ?? 0) * 0.78 + Number(item.importance_score ?? 0.5) * 0.22 }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 5);
  const sharedKnowledge = sharedRows
    .map((item) => ({ ...item, sourceType: 'approved_shared_knowledge', rankScore: Number(item.similarity ?? 0) * 0.9 + Number(item.confidence_score ?? 0.5) * 0.1 }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 5);

  const potentialConflicts = detectPotentialConflicts([
    ...memories.map((item) => ({ ...item, content: String(item.content) })),
    ...sharedKnowledge.map((item) => ({ ...item, content: String(item.content) })),
  ]);

  return { memories, sharedKnowledge, potentialConflicts };
}
