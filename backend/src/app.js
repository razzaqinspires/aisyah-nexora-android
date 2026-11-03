import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { requireFirebaseUser } from './services/firebase-auth.js';
import { generateAssistantReply } from './services/model-router.js';
import { createEmbedding } from './services/embedding.js';
import { retrieveContext } from './services/context-engine.js';
import { listConversations, getConversation, deleteConversation, appendExchange, recentMessages } from './repositories/conversation-repository.js';
import { listMemories, createMemory, updateMemory, deleteMemory, searchMemories } from './repositories/memory-repository.js';
import { createMemoryProposal, getMemoryProposal, listMemoryProposals, decideMemoryProposal } from './repositories/memory-proposal-repository.js';
import { submitKnowledge, listPendingKnowledge, decideKnowledge } from './repositories/knowledge-review-repository.js';
import { extractExplicitMemoryCandidate, scoreMemoryImportance, memoryExpiryFromDays } from './services/memory-governance.js';
import { config } from './config.js';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(config.chatMaxInputChars),
  conversationId: z.string().uuid().optional(),
});
const memorySchema = z.object({ content: z.string().trim().min(1).max(2000), expiresInDays: z.union([z.number().int().min(1).max(3650), z.null()]).optional() });
const idSchema = z.string().uuid();

export function createApp({
  authenticate = requireFirebaseUser,
  generateReply = generateAssistantReply,
  conversations = { list: listConversations, get: getConversation, remove: deleteConversation, append: appendExchange, recent: recentMessages },
  memories = { list: listMemories, create: createMemory, update: updateMemory, remove: deleteMemory, search: searchMemories },
  embed = createEmbedding,
  memoryProposals = { create: createMemoryProposal, get: getMemoryProposal, list: listMemoryProposals, decide: decideMemoryProposal },
  knowledge = { submit: submitKnowledge, listPending: listPendingKnowledge, decide: decideKnowledge },
  retrieve = retrieveContext,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'aisyah-nexora-backend', version: '0.5.0' }));

  app.get('/v1/me', authenticate, (req, res) => res.json({
    assistant: 'Aisyah', model: 'Nexora', user: {
      id: req.user.id, firebaseUid: req.user.firebaseUid, email: req.user.email,
      displayName: req.user.displayName, photoUrl: req.user.photoUrl, emailVerified: req.user.emailVerified,
    },
  }));

  app.get('/v1/conversations', authenticate, async (req, res) => {
    try { return res.json({ conversations: await conversations.list(req.user.id) }); }
    catch { return res.status(503).json({ error: { code: 'HISTORY_UNAVAILABLE', message: 'Riwayat belum dapat dimuat.' } }); }
  });

  app.get('/v1/conversations/:id', authenticate, async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: { code: 'INVALID_ID' } });
    try {
      const conversation = await conversations.get(req.user.id, req.params.id);
      return conversation ? res.json({ conversation }) : res.status(404).json({ error: { code: 'NOT_FOUND' } });
    } catch { return res.status(503).json({ error: { code: 'HISTORY_UNAVAILABLE' } }); }
  });

  app.delete('/v1/conversations/:id', authenticate, async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: { code: 'INVALID_ID' } });
    try {
      const removed = await conversations.remove(req.user.id, req.params.id);
      return removed ? res.status(204).end() : res.status(404).json({ error: { code: 'NOT_FOUND' } });
    } catch { return res.status(503).json({ error: { code: 'HISTORY_UNAVAILABLE' } }); }
  });

  app.get('/v1/memory-proposals', authenticate, async (req, res) => {
    try { return res.json({ proposals: await memoryProposals.list(req.user.id) }); }
    catch { return res.status(503).json({ error: { code: 'MEMORY_UNAVAILABLE' } }); }
  });

  app.post('/v1/memory-proposals/:id/decision', authenticate, async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: { code: 'INVALID_ID' } });
    const decision = req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: { code: 'INVALID_DECISION' } });
    try {
      const proposal = await memoryProposals.get(req.user.id, req.params.id);
      if (!proposal || proposal.status !== 'pending') return res.status(404).json({ error: { code: 'NOT_FOUND_OR_ALREADY_DECIDED' } });
      const vector = decision === 'approve' ? await embed(proposal.content) : null;
      const result = await memoryProposals.decide({ userId: req.user.id, proposalId: req.params.id, decision, embedding: vector });
      return result ? res.json({ result }) : res.status(404).json({ error: { code: 'NOT_FOUND_OR_ALREADY_DECIDED' } });
    } catch { return res.status(503).json({ error: { code: 'MEMORY_UNAVAILABLE' } }); }
  });

  app.post('/v1/knowledge-submissions', authenticate, async (req, res) => {
    const parsed = z.object({ content: z.string().trim().min(8).max(5000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_KNOWLEDGE' } });
    try { return res.status(201).json({ submission: await knowledge.submit({ userId: req.user.id, content: parsed.data.content }) }); }
    catch { return res.status(503).json({ error: { code: 'KNOWLEDGE_UNAVAILABLE' } }); }
  });

  const isKnowledgeReviewer = (req) => config.knowledgeReviewerUids.includes(req.user.firebaseUid);
  app.get('/v1/admin/knowledge-submissions', authenticate, async (req, res) => {
    if (!isKnowledgeReviewer(req)) return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    try { return res.json({ submissions: await knowledge.listPending({ reviewerId: req.user.id }) }); }
    catch { return res.status(503).json({ error: { code: 'KNOWLEDGE_UNAVAILABLE' } }); }
  });
  app.post('/v1/admin/knowledge-submissions/:id/decision', authenticate, async (req, res) => {
    if (!isKnowledgeReviewer(req)) return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: { code: 'INVALID_ID' } });
    const decision = req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: { code: 'INVALID_DECISION' } });
    try {
      const pending = decision === 'approve' ? await knowledge.listPending({ reviewerId: req.user.id }) : [];
      const item = pending.find((entry) => entry.id === req.params.id);
      if (decision === 'approve' && !item) return res.status(404).json({ error: { code: 'NOT_FOUND_OR_ALREADY_DECIDED' } });
      let embedding = null;
      if (decision === 'approve') {
        try { embedding = await embed(item.content); } catch { /* Approval remains possible; full-text retrieval is the fallback. */ }
      }
      const result = await knowledge.decide({ submissionId: req.params.id, reviewerId: req.user.id, reviewerUid: req.user.firebaseUid, decision, embedding });
      return result ? res.json({ result }) : res.status(404).json({ error: { code: 'NOT_FOUND_OR_ALREADY_DECIDED' } });
    } catch { return res.status(503).json({ error: { code: 'KNOWLEDGE_UNAVAILABLE' } }); }
  });

  app.get('/v1/memories', authenticate, async (req, res) => {
    try { return res.json({ memories: await memories.list(req.user.id) }); }
    catch { return res.status(503).json({ error: { code: 'MEMORY_UNAVAILABLE' } }); }
  });

  app.post('/v1/memories', authenticate, async (req, res) => {
    const parsed = memorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_MEMORY' } });
    try {
      const vector = await embed(parsed.data.content);
      const memory = await memories.create({ userId: req.user.id, content: parsed.data.content, embedding: vector, source: 'user', importanceScore: scoreMemoryImportance(parsed.data.content), expiresAt: memoryExpiryFromDays(parsed.data.expiresInDays) });
      return res.status(201).json({ memory });
    } catch { return res.status(503).json({ error: { code: 'MEMORY_UNAVAILABLE' } }); }
  });

  app.patch('/v1/memories/:id', authenticate, async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: { code: 'INVALID_ID' } });
    const parsed = memorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_MEMORY' } });
    try {
      const vector = await embed(parsed.data.content);
      const memory = await memories.update({ userId: req.user.id, memoryId: req.params.id, content: parsed.data.content, embedding: vector, expiresAt: memoryExpiryFromDays(parsed.data.expiresInDays) });
      return memory ? res.json({ memory }) : res.status(404).json({ error: { code: 'NOT_FOUND' } });
    } catch { return res.status(503).json({ error: { code: 'MEMORY_UNAVAILABLE' } }); }
  });

  app.delete('/v1/memories/:id', authenticate, async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success) return res.status(400).json({ error: { code: 'INVALID_ID' } });
    try {
      const removed = await memories.remove(req.user.id, req.params.id);
      return removed ? res.status(204).end() : res.status(404).json({ error: { code: 'NOT_FOUND' } });
    } catch { return res.status(503).json({ error: { code: 'MEMORY_UNAVAILABLE' } }); }
  });

  app.post('/v1/chat', authenticate, async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Message payload is invalid.' } });
    try {
      let conversationId = parsed.data.conversationId;
      let history = [];
      if (conversationId) {
        history = await conversations.recent(req.user.id, conversationId, 12);
        if (!history) return res.status(404).json({ error: { code: 'CONVERSATION_NOT_FOUND' } });
      }
      let context = { memories: [], sharedKnowledge: [], potentialConflicts: [] };
      let vector = null;
      try { vector = await embed(parsed.data.message); } catch { /* Continue with full-text shared-knowledge retrieval. */ }
      try {
        context = await retrieve({ userId: req.user.id, query: parsed.data.message, embedding: vector, memories });
      } catch { /* Context retrieval is best-effort; chat can continue without it. */ }

      const result = await generateReply({ message: parsed.data.message, history, memories: context.memories, sharedKnowledge: context.sharedKnowledge, potentialConflicts: context.potentialConflicts, userId: req.user.id });
      const saved = await conversations.append({
        userId: req.user.id, conversationId, userMessage: parsed.data.message,
        assistantMessage: result.answer, provider: result.provider,
      });
      if (!saved) return res.status(404).json({ error: { code: 'CONVERSATION_NOT_FOUND' } });
      let memoryProposal = null;
      const candidate = extractExplicitMemoryCandidate(parsed.data.message);
      if (candidate) {
        try { memoryProposal = await memoryProposals.create({ userId: req.user.id, content: candidate, conversationId: saved.conversationId }); }
        catch { /* Proposal storage must not break a successful chat response. */ }
      }
      return res.json({ assistant: 'Aisyah', model: 'Nexora', answer: result.answer,
        provider: result.provider, conversationId: saved.conversationId, memoryProposal });
    } catch (error) {
      const unavailable = error?.code === 'AI_UNAVAILABLE';
      return res.status(unavailable ? 503 : 500).json({ error: {
        code: unavailable ? 'AI_UNAVAILABLE' : 'INTERNAL_ERROR',
        message: unavailable ? 'AI providers are currently unavailable.' : 'The request could not be completed.',
      } });
    }
  });
  return app;
}
