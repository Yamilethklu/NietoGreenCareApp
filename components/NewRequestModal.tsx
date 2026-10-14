import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { isDate } from '../src/panel';
import { texasDate } from '../services/daily-agenda';
import { DateField } from './DateField';

export type NewRequest = { name: string; date: string; address: string; services: string; phone: string; email: string; note: string; price: number };

const input = { borderWidth: 1, borderColor: '#86efac', backgroundColor: '#fff', color: '#111827', borderRadius: 8, padding: 12, marginTop: 4, marginBottom: 10 } as const;
const label = { fontWeight: '700', color: '#14532d' } as const;

/** Registro manual de una solicitud (cliente que llama o escribe directamente al dueño). */
export function NewRequestModal({ visible, onClose, onSave, initialValue }: { visible: boolean; onClose: () => void; onSave: (value: NewRequest) => Promise<void>; initialValue?: Partial<NewRequest> }) {
  const [name, setName] = useState(''); const [date, setDate] = useState(texasDate()); const [address, setAddress] = useState('');
  const [services, setServices] = useState('Corte de yarda'); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [note, setNote] = useState(''); const [price, setPrice] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) { setName(initialValue?.name ?? ''); setDate(initialValue?.date ?? texasDate()); setAddress(initialValue?.address ?? ''); setServices(initialValue?.services || 'Corte de yarda'); setPhone(initialValue?.phone ?? ''); setEmail(initialValue?.email ?? ''); setNote(initialValue?.note ?? ''); setPrice(initialValue?.price != null ? String(initialValue.price) : ''); setError(''); } }, [visible]);

  async function save() {
    if (saving) return;
    const amount = Number(price.replace(',', '.'));
    if (name.trim().length < 2) return setError('Escribe el nombre del cliente.');
    if (!isDate(date)) return setError('Escribe la fecha como AAAA-MM-DD.');
    if (address.trim().length < 4) return setError('Escribe la dirección.');
    if (services.trim().length < 2) return setError('Escribe el servicio.');
    if (phone.replace(/\D/g, '').length < 10) return setError('Escribe un teléfono de 10 dígitos.');
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('El correo no es válido.');
    if (!Number.isFinite(amount) || amount < 0) return setError('Escribe un precio válido.');
    setSaving(true); setError('');
    try { await onSave({ name: name.trim(), date, address: address.trim(), services: services.trim(), phone: phone.trim(), email: email.trim(), note: note.trim(), price: amount }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Nueva Solicitud</Text>
          <Pressable onPress={onClose}><Text style={{ color: '#475569', fontWeight: '800' }}>Cerrar</Text></Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
          <Text style={label}>Nombre del cliente</Text><TextInput style={input} value={name} onChangeText={setName} />
          <Text style={label}>Fecha del servicio (AAAA-MM-DD)</Text><DateField value={date} onChange={setDate} inputStyle={input} />
          <Text style={label}>Dirección</Text><TextInput style={input} value={address} onChangeText={setAddress} />
          <Text style={label}>Servicios</Text><TextInput style={input} value={services} onChangeText={setServices} />
          <Text style={label}>Teléfono</Text><TextInput style={input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={label}>Correo electrónico (opcional)</Text><TextInput style={input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={label}>Precio</Text><TextInput style={input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Text style={label}>Nota privada del dueño</Text><TextInput style={[input, { minHeight: 80, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} multiline scrollEnabled={false} />
          <Text style={{ color: '#64748b', marginBottom: 10 }}>Si el nombre ya existe, la solicitud se agrega a su historial; si no, se crea su ficha automáticamente.</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</Text> : null}
          <Pressable disabled={saving} onPress={() => void save()} style={{ backgroundColor: '#15803d', padding: 14, borderRadius: 8, opacity: saving ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>{saving ? 'Guardando...' : 'Guardar solicitud'}</Text>
          </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

