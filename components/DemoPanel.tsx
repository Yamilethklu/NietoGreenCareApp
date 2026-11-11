import { useState, type ComponentType } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { createDemoStore } from '../services/demo-store';
import { PanelApiContext } from '../services/panel-api';
import { texasDate } from '../services/daily-agenda';
import { type House, type Order, type PayMethod, type Worker } from '../src/panel';
import { AgendaCard } from './AgendaCard';
import { HouseDetail } from './HouseDetail';
import { InvoicesPanel } from './InvoicesPanel';
import { NewRequestModal } from './NewRequestModal';
import { OrderEditModal } from './OrderEditModal';
import { WorkerSchedule } from './WorkerSchedule';
import { DateField } from './DateField';
import { DayCalendar } from './DayCalendar';

const button = { backgroundColor: '#15803d', padding: 12, borderRadius: 8, marginVertical: 5 } as const;
function Button({ title, onPress }: { title: string; onPress: () => void }) { return <Pressable accessibilityRole="button" style={button} onPress={onPress}><Text style={{color:'#fff',fontWeight:'700'}}>{title}</Text></Pressable>; }
type HouseEditorProps = { house: House|null; onClose:()=>void; onSave:(house:House)=>Promise<void> };
type PaymentEditorProps = { visible:boolean; date:string; onDate:(date:string)=>void; method:PayMethod; note:string; onMethod:(method:PayMethod)=>void; onNote:(note:string)=>void; onClose:()=>void; onSave:()=>void };

export function DemoPanel({ onExit, HouseEditor, PaymentEditor }: { onExit:()=>void; HouseEditor:ComponentType<HouseEditorProps>; PaymentEditor:ComponentType<PaymentEditorProps> }) {
  const [store] = useState(() => createDemoStore(texasDate()));
  const [, refresh] = useState(0);
  const [tab,setTab] = useState('Agenda');
  const [menu,setMenu] = useState(false);
  const [date,setDate] = useState(texasDate);
  const [calendar,setCalendar] = useState(false);
  const [houseId,setHouseId] = useState<string|null>(null);
  const [editingHouse,setEditingHouse] = useState<House|null>(null);
  const [editingOrder,setEditingOrder] = useState<Order|null>(null);
  const [newRequest,setNewRequest] = useState(false);
  const [pendingRequest,setPendingRequest] = useState(true);
  const [message,setMessage] = useState('');
  const [worker,setWorker] = useState<Worker|null>(null);
  const [workerView,setWorkerView] = useState(false);
  const [payment,setPayment] = useState<string|null>(null);
  const [paymentDate,setPaymentDate] = useState(texasDate);
  const [method,setMethod] = useState<PayMethod>('Cash');
  const [note,setNote] = useState('');
  const reload = async () => { refresh(value => value + 1); };
  const mutate = (fn:()=>void) => { try { fn(); void reload(); setMessage('Guardado únicamente en la demostración.'); } catch(error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.'); } };
  const history = (id:string) => { setHouseId(id); setTab('Historial'); };
  const house = store.houses.find(h=>h.id===houseId);
  async function shareInvoice(id:string) {
    const invoice = store.invoices.find(i=>i.id===id);
    if (!invoice) throw Error('Invoice demo no encontrado.');
    if (!(await Sharing.isAvailableAsync())) throw Error('Compartir no está disponible en este dispositivo.');
    // Generate a local, visibly fictitious PDF without calling the production PDF endpoint.
    const lines = ['NIETO GREEN CARE - DEMONSTRATION', 'SAMPLE INVOICE - NOT VALID FOR PAYMENT', invoice.number || id, ...invoice.orderIds.map(value => { const order = store.orders.find(o=>o.id===value)!; return `${order.date}    USD ${order.price.toFixed(2)}`; }), `Total USD ${invoice.total.toFixed(2)}`, invoice.paid ? 'PAID (DEMO)' : 'UNPAID (DEMO)'];
    const stream = 'BT /F1 12 Tf 40 760 Td ' + lines.map((line,index)=>(index?'0 -22 Td ':'')+'('+line.replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,'\\$&')+') Tj').join('\n') + ' ET';
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
    let pdf = '%PDF-1.4\n'; const offsets = [0];
    objects.forEach((object,index)=>{ offsets.push(pdf.length); pdf += `${index+1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const file = new File(Paths.cache, `Invoice-DEMO-${Date.now()}.pdf`);
    try { file.create(); file.write(pdf); await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',UTI:'com.adobe.pdf'}); } finally { if(file.exists) file.delete(); }
  }
  return <PanelApiContext.Provider value={{adminRequest:store.request,shareInvoice}}><SafeAreaView style={{flex:1,backgroundColor:'#f8fafc'}}>
    <View style={{padding:12,backgroundColor:'#dcfce7'}}><Text style={{fontWeight:'900',fontSize:18}}>NIETO GREEN CARE · DEMO</Text><Text>Datos ficticios. Los cambios se borran al salir. Sin acceso a clientes reales.</Text><Button title="Salir de demostración" onPress={onExit}/></View>
    <ScrollView contentContainerStyle={{padding:14,gap:10}} keyboardShouldPersistTaps="handled">
      <Button title={`☰ ${tab}`} onPress={()=>setMenu(!menu)}/>
      {menu && (workerView?['Agenda']:['Agenda','Solicitudes','Historial','Invoices','Trabajadores']).map(value=><Button key={value} title={value} onPress={()=>{setTab(value);setMenu(false);}}/>)}
      <Button title={workerView?'Ver como administrador demo':'Ver como trabajador demo'} onPress={()=>{setWorkerView(!workerView);setTab('Agenda');setHouseId(null);setMenu(false);}}/>
      {!workerView && <Button title="Nueva solicitud" onPress={()=>setNewRequest(true)}/>}
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
      {tab==='Agenda' && <><DateField value={date} onChange={setDate}/>{store.orders.filter(o=>o.date===date && (!workerView || o.workerId==='demo-worker')).map(order=><AgendaCard key={order.id} order={order} house={store.houses.find(h=>h.id===order.houseId)} workers={store.workers} canAssign={!workerView} canEditNotes={!workerView} onAssign={value=>mutate(()=>store.updateOrder(order.id,{workerId:value??undefined}))} onStatus={(id,status)=>mutate(()=>store.updateOrder(id,{status}))} onPay={id=>{setPayment(id);setPaymentDate(texasDate());setNote('');}} onPending={id=>mutate(()=>store.updateOrder(id,{paid:false,paidAmount:0,paymentMethod:undefined}))} onPrice={setEditingOrder} onHistory={()=>{if(workerView){Alert.alert('Historial demo',store.orders.filter(o=>o.houseId===order.houseId).map(o=>`${o.date} · $${o.price.toFixed(2)} · ${o.paid?'Pagado':'Pendiente'}`).join('\n'));}else history(order.houseId);}} onSaveNotes={async notes=>{store.updateOrder(order.id,{notes});await reload();}}/>)}{!store.orders.some(o=>o.date===date && (!workerView || o.workerId==='demo-worker'))&&<Text>No hay trabajos para esta fecha.</Text>}</>}
      {tab==='Solicitudes' && <><Text>Solicitud de ejemplo recibida del cotizador. No se conecta al sitio real.</Text>{pendingRequest?<View><Text style={{fontWeight:'800'}}>Cliente demo nuevo · 200 Sample Lane</Text><Text>Yard · cada 8 días · $50 · Sin mascotas · Propiedad ocupada</Text><Button title="Aceptar" onPress={()=>mutate(()=>{store.saveHouse({id:'demo-request-house',client:'Cliente demo nuevo',address:'200 Sample Lane',city:'Austin',phone:'5125550101',email:'sample@example.com',frequency:'Cada 8 dias',service:'Yard',price:50,active:true,notes:'Solicitud ficticia aceptada.',firstDate:date});setPendingRequest(false);})}/><Button title="Rechazar" onPress={()=>setPendingRequest(false)}/></View>:<Text>Solicitud procesada. Consulta el historial y la agenda.</Text>}</>}
      {tab==='Historial' && (house ? <HouseDetail house={house} houses={store.houses} orders={[...store.orders]} invoices={[...store.invoices]} onBack={()=>setHouseId(null)} onEditHouse={setEditingHouse} onEditOrder={setEditingOrder} onDeleteOrder={id=>mutate(()=>store.deleteOrder(id))} reload={reload} setMessage={setMessage}/> : <><Button title="Agregar casa" onPress={()=>setEditingHouse({id:`demo-house-${Date.now()}`,client:'',address:'',phone:'',email:'',frequency:'Cada 8 dias',service:'Yard',price:0,active:true,notes:'',firstDate:date})}/>{store.houses.map(h=><Button key={h.id} title={`${h.client} · ${h.address}`} onPress={()=>setHouseId(h.id)}/>)}</>)}
      {tab==='Invoices' && <InvoicesPanel invoices={[...store.invoices]} orders={[...store.orders]} houses={store.houses} reload={reload} setMessage={setMessage} onHistory={history}/>}
      {tab==='Trabajadores' && <><Text>Personal ficticio: no se crean cuentas ni contraseñas reales.</Text><Button title="Agregar trabajador" onPress={()=>setWorker({id:`demo-worker-${Date.now()}`,name:'',email:'',active:true})}/>{store.workers.map(w=><View key={w.id}><Text>{w.name} · {w.email}</Text><Button title="Editar" onPress={()=>setWorker({...w})}/><Button title="Eliminar" onPress={()=>mutate(()=>store.deleteWorker(w.id))}/></View>)}{worker&&<View><TextInput accessibilityLabel="Nombre del trabajador" placeholder="Nombre" value={worker.name} onChangeText={name=>setWorker({...worker,name})}/><TextInput accessibilityLabel="Correo del trabajador" placeholder="Correo" value={worker.email} onChangeText={email=>setWorker({...worker,email})}/><Button title="Guardar trabajador demo" onPress={()=>mutate(()=>{if(!worker.name.trim())throw Error('Escribe el nombre.');store.saveWorker(worker);setWorker(null);})}/></View>}<WorkerSchedule workers={[...store.workers]} orders={[...store.orders]} houses={store.houses} date={date} onDate={setDate} onOpenCalendar={()=>setCalendar(true)} onAssign={(id,value)=>mutate(()=>store.updateOrder(id,{workerId:value??undefined}))}/></>}
    </ScrollView>
    <DayCalendar visible={calendar} selected={date} onSelect={setDate} onClose={()=>setCalendar(false)}/>
    <NewRequestModal visible={newRequest} onClose={()=>setNewRequest(false)} onSave={async value=>{store.addRequest(value);await reload();setNewRequest(false);}}/>
    <HouseEditor house={editingHouse} onClose={()=>setEditingHouse(null)} onSave={async value=>{store.saveHouse(value);await reload();setEditingHouse(null);}}/>
    <OrderEditModal order={editingOrder} onClose={()=>setEditingOrder(null)} onSave={async(order,changes)=>{store.updateOrder(order.id,{date:changes.service_date,price:changes.price,notes:changes.notes??'',status:changes.status==='completed'?'FINALIZADA':changes.status==='cancelled'?'CANCELADA':'SOLICITADA'});await reload();setEditingOrder(null);}}/>
    <PaymentEditor visible={!!payment} date={paymentDate} onDate={setPaymentDate} method={method} note={note} onMethod={setMethod} onNote={setNote} onClose={()=>setPayment(null)} onSave={()=>{try {const order=store.orders.find(o=>o.id===payment);if(order)store.updateOrder(order.id,{paid:true,paidAmount:order.price,paymentMethod:method});void reload();setPayment(null);setMessage('Pago simulado. No se ha efectuado ningún cobro real.');}catch(error){Alert.alert('Demostración',error instanceof Error?error.message:'No se pudo registrar.');}}}/>
  </SafeAreaView></PanelApiContext.Provider>;
}
