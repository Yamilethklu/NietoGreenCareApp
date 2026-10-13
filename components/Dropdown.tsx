import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type DropdownOption<T extends string> = { value: T; label: string };

export function Dropdown<T extends string>({ color, icon, label, title, options, onSelect, disabled }: {
  color: string; icon?: keyof typeof Ionicons.glyphMap; label?: string; title: string;
  options: DropdownOption<T>[]; onSelect: (value: T) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={() => setOpen(true)}
        style={{ backgroundColor: color, borderRadius: 8, minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.35 : 1 }}>
        {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
        {label ? <Text style={{ color: '#fff', fontWeight: '800' }}>{label}</Text> : null}
        <Ionicons name="chevron-down" size={14} color="#fff" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 24 }} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8 }}>
            <Text style={{ fontWeight: '900', fontSize: 16, color: '#0f172a', marginBottom: 4 }}>{title}</Text>
            {options.map((option) => (
              <Pressable key={option.value} onPress={() => { setOpen(false); onSelect(option.value); }}
                style={{ backgroundColor: color, borderRadius: 8, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{option.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setOpen(false)} style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: '#475569', fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
