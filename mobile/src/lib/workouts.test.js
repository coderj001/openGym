import { DEF, normalizeState } from '../store';
import { addStarterPlan } from './plans';
import { addExerciseToActive, createActiveWorkout, finishActiveWorkout } from './workouts';
import { EXIDX } from './exercises';

const state = () => normalizeState(DEF);

describe('mobile workout lifecycle', () => {
  it('builds a starter routine workout with prescribed sets', () => {
    const S = state();
    addStarterPlan(S);
    const routine = S.routines[0];
    const active = createActiveWorkout(S, routine.id, 80);
    expect(active.name).toBe('Push Day');
    expect(active.bw).toBe(80);
    expect(active.entries).toHaveLength(routine.ex.length);
    expect(active.entries[0].sets).toHaveLength(routine.ex[0].sets);
    expect(active.entries[0].sets.every(set => !set.done)).toBe(true);
  });

  it('finishes only completed entries and logs weight, volume, and a PR', () => {
    const S = state();
    addStarterPlan(S);
    S.active = createActiveWorkout(S, S.routines[0].id, 80);
    S.active.entries[0].sets[0] = { w: 60, r: 8, done: true };
    const workout = finishActiveWorkout(S);
    expect(S.active).toBeNull();
    expect(S.workouts).toHaveLength(1);
    expect(workout.entries).toHaveLength(1);
    expect(workout.vol).toBe(480);
    expect(workout.prs).toContain(workout.entries[0].id);
    expect(S.bodyweight[0].w).toBe(80);
    expect(S.exWeights[workout.entries[0].id].w).toBe(60);
  });

  it('adds an exercise to a freestyle workout', () => {
    const S = state();
    S.active = createActiveWorkout(S, null, 75);
    const exercise = EXIDX['0025'];
    addExerciseToActive(S, exercise, { sets: 3, reps: 5, weight: 40 });
    expect(S.active.entries).toHaveLength(1);
    expect(S.active.entries[0].sets).toHaveLength(3);
    expect(S.active.entries[0].sets[0]).toMatchObject({ w: 40, r: 5, done: false });
  });
});
