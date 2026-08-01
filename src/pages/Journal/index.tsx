import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilteredTrades, groupTradesByDate, type Trade } from '../../store/tradeStore';
import { useNotebookStore, useUserNotes, type Note } from '../../store/notebookStore';
import { HeatmapCalendar, type HeatCell } from '../../components/Charts/HeatmapCalendar';
import { LineChart } from '../../components/Charts/LineChart';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { TradeDetailModal } from '../../components/Modals/TradeDetailModal';
import { useToast } from '../../components/UI/ToastProvider';

const syne: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const body: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const cardStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 12, transition: 'border-color 0.15s ease' };

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtMoney(n: number) { return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`; }
function dayNum(date: string) { return new Date(`${date}T00:00:00`).getDate(); }
function weekday(date: string) { return WEEKDAYS_LONG[new Date(`${date}T00:00:00`).getDay()]; }
function longLabel(date: string) { const d = new Date(`${date}T00:00:00`); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; }

const SESSION_LABEL: Record<string, string> = { london: 'Londres', new_york: 'NY', asia: 'Asia', premarket: 'Pre' };

function dayStats(trades: Trade[]) {
  const ops = trades.length;
  const win = trades.filter(t => t.pnl > 0).length;
  const lose = trades.filter(t => t.pnl < 0).length;
  const be = ops - win - lose;
  const wr = ops > 0 ? (win / ops) * 100 : 0;
  const vol = trades.reduce((s, t) => s + t.positionSize, 0);
  const sessions = [...new Set(trades.map(t => SESSION_LABEL[t.session] ?? t.session))];
  return { ops, win, lose, be, wr, vol, sessions };
}

export function Journal() {
  const trades = useFilteredTrades();
  const notes = useUserNotes();
  const ensureDiarioFolder = useNotebookStore(s => s.ensureDiarioFolder);
  const addNote = useNotebookStore(s => s.addNote);
  const updateNote = useNotebookStore(s => s.updateNote);
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const focusDate = searchParams.get('date');

  const grouped = useMemo(() => groupTradesByDate(trades), [trades]);
  const dayNotes = useMemo(() => notes.filter(n => n.noteDate), [notes]);

  // Days with activity (trades or a day note), newest first.
  const activeDays = useMemo(() => {
    const set = new Set<string>([...Object.keys(grouped), ...dayNotes.map(n => n.noteDate!)]);
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [grouped, dayNotes]);

  const [selectedDate, setSelectedDate] = useState<string>(focusDate ?? activeDays[0] ?? todayISO());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [calOpen, setCalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Deep-link once.
  const didFocus = useRef(false);
  useEffect(() => {
    if (focusDate && !didFocus.current) { didFocus.current = true; setSelectedDate(focusDate); }
  }, [focusDate]);

  const dayTrades = grouped[selectedDate] ?? [];
  const dayNote = useMemo(() => dayNotes.find(n => n.noteDate === selectedDate) ?? null, [dayNotes, selectedDate]);
  const dayPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
  const stats = dayStats(dayTrades);

  // Prev/next day *with activity*.
  const prevDay = useMemo(() => activeDays.find(d => d < selectedDate) ?? null, [activeDays, selectedDate]);
  const nextDay = useMemo(() => [...activeDays].reverse().find(d => d > selectedDate) ?? null, [activeDays, selectedDate]);

  // Calendar popover cells for the selected month.
  const calCells = useMemo<HeatCell[]>(() => {
    const d = new Date(`${selectedDate}T00:00:00`);
    const y = d.getFullYear(), m = d.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
    const cells: HeatCell[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ date: `p${i}`, day: 0, pnl: null });
    for (let day = 1; day <= total; day++) {
      const date = `${prefix}-${String(day).padStart(2, '0')}`;
      const has = !!grouped[date] || dayNotes.some(n => n.noteDate === date);
      const pnl = grouped[date] ? grouped[date].reduce((s, t) => s + t.pnl, 0) : (has ? 0 : null);
      cells.push({ date, day, pnl, isToday: date === todayISO() });
    }
    return cells;
  }, [selectedDate, grouped, dayNotes]);

  const buildHeader = () => {
    const w = stats.win, l = stats.lose;
    return `<p><strong>Resumen del día ${longLabel(selectedDate)}</strong></p>`
      + `<p>Net PnL: ${fmtMoney(dayPnl)}</p>`
      + `<p>Operaciones: ${stats.ops} (${w}W / ${l}L)</p>`
      + `<p><br></p><p>Reflexión: </p>`;
  };

  const onDayNoteButton = () => {
    if (dayNote) { setEditing(true); return; }
    const folder = ensureDiarioFolder();
    const note = addNote(folder.id, `Diario · ${longLabel(selectedDate)}`, buildHeader(), selectedDate);
    updateNote(note.id, { noteDate: selectedDate });
    setEditing(true);
    push({ kind: 'success', text: 'Nota del día creada' });
  };

  // Load content into editor when entering edit mode.
  useEffect(() => {
    if (editing && editorRef.current) editorRef.current.innerHTML = dayNote?.content ?? buildHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, dayNote?.id]);

  const saveNote = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    if (dayNote) updateNote(dayNote.id, { content });
    else {
      const folder = ensureDiarioFolder();
      const note = addNote(folder.id, `Diario · ${longLabel(selectedDate)}`, content, selectedDate);
      updateNote(note.id, { noteDate: selectedDate });
    }
    setEditing(false);
    push({ kind: 'success', text: 'Nota guardada' });
  };

  const hasActivity = dayTrades.length > 0 || !!dayNote;

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Day navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '4px 0', position: 'relative' }}>
        <Button variant="outline" size="sm" disabled={!prevDay} onClick={() => prevDay && setSelectedDate(prevDay)}>‹ Día anterior</Button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setCalOpen(o => !o)}
            style={{ ...body, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 16px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            📅 {selectedDate === todayISO() ? 'Hoy: ' : ''}{longLabel(selectedDate)}
          </button>
          {calOpen && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 42, left: '50%', transform: 'translateX(-50%)', zIndex: 50, width: 300, ...cardStyle, background: 'var(--card-2)', padding: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ ...syne, fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
                {MONTHS[new Date(`${selectedDate}T00:00:00`).getMonth()]} {new Date(`${selectedDate}T00:00:00`).getFullYear()}
              </div>
              <HeatmapCalendar cells={calCells} selected={selectedDate} onSelect={d => { setSelectedDate(d); setCalOpen(false); setEditing(false); }} compact />
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" disabled={!nextDay} onClick={() => nextDay && setSelectedDate(nextDay)}>Día siguiente ›</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        {/* LEFT — month heatmap */}
        <div style={{ ...cardStyle, padding: 16, position: 'sticky', top: 8 }}>
          <div style={{ ...syne, fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 12 }}>
            {MONTHS[new Date(`${selectedDate}T00:00:00`).getMonth()]} {new Date(`${selectedDate}T00:00:00`).getFullYear()}
          </div>
          <HeatmapCalendar cells={calCells} selected={selectedDate} onSelect={d => { setSelectedDate(d); setEditing(false); }} compact />
        </div>

        {/* RIGHT — selected day */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!hasActivity ? (
            <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🗓️</div>
              <div style={{ ...syne, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 6 }}>Sin actividad este día</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 18 }}>{weekday(selectedDate)}, {longLabel(selectedDate)}</div>
              <Button variant="primary" onClick={onDayNoteButton}>＋ Añadir nota del día</Button>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ ...syne, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{dayNum(selectedDate)} {MONTHS[new Date(`${selectedDate}T00:00:00`).getMonth()]}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{weekday(selectedDate)}</div>
                </div>
                {dayTrades.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...syne, fontWeight: 800, fontSize: '1.4rem', color: dayPnl >= 0 ? 'var(--blue)' : 'var(--red)' }}>{fmtMoney(dayPnl)}</span>
                    <Badge variant="neutral">{stats.ops} {stats.ops === 1 ? 'op' : 'ops'}</Badge>
                  </div>
                )}
              </div>

              {dayTrades.length > 0 ? (
                <>
                  {/* Stats subrow */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
                    <SubStat label="Resultado" value={`${stats.win}W · ${stats.lose}L · ${stats.be}BE`} />
                    <SubStat label="Win rate" value={`${stats.wr.toFixed(0)}%`} border />
                    <SubStat label="Volumen" value={`${stats.vol} contr.`} border />
                    <SubStat label="Sesiones" value={stats.sessions.join(', ') || '—'} border />
                  </div>

                  {/* Mini equity */}
                  <DayEquity trades={dayTrades} pos={dayPnl >= 0} />

                  {/* Trades table */}
                  <div>
                    <button onClick={() => setExpanded(e => !e)} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, ...body, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      Ver {stats.ops} {stats.ops === 1 ? 'operación' : 'operaciones'}
                      <span style={{ display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', fontSize: 9 }}>▾</span>
                    </button>
                    {expanded && (
                      <div style={{ marginTop: 10, border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
                        {[...dayTrades].sort((a, b) => a.time.localeCompare(b.time)).map((t, i) => {
                          const status = t.pnl > 0 ? 'ganancia' : t.pnl < 0 ? 'perdida' : 'breakEven';
                          const statusLabel = t.pnl > 0 ? 'WIN' : t.pnl < 0 ? 'LOSS' : 'BE';
                          return (
                            <div key={t.id} onClick={() => setDetailId(t.id)} className="diario-trow"
                              style={{ display: 'grid', gridTemplateColumns: '52px 1fr 64px 90px 1fr 64px', gap: 8, alignItems: 'center', padding: '8px 12px', fontSize: '0.78rem', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', ...body }}>
                              <span style={{ color: 'var(--text-muted)' }}>{t.time}</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{t.asset}{t.groupId && <span title="Copiada en varias cuentas" style={{ fontSize: 9, cursor: 'help' }}>🔗</span>}</span>
                              <Badge variant={t.direction === 'long' ? 'ganancia' : 'perdida'}>{t.direction === 'long' ? 'LONG' : 'SHORT'}</Badge>
                              <span style={{ color: t.pnl >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight: 600, textAlign: 'right' }}>{fmtMoney(t.pnl)}</span>
                              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.setup || '—'}</span>
                              <Badge variant={status}>{statusLabel}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Sin operaciones este día.</div>
              )}

              {/* Day note */}
              <DayNoteCard
                note={dayNote}
                editing={editing}
                editorRef={editorRef}
                onEdit={() => setEditing(true)}
                onSave={saveNote}
                onCancel={() => setEditing(false)}
                onCreate={onDayNoteButton}
                buttonLabel={dayNote ? 'Editar nota del día' : '＋ Añadir nota del día'}
              />
            </div>
          )}
        </div>
      </div>

      <TradeDetailModal trade={trades.find(t => t.id === detailId) ?? null} onClose={() => setDetailId(null)} />
      {calOpen && <div onClick={() => setCalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}
    </div>
  );
}

function DayEquity({ trades, pos }: { trades: Trade[]; pos: boolean }) {
  const curve = useMemo(() => {
    const sorted = [...trades].sort((a, b) => a.time.localeCompare(b.time));
    let cum = 0;
    return sorted.map(t => { cum += t.pnl; return { value: cum }; });
  }, [trades]);
  if (curve.length < 2) return null;
  return <LineChart data={curve} height={40} color={pos ? 'var(--blue)' : 'var(--red)'} showGrid={false} showPeak={false} />;
}

function DayNoteCard({ note, editing, editorRef, onEdit, onSave, onCancel, onCreate, buttonLabel }: {
  note: Note | null; editing: boolean; editorRef: React.RefObject<HTMLDivElement | null>;
  onEdit: () => void; onSave: () => void; onCancel: () => void; onCreate: () => void; buttonLabel: string;
}) {
  const exec = (cmd: string) => document.execCommand(cmd, false);
  if (editing) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Nota del día</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['bold', 'italic', 'insertUnorderedList'] as const).map(c => (
              <button key={c} onMouseDown={e => e.preventDefault()} onClick={() => exec(c)} style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12 }}>{c === 'bold' ? 'B' : c === 'italic' ? 'I' : '≡'}</button>
            ))}
          </div>
        </div>
        <div ref={editorRef} contentEditable suppressContentEditableWarning className="nb-editor" data-placeholder="Escribe tu reflexión del día..."
          style={{ minHeight: 120, fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text)', outline: 'none', fontFamily: "'Space Grotesk', sans-serif" }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button variant="primary" size="sm" onClick={onSave}>Guardar</Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    );
  }
  if (note) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Nota del día</div>
          <button onClick={onEdit} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Editar</button>
        </div>
        <div className="nb-editor" style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }} dangerouslySetInnerHTML={{ __html: note.content }} />
      </div>
    );
  }
  return (
    <button onClick={onCreate} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '9px 14px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>{buttonLabel}</button>
  );
}

function SubStat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderLeft: border ? '1px solid var(--border-subtle)' : 'none' }}>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ ...body, fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}

export default Journal;
