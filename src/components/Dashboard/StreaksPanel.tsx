import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, Shield, Flame, type LucideIcon } from 'lucide-react';
import { useDailyFlowStore, computeStreak, dayJournalled, dayDisciplined, type StreakInfo } from '../../store/dailyFlowStore';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";

/** Both streaks, recomputed only when the stored days change. */
export function useStreaks() {
  const days = useDailyFlowStore(s => s.days);
  return useMemo(() => ({
    journalling: computeStreak(days, dayJournalled),
    discipline: computeStreak(days, dayDisciplined),
  }), [days]);
}

export function StreaksPanel() {
  const navigate = useNavigate();
  const { journalling, discipline } = useStreaks();
  return (
    <div style={{ background: '#111113', border: '1px solid #1e2029', borderRadius: 12, padding: '20px 24px', minHeight: 180, fontFamily: fontBody }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#f7f8fa' }}>Rachas</div>
        <span onClick={() => navigate('/progress')} style={{ fontSize: '0.74rem', color: '#4f8fff', cursor: 'pointer' }}>Ver detalles →</span>
      </div>
      <div className="dash-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StreakCard label="Journalling" Icon={PenLine} info={journalling} />
        <StreakCard label="Discipline" Icon={Shield} info={discipline} />
      </div>
    </div>
  );
}

function StreakCard({ label, Icon, info }: { label: string; Icon: LucideIcon; info: StreakInfo }) {
  const { current, best } = info;
  const hot = current > 7;
  return (
    <div style={{
      padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8,
      border: `1px solid ${hot ? 'rgba(79,143,255,0.25)' : 'transparent'}`,
      boxShadow: hot ? '0 0 24px rgba(79,143,255,0.14)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={15} color="#6b7382" />
        <span style={{ fontSize: '0.78rem', color: '#6b7382' }}>{label}</span>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.6rem', lineHeight: 1, color: current > 0 ? '#f7f8fa' : '#4a4a60' }}>{current}</span>
          {current > 3 && <Flame size={22} color="#4f8fff" fill="rgba(79,143,255,0.25)" />}
        </div>
        <div style={{ fontSize: '0.72rem', color: current > 0 ? '#6b7382' : '#4f8fff', marginTop: 4 }}>
          {current > 0 ? (current === 1 ? 'día seguido' : 'días seguidos') : 'Empieza hoy'}
        </div>
      </div>
      <div style={{ fontSize: '0.7rem', minHeight: 14 }}>
        {best > current && best > 0 && <span style={{ color: '#6b7382' }}>Récord: {best} {best === 1 ? 'día' : 'días'}</span>}
        {current === best && current > 0 && <span style={{ color: '#4f8fff' }}>¡Nuevo récord!</span>}
      </div>
    </div>
  );
}
