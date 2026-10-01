import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useAuthStore } from './authStore';
import { useTradeStore, type Trade } from './tradeStore';
import { useUndoStore } from './undoStore';

export type Phase = 'eval_p1' | 'eval_p2' | 'funded' | 'passed_pending' | 'blown' | 'expired';
export type DrawdownType = 'trailing' | 'static';

/** A single lifecycle phase of an account (eval P1 → eval P2 → funded, resets in between). */
export type PhaseType = 'eval_p1' | 'eval_p2' | 'funded';
export type PhaseStatus = 'active' | 'passed' | 'blown' | 'expired';
export interface AccountPhase {
  id: string;
  type: PhaseType;
  startDate: string;        // YYYY-MM-DD
  endDate?: string;         // set when the phase closes
  startBalance: number;     // fresh balance at phase start
  status: PhaseStatus;
  tradesCount: number;      // trades logged in this phase (filled on close)
  finalPnL?: number;        // PnL of this phase's trades (filled on close)
}

function phaseTypeFromLegacy(p: Phase): PhaseType {
  if (p === 'funded' || p === 'passed_pending') return 'funded';
  if (p === 'eval_p2') return 'eval_p2';
  return 'eval_p1';
}

export interface Payout {
  id: string;
  date: string;
  grossAmount: number;
  profitSplit: number;   // %
  netAmount: number;
  method: string;
  notes?: string;
}

export interface PropFirmAccount {
  id: string;
  userId: string;
  firm: string;          // 'TopStep', 'Apex', custom...
  accountSize: number;
  phase: Phase;
  purchaseDate: string;  // ISO date (YYYY-MM-DD)
  fundedDate?: string;
  closedDate?: string;

  // Rules
  profitTarget: number;
  maxDrawdown: number;
  drawdownType: DrawdownType;
  dailyLossLimit?: number;
  consistencyRule?: number;  // %
  minDays?: number;

  // Costs
  evalFee: number;          // paid upfront when buying
  activationFee: number;    // planned fee — only a real cost once paid
  activationFeePaid?: boolean;    // true once the eval is passed and activation is paid
  activationPaidDate?: string;    // ISO date the activation fee was paid
  resets: { date: string; cost: number }[];  // paid at time of reset

  // Income
  payouts: Payout[];

  // Phase lifecycle (eval → funded). The account's live PnL comes from the current phase.
  phases: AccountPhase[];
  currentPhaseId: string;

  createdAt: string;
}

export type NewAccountInput = Omit<PropFirmAccount, 'id' | 'userId' | 'resets' | 'payouts' | 'phases' | 'currentPhaseId' | 'createdAt'> & {
  resets?: { date: string; cost: number }[];
  payouts?: Payout[];
};

interface PropFirmStore {
  accounts: PropFirmAccount[];
  addAccount: (input: NewAccountInput) => PropFirmAccount;
  updateAccount: (id: string, updates: Partial<PropFirmAccount>) => void;
  deleteAccount: (id: string) => void;
  addPayout: (accountId: string, payout: Omit<Payout, 'id'>) => void;
  addReset: (accountId: string, reset: { date: string; cost: number }) => void;
  setPhase: (accountId: string, phase: Phase) => void;
  /** Pass the current phase and start a fresh phase (eval P1→P2, eval→funded). */
  passToPhase: (accountId: string, toType: PhaseType, date: string, opts?: { activationFeePaid?: boolean; activationPaidDate?: string; activationFee?: number }) => void;
  /** Close the current phase (account dies): blown / expired. No new phase. */
  closeAccount: (accountId: string, status: 'blown' | 'expired', date: string) => void;
  /** Soft reset: close the current phase (expired) and start a fresh one of the same type. */
  resetCurrentPhase: (accountId: string, date: string, cost: number) => void;
  clearAll: () => void;
}

/** Final PnL + trade count of the account's current phase (reads the trade store). */
function closeStats(a: PropFirmAccount, status: PhaseStatus, endDate: string): Pick<AccountPhase, 'status' | 'endDate' | 'finalPnL' | 'tradesCount'> {
  const phaseTrades = useTradeStore.getState().trades.filter(t => t.accountId === a.id && effectivePhaseId(t, a) === a.currentPhaseId);
  return { status, endDate, finalPnL: phaseTrades.reduce((s, t) => s + t.pnl, 0), tradesCount: phaseTrades.length };
}
function withClosedCurrent(a: PropFirmAccount, close: Pick<AccountPhase, 'status' | 'endDate' | 'finalPnL' | 'tradesCount'>): AccountPhase[] {
  return a.phases.map(p => p.id === a.currentPhaseId ? { ...p, ...close } : p);
}

export const usePropFirmStore = create<PropFirmStore>()(
  persist(
    (set) => ({
      accounts: [],

      addAccount: (input) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        // Activation fee counts as paid only if the account already reached funded/passed.
        const funded = input.phase === 'funded' || input.phase === 'passed_pending';
        const phaseId = nanoid();
        const initialPhase: AccountPhase = {
          id: phaseId,
          type: phaseTypeFromLegacy(input.phase),
          startDate: input.purchaseDate || new Date().toISOString().slice(0, 10),
          startBalance: input.accountSize,
          status: ACTIVE_PHASES.includes(input.phase) ? 'active' : (input.phase === 'blown' ? 'blown' : input.phase === 'expired' ? 'expired' : 'passed'),
          tradesCount: 0,
        };
        const account: PropFirmAccount = {
          ...input,
          id: nanoid(),
          userId,
          activationFeePaid: input.activationFeePaid ?? funded,
          activationPaidDate: input.activationPaidDate ?? (funded ? input.fundedDate : undefined),
          resets: input.resets ?? [],
          payouts: input.payouts ?? [],
          phases: [initialPhase],
          currentPhaseId: phaseId,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ accounts: [...s.accounts, account] }));
        return account;
      },

      updateAccount: (id, updates) =>
        set(s => ({ accounts: s.accounts.map(a => a.id === id ? { ...a, ...updates } : a) })),

      deleteAccount: (id) => {
        // Unlink (don't delete) trades tied to this account.
        const ts = useTradeStore.getState();
        const acc = usePropFirmStore.getState().accounts.find(a => a.id === id);
        const linkedTradeIds = ts.trades.filter(t => t.accountId === id).map(t => t.id);
        linkedTradeIds.forEach(tid => ts.updateTrade(tid, { accountId: undefined }));
        set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }));
        if (acc) {
          useUndoStore.getState().register({
            message: 'Cuenta eliminada',
            execute: () => {
              set(s => (s.accounts.some(a => a.id === acc.id) ? s : { accounts: [...s.accounts, acc] }));
              const store = useTradeStore.getState();
              linkedTradeIds.forEach(tid => store.updateTrade(tid, { accountId: acc.id }));
            },
          });
        }
      },

      addPayout: (accountId, payout) =>
        set(s => ({
          accounts: s.accounts.map(a =>
            a.id === accountId ? { ...a, payouts: [...a.payouts, { ...payout, id: nanoid() }] } : a),
        })),

      addReset: (accountId, reset) =>
        set(s => ({
          accounts: s.accounts.map(a =>
            a.id === accountId ? { ...a, resets: [...a.resets, reset] } : a),
        })),

      setPhase: (accountId, phase) =>
        set(s => ({
          accounts: s.accounts.map(a => {
            if (a.id !== accountId) return a;
            const patch: Partial<PropFirmAccount> = { phase };
            if (phase === 'funded' && !a.fundedDate) patch.fundedDate = new Date().toISOString().slice(0, 10);
            if ((phase === 'blown' || phase === 'expired') && !a.closedDate) patch.closedDate = new Date().toISOString().slice(0, 10);
            return { ...a, ...patch };
          }),
        })),

      passToPhase: (accountId, toType, date, opts) =>
        set(s => ({
          accounts: s.accounts.map(a => {
            if (a.id !== accountId) return a;
            const closed = withClosedCurrent(a, closeStats(a, 'passed', date));
            const newPhase: AccountPhase = { id: nanoid(), type: toType, startDate: date, startBalance: a.accountSize, status: 'active', tradesCount: 0 };
            const patch: Partial<PropFirmAccount> = {
              phases: [...closed, newPhase],
              currentPhaseId: newPhase.id,
              phase: toType,
            };
            if (toType === 'funded') {
              patch.fundedDate = date;
              if (opts) {
                patch.activationFeePaid = opts.activationFeePaid;
                patch.activationPaidDate = opts.activationPaidDate;
                if (opts.activationFee !== undefined) patch.activationFee = opts.activationFee;
              }
            }
            return { ...a, ...patch };
          }),
        })),

      closeAccount: (accountId, status, date) =>
        set(s => ({
          accounts: s.accounts.map(a => {
            if (a.id !== accountId) return a;
            return { ...a, phases: withClosedCurrent(a, closeStats(a, status, date)), phase: status, closedDate: date };
          }),
        })),

      resetCurrentPhase: (accountId, date, cost) =>
        set(s => ({
          accounts: s.accounts.map(a => {
            if (a.id !== accountId) return a;
            const cur = a.phases.find(p => p.id === a.currentPhaseId);
            const closed = withClosedCurrent(a, closeStats(a, 'expired', date));
            const newPhase: AccountPhase = { id: nanoid(), type: cur?.type ?? phaseTypeFromLegacy(a.phase), startDate: date, startBalance: a.accountSize, status: 'active', tradesCount: 0 };
            return { ...a, phases: [...closed, newPhase], currentPhaseId: newPhase.id, resets: [...a.resets, { date, cost }] };
          }),
        })),

      clearAll: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        set(s => ({ accounts: s.accounts.filter(a => a.userId !== userId) }));
      },
    }),
    {
      name: 'trace_prop_firms',
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as { accounts?: PropFirmAccount[] } | undefined;
        if (version < 1 && state?.accounts) {
          state.accounts = state.accounts.map(a => {
            const paid = a.phase === 'funded' || a.phase === 'passed_pending';
            return {
              ...a,
              activationFeePaid: a.activationFeePaid ?? paid,
              activationPaidDate: a.activationPaidDate ?? (paid ? a.fundedDate : undefined),
            };
          });
        }
        // v1 → v2: give each account a single phase representing its current state.
        // Existing trades keep belonging to this first phase (via the effectivePhaseId
        // fallback) — nothing is deleted or detached.
        if (version < 2 && state?.accounts) {
          state.accounts = state.accounts.map(a => {
            if (a.phases && a.currentPhaseId) return a;
            // Inline the "active" check — ACTIVE_PHASES is declared below the store and
            // this migrate runs synchronously during module eval (TDZ otherwise).
            const active = a.phase === 'eval_p1' || a.phase === 'eval_p2' || a.phase === 'funded' || a.phase === 'passed_pending';
            const phaseId = nanoid();
            const phase: AccountPhase = {
              id: phaseId,
              type: phaseTypeFromLegacy(a.phase),
              startDate: a.purchaseDate || (a.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
              endDate: active ? undefined : a.closedDate,
              startBalance: a.accountSize,
              status: active ? 'active' : (a.phase === 'blown' ? 'blown' : a.phase === 'expired' ? 'expired' : 'passed'),
              tradesCount: 0,
            };
            return { ...a, phases: [phase], currentPhaseId: phaseId };
          });
        }
        return state;
      },
    }
  )
);

/* ============ Derived helpers ============ */

export const ACTIVE_PHASES: Phase[] = ['eval_p1', 'eval_p2', 'funded', 'passed_pending'];

/** Actual money spent: eval fee + resets, plus the activation fee only once it's paid. */
export function accountTotalCost(a: PropFirmAccount): number {
  let total = a.evalFee + a.resets.reduce((s, r) => s + r.cost, 0);
  if (a.activationFeePaid) total += a.activationFee;
  return total;
}
/** Amount still owed (activation fee that hasn't been paid yet). */
export function accountPendingCost(a: PropFirmAccount): number {
  return a.activationFeePaid ? 0 : (a.activationFee || 0);
}
/** Total activation fees still pending across eval-stage accounts. */
export function getPendingActivation(accounts: PropFirmAccount[]) {
  const evalAccounts = accounts.filter(a => (a.phase === 'eval_p1' || a.phase === 'eval_p2') && !a.activationFeePaid && (a.activationFee || 0) > 0);
  return { total: evalAccounts.reduce((s, a) => s + a.activationFee, 0), count: evalAccounts.length };
}
export function accountTotalPayouts(a: PropFirmAccount): number {
  return a.payouts.reduce((s, p) => s + p.netAmount, 0);
}
export function accountNetResult(a: PropFirmAccount): number {
  return accountTotalPayouts(a) - accountTotalCost(a);
}
export function accountRoi(a: PropFirmAccount): number {
  const cost = accountTotalCost(a);
  return cost === 0 ? 0 : (accountNetResult(a) / cost) * 100;
}

/** Sum of PnL of all trades linked to an account (its live equity delta, all phases). */
export function getAccountEquity(accountId: string): number {
  const trades = useTradeStore.getState().trades as { accountId?: string; pnl: number }[];
  return trades.filter(t => t.accountId === accountId).reduce((s, t) => s + t.pnl, 0);
}

/* ── Phase-aware helpers ── */

/** The phase a trade belongs to; legacy trades (no accountPhaseId) fall back to the first phase. */
export function effectivePhaseId(t: { accountPhaseId?: string }, a: PropFirmAccount): string | undefined {
  return t.accountPhaseId ?? a.phases?.[0]?.id;
}
export function currentPhase(a: PropFirmAccount): AccountPhase | undefined {
  return a.phases?.find(p => p.id === a.currentPhaseId) ?? a.phases?.[a.phases.length - 1];
}
export const PHASE_TYPE_LABEL: Record<PhaseType, string> = { eval_p1: 'Eval Fase 1', eval_p2: 'Eval Fase 2', funded: 'Funded' };

/** Trades belonging to a specific phase of an account. */
export function getPhaseTrades(accountId: string, phaseId: string): Trade[] {
  const a = usePropFirmStore.getState().accounts.find(x => x.id === accountId);
  if (!a) return [];
  return useTradeStore.getState().trades.filter(t => t.accountId === accountId && effectivePhaseId(t, a) === phaseId);
}
/** PnL of the account's current (active) phase — this is the live "account PnL". */
export function getCurrentPhasePnL(accountId: string): number {
  const a = usePropFirmStore.getState().accounts.find(x => x.id === accountId);
  if (!a) return 0;
  return getPhaseTrades(accountId, a.currentPhaseId).reduce((s, t) => s + t.pnl, 0);
}
export function getPhasePnL(accountId: string, phaseId: string): number {
  return getPhaseTrades(accountId, phaseId).reduce((s, t) => s + t.pnl, 0);
}
/** PnL across all phases combined (eval + funded). */
export function getAllTimePnL(accountId: string): number {
  return useTradeStore.getState().trades.filter(t => t.accountId === accountId).reduce((s, t) => s + t.pnl, 0);
}

/* ============ React selectors ============ */

export function useUserAccounts(): PropFirmAccount[] {
  const userId = useAuthStore(s => s.user?.id);
  const accounts = usePropFirmStore(s => s.accounts);
  if (!userId) return [];
  return accounts.filter(a => a.userId === userId);
}

export function getActiveAccounts(accounts: PropFirmAccount[]) {
  return accounts.filter(a => ACTIVE_PHASES.includes(a.phase));
}
export function getPastAccounts(accounts: PropFirmAccount[]) {
  return accounts.filter(a => !ACTIVE_PHASES.includes(a.phase));
}
export function getTotalInvested(accounts: PropFirmAccount[]) {
  return accounts.reduce((s, a) => s + accountTotalCost(a), 0);
}
export function getTotalPayouts(accounts: PropFirmAccount[]) {
  return accounts.reduce((s, a) => s + accountTotalPayouts(a), 0);
}
export function getNetPnL(accounts: PropFirmAccount[]) {
  return getTotalPayouts(accounts) - getTotalInvested(accounts);
}
/** Pass rate = (funded + passed_pending) / accounts that reached a terminal eval outcome. */
export function getPassRate(accounts: PropFirmAccount[]) {
  const attempts = accounts.filter(a => a.phase !== 'eval_p1' && a.phase !== 'eval_p2');
  if (attempts.length === 0) return { rate: 0, passed: 0, total: 0 };
  const passed = attempts.filter(a => a.phase === 'funded' || a.phase === 'passed_pending').length;
  return { rate: (passed / attempts.length) * 100, passed, total: attempts.length };
}
export function getAvgDaysToFund(accounts: PropFirmAccount[]) {
  const funded = accounts.filter(a => a.fundedDate);
  if (funded.length === 0) return { mean: 0, median: 0 };
  const days = funded.map(a => {
    const start = new Date(`${a.purchaseDate}T00:00:00`).getTime();
    const end = new Date(`${a.fundedDate}T00:00:00`).getTime();
    return Math.max(0, Math.round((end - start) / 86400000));
  }).sort((x, y) => x - y);
  const mean = days.reduce((s, d) => s + d, 0) / days.length;
  const median = days[Math.floor(days.length / 2)];
  return { mean: Math.round(mean), median };
}
export function getAccountsByFirm(accounts: PropFirmAccount[]) {
  const map = new Map<string, PropFirmAccount[]>();
  for (const a of accounts) {
    if (!map.has(a.firm)) map.set(a.firm, []);
    map.get(a.firm)!.push(a);
  }
  return [...map.entries()].map(([firm, list]) => ({
    firm,
    count: list.length,
    invested: getTotalInvested(list),
    payouts: getTotalPayouts(list),
    net: getNetPnL(list),
    roi: getTotalInvested(list) === 0 ? 0 : (getNetPnL(list) / getTotalInvested(list)) * 100,
  })).sort((a, b) => b.roi - a.roi);
}

export interface FirmGroup {
  firm: string;
  accounts: PropFirmAccount[];
  totals: { count: number; invested: number; payouts: number; net: number; roi: number };
}
/**
 * Groups the given (active) accounts by firm and computes firm-level totals,
 * sorted by total invested descending. Reuses the existing cost/payout helpers.
 */
export function getAccountsGroupedByFirm(accounts: PropFirmAccount[]): FirmGroup[] {
  const map = new Map<string, PropFirmAccount[]>();
  for (const a of accounts) {
    if (!map.has(a.firm)) map.set(a.firm, []);
    map.get(a.firm)!.push(a);
  }
  return [...map.entries()].map(([firm, list]) => {
    const invested = getTotalInvested(list);
    const payouts = getTotalPayouts(list);
    const net = getNetPnL(list);
    return {
      firm,
      accounts: list,
      totals: { count: list.length, invested, payouts, net, roi: invested === 0 ? 0 : (net / invested) * 100 },
    };
  }).sort((a, b) => b.totals.invested - a.totals.invested);
}
/* ============ Live account status (from linked trades) ============ */

export type AccountAlertKind = 'near_dd' | 'target_reached' | 'consistency_risk';
export interface AccountAlert {
  accountId: string;
  firm: string;
  kind: AccountAlertKind;
  message: string;
}

export interface AccountStatus {
  pnl: number;            // cumulative PnL of linked trades
  progressPct: number;    // toward profit target (0..1+)
  targetReached: boolean;
  ddFloor: number;        // PnL level at which max DD is breached
  ddBuffer: number;       // distance from current PnL to the breach floor ($)
  ddBufferPct: number;    // ddBuffer / maxDrawdown (0..1)
  ddDanger: boolean;      // within 25% of breaching
  consistencyRisk: boolean; // a single day >= consistencyRule of total profit
  tradeCount: number;
}

interface MiniTrade { pnl: number; date: string; time: string }

/** Compute live progress/drawdown status for an account from its linked trades. */
export function computeAccountStatus(a: PropFirmAccount, linkedTrades: MiniTrade[]): AccountStatus {
  const sorted = [...linkedTrades].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  let cum = 0, peak = 0;
  for (const t of sorted) { cum += t.pnl; peak = Math.max(peak, cum); }
  const pnl = cum;
  const progressPct = a.profitTarget > 0 ? pnl / a.profitTarget : 0;
  const targetReached = a.profitTarget > 0 && pnl >= a.profitTarget;
  // Trailing DD floor rises with the equity peak; static DD floor is fixed at -maxDrawdown.
  const ddFloor = a.drawdownType === 'trailing' ? peak - a.maxDrawdown : -a.maxDrawdown;
  const ddBuffer = pnl - ddFloor;
  const ddBufferPct = a.maxDrawdown > 0 ? Math.max(0, Math.min(1, ddBuffer / a.maxDrawdown)) : 1;
  const ddDanger = a.maxDrawdown > 0 && ddBufferPct <= 0.25;

  // Consistency: best single positive day as a share of total profit must stay under the rule.
  let consistencyRisk = false;
  if (a.consistencyRule && pnl > 0) {
    const byDay: Record<string, number> = {};
    for (const t of sorted) byDay[t.date] = (byDay[t.date] || 0) + t.pnl;
    const bestDay = Math.max(0, ...Object.values(byDay));
    consistencyRisk = (bestDay / pnl) * 100 >= a.consistencyRule;
  }

  return { pnl, progressPct, targetReached, ddFloor, ddBuffer, ddBufferPct, ddDanger, consistencyRisk, tradeCount: linkedTrades.length };
}

/** Build user-facing alerts for active accounts given their linked trades. */
export function getAccountAlerts(
  accounts: PropFirmAccount[],
  tradesByAccount: (accountId: string) => MiniTrade[],
): AccountAlert[] {
  const alerts: AccountAlert[] = [];
  for (const a of getActiveAccounts(accounts)) {
    const st = computeAccountStatus(a, tradesByAccount(a.id));
    if (st.targetReached) alerts.push({ accountId: a.id, firm: a.firm, kind: 'target_reached', message: `${a.firm}: target de profit alcanzado` });
    else if (st.ddDanger) alerts.push({ accountId: a.id, firm: a.firm, kind: 'near_dd', message: `${a.firm}: cerca del drawdown máximo` });
    if (st.consistencyRisk) alerts.push({ accountId: a.id, firm: a.firm, kind: 'consistency_risk', message: `${a.firm}: regla de consistencia en riesgo` });
  }
  return alerts;
}

export function getMonthlySpendingVsIncome(accounts: PropFirmAccount[]) {
  const map = new Map<string, { spend: number; income: number }>();
  const add = (month: string, key: 'spend' | 'income', amount: number) => {
    if (!map.has(month)) map.set(month, { spend: 0, income: 0 });
    map.get(month)![key] += amount;
  };
  for (const a of accounts) {
    add(a.purchaseDate.slice(0, 7), 'spend', a.evalFee + a.activationFee);
    for (const r of a.resets) add(r.date.slice(0, 7), 'spend', r.cost);
    for (const p of a.payouts) add(p.date.slice(0, 7), 'income', p.netAmount);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, ...v }));
}
