import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Current time, refreshed every minute and whenever the app returns to the foreground. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    const sub = AppState.addEventListener('change', s => s === 'active' && setNow(Date.now()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return now;
}
