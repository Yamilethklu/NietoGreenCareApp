import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const authRedirect = 'nietogreencare://';
const storage = Platform.OS === 'web' ? undefined : {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};
export const supabase = url && key ? createClient(url, key, {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
}) : null;

WebBrowser.maybeCompleteAuthSession();
const exchanges = new Map<string, Promise<void>>();
export async function finishGoogleSignIn(callback: string) {
  const parsed = new URL(callback);
  if (parsed.protocol !== 'nietogreencare:' || parsed.hostname) return;
  if (parsed.searchParams.has('error')) throw new Error('Google no autorizó el acceso. Intenta de nuevo.');
  const code = parsed.searchParams.get('code');
  if (!code || !supabase) return;
  if (!exchanges.has(code)) {
    exchanges.set(code, (async () => {
      const { error } = await supabase!.auth.exchangeCodeForSession(code);
      if (error) throw new Error('No se pudo completar el acceso con Google. Vuelve a intentarlo.');
    })());
  }
  await exchanges.get(code);
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('La conexión de la app no está configurada.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: authRedirect, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) throw new Error('No se pudo abrir Google. Intenta de nuevo.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirect);
  if (result.type !== 'success') return false;
  await finishGoogleSignIn(result.url);
  const { data: current } = await supabase.auth.getSession();
  if (!current.session) throw new Error('Google no devolvió una sesión válida. Intenta de nuevo.');
  return true;
}
