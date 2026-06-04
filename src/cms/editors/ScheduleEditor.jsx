import React, { useEffect, useState } from 'react';
import './../../cms/cms.css';

// CMS schedule editor. Allows selection of acts, stages, and time slots.
export default function ScheduleEditor() {
  const [items, setItems] = useState([]);
  const [acts, setActs] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ act_id: '', stage:'', day:'sat', start_time:'', end_time:'' });
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/schedule', { credentials:'include' }).then(r=>r.json()),
      fetch('/api/acts', { credentials:'include' }).then(r=>r.json()),
      fetch('/api/map', { credentials:'include' }).then(r=>r.json())
    ]).then(([schedules, actsData, mapData]) => {
      setItems(schedules || []);
      setActs(Array.isArray(actsData)?actsData:[]);
      if (Array.isArray(mapData)) setStages(mapData.map(m => ({ id: m.id, name: m.name || m.label || '' }))); else if (mapData && Array.isArray(mapData.locations)) setStages(mapData.locations.map(m => ({ id: m.id, name: m.name || m.label || '' })));
    }).catch(()=>setMsg({error:'Failed'})).finally(()=>setLoading(false));
  };
  useEffect(()=>{load()},[]);

  const normalizeField = (value) => {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return value.id ?? value.title ?? JSON.stringify(value);
    return value ?? '';
  };

    const onAdd=()=>{setEditing('new');setForm({act_id:'',stage:(stages[0]?stages[0].name:''),day:'sat',start_time:'',end_time:''})}
    const onEdit=(it)=>{setEditing(it.id);setForm({
      act_id: normalizeField(it.act_id),
      stage: normalizeField(it.stage),
      day: normalizeField(it.day) || 'sat',
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
          <div className="form-row">
            <label style={{minWidth:120,color:'var(--text)'}}>Act</label>
            <select className="input" value={form.act_id||''} onChange={(e)=>setForm({...form,act_id:e.target.value})}>
              <option value="">-- Select act --</option>
              {acts.map(a=>(<option key={a.id} value={a.id}>{a.name || a.title || a.id}</option>))}
            </select>
          </div>
          <div className="form-row">
            <label style={{minWidth:120,color:'var(--text)'}}>Stage</label>
            <select className="input" value={form.stage||''} onChange={(e)=>setForm({...form,stage:e.target.value})}>
              <option value="">-- Select stage --</option>
              {stages.map(s=>(<option key={s.id} value={s.name}>{s.name}</option>))}
            </select>
          </div>
          <div className="form-row">
            <label style={{minWidth:120,color:'var(--text)'}}>Day</label>
            <select className="input" value={form.day} onChange={(e)=>setForm({...form,day:e.target.value})}>
              <option value="sat">Saturday</option>
              <option value="sun">Sunday</option>
            </select>
          </div>
          <div className="form-row"><input className="input" placeholder="Start (HH:MM)" value={form.start_time} onChange={(e)=>setForm({...form,start_time:e.target.value})} /> <input className="input" placeholder="End (HH:MM)" value={form.end_time} onChange={(e)=>setForm({...form,end_time:e.target.value})} /></div>
          <div className="form-row"><button className="button" onClick={save}>Save</button> <button className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div>
        </div>
      ) : null}
    </div>
  )
}
