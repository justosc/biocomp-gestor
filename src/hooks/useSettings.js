import { useState, useEffect } from 'react';
import { getSettings } from '@/lib/biocomp';

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSettings().then(s => {
      if (mounted) {
        setSettings(s);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return { settings, loading };
}