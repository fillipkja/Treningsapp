import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '@/lib/ids';
import type { AppNotification, NotificationType } from '@/types';

interface NotificationState {
  notifications: AppNotification[];
  add: (n: { type: NotificationType; title: string; body: string; refId?: string }) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const MAX_NOTIFICATIONS = 100;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      add: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: uid('ntf'), createdAt: new Date().toISOString(), read: false },
            ...s.notifications,
          ].slice(0, MAX_NOTIFICATIONS),
        })),
      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      clearAll: () => set({ notifications: [] }),
    }),
    { name: 'notifications', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function useUnreadCount(): number {
  return useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
}
