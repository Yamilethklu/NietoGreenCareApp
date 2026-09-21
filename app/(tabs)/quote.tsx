import { ScrollView, StyleSheet } from 'react-native';
import { QuoteRequestForm } from '@/src/components/QuoteRequestForm';
import { Screen } from '@/src/components/ui';

export default function QuoteScreen() {
  return <Screen><ScrollView contentContainerStyle={s.content}><QuoteRequestForm /></ScrollView></Screen>;
}

const s = StyleSheet.create({ content: { padding: 14 } });