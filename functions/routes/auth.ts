import { Hono } from 'hono';
import { generateId, hashPassword, verifyPassword, signJWT } from '../lib/auth';
import type { Env, AuthPayload } from '../lib/types';
import { authMiddleware } from '../lib/middleware';

const app = new Hono<{ Bindings: Env }>();

// Register (creates org + admin user)
app.post('/register', async (c) => {
  const { org_name, first_name, last_name, email, password } = await c.req.json();
  if (!org_name || !first_name || !last_name || !email || !password) {
    return c.json({ error: 'All fields are required' }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const db = c.env.DB;
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  const orgId = generateId();
  const userId = generateId();
  const slug = org_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const passwordHash = await hashPassword(password);

  await db.batch([
    db.prepare('INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)').bind(orgId, org_name, slug + '-' + orgId.slice(0, 6)),
    db.prepare(
      'INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, orgId, email, passwordHash, first_name, last_name, 'admin'),
  ]);

  const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
  const payload: AuthPayload = {
    sub: userId, org: orgId, role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  };
  const token = await signJWT(payload, secret);

  return c.json({
    token,
    user: { id: userId, org_id: orgId, email, first_name, last_name, role: 'admin', avatar_url: null, phone: null, is_active: 1, last_login_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  }, 201);
});

// Login
app.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const db = c.env.DB;
  const user = await db.prepare(
    'SELECT id, org_id, email, password_hash, first_name, last_name, role, avatar_url, phone, is_active, last_login_at, created_at, updated_at FROM users WHERE email = ?'
  ).bind(email).first<any>();

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  if (!user.is_active) {
    return c.json({ error: 'Account is disabled' }, 403);
  }

  await db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').bind(user.id).run();

  const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
  const payload: AuthPayload = {
    sub: user.id, org: user.org_id, role: user.role,
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  };
  const token = await signJWT(payload, secret);

  const { password_hash, ...safeUser } = user;
  return c.json({ token, user: safeUser });
});

// Get current user
app.get('/me', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const db = c.env.DB;
  const user = await db.prepare(
    'SELECT id, org_id, email, first_name, last_name, role, avatar_url, phone, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?'
  ).bind(auth.user_id).first();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ user });
});

export { app as authRoutes };
