import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trade } from '../../store/tradeStore';
import { useRoutineStore, dayRatio } from '../../store/routineStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Watermark } from '../../components/UI/Watermark';
import {
  card, label, fontHead, fmt, pnlColor, EMOJIS, EMOTION_LABEL, statsFor, Mini,
} from './shared';

interface Props { trades: Trade[]; prevTrades: Trade[] | null; compareOn: boolean }

export function Psicologico({ trades }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EmotionalBlock trades={trades} />
      <ErrorsBlock trades={trades} />
      <DisciplineBlock trades={trades} />
      <BehaviorBlock trades={trades} />
      <TiltBlock trades={trades} />
      <style>{`@media (max-width:900px){ .rep-2col,.rep-5{ grid-template-columns:1fr !important; } .rep-3{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

/* ── Emotional state ── */
function EmotionalBlock({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => [1, 2, 3, 4, 5].map(e => ({ e, ...statsFor(trades.filter(t => t.emotionalState === e)) })), [trades]);
  const withOps = data.filter(d => d.n > 0);
  const best = withOps.length ? withOps.reduce((a, b) => (b.wr > a.wr ? b : a)) : null;
  const worst = withOps.length ? withOps.reduce((a, b) => (b.wr < a.wr ? b : a)) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="rep-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {data.map(d => {
          const isBest = best && d.e === best.e && d.n > 0;
          return (
            <div key={d.e} style={{ ...card, textAlign: 'center', borderColor: isBest ? 'rgba(79,143,255,0.4)' : 'var(--border)' }}>
              <div style={{ fontSize: 26 }}>{EMOJIS[d.e]}</div>
              <div style={{ fontSize: '0.62rem', color: '#888898', marginTop: 2 }}>{EMOTION_LABEL[d.e]}</div>
              {d.n === 0 ? <div style={{ fontSize: 11, color: '#33334a', marginTop: 8 }}>Sin trades</div> : (
                <>
                  <div style={{ fontSize: 11, color: '#888898', marginTop: 6 }}>{d.n} ops · {d.wr.toFixed(0)}%</div>
                  <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '0.95rem', color: pnlColor(d.pnl), marginTop: 4 }}>{fmt(d.pnl)}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {best && worst && best.e !== worst.e && (
        <div style={{ ...card, borderColor: 'rgba(79,143,255,0.2)' }}>
          <div style={{ fontSize: '0.85rem', color: '#c8d4e8' }}>💡 Ganas más operando {EMOJIS[best.e]}: win rate <b style={{ color: 'var(--blue)' }}>{best.wr.toFixed(0)}%</b> vs <b style={{ color: 'var(--red)' }}>{worst.wr.toFixed(0)}%</b> cuando operas {EMOJIS[worst.e]}.</div>
        </div>
      )}
    </div>
  );
}

/* ── Repeated errors ── */
function ErrorsBlock({ trades }: { trades: Trade[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of trades) for (const tag of t.errorTags || []) { if (!map.has(tag)) map.set(tag, []); map.get(tag)!.push(t); }
    return [...map.entries()].map(([tag, list]) => {
      const s = statsFor(list);
      const cost = list.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0);
      return { tag, n: list.length, wr: s.wr, pnl: s.pnl, cost };
    }).sort((a, b) => a.cost - b.cost);
  }, [trades]);
  if (rows.length === 0) return <div style={{ ...card }}><div style={label}>Errores repetidos</div><div style={{ fontSize: 12, color: '#4a4a60' }}>Sin tags de error registrados. 🎉</div></div>;
  const maxN = Math.max(...rows.map(r => r.n), 1);
  const worst = rows[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <div style={label}>Frecuencia de errores</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {[...rows].sort((a, b) => b.n - a.n).map(r => (
            <div key={r.tag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 110, fontSize: '0.72rem', color: '#c8d4e8', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tag}</div>
              <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                <div style={{ width: `${(r.n / maxN) * 100}%`, height: '100%', background: 'var(--red)', borderRadius: 4, opacity: 0.8 }} />
              </div>
              <div style={{ width: 30, fontSize: '0.72rem', color: '#888898', textAlign: 'right' }}>{r.n}</div>
            </div>
          ))}
        </div>
        <Watermark />
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr style={{ fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {['Error', 'Trades', 'Win rate', 'Net PnL', 'Costo estimado'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Error' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.tag} style={{ borderTop: '1px solid #1a1a1c' }}>
                <td style={{ padding: '9px 14px', color: '#fff', fontWeight: 600 }}>{r.tag}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', color: '#888898' }}>{r.n}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', color: '#fff' }}>{r.wr.toFixed(0)}%</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', color: pnlColor(r.pnl) }}>{fmt(r.pnl)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--red)', fontWeight: 600 }}>{fmt(r.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Watermark />
      </div>
      {worst.cost < 0 && (
        <div style={{ ...card, borderColor: 'rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: '0.85rem', color: '#c8d4e8' }}>⚠️ Tu error más caro es <b>{worst.tag}</b>: te costó <b style={{ color: 'var(--red)' }}>{fmt(worst.cost)}</b> en total ({worst.n} trades).</div>
        </div>
      )}
    </div>
  );
}

/* ── Discipline ── */
function DisciplineBlock({ trades }: { trades: Trade[] }) {
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);

  const stats = useMemo(() => {
    const days = [...new Set(trades.map(t => t.date))];
    const checklistDays = routine ? days.filter(d => dayRatio(routine, completions[d]) >= 1).length : 0;
    const losers = trades.filter(t => t.pnl < 0);
    const slRespected = losers.length ? (losers.filter(t => t.exitType === 'sl_hit').length / losers.length) * 100 : 100;
    // usual hour band = modal hour ±1
    const hourCounts = new Map<number, number>();
    for (const t of trades) { const h = parseInt(t.time.slice(0, 2), 10); hourCounts.set(h, (hourCounts.get(h) || 0) + 1); }
    let modalHour = 0, modalN = 0; for (const [h, n] of hourCounts) if (n > modalN) { modalHour = h; modalN = n; }
    const withinHours = trades.length ? (trades.filter(t => Math.abs(parseInt(t.time.slice(0, 2), 10) - modalHour) <= 1).length / trades.length) * 100 : 0;
    // sessions (days) without over-trading
    const byDay = new Map<string, number>(); for (const t of trades) byDay.set(t.date, (byDay.get(t.date) || 0) + 1);
    const avgPerDay = byDay.size ? trades.length / byDay.size : 0;
    const okDays = [...byDay.values()].filter(n => n <= avgPerDay * 2).length;
    const sessionsOk = byDay.size ? (okDays / byDay.size) * 100 : 100;
    return { days: days.length, checklistDays, slRespected, withinHours, sessionsOk, byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])), avgPerDay };
  }, [trades, routine, completions]);

  const maxDay = Math.max(...stats.byDay.map(([, n]) => n), 1);

  return (
    <div className="rep-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={card}>
        <div style={label}>Consistencia con reglas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
          <DiscStat label="Días con checklist completo" value={routine ? `${stats.checklistDays}/${stats.days}` : '—'} ok={routine ? stats.checklistDays / Math.max(1, stats.days) >= 0.6 : null} />
          <DiscStat label="Trades con SL respetado" value={`${stats.slRespected.toFixed(0)}%`} ok={stats.slRespected >= 70} />
          <DiscStat label="Dentro de tu horario" value={`${stats.withinHours.toFixed(0)}%`} ok={stats.withinHours >= 60} />
          <DiscStat label="Días sin sobreoperar" value={`${stats.sessionsOk.toFixed(0)}%`} ok={stats.sessionsOk >= 70} />
        </div>
        <Watermark />
      </div>
      <div style={card}>
        <div style={label}>Operaciones por día (riesgo de sobreoperar)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, paddingTop: 10, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(stats.avgPerDay * 2 / (maxDay || 1)) * 90 + 18}px`, height: 1, background: 'rgba(239,68,68,0.4)' }} title="Umbral 2× media" />
          {stats.byDay.map(([d, n]) => (
            <div key={d} style={{ flex: 1, minWidth: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${d}: ${n} ops`}>
              <div style={{ width: '80%', height: Math.max(2, (n / maxDay) * 90), background: n > stats.avgPerDay * 2 ? 'var(--red)' : 'var(--blue)', borderRadius: 2 }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#4a4a60', marginTop: 8 }}>Media {stats.avgPerDay.toFixed(1)} ops/día · barras rojas = posible sobreoperar</div>
        <Watermark />
      </div>
    </div>
  );
}
function DiscStat({ label: l, value, ok }: { label: string; value: string; ok: boolean | null }) {
  const color = ok === null ? '#fff' : ok ? 'var(--blue)' : 'var(--red)';
  return (
    <div>
      <div style={{ fontSize: '0.68rem', color: '#4a4a60' }}>{l}</div>
      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color, marginTop: 3 }}>{value}</div>
    </div>
  );
}

/* ── Behavior patterns ── */
function BehaviorBlock({ trades }: { trades: Trade[] }) {
  const p = useMemo(() => {
    const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
    const after = (predicate: (t: Trade) => boolean) => {
      const nexts: { cur: Trade; next: Trade }[] = [];
      for (let i = 0; i < sorted.length - 1; i++) if (predicate(sorted[i])) nexts.push({ cur: sorted[i], next: sorted[i + 1] });
      const n = nexts.length;
      if (n === 0) return null;
      const sizeUp = nexts.filter(x => x.next.positionSize > x.cur.positionSize).length / n * 100;
      const sameDayGaps = nexts.filter(x => x.next.date === x.cur.date).map(x => mins(x.next.time) - mins(x.cur.time)).filter(g => g >= 0);
      const avgGap = sameDayGaps.length ? sameDayGaps.reduce((s, g) => s + g, 0) / sameDayGaps.length : null;
      const wr = nexts.filter(x => x.next.pnl > 0).length / n * 100;
      const avgResult = nexts.reduce((s, x) => s + x.next.pnl, 0) / n;
      return { n, sizeUp, avgGap, wr, avgResult };
    };
    const postWin = after(t => t.pnl > 0);
    const postLoss = after(t => t.pnl < 0);
    // after best day
    const byDay = new Map<string, number>(); for (const t of trades) byDay.set(t.date, (byDay.get(t.date) || 0) + t.pnl);
    const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let bestDay: string | null = null, bestPnl = -Infinity;
    for (const [d, v] of days) if (v > bestPnl) { bestPnl = v; bestDay = d; }
    let afterBest: { ops: number; wr: number; avg: number } | null = null;
    if (bestDay) {
      const idx = days.findIndex(d => d[0] === bestDay);
      if (idx >= 0 && idx < days.length - 1) {
        const nextDate = days[idx + 1][0];
        const list = trades.filter(t => t.date === nextDate);
        const avgOps = days.length ? trades.length / days.length : 0;
        afterBest = { ops: list.length, wr: statsFor(list).wr, avg: statsFor(list).pnl };
        void avgOps;
      }
    }
    const avgOpsPerDay = days.length ? trades.length / days.length : 0;
    return { postWin, postLoss, afterBest, avgOpsPerDay };
  }, [trades]);

  return (
    <div className="rep-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <BehaviorCard title="Comportamiento post-ganador" data={p.postWin} insight={p.postWin ? `Después de ganar, tu win rate es ${p.postWin.wr.toFixed(0)}%.${p.postWin.wr < 45 ? ' Posible overconfidence.' : ''}` : ''} />
      <BehaviorCard title="Comportamiento post-perdedor" data={p.postLoss} insight={p.postLoss ? `Tras perder${p.postLoss.avgGap !== null ? `, esperas ${Math.round(p.postLoss.avgGap)} min de media` : ''}. ${p.postLoss.avgGap !== null && p.postLoss.avgGap < 5 ? 'Cuidado con revenge trading.' : ''}` : ''} />
      <div style={card}>
        <div style={{ ...label }}>Después de tu mejor día</div>
        {p.afterBest ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <Mini label="Operaciones" value={`${p.afterBest.ops} (media ${p.avgOpsPerDay.toFixed(1)})`} />
              <Mini label="Win rate" value={`${p.afterBest.wr.toFixed(0)}%`} />
              <Mini label="Resultado" value={fmt(p.afterBest.avg)} color={pnlColor(p.afterBest.avg)} />
            </div>
            <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Tu día después del mejor {p.afterBest.avg >= 0 ? 'se mantiene sólido' : 'tiende a dar-back'}.</div>
          </>
        ) : <div style={{ fontSize: 12, color: '#4a4a60', marginTop: 8 }}>Datos insuficientes.</div>}
        <Watermark />
      </div>
    </div>
  );
}
function BehaviorCard({ title, data, insight }: { title: string; data: { n: number; sizeUp: number; avgGap: number | null; wr: number; avgResult: number } | null; insight: string }) {
  return (
    <div style={card}>
      <div style={label}>{title}</div>
      {!data ? <div style={{ fontSize: 12, color: '#4a4a60', marginTop: 8 }}>Datos insuficientes.</div> : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <Mini label="Aumenta tamaño después" value={`${data.sizeUp.toFixed(0)}%`} />
            <Mini label="Espera media" value={data.avgGap !== null ? `${Math.round(data.avgGap)} min` : '—'} />
            <Mini label="Win rate siguiente" value={`${data.wr.toFixed(0)}%`} color={data.wr >= 50 ? 'var(--blue)' : 'var(--red)'} />
          </div>
          {insight && <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{insight}</div>}
        </>
      )}
      <Watermark />
    </div>
  );
}

/* ── Tilt detection ── */
function TiltBlock({ trades }: { trades: Trade[] }) {
  const navigate = useNavigate();
  const dailyLossLimit = useSettingsStore(s => s.dailyLossLimit);
  const flagged = useMemo(() => {
    const byDay = new Map<string, Trade[]>();
    for (const t of trades) { if (!byDay.has(t.date)) byDay.set(t.date, []); byDay.get(t.date)!.push(t); }
    const avg = byDay.size ? trades.length / byDay.size : 0;
    const out: { date: string; n: number; pnl: number; tags: string[] }[] = [];
    for (const [date, list] of byDay) {
      const pnl = list.reduce((s, t) => s + t.pnl, 0);
      const tags = [...new Set(list.flatMap(t => t.errorTags || []))];
      const overTrading = list.length > avg * 3 && list.length >= 3;
      const brokeLimit = pnl <= -dailyLossLimit && list.length >= 2;
      if ((overTrading && tags.length >= 2) || brokeLimit) out.push({ date, n: list.length, pnl, tags });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [trades, dailyLossLimit]);

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ ...label, marginBottom: 0 }}>Detección de tilt</div>
        <span style={{ background: 'rgba(120,97,255,0.12)', color: '#7861ff', fontSize: 9, padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>PRO</span>
      </div>
      {flagged.length === 0 ? (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Ningún día marcado como posible tilt. Buen control. 🧘</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {flagged.map(f => (
            <div key={f.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7 }}>
              <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600, width: 90 }}>{f.date}</span>
              <span style={{ fontSize: '0.74rem', color: '#888898' }}>{f.n} ops</span>
              <span style={{ fontSize: '0.74rem', color: pnlColor(f.pnl), fontWeight: 600 }}>{fmt(f.pnl)}</span>
              <span style={{ flex: 1, fontSize: '0.7rem', color: '#a855f7' }}>{f.tags.join(', ') || '—'}</span>
              <button onClick={() => navigate(`/journal?date=${f.date}`)} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: '0.72rem', cursor: 'pointer' }}>Ver día →</button>
            </div>
          ))}
        </div>
      )}
      <Watermark />
    </div>
  );
}
