import type { RecapData } from './recap';

const BLUE = '#4f8fff';
const RED = '#ef4444';
const W = 1080;
const H = 1350;

function money(n: number) {
  if (!isFinite(n)) return '$0';
  const s = n >= 0 ? '+' : '-';
  return `${s}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
}

/** Draws a branded, shareable recap card onto a canvas (portrait 1080x1350). */
export async function renderRecapCanvas(data: RecapData): Promise<HTMLCanvasElement> {
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* ignore */ }
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0c0c0e';
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, 'rgba(79,143,255,0.10)');
  grad.addColorStop(0.5, 'rgba(79,143,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  const pad = 90;
  let y = 150;

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#6b7280';
  ctx.font = "600 30px 'Space Grotesk', sans-serif";
  ctx.fillText('TU SEMANA EN TRACE', pad, y);
  y += 46;
  ctx.fillStyle = '#e0e0e8';
  ctx.font = "800 44px 'Syne', sans-serif";
  ctx.fillText(`${shortDate(data.fromDate)} – ${shortDate(data.toDate)}`, pad, y);
  y += 40;
  ctx.fillStyle = '#6b7280';
  ctx.font = "400 28px 'Space Grotesk', sans-serif";
  ctx.fillText(`${data.tradingDays} días operados · ${data.totalTrades} operaciones`, pad, y);

  // Hero net PnL
  y += 120;
  ctx.fillStyle = '#6b7280';
  ctx.font = "600 28px 'Space Grotesk', sans-serif";
  ctx.fillText('NET PNL DE LA SEMANA', pad, y);
  y += 100;
  ctx.fillStyle = data.netPnl >= 0 ? BLUE : RED;
  ctx.font = "800 130px 'Syne', sans-serif";
  ctx.fillText(money(data.netPnl), pad, y);
  if (data.deltaPct !== null) {
    y += 50;
    ctx.fillStyle = data.deltaPct >= 0 ? BLUE : RED;
    ctx.font = "600 30px 'Space Grotesk', sans-serif";
    ctx.fillText(`${data.deltaPct >= 0 ? '↗' : '↘'} ${data.deltaPct >= 0 ? '+' : ''}${data.deltaPct.toFixed(1)}% vs semana anterior`, pad, y);
  }

  // Stat tiles
  y += 90;
  const tiles: [string, string][] = [
    ['Win rate', `${Math.round(data.winRate)}%`],
    ['Profit factor', isFinite(data.profitFactor) ? data.profitFactor.toFixed(2) : '∞'],
    ['Avg W/L', data.avgWL.toFixed(2)],
  ];
  const tileW = (W - pad * 2 - 40) / 3;
  tiles.forEach((t, i) => {
    const x = pad + i * (tileW + 20);
    ctx.fillStyle = '#15171d';
    roundRect(ctx, x, y, tileW, 150, 16); ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.font = "500 24px 'Space Grotesk', sans-serif";
    ctx.fillText(t[0], x + 24, y + 50);
    ctx.fillStyle = '#fff';
    ctx.font = "800 56px 'Syne', sans-serif";
    ctx.fillText(t[1], x + 24, y + 115);
  });

  // Best / worst trade
  y += 220;
  drawTradeLine(ctx, pad, y, 'Mejor trade', data.bestTrade, BLUE);
  y += 130;
  drawTradeLine(ctx, pad, y, 'Peor trade', data.worstTrade, RED);

  // Footer brand
  ctx.fillStyle = '#4a4a60';
  ctx.font = "700 30px 'Syne', sans-serif";
  ctx.fillText('TRACE', pad, H - 80);
  ctx.fillStyle = '#33334a';
  ctx.font = "400 26px 'Space Grotesk', sans-serif";
  ctx.fillText('by ETX · tu journal de trading', pad + 110, H - 80);

  return canvas;
}

function drawTradeLine(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, trade: RecapData['bestTrade'], color: string) {
  ctx.fillStyle = '#6b7280';
  ctx.font = "500 24px 'Space Grotesk', sans-serif";
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.fillStyle = '#e0e0e8';
  ctx.font = "700 40px 'Syne', sans-serif";
  if (!trade) { ctx.fillText('—', x, y + 52); return; }
  const dir = trade.direction === 'long' ? 'LONG' : 'SHORT';
  ctx.fillText(`${trade.asset} ${dir}`, x, y + 52);
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.font = "800 44px 'Syne', sans-serif";
  ctx.fillText(money(trade.pnl), W - 90, y + 52);
  ctx.textAlign = 'left';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copy the recap image to the clipboard; falls back to a PNG download. */
export async function copyRecapImage(data: RecapData): Promise<'copied' | 'downloaded'> {
  const canvas = await renderRecapCanvas(data);
  const blob = await toBlob(canvas);
  try {
    const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (navigator.clipboard && CI) {
      await navigator.clipboard.write([new CI({ 'image/png': blob })]);
      return 'copied';
    }
  } catch { /* fall through */ }
  downloadBlob(blob, `trace-recap-${data.toDate}.png`);
  return 'downloaded';
}

/** Share the recap image via the Web Share API; falls back to copy/download. */
export async function shareRecapImage(data: RecapData): Promise<'shared' | 'copied' | 'downloaded'> {
  const canvas = await renderRecapCanvas(data);
  const blob = await toBlob(canvas);
  const file = new File([blob], `trace-recap-${data.toDate}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title?: string; text?: string }) => Promise<void> };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try { await nav.share({ files: [file], title: 'Mi semana en TRACE' }); return 'shared'; } catch { /* fall through */ }
  }
  return copyRecapImage(data);
}

/** Open a print window with the recap image so the user can save it as PDF. */
export async function downloadRecapPdf(data: RecapData): Promise<void> {
  const canvas = await renderRecapCanvas(data);
  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>TRACE Recap ${data.toDate}</title><style>
    @page { margin: 0; }
    body { margin: 0; background: #0c0c0e; display: flex; align-items: center; justify-content: center; height: 100vh; }
    img { max-width: 100%; max-height: 100vh; }
  </style></head><body><img src="${dataUrl}" onload="setTimeout(function(){window.print();},300)" /></body></html>`);
  win.document.close();
}
