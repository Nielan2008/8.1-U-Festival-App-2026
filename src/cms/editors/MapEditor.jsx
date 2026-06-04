import React, { useEffect, useState } from 'react';
import './../../cms/cms.css';

export default function MapEditor(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:'',lat:'',lng:'',type:'',description:{nl:'',en:''}});
  const [msg,setMsg]=useState(null);
  const [migrated,setMigrated]=useState(false);
  const [undoStack,setUndoStack]=useState([]);
  const availableIcons = [
    '/marker_stage1_ponton.svg',
    '/marker_stage2_the_lake.svg',
    '/marker_stage3_the_club.svg',
    '/marker_stage4_hangar.svg',
    '/marker_bar.svg',
    '/marker_food.svg'
  ];
  const load=()=>{setLoading(true);fetch('/api/map',{credentials:'include'}).then(r=>r.json()).then(setItems).catch(()=>setMsg({error:'Failed'})).finally(()=>setLoading(false))}
  useEffect(()=>{load()},[]);
  const migrateCoords = async () => {
    setMsg({success:'Starting migration...'});
    try {
      const svgText = await fetch('/kaart_festival_no_markers.svg').then(r=>r.text());
      const vbMatch = svgText.match(/viewBox="([0-9\.\-\s]+)"/);
      const vb = vbMatch ? vbMatch[1].split(/\s+/).map(Number) : null;
      if (!vb) throw new Error('SVG viewBox not found');
      const lats = items.map(i=>Number(i.lat)).filter(Boolean);
      const lngs = items.map(i=>Number(i.lng)).filter(Boolean);
      if (lats.length < 2 || lngs.length < 2) throw new Error('Not enough lat/lng data to estimate bounds');
      const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const vbw = vb[2], vbh = vb[3];
      for (const it of items) {
        if ((it.x === undefined || it.y === undefined || it.x === null || it.y === null || it.x === '') && it.lat && it.lng) {
          const lat = Number(it.lat), lng = Number(it.lng);
          const x = ((lng - minLng) / (maxLng - minLng)) * vbw;
          const y = ((maxLat - lat) / (maxLat - minLat)) * vbh;
          const payload = {...it, x: Math.round(x), y: Math.round(y)};
          await fetch(`/api/map/${it.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), credentials:'include' });
        }
      }
      setMsg({success:'Migration completed'});
      load();
      setMigrated(true);
    } catch (e) { setMsg({error:String(e)}); }
  };

  // auto-run migration once if items lack x/y but have lat/lng
  useEffect(()=>{
    if (migrated) return;
    if (!loading && items.length > 0) {
      const needs = items.some(it=>it.lat && it.lng && (it.x === undefined || it.x === '' || it.y === undefined || it.y === ''));
      if (needs) {
        migrateCoords();
      }
    }
  },[loading,items,migrated]);
  useEffect(()=>{
    if (!editing) return;
    const el = document.getElementById('cms-map-canvas');
    if (!el) return;
    fetch('/kaart_festival_no_markers.svg').then(r=>r.text()).then((txt)=>{
      el.innerHTML = txt;
      const svg = el.querySelector('svg');
      const vb = svg && svg.getAttribute('viewBox') ? svg.getAttribute('viewBox').split(/\s+/).map(Number) : null;
      const rect = el.getBoundingClientRect();
      // render existing items as draggable markers on top of the svg
      let markersLayer = el.querySelector('#cms-markers-layer');
      if (!markersLayer) {
        markersLayer = document.createElement('div');
        markersLayer.id = 'cms-markers-layer';
        markersLayer.style.position = 'absolute';
        markersLayer.style.left = '0';
        markersLayer.style.top = '0';
        markersLayer.style.width = '100%';
        markersLayer.style.height = '100%';
        markersLayer.style.pointerEvents = 'none';
        el.appendChild(markersLayer);
      }
      markersLayer.innerHTML = '';
      items.forEach((it)=>{
        const mark = document.createElement('img');
        mark.src = it.icon || '/marker_stage1_ponton.svg';
        mark.style.position = 'absolute';
        mark.style.width = '36px';
        mark.style.height = '36px';
        mark.style.transform = 'translate(-50%,-50%)';
        mark.style.pointerEvents = 'auto';
        mark.dataset.id = it.id;
        // compute pixel position
        const r = el.getBoundingClientRect();
        let relX = 0, relY = 0;
        if (it.x !== undefined && it.y !== undefined && vb) {
          relX = (it.x / vb[2]) * r.width;
          relY = (it.y / vb[3]) * r.height;
        } else if (it.lat && it.lng && vb) {
          // estimate from lat/lng bounding box
          const lats = items.map(i=>Number(i.lat)).filter(Boolean);
          const lngs = items.map(i=>Number(i.lng)).filter(Boolean);
          if (lats.length >= 2 && lngs.length >= 2) {
            const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
            const x = ((Number(it.lng) - minLng) / (maxLng - minLng)) * vb[2];
            const y = ((maxLat - Number(it.lat)) / (maxLat - minLat)) * vb[3];
            relX = (x / vb[2]) * r.width;
            relY = (y / vb[3]) * r.height;
          }
        }
        mark.style.left = `${relX}px`;
        mark.style.top = `${relY}px`;
        markersLayer.appendChild(mark);

        // make marker clickable to edit and draggable to reposition
        mark.addEventListener('pointerdown', (ev)=>{
          ev.preventDefault();
          const id = mark.dataset.id;
          // select this item for editing
          const found = items.find(x=>String(x.id) === String(id));
          if (found) {
            setEditing(found.id);
            setForm({name:found.name||'',lat:found.lat||'',lng:found.lng||'',x:found.x||'',y:found.y||'',type:found.type||'',description:normalizeDescription(found.description||''),icon:found.icon||''});
          }
          let dragging = true;
          const move = (m) => {
            if (!dragging) return;
            const clientX = m.clientX || (m.touches && m.touches[0].clientX);
            const clientY = m.clientY || (m.touches && m.touches[0].clientY);
            const r2 = el.getBoundingClientRect();
            let svgX = clientX - r2.left;
            let svgY = clientY - r2.top;
            if (vb) {
              svgX = (svgX / r2.width) * vb[2];
              svgY = (svgY / r2.height) * vb[3];
            }
            mark.style.left = `${clientX - r2.left}px`;
            mark.style.top = `${clientY - r2.top}px`;
            // update form preview for the dragged item
            setForm((f)=>({...f, x: Math.round(svgX), y: Math.round(svgY), icon: it.icon || f.icon}));
          };
          const up = async ()=>{
            dragging = false;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            // persist new coordinates for this item
            try{
              const payload = {...it, x: Number(form.x) || it.x, y: Number(form.y) || it.y};
              await fetch(`/api/map/${it.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), credentials:'include' });
              setMsg({success:'Marker moved'});
              load();
            }catch(e){ setMsg({error:String(e)}); }
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
      });
      // create overlay preview element for dropped icon
      let preview = el.querySelector('#cms-drop-preview');
      if (!preview) {
        preview = document.createElement('img');
        preview.id = 'cms-drop-preview';
        preview.style.position = 'absolute';
        preview.style.width = '40px';
        preview.style.height = '40px';
        preview.style.transform = 'translate(-50%,-50%)';
        preview.style.pointerEvents = 'auto';
        preview.style.display = 'none';
        el.appendChild(preview);
      }

      const setPreviewPos = (clientX, clientY) => {
        const r = el.getBoundingClientRect();
        const relX = clientX - r.left;
        const relY = clientY - r.top;
        let svgX = relX;
        let svgY = relY;
        if (vb) {
          const vbw = vb[2];
          const vbh = vb[3];
          svgX = (relX / r.width) * vbw;
          svgY = (relY / r.height) * vbh;
        }
        preview.style.left = `${relX}px`;
        preview.style.top = `${relY}px`;
        preview.style.display = 'block';
        setForm((f)=>({...f,x:Math.round(svgX),y:Math.round(svgY)}));
      };

      // if editing existing and form contains x/y/icon, show preview at that spot
      if (form && form.x && form.y && form.icon) {
        preview.src = form.icon;
        const r = el.getBoundingClientRect();
        if (vb) {
          const vbw = vb[2];
          const vbh = vb[3];
          const relX = (form.x / vbw) * r.width;
          const relY = (form.y / vbh) * r.height;
          preview.style.left = `${relX}px`;
          preview.style.top = `${relY}px`;
          preview.style.display = 'block';
        }
      }

      let draggingPreview = false;
      const onDrop = (ev) => {
        ev.preventDefault();
        const icon = ev.dataTransfer.getData('application/x-icon') || ev.dataTransfer.getData('text/plain');
        if (!icon) return;
        preview.src = icon;
        setPreviewPos(ev.clientX, ev.clientY);
        // make preview draggable to fine-tune and remember chosen icon
        draggingPreview = true;
        setForm((f)=>({...f, icon}));
      };

      const onDragOver = (ev) => { ev.preventDefault(); };

      const onMove = (ev) => {
        if (!draggingPreview) return;
        const clientX = ev.clientX || (ev.touches && ev.touches[0].clientX);
        const clientY = ev.clientY || (ev.touches && ev.touches[0].clientY);
        setPreviewPos(clientX, clientY);
      };

      const onEnd = (ev) => {
        if (!draggingPreview) return;
        draggingPreview = false;
        // finalize position already set in setForm
      };

      el.addEventListener('dragover', onDragOver);
      el.addEventListener('drop', onDrop);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);

      return ()=>{
        el.removeEventListener('dragover', onDragOver);
        el.removeEventListener('drop', onDrop);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
        if (preview && preview.parentNode) preview.parentNode.removeChild(preview);
      };
    }).catch(()=>{});
  },[editing, form]);
  const normalizeDescription=(desc)=>{if(!desc)return {nl:'',en:''};if(typeof desc==='string'){try{const p=JSON.parse(desc);if(p&&typeof p==='object')return {nl:p.nl||'',en:p.en||''}}catch(_){return {nl:desc,en:''}}}if(typeof desc==='object')return {nl:desc.nl||'',en:desc.en||''};return {nl:'',en:''}}
  const onAdd=()=>{setEditing('new');setForm({name:'',lat:'',lng:'',x:'',y:'',type:'',description:{nl:'',en:''}})}
  const onEdit=(it)=>{setEditing(it.id);setForm({name:it.name,lat:it.lat,lng:it.lng,x:it.x||'',y:it.y||'',type:it.type,description:normalizeDescription(it.description)})}
  const save=async()=>{try{const url=editing==='new'?'/api/map':`/api/map/${editing}`;const method=editing==='new'?'POST':'PUT';const payload={...form,description:JSON.stringify(form.description)};const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'include'});if(!r.ok)throw new Error('save failed');setMsg({success:'Saved'});setEditing(null);load()}catch(e){setMsg({error:String(e)})}}
  const del=async(id)=>{if(!window.confirm('Delete?'))return;await fetch(`/api/map/${id}`,{method:'DELETE',credentials:'include'});setMsg({success:'Deleted'});load()}
  return (
    <div className="cms-container cms-shell">
      <div className="cms-top"><h3>Map Points</h3><div><button className="button" onClick={onAdd}>Add New</button> <button className="button ghost" onClick={migrateCoords} style={{marginLeft:8}}>Migrate coords</button></div></div>
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
        <div className="form-row"><input className="input" placeholder="X (SVG)" value={form.x||''} readOnly /></div>
        <div className="form-row"><input className="input" placeholder="Y (SVG)" value={form.y||''} readOnly /></div>
        <div className="form-row"><input className="input" placeholder="Type" value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})} /></div>
        <div className="form-row"><textarea className="input" placeholder="Description NL" value={form.description.nl} onChange={(e)=>setForm({...form,description:{...form.description,nl:e.target.value}})} /></div>
        <div className="form-row"><textarea className="input" placeholder="Description EN" value={form.description.en} onChange={(e)=>setForm({...form,description:{...form.description,en:e.target.value}})} /></div>
        <div className="form-row">
          <div style={{display:'flex',gap:12,alignItems:'flex-start',width:'100%'}}>
            <div style={{width:220}}>
              <p style={{margin:'0 0 8px 0'}}>Drag an icon onto the map to place it:</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {availableIcons.map((ic)=> (
                  <img key={ic} src={ic} draggable onDragStart={(e)=>{e.dataTransfer.setData('application/x-icon', ic);}} style={{width:48,height:48,borderRadius:8,background:'#071826',padding:6}} alt="icon" />
                ))}
              </div>
              <p style={{margin:'8px 0 0 0',fontSize:13,color:'var(--muted)'}}>After dropping, drag the preview to fine-tune position. Click Save to persist X/Y.</p>
            </div>
            <div style={{flex:1}}>
              <p style={{margin:0}}>Click or drop on the map below to set the SVG X/Y coordinates for this point.</p>
              <div id="cms-map-canvas" style={{height:320,marginTop:8,borderRadius:12,overflow:'hidden',background:'#071018'}} dangerouslySetInnerHTML={{__html:''}} />
            </div>
          </div>
        </div>
        <div className="form-row"><button className="button" onClick={save}>Save</button> <button className="button ghost" onClick={()=>setEditing(null)}>Cancel</button></div>
      </div>):null}
    </div>
  )
}
