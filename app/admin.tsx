import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, Text } from 'react-native';
import { finishGoogleSignIn, supabase } from '../services/auth';

// Google returns here, in the native app, before the panel checks the user's role.
export default function AuthReturn() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const router = useRouter();
  const [error, setError] = useState('');
  const code = typeof params.code === 'string' ? params.code : '';
  const authError = typeof params.error === 'string' ? params.error : '';
  useEffect(() => {
    let active = true;
    void (async () => {
      if (authError) throw new Error('El acceso con Google no se completó. Inicia un acceso nuevo.');
      if (code) await finishGoogleSignIn('nietogreencare://admin?code=' + encodeURIComponent(code));
      const result = await supabase?.auth.getSession();
      if (!result?.data.session) throw new Error('No se recibió una sesión. Vuelve al acceso e intenta nuevamente.');
      if (active) router.replace('/');
    })().catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo completar el acceso.'); });
    return () => { active = false; };
  }, [code, authError, router]);
  return <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#dcfce7' }}>
    {error ? <><Text accessibilityRole="alert">{error}</Text><Pressable onPress={() => router.replace('/')} style={{ padding: 16 }}><Text>Volver al acceso</Text></Pressable></>
      : <><ActivityIndicator size="large" color="#15803d" /><Text style={{ textAlign: 'center', marginTop: 16 }}>Completando acceso al panel…</Text></>}
  </SafeAreaView>;
}
