import { create } from 'zustand';
import {
  fetchNotifications,
  markAllRead as apiMarkAllRead,
  markRead as apiMarkRead,
} from '@/lib/api/notifications';
import { useAuthStore } from './auth';
import type { AppNotification } from '@/types';

// Varsler opprettes av triggere på serveren (se supabase/migrations/0001_init.sql)
// — klienten kan bare hente og markere som lest.

interface NotificationState {
  notifications: AppNotification[];
  loaded: boolean;
  loading: boolean;

  /** Henter mine varsler fra serveren */
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const notifications = await fetchNotifications();
      set({ notifications, loaded: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  markRead: async (id) => {
    const before = get().notifications;
    // Optimistisk: trygt å angre ved feil
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    try {
      await apiMarkRead(id);
    } catch (error) {
      set({ notifications: before });
      throw error;
    }
  },

  markAllRead: async () => {
    const before = get().notifications;
    // Optimistisk: trygt å angre ved feil
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    try {
      await apiMarkAllRead(useAuthStore.getState().user!.id);
    } catch (error) {
      set({ notifications: before });
      throw error;
    }
  },
}));

export function useUnreadCount(): number {
  return useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
}
