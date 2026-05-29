import React, { useEffect, useState } from 'react';
import './../../cms/cms.css';

export default function NewsEditor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', image_url: '' });
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch('/api/news', { credentials: 'include' }).then(r => r.json()).then(setItems).catch(() => setMsg({error:'Failed'})).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onAdd = () => { setEditing('new'); setForm({ title:'', body:'', image_url:'' }); };
  const onEdit = (a) => { setEditing(a.id); setForm({ title:a.title, body:a.body, image_url:a.image_url }); };

  const save = async () => {
    try {
      const url = editing === 'new' ? '/api/news' : `/api/news/${editing}`;
      const method = editing === 'new' ? 'POST' : 'PUT';
      const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form), credentials:'include' });
      if (!r.ok) throw new Error('save failed');
      setMsg({success:'Saved'});
      setEditing(null);
      load();
    } catch (e) { setMsg({error:String(e)}); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await fetch(`/api/news/${id}`, { method:'DELETE', credentials:'include' });
    setMsg({success:'Deleted'});
    load();
  };

  return (
    <div className="cms-container cms-shell">
      <div className="cms-top"><h3>News</h3><div><button className="button" onClick={onAdd}>Add New</button></div></div>
      {msg?.success && <div className="message success">{msg.success}</div>}
      {msg?.error && <div className="message error">{String(msg.error)}</div>}
      {loading ? <div className="spinner"/> : (
        <table className="cms-table"><thead><tr><th>Title</th><th/></tr></thead><tbody>
          {items.map(a=> (
            <tr key={a.id}><td>{a.title}</td><td><button className="button ghost" onClick={()=>onEdit(a)}>Edit</button> <button className="button ghost" onClick={()=>del(a.id)}>Delete</button></td></tr>
          ))}
        </tbody></table>
      )}

      {editing ? (
        <div>
          <div className="form-row"><input className="input" placeholder="Title" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} /></div>
          <div className="form-row"><input className="input" placeholder="Image URL" value={form.image_url} onChange={(e)=>setForm({...form,image_url:e.target.value})} /></div>
          <div className="form-row"><textarea className="input" placeholder="Body" value={form.body} onChange={(e)=>setForm({...form,body:e.target.value})} /></div>
          <div className="form-row"><button className="button" onClick={save}>Save</button> <button className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div>
        </div>
      ) : null}
    </div>
  );
}
