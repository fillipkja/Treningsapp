import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';

interface SettingsState {
  /** Mørkt tema er standard */
  themeMode: ThemeMode;
  pushEnabled: boolean;
  /** Påminnelser om planlagte økter */
  workoutReminders: boolean;
  reminderTime: string; // "HH:mm"
  friendActivityNotifications: boolean;
  appleHealthSync: boolean;
  healthConnectSync: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggle: (
    key:
      | 'pushEnabled'
      | 'workoutReminders'
      | 'friendActivityNotifications'
      | 'appleHealthSync'
      | 'healthConnectSync',
  ) => void;
  setReminderTime: (time: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'dark',
      pushEnabled: true,
      workoutReminders: true,
      reminderTime: '17:00',
      friendActivityNotifications: true,
      appleHealthSync: false,
      healthConnectSync: false,
      setThemeMode: (themeMode) => set({ themeMode }),
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<SettingsState>),
      setReminderTime: (reminderTime) => set({ reminderTime }),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
