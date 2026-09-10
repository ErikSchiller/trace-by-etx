import { create } from 'zustand';
import type { InsightContext } from '../utils/insightEngine';

interface InsightPanelState {
  isOpen: boolean;
  context: InsightContext | null;
  open: (context: InsightContext) => void;
  close: () => void;
}

/** Ephemeral (no persist) — charts across the app open the shared insight panel. */
export const useInsightPanel = create<InsightPanelState>((set) => ({
  isOpen: false,
  context: null,
  open: (context) => set({ isOpen: true, context }),
  close: () => set({ isOpen: false }),
}));
