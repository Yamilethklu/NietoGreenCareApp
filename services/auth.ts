import 'react-native-url-polyfill/auto';
import { createClient, type Session } from '@supabase/supabase-js';
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

WebBrowser.maybeCompleteAuthSession();

const exchanges = new Map<string, Promise<void>>();

function isNativeAuthCallback(parsed: URL) {
  if (parsed.protocol !== 'nietogreencare:') return false;
  if (parsed.hostname === 'admin' && (!parsed.pathname || parsed.pathname === '/')) return true;
  if (!parsed.hostname && (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '/admin')) return true;
  if (parsed.hostname === 'auth' && parsed.pathname === '/callback') return true;
  if (!parsed.hostname && parsed.pathname === '/auth/callback') return true;
  return false;
}

export async function finishGoogleSignIn(callback: string) {
  const parsed = new URL(callback);
  if (!isNativeAuthCallback(parsed)) return;
  // Safe diagnostics only: never log the callback URL, OAuth code, tokens, or email.
  console.info('[OAuth] Native callback received.');
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  if (parsed.searchParams.has('error') || fragment.has('error')) {
    console.warn('[OAuth] Provider returned an authentication error.');
    throw new Error('Google no autorizó el acceso o el enlace ya fue utilizado. Cierra el navegador y pulsa Continuar con Google para iniciar un acceso nuevo.');
  }
  const code = parsed.searchParams.get('code') || fragment.get('code');
  if (!code) {
    if (parsed.search || parsed.hash) throw new Error('El regreso de Google no contiene un código de acceso válido. Inicia el acceso nuevamente desde la app.');
    return;
  }
  if (!supabase) throw new Error('La conexión de la app no está configurada.');
  if (!exchanges.has(code)) {
    exchanges.set(code, (async () => {
      const { error } = await supabase!.auth.exchangeCodeForSession(code);
      if (error && !(await supabase!.auth.getSession()).data.session) {
        console.warn('[OAuth] Code exchange failed.');
        throw new Error('No se pudo completar el acceso con Google. Vuelve a intentarlo.');
      }
      console.info('[OAuth] Code exchange completed.');
    })());
  }
  await exchanges.get(code);
}

async function waitForSession(timeoutMs: number): Promise<Session | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
  } catch {
    // The auth-state listener below can still observe a successful exchange.
  }

  return new Promise<Session | null>(resolve => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let subscription: { unsubscribe: () => void } | null = null;
    const finish = (session: Session | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      subscription?.unsubscribe();
      resolve(session);
    };
    const listener = supabase!.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });
    subscription = listener.data.subscription;
    if (settled) subscription.unsubscribe();
    timer = setTimeout(() => finish(null), timeoutMs);
    void supabase!.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session);
    }).catch(() => {});
  });
}

let googleSignInPending: Promise<boolean> | null = null;

export function signInWithGoogle(): Promise<boolean> {
  if (!googleSignInPending) {
    googleSignInPending = performGoogleSignIn().finally(() => { googleSignInPending = null; });
  }
  return googleSignInPending;
}

async function performGoogleSignIn() {
  if (!supabase) throw new Error('La conexión de la app no está configurada.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirect, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) throw new Error('No se pudo abrir Google. Intenta de nuevo.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirect);
  console.info('[OAuth] Browser flow finished:', result.type);
  if (result.type === 'success') {
    await finishGoogleSignIn(result.url);
  } else if (result.type === 'dismiss' || result.type === 'locked') {
    // Android may deliver the deep link through Linking after the browser promise
    // resolves. Wait for Supabase's auth event instead of reporting a false cancel.
    const session = await waitForSession(10000);
    if (!session) {
      console.warn('[OAuth] No session observed after browser dismissal.');
      throw new Error('Google regresó a la app, pero no se pudo confirmar la sesión. Intenta nuevamente; si persiste, comparte el diagnóstico OAuth sin códigos ni tokens.');
    }
  } else {
    return false;
  }

  await Promise.all([...exchanges.values()].map(exchange => exchange.catch(() => {})));
  const { data: current } = await supabase.auth.getSession();
  if (!current.session) {
    console.warn('[OAuth] Browser returned but no Supabase session was available.');
    throw new Error('Google no devolvió una sesión válida. Intenta de nuevo.');
  }
  console.info('[OAuth] Session confirmed.');
  return true;
}

export type PanelRole = 'admin' | 'worker';
const ROLE_KEY = 'ngc_panel_role';
const webStorage = () => (typeof localStorage === 'undefined' ? null : localStorage);

export async function saveRole(role: PanelRole) {
  try {
    if (Platform.OS === 'web') webStorage()?.setItem(ROLE_KEY, role);
    else await SecureStore.setItemAsync(ROLE_KEY, role);
  } catch { /* el rol se vuelve a elegir si no se puede persistir */ }
}

export async function loadRole(): Promise<PanelRole | null> {
  try {
    const value = Platform.OS === 'web' ? webStorage()?.getItem(ROLE_KEY) : await SecureStore.getItemAsync(ROLE_KEY);
    return value === 'admin' || value === 'worker' ? value : null;
  } catch { return null; }
}

export async function clearRole() {
  try {
    if (Platform.OS === 'web') webStorage()?.removeItem(ROLE_KEY);
    else await SecureStore.deleteItemAsync(ROLE_KEY);
  } catch { /* sin rol persistido */ }
}
