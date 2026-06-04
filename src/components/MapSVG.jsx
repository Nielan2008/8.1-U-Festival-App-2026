import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './map-svg.css';

// Low-level map SVG renderer.
// Supports panning, zooming, marker positioning, popups, and GPS point rendering.

function parseViewBox(svgText) {
  const m = svgText.match(/viewBox="([0-9\.\-\s]+)"/);
  if (m && m[1]) {
    const parts = m[1].split(/\s+/).map(Number);
    return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
  }
  return null;
}

function addPreserveAspectRatio(svgText) {
  return svgText.replace(/<svg([^>]*?)>/, (match, attrs) => {
    if (/preserveAspectRatio=/i.test(match)) return match;
    return `<svg${attrs} preserveAspectRatio="xMinYMin meet">`;
  });
}

export default React.forwardRef(function MapSVG({ svgUrl, locations = [], stageEvents = [], position, onOpenArtist = () => {} }, ref) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [svgText, setSvgText] = useState(null);
  const [svgError, setSvgError] = useState(false);
  const [viewBox, setViewBox] = useState({ width: 1000, height: 600 });
  const [baseScale, setBaseScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const dragging = useRef(false);
  const lastPos = useRef([0, 0]);
  const pinch = useRef(null);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    setSvgError(false);
    fetch(svgUrl)
      .then((r) => {
        if (!r.ok) throw new Error('SVG fetch failed');
        return r.text();
      })
      .then((text) => {
        const svgWithAspect = addPreserveAspectRatio(text);
        setSvgText(svgWithAspect);
        const vb = parseViewBox(svgWithAspect);
        if (vb) setViewBox({ width: vb.width, height: vb.height });
      })
      .catch(() => {
        setSvgError(true);
      });
  }, [svgUrl]);

  useEffect(() => {
    const updateBaseScale = () => {
      if (!containerRef.current || !viewBox.width || !viewBox.height) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
      const newBase = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
      setBaseScale(newBase || 1);
    };
    updateBaseScale();
    window.addEventListener('resize', updateBaseScale);
    return () => window.removeEventListener('resize', updateBaseScale);
  }, [viewBox]);

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

  const actualScale = useMemo(() => baseScale * scale, [baseScale, scale]);
  const screenPosition = useCallback((pt) => ({ left: pt.x * actualScale, top: pt.y * actualScale }), [actualScale]);

  useImperativeHandle(ref, () => ({
    centerOnCoords(lat, lng) {
      const pt = toSvgPoint(Number(lat), Number(lng));
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      setTx(cx - pt.x * actualScale);
      setTy(cy - pt.y * actualScale);
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
    const ev = stageEvents.find((s) => {
      if (loc.id && s.id && loc.id === s.id) return true;
      if (loc.name && (s.stage === loc.name || s.stage === loc.label || s.stage === loc.id)) return true;
      return false;
    });
    setPopup({ loc, x: screen.left, y: screen.top, event: ev });
  };

  useEffect(() => {
    const onClickOutside = () => setPopup(null);
    window.addEventListener('click', onClickOutside);
    return () => window.removeEventListener('click', onClickOutside);
  }, []);

  return (
    <div className="map-svg-container" ref={containerRef} onMouseDown={onPointerDown} onTouchStart={onPointerDown} onTouchMove={onTouchMove}>
      {svgText && !svgError ? (
        <div className="map-svg-viewport" style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }} dangerouslySetInnerHTML={{ __html: svgText }} ref={svgRef} />
      ) : (
        <div className="map-fallback">
          <div className="map-fallback-text">{svgError ? t('map.errorLoadingSvg') : t('map.loadingSvg')}</div>
        </div>
      )}
      {/* markers layer (does not scale) */}
      <div className="map-markers" style={{ transform: `translate(${tx}px, ${ty}px)` }}>
        {locations.map((loc) => {
          const pt = project(loc);
          const screen = { left: pt.x * actualScale, top: pt.y * actualScale };
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
          const rawLeft = pt.x * actualScale + tx;
          const rawTop = pt.y * actualScale + ty;
          const clampedLeft = Math.min(Math.max(rawLeft, 12), containerSize.width ? containerSize.width - 12 : rawLeft);
          const clampedTop = Math.min(Math.max(rawTop, 12), containerSize.height ? containerSize.height - 12 : rawTop);
          const isOutOfBounds = rawLeft < 0 || rawLeft > (containerSize.width || 0) || rawTop < 0 || rawTop > (containerSize.height || 0);
          const localLeft = clampedLeft - tx;
          const localTop = clampedTop - ty;
          return (
            <div
              className={`map-gps-dot ${isOutOfBounds ? 'out-of-bounds' : ''}`}
              style={{ left: `${localLeft}px`, top: `${localTop}px` }}
              title={isOutOfBounds ? t('map.gpsOffscreen') : t('map.gpsOnscreen')}
            />
          );
        })() : null}
      </div>

      {popup ? (
        <div className="map-popup" style={{ left: popup.x + 12, top: popup.y - 6 }} onClick={(e) => e.stopPropagation()}>
          <strong>{(typeof popup.loc.label === 'object' ? (popup.loc.label.en || popup.loc.label.nl) : popup.loc.label) || popup.loc.name}</strong>
          <div className="popup-row">
            {popup.event?.current ? (
              <span className="now">{t('map.popupNow')}: {popup.event.current.title}</span>
            ) : (
              <span>{t('map.popupNone')}</span>
            )}
          </div>
          {popup.event?.next ? (
            <div className="popup-row">{t('map.popupNext')}: {popup.event.next.title} ({popup.event.next.start})</div>
          ) : null}
          {popup.event?.current?.id ? (
            <button type="button" className="map-popup-action" onClick={() => onOpenArtist(popup.event.current.id)}>
              {t('map.openArtist')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
