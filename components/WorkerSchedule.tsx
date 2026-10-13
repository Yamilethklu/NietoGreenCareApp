import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shiftDate, type House, type Order, type Worker } from '../src/panel';

const box = { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0', padding: 12, marginTop: 10 } as const;

export function WorkerSchedule({ workers, orders, houses, date, onDate, onOpenCalendar, onAssign }: {
  workers: Worker[]; orders: Order[]; houses: House[]; date: string; onDate: (date: string) => void; onOpenCalendar: () => void; onAssign: (orderId: string, workerId: string | null) => void;
}) {
  const day = orders.filter((order) => order.date === date && order.status !== 'CANCELADA');
  const active = workers.filter((worker) => worker.active);
  const addressOf = (order: Order) => houses.find((house) => house.id === order.houseId)?.address ?? 'Dirección pendiente';
  const unassigned = day.filter((order) => !order.workerId || !active.some((worker) => worker.id === order.workerId));

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#14532d' }}>Casas por trabajador</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <Pressable onPress={() => onDate(shiftDate(date, -1))} style={{ padding: 8 }}><Ionicons name="chevron-back" size={22} color="#14532d" /></Pressable>
        <Pressable onPress={onOpenCalendar} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="calendar-outline" size={18} color="#14532d" /><Text style={{ fontWeight: '800' }}>{date}</Text></Pressable>
        <Pressable onPress={() => onDate(shiftDate(date, 1))} style={{ padding: 8 }}><Ionicons name="chevron-forward" size={22} color="#14532d" /></Pressable>
      </View>

      {active.map((worker) => {
        const mine = day.filter((order) => order.workerId === worker.id);
        return (
          <View key={worker.id} style={box}>
            <Text style={{ fontWeight: '800' }}>{worker.name} · {mine.length} {mine.length === 1 ? 'casa' : 'casas'}</Text>
            {mine.map((order) => (
              <View key={order.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ flex: 1 }}>{addressOf(order)}</Text>
                <Pressable onPress={() => onAssign(order.id, null)}><Text style={{ color: '#b91c1c', fontWeight: '700' }}>Quitar</Text></Pressable>
              </View>
            ))}
            {!mine.length ? <Text style={{ color: '#64748b', marginTop: 4 }}>Sin casas asignadas este día.</Text> : null}
          </View>
        );
      })}

      <View style={box}>
        <Text style={{ fontWeight: '800' }}>Sin asignar · {unassigned.length}</Text>
        {unassigned.map((order) => (
          <View key={order.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e2e8f0' }}>
            <Text>{addressOf(order)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {active.map((worker) => (
                <Pressable key={worker.id} onPress={() => onAssign(order.id, worker.id)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#bbf7d0' }}>
                  <Text style={{ fontWeight: '700', fontSize: 12 }}>{worker.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        {!unassigned.length ? <Text style={{ color: '#64748b', marginTop: 4 }}>Todas las casas del día tienen trabajador.</Text> : null}
        {!active.length ? <Text style={{ color: '#64748b', marginTop: 4 }}>Registra trabajadores arriba para poder asignarles casas.</Text> : null}
      </View>
    </View>
  );
}
