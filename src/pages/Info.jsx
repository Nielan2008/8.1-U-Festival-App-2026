import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Accordion from '../components/Accordion.jsx';
import infoData from '../data/info.json';
import { loadData, localize } from '../utils/dataStore.js';

export default function Info() {
  const { i18n, t } = useTranslation();
  const [info, setInfo] = useState(infoData);
  const [items, setItems] = useState(infoData[i18n.language] || infoData.en || []);

  useEffect(() => {
    loadData('info', infoData).then((data) => {
      setInfo(data);
      setItems(data[i18n.language] || data.en || []);
    }).catch(() => {
      setItems(infoData[i18n.language] || infoData.en || []);
    });
  }, [i18n.language]);

  const meta = info.meta || {};
  const localizedItems = items.map((item) => ({
    title: localize(item.title, i18n.language),
    content: (item.content || []).map((line) => localize(line, i18n.language))
  }));

  return (
    <section>
      <h1 className="section-title">{t('info.title')}</h1>
      {meta.festivalName ? (
        <div className="card">
          <h3>{localize(meta.festivalName, i18n.language)}</h3>
          <p>{localize(meta.dates, i18n.language)}</p>
          <p>{localize(meta.hours, i18n.language)}</p>
          <p>{localize(meta.address, i18n.language)}</p>
          <p>{localize(meta.shuttleTimes, i18n.language)}</p>
        </div>
      ) : null}
      <Accordion items={localizedItems} />
    </section>
  );
}
