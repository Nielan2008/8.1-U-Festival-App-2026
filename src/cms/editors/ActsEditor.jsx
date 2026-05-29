import React, { useEffect, useState } from 'react';
import './../../cms/cms.css';

export default function ActsEditor() {
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', image_url: '' });
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch('/api/acts', { credentials: 'include' }).then(r => r.json()).then(setActs).catch(() => setMsg({error:'Failed'})).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onAdd = () => { setEditing('new'); setForm({ name:'', description:'', image_url:'' }); };
  const onEdit = (a) => { setEditing(a.id); setForm({ name:a.name, description:a.description, image_url:a.image_url }); };

  const save = async () => {
    try {
      const url = editing === 'new' ? '/api/acts' : `/api/acts/${editing}`;
      const method = editing === 'new' ? 'POST' : 'PUT';
      const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form), credentials:'include' });
      if (!r.ok) throw new Error('save failed');
      setMsg({success:'Saved'});
      setEditing(null);
      load();
    } catch (e) { setMsg({error:String(e)}); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this act?')) return;
    await fetch(`/api/acts/${id}`, { method:'DELETE', credentials:'include' });
    setMsg({success:'Deleted'});
    load();
  };

  return (
    <div className="cms-container cms-shell">
      <div className="cms-top"><h3>Acts</h3><div><button className="button" onClick={onAdd}>Add New</button></div></div>
      {msg?.success && <div className="message success">{msg.success}</div>}
      {msg?.error && <div className="message error">{String(msg.error)}</div>}
      {loading ? <div className="spinner"/> : (
        <table className="cms-table"><thead><tr><th>Name</th><th>Genre</th><th/></tr></thead><tbody>
          {acts.map(a=> (
            <tr key={a.id}><td>{a.name}</td><td className="small">{a.genre}</td><td><button className="button ghost" onClick={()=>onEdit(a)}>Edit</button> <button className="button ghost" onClick={()=>del(a.id)}>Delete</button></td></tr>
          ))}
        </tbody></table>
      )}

      {editing ? (
        <div>
          <div className="form-row"><input className="input" placeholder="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></div>
          <div className="form-row"><input className="input" placeholder="Genre" value={form.genre} onChange={(e)=>setForm({...form,genre:e.target.value})} /></div>
          <div className="form-row"><input className="input" placeholder="Image URL" value={form.image_url} onChange={(e)=>setForm({...form,image_url:e.target.value})} /></div>
          <div className="form-row"><textarea className="input" placeholder="Description" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></div>
          <div className="form-row"><button className="button" onClick={save}>Save</button> <button className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div>
        </div>
      ) : null}
    </div>
  );
}
