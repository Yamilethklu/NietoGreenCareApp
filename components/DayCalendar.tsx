import { Modal, Pressable, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { texasDate } from '../services/daily-agenda';

LocaleConfig.locales.es = {
  monthNames: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  dayNamesShort: ['do.', 'lu.', 'ma.', 'mi.', 'ju.', 'vi.', 'sá.'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

export function DayCalendar({ visible, selected, onSelect, onClose, maxDate }: { visible: boolean; selected: string; onSelect: (date: string) => void; onClose: () => void; maxDate?: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12 }}>
          <Calendar
            current={selected}
            maxDate={maxDate}
            markedDates={{ [selected]: { selected: true, selectedColor: '#16a34a' } }}
            onDayPress={(day) => { onSelect(day.dateString); onClose(); }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Pressable onPress={() => { onSelect(texasDate()); onClose(); }}><Text style={{ color: '#15803d', fontWeight: '700' }}>Hoy</Text></Pressable>
            <Pressable onPress={onClose}><Text style={{ color: '#475569', fontWeight: '700' }}>Cerrar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

