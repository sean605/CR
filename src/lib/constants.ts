import type { DealStage, LeadStatus, LeadTemperature, TaskPriority, TaskType } from './types';

export const LEAD_STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-500' },
  { value: 'unqualified', label: 'Unqualified', color: 'bg-gray-500' },
  { value: 'nurturing', label: 'Nurturing', color: 'bg-purple-500' },
];

export const LEAD_TEMPERATURES: { value: LeadTemperature; label: string; color: string }[] = [
  { value: 'cold', label: 'Cold', color: 'text-blue-400' },
  { value: 'warm', label: 'Warm', color: 'text-yellow-400' },
  { value: 'hot', label: 'Hot', color: 'text-red-400' },
];

export const DEAL_STAGES: { value: DealStage; label: string; probability: number; color: string }[] = [
  { value: 'discovery', label: 'Discovery', probability: 10, color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', probability: 30, color: 'bg-indigo-500' },
  { value: 'negotiation', label: 'Negotiation', probability: 60, color: 'bg-yellow-500' },
  { value: 'contract', label: 'Contract', probability: 80, color: 'bg-orange-500' },
  { value: 'closed_won', label: 'Closed Won', probability: 100, color: 'bg-green-500' },
  { value: 'closed_lost', label: 'Closed Lost', probability: 0, color: 'bg-red-500' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

export const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'todo', label: 'To-Do' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'follow_up', label: 'Follow Up' },
];

export const CONTACT_SOURCES = [
  'manual',
  'website',
  'referral',
  'cold_call',
  'lead_bleed_calculator',
  'social_media',
  'advertising',
  'open_house',
  'other',
];
