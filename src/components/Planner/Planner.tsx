import { useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store';
import { t } from '../../i18n';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { EmotionPicker } from '../UI/EmotionIndicator';
import type { EmotionalState } from '../../types';
import { getTodayTrades, getTotalPnL } from '../../utils/calculations';
import { clsx } from 'clsx';

export function Planner() {
  const { settings, saveDailyPlan, getDailyPlan, trades, language } = useStore();
  const tr = t(language);

  const today = new Date().toISOString().split('T')[0];
  const existing = getDailyPlan(today);

  const [keyLevels, setKeyLevels]   = useState(existing?.keyLevels ?? '');
  const [newsEvents, setNewsEvents] = useState(existing?.newsEvents ?? '');
  const [gamePlan, setGamePlan]     = useState(existing?.gamePlan ?? '');
  const [maxLoss, setMaxLoss]       = useState(existing?.maxLossLimit ?? settings.dailyLossLimit);
  const [moodBefore, setMoodBefore] = useState<EmotionalState>(existing?.moodBefore ?? 3);
  const [watchlist, setWatchlist]   = useState<string[]>(existing?.watchlist ?? []);
  const [newWatch, setNewWatch]     = useState('');
  const [checklist, setChecklist]   = useState<{ item: string; checked: boolean }[]>(
    existing?.checklist ?? settings.defaultChecklistItems.map(item => ({ item, checked: false }))
  );
  const [newCheckItem, setNewCheckItem] = useState('');
  const [saved, setSaved]           = useState(false);

  const todayPnL  = getTotalPnL(getTodayTrades(trades));
  const limitUsed = maxLoss > 0 ? Math.min(100, (Math.abs(Math.min(0, todayPnL)) / maxLoss) * 100) : 0;
  const limitReached = todayPnL <= -maxLoss;

  const addWatchItem = () => {
    if (!newWatch.trim()) return;
    setWatchlist(w => [...w, newWatch.trim().toUpperCase()]);
    setNewWatch('');
  };

  const removeWatch = (i: number) => setWatchlist(w => w.filter((_, idx) => idx !== i));

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist(c => [...c, { item: newCheckItem.trim(), checked: false }]);
    setNewCheckItem('');
  };

  const toggleCheck = (i: number) => setChecklist(c => c.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item));

  const handleSave = () => {
    saveDailyPlan({ date: today, keyLevels, newsEvents, gamePlan, maxLossLimit: maxLoss, watchlist, checklist, moodBefore });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sym = settings.currencySymbol;
  const inputClass = 'w-full bg-[#14141e] border border-[#1e1e2e] text-[#e2e2f0] rounded-md px-3 py-2 text-sm font-mono focus:border-[#00d4aa] focus:outline-none transition-colors';
  const labelClass = 'text-xs text-[#8888aa] mb-1 block';

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#e2e2f0]">{tr.planner.title}</h1>
          <p className="text-xs text-[#55557a] font-mono mt-0.5">{today}</p>
        </div>
        <Button variant="primary" onClick={handleSave}>
          {saved ? '✓ Guardado' : tr.planner.save}
        </Button>
      </div>

      {/* Daily loss limit warning */}
      {limitReached && (
        <div className="mb-5 flex items-center gap-3 bg-[rgba(255,71,87,0.12)] border border-[rgba(255,71,87,0.3)] rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-[#ff4757]" />
          <span className="text-sm text-[#ff4757] font-medium">{tr.common.limitReached} — {sym}{Math.abs(todayPnL).toFixed(2)} perdidos de {sym}{maxLoss}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Max loss & mood */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">Límite y estado</div>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>{tr.planner.maxLoss} ({sym})</label>
              <input type="number" className={inputClass} value={maxLoss} onChange={e => setMaxLoss(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass}>Pérdida hoy</label>
                <span className={clsx('text-xs font-mono', limitUsed >= 80 ? 'text-[#ff4757]' : limitUsed >= 50 ? 'text-[#ffd43b]' : 'text-[#00d4aa]')}>
                  {limitUsed.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${limitUsed}%`,
                    background: limitUsed >= 80 ? '#ff4757' : limitUsed >= 50 ? '#ffd43b' : '#00d4aa',
                  }}
                />
              </div>
            </div>
            <EmotionPicker value={moodBefore} onChange={v => setMoodBefore(v as EmotionalState)} label="Estado emocional antes del mercado" />
          </div>
        </Card>

        {/* Watchlist */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.planner.watchlist}</div>
          <div className="flex gap-2 mb-3">
            <input type="text" className={clsx(inputClass, 'flex-1')} value={newWatch} onChange={e => setNewWatch(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWatchItem()} placeholder="NQ, EURUSD..." />
            <Button size="sm" variant="secondary" onClick={addWatchItem}><Plus size={13} /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {watchlist.map((item, i) => (
              <div key={i} className="flex items-center gap-1 bg-[#1e1e2e] border border-[#2a2a3d] rounded px-2 py-1">
                <span className="text-xs font-mono text-[#e2e2f0]">{item}</span>
                <button onClick={() => removeWatch(i)} className="text-[#55557a] hover:text-[#ff4757] transition-colors"><X size={11} /></button>
              </div>
            ))}
          </div>
        </Card>

        {/* Key levels */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.planner.keyLevels}</div>
          <textarea
            className={clsx(inputClass, 'h-28 resize-none')}
            value={keyLevels}
            onChange={e => setKeyLevels(e.target.value)}
            placeholder="Soporte: 18,200&#10;Resistencia: 18,450&#10;..."
          />
        </Card>

        {/* News events */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.planner.newsEvents}</div>
          <textarea
            className={clsx(inputClass, 'h-28 resize-none')}
            value={newsEvents}
            onChange={e => setNewsEvents(e.target.value)}
            placeholder="10:00 - CPI EE.UU.&#10;14:00 - FOMC&#10;..."
          />
        </Card>

        {/* Game plan */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.planner.gamePlan}</div>
          <textarea
            className={clsx(inputClass, 'h-32 resize-none')}
            value={gamePlan}
            onChange={e => setGamePlan(e.target.value)}
            placeholder="Plan para hoy: busco setups de breakout en NQ en la apertura de NY..."
          />
        </Card>

        {/* Checklist */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.planner.checklist}</div>
          <div className="flex flex-col gap-2 mb-3">
            {checklist.map((item, i) => (
              <button key={i} type="button" onClick={() => toggleCheck(i)} className="flex items-center gap-2.5 text-left group">
                <div className={clsx(
                  'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                  item.checked ? 'bg-[#00d4aa] border-[#00d4aa]' : 'border-[#2a2a3d] group-hover:border-[#00d4aa]'
                )}>
                  {item.checked && <span className="text-[#0a0a0f] text-[10px] font-bold">✓</span>}
                </div>
                <span className={clsx('text-sm', item.checked ? 'text-[#55557a] line-through' : 'text-[#e2e2f0]')}>{item.item}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className={clsx(inputClass, 'flex-1 text-xs')}
              value={newCheckItem}
              onChange={e => setNewCheckItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCheckItem()}
              placeholder="Añadir elemento..."
            />
            <Button size="sm" variant="secondary" onClick={addCheckItem}><Plus size={13} /></Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
