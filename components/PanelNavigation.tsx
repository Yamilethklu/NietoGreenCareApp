import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const panelSections = [
  { key: 'dashboard', label: 'Resumen', icon: 'grid-outline', group: 'OPERACIÓN' },
  { key: 'agenda', label: 'Agenda del día', icon: 'calendar-outline', group: 'OPERACIÓN' },
  { key: 'solicitudes', label: 'Solicitudes', icon: 'mail-unread-outline', group: 'OPERACIÓN' },
  { key: 'clientes', label: 'Historial de clientes', icon: 'people-outline', group: 'OPERACIÓN' },
  { key: 'casas', label: 'Casas y servicios', icon: 'home-outline', group: 'OPERACIÓN' },
  { key: 'invoices', label: 'Facturas y pagos', icon: 'receipt-outline', group: 'OPERACIÓN' },
  { key: 'trabajadores', label: 'Trabajadores', icon: 'person-outline', group: 'ADMINISTRACIÓN' },
  { key: 'precios', label: 'Precios', icon: 'pricetag-outline', group: 'ADMINISTRACIÓN' },
  { key: 'galeria', label: 'Galería', icon: 'images-outline', group: 'SITIO WEB' },
  { key: 'opiniones', label: 'Opiniones', icon: 'chatbubbles-outline', group: 'SITIO WEB' },
  { key: 'qr', label: 'Código QR', icon: 'qr-code-outline', group: 'SITIO WEB' },
] as const satisfies ReadonlyArray<{key: string; label: string; icon: ComponentProps<typeof Ionicons>['name']; group: string}>;
export type PanelTab = typeof panelSections[number]['key'];

type Props = {
  open: boolean; worker: boolean; active: PanelTab;
  onClose: () => void; onSelect: (tab: PanelTab) => void;
  onWebsite: () => void; onSignOut: () => void; onReminder: () => void;
};
export function PanelNavigation({open,worker,active,onClose,onSelect,onWebsite,onSignOut,onReminder}:Props) {
  const sections = worker ? panelSections.filter(item => item.key === 'agenda') : panelSections;
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar menú" onPress={onClose} />
      <SafeAreaView style={styles.drawer} accessibilityViewIsModal>
        <View style={styles.brandRow}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <View style={{flex:1}}><Text style={styles.brand}>NIETO GREEN CARE</Text><Text style={styles.caption}>{worker ? 'Panel del trabajador' : 'Panel del propietario'}</Text></View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar menú lateral" style={styles.close}><Ionicons name="close" size={24} color="#14532d" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.menu}>
          {sections.map((item,index) => <View key={item.key}>
            {(index === 0 || sections[index-1].group !== item.group) && <Text style={styles.group}>{item.group}</Text>}
            <Pressable accessibilityRole="button" accessibilityState={{selected:active===item.key}} onPress={()=>{onSelect(item.key);onClose();}} style={[styles.item,active===item.key&&styles.active]}>
              <Ionicons name={item.icon} size={21} color={active===item.key?'#166534':'#64748b'} />
              <Text style={[styles.label,active===item.key&&styles.activeLabel]}>{item.label}</Text>
              {active===item.key&&<View style={styles.dot}/>}
            </Pressable>
          </View>)}
          <Text style={styles.group}>ACCESOS</Text>
          <MenuAction icon="notifications-outline" label="Activar recordatorio diario" onPress={()=>{onClose();onReminder();}} />
          <MenuAction icon="globe-outline" label="Abrir sitio web" onPress={()=>{onClose();onWebsite();}} />
          <MenuAction icon="log-out-outline" label="Cerrar sesión" onPress={()=>{onClose();onSignOut();}} />
        </ScrollView>
        <Text style={styles.footer}>Tu operación, en un solo lugar.</Text>
      </SafeAreaView>
    </View>
  </Modal>;
}
function MenuAction({icon,label,onPress}:{icon:ComponentProps<typeof Ionicons>['name'];label:string;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.item}><Ionicons name={icon} size={21} color="#64748b"/><Text style={styles.label}>{label}</Text></Pressable>;
}
const styles=StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(15,23,42,0.4)'},
  drawer:{width:'88%',maxWidth:350,height:'100%',backgroundColor:'#ffffff',shadowColor:'#052e16',shadowOpacity:0.18,shadowRadius:24,elevation:16},
  brandRow:{flexDirection:'row',alignItems:'center',gap:10,padding:18,borderBottomWidth:1,borderBottomColor:'#ecf2ee'},
  logo:{width:42,height:42,borderRadius:14},brand:{fontWeight:'800',fontSize:14,color:'#14532d'},caption:{fontSize:12,color:'#64748b',marginTop:4},
  close:{padding:8},menu:{paddingHorizontal:14,paddingBottom:24},group:{fontSize:10,fontWeight:'800',letterSpacing:1.4,color:'#81928a',marginTop:24,marginBottom:9,marginLeft:12},
  item:{minHeight:49,flexDirection:'row',alignItems:'center',gap:13,paddingHorizontal:13,paddingVertical:12,marginBottom:3,borderRadius:12},
  active:{backgroundColor:'#e8f6ec'},label:{flex:1,color:'#334155',fontSize:14,fontWeight:'500'},activeLabel:{fontWeight:'800',color:'#14532d'},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#22c55e'},
  footer:{fontSize:11,color:'#81928a',padding:20,borderTopWidth:1,borderTopColor:'#ecf2ee'},
});
