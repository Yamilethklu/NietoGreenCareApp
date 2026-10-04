import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const authRedirect = 'nietogreencare://admin';
const storage = Platform.OS === 'web' ? undefined : {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};
export const supabase = url && key ? createClient(url, key, {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
}) : null;

export type AccessRole = 'admin' | 'worker';
export async function rememberAccessRole(role: AccessRole) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem('ngc-access-role', role);
  } else await SecureStore.setItemAsync('ngc-access-role', role);
}
export async function restoreAccessRole(): Promise<AccessRole | null> {
  const value = Platform.OS === 'web'
    ? (typeof localStorage !== 'undefined' ? localStorage.getItem('ngc-access-role') : null)
    : await SecureStore.getItemAsync('ngc-access-role');
  return value === 'admin' || value === 'worker' ? value : null;
}

WebBrowser.maybeCompleteAuthSession();
const exchanges = new Map<string, Promise<void>>();
export async function finishGoogleSignIn(callback: string) {
  const parsed = new URL(callback);
  if (parsed.protocol !== 'nietogreencare:' || (parsed.hostname && parsed.hostname !== 'admin') || (parsed.pathname && parsed.pathname !== '/')) return;
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  if (parsed.searchParams.has('error') || fragment.has('error')) throw new Error('Google no autorizó el acceso o el enlace ya fue utilizado. Cierra el navegador y pulsa Continuar con Google para iniciar un acceso nuevo.');
  const code = parsed.searchParams.get('code');
  if (!code) {
    if (parsed.search || parsed.hash) throw new Error('El regreso de Google no contiene un código de acceso válido. Inicia el acceso nuevamente desde la app.');
    return;
  }
  if (!supabase) throw new Error('La conexión de la app no está configurada.');
  if (!exchanges.has(code)) {
    exchanges.set(code, (async () => {
      const { error } = await supabase!.auth.exchangeCodeForSession(code);
      // PKCE codes are single-use: a replayed callback is harmless when a session already exists.
      if (error && !(await supabase!.auth.getSession()).data.session) throw new Error('No se pudo completar el acceso con Google. Vuelve a intentarlo.');
    })());
  }
  await exchanges.get(code);
}

let googleSignInPending: Promise<boolean> | null = null;
export function signInWithGoogle(role: AccessRole): Promise<boolean> {
  if (!googleSignInPending) {
    googleSignInPending = performGoogleSignIn(role).finally(() => { googleSignInPending = null; });
  }
  return googleSignInPending;
}

async function performGoogleSignIn(role: AccessRole) {
  if (!supabase) throw new Error('La conexión de la app no está configurada.');
  await rememberAccessRole(role);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: authRedirect, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) throw new Error('No se pudo abrir Google. Intenta de nuevo.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirect);
  if (result.type === 'success') await finishGoogleSignIn(result.url);
  // Android can dismiss the browser after the Linking listener received the callback.
  // Wait for that exchange before interpreting dismissal as cancellation.
  await Promise.all([...exchanges.values()].map(exchange => exchange.catch(() => {})));
  const { data: current } = await supabase.auth.getSession();
  if (!current.session && result.type !== 'success') return false;
  if (!current.session) throw new Error('Google no devolvió una sesión válida. Intenta de nuevo.');
  return true;
}
