import { useTranslation } from 'react-i18next';
import Accordion from '../components/Accordion.jsx';
import infoData from '../data/info.json';

export default function Info() {
  const { i18n, t } = useTranslation();
  const items = infoData[i18n.language] || infoData.en;

  return (
    <section>
      <h1 className="section-title">{t('info.title')}</h1>
      <Accordion items={items} />
    </section>
  );
}
