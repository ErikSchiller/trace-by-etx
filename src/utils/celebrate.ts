import confetti from 'canvas-confetti';
import { useSettingsStore } from '../store/settingsStore';

export type Intensity = 'subtle' | 'normal' | 'huge';

const CONFIG: Record<Intensity, { particleCount: number; spread: number; origin: { y: number } }> = {
  subtle: { particleCount: 40, spread: 55, origin: { y: 0.7 } },
  normal: { particleCount: 100, spread: 70, origin: { y: 0.6 } },
  huge: { particleCount: 200, spread: 90, origin: { y: 0.5 } },
};

// Blue + white shades only — no green, no rainbow (matches TRACE palette).
const COLORS = ['#4f8fff', '#6b9fff', '#8bb3ff', '#ffffff'];

/** Fire a confetti burst, unless the user disabled visual celebrations. */
export function celebrate(intensity: Intensity = 'normal') {
  if (!useSettingsStore.getState().celebrationsEnabled) return;
  confetti({
    ...CONFIG[intensity],
    colors: COLORS,
    ticks: 200,
    disableForReducedMotion: true,
  });
}

/* ============ One-time milestone tracking ============ */

type FiredMap = Record<string, boolean>;
const KEY = 'milestones_fired';

function loadFired(): FiredMap {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function saveFired(map: FiredMap) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

/** True the first time `id` is seen; subsequent calls return false. */
export function hasFiredMilestone(id: string): boolean {
  return !!loadFired()[id];
}

/**
 * Marks a milestone as fired and returns true if it had NOT fired before.
 * Use to gate one-time celebrations: `if (markMilestone('first_trade')) celebrate('subtle')`.
 */
export function markMilestone(id: string): boolean {
  const map = loadFired();
  if (map[id]) return false;
  map[id] = true;
  saveFired(map);
  return true;
}
