'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Ctx = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void };
const SearchCtx = createContext<Ctx>({ open: false, setOpen: () => {}, toggle: () => {} });

export const useSearch = () => useContext(SearchCtx);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  // the trigger advertises Cmd/Ctrl+K, so bind it globally
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'k' && e.key !== 'K') return;
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}