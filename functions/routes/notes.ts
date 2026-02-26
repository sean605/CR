import { Hono } from 'hono';
import { generateId } from '../lib/auth';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.content) return c.json({ error: 'Content is required' }, 400);
  if (!body.contact_id && !body.deal_id) return c.json({ error: 'Contact or deal is required' }, 400);

  const id = generateId();
  await db.prepare(
    'INSERT INTO notes (id, org_id, author_id, contact_id, deal_id, content) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, auth.org_id, auth.user_id, body.contact_id || null, body.deal_id || null, body.content).run();

  await db.prepare(
    'INSERT INTO activities (id, org_id, user_id, contact_id, deal_id, type, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), auth.org_id, auth.user_id, body.contact_id || null, body.deal_id || null, 'note_added', 'Added a note').run();

  const note = await db.prepare(
    'SELECT n.*, u.first_name as author_first, u.last_name as author_last FROM notes n JOIN users u ON n.author_id = u.id WHERE n.id = ?'
  ).bind(id).first();
  return c.json({ data: note }, 201);
});

app.put('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  await db.prepare('UPDATE notes SET content = ?, updated_at = datetime(\'now\') WHERE id = ? AND org_id = ?').bind(body.content, id, auth.org_id).run();
  const note = await db.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  return c.json({ data: note });
});

app.put('/:id/pin', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const note = await db.prepare('SELECT is_pinned FROM notes WHERE id = ? AND org_id = ?').bind(id, auth.org_id).first<any>();
  if (!note) return c.json({ error: 'Note not found' }, 404);
  await db.prepare('UPDATE notes SET is_pinned = ? WHERE id = ?').bind(note.is_pinned ? 0 : 1, id).run();
  return c.json({ data: { is_pinned: !note.is_pinned } });
});

app.delete('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  await c.env.DB.prepare('DELETE FROM notes WHERE id = ? AND org_id = ?').bind(c.req.param('id'), auth.org_id).run();
  return c.json({ success: true });
});

export { app as noteRoutes };
