import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatNumber } from '../../lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { DashboardKPIs } from '../../lib/types';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [leadStats, setLeadStats] = useState<{ by_status: any[]; by_source: any[] }>({ by_status: [], by_source: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: DashboardKPIs }>('/analytics/dashboard'),
      api.get<{ data: any[] }>('/analytics/pipeline'),
      api.get<{ data: { by_status: any[]; by_source: any[] } }>('/analytics/leads'),
    ]).then(([k, p, l]) => {
      setKpis(k.data);
      setPipeline(p.data);
      setLeadStats(l.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!kpis) return null;

  const stageLabels: Record<string, string> = { discovery: 'Discovery', proposal: 'Proposal', negotiation: 'Negotiation', contract: 'Contract' };

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><div className="text-xs text-gray-400">Total Leads</div><div className="text-2xl font-bold text-white mt-1">{formatNumber(kpis.total_leads)}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-400">Conversion Rate</div><div className="text-2xl font-bold text-white mt-1">{kpis.conversion_rate}%</div></div>
        <div className="card p-4"><div className="text-xs text-gray-400">Pipeline Value</div><div className="text-2xl font-bold text-white mt-1">{formatCurrency(kpis.pipeline_value)}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-400">Avg Deal Size</div><div className="text-2xl font-bold text-white mt-1">{formatCurrency(kpis.avg_deal_size)}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Value by Stage */}
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Pipeline Value by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipeline.map((s: any) => ({ name: stageLabels[s.stage] || s.stage, value: s.total_value, count: s.count }))}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Status */}
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Leads by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={leadStats.by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }: any) => `${status}: ${count}`}>
                {leadStats.by_status.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Source */}
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Leads by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadStats.by_source} layout="vertical">
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis type="category" dataKey="source" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Summary */}
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Revenue Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Deals Won</span>
              <span className="font-bold text-green-400">{formatCurrency(kpis.deals_won_value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Pipeline (Weighted)</span>
              <span className="font-bold text-brand-400">{formatCurrency(kpis.pipeline_value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Avg Deal Size</span>
              <span className="font-bold text-white">{formatCurrency(kpis.avg_deal_size)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Leads This Month</span>
              <span className="font-bold text-white">{formatNumber(kpis.leads_this_month)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
