import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency, getInitials } from '../../lib/formatters';
import { useUIStore } from '../../stores/uiStore';
import { DEAL_STAGES } from '../../lib/constants';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Kanban } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DealForm from './DealForm';

interface DealCardProps {
  deal: any;
  onClick: () => void;
}

function SortableDealCard({ deal, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id, data: { deal } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}
      className="card p-3 cursor-pointer hover:bg-gray-700/50 transition-colors mb-2"
    >
      <div className="font-medium text-sm text-gray-200 mb-1">{deal.title}</div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center">
          <span className="text-brand-400 text-[10px]">{getInitials(deal.contact_first || 'U', deal.contact_last || 'N')}</span>
        </div>
        <span className="text-xs text-gray-400">{deal.contact_first} {deal.contact_last}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-semibold text-green-400">{formatCurrency(deal.value || 0)}</span>
        <span className="text-xs text-gray-500">{deal.probability}%</span>
      </div>
    </div>
  );
}

export default function DealsPage() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchPipeline = async () => {
    try {
      const res = await api.get<{ data: Record<string, any[]> }>('/deals/pipeline');
      setPipeline(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPipeline(); }, []);

  const activeDeal = activeId
    ? Object.values(pipeline).flat().find((d) => d.id === activeId)
    : null;

  const handleDragStart = (event: any) => setActiveId(event.active.id);

  const handleDragEnd = async (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id;
    const overId = over.id;

    // Find which stage the deal was in and which stage it's going to
    let fromStage = '';
    let toStage = '';
    for (const [stage, deals] of Object.entries(pipeline)) {
      if (deals.some((d) => d.id === dealId)) fromStage = stage;
      if (overId === stage || deals.some((d) => d.id === overId)) toStage = stage;
    }
    if (!toStage) toStage = overId; // Dropped on stage column itself

    if (fromStage && toStage) {
      // Optimistic update
      const newPipeline = { ...pipeline };
      const deal = newPipeline[fromStage].find((d) => d.id === dealId);
      if (deal) {
        newPipeline[fromStage] = newPipeline[fromStage].filter((d) => d.id !== dealId);
        deal.stage = toStage;
        newPipeline[toStage] = [...(newPipeline[toStage] || []), deal];
        setPipeline(newPipeline);

        // Persist
        await api.put(`/deals/${dealId}`, { stage: toStage });
        if (fromStage !== toStage) {
          addToast({ type: 'info', message: `Deal moved to ${DEAL_STAGES.find((s) => s.value === toStage)?.label || toStage}` });
        }
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  const activeStages = DEAL_STAGES.filter((s) => s.value !== 'closed_won' && s.value !== 'closed_lost');
  const isEmpty = Object.values(pipeline).flat().length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-400">
          {activeStages.map((s) => {
            const deals = pipeline[s.value] || [];
            const total = deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
            return (
              <span key={s.value}>
                {s.label}: <span className="text-white font-medium">{deals.length}</span>
                {total > 0 && <span className="text-gray-500 ml-1">({formatCurrency(total)})</span>}
              </span>
            );
          })}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} /> Add Deal</button>
      </div>

      {isEmpty ? (
        <EmptyState icon={Kanban} title="No deals in pipeline" description="Create your first deal to start tracking your sales pipeline"
          action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Add Deal</button>} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
            {activeStages.map((stage) => {
              const deals = pipeline[stage.value] || [];
              return (
                <div key={stage.value} className="flex-shrink-0 w-72">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="text-sm font-medium text-gray-300">{stage.label}</span>
                      <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">{deals.length}</span>
                    </div>
                  </div>
                  <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy} id={stage.value}>
                    <div className="min-h-[200px] bg-gray-900/50 rounded-lg p-2">
                      {deals.map((deal) => (
                        <SortableDealCard key={deal.id} deal={deal} onClick={() => navigate(`/deals/${deal.id}`)} />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeDeal && (
              <div className="card p-3 w-72 shadow-2xl">
                <div className="font-medium text-sm text-gray-200">{activeDeal.title}</div>
                <div className="text-sm font-semibold text-green-400 mt-1">{formatCurrency(activeDeal.value || 0)}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Closed deals summary */}
      {(pipeline.closed_won?.length > 0 || pipeline.closed_lost?.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {pipeline.closed_won?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-medium text-green-400 mb-2">Closed Won ({pipeline.closed_won.length})</h3>
              <div className="text-2xl font-bold text-green-400">{formatCurrency(pipeline.closed_won.reduce((s: number, d: any) => s + (d.value || 0), 0))}</div>
            </div>
          )}
          {pipeline.closed_lost?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-medium text-red-400 mb-2">Closed Lost ({pipeline.closed_lost.length})</h3>
              <div className="text-2xl font-bold text-red-400">{formatCurrency(pipeline.closed_lost.reduce((s: number, d: any) => s + (d.value || 0), 0))}</div>
            </div>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Deal" size="lg">
        <DealForm onSuccess={() => { setShowForm(false); addToast({ type: 'success', message: 'Deal created' }); fetchPipeline(); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
