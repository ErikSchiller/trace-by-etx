import type { Trade } from '../store/tradeStore';

const CSV_HEADERS = [
  'Fecha', 'Hora', 'Activo', 'Dirección', 'Entrada', 'Salida',
  'Tamaño', 'PnL Neto', 'PnL Bruto', 'Comisión', 'R:R Real',
  'Setup', 'Sesión', 'Estado emocional', 'Según plan',
  'Tipo salida', 'Errores', 'Razón entrada', 'Notas post-trade',
];

const escape = (val: unknown): string => {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV(trades: Trade[]) {
  const rows = trades.map(t => [
    t.date, t.time, t.asset, t.direction.toUpperCase(),
    t.entryPrice, t.exitPrice, t.positionSize, t.pnl, t.grossPnl,
    t.commission, t.realRR.toFixed(2), t.setup, t.session,
    t.emotionalState, t.isPlanBased ? 'Sí' : 'No',
    t.exitType, t.errorTags.join('; '), t.entryReason, t.postTradeNotes,
  ].map(escape).join(','));
  const csv = [CSV_HEADERS.join(','), ...rows].join('\n');
  download(`trace_operaciones_${todayStamp()}.csv`, csv, 'text/csv');
}

export function exportToJSON(data: { trades: unknown; notes: unknown; settings: unknown }) {
  // Defensive: strip any password-like field if present
  const clean = JSON.parse(JSON.stringify(data, (k, v) =>
    /password|passwordhash/i.test(k) ? undefined : v
  ));
  const json = JSON.stringify(clean, null, 2);
  download(`trace_export_${todayStamp()}.json`, json, 'application/json');
}

export async function parseCSV(file: File): Promise<Partial<Trade>[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const idx = (label: string) => headers.findIndex(h => h.toLowerCase() === label.toLowerCase());
  const result: Partial<Trade>[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parse (handles quoted fields)
    const cells: string[] = [];
    let cur = '', inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    result.push({
      date: cells[idx('Fecha')],
      time: cells[idx('Hora')],
      asset: cells[idx('Activo')],
      direction: (cells[idx('Dirección')] || 'LONG').toLowerCase() as Trade['direction'],
      entryPrice: parseFloat(cells[idx('Entrada')] || '0'),
      exitPrice: parseFloat(cells[idx('Salida')] || '0'),
      positionSize: parseFloat(cells[idx('Tamaño')] || '0'),
      commission: parseFloat(cells[idx('Comisión')] || '0'),
      setup: cells[idx('Setup')] || '',
      entryReason: cells[idx('Razón entrada')] || '',
      postTradeNotes: cells[idx('Notas post-trade')] || '',
    });
  }
  return result;
}

export function applyAccentColor(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  document.documentElement.style.setProperty('--blue', hex);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  document.documentElement.style.setProperty('--blue-dim', `rgba(${r},${g},${b},0.10)`);
  document.documentElement.style.setProperty('--blue-dim2', `rgba(${r},${g},${b},0.06)`);
}
