import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Accordion from '../components/Accordion.jsx';
import { localize } from '../utils/dataStore.js';

export default function Info() {
  const { i18n, t } = useTranslation();
  const [info, setInfo] = useState({});
  const [items, setItems] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/info', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { if (!mounted) return; setInfo(data); const byLang = {}; data.forEach((it) => { byLang[it.lang || 'en'] = byLang[it.lang || 'en'] || []; try { byLang[it.lang || 'en'].push(JSON.parse(it.value)); } catch { byLang[it.lang || 'en'].push(it.value); } }); setItems(byLang[i18n.language] || byLang.en || []); })
      .catch(() => { /* ignore */ });
    return () => (mounted = false);
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
