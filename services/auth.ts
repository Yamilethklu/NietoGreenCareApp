import 'react-native-url-polyfill/auto';
import { createClient, type Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const authRedirect = 'nietogreencare://admin';

// SecureStore limita cada valor (~2 KB en iOS/Android antiguos) y la sesión de Google lo supera,
// lo que hacía perder la sesión y volver al login. Se guarda en fragmentos de 1800 caracteres.
const CHUNK = 1800;
const chunkCount = (name: string) => `${name}.n`;
async function secureGet(name: string): Promise<string | null> {
  const count = await SecureStore.getItemAsync(chunkCount(name));
  if (!count) return SecureStore.getItemAsync(name);
  const parts: string[] = [];
  for (let i = 0; i < Number(count); i += 1) {
    const part = await SecureStore.getItemAsync(`${name}.${i}`);
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}
async function secureRemove(name: string) {
  const count = Number(await SecureStore.getItemAsync(chunkCount(name)) ?? 0);
  for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(`${name}.${i}`);
  await SecureStore.deleteItemAsync(chunkCount(name));
  await SecureStore.deleteItemAsync(name);
}
async function secureSet(name: string, value: string) {
  await secureRemove(name);
  if (value.length <= CHUNK) { await SecureStore.setItemAsync(name, value); return; }
  const total = Math.ceil(value.length / CHUNK);
  for (let i = 0; i < total; i += 1) await SecureStore.setItemAsync(`${name}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
  await SecureStore.setItemAsync(chunkCount(name), String(total));
}

const storage = Platform.OS === 'web' ? undefined : {
  getItem: secureGet,
  setItem: secureSet,
  removeItem: secureRemove,
};

export const supabase = url && key ? createClient(url, key, {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
}) : null;

WebBrowser.maybeCompleteAuthSession();

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

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
      const { error } = await withTimeout(
        supabase!.auth.exchangeCodeForSession(code),
        20000,
        'Supabase tardó demasiado en confirmar el acceso con Google. Revisa la conexión e inténtalo de nuevo.',
      );
      if (error && !(await supabase!.auth.getSession()).data.session) {
        console.warn('[OAuth] Code exchange failed.');
        throw new Error('No se pudo completar el acceso con Google. Vuelve a intentarlo.');
      }
      console.info('[OAuth] Code exchange completed.');
    })());
  }
  try { await exchanges.get(code); }
  catch (error) { exchanges.delete(code); throw error; }
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
    if (!settled) timer = setTimeout(() => finish(null), timeoutMs);
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
