import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home.jsx';
import Info from './pages/Info.jsx';
import Schedule from './pages/Schedule.jsx';
import MapPage from './pages/Map.jsx';
import Navbar from './components/Navbar.jsx';
import LangToggle from './components/LangToggle.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

function PageTransition({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition">
      {children}
    </div>
  );
}

function AppShell() {
  const { i18n, t } = useTranslation();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('loveu-theme');
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'theme-dark' : 'theme-light';
    window.localStorage.setItem('loveu-theme', theme);
  }, [theme]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }, []);

  const pages = useMemo(
    () => [
      { to: '/', label: t('nav.home') },
      { to: '/info', label: t('nav.info') },
      { to: '/schedule', label: t('nav.schedule') },
      { to: '/map', label: t('nav.map') }
    ],
    [t]
  );

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <div className="logo">❤️U</div>
          <p className="hero-copy">{t('hero.subtitle')}</p>
        </div>
        <div className="top-controls">
          <LangToggle currentLang={i18n.language} onLanguageChange={(lang) => i18n.changeLanguage(lang)} />
          <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        </div>
      </header>

      <main className="page-content">
        <PageTransition>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/info" element={<Info />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </PageTransition>
      </main>

      <Navbar pages={pages} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
