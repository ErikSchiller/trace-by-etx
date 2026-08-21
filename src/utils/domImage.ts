/**
 * Dependency-free DOM → PNG. Clones the node, inlines computed styles so the
 * markup is self-contained, rasterizes via an SVG <foreignObject>, and returns
 * a PNG blob. Used for "copiar como imagen" / "compartir vista" in Reportes.
 */

const SKIP = new Set(['cursor', 'pointer-events', 'user-select', '-webkit-user-select', 'transition', 'animation']);

function inlineStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  const parts: string[] = [];
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    if (SKIP.has(prop)) continue;
    const val = cs.getPropertyValue(prop);
    if (val) parts.push(`${prop}:${val}`);
  }
  (dst as HTMLElement).setAttribute('style', parts.join(';'));
  const srcKids = src.children, dstKids = dst.children;
  for (let i = 0; i < srcKids.length; i++) inlineStyles(srcKids[i], dstKids[i]);
}

async function nodeToPngBlob(node: HTMLElement, bg = '#0d0d0f'): Promise<Blob> {
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(node.scrollHeight || rect.height));

  const clone = node.cloneNode(true) as HTMLElement;
  inlineStyles(node, clone);
  clone.style.margin = '0';

  const xml = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">${xml}</div>` +
    `</foreignObject></svg>`;

  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = new Image();
  img.width = width; img.height = height;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });

  const scale = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale; canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyNodeImage(node: HTMLElement): Promise<'copied' | 'downloaded'> {
  const blob = await nodeToPngBlob(node);
  try {
    const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (navigator.clipboard && CI) { await navigator.clipboard.write([new CI({ 'image/png': blob })]); return 'copied'; }
  } catch { /* fall through */ }
  downloadBlob(blob, `trace-reporte-${new Date().toISOString().slice(0, 10)}.png`);
  return 'downloaded';
}

export async function shareNodeImage(node: HTMLElement): Promise<'shared' | 'copied' | 'downloaded'> {
  const blob = await nodeToPngBlob(node);
  const file = new File([blob], `trace-reporte-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title?: string }) => Promise<void> };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try { await nav.share({ files: [file], title: 'Reporte TRACE' }); return 'shared'; } catch { /* fall through */ }
  }
  return copyNodeImage(node);
}
