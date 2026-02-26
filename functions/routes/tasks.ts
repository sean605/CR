import { Hono } from 'hono';
import { generateId } from '../lib/auth';
import { parsePagination, paginationMeta } from '../lib/pagination';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const { page, limit, offset } = parsePagination(c.req.query());
  const status = c.req.query('status');
  const assigned_to = c.req.query('assigned_to');
  const priority = c.req.query('priority');

  let where = 'WHERE t.org_id = ?';
  const params: any[] = [auth.org_id];

  if (status) { where += ' AND t.status = ?'; params.push(status); }
  if (assigned_to) { where += ' AND t.assigned_to = ?'; params.push(assigned_to); }
  if (priority) { where += ' AND t.priority = ?'; params.push(priority); }

  const countResult = await db.prepare(`SELECT COUNT(*) as count FROM tasks t ${where}`).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const tasks = await db.prepare(
    `SELECT t.*, u.first_name as assignee_first, u.last_name as assignee_last,
     ct.first_name as contact_first, ct.last_name as contact_last
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN contacts ct ON t.contact_id = ct.id
     ${where} ORDER BY CASE t.status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.due_date ASC NULLS LAST LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({ data: tasks.results, meta: paginationMeta(total, page, limit) });
});

app.get('/upcoming', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const tasks = await db.prepare(
    `SELECT t.*, ct.first_name as contact_first, ct.last_name as contact_last
     FROM tasks t LEFT JOIN contacts ct ON t.contact_id = ct.id
     WHERE t.org_id = ? AND t.assigned_to = ? AND t.status IN ('pending', 'in_progress')
     ORDER BY t.due_date ASC NULLS LAST LIMIT 10`
  ).bind(auth.org_id, auth.user_id).all();
  return c.json({ data: tasks.results });
});

app.post('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.title) return c.json({ error: 'Title is required' }, 400);

  const id = generateId();
  await db.prepare(
    `INSERT INTO tasks (id, org_id, created_by, assigned_to, contact_id, deal_id, lead_id, title, description, type, priority, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.org_id, auth.user_id, body.assigned_to || auth.user_id, body.contact_id || null, body.deal_id || null, body.lead_id || null, body.title, body.description || null, body.type || 'todo', body.priority || 'medium', body.due_date || null).run();

  await db.prepare(
    'INSERT INTO activities (id, org_id, user_id, contact_id, deal_id, task_id, type, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), auth.org_id, auth.user_id, body.contact_id || null, body.deal_id || null, id, 'task_created', `Task "${body.title}" created`).run();

  const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return c.json({ data: task }, 201);
});

app.get('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND org_id = ?').bind(c.req.param('id'), auth.org_id).first();
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json({ data: task });
});

app.put('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.prepare('SELECT * FROM tasks WHERE id = ? AND org_id = ?').bind(id, auth.org_id).first<any>();
  if (!existing) return c.json({ error: 'Task not found' }, 404);

  const fields = ['title', 'description', 'type', 'priority', 'status', 'due_date', 'assigned_to', 'contact_id', 'deal_id'];
  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const values: any[] = [];

  for (const field of fields) {
    if (body[field] !== undefined) { updates.push(`${field} = ?`); values.push(body[field]); }
  }

  if (body.status === 'completed' && existing.status !== 'completed') {
    updates.push('completed_at = datetime(\'now\')');
    await db.prepare(
      'INSERT INTO activities (id, org_id, user_id, contact_id, deal_id, task_id, type, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(generateId(), auth.org_id, auth.user_id, existing.contact_id, existing.deal_id, id, 'task_completed', `Task "${existing.title}" completed`).run();
  }

  values.push(id, auth.org_id);
  await db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...values).run();

  const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return c.json({ data: task });
});

app.delete('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ? AND org_id = ?').bind(c.req.param('id'), auth.org_id).run();
  return c.json({ success: true });
});

export { app as taskRoutes };
