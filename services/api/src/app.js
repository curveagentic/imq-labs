// Express app factory. Used by local server.js and serverless platform wrappers.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { pool } from './lib/db.js';
import { errorHandler } from './middleware/error.js';
import auth          from './routes/auth.js';
import users         from './routes/users.js';
import artists       from './routes/artists.js';
import tracks        from './routes/tracks.js';
import playlists     from './routes/playlists.js';
import streams       from './routes/streams.js';
import support       from './routes/support.js';
import ai            from './routes/ai.js';
import storage       from './routes/storage.js';
import collaborators from './routes/collaborators.js';
import messages      from './routes/messages.js';
import create        from './routes/create.js';
import monetize      from './routes/monetize.js';
import stats         from './routes/stats.js';

export function buildApp() {
  const app = express();

  const WEB_ORIGIN = (process.env.WEB_ORIGIN || 'http://localhost:3030,http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(cors({
    // Allow listed origins, plus any same-origin / no-origin (curl, server-side) calls.
    origin: (origin, cb) => {
      if (!origin || WEB_ORIGIN.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));

  const healthHandler = async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'up' });
    } catch (e) {
      res.status(503).json({ status: 'degraded', db: 'down', error: e.message });
    }
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  app.use('/api/auth', auth);
  app.use('/api/users', users);
  app.use('/api/artists', artists);
  app.use('/api/tracks', tracks);
  app.use('/api/playlists', playlists);
  app.use('/api/streams', streams);
  app.use('/api/support', support);
  app.use('/api/ai', ai);
  app.use('/api/collaborators', collaborators);
  app.use('/api/messages', messages);
  app.use('/api/create', create);
  app.use('/api/monetize', monetize);
  app.use('/api/stats', stats);
  app.use('/storage', storage);
  app.use('/api/storage', storage);

  app.use(errorHandler);

  return app;
}
