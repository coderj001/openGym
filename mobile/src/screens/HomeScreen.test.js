import { bodyWeightChange, homeRecords, homeWidgetIds, nextPlannedWorkout } from './HomeScreen';

test('uses the default home widgets and safely reads a saved layout', () => {
  expect(homeWidgetIds({})).toEqual(['schedule', 'bodyweight', 'streak', 'records', 'muscles', 'recent', 'volume', 'next', 'weight-change']);
  expect(homeWidgetIds({ homeWidgets: ['streak', 'unknown', 'streak', 'schedule'] })).toEqual(['streak', 'schedule']);
});

test('ranks one estimated record per exercise', () => {
  const S = { workouts: [
    { entries: [{ id: 'bench', sets: [{ done: true, w: 100, r: 10 }] }] },
    { entries: [{ id: 'squat', sets: [{ done: true, w: 150, r: 5 }] }, { id: 'bench', sets: [{ done: true, w: 140, r: 5 }] }] },
  ] };
  expect(homeRecords(S).map(({ id, record: { est, w, r } }) => ({ id, est, w, r }))).toEqual([
    { id: 'squat', est: 175, w: 150, r: 5 },
    { id: 'bench', est: 163.3, w: 140, r: 5 },
  ]);
});

test('finds the next scheduled workout', () => {
  const S = { routines: [{ id: 'pull', name: 'Pull', ex: [] }], week: { 2: 'pull' }, dayPlan: {} };
  expect(nextPlannedWorkout(S, '2026-03-09')).toEqual({ d: '2026-03-10', routine: S.routines[0] });
});

test('calculates the 30-day body-weight change from chronological data', () => {
  const now = Date.UTC(2026, 2, 31);
  const S = { bodyweight: [{ t: now - 86400000, w: 79 }, { t: now - 40 * 86400000, w: 100 }, { t: now - 10 * 86400000, w: 80 }] };
  expect(bodyWeightChange(S, now)).toEqual({ current: S.bodyweight[0], delta: -1 });
});
