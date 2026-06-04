import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localize } from '../utils/dataStore.js';

function extractVideoId(url) {
  try {
    const cleaned = url.replace('https://www.youtube.com/watch?v=', '').replace('https://youtu.be/', '');
    return cleaned.split(/[&?#]/)[0];
  } catch {
    return url;
  }
}

export default function ArtistPage() {
  const { actId } = useParams();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [act, setAct] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      fetch('/api/acts', { credentials: 'include' }).then((res) => { if (!res.ok) throw new Error('Unable to load acts'); return res.json(); }),
      fetch('/api/schedule', { credentials: 'include' }).then((res) => { if (!res.ok) throw new Error('Unable to load schedule'); return res.json(); })
    ]).then(([acts, scheduleData]) => {
      if (!mounted) return;
      const normalizedActs = Array.isArray(acts) ? acts : [];
      const found = normalizedActs.find((item) => String(item.id) === String(actId) || String(item.slug) === String(actId));
      if (!found) {
        setError(t('artist.notFound'));
        setLoading(false);
        return;
      }
      setAct(found);
      setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
    }).catch((err) => {
      console.error(err);
      if (mounted) setError(t('artist.loadError'));
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [actId, t]);

  const showtime = useMemo(() => {
    if (!act || !schedule.length) return null;
    const match = schedule.find((item) => Number(item.act_id) === Number(act.id));
    if (!match) return null;
    return {
      stage: match.stage,
      day: match.day,
      start: match.start_time,
      end: match.end_time
    };
  }, [act, schedule]);

  if (loading) {
    return <section className="section-shell"><div className="page-loading">{t('artist.loading')}</div></section>;
  }

  if (error || !act) {
    return (
      <section className="section-shell">
        <div className="page-error">{error || t('artist.notFound')}</div>
        <button type="button" className="button" onClick={() => navigate(-1)}>{t('buttons.close')}</button>
      </section>
    );
  }

  const youtubeId = extractVideoId(act.youtube || act.video || '');
  const description = localize(act.description, i18n.language);
  const tagline = localize(act.tagline, i18n.language);

  return (
    <section className="artist-page">
      <button type="button" className="button" onClick={() => navigate(-1)}>{t('buttons.close')}</button>
      <div className="artist-hero">
        {act.image ? <img className="artist-image" src={act.image} alt={localize({ nl: act.name, en: act.name }, i18n.language)} /> : null}
        <div className="artist-meta">
          <h1>{act.name}</h1>
          <p className="artist-tagline">{tagline}</p>
          {showtime ? (
            <p className="artist-info">
              <strong>{t('artist.stage')}:</strong> {showtime.stage} · <strong>{t('artist.time')}:</strong> {showtime.start}–{showtime.end}
            </p>
          ) : null}
          {act.genre ? <p className="artist-info"><strong>{t('artist.genre')}:</strong> {act.genre}</p> : null}
        </div>
      </div>
      <div className="artist-detail-grid">
        <div>
          <h2>{t('artist.about')}</h2>
          <p>{description}</p>
        </div>
        {youtubeId ? (
          <div className="modal-video">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title={act.name}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
