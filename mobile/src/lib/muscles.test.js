import { EXDB } from './exercises';
import { levelsOf, loadOfWorkouts, musclesOf } from './muscles';

describe('muscle filter data', () => {
  it('matches primary and secondary muscles', () => {
    const muscles = musclesOf({ tg: 'pectorals', sm: ['triceps'] });
    expect(muscles.chest).toBe(1);
    expect(muscles.triceps).toBeGreaterThan(0);
  });
});

describe('session heatmap data', () => {
  it('weights completed primary and secondary work into relative levels', () => {
    const exercise = EXDB.find(ex => ex.tg === 'pectorals' && ex.sm.includes('triceps'));
    const workout = { entries: [{ id: exercise.id, sets: [
      { done: true }, { done: true }, { done: true }, { done: false },
    ] }] };

    const levels = levelsOf(loadOfWorkouts([workout]));
    expect(levels.chest).toBe(4);
    expect(levels.triceps).toBe(2);
    expect(levels.quadriceps).toBe(0);
  });
});
