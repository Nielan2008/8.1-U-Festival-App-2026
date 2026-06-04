import React, { useEffect, useState } from 'react';
import './../../cms/cms.css';

// CMS editor for general info entries.
// Supports key/value content records for multiple languages.
export default function InfoEditor(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({key:'',value:'',lang:'en'});
  const [msg,setMsg]=useState(null);
  const load=()=>{setLoading(true);fetch('/api/info',{credentials:'include'}).then(r=>r.json()).then(setItems).catch(()=>setMsg({error:'Failed'})).finally(()=>setLoading(false))}
  useEffect(()=>{load()},[]);
  const onAdd=()=>{setEditing('new');setForm({key:'',value:'',lang:'en'})}
  const onEdit=(it)=>{setEditing(it.id);setForm({key:it.key,value:it.value,lang:it.lang||'en'})}
  const save=async()=>{try{const url=editing==='new'?'/api/info':`/api/info/${editing}`;const method=editing==='new'?'POST':'PUT';const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(form),credentials:'include'});if(!r.ok)throw new Error('save failed');setMsg({success:'Saved'});setEditing(null);load()}catch(e){setMsg({error:String(e)})}}
  const del=async(id)=>{if(!window.confirm('Delete?'))return;await fetch(`/api/info/${id}`,{method:'DELETE',credentials:'include'});setMsg({success:'Deleted'});load()}
  return (
    <div className="cms-container cms-shell">
      <div className="cms-top"><h3>Info</h3><div><button className="button" onClick={onAdd}>Add New</button></div></div>
      {msg?.success && <div className="message success">{msg.success}</div>}
      {msg?.error && <div className="message error">{String(msg.error)}</div>}
      {loading ? <div className="spinner"/> : (
        <table className="cms-table"><thead><tr><th>Key</th><th>Value</th><th/></tr></thead><tbody>
          {items.map(it=>(<tr key={it.id}><td>{it.key}</td><td className="small">{it.value}</td><td><button className="button ghost" onClick={()=>onEdit(it)}>Edit</button> <button className="button ghost" onClick={()=>del(it.id)}>Delete</button></td></tr>))}
        </tbody></table>
      )}
      {editing? (<div>
        <div className="form-row"><input className="input" placeholder="Key" value={form.key} onChange={(e)=>setForm({...form,key:e.target.value})} /></div>
        <div className="form-row"><label style={{minWidth:80,color:'var(--text)'}}>Language</label><select className="input" value={form.lang} onChange={(e)=>setForm({...form,lang:e.target.value})}><option value="en">English</option><option value="nl">Nederlands</option></select></div>
        <div className="form-row"><textarea className="input" placeholder="Value(JSON or string)" value={form.value} onChange={(e)=>setForm({...form,value:e.target.value})} /></div>
        <div className="form-row"><button className="button" onClick={save}>Save</button> <button className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div>
      </div>):null}
    </div>
  )
}
