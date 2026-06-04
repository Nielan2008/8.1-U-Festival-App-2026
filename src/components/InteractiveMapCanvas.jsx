import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { gpsToSvg, clampToSvgBounds, createGpsTransform } from '../utils/gpsToSvg.js';
import './interactive-map.css';

const InteractiveMapCanvas = React.forwardRef(function InteractiveMapCanvas(
  {
    mapSvgUrl = '/kaart_festival_no_markers.svg',
    markers = [],
    position = null,
    anchors = [],
    onMarkerTap = () => {},
    onCenterLocation = null
  },
  ref
) {
  const containerRef = useRef(null);
  const transformRef = useRef(null);

  const [svgError, setSvgError] = useState(false);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 2000, height: 1200 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const gpsTransformRef = useRef(null);
  const [userSvgPos, setUserSvgPos] = useState(null);

  const [failedIconIds, setFailedIconIds] = useState({});
  const activePointers = useRef(new Map());
  const lastTapRef = useRef(0);
  const lastTapPoint = useRef({ x: 0, y: 0 });
  const pinchRef = useRef(null);
  const lastPanRef = useRef({ tx: 0, ty: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;

  const getMarkerPosition = (marker) => ({
    x: marker.x ?? marker.svg_x ?? marker.svgX ?? 0,
    y: marker.y ?? marker.svg_y ?? marker.svgY ?? 0
  });

  const getEventPoint = (event) => ({ x: event.clientX, y: event.clientY });
  const getLocalPoint = (point) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { x: point.x - rect.left, y: point.y - rect.top } : { x: 0, y: 0 };
  };

  const clampScale = (nextScale) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));

  const clampPan = useCallback(
    (translateX, translateY, zoomScale) => {
      const totalScale = baseScale * zoomScale;
      const mapWidth = viewBox.width * totalScale;
      const mapHeight = viewBox.height * totalScale;
      const containerWidth = containerSize.width;
      const containerHeight = containerSize.height;

      let minTx = 0;
      let maxTx = 0;
      let minTy = 0;
      let maxTy = 0;

      if (mapWidth > containerWidth) {
        minTx = containerWidth - mapWidth;
        maxTx = 0;
      } else {
        minTx = maxTx = (containerWidth - mapWidth) / 2;
      }

      if (mapHeight > containerHeight) {
        minTy = containerHeight - mapHeight;
        maxTy = 0;
      } else {
        minTy = maxTy = (containerHeight - mapHeight) / 2;
      }

      return {
        tx: Math.min(maxTx, Math.max(minTx, translateX)),
        ty: Math.min(maxTy, Math.max(minTy, translateY))
      };
    },
    [baseScale, viewBox, containerSize]
  );

  useEffect(() => {
    if (!mapSvgUrl) return;

    setSvgError(false);
    fetch(mapSvgUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch SVG');
        return res.text();
      })
      .then((svgText) => {
        const match = svgText.match(/viewBox="([^\"]+)"/);
        if (match) {
          const [x, y, width, height] = match[1].split(/\s+/).map(Number);
          setViewBox({ x, y, width, height });
        }
      })
      .catch((err) => {
        console.error('SVG metadata load error:', err);
        setViewBox({ x: 0, y: 0, width: 2330.58, height: 1353.19 });
      });
  }, [mapSvgUrl]);

  useEffect(() => {
    gpsTransformRef.current = createGpsTransform(anchors);
  }, [anchors]);

  useEffect(() => {
    if (!position || !gpsTransformRef.current) {
      setUserSvgPos(null);
      return;
    }

    const svgPos = gpsToSvg(position.lat, position.lng, gpsTransformRef.current);
    if (svgPos) {
      setUserSvgPos(clampToSvgBounds(svgPos, viewBox, 50));
    }
  }, [position, viewBox]);

  useEffect(() => {
    if (!containerRef.current || !viewBox.width || !viewBox.height) return;

    const handleResize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });

      const scaleX = rect.width / viewBox.width;
      const scaleY = rect.height / viewBox.height;
      const newBaseScale = Math.max(scaleX, scaleY);
      setBaseScale(newBaseScale || 1);
      setScale(1);
      setTx(0);
      setTy(0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewBox]);

  const applyTransform = useCallback(() => {
    if (!transformRef.current) return;
    const totalScale = baseScale * scale;
    transformRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${totalScale})`;
  }, [baseScale, scale, tx, ty]);

  useEffect(() => {
    applyTransform();
  }, [applyTransform]);

  // Batch DOM transform updates on rAF for smoother animations
  const rafRef = useRef(null);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => applyTransform());
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [applyTransform, scale, tx, ty, baseScale]);

  const getPointerCenter = () => {
    const pointers = Array.from(activePointers.current.values());
    return pointers.length === 2
      ? { x: (pointers[0].x + pointers[1].x) / 2, y: (pointers[0].y + pointers[1].y) / 2 }
      : { x: 0, y: 0 };
  };

  const getPointerDistance = () => {
    const pointers = Array.from(activePointers.current.values());
    return pointers.length === 2 ? Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y) : 0;
  };

  const setTransform = (nextScale, nextTx, nextTy) => {
    const clampedScale = clampScale(nextScale);
    const clamped = clampPan(nextTx, nextTy, clampedScale);
    setScale(clampedScale);
    setTx(clamped.tx);
    setTy(clamped.ty);
  };

  const applyZoomAtPoint = (nextScale, centerX, centerY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const local = { x: centerX - rect.left, y: centerY - rect.top };
    const oldTotalScale = baseScale * scale;
    const newScale = clampScale(nextScale);
    const newTotalScale = baseScale * newScale;
    const mapPointX = (local.x - tx) / oldTotalScale;
    const mapPointY = (local.y - ty) / oldTotalScale;
    const nextTx = local.x - mapPointX * newTotalScale;
    const nextTy = local.y - mapPointY * newTotalScale;
    setTransform(newScale, nextTx, nextTy);
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.map-marker') || e.target.closest('button')) return;
    if (!containerRef.current) return;

    e.preventDefault();
    activePointers.current.set(e.pointerId, getEventPoint(e));
    try {
      if (containerRef.current && typeof containerRef.current.setPointerCapture === 'function') {
        containerRef.current.setPointerCapture(e.pointerId);
      } else if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (err) {
      // Non-fatal: some browsers may disallow pointer capture in certain contexts
    }

    if (activePointers.current.size === 1) {
      pointerStartRef.current = getEventPoint(e);
      lastPanRef.current = { tx, ty };
    }

    if (activePointers.current.size === 2) {
      pinchRef.current = {
        startScale: scale,
        startTx: tx,
        startTy: ty,
        startDistance: getPointerDistance(),
        startCenter: getLocalPoint(getPointerCenter())
      };
    }

    const now = Date.now();
    if (now - lastTapRef.current < 300 && Math.hypot(e.clientX - lastTapPoint.current.x, e.clientY - lastTapPoint.current.y) < 30) {
      lastTapRef.current = 0;
      applyZoomAtPoint(Math.min(scale + 1, MAX_SCALE), e.clientX, e.clientY);
    } else {
      lastTapRef.current = now;
      lastTapPoint.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e) => {
    if (!activePointers.current.has(e.pointerId)) return;
    if (!containerRef.current) return;

    e.preventDefault();
    activePointers.current.set(e.pointerId, getEventPoint(e));

    if (activePointers.current.size === 2 && pinchRef.current) {
      const currentDistance = getPointerDistance();
      const newScale = clampScale(pinchRef.current.startScale * (currentDistance / pinchRef.current.startDistance));
      const currentCenter = getLocalPoint(getPointerCenter());
      const oldTotalScale = baseScale * pinchRef.current.startScale;
      const newTotalScale = baseScale * newScale;
      const mapPointX = (pinchRef.current.startCenter.x - pinchRef.current.startTx) / oldTotalScale;
      const mapPointY = (pinchRef.current.startCenter.y - pinchRef.current.startTy) / oldTotalScale;
      const newTx = currentCenter.x - mapPointX * newTotalScale;
      const newTy = currentCenter.y - mapPointY * newTotalScale;
      setTransform(newScale, newTx, newTy);
      return;
    }

    if (activePointers.current.size === 1) {
      const deltaX = e.clientX - pointerStartRef.current.x;
      const deltaY = e.clientY - pointerStartRef.current.y;
      setTransform(scale, lastPanRef.current.tx + deltaX, lastPanRef.current.ty + deltaY);
    }
  };

  const endPointer = (e) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchRef.current = null;
    }
    if (activePointers.current.size === 1) {
      const remaining = activePointers.current.values().next().value;
      if (remaining) {
        pointerStartRef.current = remaining;
        lastPanRef.current = { tx, ty };
      }
    }
  };

  const handlePointerUp = (e) => {
    endPointer(e);
  };

  const handlePointerCancel = (e) => {
    endPointer(e);
  };

  const handleZoomButton = (delta) => {
    const nextScale = clampScale(scale + delta);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    applyZoomAtPoint(nextScale, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    if (!containerRef.current) return;

    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newScale = clampScale(scale * (e.deltaY > 0 ? 0.95 : 1.05));
    applyZoomAtPoint(newScale, e.clientX, e.clientY);
  };

  const getScreenCoordinates = useCallback(
    (svgX, svgY) => {
      const totalScale = baseScale * scale;
      return {
        x: svgX * totalScale + tx,
        y: svgY * totalScale + ty
      };
    },
    [baseScale, scale, tx, ty]
  );

  const centerOnUserLocation = useCallback(() => {
    if (!userSvgPos) return;
    const screenCoords = getScreenCoordinates(userSvgPos.x, userSvgPos.y);
    const nextTx = containerSize.width / 2 - screenCoords.x;
    const nextTy = containerSize.height / 2 - screenCoords.y;
    const clamped = clampPan(nextTx, nextTy, scale);
    setTx(clamped.tx);
    setTy(clamped.ty);
  }, [userSvgPos, getScreenCoordinates, scale, clampPan, containerSize]);

  useImperativeHandle(ref, () => ({
    centerOnUserLocation,
    centerOnCoords: (lat, lng) => {
      if (!gpsTransformRef.current) return;
      const svgPos = gpsToSvg(lat, lng, gpsTransformRef.current);
      if (!svgPos) return;
      const clampedSvgPos = clampToSvgBounds(svgPos, viewBox, 50);
      const screenCoords = getScreenCoordinates(clampedSvgPos.x, clampedSvgPos.y);
      const nextTx = containerSize.width / 2 - screenCoords.x;
      const nextTy = containerSize.height / 2 - screenCoords.y;
      const clamped = clampPan(nextTx, nextTy, scale);
      setTx(clamped.tx);
      setTy(clamped.ty);
    }
  }), [centerOnUserLocation, getScreenCoordinates, clampPan, scale, viewBox, containerSize]);

  if (svgError) {
    return (
      <div className="map-error-container" ref={containerRef}>
        <div className="map-error-message">Failed to load map</div>
      </div>
    );
  }

  const renderMarkerIcon = (marker, markerSize) => {
    const iconKey = marker.id || marker.label || `${marker.x}-${marker.y}`;
    const markerLabel = typeof marker.label === 'string' ? marker.label : (marker.label?.en || marker.label || marker.name || 'Location');
    
    if (!marker.icon || failedIconIds[iconKey]) {
      // Proper fallback marker with emoji (no arbitrary letters)
      const emoji = marker.type === 'stage' ? '🎭' : '📍';
      return (
        <div className="marker-fallback" style={{ width: markerSize, height: markerSize }} title={markerLabel}>
          {emoji}
        </div>
      );
    }

    return (
      <img
        src={marker.icon}
        alt={markerLabel}
        className="marker-icon"
        draggable="false"
        onError={() => setFailedIconIds((prev) => ({ ...prev, [iconKey]: true }))}
        style={{ width: markerSize, height: markerSize }}
      />
    );
  };

  return (
    <div
      className="interactive-map-container"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onWheel={handleWheel}
    >
      <div
        className="map-transform-wrapper"
        ref={transformRef}
        style={{
          width: `${viewBox.width}px`,
          height: `${viewBox.height}px`,
          transformOrigin: '0 0',
          willChange: 'transform'
        }}
      >
        <img
          src={mapSvgUrl}
          alt="Festival map"
          className="map-background-image"
          draggable="false"
          onError={() => setSvgError(true)}
        />
      </div>

      <div className="map-zoom-controls">
        <button type="button" className="zoom-control zoom-in" onClick={() => handleZoomButton(0.5)}>
          +
        </button>
        <button type="button" className="zoom-control zoom-out" onClick={() => handleZoomButton(-0.5)}>
          −
        </button>
      </div>

      {!userSvgPos && (
        <div className="map-location-unavailable">
          <span>📍 Location unavailable</span>
        </div>
      )}

      <div className="map-markers-layer">
        {markers.map((marker) => {
          const { x, y } = getMarkerPosition(marker);
          const screenCoords = getScreenCoordinates(x, y);
          const markerSize = 22;
          const markerLabel = typeof marker.label === 'string' ? marker.label : (marker.label?.en || marker.label || marker.name);

          return (
            <button
              key={marker.id ?? `${x}-${y}`}
              type="button"
              className="map-marker"
              style={{
                left: `${screenCoords.x}px`,
                top: `${screenCoords.y}px`,
                transform: 'translate(-50%, -50%)',
                width: markerSize,
                height: markerSize
              }}
              onClick={() => onMarkerTap(marker)}
              title={markerLabel}
              aria-label={markerLabel}
            >
              {renderMarkerIcon(marker, markerSize)}
            </button>
          );
        })}
      </div>

      {userSvgPos && (
        <div
          className="user-location-dot"
          style={{
            left: `${getScreenCoordinates(userSvgPos.x, userSvgPos.y).x}px`,
            top: `${getScreenCoordinates(userSvgPos.x, userSvgPos.y).y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="dot-pulse" />
          <div className="dot-core" />
        </div>
      )}

      <button
        type="button"
        className="btn-center-location"
        onClick={centerOnUserLocation}
        disabled={!userSvgPos}
        title="Center on my location"
        aria-label="Center on my location"
      >
        ◉
      </button>
    </div>
  );
});

InteractiveMapCanvas.displayName = 'InteractiveMapCanvas';

export default InteractiveMapCanvas;
