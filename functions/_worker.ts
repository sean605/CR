import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { contactRoutes } from './routes/contacts';
import { leadRoutes } from './routes/leads';
import { dealRoutes } from './routes/deals';
import { taskRoutes } from './routes/tasks';
import { noteRoutes } from './routes/notes';
import { teamRoutes } from './routes/team';
import { analyticsRoutes } from './routes/analytics';
import { emailRoutes } from './routes/email';
import { automationRoutes } from './routes/automations';
import { authMiddleware } from './lib/middleware';
import type { Env } from './lib/types';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Public routes
app.route('/api/auth', authRoutes);
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/contacts', contactRoutes);
app.route('/api/leads', leadRoutes);
app.route('/api/deals', dealRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/notes', noteRoutes);
app.route('/api/team', teamRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/email', emailRoutes);
app.route('/api/automations', automationRoutes);

export default app;
