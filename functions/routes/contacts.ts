import { Hono } from 'hono';
import { generateId } from '../lib/auth';
import { parsePagination, paginationMeta } from '../lib/pagination';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

// List contacts
app.get('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const { page, limit, offset } = parsePagination(c.req.query());
  const search = c.req.query('search');
  const source = c.req.query('source');

  let where = 'WHERE c.org_id = ?';
  const params: any[] = [auth.org_id];

  if (search) {
    where += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.company LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (source) {
    where += ' AND c.source = ?';
    params.push(source);
  }

  const countResult = await db.prepare(`SELECT COUNT(*) as count FROM contacts c ${where}`).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const contacts = await db.prepare(
    `SELECT c.*, u.first_name as owner_first, u.last_name as owner_last
     FROM contacts c LEFT JOIN users u ON c.owner_id = u.id
     ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({ data: contacts.results, meta: paginationMeta(total, page, limit) });
});

// Create contact
app.post('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();
  const { first_name, last_name, email, phone, company, job_title, address, city, state, zip, source, tags } = body;

  if (!first_name || !last_name) {
    return c.json({ error: 'First name and last name are required' }, 400);
  }

  const id = generateId();
  await db.prepare(
    `INSERT INTO contacts (id, org_id, owner_id, first_name, last_name, email, phone, company, job_title, address, city, state, zip, source, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.org_id, auth.user_id, first_name, last_name, email || null, phone || null, company || null, job_title || null, address || null, city || null, state || null, zip || null, source || 'manual', tags ? JSON.stringify(tags) : '[]').run();

  // Log activity
  await db.prepare(
    'INSERT INTO activities (id, org_id, user_id, contact_id, type, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), auth.org_id, auth.user_id, id, 'contact_created', `Created contact ${first_name} ${last_name}`).run();

  const contact = await db.prepare('SELECT * FROM contacts WHERE id = ?').bind(id).first();
  return c.json({ data: contact }, 201);
});

// Get single contact
app.get('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');

  const contact = await db.prepare('SELECT * FROM contacts WHERE id = ? AND org_id = ?').bind(id, auth.org_id).first();
  if (!contact) return c.json({ error: 'Contact not found' }, 404);

  const activities = await db.prepare(
    'SELECT a.*, u.first_name as user_first, u.last_name as user_last FROM activities a LEFT JOIN users u ON a.user_id = u.id WHERE a.contact_id = ? AND a.org_id = ? ORDER BY a.created_at DESC LIMIT 50'
  ).bind(id, auth.org_id).all();

  const deals = await db.prepare(
    'SELECT * FROM deals WHERE contact_id = ? AND org_id = ? ORDER BY created_at DESC'
  ).bind(id, auth.org_id).all();

  const tasks = await db.prepare(
    'SELECT * FROM tasks WHERE contact_id = ? AND org_id = ? ORDER BY due_date ASC'
  ).bind(id, auth.org_id).all();

  const notes = await db.prepare(
    'SELECT n.*, u.first_name as author_first, u.last_name as author_last FROM notes n LEFT JOIN users u ON n.author_id = u.id WHERE n.contact_id = ? AND n.org_id = ? ORDER BY n.is_pinned DESC, n.created_at DESC'
  ).bind(id, auth.org_id).all();

  return c.json({ data: { ...contact, activities: activities.results, deals: deals.results, tasks: tasks.results, notes: notes.results } });
});

// Update contact
app.put('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.prepare('SELECT * FROM contacts WHERE id = ? AND org_id = ?').bind(id, auth.org_id).first();
  if (!existing) return c.json({ error: 'Contact not found' }, 404);

  const fields = ['first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'address', 'city', 'state', 'zip', 'source', 'owner_id'];
  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const values: any[] = [];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (body.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(body.tags));
  }

  values.push(id, auth.org_id);
  await db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...values).run();

  await db.prepare(
    'INSERT INTO activities (id, org_id, user_id, contact_id, type, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), auth.org_id, auth.user_id, id, 'contact_updated', 'Updated contact details').run();

  const contact = await db.prepare('SELECT * FROM contacts WHERE id = ?').bind(id).first();
  return c.json({ data: contact });
});

// Delete contact
app.delete('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  await db.prepare('DELETE FROM contacts WHERE id = ? AND org_id = ?').bind(id, auth.org_id).run();
  return c.json({ success: true });
});

export { app as contactRoutes };
