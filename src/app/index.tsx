import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { AppText, Screen } from '@/components/ui';
import { useT } from '@/i18n';
import { useAuthStore } from '@/lib/store/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const t = useT();

  if (!isSupabaseConfigured) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
          <AppText variant="heading">{t('common.missingConfigTitle')}</AppText>
          <AppText color="secondary">{t('common.missingConfigBody')}</AppText>
        </View>
      </Screen>
    );
  }

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/(auth)/login" />;
  if (status === 'needsOnboarding') return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
