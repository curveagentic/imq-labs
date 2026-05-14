// Local-only entry. On Netlify the Function handler in
// netlify/functions/api.js imports buildApp() directly.

import 'dotenv/config';
import path from 'node:path';
import fs   from 'node:fs';
import { buildApp } from './app.js';

const app  = buildApp();
const PORT = Number(process.env.PORT || 4000);

// Ensure local-disk storage exists when running with STORAGE_DRIVER=local.
if ((process.env.STORAGE_DRIVER || 'local').toLowerCase() === 'local') {
  const localDir = path.resolve(process.env.STORAGE_LOCAL_DIR || '../../infra/storage/data');
  fs.mkdirSync(localDir, { recursive: true });
  console.log(`[afrostream-api] storage dir: ${localDir}`);
}

app.listen(PORT, () => {
  console.log(`[afrostream-api] listening on :${PORT}`);
});
