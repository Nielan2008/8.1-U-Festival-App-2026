import React, { useEffect, useState } from 'react';
import './../../cms/cms.css';

// CMS editor for news items shown on the home page.
// Supports multilingual title and body in NL and EN.
// Uses authenticated POST/PUT/DELETE requests to update content.
export default function NewsEditor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: { nl:'', en:'' }, body: { nl:'', en:'' }, image_url: '' });
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch('/api/news', { credentials: 'include' }).then(r => r.json()).then(setItems).catch(() => setMsg({error:'Failed'})).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const normalizeTitle = (title) => {
    if (!title) return { nl:'', en:'' };
    if (typeof title === 'string') return { nl: title, en: '' };
    if (typeof title === 'object') return { nl: title.nl ?? '', en: title.en ?? '' };
    return { nl:'', en:'' };
  };

  const normalizeBody = (body) => {
    if (!body) return { nl:'', en:'' };
    if (typeof body === 'string') return { nl: body, en: '' };
    if (typeof body === 'object') return { nl: body.nl ?? '', en: body.en ?? '' };
    return { nl:'', en:'' };
  };

  const onAdd = () => { setEditing('new'); setForm({ title: { nl:'', en:'' }, body: { nl:'', en:'' }, image_url: '' }); };
  const onEdit = (a) => { setEditing(a.id); setForm({ title: normalizeTitle(a.title), body: normalizeBody(a.body), image_url: a.image_url }); };

  const save = async () => {
    try {
      const url = editing === 'new' ? '/api/news' : `/api/news/${editing}`;
      const method = editing === 'new' ? 'POST' : 'PUT';
      const payload = { 
        title: JSON.stringify(form.title), 
        body: JSON.stringify(form.body), 
        image_url: form.image_url 
      };
      const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), credentials:'include' });
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
        <table className="cms-table"><thead><tr><th>Title (EN)</th><th>Preview</th><th/></tr></thead><tbody>
          {items.map(a=> {
            const title = typeof a.title === 'object' ? (a.title.en || a.title.nl || '') : (a.title || '');
            const body = typeof a.body === 'object' ? (a.body.en || a.body.nl || '') : (a.body || '');
            return (<tr key={a.id}><td>{title}</td><td className="small">{body.substring(0, 50)}...</td><td><button className="button ghost" onClick={()=>onEdit(a)}>Edit</button> <button className="button ghost" onClick={()=>del(a.id)}>Delete</button></td></tr>)
          })}
        </tbody></table>
      )}

      {editing ? (
        <div>
          <div style={{marginBottom:'16px',paddingBottom:'12px',borderBottom:'1px solid var(--border)'}}>
            <h4 style={{margin:'0 0 12px 0',color:'var(--text)'}}>Title</h4>
            <div className="form-row"><input className="input" placeholder="Title (NL)" value={form.title.nl} onChange={(e)=>setForm({...form,title:{...form.title,nl:e.target.value}})} /></div>
            <div className="form-row"><input className="input" placeholder="Title (EN)" value={form.title.en} onChange={(e)=>setForm({...form,title:{...form.title,en:e.target.value}})} /></div>
          </div>
          <div style={{marginBottom:'16px',paddingBottom:'12px',borderBottom:'1px solid var(--border)'}}>
            <h4 style={{margin:'0 0 12px 0',color:'var(--text)'}}>Body</h4>
            <div className="form-row"><textarea className="input" placeholder="Body (NL)" value={form.body.nl} onChange={(e)=>setForm({...form,body:{...form.body,nl:e.target.value}})} style={{minHeight:'120px'}} /></div>
            <div className="form-row"><textarea className="input" placeholder="Body (EN)" value={form.body.en} onChange={(e)=>setForm({...form,body:{...form.body,en:e.target.value}})} style={{minHeight:'120px'}} /></div>
          </div>
          <div className="form-row"><input className="input" placeholder="Image URL" value={form.image_url} onChange={(e)=>setForm({...form,image_url:e.target.value})} /></div>
          <div className="form-row"><button className="button" onClick={save}>Save</button> <button className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div>
        </div>
      ) : null}
    </div>
  );
}
