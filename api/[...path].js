import serverless from 'serverless-http';
import { buildApp } from '../services/api/src/app.js';

const app = buildApp();

export default serverless(app, {
  binary: [
    'application/octet-stream',
    'audio/*',
    'video/*',
    'image/*',
    'multipart/form-data',
  ],
});
