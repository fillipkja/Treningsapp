import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { AppText, Screen } from '@/components/ui';
import { useAuthStore } from '@/lib/store/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (!isSupabaseConfigured) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
          <AppText variant="heading">Mangler konfigurasjon</AppText>
          <AppText color="secondary">
            Sett EXPO_PUBLIC_SUPABASE_URL og EXPO_PUBLIC_SUPABASE_ANON_KEY i .env og bygg på nytt.
          </AppText>
        </View>
      </Screen>
    );
  }

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/(auth)/login" />;
  if (status === 'needsOnboarding') return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
