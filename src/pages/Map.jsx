import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapSVG from '../components/MapSVG.jsx';
import { useTranslation } from 'react-i18next';

// Festival map page with location tracking and stage popup summaries.
import { localize } from '../utils/dataStore.js';

export default function MapPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [locations, setLocations] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const watchRef = useRef(null);
  const mapSvgRef = useRef(null);

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

    Promise.all([
      fetch('/api/map', { credentials: 'include' }),
      fetch('/api/schedule', { credentials: 'include' })
    ])
      .then(async ([mapRes, scheduleRes]) => {
        if (!mapRes.ok) throw new Error(`Map request failed: ${mapRes.status}`);
        if (!scheduleRes.ok) throw new Error(`Schedule request failed: ${scheduleRes.status}`);
        const [mapJson, scheduleJson] = await Promise.all([mapRes.json(), scheduleRes.json()]);
        if (!mounted) return;
        setLocations(Array.isArray(mapJson) ? mapJson : mapJson.locations || []);
        setScheduleData(Array.isArray(scheduleJson) ? scheduleJson : []);
      })
      .catch((err) => {
        console.error('Failed to load map page data:', err);
        if (mounted) setLoadError(t('map.loadError'));
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

  if (loading) return <section className="map-page"><div className="map-loading">{t('map.loading')}</div></section>;
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
        <MapSVG
          ref={mapSvgRef}
          svgUrl="/kaart_festival_no_markers.svg"
          locations={locations}
          stageEvents={stageEvents}
          position={position}
          onOpenArtist={(actId) => { if (actId) navigate(`/artist/${actId}`); }}
        />
      </div>
      <div className="map-info">
        {errorMessage ? <div className="map-error">{errorMessage}</div> : <p>{position ? t('map.locationAllowed') : t('map.locationDenied')}</p>}
        <span className="location-badge">{t('map.legendTitle')}</span>
      </div>
    </section>
  );
}
