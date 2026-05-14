import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(Number(req.query.limit) || 24, 100);
    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE a.stage_name ILIKE $1 OR u.full_name ILIKE $1`;
    }
    params.push(limit);
    const r = await pool.query(
      `SELECT a.id, a.stage_name, a.country, a.genres, u.profile_image_url, u.bio, u.is_verified
       FROM artists a JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ artists: r.rows });
  } catch (e) { next(e); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const a = await pool.query(
      `SELECT a.id, a.stage_name, a.country, a.genres, a.social_links,
              u.id as user_id, u.full_name, u.bio, u.profile_image_url, u.is_verified
       FROM artists a JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (a.rowCount === 0) throw new HttpError(404, 'artist_not_found');

    const t = await pool.query(
      `SELECT id, title, album, genre, cover_art_url, duration_seconds, status, stream_count
       FROM tracks WHERE artist_id = $1 AND status = 'live'
       ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );

    let following = false;
    if (req.user) {
      const f = await pool.query(
        `SELECT 1 FROM follows WHERE follower_user_id = $1 AND artist_id = $2`,
        [req.user.id, req.params.id]
      );
      following = f.rowCount > 0;
    }
    res.json({ artist: a.rows[0], tracks: t.rows, following });
  } catch (e) { next(e); }
});

const UpdateArtistSchema = z.object({
  country: z.string().max(100).optional(),
  genres: z.array(z.string().max(50)).max(10).optional(),
  social_links: z.record(z.string()).optional(),
});

router.patch('/me', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const data = UpdateArtistSchema.parse(req.body);
    const fields = Object.keys(data);
    if (fields.length === 0) return res.json({ ok: true });

    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [req.user.id, ...fields.map((f) => data[f])];
    const r = await pool.query(
      `UPDATE artists SET ${sets} WHERE user_id = $1
       RETURNING id, stage_name, country, genres, social_links`,
      values
    );
    if (r.rowCount === 0) throw new HttpError(404, 'artist_not_found');
    res.json({ artist: r.rows[0] });
  } catch (e) { next(e); }
});

router.post('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO follows (follower_user_id, artist_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]
    );
    res.json({ following: true });
  } catch (e) { next(e); }
});

router.delete('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM follows WHERE follower_user_id = $1 AND artist_id = $2`,
      [req.user.id, req.params.id]
    );
    res.json({ following: false });
  } catch (e) { next(e); }
});

export default router;
