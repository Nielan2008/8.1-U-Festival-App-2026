const sourceMap = {
  news: '/data/news.json',
  info: '/data/info.json',
  schedule: '/data/schedule.json',
  map: '/data/map.json',
  acts: '/data/acts.json'
};
const storagePrefix = 'loveu-cms-data-';

async function fetchJson(name) {
  const url = sourceMap[name];
  if (!url) throw new Error(`No source for ${name}`);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Fetch failed');
  return await response.json();
}

export async function loadData(name, fallback) {
  const stored = localStorage.getItem(storagePrefix + name);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(storagePrefix + name);
    }
  }

  try {
    return await fetchJson(name);
  } catch {
    return fallback;
  }
}

export function saveData(name, data) {
  localStorage.setItem(storagePrefix + name, JSON.stringify(data));
  return data;
}

export function clearSavedData(name) {
  localStorage.removeItem(storagePrefix + name);
}

export function getSavedData(name) {
  const stored = localStorage.getItem(storagePrefix + name);
  return stored ? JSON.parse(stored) : null;
}

export function localize(value, lang) {
  if (value == null) return '';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed[lang] || parsed.en || Object.values(parsed)[0] || '';
      }
    } catch {
      return value;
    }
    return value;
  }
  return value[lang] || value.en || Object.values(value)[0] || '';
}
