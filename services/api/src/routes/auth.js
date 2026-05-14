import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(100),
  role: z.enum(['artist', 'fan']),
  stage_name: z.string().min(1).max(100).optional(),
  country: z.string().max(100).optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);
    if (data.role === 'artist' && !data.stage_name) {
      throw new HttpError(400, 'stage_name required for artist');
    }
    const password_hash = await bcrypt.hash(data.password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const u = await client.query(
        `INSERT INTO users (email, username, password_hash, full_name, role)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, email, username, full_name, role, created_at`,
        [data.email, data.username, password_hash, data.full_name, data.role]
      );
      const user = u.rows[0];

      let artist = null;
      if (data.role === 'artist') {
        const a = await client.query(
          `INSERT INTO artists (user_id, stage_name, country)
           VALUES ($1,$2,$3)
           RETURNING id, stage_name, country`,
          [user.id, data.stage_name, data.country || null]
        );
        artist = a.rows[0];
      }
      await client.query('COMMIT');
      res.status(201).json({ token: signToken(user), user, artist });
    } catch (e) {
      await client.query('ROLLBACK');
      if (e.code === '23505') throw new HttpError(409, 'email_or_username_taken');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) { next(e); }
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const r = await pool.query(
      `SELECT id, email, username, full_name, role, password_hash FROM users WHERE email = $1`,
      [email]
    );
    if (r.rowCount === 0) throw new HttpError(401, 'invalid_credentials');
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new HttpError(401, 'invalid_credentials');

    let artist = null;
    if (user.role === 'artist') {
      const a = await pool.query(`SELECT id, stage_name, country FROM artists WHERE user_id = $1`, [user.id]);
      artist = a.rows[0] || null;
    }
    delete user.password_hash;
    res.json({ token: signToken(user), user, artist });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, email, username, full_name, bio, profile_image_url, role, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'user_not_found');
    const user = r.rows[0];
    let artist = null;
    if (user.role === 'artist') {
      const a = await pool.query(
        `SELECT id, stage_name, country, genres, social_links FROM artists WHERE user_id = $1`,
        [user.id]
      );
      artist = a.rows[0] || null;
    }
    res.json({ user, artist });
  } catch (e) { next(e); }
});

export default router;
