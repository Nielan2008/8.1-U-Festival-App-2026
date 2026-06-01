import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card.jsx';
import { localize } from '../utils/dataStore.js';

export default function Home() {
  const { i18n, t } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch('/api/news', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`News request failed: ${r.status}`);
        return r.json();
      })
      .then((data) => { if (mounted) setNews(Array.isArray(data) ? data : []); })
      .catch((err) => { console.error('Failed to load news', err); if (mounted) { setNews([]); setError('Failed to load news'); } })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  const sortedNews = [...news].sort((a, b) => new Date(b.published_at || b.timestamp) - new Date(a.published_at || a.timestamp));

  if (loading) {
    return <section><div className="home-loading">Loading news…</div></section>;
  }

  if (error) {
    return <section><div className="home-error">{error}</div></section>;
  }

  return (
    <section>
      <h1 className="section-title">{t('nav.home')}</h1>
      <p>{t('hero.subtitle')}</p>
      <div className="card-list">
        {sortedNews.length > 0 ? (
          sortedNews.map((item) => (
            <Card
              key={item.id}
              title={localize(item.title, i18n.language)}
              text={localize(item.text, i18n.language)}
              timestamp={item.published_at || item.timestamp}
            />
          ))
        ) : (
          <div className="card">
            <h3>{t('home.welcomeTitle')}</h3>
            <p>{t('home.welcomeText')}</p>
          </div>
        )}
      </div>
    </section>
  );
}
