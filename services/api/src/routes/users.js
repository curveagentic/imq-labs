import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, username, full_name, bio, profile_image_url, role, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'user_not_found');
    res.json({ user: r.rows[0] });
  } catch (e) { next(e); }
});

const UpdateMeSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(2000).optional(),
  profile_image_url: z.string().url().max(512).optional(),
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const data = UpdateMeSchema.parse(req.body);
    const fields = Object.keys(data);
    if (fields.length === 0) return res.json({ ok: true });

    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [req.user.id, ...fields.map((f) => data[f])];
    const r = await pool.query(
      `UPDATE users SET ${sets} WHERE id = $1
       RETURNING id, username, full_name, bio, profile_image_url, role`,
      values
    );
    res.json({ user: r.rows[0] });
  } catch (e) { next(e); }
});

export default router;
