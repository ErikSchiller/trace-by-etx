export interface AffiliateData {
  firm: string;          // firm slug (normalized from propFirmStore.firm values)
  displayName: string;   // "TopStep", "Apex Trader Funding", etc.
  code: string;          // e.g. "ETX10"
  discount: string;      // "10% de descuento" or "$50 off"
  description?: string;  // extra context
  url?: string;          // firm signup URL with tracking
  active: boolean;       // false hides the code
  logo?: string;         // small logo url
}

export const AFFILIATE_CODES: AffiliateData[] = [
  {
    firm: 'topstep',
    displayName: 'TopStep',
    code: 'ETX10',
    discount: '10% de descuento',
    description: 'Descuento aplicable en cualquier tamaño de cuenta',
    url: 'https://topstep.com/?ref=ETX',
    active: true,
  },
  {
    firm: 'apex',
    displayName: 'Apex Trader Funding',
    code: 'ETX15',
    discount: '15% de descuento',
    url: 'https://apextraderfunding.com/?ref=ETX',
    active: false, // Erik will activate when he has the deal
  },
  { firm: 'ftmo', displayName: 'FTMO', code: '', discount: '', active: false },
  { firm: 'myfundedfutures', displayName: 'MyFundedFutures', code: '', discount: '', active: false },
  { firm: 'tradeify', displayName: 'Tradeify', code: '', discount: '', active: false },
  { firm: 'takeprofittrader', displayName: 'Take Profit Trader', code: '', discount: '', active: false },
  { firm: 'bulenox', displayName: 'Bulenox', code: '', discount: '', active: false },
  { firm: 'e8', displayName: 'E8 Markets', code: '', discount: '', active: false },
];

function slug(firm: string) {
  return firm.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

/** Active affiliate code for a firm, matched by slug or display name. Returns null if none. */
export function getAffiliateCode(firm: string): AffiliateData | null {
  const s = slug(firm);
  const data = AFFILIATE_CODES.find(a => a.active && a.code && (a.firm === s || slug(a.displayName) === s));
  return data ?? null;
}

/** All firms that currently have an active, usable code (for marketing grids). */
export function getActiveAffiliates(): AffiliateData[] {
  return AFFILIATE_CODES.filter(a => a.active && a.code);
}

/* ── Visibility preference (localStorage; respects users who opt out) ── */
const VIS_KEY = 'show_affiliate_codes';
export function isAffiliateVisible(): boolean {
  try { return localStorage.getItem(VIS_KEY) !== '0'; } catch { return true; }
}
export function setAffiliateVisible(on: boolean): void {
  try { localStorage.setItem(VIS_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}

/* ── Lightweight local analytics (accumulate until Supabase) ── */
export function trackAffiliateEvent(action: 'view' | 'copy' | 'click', firm: string): void {
  try {
    const events = JSON.parse(localStorage.getItem('affiliate_events') || '[]');
    events.push({ action, firm, timestamp: new Date().toISOString() });
    localStorage.setItem('affiliate_events', JSON.stringify(events.slice(-500)));
  } catch { /* ignore */ }
}
