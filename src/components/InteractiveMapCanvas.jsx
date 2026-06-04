import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { gpsToSvg, clampToSvgBounds, createGpsTransform } from '../utils/gpsToSvg.js';
import './interactive-map.css';

/**
 * Interactive Efteling-style festival map
 * Features: pinch-zoom, pan with clamping, scale-invariant markers, user location dot
 */
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

  // SVG and viewport state
  const [svgError, setSvgError] = useState(false);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 2000, height: 1200 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);

  // Pan/zoom state
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // GPS transform and user position
  const gpsTransformRef = useRef(null);
  const [userSvgPos, setUserSvgPos] = useState(null);

  // Gesture tracking
  const activePointers = useRef(new Map());
  const lastTapRef = useRef(0);
  const lastTapPoint = useRef({ x: 0, y: 0 });
  const pinchRef = useRef(null);
  const lastPanRef = useRef({ tx: 0, ty: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });

  // Load SVG metadata (viewBox)
  useEffect(() => {
    if (!mapSvgUrl) return;

    setSvgError(false);
    fetch(mapSvgUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch SVG');
        return res.text();
      })
      .then((svgText) => {
        // Parse viewBox
        const match = svgText.match(/viewBox="([^"]+)"/);
        if (match) {
          const [x, y, width, height] = match[1].split(/\s+/).map(Number);
          setViewBox({ x, y, width, height });
        }
      })
      .catch((err) => {
        console.error('SVG metadata load error:', err);
        // Set default viewBox on error
        setViewBox({ x: 0, y: 0, width: 2330.58, height: 1353.19 });
      });
  }, [mapSvgUrl]);

  // Update GPS transform when anchors change
  useEffect(() => {
    gpsTransformRef.current = createGpsTransform(anchors);
  }, [anchors]);

  // Calculate user position in SVG coordinates
  useEffect(() => {
    if (!position || !gpsTransformRef.current) {
      setUserSvgPos(null);
      return;
    }

    const svgPos = gpsToSvg(position.lat, position.lng, gpsTransformRef.current);
    if (svgPos) {
      const clamped = clampToSvgBounds(svgPos, viewBox, 50);
      setUserSvgPos(clamped);
    }
  }, [position, viewBox]);

  // Calculate base scale to fill container without leaving empty edges
  useEffect(() => {
    if (!containerRef.current || !viewBox.width || !viewBox.height) return;

    const handleResize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });

      const scaleX = rect.width / viewBox.width;
      const scaleY = rect.height / viewBox.height;
      const newBaseScale = Math.max(scaleX, scaleY);
      setBaseScale(newBaseScale || 1);

      // Reset pan/zoom on resize
      setScale(1);
      setTx(0);
      setTy(0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewBox]);

  /**
   * Clamp pan/translate values to keep map within viewport
   */
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

  /**
   * Apply transform to viewport SVG
   */
  const applyTransform = useCallback(() => {
    if (!transformRef.current) return;
    const totalScale = baseScale * scale;
    const transform = `translate(${tx}px, ${ty}px) scale(${totalScale})`;
    transformRef.current.style.transform = transform;
  }, [baseScale, scale, tx, ty]);

  useEffect(() => {
    applyTransform();
  }, [applyTransform]);

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;

  const getEventPoint = (event) => ({ x: event.clientX, y: event.clientY });

  const getPointerCenter = () => {
    const pointers = Array.from(activePointers.current.values());
    const x = (pointers[0].x + pointers[1].x) / 2;
    const y = (pointers[0].y + pointers[1].y) / 2;
    return { x, y };
  };

  const getPointerDistance = () => {
    const pointers = Array.from(activePointers.current.values());
    return Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
  };

  const getLocalPoint = (point) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: point.x - rect.left, y: point.y - rect.top };
  };

  const setTransform = (newScale, newTx, newTy) => {
    const clamped = clampPan(newTx, newTy, newScale);
    setScale(newScale);
    setTx(clamped.tx);
    setTy(clamped.ty);
  };

  const applyZoomAtPoint = (newScale, centerX, centerY) => {
    const rect = containerRef.current.getBoundingClientRect();
    const local = { x: centerX - rect.left, y: centerY - rect.top };
    const oldTotalScale = baseScale * scale;
    const newTotalScale = baseScale * newScale;
    const mapPointX = (local.x - tx) / oldTotalScale;
    const mapPointY = (local.y - ty) / oldTotalScale;
    const newTx = local.x - mapPointX * newTotalScale;
    const newTy = local.y - mapPointY * newTotalScale;
    setTransform(newScale, newTx, newTy);
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.map-marker') || e.target.closest('button')) return;
    if (!containerRef.current) return;

    e.preventDefault();
    activePointers.current.set(e.pointerId, getEventPoint(e));
    e.currentTarget.setPointerCapture(e.pointerId);

    if (activePointers.current.size === 1) {
      pointerStartRef.current = getEventPoint(e);
      lastPanRef.current = { tx, ty };
    }

    if (activePointers.current.size === 2) {
      const center = getPointerCenter();
      pinchRef.current = {
        startScale: scale,
        startTx: tx,
        startTy: ty,
        startDistance: getPointerDistance(),
        startCenter: getLocalPoint(center)
      };
    }

    const now = Date.now();
    if (now - lastTapRef.current < 300 && Math.hypot(e.clientX - lastTapPoint.current.x, e.clientY - lastTapPoint.current.y) < 30) {
      lastTapRef.current = 0;
      const targetScale = Math.min(Math.max(scale * 2, MIN_SCALE), MAX_SCALE);
      applyZoomAtPoint(targetScale, e.clientX, e.clientY);
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
      const newScale = Math.min(Math.max(pinchRef.current.startScale * (currentDistance / pinchRef.current.startDistance), MIN_SCALE), MAX_SCALE);
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
      const newTx = lastPanRef.current.tx + deltaX;
      const newTy = lastPanRef.current.ty + deltaY;
      setTransform(scale, newTx, newTy);
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

  /**
   * Handle wheel zoom (desktop)
   */
  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(1, Math.min(3, scale * zoomDelta));

    // Zoom toward mouse cursor
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleDiff = (newScale - scale) * baseScale;
    const newTx = tx - mouseX * (scaleDiff / containerSize.width);
    const newTy = ty - mouseY * (scaleDiff / containerSize.height);

    const clamped = clampPan(newTx, newTy, newScale);
    setScale(newScale);
    setTx(clamped.tx);
    setTy(clamped.ty);
  };

  /**
   * Convert SVG coordinates to screen coordinates
   */
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

  /**
   * Center map on user location
   */
  const centerOnUserLocation = useCallback(() => {
    if (!userSvgPos) return;

    const screenCoords = getScreenCoordinates(userSvgPos.x, userSvgPos.y);
    const newTx = containerSize.width / 2 - screenCoords.x;
    const newTy = containerSize.height / 2 - screenCoords.y;

    const clamped = clampPan(newTx, newTy, scale);
    setTx(clamped.tx);
    setTy(clamped.ty);
  }, [userSvgPos, getScreenCoordinates, scale, clampPan, containerSize]);

  /**
   * Expose imperative methods via ref
   */
  useImperativeHandle(ref, () => ({
    centerOnUserLocation,
    centerOnCoords: (lat, lng) => {
      if (!gpsTransformRef.current) return;
      const svgPos = gpsToSvg(lat, lng, gpsTransformRef.current);
      if (!svgPos) return;

      const clamped = clampToSvgBounds(svgPos, viewBox, 50);
      const screenCoords = getScreenCoordinates(clamped.x, clamped.y);
      const newTx = containerSize.width / 2 - screenCoords.x;
      const newTy = containerSize.height / 2 - screenCoords.y;

      const clampedPan = clampPan(newTx, newTy, scale);
      setTx(clampedPan.tx);
      setTy(clampedPan.ty);
    }
  }), [centerOnUserLocation, getScreenCoordinates, clampPan, scale, viewBox, containerSize]);

  if (svgError) {
    return (
      <div className="map-error-container" ref={containerRef}>
        <div className="map-error-message">Failed to load map</div>
      </div>
    );
  }

  // Map can display without waiting for SVG image to load
  // (markers will be visible on empty background)

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
        {!userSvgPos && (
          <div className="map-location-unavailable">
            <span>📍 Location unavailable</span>
          </div>
        )}

        <div className="map-markers-layer">
          {markers.map((marker) => {
            const screenCoords = getScreenCoordinates(marker.x, marker.y);
            const markerScale = 1 / scale;
            const markerSize = 36; // Fixed screen size in pixels

            return (
              <button
                key={marker.id}
                type="button"
                className="map-marker"
                style={{
                  left: `${screenCoords.x}px`,
                  top: `${screenCoords.y}px`,
                  transform: `translate(-50%, -50%) scale(${markerScale})`,
                  width: markerSize,
                  height: markerSize
                }}
                onClick={() => onMarkerTap(marker)}
                title={typeof marker.label === 'string' ? marker.label : marker.label?.en || marker.name}
                aria-label={typeof marker.label === 'string' ? marker.label : marker.label?.en || marker.name}
              >
                {marker.icon ? (
                  <img
                    src={marker.icon}
                    alt={typeof marker.label === 'string' ? marker.label : marker.label?.en || marker.name}
                    className="marker-icon"
                    draggable="false"
                  />
                ) : (
                  <span className="marker-default">📍</span>
                )}
              </button>
            );
          })}
        </div>

      {/* User location dot */}
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

      {/* Center on location button */}
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
