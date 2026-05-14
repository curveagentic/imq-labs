import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const StreamEventSchema = z.object({
  track_id: z.string().uuid(),
  duration_played_seconds: z.coerce.number().int().nonnegative().optional(),
});

router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const data = StreamEventSchema.parse(req.body);
    await pool.query(
      `INSERT INTO streams (track_id, user_id, duration_played_seconds)
       VALUES ($1,$2,$3)`,
      [data.track_id, req.user?.id || null, data.duration_played_seconds || null]
    );
    await pool.query(`UPDATE tracks SET stream_count = stream_count + 1 WHERE id = $1`, [data.track_id]);
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/analytics/me', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT t.id, t.title, t.stream_count,
              (SELECT COUNT(*) FROM streams s WHERE s.track_id = t.id AND s.played_at > NOW() - INTERVAL '7 days')::int AS streams_7d
       FROM tracks t JOIN artists a ON a.id = t.artist_id
       WHERE a.user_id = $1
       ORDER BY t.stream_count DESC`,
      [req.user.id]
    );
    const totals = r.rows.reduce(
      (acc, t) => ({
        total_streams: acc.total_streams + Number(t.stream_count || 0),
        streams_7d: acc.streams_7d + Number(t.streams_7d || 0),
      }),
      { total_streams: 0, streams_7d: 0 }
    );
    res.json({ totals, tracks: r.rows });
  } catch (e) { next(e); }
});

export default router;
