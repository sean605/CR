import { Hono } from 'hono';
import type { Env, AuthContext } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

app.get('/dashboard', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;
  const orgId = auth.org_id;

  const [contacts, leads, leadsMonth, dealsWon, pipelineValue, avgDeal, tasksDue, tasksOverdue] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM contacts WHERE org_id = ?').bind(orgId).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM leads WHERE org_id = ?').bind(orgId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM leads WHERE org_id = ? AND created_at >= datetime('now', '-30 days')").bind(orgId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total FROM deals WHERE org_id = ? AND stage = 'closed_won'").bind(orgId).first<{ count: number; total: number }>(),
    db.prepare("SELECT COALESCE(SUM(value * probability / 100.0), 0) as total FROM deals WHERE org_id = ? AND stage NOT IN ('closed_won', 'closed_lost')").bind(orgId).first<{ total: number }>(),
    db.prepare("SELECT COALESCE(AVG(value), 0) as avg_val FROM deals WHERE org_id = ? AND stage = 'closed_won'").bind(orgId).first<{ avg_val: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM tasks WHERE org_id = ? AND status IN ('pending', 'in_progress') AND due_date = date('now')").bind(orgId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM tasks WHERE org_id = ? AND status IN ('pending', 'in_progress') AND due_date < date('now')").bind(orgId).first<{ count: number }>(),
  ]);

  const totalLeads = leads?.count || 0;
  const wonCount = dealsWon?.count || 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

  return c.json({
    data: {
      total_contacts: contacts?.count || 0,
      total_leads: totalLeads,
      leads_this_month: leadsMonth?.count || 0,
      conversion_rate: conversionRate,
      pipeline_value: Math.round(pipelineValue?.total || 0),
      avg_deal_size: Math.round(avgDeal?.avg_val || 0),
      deals_won: wonCount,
      deals_won_value: Math.round(dealsWon?.total || 0),
      tasks_due_today: tasksDue?.count || 0,
      tasks_overdue: tasksOverdue?.count || 0,
    },
  });
});

app.get('/pipeline', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;

  const stages = await db.prepare(
    "SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM deals WHERE org_id = ? AND stage NOT IN ('closed_won', 'closed_lost') GROUP BY stage"
  ).bind(auth.org_id).all();

  return c.json({ data: stages.results });
});

app.get('/leads', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;

  const byStatus = await db.prepare(
    'SELECT status, COUNT(*) as count FROM leads WHERE org_id = ? GROUP BY status'
  ).bind(auth.org_id).all();

  const bySource = await db.prepare(
    'SELECT c.source, COUNT(*) as count FROM leads l JOIN contacts c ON l.contact_id = c.id WHERE l.org_id = ? GROUP BY c.source'
  ).bind(auth.org_id).all();

  return c.json({ data: { by_status: byStatus.results, by_source: bySource.results } });
});

app.get('/activities', async (c) => {
  const auth = c.get('auth') as AuthContext;
  const db = c.env.DB;

  const activities = await db.prepare(
    'SELECT a.*, u.first_name as user_first, u.last_name as user_last FROM activities a LEFT JOIN users u ON a.user_id = u.id WHERE a.org_id = ? ORDER BY a.created_at DESC LIMIT 50'
  ).bind(auth.org_id).all();

  return c.json({ data: activities.results });
});

export { app as analyticsRoutes };
