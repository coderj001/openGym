import { aiContext, buildAiPrompt, parseAiPlan } from './aiPlan';
import { EXIDX } from './exercises';

const exercise = Object.values(EXIDX)[0];
const state = {
  unit: 'kg',
  routines: [{ name: 'Push', ex: [{ id: exercise.id, sets: 3, reps: 8, weight: 40 }] }],
  workouts: [{ d: '2026-01-25', name: 'Push', entries: [{ id: exercise.id, sets: [{ w: 42.5, r: 8, done: true }] }] }],
};

test('AI context includes current routines and only workouts inside the selected window', () => {
  const context = aiContext({ ...state, workouts: [{ ...state.workouts[0], d: '2025-12-01' }, state.workouts[0]] }, 1, new Date('2026-02-01T12:00:00Z'));
  expect(context).toContain(`${exercise.id} ${exercise.n}`);
  expect(context).toContain('2026-01-25 Push');
  expect(context).not.toContain('2025-12-01');
});

test('AI prompt contains the selected history context', () => {
  expect(buildAiPrompt({ goal: 'Build muscle', level: 'Beginner', days: 3, state, historyWeeks: 4 })).toContain('RECENT 4-WEEK WORKOUT HISTORY');
});

test('AI prompt omits workout history when 0 weeks (None) is selected', () => {
  const prompt = buildAiPrompt({ goal: 'Build muscle', level: 'Beginner', days: 3, state, historyWeeks: 0 });
  expect(prompt).not.toContain('RECENT');
  expect(prompt).not.toContain('WORKOUT HISTORY');
  expect(prompt).toContain('CURRENT PLAN');
});

test('parsed plans use known weight when AI supplies none', () => {
  const raw = JSON.stringify({ routines: [{ name: 'Next Push', ex: [{ id: exercise.id, sets: 3, reps: 8, weight: 0 }] }], week: { 1: 0 } });
  const plan = parseAiPlan(raw, { [exercise.id]: { w: 42.5 } });
  expect(plan.routines[0].ex[0].weight).toBe(42.5);
  expect(plan.week[1]).toBe(plan.routines[0].id);
});
