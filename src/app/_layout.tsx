import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppThemeProvider } from '@/theme/provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
