import { musclesOf } from './muscles';

describe('muscle filter data', () => {
  it('matches primary and secondary muscles', () => {
    const muscles = musclesOf({ tg: 'pectorals', sm: ['triceps'] });
    expect(muscles.chest).toBe(1);
    expect(muscles.triceps).toBeGreaterThan(0);
  });
});
