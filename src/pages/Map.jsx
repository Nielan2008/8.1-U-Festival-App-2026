import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { createStageMarker } from '../components/MapMarker.jsx';
import { useTranslation } from 'react-i18next';
import mapData from '../data/map.json';
import scheduleData from '../data/schedule.json';

const festivalStart = new Date('2026-08-15T00:00:00');

export default function MapPage() {
  const { t } = useTranslation();
  const [position, setPosition] = useState(null);
  const center = [51.9845, 5.0540];

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true }
    );
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

    return mapData.locations.map((location) => {
      const events = allShows.filter((act) => act.stage === location.label).sort((a, b) => a.startDate - b.startDate);
      const current = events.find((act) => act.startDate <= now && act.endDate > now);
      const next = events.find((act) => act.startDate > now);
      return { ...location, current, next };
    });
  }, []);

  return (
    <section className="map-page">
      <h1 className="section-title">{t('map.title')}</h1>
      <div className="map-wrapper">
        <MapContainer center={center} zoom={16} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stageEvents.map((location) => (
            <Marker key={location.id} position={[location.lat, location.lng]} icon={createStageMarker(location.label)}>
              <Popup>
                <strong>{location.label}</strong>
                <p>{location.info}</p>
                {location.current ? <p><strong>Current:</strong> {location.current.title} ({location.current.start})</p> : <p>{t('schedule.noEvents')}</p>}
                {location.next ? <p><strong>{t('schedule.nextUp')}:</strong> {location.next.title} ({location.next.start})</p> : null}
              </Popup>
            </Marker>
          ))}
          {position ? (
            <>
              <CircleMarker center={[position.lat, position.lng]} radius={9} pathOptions={{ color: '#247BA0', fillColor: '#247BA0' }} />
              <LocationMarker setPosition={setPosition} />
            </>
          ) : null}
        </MapContainer>
      </div>
      <div className="map-info">
        <p>{position ? t('map.locationAllowed') : t('map.locationDenied')}</p>
        <span className="location-badge">{t('map.title')}</span>
      </div>
    </section>
  );
}
