import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT
         c.id, c.updated_at,
         u.id   AS other_id,
         u.full_name AS other_name,
         u.username  AS other_username,
         u.profile_image_url AS other_avatar,
         m_last.body AS last_body,
         m_last.created_at AS last_at,
         (SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = c.id
            AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
            AND m.sender_user_id <> $1) AS unread_count
       FROM conversation_participants cp
       JOIN conversations c ON c.id = cp.conversation_id
       JOIN conversation_participants cp_other
         ON cp_other.conversation_id = c.id AND cp_other.user_id <> $1
       JOIN users u ON u.id = cp_other.user_id
       LEFT JOIN LATERAL (
         SELECT body, created_at FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC LIMIT 1
       ) m_last ON TRUE
       WHERE cp.user_id = $1
       ORDER BY COALESCE(m_last.created_at, c.created_at) DESC`,
      [req.user.id]
    );
    res.json({ conversations: r.rows });
  } catch (e) { next(e); }
});

router.get('/conversations/:id', requireAuth, async (req, res, next) => {
  try {
    const isParticipant = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (isParticipant.rowCount === 0) throw new HttpError(404, 'conversation_not_found');

    const m = await pool.query(
      `SELECT m.*, u.username, u.full_name, u.profile_image_url
       FROM messages m JOIN users u ON u.id = m.sender_user_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC LIMIT 200`,
      [req.params.id]
    );

    await pool.query(
      `UPDATE conversation_participants SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    res.json({ messages: m.rows });
  } catch (e) { next(e); }
});

const SendSchema = z.object({
  body: z.string().min(1).max(4000),
});

router.post('/conversations/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const data = SendSchema.parse(req.body);
    const isParticipant = await pool.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (isParticipant.rowCount === 0) throw new HttpError(404, 'conversation_not_found');

    const r = await pool.query(
      `INSERT INTO messages (conversation_id, sender_user_id, body)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, data.body]
    );
    await pool.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.status(201).json({ message: r.rows[0] });
  } catch (e) { next(e); }
});

const StartSchema = z.object({
  user_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

router.post('/conversations', requireAuth, async (req, res, next) => {
  try {
    const data = StartSchema.parse(req.body);
    if (data.user_id === req.user.id) throw new HttpError(400, 'cannot_message_self');

    const existing = await pool.query(
      `SELECT cp1.conversation_id
       FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
       WHERE cp1.user_id = $1 AND cp2.user_id = $2`,
      [req.user.id, data.user_id]
    );

    let convId;
    if (existing.rowCount > 0) {
      convId = existing.rows[0].conversation_id;
    } else {
      const conv = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
      convId = conv.rows[0].id;
      await pool.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
        [convId, req.user.id, data.user_id]
      );
    }
    const m = await pool.query(
      `INSERT INTO messages (conversation_id, sender_user_id, body)
       VALUES ($1,$2,$3) RETURNING *`,
      [convId, req.user.id, data.body]
    );
    res.status(201).json({ conversation_id: convId, message: m.rows[0] });
  } catch (e) { next(e); }
});

export default router;
