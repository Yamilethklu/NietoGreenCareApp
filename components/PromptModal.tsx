import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';

export function PromptModal({ 
  visible, 
  title, 
  defaultValue, 
  onConfirm, 
  onCancel 
}: { 
  visible: boolean; 
  title: string; 
  defaultValue: string; 
  onConfirm: (value: string) => void; 
  onCancel: () => void; 
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <TextInput 
            style={styles.input} 
            value={value} 
            onChangeText={setValue} 
            keyboardType="decimal-pad"
          />
          <View style={styles.buttons}>
            <Pressable style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirm]} onPress={() => onConfirm(value)}>
              <Text style={styles.buttonText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { padding: 10, borderRadius: 5, width: '45%', alignItems: 'center' },
  cancel: { backgroundColor: '#6b7280' },
  confirm: { backgroundColor: '#16a34a' },
  buttonText: { color: 'white', fontWeight: 'bold' },
});