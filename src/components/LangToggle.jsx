import { useMemo } from 'react';

const langs = [
  { code: 'nl', label: 'NL', emoji: '🇳🇱' },
  { code: 'en', label: 'EN', emoji: '🇬🇧' }
];

export default function LangToggle({ currentLang, onLanguageChange }) {
  const selected = useMemo(() => langs.find((lang) => lang.code === currentLang) || langs[0], [currentLang]);

  return (
    <div>
      {langs.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`flag-button ${currentLang === lang.code ? 'active' : ''}`}
          onClick={() => onLanguageChange(lang.code)}
          aria-label={`Switch to ${lang.label}`}
        >
          <span>{lang.emoji}</span>
        </button>
      ))}
    </div>
  );
}
