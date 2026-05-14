import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const TicketSchema = z.object({
  subject: z.string().min(3).max(255),
  description: z.string().min(10).max(10_000),
  category: z.enum(['billing', 'technical', 'content', 'ai_tools', 'account', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

const KEYWORDS_HIGH = ['cant login', 'cannot login', 'locked out', 'payment', 'charged', 'refund', 'security', 'hacked'];

function aiTriage(subject, description) {
  const text = `${subject}\n${description}`.toLowerCase();
  let category = 'other';
  if (/upload|track|audio|file/.test(text)) category = 'technical';
  else if (/billing|invoice|payment|charged|refund/.test(text)) category = 'billing';
  else if (/copyright|takedown|content|moderation/.test(text)) category = 'content';
  else if (/thumbnail|video clip|ai|generation/.test(text)) category = 'ai_tools';
  else if (/login|password|account|profile/.test(text)) category = 'account';

  const priority = KEYWORDS_HIGH.some((k) => text.includes(k)) ? 'high'
    : (text.length > 600 ? 'medium' : 'low');

  let suggestion = null;
  if (category === 'technical' && /upload/.test(text)) {
    suggestion = 'Most upload issues are caused by unsupported file formats. We accept MP3, WAV, and FLAC up to 50MB. If your file fits, please retry — and if it still fails, an agent will pick this up shortly.';
  } else if (category === 'account' && /password/.test(text)) {
    suggestion = 'For password issues, please use the password-reset flow on the login screen. If the reset email does not arrive in 5 minutes, an agent will help recover your account.';
  } else if (category === 'ai_tools') {
    suggestion = 'AI generations can take up to 5 minutes for video and 60 seconds for thumbnails. If your generation has been queued for longer than that, an agent will investigate.';
  }
  return { category, priority, suggestion };
}

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = TicketSchema.parse(req.body);
    const triage = aiTriage(data.subject, data.description);
    const r = await pool.query(
      `INSERT INTO support_tickets (user_id, subject, description, category, priority)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, data.subject, data.description, triage.category, triage.priority]
    );
    res.status(201).json({ ticket: r.rows[0], ai_suggestion: triage.suggestion });
  } catch (e) { next(e); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ tickets: r.rows });
  } catch (e) { next(e); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'ticket_not_found');
    res.json({ ticket: r.rows[0] });
  } catch (e) { next(e); }
});

export default router;
