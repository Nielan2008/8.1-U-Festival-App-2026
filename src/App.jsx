import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home.jsx';
import Info from './pages/Info.jsx';
import Schedule from './pages/Schedule.jsx';
import MapPage from './pages/Map.jsx';
// CMS imports
import { CmsAuthProvider } from './cms/CmsAuthContext.jsx';
import ProtectedRoute from './cms/components/ProtectedRoute.jsx';
import Login from './cms/Login.jsx';
import Dashboard from './cms/Dashboard.jsx';
import ActsEditor from './cms/editors/ActsEditor.jsx';
import NewsEditor from './cms/editors/NewsEditor.jsx';
import ScheduleEditor from './cms/editors/ScheduleEditor.jsx';
import InfoEditor from './cms/editors/InfoEditor.jsx';
import MapEditor from './cms/editors/MapEditor.jsx';
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
          <LangToggle currentLang={i18n.language} onLanguageChange={(lang) => { i18n.changeLanguage(lang); window.localStorage.setItem('loveu-lang', lang); }} />
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
            {/* CMS routes */}
            <Route path="/cms" element={<Navigate to="/cms/login" replace />} />
            <Route path="/cms/login" element={<Login />} />
            <Route path="/cms/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/cms/acts" element={<ProtectedRoute><ActsEditor /></ProtectedRoute>} />
            <Route path="/cms/news" element={<ProtectedRoute><NewsEditor /></ProtectedRoute>} />
            <Route path="/cms/schedule" element={<ProtectedRoute><ScheduleEditor /></ProtectedRoute>} />
            <Route path="/cms/info" element={<ProtectedRoute><InfoEditor /></ProtectedRoute>} />
            <Route path="/cms/map" element={<ProtectedRoute><MapEditor /></ProtectedRoute>} />
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
