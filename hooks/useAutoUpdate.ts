import { useEffect } from 'react';
import * as Updates from 'expo-updates';

export function useAutoUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew && !cancelled) await Updates.reloadAsync();
      } catch {
        // Silent: OTA failures must never affect the app.
      }
    })();
    return () => { cancelled = true; };
  }, []);
}
