import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { useStore } from '../../store';
import { t } from '../../i18n';
import {
  getWinRate, getAvgRR, getTotalPnL,
  getPnLBySetup, getPnLByAsset, getPnLByDayOfWeek, getPnLBySession,
  getMaxConsecutiveWins, getMaxConsecutiveLosses,
} from '../../utils/calculations';
import { Card } from '../UI/Card';
import { StatCard } from '../UI/StatCard';
import { PnLValue } from '../UI/PnLValue';
import { Badge } from '../UI/Badge';

export function Analytics() {
  const { trades, settings, language } = useStore();
  const tr = t(language);
  const sym = settings.currencySymbol;

  const winRate  = getWinRate(trades);
  const avgRR    = getAvgRR(trades);
  const winners  = trades.filter(t => t.pnl > 0);
  const losers   = trades.filter(t => t.pnl < 0);

  const avgWinner = winners.length ? getTotalPnL(winners) / winners.length : 0;
  const avgLoser  = losers.length  ? getTotalPnL(losers)  / losers.length  : 0;
  const largestWin  = winners.length ? Math.max(...winners.map(t => t.pnl)) : 0;
  const largestLoss = losers.length  ? Math.min(...losers.map(t => t.pnl))  : 0;
  const totalComm = trades.reduce((a, t) => a + t.commission, 0);
  const impulseCount = trades.filter(t => !t.isPlanBased).length;
  const impulseRate = trades.length ? ((impulseCount / trades.length) * 100).toFixed(1) : '0.0';

  const maxConsecWins   = getMaxConsecutiveWins(trades);
  const maxConsecLosses = getMaxConsecutiveLosses(trades);

  const setupData  = useMemo(() => getPnLBySetup(trades),   [trades]);
  const assetData  = useMemo(() => getPnLByAsset(trades),   [trades]);
  const dayData    = useMemo(() => getPnLByDayOfWeek(trades), [trades]);
  const sessionData= useMemo(() => getPnLBySession(trades), [trades]);

  const bestSetup  = [...setupData].sort((a, b) => b.pnl - a.pnl)[0];
  const worstSetup = [...setupData].sort((a, b) => a.pnl - b.pnl)[0];

  const barColor = (val: number) => val >= 0 ? '#00d4aa' : '#ff4757';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const val = payload[0].value as number;
      return (
        <div className="bg-[#14141e] border border-[#2a2a3d] rounded px-3 py-2 text-xs font-mono">
          <div className="text-[#8888aa] mb-1">{label}</div>
          <div className={val >= 0 ? 'text-[#00d4aa]' : 'text-[#ff4757]'}>
            {val >= 0 ? '+' : ''}{sym}{Math.abs(val).toFixed(2)}
          </div>
        </div>
      );
    }
    return null;
  };

  if (trades.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center text-[#55557a]">
          <div className="text-4xl mb-3">📈</div>
          <div className="text-sm">Registra operaciones para ver analíticas</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-[#e2e2f0] mb-6">{tr.analytics.title}</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <StatCard label={tr.dashboard.winRate} value={<span className="font-mono text-lg text-[#e2e2f0]">{winRate}%</span>} subvalue={`${winners.length}W / ${losers.length}L`} />
        <StatCard label={tr.dashboard.avgRR} value={<span className={`font-mono text-lg ${avgRR >= 1 ? 'text-[#00d4aa]' : 'text-[#ff4757]'}`}>{avgRR}R</span>} />
        <StatCard label={tr.analytics.avgWinner} value={<PnLValue value={avgWinner} symbol={sym} size="lg" />} />
        <StatCard label={tr.analytics.avgLoser}  value={<PnLValue value={avgLoser}  symbol={sym} size="lg" />} />
        <StatCard label={tr.analytics.largestWin}  value={<PnLValue value={largestWin}  symbol={sym} size="lg" />} />
        <StatCard label={tr.analytics.largestLoss} value={<PnLValue value={largestLoss} symbol={sym} size="lg" />} />
        <StatCard label={tr.analytics.maxConsecWins}   value={<span className="font-mono text-lg text-[#00d4aa]">{maxConsecWins}</span>} />
        <StatCard label={tr.analytics.maxConsecLosses} value={<span className="font-mono text-lg text-[#ff4757]">{maxConsecLosses}</span>} />
      </div>

      {/* Commissions + Impulse */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <StatCard label={tr.analytics.totalCommissions} value={<span className="font-mono text-lg text-[#ffd43b]">{sym}{totalComm.toFixed(2)}</span>} subvalue={`${trades.length} operaciones`} />
        <StatCard label={tr.analytics.impulseRate} value={<span className="font-mono text-lg text-[#ff8c00]">{impulseRate}%</span>} subvalue={`${impulseCount} impulsivas`} />
        {bestSetup && (
          <StatCard label={tr.analytics.bestSetup} value={<span className="text-base text-[#00d4aa] font-semibold">{bestSetup.setup}</span>} subvalue={<PnLValue value={bestSetup.pnl} symbol={sym} size="sm" />} />
        )}
        {worstSetup && (
          <StatCard label={tr.analytics.worstSetup} value={<span className="text-base text-[#ff4757] font-semibold">{worstSetup.setup}</span>} subvalue={<PnLValue value={worstSetup.pnl} symbol={sym} size="sm" />} />
        )}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* PnL by Setup */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.analytics.bySetup}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={setupData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
              <XAxis dataKey="setup" tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${sym}${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {setupData.map((entry, i) => <Cell key={i} fill={barColor(entry.pnl)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* PnL by Day of Week */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.analytics.byDayOfWeek}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${sym}${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {dayData.map((entry, i) => <Cell key={i} fill={barColor(entry.pnl)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* PnL by Asset */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.analytics.byAsset}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={assetData} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 40 }}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#55557a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} tickFormatter={v => `${sym}${v}`} />
              <YAxis type="category" dataKey="asset" tick={{ fill: '#8888aa', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" radius={[0, 3, 3, 0]}>
                {assetData.map((entry, i) => <Cell key={i} fill={barColor(entry.pnl)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* PnL by Session */}
        <Card className="p-4">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-4">{tr.analytics.bySession}</div>
          <div className="flex flex-col gap-3 mt-2">
            {sessionData.map(s => (
              <div key={s.session} className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#8888aa] w-24 flex-shrink-0">{s.session}</span>
                <div className="flex-1 h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.abs(s.pnl) / Math.max(...sessionData.map(x => Math.abs(x.pnl)), 1) * 100)}%`,
                      background: s.pnl >= 0 ? '#00d4aa' : '#ff4757',
                    }}
                  />
                </div>
                <PnLValue value={s.pnl} symbol={sym} size="sm" className="w-20 text-right" />
                <span className="text-xs font-mono text-[#55557a] w-12">{s.winRate}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Setup detail table */}
      {setupData.length > 0 && (
        <Card className="p-4 mt-5">
          <div className="text-xs text-[#8888aa] uppercase tracking-wider mb-3">{tr.analytics.bySetup} — detalle</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[#55557a] border-b border-[#1e1e2e]">
                  <th className="text-left pb-2">Setup</th>
                  <th className="text-right pb-2">Ops.</th>
                  <th className="text-right pb-2">Acierto %</th>
                  <th className="text-right pb-2">PnL total</th>
                </tr>
              </thead>
              <tbody>
                {[...setupData].sort((a, b) => b.pnl - a.pnl).map(row => (
                  <tr key={row.setup} className="border-b border-[#1e1e2e] last:border-0">
                    <td className="py-2 text-[#e2e2f0]">{row.setup}</td>
                    <td className="py-2 text-right text-[#8888aa]">{row.count}</td>
                    <td className="py-2 text-right">
                      <Badge variant={row.winRate >= 50 ? 'green' : 'red'}>{row.winRate}%</Badge>
                    </td>
                    <td className="py-2 text-right">
                      <PnLValue value={row.pnl} symbol={sym} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
