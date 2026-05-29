import React, { useEffect, useState } from 'react';
import './../../cms/cms.css';

export default function MapEditor(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:'',lat:'',lng:'',type:'',description:''});
  const [msg,setMsg]=useState(null);
  const load=()=>{setLoading(true);fetch('/api/map',{credentials:'include'}).then(r=>r.json()).then(setItems).catch(()=>setMsg({error:'Failed'})).finally(()=>setLoading(false))}
  useEffect(()=>{load()},[]);
  const onAdd=()=>{setEditing('new');setForm({name:'',lat:'',lng:'',type:'',description:''})}
  const onEdit=(it)=>{setEditing(it.id);setForm({name:it.name,lat:it.lat,lng:it.lng,type:it.type,description:it.description})}
  const save=async()=>{try{const url=editing==='new'?'/api/map':`/api/map/${editing}`;const method=editing==='new'?'POST':'PUT';const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(form),credentials:'include'});if(!r.ok)throw new Error('save failed');setMsg({success:'Saved'});setEditing(null);load()}catch(e){setMsg({error:String(e)})}}
  const del=async(id)=>{if(!window.confirm('Delete?'))return;await fetch(`/api/map/${id}`,{method:'DELETE',credentials:'include'});setMsg({success:'Deleted'});load()}
  return (
    <div className="cms-container cms-shell">
      <div className="cms-top"><h3>Map Points</h3><div><button className="button" onClick={onAdd}>Add New</button></div></div>
      {msg?.success && <div className="message success">{msg.success}</div>}
      {msg?.error && <div className="message error">{String(msg.error)}</div>}
      {loading ? <div className="spinner"/> : (
        <table className="cms-table"><thead><tr><th>Name</th><th>Coords</th><th/></tr></thead><tbody>
          {items.map(it=>(<tr key={it.id}><td>{it.name}</td><td className="small">{it.lat},{it.lng}</td><td><button className="button ghost" onClick={()=>onEdit(it)}>Edit</button> <button className="button ghost" onClick={()=>del(it.id)}>Delete</button></td></tr>))}
        </tbody></table>
      )}
      {editing? (<div>
        <div className="form-row"><input className="input" placeholder="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></div>
        <div className="form-row"><input className="input" placeholder="Latitude" value={form.lat} onChange={(e)=>setForm({...form,lat:e.target.value})} /><input className="input" placeholder="Longitude" value={form.lng} onChange={(e)=>setForm({...form,lng:e.target.value})} /></div>
        <div className="form-row"><input className="input" placeholder="Type" value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})} /></div>
        <div className="form-row"><textarea className="input" placeholder="Description" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></div>
        <div className="form-row"><button className="button" onClick={save}>Save</button> <button className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div>
      </div>):null}
    </div>
  )
}
