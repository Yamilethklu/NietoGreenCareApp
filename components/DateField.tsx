import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DayCalendar } from './DayCalendar';
import { isDate } from '../src/panel';
import { texasDate } from '../services/daily-agenda';

/** Campo de fecha (AAAA-MM-DD) con botón al lado que abre un mini calendario. Se puede seguir escribiendo a mano. */
export function DateField({ value, onChange, inputStyle, placeholder = 'AAAA-MM-DD', maxDate }: {
  value: string; onChange: (date: string) => void; inputStyle?: StyleProp<TextStyle>; placeholder?: string; maxDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const flat = StyleSheet.flatten(inputStyle) ?? {};
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>
      <TextInput style={[inputStyle, { flex: 1 }]} value={value} onChangeText={onChange} placeholder={placeholder} autoCapitalize="none" />
      <Pressable accessibilityRole="button" accessibilityLabel="Elegir fecha en el calendario" onPress={() => setOpen(true)}
        style={{ backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', marginTop: flat.marginTop ?? 0, marginBottom: flat.marginBottom ?? 0 }}>
        <Ionicons name="calendar-outline" size={22} color="#fff" />
      </Pressable>
      <DayCalendar visible={open} selected={isDate(value) ? value : texasDate()} maxDate={maxDate} onSelect={onChange} onClose={() => setOpen(false)} />
    </View>
  );
}
