import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card.jsx';
import newsData from '../data/news.json';
import { loadData, localize } from '../utils/dataStore.js';

export default function Home() {
  const { i18n, t } = useTranslation();
  const [news, setNews] = useState(newsData);

  useEffect(() => {
    loadData('news', newsData).then(setNews).catch(() => setNews(newsData));
  }, []);

  const sortedNews = [...news].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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
              timestamp={item.timestamp}
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
