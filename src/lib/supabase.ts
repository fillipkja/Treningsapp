import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False i utviklingsmiljø uten .env — appen viser da en konfigurasjonsmelding */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Sesjonen lagres i AsyncStorage (localStorage på web). Vil man ha
// Keychain/Keystore på native må expo-secure-store legges til som avhengighet
// og sesjonen chunkes (SecureStore har 2 kB grense per nøkkel).
export const supabase = createClient(
  url ?? 'https://ikke-konfigurert.supabase.co',
  anonKey ?? 'ikke-konfigurert',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // PKCE i stedet for implicit: koden byttes inn mot token med verifier,
      // så et token aldri havner i en URL/logg
      flowType: 'pkce',
      debug: false,
    },
  },
);
