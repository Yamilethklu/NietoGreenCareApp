import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Muted, Screen, Title, styles as ui } from '@/src/components/ui';
import { isAllowedAdmin } from '@/src/lib/adminAuth';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

export default function AdminAccessScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const signIn = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase no está configurado', 'No se puede iniciar sesión administrativa sin la configuración de Supabase.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      if (!isAllowedAdmin(data.user?.email)) {
        await supabase.auth.signOut();
        Alert.alert('Acceso no autorizado');
        return;
      }

      router.replace('/(tabs)/calendar');
    } catch (error) {
      Alert.alert('No se pudo iniciar sesión', error instanceof Error ? error.message : 'Verifica tus credenciales e inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return <Screen><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}><Card style={s.card}><Title>Acceso administrativo</Title><Muted>Ingresa con una de las cuentas autorizadas de Nieto Green Care.</Muted><View><Muted style={ui.label}>Correo electrónico</Muted><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="correo@ejemplo.com" placeholderTextColor="#8B948E" style={ui.input} /></View><View><Muted style={ui.label}>Contraseña</Muted><TextInput value={password} onChangeText={setPassword} autoCapitalize="none" autoComplete="password" secureTextEntry placeholder="••••••••" placeholderTextColor="#8B948E" style={ui.input} /></View><Button label={submitting ? 'Validando…' : 'Ingresar'} onPress={() => void signIn()} disabled={submitting || !email.trim() || !password} /><Button label="Cancelar" onPress={() => router.back()} variant="outline" disabled={submitting} /></Card></KeyboardAvoidingView></Screen>;
}

const s = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: 18 }, card: { gap: 16 } });