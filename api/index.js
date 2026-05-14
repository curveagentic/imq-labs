import serverless from 'serverless-http';
import { buildApp } from '../services/api/src/app.js';

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

export default function vercelApi(req, res) {
  rebuildUrl(req);

  if (req.url?.startsWith('/api/__ping')) {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  return handler(req, res);
}
