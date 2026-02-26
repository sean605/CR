import { Hono } from 'hono';
import { generateId } from '../lib/auth';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const rules = await c.env.DB.prepare(
    'SELECT * FROM automation_rules WHERE org_id = ? ORDER BY created_at DESC'
  ).bind(auth.org_id).all();
  return c.json({ data: rules.results });
});

app.post('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.name || !body.trigger_type || !body.action_type) {
    return c.json({ error: 'Name, trigger_type, and action_type are required' }, 400);
  }

  const id = generateId();
  await db.prepare(
    'INSERT INTO automation_rules (id, org_id, created_by, name, trigger_type, trigger_config, action_type, action_config) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, auth.org_id, auth.user_id, body.name, body.trigger_type, JSON.stringify(body.trigger_config || {}), body.action_type, JSON.stringify(body.action_config || {})).run();

  const rule = await db.prepare('SELECT * FROM automation_rules WHERE id = ?').bind(id).first();
  return c.json({ data: rule }, 201);
});

app.put('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const values: any[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
  if (body.trigger_type !== undefined) { updates.push('trigger_type = ?'); values.push(body.trigger_type); }
  if (body.trigger_config !== undefined) { updates.push('trigger_config = ?'); values.push(JSON.stringify(body.trigger_config)); }
  if (body.action_type !== undefined) { updates.push('action_type = ?'); values.push(body.action_type); }
  if (body.action_config !== undefined) { updates.push('action_config = ?'); values.push(JSON.stringify(body.action_config)); }

  values.push(id, auth.org_id);
  await db.prepare(`UPDATE automation_rules SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...values).run();

  const rule = await db.prepare('SELECT * FROM automation_rules WHERE id = ?').bind(id).first();
  return c.json({ data: rule });
});

app.put('/:id/toggle', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const rule = await db.prepare('SELECT is_active FROM automation_rules WHERE id = ? AND org_id = ?').bind(id, auth.org_id).first<any>();
  if (!rule) return c.json({ error: 'Rule not found' }, 404);

  await db.prepare('UPDATE automation_rules SET is_active = ? WHERE id = ?').bind(rule.is_active ? 0 : 1, id).run();
  return c.json({ data: { is_active: !rule.is_active } });
});

app.delete('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  await c.env.DB.prepare('DELETE FROM automation_rules WHERE id = ? AND org_id = ?').bind(c.req.param('id'), auth.org_id).run();
  return c.json({ success: true });
});

export { app as automationRoutes };
