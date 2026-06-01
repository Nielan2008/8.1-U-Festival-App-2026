import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createStageMarker } from '../components/MapMarker.jsx';
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
  const [mapConfig, setMapConfig] = useState({ locations: [] });
  const [scheduleData, setScheduleData] = useState({});
  const watchRef = useRef(null);
  const mapRef = useRef(null);
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
    fetch('/api/map', { credentials: 'include' }).then(r => r.json()).then((d) => { if (mounted) setMapConfig({ locations: d }); }).catch(() => {});
    fetch('/api/schedule', { credentials: 'include' }).then(r => r.json()).then((d) => { if (mounted) setScheduleData(d); }).catch(() => {});
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

    return mapConfig.locations.map((location) => {
      const label = localize(location.label || location.name, i18n.language);
      const stageKey = location.name || location.id || (typeof location.label === 'string' ? location.label : location.label?.en) || label;
      const events = allShows.filter((act) => act.stage === stageKey || act.stage === label).sort((a, b) => (a.startDate || 0) - (b.startDate || 0));
      const current = events.find((act) => act.startDate && act.endDate && act.startDate <= now && act.endDate > now);
      const next = events.find((act) => act.startDate && act.startDate > now);
      return { ...location, current, next, label };
    });
  }, [mapConfig, scheduleData, i18n.language]);

  const centerOnCurrent = () => {
    if (!mapRef.current || !position) return;
    mapRef.current.flyTo([position.lat, position.lng], 17, { duration: 0.8 });
  };

  return (
    <section className="map-page">
      <div className="map-button-row">
        <button type="button" className="map-button" onClick={centerOnCurrent} disabled={!position}>
          {t('map.centerButton')}
        </button>
      </div>
      <h1 className="section-title">{t('map.title')}</h1>
      <div className="map-wrapper">
        <MapContainer center={center} zoom={16} scrollWheelZoom style={{ height: '100%', width: '100%' }} whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stageEvents.map((location) => (
            <Marker key={location.id} position={[location.lat, location.lng]} icon={createStageMarker(location.label)}>
              <Popup>
                <strong>{location.label}</strong>
                <p>{localize(location.description || location.info, i18n.language)}</p>
                {location.current ? <p><strong>{t('map.currentAct')}:</strong> {location.current.title} ({location.current.start})</p> : <p>{t('schedule.noEvents')}</p>}
                {location.next ? <p><strong>{t('schedule.nextUp')}:</strong> {location.next.title} ({location.next.start})</p> : null}
              </Popup>
            </Marker>
          ))}
          {position ? <CurrentLocationMarker position={position} /> : null}
        </MapContainer>
      </div>
      <div className="map-info">
        {errorMessage ? <div className="map-error">{errorMessage}</div> : <p>{position ? t('map.locationAllowed') : t('map.locationDenied')}</p>}
        <span className="location-badge">{t('map.title')}</span>
      </div>
    </section>
  );
}
