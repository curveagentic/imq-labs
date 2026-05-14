import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_only_change_me';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
  } catch { /* ignore */ }
  next();
}
