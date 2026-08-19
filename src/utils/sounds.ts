import { useSettingsStore } from '../store/settingsStore';

export type SoundType = 'positive' | 'alert' | 'success';

const SRC: Record<SoundType, string> = {
  positive: '/sounds/positive.mp3',
  alert: '/sounds/alert.mp3',
  success: '/sounds/success.mp3',
};

// Lazily created so we don't touch Audio during SSR/tests.
const cache: Partial<Record<SoundType, HTMLAudioElement>> = {};
function get(type: SoundType): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!cache[type]) {
    const a = new Audio(SRC[type]);
    a.preload = 'auto';
    cache[type] = a;
  }
  return cache[type]!;
}

/** Play a short UI sound if the user enabled sounds. Never full volume; fails silently. */
export function playSound(type: SoundType) {
  if (!useSettingsStore.getState().soundsEnabled) return;
  const sound = get(type);
  if (!sound) return;
  sound.volume = 0.4;
  sound.currentTime = 0;
  sound.play().catch(() => { /* autoplay policy — ignore */ });
}

/** Play a sound ignoring the enabled setting — for the Settings preview buttons. */
export function previewSound(type: SoundType) {
  const sound = get(type);
  if (!sound) return;
  sound.volume = 0.4;
  sound.currentTime = 0;
  sound.play().catch(() => { /* ignore */ });
}
