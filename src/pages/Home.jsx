import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import Card from '../components/Card.jsx';
import { localize } from '../utils/dataStore.js';

// Home page component. Displays welcome content, news, and an install QR code.
// The QR code is generated once from the current runtime URL or explicit environment URL.

export default function Home() {
  const { i18n, t } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const installUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_URL;
    if (envUrl) return envUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://loveu-festival.app';
  }, []);

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
      <div className="download-app-panel">
        <div className="download-app-copy">
          <p className="download-app-label">{t('home.installLabel')}</p>
          <p className="download-app-text">{t('home.installText')}</p>
        </div>
        <div className="download-qr-card">
          <div className="download-qr-headline">
            <span className="download-qr-icon" role="img" aria-label="Mobile">📱</span>
            <span>{t('home.installTitle')}</span>
          </div>
          <div className="download-qr-wrapper">
            <QRCode value={installUrl} size={208} bgColor="#ffffff" fgColor="#000000" level="M" />
          </div>
          <a className="button download-app-button" href={installUrl} target="_blank" rel="noopener noreferrer">
            {t('home.installButton')}
          </a>
        </div>
      </div>
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
