import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useStore } from '../../store';
import { t } from '../../i18n';
import {
  getTodayTrades, getWeekTrades, getMonthTrades, getYearTrades,
  getTotalPnL, getWinRate, getAvgRR, getEquityCurve,
} from '../../utils/calculations';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
import { Modal } from '../UI/Modal';
import { TradeForm } from '../TradeForm/TradeForm';
import { TradeRow } from '../TradeList/TradeRow';
import { PnLValue } from '../UI/PnLValue';
import { StatCard } from '../UI/StatCard';

export function Dashboard() {
  const { trades, settings, language } = useStore();
  const tr = t(language);
  const [showTradeForm, setShowTradeForm] = useState(false);

  const todayTrades  = getTodayTrades(trades);
  const weekTrades   = getWeekTrades(trades);
  const monthTrades  = getMonthTrades(trades);
  const yearTrades   = getYearTrades(trades);

  const todayPnL  = getTotalPnL(todayTrades);
  const weekPnL   = getTotalPnL(weekTrades);
  const monthPnL  = getTotalPnL(monthTrades);
  const yearPnL   = getTotalPnL(yearTrades);

  const winRate  = getWinRate(trades);
  const avgRR    = getAvgRR(trades);

  const equity   = getEquityCurve(trades);
  const recent   = [...trades].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)).slice(0, 5);

  const sym = settings.currencySymbol;

  const dailyLimitUsed = settings.dailyLossLimit > 0
    ? Math.min(100, (Math.abs(Math.min(0, todayPnL)) / settings.dailyLossLimit) * 100)
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const val = payload[0].value as number;
      return (
        <div className="bg-[#14141e] border border-[#2a2a3d] rounded-md px-3 py-2 text-xs font-mono">
          <div className="text-[#8888aa] mb-1">{label}</div>
          <div className={val >= 0 ? 'text-[#00d4aa]' : 'text-[#ff4757]'}>
            {val >= 0 ? '+' : ''}{sym}{val.toFixed(2)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#e2e2f0]">{tr.dashboard.title}</h1>
          <p className="text-xs text-[#55557a] font-mono mt-0.5">
            {new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowTradeForm(true)}>
          <Plus size={14} />
          {tr.dashboard.addTrade}
        </Button>
      </div>

      {/* PnL Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <StatCard
          label={tr.dashboard.today}
          value={<PnLValue value={todayPnL} symbol={sym} size="lg" />}
          subvalue={`${todayTrades.length} ${tr.dashboard.trades}`}
          icon={<Activity size={14} />}
        />
        <StatCard
          label={tr.dashboard.thisWeek}
          value={<PnLValue value={weekPnL} symbol={sym} size="lg" />}
          subvalue={`${weekTrades.length} ${tr.dashboard.trades}`}
          icon={<TrendingUp size={14} />}
        />
        <StatCard
          label={tr.dashboard.thisMonth}
          value={<PnLValue value={monthPnL} symbol={sym} size="lg" />}
          subvalue={`${monthTrades.length} ${tr.dashboard.trades}`}
          icon={<TrendingDown size={14} />}
        />
        <StatCard
          label={tr.dashboard.thisYear}
          value={<PnLValue value={yearPnL} symbol={sym} size="lg" />}
          subvalue={`${yearTrades.length} ${tr.dashboard.trades}`}
          icon={<Target size={14} />}
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        <StatCard
          label={tr.dashboard.winRate}
          value={<span className="font-mono text-lg text-[#e2e2f0]">{winRate}%</span>}
          subvalue={`${trades.filter(t => t.pnl > 0).length}W / ${trades.filter(t => t.pnl < 0).length}L`}
        />
        <StatCard
          label={tr.dashboard.avgRR}
          value={<span className={`font-mono text-lg ${avgRR >= 1 ? 'text-[#00d4aa]' : 'text-[#ff4757]'}`}>{avgRR}R</span>}
          subvalue={`${trades.length} ${tr.dashboard.trades} total`}
        />

        {/* Daily loss limit */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8888aa] uppercase tracking-wider">{tr.dashboard.dailyLimit}</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`font-mono text-lg ${dailyLimitUsed >= 80 ? 'text-[#ff4757]' : dailyLimitUsed >= 50 ? 'text-[#ffd43b]' : 'text-[#00d4aa]'}`}>
              {dailyLimitUsed.toFixed(0)}%
            </span>
            <span className="text-xs text-[#55557a] font-mono">usado</span>
          </div>
          <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${dailyLimitUsed}%`,
                background: dailyLimitUsed >= 80 ? '#ff4757' : dailyLimitUsed >= 50 ? '#ffd43b' : '#00d4aa',
              }}
            />
          </div>
          <div className="text-xs text-[#55557a] font-mono mt-1">
            Límite: {sym}{settings.dailyLossLimit}
          </div>
        </Card>
      </div>

      {/* Equity curve + Recent trades */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        {/* Equity curve */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.dashboard.equityCurve}</div>
          {equity.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={equity} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d4aa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${sym}${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="equity" stroke="#00d4aa" strokeWidth={2} fill="url(#equityGrad)" dot={false} activeDot={{ r: 4, fill: '#00d4aa' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[#55557a] text-sm">
              {tr.dashboard.noTrades}
            </div>
          )}
        </Card>

        {/* Recent trades */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-3">{tr.dashboard.recentTrades}</div>
          {recent.length === 0 ? (
            <div className="text-center text-[#55557a] text-sm py-8">{tr.dashboard.noTrades}</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recent.map(trade => <TradeRow key={trade.id} trade={trade} compact />)}
            </div>
          )}
        </Card>
      </div>

      {/* Trade form modal */}
      <Modal open={showTradeForm} onClose={() => setShowTradeForm(false)} title={tr.trade.new} size="xl">
        <TradeForm onSave={() => setShowTradeForm(false)} onCancel={() => setShowTradeForm(false)} />
      </Modal>
    </div>
  );
}
