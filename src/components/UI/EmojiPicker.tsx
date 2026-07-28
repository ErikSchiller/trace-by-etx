import { useState } from 'react';

const EMOJI_DATA: { e: string; k: string }[] = [
  { e: '📓', k: 'cuaderno notebook libreta notas' },
  { e: '📔', k: 'cuaderno decorado notebook' },
  { e: '📕', k: 'libro rojo book' },
  { e: '📗', k: 'libro verde book' },
  { e: '📘', k: 'libro azul book' },
  { e: '📙', k: 'libro naranja book' },
  { e: '📚', k: 'libros books biblioteca' },
  { e: '📖', k: 'libro abierto open book leer' },
  { e: '📝', k: 'nota escribir memo pencil' },
  { e: '🗒', k: 'bloc notas notepad' },
  { e: '🗓', k: 'calendario agenda calendar' },
  { e: '📅', k: 'calendario fecha calendar date' },
  { e: '📊', k: 'grafico barras chart stats estadistica' },
  { e: '📈', k: 'grafico subida up trending chart' },
  { e: '📉', k: 'grafico bajada down chart' },
  { e: '💹', k: 'grafico yen mercado market chart' },
  { e: '💰', k: 'dinero money bolsa saco' },
  { e: '💵', k: 'dinero dolar money cash' },
  { e: '💴', k: 'dinero yen money' },
  { e: '💶', k: 'dinero euro money' },
  { e: '💷', k: 'dinero libra money pound' },
  { e: '💸', k: 'dinero volando money perdida' },
  { e: '🏦', k: 'banco bank' },
  { e: '🪙', k: 'moneda coin crypto' },
  { e: '🎯', k: 'objetivo target diana meta' },
  { e: '🧠', k: 'cerebro brain mente psicologia' },
  { e: '🎓', k: 'graduacion educacion aprender' },
  { e: '🧘', k: 'meditar calma zen mindfulness' },
  { e: '💭', k: 'pensamiento idea thought' },
  { e: '💡', k: 'idea bombilla luz' },
  { e: '🔥', k: 'fuego fire racha hot' },
  { e: '⚡', k: 'rayo energia fast' },
  { e: '⭐', k: 'estrella star favorito' },
  { e: '🌟', k: 'estrella brillante star' },
  { e: '✨', k: 'brillos sparkle' },
  { e: '🚀', k: 'cohete rocket escalar' },
  { e: '✅', k: 'check ok correcto done' },
  { e: '❌', k: 'error mal cross wrong' },
  { e: '⚠️', k: 'alerta warning cuidado' },
  { e: '🔒', k: 'candado lock cerrado' },
  { e: '🔓', k: 'candado abierto unlock' },
  { e: '🔑', k: 'llave key' },
  { e: '🎨', k: 'arte paleta color diseño' },
  { e: '🖼', k: 'cuadro imagen frame' },
  { e: '📌', k: 'chincheta pin importante' },
  { e: '📍', k: 'ubicacion pin location' },
  { e: '🏷', k: 'etiqueta tag label' },
  { e: '🎁', k: 'regalo gift' },
  { e: '🌅', k: 'amanecer sunrise mañana' },
  { e: '🌆', k: 'atardecer city tarde' },
  { e: '🌃', k: 'noche city night' },
  { e: '🌍', k: 'mundo tierra earth global' },
  { e: '🌎', k: 'mundo tierra earth americas' },
  { e: '🌏', k: 'mundo tierra earth asia' },
  { e: '☕', k: 'cafe coffee' },
  { e: '🍵', k: 'te tea' },
  { e: '🥗', k: 'ensalada salud healthy' },
  { e: '🏋', k: 'pesas gym entreno' },
  { e: '🏃', k: 'correr running' },
  { e: '💤', k: 'dormir sleep descanso' },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [q, setQ] = useState('');
  const list = q.trim() ? EMOJI_DATA.filter(d => d.k.includes(q.toLowerCase()) || d.e === q) : EMOJI_DATA;
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: 40, left: 0, zIndex: 60, width: 260,
        background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 10,
        padding: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
      }}
    >
      <input
        autoFocus value={q} onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        placeholder="Buscar emoji..."
        style={{ fontFamily: "'Space Grotesk', sans-serif", width: '100%', boxSizing: 'border-box', background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem', color: 'var(--text-primary)', outline: 'none', marginBottom: 8 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
        {list.map(d => (
          <button
            key={d.e} onClick={() => { onSelect(d.e); onClose(); }}
            title={d.k.split(' ')[0]}
            style={{ width: 30, height: 30, borderRadius: 5, background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >{d.e}</button>
        ))}
        {list.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', padding: 12 }}>Sin resultados</div>}
      </div>
    </div>
  );
}

export default EmojiPicker;
