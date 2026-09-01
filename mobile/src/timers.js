import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Haptics, useSoundPlayer } from './lib/native';
import { useStore } from './store';

const TimerActionsContext = createContext(null);
const TimerStateContext = createContext(null);
export function TimerProvider({ children }) {
  const [rest, setRest] = useState(null);
  const [now, setNow] = useState(Date.now());
  const { S } = useStore();
  const player = useSoundPlayer(require('../assets/beep.wav'));
  useEffect(() => {
    if (!rest) return undefined;
    const interval = setInterval(() => setNow(previous => {
      const next = Date.now();
      const previousLeft = Math.max(0, Math.ceil((rest.endsAt - previous) / 1000));
      const nextLeft = Math.max(0, Math.ceil((rest.endsAt - next) / 1000));
      return previousLeft === nextLeft ? previous : next;
    }), 250);
    return () => clearInterval(interval);
  }, [rest]);
  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  useEffect(() => {
    if (rest && left === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (S.sound) { player.seekTo(0); player.play(); }
      setRest(null);
    }
  }, [left, rest, S.sound, player]);
  const startRest = useCallback(seconds => setRest({ total: seconds, endsAt: Date.now() + seconds * 1000 }), []);
  const addRest = useCallback(seconds => setRest(value => value ? { total: Math.max(1, value.total + seconds), endsAt: value.endsAt + seconds * 1000 } : null), []);
  const stopRest = useCallback(() => setRest(null), []);
  const actions = useMemo(() => ({ startRest, addRest, stopRest }), [startRest, addRest, stopRest]);
  const state = useMemo(() => ({ rest, left }), [rest, left]);
  return <TimerActionsContext.Provider value={actions}><TimerStateContext.Provider value={state}>{children}</TimerStateContext.Provider></TimerActionsContext.Provider>;
}
export const useTimers = () => useContext(TimerActionsContext);
export const useRestTimer = () => useContext(TimerStateContext);
