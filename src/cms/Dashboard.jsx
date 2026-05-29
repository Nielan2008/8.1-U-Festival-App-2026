import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './cms.css';

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetch('/api/news', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/acts', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/schedule', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/info', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/map', { credentials: 'include' }).then(r => r.json())
    ]).then(([news, acts, schedule, info, map]) => {
      setCounts({ news: news.length, acts: acts.length, schedule: schedule.length, info: info.length, map: map.length });
    }).catch((e) => setError('Failed to load counts'));
  }, []);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    navigate('/cms/login');
  };

  return (
    <div className="cms-container cms-shell">
      <div className="cms-top">
        <h2>CMS Dashboard</h2>
        <div>
          <button className="button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="cms-nav small">
        <NavLink to="/cms/acts">Acts ({counts.acts ?? '...'})</NavLink>
        <NavLink to="/cms/news">News ({counts.news ?? '...'})</NavLink>
        <NavLink to="/cms/schedule">Schedule ({counts.schedule ?? '...'})</NavLink>
        <NavLink to="/cms/info">Info ({counts.info ?? '...'})</NavLink>
        <NavLink to="/cms/map">Map ({counts.map ?? '...'})</NavLink>
      </div>
      {error ? <div className="message error">{error}</div> : null}
    </div>
  );
}
