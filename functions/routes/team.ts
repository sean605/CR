import { Hono } from 'hono';
import { generateId, hashPassword } from '../lib/auth';
import { requireRole } from '../lib/middleware';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const members = await c.env.DB.prepare(
    'SELECT id, org_id, email, first_name, last_name, role, avatar_url, phone, is_active, last_login_at, created_at FROM users WHERE org_id = ? ORDER BY created_at ASC'
  ).bind(auth.org_id).all();
  return c.json({ data: members.results });
});

app.post('/invite', requireRole('admin', 'manager'), async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.email || !body.first_name || !body.last_name) {
    return c.json({ error: 'Email, first name, and last name are required' }, 400);
  }

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  const id = generateId();
  const tempPassword = generateId().slice(0, 12);
  const passwordHash = await hashPassword(tempPassword);

  await db.prepare(
    'INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, auth.org_id, body.email, passwordHash, body.first_name, body.last_name, body.role || 'agent').run();

  return c.json({ data: { id, email: body.email, temp_password: tempPassword, first_name: body.first_name, last_name: body.last_name, role: body.role || 'agent' } }, 201);
});

app.put('/:id', requireRole('admin'), async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  if (body.role) {
    await db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ? AND org_id = ?').bind(body.role, id, auth.org_id).run();
  }
  if (body.is_active !== undefined) {
    await db.prepare('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ? AND org_id = ?').bind(body.is_active ? 1 : 0, id, auth.org_id).run();
  }

  const user = await db.prepare('SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?').bind(id).first();
  return c.json({ data: user });
});

app.delete('/:id', requireRole('admin'), async (c) => {
  const auth = c.get('auth') as AuthContext;
  const id = c.req.param('id');
  if (id === auth.user_id) return c.json({ error: 'Cannot remove yourself' }, 400);
  await c.env.DB.prepare('DELETE FROM users WHERE id = ? AND org_id = ?').bind(id, auth.org_id).run();
  return c.json({ success: true });
});

export { app as teamRoutes };
