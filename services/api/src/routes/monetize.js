import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

async function getArtistId(userId) {
  const r = await pool.query(`SELECT id FROM artists WHERE user_id = $1`, [userId]);
  return r.rows[0]?.id || null;
}

router.get('/overview', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const artistId = await getArtistId(req.user.id);
    if (!artistId) throw new HttpError(404, 'artist_profile_missing');

    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(amount_usd),0)::numeric                                  AS total_balance,
         COALESCE(SUM(amount_usd) FILTER (WHERE kind='sale'),0)::numeric        AS sales,
         COALESCE(SUM(amount_usd) FILTER (WHERE kind='subscription'),0)::numeric AS subscriptions,
         COALESCE(SUM(amount_usd) FILTER (WHERE kind='tip'),0)::numeric         AS tips,
         COALESCE(SUM(amount_usd) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),0)::numeric AS last_7d,
         COALESCE(SUM(amount_usd) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),0)::numeric AS last_30d
       FROM earnings WHERE artist_id = $1`,
      [artistId]
    );

    const series = await pool.query(
      `SELECT date_trunc('day', created_at) AS day, SUM(amount_usd) AS total
       FROM earnings
       WHERE artist_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY 1 ORDER BY 1 ASC`,
      [artistId]
    );

    const recent = await pool.query(
      `SELECT e.id, e.kind, e.amount_usd, e.note, e.created_at,
              u.full_name AS fan_name, u.username AS fan_username
       FROM earnings e
       LEFT JOIN users u ON u.id = e.fan_user_id
       WHERE e.artist_id = $1
       ORDER BY e.created_at DESC LIMIT 20`,
      [artistId]
    );

    const tiers = await pool.query(
      `SELECT id, name, price_usd, perks, is_active FROM subscription_tiers
       WHERE artist_id = $1 ORDER BY price_usd ASC`,
      [artistId]
    );
    const sales = await pool.query(
      `SELECT s.id, s.title, s.price_usd, s.description, s.is_active, s.track_id, t.title AS track_title
       FROM sale_listings s LEFT JOIN tracks t ON t.id = s.track_id
       WHERE s.artist_id = $1 ORDER BY s.created_at DESC`,
      [artistId]
    );

    res.json({
      totals: totals.rows[0],
      series: series.rows,
      recent: recent.rows,
      tiers:  tiers.rows,
      sales:  sales.rows,
    });
  } catch (e) { next(e); }
});

const SaleSchema = z.object({
  title: z.string().min(1).max(255),
  price_usd: z.coerce.number().nonnegative(),
  description: z.string().max(2000).optional(),
  track_id: z.string().uuid().optional(),
});

router.post('/sales', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const data = SaleSchema.parse(req.body);
    const artistId = await getArtistId(req.user.id);
    if (!artistId) throw new HttpError(404, 'artist_profile_missing');

    const r = await pool.query(
      `INSERT INTO sale_listings (artist_id, track_id, title, price_usd, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [artistId, data.track_id || null, data.title, data.price_usd, data.description || null]
    );
    res.status(201).json({ listing: r.rows[0] });
  } catch (e) { next(e); }
});

const TierSchema = z.object({
  name: z.string().min(1).max(100),
  price_usd: z.coerce.number().nonnegative(),
  perks: z.string().max(2000).optional(),
});

router.post('/tiers', requireAuth, requireRole('artist'), async (req, res, next) => {
  try {
    const data = TierSchema.parse(req.body);
    const artistId = await getArtistId(req.user.id);
    if (!artistId) throw new HttpError(404, 'artist_profile_missing');

    const r = await pool.query(
      `INSERT INTO subscription_tiers (artist_id, name, price_usd, perks)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [artistId, data.name, data.price_usd, data.perks || null]
    );
    res.status(201).json({ tier: r.rows[0] });
  } catch (e) { next(e); }
});

const TipSchema = z.object({
  artist_id: z.string().uuid(),
  amount_usd: z.coerce.number().positive().max(10000),
  note: z.string().max(280).optional(),
});

router.post('/tip', requireAuth, async (req, res, next) => {
  try {
    const data = TipSchema.parse(req.body);
    const r = await pool.query(
      `INSERT INTO earnings (artist_id, fan_user_id, kind, amount_usd, note)
       VALUES ($1,$2,'tip',$3,$4) RETURNING *`,
      [data.artist_id, req.user.id, data.amount_usd, data.note || null]
    );
    res.status(201).json({ earning: r.rows[0] });
  } catch (e) { next(e); }
});

const SubscribeSchema = z.object({ tier_id: z.string().uuid() });

router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const data = SubscribeSchema.parse(req.body);
    const t = await pool.query(`SELECT id, artist_id, price_usd, name FROM subscription_tiers WHERE id = $1`, [data.tier_id]);
    if (t.rowCount === 0) throw new HttpError(404, 'tier_not_found');
    const tier = t.rows[0];
    const r = await pool.query(
      `INSERT INTO earnings (artist_id, fan_user_id, kind, amount_usd, note)
       VALUES ($1,$2,'subscription',$3,$4) RETURNING *`,
      [tier.artist_id, req.user.id, tier.price_usd, `Subscribed: ${tier.name}`]
    );
    res.status(201).json({ earning: r.rows[0] });
  } catch (e) { next(e); }
});

router.post('/buy', requireAuth, async (req, res, next) => {
  try {
    const listingId = z.string().uuid().parse(req.body.listing_id);
    const l = await pool.query(`SELECT id, artist_id, price_usd, title FROM sale_listings WHERE id = $1`, [listingId]);
    if (l.rowCount === 0) throw new HttpError(404, 'listing_not_found');
    const lst = l.rows[0];
    const r = await pool.query(
      `INSERT INTO earnings (artist_id, fan_user_id, kind, amount_usd, note)
       VALUES ($1,$2,'sale',$3,$4) RETURNING *`,
      [lst.artist_id, req.user.id, lst.price_usd, `Bought: ${lst.title}`]
    );
    res.status(201).json({ earning: r.rows[0] });
  } catch (e) { next(e); }
});

router.get('/artist/:artistId', optionalAuth, async (req, res, next) => {
  try {
    const tiers = await pool.query(
      `SELECT id, name, price_usd, perks FROM subscription_tiers
       WHERE artist_id = $1 AND is_active = TRUE ORDER BY price_usd ASC`,
      [req.params.artistId]
    );
    const sales = await pool.query(
      `SELECT id, title, price_usd, description, track_id FROM sale_listings
       WHERE artist_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
      [req.params.artistId]
    );
    res.json({ tiers: tiers.rows, sales: sales.rows });
  } catch (e) { next(e); }
});

export default router;
