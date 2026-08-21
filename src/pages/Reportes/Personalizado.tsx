import { useMemo, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Trade } from '../../store/tradeStore';
import { type PropFirmAccount } from '../../store/propFirmStore';
import { useReportsStore, useUserDashboards, type DashWidget } from '../../store/reportsStore';
import { usePlan } from '../../hooks/usePlan';
import { useToast } from '../../components/UI/ToastProvider';
import { Watermark } from '../../components/UI/Watermark';
import { card, label, fontHead, fontBody, SectionEmpty } from './shared';
import { WIDGET_DEFS, CATALOG, TEMPLATES, METRIC_OPTIONS, type WidgetCtx } from './widgets';

interface Props { trades: Trade[]; accounts: PropFirmAccount[] }

export function Personalizado({ trades, accounts }: Props) {
  const dashboards = useUserDashboards();
  const store = useReportsStore();
  const activeId = useReportsStore(s => s.activeId);
  const { isPro } = usePlan();
  const maxDashboards = isPro ? 5 : 1;
  const { push } = useToast();

  const active = useMemo(() => dashboards.find(d => d.id === activeId) || dashboards[0] || null, [dashboards, activeId]);
  const [edit, setEdit] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const ctx: Omit<WidgetCtx, 'config'> = { trades, accounts };

  const newDashboard = () => {
    if (dashboards.length >= maxDashboards) { push({ kind: 'error', text: isPro ? 'Máximo 5 dashboards' : 'El plan gratuito permite 1 dashboard. Hazte Pro para más.' }); return; }
    store.createDashboard(`Dashboard ${dashboards.length + 1}`);
    setEdit(true);
  };
  const useTemplate = (tid: string) => {
    if (dashboards.length >= maxDashboards) { push({ kind: 'error', text: isPro ? 'Máximo 5 dashboards' : 'El plan gratuito permite 1 dashboard.' }); return; }
    const t = TEMPLATES.find(x => x.id === tid)!;
    store.createDashboard(t.title, t.widgets);
    setTemplatesOpen(false);
    push({ kind: 'success', text: 'Dashboard creado desde plantilla' });
  };

  // Empty state
  if (dashboards.length === 0) {
    return (
      <>
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🧩</div>
          <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>Crea tu dashboard personalizado</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 20px' }}>Elige qué métricas ver, cómo organizarlas y guárdalo para revisar cuando quieras.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={newDashboard} style={btnPrimary}>Empezar desde cero</button>
            <button onClick={() => setTemplatesOpen(true)} style={btnGhost}>Usar plantilla</button>
          </div>
        </div>
        <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onUse={useTemplate} />
      </>
    );
  }

  const setWidgets = (widgets: DashWidget[]) => active && store.setWidgets(active.id, widgets);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Selector row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <select value={active?.id} onChange={e => store.setActive(e.target.value)} style={{ background: 'var(--card)', border: '1px solid var(--border)', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: '0.82rem', fontFamily: fontBody, cursor: 'pointer' }}>
          {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button onClick={newDashboard} style={btnGhost}>+ Nuevo dashboard</button>
        <button onClick={() => setTemplatesOpen(true)} style={btnGhost}>Plantillas</button>
        <div style={{ flex: 1 }} />
        {edit && active && <button onClick={() => setCatalogOpen(true)} style={btnGhost}>+ Añadir widget</button>}
        <button onClick={() => setEdit(e => !e)} title="Modo edición" style={{ ...btnGhost, background: edit ? 'rgba(79,143,255,0.1)' : 'transparent', color: edit ? 'var(--blue)' : 'var(--text-secondary)' }}>⚙️ {edit ? 'Editando' : 'Editar'}</button>
        {edit && active && <button onClick={() => { setEdit(false); push({ kind: 'success', text: 'Dashboard guardado' }); }} style={btnPrimary}>Guardar dashboard</button>}
      </div>

      {active && (
        active.widgets.length === 0 ? (
          <SectionEmpty icon="➕" title="Dashboard vacío" desc="Activa el modo edición y añade widgets para empezar a construirlo." />
        ) : (
          <WidgetGrid dashId={active.id} widgets={active.widgets} ctx={ctx} edit={edit} onReorder={setWidgets} onConfigure={setConfigId} onRemove={wid => store.removeWidget(active.id, wid)} />
        )
      )}

      {/* Delete dashboard (edit mode) */}
      {edit && active && (
        <button onClick={() => { if (dashboards.length > 0) { store.deleteDashboard(active.id); push({ kind: 'success', text: 'Dashboard eliminado' }); setEdit(false); } }} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: fontBody }}>Eliminar este dashboard</button>
      )}

      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onUse={useTemplate} />
      {catalogOpen && active && <CatalogModal onClose={() => setCatalogOpen(false)} onAdd={(type) => { const def = WIDGET_DEFS[type]; store.addWidget(active.id, type, def.defaultW, type === 'custom_kpi' ? { metric: 'netpnl', label: 'Mi KPI' } : undefined); setCatalogOpen(false); }} />}
      {configId && active && <ConfigModal widget={active.widgets.find(w => w.id === configId)!} onClose={() => setConfigId(null)} onSave={(w, config) => { store.setWidgets(active.id, active.widgets.map(x => x.id === configId ? { ...x, w, config } : x)); setConfigId(null); }} trades={trades} />}
      <style>{`@media (max-width:760px){ .dash-grid > * { grid-column: span 4 !important; } }`}</style>
    </div>
  );
}

/* ── Grid + sortable items ── */
function WidgetGrid({ dashId, widgets, ctx, edit, onReorder, onConfigure, onRemove }: {
  dashId: string; widgets: DashWidget[]; ctx: Omit<WidgetCtx, 'config'>; edit: boolean;
  onReorder: (w: DashWidget[]) => void; onConfigure: (id: string) => void; onRemove: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = widgets.findIndex(w => w.id === active.id);
    const newI = widgets.findIndex(w => w.id === over.id);
    onReorder(arrayMove(widgets, oldI, newI));
  };
  void dashId;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
        <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {widgets.map(w => <SortableWidget key={w.id} widget={w} ctx={ctx} edit={edit} onConfigure={onConfigure} onRemove={onRemove} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableWidget({ widget, ctx, edit, onConfigure, onRemove }: { widget: DashWidget; ctx: Omit<WidgetCtx, 'config'>; edit: boolean; onConfigure: (id: string) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id, disabled: !edit });
  const def = WIDGET_DEFS[widget.type];
  const span = Math.min(4, Math.max(1, widget.w));
  const style: React.CSSProperties = {
    ...card, gridColumn: `span ${span}`, minHeight: 90,
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 10 : undefined,
    outline: edit ? '1px dashed rgba(79,143,255,0.3)' : 'none',
  };
  return (
    <div ref={setNodeRef} style={style}>
      {def ? def.render({ ...ctx, config: widget.config }) : <div style={{ color: '#4a4a60', fontSize: 12 }}>Widget desconocido</div>}
      {edit && (
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
          {def?.configurable && <IconBtn onClick={() => onConfigure(widget.id)} title="Configurar">⋯</IconBtn>}
          <IconBtn onClick={() => onConfigure(widget.id)} title="Tamaño">⤢</IconBtn>
          <IconBtn onClick={() => onRemove(widget.id)} title="Eliminar" danger>✕</IconBtn>
          <span {...attributes} {...listeners} title="Arrastrar" style={{ cursor: 'grab', color: '#4a4a60', fontSize: 13, padding: '0 2px', touchAction: 'none' }}>⋮⋮</span>
        </div>
      )}
      <Watermark />
    </div>
  );
}
function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return <button onClick={onClick} title={title} style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: danger ? 'var(--red)' : '#8a90a8', cursor: 'pointer', fontSize: 11, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{children}</button>;
}

/* ── Modals ── */
function Shell({ title, onClose, children, maxWidth = 560 }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '50px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth, fontFamily: fontBody, color: '#e0e0e8', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ background: 'var(--card-2, #161618)', borderBottom: '1px solid var(--border-subtle)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1rem', color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--border-subtle)', color: '#4a4a60', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

function CatalogModal({ onClose, onAdd }: { onClose: () => void; onAdd: (type: string) => void }) {
  const [cat, setCat] = useState(CATALOG[0].category);
  const items = CATALOG.find(c => c.category === cat)?.items ?? [];
  return (
    <Shell title="Añadir widget" onClose={onClose} maxWidth={620}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {CATALOG.map(c => (
          <button key={c.category} onClick={() => setCat(c.category)} style={{ padding: '5px 12px', borderRadius: 16, fontSize: '0.74rem', cursor: 'pointer', fontFamily: fontBody, border: `1px solid ${cat === c.category ? 'var(--blue)' : 'var(--border)'}`, background: cat === c.category ? 'rgba(79,143,255,0.1)' : 'transparent', color: cat === c.category ? 'var(--blue)' : 'var(--text-secondary)' }}>{c.category}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {items.map(it => (
          <button key={it.type} onClick={() => onAdd(it.type)} style={{ textAlign: 'left', background: 'var(--card-2, #161618)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', color: '#fff', fontSize: '0.82rem', fontFamily: fontBody }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--blue)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
            + {it.title}
          </button>
        ))}
      </div>
    </Shell>
  );
}

function ConfigModal({ widget, onClose, onSave, trades }: { widget: DashWidget; onClose: () => void; onSave: (w: number, config: Record<string, unknown>) => void; trades: Trade[] }) {
  const def = WIDGET_DEFS[widget.type];
  const [w, setW] = useState(widget.w);
  const [config, setConfig] = useState<Record<string, unknown>>(widget.config ?? {});
  const setups = [...new Set(trades.map(t => t.setup).filter(Boolean))];
  const inp: React.CSSProperties = { background: 'var(--card-2, #0d0d0f)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px', color: '#e0e0e8', fontSize: '0.82rem', width: '100%', fontFamily: fontBody, boxSizing: 'border-box' };
  return (
    <Shell title={`Configurar · ${def?.title ?? ''}`} onClose={onClose} maxWidth={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={label}>Ancho (columnas)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map(n => (
              <button key={n} onClick={() => setW(n)} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontFamily: fontBody, fontWeight: 600, border: `1px solid ${w === n ? 'var(--blue)' : 'var(--border)'}`, background: w === n ? 'rgba(79,143,255,0.1)' : 'transparent', color: w === n ? 'var(--blue)' : 'var(--text-secondary)' }}>{n}</button>
            ))}
          </div>
        </div>
        {def?.configurable && (
          <>
            <div><div style={label}>Etiqueta</div><input value={(config.label as string) ?? ''} onChange={e => setConfig(c => ({ ...c, label: e.target.value }))} style={inp} placeholder="Mi KPI" /></div>
            <div><div style={label}>Métrica</div>
              <select value={(config.metric as string) ?? 'netpnl'} onChange={e => setConfig(c => ({ ...c, metric: e.target.value }))} style={inp}>
                {METRIC_OPTIONS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div><div style={label}>Filtrar por setup (opcional)</div>
              <select value={(config.setup as string) ?? ''} onChange={e => setConfig(c => ({ ...c, setup: e.target.value || undefined }))} style={inp}>
                <option value="">Todos</option>
                {setups.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><div style={label}>Filtrar por sesión (opcional)</div>
              <select value={(config.session as string) ?? ''} onChange={e => setConfig(c => ({ ...c, session: e.target.value || undefined }))} style={inp}>
                <option value="">Todas</option>
                <option value="london">Londres</option><option value="new_york">Nueva York</option><option value="asia">Asia</option><option value="premarket">Pre-market</option>
              </select>
            </div>
          </>
        )}
        <button onClick={() => onSave(w, config)} style={{ ...btnPrimary, width: '100%' }}>Guardar</button>
      </div>
    </Shell>
  );
}

function TemplatesModal({ open, onClose, onUse }: { open: boolean; onClose: () => void; onUse: (id: string) => void }) {
  if (!open) return null;
  return (
    <Shell title="Plantillas de dashboard" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TEMPLATES.map(t => (
          <div key={t.id} style={{ background: 'var(--card-2, #161618)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><span>{t.emoji}</span>{t.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>{t.description}</div>
              <div style={{ fontSize: '0.7rem', color: '#4a4a60', marginTop: 4 }}>{t.widgets.length} widgets</div>
            </div>
            <button onClick={() => onUse(t.id)} style={btnPrimary}>Usar →</button>
          </div>
        ))}
      </div>
    </Shell>
  );
}

const btnPrimary: React.CSSProperties = { background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody };
const btnGhost: React.CSSProperties = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody };
