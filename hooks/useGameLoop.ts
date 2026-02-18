import { useEffect, useRef, useCallback } from 'react';
import { TICK_INTERVAL_MS } from '../types';

/**
 * Game loop hook - fires onTick every TICK_INTERVAL_MS when isPlaying is true.
 */
export function useGameLoop(
  isPlaying: boolean,
  onTick: () => void,
  gameOver: boolean
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || gameOver) {
      clear();
      return;
    }

    intervalRef.current = setInterval(() => {
      onTickRef.current();
    }, TICK_INTERVAL_MS);

    return clear;
  }, [isPlaying, gameOver, clear]);

  return { clear };
}
