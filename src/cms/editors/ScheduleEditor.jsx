import React, { useEffect, useState } from 'react';
import './../../cms/cms.css';

export default function ScheduleEditor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ act_id: null, stage:'', day:'', start_time:'', end_time:'' });
  const [msg, setMsg] = useState(null);

  const load = () => { setLoading(true); fetch('/api/schedule', { credentials:'include' }).then(r=>r.json()).then(setItems).catch(()=>setMsg({error:'Failed'})).finally(()=>setLoading(false)); };
  useEffect(()=>{load()},[]);

  const normalizeField = (value) => {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return value.title || value.id || JSON.stringify(value);
    return value ?? '';
  };

  const onAdd=()=>{setEditing('new');setForm({act_id:'',stage:'',day:'',start_time:'',end_time:''})}
  const onEdit=(it)=>{setEditing(it.id);setForm({
      act_id: normalizeField(it.act_id),
      stage: normalizeField(it.stage),
      day: normalizeField(it.day),
      start_time: normalizeField(it.start_time),
      end_time: normalizeField(it.end_time)
  })}
  const save=async()=>{try{const url=editing==='new'?'/api/schedule':`/api/schedule/${editing}`;const method=editing==='new'?'POST':'PUT';const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(form),credentials:'include'});if(!r.ok)throw new Error('save failed');setMsg({success:'Saved'});setEditing(null);load();}catch(e){setMsg({error:String(e)})}}
  const del=async(id)=>{if(!window.confirm('Delete?'))return;await fetch(`/api/schedule/${id}`,{method:'DELETE',credentials:'include'});setMsg({success:'Deleted'});load();}

  return (
    <div className="cms-container cms-shell">
      <div className="cms-top"><h3>Schedule</h3><div><button className="button" onClick={onAdd}>Add New</button></div></div>
      {msg?.success && <div className="message success">{msg.success}</div>}
      {msg?.error && <div className="message error">{String(msg.error)}</div>}
      {loading ? <div className="spinner"/> : (
        <table className="cms-table"><thead><tr><th>Act</th><th>Stage</th><th>Day</th><th>Time</th><th/></tr></thead><tbody>
          {items.map(it=> (<tr key={it.id}><td className="small">{it.act_id}</td><td>{it.stage}</td><td>{it.day}</td><td>{it.start_time}–{it.end_time}</td><td><button className="button ghost" onClick={()=>onEdit(it)}>Edit</button> <button className="button ghost" onClick={()=>del(it.id)}>Delete</button></td></tr>))}
        </tbody></table>
      )}

      {editing ? (
        <div>
          <div className="form-row"><input className="input" placeholder="Act ID" value={form.act_id||''} onChange={(e)=>setForm({...form,act_id:e.target.value})} /></div>
          <div className="form-row"><input className="input" placeholder="Stage" value={form.stage} onChange={(e)=>setForm({...form,stage:e.target.value})} /></div>
          <div className="form-row"><input className="input" placeholder="Day" value={form.day} onChange={(e)=>setForm({...form,day:e.target.value})} /></div>
          <div className="form-row"><input className="input" placeholder="Start" value={form.start_time} onChange={(e)=>setForm({...form,start_time:e.target.value})} /> <input className="input" placeholder="End" value={form.end_time} onChange={(e)=>setForm({...form,end_time:e.target.value})} /></div>
          <div className="form-row"><button className="button" onClick={save}>Save</button> <button className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div>
        </div>
      ) : null}
    </div>
  )
}
