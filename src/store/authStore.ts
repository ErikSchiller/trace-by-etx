import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export interface UserProfile {
  experience: string;
  markets: string[];
  challenge: string;
  goal: string;
  /** Optional: prop firms the user trades with (selected during onboarding). */
  propFirms?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  planExpiresAt?: string;
  billingCycle?: 'monthly' | 'annual';
  createdAt: string;
  onboardingComplete: boolean;
  profile?: UserProfile;
}

interface StoredUser extends User {
  passwordHash: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  register: (name: string, email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setOnboardingComplete: (profile: UserProfile) => void;
  updateUser: (updates: Partial<User>) => void;
  upgradeToPro: (cycle: 'monthly' | 'annual') => void;
  downgradeToFree: () => void;
}

const USERS_KEY = 'trace_users';

function loadUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

const hash = (s: string) => btoa(`trace:${s}`);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      register: async (name, email, password) => {
        const users = loadUsers();
        const normalized = email.trim().toLowerCase();
        if (users.find(u => u.email === normalized)) {
          throw new Error('Ya existe una cuenta con ese email');
        }
        const newUser: StoredUser = {
          id: nanoid(),
          name: name.trim(),
          email: normalized,
          plan: 'free',
          createdAt: new Date().toISOString(),
          onboardingComplete: false,
          passwordHash: hash(password),
        };
        users.push(newUser);
        saveUsers(users);
        const { passwordHash: _ph, ...publicUser } = newUser;
        set({ user: publicUser, isAuthenticated: true });
        return publicUser;
      },

      login: async (email, password) => {
        const users = loadUsers();
        const normalized = email.trim().toLowerCase();
        const found = users.find(u => u.email === normalized && u.passwordHash === hash(password));
        if (!found) {
          throw new Error('Email o contraseña incorrectos');
        }
        const { passwordHash: _ph, ...publicUser } = found;
        set({ user: publicUser, isAuthenticated: true });
        return publicUser;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      setOnboardingComplete: (profile) => {
        const cur = get().user;
        if (!cur) return;
        const updated: User = { ...cur, onboardingComplete: true, profile };
        // also persist into users store
        const users = loadUsers();
        const idx = users.findIndex(u => u.id === cur.id);
        if (idx >= 0) {
          users[idx] = { ...users[idx], onboardingComplete: true, profile };
          saveUsers(users);
        }
        set({ user: updated });
      },

      updateUser: (updates) => {
        const cur = get().user;
        if (!cur) return;
        const updated = { ...cur, ...updates };
        const users = loadUsers();
        const idx = users.findIndex(u => u.id === cur.id);
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...updates };
          saveUsers(users);
        }
        set({ user: updated });
      },

      upgradeToPro: (cycle) => {
        const cur = get().user;
        if (!cur) return;
        const ms = cycle === 'annual' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const updates: Partial<User> = {
          plan: 'pro',
          billingCycle: cycle,
          planExpiresAt: new Date(Date.now() + ms).toISOString(),
        };
        const updated = { ...cur, ...updates };
        const users = loadUsers();
        const idx = users.findIndex(u => u.id === cur.id);
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...updates };
          saveUsers(users);
        }
        set({ user: updated });
      },

      downgradeToFree: () => {
        const cur = get().user;
        if (!cur) return;
        const updates: Partial<User> = {
          plan: 'free',
          planExpiresAt: undefined,
          billingCycle: undefined,
        };
        const updated = { ...cur, ...updates };
        const users = loadUsers();
        const idx = users.findIndex(u => u.id === cur.id);
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...updates };
          saveUsers(users);
        }
        set({ user: updated });
      },
    }),
    {
      name: 'trace_auth',
    }
  )
);
