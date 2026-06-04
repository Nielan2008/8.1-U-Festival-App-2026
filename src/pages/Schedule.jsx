import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localize } from '../utils/dataStore.js';
import ScheduleBlock from '../components/ScheduleBlock.jsx';
import ActModal from '../components/ActModal.jsx';

const scheduleStart = 10 * 60;
const scheduleEnd = 24 * 60;
const totalMinutes = scheduleEnd - scheduleStart;

function getActDetails(stage, act, acts, lang) {
  const details = acts[act.id] || acts[act.slug] || {};
  return {
    ...act,
    name: details.name || act.title || act.name || '',
    tagline: localize(details.tagline, lang) || '',
    description: localize(details.description, lang) || '',
    youtube: details.youtube || details.video || 'https://www.youtube.com/watch?v=ZEXXi1AAaJg',
    image: details.image || details.image_url || '',
    genre: details.genre || '',
    stage
  };
}

function normalizeDayKey(day) {
  const maybe = String(day || '').trim().toLowerCase();
  if (['sat', 'saturday', 'zaterdag', '15', '15 aug', '15 august'].includes(maybe)) return 'sat';
  if (['sun', 'sunday', 'zondag', '16', '16 aug', '16 august'].includes(maybe)) return 'sun';
  return maybe || 'unknown';
}

function normalizeScheduleData(scheduleData) {
  const rows = [];

  if (Array.isArray(scheduleData)) {
    scheduleData.forEach((item) => {
      if (item && Array.isArray(item.acts) && item.stage && item.day) {
        const day = normalizeDayKey(item.day);
        item.acts.forEach((act) => {
          rows.push({
            act_id: act.id || act.act_id || act.slug,
            slug: act.slug || act.id,
            title: act.title || act.name || '',
            stage: item.stage,
            day,
            start_time: act.start || act.start_time || '',
            end_time: act.end || act.end_time || ''
          });
        });
      } else if (item && item.stage && item.start_time) {
        rows.push({ ...item, day: normalizeDayKey(item.day) });
      } else if (item && item.acts && Array.isArray(item.acts)) {
        const stage = item.stage || 'Unknown stage';
        const day = normalizeDayKey(item.day);
        item.acts.forEach((act) => {
          rows.push({
            act_id: act.id || act.act_id || act.slug,
            slug: act.slug || act.id,
            title: act.title || act.name || '',
            stage,
            day,
            start_time: act.start || act.start_time || '',
            end_time: act.end || act.end_time || ''
          });
        });
      }
    });
  }

  return rows.reduce((days, row) => {
    const dayKey = String(row.day || 'unknown').toLowerCase();
    const stageName = row.stage || 'Unknown stage';
    const stageList = days[dayKey] || (days[dayKey] = []);
    let stage = stageList.find((item) => item.stage === stageName);
    if (!stage) {
      stage = { stage: stageName, acts: [] };
      stageList.push(stage);
    }
    stage.acts.push({
      id: row.act_id || row.slug || `${dayKey}-${stageName}-${row.start_time || row.start || ''}`,
      title: row.title || row.name || row.act_name || '',
      slug: row.slug || null,
      start: row.start_time || row.start || '',
      end: row.end_time || row.end || ''
    });
    return days;
  }, {});
}

function parseMinutes(time) {
  const [hour, minute] = (time || '00:00').split(':').map(Number);
  return hour * 60 + minute;
}

function getStageColor(stage) {
  const palette = ['#f03228', '#247ba0', '#e3b505', '#8ac926', '#6a4c93', '#ff7f11'];
  return palette[Math.abs(stage.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % palette.length];
}

export default function Schedule() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [day, setDay] = useState('sat');
  const [selectedAct, setSelectedAct] = useState(null);
  const [scheduleData, setScheduleData] = useState({});
  const [actsMap, setActsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favourites, setFavourites] = useState(() => {
    const saved = window.localStorage.getItem('loveu-favourites');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterSlot, setFilterSlot] = useState('all');
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/schedule', { credentials: 'include' }).then((res) => {
        if (!res.ok) throw new Error('Schedule request failed');
        return res.json();
      }),
      fetch('/api/acts', { credentials: 'include' }).then((res) => {
        if (!res.ok) throw new Error('Acts request failed');
        return res.json();
      })
    ]).then(([scheduleRows, actsArray]) => {
      if (!mounted) return;
      const acts = Array.isArray(actsArray) ? actsArray : [];
      const map = acts.reduce((acc, act) => {
        acc[act.id] = act;
        if (act.slug) acc[act.slug] = act;
        return acc;
      }, {});
      setActsMap(map);
      setScheduleData(normalizeScheduleData(scheduleRows));
    }).catch((err) => {
      console.error(err);
      if (mounted) setError(t('schedule.loadError'));
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [i18n.language, t]);

  useEffect(() => {
    window.localStorage.setItem('loveu-favourites', JSON.stringify(favourites));
  }, [favourites]);

  const allGenres = useMemo(() => {
    return Array.from(new Set(Object.values(actsMap).map((act) => act.genre).filter(Boolean))).sort();
  }, [actsMap]);

  const blocks = useMemo(() => {
    const lanes = scheduleData[day] || [];
    return lanes.map((stage) => ({
      stage: stage.stage,
      color: getStageColor(stage.stage),
      acts: stage.acts.map((act) => getActDetails(stage.stage, act, actsMap, i18n.language))
        .filter((act) => {
          if (showFavouritesOnly && !favourites.includes(act.id)) return false;
          if (filterGenre !== 'all' && act.genre && act.genre !== filterGenre) return false;
          if (filterSlot !== 'all') {
            const minutes = parseMinutes(act.start);
            if (filterSlot === 'morning' && (minutes < 600 || minutes >= 840)) return false;
            if (filterSlot === 'afternoon' && (minutes < 840 || minutes >= 1080)) return false;
            if (filterSlot === 'evening' && minutes < 1080) return false;
          }
          return true;
        })
    }));
  }, [day, scheduleData, actsMap, favourites, filterGenre, filterSlot, showFavouritesOnly, i18n.language]);

  const hasAnyEvents = useMemo(() => blocks.some((stage) => stage.acts.length > 0), [blocks]);

  const currentLineTop = useMemo(() => {
    if (nowMinutes < scheduleStart || nowMinutes > scheduleEnd) return null;
    return ((nowMinutes - scheduleStart) / totalMinutes) * 900;
  }, [nowMinutes]);

  const toggleFavourite = (actId) => {
    setFavourites((current) => {
      if (current.includes(actId)) {
        return current.filter((id) => id !== actId);
      }
      return [...current, actId];
    });
  };

  const openArtist = (act) => {
    if (!act || !act.id) return;
    navigate(`/artist/${act.id}`);
  };

  const requestNotifications = () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then((permission) => {
      if (permission !== 'granted') {
        setError(t('schedule.notificationsBlocked'));
      }
    });
  };

  if (loading) {
    return <section className="schedule-shell"><div className="schedule-loading">{t('schedule.loading')}</div></section>;
  }

  if (error) {
    return <section className="schedule-shell"><div className="schedule-error">{error}</div></section>;
  }

  return (
    <section className="schedule-shell">
      <div className="schedule-header-row">
        <div>
          <h1>{t('schedule.title')}</h1>
          <p className="page-copy">{t('schedule.pageDescription')}</p>
        </div>
        <div className="schedule-tabs">
          <button type="button" className={`tab-button ${day === 'sat' ? 'active' : ''}`} onClick={() => setDay('sat')}>
            {t('schedule.tabs.sat')}
          </button>
          <button type="button" className={`tab-button ${day === 'sun' ? 'active' : ''}`} onClick={() => setDay('sun')}>
            {t('schedule.tabs.sun')}
          </button>
        </div>

        <div className="schedule-filters">
          <button type="button" className={`button ${showFavouritesOnly ? 'active-filter' : ''}`} onClick={() => setShowFavouritesOnly((prev) => !prev)}>
            {t('schedule.filterFavourites')}
          </button>
          <label className="filter-label">
            {t('schedule.filterGenre')}
            <select className="input" value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}>
              <option value="all">{t('schedule.filterAll')}</option>
              {allGenres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
            </select>
          </label>
          <label className="filter-label">
            {t('schedule.filterTime')}
            <select className="input" value={filterSlot} onChange={(e) => setFilterSlot(e.target.value)}>
              <option value="all">{t('schedule.filterAny')}</option>
              <option value="morning">{t('schedule.filterMorning')}</option>
              <option value="afternoon">{t('schedule.filterAfternoon')}</option>
              <option value="evening">{t('schedule.filterEvening')}</option>
            </select>
          </label>
          <button type="button" className="button" onClick={requestNotifications}>{t('buttons.enableNotifications')}</button>
        </div>
      </div>

      <div className="schedule-scroll">
        <div className="schedule-grid">
          <div className="schedule-column">
            <div className="schedule-column__header">&nbsp;</div>
            {Array.from({ length: 56 }, (_, index) => {
              const total = scheduleStart + index * 15;
              const hour = Math.floor(total / 60);
              const minute = total % 60;
              return (
                <div key={index} className="time-cell">
                  <span>{`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}</span>
                </div>
              );
            })}
          </div>
          {blocks.map((stage) => (
            <ScheduleBlock
              key={stage.stage}
              stage={stage.stage}
              blocks={stage.acts}
              color={stage.color}
              onSelect={(act) => setSelectedAct(act)}
              onOpenArtist={(act) => openArtist(act)}
              favourites={favourites}
              toggleFavourite={toggleFavourite}
              nowMinutes={nowMinutes}
            />
          ))}
          {currentLineTop !== null ? <div className="current-time-line" style={{ top: `${currentLineTop}px` }} /> : null}
        </div>
        {!hasAnyEvents ? (
          <div className="schedule-empty-state">
            {t('schedule.noEvents')}
          </div>
        ) : null}
      </div>

      {selectedAct ? <ActModal act={selectedAct} onClose={() => setSelectedAct(null)} /> : null}
    </section>
  );
}
