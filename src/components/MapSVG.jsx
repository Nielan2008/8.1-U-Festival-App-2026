import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './map-svg.css';

// Enhanced map SVG renderer with GPS anchor mapping, pan/zoom, clamping, and interactive popups.
// Supports flexible coordinate transformation using real-world GPS anchor points.

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

// GPS anchor based coordinate transformation
// Uses 2+ anchor points to map real-world GPS coordinates to SVG pixel space
function createGpsTransform(anchors) {
  if (!anchors || anchors.length < 2) return null;

  // Sort anchors by lat (north-south)
  const sorted = [...anchors].sort((a, b) => b.lat - a.lat);
  
  return {
    latToSvgY: (lat) => {
      const a1 = sorted[0];
      const a2 = sorted[sorted.length - 1];
      if (a1.lat === a2.lat) return (a1.svg_y + a2.svg_y) / 2;
      return a1.svg_y + ((lat - a1.lat) / (a2.lat - a1.lat)) * (a2.svg_y - a1.svg_y);
    },
    lngToSvgX: (lng) => {
      const byLng = [...anchors].sort((a, b) => a.lng - b.lng);
      const a1 = byLng[0];
      const a2 = byLng[byLng.length - 1];
      if (a1.lng === a2.lng) return (a1.svg_x + a2.svg_x) / 2;
      return a1.svg_x + ((lng - a1.lng) / (a2.lng - a1.lng)) * (a2.svg_x - a1.svg_x);
    }
  };
}

export default React.forwardRef(function MapSVG(
  { svgUrl, locations = [], stageEvents = [], position, anchors = [], onOpenArtist = () => {} },
  ref
) {
  const { t, i18n } = useTranslation();
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

  // Load SVG
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
      .catch(() => setSvgError(true));
  }, [svgUrl]);

  // Calculate base scale to fit map in container
  useEffect(() => {
    const updateBaseScale = () => {
      if (!containerRef.current || !viewBox.width || !viewBox.height) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
      const newBase = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
      setBaseScale(newBase || 1);
      // Reset pan on resize to keep map centered
      setTx(0);
      setTy(0);
      setScale(1);
    };
    updateBaseScale();
    window.addEventListener('resize', updateBaseScale);
    return () => window.removeEventListener('resize', updateBaseScale);
  }, [viewBox]);

  const actualScale = useMemo(() => baseScale * scale, [baseScale, scale]);

  // GPS coordinate transformation
  const gpsTransform = useMemo(() => createGpsTransform(anchors), [anchors]);

  const toSvgPoint = useCallback((lat, lng) => {
    if (gpsTransform) {
      return {
        x: gpsTransform.lngToSvgX(lng),
        y: gpsTransform.latToSvgY(lat)
      };
    }
    // Fallback: estimate from bounding box of locations
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
  }, [gpsTransform, locations, viewBox]);

  const project = useCallback((loc) => {
    if (loc.x !== undefined && loc.y !== undefined) {
      return { x: Number(loc.x), y: Number(loc.y) };
    }
    if (loc.lat !== undefined && loc.lng !== undefined) {
      return toSvgPoint(Number(loc.lat), Number(loc.lng));
    }
    return { x: 0, y: 0 };
  }, [toSvgPoint]);

  const screenPosition = useCallback((pt) => ({
    left: pt.x * actualScale + tx,
    top: pt.y * actualScale + ty
  }), [actualScale, tx, ty]);

  // Clamp pan translation so map background never leaves screen
  const clampTranslation = useCallback((newTx, newTy, newScale) => {
    const s = newScale || scale;
    const mapWidth = viewBox.width * baseScale * s;
    const mapHeight = viewBox.height * baseScale * s;
    const containerW = containerSize.width || 0;
    const containerH = containerSize.height || 0;

    // Clamp so map fills screen and never has empty space
    const maxTx = Math.max(0, mapWidth - containerW);
    const maxTy = Math.max(0, mapHeight - containerH);

    const clampedTx = Math.min(Math.max(newTx, -maxTx), 0);
    const clampedTy = Math.min(Math.max(newTy, -maxTy), 0);

    return { tx: clampedTx, ty: clampedTy };
  }, [scale, viewBox, baseScale, containerSize]);

  // Wheel zoom
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
      setTx((prevTx) => {
        const newTx = mx - k * (mx - prevTx);
        return clampTranslation(newTx, ty, newScale).tx;
      });
      setTy((prevTy) => {
        const newTy = my - k * (my - prevTy);
        return clampTranslation(tx, newTy, newScale).ty;
      });
    };
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      if (el) el.removeEventListener('wheel', onWheel);
    };
  }, [scale, tx, ty, clampTranslation]);

  // Pan gestures
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const [lx, ly] = lastPos.current;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = cx - lx;
      const dy = cy - ly;
      lastPos.current = [cx, cy];

      setTx((prevTx) => {
        const newTx = prevTx + dx;
        return clampTranslation(newTx, ty, scale).tx;
      });
      setTy((prevTy) => {
        const newTy = prevTy + dy;
        return clampTranslation(tx, newTy, scale).ty;
      });
    };
    const onUp = () => {
      dragging.current = false;
      pinch.current = null;
    };
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
  }, [scale, tx, ty, clampTranslation]);

  const onPointerDown = (e) => {
    const isTouch = e.touches && e.touches.length;
    if (isTouch && e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      pinch.current = {
        dist: Math.hypot(dx, dy),
        cx: (a.clientX + b.clientX) / 2,
        cy: (a.clientY + b.clientY) / 2
      };
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
      const rect = containerRef.current.getBoundingClientRect();
      const cx = (a.clientX + b.clientX) / 2 - rect.left;
      const cy = (a.clientY + b.clientY) / 2 - rect.top;
      const ratio = newScale / scale;
      setScale(newScale);
      setTx((prevTx) => {
        const newTx = cx - ratio * (cx - prevTx);
        return clampTranslation(newTx, ty, newScale).tx;
      });
      setTy((prevTy) => {
        const newTy = cy - ratio * (cy - prevTy);
        return clampTranslation(tx, newTy, newScale).ty;
      });
      pinch.current.dist = dist;
      return;
    }
  };

  // Handle marker click to show stage popup
  const handleMarkerClick = (loc, e) => {
    e.stopPropagation();
    const pt = project(loc);
    const screen = screenPosition(pt);
    const event = stageEvents.find((s) => {
      if (loc.id && s.id && loc.id === s.id) return true;
      if (loc.name && (s.stage === loc.name || s.stage === loc.label)) return true;
      return false;
    });
    setPopup({ loc, x: screen.left, y: screen.top, event });
  };

  // Close popup on outside click
  useEffect(() => {
    const onClickOutside = () => setPopup(null);
    window.addEventListener('click', onClickOutside);
    return () => window.removeEventListener('click', onClickOutside);
  }, []);

  // Expose ref methods
  useImperativeHandle(ref, () => ({
    centerOnCoords(lat, lng) {
      const pt = toSvgPoint(Number(lat), Number(lng));
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const newTx = cx - pt.x * actualScale;
      const newTy = cy - pt.y * actualScale;
      const clamped = clampTranslation(newTx, newTy, scale);
      setTx(clamped.tx);
      setTy(clamped.ty);
    }
  }), [toSvgPoint, actualScale, scale, clampTranslation]);

  const localize = (label, lang) => {
    if (typeof label === 'string') return label;
    if (label && typeof label === 'object') return label[lang] || label.en || label.nl || '';
    return '';
  };

  return (
    <div className="map-svg-container" ref={containerRef} onMouseDown={onPointerDown} onTouchStart={onPointerDown} onTouchMove={onTouchMove}>
      {svgText && !svgError ? (
        <div className="map-svg-viewport" style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }} dangerouslySetInnerHTML={{ __html: svgText }} ref={svgRef} />
      ) : (
        <div className="map-fallback">
          <div className="map-fallback-text">{svgError ? t('map.errorLoadingSvg') : t('map.loadingSvg')}</div>
        </div>
      )}

      {/* Markers layer (positioned absolutely, stays on top, doesn't scale with map) */}
      <div className="map-markers" style={{ transform: `translate(${tx}px, ${ty}px)` }}>
        {locations.map((loc) => {
          const pt = project(loc);
          const screen = screenPosition(pt);
          const ev = stageEvents.find((s) => {
            if (loc.id && s.id && loc.id === s.id) return true;
            if (loc.stage === s.stage) return true;
            return false;
          });
          const isStage = loc.type === 'stage' || ['Ponton', 'The Lake', 'The Club', 'Hangar'].includes(loc.name);

          return (
            <button
              key={loc.id || loc.name}
              className={`map-marker ${ev?.current ? 'now-playing' : ''} ${isStage ? 'stage-marker' : 'poi-marker'}`}
              style={{ left: `${screen.left}px`, top: `${screen.top}px` }}
              onClick={(e) => handleMarkerClick(loc, e)}
              title={localize(loc.label || loc.name, i18n.language)}
            >
              {loc.icon ? (
                <img src={loc.icon} alt={localize(loc.label, i18n.language)} />
              ) : isStage ? (
                <div className="marker-number">{loc.name?.[0]?.toUpperCase() || ''}</div>
              ) : (
                <span>{loc.name?.[0]?.toUpperCase() || ''}</span>
              )}
            </button>
          );
        })}

        {/* User location GPS dot */}
        {position && (() => {
          const pt = toSvgPoint(position.lat, position.lng);
          const screen = screenPosition(pt);
          const clampRadius = 8;
          const clampedLeft = Math.min(Math.max(screen.left, clampRadius), containerSize.width ? containerSize.width - clampRadius : screen.left);
          const clampedTop = Math.min(Math.max(screen.top, clampRadius), containerSize.height ? containerSize.height - clampRadius : screen.top);
          const isOutOfBounds = screen.left < 0 || screen.left > (containerSize.width || 0) || screen.top < 0 || screen.top > (containerSize.height || 0);

          return (
            <div key="gps-dot" className={`map-gps-dot ${isOutOfBounds ? 'out-of-bounds' : ''}`} style={{ left: `${clampedLeft}px`, top: `${clampedTop}px` }} title={isOutOfBounds ? t('map.gpsOffscreen') : t('map.gpsOnscreen')} />
          );
        })()}
      </div>

      {/* Stage popup/bottom sheet */}
      {popup && (() => {
        const { loc, x, y, event } = popup;
        const isStage = ['Ponton', 'The Lake', 'The Club', 'Hangar'].includes(loc.name);

        if (!isStage) {
          // Simple label for POI
          return (
            <div key="popup" className="map-popup" style={{ left: `${x}px`, top: `${y}px` }}>
              <p className="popup-label">{localize(loc.label || loc.name, i18n.language)}</p>
            </div>
          );
        }

        // Stage popup with schedule
        const now = new Date();
        const allEvents = stageEvents.filter((s) => s.stage === loc.name || s.stage === loc.label);
        const current = allEvents.find((e) => e.startDate && e.endDate && e.startDate <= now && e.endDate > now);
        const next = allEvents.find((e) => e.startDate && e.startDate > now);

        const formatTime = (d) => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const timeUntil = (d) => {
          if (!d) return '';
          const ms = d - now;
          const mins = Math.floor(ms / 60000);
          const hrs = Math.floor(mins / 60);
          if (hrs > 0) return `${hrs}h ${mins % 60}m`;
          return `${mins}m`;
        };

        return (
          <div key="popup" className="map-stage-popup" style={{ left: `${x}px`, top: `${y}px` }} onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>{localize(loc.label || loc.name, i18n.language)}</h3>
              <button className="close-btn" onClick={() => setPopup(null)}>×</button>
            </div>
            {current ? (
              <div className="popup-section current">
                <p className="popup-label">{t('map.nowPlaying')}</p>
                <p className="popup-act">{current.title}</p>
                <p className="popup-time">{t('map.endsIn')} {timeUntil(current.endDate)}</p>
              </div>
            ) : next ? (
              <div className="popup-section next">
                <p className="popup-label">{t('map.nextUp')}</p>
                <p className="popup-act">{next.title}</p>
                <p className="popup-time">{t('map.startsIn')} {timeUntil(next.startDate)}</p>
              </div>
            ) : (
              <div className="popup-section empty">
                <p className="popup-label">{t('map.noScheduled')}</p>
              </div>
            )}
            <button className="popup-button" onClick={() => {}}>
              {t('map.viewSchedule')}
            </button>
          </div>
        );
      })()}
    </div>
  );
});
