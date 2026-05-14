// Storage abstraction with two drivers:
//   - "supabase" (default in production): Supabase Storage bucket, public URLs.
//   - "local"   (dev fallback): writes to disk for offline development.
//
// All consumers should use saveBuffer / saveStream / saveFromUrl / keyForUpload.
// The return value of save* is the URL to persist in the DB.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DRIVER = (process.env.STORAGE_DRIVER || (process.env.SUPABASE_URL ? 'supabase' : 'local')).toLowerCase();

// ---- Supabase driver -------------------------------------------------------
const SUPABASE_URL    = process.env.SUPABASE_URL || '';
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const BUCKET          = process.env.SUPABASE_STORAGE_BUCKET || 'imq-labs';

let supabase = null;
if (DRIVER === 'supabase') {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Storage driver=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}

// ---- Local-disk driver -----------------------------------------------------
const LOCAL_DIR  = path.resolve(process.env.STORAGE_LOCAL_DIR || '../../infra/storage/data');
const LOCAL_BASE = (process.env.STORAGE_PUBLIC_BASE_URL || 'http://localhost:4000/storage').replace(/\/$/, '');
if (DRIVER === 'local') fs.mkdirSync(LOCAL_DIR, { recursive: true });

// ---- Public helpers --------------------------------------------------------
export function keyForUpload(prefix, originalName) {
  const ext  = path.extname(originalName || '').toLowerCase();
  const id   = crypto.randomBytes(12).toString('hex');
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}/${date}/${id}${ext}`;
}

export function publicUrlForKey(key) {
  if (DRIVER === 'supabase') {
    return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  }
  return `${LOCAL_BASE}/${key}`;
}

export function localPathForKey(key) {
  // Only meaningful for the local driver; the /storage/* express route uses it.
  return path.join(LOCAL_DIR, key);
}

const MIME = {
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',  '.ogg': 'audio/ogg', '.webm': 'audio/webm',
  '.mp4': 'video/mp4',
  '.png': 'image/png',  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif',
};
function contentTypeForKey(key) {
  return MIME[path.extname(key).toLowerCase()] || 'application/octet-stream';
}

export async function saveBuffer(key, buffer) {
  if (DRIVER === 'supabase') {
    const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
      contentType: contentTypeForKey(key),
      upsert: true,
    });
    if (error) throw new Error(`supabase upload failed: ${error.message}`);
    return publicUrlForKey(key);
  }
  const full = path.join(LOCAL_DIR, key);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buffer);
  return publicUrlForKey(key);
}

export async function saveStream(key, readStream) {
  if (DRIVER === 'supabase') {
    const chunks = [];
    for await (const chunk of readStream) chunks.push(chunk);
    return saveBuffer(key, Buffer.concat(chunks));
  }
  const full = path.join(LOCAL_DIR, key);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(full);
    readStream.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
  return publicUrlForKey(key);
}

export async function saveFromUrl(key, url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`storage saveFromUrl: ${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return saveBuffer(key, buf);
}

export const storageInfo = {
  driver: DRIVER,
  bucket: BUCKET,
  supabaseUrl: SUPABASE_URL || null,
};
