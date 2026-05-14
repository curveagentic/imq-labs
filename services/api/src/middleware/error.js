export function errorHandler(err, _req, res, _next) {
  console.error('[api error]', err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'validation_error', issues: err.issues });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  res.status(500).json({ error: 'internal_error' });
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
