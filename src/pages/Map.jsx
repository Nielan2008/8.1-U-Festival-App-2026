import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createStageMarker } from '../components/MapMarker.jsx';
import { useTranslation } from 'react-i18next';
import mapData from '../data/map.json';
import scheduleData from '../data/schedule.json';
import { loadData, localize } from '../utils/dataStore.js';

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
  const [mapConfig, setMapConfig] = useState(mapData);
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
    loadData('map', mapData).then(setMapConfig).catch(() => setMapConfig(mapData));
  }, []);

  const stageEvents = useMemo(() => {
    const now = new Date();
    const days = [scheduleData.sat, scheduleData.sun];

    const allShows = days.flatMap((dayActs, dayIndex) =>
      dayActs.flatMap((stage) =>
        stage.acts.map((act) => {
          const date = new Date(festivalStart.getTime() + dayIndex * 24 * 60 * 60 * 1000);
          const [hour, minute] = act.start.split(':').map(Number);
          const [endHour, endMinute] = act.end.split(':').map(Number);
          date.setHours(hour, minute, 0, 0);
          const endDate = new Date(festivalStart.getTime() + dayIndex * 24 * 60 * 60 * 1000);
          endDate.setHours(endHour, endMinute, 0, 0);
          return {
            ...act,
            stage: stage.stage,
            startDate: date,
            endDate
          };
        })
      )
    );

    return mapConfig.locations.map((location) => {
      const label = localize(location.label, i18n.language);
      const events = allShows.filter((act) => act.stage === label).sort((a, b) => a.startDate - b.startDate);
      const current = events.find((act) => act.startDate <= now && act.endDate > now);
      const next = events.find((act) => act.startDate > now);
      return { ...location, current, next, label };
    });
  }, []);

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
                <p>{localize(location.info, i18n.language)}</p>
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
