import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import scheduleData from '../data/schedule.json';
import actsData from '../data/acts.json';
import { loadData, localize } from '../utils/dataStore.js';
import ScheduleBlock from '../components/ScheduleBlock.jsx';
import ActModal from '../components/ActModal.jsx';

const timeLabels = Array.from({ length: 56 }, (_, index) => {
  const total = 10 * 60 + index * 15;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

function getActDetails(stage, act, acts, lang) {
  const details = acts[act.id] || {};
  return {
    ...act,
    name: details.name || act.title,
    tagline: localize(details.tagline, lang) || '',
    description: localize(details.description, lang) || '',
    youtube: details.youtube || 'https://www.youtube.com/watch?v=ZEXXi1AAaJg',
    image: details.image || '',
    stage
  };
}

function parseMinutes(time) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export default function Schedule() {
  const { i18n, t } = useTranslation();
  const [day, setDay] = useState('sat');
  const [selectedAct, setSelectedAct] = useState(null);
  const [schedule, setSchedule] = useState(scheduleData);
  const [favourites, setFavourites] = useState(() => {
    const saved = window.localStorage.getItem('loveu-favourites');
    return saved ? JSON.parse(saved) : [];
  });
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  useEffect(() => {
    loadData('schedule', scheduleData).then(setSchedule).catch(() => setSchedule(scheduleData));
  }, []);

  const dayData = schedule[day] || [];
  const blocks = useMemo(
    () => dayData.map((stage) => ({
      stage: stage.stage,
      acts: stage.acts.map((act) => getActDetails(stage.stage, act, actsData, i18n.language))
    })),
    [dayData, i18n.language]
  );

  useEffect(() => {
    window.localStorage.setItem('loveu-favourites', JSON.stringify(favourites));
  }, [favourites]);

  useEffect(() => {
    let timerIds = [];
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsAllowed(true);
      const now = Date.now();
      blocks.flatMap((stage) => stage.acts)
        .filter((act) => favourites.includes(act.id))
        .forEach((act) => {
          [15, 10, 5].forEach((minutesBefore) => {
            const start = new Date();
            const [hour, minute] = act.start.split(':').map(Number);
            start.setHours(hour, minute, 0, 0);
            const trigger = start.getTime() - minutesBefore * 60 * 1000;
            const delay = trigger - now;
            if (delay > 0 && delay < 3600000) {
              timerIds.push(window.setTimeout(() => {
                new Notification(`${act.name} starts in ${minutesBefore} minutes`, {
                  body: `${act.stage} · ${act.start}–${act.end}`
                });
              }, delay));
            }
          });
        });
    }
    return () => timerIds.forEach(window.clearTimeout);
  }, [blocks, favourites]);

  const toggleFavourite = (id) => {
    setFavourites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const requestNotifications = () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then((permission) => {
      setNotificationsAllowed(permission === 'granted');
    });
  };

  return (
    <section className="schedule-shell">
      <div className="schedule-tabs">
        <button type="button" className={`tab-button ${day === 'sat' ? 'active' : ''}`} onClick={() => setDay('sat')}>
          {t('schedule.tabs.sat')}
        </button>
        <button type="button" className={`tab-button ${day === 'sun' ? 'active' : ''}`} onClick={() => setDay('sun')}>
          {t('schedule.tabs.sun')}
        </button>
      </div>

      <button type="button" className="button" onClick={requestNotifications}>
        {notificationsAllowed ? t('buttons.enableNotifications') : t('buttons.enableNotifications')}
      </button>

      <div className="schedule-scroll">
        <div className="schedule-grid">
          <div className="schedule-column">
            <div className="schedule-column__header">&nbsp;</div>
            {timeLabels.map((time) => (
              <div className="time-cell" key={time} data-time={time} />
            ))}
          </div>
          {blocks.map((stage) => (
            <ScheduleBlock
              key={stage.stage}
              stage={stage.stage}
              blocks={stage.acts}
              onSelect={setSelectedAct}
              favourites={favourites}
              toggleFavourite={toggleFavourite}
            />
          ))}
        </div>
      </div>

      {selectedAct ? <ActModal act={selectedAct} onClose={() => setSelectedAct(null)} /> : null}
    </section>
  );
}
