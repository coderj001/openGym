import { applyPrescription, nextPrescription } from './progression';
import { bestWeightFor, buildSets, setsDone, workoutVolume } from './history';
import { is1RMRecord } from './onerm';
import { todayISO, uid } from './format';
import { t } from './i18n';

export function createActiveWorkout(state, routineId = null, bodyweight = null, sharedPlan = null) {
  const routine = state.routines.find(item => item.id === routineId);
  const entries = (sharedPlan?.entries || routine?.ex || []).map(config => {
    const full = { ...config, id: config.id };
    const plan = nextPrescription(state, full, routine);
    return { id: config.id, sg: config.sg, target: { ...config }, plan, sets: applyPrescription(buildSets(state, full), plan) };
  });
  return {
    id: uid(), d: todayISO(), routineId: routine?.id || null, name: sharedPlan?.name || routine?.name || t('Freestyle workout'),
    start: Date.now(), cur: 0, bw: bodyweight == null ? null : Number(bodyweight), entries,
  };
}

export function finishActiveWorkout(state) {
  const active = state.active;
  if (!active) return null;
  const end = Date.now();
  const workout = { ...active, d: active.d || todayISO(), end, duration: end - active.start };
  workout.entries = workout.entries.filter(entry => entry.sets.some(set => set.done));
  if (!setsDone(workout)) return null;
  workout.prs = [];
  workout.e1prs = [];
  workout.entries.forEach(entry => {
    const top = Math.max(0, ...entry.sets.filter(set => set.done && set.kind !== 'w').map(set => set.w || 0), entry.topW || 0);
    if (top > bestWeightFor(state, entry.id)) workout.prs.push(entry.id);
    const estimate = is1RMRecord(state, entry.id, entry);
    if (estimate && !workout.prs.includes(entry.id)) workout.e1prs.push({ id: entry.id, ...estimate });
    const current = state.exWeights[entry.id];
    if (top > 0 && (!current || top > current.w)) state.exWeights[entry.id] = { w: top, d: workout.d };
  });
  workout.vol = workoutVolume(workout);
  if (workout.bw > 0) {
    const existing = state.bodyweight.find(item => item.d === workout.d);
    if (existing) { existing.w = workout.bw; existing.t = end; }
    else state.bodyweight.push({ id: uid(), d: workout.d, t: end, w: workout.bw });
  }
  state.workouts.push(workout);
  state.active = null;
  return workout;
}

export function addExerciseToActive(state, exercise, config) {
  const full = { ...config, id: exercise.id };
  const routine = state.routines.find(item => item.id === state.active?.routineId);
  const plan = nextPrescription(state, full, routine);
  state.active.entries.push({ id: exercise.id, target: { ...config }, plan, sets: applyPrescription(buildSets(state, full), plan) });
  state.active.cur = state.active.entries.length - 1;
}
