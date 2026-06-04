import { useEffect, useMemo, useRef, useState } from 'react';
import MapSVG from '../components/MapSVG.jsx';
import { useTranslation } from 'react-i18next';
import { localize } from '../utils/dataStore.js';

const festivalStart = new Date('2026-08-15T00:00:00');

function CurrentLocationMarker({ position }) {
  const icon = L.divIcon({
    className: 'live-dot-icon',
    html: '<span></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  return position ? <Marker position={[position.lat, position.lng]} icon={icon} /> : null;
}

export default function MapPage() {
  const { i18n, t } = useTranslation();
  const [position, setPosition] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [locations, setLocations] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const watchRef = useRef(null);
  const mapRef = useRef(null);
  const mapSvgRef = useRef(null);
  const center = [51.9845, 5.0540];

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorMessage(t('map.geolocationUnsupported'));
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
    setLoadError(null);

    const fetchMap = fetch('/api/map', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`Map request failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data)) {
          setLocations(data);
        } else if (data && Array.isArray(data.locations)) {
          setLocations(data.locations);
        } else {
          setLocations([]);
        }
      });

    const fetchSchedule = fetch('/api/schedule', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`Schedule request failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        setScheduleData(Array.isArray(data) ? data : []);
      });

    Promise.all([fetchMap, fetchSchedule])
      .catch((err) => {
        console.error('Failed to load map page data:', err);
        if (mounted) setLoadError('Failed to load map data');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const stageEvents = useMemo(() => {
    const now = new Date();
    const allShows = [];

    const addShow = (row) => {
      allShows.push({
        title: row.title || '',
        stage: row.stage,
        start: row.start_time || row.start,
        end: row.end_time || row.end,
        startDate: row.start_time ? new Date(`1970-01-01T${row.start_time}:00`) : row.start ? new Date(`1970-01-01T${row.start}:00`) : null,
        endDate: row.end_time ? new Date(`1970-01-01T${row.end_time}:00`) : row.end ? new Date(`1970-01-01T${row.end}:00`) : null
      });
    };

    if (Array.isArray(scheduleData)) {
      scheduleData.forEach(addShow);
    } else if (scheduleData && typeof scheduleData === 'object') {
      Object.values(scheduleData).flat(Infinity).forEach((item) => {
        if (item && typeof item === 'object' && (item.stage || item.start || item.start_time)) {
          addShow(item);
        }
      });
    }

    return (Array.isArray(locations) ? locations : []).map((location) => {
      const label = localize(location.label || location.name, i18n.language);
      const stageKey = location.name || location.id || (typeof location.label === 'string' ? location.label : location.label?.en) || label;
      const events = allShows.filter((act) => act.stage === stageKey || act.stage === label).sort((a, b) => (a.startDate || 0) - (b.startDate || 0));
      const current = events.find((act) => act.startDate && act.endDate && act.startDate <= now && act.endDate > now);
      const next = events.find((act) => act.startDate && act.startDate > now);
      return { ...location, current, next, label };
    });
  }, [locations, scheduleData, i18n.language]);

  const centerOnCurrent = () => {
    if (!(typeof navigator !== 'undefined' && navigator.geolocation) || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
        if (mapSvgRef.current && typeof mapSvgRef.current.centerOnCoords === 'function') {
          mapSvgRef.current.centerOnCoords(coords.lat, coords.lng);
        }
      },
      (error) => {
        setErrorMessage(error.message || t('map.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  const geolocationSupported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);

  if (loading) return <section className="map-page"><div className="map-loading">Loading map…</div></section>;
  if (loadError) return <section className="map-page"><div className="map-error">{loadError}</div></section>;

  return (
    <section className="map-page">
      <div className="map-button-row">
        <button type="button" className="map-button" onClick={centerOnCurrent} disabled={!geolocationSupported}>
          {t('map.centerButton')}
        </button>
      </div>
      <h1 className="section-title">{t('map.title')}</h1>
      <div className="map-wrapper">
        <MapSVG ref={mapSvgRef} svgUrl="/kaart_festival_no_markers.svg" locations={locations} stageEvents={stageEvents} position={position} />
      </div>
      <div className="map-info">
        {errorMessage ? <div className="map-error">{errorMessage}</div> : <p>{position ? t('map.locationAllowed') : t('map.locationDenied')}</p>}
        <span className="location-badge">{t('map.title')}</span>
      </div>
    </section>
  );
}
