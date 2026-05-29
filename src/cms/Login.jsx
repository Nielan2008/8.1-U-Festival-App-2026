import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './cms.css';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password }), credentials: 'include' });
      if (r.ok) return navigate('/cms/dashboard');
      setError('Incorrect password');
    } catch (e) { setError('Network error'); }
  };

  return (
    <div className="cms-container cms-shell">
      <div className="cms-top"><h2>CMS Login</h2></div>
      <form onSubmit={submit}>
        <div className="form-row">
          <input autoFocus className="input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="button" type="submit">Login</button>
        </div>
        {error ? <div className="message error">{error}</div> : null}
      </form>
    </div>
  );
}
