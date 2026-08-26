import { EXDB } from './exercises-data';
import { EXERCISE_MEDIA } from './exerciseMedia';
import { t } from './i18n';

export { EXDB };
export const EXIDX = Object.fromEntries(EXDB.map(exercise => [exercise.id, exercise]));
export const BODYPARTS = [...new Set(EXDB.map(exercise => exercise.bp))].sort();
let customIds = [];
export function registerCustom(list = []) {
  customIds.forEach(id => delete EXIDX[id]);
  customIds = list.map(exercise => exercise.id);
  list.forEach(exercise => { EXIDX[exercise.id] = exercise; });
}
export const allExercises = state => [...(state.customEx || []), ...EXDB];
export function equipmentOf(list) {
  const counts = {};
  list.forEach(exercise => { if (exercise.eq) counts[exercise.eq] = (counts[exercise.eq] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
}
export const mediaFor = exercise => exercise?.gif ? EXERCISE_MEDIA[exercise.gif] : null;
export const isCardio = value => (typeof value === 'string' ? EXIDX[value] : value)?.bp === 'cardio';
export const isBodyweightEq = value => (typeof value === 'string' ? EXIDX[value] : value)?.eq === 'body weight';
export const exOr = id => EXIDX[id] || { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true };
