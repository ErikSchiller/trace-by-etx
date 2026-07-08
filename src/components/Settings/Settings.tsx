import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { useStore } from '../../store';
import { t } from '../../i18n';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import type { Language } from '../../types';
import { clsx } from 'clsx';

export function SettingsPage() {
  const { settings, updateSettings, language, setLanguage } = useStore();
  const tr = t(language);

  const [setups, setSetups]         = useState<string[]>(settings.setups);
  const [newSetup, setNewSetup]     = useState('');
  const [dailyLimit, setDailyLimit] = useState(settings.dailyLossLimit);
  const [accountSize, setAccountSize] = useState(settings.accountSize);
  const [commission, setCommission] = useState(settings.defaultCommission);
  const [currency, setCurrency]     = useState(settings.currencySymbol);
  const [checklistItems, setChecklistItems] = useState<string[]>(settings.defaultChecklistItems);
  const [newCheck, setNewCheck]     = useState('');
  const [saved, setSaved]           = useState(false);

  const addSetup = () => {
    if (!newSetup.trim() || setups.includes(newSetup.trim())) return;
    setSetups(s => [...s, newSetup.trim()]);
    setNewSetup('');
  };
  const removeSetup = (s: string) => setSetups(list => list.filter(x => x !== s));

  const addCheckItem = () => {
    if (!newCheck.trim()) return;
    setChecklistItems(c => [...c, newCheck.trim()]);
    setNewCheck('');
  };
  const removeCheckItem = (i: number) => setChecklistItems(c => c.filter((_, idx) => idx !== i));

  const handleSave = () => {
    updateSettings({
      setups,
      dailyLossLimit: dailyLimit,
      accountSize,
      defaultCommission: commission,
      currencySymbol: currency,
      defaultChecklistItems: checklistItems,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = 'w-full bg-[#14141e] border border-[#1e1e2e] text-[#e2e2f0] rounded-md px-3 py-2 text-sm font-mono focus:border-[#00d4aa] focus:outline-none transition-colors';
  const labelClass = 'text-xs text-[#8888aa] mb-1 block';

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#e2e2f0]">{tr.settings.title}</h1>
        <Button variant="primary" onClick={handleSave}>
          {saved ? <><Check size={13} /> Guardado</> : tr.settings.save}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-4xl">
        {/* Account settings */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">Cuenta</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>{tr.settings.accountSize}</label>
              <input type="number" className={inputClass} value={accountSize} onChange={e => setAccountSize(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>{tr.settings.dailyLossLimit}</label>
              <input type="number" className={inputClass} value={dailyLimit} onChange={e => setDailyLimit(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>{tr.settings.defaultCommission}</label>
              <input type="number" step="0.01" className={inputClass} value={commission} onChange={e => setCommission(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>{tr.settings.currency}</label>
              <input type="text" maxLength={3} className={inputClass} value={currency} onChange={e => setCurrency(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Language */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.settings.language}</div>
          <div className="flex gap-2">
            {(['es', 'en'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={clsx(
                  'flex-1 py-3 rounded-md text-sm font-semibold border transition-all',
                  language === lang
                    ? 'bg-[rgba(0,212,170,0.15)] text-[#00d4aa] border-[rgba(0,212,170,0.3)]'
                    : 'text-[#8888aa] border-[#1e1e2e] hover:border-[#2a2a3d]'
                )}
              >
                {lang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
              </button>
            ))}
          </div>
        </Card>

        {/* Setups */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.settings.setups}</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {setups.map(s => (
              <div key={s} className="flex items-center gap-1 bg-[rgba(0,212,170,0.1)] border border-[rgba(0,212,170,0.2)] rounded px-2 py-1">
                <span className="text-xs font-mono text-[#00d4aa]">{s}</span>
                <button onClick={() => removeSetup(s)} className="text-[#55557a] hover:text-[#ff4757] transition-colors ml-1">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className={clsx(inputClass, 'flex-1')}
              value={newSetup}
              onChange={e => setNewSetup(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSetup()}
              placeholder="Nombre del setup..."
            />
            <Button size="sm" variant="secondary" onClick={addSetup}><Plus size={13} /></Button>
          </div>
        </Card>

        {/* Checklist items */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.settings.checklistItems}</div>
          <div className="flex flex-col gap-1.5 mb-3">
            {checklistItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm text-[#8888aa] bg-[#14141e] rounded px-2.5 py-1.5">
                <span>{item}</span>
                <button onClick={() => removeCheckItem(i)} className="text-[#55557a] hover:text-[#ff4757] transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className={clsx(inputClass, 'flex-1')}
              value={newCheck}
              onChange={e => setNewCheck(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCheckItem()}
              placeholder="Elemento del checklist..."
            />
            <Button size="sm" variant="secondary" onClick={addCheckItem}><Plus size={13} /></Button>
          </div>
        </Card>

        {/* Data management */}
        <Card className="p-4 xl:col-span-2">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">Gestión de datos</div>
          <p className="text-xs text-[#55557a] mb-3">
            Todos los datos se almacenan localmente en tu navegador (localStorage). Exporta o importa para hacer copia de seguridad.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => {
              const data = localStorage.getItem('trading-journal-v1');
              if (!data) return;
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `tradelog-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
            }}>
              Exportar datos (.json)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
