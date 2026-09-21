import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Muted, styles as ui, Title } from '@/src/components/ui';
import { createQuote } from '@/src/lib/services';
import { colors } from '@/src/lib/theme';

const services = ['Tree & Bush Trimming', 'Sod Installation', 'Flower Beds', 'Fertilizer', 'Gravel & Rock Installation', 'Metal Edging', 'Mulch', 'Yard Clean Up', 'Top Soil', 'Weekly & Biweekly Lawn Service'];

export function QuoteRequestForm({ embedded = false }: { embedded?: boolean }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [yards, setYards] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !selected.length) {
      Alert.alert('Información incompleta', 'Agrega cliente, teléfono, dirección y al menos un servicio.');
      return;
    }

    setSending(true);
    try {
      await createQuote({ client_name: name.trim(), name: name.trim(), phone: phone.trim(), address: address.trim(), yards: yards ? Number(yards) : null, services: selected, status: 'pending' });
      Alert.alert('Cotización enviada', 'Gracias. Recibimos tu solicitud y nos comunicaremos contigo pronto.');
      setName('');
      setPhone('');
      setAddress('');
      setYards('');
      setSelected([]);
    } catch (error) {
      Alert.alert('No se pudo enviar', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSending(false);
    }
  };

  return <View style={s.container}>
    {!embedded && <><Text style={s.kicker}>COTIZADOR MÓVIL</Text><Title>Nueva solicitud</Title></>}
    {embedded && <View style={s.intro}><Text style={s.kicker}>SOLICITA TU COTIZACIÓN</Text><Title>Cuéntanos sobre tu proyecto</Title><Muted>Completa el formulario y el equipo de Nieto Green Care se comunicará contigo.</Muted></View>}
    <Card style={s.card}><Text style={ui.label}>CLIENTE</Text><TextInput value={name} onChangeText={setName} style={ui.input} placeholder="Nombre completo" placeholderTextColor={colors.muted} autoComplete="name" /><Text style={[ui.label, s.top]}>TELÉFONO</Text><TextInput value={phone} onChangeText={setPhone} style={ui.input} keyboardType="phone-pad" placeholder="(000) 000-0000" placeholderTextColor={colors.muted} autoComplete="tel" /><Text style={[ui.label, s.top]}>DIRECCIÓN</Text><TextInput value={address} onChangeText={setAddress} style={ui.input} placeholder="Dirección del trabajo" placeholderTextColor={colors.muted} autoComplete="street-address" /><Text style={[ui.label, s.top]}>YARDAS (OPCIONAL)</Text><TextInput value={yards} onChangeText={setYards} style={ui.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} /></Card>
    <Card style={s.card}><Text style={ui.section}>SERVICIOS OFICIALES</Text><View style={s.serviceList}>{services.map((service) => { const active = selected.includes(service); return <Button key={service} label={`${active ? '✓ ' : ''}${service}`} variant={active ? 'primary' : 'outline'} onPress={() => setSelected(active ? selected.filter((item) => item !== service) : [...selected, service])} />; })}</View><Muted>Selecciona todos los servicios que necesitas.</Muted></Card>
    <Button label={sending ? 'Enviando…' : 'Enviar solicitud de cotización'} disabled={sending} onPress={() => void submit()} />
  </View>;
}

const s = StyleSheet.create({ container: { gap: 12 }, intro: { gap: 6 }, kicker: { color: colors.gold, fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }, card: { gap: 0 }, top: { marginTop: 12 }, serviceList: { gap: 8, marginBottom: 12 } });