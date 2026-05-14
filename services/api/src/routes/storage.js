// Storage passthrough route.
//
//   - With STORAGE_DRIVER=supabase (production on Netlify), this route just
//     302-redirects to the Supabase Storage public URL for the given key.
//     The expected DB shape is that audio_file_url / cover_art_url already
//     point at Supabase directly; this redirect is for backwards-compat with
//     any legacy rows that still store /storage/<key>-style URLs.
//
//   - With STORAGE_DRIVER=local (dev), serves the file from disk with HTTP
//     range support so `<audio>` seeks correctly.

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { localPathForKey, publicUrlForKey, storageInfo } from '../lib/storage.js';

const router = Router();

const TYPES = {
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',  '.ogg': 'audio/ogg', '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif',
};

router.get(/.+/, (req, res) => {
  const key = decodeURIComponent(req.path.replace(/^\//, ''));
  if (!key || key.includes('..')) return res.status(400).end();

  if (storageInfo.driver === 'supabase') {
    return res.redirect(302, publicUrlForKey(key));
  }

  const full = localPathForKey(key);
  if (!fs.existsSync(full)) return res.status(404).end();

  const stat = fs.statSync(full);
  const ext  = path.extname(full).toLowerCase();
  const contentType = TYPES[ext] || 'application/octet-stream';
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? Number(m[1]) : 0;
    const end   = m && m[2] ? Number(m[2]) : stat.size - 1;
    if (start >= stat.size || end >= stat.size) {
      res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
      return;
    }
    res.status(206)
      .setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
      .setHeader('Content-Length', end - start + 1)
      .setHeader('Content-Type', contentType);
    fs.createReadStream(full, { start, end }).pipe(res);
  } else {
    res.status(200)
      .setHeader('Content-Length', stat.size)
      .setHeader('Content-Type', contentType);
    fs.createReadStream(full).pipe(res);
  }
});

export default router;
