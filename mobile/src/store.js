import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { produce } from 'immer';
import { registerCustom } from './lib/exercises';
import { setLang } from './lib/i18n';
import { palette } from './theme';

export const STORAGE_KEY = 'opengym_state_v1';
export const DEF = {
  unit: 'kg', restTimer: true, restSec: 90, sound: true, keepAwake: true, lang: 'en',
  theme: 'dark', accent: 'lime', body: 'male', showPrevious: false, targetW: null,
  bodyweight: [], routines: [], week: {}, dayPlan: {}, exWeights: {}, workouts: [], homeWidgets: null,
  active: null, customEx: [], gifSize: 'full', reminder: { on: false, time: '08:00', tz: null }, effort: 'none',
};
const clone = value => structuredClone(value);
export const normalizeState = value => {
  const source = clone(value || {});
  return Object.assign(clone(DEF), source, {
    reminder: { ...DEF.reminder, ...(source.reminder || {}) },
    bodyweight: Array.isArray(source.bodyweight) ? source.bodyweight : [],
    routines: Array.isArray(source.routines) ? source.routines : [],
    workouts: Array.isArray(source.workouts) ? source.workouts : [],
    customEx: Array.isArray(source.customEx) ? source.customEx : [],
    effort: ['none', 'rir', 'rpe'].includes(source.effort) ? source.effort : source.showRir ? 'rir' : 'none',
  });
};
export const isOpenGymBackup = value => !!value && Array.isArray(value.workouts) && Array.isArray(value.routines);
export const updateState = (current, producer) => produce(current, draft => { producer(draft); draft._ts = Date.now(); });

const StoreContext = createContext(null);
const ColorsContext = createContext(null);
export function StoreProvider({ children }) {
  const store = useRef(null);
  if (!store.current) {
    store.current = {
      state: clone(DEF),
      listeners: new Set(),
      getState: () => store.current.state,
      subscribe: (listener) => {
        store.current.listeners.add(listener);
        return () => store.current.listeners.delete(listener);
      },
      setState: (next) => {
        store.current.state = next;
        store.current.listeners.forEach(l => l());
      },
    };
  }

  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const pendingSave = useRef(null);
  const saveTimer = useRef(null);
  const flushSave = useCallback(() => {
    if (!pendingSave.current) return;
    clearTimeout(saveTimer.current);
    const raw = JSON.stringify(pendingSave.current);
    pendingSave.current = null;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, raw));
  }, []);
  const save = useCallback(next => {
    if (!loaded.current) return;
    pendingSave.current = next;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 500);
  }, [flushSave]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      const next = normalizeState(raw ? JSON.parse(raw) : null);
      registerCustom(next.customEx);
      setLang(next.lang);
      store.current.setState(next);
    }).catch(() => {}).finally(() => { loaded.current = true; setReady(true); });
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') flushSave(); });
    return () => { subscription.remove(); flushSave(); };
  }, [flushSave]);

  const persist = useCallback(next => {
    next._ts = Date.now();
    registerCustom(next.customEx);
    setLang(next.lang);
    store.current.setState(next);
    save(next);
  }, [save]);
  const update = useCallback(producer => {
    const next = updateState(store.current.state, producer);
    registerCustom(next.customEx);
    setLang(next.lang);
    store.current.setState(next);
    save(next);
  }, [save]);
  const replaceState = useCallback(value => persist(normalizeState(value)), [persist]);
  
  const value = useMemo(() => ({
    store: store.current,
    ready,
    update,
    replaceState
  }), [ready, update, replaceState]);
  
  const appearance = useSyncExternalStore(store.current.subscribe, () => {
    const { theme, accent } = store.current.getState();
    return `${theme}:${accent}`;
  });
  const [theme, accent] = appearance.split(':');
  const colors = useMemo(() => palette({ theme, accent }), [theme, accent]);
  
  return <ColorsContext.Provider value={colors}><StoreContext.Provider value={value}>{children}</StoreContext.Provider></ColorsContext.Provider>;
}

function shallowEqual(objA, objB) {
  if (Object.is(objA, objB)) return true;
  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) return false;
  const keysA = Object.keys(objA);
  if (keysA.length !== Object.keys(objB).length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) return false;
  }
  return true;
}

export function useStoreSelector(selector) {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStoreSelector must be used inside StoreProvider');
  
  const stateRef = useRef(null);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  return useSyncExternalStore(value.store.subscribe, () => {
    const nextState = selectorRef.current(value.store.getState());
    if (stateRef.current !== null && shallowEqual(stateRef.current, nextState)) {
      return stateRef.current;
    }
    stateRef.current = nextState;
    return nextState;
  });
}

export function useStoreActions() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStoreActions must be used inside StoreProvider');
  return { ready: value.ready, update: value.update, replaceState: value.replaceState };
}
export function useStore() {
  const S = useStoreSelector(state => state);
  return { S, ...useStoreActions() };
}
export function useStoreColors() {
  const value = useContext(ColorsContext);
  if (!value) throw new Error('useStoreColors must be used inside StoreProvider');
  return value;
}
