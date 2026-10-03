import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { adminRequest } from '../services/admin';
import { supabase } from '../services/auth';

type Mode = 'trabajadores' | 'precios' | 'galeria' | 'opiniones';
type Row = { id: string; [key: string]: any };
const field = { backgroundColor:'#fff', color:'#111827', borderColor:'#86efac', borderWidth:1, borderRadius:8, padding:12, marginVertical:5 } as const;
const button = { backgroundColor:'#15803d', borderRadius:8, padding:12, marginVertical:5 } as const;
function Action({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}) { return <Pressable disabled={disabled} style={[button,{opacity:disabled?0.5:1}]} onPress={onPress}><Text style={{color:'#fff',fontWeight:'700'}}>{label}</Text></Pressable>; }

export function AdminManagement({mode,onChanged}:{mode:Mode;onChanged:()=>Promise<void>}) {
 const [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [editing,setEditing]=useState<string|null>(null),[name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState('');
 const [frequency,setFrequency]=useState('lawn_weekly'),[min,setMin]=useState(''),[max,setMax]=useState(''),[price,setPrice]=useState('');
 const [title,setTitle]=useState(''),[description,setDescription]=useState('');
 const endpoint=mode==='trabajadores'?'operations':mode==='precios'?'pricing':mode==='galeria'?'gallery':'reviews';
 async function load(){const data=await adminRequest(endpoint);setRows(mode==='trabajadores'?data.crew:data);}
 useEffect(()=>{let active=true;setRows([]);setMessage('');void adminRequest(endpoint).then(data=>{if(active)setRows(mode==='trabajadores'?data.crew:data);}).catch(error=>{if(active)setMessage(error.message);});return()=>{active=false;};},[mode]);
 async function run(task:()=>Promise<unknown>){if(busy)return;setBusy(true);setMessage('');try{await task();await load();await onChanged();setMessage('Guardado en el sitio y la app.');}catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar');}finally{setBusy(false);}}
 function remove(row:Row){Alert.alert('Eliminar','¿Eliminar definitivamente este elemento del sitio y la app?',[{text:'Cancelar',style:'cancel'},{text:'Eliminar',style:'destructive',onPress:()=>void run(()=>adminRequest(endpoint,'DELETE',{id:row.id}))}]);}
 function clear(){setEditing(null);setName('');setEmail('');setPhone('');setMin('');setMax('');setPrice('');}
 async function saveWorker(){if(name.trim().length<2||!/^\S+@\S+\.\S+$/.test(email.trim()))throw new Error('Escribe el nombre y un correo válido.');await adminRequest('operations','POST',editing?{action:'worker_update',id:editing,changes:{full_name:name.trim(),email:email.trim(),phone:phone.trim()||null}}:{action:'worker',worker:{full_name:name.trim(),email:email.trim(),phone:phone.trim()||null,active:true}});clear();}
 async function saveRate(){const low=Number(min),high=max.trim()?Number(max):null,amount=Number(price);if(!min.trim()||!price.trim()||!Number.isFinite(low)||low<0||!Number.isFinite(amount)||amount<=0||(high!==null&&(!Number.isFinite(high)||high<=low)))throw new Error('Revisa el rango de superficie y el precio.');const values={name:`${frequency==='lawn_weekly'?'Semanal':'Quincenal'} ${low}–${high??'+'} ft²`,service_key:frequency,min_sq_ft:low,max_sq_ft:high,price:amount};await adminRequest('pricing',editing?'PATCH':'POST',editing?{id:editing,changes:values}:values);clear();}
 async function upload(){
  if(!title.trim())throw new Error('Escribe el título antes de seleccionar el archivo.');
  const chosen=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:1});if(chosen.canceled)return;
  const asset=chosen.assets[0],file=new File(asset.uri),size=file.size;
  const type=asset.mimeType;if(!type||!size||size>50*1024*1024)throw new Error('Selecciona una foto o video válido de máximo 50 MB.');
  const upload=await adminRequest('gallery/upload-url','POST',{fileName:asset.fileName||file.name,fileType:type,fileSize:size});
  if(!supabase)throw new Error('Inicia sesión nuevamente.');
  const result=await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path,upload.token,await file.arrayBuffer(),{contentType:type});
  if(result.error)throw new Error(result.error.message);
  await adminRequest('gallery','POST',{storage_path:upload.path,title:title.trim(),description:description.trim()});setTitle('');setDescription('');
 }
 return <View><Text style={{fontSize:23,fontWeight:'700',marginBottom:12}}>{({trabajadores:'Trabajadores',precios:'Precios por superficie',galeria:'Galería',opiniones:'Opiniones de clientes'})[mode]}</Text>
  {mode==='trabajadores'&&<View><TextInput accessibilityLabel="Nombre del trabajador" style={field} placeholder="Nombre del trabajador" value={name} onChangeText={setName}/><TextInput accessibilityLabel="Correo autorizado" style={field} placeholder="Correo autorizado" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/><TextInput style={field} placeholder="Teléfono" keyboardType="phone-pad" value={phone} onChangeText={setPhone}/><Action disabled={busy} label={editing?'Guardar trabajador':'Agregar trabajador'} onPress={()=>void run(saveWorker)}/>{editing&&<Action label="Cancelar edición" onPress={clear}/>}</View>}
  {mode==='precios'&&<View><View style={{flexDirection:'row',gap:8}}>{[['lawn_weekly','Semanal'],['lawn_bi_weekly','Quincenal']].map(([key,label])=><Pressable key={key} style={[field,{backgroundColor:frequency===key?'#bbf7d0':'#fff'}]} onPress={()=>setFrequency(key)}><Text>{label}</Text></Pressable>)}</View><TextInput style={field} placeholder="Desde ft²" keyboardType="decimal-pad" value={min} onChangeText={setMin}/><TextInput style={field} placeholder="Hasta ft² (vacío = sin límite)" keyboardType="decimal-pad" value={max} onChangeText={setMax}/><TextInput style={field} placeholder="Precio USD por visita" keyboardType="decimal-pad" value={price} onChangeText={setPrice}/><Action disabled={busy} label={editing?'Guardar tarifa':'Agregar tarifa'} onPress={()=>void run(saveRate)}/>{editing&&<Action label="Cancelar edición" onPress={clear}/>}</View>}
  {mode==='galeria'&&<View><TextInput style={field} placeholder="Título de la foto o video" value={title} onChangeText={setTitle}/><TextInput style={field} placeholder="Descripción" value={description} onChangeText={setDescription}/><Action disabled={busy} label="Seleccionar y subir foto o video" onPress={()=>void run(upload)}/></View>}
  {message!==''&&<Text accessibilityLiveRegion="polite" style={{marginVertical:12}}>{message}</Text>}
  {rows.map(row=><View key={row.id} style={[field,{marginVertical:10,backgroundColor:'#dcfce7'}]}>
   {mode==='trabajadores'&&<><Text style={{fontWeight:'700'}}>{row.full_name}</Text><Text>{row.email} · {row.active?'Activo':'Inactivo'}</Text><Action disabled={busy} label="Editar" onPress={()=>{setEditing(row.id);setName(row.full_name);setEmail(row.email);setPhone(row.phone||'');}}/><Action disabled={busy} label={row.active?'Desactivar acceso':'Activar acceso'} onPress={()=>void run(()=>adminRequest('operations','POST',{action:'worker_update',id:row.id,changes:{active:!row.active}}))}/></>}
   {mode==='precios'&&<><Text>{row.name} · ${Number(row.price).toFixed(2)} · {row.is_active?'Activa':'Pausada'}</Text><Action disabled={busy} label="Editar rango y precio" onPress={()=>{setEditing(row.id);setFrequency(row.service_key);setMin(String(row.min_sq_ft));setMax(row.max_sq_ft===null?'':String(row.max_sq_ft));setPrice(String(row.price));}}/><Action disabled={busy} label={row.is_active?'Pausar':'Activar'} onPress={()=>void run(()=>adminRequest('pricing','PATCH',{id:row.id,changes:{is_active:!row.is_active}}))}/></>}
   {mode==='galeria'&&<><Text>{row.title} · {row.is_published?'Público':'Oculto'}</Text>{/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(row.public_url||'')&&<Image source={{uri:row.public_url}} style={{height:180,width:'100%',marginVertical:8}} resizeMode="cover"/>}<Text>{row.description}</Text><Action disabled={busy} label={row.is_published?'Ocultar':'Publicar'} onPress={()=>void run(()=>adminRequest('gallery','PATCH',{id:row.id,changes:{is_published:!row.is_published}}))}/><Action disabled={busy} label="Eliminar" onPress={()=>remove(row)}/></>}
   {mode==='opiniones'&&<><Text>{row.customer_name} · {row.rating}/5 · {row.approved?'Publicada':'Pendiente'}</Text><Text>{row.comment}</Text><Action disabled={busy} label={row.approved?'Ocultar':'Aprobar y publicar'} onPress={()=>void run(()=>adminRequest('reviews','PATCH',{id:row.id,approved:!row.approved}))}/><Action disabled={busy} label="Eliminar" onPress={()=>remove(row)}/></>}
  </View>)}
 </View>;
}
