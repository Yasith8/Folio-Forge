import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'folioforge:color-scheme';
export type ColorScheme = 'light' | 'dark';

function readInitial(): ColorScheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Light/dark toggle for the app UI. The resume preview always stays print-styled. */
export function useColorScheme(): [ColorScheme, () => void] {
  const [scheme, setScheme] = useState<ColorScheme>(readInitial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', scheme === 'dark');
  }, [scheme]);

  const toggle = useCallback(() => {
    setScheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Preference just won't persist.
      }
      return next;
    });
  }, []);

  return [scheme, toggle];
}
