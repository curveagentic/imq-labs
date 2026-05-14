import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT p.*, COUNT(pt.track_id)::int AS track_count
       FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.user_id = $1 GROUP BY p.id ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ playlists: r.rows });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const p = await pool.query(`SELECT * FROM playlists WHERE id = $1`, [req.params.id]);
    if (p.rowCount === 0) throw new HttpError(404, 'playlist_not_found');
    const t = await pool.query(
      `SELECT t.*, a.stage_name, pt.track_order
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       JOIN artists a ON a.id = t.artist_id
       WHERE pt.playlist_id = $1
       ORDER BY pt.track_order ASC`,
      [req.params.id]
    );
    res.json({ playlist: p.rows[0], tracks: t.rows });
  } catch (e) { next(e); }
});

const CreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = CreateSchema.parse(req.body);
    const r = await pool.query(
      `INSERT INTO playlists (user_id, name, description) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, data.name, data.description || null]
    );
    res.status(201).json({ playlist: r.rows[0] });
  } catch (e) { next(e); }
});

const AddTrackSchema = z.object({ track_id: z.string().uuid() });

router.post('/:id/tracks', requireAuth, async (req, res, next) => {
  try {
    const { track_id } = AddTrackSchema.parse(req.body);
    const owner = await pool.query(
      `SELECT 1 FROM playlists WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (owner.rowCount === 0) throw new HttpError(404, 'playlist_not_found');

    const order = await pool.query(
      `SELECT COALESCE(MAX(track_order), 0) + 1 AS next FROM playlist_tracks WHERE playlist_id = $1`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO playlist_tracks (playlist_id, track_id, track_order)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [req.params.id, track_id, order.rows[0].next]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id/tracks/:trackId', requireAuth, async (req, res, next) => {
  try {
    const owner = await pool.query(
      `SELECT 1 FROM playlists WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (owner.rowCount === 0) throw new HttpError(404, 'playlist_not_found');
    await pool.query(
      `DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2`,
      [req.params.id, req.params.trackId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'playlist_not_found');
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

export default router;
