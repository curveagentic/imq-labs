import { Router } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [u, a, t, c, e, conv] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM users`),
      pool.query(`SELECT COUNT(*)::int AS n FROM artists`),
      pool.query(`SELECT COUNT(*)::int AS n FROM tracks WHERE status = 'live'`),
      pool.query(`SELECT COUNT(*)::int AS n FROM collaborators`),
      pool.query(`SELECT COALESCE(SUM(amount_usd), 0)::numeric AS total FROM earnings`),
      pool.query(`SELECT COUNT(*)::int AS n FROM conversations`),
    ]);
    res.json({
      users:         u.rows[0].n,
      artists:       a.rows[0].n,
      tracks:        t.rows[0].n,
      collaborators: c.rows[0].n,
      conversations: conv.rows[0].n,
      earnings_total_usd: e.rows[0].total,
    });
  } catch (err) { next(err); }
});

export default router;
