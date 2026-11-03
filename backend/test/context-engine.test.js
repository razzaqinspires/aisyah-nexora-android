import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPotentialConflicts, retrieveContext } from '../src/services/context-engine.js';

test('detects only conservative opposite-polarity lexical conflicts', () => {
  const rows = [
    { content: 'Aplikasi mendukung login Google Firebase' },
    { content: 'Aplikasi tidak mendukung login Google Firebase' },
    { content: 'Database menggunakan PostgreSQL dengan pgvector' },
  ];
  const conflicts = detectPotentialConflicts(rows);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].reason, 'opposite_polarity_with_shared_terms');
});

test('retrieval ranks private and approved shared context separately', async () => {
  const result = await retrieveContext({
    userId: 'user-1', query: 'preferensi bahasa', embedding: [0.1],
    memories: { search: async ({ userId }) => {
      assert.equal(userId, 'user-1');
      return [{ content: 'Pengguna memilih Bahasa Indonesia', similarity: 0.8, importance_score: 0.9 }];
    } },
    sharedKnowledgeSearch: async () => [{ content: 'Dokumentasi API menggunakan JSON', similarity: 0.7, confidence_score: 0.9 }],
  });
  assert.equal(result.memories[0].sourceType, 'private_memory');
  assert.equal(result.sharedKnowledge[0].sourceType, 'approved_shared_knowledge');
  assert.equal(result.potentialConflicts.length, 0);
});

test('retrieval tolerates missing embedding and still searches shared knowledge text', async () => {
  const result = await retrieveContext({
    userId: 'user-1', query: 'postgres', embedding: null,
    memories: { search: async () => { throw new Error('must not query private vectors'); } },
    sharedKnowledgeSearch: async ({ embedding, query }) => {
      assert.equal(embedding, null);
      assert.equal(query, 'postgres');
      return [{ content: 'PostgreSQL is the database', similarity: 0.4, confidence_score: 0.8 }];
    },
  });
  assert.equal(result.memories.length, 0);
  assert.equal(result.sharedKnowledge.length, 1);
});
