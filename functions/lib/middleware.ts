import { Context, Next } from 'hono';
import { verifyJWT } from './auth';
import type { Env, AuthContext } from './types';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
  const payload = await verifyJWT(token, secret);
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  c.set('auth', {
    user_id: payload.sub,
    org_id: payload.org,
    role: payload.role,
  } satisfies AuthContext);
  await next();
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext;
    if (!roles.includes(auth.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}
