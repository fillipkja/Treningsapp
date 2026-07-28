import {
  DarkTheme as NavDark,
  DefaultTheme as NavLight,
  ThemeProvider as NavThemeProvider,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/lib/store/settings';
import { darkTheme, lightTheme, ThemeContext } from '@/theme';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const mode = useSettingsStore((s) => s.themeMode);
  const system = useColorScheme();
  const isDark = mode === 'system' ? system !== 'light' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const navTheme = {
    ...(isDark ? NavDark : NavLight),
    colors: {
      ...(isDark ? NavDark : NavLight).colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.chrome,
      text: theme.colors.textPrimary,
      border: 'transparent',
      notification: theme.colors.accent,
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      <NavThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {children}
      </NavThemeProvider>
    </ThemeContext.Provider>
  );
}
