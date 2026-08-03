/**
 * Pre-written copy for the future TRACE IA launch. Not shown in the UI yet —
 * kept here so it's ready to polish and use when the feature ships.
 */
export const AI_LAUNCH_CONTENT = {
  landingHeadline: 'Tu diario ahora tiene un coach.',
  socialTeaser:
    'Después de meses de trabajo, TRACE IA está aquí. Un coach que ha leído cada uno de tus trades. Disponible ya para todos los planes Pro. 🧠',
  emailSubject: 'TRACE IA ya está disponible',
  discordAnnouncement:
    '🎉 TRACE IA está oficialmente en la app. Los suscriptores Pro ya la tienen activa...',
} as const;

const WAITLIST_KEY = 'trace_ai_waitlist';

/** Save an email to the local TRACE IA waitlist (will hit Supabase later). */
export function joinAiWaitlist(email: string) {
  const clean = email.trim().toLowerCase();
  if (!clean) return;
  try {
    const cur = JSON.parse(localStorage.getItem(WAITLIST_KEY) || '[]');
    const list: string[] = Array.isArray(cur) ? cur : [];
    if (!list.includes(clean)) list.push(clean);
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
  } catch {
    localStorage.setItem(WAITLIST_KEY, JSON.stringify([clean]));
  }
}

export function hasJoinedAiWaitlist(): boolean {
  try {
    const list = JSON.parse(localStorage.getItem(WAITLIST_KEY) || '[]');
    return Array.isArray(list) && list.length > 0;
  } catch {
    return false;
  }
}
