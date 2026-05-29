import React, { createContext, useEffect, useState } from 'react';

export const CmsAuthContext = createContext({ authed: false, refresh: () => {} });

export function CmsAuthProvider({ children }) {
  const [authed, setAuthed] = useState(false);

  const refresh = async () => {
    try {
      const r = await fetch('/api/me', { credentials: 'include' });
      const j = await r.json();
      setAuthed(!!j.authed);
    } catch (e) {
      setAuthed(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return <CmsAuthContext.Provider value={{ authed, refresh }}>{children}</CmsAuthContext.Provider>;
}

export default CmsAuthProvider;
