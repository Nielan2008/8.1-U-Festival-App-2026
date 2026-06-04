import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import './map-svg.css';

function parseViewBox(svgText) {
  const m = svgText.match(/viewBox="([0-9\.\-\s]+)"/);
  if (m && m[1]) {
    const parts = m[1].split(/\s+/).map(Number);
    return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
  }
  return null;
}

export default React.forwardRef(function MapSVG({ svgUrl, locations = [], stageEvents = [], position }, ref) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [svgText, setSvgText] = useState(null);
  const [viewBox, setViewBox] = useState({ width: 1000, height: 600 });
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragging = useRef(false);
  const lastPos = useRef([0, 0]);
  const pinch = useRef(null);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    fetch(svgUrl).then((r) => r.text()).then((text) => {
      setSvgText(text);
      const vb = parseViewBox(text);
      if (vb) setViewBox({ width: vb.width, height: vb.height });
    }).catch(() => {});
  }, [svgUrl]);

  useEffect(() => {
    const onWheel = (e) => {
      if (!containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      const newScale = Math.max(0.5, Math.min(4, scale * (1 + delta)));
      const k = newScale / scale;
      setScale(newScale);
      // adjust translate so zoom focuses on mouse
      setTx((s) => mx - k * (mx - s));
      setTy((s) => my - k * (my - s));
    };
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', onWheel, { passive: false });
    return () => { if (el) el && el.removeEventListener('wheel', onWheel); };
  }, [scale]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const [lx, ly] = lastPos.current;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = cx - lx;
      const dy = cy - ly;
      lastPos.current = [cx, cy];
      setTx((v) => v + dx);
      setTy((v) => v + dy);
    };
    const onUp = () => { dragging.current = false; pinch.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const toSvgPoint = useCallback((lat, lng) => {
    // If locations include numeric x/y, prefer them. Otherwise map lat/lng bounding box to svg viewBox.
    // Calculate bounding box from provided locations lat/lng
    const lats = locations.map((l) => Number(l.lat)).filter(Boolean);
    const lngs = locations.map((l) => Number(l.lng)).filter(Boolean);
    if (lats.length >= 2 && lngs.length >= 2) {
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const x = ((lng - minLng) / (maxLng - minLng)) * viewBox.width;
      const y = ((maxLat - lat) / (maxLat - minLat)) * viewBox.height;
      return { x, y };
    }
    return { x: 0, y: 0 };
  }, [locations, viewBox]);

  const project = useCallback((loc) => {
    if (loc.x !== undefined && loc.y !== undefined) return { x: Number(loc.x), y: Number(loc.y) };
    if (loc.lat !== undefined && loc.lng !== undefined) return toSvgPoint(Number(loc.lat), Number(loc.lng));
    return { x: 0, y: 0 };
  }, [toSvgPoint]);

  const screenPosition = useCallback((pt) => ({ left: pt.x * scale + tx, top: pt.y * scale + ty }), [scale, tx, ty]);

  useImperativeHandle(ref, () => ({
    centerOnCoords(lat, lng) {
      const pt = toSvgPoint(Number(lat), Number(lng));
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      setTx(cx - pt.x * scale);
      setTy(cy - pt.y * scale);
    }
  }));

  const onPointerDown = (e) => {
    const isTouch = e.touches && e.touches.length;
    if (isTouch && e.touches.length === 2) {
      // pinch start
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      pinch.current = { dist: Math.hypot(dx, dy), cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2 };
      lastPos.current = [pinch.current.cx, pinch.current.cy];
      dragging.current = true;
      return;
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastPos.current = [clientX, clientY];
    dragging.current = true;
  };

  const onTouchMove = (e) => {
    if (!dragging.current) return;
    if (e.touches && e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const dist = Math.hypot(dx, dy);
      const k = dist / pinch.current.dist;
      const newScale = Math.max(0.5, Math.min(4, scale * k));
      // zoom around center
      const rect = containerRef.current.getBoundingClientRect();
      const cx = (a.clientX + b.clientX) / 2 - rect.left;
      const cy = (a.clientY + b.clientY) / 2 - rect.top;
      const ratio = newScale / scale;
      setScale(newScale);
      setTx((s) => cx - ratio * (cx - s));
      setTy((s) => cy - ratio * (cy - s));
      pinch.current.dist = dist;
      pinch.current.cx = (a.clientX + b.clientX) / 2;
      pinch.current.cy = (a.clientY + b.clientY) / 2;
      return;
    }
    // otherwise pan handled globally
  };

  const handleMarkerClick = (loc, e) => {
    e.stopPropagation();
    const pt = project(loc);
    const screen = screenPosition(pt);
    const ev = stageEvents.find((s) => (s.id || s.name) === (loc.id || loc.name) || (s.label && (s.label.en === loc.label?.en || s.label.nl === loc.label?.nl)));
    setPopup({ loc, x: screen.left, y: screen.top, event: ev });
  };

  useEffect(() => {
    const onClickOutside = () => setPopup(null);
    window.addEventListener('click', onClickOutside);
    return () => window.removeEventListener('click', onClickOutside);
  }, []);

  return (
    <div className="map-svg-container" ref={containerRef} onMouseDown={onPointerDown} onTouchStart={onPointerDown} onTouchMove={onTouchMove}>
      <div className="map-svg-viewport" style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }} dangerouslySetInnerHTML={svgText ? { __html: svgText } : undefined} ref={svgRef} />
      {/* markers layer (does not scale) */}
      <div className="map-markers" style={{ transform: `translate(${tx}px, ${ty}px)` }}>
        {locations.map((loc) => {
          const pt = project(loc);
          const screen = { left: pt.x * scale, top: pt.y * scale };
          const ev = stageEvents.find((s) => (s.id || s.name) === (loc.id || loc.name) || (s.label && (s.label.en === loc.label?.en || s.label.nl === loc.label?.nl)));
          return (
            <button
              key={loc.id || loc.name}
              className={`map-marker ${ev && ev.current ? 'now' : ''}`}
              style={{ left: `${screen.left}px`, top: `${screen.top}px` }}
              onClick={(e) => handleMarkerClick(loc, e)}
              aria-label={loc.label?.en || loc.label?.nl || loc.name}
            >
              <img src={(loc.icon)||'/marker_stage1_ponton.svg'} alt="marker" />
            </button>
          );
        })}
        {position ? (() => {
          const pt = toSvgPoint(position.lat, position.lng);
          const screen = { left: pt.x * scale, top: pt.y * scale };
          return <div className="map-gps-dot" style={{ left: `${screen.left}px`, top: `${screen.top}px` }} />;
        })() : null}
      </div>

      {popup ? (
        <div className="map-popup" style={{ left: popup.x + 12, top: popup.y - 6 }} onClick={(e)=>e.stopPropagation()}>
          <strong>{(typeof popup.loc.label === 'object' ? (popup.loc.label.nl || popup.loc.label.en) : popup.loc.label) || popup.loc.name}</strong>
          <div className="popup-row">{popup.event?.current ? <span className="now">Nu: {popup.event.current.title}</span> : <span>Geen act nu</span>}</div>
          {popup.event?.next ? <div className="popup-row">Volgende: {popup.event.next.title} ({popup.event.next.start})</div> : null}
        </div>
      ) : null}
    </div>
  );
});
