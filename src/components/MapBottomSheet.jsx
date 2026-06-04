import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function MapBottomSheet({ marker, stageEvent, onClose }) {
  const { i18n, t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef(null);
  const startYRef = useRef(0);

  if (!marker) return null;

  // Determine if this is a stage marker
  const isStage = marker.type === 'stage' || marker.id === 'Ponton' || marker.id === 'The Lake' || marker.id === 'The Club' || marker.id === 'Hangar';

  // Get localized label
  const markerLabel = typeof marker.label === 'string'
    ? marker.label
    : marker.label?.[i18n.language] || marker.label?.en || marker.name || marker.id;

  // Resolve description to a localized string safely (handles object or JSON string)
  const resolveDescription = (desc) => {
    if (!desc) return null;
    let d = desc;
    if (typeof d === 'string') {
      // try to parse JSON-encoded multilanguage strings
      try {
        const p = JSON.parse(d);
        if (p && typeof p === 'object') d = p;
      } catch (e) {
        // not JSON, keep as-is
      }
    }
    if (typeof d === 'object') {
      return d[i18n.language] ?? d.nl ?? d.en ?? null;
    }
    return String(d);
  };

  // Format countdown timer
  const formatTimeRemaining = (endTime) => {
    if (!endTime) return '';
    const now = new Date();
    const endDate = new Date(`1970-01-01T${endTime}:00`);
    const diff = endDate - now;

    if (diff <= 0) return t('map.finished') || 'Finished';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${t('map.left') || 'left'}`;
    }
    return `${minutes}m ${t('map.left') || 'left'}`;
  };

  // Format countdown until start
  const formatTimeUntil = (startTime) => {
    if (!startTime) return '';
    const now = new Date();
    const startDate = new Date(`1970-01-01T${startTime}:00`);
    const diff = startDate - now;

    if (diff <= 0) return t('map.starting') || 'Starting now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${t('map.away') || 'away'}`;
    }
    return `${minutes}m ${t('map.away') || 'away'}`;
  };

  // Handle touch drag-to-dismiss
  const handleTouchStart = (e) => {
    if (e.target.closest('.sheet-handle')) {
      setIsDragging(true);
      startYRef.current = e.touches[0].clientY;
      setDragOffset(0);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const offset = currentY - startYRef.current;
    if (offset > 0) {
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Dismiss if dragged down more than 100px
    if (dragOffset > 100) {
      onClose();
    }
    setDragOffset(0);
  };

  // Keyboard escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="map-bottom-sheet-backdrop" onClick={onClose} role="presentation" />

      {/* Bottom sheet content */}
      <div
        className="map-bottom-sheet"
        ref={sheetRef}
        style={{
          transform: isDragging ? `translateY(${dragOffset}px)` : 'translateY(0)',
          opacity: isDragging ? Math.max(0.5, 1 - dragOffset / 300) : 1
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="sheet-handle">
          <div className="sheet-handle-bar" />
        </div>

        {/* Header with marker name and icon */}
        <div className="sheet-header">
          {marker.icon && (
            <img
              src={marker.icon}
              alt={markerLabel}
              className="sheet-marker-icon"
              loading="lazy"
            />
          )}
          <h2 className="sheet-title">{markerLabel}</h2>
        </div>

        {/* Stage details */}
        {isStage && stageEvent && (
          <div className="sheet-stage-details">
            {stageEvent.current ? (
              <>
                {/* Currently playing */}
                <div className="stage-live-indicator">
                  <span className="live-badge">● LIVE</span>
                </div>
                <div className="stage-act-info">
                  <p className="act-title">{stageEvent.current.title}</p>
                  <p className="act-time">
                    {stageEvent.current.start} – {stageEvent.current.end}
                  </p>
                  <p className="act-remaining">
                    {formatTimeRemaining(stageEvent.current.end)}
                  </p>
                </div>
              </>
            ) : stageEvent.next ? (
              <>
                {/* Next performance */}
                <div className="stage-next-info">
                  <p className="next-label">{t('map.next') || 'Next up'}:</p>
                  <p className="act-title">{stageEvent.next.title}</p>
                  <p className="act-time">
                    {stageEvent.next.start} – {stageEvent.next.end}
                  </p>
                  <p className="act-remaining">
                    {formatTimeUntil(stageEvent.next.start)}
                  </p>
                </div>
              </>
            ) : (
              <p className="no-schedule">{t('map.noSchedule') || 'No performances scheduled'}</p>
            )}

            {/* View full schedule button */}
            <button
              type="button"
              className="btn-view-schedule"
              onClick={() => {
                // Navigate to schedule page or open schedule modal
                // This could emit an event or navigate via router
                onClose();
                // TODO: Emit event or navigate to schedule for this stage
              }}
            >
              {t('map.viewSchedule') || 'View full schedule'}
            </button>
          </div>
        )}

        {/* POI details */}
        {!isStage && (
          <div className="sheet-poi-details">
            {marker.description ? (
              <p className="poi-description">{resolveDescription(marker.description) || (t('map.noInfo') || 'No additional information')}</p>
            ) : (
              <p className="poi-description-empty">{t('map.noInfo') || 'No additional information'}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
