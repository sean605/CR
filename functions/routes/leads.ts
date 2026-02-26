import { Hono } from 'hono';
import { generateId } from '../lib/auth';
import { parsePagination, paginationMeta } from '../lib/pagination';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

// List leads
app.get('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const { page, limit, offset } = parsePagination(c.req.query());
  const status = c.req.query('status');
  const temperature = c.req.query('temperature');
  const assigned_to = c.req.query('assigned_to');
  const search = c.req.query('search');

  let where = 'WHERE l.org_id = ?';
  const params: any[] = [auth.org_id];

  if (status) { where += ' AND l.status = ?'; params.push(status); }
  if (temperature) { where += ' AND l.temperature = ?'; params.push(temperature); }
  if (assigned_to) { where += ' AND l.assigned_to = ?'; params.push(assigned_to); }
  if (search) {
    where += ' AND (ct.first_name LIKE ? OR ct.last_name LIKE ? OR ct.email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const countResult = await db.prepare(
    `SELECT COUNT(*) as count FROM leads l JOIN contacts ct ON l.contact_id = ct.id ${where}`
  ).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const leads = await db.prepare(
    `SELECT l.*, ct.first_name as contact_first, ct.last_name as contact_last, ct.email as contact_email, ct.phone as contact_phone, ct.company as contact_company,
     u.first_name as assignee_first, u.last_name as assignee_last
     FROM leads l
     JOIN contacts ct ON l.contact_id = ct.id
     LEFT JOIN users u ON l.assigned_to = u.id
     ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({ data: leads.results, meta: paginationMeta(total, page, limit) });
});

// Create lead (also creates contact)
app.post('/', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const body = await c.req.json();

  let contactId = body.contact_id;

  // Auto-create contact if not provided
  if (!contactId) {
    if (!body.first_name || !body.last_name) {
      return c.json({ error: 'Contact first name and last name are required' }, 400);
    }
    contactId = generateId();
    await db.prepare(
      'INSERT INTO contacts (id, org_id, owner_id, first_name, last_name, email, phone, company, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(contactId, auth.org_id, body.assigned_to || auth.user_id, body.first_name, body.last_name, body.email || null, body.phone || null, body.company || null, body.source || 'manual').run();
  }

  const leadId = generateId();
  await db.prepare(
    `INSERT INTO leads (id, org_id, contact_id, assigned_to, status, score, temperature, value, property_type, timeline, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(leadId, auth.org_id, contactId, body.assigned_to || auth.user_id, body.status || 'new', body.score || 0, body.temperature || 'cold', body.value || null, body.property_type || null, body.timeline || null, body.notes || null).run();

  await db.prepare(
    'INSERT INTO activities (id, org_id, user_id, contact_id, lead_id, type, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), auth.org_id, auth.user_id, contactId, leadId, 'lead_created', `New lead created`).run();

  const lead = await db.prepare(
    `SELECT l.*, ct.first_name as contact_first, ct.last_name as contact_last, ct.email as contact_email
     FROM leads l JOIN contacts ct ON l.contact_id = ct.id WHERE l.id = ?`
  ).bind(leadId).first();
  return c.json({ data: lead }, 201);
});

// Get single lead
app.get('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');

  const lead = await db.prepare(
    `SELECT l.*, ct.first_name as contact_first, ct.last_name as contact_last, ct.email as contact_email, ct.phone as contact_phone, ct.company as contact_company,
     u.first_name as assignee_first, u.last_name as assignee_last
     FROM leads l
     JOIN contacts ct ON l.contact_id = ct.id
     LEFT JOIN users u ON l.assigned_to = u.id
     WHERE l.id = ? AND l.org_id = ?`
  ).bind(id, auth.org_id).first();
  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  const activities = await db.prepare(
    'SELECT a.*, u.first_name as user_first, u.last_name as user_last FROM activities a LEFT JOIN users u ON a.user_id = u.id WHERE a.lead_id = ? ORDER BY a.created_at DESC LIMIT 50'
  ).bind(id).all();

  return c.json({ data: { ...lead, activities: activities.results } });
});

// Update lead
app.put('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await db.prepare('SELECT * FROM leads WHERE id = ? AND org_id = ?').bind(id, auth.org_id).first<any>();
  if (!existing) return c.json({ error: 'Lead not found' }, 404);

  const fields = ['status', 'score', 'temperature', 'value', 'property_type', 'timeline', 'notes', 'assigned_to', 'lost_reason'];
  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const values: any[] = [];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  values.push(id, auth.org_id);
  await db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...values).run();

  // Log status change
  if (body.status && body.status !== existing.status) {
    await db.prepare(
      'INSERT INTO activities (id, org_id, user_id, contact_id, lead_id, type, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(generateId(), auth.org_id, auth.user_id, existing.contact_id, id, 'lead_status_changed', `Lead status changed from ${existing.status} to ${body.status}`, JSON.stringify({ old_status: existing.status, new_status: body.status })).run();
  }

  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  return c.json({ data: lead });
});

// Convert lead to deal
app.post('/:id/convert', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();

  const lead = await db.prepare('SELECT * FROM leads WHERE id = ? AND org_id = ?').bind(id, auth.org_id).first<any>();
  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  const dealId = generateId();
  await db.prepare(
    `INSERT INTO deals (id, org_id, contact_id, lead_id, assigned_to, title, stage, value, probability)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(dealId, auth.org_id, lead.contact_id, id, lead.assigned_to || auth.user_id, body.title || 'New Deal', 'discovery', body.value || lead.value || 0, 10).run();

  await db.prepare('UPDATE leads SET status = \'qualified\', converted_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').bind(id).run();

  await db.prepare(
    'INSERT INTO activities (id, org_id, user_id, contact_id, lead_id, deal_id, type, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), auth.org_id, auth.user_id, lead.contact_id, id, dealId, 'deal_created', 'Lead converted to deal').run();

  const deal = await db.prepare('SELECT * FROM deals WHERE id = ?').bind(dealId).first();
  return c.json({ data: deal }, 201);
});

// Delete lead
app.delete('/:id', async (c) => {
  const auth = c.get('auth') as AuthContext;
  await c.env.DB.prepare('DELETE FROM leads WHERE id = ? AND org_id = ?').bind(c.req.param('id'), auth.org_id).run();
  return c.json({ success: true });
});

export { app as leadRoutes };
