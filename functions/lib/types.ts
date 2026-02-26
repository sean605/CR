export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export interface AuthPayload {
  sub: string;
  org: string;
  role: 'admin' | 'manager' | 'agent';
  exp: number;
}

export interface AuthContext {
  user_id: string;
  org_id: string;
  role: 'admin' | 'manager' | 'agent';
}
