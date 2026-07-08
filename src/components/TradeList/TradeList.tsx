import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { useStore } from '../../store';
import { t } from '../../i18n';
import { TradeRow } from './TradeRow';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';
import { TradeForm } from '../TradeForm/TradeForm';
import { PnLValue } from '../UI/PnLValue';
import { getTotalPnL, getWinRate } from '../../utils/calculations';


type SortKey = 'dateDesc' | 'dateAsc' | 'pnlDesc' | 'pnlAsc';

export function TradeList() {
  const { trades, settings, language } = useStore();
  const tr = t(language);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSetup, setFilterSetup] = useState('all');
  const [filterSession, setFilterSession] = useState('all');
  const [filterDir, setFilterDir] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('dateDesc');

  const filtered = useMemo(() => {
    let result = [...trades];
    if (search) result = result.filter(t => t.asset.toLowerCase().includes(search.toLowerCase()));
    if (filterSetup !== 'all') result = result.filter(t => t.setup === filterSetup);
    if (filterSession !== 'all') result = result.filter(t => t.session === filterSession);
    if (filterDir !== 'all') result = result.filter(t => t.direction === filterDir);
    switch (sortKey) {
      case 'dateDesc': result.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)); break;
      case 'dateAsc':  result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)); break;
      case 'pnlDesc':  result.sort((a, b) => b.pnl - a.pnl); break;
      case 'pnlAsc':   result.sort((a, b) => a.pnl - b.pnl); break;
    }
    return result;
  }, [trades, search, filterSetup, filterSession, filterDir, sortKey]);

  const sym = settings.currencySymbol;
  const totalPnL = getTotalPnL(filtered);
  const winRate  = getWinRate(filtered);

  const sessions = [
    { key: 'all', label: tr.journal.all },
    { key: 'london',   label: tr.trade.london    },
    { key: 'new_york', label: tr.trade.new_york  },
    { key: 'asia',     label: tr.trade.asia      },
    { key: 'premarket',label: tr.trade.premarket },
  ];

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#e2e2f0]">{tr.journal.title}</h1>
          <p className="text-xs text-[#55557a] font-mono mt-0.5">{filtered.length} operaciones</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={14} />{tr.trade.new}
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#55557a]" />
          <input
            type="text"
            placeholder={tr.journal.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-[#14141e] border border-[#1e1e2e] rounded-md text-[#e2e2f0] focus:border-[#00d4aa] outline-none font-mono w-40"
          />
        </div>

        {/* Setup filter */}
        <select
          value={filterSetup}
          onChange={e => setFilterSetup(e.target.value)}
          className="py-1.5 px-2.5 text-xs bg-[#14141e] border border-[#1e1e2e] rounded-md text-[#8888aa] focus:border-[#00d4aa] outline-none"
        >
          <option value="all">Setup: {tr.journal.all}</option>
          {settings.setups.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Session filter */}
        <select
          value={filterSession}
          onChange={e => setFilterSession(e.target.value)}
          className="py-1.5 px-2.5 text-xs bg-[#14141e] border border-[#1e1e2e] rounded-md text-[#8888aa] focus:border-[#00d4aa] outline-none"
        >
          {sessions.map(s => <option key={s.key} value={s.key}>Sesión: {s.label}</option>)}
        </select>

        {/* Direction filter */}
        <select
          value={filterDir}
          onChange={e => setFilterDir(e.target.value)}
          className="py-1.5 px-2.5 text-xs bg-[#14141e] border border-[#1e1e2e] rounded-md text-[#8888aa] focus:border-[#00d4aa] outline-none"
        >
          <option value="all">Dirección: {tr.journal.all}</option>
          <option value="long">{tr.trade.long}</option>
          <option value="short">{tr.trade.short}</option>
        </select>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="py-1.5 px-2.5 text-xs bg-[#14141e] border border-[#1e1e2e] rounded-md text-[#8888aa] focus:border-[#00d4aa] outline-none"
        >
          <option value="dateDesc">{tr.journal.dateDesc}</option>
          <option value="dateAsc">{tr.journal.dateAsc}</option>
          <option value="pnlDesc">{tr.journal.pnlDesc}</option>
          <option value="pnlAsc">{tr.journal.pnlAsc}</option>
        </select>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-5 mb-4 px-3 py-2 rounded-md bg-[#14141e] border border-[#1e1e2e] text-xs font-mono">
        <span className="text-[#55557a]">Resultados: <span className="text-[#e2e2f0]">{filtered.length}</span></span>
        <span className="text-[#55557a]">PnL: <PnLValue value={totalPnL} symbol={sym} size="sm" /></span>
        <span className="text-[#55557a]">Aciertos: <span className="text-[#e2e2f0]">{winRate}%</span></span>
      </div>

      {/* Table header */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-[12px_80px_80px_1fr_80px_80px_80px_80px_24px] gap-3 px-4 pb-1 text-[10px] text-[#55557a] uppercase tracking-wider font-medium">
          <span />
          <span>{tr.trade.asset}</span>
          <span>{tr.trade.direction}</span>
          <span>{tr.trade.setup}</span>
          <span>{tr.trade.date}</span>
          <span>{tr.trade.time}</span>
          <span>{tr.trade.realRR}</span>
          <span>{tr.trade.pnl}</span>
          <span />
        </div>
      )}

      {/* Trade rows */}
      <div className="flex flex-col gap-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#55557a]">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-sm">{tr.journal.noResults}</div>
          </div>
        ) : (
          filtered.map(trade => <TradeRow key={trade.id} trade={trade} />)
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={tr.trade.new} size="xl">
        <TradeForm onSave={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
