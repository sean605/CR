// ---- Database / API types ----

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_users: number;
  settings: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'agent';
  avatar_url: string | null;
  phone: string | null;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  org_id: string;
  owner_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string;
  tags: string;
  custom_fields: string;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'nurturing';
export type LeadTemperature = 'cold' | 'warm' | 'hot';

export interface Lead {
  id: string;
  org_id: string;
  contact_id: string;
  assigned_to: string | null;
  status: LeadStatus;
  score: number;
  temperature: LeadTemperature;
  value: number | null;
  property_type: string | null;
  timeline: string | null;
  notes: string | null;
  lost_reason: string | null;
  converted_at: string | null;
  monthly_leads: number | null;
  avg_response_time: number | null;
  avg_home_price: number | null;
  estimated_revenue_lost: number | null;
  estimated_revenue_recovered: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact?: Contact;
  assignee?: User;
}

export type DealStage = 'discovery' | 'proposal' | 'negotiation' | 'contract' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  org_id: string;
  contact_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  title: string;
  stage: DealStage;
  value: number;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  property_address: string | null;
  commission_rate: number;
  lost_reason: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Contact;
  assignee?: User;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskType = 'todo' | 'call' | 'email' | 'meeting' | 'follow_up';

export interface Task {
  id: string;
  org_id: string;
  created_by: string;
  assigned_to: string | null;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  title: string;
  description: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assignee?: User;
  contact?: Contact;
}

export interface Note {
  id: string;
  org_id: string;
  author_id: string;
  contact_id: string | null;
  deal_id: string | null;
  content: string;
  is_pinned: number;
  created_at: string;
  updated_at: string;
  author?: User;
}

export type ActivityType =
  | 'contact_created' | 'contact_updated'
  | 'lead_created' | 'lead_status_changed'
  | 'deal_created' | 'deal_stage_changed' | 'deal_won' | 'deal_lost'
  | 'task_created' | 'task_completed'
  | 'note_added' | 'email_sent';

export interface Activity {
  id: string;
  org_id: string;
  user_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  task_id: string | null;
  type: ActivityType;
  description: string;
  metadata: string;
  created_at: string;
  user?: User;
}

export interface EmailTemplate {
  id: string;
  org_id: string;
  created_by: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  is_shared: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  org_id: string;
  created_by: string;
  name: string;
  is_active: number;
  trigger_type: string;
  trigger_config: string;
  action_type: string;
  action_config: string;
  created_at: string;
  updated_at: string;
}

// ---- API Response types ----

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardKPIs {
  total_contacts: number;
  total_leads: number;
  leads_this_month: number;
  conversion_rate: number;
  pipeline_value: number;
  avg_deal_size: number;
  deals_won: number;
  deals_won_value: number;
  tasks_due_today: number;
  tasks_overdue: number;
}

export interface PipelineData {
  stage: DealStage;
  label: string;
  count: number;
  value: number;
}
