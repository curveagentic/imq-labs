import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import {
  generateThumbnails, generateShortVideo,
  buildThumbnailPrompt, buildVideoPrompt,
} from '../services/fal.js';
import { keyForUpload, saveFromUrl } from '../lib/storage.js';

const router = Router();

async function ownTrackOr404(trackId, userId) {
  const r = await pool.query(
    `SELECT t.*, a.user_id FROM tracks t JOIN artists a ON a.id = t.artist_id
     WHERE t.id = $1 AND a.user_id = $2`,
    [trackId, userId]
  );
  if (r.rowCount === 0) throw new HttpError(404, 'track_not_found');
  return r.rows[0];
}

const ThumbnailSchema = z.object({
  track_id: z.string().uuid(),
  mood: z.string().max(120).optional(),
  style: z.string().max(120).optional(),
  count: z.coerce.number().int().min(1).max(4).optional(),
});

router.post('/thumbnails', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const data = ThumbnailSchema.parse(req.body);
    const track = await ownTrackOr404(data.track_id, req.user.id);

    const prompt = buildThumbnailPrompt({
      trackTitle: track.title, genre: track.genre,
      mood: data.mood, style: data.style,
    });

    const placeholderRows = [];
    for (let i = 0; i < (data.count || 4); i++) {
      const ins = await pool.query(
        `INSERT INTO ai_creative_assets (track_id, asset_type, status, prompt_used)
         VALUES ($1,'thumbnail','processing',$2) RETURNING id`,
        [track.id, prompt]
      );
      placeholderRows.push(ins.rows[0].id);
    }

    let images = [], model = null;
    try {
      const out = await generateThumbnails({ prompt, count: data.count || 4 });
      images = out.images; model = out.model;
    } catch (err) {
      for (const id of placeholderRows) {
        await pool.query(
          `UPDATE ai_creative_assets SET status='failed', error_message=$2 WHERE id=$1`,
          [id, err.message]
        );
      }
      throw new HttpError(502, `ai_generation_failed: ${err.message}`);
    }

    const assets = [];
    for (let i = 0; i < placeholderRows.length; i++) {
      const id = placeholderRows[i];
      const img = images[i];
      if (!img?.url) {
        await pool.query(`UPDATE ai_creative_assets SET status='failed' WHERE id=$1`, [id]);
        continue;
      }
      const key = keyForUpload(`ai/${track.id}/thumbnail`, '.png');
      const stored = await saveFromUrl(key, img.url);
      const upd = await pool.query(
        `UPDATE ai_creative_assets
         SET status='ready', asset_url=$2, ai_model_version=$3
         WHERE id=$1 RETURNING *`,
        [id, stored, model]
      );
      assets.push(upd.rows[0]);
    }
    res.json({ assets, prompt });
  } catch (e) { next(e); }
});

const VideoSchema = z.object({
  track_id: z.string().uuid(),
  mood: z.string().max(120).optional(),
  style: z.string().max(120).optional(),
});

router.post('/short-videos', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const data = VideoSchema.parse(req.body);
    const track = await ownTrackOr404(data.track_id, req.user.id);

    const prompt = buildVideoPrompt({
      trackTitle: track.title, genre: track.genre,
      mood: data.mood, style: data.style,
    });

    const ins = await pool.query(
      `INSERT INTO ai_creative_assets (track_id, asset_type, status, prompt_used)
       VALUES ($1,'short_video','processing',$2) RETURNING id`,
      [track.id, prompt]
    );
    const id = ins.rows[0].id;

    try {
      const out = await generateShortVideo({ prompt });
      if (!out.url) throw new Error('no video url returned');
      const key = keyForUpload(`ai/${track.id}/video`, '.mp4');
      const stored = await saveFromUrl(key, out.url);
      const upd = await pool.query(
        `UPDATE ai_creative_assets
         SET status='ready', asset_url=$2, ai_model_version=$3
         WHERE id=$1 RETURNING *`,
        [id, stored, out.model]
      );
      res.json({ asset: upd.rows[0], prompt });
    } catch (err) {
      await pool.query(
        `UPDATE ai_creative_assets SET status='failed', error_message=$2 WHERE id=$1`,
        [id, err.message]
      );
      throw new HttpError(502, `ai_generation_failed: ${err.message}`);
    }
  } catch (e) { next(e); }
});

router.get('/assets', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const trackId = (req.query.track_id || '').toString();
    if (!trackId) throw new HttpError(400, 'track_id_required');
    const owner = await pool.query(
      `SELECT 1 FROM tracks t JOIN artists a ON a.id = t.artist_id
       WHERE t.id = $1 AND a.user_id = $2`,
      [trackId, req.user.id]
    );
    if (owner.rowCount === 0) throw new HttpError(404, 'track_not_found');
    const r = await pool.query(
      `SELECT * FROM ai_creative_assets WHERE track_id = $1 ORDER BY created_at DESC`,
      [trackId]
    );
    res.json({ assets: r.rows });
  } catch (e) { next(e); }
});

router.post('/assets/:id/select', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const own = await pool.query(
      `SELECT ac.*, t.id AS tid FROM ai_creative_assets ac
       JOIN tracks t ON t.id = ac.track_id
       JOIN artists a ON a.id = t.artist_id
       WHERE ac.id = $1 AND a.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (own.rowCount === 0) throw new HttpError(404, 'asset_not_found');
    const asset = own.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE ai_creative_assets SET is_selected = FALSE
         WHERE track_id = $1 AND asset_type = $2`,
        [asset.tid, asset.asset_type]
      );
      const upd = await client.query(
        `UPDATE ai_creative_assets SET is_selected = TRUE WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      if (asset.asset_type === 'thumbnail' && asset.asset_url) {
        await client.query(
          `UPDATE tracks SET cover_art_url = $1 WHERE id = $2`,
          [asset.asset_url, asset.tid]
        );
      }
      await client.query('COMMIT');
      res.json({ asset: upd.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }
  } catch (e) { next(e); }
});

export default router;
