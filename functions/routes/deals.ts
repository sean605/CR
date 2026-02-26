import { Hono } from 'hono';
import { generateId } from '../lib/auth';
import { parsePagination, paginationMeta } from '../lib/pagination';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

// List deals
app.get('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const { page, limit, offset } = parsePagination(c.req.query());
  const stage = c.req.query('stage');
  const assigned_to = c.req.query('assigned_to');

  let where = 'WHERE d.org_id = ?';
  const params: any[] = [auth.org_id];

  if (stage) { where += ' AND d.stage = ?'; params.push(stage); }
  if (assigned_to) { where += ' AND d.assigned_to = ?'; params.push(assigned_to); }

  const countResult = await db.prepare(`SELECT COUNT(*) as count FROM deals d ${where}`).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const deals = await db.prepare(
    `SELECT d.*, ct.first_name as contact_first, ct.last_name as contact_last, ct.email as contact_email,
     u.first_name as assignee_first, u.last_name as assignee_last
     FROM deals d
     JOIN contacts ct ON d.contact_id = ct.id
     LEFT JOIN users u ON d.assigned_to = u.id
     ${where} ORDER BY d.position ASC, d.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({ data: deals.results, meta: paginationMeta(total, page, limit) });
});

// Get pipeline (grouped by stage)
app.get('/pipeline', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;

  const deals = await db.prepare(
    `SELECT d.*, ct.first_name as contact_first, ct.last_name as contact_last,
     u.first_name as assignee_first, u.last_name as assignee_last
     FROM deals d
     JOIN contacts ct ON d.contact_id = ct.id
     LEFT JOIN users u ON d.assigned_to = u.id
     WHERE d.org_id = ? ORDER BY d.position ASC, d.created_at DESC`
  ).bind(auth.org_id).all();

  const stages = ['discovery', 'proposal', 'negotiation', 'contract', 'closed_won', 'closed_lost'];
  const pipeline: Record<string, any[]> = {};
  for (const stage of stages) pipeline[stage] = [];
  for (const deal of deals.results) {
    const stage = (deal as any).stage;
    if (pipeline[stage]) pipeline[stage].push(deal);
  }

  return c.json({ data: pipeline });
});

// Create deal
app.post('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.title || !body.contact_id) {
    return c.json({ error: 'Title and contact are required' }, 400);
  }

  const id = generateId();
  const maxPos = await db.prepare(
    'SELECT MAX(position) as max_pos FROM deals WHERE org_id = ? AND stage = ?'
  ).bind(auth.org_id, body.stage || 'discovery').first<{ max_pos: number | null }>();

  await db.prepare(
    `INSERT INTO deals (id, org_id, contact_id, lead_id, assigned_to, title, stage, value, probability, expected_close_date, property_address, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, auth.org_id, body.contact_id, body.lead_id || null, body.assigned_to || auth.user_id, body.title, body.stage || 'discovery', body.value || 0, body.probability || 10, body.expected_close_date || null, body.property_address || null, (maxPos?.max_pos || 0) + 1).run();

  await db.prepare(
    'INSERT INTO activities (id, org_id, user_id, contact_id, deal_id, type, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), auth.org_id, auth.user_id, body.contact_id, id, 'deal_created', `Deal "${body.title}" created`).run();

  const deal = await db.prepare('SELECT * FROM deals WHERE id = ?').bind(id).first();
  return c.json({ data: deal }, 201);
});

// Get single deal
app.get('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');

  const deal = await db.prepare(
    `SELECT d.*, ct.first_name as contact_first, ct.last_name as contact_last, ct.email as contact_email, ct.phone as contact_phone,
     u.first_name as assignee_first, u.last_name as assignee_last
     FROM deals d JOIN contacts ct ON d.contact_id = ct.id LEFT JOIN users u ON d.assigned_to = u.id
     WHERE d.id = ? AND d.org_id = ?`
  ).bind(id, auth.org_id).first();
  if (!deal) return c.json({ error: 'Deal not found' }, 404);

  const activities = await db.prepare(
    'SELECT a.*, u.first_name as user_first, u.last_name as user_last FROM activities a LEFT JOIN users u ON a.user_id = u.id WHERE a.deal_id = ? ORDER BY a.created_at DESC LIMIT 50'
  ).bind(id).all();

  const tasks = await db.prepare('SELECT * FROM tasks WHERE deal_id = ? AND org_id = ? ORDER BY due_date ASC').bind(id, auth.org_id).all();
  const notes = await db.prepare('SELECT n.*, u.first_name as author_first, u.last_name as author_last FROM notes n LEFT JOIN users u ON n.author_id = u.id WHERE n.deal_id = ? ORDER BY n.is_pinned DESC, n.created_at DESC').bind(id).all();

  return c.json({ data: { ...deal, activities: activities.results, tasks: tasks.results, notes: notes.results } });
});

// Update deal
app.put('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.prepare('SELECT * FROM deals WHERE id = ? AND org_id = ?').bind(id, auth.org_id).first<any>();
  if (!existing) return c.json({ error: 'Deal not found' }, 404);

  const fields = ['title', 'stage', 'value', 'probability', 'expected_close_date', 'actual_close_date', 'property_address', 'assigned_to', 'lost_reason', 'position', 'commission_rate'];
  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const values: any[] = [];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  values.push(id, auth.org_id);
  await db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...values).run();

  if (body.stage && body.stage !== existing.stage) {
    const type = body.stage === 'closed_won' ? 'deal_won' : body.stage === 'closed_lost' ? 'deal_lost' : 'deal_stage_changed';
    await db.prepare(
      'INSERT INTO activities (id, org_id, user_id, contact_id, deal_id, type, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(generateId(), auth.org_id, auth.user_id, existing.contact_id, id, type, `Deal moved from ${existing.stage} to ${body.stage}`, JSON.stringify({ old_stage: existing.stage, new_stage: body.stage })).run();
  }

  const deal = await db.prepare('SELECT * FROM deals WHERE id = ?').bind(id).first();
  return c.json({ data: deal });
});

// Reorder deals (for Kanban drag-and-drop)
app.put('/reorder', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const { deals } = await c.req.json();

  if (!Array.isArray(deals)) return c.json({ error: 'Invalid data' }, 400);

  const stmts = deals.map((d: { id: string; stage: string; position: number }) =>
    db.prepare('UPDATE deals SET stage = ?, position = ?, updated_at = datetime(\'now\') WHERE id = ? AND org_id = ?')
      .bind(d.stage, d.position, d.id, auth.org_id)
  );

  if (stmts.length > 0) await db.batch(stmts);
  return c.json({ success: true });
});

// Delete deal
app.delete('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  await c.env.DB.prepare('DELETE FROM deals WHERE id = ? AND org_id = ?').bind(c.req.param('id'), auth.org_id).run();
  return c.json({ success: true });
});

export { app as dealRoutes };
