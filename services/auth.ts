import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const redirectUrl = makeRedirectUri({
  scheme: 'nietogreencare',
  path: 'auth/callback',
});

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
  const parsed = Linking.parse(callback);
  if (parsed.scheme !== 'nietogreencare') return;
  const code = parsed.queryParams?.code as string;
  if (!code || !supabase) return;
  
  const client = supabase;
  const pending = exchanges.get(code);
  if (pending) { await pending.catch(() => {}); return; }
  
  const exchange = (async () => {
    try {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } catch {
      throw new Error('No se pudo completar el acceso con Google.');
    }
  })();
  exchanges.set(code, exchange);
  await exchange;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('La conexión de la app no está configurada.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google', 
    options: { redirectTo: redirectUrl, skipBrowserRedirect: false, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) throw new Error('No se pudo abrir Google.');
  
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type === 'success' && result.url) {
    await finishGoogleSignIn(result.url);
  }
  
  const { data: current } = await supabase.auth.getSession();
  return !!current.session;
}
