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

export default function vercelApi(req, res) {
  if (req.url?.startsWith('/api/__ping')) {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  return handler(req, res);
}
