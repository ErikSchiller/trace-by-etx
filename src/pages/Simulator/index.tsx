import { useMemo, useState } from 'react';
import { useUserTrades } from '../../store/tradeStore';
import { PROP_FIRM_PRESETS } from '../../config/propFirmPresets';
import { runMonteCarloSimulation, type MonteCarloResult } from '../../utils/monteCarlo';
import { ProLock } from '../../components/UI/ProLock';
import { Watermark } from '../../components/UI/Watermark';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const card: React.CSSProperties = { background: '#161618', border: '1px solid #1e1e20', borderRadius: 12, padding: '18px 20px', position: 'relative' };
const lab: React.CSSProperties = { fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 };
const inp: React.CSSProperties = { background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8, padding: '9px 12px', color: '#e0e0e8', fontSize: '0.85rem', width: '100%', outline: 'none', fontFamily: fontBody, boxSizing: 'border-box' };
const sectionTitle: React.CSSProperties = { fontSize: '0.62rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12 };

export default function Simulator() {
  const trades = useUserTrades();

  const [winRate, setWinRate] = useState(50);
  const [avgWinnerR, setAvgWinnerR] = useState(1.5);
  const [avgLoserR, setAvgLoserR] = useState(-1);
  const [riskPerTrade, setRiskPerTrade] = useState(100);
  const [tradesPerDay, setTradesPerDay] = useState(3);
  const [usedReal, setUsedReal] = useState(false);

  const [presetKey, setPresetKey] = useState('topstep_50k');
  const preset = PROP_FIRM_PRESETS[presetKey];
  const [profitTarget, setProfitTarget] = useState(preset.profitTarget);
  const [maxDrawdown, setMaxDrawdown] = useState(preset.maxDrawdown);
  const [drawdownType, setDrawdownType] = useState(preset.drawdownType);
  const [dailyLossLimit, setDailyLossLimit] = useState(preset.dailyLossLimit ?? 0);
  const [minDays, setMinDays] = useState(preset.minDays);
  const [consistency, setConsistency] = useState(preset.consistencyRule ?? 0);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MonteCarloResult | null>(null);

  const applyPreset = (key: string) => {
    setPresetKey(key);
    const p = PROP_FIRM_PRESETS[key];
    setProfitTarget(p.profitTarget); setMaxDrawdown(p.maxDrawdown);
    setDrawdownType(p.drawdownType); setDailyLossLimit(p.dailyLossLimit ?? 0);
    setMinDays(p.minDays); setConsistency(p.consistencyRule ?? 0);
  };

  const realStats = useMemo(() => {
    if (trades.length === 0) return null;
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const wr = (wins.length / trades.length) * 100;
    const avgW = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgL = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1;
    const days = new Set(trades.map(t => t.date)).size;
    return { wr, winR: avgL ? avgW / avgL : 1.5, loseR: -1, tpd: Math.max(1, Math.round(trades.length / Math.max(1, days))), count: trades.length };
  }, [trades]);

  const useReal = () => {
    if (!realStats) return;
    setWinRate(Math.round(realStats.wr));
    setAvgWinnerR(Math.round(realStats.winR * 10) / 10);
    setAvgLoserR(-1);
    setTradesPerDay(realStats.tpd);
    setUsedReal(true);
  };

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const res = runMonteCarloSimulation({
        winRate: winRate / 100, avgWinnerR, avgLoserR, riskPerTrade, tradesPerDay,
        profitTarget, maxDrawdown, drawdownType,
        dailyLossLimit: dailyLossLimit || null, minDays,
        consistencyRule: consistency ? consistency / 100 : null,
        timeLimit: null, simulations: 1000,
      });
      setResult(res);
      setRunning(false);
    }, 30);
  };

  const passPct = result ? Math.round(result.passRate * 100) : 0;
  const gaugeColor = passPct > 70 ? '#4f8fff' : passPct >= 40 ? '#f59e0b' : '#ef4444';
  const verdict = passPct >= 80 ? 'Edge sólido. Adelante con esta evaluación.'
    : passPct >= 60 ? 'Probabilidad razonable. Ajusta riesgo si quieres más margen.'
    : passPct >= 40 ? 'Borderline. La varianza te puede traicionar.'
    : 'No te recomendamos esta eval con estos stats. Mejora tu R:R o win rate primero.';

  return (
    <ProLock feature="Simulador Monte Carlo" description="Simula tu probabilidad de pasar evaluaciones con Monte Carlo">
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <h1 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>Simulador Monte Carlo</h1>
          <span style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 700 }}>ALPHA</span>
        </div>

        <div className="sim-grid" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' }}>
          {/* LEFT — inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={sectionTitle}>Tus estadísticas</div>
              <button onClick={useReal} disabled={!realStats} style={{ width: '100%', background: realStats ? 'rgba(79,143,255,0.1)' : '#161618', color: realStats ? '#4f8fff' : '#4a4a60', border: `1px solid ${realStats ? 'rgba(79,143,255,0.25)' : '#1e1e20'}`, borderRadius: 8, padding: '9px', fontSize: '0.82rem', fontWeight: 600, cursor: realStats ? 'pointer' : 'default', fontFamily: fontBody, marginBottom: 6 }}>
                Usar mis datos reales
              </button>
              {usedReal && realStats && <div style={{ fontSize: '0.68rem', color: '#4f8fff', marginBottom: 10 }}>✓ Calculado de tus {realStats.count} operaciones</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <div>
                  <label style={lab}>Win rate: {winRate}%</label>
                  <input type="range" min={0} max={100} value={winRate} onChange={e => setWinRate(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#4f8fff' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={lab}>Avg winner (R)</label><input type="number" step="0.1" value={avgWinnerR} onChange={e => setAvgWinnerR(parseFloat(e.target.value) || 0)} style={inp} /></div>
                  <div><label style={lab}>Avg loser (R)</label><input type="number" step="0.1" value={avgLoserR} onChange={e => setAvgLoserR(parseFloat(e.target.value) || 0)} style={inp} /></div>
                  <div><label style={lab}>Riesgo/trade ($)</label><input type="number" value={riskPerTrade} onChange={e => setRiskPerTrade(parseFloat(e.target.value) || 0)} style={inp} /></div>
                  <div><label style={lab}>Trades/día</label><input type="number" value={tradesPerDay} onChange={e => setTradesPerDay(parseFloat(e.target.value) || 1)} style={inp} /></div>
                </div>
                <div style={{ fontSize: '0.66rem', color: '#33334a', lineHeight: 1.5 }}>R-multiple = múltiplo de tu riesgo. Si arriesgas $100 y tu winner medio es $150, tu Avg Winner es 1.5R.</div>
              </div>
            </div>

            <div style={card}>
              <div style={sectionTitle}>Firma y reglas</div>
              <label style={lab}>Firma</label>
              <select value={presetKey} onChange={e => applyPreset(e.target.value)} style={{ ...inp, marginBottom: 12 }}>
                {Object.keys(PROP_FIRM_PRESETS).map(k => <option key={k} value={k}>{PROP_FIRM_PRESETS[k].name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lab}>Profit target ($)</label><input type="number" value={profitTarget} onChange={e => setProfitTarget(parseFloat(e.target.value) || 0)} style={inp} /></div>
                <div><label style={lab}>Max drawdown ($)</label><input type="number" value={maxDrawdown} onChange={e => setMaxDrawdown(parseFloat(e.target.value) || 0)} style={inp} /></div>
                <div><label style={lab}>Daily loss ($)</label><input type="number" value={dailyLossLimit} onChange={e => setDailyLossLimit(parseFloat(e.target.value) || 0)} style={inp} /></div>
                <div><label style={lab}>Mín días</label><input type="number" value={minDays} onChange={e => setMinDays(parseFloat(e.target.value) || 0)} style={inp} /></div>
                <div><label style={lab}>Consistencia (%)</label><input type="number" value={consistency} onChange={e => setConsistency(parseFloat(e.target.value) || 0)} style={inp} /></div>
                <div>
                  <label style={lab}>Drawdown</label>
                  <select value={drawdownType} onChange={e => setDrawdownType(e.target.value as 'trailing' | 'static')} style={inp}>
                    <option value="trailing">Trailing</option><option value="static">Static</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={run} disabled={running} style={{ background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: '0.92rem', fontWeight: 600, cursor: running ? 'default' : 'pointer', fontFamily: fontBody, boxShadow: '0 4px 16px rgba(79,143,255,0.25)', opacity: running ? 0.7 : 1 }}>
              {running ? 'Simulando…' : 'Ejecutar simulación →'}
            </button>
          </div>

          {/* RIGHT — results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!result ? (
              <div style={{ ...card, padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 34, marginBottom: 12 }}>🎲</div>
                <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: 6 }}>Configura tus stats y pulsa ejecutar</div>
                <div style={{ fontSize: 13, color: '#4a4a60' }}>Simulamos 1000 evaluaciones con tus números.</div>
              </div>
            ) : (
              <>
                {/* Verdict + gauge */}
                <div style={{ ...card, padding: '24px 28px', display: 'flex', gap: 28, alignItems: 'center' }}>
                  <Gauge pct={passPct} color={gaugeColor} />
                  <div>
                    <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 8 }}>Probabilidad de pasar</div>
                    <div style={{ fontSize: '0.9rem', color: '#888898', lineHeight: 1.5, maxWidth: 360 }}>{verdict}</div>
                  </div>
                  <Watermark />
                </div>

                {/* stats 2x2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <MiniStat label="Pasaron" value={`${Math.round(result.passRate * 1000)}/1000`} color="#4f8fff" />
                  <MiniStat label="Reventaron" value={`${Math.round(result.blowoutRate * 1000)}/1000`} color="#ef4444" />
                  <MiniStat label="Expiraron" value={`${Math.round(result.timeoutRate * 1000)}/1000`} color="#888898" />
                  <MiniStat label="Pasaron sin breach" value={`${Math.round(result.passWithoutBreachRate * 100)}%`} color="#4f8fff" />
                </div>

                {/* Equity paths */}
                <div style={card}>
                  <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: 12 }}>1000 caminos simulados</div>
                  <PathsChart result={result} target={profitTarget} maxDD={maxDrawdown} />
                  <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: '0.78rem', color: '#888898' }}>
                    <span>Mediana a pasar: <b style={{ color: '#fff' }}>{result.medianDaysToPass} días</b></span>
                    <span>P10: <b style={{ color: '#4f8fff' }}>{result.p10Days}d</b></span>
                    <span>P90: <b style={{ color: '#ef4444' }}>{result.p90Days}d</b></span>
                  </div>
                  <Watermark />
                </div>
              </>
            )}
          </div>
        </div>
        <style>{`@media (max-width: 900px){ .sim-grid{ grid-template-columns:1fr !important; } }`}</style>
      </div>
    </ProLock>
  );
}

function Gauge({ pct, color }: { pct: number; color: string }) {
  const r = 52, cx = 64, cy = 64, circ = Math.PI * r; // semicircle
  const filled = (pct / 100) * circ;
  return (
    <svg width="128" height="78" viewBox="0 0 128 78" style={{ flexShrink: 0 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1e1e20" strokeWidth="9" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} />
      <text x={cx} y={cy - 8} textAnchor="middle" fontFamily="Syne" fontWeight="800" fontSize="26" fill="#fff">{pct}%</text>
    </svg>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={{ fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function PathsChart({ result, target, maxDD }: { result: MonteCarloResult; target: number; maxDD: number }) {
  const W = 560, H = 200;
  const all = result.samplePaths;
  const lo = Math.min(-maxDD, ...all.flat(), 0);
  const hi = Math.max(target, ...all.flat(), 0);
  const range = hi - lo || 1;
  const x = (i: number, len: number) => (i / Math.max(1, len - 1)) * W;
  const y = (v: number) => H - ((v - lo) / range) * H;
  const toPath = (curve: number[]) => curve.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i, curve.length).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* reference lines */}
      <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="#4f8fff" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <line x1={0} x2={W} y1={y(-maxDD)} y2={y(-maxDD)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#1e1e20" strokeWidth="1" />
      {all.map((c, i) => <path key={i} d={toPath(c)} fill="none" stroke="rgba(79,143,255,0.05)" strokeWidth="1" />)}
      <path d={toPath(result.medianEquityCurve)} fill="none" stroke="#4f8fff" strokeWidth="2" />
    </svg>
  );
}
