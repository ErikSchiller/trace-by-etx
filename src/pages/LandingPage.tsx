import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/UI/LogoMark';
import { Navbar } from '../components/Marketing/Navbar';
import { Footer } from '../components/Marketing/Footer';
import { CookiesBanner } from '../components/CookiesBanner';

const C = {
  bg:      '#0a0a0c',
  card:    '#111113',
  card2:   '#161618',
  border:  '#1e1e20',
  borderSub: '#1a1a1c',
  blue:    '#4f8fff',
  red:     '#ef4444',
  text:    '#e0e0e8',
  text2:   '#888898',
  text3:   '#4a4a60',
  text4:   '#33334a',
};
const GRADIENT = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 45%, #0f3460 100%)';
const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: fontBody, minHeight: '100vh' }}>
      <Navbar />
      <Hero />
      <StatsStrip />
      <BrokersStrip />
      <ProductsHub id="score" />
      <FeatureCard id="diario" />
      <NumberedSection
        num="1"
        tag="Registro de operaciones"
        title="Un diario potente,"
        titleBlue=" sin fricción."
        sub="Tú céntrate en operar — TRACE se encarga de los números. Registra, etiqueta y analiza cada trade sin esfuerzo."
        cta="Comenzar gratis"
      />
      <GradientCards id="notebook" cards={[
        { title: 'Registro rápido', desc: 'Añade un trade en menos de 30 segundos. PnL y R:R automáticos.', rows: [['PnL estimado', '+$420', 'blue'], ['R:R', '1.9', null], ['Comisión', '$4.50', null]] },
        { title: 'Cuentas múltiples', desc: 'Conecta todas tus cuentas de prop firms y brokers en un lugar.', rows: [['TopStep', '+$4.280', 'blue'], ['Apex', '+$2.940', 'blue'], ['Lucid', '-$380', 'red']] },
        { title: 'Stats automáticas', desc: 'Win rate, profit factor, drawdown — calculado en tiempo real.', rows: [['Profit Factor', '2.18', 'blue'], ['Win rate', '64%', null], ['Balance', '$114.742', null]] },
      ]} />
      <NumberedSection
        id="analisis"
        num="2"
        tag="Análisis de trades"
        title="Analiza tus"
        titleBlue=" estadísticas."
        sub="Entiende qué errores cometiste, si arriesgaste más de lo planeado, y qué patrones se repiten en tus pérdidas."
        cta="Ver mis stats"
      />
      <NumberedSection
        id="progress"
        num="3"
        tag="Reportes con datos"
        title="Obtén"
        titleBlue=" insights clave."
        sub="Reportes que te muestran tu progreso, tus fortalezas y debilidades — y dónde está escapándose tu dinero."
        cta="Comenzar ahora"
      />
      <GradientCards id="replay" cards={[
        { title: 'Profundiza en tu estrategia', desc: 'Visualiza tu rendimiento por setup, sesión, día de la semana y estado emocional.' },
        { title: 'Entiende tus patrones',       desc: 'Descubre comportamientos repetidos: FOMO, salidas tempranas, revenge trading.' },
        { title: 'Resumen de lo que funciona',  desc: 'Resúmenes claros de tus fortalezas y debilidades como trader.' },
      ]} />
      <PropFirmHubSection />
      <FooterCTA />
      <Footer />
      <CookiesBanner />
    </div>
  );
}

/* ============ HERO ============ */
function Hero() {
  const tools = ['Diario automático', 'Análisis de trades', 'TRACE Score', 'Progress Tracker', 'Notebook', 'Reportes'];
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 800, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(79,143,255,0.07), transparent 60%)',
      }} />
      <div className="lp-hero-grid" style={{
        position: 'relative', maxWidth: 1280, margin: '0 auto',
        padding: '70px 40px 80px',
        display: 'grid', gridTemplateColumns: '1fr 1.1fr',
        gap: 30, alignItems: 'center',
      }}>
        <div>
          <h1 className="lp-h1" style={{
            fontFamily: fontHead, fontWeight: 800,
            fontSize: '3.1rem', lineHeight: 1.05, letterSpacing: '-0.03em',
            color: '#fff', marginBottom: 22,
          }}>
            Tu diario de trading, <span style={{ color: C.blue }}>en serio.</span>
          </h1>
          <p style={{ fontSize: '1rem', color: C.text2, maxWidth: 440, lineHeight: 1.6, marginBottom: 18 }}>
            El journal que registra tus operaciones, analiza tus patrones y te enseña dónde estás perdiendo dinero — mientras tú te centras en el siguiente trade.
          </p>
          <p style={{ fontSize: '1rem', color: C.text2, marginBottom: 28 }}>
            Hecho por traders, <b style={{ color: '#fff' }}>para traders</b>.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
            <Link to="/register" style={{
              background: C.blue, color: '#fff', padding: '14px 32px',
              borderRadius: 10, fontWeight: 600, fontSize: '0.95rem',
              textDecoration: 'none', boxShadow: '0 8px 24px rgba(79,143,255,0.25)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3d7aee'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.transform = 'none'; }}
            >Comenzar gratis →</Link>
            <div style={{ fontSize: '0.78rem', color: C.text3 }}>
              <span style={{ color: C.blue }}>Gratis para siempre</span> · Sin tarjeta
            </div>
          </div>
          <div style={{ fontSize: '0.65rem', color: C.text3, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
            Todo en un solo lugar · 6 herramientas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tools.map((t, i) => {
              const active = i === 0;
              return (
                <span key={t} style={{
                  border: active ? '1px solid rgba(79,143,255,0.3)' : `1px solid ${C.border}`,
                  background: active ? 'rgba(79,143,255,0.06)' : C.card,
                  color: active ? C.blue : C.text2,
                  padding: '6px 14px', borderRadius: 18, fontSize: '0.72rem',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />}
                  {t}
                </span>
              );
            })}
          </div>
        </div>
        <HeroMockup />
      </div>
      <style>{`
        @media (max-width: 900px) {
          .lp-hero-grid { grid-template-columns: 1fr !important; padding: 50px 20px 60px !important; }
          .lp-h1 { font-size: 2.2rem !important; }
        }
      `}</style>
    </section>
  );
}

function HeroMockup() {
  return (
    <div style={{ position: 'relative', height: 480 }}>
      {/* Main card — mini dashboard */}
      <div style={{
        position: 'absolute', inset: 0,
        background: C.card2, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ background: '#0e0e10', borderBottom: `1px solid ${C.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3a3a55' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3a3a55' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3a3a55' }} />
          <div style={{ marginLeft: 10 }}><LogoMark size="sm" showByEtx={false} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', flex: 1 }}>
          {/* Mini sidebar */}
          <div style={{ background: '#0e0e10', borderRight: `1px solid ${C.border}`, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { l: 'Dashboard', active: true },
              { l: 'Diario' }, { l: 'Operaciones' }, { l: 'Notebook' },
              { l: 'Reportes' }, { l: 'Progress' }, { l: 'Replay' },
            ].map(it => (
              <div key={it.l} style={{
                fontSize: 10,
                color: it.active ? C.blue : C.text3,
                background: it.active ? 'rgba(79,143,255,0.1)' : 'transparent',
                borderLeft: it.active ? `2px solid ${C.blue}` : '2px solid transparent',
                padding: '5px 8px', borderRadius: 5, fontWeight: it.active ? 600 : 400,
              }}>{it.l}</div>
            ))}
          </div>
          {/* Content */}
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[
                { l: 'Net PnL', v: '+$4.280', c: C.blue },
                { l: 'Win %', v: '64%' },
                { l: 'PF', v: '2.18' },
                { l: 'AW/L', v: '1.9' },
              ].map(k => (
                <div key={k.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 7, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{k.l}</div>
                  <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: 12, color: k.c || '#fff', marginTop: 2 }}>{k.v}</div>
                </div>
              ))}
            </div>
            {/* Mini calendar */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, flex: 1 }}>
              <div style={{ fontSize: 9, color: C.text3, marginBottom: 4 }}>Abril 2026</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {Array.from({ length: 30 }).map((_, i) => {
                  const r = (i * 17) % 100;
                  const isPos = r > 35;
                  const isNeg = r < 15;
                  const isEmpty = r >= 15 && r <= 35;
                  return (
                    <div key={i} style={{
                      aspectRatio: '1', borderRadius: 3,
                      background: isPos ? 'rgba(79,143,255,0.15)' : isNeg ? 'rgba(239,68,68,0.15)' : isEmpty ? 'transparent' : '#0e0e10',
                      border: isPos ? '1px solid rgba(79,143,255,0.25)' : isNeg ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
                    }} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating card 1 — TRACE IA (top-right) */}
      <div style={{
        position: 'absolute', top: -10, right: -18, width: 240,
        background: C.card2, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 14,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <svg viewBox="0 0 28 32" style={{ width: 12, height: 14 }}>
            <polyline points="14,2 2,30 26,30" stroke={C.blue} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: 11, color: '#fff' }}>TRACE IA</span>
          <span style={{ marginLeft: 'auto', background: 'rgba(79,143,255,0.15)', color: C.blue, fontSize: 7, padding: '2px 5px', borderRadius: 4, fontWeight: 600, letterSpacing: '0.05em' }}>PRÓXIMAMENTE</span>
        </div>
        <div style={{ background: 'rgba(79,143,255,0.06)', border: `1px solid rgba(79,143,255,0.15)`, borderRadius: 6, padding: 8, fontSize: 10, color: '#ccc', marginBottom: 8 }}>
          ¿Y si solo operara mis 2 mejores setups?
        </div>
        <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: 18, color: C.blue }}>+$2.140</div>
        <div style={{ fontSize: 9, color: C.text2, marginTop: 4, lineHeight: 1.4 }}>
          Tus VWAP bounce y breakouts de apertura suman el 127% de tus beneficios.
        </div>
      </div>

      {/* Floating card 2 — Activity (bottom-left) */}
      <div style={{
        position: 'absolute', bottom: -8, left: -18, width: 220,
        background: C.card2, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 12,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        {[
          { ic: '+', t: 'Operación guardada', s: 'NQ Long · +$420 · NY' },
          { ic: '✎', t: 'Nota del día creada', s: 'Plan seguido. Salida...' },
          { ic: '✦', t: 'Racha activa', s: '4 días de checklist' },
        ].map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: i > 0 ? '6px 0' : '0 0 6px', borderTop: i > 0 ? `1px solid ${C.borderSub}` : 'none',
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: 'rgba(79,143,255,0.1)', color: C.blue, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{r.ic}</div>
            <div>
              <div style={{ fontSize: 9, color: '#fff', fontWeight: 600 }}>{r.t}</div>
              <div style={{ fontSize: 8, color: C.text2, marginTop: 1 }}>{r.s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating card 3 — TRACE Score (bottom-right) */}
      <div style={{
        position: 'absolute', bottom: -10, right: -14, width: 180,
        background: C.card2, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 14,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 9, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>TRACE Score</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: 26, color: '#fff' }}>83.01</span>
          <span style={{ background: 'rgba(79,143,255,0.15)', color: C.blue, fontSize: 8, padding: '2px 6px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>EXCELENTE</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, marginTop: 8, background: 'linear-gradient(90deg, #ef4444, #f59e0b 45%, #4f8fff)', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '83%', top: -2, width: 3, height: 8, background: '#fff', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

/* ============ STATS STRIP ============ */
function StatsStrip() {
  const stats = [
    { v: '+10K', l: 'Operaciones registradas' },
    { v: ['100', '%'], l: 'En español', blueIdx: 1 },
    { v: '6', l: 'Herramientas en un hub' },
    { v: '€0', l: 'Para empezar', allBlue: true },
  ];
  return (
    <section style={{
      background: '#0d0d0f',
      borderTop: `1px solid ${C.card2}`, borderBottom: `1px solid ${C.card2}`,
      padding: '34px 40px',
    }}>
      <div className="lp-stats" style={{ display: 'flex', maxWidth: 1100, margin: '0 auto', justifyContent: 'space-around', alignItems: 'center' }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center',
            borderRight: i < stats.length - 1 ? `1px solid ${C.borderSub}` : 'none',
            padding: '0 14px',
          }}>
            <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.7rem', color: s.allBlue ? C.blue : '#fff', lineHeight: 1 }}>
              {Array.isArray(s.v) ? s.v.map((part, j) => (
                <span key={j} style={{ color: j === s.blueIdx ? C.blue : '#fff' }}>{part}</span>
              )) : s.v}
            </div>
            <div style={{ fontSize: '0.72rem', color: C.text3, marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 700px) {
          .lp-stats { flex-wrap: wrap; gap: 20px 0; }
          .lp-stats > div { flex: 0 0 50% !important; border-right: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ============ BROKERS STRIP ============ */
function BrokersStrip() {
  const brokers = [
    { name: 'TopStep',     init: 'TS', color: '#3b82f6' },
    { name: 'Apex',        init: 'A',  color: '#8b5cf6' },
    { name: 'Tradovate',   init: 'T',  color: '#10b981' },
    { name: 'NinjaTrader', init: 'N',  color: '#ef4444' },
    { name: 'Rithmic',     init: 'R',  color: '#f59e0b' },
    { name: 'Lucid',       init: 'L',  color: '#06b6d4' },
  ];
  return (
    <section style={{
      padding: '26px 40px', borderBottom: `1px solid ${C.card2}`,
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
      alignItems: 'center', gap: 22,
    }}>
      <div style={{ fontSize: '0.6rem', color: C.text4, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        Compatible con
      </div>
      {brokers.map(b => (
        <div key={b.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            background: b.color, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
          }}>{b.init}</div>
          <span style={{ fontSize: '0.78rem', color: C.text2 }}>{b.name}</span>
        </div>
      ))}
      <span style={{ fontSize: '0.72rem', color: C.text4 }}>próximamente más</span>
    </section>
  );
}

/* ============ PRODUCTS HUB ============ */
function ProductsHub({ id }: { id?: string }) {
  const tools = [
    { l: 'Diario automático', active: true },
    { l: 'Análisis de trades' },
    { l: 'TRACE Score' },
    { l: 'Progress Tracker' },
    { l: 'Notebook' },
    { l: 'Reportes' },
  ];
  return (
    <section id={id} style={{ padding: '90px 40px 60px', maxWidth: 900, margin: '0 auto', textAlign: 'center', scrollMarginTop: 70 }}>
      <div style={{ fontSize: '0.72rem', color: C.blue, fontWeight: 600, marginBottom: 14 }}>● Todas tus herramientas</div>
      <h2 className="lp-h2" style={{
        fontFamily: fontHead, fontWeight: 800, fontSize: '2.6rem',
        color: '#fff', letterSpacing: '-0.02em', marginBottom: 14,
      }}>Seis productos. <span style={{ color: C.blue }}>Un hub.</span></h2>
      <p style={{ fontSize: '1rem', color: C.text2, marginBottom: 36, maxWidth: 540, marginInline: 'auto' }}>
        Todo lo que te hace mejor trader — y nada que no lo haga.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
        {tools.map(t => (
          <div key={t.l} style={{
            border: t.active ? `1px solid ${C.blue}` : `1px solid ${C.border}`,
            background: t.active ? 'rgba(79,143,255,0.07)' : C.card,
            color: t.active ? C.blue : C.text2,
            padding: '11px 20px', borderRadius: 24, fontSize: '0.82rem',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            cursor: 'default',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.active ? C.blue : C.text4 }} />
            {t.l}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============ FEATURE CARD ============ */
function FeatureCard({ id }: { id?: string }) {
  const trades = [
    { d: '03 May', s: 'NQ',  pnl: '+$420', win: true,  setup: 'Breakout' },
    { d: '02 May', s: 'ES',  pnl: '-$180', win: false, setup: 'VWAP' },
    { d: '01 May', s: 'NQ',  pnl: '+$610', win: true,  setup: 'Pullback' },
    { d: '30 Abr', s: 'CL',  pnl: '+$95',  win: true,  setup: 'ORB' },
    { d: '29 Abr', s: 'GC',  pnl: '-$220', win: false, setup: 'Reversión' },
    { d: '28 Abr', s: 'NQ',  pnl: '+$340', win: true,  setup: 'Breakout' },
  ];
  return (
    <section id={id} style={{ padding: '60px 40px', scrollMarginTop: 70 }}>
      <div className="lp-feature" style={{
        position: 'relative', maxWidth: 1180, margin: '0 auto',
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
        padding: '48px 52px',
        display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 44,
        alignItems: 'center', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(79,143,255,0.08), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.65rem', color: C.blue, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Diario automático</div>
          <h3 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.8rem', color: '#fff', lineHeight: 1.15, marginBottom: 14 }}>
            Cada operación, registrada en segundos.
          </h3>
          <p style={{ fontSize: '0.9rem', color: C.text2, lineHeight: 1.6, marginBottom: 16 }}>
            Añade tu trade nada más cerrarlo — activo, dirección, precios — y TRACE calcula el resto. PnL, R:R, win rate, todo automático. Nunca más un Excel.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20 }}>
            {['Registro en menos de 30 segundos', 'Cálculos automáticos de PnL y R:R', 'Estado emocional y errores etiquetados', 'Capturas de pantalla por trade'].map(t => (
              <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: '0.85rem', color: C.text }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue, flexShrink: 0 }} />
                {t}
              </li>
            ))}
          </ul>
          <a href="#" style={{ fontSize: '0.85rem', color: '#fff', borderBottom: `1px solid ${C.border}`, paddingBottom: 2, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = C.blue; e.currentTarget.style.borderBottomColor = C.blue; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderBottomColor = C.border; }}
          >Saber más →</a>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{
            background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10,
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)', overflow: 'hidden',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 0.6fr 0.9fr 0.7fr 1fr', padding: '10px 14px', background: '#0e0e10', borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              <div>Fecha</div><div>Símbolo</div><div>Net PnL</div><div>Estado</div><div>Setup</div>
            </div>
            {trades.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.8fr 0.6fr 0.9fr 0.7fr 1fr', padding: '11px 14px', borderTop: i > 0 ? `1px solid ${C.borderSub}` : 'none', fontSize: 12, alignItems: 'center' }}>
                <div style={{ color: C.text2 }}>{t.d}</div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{t.s}</div>
                <div style={{ color: t.win ? C.blue : C.red, fontWeight: 600 }}>{t.pnl}</div>
                <div>
                  <span style={{
                    background: t.win ? 'rgba(79,143,255,0.1)' : 'rgba(239,68,68,0.1)',
                    color: t.win ? C.blue : C.red,
                    fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em',
                  }}>{t.win ? 'WIN' : 'LOSS'}</span>
                </div>
                <div>
                  <span style={{ background: 'rgba(79,143,255,0.06)', color: C.blue, border: '1px solid rgba(79,143,255,0.15)', borderRadius: 12, padding: '2px 8px', fontSize: 10 }}>{t.setup}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .lp-feature { grid-template-columns: 1fr !important; padding: 30px 24px !important; gap: 28px !important; }
        }
      `}</style>
    </section>
  );
}

/* ============ NUMBERED SECTION ============ */
function NumberedSection({ num, tag, title, titleBlue, sub, cta, id }: {
  num: string; tag: string; title: string; titleBlue: string; sub: string; cta: string; id?: string;
}) {
  return (
    <section id={id} style={{ position: 'relative', padding: '90px 40px 50px', maxWidth: 980, margin: '0 auto', textAlign: 'center', scrollMarginTop: 70 }}>
      <div style={{
        position: 'absolute', top: -10, left: 20,
        fontFamily: fontHead, fontWeight: 800, fontSize: '9rem',
        color: 'rgba(79,143,255,0.05)', lineHeight: 1, pointerEvents: 'none',
      }}>{num}</div>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: '0.72rem', color: C.blue, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 14, fontWeight: 600 }}>{tag}</div>
        <h2 className="lp-h2" style={{
          fontFamily: fontHead, fontWeight: 800, fontSize: '2.4rem',
          color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16,
        }}>{title}<span style={{ color: C.blue }}>{titleBlue}</span></h2>
        <p style={{ fontSize: '0.95rem', color: C.text2, maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6 }}>{sub}</p>
        <Link to="/register" style={{
          background: C.blue, color: '#fff', padding: '12px 28px',
          borderRadius: 9, fontWeight: 600, fontSize: '0.88rem',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#3d7aee'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.transform = 'none'; }}
        >{cta} →</Link>
      </div>
    </section>
  );
}

/* ============ GRADIENT CARDS ============ */
function GradientCards({ cards, id }: {
  cards: { title: string; desc: string; rows?: [string, string, 'blue' | 'red' | null][] }[];
  id?: string;
}) {
  return (
    <section id={id} style={{ padding: '20px 40px 40px', scrollMarginTop: 70 }}>
      <div className="lp-grad-cards" style={{
        maxWidth: 1180, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
      }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            position: 'relative', overflow: 'hidden',
            background: GRADIENT, border: '1px solid rgba(79,143,255,0.15)',
            borderRadius: 14, padding: '26px 24px', minHeight: 240,
          }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 220, height: 220, background: 'radial-gradient(circle, rgba(79,143,255,0.25), transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.15rem', color: '#fff', lineHeight: 1.2 }}>{c.title}</h3>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>↗</div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginBottom: 16, flex: c.rows ? 0 : 1 }}>{c.desc}</p>
              {c.rows && (
                <div style={{ background: 'rgba(10,10,15,0.5)', border: '1px solid rgba(79,143,255,0.12)', borderRadius: 8, padding: '8px 12px', marginTop: 'auto' }}>
                  {c.rows.map(([l, v, color], j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: j > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{l}</span>
                      <span style={{ color: color === 'blue' ? C.blue : color === 'red' ? C.red : '#fff', fontSize: 11, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 900px) {
          .lp-grad-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

/* ============ PROP FIRM HUB SECTION ============ */
function PropFirmHubSection() {
  const accounts = [
    { firm: 'TopStep', init: 'TS', color: '#3b82f6', size: '$50K', phase: 'FUNDED', pc: C.blue, target: 0.57, dd: 0.72 },
    { firm: 'Apex', init: 'A', color: '#8b5cf6', size: '$100K', phase: 'EVAL F1', pc: '#f59e0b', target: 0.34, dd: 0.45 },
    { firm: 'FTMO', init: 'F', color: '#06b6d4', size: '$200K', phase: 'PASSED', pc: '#a855f7', target: 1, dd: 0.88 },
  ];
  return (
    <section style={{ padding: '60px 40px', scrollMarginTop: 70 }}>
      <div className="lp-feature" style={{
        position: 'relative', maxWidth: 1180, margin: '0 auto',
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
        padding: '48px 52px',
        display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 44,
        alignItems: 'center', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(79,143,255,0.08), transparent 65%)', pointerEvents: 'none' }} />
        {/* Mockup — prop firm account cards */}
        <div className="lp-pf-mock" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {accounts.map(a => (
            <div key={a.firm} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', boxShadow: '0 16px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: a.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{a.init}</div>
                  <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{a.firm}</span>
                  <span style={{ fontSize: '0.66rem', color: C.text2 }}>{a.size}</span>
                </div>
                <span style={{ background: `${a.pc}1f`, color: a.pc, fontSize: 8, padding: '2px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>{a.phase}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['Target', a.target, C.blue], ['Margen DD', a.dd, a.dd > 0.5 ? C.blue : a.dd > 0.25 ? '#f59e0b' : C.red]].map(([l, v, col]) => (
                  <div key={l as string} style={{ flex: 1 }}>
                    <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{l as string}</div>
                    <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(v as number) * 100}%`, height: '100%', background: col as string }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Copy */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '0.65rem', color: C.blue, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Prop Firm Hub</span>
            <span style={{ background: 'rgba(79,143,255,0.15)', color: C.blue, fontSize: 8, padding: '2px 6px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em' }}>NUEVO</span>
          </div>
          <h3 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.8rem', color: '#fff', lineHeight: 1.15, marginBottom: 14 }}>
            Todas tus prop firms, bajo control.
          </h3>
          <p style={{ fontSize: '0.9rem', color: C.text2, lineHeight: 1.6, marginBottom: 16 }}>
            Trackea cada cuenta de evaluación y fondeada: fees, payouts, distancia al drawdown y progreso hacia el target. Vincula tus operaciones y conoce tu ROI real por firma.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20 }}>
            {['Fees, resets y payouts por cuenta', 'Alertas de drawdown y target en el dashboard', 'Pass rate y ROI real por firma', 'Simulador Monte Carlo y heatmap de horarios'].map(t => (
              <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: '0.85rem', color: C.text }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue, flexShrink: 0 }} />
                {t}
              </li>
            ))}
          </ul>
          <Link to="/funciones" style={{ fontSize: '0.85rem', color: '#fff', borderBottom: `1px solid ${C.border}`, paddingBottom: 2, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = C.blue; e.currentTarget.style.borderBottomColor = C.blue; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderBottomColor = C.border; }}
          >Saber más →</Link>
        </div>
      </div>
    </section>
  );
}

/* ============ FOOTER CTA ============ */
function FooterCTA() {
  return (
    <section style={{ marginTop: 80, padding: '70px 40px', position: 'relative', overflow: 'hidden', background: GRADIENT, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(79,143,255,0.25), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.2rem', color: '#fff', letterSpacing: '-0.02em', marginBottom: 14 }}>
          Empieza a mejorar hoy.
        </h2>
        <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.55)', marginBottom: 28 }}>
          Únete a los traders que ya registran sus operaciones con TRACE.
        </p>
        <Link to="/register" style={{
          background: '#fff', color: '#0f3460',
          fontFamily: fontHead, fontWeight: 700,
          padding: '14px 34px', borderRadius: 10,
          fontSize: '0.95rem', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'transform 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
        >Comenzar gratis →</Link>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 14 }}>
          Gratis para siempre · Sin tarjeta · 100% en español
        </div>
      </div>
    </section>
  );
}
