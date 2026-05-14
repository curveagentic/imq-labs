import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const kind = (req.query.kind || '').toString().trim();
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(Number(req.query.limit) || 24, 100);

    const params = [];
    const where = [];
    if (kind && kind !== 'all') {
      params.push(kind);
      where.push(`c.kind = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(u.full_name ILIKE $${params.length} OR c.headline ILIKE $${params.length} OR c.city ILIKE $${params.length})`);
    }
    params.push(limit);
    const sql = `
      SELECT c.id, c.kind, c.headline, c.hourly_rate_usd, c.city, c.country,
             c.rating, c.rating_count, c.skills, c.is_available,
             u.id AS user_id, u.full_name, u.username, u.profile_image_url, u.is_verified
      FROM collaborators c
      JOIN users u ON u.id = c.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY c.rating DESC NULLS LAST, c.rating_count DESC
      LIMIT $${params.length}`;
    const r = await pool.query(sql, params);
    res.json({ collaborators: r.rows });
  } catch (e) { next(e); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT c.*, u.full_name, u.username, u.bio, u.profile_image_url, u.is_verified
       FROM collaborators c JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'collaborator_not_found');
    res.json({ collaborator: r.rows[0] });
  } catch (e) { next(e); }
});

const HireSchema = z.object({
  collaborator_id: z.string().uuid(),
  brief: z.string().min(5).max(2000),
  budget_usd: z.coerce.number().nonnegative().optional(),
});

router.post('/hire', requireAuth, async (req, res, next) => {
  try {
    const data = HireSchema.parse(req.body);
    const c = await pool.query(`SELECT user_id FROM collaborators WHERE id = $1`, [data.collaborator_id]);
    if (c.rowCount === 0) throw new HttpError(404, 'collaborator_not_found');
    const collabUserId = c.rows[0].user_id;

    const ins = await pool.query(
      `INSERT INTO hires (hirer_user_id, collaborator_id, brief, budget_usd)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, data.collaborator_id, data.brief, data.budget_usd || null]
    );

    // Open / reuse conversation between hirer and collaborator user.
    let convId;
    const existing = await pool.query(
      `SELECT cp1.conversation_id
       FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
       WHERE cp1.user_id = $1 AND cp2.user_id = $2`,
      [req.user.id, collabUserId]
    );
    if (existing.rowCount > 0) {
      convId = existing.rows[0].conversation_id;
    } else {
      const conv = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
      convId = conv.rows[0].id;
      await pool.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
        [convId, req.user.id, collabUserId]
      );
    }
    await pool.query(
      `INSERT INTO messages (conversation_id, sender_user_id, body) VALUES ($1,$2,$3)`,
      [convId, req.user.id, `[hire] Brief: ${data.brief}\nBudget: $${data.budget_usd || 'open'}`]
    );

    res.status(201).json({ hire: ins.rows[0], conversation_id: convId });
  } catch (e) { next(e); }
});

const ProfileSchema = z.object({
  kind: z.enum(['producer','artist','engineer','songwriter','vocalist']),
  headline: z.string().max(160).optional(),
  hourly_rate_usd: z.coerce.number().nonnegative().optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  skills: z.array(z.string().max(40)).max(15).optional(),
  is_available: z.boolean().optional(),
});

router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const data = ProfileSchema.parse(req.body);
    const r = await pool.query(
      `INSERT INTO collaborators (user_id, kind, headline, hourly_rate_usd, city, country, skills, is_available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, TRUE))
       ON CONFLICT (user_id) DO UPDATE SET
         kind = EXCLUDED.kind,
         headline = EXCLUDED.headline,
         hourly_rate_usd = EXCLUDED.hourly_rate_usd,
         city = EXCLUDED.city,
         country = EXCLUDED.country,
         skills = EXCLUDED.skills,
         is_available = COALESCE(EXCLUDED.is_available, collaborators.is_available)
       RETURNING *`,
      [
        req.user.id, data.kind, data.headline || null,
        data.hourly_rate_usd || null, data.city || null, data.country || null,
        data.skills || null, data.is_available ?? null,
      ]
    );
    res.json({ collaborator: r.rows[0] });
  } catch (e) { next(e); }
});

export default router;
