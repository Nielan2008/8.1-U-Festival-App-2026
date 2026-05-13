import { useTranslation } from 'react-i18next';
import Card from '../components/Card.jsx';
import newsData from '../data/news.json';

export default function Home() {
  const { t } = useTranslation();
  const news = [...newsData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <section>
      <h1 className="section-title">{t('nav.home')}</h1>
      <p>{t('hero.subtitle')}</p>
      <div className="card-list">
        {news.length > 0 ? (
          news.map((item) => <Card key={item.id} title={item.title} text={item.text} timestamp={item.timestamp} />)
        ) : (
          <div className="card">
            <h3>Welcome to ❤️U Festival</h3>
            <p>16 hours of stage programming, food and art in Utrecht on 15–16 August 2026.</p>
          </div>
        )}
      </div>
    </section>
  );
}
