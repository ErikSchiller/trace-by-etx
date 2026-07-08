import { create } from 'zustand';

interface UpgradeModalState {
  isOpen: boolean;
  message?: string;
  open: (message?: string) => void;
  close: () => void;
}

export const useUpgradeModal = create<UpgradeModalState>((set) => ({
  isOpen: false,
  message: undefined,
  open: (message) => set({ isOpen: true, message }),
  close: () => set({ isOpen: false, message: undefined }),
}));
