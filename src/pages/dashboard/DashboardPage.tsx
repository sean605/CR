import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, formatNumber } from '../../lib/formatters';
import { Users, UserPlus, DollarSign, Target, CheckSquare, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { DashboardKPIs } from '../../lib/types';

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [leadStats, setLeadStats] = useState<{ by_status: any[]; by_source: any[] }>({ by_status: [], by_source: [] });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: DashboardKPIs }>('/analytics/dashboard'),
      api.get<{ data: any[] }>('/analytics/pipeline'),
      api.get<{ data: { by_status: any[]; by_source: any[] } }>('/analytics/leads'),
      api.get<{ data: any[] }>('/analytics/activities'),
    ]).then(([kpiRes, pipeRes, leadRes, actRes]) => {
      setKpis(kpiRes.data);
      setPipeline(pipeRes.data);
      setLeadStats(leadRes.data);
      setActivities(actRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!kpis) return null;

  const kpiCards = [
    { label: 'Total Contacts', value: formatNumber(kpis.total_contacts), icon: Users, color: 'text-blue-400' },
    { label: 'Active Leads', value: formatNumber(kpis.total_leads), icon: UserPlus, color: 'text-green-400' },
    { label: 'Pipeline Value', value: formatCurrency(kpis.pipeline_value), icon: DollarSign, color: 'text-yellow-400' },
    { label: 'Conversion Rate', value: `${kpis.conversion_rate}%`, icon: Target, color: 'text-purple-400' },
    { label: 'Deals Won', value: formatNumber(kpis.deals_won), icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Won Revenue', value: formatCurrency(kpis.deals_won_value), icon: BarChart3, color: 'text-brand-400' },
    { label: 'Tasks Due Today', value: formatNumber(kpis.tasks_due_today), icon: CheckSquare, color: 'text-orange-400' },
    { label: 'Tasks Overdue', value: formatNumber(kpis.tasks_overdue), icon: AlertTriangle, color: 'text-red-400' },
  ];

  const stageLabels: Record<string, string> = { discovery: 'Discovery', proposal: 'Proposal', negotiation: 'Negotiation', contract: 'Contract' };
  const pipelineChart = pipeline.map((s: any) => ({ name: stageLabels[s.stage] || s.stage, value: s.total_value, count: s.count }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`${kpi.color}`}>
                <kpi.icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{kpi.value}</div>
                <div className="text-xs text-gray-400">{kpi.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Pipeline by Stage</h3>
          {pipelineChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pipelineChart}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No deals in pipeline yet</div>
          )}
        </div>

        {/* Leads by Source */}
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Leads by Source</h3>
          {leadStats.by_source.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={leadStats.by_source} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={({ source, count }: any) => `${source}: ${count}`}>
                  {leadStats.by_source.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No leads yet</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Activity</h3>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 10).map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-gray-300">{a.description}</span>
                  {a.user_first && (
                    <span className="text-gray-500 ml-1">by {a.user_first} {a.user_last}</span>
                  )}
                  <div className="text-xs text-gray-600 mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-8">No activity yet. Start by adding contacts and leads.</div>
        )}
      </div>
    </div>
  );
}
