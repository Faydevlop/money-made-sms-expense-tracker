import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

/**
 * False until the screen's push animation has finished. Heavy content renders
 * after that, so the transition stays smooth and a loader shows meanwhile.
 */
export function useAfterTransition(fallbackMs = 450): boolean {
  const nav = useNavigation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    // `transitionEnd` exists on stack navigators; the timer covers every other case.
    const unsub = (nav as any).addListener?.('transitionEnd', finish);
    const timer = setTimeout(finish, fallbackMs);
    return () => {
      clearTimeout(timer);
      unsub?.();
    };
  }, [nav, fallbackMs]);
  return ready;
}
