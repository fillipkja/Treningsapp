import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/store/auth';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!isOnboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
