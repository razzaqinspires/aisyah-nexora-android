import { getPool } from '../db/pool.js';
import { withUserTransaction } from '../db/with-user-transaction.js';

export async function listConversations(userId, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      `SELECT id, title, created_at, updated_at FROM conversations
       WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100`, [userId]);
    return result.rows;
  });
}

export async function getConversation(userId, conversationId, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const conversation = await client.query(
      `SELECT id, title, created_at, updated_at FROM conversations
       WHERE id = $1 AND user_id = $2`, [conversationId, userId]);
    if (!conversation.rowCount) return null;
    const messages = await client.query(
      `SELECT id, role, content, provider, created_at FROM messages
       WHERE conversation_id = $1 AND user_id = $2
       ORDER BY created_at ASC LIMIT 500`, [conversationId, userId]);
    return { ...conversation.rows[0], messages: messages.rows };
  });
}

export async function createConversation(userId, title = 'Percakapan baru', pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      `INSERT INTO conversations (user_id, title) VALUES ($1, $2)
       RETURNING id, title, created_at, updated_at`, [userId, title]);
    return result.rows[0];
  });
}

export async function deleteConversation(userId, conversationId, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const result = await client.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [conversationId, userId]);
    return result.rowCount > 0;
  });
}

export async function appendExchange({ userId, conversationId, userMessage, assistantMessage, provider }, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    let conversation;
    if (conversationId) {
      const found = await client.query(
        'SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [conversationId, userId]);
      if (!found.rowCount) return null;
      conversation = found.rows[0];
    } else {
      const created = await client.query(
        `INSERT INTO conversations (user_id, title) VALUES ($1, $2)
         RETURNING id, title`, [userId, userMessage.slice(0, 72)]);
      conversation = created.rows[0];
    }
    const inserted = await client.query(
      `INSERT INTO messages (conversation_id, user_id, role, content, provider)
       VALUES ($1, $2, 'user', $3, NULL), ($1, $2, 'assistant', $4, $5)
       RETURNING id, role, content, provider, created_at`,
      [conversation.id, userId, userMessage, assistantMessage, provider]);
    await client.query('UPDATE conversations SET updated_at = now() WHERE id = $1', [conversation.id]);
    return { conversationId: conversation.id, messages: inserted.rows };
  });
}

export async function recentMessages(userId, conversationId, limit = 12, pool = getPool()) {
  return withUserTransaction(pool, userId, async (client) => {
    const exists = await client.query('SELECT 1 FROM conversations WHERE id = $1 AND user_id = $2', [conversationId, userId]);
    if (!exists.rowCount) return null;
    const result = await client.query(
      `SELECT role, content FROM (
         SELECT role, content, created_at FROM messages
         WHERE conversation_id = $1 AND user_id = $2 AND role IN ('user','assistant')
         ORDER BY created_at DESC LIMIT $3
       ) recent ORDER BY created_at ASC`, [conversationId, userId, limit]);
    return result.rows;
  });
}
