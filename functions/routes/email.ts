import { Hono } from 'hono';
import { generateId } from '../lib/auth';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

// List templates
app.get('/templates', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const templates = await c.env.DB.prepare(
    'SELECT * FROM email_templates WHERE org_id = ? ORDER BY created_at DESC'
  ).bind(auth.org_id).all();
  return c.json({ data: templates.results });
});

// Create template
app.post('/templates', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.name || !body.subject || !body.body) return c.json({ error: 'Name, subject, and body are required' }, 400);

  const id = generateId();
  await db.prepare(
    'INSERT INTO email_templates (id, org_id, created_by, name, subject, body, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, auth.org_id, auth.user_id, body.name, body.subject, body.body, body.category || 'general').run();

  const template = await db.prepare('SELECT * FROM email_templates WHERE id = ?').bind(id).first();
  return c.json({ data: template }, 201);
});

// Update template
app.put('/templates/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const fields = ['name', 'subject', 'body', 'category', 'is_shared'];
  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const values: any[] = [];
  for (const field of fields) {
    if (body[field] !== undefined) { updates.push(`${field} = ?`); values.push(body[field]); }
  }
  values.push(id, auth.org_id);
  await db.prepare(`UPDATE email_templates SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...values).run();

  const template = await db.prepare('SELECT * FROM email_templates WHERE id = ?').bind(id).first();
  return c.json({ data: template });
});

app.delete('/templates/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  await c.env.DB.prepare('DELETE FROM email_templates WHERE id = ? AND org_id = ?').bind(c.req.param('id'), auth.org_id).run();
  return c.json({ success: true });
});

// Send email (log only - no actual sending)
app.post('/send', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.to_email || !body.subject || !body.body) return c.json({ error: 'to_email, subject, and body are required' }, 400);

  const id = generateId();
  await db.prepare(
    'INSERT INTO email_log (id, org_id, sent_by, contact_id, deal_id, template_id, to_email, subject, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, auth.org_id, auth.user_id, body.contact_id || null, body.deal_id || null, body.template_id || null, body.to_email, body.subject, body.body).run();

  if (body.contact_id) {
    await db.prepare(
      'INSERT INTO activities (id, org_id, user_id, contact_id, deal_id, type, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(generateId(), auth.org_id, auth.user_id, body.contact_id, body.deal_id || null, 'email_sent', `Email sent: ${body.subject}`).run();
  }

  return c.json({ data: { id, status: 'sent' } }, 201);
});

// Email log
app.get('/log', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const log = await c.env.DB.prepare(
    'SELECT * FROM email_log WHERE org_id = ? ORDER BY sent_at DESC LIMIT 100'
  ).bind(auth.org_id).all();
  return c.json({ data: log.results });
});

export { app as emailRoutes };
