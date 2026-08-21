import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useAuthStore } from './authStore';

export interface DashWidget {
  id: string;
  type: string;                       // key into the widget registry
  w: number;                          // column span (1..4)
  config?: Record<string, unknown>;   // widget-specific settings
}

export interface CustomDashboard {
  id: string;
  userId: string;
  name: string;
  widgets: DashWidget[];
  createdAt: string;
  updatedAt: string;
}

interface ReportsStore {
  dashboards: CustomDashboard[];
  activeId: string | null;
  createDashboard: (name: string, widgets?: Omit<DashWidget, 'id'>[]) => CustomDashboard;
  deleteDashboard: (id: string) => void;
  renameDashboard: (id: string, name: string) => void;
  setWidgets: (id: string, widgets: DashWidget[]) => void;
  addWidget: (id: string, type: string, w: number, config?: Record<string, unknown>) => void;
  removeWidget: (id: string, widgetId: string) => void;
  updateWidgetConfig: (id: string, widgetId: string, config: Record<string, unknown>) => void;
  setActive: (id: string | null) => void;
}

export const useReportsStore = create<ReportsStore>()(
  persist(
    (set) => ({
      dashboards: [],
      activeId: null,

      createDashboard: (name, widgets = []) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const now = new Date().toISOString();
        const dash: CustomDashboard = {
          id: nanoid(), userId, name,
          widgets: widgets.map(w => ({ ...w, id: nanoid() })),
          createdAt: now, updatedAt: now,
        };
        set(s => ({ dashboards: [...s.dashboards, dash], activeId: dash.id }));
        return dash;
      },

      deleteDashboard: (id) => set(s => {
        const remaining = s.dashboards.filter(d => d.id !== id);
        return { dashboards: remaining, activeId: s.activeId === id ? (remaining[0]?.id ?? null) : s.activeId };
      }),

      renameDashboard: (id, name) => set(s => ({ dashboards: s.dashboards.map(d => d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d) })),

      setWidgets: (id, widgets) => set(s => ({ dashboards: s.dashboards.map(d => d.id === id ? { ...d, widgets, updatedAt: new Date().toISOString() } : d) })),

      addWidget: (id, type, w, config) => set(s => ({
        dashboards: s.dashboards.map(d => d.id === id ? { ...d, widgets: [...d.widgets, { id: nanoid(), type, w, config }], updatedAt: new Date().toISOString() } : d),
      })),

      removeWidget: (id, widgetId) => set(s => ({
        dashboards: s.dashboards.map(d => d.id === id ? { ...d, widgets: d.widgets.filter(w => w.id !== widgetId), updatedAt: new Date().toISOString() } : d),
      })),

      updateWidgetConfig: (id, widgetId, config) => set(s => ({
        dashboards: s.dashboards.map(d => d.id === id ? { ...d, widgets: d.widgets.map(w => w.id === widgetId ? { ...w, config } : w), updatedAt: new Date().toISOString() } : d),
      })),

      setActive: (id) => set({ activeId: id }),
    }),
    { name: 'trace_dashboards' }
  )
);

export function useUserDashboards() {
  const userId = useAuthStore(s => s.user?.id);
  const dashboards = useReportsStore(s => s.dashboards);
  if (!userId) return [];
  return dashboards.filter(d => d.userId === userId);
}
