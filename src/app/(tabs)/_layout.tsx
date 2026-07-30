import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/i18n';
import { useAuthStore } from '@/lib/store/auth';
import { useBootstrapData } from '@/lib/store/bootstrap';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const theme = useTheme();
  const t = useT();
  const status = useAuthStore((s) => s.status);
  const insets = useSafeAreaInsets();
  useBootstrapData();

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/(auth)/login" />;
  if (status === 'needsOnboarding') return <Redirect href="/(auth)/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.chrome,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          // Web: standardhøyden 49 gir null slingringsmonn for etikettene, og
          // nettleserens linjebokser er høyere enn native — underlengdene («g»,
          // «j») kappes. Eksplisitt høyde hopper over getTabBarHeight sin
          // inset-håndtering, så insets.bottom må legges til her selv.
          ...(Platform.OS === 'web' ? { height: 56 + insets.bottom } : null),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trening"
        options={{
          title: t('training.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistikk"
        options={{
          title: t('stats.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="konkurranser"
        options={{
          title: t('compete.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
