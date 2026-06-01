import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Accordion from '../components/Accordion.jsx';
import { localize } from '../utils/dataStore.js';

export default function Info() {
  const { i18n, t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch('/api/info', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`Info request failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        const parsedRows = list.map((row) => {
          let value = row.value;
          if (typeof value === 'string') {
            try { value = JSON.parse(value); } catch {
              // keep original string
            }
          }
          if (row.key !== 'meta') {
            if (value == null || typeof value !== 'object' || Array.isArray(value)) {
              value = { title: row.key || '', content: [value] };
            }
          }
          return { ...row, value };
        });

        setRows(parsedRows);
        const metaRow = parsedRows.find((row) => row.key === 'meta');
        setMeta(metaRow && typeof metaRow.value === 'object' ? metaRow.value : {});
      })
      .catch((err) => {
        console.error('Failed to load info', err);
        if (mounted) setError('Failed to load info');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const infoByLang = rows.reduce((acc, row) => {
    if (row.key === 'meta') return acc;
    const lang = row.lang || 'en';
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(row.value);
    return acc;
  }, {});
  const items = infoByLang[i18n.language] || infoByLang.en || [];
  const localizedItems = items.map((item) => ({
    title: localize(item.title, i18n.language),
    content: (item.content || []).map((line) => localize(line, i18n.language))
  }));

  if (loading) {
    return <section><div className="info-loading">Loading info…</div></section>;
  }

  if (error) {
    return <section><div className="info-error">{error}</div></section>;
  }

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
