import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { LogoMark } from '../components/UI/LogoMark';
import { joinAiWaitlist } from '../config/tracer-ai-content';

const C = {
  bg:        '#050507',
  bgCard:    '#111118',
  border:    'rgba(255,255,255,0.07)',
  borderSel: 'rgba(255,255,255,0.35)',
  bgSel:     'rgba(255,255,255,0.04)',
  white:     '#ffffff',
  muted:     '#a0a0b0',
  dim:       '#4a4a5a',
};

const fontHead = "'Syne', sans-serif";
const fontBody = "'Inter', sans-serif";

const STATS = [
  { num: '+2.400', label: 'Traders activos' },
  { num: '+180K',  label: 'Operaciones registradas' },
  { num: '4.9★',   label: 'Valoración media' },
  { num: '100%',   label: 'En español' },
];

const EXPERIENCE = [
  { title: 'Menos de 1 año',  desc: 'Estoy empezando a entender los mercados' },
  { title: '1 a 3 años',      desc: 'Ya tengo estrategia, busco consistencia' },
  { title: '3 a 5 años',      desc: 'Soy rentable pero quiero escalar' },
  { title: 'Más de 5 años',   desc: 'Trader avanzado o prop firm' },
];

const MARKETS = [
  { title: 'Futuros',     desc: 'NQ, ES, CL...' },
  { title: 'Forex',       desc: 'EUR/USD, GBP/USD...' },
  { title: 'Acciones',    desc: 'AAPL, TSLA...' },
  { title: 'Crypto',      desc: 'BTC, ETH...' },
  { title: 'Opciones',    desc: 'Calls, puts, spreads' },
  { title: 'Índices CFD', desc: 'SPX, NDX, DAX...' },
];

const CHALLENGE = [
  { title: 'Psicología y disciplina',     desc: 'FOMO, revenge trading, salir antes de tiempo' },
  { title: 'Gestión del riesgo',          desc: 'Tamaño de posición, stop loss, drawdown' },
  { title: 'Encontrar y ejecutar setups', desc: 'Identificar entradas de calidad con consistencia' },
  { title: 'Analizar mis resultados',     desc: 'No sé qué está funcionando y qué no' },
];

const GOAL = [
  { title: 'Ser consistente mes a mes',      desc: 'Resultados estables, sin grandes rachas negativas' },
  { title: 'Pasar una evaluación Prop Firm', desc: 'FTMO, MyForexFunds, The Funded Trader...' },
  { title: 'Escalar mi cuenta',              desc: 'Tengo edge, quiero aumentar el tamaño' },
  { title: 'Vivir del trading',              desc: 'Mi objetivo final es esto como profesión' },
];

const PROP_FIRMS = [
  { title: 'TopStep',            desc: 'Futuros' },
  { title: 'Apex',               desc: 'Futuros' },
  { title: 'Take Profit Trader', desc: 'Futuros' },
  { title: 'FTMO',               desc: 'Forex / CFDs' },
  { title: 'MyFundedFutures',    desc: 'Futuros' },
  { title: 'Otra',               desc: 'No está en la lista' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const setOnboardingComplete = useAuthStore(s => s.setOnboardingComplete);
  const logout = useAuthStore(s => s.logout);
  const userEmail = useAuthStore(s => s.user?.email);
  const [step, setStep] = useState(1);
  const [fade, setFade] = useState(true);

  const [experience, setExperience] = useState<string | null>(null);
  const [markets, setMarkets] = useState<string[]>([]);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [propFirms, setPropFirms] = useState<string[]>([]);
  const [aiInterest, setAiInterest] = useState<'high' | 'medium' | 'none' | null>(null);

  useEffect(() => {
    document.body.style.background = C.bg;
    return () => { document.body.style.background = ''; };
  }, []);

  const goNext = () => {
    setFade(false);
    setTimeout(() => {
      setStep(s => s + 1);
      setFade(true);
    }, 250);
  };

  const finish = (ai?: 'high' | 'medium' | 'none' | null) => {
    const interest = ai ?? aiInterest;
    setOnboardingComplete({
      experience: experience || '',
      markets,
      challenge: challenge || '',
      goal: goal || '',
      propFirms,
      ...(interest ? { aiInterest: interest } : {}),
    });
    if ((interest === 'high' || interest === 'medium') && userEmail) joinAiWaitlist(userEmail);
    navigate('/dashboard');
  };

  const toggleMarket = (m: string) => {
    setMarkets(curr => curr.includes(m) ? curr.filter(x => x !== m) : [...curr, m]);
  };
  const togglePropFirm = (f: string) => {
    setPropFirms(curr => curr.includes(f) ? curr.filter(x => x !== f) : [...curr, f]);
  };

  const TOTAL_STEPS = 7;
  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  const showProgress = step > 1;

  return (
    <div style={{
      background: C.bg, color: C.white, fontFamily: fontBody,
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      paddingBottom: 80,
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 30,
        background: 'rgba(255,255,255,0.06)',
      }}>
        <div style={{
          height: '100%', width: `${progressPct}%`, background: C.white,
          transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
          opacity: showProgress ? 1 : 0,
        }} />
      </div>

      {/* Top header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 28px',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <LogoMark size="md" />
        </Link>
        <button
          onClick={() => { logout(); navigate('/'); }}
          style={{ fontSize: 13, color: C.muted, background: 'transparent', border: 'none', cursor: 'pointer' }}
          className="hover:text-white transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      {/* Center content */}
      <main style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 24px 40px',
      }}>
        <div style={{
          width: '100%', maxWidth: step === 3 || step === 5 ? 760 : 560,
          opacity: fade ? 1 : 0, transition: 'opacity 0.25s ease',
        }}>
          {step === 1 && (
            <Welcome onContinue={goNext} />
          )}

          {step === 2 && (
            <SingleStep
              title="¿Cuánto tiempo llevas operando?"
              options={EXPERIENCE}
              selected={experience}
              onSelect={setExperience}
              onContinue={goNext}
              ctaLabel="Continuar"
            />
          )}

          {step === 3 && (
            <MultiStep
              title="¿En qué mercados operas?"
              subtitle="Puedes seleccionar varios"
              options={MARKETS}
              selected={markets}
              onToggle={toggleMarket}
              onContinue={goNext}
              ctaLabel="Continuar"
            />
          )}

          {step === 4 && (
            <SingleStep
              title="¿Cuál es tu mayor reto como trader?"
              options={CHALLENGE}
              selected={challenge}
              onSelect={setChallenge}
              onContinue={goNext}
              ctaLabel="Continuar"
            />
          )}

          {step === 5 && (
            <MultiStep
              title="¿Operas con prop firms?"
              subtitle="Opcional · selecciona las que uses para activar el Prop Firm Hub"
              options={PROP_FIRMS}
              selected={propFirms}
              onToggle={togglePropFirm}
              onContinue={goNext}
              ctaLabel={propFirms.length === 0 ? 'Saltar' : 'Continuar'}
              optional
            />
          )}

          {step === 6 && (
            <SingleStep
              title="¿Cuál es tu objetivo principal?"
              options={GOAL}
              selected={goal}
              onSelect={setGoal}
              onContinue={goNext}
              ctaLabel="Continuar"
            />
          )}

          {step === 7 && (
            <AiInterestStep
              selected={aiInterest}
              onSelect={setAiInterest}
              onContinue={() => finish()}
              onSkip={() => finish('none')}
            />
          )}
        </div>
      </main>

      {/* Bottom social proof strip */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        borderTop: `1px solid ${C.border}`, background: 'rgba(5,5,7,0.85)',
        backdropFilter: 'blur(8px)', padding: '14px 24px', zIndex: 20,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          maxWidth: 1100, margin: '0 auto', textAlign: 'center',
        }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>{s.num}</div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

function Welcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: 'clamp(3rem, 8vw, 5.5rem)', letterSpacing: '-0.04em', lineHeight: 1 }}>
        TRACE
      </div>
      <div style={{ fontSize: 12, letterSpacing: '0.3em', color: C.dim, textTransform: 'uppercase', marginTop: 8 }}>
        by ETX
      </div>
      <h1 style={{
        fontFamily: fontHead, fontWeight: 800, fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
        letterSpacing: '-0.02em', marginTop: 48, marginBottom: 16,
      }}>
        Bienvenido a TRACE
      </h1>
      <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.6, maxWidth: 460, margin: '0 auto 36px' }}>
        La herramienta que los traders serios necesitan para mejorar de verdad.
      </p>
      <button
        onClick={onContinue}
        style={{
          background: C.white, color: C.bg, fontSize: 15, fontWeight: 500,
          padding: '14px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          minWidth: 240,
        }}
        className="hover:opacity-90 transition-opacity"
      >
        Comenzar <ArrowRight size={15} />
      </button>
    </div>
  );
}

type Option = { title: string; desc: string };

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 32, textAlign: 'center' }}>
      <h1 style={{
        fontFamily: fontHead, fontWeight: 800, fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
        letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: subtitle ? 10 : 0,
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ color: C.muted, fontSize: 14 }}>{subtitle}</p>
      )}
    </div>
  );
}

function ContinueButton({ disabled, onClick, label }: { disabled: boolean; onClick: () => void; label: string }) {
  return (
    <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          background: C.white, color: C.bg, fontSize: 14, fontWeight: 500,
          padding: '12px 28px', borderRadius: 10, border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.35 : 1,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          minWidth: 200, justifyContent: 'center',
          transition: 'opacity 0.2s',
        }}
        className={disabled ? '' : 'hover:opacity-90'}
      >
        {label} <ArrowRight size={14} />
      </button>
    </div>
  );
}

function OptionCard({
  title, desc, selected, onClick,
}: { title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: selected ? C.bgSel : C.bgCard,
        border: `1px solid ${selected ? C.borderSel : C.border}`,
        borderRadius: 12, padding: '16px 18px',
        cursor: 'pointer', transition: 'all 0.15s ease',
        display: 'block',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = C.border; }}
    >
      <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: 15, color: C.white, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
        {desc}
      </div>
    </button>
  );
}

function AiInterestStep({ selected, onSelect, onContinue, onSkip }: {
  selected: 'high' | 'medium' | 'none' | null;
  onSelect: (v: 'high' | 'medium' | 'none') => void;
  onContinue: () => void; onSkip: () => void;
}) {
  const opts = [
    { v: 'high' as const, title: '🎯 Sí, muy interesado', desc: 'Notifícame cuando salga' },
    { v: 'medium' as const, title: '🤔 Me interesa, pero sin prisa', desc: 'Cuéntame cuando esté lista' },
    { v: 'none' as const, title: '❌ No me interesa por ahora', desc: '' },
  ];
  return (
    <>
      <StepHeader title="¿Te interesa TRACE IA?" subtitle="Estamos preparando un coach virtual que analizará tu journal para darte insights personalizados. Llegará el primer trimestre." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map(o => <OptionCard key={o.v} title={o.title} desc={o.desc} selected={selected === o.v} onClick={() => onSelect(o.v)} />)}
      </div>
      <ContinueButton disabled={!selected} onClick={onContinue} label="Ir a mi dashboard" />
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button onClick={onSkip} style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: fontBody }}>Prefiero decidirlo después</button>
      </div>
    </>
  );
}

function SingleStep({
  title, options, selected, onSelect, onContinue, ctaLabel,
}: {
  title: string; options: Option[]; selected: string | null;
  onSelect: (v: string) => void; onContinue: () => void; ctaLabel: string;
}) {
  return (
    <>
      <StepHeader title={title} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(o => (
          <OptionCard
            key={o.title}
            title={o.title}
            desc={o.desc}
            selected={selected === o.title}
            onClick={() => onSelect(o.title)}
          />
        ))}
      </div>
      <ContinueButton disabled={!selected} onClick={onContinue} label={ctaLabel} />
    </>
  );
}

function MultiStep({
  title, subtitle, options, selected, onToggle, onContinue, ctaLabel, optional,
}: {
  title: string; subtitle: string; options: Option[]; selected: string[];
  onToggle: (v: string) => void; onContinue: () => void; ctaLabel: string; optional?: boolean;
}) {
  return (
    <>
      <StepHeader title={title} subtitle={subtitle} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map(o => (
          <OptionCard
            key={o.title}
            title={o.title}
            desc={o.desc}
            selected={selected.includes(o.title)}
            onClick={() => onToggle(o.title)}
          />
        ))}
      </div>
      <ContinueButton disabled={!optional && selected.length === 0} onClick={onContinue} label={ctaLabel} />
    </>
  );
}
