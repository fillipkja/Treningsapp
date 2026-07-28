import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { AppThemeProvider } from '@/theme/provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  return (
    <AppThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout/active"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="workout/[id]" />
        <Stack.Screen name="exercises/index" />
        <Stack.Screen name="exercises/[id]" />
        <Stack.Screen name="exercises/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="programs/[id]" />
        <Stack.Screen name="programs/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="templates/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="friends/index" />
        <Stack.Screen name="friends/add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="friends/[id]" />
        <Stack.Screen name="challenges/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="challenges/[id]" />
        <Stack.Screen name="badges" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/edit-profile" options={{ presentation: 'modal' }} />
      </Stack>
    </AppThemeProvider>
  );
}
