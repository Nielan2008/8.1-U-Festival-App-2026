import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InteractiveMapCanvas from '../components/InteractiveMapCanvas.jsx';
import MapBottomSheet from '../components/MapBottomSheet.jsx';
import { useTranslation } from 'react-i18next';

// Festival map page with location tracking and stage popup summaries.
import { localize } from '../utils/dataStore.js';
import mapData from '../data/map.json';
import scheduleDataJson from '../data/schedule.json';

export default function MapPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [positions, setPositions] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [locations, setLocations] = useState([]);
  const [anchors, setAnchors] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const watchRef = useRef(null);
  const mapCanvasRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorMessage(t('map.geolocationUnsupported'));
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPositions({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setErrorMessage('');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage(t('map.permissionDenied'));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage(t('map.positionUnavailable'));
        } else {
          setErrorMessage(t('map.locationDenied'));
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [t]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      fetch('/api/map', { credentials: 'include' }),
      fetch('/api/schedule', { credentials: 'include' }),
      fetch('/api/map-anchors', { credentials: 'include' })
    ])
      .then(async ([mapRes, scheduleRes, anchorsRes]) => {
        const mapJson = mapRes.ok ? await mapRes.json() : null;
        const scheduleJson = scheduleRes.ok ? await scheduleRes.json() : null;
        const anchorsJson = anchorsRes.ok ? await anchorsRes.json() : null;
        
        if (!mounted) return;

        // Use API data if available, otherwise fall back to static data
        setLocations(mapJson ? (Array.isArray(mapJson) ? mapJson : mapJson.locations || []) : mapData.locations || []);
        setScheduleData(scheduleJson ? (Array.isArray(scheduleJson) ? scheduleJson : []) : scheduleDataJson.sat || []);
        setAnchors(anchorsJson ? (Array.isArray(anchorsJson) ? anchorsJson : []) : [
          { lat: 52.1605, lng: 5.1819, svg_x: 960, svg_y: 600, name: 'Rotterdam Center' },
          { lat: 52.1705, lng: 5.1919, svg_x: 1400, svg_y: 300, name: 'Rotterdam North' }
        ]);
      })
      .catch((err) => {
        console.error('Failed to load map page data:', err);
        if (mounted) {
          // On error, use static fallback data
          setLocations(mapData.locations || []);
          setScheduleData(scheduleDataJson.sat || []);
          setAnchors([
            { lat: 52.1605, lng: 5.1819, svg_x: 960, svg_y: 600, name: 'Rotterdam Center' },
            { lat: 52.1705, lng: 5.1919, svg_x: 1400, svg_y: 300, name: 'Rotterdam North' }
          ]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [t]);

  const stageEvents = useMemo(() => {
    const now = new Date();
    const allShows = [];

    const addShow = (row) => {
      const start = row.start_time || row.start || '';
      const end = row.end_time || row.end || '';
      const startDate = start ? new Date(`1970-01-01T${start}:00`) : null;
      const endDate = end ? new Date(`1970-01-01T${end}:00`) : null;
      allShows.push({
        id: row.act_id || row.slug || row.id || row.title || '',
        title: row.title || row.name || '',
        stage: row.stage || '',
        start,
        end,
        startDate,
        endDate
      });
    };

    if (Array.isArray(scheduleData)) {
      scheduleData.forEach((item) => {
        if (item && item.stage && item.start_time) {
          addShow(item);
        } else if (item && Array.isArray(item.acts)) {
          item.acts.forEach((act) => addShow({ ...act, stage: item.stage, day: item.day }));
        }
      });
    }

    return (Array.isArray(locations) ? locations : []).map((location) => {
      const label = localize(location.label || location.name, i18n.language);
      const stageKey = location.name || location.id || (typeof location.label === 'string' ? location.label : location.label?.en) || label;
      const events = allShows.filter((act) => act.stage === stageKey || act.stage === label).sort((a, b) => (a.startDate || 0) - (b.startDate || 0));
      const current = events.find((act) => act.startDate && act.endDate && act.startDate <= now && act.endDate > now) || null;
      const next = events.find((act) => act.startDate && act.startDate > now) || null;
      return { ...location, current, next, label };
    });
  }, [locations, scheduleData, i18n.language]);

  const centerOnCurrent = () => {
    if (!(typeof navigator !== 'undefined' && navigator.geolocation)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPositions(coords);
        if (mapCanvasRef.current && typeof mapCanvasRef.current.centerOnCoords === 'function') {
          mapCanvasRef.current.centerOnCoords(coords.lat, coords.lng);
        }
      },
      (error) => {
        setErrorMessage(error.message || t('map.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  /**
   * Handle marker tap - find stage event data and open bottom sheet
   */
  const handleMarkerTap = (marker) => {
    // Find corresponding stage event data
    let stageEvent = null;
    if (marker.type === 'stage' || marker.id === 'Ponton' || marker.id === 'The Lake' || marker.id === 'The Club' || marker.id === 'Hangar') {
      const stageData = stageEvents.find((se) => se.id === marker.id || se.name === marker.id);
      if (stageData) {
        stageEvent = { current: stageData.current, next: stageData.next };
      }
    }
    setSelectedMarker({ marker, stageEvent });
  };

  const geolocationSupported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);

  if (loading) return <section className="map-page"><div className="map-loading">{t('map.loading')}</div></section>;

  return (
    <section className="map-page">
      <h1 className="section-title">{t('map.title')}</h1>
      <div className="map-wrapper">
        <InteractiveMapCanvas
          ref={mapCanvasRef}
          mapSvgUrl="/kaart_festival_no_markers.svg"
          markers={locations}
          anchors={anchors}
          position={positions}
          onMarkerTap={handleMarkerTap}
        />
        {errorMessage && <div className="map-error">{errorMessage}</div>}
        {!errorMessage && (
          <div className="map-info">
            <p>{positions ? t('map.locationAllowed') : t('map.locationDenied')}</p>
            <span className="location-badge">{t('map.legendTitle')}</span>
          </div>
        )}
      </div>

      {/* Bottom sheet for marker details */}
      {selectedMarker && (
        <MapBottomSheet
          marker={selectedMarker.marker}
          stageEvent={selectedMarker.stageEvent}
          onClose={() => setSelectedMarker(null)}
        />
      )}
    </section>
  );
}
