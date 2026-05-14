import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { keyForUpload, saveBuffer } from '../lib/storage.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB cap for MVP
});

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const genre = (req.query.genre || '').toString().trim();
    const limit = Math.min(Number(req.query.limit) || 24, 100);
    const params = [];
    const where = [`t.status = 'live'`];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(t.title ILIKE $${params.length} OR t.album ILIKE $${params.length} OR a.stage_name ILIKE $${params.length})`);
    }
    if (genre) { params.push(genre); where.push(`t.genre = $${params.length}`); }
    params.push(limit);
    const r = await pool.query(
      `SELECT t.id, t.title, t.album, t.genre, t.cover_art_url, t.duration_seconds,
              t.audio_file_url, t.stream_count,
              a.id as artist_id, a.stage_name
       FROM tracks t JOIN artists a ON a.id = t.artist_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.created_at DESC LIMIT $${params.length}`,
      params
    );
    res.json({ tracks: r.rows });
  } catch (e) { next(e); }
});

router.get('/mine', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT t.* FROM tracks t
       JOIN artists a ON a.id = t.artist_id
       WHERE a.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json({ tracks: r.rows });
  } catch (e) { next(e); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT t.*, a.stage_name FROM tracks t
       JOIN artists a ON a.id = t.artist_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'track_not_found');
    res.json({ track: r.rows[0] });
  } catch (e) { next(e); }
});

const TrackMetaSchema = z.object({
  title: z.string().min(1).max(255),
  album: z.string().max(255).optional(),
  genre: z.string().min(1).max(100),
  release_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  duration_seconds: z.coerce.number().int().nonnegative().optional(),
});

router.post(
  '/',
  requireAuth,
  requireRole('artist'),
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const meta = TrackMetaSchema.parse(req.body);
      const audio = req.files?.audio?.[0];
      if (!audio) throw new HttpError(400, 'audio_file_required');

      const a = await pool.query(`SELECT id FROM artists WHERE user_id = $1`, [req.user.id]);
      if (a.rowCount === 0) throw new HttpError(403, 'artist_profile_missing');
      const artistId = a.rows[0].id;

      const audioKey = keyForUpload(`tracks/${artistId}/audio`, audio.originalname);
      const audioUrl = await saveBuffer(audioKey, audio.buffer);

      let coverUrl = null;
      const cover = req.files?.cover?.[0];
      if (cover) {
        const coverKey = keyForUpload(`tracks/${artistId}/cover`, cover.originalname);
        coverUrl = await saveBuffer(coverKey, cover.buffer);
      }

      const r = await pool.query(
        `INSERT INTO tracks (artist_id, title, album, genre, release_date,
           audio_file_url, cover_art_url, duration_seconds, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'live')
         RETURNING *`,
        [
          artistId, meta.title, meta.album || null, meta.genre,
          meta.release_date || null, audioUrl, coverUrl, meta.duration_seconds || null,
        ]
      );
      res.status(201).json({ track: r.rows[0] });
    } catch (e) { next(e); }
  }
);

const UpdateTrackSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  album: z.string().max(255).optional().nullable(),
  genre: z.string().min(1).max(100).optional(),
  release_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  cover_art_url: z.string().max(512).optional().nullable(),
});

router.patch('/:id', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const data = UpdateTrackSchema.parse(req.body);
    const owner = await pool.query(
      `SELECT t.id FROM tracks t JOIN artists a ON a.id = t.artist_id
       WHERE t.id = $1 AND a.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (owner.rowCount === 0) throw new HttpError(404, 'track_not_found');

    const fields = Object.keys(data);
    if (fields.length === 0) return res.json({ ok: true });
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...fields.map((f) => data[f])];
    const r = await pool.query(
      `UPDATE tracks SET ${sets} WHERE id = $1 RETURNING *`,
      values
    );
    res.json({ track: r.rows[0] });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `DELETE FROM tracks t USING artists a
       WHERE t.id = $1 AND a.id = t.artist_id AND a.user_id = $2
       RETURNING t.id`,
      [req.params.id, req.user.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'track_not_found');
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

export default router;
