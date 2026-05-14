import serverless from 'serverless-http';
import bcrypt from 'bcryptjs';
import { buildApp } from '../services/api/src/app.js';
import { pool } from '../services/api/src/lib/db.js';
import { signToken } from '../services/api/src/middleware/auth.js';

const app = buildApp();
const handler = serverless(app, {
  binary: [
    'application/octet-stream',
    'audio/*',
    'video/*',
    'image/*',
    'multipart/form-data',
  ],
});

function normalizePath(path) {
  if (!path) return null;
  if (Array.isArray(path)) return path.join('/');
  return String(path);
}

function rebuildUrl(req) {
  const routedPath = normalizePath(req.query?.path);
  if (!routedPath) return;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'path') continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item !== undefined) params.append(key, String(item));
    }
  }

  const cleanPath = routedPath.startsWith('/') ? routedPath : `/${routedPath}`;
  const search = params.toString();
  req.url = search ? `${cleanPath}?${search}` : cleanPath;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function withTimeout(promise, millis) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('operation_timeout')), millis);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(text || '{}');
}

async function handleHealth(_req, res) {
  try {
    await withTimeout(pool.query('SELECT 1'), 8000);
    json(res, 200, { status: 'ok', db: 'up' });
  } catch (error) {
    json(res, 503, { status: 'degraded', db: 'down', error: error.message });
  }
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    json(res, 405, { error: 'method_not_allowed' });
    return;
  }

  try {
    const { email, password } = await readJson(req);
    if (!email || !password) {
      json(res, 400, { error: 'validation_error' });
      return;
    }

    const result = await withTimeout(
      pool.query(
        'SELECT id, email, username, full_name, role, password_hash FROM users WHERE email = $1',
        [email]
      ),
      8000
    );
    if (result.rowCount === 0) {
      json(res, 401, { error: 'invalid_credentials' });
      return;
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      json(res, 401, { error: 'invalid_credentials' });
      return;
    }

    let artist = null;
    if (user.role === 'artist') {
      const artistResult = await withTimeout(
        pool.query('SELECT id, stage_name, country FROM artists WHERE user_id = $1', [user.id]),
        8000
      );
      artist = artistResult.rows[0] || null;
    }

    delete user.password_hash;
    json(res, 200, { token: signToken(user), user, artist });
  } catch (error) {
    json(res, 500, { error: error.message || 'internal_error' });
  }
}

export default async function vercelApi(req, res) {
  rebuildUrl(req);

  if (req.url?.startsWith('/api/__ping')) {
    json(res, 200, { ok: true });
    return;
  }

  if (req.url === '/health' || req.url === '/api/health') {
    await handleHealth(req, res);
    return;
  }

  if (req.url === '/api/auth/login') {
    await handleLogin(req, res);
    return;
  }

  return handler(req, res);
}
