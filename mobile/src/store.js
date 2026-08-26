import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerCustom } from './lib/exercises';
import { setLang } from './lib/i18n';

export const STORAGE_KEY = 'opengym_state_v1';
export const DEF = {
  unit: 'kg', restSec: 90, sound: true, keepAwake: true, lang: 'en',
  theme: 'dark', accent: 'lime', body: 'male', targetW: null,
  bodyweight: [], routines: [], week: {}, dayPlan: {}, exWeights: {}, workouts: [],
  active: null, customEx: [], gifSize: 'full', reminder: { on: false, time: '08:00', tz: null }, effort: null,
};
const clone = value => JSON.parse(JSON.stringify(value));
export const normalizeState = value => {
  const source = clone(value || {});
  return Object.assign(clone(DEF), source, {
    reminder: { ...DEF.reminder, ...(source.reminder || {}) },
    bodyweight: Array.isArray(source.bodyweight) ? source.bodyweight : [],
    routines: Array.isArray(source.routines) ? source.routines : [],
    workouts: Array.isArray(source.workouts) ? source.workouts : [],
    customEx: Array.isArray(source.customEx) ? source.customEx : [],
  });
};
export const isOpenGymBackup = value => !!value && Array.isArray(value.workouts) && Array.isArray(value.routines);

const StoreContext = createContext(null);
export function StoreProvider({ children }) {
  const [S, setState] = useState(() => clone(DEF));
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const save = useCallback(next => {
    if (!loaded.current) return;
    const raw = JSON.stringify(next);
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, raw));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      const next = normalizeState(raw ? JSON.parse(raw) : null);
      registerCustom(next.customEx);
      setLang(next.lang);
      setState(next);
    }).catch(() => {}).finally(() => { loaded.current = true; setReady(true); });
  }, []);

  const persist = useCallback(next => {
    next._ts = Date.now();
    registerCustom(next.customEx);
    setLang(next.lang);
    setState(next);
    save(next);
  }, [save]);
  const update = useCallback(producer => {
    setState(current => {
      const next = clone(current);
      producer(next);
      next._ts = Date.now();
      registerCustom(next.customEx);
      setLang(next.lang);
      save(next);
      return next;
    });
  }, [save]);
  const replaceState = useCallback(value => persist(normalizeState(value)), [persist]);
  const value = useMemo(() => ({ S, ready, update, replaceState }), [S, ready, update, replaceState]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
