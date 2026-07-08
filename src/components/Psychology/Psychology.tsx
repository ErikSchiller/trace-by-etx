import { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { t } from '../../i18n';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { EmotionPicker } from '../UI/EmotionIndicator';
import type { EmotionalState } from '../../types';
import { clsx } from 'clsx';
import { AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function Psychology() {
  const { moods, trades, settings, saveMood, getMood, saveDailyPlan, getDailyPlan, language } = useStore();
  const tr = t(language);

  const today = new Date().toISOString().split('T')[0];
  const todayMood = getMood(today);
  const todayPlan = getDailyPlan(today);

  const [moodVal, setMoodVal] = useState<EmotionalState>(todayMood?.mood ?? 3);
  const [moodNotes, setMoodNotes] = useState(todayMood?.notes ?? '');
  const [weeklyReflection, setWeeklyReflection] = useState(todayPlan?.weeklyReflection ?? '');
  const [checklist, setChecklist] = useState<{ item: string; checked: boolean }[]>(
    todayPlan?.checklist ?? settings.defaultChecklistItems.map(item => ({ item, checked: false }))
  );

  const toggleCheck = (i: number) => {
    setChecklist(list => list.map((c, idx) => idx === i ? { ...c, checked: !c.checked } : c));
  };

  const handleSaveMood = () => {
    saveMood({ date: today, mood: moodVal, notes: moodNotes });
    const existing = getDailyPlan(today);
    saveDailyPlan({
      date: today,
      keyLevels: existing?.keyLevels ?? '',
      newsEvents: existing?.newsEvents ?? '',
      gamePlan: existing?.gamePlan ?? '',
      maxLossLimit: existing?.maxLossLimit ?? settings.dailyLossLimit,
      watchlist: existing?.watchlist ?? [],
      checklist,
      moodBefore: moodVal,
      weeklyReflection,
    });
  };

  const moodHistory = useMemo(() =>
    [...moods].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map(m => ({
      date: m.date.slice(5),
      mood: m.mood,
    })),
    [moods]
  );

  const impulseCount = trades.filter(t => !t.isPlanBased).length;
  const impulseRate  = trades.length ? ((impulseCount / trades.length) * 100).toFixed(1) : '0.0';

  // Pattern detection
  const patterns: string[] = useMemo(() => {
    const alerts: string[] = [];
    if (trades.length < 5) return alerts;

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let d = 0; d < 7; d++) {
      const dayTrades = trades.filter(t => new Date(t.date).getDay() === d);
      if (dayTrades.length >= 3) {
        const losses = dayTrades.filter(t => t.pnl < 0).length;
        const rate = (losses / dayTrades.length) * 100;
        if (rate >= 60) alerts.push(`Pierdes el ${rate.toFixed(0)}% de las operaciones los ${dayNames[d]}`);
      }
    }

    const fomo = trades.filter(t => t.errorTags.includes('FOMO'));
    if (fomo.length >= 3) alerts.push(`Has cometido ${fomo.length} trades por FOMO — patrón recurrente`);

    const revengeTrades = trades.filter(t => t.errorTags.includes('Venganza'));
    if (revengeTrades.length >= 2) alerts.push(`${revengeTrades.length} operaciones de venganza detectadas`);

    const emotionalHighTrades = trades.filter(t => t.emotionalState >= 4);
    if (emotionalHighTrades.length >= 3) {
      const lossRate = (emotionalHighTrades.filter(t => t.pnl < 0).length / emotionalHighTrades.length) * 100;
      if (lossRate >= 60) alerts.push(`Pierdes el ${lossRate.toFixed(0)}% de las ops cuando estás ansioso (estado ≥4)`);
    }

    return alerts;
  }, [trades]);

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-[#e2e2f0] mb-6">{tr.psychology.title}</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Daily mood log */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.psychology.moodLog} — {today}</div>
          <EmotionPicker value={moodVal} onChange={v => setMoodVal(v as EmotionalState)} label={tr.psychology.dailyMood} />
          <div className="mt-3">
            <label className="text-xs text-[#8888aa] mb-1 block">{tr.psychology.notes}</label>
            <textarea
              value={moodNotes}
              onChange={e => setMoodNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#14141e] border border-[#1e1e2e] text-[#e2e2f0] rounded-md px-3 py-2 text-sm focus:border-[#00d4aa] outline-none resize-none"
              placeholder="¿Cómo te sientes antes de operar hoy?"
            />
          </div>
          <Button variant="primary" size="sm" className="mt-3" onClick={handleSaveMood}>
            {tr.psychology.saveMood}
          </Button>
        </Card>

        {/* Checklist */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.psychology.preChecklist}</div>
          <div className="flex flex-col gap-2">
            {checklist.map((item, i) => (
              <button key={i} type="button" onClick={() => toggleCheck(i)} className="flex items-center gap-2.5 text-left group">
                {item.checked
                  ? <CheckSquare size={15} className="text-[#00d4aa] flex-shrink-0" />
                  : <Square size={15} className="text-[#55557a] group-hover:text-[#8888aa] flex-shrink-0" />
                }
                <span className={clsx('text-sm transition-colors', item.checked ? 'text-[#8888aa] line-through' : 'text-[#e2e2f0]')}>
                  {item.item}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs font-mono text-[#55557a]">
            {checklist.filter(c => c.checked).length}/{checklist.length} completados
          </div>
        </Card>

        {/* Mood history chart */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">Historial de estado emocional</div>
          {moodHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={moodHistory} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4dabf7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4dabf7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#14141e', border: '1px solid #2a2a3d', borderRadius: 6 }}
                  labelStyle={{ color: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  itemStyle={{ color: '#4dabf7', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                />
                <Area type="monotone" dataKey="mood" stroke="#4dabf7" strokeWidth={2} fill="url(#moodGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-[#55557a] text-sm py-8">Registra más estados para ver el gráfico</div>
          )}
        </Card>

        {/* Impulse stats */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.psychology.impulseStats}</div>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-3xl font-mono font-bold text-[#ff8c00]">{impulseRate}%</span>
            <span className="text-sm text-[#55557a]">operaciones impulsivas</span>
          </div>
          <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full bg-[#ff8c00]" style={{ width: `${impulseRate}%` }} />
          </div>
          <div className="text-xs font-mono text-[#55557a]">{impulseCount} de {trades.length} operaciones</div>
          {parseFloat(impulseRate) > 30 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#ffd43b] bg-[rgba(255,212,59,0.1)] border border-[rgba(255,212,59,0.2)] rounded-md px-2.5 py-1.5">
              <AlertTriangle size={12} />
              Alta tasa de impulsividad — revisa tu proceso
            </div>
          )}
        </Card>

        {/* Pattern alerts */}
        {patterns.length > 0 && (
          <Card className="p-4 xl:col-span-2">
            <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={12} className="text-[#ffd43b]" />
              {tr.psychology.patterns}
            </div>
            <div className="flex flex-col gap-2">
              {patterns.map((p, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-[#e2e2f0] bg-[rgba(255,212,59,0.06)] border border-[rgba(255,212,59,0.15)] rounded-md px-3 py-2">
                  <AlertTriangle size={13} className="text-[#ffd43b] flex-shrink-0 mt-0.5" />
                  {p}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Weekly reflection */}
        <Card className="p-4 xl:col-span-2">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-3">{tr.psychology.weeklyReflection}</div>
          <textarea
            value={weeklyReflection}
            onChange={e => setWeeklyReflection(e.target.value)}
            rows={5}
            className="w-full bg-[#14141e] border border-[#1e1e2e] text-[#e2e2f0] rounded-md px-3 py-2 text-sm focus:border-[#00d4aa] outline-none resize-none"
            placeholder="Reflexión de la semana: ¿Qué aprendiste? ¿Qué mejorarás la próxima semana?"
          />
          <Button variant="primary" size="sm" className="mt-2" onClick={handleSaveMood}>
            Guardar reflexión
          </Button>
        </Card>
      </div>
    </div>
  );
}
