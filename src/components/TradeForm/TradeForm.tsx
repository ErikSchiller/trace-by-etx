import { useState, useRef } from 'react';
import { type Trade, type Direction, type Session, type ExitType, type EmotionalState, ERROR_TAGS } from '../../types';
import { useStore } from '../../store';
import { t } from '../../i18n';
import { Button } from '../UI/Button';
import { EmotionPicker } from '../UI/EmotionIndicator';
import { clsx } from 'clsx';
import { Upload, X } from 'lucide-react';

interface TradeFormProps {
  initialData?: Trade;
  onSave: () => void;
  onCancel: () => void;
}

type FormData = Omit<Trade, 'id' | 'pnl' | 'plannedRR' | 'realRR'>;

const today = new Date().toISOString().split('T')[0];
const now = new Date().toTimeString().slice(0, 5);

export function TradeForm({ initialData, onSave, onCancel }: TradeFormProps) {
  const { addTrade, updateTrade, settings, language } = useStore();
  const tr = t(language);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    date: initialData?.date ?? today,
    time: initialData?.time ?? now,
    asset: initialData?.asset ?? '',
    direction: initialData?.direction ?? 'long',
    entryPrice: initialData?.entryPrice ?? 0,
    exitPrice: initialData?.exitPrice ?? 0,
    stopLoss: initialData?.stopLoss ?? 0,
    takeProfit: initialData?.takeProfit ?? 0,
    positionSize: initialData?.positionSize ?? 1,
    commission: initialData?.commission ?? settings.defaultCommission,
    setup: initialData?.setup ?? (settings.setups[0] ?? ''),
    session: initialData?.session ?? 'new_york',
    screenshots: initialData?.screenshots ?? [],
    entryReason: initialData?.entryReason ?? '',
    postTradeNotes: initialData?.postTradeNotes ?? '',
    emotionalState: initialData?.emotionalState ?? 3,
    isPlanBased: initialData?.isPlanBased ?? true,
    exitType: initialData?.exitType ?? 'manual',
    errorTags: initialData?.errorTags ?? [],
  });

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const toggleErrorTag = (tag: string) => {
    setForm(f => ({
      ...f,
      errorTags: f.errorTags.includes(tag)
        ? f.errorTags.filter(t => t !== tag)
        : [...f.errorTags, tag],
    }));
  };

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        setForm(f => ({ ...f, screenshots: [...f.screenshots, result] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeScreenshot = (idx: number) => {
    setForm(f => ({ ...f, screenshots: f.screenshots.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      updateTrade(initialData.id, form);
    } else {
      addTrade(form);
    }
    onSave();
  };

  const labelClass = 'text-xs text-[#8888aa] mb-1 block';
  const inputClass = 'w-full bg-[#14141e] border border-[#1e1e2e] text-[#e2e2f0] rounded-md px-3 py-2 text-sm font-mono focus:border-[#00d4aa] focus:outline-none transition-colors';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Row 1: Date/Time/Asset/Direction */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelClass}>{tr.trade.date}</label>
          <input type="date" className={inputClass} value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>{tr.trade.time}</label>
          <input type="time" className={inputClass} value={form.time} onChange={e => set('time', e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>{tr.trade.asset}</label>
          <input type="text" className={inputClass} value={form.asset} onChange={e => set('asset', e.target.value.toUpperCase())} placeholder="NQ, EURUSD..." required />
        </div>
        <div>
          <label className={labelClass}>{tr.trade.direction}</label>
          <div className="flex gap-1.5">
            {(['long', 'short'] as Direction[]).map(d => (
              <button key={d} type="button"
                onClick={() => set('direction', d)}
                className={clsx(
                  'flex-1 py-2 rounded-md text-xs font-semibold transition-all border',
                  form.direction === d && d === 'long'  ? 'bg-[rgba(0,212,170,0.2)] text-[#00d4aa] border-[rgba(0,212,170,0.4)]' : '',
                  form.direction === d && d === 'short' ? 'bg-[rgba(255,71,87,0.2)] text-[#ff4757] border-[rgba(255,71,87,0.4)]' : '',
                  form.direction !== d ? 'text-[#55557a] border-[#1e1e2e] hover:border-[#2a2a3d]' : '',
                )}
              >
                {d === 'long' ? '▲ ' : '▼ '}{d === 'long' ? tr.trade.long : tr.trade.short}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Prices */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: 'entryPrice' as const, label: tr.trade.entry },
          { key: 'exitPrice'  as const, label: tr.trade.exit  },
          { key: 'stopLoss'   as const, label: tr.trade.sl    },
          { key: 'takeProfit' as const, label: tr.trade.tp    },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className={labelClass}>{label}</label>
            <input type="number" step="any" className={inputClass} value={form[key] || ''} onChange={e => set(key, parseFloat(e.target.value) || 0)} required />
          </div>
        ))}
      </div>

      {/* Row 3: Size, Commission, Setup, Session */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelClass}>{tr.trade.size}</label>
          <input type="number" step="any" min="0" className={inputClass} value={form.positionSize || ''} onChange={e => set('positionSize', parseFloat(e.target.value) || 0)} required />
        </div>
        <div>
          <label className={labelClass}>{tr.trade.commission}</label>
          <input type="number" step="any" min="0" className={inputClass} value={form.commission || ''} onChange={e => set('commission', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className={labelClass}>{tr.trade.setup}</label>
          <select className={inputClass} value={form.setup} onChange={e => set('setup', e.target.value)}>
            {settings.setups.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>{tr.trade.session}</label>
          <select className={inputClass} value={form.session} onChange={e => set('session', e.target.value as Session)}>
            <option value="london">{tr.trade.london}</option>
            <option value="new_york">{tr.trade.new_york}</option>
            <option value="asia">{tr.trade.asia}</option>
            <option value="premarket">{tr.trade.premarket}</option>
          </select>
        </div>
      </div>

      {/* Row 4: Exit type, Plan-based */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{tr.trade.exitType}</label>
          <select className={inputClass} value={form.exitType} onChange={e => set('exitType', e.target.value as ExitType)}>
            <option value="sl_hit">{tr.trade.sl_hit}</option>
            <option value="tp_hit">{tr.trade.tp_hit}</option>
            <option value="manual">{tr.trade.manual}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{tr.trade.emotional}</label>
          <EmotionPicker value={form.emotionalState} onChange={v => set('emotionalState', v as EmotionalState)} />
        </div>
      </div>

      {/* Plan-based toggle */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => set('isPlanBased', !form.isPlanBased)}
          className={clsx(
            'relative w-10 h-5 rounded-full transition-colors border',
            form.isPlanBased ? 'bg-[rgba(0,212,170,0.3)] border-[rgba(0,212,170,0.5)]' : 'bg-[#1e1e2e] border-[#2a2a3d]'
          )}
        >
          <span className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full transition-all',
            form.isPlanBased ? 'left-5 bg-[#00d4aa]' : 'left-0.5 bg-[#55557a]'
          )} />
        </button>
        <span className="text-sm text-[#8888aa]">
          {form.isPlanBased ? tr.trade.planned : tr.trade.impulsive}
        </span>
      </div>

      {/* Error tags */}
      <div>
        <label className={labelClass}>{tr.trade.errorTags}</label>
        <div className="flex flex-wrap gap-1.5">
          {ERROR_TAGS.map(tag => (
            <button key={tag} type="button" onClick={() => toggleErrorTag(tag)}
              className={clsx(
                'px-2.5 py-1 rounded text-xs font-mono border transition-all',
                form.errorTags.includes(tag)
                  ? 'bg-[rgba(255,71,87,0.15)] text-[#ff4757] border-[rgba(255,71,87,0.4)]'
                  : 'text-[#55557a] border-[#1e1e2e] hover:border-[#2a2a3d]'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Entry reason */}
      <div>
        <label className={labelClass}>{tr.trade.entryReason}</label>
        <textarea className={clsx(inputClass, 'h-20 resize-none')} value={form.entryReason} onChange={e => set('entryReason', e.target.value)} placeholder="¿Qué viste en el mercado para entrar?" />
      </div>

      {/* Post-trade notes */}
      <div>
        <label className={labelClass}>{tr.trade.postNotes}</label>
        <textarea className={clsx(inputClass, 'h-20 resize-none')} value={form.postTradeNotes} onChange={e => set('postTradeNotes', e.target.value)} placeholder="¿Qué pasó? ¿Qué podrías mejorar?" />
      </div>

      {/* Screenshots */}
      <div>
        <label className={labelClass}>{tr.trade.screenshots}</label>
        <div className="flex flex-wrap gap-2">
          {form.screenshots.map((src, i) => (
            <div key={i} className="relative w-24 h-24 rounded-md overflow-hidden border border-[#2a2a3d] group">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeScreenshot(i)}
                className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-md border border-dashed border-[#2a2a3d] flex flex-col items-center justify-center gap-1 text-[#55557a] hover:border-[#00d4aa] hover:text-[#00d4aa] transition-colors"
          >
            <Upload size={16} />
            <span className="text-xs">Añadir</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshot} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-[#1e1e2e]">
        <Button type="submit" variant="primary">{tr.trade.save}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{tr.trade.cancel}</Button>
      </div>
    </form>
  );
}
