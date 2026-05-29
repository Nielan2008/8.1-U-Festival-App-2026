import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => { if (mounted) setAuthed(!!j.authed); })
      .catch(() => { if (mounted) setAuthed(false); })
      .finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, []);

  if (checking) return <div style={{display:'flex',justifyContent:'center',padding:40}}><div className="spinner" /></div>;
  if (!authed) return <Navigate to="/cms/login" replace />;
  return children;
}
