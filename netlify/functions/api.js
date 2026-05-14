// Netlify Function: wraps the IMQ Labs Express app as a serverless handler.
// Mounted at /.netlify/functions/api. netlify.toml redirects /api/* and
// /storage/* to this function so the existing route paths keep working.

import serverless from 'serverless-http';
import { buildApp } from '../../services/api/src/app.js';

const app = buildApp();

// serverless-http translates AWS-Lambda / Netlify event objects into Express
// requests. We bump the binary types so file uploads and binary responses
// (audio/image) survive the function boundary.
export const handler = serverless(app, {
  binary: [
    'application/octet-stream',
    'audio/*',
    'video/*',
    'image/*',
    'multipart/form-data',
  ],
});
