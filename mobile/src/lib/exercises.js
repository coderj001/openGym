import { t } from './i18n';

let _EXDB = null;
let _EXIDX = null;
let customExCache = [];

export const EXDB = new Proxy([], {
  get(target, prop, receiver) {
    if (!_EXDB) _EXDB = require('./exercises-data').EXDB;
    const value = Reflect.get(_EXDB, prop);
    return typeof value === 'function' ? value.bind(_EXDB) : value;
  }
});

function initEXIDX() {
  if (!_EXIDX) {
    _EXIDX = Object.fromEntries(EXDB.map(exercise => [exercise.id, exercise]));
    customExCache.forEach(exercise => { _EXIDX[exercise.id] = exercise; });
  }
  return _EXIDX;
}

export const EXIDX = new Proxy({}, {
  get(target, prop) { return Reflect.get(initEXIDX(), prop); },
  ownKeys() { return Reflect.ownKeys(initEXIDX()); },
  getOwnPropertyDescriptor(target, prop) { return Reflect.getOwnPropertyDescriptor(initEXIDX(), prop); }
});

let _BODYPARTS = null;
export const BODYPARTS = new Proxy([], {
  get(target, prop) {
    if (!_BODYPARTS) _BODYPARTS = [...new Set(EXDB.map(exercise => exercise.bp))].sort();
    return Reflect.get(_BODYPARTS, prop);
  }
});

let customIds = [];
export function registerCustom(list = []) {
  if (_EXIDX) customIds.forEach(id => delete _EXIDX[id]);
  customIds = list.map(exercise => exercise.id);
  customExCache = list;
  if (_EXIDX) list.forEach(exercise => { _EXIDX[exercise.id] = exercise; });
}

export const allExercises = state => [...(state.customEx || []), ...EXDB];

export function equipmentOf(list) {
  const counts = {};
  list.forEach(exercise => { if (exercise.eq) counts[exercise.eq] = (counts[exercise.eq] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
}

let _EXERCISE_MEDIA = null;
export const mediaFor = exercise => {
  if (!exercise?.gif) return null;
  if (!_EXERCISE_MEDIA) _EXERCISE_MEDIA = require('./exerciseMedia').EXERCISE_MEDIA;
  return _EXERCISE_MEDIA[exercise.gif];
};

export const isCardio = value => (typeof value === 'string' ? EXIDX[value] : value)?.bp === 'cardio';
export const isBodyweightEq = value => (typeof value === 'string' ? EXIDX[value] : value)?.eq === 'body weight';
export const exOr = id => EXIDX[id] || { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true };
