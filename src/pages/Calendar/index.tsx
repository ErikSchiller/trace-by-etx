import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, TrendingUp, CheckCircle2, DollarSign, RotateCcw, Target, FileText, Calendar as CalIcon } from 'lucide-react';
import { useUserTrades } from '../../store/tradeStore';
import { useUserNotes } from '../../store/notebookStore';
import { useUserGoals } from '../../store/goalsStore';
import { useRoutineStore, dayRatio } from '../../store/routineStore';
import { useCalendarStore, useEventsInRange, EVENT_CATEGORY_COLOR, type EventCategory, type RepeatRule } from '../../store/calendarStore';
import { useUserAccounts } from '../../store/propFirmStore';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const C = {
  bg: '#0a0a0c', mid: '#0d0d0f', card: '#151519', card2: '#131418', border: '#1a1d26', borderEl: '#2a2c33',
  blue: '#4f8fff', red: '#ef4444', green: '#22c55e', gold: '#eab308', indigo: '#6366f1', orange: '#f59e0b',
  text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7280', faint: '#4a4a60',
};
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type ItemKind = 'trade' | 'routine' | 'payout' | 'reset' | 'goal' | 'note' | 'event';
interface CalItem { id: string; date: string; title: string; color: string; kind: ItemKind; time?: string; linkedNoteId?: string; eventId?: string }

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmt$ = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const KIND_ICON: Record<ItemKind, typeof TrendingUp> = { trade: TrendingUp, routine: CheckCircle2, payout: DollarSign, reset: RotateCcw, goal: Target, note: FileText, event: CalIcon };

export function Calendar() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [viewMode, setViewMode] = useState<'mes' | 'semana' | 'dia'>('mes');
  const [dayPanel, setDayPanel] = useState<string | null>(null);
  const [eventModal, setEventModal] = useState<{ date: string } | null>(null);

  const trades = useUserTrades();
  const notes = useUserNotes();
  const goals = useUserGoals();
  const accounts = useUserAccounts();
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);
  const deleteEvent = useCalendarStore(s => s.deleteEvent);
  const navigate = useNavigate();

  // Visible range for the current view.
  const { gridStart, gridEnd, weeks } = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const rangeFrom = viewMode === 'mes' ? iso(gridStart) : viewMode === 'semana' ? iso(startOfWeek(cursor)) : iso(cursor);
  const rangeTo = viewMode === 'mes' ? iso(gridEnd) : viewMode === 'semana' ? iso(addDays(startOfWeek(cursor), 6)) : iso(cursor);
  const manualEvents = useEventsInRange(rangeFrom, rangeTo);

  // Aggregate items by date across all sources.
  const byDate = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    const push = (it: CalItem) => { (map.get(it.date) ?? map.set(it.date, []).get(it.date)!).push(it); };
    // trades → one per trading day
    const tByDay = new Map<string, number[]>();
    trades.forEach(t => { if (t.date >= rangeFrom && t.date <= rangeTo) (tByDay.get(t.date) ?? tByDay.set(t.date, []).get(t.date)!).push(t.pnl); });
    tByDay.forEach((pnls, date) => { const net = pnls.reduce((s, v) => s + v, 0); push({ id: `tr-${date}`, date, title: `${pnls.length} op · ${fmt$(net)}`, color: net >= 0 ? C.blue : C.red, kind: 'trade' }); });
    // routines
    Object.entries(completions).forEach(([date, ids]) => { if (date >= rangeFrom && date <= rangeTo && dayRatio(routine, ids) > 0) push({ id: `ro-${date}`, date, title: '✓ Rutina', color: C.indigo, kind: 'routine' }); });
    // payouts + resets
    accounts.forEach(a => {
      a.payouts.forEach(pay => { if (pay.date >= rangeFrom && pay.date <= rangeTo) push({ id: `pay-${pay.id}`, date: pay.date, title: `Payout ${fmt$(pay.netAmount)}`, color: C.gold, kind: 'payout' }); });
      a.resets.forEach((r, i) => { if (r.date >= rangeFrom && r.date <= rangeTo) push({ id: `rs-${a.id}-${i}`, date: r.date, title: `Reset -$${r.cost}`, color: C.red, kind: 'reset' }); });
    });
    // goal deadlines
    goals.forEach(g => { if (g.deadline && g.deadline >= rangeFrom && g.deadline <= rangeTo) push({ id: `gl-${g.id}`, date: g.deadline.slice(0, 10), title: g.title, color: C.orange, kind: 'goal' }); });
    // dated notes
    notes.forEach(n => { const d = n.properties?.date; if (d && d >= rangeFrom && d <= rangeTo) push({ id: `nt-${n.id}`, date: d.slice(0, 10), title: n.title || 'Nota', color: C.muted, kind: 'note', linkedNoteId: n.id }); });
    // manual events
    manualEvents.forEach(e => push({ id: `ev-${e.id}-${e.occurrenceDate}`, date: e.occurrenceDate, title: e.title, color: e.color ?? EVENT_CATEGORY_COLOR[e.category], kind: 'event', time: e.startTime, eventId: e.id }));
    return map;
  }, [trades, notes, goals, accounts, routine, completions, manualEvents, rangeFrom, rangeTo]);

  const today = iso(new Date());
  const title = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const go = (delta: number) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + (viewMode === 'mes' ? delta : 0) + (viewMode === 'semana' ? 0 : 0), viewMode === 'mes' ? 1 : c.getDate() + (viewMode === 'semana' ? delta * 7 : viewMode === 'dia' ? delta : 0)));
  const goToday = () => { const d = new Date(); setCursor(viewMode === 'mes' ? new Date(d.getFullYear(), d.getMonth(), 1) : d); };

  const openNote = (id: string) => { navigate('/notebook'); setTimeout(() => window.dispatchEvent(new CustomEvent('trace:open-note', { detail: { id } })), 120); };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, minHeight: 0, fontFamily: fontBody }}>
      {/* top bar */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.4rem', color: C.text, margin: 0 }}>
            {viewMode === 'dia' ? `${cursor.getDate()} ${MONTHS[cursor.getMonth()]}` : title}
          </h1>
          <div style={{ display: 'flex', gap: 4 }}>
            <NavBtn onClick={() => go(-1)}><ChevronLeft size={16} /></NavBtn>
            <NavBtn onClick={() => go(1)}><ChevronRight size={16} /></NavBtn>
          </div>
          <button onClick={goToday} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: fontBody }}>Hoy</button>
        </div>
        <div style={{ display: 'inline-flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: 3 }}>
          {(['mes', 'semana', 'dia'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{ background: viewMode === m ? C.blue : 'transparent', color: viewMode === m ? '#fff' : C.muted, border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, textTransform: 'capitalize' }}>{m}</button>
          ))}
        </div>
      </div>

      {viewMode === 'mes' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: `1px solid ${C.border}` }}>
            {DOW.map(d => <div key={d} style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>)}
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: '1fr', minHeight: 0, overflowY: 'auto' }}>
            {weeks.flat().map(day => {
              const ds = iso(day); const items = byDate.get(ds) ?? [];
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = ds === today;
              return (
                <div key={ds} onClick={() => setDayPanel(ds)} style={{ borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: 8, minHeight: 110, cursor: 'pointer', background: inMonth ? 'transparent' : 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: isToday ? 700 : 500, color: isToday ? '#fff' : inMonth ? C.text2 : C.faint, width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isToday ? C.blue : 'transparent' }}>{day.getDate()}</span>
                  </div>
                  {items.slice(0, 3).map(it => <EventChip key={it.id} item={it} />)}
                  {items.length > 3 && <span style={{ fontSize: '0.66rem', color: C.muted, paddingLeft: 2 }}>+{items.length - 3} más</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <AgendaView dates={viewMode === 'semana' ? weekDates(cursor) : [iso(cursor)]} byDate={byDate} today={today} onDay={setDayPanel} />
      )}

      {/* Day panel */}
      {dayPanel && (
        <DayPanel date={dayPanel} items={byDate.get(dayPanel) ?? []} onClose={() => setDayPanel(null)} onNewEvent={() => setEventModal({ date: dayPanel })} onOpenNote={openNote} onDeleteEvent={deleteEvent} />
      )}

      {eventModal && <EventModal date={eventModal.date} notes={notes} onClose={() => setEventModal(null)} />}
    </div>
  );
}

function EventChip({ item }: { item: CalItem }) {
  const Icon = KIND_ICON[item.kind];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 4, fontSize: '0.68rem', background: `${item.color}1f`, color: item.color, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <Icon size={10} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.time ? `${item.time} ` : ''}{item.title}</span>
    </div>
  );
}

function AgendaView({ dates, byDate, today, onDay }: { dates: string[]; byDate: Map<string, CalItem[]>; today: string; onDay: (d: string) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: dates.length > 1 ? 'repeat(auto-fit,minmax(160px,1fr))' : '1fr', gap: 14, maxWidth: dates.length === 1 ? 640 : undefined, margin: dates.length === 1 ? '0 auto' : undefined }}>
        {dates.map(ds => {
          const d = new Date(ds + 'T00:00:00'); const items = byDate.get(ds) ?? [];
          return (
            <div key={ds} onClick={() => onDay(ds)} style={{ background: C.card, border: `1px solid ${ds === today ? C.blue : C.border}`, borderRadius: 10, padding: 14, cursor: 'pointer', minHeight: 120 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: ds === today ? C.blue : C.text, marginBottom: 10 }}>{DOW[(d.getDay() + 6) % 7]} {d.getDate()}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.length === 0 && <span style={{ fontSize: '0.72rem', color: C.faint }}>—</span>}
                {items.map(it => <EventChip key={it.id} item={it} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayPanel({ date, items, onClose, onNewEvent, onOpenNote, onDeleteEvent }: { date: string; items: CalItem[]; onClose: () => void; onNewEvent: () => void; onOpenNote: (id: string) => void; onDeleteEvent: (id: string) => void }) {
  const d = new Date(date + 'T00:00:00');
  const sections: { kind: ItemKind; label: string }[] = [
    { kind: 'trade', label: 'Trades' }, { kind: 'routine', label: 'Rutina' }, { kind: 'payout', label: 'Payouts' },
    { kind: 'reset', label: 'Resets' }, { kind: 'goal', label: 'Metas' }, { kind: 'note', label: 'Notas' }, { kind: 'event', label: 'Eventos' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 380, maxWidth: '90vw', height: '100%', background: C.mid, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', fontFamily: fontBody, boxShadow: '-12px 0 40px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.1rem', color: C.text }}>{d.getDate()} {MONTHS[d.getMonth()]}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {items.length === 0 && <div style={{ color: C.faint, fontSize: '0.84rem', textAlign: 'center', padding: 30 }}>Nada este día</div>}
          {sections.map(sec => {
            const secItems = items.filter(i => i.kind === sec.kind);
            if (!secItems.length) return null;
            return (
              <div key={sec.kind} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 8 }}>{sec.label}</div>
                {secItems.map(it => {
                  const Icon = KIND_ICON[it.kind];
                  return (
                    <div key={it.id} onClick={() => it.linkedNoteId && onOpenNote(it.linkedNoteId)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 6, cursor: it.linkedNoteId ? 'pointer' : 'default' }}>
                      <Icon size={14} color={it.color} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.82rem', color: C.text2 }}>{it.time ? `${it.time} · ` : ''}{it.title}</span>
                      {it.eventId && <button onClick={e => { e.stopPropagation(); onDeleteEvent(it.eventId!); }} style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', display: 'inline-flex' }}><X size={13} /></button>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onNewEvent} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}><Plus size={15} /> Nuevo evento</button>
        </div>
      </div>
    </div>
  );
}

function EventModal({ date, notes, onClose }: { date: string; notes: ReturnType<typeof useUserNotes>; onClose: () => void }) {
  const addEvent = useCalendarStore(s => s.addEvent);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<EventCategory>('personal');
  const [color, setColor] = useState(EVENT_CATEGORY_COLOR.personal);
  const [description, setDescription] = useState('');
  const [linkedNoteId, setLinkedNoteId] = useState('');
  const [repeat, setRepeat] = useState<RepeatRule>('none');
  const cats: EventCategory[] = ['personal', 'trading', 'content', 'other', 'custom'];

  const save = () => {
    if (!title.trim()) return;
    addEvent({ title: title.trim(), date, startTime: startTime || undefined, endTime: endTime || undefined, category, color, description: description || undefined, linkedNoteId: linkedNoteId || undefined, repeat });
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.borderEl}`, borderRadius: 14, width: '100%', maxWidth: 440, fontFamily: fontBody, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: C.text }}>Nuevo evento</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del evento" style={field} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={lbl}>Inicio<input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...field, colorScheme: 'dark' }} /></label>
            <label style={lbl}>Fin<input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...field, colorScheme: 'dark' }} /></label>
          </div>
          <div>
            <div style={lblText}>Categoría</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cats.map(c => <button key={c} onClick={() => { setCategory(c); setColor(EVENT_CATEGORY_COLOR[c]); }} style={{ background: category === c ? `${EVENT_CATEGORY_COLOR[c]}22` : 'transparent', border: `1px solid ${category === c ? EVENT_CATEGORY_COLOR[c] : C.border}`, color: category === c ? EVENT_CATEGORY_COLOR[c] : C.muted, borderRadius: 14, padding: '5px 12px', fontSize: '0.74rem', cursor: 'pointer', fontFamily: fontBody, textTransform: 'capitalize' }}>{c}</button>)}
            </div>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" style={{ ...field, minHeight: 60, resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={lbl}>Repetir
              <select value={repeat} onChange={e => setRepeat(e.target.value as RepeatRule)} style={field}>
                <option value="none">No</option><option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option>
              </select>
            </label>
            <label style={lbl}>Nota vinculada
              <select value={linkedNoteId} onChange={e => setLinkedNoteId(e.target.value)} style={field}>
                <option value="">—</option>{notes.slice(0, 50).map(n => <option key={n.id} value={n.id}>{n.title || 'Sin título'}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 9, padding: '10px 18px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: fontBody }}>Cancelar</button>
          <button onClick={save} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 22px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{children}</button>;
}

/* ── date helpers ─────────────────────────────────────────────────────── */
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(d.getDate() + n); return x; }
function startOfWeek(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
function weekDates(d: Date) { const s = startOfWeek(d); return Array.from({ length: 7 }, (_, i) => iso(addDays(s, i))); }
function buildMonthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const weeks: Date[][] = [];
  let cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) { const row: Date[] = []; for (let i = 0; i < 7; i++) { row.push(new Date(cur)); cur = addDays(cur, 1); } weeks.push(row); }
  const gridEnd = addDays(gridStart, 41);
  return { gridStart, gridEnd, weeks };
}

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: '0.84rem', color: C.text, outline: 'none', fontFamily: fontBody };
const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.72rem', color: C.muted };
const lblText: React.CSSProperties = { fontSize: '0.72rem', color: C.muted, marginBottom: 6 };

export default Calendar;
